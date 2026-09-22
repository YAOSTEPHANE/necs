import { sendAppMail } from "@/lib/mail";
import { createHash, randomBytes } from "crypto";
import { getDb } from "@/lib/mongo";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 h
const COLLECTION = "password_resets";

export type PasswordResetDoc = {
  email: string;
  tokenHash: string;
  userId: string;
  createdAt: number;
  /** Date BSON pour l’index TTL MongoDB. */
  expiresAt: Date;
  usedAt?: number;
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function resetsCollection() {
  const db = await getDb();
  const col = db.collection<PasswordResetDoc>(COLLECTION);
  await col.createIndex({ tokenHash: 1 }, { unique: true });
  await col.createIndex({ email: 1 });
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return col;
}

export function appBaseUrl(request?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (request) {
    try {
      return new URL(request.url).origin;
    } catch {
      /* ignore */
    }
  }
  return "http://localhost:3000";
}

export async function createPasswordResetToken(input: {
  email: string;
  userId: string;
}): Promise<{ rawToken: string; expiresAt: number }> {
  const col = await resetsCollection();
  const email = input.email.trim().toLowerCase();
  const rawToken = randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAtMs = now + TOKEN_TTL_MS;

  await col.deleteMany({ email, usedAt: { $exists: false } });

  await col.insertOne({
    email,
    userId: input.userId,
    tokenHash: hashToken(rawToken),
    createdAt: now,
    expiresAt: new Date(expiresAtMs),
  });

  return { rawToken, expiresAt: expiresAtMs };
}

export async function consumePasswordResetToken(
  rawToken: string,
): Promise<{ email: string; userId: string } | null> {
  const token = rawToken.trim();
  if (!token || token.length < 20) return null;

  const col = await resetsCollection();
  const tokenHash = hashToken(token);
  const doc = await col.findOne({ tokenHash });
  if (!doc) return null;
  if (doc.usedAt) return null;
  if (new Date(doc.expiresAt).getTime() <= Date.now()) {
    await col.deleteOne({ tokenHash });
    return null;
  }

  const result = await col.updateOne(
    { tokenHash, usedAt: { $exists: false } },
    { $set: { usedAt: Date.now() } },
  );
  if (result.modifiedCount === 0) return null;

  return { email: doc.email, userId: doc.userId };
}

export async function peekPasswordResetToken(
  rawToken: string,
): Promise<boolean> {
  const token = rawToken.trim();
  if (!token || token.length < 20) return false;
  const col = await resetsCollection();
  const doc = await col.findOne({ tokenHash: hashToken(token) });
  if (!doc || doc.usedAt) return false;
  return new Date(doc.expiresAt).getTime() > Date.now();
}

export function buildResetUrl(rawToken: string, request?: Request): string {
  const base = appBaseUrl(request);
  return `${base}/admin/reinitialiser-mot-de-passe?token=${encodeURIComponent(rawToken)}`;
}

type SendResult = { sent: boolean; reason?: string; provider?: string };

/** Envoi via Google (Gmail SMTP), secours Resend. */
export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<SendResult> {
  const firstName = input.name.trim().split(/\s+/)[0] || "Bonjour";
  const subject = "NECS — Réinitialisation de votre mot de passe";
  const text = [
    `${firstName},`,
    "",
    "Vous avez demandé à réinitialiser votre mot de passe NECS.",
    "Ce lien est valable 1 heure :",
    input.resetUrl,
    "",
    "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.",
    "",
    "— Équipe NECS",
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a">
      <p>${firstName},</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe <strong>NECS</strong>.</p>
      <p><a href="${input.resetUrl}" style="display:inline-block;padding:12px 18px;background:#0A3A72;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Choisir un nouveau mot de passe</a></p>
      <p style="font-size:13px;color:#64748b">Lien valable 1 heure. Si le bouton ne fonctionne pas, copiez cette adresse :<br/>${input.resetUrl}</p>
      <p style="font-size:13px;color:#64748b">Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>
    </div>
  `;

  return sendAppMail({
    to: input.to,
    subject,
    text,
    html,
  });
}
