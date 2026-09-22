import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import {
  consumePasswordResetToken,
  peekPasswordResetToken,
} from "@/lib/password-reset";
import { updateUserPassword } from "@/lib/users-repo";
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

export async function GET(request: Request) {
  try {
    if (!hasMongoConfig()) {
      return NextResponse.json({ valid: false }, { status: 503 });
    }
    const url = new URL(request.url);
    const token = clampText(String(url.searchParams.get("token") || ""), 200);
    const valid = await peekPasswordResetToken(token);
    return NextResponse.json({ valid });
  } catch (error) {
    console.error("[auth/reset-password:get]", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}

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
    const rl = rateLimit(`reset:${ip}`, 12, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez plus tard." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        },
      );
    }

    const body = (await request.json()) as {
      token?: string;
      password?: string;
    };
    const token = clampText(String(body.token || ""), 200);
    const password = String(body.password || "").slice(0, 200);

    if (!token) {
      return NextResponse.json(
        { error: "Lien de réinitialisation invalide." },
        { status: 400 },
      );
    }

    const pwdErr = validatePasswordStrength(password);
    if (pwdErr) {
      return NextResponse.json({ error: pwdErr }, { status: 400 });
    }

    const consumed = await consumePasswordResetToken(token);
    if (!consumed) {
      return NextResponse.json(
        {
          error:
            "Lien expiré ou déjà utilisé. Demandez une nouvelle réinitialisation.",
        },
        { status: 400 },
      );
    }

    const updated = await updateUserPassword(consumed.userId, password);
    if (!updated) {
      return NextResponse.json(
        { error: "Compte introuvable." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Mot de passe mis à jour. Vous pouvez vous connecter.",
    });
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Réinitialisation impossible.") },
      { status: 500 },
    );
  }
}
