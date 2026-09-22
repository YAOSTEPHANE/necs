"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconMail } from "@/components/admin/Icons";
import { LeadsWorkspace } from "@/components/admin/LeadsWorkspace";
import { FacebookLeadsWorkspace } from "@/components/admin/FacebookLeadsWorkspace";
import { SocialConnectorsWorkspace } from "@/components/admin/SocialConnectorsWorkspace";
import { CampaignTrackingWorkspace } from "@/components/admin/CampaignTrackingWorkspace";
import { ConsentPreferencesPanel } from "@/components/admin/ConsentPreferencesPanel";
import { DigitalRequestsWorkspace } from "@/components/admin/DigitalRequestsWorkspace";
import { safeRouterReplace } from "@/lib/safe-navigate";

export type DemandesTab =
  | "inbox"
  | "messages"
  | "integrations"
  | "campagnes"
  | "consentements";

export type IntegrationsFeature = "facebook" | "social";

const BASE_TABS: { id: DemandesTab; label: string; hint: string }[] = [
  { id: "inbox", label: "Inbox leads", hint: "Site web" },
  { id: "messages", label: "Messages", hint: "SLA & tickets" },
  { id: "integrations", label: "Intégrations", hint: "Réseaux sociaux" },
  { id: "campagnes", label: "Campagnes", hint: "Attribution" },
  { id: "consentements", label: "Consentements", hint: "Préférences" },
];

function parseTab(raw: string | null): DemandesTab {
  if (raw === "messages" || raw === "digitaux") return "messages";
  if (raw === "integrations" || raw === "facebook" || raw === "social") {
    return "integrations";
  }
  if (raw === "campagnes" || raw === "campaigns") return "campagnes";
  if (raw === "consentements" || raw === "consent") return "consentements";
  return "inbox";
}

function parseFeature(
  tab: DemandesTab,
  rawTab: string | null,
  rawFeature: string | null,
): IntegrationsFeature {
  if (tab !== "integrations") return "facebook";
  if (rawTab === "social" || rawFeature === "social") return "social";
  return "facebook";
}

export function DemandesDigitalHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab = parseTab(rawTab);
  const feature = parseFeature(tab, rawTab, searchParams.get("feature"));
  const [canConsent, setCanConsent] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { session?: { role?: string } | null }) => {
        const role = data.session?.role;
        setCanConsent(role === "admin" || role === "marketing");
      })
      .catch(() => setCanConsent(false));
  }, []);

  const tabs = useMemo(
    () =>
      BASE_TABS.filter((t) => t.id !== "consentements" || canConsent),
    [canConsent],
  );

  useEffect(() => {
    if (tab === "consentements" && !canConsent) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "inbox");
      params.delete("feature");
      safeRouterReplace(router, `${pathname}?${params.toString()}`);
    }
  }, [tab, canConsent, pathname, router, searchParams]);

  const setTab = useCallback(
    (next: DemandesTab, nextFeature?: IntegrationsFeature) => {
      if (next === "consentements" && !canConsent) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      if (next === "integrations") {
        params.set("feature", nextFeature ?? feature);
      } else {
        params.delete("feature");
      }
      safeRouterReplace(router, `${pathname}?${params.toString()}`);
    },
    [canConsent, feature, pathname, router, searchParams],
  );

  const title = useMemo(() => {
    switch (tab) {
      case "messages":
        return "Demandes digitales — Messages";
      case "integrations":
        return "Demandes digitales — Intégrations";
      case "campagnes":
        return "Demandes digitales — Campagnes";
      case "consentements":
        return "Demandes digitales — Consentements";
      default:
        return "Demandes digitales";
    }
  }, [tab]);

  return (
    <div className="dig-hub dig-hub--digital leads-page">
      <div className="rh-hub__glow" aria-hidden />
      <ModuleHeader
        tone="#c45c26"
        badge="Digital"
        icon={<IconMail size={20} />}
        title={title}
        meta={
          <>
            <span>
              Chaîne <strong>lead → message → campagne → consentement</strong>
            </span>
            <span>Inbox site · FB · réseaux · attribution</span>
          </>
        }
      />

      <nav className="dig-hub__tabs" aria-label="Fonctionnalités digitales">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={
              tab === t.id ? "dig-hub__tab is-active" : "dig-hub__tab"
            }
            onClick={() => setTab(t.id)}
          >
            <span>{t.label}</span>
            <em>{t.hint}</em>
          </button>
        ))}
      </nav>

      {tab === "inbox" ? <LeadsWorkspace embedded /> : null}

      {tab === "messages" ? (
        <DigitalRequestsWorkspace embedded />
      ) : null}

      {tab === "integrations" ? (
        <div className="dig-hub__panel">
          <div className="dig-hub__subtabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={feature === "facebook"}
              className={
                feature === "facebook"
                  ? "dig-hub__subtab is-active"
                  : "dig-hub__subtab"
              }
              onClick={() => setTab("integrations", "facebook")}
            >
              Facebook Lead Ads
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feature === "social"}
              className={
                feature === "social"
                  ? "dig-hub__subtab is-active"
                  : "dig-hub__subtab"
              }
              onClick={() => setTab("integrations", "social")}
            >
              Autres réseaux
            </button>
          </div>
          {feature === "facebook" ? (
            <FacebookLeadsWorkspace embedded />
          ) : (
            <SocialConnectorsWorkspace embedded />
          )}
        </div>
      ) : null}

      {tab === "campagnes" ? <CampaignTrackingWorkspace embedded /> : null}

      {tab === "consentements" && canConsent ? (
        <ConsentPreferencesPanel />
      ) : null}
    </div>
  );
}
