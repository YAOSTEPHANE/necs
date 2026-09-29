import { NextResponse } from "next/server";
import { sendAccountVerification } from "@/lib/email-verification";
import { hasMongoConfig } from "@/lib/mongo";
import { findUserByEmail, isEmailVerified } from "@/lib/users-repo";
import {
  assertSameOrigin,
  clampText,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

const GENERIC_OK =
  "Si un compte non confirmé existe pour cet e-mail, un nouveau lien a été envoyé.";

export async function POST(request: Request) {
  try {
    if (!hasMongoConfig()) {
      return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
    }
    if (!assertSameOrigin(request)) {
      return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
    }
    if (!isJsonRequest(request)) {
      return NextResponse.json(
        { error: "Content-Type application/json requis." },
        { status: 415 },
      );
    }
    const rl = rateLimit(`resend-verify:${clientIp(request)}`, 6, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = (await request.json()) as { email?: string };
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    if (!email.includes("@") || email.length < 5) {
      return NextResponse.json({ error: "E-mail invalide." }, { status: 400 });
    }

    // Même réponse dans tous les cas (anti-énumération des comptes).
    const user = await findUserByEmail(email);
    if (!user || !user.active || isEmailVerified(user)) {
      return NextResponse.json({ ok: true, message: GENERIC_OK });
    }
    const emailRl = rateLimit(`resend-verify-email:${email}`, 3, 60 * 60 * 1000);
    if (emailRl.ok) {
      await sendAccountVerification({ user, request });
    }
    return NextResponse.json({ ok: true, message: GENERIC_OK });
  } catch (error) {
    console.error("[auth/resend-verification]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Demande impossible.") },
      { status: 500 },
    );
  }
}
