"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconCart } from "@/components/admin/Icons";
import { PurchaseRequestsWorkspace } from "@/components/admin/PurchaseRequestsWorkspace";
import { safeRouterReplace } from "@/lib/safe-navigate";

export type AchatTab = "demandes-achat";

const TABS: { id: AchatTab; label: string; hint: string }[] = [
  {
    id: "demandes-achat",
    label: "Bon de commande interne / demande d’achat",
    hint: "Demandeur · articles · budget · validation N+1",
  },
];

function parseTab(raw: string | null): AchatTab {
  switch (raw) {
    case "demandes-achat":
    case "demande-achat":
    case "da":
    case "bc-interne":
    case "bc":
    case "tmp-15":
    case "achat":
    default:
      return "demandes-achat";
  }
}

/** Module Achats — DA / BC interne. */
export function AchatHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const setTab = useCallback(
    (next: AchatTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      safeRouterReplace(router, `${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const title = useMemo(() => {
    const current = TABS.find((t) => t.id === tab);
    return current ? `Achats — ${current.label}` : "Achats";
  }, [tab]);

  return (
    <div className="dig-hub achat-hub leads-page">
      <div className="rh-hub__glow" aria-hidden />
      <ModuleHeader
        tone="#b45309"
        badge="Achats"
        icon={<IconCart size={20} />}
        title={title}
        meta={
          <>
            <span>
              Chaîne <strong>DA → validation → commande → BL</strong>
            </span>
            <span>Budget · centre de coût · fournisseur · N+1</span>
          </>
        }
      />

      <nav className="dig-hub__tabs" aria-label="Fonctionnalités achats">
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
        {tab === "demandes-achat" ? (
          <PurchaseRequestsWorkspace embedded />
        ) : null}
      </div>
    </div>
  );
}
