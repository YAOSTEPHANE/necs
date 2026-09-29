import { createHash, randomBytes } from "crypto";
import { sendAppMail } from "@/lib/mail";
import { getDb } from "@/lib/mongo";
import { appBaseUrl } from "@/lib/password-reset";
import { ROLE_LABELS, type UserRole } from "@/lib/settings";
import { markUserEmailVerified } from "@/lib/users-repo";

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000;
const COLLECTION = "email_verifications";

type EmailVerificationDoc = {
  email: string;
  userId: string;
  tokenHash: string;
  createdAt: number;
  expiresAt: Date;
};

type SendResult = { sent: boolean; reason?: string; provider?: string };

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function verificationsCollection() {
  const db = await getDb();
  const col = db.collection<EmailVerificationDoc>(COLLECTION);
  await col.createIndex({ tokenHash: 1 }, { unique: true });
  await col.createIndex({ userId: 1 });
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return col;
}

async function createEmailVerificationToken(input: {
  userId: string;
  email: string;
}): Promise<string> {
  const col = await verificationsCollection();
  const rawToken = randomBytes(32).toString("hex");
  const now = Date.now();
  await col.deleteMany({ userId: input.userId });
  await col.insertOne({
    email: input.email.trim().toLowerCase(),
    userId: input.userId,
    tokenHash: hashToken(rawToken),
    createdAt: now,
    expiresAt: new Date(now + TOKEN_TTL_MS),
  });
  return rawToken;
}

/** Valide le lien reçu par e-mail et marque le compte comme vérifié. */
export async function consumeEmailVerificationToken(
  rawToken: string,
): Promise<{ userId: string; email: string } | null> {
  const token = rawToken.trim();
  if (!token || token.length < 20) return null;
  const col = await verificationsCollection();
  const doc = await col.findOneAndDelete({ tokenHash: hashToken(token) });
  if (!doc) return null;
  if (new Date(doc.expiresAt).getTime() <= Date.now()) return null;
  const user = await markUserEmailVerified(doc.userId, doc.email);
  if (!user) return null;
  return { userId: doc.userId, email: doc.email };
}

function buildVerifyUrl(rawToken: string, request?: Request): string {
  return `${appBaseUrl(request)}/admin/verifier-email?token=${encodeURIComponent(rawToken)}`;
}

async function sendVerificationEmail(input: {
  to: string;
  name: string;
  verifyUrl: string;
}): Promise<SendResult> {
  const firstName = input.name.trim().split(/\s+/)[0] || "Bonjour";
  const subject = "NECS — Confirmez votre adresse e-mail";
  const text = [
    `${firstName},`,
    "",
    "Un compte NECS vient d’être créé avec cette adresse e-mail.",
    "Pour l’activer, confirmez votre adresse (lien valable 48 heures) :",
    input.verifyUrl,
    "",
    "Si vous n’êtes pas concerné, ignorez cet e-mail.",
    "",
    "— Équipe NECS",
  ].join("\n");

  const safeName = escapeHtml(firstName);
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a">
      <p>${safeName},</p>
      <p>Un compte <strong>NECS</strong> vient d’être créé avec cette adresse e-mail. Pour l’activer, confirmez votre adresse :</p>
      <p><a href="${input.verifyUrl}" style="display:inline-block;padding:12px 18px;background:#0A3A72;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Confirmer mon adresse e-mail</a></p>
      <p style="font-size:13px;color:#64748b">Lien valable 48 heures. Si le bouton ne fonctionne pas, copiez cette adresse :<br/>${input.verifyUrl}</p>
      <p style="font-size:13px;color:#64748b">Si vous n’êtes pas concerné, ignorez cet e-mail.</p>
    </div>
  `;

  return sendAppMail({ to: input.to, subject, text, html });
}

function directionRecipients(exclude: string): string[] {
  const list = [process.env.ADMIN_BOOTSTRAP_EMAIL, process.env.LEADS_NOTIFY_EMAIL]
    .map((e) => (e || "").trim().toLowerCase())
    .filter((e) => e.includes("@") && e !== exclude.toLowerCase());
  return [...new Set(list)];
}

async function notifyDirectionNewAccount(input: {
  name: string;
  email: string;
  role: UserRole;
  createdBy: string;
}): Promise<void> {
  const to = directionRecipients(input.email);
  if (to.length === 0) return;
  const roleLabel = ROLE_LABELS[input.role] ?? input.role;
  const subject = `NECS — Nouveau compte créé : ${input.name}`;
  const text = [
    "Un nouveau compte a été créé sur l’ERP NECS.",
    "",
    `Nom : ${input.name}`,
    `E-mail : ${input.email}`,
    `Rôle : ${roleLabel}`,
    `Créé par : ${input.createdBy}`,
    "",
    "Un lien de vérification a été envoyé à l’utilisateur. Il pourra se connecter une fois son adresse confirmée.",
  ].join("\n");
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a">
      <p>Un nouveau compte a été créé sur l’ERP <strong>NECS</strong>.</p>
      <ul>
        <li><strong>Nom :</strong> ${escapeHtml(input.name)}</li>
        <li><strong>E-mail :</strong> ${escapeHtml(input.email)}</li>
        <li><strong>Rôle :</strong> ${escapeHtml(roleLabel)}</li>
        <li><strong>Créé par :</strong> ${escapeHtml(input.createdBy)}</li>
      </ul>
      <p style="font-size:13px;color:#64748b">Un lien de vérification a été envoyé à l’utilisateur. Il pourra se connecter une fois son adresse confirmée.</p>
    </div>
  `;
  for (const recipient of to) {
    const result = await sendAppMail({ to: recipient, subject, text, html });
    if (!result.sent) {
      console.warn("[email-verification] Copie Direction non envoyée:", result.reason);
    }
  }
}

/**
 * Génère un lien de vérification et l’envoie à l’utilisateur.
 * `createdBy` renseigné = nouveau compte : la Direction reçoit une copie.
 */
export async function sendAccountVerification(input: {
  user: { id: string; name: string; email: string; role: UserRole };
  request?: Request;
  createdBy?: string;
}): Promise<SendResult> {
  const rawToken = await createEmailVerificationToken({
    userId: input.user.id,
    email: input.user.email,
  });
  const verifyUrl = buildVerifyUrl(rawToken, input.request);
  const result = await sendVerificationEmail({
    to: input.user.email,
    name: input.user.name,
    verifyUrl,
  });
  if (!result.sent) {
    console.warn(
      "[email-verification] E-mail non envoyé:",
      result.reason,
      process.env.NODE_ENV !== "production" ? verifyUrl : "",
    );
  }
  if (input.createdBy) {
    try {
      await notifyDirectionNewAccount({
        name: input.user.name,
        email: input.user.email,
        role: input.user.role,
        createdBy: input.createdBy,
      });
    } catch (err) {
      console.error("[email-verification] notif Direction", err);
    }
  }
  return result;
}
