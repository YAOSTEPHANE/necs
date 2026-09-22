"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconCheck, IconClose } from "@/components/admin/Icons";
import { toast } from "@/lib/toast";

type LeadStatus = "nouveau" | "en_cours" | "traite";

type Lead = {
  id?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status?: LeadStatus;
  at: string;
};

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

function leadKey(lead: Lead): string {
  return lead.id || `${lead.email}::${lead.at}`;
}

function statusOf(lead: Lead): LeadStatus {
  return lead.status === "en_cours" || lead.status === "traite"
    ? lead.status
    : "nouveau";
}

export function DashboardRequests() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const busyLock = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", { credentials: "same-origin" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error ||
            (res.status === 503
              ? "MongoDB non configuré sur ce serveur."
              : "Impossible de charger les demandes."),
        );
      }
      const data = (await res.json()) as { leads: Lead[] };
      const all = Array.isArray(data.leads) ? data.leads : [];
      setLeads(
        all
          .filter((l) => statusOf(l) !== "traite")
          .slice(0, 8),
      );
    } catch (err) {
      setLeads([]);
      setError(
        err instanceof Error ? err.message : "Impossible de charger les demandes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function markDone(lead: Lead) {
    const key = leadKey(lead);
    if (busyKey || busyLock.current) return;
    busyLock.current = true;
    setBusyKey(key);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: lead.email,
          at: lead.at,
          status: "traite",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error || "Action impossible.");
        return;
      }
      setLeads((prev) => prev.filter((l) => leadKey(l) !== key));
      toast.success(`${lead.company || lead.name} · traité`);
    } catch {
      toast.error("Action impossible.");
    } finally {
      busyLock.current = false;
      setBusyKey(null);
    }
  }

  async function remove(lead: Lead) {
    const key = leadKey(lead);
    if (busyKey || busyLock.current) return;
    busyLock.current = true;
    setBusyKey(key);
    try {
      const res = await fetch("/api/leads", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lead.email, at: lead.at }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error || "Action impossible.");
        return;
      }
      setLeads((prev) => prev.filter((l) => leadKey(l) !== key));
      toast.info(`${lead.company || lead.name} · retiré`);
    } catch {
      toast.error("Action impossible.");
    } finally {
      busyLock.current = false;
      setBusyKey(null);
    }
  }

  return (
    <aside className="symp-panel symp-panel--requests">
      <header className="symp-panel__head">
        <div>
          <h2>Demandes site</h2>
          <p>
            {loading
              ? "Chargement…"
              : error
                ? "Erreur de chargement"
                : leads.length > 0
                  ? `${leads.length} à traiter`
                  : "Aucune demande ouverte"}
          </p>
        </div>
        <div className="symp-panel__head-actions">
          <Link href="/admin/demandes" className="symp-link-more">
            Voir tout
          </Link>
          <button
            type="button"
            className="symp-round ghost"
            aria-label="Actualiser les demandes"
            title="Actualiser"
            onClick={() => void refresh()}
            disabled={loading}
          >
            ↻
          </button>
        </div>
      </header>

      {error ? (
        <p className="symp-empty symp-empty--tight" role="alert">
          {error}
        </p>
      ) : loading ? (
        <p className="symp-empty symp-empty--tight">Chargement des demandes…</p>
      ) : leads.length === 0 ? (
        <p className="symp-empty symp-empty--tight">
          Les devis et contacts envoyés depuis le site public apparaîtront ici.
        </p>
      ) : (
        <ul className="symp-requests">
          {leads.map((lead) => {
            const key = leadKey(lead);
            const title = lead.company || lead.name;
            const st = statusOf(lead);
            return (
              <li key={key}>
                <div className="symp-person">
                  <span className="dash-avatar sm">{title.slice(0, 1)}</span>
                  <div>
                    <strong>{title}</strong>
                    <span>
                      {lead.subject || "Demande de contact"}
                      {" · "}
                      {st === "nouveau" ? "Nouveau" : "En cours"}
                    </span>
                    <small>
                      {lead.name}
                      {lead.email ? ` · ${lead.email}` : ""}
                      {lead.phone ? ` · ${lead.phone}` : ""}
                    </small>
                    <small>{formatWhen(lead.at)}</small>
                    {lead.message ? (
                      <small className="symp-requests__msg">
                        {lead.message.length > 140
                          ? `${lead.message.slice(0, 140)}…`
                          : lead.message}
                      </small>
                    ) : null}
                  </div>
                </div>
                <div className="symp-req-actions">
                  <button
                    type="button"
                    className="symp-round ghost"
                    aria-label={`Retirer ${title}`}
                    title="Retirer"
                    disabled={busyKey === key}
                    onClick={() => void remove(lead)}
                  >
                    <IconClose size={14} />
                  </button>
                  <button
                    type="button"
                    className="symp-round"
                    aria-label={`Marquer ${title} comme traité`}
                    title="Marquer traité"
                    disabled={busyKey === key}
                    onClick={() => void markDone(lead)}
                  >
                    <IconCheck size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
