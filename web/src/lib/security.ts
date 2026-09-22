/**
 * Utilitaires de durcissement sécurité (rate-limit, IP, origine, mots de passe).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

/** Rate-limit mémoire (meilleur effort sur serverless). */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true };
}

export function isJsonRequest(request: Request): boolean {
  const ct = request.headers.get("content-type") || "";
  return ct.includes("application/json");
}

/** Rejette les requêtes mutantes cross-origin évidentes. */
export function assertSameOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }
  const origin = request.headers.get("origin");
  if (!origin) {
    // fetch same-site envoie souvent Origin ; sans Origin on accepte
    // seulement si Sec-Fetch-Site est same-origin / none.
    const site = request.headers.get("sec-fetch-site");
    if (!site || site === "same-origin" || site === "none") return true;
    return false;
  }
  try {
    const originHost = new URL(origin).host;
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    if (host && originHost === host.split(",")[0]?.trim()) return true;

    const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (app) {
      const appHost = new URL(app).host;
      if (originHost === appHost) return true;
    }
  } catch {
    return false;
  }
  return false;
}

const USER_ROLES = new Set([
  "admin",
  "commercial",
  "marketing",
  "ops",
  "rh",
  "manager",
  "finance",
  "qualite",
  "nettoyeur",
  "client",
]);

export function isValidRole(role: string): boolean {
  return USER_ROLES.has(role);
}

export function validatePasswordStrength(password: string): string | null {
  const min = Math.max(
    8,
    Number(process.env.PASSWORD_MIN_LENGTH || 10) || 10,
  );
  if (password.length < min) {
    return `Mot de passe : au moins ${min} caractères.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Mot de passe : au moins une lettre et un chiffre.";
  }
  return null;
}

export function sanitizeRedirectPath(next: string | null | undefined): string {
  if (!next) return "/admin";
  if (!next.startsWith("/admin")) return "/admin";
  if (next.startsWith("//")) return "/admin";
  if (next.includes("\\") || next.includes("@")) return "/admin";
  return next.slice(0, 200);
}

export function safeErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

export function clampText(value: string, max: number): string {
  return value.trim().slice(0, max);
}
