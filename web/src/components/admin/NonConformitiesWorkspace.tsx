"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ModuleHeader } from "@/components/admin/Ui";
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
import { IconChecklist, IconSearch } from "@/components/admin/Icons";
import { toast } from "@/lib/toast";
import { fileToOptimizedDataUrl } from "@/lib/settings";
import { persistOptimizedImage } from "@/lib/vercel-blob-client";
import {
  NC_CRITICALITY_LABELS,
  NC_SOURCE_LABELS,
  NC_STATUS_LABELS,
  ncClosureRequirements,
  type NcCriticality,
  type NcSource,
  type NcStatus,
  type NonConformity,
} from "@/lib/non-conformities-shared";

type SiteOpt = { id: string; name: string };
type AssigneeOpt = { id: string; name: string; role: string };

export function NonConformitiesWorkspace() {
  const [items, setItems] = useState<NonConformity[]>([]);
  const [sites, setSites] = useState<SiteOpt[]>([]);
  const [assignees, setAssignees] = useState<AssigneeOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<NcStatus | "all" | "overdue">(
    "all",
  );
  const [criticalityFilter, setCriticalityFilter] = useState<
    NcCriticality | "all"
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<
    "ecart" | "classement" | "revue"
  >("ecart");
  const [composerShake, setComposerShake] = useState(false);
  const [validationNote, setValidationNote] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    critique: 0,
    overdue: 0,
    aValider: 0,
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    siteId: "",
    criticality: "majeure" as NcCriticality,
    source: "terrain" as NcSource,
    dueDate: "",
  });

  const [assignForm, setAssignForm] = useState({
    assigneeId: "",
    dueDate: "",
  });
  const [actionText, setActionText] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/non-conformities", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: NonConformity[];
        sites?: SiteOpt[];
        assignees?: AssigneeOpt[];
        stats?: typeof stats;
        canEdit?: boolean;
        canValidate?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement");
      setItems(data.items ?? []);
      setSites(data.sites ?? []);
      setAssignees(data.assignees ?? []);
      setCanEdit(Boolean(data.canEdit));
      setCanValidate(Boolean(data.canValidate));
      if (data.stats) setStats(data.stats);
      setSelectedId((prev) => prev ?? data.items?.[0]?.id ?? null);
      setForm((f) => ({
        ...f,
        siteId: f.siteId || data.sites?.[0]?.id || "",
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = useMemo(
    () => items.find((n) => n.id === selectedId) ?? null,
    [items, selectedId],
  );

  const closure = useMemo(
    () => (selected ? ncClosureRequirements(selected) : null),
    [selected],
  );

  const isOverdue = useCallback((n: NonConformity) => {
    if (n.status === "cloturee" || !n.dueDate) return false;
    return n.dueDate < new Date().toISOString().slice(0, 10);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      if (statusFilter === "overdue") {
        if (!isOverdue(n)) return false;
      } else if (statusFilter !== "all" && n.status !== statusFilter) {
        return false;
      }
      if (
        criticalityFilter !== "all" &&
        n.criticality !== criticalityFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        n.ref.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q) ||
        n.siteName.toLowerCase().includes(q) ||
        n.assigneeName.toLowerCase().includes(q) ||
        n.qualityControlRef.toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter, criticalityFilter, isOverdue]);

  const workflowStep = useMemo(() => {
    if (!selected) return 0;
    if (selected.status === "cloturee") return 5;
    if (selected.validated) return 4;
    if (selected.status === "a_valider") return 3;
    if (selected.correctiveAction && selected.proofs.length > 0) return 3;
    if (selected.assigneeId) return 2;
    return 1;
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    setAssignForm({
      assigneeId: selected.assigneeId || assignees[0]?.id || "",
      dueDate: selected.dueDate || "",
    });
    setActionText(selected.correctiveAction);
  }, [selected, assignees]);

  const post = async (
    action: string,
    payload: Record<string, unknown>,
    opts?: { manageBusy?: boolean },
  ) => {
    const manageBusy = opts?.manageBusy !== false;
    if (manageBusy && busy) return null;
    if (manageBusy && busyLock.current) return null;
    if (manageBusy) {
      busyLock.current = true;
      setBusy(true);
    }
    try {
      const res = await fetch("/api/non-conformities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as {
        item?: NonConformity;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      toast.success("Enregistré");
      await refresh();
      if (data.item?.id) setSelectedId(data.item.id);
      return data.item ?? null;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      if (manageBusy) {
        busyLock.current = false;
        setBusy(false);
      }
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    const item = await post("create", {
      title: form.title,
      description: form.description,
      siteId: form.siteId,
      criticality: form.criticality,
      source: form.source,
      dueDate: form.dueDate || undefined,
    });
    if (item) {
      setComposerOpen(false);
      setComposerStep("ecart");
      setForm((f) => ({
        ...f,
        title: "",
        description: "",
        dueDate: "",
      }));
    }
  };

  const ecartReady =
    Boolean(form.title.trim()) && Boolean(form.siteId);
  const pulseComposerError = () => {
    setComposerShake(true);
    window.setTimeout(() => setComposerShake(false), 420);
  };
  const canEnterComposerStep = (id: string) => {
    if (id === "ecart") return true;
    return ecartReady;
  };

  const onProof = async (file: File | null) => {
    if (!file || !selected) return;
    if (busy || busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const { url } = await persistOptimizedImage({
        file,
        folder: "terrain",
        maxSize: 1280,
        forceJpeg: true,
        quality: 0.75,
        optimize: fileToOptimizedDataUrl,
      });
      busyLock.current = false;
      setBusy(false);
      await post("add_proof", {
        id: selected.id,
        url,
        caption: file.name,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo échouée");
      busyLock.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="admin-page nc-page">
      <ModuleHeader
        tone="#b91c1c"
        badge="Qualité"
        icon={<IconChecklist size={20} />}
        title="Non-conformités"
        meta={
          <>
            <span>
              Écarts · criticité · responsable · échéance · preuve · validation
            </span>
            <span>
              {stats.open} ouvertes · {stats.critique} critiques ·{" "}
              {stats.aValider} à valider
            </span>
          </>
        }
        actions={
          canEdit ? (
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={() => {
                setComposerStep("ecart");
                setComposerOpen(true);
              }}
            >
              Nouvelle NC
            </button>
          ) : null
        }
      />

      <div className="leads-kpis nc-kpis" role="group" aria-label="Indicateurs">
        <button
          type="button"
          className={`leads-kpi${statusFilter === "all" && criticalityFilter === "all" ? " is-active" : ""}`}
          onClick={() => {
            setStatusFilter("all");
            setCriticalityFilter("all");
          }}
        >
          <span>Total</span>
          <strong>{stats.total}</strong>
        </button>
        <button
          type="button"
          className={`leads-kpi${statusFilter !== "all" && statusFilter !== "cloturee" && statusFilter !== "overdue" ? " is-active" : ""}`}
          onClick={() => {
            setStatusFilter("ouverte");
            setCriticalityFilter("all");
          }}
        >
          <span>Ouvertes</span>
          <strong>{stats.open}</strong>
        </button>
        <button
          type="button"
          className={`leads-kpi${criticalityFilter === "critique" ? " is-active" : ""}`}
          onClick={() => {
            setStatusFilter("all");
            setCriticalityFilter("critique");
          }}
        >
          <span>Critiques</span>
          <strong>{stats.critique}</strong>
        </button>
        <button
          type="button"
          className={`leads-kpi${statusFilter === "overdue" ? " is-active" : ""}`}
          onClick={() => {
            setStatusFilter("overdue");
            setCriticalityFilter("all");
          }}
        >
          <span>En retard</span>
          <strong>{stats.overdue}</strong>
        </button>
        <button
          type="button"
          className={`leads-kpi${statusFilter === "a_valider" ? " is-active" : ""}`}
          onClick={() => {
            setStatusFilter("a_valider");
            setCriticalityFilter("all");
          }}
        >
          <span>À valider</span>
          <strong>{stats.aValider}</strong>
        </button>
      </div>

      <div className="leads-toolbar nc-toolbar">
        <label className="leads-search">
          <IconSearch />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Réf, titre, site, responsable, CQ…"
          />
        </label>
        <div className="leads-filters nc-filters" role="tablist">
          {(
            [
              "all",
              "ouverte",
              "affectee",
              "en_cours",
              "a_valider",
              "cloturee",
            ] as const
          ).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={statusFilter === s}
              className={
                statusFilter === s
                  ? "btn-admin btn-admin--primary"
                  : "btn-admin btn-admin--ghost"
              }
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "Tous" : NC_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="nc-crit-filters" role="group" aria-label="Criticité">
          {(
            [
              ["all", "Toutes"],
              ["critique", "Critique"],
              ["majeure", "Majeure"],
              ["mineure", "Mineure"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`nc-crit-chip${criticalityFilter === id ? " is-active" : ""}${id === "critique" ? " is-danger" : ""}`}
              onClick={() => setCriticalityFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="leads-empty">Chargement…</p>
      ) : (
        <div className="nc-layout">
          <aside className="nc-list">
            {filtered.length === 0 ? (
              <p className="leads-empty">Aucune non-conformité.</p>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`nc-card${n.id === selectedId ? " is-active" : ""}${n.criticality === "critique" ? " is-critique" : ""}${isOverdue(n) ? " is-late" : ""}`}
                  onClick={() => setSelectedId(n.id)}
                >
                  <strong>
                    {n.ref} · {NC_STATUS_LABELS[n.status]}
                  </strong>
                  <span>{n.title}</span>
                  <span>
                    {NC_CRITICALITY_LABELS[n.criticality]} · {n.siteName}
                    {n.dueDate ? ` · ${n.dueDate}` : ""}
                    {isOverdue(n) ? " · en retard" : ""}
                  </span>
                  {n.assigneeName ? (
                    <span className="nc-card__assignee">{n.assigneeName}</span>
                  ) : null}
                </button>
              ))
            )}
          </aside>

          <main className="nc-detail panel-card">
            {!selected ? (
              <p className="leads-empty">Sélectionnez une NC.</p>
            ) : (
              <>
                <header className="nc-detail__head">
                  <div>
                    <h2>{selected.ref}</h2>
                    <p>{selected.title}</p>
                    <p className="nc-meta">
                      {NC_CRITICALITY_LABELS[selected.criticality]} ·{" "}
                      {NC_SOURCE_LABELS[selected.source]} ·{" "}
                      {NC_STATUS_LABELS[selected.status]}
                      <br />
                      {selected.siteName}
                      {selected.qualityControlRef
                        ? ` · CQ ${selected.qualityControlRef}`
                        : ""}
                      {isOverdue(selected) ? " · en retard" : ""}
                    </p>
                  </div>
                </header>

                <ol className="nc-workflow" aria-label="Parcours NC">
                  {(
                    [
                      "Ouverte",
                      "Affectée",
                      "Action / preuve",
                      "Validation",
                      "Clôture",
                    ] as const
                  ).map((label, i) => {
                    const step = i + 1;
                    const done = workflowStep > step;
                    const active = workflowStep === step;
                    return (
                      <li
                        key={label}
                        className={`nc-workflow__step${done ? " is-done" : ""}${active ? " is-active" : ""}`}
                      >
                        <span>{step}</span>
                        <em>{label}</em>
                      </li>
                    );
                  })}
                </ol>

                {selected.description ? (
                  <p className="nc-desc">{selected.description}</p>
                ) : null}

                {closure ? (
                  <div
                    className={`nc-checklist-req${closure.ok ? " is-ok" : ""}`}
                    data-testid="nc-closure-checklist"
                  >
                    <strong>
                      {closure.ok
                        ? "Prêt à clôturer — tous les éléments requis sont présents"
                        : "Clôture bloquée — éléments requis manquants"}
                    </strong>
                    <ul>
                      {(
                        [
                          ["responsable", Boolean(selected.assigneeId)],
                          ["échéance", Boolean(selected.dueDate)],
                          [
                            "action corrective",
                            Boolean(selected.correctiveAction.trim()),
                          ],
                          ["preuve", selected.proofs.length > 0],
                          ["validation", selected.validated],
                        ] as const
                      ).map(([el, ok]) => (
                        <li
                          key={el}
                          className={ok ? "is-ok" : "is-miss"}
                          data-req={el}
                          data-ok={ok ? "1" : "0"}
                        >
                          {ok ? "●" : "○"} {el}
                        </li>
                      ))}
                    </ul>
                    {!closure.ok ? (
                      <p className="nc-checklist-req__hint">
                        Manque : {closure.missing.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {canEdit && selected.status !== "cloturee" ? (
                  <section className="nc-section">
                    <h3>Affectation</h3>
                    <div className="nc-form-row">
                      <label>
                        Responsable
                        <select
                          value={assignForm.assigneeId}
                          onChange={(e) =>
                            setAssignForm((f) => ({
                              ...f,
                              assigneeId: e.target.value,
                            }))
                          }
                        >
                          <option value="">— Choisir —</option>
                          {assignees.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.role})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Échéance
                        <input
                          type="date"
                          value={assignForm.dueDate}
                          onChange={(e) =>
                            setAssignForm((f) => ({
                              ...f,
                              dueDate: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary nc-btn-lg"
                      disabled={busy}
                      onClick={() =>
                        void post("assign", {
                          id: selected.id,
                          assigneeId: assignForm.assigneeId,
                          dueDate: assignForm.dueDate,
                        })
                      }
                    >
                      Affecter
                    </button>
                  </section>
                ) : (
                  <p className="nc-meta">
                    Responsable : {selected.assigneeName || "—"} · Échéance :{" "}
                    {selected.dueDate || "—"}
                  </p>
                )}

                {canEdit && selected.status !== "cloturee" ? (
                  <section className="nc-section">
                    <h3>Action corrective</h3>
                    <textarea
                      rows={3}
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                      placeholder="Mesure corrective à appliquer…"
                    />
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary nc-btn-lg"
                      disabled={busy}
                      onClick={() =>
                        void post("update_action", {
                          id: selected.id,
                          correctiveAction: actionText,
                          dueDate: assignForm.dueDate || selected.dueDate,
                        })
                      }
                    >
                      Enregistrer l’action
                    </button>
                  </section>
                ) : selected.correctiveAction ? (
                  <section className="nc-section">
                    <h3>Action corrective</h3>
                    <p>{selected.correctiveAction}</p>
                  </section>
                ) : null}

                <section className="nc-section">
                  <h3>Preuves</h3>
                  {canEdit && selected.status !== "cloturee" ? (
                    <label className="nc-proof-upload">
                      Ajouter une photo / preuve
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={busy}
                        onChange={(e) =>
                          void onProof(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  ) : null}
                  {selected.proofs.length === 0 ? (
                    <p className="nc-meta">Aucune preuve.</p>
                  ) : (
                    <div className="nc-proofs">
                      {selected.proofs.map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={p.id} src={p.url} alt={p.caption || p.id} />
                      ))}
                    </div>
                  )}
                </section>

                {canEdit &&
                selected.status !== "cloturee" &&
                selected.status !== "a_valider" &&
                !selected.validated ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost nc-btn-lg"
                    disabled={
                      busy ||
                      !selected.assigneeId ||
                      !selected.dueDate ||
                      !selected.correctiveAction.trim() ||
                      selected.proofs.length === 0
                    }
                    title={
                      !selected.assigneeId ||
                      !selected.dueDate ||
                      !selected.correctiveAction.trim() ||
                      selected.proofs.length === 0
                        ? "Complétez responsable, échéance, action et preuve"
                        : undefined
                    }
                    onClick={() =>
                      void post("submit_validation", { id: selected.id })
                    }
                  >
                    Soumettre à validation Qualité
                  </button>
                ) : null}

                {canValidate &&
                selected.status === "a_valider" &&
                !selected.validated ? (
                  <section className="nc-section nc-section--validate">
                    <h3>Validation Qualité</h3>
                    <p className="nc-meta">
                      Vérifiez criticité, responsable, échéance, action
                      corrective et preuve avant d’approuver.
                    </p>
                    <textarea
                      rows={2}
                      value={validationNote}
                      onChange={(e) => setValidationNote(e.target.value)}
                      placeholder="Note de validation…"
                    />
                    <div className="nc-actions-row">
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary nc-btn-lg"
                        disabled={busy}
                        onClick={() =>
                          void post("validate", {
                            id: selected.id,
                            note: validationNote,
                            approve: true,
                          })
                        }
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost nc-btn-lg"
                        disabled={busy}
                        onClick={() =>
                          void post("validate", {
                            id: selected.id,
                            note: validationNote,
                            approve: false,
                          })
                        }
                      >
                        Refuser
                      </button>
                    </div>
                  </section>
                ) : null}

                {selected.validated ? (
                  <p className="nc-validated">
                    Validée par {selected.validatedByName}
                    {selected.validatedAt
                      ? ` · ${new Date(selected.validatedAt).toLocaleString("fr-FR")}`
                      : ""}
                    {selected.validationNote
                      ? ` — ${selected.validationNote}`
                      : ""}
                  </p>
                ) : null}

                {canEdit && selected.status !== "cloturee" ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary nc-btn-lg nc-close-btn"
                    data-testid="nc-close-btn"
                    disabled={busy || Boolean(closure && !closure.ok)}
                    title={
                      closure && !closure.ok
                        ? `Manque : ${closure.missing.join(", ")}`
                        : "Clôturer avec tous les éléments requis"
                    }
                    onClick={() => void post("close", { id: selected.id })}
                  >
                    {closure && !closure.ok
                      ? `Clôturer (manque ${closure.missing.length})`
                      : "Clôturer la NC"}
                  </button>
                ) : null}

                {selected.status === "cloturee" ? (
                  <p className="nc-closed">
                    Clôturée le{" "}
                    {selected.closedAt
                      ? new Date(selected.closedAt).toLocaleString("fr-FR")
                      : "—"}{" "}
                    par {selected.closedByName}
                  </p>
                ) : null}

                <section className="need-qual__history">
                  <h3>Journal</h3>
                  <ol>
                    {selected.history.slice(0, 12).map((h) => (
                      <li key={h.id}>
                        <time>
                          {new Date(h.at).toLocaleString("fr-FR")}
                        </time>
                        <span>
                          {h.byName} — {h.detail}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            )}
          </main>
        </div>
      )}

      <AdminFormWizard
        open={composerOpen && canEdit}
        portal
        onClose={() => {
          setComposerOpen(false);
          setComposerStep("ecart");
        }}
        titleId="nc-composer-title"
        eyebrow="Qualité"
        title="Déclarer une non-conformité"
        lead="Enregistrez un écart terrain avec criticité, source et échéance."
        steps={[
          { id: "ecart", label: "Écart", hint: "Titre & site" },
          { id: "classement", label: "Classement", hint: "Criticité & source" },
          { id: "revue", label: "Revue", hint: "Contrôle avant enregistrement" },
        ]}
        stepId={composerStep}
        onStepChange={(id) =>
          setComposerStep(id as "ecart" | "classement" | "revue")
        }
        canEnterStep={canEnterComposerStep}
        onStepBlocked={pulseComposerError}
        shake={composerShake}
        formId="necs-nc-create-form"
        onSubmit={(e) => void onCreate(e)}
        submitLabel="Enregistrer"
        busy={busy}
        canSubmit={ecartReady}
      >
        {composerStep === "ecart" ? (
          <FwPanel aria-label="Écart">
            <FwPanelHead
              title="Description de l’écart"
              description="Titre clair et site concerné."
            />
            <FwGrid>
              <FwField label="Titre *" wide>
                <input
                  required
                  autoFocus
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Site *">
                <select
                  required
                  value={form.siteId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, siteId: e.target.value }))
                  }
                >
                  <option value="">— Site —</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </FwField>
              <FwField label="Échéance (optionnelle)">
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Description" wide>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "classement" ? (
          <FwPanel aria-label="Classement">
            <FwPanelHead
              title="Classement"
              description="Criticité et origine de la détection."
            />
            <FwBlock>
              <FwPanelHead title="Criticité" />
              <FwChips>
                {(
                  Object.keys(NC_CRITICALITY_LABELS) as NcCriticality[]
                ).map((c) => (
                  <FwChip
                    key={c}
                    selected={form.criticality === c}
                    title={NC_CRITICALITY_LABELS[c]}
                    onClick={() =>
                      setForm((f) => ({ ...f, criticality: c }))
                    }
                  />
                ))}
              </FwChips>
            </FwBlock>
            <FwBlock>
              <FwPanelHead title="Source" />
              <FwChips>
                {(Object.keys(NC_SOURCE_LABELS) as NcSource[]).map((s) => (
                  <FwChip
                    key={s}
                    selected={form.source === s}
                    title={NC_SOURCE_LABELS[s]}
                    onClick={() => setForm((f) => ({ ...f, source: s }))}
                  />
                ))}
              </FwChips>
            </FwBlock>
          </FwPanel>
        ) : null}

        {composerStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue avant enregistrement"
              description="Vérifiez l’écart avant création du dossier NC."
            />
            <FwReview>
              <FwReviewCard
                title="Écart"
                rows={[
                  { label: "Titre", value: form.title || "—" },
                  {
                    label: "Site",
                    value:
                      sites.find((s) => s.id === form.siteId)?.name || "—",
                  },
                  { label: "Échéance", value: form.dueDate || "—" },
                  {
                    label: "Description",
                    value: form.description.trim() || "—",
                  },
                ]}
              />
              <FwReviewCard
                title="Classement"
                rows={[
                  {
                    label: "Criticité",
                    value: NC_CRITICALITY_LABELS[form.criticality],
                  },
                  {
                    label: "Source",
                    value: NC_SOURCE_LABELS[form.source],
                  },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>
    </div>
  );
}
