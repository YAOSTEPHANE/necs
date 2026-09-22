"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconVisit } from "@/components/admin/Icons";
import { OpsReferentialWorkspace } from "@/components/admin/OpsReferentialWorkspace";
import { OpsPlanningWorkspace } from "@/components/admin/OpsPlanningWorkspace";
import { WorkOrdersWorkspace } from "@/components/admin/WorkOrdersWorkspace";
import { PurchaseOrdersWorkspace } from "@/components/admin/PurchaseOrdersWorkspace";
import { DeliveryNotesWorkspace } from "@/components/admin/DeliveryNotesWorkspace";
import { InventoryWorkspace } from "@/components/admin/InventoryWorkspace";
import { PointageWorkspace } from "@/components/admin/PointageWorkspace";
import { QualityControlsWorkspace } from "@/components/admin/QualityControlsWorkspace";
import { NonConformitiesWorkspace } from "@/components/admin/NonConformitiesWorkspace";
import { SatisfactionWorkspace } from "@/components/admin/SatisfactionWorkspace";
import { TerrainPhotosWorkspace } from "@/components/admin/TerrainPhotosWorkspace";
import { MonthlyReportWorkspace } from "@/components/admin/MonthlyReportWorkspace";
import { OnboardingWorkspace } from "@/components/admin/OnboardingWorkspace";
import { SiteReportsWorkspace } from "@/components/admin/SiteReportsWorkspace";
import { PurchaseRequestsWorkspace } from "@/components/admin/PurchaseRequestsWorkspace";
import { FinancePrefactureWorkspace } from "@/components/admin/FinancePrefactureWorkspace";
import { safeRouterReplace } from "@/lib/safe-navigate";

export type OpsTab =
  | "referentiel"
  | "planification"
  | "bons-commande"
  | "livraisons"
  | "missions"
  | "rapports-site"
  | "demandes-achat"
  | "materiel"
  | "pointage"
  | "prefactures"
  | "integration"
  | "qualite"
  | "terrain"
  | "rapport";

export type QualiteFeature = "controles" | "nc" | "satisfaction";

const TABS: { id: OpsTab; label: string; hint: string }[] = [
  { id: "referentiel", label: "Référentiel", hint: "Sites & prestations" },
  { id: "planification", label: "Planning", hint: "Créneaux" },
  {
    id: "bons-commande",
    label: "Bons de commande",
    hint: "Réception commercial",
  },
  {
    id: "livraisons",
    label: "Livraisons",
    hint: "BL / réception",
  },
  {
    id: "missions",
    label: "Ordres de travail",
    hint: "Fiche d’intervention",
  },
  {
    id: "rapports-site",
    label: "Rapport site",
    hint: "Prestation / synthèse",
  },
  {
    id: "demandes-achat",
    label: "Demandes d’achat",
    hint: "BC interne",
  },
  { id: "materiel", label: "Matériel", hint: "Stocks" },
  { id: "pointage", label: "Pointage", hint: "Présence / export" },
  {
    id: "prefactures",
    label: "Préfactures",
    hint: "Prestations facturables",
  },
  {
    id: "integration",
    label: "Intégration",
    hint: "Checklist onboarding",
  },
  { id: "qualite", label: "Qualité", hint: "Contrôles, NC & satisfaction" },
  { id: "terrain", label: "Photos", hint: "Preuves" },
  {
    id: "rapport",
    label: "Rapport mensuel",
    hint: "Performance client",
  },
];

function parseTab(raw: string | null): OpsTab {
  switch (raw) {
    case "referentiel":
    case "ops-01":
      return "referentiel";
    case "planification":
    case "planning":
    case "ops-02":
      return "planification";
    case "bons-commande":
    case "bc":
    case "commande":
    case "purchase-orders":
      return "bons-commande";
    case "livraisons":
    case "bl":
    case "delivery":
    case "logistique":
      return "livraisons";
    case "missions":
    case "ot":
    case "ordres":
    case "ordres-de-travail":
    case "intervention":
    case "ops-03":
      return "missions";
    case "rapports-site":
    case "rapport-site":
    case "rapport-prestation":
    case "tmp-14":
      return "rapports-site";
    case "demandes-achat":
    case "demande-achat":
    case "da":
    case "achat":
    case "tmp-15":
      return "demandes-achat";
    case "materiel":
    case "consommables":
    case "ops-06":
      return "materiel";
    case "pointage":
    case "ops-04":
    case "presence":
      return "pointage";
    case "prefactures":
    case "prefacture":
    case "tmp-18":
      return "prefactures";
    case "integration":
    case "onboarding":
    case "checklist":
    case "checklist-integration":
    case "ops-05":
      return "integration";
    case "qualite":
    case "controles":
    case "controles-qualite":
    case "nc":
    case "non-conformites":
    case "satisfaction":
    case "ops-07":
    case "ops-08":
    case "q-04":
      return "qualite";
    case "terrain":
    case "photos":
      return "terrain";
    case "rapport":
    case "rapport-mensuel":
    case "performance":
      return "rapport";
    default:
      return "planification";
  }
}

