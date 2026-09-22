import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import {
  SESSION_COOKIE,
  hasAuthSecret,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/session-server";
import {
  findUserByEmail,
  sessionFieldsFromUser,
  touchLastLogin,
  upsertDbUser,
} from "@/lib/users-repo";
import {
  assertSameOrigin,
  clampText,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
  validatePasswordStrength,
} from "@/lib/security";

export const runtime = "nodejs";

function registrationEnabled(): boolean {
  const raw = (process.env.REGISTER_ENABLED ?? "").trim().toLowerCase();
  if (!raw) {
    // Ouvert en local ; fermé en production tant que REGISTER_ENABLED n’est pas posé.
    return process.env.NODE_ENV !== "production";
  }
  return raw !== "0" && raw !== "false" && raw !== "off" && raw !== "no";
}

function requiredInviteCode(): string {
  return (process.env.REGISTER_INVITE_CODE || "").trim();
}

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return NextResponse.json(
        { error: "Origine non autorisée." },
        { status: 403 },
      );
    }
    if (!isJsonRequest(request)) {
      return NextResponse.json(
        { error: "Content-Type application/json requis." },
        { status: 415 },
      );
    }
    if (!registrationEnabled()) {
      return NextResponse.json(
        {
          error:
            "Les inscriptions publiques sont fermées. Contactez la Direction NECS.",
        },
        { status: 403 },
      );
    }

    const ip = clientIp(request);
    const rl = rateLimit(`register:${ip}`, 8, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez plus tard." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        },
      );
    }

    if (!hasMongoConfig()) {
      return NextResponse.json(
        { error: "Service d’inscription indisponible." },
        { status: 503 },
      );
    }
    if (!hasAuthSecret()) {
      return NextResponse.json(
        { error: "Service d’authentification mal configuré." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      inviteCode?: string;
      remember?: boolean;
      role?: string;
    };

    const name = clampText(String(body.name || ""), 120);
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    const phone = clampText(String(body.phone || ""), 40);
    const password = String(body.password || "").slice(0, 200);
    const inviteCode = clampText(String(body.inviteCode || ""), 80);
    const remember = body.remember !== false;
    // Inscription publique = portail client uniquement.
    // Les agents (nettoyeur) sont créés par un administrateur.
    if (body.role && body.role !== "client") {
      return NextResponse.json(
        {
          error:
            "L’inscription publique est réservée aux clients. Les comptes agents sont créés par l’administrateur NECS.",
        },
        { status: 403 },
      );
    }
    const role = "client" as const;

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Indiquez votre nom ou raison sociale." },
        { status: 400 },
      );
    }
    if (!email.includes("@") || email.length < 5) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }
    const pwdErr = validatePasswordStrength(password);
    if (pwdErr) {
      return NextResponse.json({ error: pwdErr }, { status: 400 });
    }

    const expectedInvite = requiredInviteCode();
    if (expectedInvite) {
      if (!inviteCode || inviteCode !== expectedInvite) {
        return NextResponse.json(
          { error: "Code d’invitation invalide ou manquant." },
          { status: 403 },
        );
      }
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet e-mail." },
        { status: 409 },
      );
    }

    const user = await upsertDbUser({
      name,
      email,
      phone,
      password,
      role,
      active: true,
    });

    const maxAge = remember ? 60 * 60 * 24 * 7 : 60 * 60 * 4;
    const fields = sessionFieldsFromUser(user);
    const token = await signSessionToken(fields, maxAge);
    await touchLastLogin(user.id);

    const res = NextResponse.json({
      ok: true,
      session: {
        ...fields,
        loggedAt: Date.now(),
        expiresAt: Date.now() + maxAge * 1000,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
    return res;
  } catch (error) {
    console.error("[auth/register]", error);
    const message = safeErrorMessage(error, "Inscription impossible.");
    const duplicate =
      /duplicate|E11000|déjà|unique/i.test(String(error)) ||
      /duplicate|E11000/i.test(message);
    return NextResponse.json(
      {
        error: duplicate
          ? "Un compte existe déjà avec cet e-mail."
          : message,
      },
      { status: duplicate ? 409 : 500 },
    );
  }
}
