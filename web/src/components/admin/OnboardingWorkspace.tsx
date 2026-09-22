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
  ONBOARDING_CATEGORY_LABELS,
  ONBOARDING_STATUS_LABELS,
  canToggleOnboardingTask,
  onboardingEndRequirements,
  type OnboardingCategory,
  type OnboardingHistoryEntry,
  type OnboardingStatus,
  type OnboardingTask,
  type OnboardingTaskView,
} from "@/lib/onboarding-shared";
import { toast } from "@/lib/toast";

type OnboardingItem = {
  id: string;
  employeeName: string;
  email: string;
  phone: string;
  roleTarget: string;
  site: string;
  managerName: string;
  startDate: string;
  hiringDossierId: string;
  status: OnboardingStatus;
  tasks: OnboardingTask[];
  rhOwner: string;
  comments: string;
  validatedAt: string | null;
  validatedByEmail: string;
  validatedByName: string;
  history: OnboardingHistoryEntry[];
  createdAt: number;
  updatedAt: number;
  views: OnboardingTaskView[];
  summary: {
    doneCount: number;
    requiredTotal: number;
    requiredDone: number;
    pendingRequired: string[];
    pendingBeforeValidate: string[];
    suggestedStatus: OnboardingStatus;
  };
  endRecipe: {
    ok: boolean;
    missing: string[];
    pendingTasks: string[];
  };
};

type Draft = {
  employeeName: string;
  email: string;
  phone: string;
  roleTarget: string;
  site: string;
  managerName: string;
  startDate: string;
  rhOwner: string;
  comments: string;
};

const EMPTY_DRAFT: Draft = {
  employeeName: "",
  email: "",
  phone: "",
  roleTarget: "Agent terrain / Nettoyeur",
  site: "",
  managerName: "",
  startDate: "",
  rhOwner: "",
  comments: "",
};

type Filter = "all" | OnboardingStatus | "a_traiter";

