"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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
  DEFAULT_AGENT_JOB_DESCRIPTION,
  JOB_DESCRIPTION_STATUS_LABELS,
  type JobDescription,
  type JobDescriptionStatus,
} from "@/lib/job-descriptions-shared";
import { toast } from "@/lib/toast";

type Draft = {
  title: string;
  mission: string;
  responsibilities: string;
  skills: string;
  schedule: string;
  reportingLine: string;
  workLocation: string;
  safetyNotes: string;
  performanceCriteria: string;
  note: string;
  status: JobDescriptionStatus;
};

const EMPTY_DRAFT: Draft = {
  title: DEFAULT_AGENT_JOB_DESCRIPTION.title,
  mission: DEFAULT_AGENT_JOB_DESCRIPTION.mission,
  responsibilities: DEFAULT_AGENT_JOB_DESCRIPTION.responsibilities,
  skills: DEFAULT_AGENT_JOB_DESCRIPTION.skills,
  schedule: DEFAULT_AGENT_JOB_DESCRIPTION.schedule,
  reportingLine: DEFAULT_AGENT_JOB_DESCRIPTION.reportingLine,
  workLocation: DEFAULT_AGENT_JOB_DESCRIPTION.workLocation,
  safetyNotes: DEFAULT_AGENT_JOB_DESCRIPTION.safetyNotes,
  performanceCriteria: DEFAULT_AGENT_JOB_DESCRIPTION.performanceCriteria,
  note: "",
  status: "brouillon",
};

