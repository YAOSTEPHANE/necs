"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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
  SKILL_CATEGORY_LABELS,
  SKILL_GAP_STATUS_LABELS,
  SKILL_LEVELS,
  type PosteProfile,
  type SkillDef,
  type SkillGapStatus,
  type SkillGapView,
  type SkillLevel,
} from "@/lib/formations-competences-shared";
import { toast } from "@/lib/toast";

type EnrichedItem = {
  id: string;
  employeeName: string;
  email: string;
  phone: string;
  posteId: string;
  posteLabel: string;
  site: string;
  managerName: string;
  rhOwner: string;
  comments: string;
  skills: Array<{
    skillId: string;
    level: SkillLevel;
    certifiedAt: string | null;
    expiresAt: string | null;
    trainingTitle: string;
  }>;
  history: Array<{
    id: string;
    at: string;
    kind: string;
    note: string;
    byName: string;
  }>;
  createdAt: number;
  updatedAt: number;
  views: SkillGapView[];
  summary: {
    totalRequired: number;
    okCount: number;
    gapCount: number;
    missingCount: number;
    insufficientCount: number;
    alertCount: number;
    expiredCount: number;
    coveragePct: number;
  };
  recipe: {
    ok: boolean;
    gaps: string[];
    renewals: string[];
    blocking: string[];
  };
};

type Alerts = {
  collaborators: number;
  gapPeople: number;
  gapCount: number;
  renewalCount: number;
  coverageAvg: number;
};

type Draft = {
  employeeName: string;
  email: string;
  phone: string;
  posteId: string;
  site: string;
  managerName: string;
  comments: string;
};

const EMPTY_DRAFT: Draft = {
  employeeName: "",
  email: "",
  phone: "",
  posteId: "agent",
  site: "",
  managerName: "",
  comments: "",
};

type Filter = "all" | "gaps" | "renewals";

function formatWhen(ts: number | string) {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status: SkillGapStatus) {
  return `skills-status skills-status--${status}`;
}

