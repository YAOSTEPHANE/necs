import {
  type AdminUser,
  type UserRole,
  loadSettings,
  saveSettings,
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
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
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

export function loginAdmin(
  email: string,
  password: string,
  options?: { remember?: boolean },
): LoginResult {
  const settings = loadSettings();
  const normalized = email.trim().toLowerCase();
  const pwd = password.trim();
  const user = settings.users.find(
    (u) => u.email.trim().toLowerCase() === normalized,
  );

  if (!user) {
    return { ok: false, error: "Identifiants incorrects." };
  }
  if (!user.active) {
    return { ok: false, error: "Ce compte est désactivé." };
  }
  if ((user.password || "").trim() !== pwd) {
    return { ok: false, error: "Identifiants incorrects." };
  }

  const remember = options?.remember !== false;
  const configured = Math.max(30, settings.security.sessionMinutes || 480);
  const minutes = remember ? Math.max(configured, 480) : 120;
  const now = Date.now();
  const session: AdminSession = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] ?? user.role,
    initials: initialsFromName(user.name),
    loggedAt: now,
    expiresAt: now + minutes * 60 * 1000,
    ...(user.employeeId ? { employeeId: user.employeeId } : {}),
  };

  const nextUsers = settings.users.map((u) =>
    u.id === user.id
      ? {
          ...u,
          lastLogin: new Date().toLocaleString("fr-FR", {
            dateStyle: "short",
            timeStyle: "short",
          }),
        }
      : u,
  );
  saveSettings({ ...settings, users: nextUsers });
  saveSession(session);

  return { ok: true, session };
}

export function logoutAdmin(): void {
  clearSession();
}

export function isAuthenticated(): boolean {
  return loadSession() !== null;
}
