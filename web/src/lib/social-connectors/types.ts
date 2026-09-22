import type { UserRole } from "@/lib/settings";

export type SocialConnectorStatus = "live" | "ready" | "planned";

export type SocialConnectorCapability =
  | "leads"
  | "webhook"
  | "sync"
  | "oauth"
  | "test_inject";

export type SocialConnectorPermission = {
  scope: string;
  why: string;
};

export type SocialConnectorRateLimit = {
  label: string;
  detail: string;
};

export type SocialConnectorSyncResult = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export type SocialConnectorPublic = {
  id: string;
  label: string;
  description: string;
  status: SocialConnectorStatus;
  capabilities: SocialConnectorCapability[];
  permissions: SocialConnectorPermission[];
  rateLimits: SocialConnectorRateLimit[];
  docsUrl: string;
  brandColor: string;
  /** Config UI dédiée (ex. Facebook). */
  manageHref: string | null;
  enabled: boolean;
  lastSyncAt: string | null;
  lastError: string;
  processedCount: number;
  configured: boolean;
};

/** Lead normalisé — le CRM n’est appelé que via le pont d’ingestion. */
export type SocialNormalizedLead = {
  externalId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
  campaign?: string;
  formName?: string;
  consent?: boolean;
  raw?: Record<string, string>;
};

export type SocialConnectorDefinition = {
  id: string;
  label: string;
  description: string;
  status: SocialConnectorStatus;
  capabilities: SocialConnectorCapability[];
  permissions: SocialConnectorPermission[];
  rateLimits: SocialConnectorRateLimit[];
  docsUrl: string;
  brandColor: string;
  manageHref?: string | null;
  /** Source CRM conservée (attribution). */
  crmSource: string;
  crmMedium: string;
  /** true si les secrets / env nécessaires sont présents. */
  isConfigured: () => boolean | Promise<boolean>;
  sync?: () => Promise<SocialConnectorSyncResult>;
  injectTest?: (input?: {
    name?: string;
    email?: string;
    phone?: string;
  }) => Promise<{
    externalId: string;
    email: string;
    created: boolean;
    leadId: string;
  }>;
};

export function canAccessSocialConnectors(role: UserRole): boolean {
  return role === "admin" || role === "marketing";
}

export function canManageSocialConnectors(role: UserRole): boolean {
  return role === "admin" || role === "marketing";
}

export const SOCIAL_CONNECTOR_STATUS_LABELS: Record<
  SocialConnectorStatus,
  string
> = {
  live: "En production",
  ready: "Prêt à brancher",
  planned: "Planifié",
};