export function FormationsCompetencesWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [catalog, setCatalog] = useState<SkillDef[]>([]);
  const [postes, setPostes] = useState<PosteProfile[]>([]);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState("identite");
  const [composerShake, setComposerShake] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [busySkill, setBusySkill] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/formations-competences", {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        items?: EnrichedItem[];
        catalog?: SkillDef[];
        postes?: PosteProfile[];
        alerts?: Alerts;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Chargement impossible");
        return;
      }
      setItems(data.items ?? []);
      setCatalog(data.catalog ?? []);
      setPostes(data.postes ?? []);
      setAlerts(data.alerts ?? null);
      setSelectedId((prev) => {
        const list = data.items ?? [];
        if (prev && list.some((i) => i.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      toast.error("Réseau indisponible");
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
      if (filter === "gaps" && item.summary.gapCount === 0) return false;
      if (
        filter === "renewals" &&
        item.summary.alertCount + item.summary.expiredCount === 0
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.employeeName.toLowerCase().includes(q) ||
        item.site.toLowerCase().includes(q) ||
        item.posteLabel.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  const filterCounts = useMemo(() => {
    let gaps = 0;
    let renewals = 0;
    for (const item of items) {
      if (item.summary.gapCount > 0) gaps += 1;
      if (item.summary.alertCount + item.summary.expiredCount > 0) renewals += 1;
    }
    return { all: items.length, gaps, renewals };
  }, [items]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!draft.employeeName.trim() || !draft.posteId) {
      setComposerShake(true);
      window.setTimeout(() => setComposerShake(false), 420);
      toast.warning("Nom et poste requis");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/formations-competences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...draft }),
      });
      const data = (await res.json()) as {
        item?: EnrichedItem;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Création impossible");
        return;
      }
      setComposerOpen(false);
      setDraft(EMPTY_DRAFT);
      setComposerStep("identite");
      toast.success("Fiche compétences créée");
      await refresh();
      if (data.item?.id) setSelectedId(data.item.id);
    } catch {
      toast.error("Réseau indisponible");
    } finally {
      setCreating(false);
    }
  }

  async function setSkill(skillId: string, level: SkillLevel) {
    if (!selected) return;
    setBusySkill(skillId);
    try {
      const res = await fetch("/api/formations-competences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_skill",
          id: selected.id,
          skillId,
          level,
          certifiedAt: new Date().toISOString(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Mise à jour impossible");
        return;
      }
      toast.success("Compétence enregistrée");
      await refresh();
    } catch {
      toast.error("Réseau indisponible");
    } finally {
      setBusySkill(null);
    }
  }

  async function renewSkill(skillId: string) {
    if (!selected) return;
    setBusySkill(skillId);
    try {
      const res = await fetch("/api/formations-competences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "renew",
          id: selected.id,
          skillId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Renouvellement impossible");
        return;
      }
      toast.success("Renouvellement enregistré");
      await refresh();
    } catch {
      toast.error("Réseau indisponible");
    } finally {
      setBusySkill(null);
    }
  }

  const identiteReady = draft.employeeName.trim().length >= 2;
  const canEnterStep = (id: string) => {
    if (id === "identite") return true;
    return identiteReady;
  };

  return (
    <RhWorkspaceShell
      embedded={embedded}
      className="leads-page skills-page"
      tone="#0a3a72"
      badge="RH"
      eyebrow="Formation & compétences"
      icon={<IconUser size={20} />}
      title="Formation & compétences"
      testId="skills-workspace"
      meta={
        <>
          <span>
            <strong>{alerts?.collaborators ?? items.length}</strong> fiches
          </span>
          <span>
            <strong>{alerts?.gapCount ?? 0}</strong> écarts
          </span>
          <span>
            <strong>{alerts?.renewalCount ?? 0}</strong> renouvellements
          </span>
          <span>
            Couverture <strong>{alerts?.coverageAvg ?? 0} %</strong>
          </span>
        </>
      }
      actions={
        <>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={() => {
              setComposerStep("identite");
              setComposerOpen(true);
            }}
          >
            Nouvelle fiche
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

      {(alerts?.gapCount ?? 0) > 0 || (alerts?.renewalCount ?? 0) > 0 ? (
        <div className="rh-alerts-bar skills-alerts-bar" role="status">
          {(alerts?.gapCount ?? 0) > 0 ? (
            <span className="rh-alert rh-alert--warn skills-alert skills-alert--gap">
              {alerts!.gapCount} écart
              {alerts!.gapCount > 1 ? "s" : ""} identifiable
              {alerts!.gapCount > 1 ? "s" : ""}
            </span>
          ) : null}
          {(alerts?.renewalCount ?? 0) > 0 ? (
            <span className="rh-alert rh-alert--info skills-alert skills-alert--renew">
              {alerts!.renewalCount} alerte
              {alerts!.renewalCount > 1 ? "s" : ""} de renouvellement
            </span>
          ) : null}
          <span className="rh-alerts-bar__hint skills-alerts-bar__hint">
            RH & managers — formations, niveaux et échéances.
          </span>
        </div>
      ) : null}

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher collaborateur, site, poste…"
            aria-label="Rechercher"
          />
        </label>
        <div className="leads-filters" role="tablist" aria-label="Filtres compétences">
          {(
            [
              ["all", "Tous"],
              ["gaps", "Écarts"],
              ["renewals", "Renouvellements"],
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
              <em>{filterCounts[id]}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="leads-layout">
        <div className="leads-list" aria-label="Fiches compétences">
          {loading && items.length === 0 ? (
            <div className="leads-empty">
              <span className="leads-empty__orb" aria-hidden />
              <p className="leads-empty__eyebrow">Compétences</p>
              <h2>Chargement…</h2>
            </div>
          ) : filtered.length === 0 ? (
            <div className="leads-empty">
              <span className="leads-empty__orb" aria-hidden />
              <p className="leads-empty__eyebrow">Formation</p>
              <h2>Aucune fiche pour ce filtre</h2>
              <p>
                Créez une fiche collaborateur pour suivre niveaux, formations et
                renouvellements.
              </p>
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => {
                  setComposerStep("identite");
                  setComposerOpen(true);
                }}
              >
                Nouvelle fiche
              </button>
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`leads-card skills-card${
                  selectedId === item.id ? " is-active" : ""
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="leads-card__avatar" aria-hidden>
                  {item.employeeName.slice(0, 1).toUpperCase()}
                </span>
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{item.employeeName}</strong>
                    <time>{item.summary.coveragePct} %</time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-card__subject">{item.posteLabel}</span>
                    <span className="leads-card__preview">
                      {item.site || "Site non renseigné"}
                    </span>
                  </span>
                  <span className="skills-card__meta">
                    {item.summary.gapCount > 0 ? (
                      <em className="skills-pill skills-pill--gap">
                        {item.summary.gapCount} écart
                        {item.summary.gapCount > 1 ? "s" : ""}
                      </em>
                    ) : (
                      <em className="skills-pill skills-pill--ok">Couvert</em>
                    )}
                    {item.summary.alertCount + item.summary.expiredCount > 0 ? (
                      <em className="skills-pill skills-pill--renew">
                        {item.summary.alertCount + item.summary.expiredCount}{" "}
                        échéance
                        {item.summary.alertCount + item.summary.expiredCount > 1
                          ? "s"
                          : ""}
                      </em>
                    ) : null}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="leads-detail skills-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <p className="leads-empty__eyebrow">Détail</p>
              <h2>Sélectionnez une fiche</h2>
              <p>
                Visualisez les écarts de compétences, les formations et les
                alertes de renouvellement.
              </p>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <h2>{selected.employeeName}</h2>
                  <p>
                    {selected.posteLabel}
                    {selected.site ? ` · ${selected.site}` : ""}
                    {selected.managerName
                      ? ` · Manager ${selected.managerName}`
                      : ""}
                  </p>
                </div>
                <span
                  className={
                    selected.recipe.ok
                      ? "skills-coverage is-ok"
                      : "skills-coverage is-gap"
                  }
                  data-testid="skills-coverage"
                >
                  {selected.summary.coveragePct} % couverture
                </span>
              </header>

              <div
                className={
                  selected.recipe.ok
                    ? "skills-recipe is-ok"
                    : "skills-recipe is-blocked"
                }
                data-testid="skills-recipe"
              >
                <strong>
                  {selected.recipe.ok
                    ? "Aucun écart bloquant"
                    : "Écarts de compétences identifiés"}
                </strong>
                {!selected.recipe.ok ? (
                  <ul>
                    {selected.recipe.gaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Profil aligné sur le poste — formations à jour.</p>
                )}
                {selected.recipe.renewals.length > 0 ? (
                  <>
                    <strong className="skills-recipe__renew-title">
                      Alertes de renouvellement
                    </strong>
                    <ul data-testid="skills-renewals">
                      {selected.recipe.renewals.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>

              <section className="skills-matrix" aria-label="Matrice compétences">
                <h3>Compétences du poste</h3>
                <ul className="skills-rows">
                  {selected.views.map((view) => (
                    <li
                      key={view.skillId}
                      className={`skills-row skills-row--${view.status}`}
                      data-testid={`skills-row-${view.skillId}`}
                    >
                      <div className="skills-row__main">
                        <div>
                          <strong>{view.label}</strong>
                          <p>
                            {SKILL_CATEGORY_LABELS[view.category]} · requis ≥{" "}
                            {view.requiredLevel}
                            {view.currentLevel != null
                              ? ` · actuel ${view.currentLevel}`
                              : " · non acquise"}
                            {view.expiresAt
                              ? ` · échéance ${formatWhen(view.expiresAt)}`
                              : ""}
                          </p>
                        </div>
                        <span className={statusClass(view.status)}>
                          {SKILL_GAP_STATUS_LABELS[view.status]}
                        </span>
                      </div>
                      <div className="skills-row__actions">
                        <label>
                          Niveau
                          <select
                            value={view.currentLevel ?? ""}
                            disabled={busySkill === view.skillId}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (SKILL_LEVELS.includes(v as SkillLevel)) {
                                void setSkill(view.skillId, v as SkillLevel);
                              }
                            }}
                          >
                            <option value="">—</option>
                            {SKILL_LEVELS.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        {(view.status === "alerte" ||
                          view.status === "expire" ||
                          view.expiresAt) && (
                          <button
                            type="button"
                            className="btn-admin btn-admin--ghost"
                            disabled={busySkill === view.skillId}
                            onClick={() => void renewSkill(view.skillId)}
                          >
                            Renouveler
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {selected.history.length > 0 ? (
                <section className="skills-history">
                  <h3>Historique</h3>
                  <ul>
                    {selected.history.slice(0, 12).map((h) => (
                      <li key={h.id}>
                        <time>{formatWhen(h.at)}</time>
                        <span>
                          {h.note} · {h.byName}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>

      <AdminFormWizard
        open={composerOpen}
        onClose={() => {
          setComposerOpen(false);
          setComposerStep("identite");
        }}
        titleId="skills-create-title"
        eyebrow="Formation"
        title="Nouvelle fiche compétences"
        lead="Suivre compétences, formations et échéances pour un collaborateur."
        avatar={<IconUser size={22} />}
        steps={[
          { id: "identite", label: "Identité", hint: "Collaborateur" },
          { id: "poste", label: "Poste", hint: "Profil requis" },
          { id: "revue", label: "Revue", hint: "Contrôle" },
        ]}
        stepId={composerStep}
        onStepChange={setComposerStep}
        canEnterStep={canEnterStep}
        onStepBlocked={() => {
          setComposerShake(true);
          window.setTimeout(() => setComposerShake(false), 420);
          toast.warning("Complétez l’identité");
        }}
        shake={composerShake}
        formId="necs-skills-form"
        onSubmit={onCreate}
        submitLabel="Créer la fiche"
        busy={creating}
        canSubmit={identiteReady && Boolean(draft.posteId)}
      >
        {composerStep === "identite" ? (
          <FwPanel aria-label="Identité">
            <FwPanelHead
              title="Collaborateur"
              description="Identité et rattachement terrain."
            />
            <FwGrid>
              <FwField label="Nom complet" wide>
                <input
                  value={draft.employeeName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, employeeName: e.target.value }))
                  }
                  required
                />
              </FwField>
              <FwField label="Email">
                <input
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
              <FwField label="Site" wide>
                <input
                  value={draft.site}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, site: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Manager" wide>
                <input
                  value={draft.managerName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, managerName: e.target.value }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "poste" ? (
          <FwPanel aria-label="Poste">
            <FwPanelHead
              title="Profil de poste"
              description="Les compétences requises définissent les écarts à combler."
            />
            <FwGrid>
              <FwField label="Poste" wide>
                <select
                  value={draft.posteId}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, posteId: e.target.value }))
                  }
                >
                  {postes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                  {postes.length === 0
                    ? [
                        <option key="agent" value="agent">
                          Agent terrain / Nettoyeur
                        </option>,
                      ]
                    : null}
                </select>
              </FwField>
              <FwField label="Commentaire" wide>
                <textarea
                  rows={3}
                  value={draft.comments}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, comments: e.target.value }))
                  }
                />
              </FwField>
            </FwGrid>
            <ul className="skills-poste-preview">
              {(
                postes.find((p) => p.id === draft.posteId)?.requiredSkills ?? []
              ).map((req) => {
                const def = catalog.find((c) => c.id === req.skillId);
                return (
                  <li key={req.skillId}>
                    {def?.label ?? req.skillId} · niv. ≥ {req.minLevel}
                  </li>
                );
              })}
            </ul>
          </FwPanel>
        ) : null}

        {composerStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Contrôle avant création"
              description="La matrice d’écarts sera calculée dès l’ouverture."
            />
            <FwReview>
              <FwReviewCard
                title="Collaborateur"
                rows={[
                  { label: "Nom", value: draft.employeeName || "—" },
                  { label: "Email", value: draft.email || "—" },
                  { label: "Site", value: draft.site || "—" },
                ]}
              />
              <FwReviewCard
                title="Poste"
                rows={[
                  {
                    label: "Profil",
                    value:
                      postes.find((p) => p.id === draft.posteId)?.label ||
                      draft.posteId,
                  },
                  {
                    label: "Compétences requises",
                    value: String(
                      postes.find((p) => p.id === draft.posteId)
                        ?.requiredSkills.length ?? "—",
                    ),
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
