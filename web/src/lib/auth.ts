import {
  type AdminUser,
  type UserRole,
  ROLE_LABELS,
} from "@/lib/settings";
import { getRoleSpace, roleHomePath } from "@/lib/role-spaces";
import { sanitizeRedirectPath } from "@/lib/security";

export const NECS_SESSION_KEY = "necs_admin_session_v1";
export const NECS_AUTH_EVENT = "necs-auth-updated";

export type AdminSession = {
  userId: string;
  name: string;
  email: string;
  role: AdminUser["role"];
  roleLabel: string;
  initials: string;
  loggedAt: number;
  expiresAt: number;
  employeeId?: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NE";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function isNettoyeur(
  session: Pick<AdminSession, "role"> | null | undefined,
): boolean {
  return session?.role === "nettoyeur";
}

export function hasRoleSpace(role: UserRole): boolean {
  return role === "nettoyeur" || Boolean(getRoleSpace(role));
}

export function homeForRole(role: UserRole): string {
  return roleHomePath(role);
}

/** Routes autorisées pour un nettoyeur. */
export function isAgentAllowedPath(pathname: string): boolean {
  if (pathname.startsWith("/admin/mon-espace")) return true;
  if (pathname.startsWith("/admin/pointage")) return true;
  if (pathname.startsWith("/admin/ordres-de-travail")) return true;
  if (pathname.startsWith("/admin/terrain")) return true;
  if (pathname.startsWith("/admin/documents-signatures")) return true;
  if (pathname.startsWith("/admin/login")) return true;
  if (pathname.startsWith("/admin/mot-de-passe-oublie")) return true;
  if (pathname.startsWith("/admin/reinitialiser-mot-de-passe")) return true;
  return false;
}

/** Routes autorisées pour un compte client. */
export function isClientAllowedPath(pathname: string): boolean {
  if (pathname.startsWith("/admin/espace")) return true;
  if (pathname.startsWith("/admin/templates")) return true;
  if (pathname.startsWith("/admin/login")) return true;
  if (pathname.startsWith("/admin/inscription")) return true;
  if (pathname.startsWith("/admin/mot-de-passe-oublie")) return true;
  if (pathname.startsWith("/admin/reinitialiser-mot-de-passe")) return true;
  return false;
}

export function isClient(
  session: Pick<AdminSession, "role"> | null | undefined,
): boolean {
  return session?.role === "client";
}

/** Cible post-login / post-inscription selon le rôle et le paramètre ?next=. */
export function resolvePostLoginPath(role: UserRole, next: string): string {
  const safeNext = sanitizeRedirectPath(next);
  const fallback = homeForRole(role);
  if (!safeNext.startsWith("/admin")) return fallback;
  if (role === "nettoyeur") {
    return isAgentAllowedPath(safeNext) ? safeNext : fallback;
  }
  if (role === "client") {
    return isClientAllowedPath(safeNext) ? safeNext : fallback;
  }
  if (role !== "admin") {
    if (safeNext === "/admin" || safeNext === "/admin/") return fallback;
    if (safeNext.startsWith("/admin/utilisateurs")) return fallback;
    if (safeNext.startsWith("/admin/parametres")) return fallback;
  }
  return safeNext;
}

export function loadSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(NECS_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    if (!session?.userId || !session.expiresAt) return null;
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: AdminSession): void {
  localStorage.setItem(NECS_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(NECS_AUTH_EVENT));
}

export function clearSession(): void {
  localStorage.removeItem(NECS_SESSION_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NECS_AUTH_EVENT));
  }
}

export type LoginResult =
  | { ok: true; session: AdminSession }
  | { ok: false; error: string };

/** Connexion serveur (cookie httpOnly + cache local pour l’UI). */
export async function loginAdmin(
  email: string,
  password: string,
  options?: { remember?: boolean },
): Promise<LoginResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        email,
        password,
        remember: options?.remember !== false,
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      session?: AdminSession;
    };
    if (!res.ok || !data.session) {
      return { ok: false, error: data.error || "Identifiants incorrects." };
    }
    saveSession(data.session);
    return { ok: true, session: data.session };
  } catch {
    return {
      ok: false,
      error: "Impossible de joindre le serveur d’authentification.",
    };
  }
}

export type RegisterInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
  inviteCode?: string;
  remember?: boolean;
  /** Inscription publique = client uniquement. */
  role?: "client";
};

/** Inscription publique portail client + session. */
export async function registerAdmin(
  input: RegisterInput,
): Promise<LoginResult> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        phone: input.phone || "",
        password: input.password,
        inviteCode: input.inviteCode || "",
        remember: input.remember !== false,
        role: "client",
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      session?: AdminSession;
    };
    if (!res.ok || !data.session) {
      return {
        ok: false,
        error: data.error || "Inscription impossible.",
      };
    }
    saveSession(data.session);
    return { ok: true, session: data.session };
  } catch {
    return {
      ok: false,
      error: "Impossible de joindre le serveur d’inscription.",
    };
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    /* ignore network */
  }
  clearSession();
}

/** Resynchronise la session depuis le cookie serveur. */
export async function refreshSessionFromServer(): Promise<AdminSession | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!res.ok) {
      clearSession();
      return null;
    }
    const data = (await res.json()) as {
      authenticated?: boolean;
      session?: AdminSession | null;
    };
    if (!data.session || data.authenticated === false) {
      clearSession();
      return null;
    }
    const session: AdminSession = {
      ...data.session,
      roleLabel:
        data.session.roleLabel ||
        ROLE_LABELS[data.session.role] ||
        data.session.role,
      initials:
        data.session.initials || initialsFromName(data.session.name || ""),
    };
    saveSession(session);
    return session;
  } catch {
    // Ne pas faire confiance au localStorage si le serveur est injoignable.
    return null;
  }
}

export function isAuthenticated(): boolean {
  return loadSession() !== null;
}