function formatWhen(ts: number | string) {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ON";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function OnboardingWorkspace({
  embedded = false,
  variant = "rh",
}: {
  embedded?: boolean;
  /** Vue Opérations : checklist d’intégration terrain. */
  variant?: "rh" | "ops";
}) {
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("rh");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [onbStep, setOnbStep] = useState<"collaborateur" | "revue">(
    "collaborateur",
  );
  const [onbShake, setOnbShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: OnboardingItem[];
        role?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items ?? []);
      setRole(data.role ?? "rh");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "a_traiter") {
        if (item.status !== "en_cours" && item.status !== "pret") return false;
      } else if (filter !== "all" && item.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        item.employeeName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.site.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  const counts = useMemo(() => {
    const base: Record<string, number> = {
      all: items.length,
      a_traiter: 0,
    };
    for (const item of items) {
      base[item.status] = (base[item.status] ?? 0) + 1;
      if (item.status === "en_cours" || item.status === "pret") {
        base.a_traiter += 1;
      }
    }
    return base;
  }, [items]);

  function pulseOnbError() {
    setOnbShake(true);
    window.setTimeout(() => setOnbShake(false), 420);
  }

  const collaborateurReady =
    Boolean(draft.employeeName.trim()) &&
    Boolean(draft.email.trim()) &&
    draft.email.includes("@") &&
    Boolean(draft.site.trim());

  function canEnterOnbStep(id: string) {
    if (id === "collaborateur") return true;
    return collaborateurReady;
  }

  function openComposer() {
    setDraft(EMPTY_DRAFT);
    setOnbStep("collaborateur");
    setComposerOpen(true);
  }

  async function createItem(e: FormEvent) {
    e.preventDefault();
    if (!collaborateurReady) {
      setOnbStep("collaborateur");
      pulseOnbError();
      toast.error("Nom, e-mail et site sont obligatoires.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as {
        item?: OnboardingItem;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création échouée");
      toast.success("Onboarding créé");
      setComposerOpen(false);
      setDraft(EMPTY_DRAFT);
      setOnbStep("collaborateur");
      await refresh();
      if (data.item) setSelectedId(data.item.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      pulseOnbError();
    } finally {
      setCreating(false);
    }
  }

  async function patch(body: Record<string, unknown>) {
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        item?: OnboardingItem;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action échouée");
      if (data.item) {
        setItems((prev) =>
          prev.map((i) => (i.id === data.item!.id ? data.item! : i)),
        );
      }
      toast.success("Mis à jour");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  const recipe = selected
    ? onboardingEndRequirements({
        status: selected.status,
        validatedAt: selected.validatedAt,
        views: selected.views,
      })
    : null;

  const grouped = useMemo(() => {
    if (!selected) return [] as { cat: OnboardingCategory; views: OnboardingTaskView[] }[];
    const map = new Map<OnboardingCategory, OnboardingTaskView[]>();
    for (const v of selected.views) {
      const list = map.get(v.def.category) ?? [];
      list.push(v);
      map.set(v.def.category, list);
    }
    return (Object.keys(ONBOARDING_CATEGORY_LABELS) as OnboardingCategory[]).map(
      (cat) => ({ cat, views: map.get(cat) ?? [] }),
    ).filter((g) => g.views.length > 0);
  }, [selected]);

  const isOps = variant === "ops";

  return (
    <RhWorkspaceShell
      embedded={embedded}
      className={`leads-page onboarding-page${isOps ? " onboarding-page--ops" : ""}`}
      tone={isOps ? "#1570b8" : "#0a3a72"}
      badge={isOps ? "Ops" : "RH"}
      eyebrow={
        isOps
          ? "Opérations · Checklist d’intégration"
          : "Onboarding"
      }
      icon={<IconUser size={20} />}
      title={isOps ? "Checklist d’intégration" : "Onboarding"}
      meta={
        <>
          <span>
            <strong>{counts.all ?? 0}</strong> parcours
          </span>
          <span>
            <strong>{counts.a_traiter ?? 0}</strong> à traiter
          </span>
          <span>
            <strong>{counts.pret ?? 0}</strong> prêts
          </span>
          <span>
            <strong>{counts.valide ?? 0}</strong> validés
          </span>
        </>
      }
      actions={
        <>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={openComposer}
          >
            {isOps ? "Nouvelle intégration" : "Nouvel onboarding"}
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
      <section className="leads-kpis" aria-label="Indicateurs onboarding">
        <article className="leads-kpi leads-kpi--accent">
          <p>À traiter</p>
          <strong>{counts.a_traiter ?? 0}</strong>
          <span>en cours ou prêts</span>
        </article>
        <article className="leads-kpi">
          <p>Prêts</p>
          <strong>{counts.pret ?? 0}</strong>
          <span>à valider</span>
        </article>
        <article className="leads-kpi">
          <p>Validés</p>
          <strong>{counts.valide ?? 0}</strong>
          <span>intégrations closes</span>
        </article>
        <article className="leads-kpi">
          <p>Bloqués</p>
          <strong>{counts.bloque ?? 0}</strong>
          <span>à débloquer</span>
        </article>
      </section>

      {(counts.bloque ?? 0) > 0 || (counts.a_traiter ?? 0) > 0 ? (
        <div className="rh-alerts-bar onboarding-alerts-bar" role="status">
          {(counts.a_traiter ?? 0) > 0 ? (
            <span className="rh-alert rh-alert--info">
              {counts.a_traiter} parcours à traiter
            </span>
          ) : null}
          {(counts.bloque ?? 0) > 0 ? (
            <span className="rh-alert rh-alert--warn">
              {counts.bloque} bloqué{counts.bloque! > 1 ? "s" : ""}
            </span>
          ) : null}
          <span className="rh-alerts-bar__hint">
            Checklist documents · EPI · matériel · formation · affectation.
          </span>
        </div>
      ) : null}

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Collaborateur, site, e-mail…"
            aria-label="Rechercher un parcours"
          />
        </label>
        <div className="leads-filters" role="tablist" aria-label="Filtres onboarding">
          {(
            [
              ["all", "Tous"],
              ["a_traiter", "À traiter"],
              ["en_cours", "En cours"],
              ["pret", "Prêts"],
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
              <em>{counts[id] ?? 0}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="leads-layout">
        <div className="leads-list">
          {loading && items.length === 0 ? (
            <div className="leads-empty">
              <span className="leads-empty__orb" aria-hidden />
              <p className="leads-empty__eyebrow">Onboarding</p>
              <h2>Chargement…</h2>
            </div>
          ) : filtered.length === 0 ? (
            <div className="leads-empty">
              <span className="leads-empty__orb" aria-hidden />
              <p className="leads-empty__eyebrow">Intégration</p>
              <h2>Aucun parcours sur ce filtre</h2>
              <p>
                {isOps
                  ? "Créez une checklist d’intégration (documents, accès, EPI, matériel, formation, affectation) ou changez de filtre."
                  : "Lancez un onboarding après validation du dossier d’embauche, ou changez de filtre."}
              </p>
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={openComposer}
              >
                {isOps ? "Nouvelle intégration" : "Nouvel onboarding"}
              </button>
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`leads-card onboarding-card${
                  selectedId === item.id ? " is-active" : ""
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="leads-card__avatar" aria-hidden>
                  {initials(item.employeeName)}
                </span>
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{item.employeeName}</strong>
                    <time>
                      {item.summary.requiredDone}/{item.summary.requiredTotal}
                    </time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-card__subject">
                      {item.site || "Site à définir"}
                    </span>
                    <span
                      className={`onboarding-status onboarding-status--${item.status}`}
                    >
                      {ONBOARDING_STATUS_LABELS[item.status]}
                    </span>
                  </span>
                  <span className="leads-card__preview">
                    {item.roleTarget || "Poste à préciser"}
                    {item.managerName ? ` · ${item.managerName}` : ""}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="leads-detail onboarding-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <p className="leads-empty__eyebrow">Détail</p>
              <h2>Sélectionnez un parcours</h2>
              <p>
                Pilotez documents, EPI, matériel, formation et affectation jusqu’à
                la validation de fin.
              </p>
            </div>
          ) : (
            <>
              <header className="leads-detail__header">
                <div className="leads-detail__identity">
                  <span className="leads-detail__avatar" aria-hidden>
                    {initials(selected.employeeName)}
                  </span>
                  <div>
                    <p className="leads-detail__eyebrow">
                      <span
                        className={`onboarding-status onboarding-status--${selected.status}`}
                      >
                        {ONBOARDING_STATUS_LABELS[selected.status]}
                      </span>
                      <span>{selected.id.slice(-8)}</span>
                    </p>
                    <h2>{selected.employeeName}</h2>
                    <p className="leads-detail__sub">
                      {selected.roleTarget} · {selected.email}
                    </p>
                  </div>
                </div>
              </header>

              {recipe ? (
                <div
                  className={
                    recipe.ok
                      ? "onboarding-recipe is-ok"
                      : "onboarding-recipe is-blocked"
                  }
                  data-testid="onboarding-recipe"
                  role="status"
                >
                  <strong>
                    {recipe.ok
                      ? "Recette OK — fin d’intégration validée"
                      : "Fin d’intégration non validée"}
                  </strong>
                  {!recipe.ok ? (
                    <ul>
                      {recipe.missing.slice(0, 8).map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      Validé le {formatWhen(selected.validatedAt ?? "")} par{" "}
                      {selected.validatedByName || "—"}
                    </p>
                  )}
                </div>
              ) : null}

              <dl className="leads-detail__meta">
                <div>
                  <dt>Site d’affectation</dt>
                  <dd>{selected.site || "—"}</dd>
                </div>
                <div>
                  <dt>Manager</dt>
                  <dd>{selected.managerName || "—"}</dd>
                </div>
                <div>
                  <dt>Début</dt>
                  <dd>{selected.startDate || "—"}</dd>
                </div>
                <div>
                  <dt>Progression</dt>
                  <dd>
                    {selected.summary.requiredDone}/
                    {selected.summary.requiredTotal} obligatoires
                  </dd>
                </div>
              </dl>

              {grouped.map(({ cat, views }) => (
                <section key={cat} className="onboarding-section">
                  <h3>{ONBOARDING_CATEGORY_LABELS[cat]}</h3>
                  <ul className="onboarding-tasks">
                    {views.map((v) => {
                      const canToggle =
                        selected.status !== "valide" &&
                        v.def.id !== "validation_fin" &&
                        canToggleOnboardingTask(role, v.def.ownerRole);
                      return (
                        <li
                          key={v.def.id}
                          className={
                            v.task.done
                              ? "onboarding-task is-done"
                              : "onboarding-task"
                          }
                        >
                          <label>
                            <input
                              type="checkbox"
                              checked={v.task.done}
                              disabled={busy || !canToggle}
                              onChange={(e) =>
                                void patch({
                                  action: "task",
                                  id: selected.id,
                                  taskId: v.def.id,
                                  done: e.target.checked,
                                })
                              }
                            />
                            <span>
                              <strong>{v.def.label}</strong>
                              <em>
                                {v.def.required ? "Obligatoire" : "Optionnel"} ·{" "}
                                {v.def.ownerRole === "rh"
                                  ? "RH"
                                  : v.def.ownerRole === "manager"
                                    ? "Manager"
                                    : "RH / Manager"}
                                {v.task.doneAt
                                  ? ` · ${formatWhen(v.task.doneAt)}`
                                  : ""}
                              </em>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              <div className="recruit-actions">
                <h3>Fin d’intégration</h3>
                <div className="recruit-actions__row">
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={
                      busy ||
                      selected.status === "en_cours" ||
                      selected.status === "valide"
                    }
                    onClick={() =>
                      void patch({
                        action: "status",
                        id: selected.id,
                        status: "en_cours",
                      })
                    }
                  >
                    Remettre en cours
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={busy || selected.status === "bloque"}
                    onClick={() =>
                      void patch({
                        action: "status",
                        id: selected.id,
                        status: "bloque",
                      })
                    }
                  >
                    Bloquer
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    data-testid="onboarding-validate-btn"
                    disabled={
                      busy ||
                      selected.status === "valide" ||
                      selected.summary.pendingBeforeValidate.length > 0
                    }
                    title={
                      selected.summary.pendingBeforeValidate.length > 0
                        ? selected.summary.pendingBeforeValidate
                            .slice(0, 4)
                            .join(" · ")
                        : undefined
                    }
                    onClick={() =>
                      void patch({
                        action: "status",
                        id: selected.id,
                        status: "valide",
                      })
                    }
                  >
                    Valider la fin d’intégration
                  </button>
                </div>
                <p className="onboarding-validate-hint">
                  Validation refusée tant qu’il reste des tâches obligatoires
                  (documents, EPI, matériel, formation, affectation).
                </p>
              </div>

              <div className="recruit-history">
                <h3>Historique</h3>
                <ul>
                  {selected.history.slice(0, 12).map((h) => (
                    <li key={h.id}>
                      <strong>{h.byName}</strong>
                      <span>{formatWhen(h.at)}</span>
                      <p>{h.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      <AdminFormWizard
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        titleId="onboarding-create-title"
        eyebrow={isOps ? "Opérations" : "Intégration"}
        title={isOps ? "Nouvelle intégration" : "Nouvel onboarding"}
        lead="Documents, accès, uniforme/EPI, matériel, formation, affectation et validation d’intégration."
        avatar={
          draft.employeeName
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0] ?? "")
            .join("")
            .toUpperCase() || "O"
        }
        steps={[
          {
            id: "collaborateur",
            label: "Collaborateur",
            hint: "Identité & affectation",
          },
          { id: "revue", label: "Revue", hint: "Contrôle avant création" },
        ]}
        stepId={onbStep}
        onStepChange={(id) =>
          setOnbStep(id as "collaborateur" | "revue")
        }
        canEnterStep={canEnterOnbStep}
        onStepBlocked={pulseOnbError}
        shake={onbShake}
        formId="necs-onboarding-form"
        onSubmit={(e) => void createItem(e)}
        submitLabel={isOps ? "Créer l’intégration" : "Créer l’onboarding"}
        busy={creating}
        canSubmit={collaborateurReady}
      >
        {onbStep === "collaborateur" ? (
          <FwPanel aria-label="Collaborateur">
            <FwPanelHead
              title="Collaborateur"
              description="Identité et affectation de départ."
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
                  type="email"
                  required
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
              <FwField label="Poste cible">
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
              <FwField label="Site d’affectation *">
                <input
                  required
                  value={draft.site}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, site: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Manager">
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
              <FwField label="Date d’intégration">
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
                    setDraft((d) => ({ ...d, rhOwner: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Commentaires" wide>
                <textarea
                  rows={3}
                  value={draft.comments}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, comments: e.target.value }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}
        {onbStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue avant création"
              description="Une checklist standard sera générée (documents, EPI, matériel, formation, affectation)."
            />
            <FwReview>
              <FwReviewCard
                title="Collaborateur"
                rows={[
                  { label: "Nom", value: draft.employeeName || "—" },
                  { label: "E-mail", value: draft.email || "—" },
                  { label: "Téléphone", value: draft.phone || "—" },
                  { label: "Poste", value: draft.roleTarget || "—" },
                  { label: "Site", value: draft.site || "—" },
                  { label: "Manager", value: draft.managerName || "—" },
                  { label: "Date", value: draft.startDate || "—" },
                  { label: "RH", value: draft.rhOwner || "—" },
                ]}
              />
              <FwReviewCard
                title="Checklist initiale"
                rows={[
                  {
                    label: "Blocs",
                    value:
                      "Documents · Uniforme/EPI · Matériel · Formation · Affectation",
                  },
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
    </RhWorkspaceShell>
  );
}
