"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconTruck } from "@/components/admin/Icons";
import { DeliveryNotesWorkspace } from "@/components/admin/DeliveryNotesWorkspace";
import { PurchaseRequestsWorkspace } from "@/components/admin/PurchaseRequestsWorkspace";
import { InventoryWorkspace } from "@/components/admin/InventoryWorkspace";
import { safeRouterReplace } from "@/lib/safe-navigate";

export type LogisticsTab = "livraisons" | "demandes-achat" | "stocks";

const TABS: { id: LogisticsTab; label: string; hint: string }[] = [
  {
    id: "livraisons",
    label: "Bon de livraison / réception",
    hint: "Site · quantités · réserves · signatures",
  },
  {
    id: "demandes-achat",
    label: "Demandes d’achat",
    hint: "DA → BL · fournisseur",
  },
  {
    id: "stocks",
    label: "Stocks",
    hint: "Magasin & sites",
  },
];

function parseTab(raw: string | null): LogisticsTab {
  switch (raw) {
    case "demandes-achat":
    case "da":
    case "achat":
    case "tmp-15":
      return "demandes-achat";
    case "stocks":
    case "stock":
    case "materiel":
    case "inventaire":
      return "stocks";
    case "livraisons":
    case "bl":
    case "reception":
    case "tmp-04":
    default:
      return "livraisons";
  }
}

/** Module Logistique — BL/réception, DA, stocks. */
export function LogisticsHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const setTab = useCallback(
    (next: LogisticsTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      safeRouterReplace(router, `${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const title = useMemo(() => {
    const current = TABS.find((t) => t.id === tab);
    return current
      ? `Logistique — ${current.label}`
      : "Logistique";
  }, [tab]);

  return (
    <div className="dig-hub logistics-hub leads-page">
      <div className="rh-hub__glow" aria-hidden />
      <ModuleHeader
        tone="#0f766e"
        badge="Logistique"
        icon={<IconTruck size={20} />}
        title={title}
        meta={
          <>
            <span>
              Chaîne <strong>DA → BL → stock</strong>
            </span>
            <span>
              Site · articles · réception · réserves · signatures
            </span>
          </>
        }
      />

      <nav className="dig-hub__tabs" aria-label="Fonctionnalités logistique">
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

      <div className="dig-hub__panel">
        {tab === "livraisons" ? (
          <DeliveryNotesWorkspace embedded />
        ) : null}
        {tab === "demandes-achat" ? (
          <PurchaseRequestsWorkspace embedded />
        ) : null}
        {tab === "stocks" ? <InventoryWorkspace /> : null}
      </div>
    </div>
  );
}
