import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { verifyPassword } from "@/lib/password";
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
} from "@/lib/users-repo";
import {
  assertSameOrigin,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";
import {
  checkLoginLock,
  clearLoginFailures,
  registerLoginFailure,
} from "@/lib/login-guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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
    const rl = rateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
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
        { error: "Service d’authentification indisponible." },
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
      email?: string;
      password?: string;
      remember?: boolean;
    };
    const email = String(body.email || "").trim().toLowerCase().slice(0, 180);
    const password = String(body.password || "").slice(0, 200);
    const remember = body.remember !== false;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 },
      );
    }

    const lockKey = `email:${email}`;
    const lock = await checkLoginLock(lockKey);
    if (lock.locked) {
      return NextResponse.json(
        {
          error: `Compte temporairement verrouillé. Réessayez dans ${lock.retryAfterSec}s.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(lock.retryAfterSec ?? 900),
          },
        },
      );
    }

    const user = await findUserByEmail(email);
    const passwordOk =
      user && (await verifyPassword(password, user.passwordHash));

    if (!user || !passwordOk) {
      const fail = await registerLoginFailure(lockKey);
      if (fail.locked) {
        return NextResponse.json(
          {
            error: `Trop d’échecs. Compte verrouillé ${fail.retryAfterSec}s.`,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(fail.retryAfterSec ?? 900),
            },
          },
        );
      }
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 },
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "Ce compte est désactivé." },
        { status: 403 },
      );
    }

    await clearLoginFailures(lockKey);

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
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Connexion impossible.") },
      { status: 500 },
    );
  }
}
