import {
  type AdminUser,
  type UserRole,
  ROLE_LABELS,
} from "@/lib/settings";
import { getRoleSpace, roleHomePath } from "@/lib/role-spaces";

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
  if (pathname.startsWith("/admin/terrain")) return true;
  if (pathname.startsWith("/admin/login")) return true;
  return false;
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
    const data = (await res.json()) as { session?: AdminSession };
    if (!data.session) {
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
    return loadSession();
  }
}

export function isAuthenticated(): boolean {
  return loadSession() !== null;
}
