import type { UserRole } from "@/lib/settings";

export type TrackingParamConfig = {
  /** Noms de query params pour la source (ordre de priorité). */
  sourceParams: string[];
  campaignParams: string[];
  mediumParams: string[];
  /** Paramètres additionnels configurables. */
  extraParams: string[];
};

export type ChannelMapping = {
  id: string;
  label: string;
  /** Sources d’origine rattachées à ce canal (firstSource). */
  sources: string[];
  color: string;
};

export type CampaignTrackingConfig = {
  params: TrackingParamConfig;
  channels: ChannelMapping[];
  /** Statuts lead comptés comme conversion qualifiée. */
  conversionLeadStatuses: Array<"traite" | "en_cours">;
  /** Compter un client CRM (même e-mail) comme conversion gagnée. */
  countClientAsWon: boolean;
  updatedAt: string | null;
  updatedByName: string;
};

export type CampaignPeriod = "7d" | "30d" | "90d" | "all";

export type ChannelPerformanceRow = {
  channelId: string;
  channelLabel: string;
  color: string;
  leads: number;
  nouveau: number;
  enCours: number;
  traite: number;
  wonClients: number;
  /** Conversion qualifiée = traite / leads. */
  conversionRate: number;
  /** Conversion gagnée = wonClients / leads. */
  wonRate: number;
  sources: string[];
};

export type CampaignPerformanceRow = {
  campaign: string;
  channelId: string;
  channelLabel: string;
  firstSource: string;
  leads: number;
  traite: number;
  wonClients: number;
  conversionRate: number;
  wonRate: number;
};

export type SourcePerformanceRow = {
  source: string;
  channelId: string;
  channelLabel: string;
  leads: number;
  traite: number;
  wonClients: number;
  conversionRate: number;
  wonRate: number;
};

export type CampaignAnalyticsSnapshot = {
  period: CampaignPeriod;
  fromIso: string | null;
  toIso: string;
  totals: {
    leads: number;
    nouveau: number;
    enCours: number;
    traite: number;
    wonClients: number;
    conversionRate: number;
    wonRate: number;
  };
  byChannel: ChannelPerformanceRow[];
  byCampaign: CampaignPerformanceRow[];
  bySource: SourcePerformanceRow[];
  /** Rappel : firstSource / firstCampaign sont figés à la capture. */
  attributionNote: string;
};

export const DEFAULT_TRACKING_PARAMS: TrackingParamConfig = {
  sourceParams: ["utm_source", "source"],
  campaignParams: ["utm_campaign", "campaign"],
  mediumParams: ["utm_medium", "medium"],
  extraParams: ["utm_content", "utm_term", "gclid", "fbclid"],
};

export const DEFAULT_CHANNELS: ChannelMapping[] = [
  {
    id: "organic_web",
    label: "Site web",
    sources: ["site_web", "web", "organic"],
    color: "#1260a8",
  },
  {
    id: "paid_social",
    label: "Social payant",
    sources: ["facebook", "instagram", "tiktok", "x", "linkedin"],
    color: "#1877f2",
  },
  {
    id: "messaging",
    label: "Messaging",
    sources: ["whatsapp"],
    color: "#25d366",
  },
  {
    id: "internal",
    label: "Saisie interne",
    sources: ["saisie_interne", "saisie_rh"],
    color: "#7c3aed",
  },
  {
    id: "other",
    label: "Autres",
    sources: [],
    color: "#64748b",
  },
];

export const DEFAULT_CAMPAIGN_TRACKING_CONFIG: CampaignTrackingConfig = {
  params: DEFAULT_TRACKING_PARAMS,
  channels: DEFAULT_CHANNELS,
  conversionLeadStatuses: ["traite"],
  countClientAsWon: true,
  updatedAt: null,
  updatedByName: "",
};

export function canAccessCampaignTracking(role: UserRole): boolean {
  return role === "admin" || role === "marketing" || role === "commercial";
}

export function canManageCampaignTracking(role: UserRole): boolean {
  return role === "admin" || role === "marketing";
}

export function resolveChannelId(
  firstSource: string,
  channels: ChannelMapping[],
): string {
  const src = (firstSource || "site_web").trim().toLowerCase();
  for (const ch of channels) {
    if (ch.id === "other") continue;
    if (ch.sources.some((s) => s.toLowerCase() === src)) return ch.id;
  }
  return "other";
}

export function rate(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}
