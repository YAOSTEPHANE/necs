"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconChart } from "@/components/admin/Icons";
import { ServiceContractsWorkspace } from "@/components/admin/ServiceContractsWorkspace";
import { ContractAmendmentsWorkspace } from "@/components/admin/ContractAmendmentsWorkspace";
import { MonthlyReportWorkspace } from "@/components/admin/MonthlyReportWorkspace";
import { safeRouterReplace } from "@/lib/safe-navigate";

export type DirectionTab = "contrat" | "avenants" | "rapport";

const TABS: { id: DirectionTab; label: string; hint: string }[] = [
  {
    id: "contrat",
    label: "Contrat de prestation",
    hint: "Client · BC · SLA · signatures",
  },
  {
    id: "avenants",
    label: "Avenant au contrat",
    hint: "Périmètre · tarif · versions",
  },
  {
    id: "rapport",
    label: "Rapport mensuel",
    hint: "KPI · qualité · actions",
  },
];

function parseTab(raw: string | null): DirectionTab {
  if (
    raw === "avenants" ||
    raw === "avenant" ||
    raw === "amendments" ||
    raw === "tmp-06"
  ) {
    return "avenants";
  }
  if (
    raw === "rapport" ||
    raw === "rapport-mensuel" ||
    raw === "performance" ||
    raw === "tmp-24"
  ) {
    return "rapport";
  }
  return "contrat";
}

/** Module Direction — contrat client, avenant, rapport performance. */
export function DirectionHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const setTab = useCallback(
    (next: DirectionTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      safeRouterReplace(router, `${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const title = useMemo(() => {
    const current = TABS.find((t) => t.id === tab);
    return current ? `Direction — ${current.label}` : "Direction";
  }, [tab]);

  return (
    <div className="dig-hub direction-hub legal-hub leads-page">
      <div className="rh-hub__glow" aria-hidden />
      <ModuleHeader
        tone="#5b21b6"
        badge="Direction"
        icon={<IconChart size={20} />}
        title={title}
        meta={
          <>
            <span>
              Chaîne <strong>contrat → avenant → performance</strong>
            </span>
            <span>Contrats · avenants · pilotage</span>
          </>
        }
      />

      <nav className="dig-hub__tabs" aria-label="Fonctionnalités direction">
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

      <div className="dig-hub__panel" key={tab}>
        {tab === "avenants" ? (
          <ContractAmendmentsWorkspace embedded />
        ) : tab === "rapport" ? (
          <MonthlyReportWorkspace embedded />
        ) : (
          <ServiceContractsWorkspace embedded />
        )}
      </div>
    </div>
  );
}
