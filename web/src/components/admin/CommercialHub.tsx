"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconBriefcase } from "@/components/admin/Icons";
import { ProspectsWorkspace } from "@/components/admin/ProspectsWorkspace";
import { NeedQualificationWorkspace } from "@/components/admin/NeedQualificationWorkspace";
import { CommercialOffersWorkspace } from "@/components/admin/CommercialOffersWorkspace";
import { QuotesWorkspace } from "@/components/admin/QuotesWorkspace";
import { ServiceContractsWorkspace } from "@/components/admin/ServiceContractsWorkspace";
import { ContractAmendmentsWorkspace } from "@/components/admin/ContractAmendmentsWorkspace";
import { FinanceAckWorkspace } from "@/components/admin/FinanceAckWorkspace";
import { PurchaseOrdersWorkspace } from "@/components/admin/PurchaseOrdersWorkspace";
import { TechnicalVisitsWorkspace } from "@/components/admin/TechnicalVisitsWorkspace";
import { safeRouterReplace } from "@/lib/safe-navigate";

export type CommercialTab =
  | "prospects"
  | "qualification"
  | "audit-visite"
  | "chiffrage"
  | "offre"
  | "bons-commande"
  | "contrat"
  | "avenants"
  | "acks";

/** Chaîne métier CRM : prospect → besoin → visite → chiffrage → offre → BC → contrat. */
const TABS: { id: CommercialTab; label: string; hint: string }[] = [
  {
    id: "prospects",
    label: "Prospects",
    hint: "Dossier · contacts · source",
  },
  {
    id: "qualification",
    label: "Qualification besoin",
    hint: "Surface · locaux · SLA",
  },
  {
    id: "audit-visite",
    label: "Audit / visite",
    hint: "Constats · photos · actions",
  },
  {
    id: "chiffrage",
    label: "Chiffrage / devis",
    hint: "Tarifs · versions · seuils",
  },
  {
    id: "offre",
    label: "Proposition / offre",
    hint: "Prestations · méthodo · conditions",
  },
  {
    id: "bons-commande",
    label: "Bon de commande",
    hint: "Réf. · quantités · validation",
  },
  {
    id: "contrat",
    label: "Contrat de prestation",
    hint: "Parties · SLA · signatures",
  },
  {
    id: "avenants",
    label: "Avenant",
    hint: "Périmètre · tarif · versions",
  },
  {
    id: "acks",
    label: "Accusé / preuve",
    hint: "Transmission documents",
  },
];

function parseTab(raw: string | null): CommercialTab {
  if (
    raw === "prospects" ||
    raw === "prospect" ||
    raw === "crm-01" ||
    raw === "dossiers"
  ) {
    return "prospects";
  }
  if (
    raw === "qualification" ||
    raw === "besoin" ||
    raw === "qualification-besoin" ||
    raw === "crm-02"
  ) {
    return "qualification";
  }
  if (
    raw === "audit-visite" ||
    raw === "visite" ||
    raw === "visite-technique" ||
    raw === "tmp-25"
  ) {
    return "audit-visite";
  }
  if (
    raw === "chiffrage" ||
    raw === "devis" ||
    raw === "quote" ||
    raw === "chiffrage-devis" ||
    raw === "crm-03" ||
    raw === "tmp-02"
  ) {
    return "chiffrage";
  }
  if (raw === "offre" || raw === "tmp-01" || raw === "offres-commerciales") {
    return "offre";
  }
  if (
    raw === "bons-commande" ||
    raw === "bc" ||
    raw === "commande" ||
    raw === "tmp-03"
  ) {
    return "bons-commande";
  }
  if (
    raw === "contrat" ||
    raw === "contrats" ||
    raw === "prestation" ||
    raw === "tmp-05"
  ) {
    return "contrat";
  }
  if (
    raw === "avenants" ||
    raw === "avenant" ||
    raw === "amendments" ||
    raw === "tmp-06"
  ) {
    return "avenants";
  }
  if (
    raw === "acks" ||
    raw === "ack" ||
    raw === "accuses" ||
    raw === "accusé" ||
    raw === "accuse" ||
    raw === "preuves" ||
    raw === "tmp-23"
  ) {
    return "acks";
  }
  return "prospects";
}

export function CommercialHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const setTab = useCallback(
    (next: CommercialTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      safeRouterReplace(router, `${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const title = useMemo(() => {
    const current = TABS.find((t) => t.id === tab);
    return current ? `CRM — ${current.label}` : "CRM";
  }, [tab]);

  return (
    <div className="dig-hub crm-hub rh-hub leads-page">
      <div className="rh-hub__glow" aria-hidden />

      <ModuleHeader
        tone="#0a3a72"
        badge="CRM / Commercial"
        icon={<IconBriefcase size={20} />}
        title={title}
        meta={
          <>
            <span>
              Chaîne{" "}
              <strong>
                prospect → besoin → visite → chiffrage → offre → BC → contrat
              </strong>
            </span>
            <span>Versions, seuils et historique sur le chiffrage</span>
          </>
        }
      />

      <nav className="dig-hub__tabs" aria-label="Fonctionnalités CRM">
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

      <div className="dig-hub__panel rh-hub__panel" key={tab}>
        {tab === "prospects" ? (
          <ProspectsWorkspace embedded />
        ) : tab === "qualification" ? (
          <NeedQualificationWorkspace embedded />
        ) : tab === "audit-visite" ? (
          <TechnicalVisitsWorkspace embedded />
        ) : tab === "chiffrage" ? (
          <QuotesWorkspace embedded />
        ) : tab === "offre" ? (
          <CommercialOffersWorkspace embedded />
        ) : tab === "bons-commande" ? (
          <PurchaseOrdersWorkspace embedded />
        ) : tab === "contrat" ? (
          <ServiceContractsWorkspace embedded />
        ) : tab === "avenants" ? (
          <ContractAmendmentsWorkspace embedded />
        ) : (
          <FinanceAckWorkspace embedded />
        )}
      </div>
    </div>
  );
}
