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
import { RhWorkspaceShell } from "@/components/admin/RhWorkspaceShell";
import {
  AdminFormWizard,
  FwPanel,
  FwPanelHead,
  FwGrid,
  FwField,
  FwBlock,
  FwChips,
  FwChip,
  FwReview,
  FwReviewCard,
} from "@/components/admin/form-wizard";
import { IconSearch, IconUser } from "@/components/admin/Icons";
import {
  DEFAULT_RECRUITMENT_CRITERIA,
  RECRUITMENT_DECISION_LABELS,
  RECRUITMENT_STATUS_LABELS,
  RECRUITMENT_STATUSES,
  canEvaluateRecruitment,
  computeCriteriaTotal,
  nextAllowedStatuses,
  recruitmentJourneyRequirements,
  type RecruitmentCriterionScore,
  type RecruitmentDecision,
  type RecruitmentHistoryEntry,
  type RecruitmentStatus,
} from "@/lib/recrutement-shared";
import { toast } from "@/lib/toast";

type RecruitmentItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleTarget: string;
  source: string;
  city: string;
  experience: string;
  message: string;
  status: RecruitmentStatus;
  decision: RecruitmentDecision;
  score: number | null;
  evaluationNote: string;
  criteriaScores: RecruitmentCriterionScore[];
  validatedAt: string | null;
  validatedByEmail: string;
  validatedByName: string;
  managerEmail: string;
  managerName: string;
  history: RecruitmentHistoryEntry[];
  createdAt: number;
  updatedAt: number;
};

type Draft = {
  name: string;
  email: string;
  phone: string;
  roleTarget: string;
  source: string;
  city: string;
  experience: string;
  message: string;
  managerEmail: string;
  managerName: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  email: "",
  phone: "",
  roleTarget: "Agent terrain / Nettoyeur",
  source: "saisie_rh",
  city: "",
  experience: "",
  message: "",
  managerEmail: "",
  managerName: "",
};

const SOURCE_OPTIONS = [
  { value: "saisie_rh", label: "Saisie RH" },
  { value: "annonce", label: "Annonce / job board" },
  { value: "spontanee", label: "Candidature spontanée" },
  { value: "cooptation", label: "Cooptation" },
  { value: "agence", label: "Agence / partenaire" },
] as const;

const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map((o) => [o.value, o.label]),
);

