import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import {
  buildResetUrl,
  createPasswordResetToken,
  sendPasswordResetEmail,
} from "@/lib/password-reset";
import { findUserByEmail } from "@/lib/users-repo";
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
  "Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.";

export async function POST(request: Request) {
  try {
    if (!hasMongoConfig()) {
      return NextResponse.json(
        {
          error:
            "Base de données indisponible. Configurez DATABASE_URL (MongoDB).",
        },
        { status: 503 },
      );
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

    const ip = clientIp(request);
    const rl = rateLimit(`forgot:${ip}`, 8, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez plus tard." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        },
      );
    }

    const body = (await request.json()) as { email?: string };
    const email = clampText(String(body.email || "").toLowerCase(), 180);

    if (!email.includes("@") || email.length < 5) {
      return NextResponse.json({ error: "E-mail invalide." }, { status: 400 });
    }

    // Toujours le même message (anti-énumération des comptes).
    const user = await findUserByEmail(email);
    if (!user || !user.active) {
      return NextResponse.json({ ok: true, message: GENERIC_OK });
    }

    const emailRl = rateLimit(`forgot-email:${email}`, 3, 60 * 60 * 1000);
    if (!emailRl.ok) {
      return NextResponse.json({ ok: true, message: GENERIC_OK });
    }

    const { rawToken } = await createPasswordResetToken({
      email: user.email,
      userId: user.id,
    });
    const resetUrl = buildResetUrl(rawToken, request);
    const mail = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    if (!mail.sent) {
      console.warn(
        "[password-reset] E-mail non envoyé:",
        mail.reason,
        "→",
        resetUrl,
      );
      // En prod : ne pas faire croire que le mail est parti.
      // En dev : on expose encore le lien pour les tests locaux.
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            error:
              "Envoi d’e-mail temporairement indisponible. Réessayez plus tard.",
          },
          { status: 503 },
        );
      }
    }

    const payload: {
      ok: true;
      message: string;
      emailSent: boolean;
      devResetUrl?: string;
    } = {
      ok: true,
      message: GENERIC_OK,
      emailSent: mail.sent,
    };

    // Lien visible uniquement en développement pour les tests locaux.
    if (process.env.NODE_ENV !== "production") {
      payload.devResetUrl = resetUrl;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[auth/forgot-password]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Demande impossible.") },
      { status: 500 },
    );
  }
}
