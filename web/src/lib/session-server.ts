import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/settings";

export const SESSION_COOKIE = "necs_session";

export type SessionPayload = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  initials: string;
  employeeId?: string;
};

function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET manquant ou trop court (min. 32 caractères).",
    );
  }
  return new TextEncoder().encode(secret);
}

export function hasAuthSecret(): boolean {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  return secret.length >= 32;
}

export async function signSessionToken(
  payload: SessionPayload,
  expiresInSeconds: number,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .setIssuer("necs")
    .setAudience("necs-admin")
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "necs",
      audience: "necs-admin",
    });
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      name: String(payload.name ?? ""),
      email: payload.email,
      role: payload.role as UserRole,
      roleLabel: String(payload.roleLabel ?? payload.role),
      initials: String(payload.initials ?? "NE"),
      ...(typeof payload.employeeId === "string"
        ? { employeeId: payload.employeeId }
        : {}),
    };
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
