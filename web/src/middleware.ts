import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "necs_session";

function getSecret(): Uint8Array | null {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = getSecret();
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, secret, {
      issuer: "necs",
      audience: "necs-admin",
    });
    return true;
  } catch {
    return false;
  }
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/admin")) {
    const ok = await hasValidSession(request);
    if (!ok) {
      const nextPath = pathname.startsWith("/admin") ? pathname : "/admin";
      const login = new URL("/admin/login", request.url);
      login.searchParams.set(
        "next",
        nextPath.startsWith("/admin") ? nextPath.slice(0, 200) : "/admin",
      );
      return withSecurityHeaders(NextResponse.redirect(login));
    }
  }

  if (
    pathname.startsWith("/api/blob/") ||
    pathname.startsWith("/api/users")
  ) {
    const ok = await hasValidSession(request);
    if (!ok) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
      );
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*", "/api/blob/:path*", "/api/users/:path*"],
};