function formatWhen(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function JobDescriptionWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Draft | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/job-descriptions", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: JobDescription[];
        canManage?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items ?? []);
      setCanManage(Boolean(data.canManage));
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

  useEffect(() => {
    if (!selected) {
      setEdit(null);
      return;
    }
    setEdit({
      title: selected.title,
      mission: selected.mission,
      responsibilities: selected.responsibilities,
      skills: selected.skills,
      schedule: selected.schedule,
      reportingLine: selected.reportingLine,
      workLocation: selected.workLocation,
      safetyNotes: selected.safetyNotes,
      performanceCriteria: selected.performanceCriteria,
      note: selected.note,
      status: selected.status,
    });
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.mission.toLowerCase().includes(q) ||
        i.reportingLine.toLowerCase().includes(q),
    );
  }, [items, query]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setBusy(true);
    try {
      const res = await fetch("/api/job-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as {
        item?: JobDescription;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      toast.success("Fiche de poste créée");
      setComposerOpen(false);
      setDraft(EMPTY_DRAFT);
      await refresh();
      if (data.item) setSelectedId(data.item.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (bumpVersion = false) => {
    if (!selected || !edit || !canManage) return;
    setBusy(true);
    try {
      const res = await fetch("/api/job-descriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, ...edit, bumpVersion }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible");
      toast.success(bumpVersion ? "Nouvelle version enregistrée" : "Fiche mise à jour");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const seedDefault = async () => {
    if (!canManage) return;
    setBusy(true);
    try {
      const res = await fetch("/api/job-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ensure_default" }),
      });
      const data = (await res.json()) as {
        item?: JobDescription;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Initialisation impossible");
      toast.success("Fiche Agent d’entretien prête");
      await refresh();
      if (data.item) setSelectedId(data.item.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RhWorkspaceShell
      embedded={embedded}
      badge="Poste"
      eyebrow="Fiche de poste"
      icon={<IconUser size={20} />}
      title="Fiche de poste agent d’entretien"
      meta={
        <>
          <span>
            Mission · responsabilités · compétences · horaires · rattachement
          </span>
          <span>
            {items.length} fiche{items.length > 1 ? "s" : ""}
          </span>
        </>
      }
      actions={
        canManage ? (
          <>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              disabled={busy}
              onClick={() => void seedDefault()}
            >
              Modèle agent
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setComposerOpen(true);
              }}
            >
              Nouvelle fiche
            </button>
          </>
        ) : null
      }
      testId="job-description-workspace"
    >
      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un poste…"
          />
        </label>
      </div>

      <div className="leads-layout">
        <div className="leads-list" role="list">
          {loading ? (
            <p className="leads-empty">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="leads-empty">Aucune fiche de poste.</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                role="listitem"
                className={`leads-card${selectedId === item.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="leads-card__top">
                  <strong>{item.title}</strong>
                  <span className={`leads-chip status-${item.status}`}>
                    {JOB_DESCRIPTION_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p>{item.reportingLine || "Sans rattachement"}</p>
                <span className="leads-card__meta">
                  v{item.version} · {formatWhen(item.updatedAt)}
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {!selected || !edit ? (
            <p className="leads-empty">Sélectionnez une fiche de poste.</p>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">Poste</p>
                  <h3>{selected.title}</h3>
                </div>
                <span className={`leads-chip status-${selected.status}`}>
                  {JOB_DESCRIPTION_STATUS_LABELS[selected.status]}
                </span>
              </header>

              <div className="recruit-eval-grid" style={{ marginTop: "1rem" }}>
                {(
                  [
                    ["title", "Intitulé", "text"],
                    ["reportingLine", "Rattachement", "text"],
                    ["schedule", "Horaires", "text"],
                    ["workLocation", "Lieu d’exercice", "text"],
                    ["mission", "Mission", "textarea"],
                    ["responsibilities", "Responsabilités", "textarea"],
                    ["skills", "Compétences", "textarea"],
                    ["safetyNotes", "Sécurité / EPI", "textarea"],
                    ["performanceCriteria", "Critères de performance", "textarea"],
                    ["note", "Observations", "textarea"],
                  ] as const
                ).map(([key, label, kind]) => (
                  <label
                    key={key}
                    className={`recruit-field${kind === "textarea" ? " recruit-field--grow" : ""}`}
                    style={kind === "textarea" ? { gridColumn: "1 / -1" } : undefined}
                  >
                    {label}
                    {kind === "textarea" ? (
                      <textarea
                        rows={3}
                        value={edit[key]}
                        disabled={!canManage}
                        onChange={(e) =>
                          setEdit({ ...edit, [key]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        value={edit[key]}
                        disabled={!canManage}
                        onChange={(e) =>
                          setEdit({ ...edit, [key]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ))}
                <label className="recruit-field">
                  Statut
                  <select
                    value={edit.status}
                    disabled={!canManage}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        status: e.target.value as JobDescriptionStatus,
                      })
                    }
                  >
                    {(
                      Object.keys(
                        JOB_DESCRIPTION_STATUS_LABELS,
                      ) as JobDescriptionStatus[]
                    ).map((s) => (
                      <option key={s} value={s}>
                        {JOB_DESCRIPTION_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {canManage ? (
                <div className="recruit-actions__row" style={{ marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                    onClick={() => void saveEdit(false)}
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={busy}
                    onClick={() => void saveEdit(true)}
                  >
                    Nouvelle version
                  </button>
                </div>
              ) : null}
            </>
          )}
        </article>
      </div>

      <AdminOverlayPortal>
        <AdminFormWizard
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          titleId="job-desc-create"
          eyebrow="Poste"
          title="Nouvelle fiche de poste"
          lead="Mission, responsabilités, compétences, horaires, rattachement"
          avatar="FP"
          steps={[{ id: "poste", label: "Poste", hint: "Contenu" }]}
          stepId="poste"
          onStepChange={() => undefined}
          canEnterStep={() => true}
          formId="job-desc-form"
          onSubmit={(e) => void create(e)}
          submitLabel="Créer"
          busy={busy}
          canSubmit={Boolean(draft.title.trim() && draft.mission.trim())}
        >
          <FwPanel>
            <FwPanelHead
              title="Poste"
              description="Référentiel RH lié aux contrats agents et au recrutement."
            />
            <FwGrid>
              <FwField label="Intitulé *">
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </FwField>
              <FwField label="Rattachement">
                <input
                  value={draft.reportingLine}
                  onChange={(e) =>
                    setDraft({ ...draft, reportingLine: e.target.value })
                  }
                />
              </FwField>
              <FwField label="Horaires">
                <input
                  value={draft.schedule}
                  onChange={(e) =>
                    setDraft({ ...draft, schedule: e.target.value })
                  }
                />
              </FwField>
              <FwField label="Lieu">
                <input
                  value={draft.workLocation}
                  onChange={(e) =>
                    setDraft({ ...draft, workLocation: e.target.value })
                  }
                />
              </FwField>
              <FwField label="Mission *" wide>
                <textarea
                  rows={3}
                  value={draft.mission}
                  onChange={(e) =>
                    setDraft({ ...draft, mission: e.target.value })
                  }
                />
              </FwField>
              <FwField label="Responsabilités" wide>
                <textarea
                  rows={3}
                  value={draft.responsibilities}
                  onChange={(e) =>
                    setDraft({ ...draft, responsibilities: e.target.value })
                  }
                />
              </FwField>
              <FwField label="Compétences" wide>
                <textarea
                  rows={3}
                  value={draft.skills}
                  onChange={(e) =>
                    setDraft({ ...draft, skills: e.target.value })
                  }
                />
              </FwField>
            </FwGrid>
            <FwReview>
              <FwReviewCard
                title="Contrôle"
                rows={[
                  { label: "Poste", value: draft.title || "—" },
                  {
                    label: "Rattachement",
                    value: draft.reportingLine || "sans N+1",
                  },
                ]}
              />
            </FwReview>
          </FwPanel>
        </AdminFormWizard>
      </AdminOverlayPortal>
    </RhWorkspaceShell>
  );
}
