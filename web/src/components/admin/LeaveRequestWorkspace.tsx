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
import { IconClock, IconSearch } from "@/components/admin/Icons";
import {
  computeLeaveDays,
  defaultPlanningImpact,
  LEAVE_RULE_HINTS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPES,
  type LeaveRequest,
  type LeaveRequestStatus,
  type LeaveRequestType,
} from "@/lib/leave-requests-shared";
import { toast } from "@/lib/toast";

type Draft = {
  type: LeaveRequestType;
  employeeName: string;
  employeeEmail: string;
  matricule: string;
  startDate: string;
  endDate: string;
  motif: string;
  substituteName: string;
  affectedSites: string;
  note: string;
};

const EMPTY_DRAFT: Draft = {
  type: "conge_paye",
  employeeName: "",
  employeeEmail: "",
  matricule: "",
  startDate: "",
  endDate: "",
  motif: "",
  substituteName: "",
  affectedSites: "",
  note: "",
};

type Filter = "all" | LeaveRequestStatus;

function formatWhen(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function LeaveRequestWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [refuseNote, setRefuseNote] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave-requests", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: LeaveRequest[];
        canManage?: boolean;
        canValidate?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items ?? []);
      setCanManage(Boolean(data.canManage));
      setCanValidate(Boolean(data.canValidate));
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
      if (filter !== "all" && item.status !== filter) return false;
      if (!q) return true;
      return (
        item.employeeName.toLowerCase().includes(q) ||
        item.motif.toLowerCase().includes(q) ||
        LEAVE_TYPE_LABELS[item.type].toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  const draftDays = useMemo(
    () => computeLeaveDays(draft.startDate, draft.endDate),
    [draft.startDate, draft.endDate],
  );

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/leave-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        item?: LeaveRequest;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action impossible");
      toast.success("Demande mise à jour");
      await refresh();
      if (data.item) setSelectedId(data.item.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          days: draftDays,
          planningImpact: defaultPlanningImpact(
            draftDays,
            draft.type,
            draft.substituteName,
          ),
        }),
      });
      const data = (await res.json()) as {
        item?: LeaveRequest;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      toast.success("Demande créée");
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

  return (
    <RhWorkspaceShell
      embedded={embedded}
      badge="Congés"
      eyebrow="Congés & absences"
      icon={<IconClock size={20} />}
      title="Demande de congé / absence"
      meta={
        <>
          <span>Collaborateur · période · motif · validation · planning</span>
          <span>
            {items.filter((i) => i.status === "en_validation").length} en
            validation
          </span>
        </>
      }
      actions={
        <button
          type="button"
          className="btn-admin btn-admin--primary"
          onClick={() => {
            setDraft(EMPTY_DRAFT);
            setComposerOpen(true);
          }}
        >
          Nouvelle demande
        </button>
      }
      testId="leave-request-workspace"
    >
      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Collaborateur, motif…"
          />
        </label>
        <div className="leads-filters">
          {(
            [
              ["all", "Tous"],
              ["brouillon", "Brouillon"],
              ["en_validation", "En validation"],
              ["valide", "Validés"],
              ["refuse", "Refusés"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`leads-chip${filter === id ? " is-active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="leads-layout">
        <div className="leads-list" role="list">
          {loading ? (
            <p className="leads-empty">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="leads-empty">Aucune demande.</p>
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
                  <strong>{item.employeeName}</strong>
                  <span className={`leads-chip status-${item.status}`}>
                    {LEAVE_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p>
                  {LEAVE_TYPE_LABELS[item.type]} · {item.days} j ·{" "}
                  {item.startDate} → {item.endDate}
                </p>
                <span className="leads-card__meta">
                  {formatWhen(item.updatedAt)}
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {!selected ? (
            <p className="leads-empty">Sélectionnez une demande.</p>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">Congés</p>
                  <h3>{selected.employeeName}</h3>
                </div>
                <span className={`leads-chip status-${selected.status}`}>
                  {LEAVE_STATUS_LABELS[selected.status]}
                </span>
              </header>

              <dl className="docsig-meta" style={{ marginTop: "1rem" }}>
                <div>
                  <dt>Type</dt>
                  <dd>{LEAVE_TYPE_LABELS[selected.type]}</dd>
                </div>
                <div>
                  <dt>Période</dt>
                  <dd>
                    {selected.startDate} → {selected.endDate} ({selected.days}{" "}
                    j)
                  </dd>
                </div>
                <div>
                  <dt>Matricule</dt>
                  <dd>{selected.matricule || "—"}</dd>
                </div>
                <div>
                  <dt>Remplaçant</dt>
                  <dd>{selected.substituteName || "À désigner"}</dd>
                </div>
                <div>
                  <dt>Sites impactés</dt>
                  <dd>{selected.affectedSites || "—"}</dd>
                </div>
                <div>
                  <dt>Règle applicable</dt>
                  <dd>{LEAVE_RULE_HINTS[selected.type]}</dd>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <dt>Motif</dt>
                  <dd>{selected.motif || "—"}</dd>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <dt>Impact planning</dt>
                  <dd>{selected.planningImpact || "—"}</dd>
                </div>
                {selected.validatedAt ? (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <dt>Validation</dt>
                    <dd>
                      {selected.validatedByName} ·{" "}
                      {formatWhen(selected.validatedAt)}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="recruit-actions" style={{ marginTop: "1rem" }}>
                {(selected.status === "brouillon" ||
                  selected.status === "refuse") && (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                    onClick={() =>
                      void patch({ id: selected.id, action: "submit" })
                    }
                  >
                    Soumettre validation
                  </button>
                )}

                {canValidate && selected.status === "en_validation" ? (
                  <div className="recruit-actions__row">
                    <input
                      value={refuseNote}
                      onChange={(e) => setRefuseNote(e.target.value)}
                      placeholder="Motif (si refus)"
                    />
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy}
                      onClick={() =>
                        void patch({
                          id: selected.id,
                          action: "validate",
                          decision: "approve",
                        })
                      }
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={busy}
                      onClick={() =>
                        void patch({
                          id: selected.id,
                          action: "validate",
                          decision: "refuse",
                          note: refuseNote,
                        })
                      }
                    >
                      Refuser
                    </button>
                  </div>
                ) : null}

                {selected.status !== "annule" &&
                (canManage || selected.status !== "valide") ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={busy}
                    onClick={() =>
                      void patch({ id: selected.id, action: "cancel" })
                    }
                  >
                    Annuler
                  </button>
                ) : null}
              </div>

              <div className="recruit-history" style={{ marginTop: "1.25rem" }}>
                <h3>Historique</h3>
                {selected.history.length === 0 ? (
                  <p className="leads-empty">Aucun événement.</p>
                ) : (
                  <ol>
                    {selected.history.map((h) => (
                      <li key={h.id}>
                        <strong>{h.kind}</strong>
                        <span>
                          {formatWhen(h.at)} · {h.byName}
                        </span>
                        <p>{h.note}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </article>
      </div>

      <AdminOverlayPortal>
        <AdminFormWizard
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          titleId="leave-create"
          eyebrow="Congés"
          title="Demande de congé / absence"
          lead="Collaborateur, période, motif selon règles, impact planning"
          avatar="CG"
          steps={[{ id: "demande", label: "Demande", hint: "Période" }]}
          stepId="demande"
          onStepChange={() => undefined}
          canEnterStep={() => true}
          formId="leave-form"
          onSubmit={(e) => void create(e)}
          submitLabel="Créer"
          busy={busy}
          canSubmit={Boolean(
            draft.employeeName.trim() &&
              draft.startDate &&
              draft.endDate &&
              draftDays > 0,
          )}
        >
          <FwPanel>
            <FwPanelHead
              title="Demande"
              description={LEAVE_RULE_HINTS[draft.type]}
            />
            <FwGrid>
              <FwField label="Collaborateur *">
                <input
                  value={draft.employeeName}
                  onChange={(e) =>
                    setDraft({ ...draft, employeeName: e.target.value })
                  }
                />
              </FwField>
              <FwField label="E-mail">
                <input
                  type="email"
                  value={draft.employeeEmail}
                  onChange={(e) =>
                    setDraft({ ...draft, employeeEmail: e.target.value })
                  }
                />
              </FwField>
              <FwField label="Type *">
                <select
                  value={draft.type}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      type: e.target.value as LeaveRequestType,
                    })
                  }
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {LEAVE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </FwField>
              <FwField label="Matricule">
                <input
                  value={draft.matricule}
                  onChange={(e) =>
                    setDraft({ ...draft, matricule: e.target.value })
                  }
                />
              </FwField>
              <FwField label="Du *">
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) =>
                    setDraft({ ...draft, startDate: e.target.value })
                  }
                />
              </FwField>
              <FwField label="Au *">
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(e) =>
                    setDraft({ ...draft, endDate: e.target.value })
                  }
                />
              </FwField>
              <FwField label="Remplaçant proposé">
                <input
                  value={draft.substituteName}
                  onChange={(e) =>
                    setDraft({ ...draft, substituteName: e.target.value })
                  }
                />
              </FwField>
              <FwField label="Sites / créneaux impactés">
                <input
                  value={draft.affectedSites}
                  onChange={(e) =>
                    setDraft({ ...draft, affectedSites: e.target.value })
                  }
                />
              </FwField>
              <FwField label="Motif" wide>
                <textarea
                  rows={3}
                  value={draft.motif}
                  onChange={(e) =>
                    setDraft({ ...draft, motif: e.target.value })
                  }
                />
              </FwField>
            </FwGrid>
            <FwReview>
              <FwReviewCard
                title="Impact planning (prévu)"
                rows={[
                  {
                    label: "Synthèse",
                    value:
                      draftDays > 0
                        ? defaultPlanningImpact(
                            draftDays,
                            draft.type,
                            draft.substituteName,
                          )
                        : "Période à renseigner",
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
