import type { UserRole } from "@/lib/settings";

/** Permissions Graph API documentées (Lead Ads). */
export const FACEBOOK_REQUIRED_PERMISSIONS = [
  {
    scope: "pages_show_list",
    why: "Lister les Pages de l’entreprise",
  },
  {
    scope: "pages_read_engagement",
    why: "Lire les formulaires Lead Ads liés à la Page",
  },
  {
    scope: "leads_retrieval",
    why: "Récupérer le contenu des leads (champ_data)",
  },
  {
    scope: "pages_manage_metadata",
    why: "S’abonner au webhook leadgen sur la Page",
  },
] as const;

export type FacebookLeadConfigPublic = {
  enabled: boolean;
  pageId: string;
  pageName: string;
  formIds: string[];
  /** Token masqué (jamais le secret complet). */
  tokenMasked: string;
  tokenPresent: boolean;
  tokenExpiresAt: string | null;
  tokenExpired: boolean;
  webhookVerifyConfigured: boolean;
  appConfigured: boolean;
  lastSyncAt: string | null;
  lastWebhookAt: string | null;
  lastError: string;
  processedCount: number;
  updatedAt: string | null;
  updatedByName: string;
  webhookCallbackPath: string;
  permissions: typeof FACEBOOK_REQUIRED_PERMISSIONS;
};

export type FacebookSyncResult = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export function canAccessFacebookLeads(role: UserRole): boolean {
  return role === "admin" || role === "marketing" || role === "commercial";
}

export function canManageFacebookLeads(role: UserRole): boolean {
  return role === "admin" || role === "marketing";
}

export function maskToken(token: string): string {
  const t = token.trim();
  if (!t) return "";
  if (t.length <= 8) return "••••";
  return `••••${t.slice(-4)}`;
}

export function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return false;
  return t <= Date.now();
}
