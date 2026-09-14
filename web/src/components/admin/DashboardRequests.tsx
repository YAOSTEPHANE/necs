"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconClose } from "@/components/admin/Icons";
import {
  leadKey,
  loadLeads,
  removeLead,
  type Lead,
} from "@/lib/content";
import { toast } from "@/lib/toast";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type RequestItem = {
  key: string;
  name: string;
  kind: string;
  when: string;
  email?: string;
  at?: string;
  demo?: boolean;
};

const FALLBACK: RequestItem[] = [
  {
    key: "demo-horizon",
    name: "Société Horizon SA",
    kind: "Demande de devis",
    when: "Démo",
    demo: true,
  },
  {
    key: "demo-klaris",
    name: "Boutique Klaris",
    kind: "Lead Facebook",
    when: "Démo",
    demo: true,
  },
];

export function DashboardRequests() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [dismissedDemo, setDismissedDemo] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/leads", { credentials: "same-origin" });
        if (res.ok) {
          const data = (await res.json()) as { leads: Lead[] };
          if (!cancelled) setLeads(data.leads);
          return;
        }
      } catch {
        /* fallback local */
      }
      if (!cancelled) setLeads(loadLeads());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const realItems: RequestItem[] =
    leads && leads.length > 0
      ? leads.slice(0, 8).map((l) => ({
          name: l.company || l.name,
          kind: l.subject || "Demande de contact",
          when: formatWhen(l.at),
          key: leadKey(l),
          email: l.email,
          at: l.at,
        }))
      : [];

  const items =
    realItems.length > 0
      ? realItems
      : FALLBACK.filter((r) => !dismissedDemo.includes(r.key));

  const count = leads?.length ?? 0;

  function handleAction(item: RequestItem, action: "accept" | "refuse") {
    if (item.demo) {
      setDismissedDemo((prev) => [...prev, item.key]);
      toast.info(
        action === "accept"
          ? `${item.name} · accepté (démo)`
          : `${item.name} · refusé (démo)`,
      );
      return;
    }
    if (!item.email || !item.at) return;
    removeLead(item.email, item.at);
    setLeads(loadLeads());
    toast.info(
      action === "accept"
        ? `${item.name} · accepté (retiré de la file)`
        : `${item.name} · refusé`,
    );
  }

  return (
    <aside className="symp-panel symp-panel--requests">
      <header className="symp-panel__head">
        <div>
          <h2>Demandes</h2>
          <p>
            {count > 0
              ? `${count} lead${count > 1 ? "s" : ""} depuis le site`
              : items.length > 0
                ? "Aucune demande site — affichage démo"
                : "File vide"}
          </p>
        </div>
      </header>
      {items.length === 0 ? (
        <p className="symp-empty symp-empty--tight">Aucune demande en attente.</p>
      ) : (
        <ul className="symp-requests">
          {items.map((r) => (
            <li key={r.key}>
              <div className="symp-person">
                <span className="dash-avatar sm">{r.name.slice(0, 1)}</span>
                <div>
                  <strong>{r.name}</strong>
                  <span>{r.kind}</span>
                  <small>{r.when}</small>
                </div>
              </div>
              <div className="symp-req-actions">
                <button
                  type="button"
                  className="symp-round ghost"
                  aria-label={`Refuser ${r.name}`}
                  title="Refuser"
                  onClick={() => handleAction(r, "refuse")}
                >
                  <IconClose size={14} />
                </button>
                <button
                  type="button"
                  className="symp-round"
                  aria-label={`Accepter ${r.name}`}
                  title="Accepter"
                  onClick={() => handleAction(r, "accept")}
                >
                  <IconCheck size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
