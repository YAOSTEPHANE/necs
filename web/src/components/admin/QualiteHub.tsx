"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconQuality } from "@/components/admin/Icons";
import { QualityControlsWorkspace } from "@/components/admin/QualityControlsWorkspace";
import { SiteReportsWorkspace } from "@/components/admin/SiteReportsWorkspace";
import { MonthlyReportWorkspace } from "@/components/admin/MonthlyReportWorkspace";
import { TechnicalVisitsWorkspace } from "@/components/admin/TechnicalVisitsWorkspace";
import { safeRouterReplace } from "@/lib/safe-navigate";

export type QualiteTab =
  | "controles"
  | "rapports-site"
  | "rapport-mensuel"
  | "audit-visite";

const TABS: { id: QualiteTab; label: string; hint: string }[] = [
  {
    id: "controles",
    label: "Fiche de contrôle qualité",
    hint: "Critères · notation · photos · NC · actions · validation",
  },
  {
    id: "rapports-site",
    label: "Rapport de prestation / site",
    hint: "Prestations · effectifs · incidents · contrôles · actions",
  },
  {
    id: "rapport-mensuel",
    label: "Rapport mensuel de performance client",
    hint: "KPI · qualité · incidents · réclamations · recommandations",
  },
  {
    id: "audit-visite",
    label: "Rapport d’audit / visite technique",
    hint: "Constats · photos · mesures · risques · recommandations",
  },
];

function parseTab(raw: string | null): QualiteTab {
  switch (raw) {
    case "rapports-site":
    case "rapport-site":
    case "rapport-prestation":
    case "site":
    case "tmp-14":
      return "rapports-site";
    case "rapport-mensuel":
    case "mensuel":
    case "performance":
    case "tmp-24":
      return "rapport-mensuel";
    case "audit-visite":
    case "audit":
    case "visite":
    case "visite-technique":
    case "tmp-25":
      return "audit-visite";
    case "controles":
    case "controle":
    case "cq":
    case "tmp-13":
    default:
      return "controles";
  }
}

/** Module Qualité — CQ, rapports site / mensuel, audit VT. */
export function QualiteHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const setTab = useCallback(
    (next: QualiteTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      params.delete("feature");
      safeRouterReplace(router, `${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const title = useMemo(() => {
    const current = TABS.find((t) => t.id === tab);
    return current ? `Qualité — ${current.label}` : "Qualité";
  }, [tab]);

  return (
    <div className="dig-hub qualite-hub leads-page">
      <div className="rh-hub__glow" aria-hidden />
      <ModuleHeader
        tone="#c2410c"
        badge="Qualité"
        icon={<IconQuality size={20} />}
        title={title}
        meta={
          <>
            <span>
              Chaîne <strong>contrôle → NC → rapport → audit</strong>
            </span>
            <span>Critères · preuves · KPI · validation</span>
          </>
        }
      />

      <nav className="dig-hub__tabs" aria-label="Fonctionnalités qualité">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "dig-hub__tab is-active" : "dig-hub__tab"}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
          >
            <span>{t.label}</span>
            <em>{t.hint}</em>
          </button>
        ))}
      </nav>

      <div className="dig-hub__panel" key={tab} role="tabpanel">
        {tab === "controles" ? (
          <QualityControlsWorkspace embedded />
        ) : null}
        {tab === "rapports-site" ? (
          <SiteReportsWorkspace embedded />
        ) : null}
        {tab === "rapport-mensuel" ? (
          <MonthlyReportWorkspace embedded />
        ) : null}
        {tab === "audit-visite" ? (
          <TechnicalVisitsWorkspace embedded />
        ) : null}
      </div>
    </div>
  );
}
