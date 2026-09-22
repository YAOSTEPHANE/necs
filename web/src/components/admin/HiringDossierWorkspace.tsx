"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { RhWorkspaceShell } from "@/components/admin/RhWorkspaceShell";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import {
  AdminFormWizard,
  FwPanel,
  FwPanelHead,
  FwGrid,
  FwField,
  FwReview,
  FwReviewCard,
} from "@/components/admin/form-wizard";
import { IconSearch, IconUser } from "@/components/admin/Icons";
import {
  HIRING_DOSSIER_STATUS_LABELS,
  PIECE_STATUS_LABELS,
  hiringReadinessRequirements,
  type HiringChecklistItemDef,
  type HiringDossierStatus,
  type HiringHistoryEntry,
  type HiringPiece,
  type HiringPieceStatus,
  type HiringPieceView,
} from "@/lib/dossier-embauche-shared";
import { toast } from "@/lib/toast";

type HiringDossierItem = {
  id: string;
  employeeName: string;
  email: string;
  phone: string;
  roleTarget: string;
  startDate: string;
  recruitmentId: string;
  status: HiringDossierStatus;
  pieces: HiringPiece[];
  rhOwner: string;
  comments: string;
  history: HiringHistoryEntry[];
  createdAt: number;
  updatedAt: number;
  views: HiringPieceView[];
  summary: {
    missingCount: number;
    expiredCount: number;
    alertCount: number;
    presentCount: number;
    requiredTotal: number;
    suggestedStatus: HiringDossierStatus;
  };
};

type Draft = {
  employeeName: string;
  email: string;
  phone: string;
  roleTarget: string;
  startDate: string;
  rhOwner: string;
  comments: string;
};

const EMPTY_DRAFT: Draft = {
  employeeName: "",
  email: "",
  phone: "",
  roleTarget: "Agent terrain / Nettoyeur",
  startDate: "",
  rhOwner: "",
  comments: "",
};

type Filter =
  | "all"
  | "incomplet"
  | "complet"
  | "valide"
  | "bloque"
  | "manquants"
  | "expires"
  | "alertes";

function formatWhen(ts: number | string) {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: HiringPieceStatus): string {
  switch (status) {
    case "manquant":
      return "is-missing";
    case "expire":
      return "is-expired";
    case "alerte":
      return "is-alert";
    case "present":
      return "is-ok";
    case "optionnel_manquant":
      return "is-optional";
    default:
      return "";
  }
}