function parseQualiteFeature(
  tab: OpsTab,
  rawTab: string | null,
  rawFeature: string | null,
): QualiteFeature {
  if (tab !== "qualite") return "controles";
  if (
    rawTab === "satisfaction" ||
    rawTab === "q-04" ||
    rawFeature === "satisfaction"
  ) {
    return "satisfaction";
  }
  if (
    rawTab === "nc" ||
    rawTab === "non-conformites" ||
    rawTab === "ops-08" ||
    rawFeature === "nc"
  ) {
    return "nc";
  }
  return "controles";
}

export function OpsHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab = parseTab(rawTab);
  const feature = parseQualiteFeature(
    tab,
    rawTab,
    searchParams.get("feature"),
  );

  const setTab = useCallback(
    (next: OpsTab, nextFeature?: QualiteFeature) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      if (next === "qualite") {
        params.set("feature", nextFeature ?? feature);
      } else {
        params.delete("feature");
      }
      safeRouterReplace(router, `${pathname}?${params.toString()}`);
    },
    [feature, pathname, router, searchParams],
  );

  const title = useMemo(() => {
    const current = TABS.find((t) => t.id === tab);
    return current
      ? `Opérations — ${current.label}`
      : "Opérations";
  }, [tab]);

  return (
    <div className="dig-hub ops-hub leads-page">
      <div className="rh-hub__glow" aria-hidden />
      <ModuleHeader
        tone="#1570b8"
        badge="Opérations"
        icon={<IconVisit size={20} />}
        title={title}
        meta={
          <>
            <span>
              Chaîne{" "}
              <strong>
                référentiel → planning → missions → pointage → qualité
              </strong>
            </span>
            <span>Exécution terrain & preuves</span>
          </>
        }
      />

      <nav className="dig-hub__tabs" aria-label="Fonctionnalités opérations">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "dig-hub__tab is-active" : "dig-hub__tab"}
            onClick={() => setTab(t.id)}
          >
            <span>{t.label}</span>
            <em>{t.hint}</em>
          </button>
        ))}
      </nav>

      {tab === "referentiel" ? <OpsReferentialWorkspace /> : null}
      {tab === "planification" ? <OpsPlanningWorkspace /> : null}
      {tab === "bons-commande" ? (
        <PurchaseOrdersWorkspace embedded opsView />
      ) : null}
      {tab === "livraisons" ? <DeliveryNotesWorkspace embedded /> : null}
      {tab === "missions" ? <WorkOrdersWorkspace /> : null}
      {tab === "rapports-site" ? (
        <SiteReportsWorkspace embedded />
      ) : null}
      {tab === "demandes-achat" ? (
        <PurchaseRequestsWorkspace embedded />
      ) : null}
      {tab === "materiel" ? <InventoryWorkspace /> : null}
      {tab === "pointage" ? <PointageWorkspace /> : null}
      {tab === "prefactures" ? (
        <FinancePrefactureWorkspace embedded />
      ) : null}
      {tab === "integration" ? (
        <OnboardingWorkspace embedded variant="ops" />
      ) : null}

      {tab === "qualite" ? (
        <div className="dig-hub__panel">
          <div className="dig-hub__subtabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={feature === "controles"}
              className={
                feature === "controles"
                  ? "dig-hub__subtab is-active"
                  : "dig-hub__subtab"
              }
              onClick={() => setTab("qualite", "controles")}
            >
              Contrôles qualité
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feature === "nc"}
              className={
                feature === "nc"
                  ? "dig-hub__subtab is-active"
                  : "dig-hub__subtab"
              }
              onClick={() => setTab("qualite", "nc")}
            >
              Non-conformités
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feature === "satisfaction"}
              className={
                feature === "satisfaction"
                  ? "dig-hub__subtab is-active"
                  : "dig-hub__subtab"
              }
              onClick={() => setTab("qualite", "satisfaction")}
            >
              Satisfaction
            </button>
          </div>
          {feature === "controles" ? (
            <QualityControlsWorkspace />
          ) : feature === "nc" ? (
            <NonConformitiesWorkspace />
          ) : (
            <SatisfactionWorkspace />
          )}
        </div>
      ) : null}

      {tab === "terrain" ? <TerrainPhotosWorkspace /> : null}
      {tab === "rapport" ? <MonthlyReportWorkspace embedded /> : null}
    </div>
  );
}
