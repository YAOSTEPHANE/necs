"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconInvoice } from "@/components/admin/Icons";
import { FinanceWorkspace } from "@/components/admin/FinanceWorkspace";
import { FinanceStatementWorkspace } from "@/components/admin/FinanceStatementWorkspace";
import { FinanceAckWorkspace } from "@/components/admin/FinanceAckWorkspace";
import { FinancePrefactureWorkspace } from "@/components/admin/FinancePrefactureWorkspace";
import { FinanceReminderWorkspace } from "@/components/admin/FinanceReminderWorkspace";
import { safeRouterReplace } from "@/lib/safe-navigate";

export type FinanceTab =
  | "devis"
  | "prefactures"
  | "factures"
  | "avoirs"
  | "releves"
  | "relances"
  | "acks";

const TABS: { id: FinanceTab; label: string; hint: string }[] = [
  { id: "devis", label: "Devis", hint: "Offre chiffrée" },
  {
    id: "prefactures",
    label: "Préfacture",
    hint: "Prestations facturables",
  },
  { id: "factures", label: "Factures", hint: "Émission client" },
  { id: "avoirs", label: "Avoirs", hint: "Notes de crédit" },
  { id: "releves", label: "Relevés", hint: "Compte client" },
  {
    id: "relances",
    label: "Relances",
    hint: "Lettre / e-mail",
  },
  { id: "acks", label: "Accusés", hint: "Preuves transmission" },
];

function parseTab(raw: string | null): FinanceTab {
  if (
    raw === "prefactures" ||
    raw === "prefacture" ||
    raw === "préfacture" ||
    raw === "tmp-18"
  ) {
    return "prefactures";
  }
  if (raw === "factures" || raw === "facture" || raw === "invoices") {
    return "factures";
  }
  if (raw === "avoirs" || raw === "avoir" || raw === "credits") {
    return "avoirs";
  }
  if (raw === "releves" || raw === "releve" || raw === "statements") {
    return "releves";
  }
  if (
    raw === "relances" ||
    raw === "relance" ||
    raw === "reminders" ||
    raw === "tmp-22"
  ) {
    return "relances";
  }
  if (
    raw === "acks" ||
    raw === "ack" ||
    raw === "accuses" ||
    raw === "accusés" ||
    raw === "preuves"
  ) {
    return "acks";
  }
  return "devis";
}

export function FinanceHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const setTab = useCallback(
    (next: FinanceTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      safeRouterReplace(router, `${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const title = useMemo(() => {
    const current = TABS.find((t) => t.id === tab);
    return current ? `Finance — ${current.label}` : "Finance";
  }, [tab]);

  return (
    <div className="dig-hub fin-hub leads-page">
      <div className="rh-hub__glow" aria-hidden />
      <ModuleHeader
        tone="#1e40af"
        badge="Finance"
        icon={<IconInvoice size={20} />}
        title={title}
        meta={
          <>
            <span>
              Chaîne{" "}
              <strong>
                devis → préfacture → facture → relance → preuve
              </strong>
            </span>
            <span>Acteurs finance · commercial · direction</span>
          </>
        }
      />

      <nav className="dig-hub__tabs" aria-label="Fonctionnalités finance">
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
        {tab === "prefactures" ? (
          <FinancePrefactureWorkspace embedded />
        ) : tab === "releves" ? (
          <FinanceStatementWorkspace embedded />
        ) : tab === "relances" ? (
          <FinanceReminderWorkspace embedded />
        ) : tab === "acks" ? (
          <FinanceAckWorkspace embedded />
        ) : (
          <FinanceWorkspace kind={tab} embedded />
        )}
      </div>
    </div>
  );
}