export function HiringDossierWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<HiringDossierItem[]>([]);
  const [checklist, setChecklist] = useState<HiringChecklistItemDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<
    "collaborateur" | "mission" | "revue"
  >("collaborateur");
  const [composerShake, setComposerShake] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [configDraft, setConfigDraft] = useState<HiringChecklistItemDef[]>([]);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, metaRes] = await Promise.all([
        fetch("/api/dossier-embauche", { cache: "no-store" }),
        fetch("/api/dossier-embauche?meta=1", { cache: "no-store" }),
      ]);
      const listData = (await listRes.json()) as {
        items?: HiringDossierItem[];
        error?: string;
      };
      const metaData = (await metaRes.json()) as {
        checklist?: HiringChecklistItemDef[];
        error?: string;
      };
      if (!listRes.ok) {
        toast.error(listData.error || "Chargement impossible");
        return;
      }
      setItems(listData.items || []);
      if (metaRes.ok) {
        setChecklist(metaData.checklist || []);
        setConfigDraft(metaData.checklist || []);
      }
    } catch {
      toast.error("Réseau indisponible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId],
  );

  const stats = useMemo(() => {
    let missing = 0;
    let expired = 0;
    let alerts = 0;
    let incomplets = 0;
    const byStatus: Record<string, number> = {};
    let manquants = 0;
    let expires = 0;
    let alertes = 0;
    for (const d of items) {
      missing += d.summary.missingCount;
      expired += d.summary.expiredCount;
      alerts += d.summary.alertCount;
      if (d.summary.missingCount > 0 || d.summary.expiredCount > 0) {
        incomplets += 1;
      }
      if (d.summary.missingCount > 0) manquants += 1;
      if (d.summary.expiredCount > 0) expires += 1;
      if (d.summary.alertCount > 0) alertes += 1;
      byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
    }
    return {
      total: items.length,
      incomplets,
      missing,
      expired,
      alerts,
      filters: {
        all: items.length,
        manquants,
        expires,
        alertes,
        incomplet: byStatus.incomplet ?? 0,
        complet: byStatus.complet ?? 0,
        valide: byStatus.valide ?? 0,
        bloque: byStatus.bloque ?? 0,
      },
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === "manquants" && i.summary.missingCount === 0) return false;
      if (filter === "expires" && i.summary.expiredCount === 0) return false;
      if (filter === "alertes" && i.summary.alertCount === 0) return false;
      if (
        filter !== "all" &&
        filter !== "manquants" &&
        filter !== "expires" &&
        filter !== "alertes" &&
        i.status !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        i.employeeName.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.roleTarget.toLowerCase().includes(q) ||
        i.rhOwner.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  async function patch(body: Record<string, unknown>) {
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/dossier-embauche", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        item?: HiringDossierItem;
        checklist?: HiringChecklistItemDef[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Action impossible");
        return;
      }
      if (data.item) {
        setItems((prev) =>
          prev.map((p) => (p.id === data.item!.id ? data.item! : p)),
        );
        setSelectedId(data.item.id);
      }
      if (data.checklist) {
        setChecklist(data.checklist);
        setConfigDraft(data.checklist);
        toast.success("Checklist enregistrée");
        await refresh();
        return;
      }
      toast.success("Dossier mis à jour");
    } catch {
      toast.error("Réseau indisponible");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  async function createDossier(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/dossier-embauche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as {
        item?: HiringDossierItem;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Création impossible");
        return;
      }
      if (data.item) {
        setItems((prev) => [data.item!, ...prev]);
        setSelectedId(data.item.id);
      }
      setComposerOpen(false);
      setComposerStep("collaborateur");
      setDraft(EMPTY_DRAFT);
      toast.success("Dossier ouvert");
    } catch {
      toast.error("Réseau indisponible");
    } finally {
      setCreating(false);
    }
  }

  const collabReady =
    Boolean(draft.employeeName.trim()) &&
    Boolean(draft.email.trim()) &&
    draft.email.includes("@");
  const pulseComposerError = () => {
    setComposerShake(true);
    window.setTimeout(() => setComposerShake(false), 420);
  };
  const canEnterComposerStep = (id: string) => {
    if (id === "collaborateur") return true;
    return collabReady;
  };

  return (
    <RhWorkspaceShell
      embedded={embedded}
      className="leads-page hiring-page"
      tone="#0a3a72"
      badge="Embauche"
      eyebrow="Dossier d’embauche"
      icon={<IconUser size={20} />}
      title="Dossier d’embauche"
      meta={
        <>
          <span>
            <strong>{stats.total}</strong> dossiers
          </span>
          <span>
            <strong>{stats.missing}</strong> pièces manquantes
          </span>
          <span>
            <strong>{stats.expired}</strong> expirées
          </span>
          <span>
            <strong>{stats.alerts}</strong> alertes
          </span>
        </>
      }
      actions={
        <>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={() => {
              setComposerStep("collaborateur");
              setComposerOpen(true);
            }}
          >
            Nouveau dossier
          </button>
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            onClick={() => {
              setConfigDraft(checklist);
              setConfigOpen(true);
            }}
          >
            Checklist
          </button>
          <button
            type="button"
            className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        </>
      }
    >
      {(stats.missing > 0 || stats.expired > 0 || stats.alerts > 0) && (
        <div className="rh-alerts-bar hiring-alerts-bar" role="status">
          {stats.missing > 0 ? (
            <span className="rh-alert rh-alert--warn hiring-alert hiring-alert--missing">
              {stats.missing} pièce{stats.missing > 1 ? "s" : ""} manquante
              {stats.missing > 1 ? "s" : ""}
            </span>
          ) : null}
          {stats.expired > 0 ? (
            <span className="rh-alert rh-alert--danger hiring-alert hiring-alert--expired">
              {stats.expired} pièce{stats.expired > 1 ? "s" : ""} expirée
              {stats.expired > 1 ? "s" : ""}
            </span>
          ) : null}
          {stats.alerts > 0 ? (
            <span className="rh-alert rh-alert--info hiring-alert hiring-alert--warn">
              {stats.alerts} expiration{stats.alerts > 1 ? "s" : ""} proche
              {stats.alerts > 1 ? "s" : ""}
            </span>
          ) : null}
          <span className="rh-alerts-bar__hint hiring-alerts-bar__hint">
            Contrôle obligatoire avant intégration.
          </span>
        </div>
      )}

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, poste, RH…"
          />
        </label>
        <div className="leads-filters" role="tablist" aria-label="Filtres dossiers">
          {(
            [
              ["all", "Tous"],
              ["manquants", "Manquants"],
              ["expires", "Expirés"],
              ["alertes", "Alertes"],
              ["incomplet", "Incomplets"],
              ["complet", "Complets"],
              ["valide", "Validés"],
              ["bloque", "Bloqués"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={`leads-chip${filter === id ? " is-active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
              <em>{stats.filters[id] ?? 0}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="leads-split">
        <section className="leads-list-card">
          <header className="leads-list-card__head">
            <h2>Dossiers</h2>
            <p>
              {filtered.length} dossier{filtered.length > 1 ? "s" : ""}
            </p>
          </header>
          {loading && items.length === 0 ? (
            <div className="leads-empty">
              <span className="leads-empty__orb" aria-hidden />
              <p className="leads-empty__eyebrow">Embauche</p>
              <h2>Chargement…</h2>
            </div>
          ) : filtered.length === 0 ? (
            <div className="leads-empty">
              <span className="leads-empty__orb" aria-hidden />
              <p className="leads-empty__eyebrow">Dossiers RH</p>
              <h2>Aucun dossier sur ce filtre</h2>
              <p>Créez un dossier ou élargissez le filtre.</p>
            </div>
          ) : (
            <ul className="leads-list">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`leads-row${selectedId === item.id ? " is-active" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div className="leads-row__top">
                      <strong>{item.employeeName}</strong>
                      <span className="leads-pill">
                        {HIRING_DOSSIER_STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <p>
                      {item.roleTarget}
                      {item.startDate ? ` · début ${item.startDate}` : ""}
                    </p>
                    <p className="leads-row__meta hiring-row-flags">
                      {item.summary.missingCount > 0 ? (
                        <span className="hiring-flag hiring-flag--missing">
                          {item.summary.missingCount} manquant
                          {item.summary.missingCount > 1 ? "s" : ""}
                        </span>
                      ) : null}
                      {item.summary.expiredCount > 0 ? (
                        <span className="hiring-flag hiring-flag--expired">
                          {item.summary.expiredCount} expiré
                          {item.summary.expiredCount > 1 ? "s" : ""}
                        </span>
                      ) : null}
                      {item.summary.alertCount > 0 ? (
                        <span className="hiring-flag hiring-flag--alert">
                          {item.summary.alertCount} alerte
                          {item.summary.alertCount > 1 ? "s" : ""}
                        </span>
                      ) : null}
                      {item.summary.missingCount === 0 &&
                      item.summary.expiredCount === 0 &&
                      item.summary.alertCount === 0 ? (
                        <span className="hiring-flag hiring-flag--ok">
                          Pièces OK
                        </span>
                      ) : null}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="leads-detail-card">
          {!selected ? (
            <div className="leads-empty-detail">
              <p className="leads-empty__eyebrow">Détail</p>
              <h2>Sélectionnez un dossier</h2>
              <p>
                Checklist configurable, dates de validité et alertes avant
                intégration.
              </p>
            </div>
          ) : (
            <article className="leads-detail">
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    {HIRING_DOSSIER_STATUS_LABELS[selected.status]}
                  </p>
                  <h2>{selected.employeeName}</h2>
                  <p>
                    {selected.roleTarget}
                    {selected.startDate ? ` · démarrage ${selected.startDate}` : ""}
                  </p>
                </div>
              </header>

              <div className="hiring-summary-chips">
                <span className="hiring-chip hiring-chip--missing">
                  Manquantes : {selected.summary.missingCount}
                </span>
                <span className="hiring-chip hiring-chip--expired">
                  Expirées : {selected.summary.expiredCount}
                </span>
                <span className="hiring-chip hiring-chip--alert">
                  Alertes : {selected.summary.alertCount}
                </span>
                <span className="hiring-chip hiring-chip--ok">
                  OK : {selected.summary.presentCount}/
                  {selected.summary.requiredTotal} obligatoires
                </span>
              </div>

              {(() => {
                const readiness = hiringReadinessRequirements(selected.views);
                return (
                  <section
                    className={
                      readiness.ok
                        ? "hiring-readiness is-ok"
                        : "hiring-readiness is-blocked"
                    }
                    data-testid="hiring-readiness"
                  >
                    <h3>
                      {readiness.ok
                        ? "Prêt pour intégration"
                        : "Blocages avant intégration"}
                    </h3>
                    {!readiness.ok ? (
                      <div className="hiring-readiness__cols">
                        {readiness.missing.length > 0 ? (
                          <div data-testid="hiring-missing-list">
                            <strong>Pièces manquantes</strong>
                            <ul>
                              {readiness.missing.map((l) => (
                                <li key={l}>{l}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {readiness.expired.length > 0 ? (
                          <div data-testid="hiring-expired-list">
                            <strong>Pièces expirées</strong>
                            <ul>
                              {readiness.expired.map((l) => (
                                <li key={l}>{l}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p data-testid="hiring-ready-ok">
                        Aucune pièce manquante ni expirée.
                      </p>
                    )}
                    {readiness.alerts.length > 0 ? (
                      <div
                        className="hiring-readiness__alerts"
                        data-testid="hiring-alert-list"
                      >
                        <strong>Alertes d’expiration</strong>
                        <ul>
                          {readiness.alerts.map((l) => (
                            <li key={l}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </section>
                );
              })()}

              <dl className="leads-detail__grid">
                <div>
                  <dt>E-mail</dt>
                  <dd>{selected.email || "—"}</dd>
                </div>
                <div>
                  <dt>Téléphone</dt>
                  <dd>{selected.phone || "—"}</dd>
                </div>
                <div>
                  <dt>RH</dt>
                  <dd>{selected.rhOwner || "—"}</dd>
                </div>
                <div>
                  <dt>Maj</dt>
                  <dd>{formatWhen(selected.updatedAt)}</dd>
                </div>
              </dl>

              <div className="hiring-checklist">
                <h3>Pièces du dossier</h3>
                <ul>
                  {selected.views.map((v) => (
                    <li
                      key={v.def.id}
                      className={`hiring-piece ${statusClass(v.status)}`}
                    >
                      <div className="hiring-piece__head">
                        <label className="hiring-piece__check">
                          <input
                            type="checkbox"
                            checked={v.piece.present}
                            disabled={busy}
                            onChange={(e) =>
                              void patch({
                                action: "piece",
                                id: selected.id,
                                itemId: v.def.id,
                                present: e.target.checked,
                              })
                            }
                          />
                          <span>
                            {v.def.label}
                            {v.def.required ? " *" : ""}
                          </span>
                        </label>
                        <span
                          className={`hiring-piece__badge ${statusClass(v.status)}`}
                        >
                          {PIECE_STATUS_LABELS[v.status]}
                        </span>
                      </div>
                      <div className="hiring-piece__dates">
                        <label>
                          Reçu le
                          <input
                            type="date"
                            value={v.piece.receivedAt || ""}
                            disabled={busy || !v.piece.present}
                            onChange={(e) =>
                              void patch({
                                action: "piece",
                                id: selected.id,
                                itemId: v.def.id,
                                present: true,
                                receivedAt: e.target.value || null,
                              })
                            }
                          />
                        </label>
                        <label>
                          Expire le
                          <input
                            type="date"
                            value={v.piece.expiresAt || ""}
                            disabled={busy || !v.piece.present}
                            onChange={(e) =>
                              void patch({
                                action: "piece",
                                id: selected.id,
                                itemId: v.def.id,
                                present: true,
                                expiresAt: e.target.value || null,
                              })
                            }
                          />
                        </label>
                        {v.def.validityDays != null ? (
                          <em>Validité type : {v.def.validityDays} j</em>
                        ) : (
                          <em>Sans expiration</em>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="recruit-actions">
                <h3>Statut d’intégration</h3>
                <div className="recruit-actions__row">
                  {(
                    [
                      ["incomplet", "Incomplet"],
                      ["complet", "Complet"],
                      ["valide", "Valider intégration"],
                      ["bloque", "Bloquer"],
                    ] as const
                  ).map(([value, label]) => {
                    const readiness = hiringReadinessRequirements(
                      selected.views,
                    );
                    const blockedByPieces =
                      (value === "complet" || value === "valide") &&
                      !readiness.ok;
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`btn-admin btn-admin--ghost${value === "valide" ? " hiring-btn-validate" : ""}`}
                        disabled={
                          busy ||
                          selected.status === value ||
                          blockedByPieces
                        }
                        title={
                          blockedByPieces
                            ? readiness.blocking.slice(0, 4).join(" · ")
                            : undefined
                        }
                        data-testid={
                          value === "valide"
                            ? "hiring-validate-btn"
                            : value === "complet"
                              ? "hiring-complet-btn"
                              : undefined
                        }
                        onClick={() =>
                          void patch({
                            action: "status",
                            id: selected.id,
                            status: value,
                          })
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="hiring-validate-hint">
                  Complet / validation refusés tant qu’il reste des pièces
                  manquantes ou expirées (identifiées ci-dessus). Après
                  validation, poursuivre via{" "}
                  <a href="/admin/rh?tab=onboarding">Onboarding</a>.
                </p>
              </div>

              <div className="recruit-history">
                <h3>Historique</h3>
                {selected.history.length === 0 ? (
                  <p className="leads-empty">Aucun événement.</p>
                ) : (
                  <ol>
                    {[...selected.history].reverse().map((h) => (
                      <li key={h.id}>
                        <strong>{formatWhen(h.at)}</strong>
                        <span> · {h.kind}</span>
                        <p>{h.note}</p>
                        <em>
                          {h.byName} ({h.byRole})
                        </em>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </article>
          )}
        </section>
      </div>

      <AdminFormWizard
        open={composerOpen}
        portal
        onClose={() => {
          setComposerOpen(false);
          setComposerStep("collaborateur");
        }}
        titleId="hiring-overlay-title"
        eyebrow="Embauche"
        title="Nouveau dossier d’embauche"
        lead="Ouvrez le dossier collaborateur avec poste et responsable RH."
        steps={[
          {
            id: "collaborateur",
            label: "Collaborateur",
            hint: "Identité",
          },
          { id: "mission", label: "Mission", hint: "Poste & RH" },
          { id: "revue", label: "Revue", hint: "Contrôle avant ouverture" },
        ]}
        stepId={composerStep}
        onStepChange={(id) =>
          setComposerStep(id as "collaborateur" | "mission" | "revue")
        }
        canEnterStep={canEnterComposerStep}
        onStepBlocked={pulseComposerError}
        shake={composerShake}
        formId="necs-hiring-form"
        onSubmit={(e) => void createDossier(e)}
        submitLabel="Ouvrir"
        busy={creating}
        canSubmit={collabReady}
      >
        {composerStep === "collaborateur" ? (
          <FwPanel aria-label="Collaborateur">
            <FwPanelHead
              title="Identité collaborateur"
              description="Coordonnées du futur collaborateur."
            />
            <FwGrid>
              <FwField label="Nom *">
                <input
                  required
                  autoFocus
                  value={draft.employeeName}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      employeeName: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="E-mail *">
                <input
                  required
                  type="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, email: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Téléphone">
                <input
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, phone: e.target.value }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "mission" ? (
          <FwPanel aria-label="Mission">
            <FwPanelHead
              title="Poste & suivi RH"
              description="Rôle cible, démarrage et responsable."
            />
            <FwGrid>
              <FwField label="Poste">
                <input
                  value={draft.roleTarget}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      roleTarget: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Démarrage prévu">
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      startDate: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Responsable RH">
                <input
                  value={draft.rhOwner}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      rhOwner: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Commentaires" wide>
                <textarea
                  rows={2}
                  value={draft.comments}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      comments: e.target.value,
                    }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue avant ouverture"
              description="Le dossier démarre avec la checklist configurable."
            />
            <FwReview>
              <FwReviewCard
                title="Collaborateur"
                rows={[
                  { label: "Nom", value: draft.employeeName || "—" },
                  { label: "E-mail", value: draft.email || "—" },
                  { label: "Téléphone", value: draft.phone || "—" },
                ]}
              />
              <FwReviewCard
                title="Mission"
                rows={[
                  { label: "Poste", value: draft.roleTarget || "—" },
                  { label: "Démarrage", value: draft.startDate || "—" },
                  { label: "RH", value: draft.rhOwner || "—" },
                  {
                    label: "Commentaires",
                    value: draft.comments.trim() || "—",
                  },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>

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
            aria-labelledby="hiring-config-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="doc-overlay-header">
              <div className="doc-overlay-header__left">
                <p className="doc-overlay-header__tag">Configuration</p>
                <h2 id="hiring-config-title">Checklist configurable</h2>
              </div>
              <div className="doc-overlay-header__right">
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  disabled={busy}
                  onClick={() =>
                    void patch({ action: "checklist", items: configDraft })
                  }
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
              <div className="overlay-form-scroll hiring-config-list">
                {configDraft.map((item, idx) => (
                  <div key={item.id} className="hiring-config-row">
                    <input
                      value={item.label}
                      onChange={(e) =>
                        setConfigDraft((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, label: e.target.value } : p,
                          ),
                        )
                      }
                      placeholder="Libellé pièce"
                    />
                    <label>
                      <input
                        type="checkbox"
                        checked={item.required}
                        onChange={(e) =>
                          setConfigDraft((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? { ...p, required: e.target.checked }
                                : p,
                            ),
                          )
                        }
                      />
                      Obligatoire
                    </label>
                    <label>
                      Validité (j)
                      <input
                        type="number"
                        min={0}
                        value={item.validityDays ?? ""}
                        onChange={(e) =>
                          setConfigDraft((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? {
                                    ...p,
                                    validityDays: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  }
                                : p,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Alerte (j avant)
                      <input
                        type="number"
                        min={0}
                        value={item.alertDaysBefore}
                        onChange={(e) =>
                          setConfigDraft((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? {
                                    ...p,
                                    alertDaysBefore: Number(e.target.value) || 0,
                                  }
                                : p,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) =>
                          setConfigDraft((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? { ...p, active: e.target.checked }
                                : p,
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
                    setConfigDraft((prev) => [
                      ...prev,
                      {
                        id: `custom_${Date.now().toString(36)}`,
                        label: "Nouvelle pièce",
                        required: true,
                        validityDays: null,
                        alertDaysBefore: 15,
                        active: true,
                        sort: (prev.length + 1) * 10,
                      },
                    ])
                  }
                >
                  + Ajouter une pièce
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminOverlayPortal>
    </RhWorkspaceShell>
  );
}
