/** Consentement cookies site public NECS (stockage local, fr-CM). */

export const COOKIE_CONSENT_STORAGE_KEY = "necs_cookie_consent";
export const COOKIE_CONSENT_EVENT = "necs-cookie-consent";
export const COOKIE_CONSENT_OPEN_EVENT = "necs-open-cookie-settings";
export const COOKIE_CONSENT_VERSION = 1 as const;

export type CookieCategory = "necessary" | "analytics" | "preferences";

export type CookieConsentState = {
  version: typeof COOKIE_CONSENT_VERSION;
  decidedAt: string;
  necessary: true;
  analytics: boolean;
  preferences: boolean;
};

export const COOKIE_CATEGORY_META: Record<
  CookieCategory,
  { title: string; description: string; locked?: boolean }
> = {
  necessary: {
    title: "Nécessaires",
    description:
      "Indispensables au fonctionnement du site (sécurité, session admin, mémorisation de vos choix cookies). Toujours actifs.",
    locked: true,
  },
  analytics: {
    title: "Mesure & attribution",
    description:
      "Mémorisent la source de votre visite (campagne, canal) pour améliorer le suivi des demandes de devis, sans publicité tierce.",
  },
  preferences: {
    title: "Préférences",
    description:
      "Conservent des choix d’affichage ou d’interface pour faciliter votre navigation lors des prochaines visites.",
  },
};

export function defaultCookieConsent(
  overrides?: Partial<Pick<CookieConsentState, "analytics" | "preferences">>,
): CookieConsentState {
  return {
    version: COOKIE_CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    necessary: true,
    analytics: overrides?.analytics ?? false,
    preferences: overrides?.preferences ?? false,
  };
}

export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (typeof parsed.decidedAt !== "string") return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      decidedAt: parsed.decidedAt,
      necessary: true,
      analytics: Boolean(parsed.analytics),
      preferences: Boolean(parsed.preferences),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(state: CookieConsentState): void {
  if (typeof window === "undefined") return;
  const next: CookieConsentState = {
    ...state,
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    decidedAt: state.decidedAt || new Date().toISOString(),
  };
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_EVENT, { detail: next }),
  );
}

export function hasCookieConsent(category: CookieCategory): boolean {
  if (category === "necessary") return true;
  const state = readCookieConsent();
  if (!state) return false;
  return Boolean(state[category]);
}

export function openCookieSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT));
}

/** Efface les données d’attribution si le consentement analytics est retiré. */
export function clearAnalyticsStorage(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("necs_lead_attribution");
    sessionStorage.removeItem("necs_tracking_params");
  } catch {
    /* ignore */
  }
}
