import { NextResponse } from "next/server";
import { consumeEmailVerificationToken } from "@/lib/email-verification";
import { hasMongoConfig } from "@/lib/mongo";
import {
  assertSameOrigin,
  clampText,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

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
    const rl = rateLimit(`verify-email:${clientIp(request)}`, 20, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = (await request.json()) as { token?: string };
    const token = clampText(String(body.token || ""), 200);
    const verified = await consumeEmailVerificationToken(token);
    if (!verified) {
      return NextResponse.json(
        { error: "Lien invalide, déjà utilisé ou expiré." },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      email: verified.email,
      message: "Adresse e-mail confirmée. Vous pouvez vous connecter.",
    });
  } catch (error) {
    console.error("[auth/verify-email]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Vérification impossible.") },
      { status: 500 },
    );
  }
}
