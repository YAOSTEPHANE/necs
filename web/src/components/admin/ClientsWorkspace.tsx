"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconSearch, IconUser } from "@/components/admin/Icons";
import {
  ClientCreateForm,
  type ClientFormSeed,
} from "@/components/admin/ClientCreateForm";
import { downloadCsv } from "@/lib/download";
import { toast } from "@/lib/toast";

type ClientStatus = "prospect" | "actif" | "inactif";

type CrmClient = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  siteType: string;
  surface: string;
  status: ClientStatus;
  source: string;
  campaign: string;
  consent: boolean;
  lastSubject: string;
  lastMessage: string;
  lastFormType: string;
  createdBy: string;
  touchCount: number;
  at: string;
};

const STATUS_LABEL: Record<ClientStatus, string> = {
  prospect: "Prospect",
  actif: "Actif",
  inactif: "Inactif",
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

function initials(c: CrmClient): string {
  const base = (c.company || c.name || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase() || "?";
}

function ClientsWorkspaceInner() {
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState<"all" | ClientStatus>("all");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const busyLock = useRef(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formSeed, setFormSeed] = useState<ClientFormSeed | undefined>();
  const [formTitle, setFormTitle] = useState("Nouveau client");

  function openNewClient(seed?: ClientFormSeed, title = "Nouveau client") {
    setFormSeed(seed);
    setFormTitle(title);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setFormSeed(undefined);
    setFormTitle("Nouveau client");
  }

  const refresh = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch("/api/clients", { credentials: "same-origin" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Impossible de charger les clients.");
      }
      const data = (await res.json()) as { clients: CrmClient[] };
      const next = Array.isArray(data.clients) ? data.clients : [];
      setClients(next);
      setSelectedEmail((prev) => {
        if (prev && next.some((c) => c.email === prev)) return prev;
        const q = (searchParams.get("q") || "").toLowerCase();
        if (q) {
          const hit = next.find((c) => c.email === q);
          if (hit) return hit.email;
        }
        return next[0]?.email ?? null;
      });
    } catch (err) {
      if (!silent) {
        setClients([]);
        setError(
          err instanceof Error ? err.message : "Chargement impossible.",
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    if (!formOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [formOpen]);

  const stats = useMemo(() => {
    return {
      total: clients.length,
      prospect: clients.filter((c) => c.status === "prospect").length,
      actif: clients.filter((c) => c.status === "actif").length,
      today: clients.filter((c) => {
        try {
          const d = new Date(c.at);
          const n = new Date();
          return (
            d.getFullYear() === n.getFullYear() &&
            d.getMonth() === n.getMonth() &&
            d.getDate() === n.getDate()
          );
        } catch {
          return false;
        }
      }).length,
    };
  }, [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.name, c.company, c.email, c.phone, c.city, c.address, c.lastMessage]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [clients, query, statusFilter]);

  const selected =
    filtered.find((c) => c.email === selectedEmail) ?? filtered[0] ?? null;

  async function setStatus(c: CrmClient, status: ClientStatus) {
    if (busyEmail || busyLock.current) return;
    busyLock.current = true;
    setBusyEmail(c.email);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: c.email, status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error || "Mise à jour impossible.");
        return;
      }
      setClients((prev) =>
        prev.map((x) => (x.email === c.email ? { ...x, status } : x)),
      );
      toast.success(`${c.company || c.name} · ${STATUS_LABEL[status]}`);
    } catch {
      toast.error("Mise à jour impossible.");
    } finally {
      busyLock.current = false;
      setBusyEmail(null);
    }
  }

  async function removeClient(c: CrmClient) {
    if (busyEmail || busyLock.current) return;
    busyLock.current = true;
    setBusyEmail(c.email);
    try {
      const res = await fetch("/api/clients", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: c.email }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error || "Suppression impossible.");
        return;
      }
      setClients((prev) => prev.filter((x) => x.email !== c.email));
      toast.info(`${c.company || c.name} · retiré`);
    } catch {
      toast.error("Suppression impossible.");
    } finally {
      busyLock.current = false;
      setBusyEmail(null);
    }
  }

  function exportCsv() {
    const rows = [
      [
        "Date",
        "Statut",
        "Société",
        "Nom",
        "Email",
        "Téléphone",
        "Ville",
        "Adresse",
        "Type site",
        "Surface",
        "Source",
        "Dernier besoin",
      ],
      ...filtered.map((c) => [
        formatWhen(c.at),
        STATUS_LABEL[c.status],
        c.company,
        c.name,
        c.email,
        c.phone,
        c.city,
        c.address,
        c.siteType,
        c.surface,
        c.source,
        c.lastMessage.replace(/\s+/g, " ").trim(),
      ]),
    ];
    downloadCsv(rows, `necs-clients-${new Date().toISOString().slice(0, 10)}`);
    toast.success(`Export CSV · ${filtered.length}`);
  }

  return (
    <div className="leads-page clients-page">
      <ModuleHeader
        tone="#0a3a72"
        badge="CRM · Clients"
        icon={<IconUser size={20} />}
        title="Clients"
        meta={
          <>
            <span>
              <strong>{stats.prospect}</strong> prospects
            </span>
            <span>
              <strong>{stats.actif}</strong> actifs
            </span>
            <span>
              <strong>{stats.today}</strong> aujourd’hui
            </span>
          </>
        }
        actions={
          <div className="leads-header-actions">
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={() => openNewClient(undefined, "Nouveau client")}
            >
              Nouveau client
            </button>
            <Link
              href="/admin/commercial?tab=prospects"
              className="btn-admin btn-admin--ghost"
            >
              Prospects CRM
            </Link>
            <Link href="/admin/demandes" className="btn-admin btn-admin--ghost">
              Demandes
            </Link>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={exportCsv}
              disabled={filtered.length === 0}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => void refresh()}
              disabled={loading}
            >
              {loading ? "Actualisation…" : "Actualiser"}
            </button>
          </div>
        }
      />

      <section className="leads-kpis" aria-label="Indicateurs clients">
        <article className="leads-kpi leads-kpi--accent">
          <p>Prospects</p>
          <strong>{stats.prospect}</strong>
          <span>à convertir</span>
        </article>
        <article className="leads-kpi">
          <p>Actifs</p>
          <strong>{stats.actif}</strong>
          <span>portefeuille</span>
        </article>
        <article className="leads-kpi">
          <p>Saisis aujourd’hui</p>
          <strong>{stats.today}</strong>
          <span>nouvelles fiches</span>
        </article>
        <article className="leads-kpi">
          <p>Total</p>
          <strong>{stats.total}</strong>
          <span>clients CRM</span>
        </article>
      </section>

      <div className="clients-list-view">
        <section
          className="clients-list-card clients-list-card--wide"
          aria-label="Liste clients"
        >
          <div className="clients-list-card__toolbar">
            <label className="clients-search">
              <IconSearch size={16} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher société, e-mail, ville…"
                aria-label="Rechercher un client"
              />
            </label>
            <div className="clients-filters">
              {(
                [
                  ["all", "Tous", stats.total],
                  ["prospect", "Prospects", stats.prospect],
                  ["actif", "Actifs", stats.actif],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  className={`clients-chip${statusFilter === id ? " is-active" : ""}`}
                  onClick={() => setStatusFilter(id)}
                >
                  {label}
                  <em>{count}</em>
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="clients-alert" role="alert">
              <strong>Erreur</strong>
              <p>{error}</p>
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => void refresh()}
              >
                Réessayer
              </button>
            </div>
          ) : null}

          {loading && clients.length === 0 ? (
            <div className="clients-empty">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="clients-empty">
              <h3>Aucun client</h3>
              <p>Commencez par créer une fiche client.</p>
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => openNewClient(undefined, "Nouveau client")}
              >
                Nouveau client
              </button>
            </div>
          ) : (
            <div className="clients-split">
              <ul className="clients-inbox">
                {filtered.map((c) => {
                  const active = selected?.email === c.email;
                  return (
                    <li key={c.id || c.email}>
                      <button
                        type="button"
                        className={`clients-row${active ? " is-active" : ""}`}
                        onClick={() => setSelectedEmail(c.email)}
                      >
                        <span className="clients-row__av">{initials(c)}</span>
                        <span className="clients-row__body">
                          <strong>{c.company || c.name}</strong>
                          <span>
                            {c.city || "—"} · {STATUS_LABEL[c.status]}
                          </span>
                          <span className="clients-row__preview">
                            {c.lastMessage
                              ? c.lastMessage.slice(0, 90)
                              : "Sans demande"}
                            {c.lastMessage && c.lastMessage.length > 90
                              ? "…"
                              : ""}
                          </span>
                        </span>
                        <time dateTime={c.at}>{formatWhen(c.at)}</time>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {selected ? (
                <article className="clients-detail">
                  <header>
                    <div>
                      <p className="clients-detail__eyebrow">
                        {STATUS_LABEL[selected.status]} ·{" "}
                        {selected.source || "—"}
                      </p>
                      <h3>{selected.company || selected.name}</h3>
                      <p>
                        {selected.name}
                        {selected.city ? ` · ${selected.city}` : ""}
                      </p>
                    </div>
                    <div className="clients-detail__actions">
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        onClick={() =>
                          openNewClient(
                            {
                              name: selected.name,
                              company: selected.company,
                              email: selected.email,
                              phone: selected.phone,
                              city: selected.city,
                              address: selected.address,
                              siteType: selected.siteType,
                              surface: selected.surface,
                              source: selected.source,
                              campaign: selected.campaign,
                              consent: selected.consent,
                            },
                            "Nouvelle demande client",
                          )
                        }
                      >
                        Nouvelle demande
                      </button>
                      {selected.status !== "actif" ? (
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busyEmail === selected.email}
                          onClick={() => void setStatus(selected, "actif")}
                        >
                          Marquer actif
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busyEmail === selected.email}
                          onClick={() => void setStatus(selected, "prospect")}
                        >
                          Repasser prospect
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busyEmail === selected.email}
                        onClick={() => void removeClient(selected)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </header>
                  <dl>
                    <div>
                      <dt>E-mail</dt>
                      <dd>
                        <a href={`mailto:${selected.email}`}>
                          {selected.email}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt>Téléphone</dt>
                      <dd>{selected.phone || "—"}</dd>
                    </div>
                    <div>
                      <dt>Locaux</dt>
                      <dd>
                        {[
                          selected.address,
                          selected.siteType,
                          selected.surface,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Contacts</dt>
                      <dd>{selected.touchCount}</dd>
                    </div>
                    <div>
                      <dt>Saisi par</dt>
                      <dd>{selected.createdBy || "—"}</dd>
                    </div>
                    <div>
                      <dt>Consentement</dt>
                      <dd>{selected.consent ? "Oui" : "Non"}</dd>
                    </div>
                  </dl>
                  <div className="clients-detail__msg">
                    <h4>Dernier besoin soumis</h4>
                    <pre>
                      {selected.lastMessage.trim() ||
                        "Aucun message enregistré."}
                    </pre>
                  </div>
                </article>
              ) : null}
            </div>
          )}
        </section>
      </div>

      {formOpen ? (
        <ClientCreateForm
          key={`${formTitle}-${formSeed?.email || "new"}`}
          embedded
          seed={formSeed}
          title={formTitle}
          onCancel={closeForm}
          onSuccess={async (email) => {
            closeForm();
            setQuery(email);
            setSelectedEmail(email);
            await refresh(true);
          }}
        />
      ) : null}
    </div>
  );
}

export function ClientsWorkspace() {
  return (
    <Suspense fallback={<div className="clients-page">Chargement…</div>}>
      <ClientsWorkspaceInner />
    </Suspense>
  );
}
