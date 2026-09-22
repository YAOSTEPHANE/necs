"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconSearch, IconUser } from "@/components/admin/Icons";
import {
  DEFAULT_PROSPECT_STATUSES,
  PROSPECT_POTENTIAL_LABELS,
  PROSPECT_POTENTIALS,
  formatProspectFcfa,
  prospectSourceLabel,
  type Prospect,
  type ProspectPotential,
  type ProspectStatusDef,
} from "@/lib/prospects-shared";
import { NeedQualificationPanel } from "@/components/admin/NeedQualificationPanel";
import {
  ProspectCreateForm,
  type ProspectDraft,
} from "@/components/admin/ProspectCreateForm";
import { toast } from "@/lib/toast";

function formatWhen(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(statuses: ProspectStatusDef[], id: string) {
  return statuses.find((s) => s.id === id)?.label || id;
}

function statusColor(statuses: ProspectStatusDef[], id: string) {
  return statuses.find((s) => s.id === id)?.color || "#64748b";
}

function initials(company: string) {
  return (company || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export function ProspectsWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const [items, setItems] = useState<Prospect[]>([]);
  const [statuses, setStatuses] = useState<ProspectStatusDef[]>(
    DEFAULT_PROSPECT_STATUSES,
  );
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canConfigure, setCanConfigure] = useState(false);
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ouverts");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignName, setAssignName] = useState("");
  const [contactDraft, setContactDraft] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });
  const [configOpen, setConfigOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState<ProspectStatusDef[]>([]);
  const [potentialValueDraft, setPotentialValueDraft] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prospects", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: Prospect[];
        statuses?: ProspectStatusDef[];
        canManage?: boolean;
        canConfigure?: boolean;
        email?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items ?? []);
      setStatuses(data.statuses ?? DEFAULT_PROSPECT_STATUSES);
      setCanManage(Boolean(data.canManage));
      setCanConfigure(Boolean(data.canConfigure));
      setEmail(data.email ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Recherche serveur (recette CRM-01 : créer / rechercher / qualifier). */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const res = await fetch(
            `/api/prospects?q=${encodeURIComponent(q)}`,
            { cache: "no-store" },
          );
          const data = (await res.json()) as {
            items?: Prospect[];
            error?: string;
          };
          if (!res.ok) throw new Error(data.error || "Recherche impossible");
          if (data.items) {
            setItems((prev) => {
              const byId = new Map(prev.map((p) => [p.id, p]));
              for (const hit of data.items!) byId.set(hit.id, hit);
              return Array.from(byId.values()).sort((a, b) =>
                b.updatedAt.localeCompare(a.updatedAt),
              );
            });
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Erreur");
        } finally {
          setSearching(false);
        }
      })();
    }, 320);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!composerOpen && !configOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setComposerOpen(false);
        setConfigOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [composerOpen, configOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      const terminal = statuses.find((s) => s.id === p.status)?.terminal;
      if (statusFilter === "ouverts" && terminal) return false;
      if (statusFilter === "miens" && email) {
        if (p.assigneeEmail.toLowerCase() !== email.toLowerCase()) return false;
      }
      if (
        statusFilter !== "all" &&
        statusFilter !== "ouverts" &&
        statusFilter !== "miens" &&
        p.status !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        p.company.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.email.includes(q) ||
        p.phone.includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.source.toLowerCase().includes(q) ||
        p.campaign.toLowerCase().includes(q) ||
        p.contacts.some(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.email.includes(q) ||
            c.phone.includes(q),
        )
      );
    });
  }, [items, query, statusFilter, statuses, email]);

  useEffect(() => {
    if (!filtered.length) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((p) => p.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setPotentialValueDraft("");
      return;
    }
    setPotentialValueDraft(
      selected.potentialValue ? String(selected.potentialValue) : "",
    );
    setAssignEmail(selected.assigneeEmail || "");
    setAssignName(selected.assigneeName || "");
  }, [selected]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const s of statuses) byStatus[s.id] = 0;
    let ouverts = 0;
    let miens = 0;
    let pipeline = 0;
    for (const p of items) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      if (!statuses.find((s) => s.id === p.status)?.terminal) {
        ouverts += 1;
        pipeline += p.potentialValue || 0;
      }
      if (email && p.assigneeEmail.toLowerCase() === email.toLowerCase()) {
        miens += 1;
      }
    }
    return { total: items.length, ouverts, miens, byStatus, pipeline };
  }, [items, statuses, email]);

  async function patch(action: string, body: Record<string, unknown> = {}) {
    if (!selected) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, action, ...body }),
      });
      const data = (await res.json()) as { item?: Prospect; error?: string };
      if (!res.ok) throw new Error(data.error || "Échec");
      if (data.item) {
        setItems((prev) =>
          prev.map((p) => (p.id === data.item!.id ? data.item! : p)),
        );
        const labels: Record<string, string> = {
          qualify: "Prospect qualifié",
          assign: "Attribution mise à jour",
          status: "Statut mis à jour",
          "add-contact": "Contact ajouté",
          "remove-contact": "Contact retiré",
          update: "Dossier mis à jour",
        };
        toast.success(labels[action] || "Prospect mis à jour");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  async function createProspect(draftPayload: ProspectDraft) {
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draftPayload,
          potentialValue: Number(draftPayload.potentialValue) || 0,
          assigneeEmail: email,
        }),
      });
      const data = (await res.json()) as {
        item?: Prospect;
        opportunity?: { needComplete?: boolean };
        duplicate?: boolean;
        warning?: string;
        error?: string;
      };
      if (res.status === 409 && data.item) {
        setItems((prev) => {
          if (prev.some((p) => p.id === data.item!.id)) return prev;
          return [data.item!, ...prev];
        });
        setSelectedId(data.item.id);
        setComposerOpen(false);
        toast.error("Déduplication : dossier déjà existant (ouvert)");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Création impossible");
      if (data.item) {
        setItems((prev) => [data.item!, ...prev]);
        setSelectedId(data.item.id);
        setComposerOpen(false);
        if (data.warning) {
          toast.warning(data.warning);
        } else if (data.opportunity?.needComplete) {
          toast.success("Prospect créé — besoin complet (étude possible)");
        } else {
          toast.success(
            "Prospect créé — complétez contacts / besoin pour qualifier",
          );
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  async function openStatusConfig() {
    try {
      const res = await fetch("/api/prospects?meta=statuses", {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        statuses?: ProspectStatusDef[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement statuts");
      setStatusDraft(data.statuses ?? DEFAULT_PROSPECT_STATUSES);
      setConfigOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  }

  async function saveStatuses(e: FormEvent) {
    e.preventDefault();
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-statuses",
          statuses: statusDraft,
        }),
      });
      const data = (await res.json()) as {
        statuses?: ProspectStatusDef[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible");
      setStatuses((data.statuses ?? statusDraft).filter((s) => s.active));
      setConfigOpen(false);
      toast.success("Statuts configurés");
      void refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  const headerActions = (
    <div className="leads-header-actions">
      {canConfigure ? (
        <button
          type="button"
          className="btn-admin btn-admin--ghost"
          onClick={() => void openStatusConfig()}
        >
          Statuts
        </button>
      ) : null}
      <button
        type="button"
        className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
        onClick={() => void refresh()}
        disabled={loading}
      >
        {loading ? "Actualisation…" : "Actualiser"}
      </button>
      {canManage ? (
        <button
          type="button"
          className="btn-admin btn-admin--primary"
          onClick={() => setComposerOpen(true)}
        >
          Nouveau prospect
        </button>
      ) : null}
    </div>
  );

  return (
    <div
      className={`leads-page prospects-page${embedded ? " prospects-page--embedded" : ""}`}
      data-testid="prospects-workspace"
    >
      {embedded ? (
        <div className="fin-embedded-bar prospects-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">CRM-01 · Prospects</p>
            <h2>Dossiers prospects</h2>
            <p>
              Dossier unique, contacts, source, potentiel et historique —
              déduplication e-mail, attribution, statuts configurables
            </p>
          </div>
          {headerActions}
        </div>
      ) : (
        <ModuleHeader
          tone="#1260a8"
          badge="CRM-01 · Commercial"
          icon={<IconUser size={20} />}
          title="Prospects"
          meta={
            <>
              <span>
                <strong>{counts.total}</strong> dossiers
              </span>
              <span>
                <strong>{counts.ouverts}</strong> ouverts
              </span>
              <span>
                Pipeline{" "}
                <strong>{formatProspectFcfa(counts.pipeline)}</strong>
              </span>
            </>
          }
          actions={headerActions}
        />
      )}

      <section className="leads-kpis" aria-label="Indicateurs prospects">
        <article className="leads-kpi leads-kpi--accent">
          <p>Ouverts</p>
          <strong>{counts.ouverts}</strong>
          <span>pipeline commercial</span>
        </article>
        <article className="leads-kpi">
          <p>Qualifiés</p>
          <strong>{counts.byStatus.qualifie ?? 0}</strong>
          <span>prêts étude / visite</span>
        </article>
        <article className="leads-kpi">
          <p>Mes dossiers</p>
          <strong>{counts.miens}</strong>
          <span>attribution</span>
        </article>
        <article className="leads-kpi offers-kpi--value">
          <p>Potentiel ouvert</p>
          <strong>{formatProspectFcfa(counts.pipeline)}</strong>
          <span>{counts.total} dossiers uniques</span>
        </article>
      </section>

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher entreprise, contact, e-mail, source…"
            aria-label="Recherche prospects"
          />
          {searching ? <em className="leads-search__hint">Recherche…</em> : null}
        </label>
        <div className="leads-filters" role="tablist" aria-label="Filtres">
          {(
            [
              ["ouverts", "Ouverts", counts.ouverts],
              ["miens", "Mes dossiers", counts.miens],
              ["all", "Tous", counts.total],
              ...statuses.map(
                (s) =>
                  [s.id, s.label, counts.byStatus[s.id] ?? 0] as const,
              ),
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={statusFilter === id}
              className={`leads-chip${statusFilter === id ? " is-active" : ""}`}
              onClick={() => setStatusFilter(id)}
            >
              {label}
              {count > 0 ? <em>{count}</em> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="leads-layout">
        <div className="leads-list" role="listbox" aria-label="Prospects">
          {loading && items.length === 0 ? (
            <div className="leads-empty">
              <h2>Chargement…</h2>
            </div>
          ) : filtered.length === 0 ? (
            <div className="leads-empty">
              <IconUser size={28} />
              <h2>Aucun prospect</h2>
              <p>
                Créez un dossier unique (e-mail dédoublonné), renseignez source
                et contacts, puis qualifiez.
              </p>
              {canManage ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={() => setComposerOpen(true)}
                >
                  Nouveau prospect
                </button>
              ) : null}
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={selectedId === p.id}
                className={`leads-card prospect-card${selectedId === p.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(p.id)}
              >
                <span
                  className="leads-card__avatar"
                  style={{
                    background: `${statusColor(statuses, p.status)}22`,
                    color: statusColor(statuses, p.status),
                  }}
                >
                  {initials(p.company)}
                </span>
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{p.company}</strong>
                    <time>{formatWhen(p.updatedAt)}</time>
                  </span>
                  <span className="leads-card__mid">
                    <span
                      className="prospect-status"
                      style={{
                        background: `${statusColor(statuses, p.status)}18`,
                        color: statusColor(statuses, p.status),
                      }}
                    >
                      {statusLabel(statuses, p.status)}
                    </span>
                    <span>{PROSPECT_POTENTIAL_LABELS[p.potential]}</span>
                  </span>
                  <span className="leads-card__preview">
                    {p.name} · {prospectSourceLabel(p.source)}
                    {p.assigneeName ? ` · ${p.assigneeName}` : ""}
                  </span>
                  {p.potentialValue > 0 ? (
                    <span className="leads-card__meta">
                      {formatProspectFcfa(p.potentialValue)}
                    </span>
                  ) : null}
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail prospect-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <IconUser size={28} />
              <h2>Sélectionnez un prospect</h2>
              <p>
                Consultez le dossier, gérez les contacts, attribuez et
                qualifiez pour la suite CRM.
              </p>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    <span
                      className="prospect-status"
                      style={{
                        background: `${statusColor(statuses, selected.status)}18`,
                        color: statusColor(statuses, selected.status),
                      }}
                    >
                      {statusLabel(statuses, selected.status)}
                    </span>
                    <span>{selected.id}</span>
                  </p>
                  <h2>{selected.company}</h2>
                  <p className="leads-detail__sub">
                    {selected.name} · {selected.email}
                    {selected.phone ? ` · ${selected.phone}` : ""}
                  </p>
                </div>
                <div className="fin-detail-total">
                  <span>Potentiel</span>
                  <strong>
                    {selected.potentialValue
                      ? formatProspectFcfa(selected.potentialValue)
                      : PROSPECT_POTENTIAL_LABELS[selected.potential]}
                  </strong>
                </div>
              </header>

              <div className="leads-detail__actions prospect-detail__actions">
                {canManage ? (
                  <>
                    <Link
                      href={`/admin/commercial?tab=qualification&prospectId=${encodeURIComponent(selected.id)}`}
                      className="btn-admin btn-admin--ghost"
                    >
                      Qualifier le besoin
                    </Link>
                    <Link
                      href={`/admin/commercial?tab=audit-visite&prospectId=${encodeURIComponent(selected.id)}`}
                      className="btn-admin btn-admin--ghost"
                    >
                      Visite technique
                    </Link>
                    <Link
                      href="/admin/commercial?tab=offre"
                      className="btn-admin btn-admin--ghost"
                    >
                      Offre
                    </Link>
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy || Boolean(selected.qualifiedAt)}
                      onClick={() =>
                        void patch("qualify", {
                          potential: selected.potential,
                          potentialValue:
                            Number(potentialValueDraft) ||
                            selected.potentialValue,
                        })
                      }
                    >
                      {selected.qualifiedAt ? "Déjà qualifié" : "Qualifier"}
                    </button>
                  </>
                ) : null}
              </div>

              <section className="fin-section">
                <h3>Dossier</h3>
                <dl className="fin-dl">
                  <div>
                    <dt>Source</dt>
                    <dd>{prospectSourceLabel(selected.source)}</dd>
                  </div>
                  <div>
                    <dt>Campagne</dt>
                    <dd>{selected.campaign || "—"}</dd>
                  </div>
                  <div>
                    <dt>Potentiel</dt>
                    <dd>{PROSPECT_POTENTIAL_LABELS[selected.potential]}</dd>
                  </div>
                  <div>
                    <dt>Valeur estimée</dt>
                    <dd>
                      {selected.potentialValue
                        ? formatProspectFcfa(selected.potentialValue)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Attribution</dt>
                    <dd>
                      {selected.assigneeName ||
                        selected.assigneeEmail ||
                        "Non attribué"}
                    </dd>
                  </div>
                  <div>
                    <dt>Ville</dt>
                    <dd>{selected.city || "—"}</dd>
                  </div>
                  <div>
                    <dt>Contacts</dt>
                    <dd>{selected.contacts.length}</dd>
                  </div>
                  <div>
                    <dt>Qualifié</dt>
                    <dd>
                      {selected.qualifiedAt
                        ? `${formatWhen(selected.qualifiedAt)} · ${selected.qualifiedByName}`
                        : "Non"}
                    </dd>
                  </div>
                </dl>
                {selected.note ? (
                  <p className="fin-block" style={{ marginTop: "0.75rem" }}>
                    {selected.note}
                  </p>
                ) : null}
              </section>

              {canManage ? (
                <section className="fin-section">
                  <h3>Pilotage</h3>
                  <div className="prospect-actions">
                    <p className="prospect-actions__label">Statut</p>
                    <div className="recruit-actions__row">
                      {statuses.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`btn-admin btn-admin--ghost${selected.status === s.id ? " is-active" : ""}`}
                          disabled={busy || selected.status === s.id}
                          onClick={() => void patch("status", { status: s.id })}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <p className="prospect-actions__label">Potentiel</p>
                    <div className="recruit-actions__row">
                      {PROSPECT_POTENTIALS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`btn-admin btn-admin--ghost${selected.potential === p ? " is-active" : ""}`}
                          disabled={busy || selected.potential === p}
                          onClick={() => void patch("update", { potential: p })}
                        >
                          {PROSPECT_POTENTIAL_LABELS[p]}
                        </button>
                      ))}
                    </div>

                    <div className="recruit-actions__row prospect-value-row">
                      <label>
                        <span>Valeur potentielle (FCFA)</span>
                        <input
                          type="number"
                          min={0}
                          value={potentialValueDraft}
                          onChange={(e) =>
                            setPotentialValueDraft(e.target.value)
                          }
                          placeholder="0"
                        />
                      </label>
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy}
                        onClick={() =>
                          void patch("update", {
                            potentialValue: Number(potentialValueDraft) || 0,
                          })
                        }
                      >
                        Enregistrer valeur
                      </button>
                    </div>

                    <p className="prospect-actions__label">Attribution</p>
                    <div className="recruit-actions__row">
                      <input
                        value={assignEmail}
                        onChange={(e) => setAssignEmail(e.target.value)}
                        placeholder="E-mail commercial"
                        type="email"
                      />
                      <input
                        value={assignName}
                        onChange={(e) => setAssignName(e.target.value)}
                        placeholder="Nom"
                      />
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={busy || !assignEmail.trim()}
                        onClick={() =>
                          void patch("assign", {
                            assigneeEmail: assignEmail,
                            assigneeName: assignName,
                          })
                        }
                      >
                        Attribuer
                      </button>
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy || !email}
                        onClick={() =>
                          void patch("assign", {
                            assigneeEmail: email,
                            assigneeName: "Moi",
                          })
                        }
                      >
                        M’attribuer
                      </button>
                    </div>
                  </div>
                </section>
              ) : null}

              {canManage ? (
                <NeedQualificationPanel
                  key={selected.id}
                  prospectId={selected.id}
                  company={selected.company}
                  embedded
                />
              ) : null}

              <section className="fin-section prospect-contacts">
                <h3>Contacts</h3>
                <ul>
                  {selected.contacts.map((c) => (
                    <li key={c.id}>
                      <div>
                        <strong>
                          {c.name}
                          {c.isPrimary ? " · principal" : ""}
                        </strong>
                        <span>
                          {[c.role, c.email, c.phone]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </div>
                      {canManage && selected.contacts.length > 1 ? (
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void patch("remove-contact", {
                              contactId: c.id,
                            })
                          }
                        >
                          Retirer
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canManage ? (
                  <form
                    className="prospect-contact-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void patch("add-contact", contactDraft).then(() =>
                        setContactDraft({
                          name: "",
                          email: "",
                          phone: "",
                          role: "",
                        }),
                      );
                    }}
                  >
                    <input
                      required
                      value={contactDraft.name}
                      onChange={(e) =>
                        setContactDraft((d) => ({
                          ...d,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Nom *"
                    />
                    <input
                      value={contactDraft.email}
                      onChange={(e) =>
                        setContactDraft((d) => ({
                          ...d,
                          email: e.target.value,
                        }))
                      }
                      placeholder="E-mail"
                    />
                    <input
                      value={contactDraft.phone}
                      onChange={(e) =>
                        setContactDraft((d) => ({
                          ...d,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="Téléphone"
                    />
                    <input
                      value={contactDraft.role}
                      onChange={(e) =>
                        setContactDraft((d) => ({
                          ...d,
                          role: e.target.value,
                        }))
                      }
                      placeholder="Fonction"
                    />
                    <button
                      type="submit"
                      className="btn-admin btn-admin--primary"
                      disabled={busy}
                    >
                      Ajouter contact
                    </button>
                  </form>
                ) : null}
              </section>

              <section className="offers-history prospect-history">
                <h3>Historique</h3>
                <ol>
                  {selected.history.slice(0, 24).map((h) => (
                    <li key={h.id}>
                      <div className="offers-history__top">
                        <strong>{h.detail}</strong>
                        <span>{formatWhen(h.at)}</span>
                      </div>
                      <p className="offers-history__meta">{h.byName}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </article>
      </div>

      {composerOpen ? (
        <ProspectCreateForm
          busy={busy}
          onClose={() => setComposerOpen(false)}
          onSubmit={createProspect}
        />
      ) : null}

      <AdminOverlayPortal open={configOpen}>
        <div
          className="doc-overlay-backdrop clients-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfigOpen(false);
          }}
        >
          <div
            className="doc-overlay-dialog clients-overlay__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prospect-status-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="doc-overlay-header">
              <div className="doc-overlay-header__left">
                <p className="doc-overlay-header__tag">Configuration</p>
                <h2 id="prospect-status-title">Statuts configurables</h2>
              </div>
              <div className="doc-overlay-header__right">
                <button
                  type="submit"
                  form="necs-prospect-statuses"
                  className="btn-admin btn-admin--primary"
                  disabled={busy}
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  className="doc-overlay-close-btn"
                  aria-label="Fermer"
                  onClick={() => setConfigOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="clients-overlay__body">
              <form
                id="necs-prospect-statuses"
                onSubmit={saveStatuses}
                className="prospect-status-config overlay-form-scroll"
              >
                <p className="doc-overlay-header__sub">
                  Règle CRM-01 : statuts configurables (qualifie / terminal /
                  actif).
                </p>
                {statusDraft.map((s, idx) => (
                  <div key={s.id} className="prospect-status-config__row">
                    <input
                      value={s.label}
                      onChange={(e) =>
                        setStatusDraft((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, label: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="Libellé"
                    />
                    <input
                      value={s.color}
                      onChange={(e) =>
                        setStatusDraft((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, color: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="#couleur"
                    />
                    <label>
                      <input
                        type="checkbox"
                        checked={s.qualifies}
                        onChange={(e) =>
                          setStatusDraft((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, qualifies: e.target.checked }
                                : x,
                            ),
                          )
                        }
                      />
                      Qualifie
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={s.terminal}
                        onChange={(e) =>
                          setStatusDraft((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, terminal: e.target.checked }
                                : x,
                            ),
                          )
                        }
                      />
                      Terminal
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={s.active}
                        onChange={(e) =>
                          setStatusDraft((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, active: e.target.checked }
                                : x,
                            ),
                          )
                        }
                      />
                      Actif
                    </label>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  onClick={() =>
                    setStatusDraft((prev) => [
                      ...prev,
                      {
                        id: `statut_${prev.length + 1}`,
                        label: "Nouveau statut",
                        color: "#64748b",
                        qualifies: false,
                        terminal: false,
                        active: true,
                        order: (prev.length + 1) * 10,
                      },
                    ])
                  }
                >
                  Ajouter un statut
                </button>
              </form>
            </div>
          </div>
        </div>
      </AdminOverlayPortal>
    </div>
  );
}
