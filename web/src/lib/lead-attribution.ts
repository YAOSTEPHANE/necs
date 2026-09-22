/** Helpers UTM / attribution pour la capture leads site → CRM.
 * Objectif : rattacher chaque lead à source, campagne et canal
 * (pas un module de création de campagnes).
 */

import {
  DEFAULT_TRACKING_PARAMS,
  type TrackingParamConfig,
} from "@/lib/campaign-tracking-shared";

export type LeadAttribution = {
  /** Source d’origine (utm_source ou équivalent) — sert au rattachement canal. */
  source: string;
  campaign: string;
  medium: string;
  utmSource: string;
  pagePath: string;
};

const STORAGE_KEY = "necs_lead_attribution";
const PARAMS_CACHE_KEY = "necs_tracking_params";

function firstParam(
  params: URLSearchParams | null,
  names: string[],
): string {
  if (!params) return "";
  for (const name of names) {
    const v = params.get(name);
    if (v?.trim()) return v.trim().slice(0, 120);
  }
  return "";
}

function resolveConfig(
  paramConfig?: Partial<TrackingParamConfig>,
): TrackingParamConfig {
  return {
    sourceParams:
      paramConfig?.sourceParams?.length
        ? paramConfig.sourceParams
        : DEFAULT_TRACKING_PARAMS.sourceParams,
    campaignParams:
      paramConfig?.campaignParams?.length
        ? paramConfig.campaignParams
        : DEFAULT_TRACKING_PARAMS.campaignParams,
    mediumParams:
      paramConfig?.mediumParams?.length
        ? paramConfig.mediumParams
        : DEFAULT_TRACKING_PARAMS.mediumParams,
    extraParams:
      paramConfig?.extraParams ?? DEFAULT_TRACKING_PARAMS.extraParams,
  };
}

function readStored(): Partial<LeadAttribution> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) || "{}",
    ) as Partial<LeadAttribution>;
  } catch {
    return {};
  }
}

function writeStored(value: LeadAttribution) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

/** Lit les paramètres de tracking mis en cache (config marketing). */
export function getCachedTrackingParams(): Partial<TrackingParamConfig> | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(PARAMS_CACHE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as Partial<TrackingParamConfig>;
  } catch {
    return undefined;
  }
}

/**
 * Charge les paramètres de tracking configurables (public, sans auth)
 * et les met en cache session pour les formulaires.
 */
export async function loadTrackingParams(): Promise<TrackingParamConfig> {
  const fallback = { ...DEFAULT_TRACKING_PARAMS };
  if (typeof window === "undefined") return fallback;
  try {
    const res = await fetch("/api/campaign-tracking/params", {
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { params?: TrackingParamConfig };
    if (!data.params) return fallback;
    try {
      sessionStorage.setItem(PARAMS_CACHE_KEY, JSON.stringify(data.params));
    } catch {
      /* ignore */
    }
    return data.params;
  } catch {
    return fallback;
  }
}

/**
 * Lit l’attribution depuis l’URL / sessionStorage.
 * Priorité : URL (premier touch de la session) > session stockée > fallback.
 * `defaultSource` n’est utilisé que si aucune source UTM / stockée n’existe
 * (ne doit jamais écraser utm_source).
 */
export function readLeadAttribution(
  extra?: Partial<LeadAttribution> & { defaultSource?: string },
  paramConfig?: Partial<TrackingParamConfig>,
): LeadAttribution {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const cfg = resolveConfig(paramConfig ?? getCachedTrackingParams());
  const stored = readStored();

  const fromUrl = {
    campaign: firstParam(params, cfg.campaignParams),
    medium: firstParam(params, cfg.mediumParams),
    utmSource: firstParam(params, cfg.sourceParams),
  };

  // First-touch : on ne remplace pas une source déjà capturée dans la session
  // sauf si l’URL apporte une nouvelle valeur (landing UTM).
  const utmSource =
    fromUrl.utmSource ||
    extra?.utmSource ||
    stored.utmSource ||
    "";

  const campaign =
    fromUrl.campaign || extra?.campaign || stored.campaign || "";

  const medium = fromUrl.medium || extra?.medium || stored.medium || "";

  const defaultSource =
    extra?.defaultSource || extra?.source || "site_web";

  // `source` = origine conservée pour le canal (utm_source prioritaire)
  const source =
    utmSource ||
    stored.source ||
    defaultSource;

  const pagePath =
    extra?.pagePath ||
    (typeof window !== "undefined" ? window.location.pathname : "") ||
    stored.pagePath ||
    "";

  const merged: LeadAttribution = {
    source,
    campaign,
    medium,
    utmSource: utmSource || source,
    pagePath,
  };

  writeStored(merged);
  return merged;
}

/**
 * À appeler au chargement du site public pour figer l’attribution
 * dès la landing (avant soumission formulaire).
 */
export function persistLeadAttributionFromUrl(
  paramConfig?: Partial<TrackingParamConfig>,
): LeadAttribution {
  return readLeadAttribution(undefined, paramConfig);
}

export function inferFormTypeFromSubject(
  subject: string,
): "devis" | "contact" | "visite" | "autre" {
  const s = subject.toLowerCase();
  if (s.includes("visite")) return "visite";
  if (s.includes("devis")) return "devis";
  if (s.includes("contact")) return "contact";
  return "autre";
}
