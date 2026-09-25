"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import {
  COOKIE_CATEGORY_META,
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_OPEN_EVENT,
  clearAnalyticsStorage,
  defaultCookieConsent,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentState,
} from "@/lib/cookie-consent";

type Draft = {
  analytics: boolean;
  preferences: boolean;
};

export function CookieConsent() {
  const titleId = useId();
  const panelTitleId = useId();
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    analytics: false,
    preferences: false,
  });

  const syncFromStorage = useCallback(() => {
    const current = readCookieConsent();
    setConsent(current);
    setBannerVisible(!current);
    if (current) {
      setDraft({
        analytics: current.analytics,
        preferences: current.preferences,
      });
    }
  }, []);

  useEffect(() => {
    syncFromStorage();
    setReady(true);
  }, [syncFromStorage]);

  useEffect(() => {
    const onChange = () => syncFromStorage();
    const onOpen = () => {
      const current = readCookieConsent();
      setDraft({
        analytics: current?.analytics ?? false,
        preferences: current?.preferences ?? false,
      });
      setPanelOpen(true);
      setBannerVisible(false);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onChange);
    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, onChange);
      window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
    };
  }, [syncFromStorage]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [panelOpen]);

  const persist = (next: CookieConsentState) => {
    const prev = readCookieConsent();
    writeCookieConsent(next);
    if (prev?.analytics && !next.analytics) {
      clearAnalyticsStorage();
    }
    setConsent(next);
    setBannerVisible(false);
    setPanelOpen(false);
  };

  const acceptAll = () => {
    persist(
      defaultCookieConsent({
        analytics: true,
        preferences: true,
      }),
    );
  };

  const rejectOptional = () => {
    persist(
      defaultCookieConsent({
        analytics: false,
        preferences: false,
      }),
    );
  };

  const saveDraft = () => {
    persist(
      defaultCookieConsent({
        analytics: draft.analytics,
        preferences: draft.preferences,
      }),
    );
  };

  if (!ready) return null;

  return (
    <>
      {bannerVisible && !panelOpen ? (
        <div
          className="cookie-banner"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <div className="cookie-banner__inner">
            <div className="cookie-banner__copy">
              <p className="cookie-banner__kicker">Cookies · NECS Cameroun</p>
              <h2 id={titleId} className="cookie-banner__title">
                Votre navigation, vos choix
              </h2>
              <p className="cookie-banner__text">
                Nous utilisons des cookies nécessaires au site et, avec votre
                accord, des mesures d’attribution pour mieux répondre à vos
                demandes de devis.{" "}
                <Link href="/confidentialite">Politique de confidentialité</Link>
              </p>
            </div>
            <div className="cookie-banner__actions">
              <button
                type="button"
                className="cookie-banner__btn cookie-banner__btn--ghost"
                onClick={() => {
                  setDraft({ analytics: false, preferences: false });
                  setPanelOpen(true);
                }}
              >
                Personnaliser
              </button>
              <button
                type="button"
                className="cookie-banner__btn cookie-banner__btn--secondary"
                onClick={rejectOptional}
              >
                Refuser
              </button>
              <button
                type="button"
                className="cookie-banner__btn cookie-banner__btn--primary"
                onClick={acceptAll}
              >
                Tout accepter
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {panelOpen ? (
        <div className="cookie-panel" role="presentation">
          <button
            type="button"
            className="cookie-panel__backdrop"
            aria-label="Fermer les préférences cookies"
            onClick={() => {
              setPanelOpen(false);
              if (!consent) setBannerVisible(true);
            }}
          />
          <div
            className="cookie-panel__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={panelTitleId}
          >
            <header className="cookie-panel__head">
              <div>
                <p className="cookie-panel__kicker">Préférences</p>
                <h2 id={panelTitleId}>Gérer les cookies</h2>
              </div>
              <button
                type="button"
                className="cookie-panel__close"
                aria-label="Fermer"
                onClick={() => {
                  setPanelOpen(false);
                  if (!consent) setBannerVisible(true);
                }}
              >
                ×
              </button>
            </header>

            <div className="cookie-panel__body">
              <p className="cookie-panel__lead">
                Activez uniquement les catégories utiles. Les cookies
                nécessaires restent toujours actifs pour sécuriser le site.
              </p>

              <ul className="cookie-panel__list">
                {(
                  Object.keys(COOKIE_CATEGORY_META) as Array<
                    keyof typeof COOKIE_CATEGORY_META
                  >
                ).map((key) => {
                  const meta = COOKIE_CATEGORY_META[key];
                  const locked = Boolean(meta.locked);
                  const checked =
                    key === "necessary"
                      ? true
                      : key === "analytics"
                        ? draft.analytics
                        : draft.preferences;
                  return (
                    <li key={key} className="cookie-panel__item">
                      <div className="cookie-panel__item-text">
                        <strong>{meta.title}</strong>
                        <span>{meta.description}</span>
                      </div>
                      <label className="cookie-switch">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          aria-label={meta.title}
                          onChange={(e) => {
                            if (locked) return;
                            const value = e.target.checked;
                            setDraft((d) =>
                              key === "analytics"
                                ? { ...d, analytics: value }
                                : { ...d, preferences: value },
                            );
                          }}
                        />
                        <span className="cookie-switch__ui" aria-hidden />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

            <footer className="cookie-panel__foot">
              <button
                type="button"
                className="cookie-banner__btn cookie-banner__btn--secondary"
                onClick={rejectOptional}
              >
                Tout refuser
              </button>
              <button
                type="button"
                className="cookie-banner__btn cookie-banner__btn--primary"
                onClick={saveDraft}
              >
                Enregistrer
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