type Filter =
  | "all"
  | "action"
  | RecruitmentStatus
  | "retenu"
  | "refuse"
  | "today";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "action", label: "À traiter" },
  { id: "all", label: "Tous" },
  { id: "candidature", label: "Candidatures" },
  { id: "preselection", label: "Présélection" },
  { id: "entretien", label: "Entretiens" },
  { id: "evaluation", label: "Évaluation" },
  { id: "decision", label: "Décision" },
  { id: "retenu", label: "Retenus" },
  { id: "refuse", label: "Refusés" },
  { id: "today", label: "Aujourd’hui" },
];

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

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function historyKindLabel(kind: RecruitmentHistoryEntry["kind"]) {
  switch (kind) {
    case "created":
      return "Création";
    case "status":
      return "Étape";
    case "evaluation":
      return "Évaluation";
    case "decision":
      return "Décision";
    case "assignment":
      return "Affectation";
    case "note":
      return "Note";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function RecruitmentWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<RecruitmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManageAll, setCanManageAll] = useState(false);
  const [role, setRole] = useState("rh");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("action");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<
    "identite" | "poste" | "revue"
  >("identite");
  const [composerShake, setComposerShake] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [evalScore, setEvalScore] = useState("70");
  const [evalNote, setEvalNote] = useState("");
  const [criteriaDraft, setCriteriaDraft] = useState<
    RecruitmentCriterionScore[]
  >(
    DEFAULT_RECRUITMENT_CRITERIA.map((c) => ({
      criterionId: c.id,
      score: Math.round(c.maxScore * 0.7),
      appreciation: "",
    })),
  );
  const [statusNote, setStatusNote] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recrutement", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: RecruitmentItem[];
        canManageAll?: boolean;
        role?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Chargement impossible");
        return;
      }
      setItems(data.items || []);
      setCanManageAll(Boolean(data.canManageAll));
      setRole(data.role || "rh");
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
    if (!composerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setComposerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [composerOpen]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId],
  );

  useEffect(() => {
    if (selected) {
      setEvalScore(String(selected.score ?? 70));
      setEvalNote(selected.evaluationNote || "");
      if (selected.criteriaScores?.length) {
        setCriteriaDraft(
          DEFAULT_RECRUITMENT_CRITERIA.map((def) => {
            const existing = selected.criteriaScores.find(
              (c) => c.criterionId === def.id,
            );
            return {
              criterionId: def.id,
              score: existing?.score ?? Math.round(def.maxScore * 0.7),
              appreciation: existing?.appreciation ?? "",
            };
          }),
        );
      } else {
        setCriteriaDraft(
          DEFAULT_RECRUITMENT_CRITERIA.map((c) => ({
            criterionId: c.id,
            score: Math.round(c.maxScore * 0.7),
            appreciation: "",
          })),
        );
      }
    }
  }, [selected]);

  useEffect(() => {
    if (selectedId && !items.some((i) => i.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const aTraiter = items.filter(
      (i) =>
        i.decision === "en_attente" &&
        i.status !== "decision",
    ).length;
    return {
      total: items.length,
      aTraiter,
      entretien: items.filter((i) => i.status === "entretien").length,
      retenu: items.filter((i) => i.decision === "retenu").length,
      today: items.filter((i) => new Date(i.createdAt).toDateString() === today)
        .length,
    };
  }, [items]);

  const filterCounts = useMemo(() => {
    const today = new Date().toDateString();
    const counts: Record<Filter, number> = {
      all: items.length,
      action: items.filter(
        (i) => i.decision === "en_attente" && i.status !== "decision",
      ).length,
      candidature: 0,
      preselection: 0,
      entretien: 0,
      evaluation: 0,
      decision: 0,
      retenu: items.filter((i) => i.decision === "retenu").length,
      refuse: items.filter((i) => i.decision === "refuse").length,
      today: items.filter((i) => new Date(i.createdAt).toDateString() === today)
        .length,
    };
    for (const i of items) {
      counts[i.status] += 1;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === "today") {
        if (new Date(i.createdAt).toDateString() !== new Date().toDateString())
          return false;
      } else if (filter === "action") {
        if (i.decision !== "en_attente" || i.status === "decision") return false;
      } else if (filter === "retenu" || filter === "refuse") {
        if (i.decision !== filter) return false;
      } else if (filter !== "all" && i.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.roleTarget.toLowerCase().includes(q) ||
        i.city.toLowerCase().includes(q) ||
        i.managerName.toLowerCase().includes(q) ||
        i.phone.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  async function patchAction(body: Record<string, unknown>) {
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/recrutement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        item?: RecruitmentItem;
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
      toast.success("Parcours mis à jour");
      setStatusNote("");
    } catch {
      toast.error("Réseau indisponible");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  async function createCandidate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/recrutement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as {
        item?: RecruitmentItem;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Création impossible");
        return;
      }
      if (data.item) {
        setItems((prev) => [data.item!, ...prev]);
        setSelectedId(data.item.id);
        setFilter("all");
      }
      setComposerOpen(false);
      setComposerStep("identite");
      setDraft(EMPTY_DRAFT);
      toast.success("Candidature créée");
    } catch {
      toast.error("Réseau indisponible");
    } finally {
      setCreating(false);
    }
  }

  const allowedNext = selected
    ? nextAllowedStatuses(selected.status, role)
    : [];

  const journey = useMemo(
    () => (selected ? recruitmentJourneyRequirements(selected) : null),
    [selected],
  );

  const canEval = selected
    ? canEvaluateRecruitment(selected.status)
    : false;

  const canDecideFinal =
    canManageAll &&
    selected &&
    (selected.status === "evaluation" || selected.status === "decision") &&
    selected.score != null;

  const canPropose =
    !canManageAll &&
    selected &&
    (selected.status === "evaluation" || selected.status === "decision");

  const statusIdx = selected
    ? RECRUITMENT_STATUSES.indexOf(selected.status)
    : -1;

  const identiteReady =
    Boolean(draft.name.trim()) &&
    Boolean(draft.email.trim()) &&
    draft.email.includes("@");

  const pulseComposerError = () => {
    setComposerShake(true);
    window.setTimeout(() => setComposerShake(false), 420);
  };

  const canEnterComposerStep = (id: string) => {
    if (id === "identite") return true;
    return identiteReady;
  };

  return (
    <RhWorkspaceShell
      embedded={embedded}
      className="leads-page recruit-page"
      tone="#0a3a72"
      badge="Recrutement"
      eyebrow="Recrutement"
      icon={<IconUser size={20} />}
      title="Recrutement"
      meta={
        <>
          <span>
            <strong>{stats.aTraiter}</strong> à traiter
          </span>
          <span>
            <strong>{stats.entretien}</strong> entretiens
          </span>
          <span>
            <strong>{stats.retenu}</strong> retenus
          </span>
        </>
      }
      actions={
        <>
          {canManageAll ? (
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setComposerStep("identite");
                setComposerOpen(true);
              }}
            >
              Nouvelle candidature
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
        </>
      }
    >
      <section className="leads-kpis" aria-label="Indicateurs recrutement">
        <article className="leads-kpi leads-kpi--accent">
          <p>À traiter</p>
          <strong>{stats.aTraiter}</strong>
          <span>parcours ouverts</span>
        </article>
        <article className="leads-kpi">
          <p>Entretiens</p>
          <strong>{stats.entretien}</strong>
          <span>en cours</span>
        </article>
        <article className="leads-kpi">
          <p>Retenus</p>
          <strong>{stats.retenu}</strong>
          <span>
              <Link href="/admin/rh?tab=embauche">→ dossier d’embauche</Link>
          </span>
        </article>
        <article className="leads-kpi">
          <p>Aujourd’hui</p>
          <strong>{stats.today}</strong>
          <span>sur {stats.total} dossiers</span>
        </article>
      </section>

      {loading && items.length === 0 ? (
        <div className="leads-empty">
          <span className="leads-empty__orb" aria-hidden />
          <p className="leads-empty__eyebrow">Recrutement</p>
          <h2>Chargement…</h2>
        </div>
      ) : (
        <>
          <div className="leads-toolbar">
            <label className="leads-search">
              <IconSearch size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, poste, ville, manager…"
                aria-label="Rechercher une candidature"
              />
            </label>
            <div className="leads-filters" role="tablist" aria-label="Étapes">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  className={`leads-chip${filter === f.id ? " is-active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                  <em>{filterCounts[f.id] ?? 0}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="leads-shell">
            <div className="leads-inbox" role="listbox" aria-label="Candidatures">
              {filtered.map((item) => {
                const decided = item.decision !== "en_attente";
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={item.id === selectedId}
                    className={`leads-card${item.id === selectedId ? " is-active" : ""}${item.decision === "retenu" ? " recruit-card--ok" : ""}${item.decision === "refuse" ? " recruit-card--ko" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="leads-card__avatar recruit-card__avatar">
                      {initials(item.name || "?")}
                    </span>
                    <span className="leads-card__body">
                      <span className="leads-card__top">
                        <strong>{item.name}</strong>
                        <time>{formatWhen(item.updatedAt)}</time>
                      </span>
                      <span className="leads-card__mid">
                        <span
                          className={`recruit-status recruit-status--${item.status}`}
                        >
                          {RECRUITMENT_STATUS_LABELS[item.status]}
                        </span>
                        {decided ? (
                          <span
                            className={`recruit-decision recruit-decision--${item.decision}`}
                          >
                            {RECRUITMENT_DECISION_LABELS[item.decision]}
                          </span>
                        ) : null}
                        {item.score != null ? (
                          <span className="recruit-score">{item.score}/100</span>
                        ) : null}
                      </span>
                      <span className="leads-card__preview">
                        {item.roleTarget}
                        {item.city ? ` · ${item.city}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <div className="leads-empty">
                  <p className="leads-empty__eyebrow">Pipeline</p>
                  <h2>Aucune candidature</h2>
                  <p>
                    {canManageAll
                      ? "Créez une candidature ou changez de filtre."
                      : "Aucune affectation sur ce filtre."}
                  </p>
                </div>
              ) : null}
            </div>

            <article className="leads-detail recruit-detail">
              {!selected ? (
                <div className="leads-empty-detail">
                  <p className="leads-empty__eyebrow">Détail</p>
                  <h2>Sélectionnez une candidature</h2>
                  <p>
                    Parcours : candidature → présélection → entretien →
                    évaluation → décision.
                  </p>
                </div>
              ) : (
                <>
                  <header className="leads-detail__head">
                    <div>
                      <p className="leads-detail__eyebrow">
                        {SOURCE_LABELS[selected.source] || selected.source}
                        {selected.city ? ` · ${selected.city}` : ""}
                      </p>
                      <h2>{selected.name}</h2>
                      <p className="leads-detail__sub">
                        {selected.roleTarget}
                        {" · "}
                        {selected.email || "Sans e-mail"}
                        {selected.phone ? ` · ${selected.phone}` : ""}
                      </p>
                    </div>
                    <div className="leads-detail__actions">
                      <span
                        className={`recruit-status recruit-status--${selected.status}`}
                      >
                        {RECRUITMENT_STATUS_LABELS[selected.status]}
                      </span>
                      {selected.decision !== "en_attente" ? (
                        <span
                          className={`recruit-decision recruit-decision--${selected.decision}`}
                        >
                          {RECRUITMENT_DECISION_LABELS[selected.decision]}
                        </span>
                      ) : null}
                    </div>
                  </header>

                  <section className="recruit-mission-bar" aria-label="Synthèse">
                    <div>
                      <p className="recruit-mission-bar__label">Étape</p>
                      <strong>
                        {statusIdx + 1}/{RECRUITMENT_STATUSES.length}
                      </strong>
                    </div>
                    <div>
                      <p className="recruit-mission-bar__label">Score</p>
                      <strong
                        className={
                          selected.score == null ? "is-muted" : undefined
                        }
                      >
                        {selected.score != null
                          ? `${selected.score}/100`
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <p className="recruit-mission-bar__label">Manager</p>
                      <strong
                        className={
                          !selected.managerName && !selected.managerEmail
                            ? "is-warn"
                            : undefined
                        }
                      >
                        {selected.managerName ||
                          selected.managerEmail ||
                          "Non affecté"}
                      </strong>
                    </div>
                    <div>
                      <p className="recruit-mission-bar__label">Décision</p>
                      <strong>
                        {RECRUITMENT_DECISION_LABELS[selected.decision]}
                      </strong>
                    </div>
                  </section>

                  <ol className="recruit-pipeline" aria-label="Parcours">
                    {RECRUITMENT_STATUSES.map((st, i) => (
                      <li
                        key={st}
                        className={`recruit-pipeline__step${selected.status === st ? " is-current" : ""}${i < statusIdx ? " is-done" : ""}${i > statusIdx ? " is-todo" : ""}`}
                      >
                        <em>{i + 1}</em>
                        <span>{RECRUITMENT_STATUS_LABELS[st]}</span>
                      </li>
                    ))}
                  </ol>

                  <dl className="leads-detail__grid">
                    <div>
                      <dt>Expérience</dt>
                      <dd>{selected.experience || "—"}</dd>
                    </div>
                    <div>
                      <dt>Créé</dt>
                      <dd>{formatWhen(selected.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Mis à jour</dt>
                      <dd>{formatWhen(selected.updatedAt)}</dd>
                    </div>
                    <div>
                      <dt>Réf.</dt>
                      <dd>{selected.id}</dd>
                    </div>
                  </dl>

                  {selected.message ? (
                    <div className="recruit-motivation">
                      <h3>Motivation / profil</h3>
                      <p>{selected.message}</p>
                    </div>
                  ) : null}

                  {selected.evaluationNote ? (
                    <div className="recruit-motivation recruit-motivation--eval">
                      <h3>Note d’évaluation</h3>
                      <p>{selected.evaluationNote}</p>
                    </div>
                  ) : null}

                  <section
                    className="recruit-panel"
                    data-testid="recruit-journey"
                  >
                    <h3>Parcours historisé</h3>
                    <ol className="recruit-journey-steps">
                      {RECRUITMENT_STATUSES.map((st, i) => {
                        const done = journey?.statusesSeen.includes(st);
                        const current = selected.status === st;
                        return (
                          <li
                            key={st}
                            className={
                              done
                                ? "is-done"
                                : current
                                  ? "is-current"
                                  : undefined
                            }
                          >
                            <em>{i + 1}</em>
                            <span>{RECRUITMENT_STATUS_LABELS[st]}</span>
                          </li>
                        );
                      })}
                    </ol>
                    {journey ? (
                      <p
                        className={
                          journey.ok
                            ? "recruit-recipe ok"
                            : "recruit-recipe pending"
                        }
                        data-testid="recruit-recipe"
                      >
                        {journey.ok
                          ? "Parcours complet historisé"
                          : `Recette : manque ${journey.missing.join(", ")}`}
                      </p>
                    ) : null}
                  </section>

                  <section className="recruit-panel">
                    <h3>Avancer le parcours</h3>
                    {allowedNext.length === 0 ? (
                      <p className="recruit-panel__empty">
                        Aucune transition disponible pour votre rôle à cette
                        étape.
                      </p>
                    ) : (
                      <>
                        <label className="recruit-field">
                          Note de transition
                          <input
                            value={statusNote}
                            onChange={(e) => setStatusNote(e.target.value)}
                            placeholder="Optionnel"
                          />
                        </label>
                        <div className="recruit-actions-row">
                          {allowedNext.map((st) => (
                            <button
                              key={st}
                              type="button"
                              className="btn-admin btn-admin--ghost"
                              disabled={busy}
                              onClick={() =>
                                void patchAction({
                                  action: "status",
                                  id: selected.id,
                                  status: st,
                                  note: statusNote,
                                })
                              }
                            >
                              → {RECRUITMENT_STATUS_LABELS[st]}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </section>

                  <section className="recruit-panel">
                    <h3>Évaluation</h3>
                    {!canEval ? (
                      <p className="recruit-panel__empty">
                        Disponible à partir de l’entretien.
                      </p>
                    ) : (
                      <>
                        <div className="recruit-eval-grid">
                          {DEFAULT_RECRUITMENT_CRITERIA.map((def) => {
                            const row = criteriaDraft.find(
                              (c) => c.criterionId === def.id,
                            )!;
                            return (
                              <label
                                key={def.id}
                                className="recruit-field"
                                style={{ gridColumn: "1 / -1" }}
                              >
                                {def.label} (/{def.maxScore})
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.5rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <input
                                    type="number"
                                    min={0}
                                    max={def.maxScore}
                                    style={{ maxWidth: "5rem" }}
                                    value={row.score}
                                    onChange={(e) => {
                                      const score = Number(e.target.value) || 0;
                                      const next = criteriaDraft.map((c) =>
                                        c.criterionId === def.id
                                          ? { ...c, score }
                                          : c,
                                      );
                                      setCriteriaDraft(next);
                                      setEvalScore(
                                        String(computeCriteriaTotal(next)),
                                      );
                                    }}
                                  />
                                  <input
                                    style={{ flex: 1, minWidth: "10rem" }}
                                    value={row.appreciation}
                                    placeholder="Appréciation…"
                                    onChange={(e) =>
                                      setCriteriaDraft((prev) =>
                                        prev.map((c) =>
                                          c.criterionId === def.id
                                            ? {
                                                ...c,
                                                appreciation: e.target.value,
                                              }
                                            : c,
                                        ),
                                      )
                                    }
                                  />
                                </div>
                              </label>
                            );
                          })}
                          <label className="recruit-field">
                            Score global /100
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={evalScore}
                              onChange={(e) => setEvalScore(e.target.value)}
                            />
                          </label>
                          <label className="recruit-field recruit-field--grow">
                            Synthèse
                            <input
                              value={evalNote}
                              onChange={(e) => setEvalNote(e.target.value)}
                              placeholder="Points forts, axes d’amélioration…"
                            />
                          </label>
                          <button
                            type="button"
                            className="btn-admin btn-admin--primary"
                            disabled={busy}
                            data-testid="recruit-eval-save"
                            onClick={() =>
                              void patchAction({
                                action: "evaluation",
                                id: selected.id,
                                score: Number(evalScore),
                                evaluationNote: evalNote,
                                criteriaScores: criteriaDraft,
                              })
                            }
                          >
                            Enregistrer évaluation
                          </button>
                        </div>
                        {selected.validatedAt ? (
                          <p className="recruit-panel__empty" style={{ marginTop: "0.75rem" }}>
                            Décision validée par {selected.validatedByName} ·{" "}
                            {new Date(selected.validatedAt).toLocaleString(
                              "fr-FR",
                            )}
                          </p>
                        ) : null}
                      </>
                    )}
                  </section>

                  {canPropose ? (
                    <section className="recruit-panel">
                      <h3>Proposition manager</h3>
                      <p className="recruit-panel__empty">
                        Suggestion historisée — la décision finale reste RH.
                      </p>
                      <div className="recruit-actions-row">
                        {(
                          [
                            ["retenu", "Proposer retenu"],
                            ["refuse", "Proposer refus"],
                            ["liste_attente", "Proposer liste d’attente"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            className="btn-admin btn-admin--ghost"
                            disabled={busy}
                            onClick={() =>
                              void patchAction({
                                action: "propose",
                                id: selected.id,
                                decision: value,
                                note: statusNote,
                              })
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {canManageAll ? (
                    <section className="recruit-panel">
                      <h3>Décision & affectation</h3>
                      {!canDecideFinal ? (
                        <p className="recruit-panel__empty">
                          Décision après évaluation (score requis).
                        </p>
                      ) : (
                        <div className="recruit-actions-row">
                          {(
                            [
                              ["retenu", "Retenir"],
                              ["refuse", "Refuser"],
                              ["liste_attente", "Liste d’attente"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              className={`btn-admin${value === "retenu" ? " btn-admin--primary" : " btn-admin--ghost"}`}
                              disabled={busy}
                              data-testid={`recruit-decide-${value}`}
                              onClick={() =>
                                void patchAction({
                                  action: "decision",
                                  id: selected.id,
                                  decision: value,
                                  note: statusNote,
                                })
                              }
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="recruit-eval-grid recruit-eval-grid--assign">
                        <label className="recruit-field">
                          E-mail manager
                          <input
                            type="email"
                            value={selected.managerEmail}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((p) =>
                                  p.id === selected.id
                                    ? {
                                        ...p,
                                        managerEmail: e.target.value,
                                      }
                                    : p,
                                ),
                              )
                            }
                            placeholder="manager@necs.cm"
                          />
                        </label>
                        <label className="recruit-field">
                          Nom manager
                          <input
                            value={selected.managerName}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((p) =>
                                  p.id === selected.id
                                    ? {
                                        ...p,
                                        managerName: e.target.value,
                                      }
                                    : p,
                                ),
                              )
                            }
                            placeholder="Prénom Nom"
                          />
                        </label>
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void patchAction({
                              action: "assign",
                              id: selected.id,
                              managerEmail: selected.managerEmail,
                              managerName: selected.managerName,
                            })
                          }
                        >
                          Affecter
                        </button>
                      </div>
                      {selected.decision === "retenu" ? (
                        <p className="recruit-next-hint">
                          Candidat retenu —{" "}
                          <Link href="/admin/rh?tab=embauche">
                            ouvrir le dossier d’embauche
                          </Link>
                        </p>
                      ) : null}
                    </section>
                  ) : null}

                  <section className="recruit-history">
                    <h3>Historique</h3>
                    {selected.history.length === 0 ? (
                      <p className="recruit-panel__empty">Aucun événement.</p>
                    ) : (
                      <ol>
                        {[...selected.history].reverse().map((h) => (
                          <li key={h.id}>
                            <div className="recruit-history__top">
                              <strong>{formatWhen(h.at)}</strong>
                              <span>{historyKindLabel(h.kind)}</span>
                            </div>
                            <p className="recruit-history__meta">
                              {h.from && h.to
                                ? `${RECRUITMENT_STATUS_LABELS[h.from]} → ${RECRUITMENT_STATUS_LABELS[h.to]}`
                                : null}
                              {h.decision
                                ? ` · ${RECRUITMENT_DECISION_LABELS[h.decision]}`
                                : ""}
                              {h.score != null ? ` · ${h.score}/100` : ""}
                            </p>
                            {h.note ? <p>{h.note}</p> : null}
                            <em>
                              {h.byName}
                              {h.byRole ? ` · ${h.byRole}` : ""}
                            </em>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </>
              )}
            </article>
          </div>
        </>
      )}

      <AdminFormWizard
        open={composerOpen && canManageAll}
        portal
        onClose={() => {
          setComposerOpen(false);
          setComposerStep("identite");
        }}
        titleId="recruit-overlay-title"
        eyebrow="Nouvelle candidature"
        title="Saisir un candidat"
        lead="Identité, poste visé et source — puis revue avant enregistrement."
        avatar={initials(draft.name || "C") || "C"}
        steps={[
          { id: "identite", label: "Identité", hint: "Contact candidat" },
          { id: "poste", label: "Poste", hint: "Source & parcours" },
          { id: "revue", label: "Revue", hint: "Contrôle avant création" },
        ]}
        stepId={composerStep}
        onStepChange={(id) =>
          setComposerStep(id as "identite" | "poste" | "revue")
        }
        canEnterStep={canEnterComposerStep}
        onStepBlocked={pulseComposerError}
        shake={composerShake}
        formId="necs-recruit-form"
        onSubmit={(e) => void createCandidate(e)}
        submitLabel="Enregistrer"
        busy={creating}
        canSubmit={identiteReady}
      >
        {composerStep === "identite" ? (
          <FwPanel aria-label="Identité">
            <FwPanelHead
              title="Identité du candidat"
              description="Coordonnées principales pour le suivi RH."
            />
            <FwGrid>
              <FwField label="Nom *">
                <input
                  required
                  autoFocus
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
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
              <FwField label="Ville">
                <input
                  value={draft.city}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, city: e.target.value }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "poste" ? (
          <FwPanel aria-label="Poste">
            <FwPanelHead
              title="Poste & source"
              description="Cible de recrutement, expérience et affectation manager."
            />
            <FwGrid>
              <FwField label="Poste visé" wide>
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
              <FwField label="Expérience" wide>
                <input
                  value={draft.experience}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      experience: e.target.value,
                    }))
                  }
                  placeholder="Ex. 2 ans nettoyage bureaux"
                />
              </FwField>
              <FwField label="Manager (e-mail)">
                <input
                  type="email"
                  value={draft.managerEmail}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      managerEmail: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Manager (nom)">
                <input
                  value={draft.managerName}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      managerName: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Motivation / notes" wide>
                <textarea
                  rows={3}
                  value={draft.message}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      message: e.target.value,
                    }))
                  }
                />
              </FwField>
            </FwGrid>
            <FwBlock>
              <FwPanelHead
                title="Source"
                description="Canal d’entrée de la candidature."
              />
              <FwChips>
                {SOURCE_OPTIONS.map((o) => (
                  <FwChip
                    key={o.value}
                    selected={draft.source === o.value}
                    title={o.label}
                    onClick={() =>
                      setDraft((d) => ({ ...d, source: o.value }))
                    }
                  />
                ))}
              </FwChips>
            </FwBlock>
          </FwPanel>
        ) : null}

        {composerStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue avant création"
              description="Vérifiez le dossier candidat avant enregistrement."
            />
            <FwReview>
              <FwReviewCard
                title="Candidat"
                rows={[
                  { label: "Nom", value: draft.name || "—" },
                  { label: "E-mail", value: draft.email || "—" },
                  { label: "Téléphone", value: draft.phone || "—" },
                  { label: "Ville", value: draft.city || "—" },
                ]}
              />
              <FwReviewCard
                title="Poste"
                rows={[
                  { label: "Poste visé", value: draft.roleTarget || "—" },
                  {
                    label: "Source",
                    value: SOURCE_LABELS[draft.source] || draft.source || "—",
                  },
                  { label: "Expérience", value: draft.experience || "—" },
                  {
                    label: "Manager",
                    value:
                      draft.managerName || draft.managerEmail
                        ? [draft.managerName, draft.managerEmail]
                            .filter(Boolean)
                            .join(" · ")
                        : "—",
                  },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>
    </RhWorkspaceShell>
  );
}
