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
import { IconQuality, IconSearch } from "@/components/admin/Icons";
import { toast } from "@/lib/toast";
import {
  PLAN_STATUS_LABELS,
  SATISFACTION_CHANNEL_LABELS,
  currentPeriod,
  formatPeriodLabel,
  scoreHistoryFor,
  type ImprovementPlan,
  type PlanStatus,
  type SatisfactionChannel,
  type SatisfactionDashboard,
  type SatisfactionScore,
} from "@/lib/satisfaction-shared";

type ClientOpt = { id: string; name: string; company: string; email: string };
type SiteOpt = { id: string; name: string };
type AssigneeOpt = { id: string; name: string; role: string };

const emptyDash: SatisfactionDashboard = {
  avgScore: null,
  previousAvgScore: null,
  deltaPoints: null,
  satisfactionRate: null,
  scoresCount: 0,
  plansOpen: 0,
  plansTotal: 0,
  plansClosed: 0,
  bySite: [],
  byClient: [],
  recentScores: [],
};

export function SatisfactionWorkspace() {
  const [scores, setScores] = useState<SatisfactionScore[]>([]);
  const [plans, setPlans] = useState<ImprovementPlan[]>([]);
  const [dashboard, setDashboard] = useState<SatisfactionDashboard>(emptyDash);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [sites, setSites] = useState<SiteOpt[]>([]);
  const [assignees, setAssignees] = useState<AssigneeOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"scores" | "plans" | "historique">("scores");
  const [selectedClientKey, setSelectedClientKey] = useState<string | null>(
    null,
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [scoreOpen, setScoreOpen] = useState(false);
  const [scoreStep, setScoreStep] = useState<"mesure" | "contexte" | "revue">(
    "mesure",
  );
  const [scoreShake, setScoreShake] = useState(false);
  const [scoreForm, setScoreForm] = useState({
    score: 80,
    clientId: "",
    siteId: "",
    period: currentPeriod(),
    channel: "questionnaire" as SatisfactionChannel,
    comment: "",
    clientName: "",
    company: "",
  });

  const [planOpen, setPlanOpen] = useState(false);
  const [planStep, setPlanStep] = useState<"objectif" | "cible" | "revue">(
    "objectif",
  );
  const [planShake, setPlanShake] = useState(false);
  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    clientId: "",
    siteId: "",
    dueDate: "",
    ownerId: "",
    triggerScoreId: "",
    clientName: "",
    company: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/satisfaction", { cache: "no-store" });
      const data = (await res.json()) as {
        scores?: SatisfactionScore[];
        plans?: ImprovementPlan[];
        dashboard?: SatisfactionDashboard;
        clients?: ClientOpt[];
        sites?: SiteOpt[];
        assignees?: AssigneeOpt[];
        canEdit?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement");
      setScores(data.scores ?? []);
      setPlans(data.plans ?? []);
      if (data.dashboard) setDashboard(data.dashboard);
      setClients(data.clients ?? []);
      setSites(data.sites ?? []);
      setAssignees(data.assignees ?? []);
      setCanEdit(Boolean(data.canEdit));
      setSelectedClientKey(
        (prev) => prev ?? data.dashboard?.byClient?.[0]?.clientKey ?? null,
      );
      setSelectedPlanId((prev) => prev ?? data.plans?.[0]?.id ?? null);
      setScoreForm((f) => ({
        ...f,
        clientId: f.clientId || data.clients?.[0]?.id || "",
        siteId: f.siteId || data.sites?.[0]?.id || "",
      }));
      setPlanForm((f) => ({
        ...f,
        clientId: f.clientId || data.clients?.[0]?.id || "",
        siteId: f.siteId || data.sites?.[0]?.id || "",
        ownerId: f.ownerId || data.assignees?.[0]?.id || "",
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

  const post = async (action: string, payload: Record<string, unknown>) => {
    if (busy) return null;
    if (busyLock.current) return null;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/satisfaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Échec");
      toast.success("Enregistré");
      await refresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return false;
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  };

  const history = useMemo(() => {
    if (!selectedClientKey) return [];
    const client = dashboard.byClient.find(
      (c) => c.clientKey === selectedClientKey,
    );
    return scoreHistoryFor(scores, {
      clientId:
        client && selectedClientKey !== "_"
          ? scores.find(
              (s) =>
                s.clientId === selectedClientKey ||
                s.company === client.company ||
                s.clientName === client.clientName,
            )?.clientId
          : undefined,
    }).filter((s) => {
      if (!client) return true;
      return (
        s.clientId === selectedClientKey ||
        s.company === client.company ||
        s.clientName === client.clientName
      );
    });
  }, [dashboard.byClient, scores, selectedClientKey]);

  const filteredScores = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scores.filter((s) => {
      if (!q) return true;
      return (
        s.ref.toLowerCase().includes(q) ||
        s.clientName.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q) ||
        s.siteName.toLowerCase().includes(q)
      );
    });
  }, [scores, query]);

  const filteredPlans = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plans.filter((p) => {
      if (!q) return true;
      return (
        p.ref.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.siteName.toLowerCase().includes(q)
      );
    });
  }, [plans, query]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const mesureReady = scoreForm.score >= 0 && scoreForm.score <= 100;
  const planReady = Boolean(planForm.title.trim());

  const onAddScore = async (e: FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === scoreForm.clientId);
    const ok = await post("add_score", {
      score: scoreForm.score,
      clientId: scoreForm.clientId || undefined,
      clientName: client?.name || scoreForm.clientName || undefined,
      company: client?.company || scoreForm.company || undefined,
      siteId: scoreForm.siteId || undefined,
      period: scoreForm.period,
      channel: scoreForm.channel,
      comment: scoreForm.comment || undefined,
    });
    if (ok) {
      setScoreOpen(false);
      setScoreStep("mesure");
      setScoreForm((f) => ({ ...f, score: 80, comment: "" }));
      setView("historique");
    }
  };

  const onCreatePlan = async (e: FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === planForm.clientId);
    const ok = await post("create_plan", {
      title: planForm.title,
      description: planForm.description || undefined,
      clientId: planForm.clientId || undefined,
      clientName: client?.name || planForm.clientName || undefined,
      company: client?.company || planForm.company || undefined,
      siteId: planForm.siteId || undefined,
      dueDate: planForm.dueDate || undefined,
      ownerId: planForm.ownerId || undefined,
      triggerScoreId: planForm.triggerScoreId || undefined,
    });
    if (ok) {
      setPlanOpen(false);
      setPlanStep("objectif");
      setPlanForm((f) => ({
        ...f,
        title: "",
        description: "",
        dueDate: "",
        triggerScoreId: "",
      }));
      setView("plans");
    }
  };

  const setPlanStatus = async (status: PlanStatus) => {
    if (!selectedPlan) return;
    await post("set_plan_status", { id: selectedPlan.id, status });
  };

  const rateLabel =
    dashboard.satisfactionRate !== null
      ? `${Math.round(dashboard.satisfactionRate)}%`
      : "—";
  const delta = dashboard.deltaPoints;

  return (
    <div className="admin-page sat-page">
      <ModuleHeader
        tone="#0f766e"
        badge="Qualité"
        icon={<IconQuality size={20} />}
        title="Satisfaction"
        meta={
          <>
            <span>Scores client / site · plans d’amélioration · historique</span>
            <span>
              {rateLabel} moyen · {dashboard.plansOpen} plan
              {dashboard.plansOpen > 1 ? "s" : ""} ouvert
              {dashboard.plansOpen > 1 ? "s" : ""}
            </span>
          </>
        }
        actions={
          canEdit ? (
            <>
              <button
                type="button"
                className="btn-admin"
                onClick={() => {
                  setPlanStep("objectif");
                  setPlanOpen(true);
                }}
              >
                Nouveau plan
              </button>
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => {
                  setScoreStep("mesure");
                  setScoreOpen(true);
                }}
              >
                Nouveau score
              </button>
            </>
          ) : null
        }
      />

      <div className="leads-kpis sat-kpis" role="group" aria-label="Indicateurs">
        <div className="leads-kpi is-active" data-testid="sat-kpi-rate">
          <span>Taux satisfaction</span>
          <strong>{rateLabel}</strong>
          {delta !== null ? (
            <em className={delta >= 0 ? "up" : "down"}>
              {delta >= 0 ? "+" : ""}
              {delta} pts
            </em>
          ) : null}
        </div>
        <div className="leads-kpi">
          <span>Mesures</span>
          <strong>{dashboard.scoresCount}</strong>
        </div>
        <div className="leads-kpi">
          <span>Plans ouverts</span>
          <strong>{dashboard.plansOpen}</strong>
        </div>
        <div className="leads-kpi">
          <span>Plans clos</span>
          <strong>{dashboard.plansClosed}</strong>
        </div>
      </div>

      <div className="dig-hub__subtabs" role="tablist" style={{ marginBottom: 12 }}>
        {(
          [
            ["scores", "Scores"],
            ["historique", "Historique"],
            ["plans", "Plans d’amélioration"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={view === id ? "dig-hub__subtab is-active" : "dig-hub__subtab"}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher client, site, réf…"
          />
        </label>
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : view === "scores" ? (
        <div className="leads-layout">
          <div className="leads-list" data-testid="sat-scores-list">
            {filteredScores.length === 0 ? (
              <p className="muted">Aucun score enregistré.</p>
            ) : (
              filteredScores.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="leads-card"
                  onClick={() => {
                    setSelectedClientKey(
                      s.clientId || s.company || s.clientName || "_",
                    );
                    setView("historique");
                  }}
                >
                  <div className="leads-card__top">
                    <strong>{s.score}/100</strong>
                    <span>{s.ref}</span>
                  </div>
                  <p>
                    {s.clientName || s.company}
                    {s.siteName ? ` · ${s.siteName}` : ""}
                  </p>
                  <small>
                    {formatPeriodLabel(s.period)} ·{" "}
                    {SATISFACTION_CHANNEL_LABELS[s.channel]}
                  </small>
                </button>
              ))
            )}
          </div>
          <aside className="leads-detail">
            <h3>Par site</h3>
            {dashboard.bySite.length === 0 ? (
              <p className="muted">Pas encore de ventilation site.</p>
            ) : (
              <ul className="sat-site-list">
                {dashboard.bySite.map((row) => (
                  <li key={row.siteId || row.siteName}>
                    <strong>{row.avgScore}%</strong>
                    <span>{row.siteName}</span>
                    <em>
                      {row.scoresCount} mesure
                      {row.scoresCount > 1 ? "s" : ""}
                      {row.plansOpen
                        ? ` · ${row.plansOpen} plan${row.plansOpen > 1 ? "s" : ""}`
                        : ""}
                    </em>
                  </li>
                ))}
              </ul>
            )}
            <h3 style={{ marginTop: 20 }}>Par client</h3>
            {dashboard.byClient.length === 0 ? (
              <p className="muted">Pas encore de ventilation client.</p>
            ) : (
              <ul className="sat-site-list">
                {dashboard.byClient.map((row) => (
                  <li key={row.clientKey}>
                    <strong>{row.avgScore}%</strong>
                    <span>{row.clientName}</span>
                    <em>{row.scoresCount} mesure{row.scoresCount > 1 ? "s" : ""}</em>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      ) : view === "historique" ? (
        <div className="leads-layout">
          <div className="leads-list">
            {dashboard.byClient.map((c) => (
              <button
                key={c.clientKey}
                type="button"
                className={
                  selectedClientKey === c.clientKey
                    ? "leads-card is-active"
                    : "leads-card"
                }
                onClick={() => setSelectedClientKey(c.clientKey)}
              >
                <div className="leads-card__top">
                  <strong>{c.clientName}</strong>
                  <span>{c.avgScore}%</span>
                </div>
                <p>{c.company}</p>
                <small>
                  {c.scoresCount} score{c.scoresCount > 1 ? "s" : ""}
                </small>
              </button>
            ))}
          </div>
          <aside className="leads-detail" data-testid="sat-history">
            <h3>Historique des scores</h3>
            {history.length === 0 ? (
              <p className="muted">Sélectionnez un client pour voir l’historique.</p>
            ) : (
              <ol className="sat-history">
                {history.map((s) => (
                  <li key={s.id}>
                    <strong>{s.score}/100</strong>
                    <span>{formatPeriodLabel(s.period)}</span>
                    <em>
                      {s.siteName || "—"} ·{" "}
                      {SATISFACTION_CHANNEL_LABELS[s.channel]}
                    </em>
                    {s.comment ? <p>{s.comment}</p> : null}
                    <small>
                      {new Date(s.createdAt).toLocaleString("fr-FR")} ·{" "}
                      {s.createdByName}
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      ) : (
        <div className="leads-layout">
          <div className="leads-list" data-testid="sat-plans-list">
            {filteredPlans.length === 0 ? (
              <p className="muted">Aucun plan d’amélioration.</p>
            ) : (
              filteredPlans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={
                    selectedPlanId === p.id
                      ? "leads-card is-active"
                      : "leads-card"
                  }
                  onClick={() => setSelectedPlanId(p.id)}
                >
                  <div className="leads-card__top">
                    <strong>{p.title}</strong>
                    <span>{PLAN_STATUS_LABELS[p.status]}</span>
                  </div>
                  <p>
                    {p.clientName}
                    {p.siteName ? ` · ${p.siteName}` : ""}
                  </p>
                  <small>
                    {p.ownerName || "—"}
                    {p.dueDate ? ` · échéance ${p.dueDate}` : ""}
                  </small>
                </button>
              ))
            )}
          </div>
          <aside className="leads-detail">
            {!selectedPlan ? (
              <p className="muted">Sélectionnez un plan.</p>
            ) : (
              <>
                <h3>{selectedPlan.title}</h3>
                <p className="muted">{selectedPlan.ref}</p>
                <p>{selectedPlan.description || "Pas de description."}</p>
                <dl className="sat-dl">
                  <div>
                    <dt>Statut</dt>
                    <dd>{PLAN_STATUS_LABELS[selectedPlan.status]}</dd>
                  </div>
                  <div>
                    <dt>Responsable</dt>
                    <dd>{selectedPlan.ownerName || "—"}</dd>
                  </div>
                  <div>
                    <dt>Échéance</dt>
                    <dd>{selectedPlan.dueDate || "—"}</dd>
                  </div>
                  {selectedPlan.triggerScore !== null ? (
                    <div>
                      <dt>Score déclencheur</dt>
                      <dd>{selectedPlan.triggerScore}/100</dd>
                    </div>
                  ) : null}
                </dl>
                {canEdit && selectedPlan.status !== "clos" ? (
                  <div className="sat-actions">
                    {selectedPlan.status === "ouvert" ? (
                      <button
                        type="button"
                        className="btn-admin"
                        disabled={busy}
                        onClick={() => void setPlanStatus("en_cours")}
                      >
                        Démarrer
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy}
                      onClick={() => void setPlanStatus("clos")}
                      data-testid="sat-close-plan"
                    >
                      Clôturer le plan
                    </button>
                  </div>
                ) : null}
                <h4>Historique</h4>
                <ol className="sat-history">
                  {selectedPlan.history.map((h) => (
                    <li key={h.id}>
                      <strong>{h.byName}</strong>
                      <span>{h.detail}</span>
                      <small>
                        {new Date(h.at).toLocaleString("fr-FR")}
                      </small>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </aside>
        </div>
      )}

      {scoreOpen ? (
        <AdminFormWizard
          open={scoreOpen}
          onClose={() => {
            setScoreOpen(false);
            setScoreStep("mesure");
          }}
          titleId="sat-score-title"
          eyebrow="Qualité"
          title="Nouveau score de satisfaction"
          lead="Mesure client / site — historique et dashboard."
          steps={[
            { id: "mesure", label: "Mesure", hint: "Score & période" },
            { id: "contexte", label: "Contexte", hint: "Client / site" },
            { id: "revue", label: "Revue", hint: "Contrôle" },
          ]}
          stepId={scoreStep}
          onStepChange={(id) => setScoreStep(id as typeof scoreStep)}
          canEnterStep={(id) => id === "mesure" || mesureReady}
          onStepBlocked={() => {
            setScoreShake(true);
            window.setTimeout(() => setScoreShake(false), 420);
          }}
          shake={scoreShake}
          formId="sat-score-form"
          onSubmit={(e) => void onAddScore(e)}
          submitLabel="Enregistrer"
          busy={busy}
          canSubmit={mesureReady}
        >
          {scoreStep === "mesure" ? (
            <FwPanel aria-label="Mesure">
              <FwPanelHead
                title="Score"
                description="0 à 100 — alimente le dashboard."
              />
              <FwGrid>
                <FwField label="Score /100 *">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={scoreForm.score}
                    onChange={(e) =>
                      setScoreForm((f) => ({
                        ...f,
                        score: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </FwField>
                <FwField label="Période *">
                  <input
                    type="month"
                    value={scoreForm.period}
                    onChange={(e) =>
                      setScoreForm((f) => ({
                        ...f,
                        period: e.target.value,
                      }))
                    }
                    required
                  />
                </FwField>
              </FwGrid>
              <FwBlock>
                <FwPanelHead title="Canal" />
                <FwChips>
                  {(
                    Object.keys(
                      SATISFACTION_CHANNEL_LABELS,
                    ) as SatisfactionChannel[]
                  ).map((ch) => (
                    <FwChip
                      key={ch}
                      selected={scoreForm.channel === ch}
                      title={SATISFACTION_CHANNEL_LABELS[ch]}
                      onClick={() =>
                        setScoreForm((f) => ({ ...f, channel: ch }))
                      }
                    />
                  ))}
                </FwChips>
              </FwBlock>
            </FwPanel>
          ) : null}
          {scoreStep === "contexte" ? (
            <FwPanel aria-label="Contexte">
              <FwPanelHead
                title="Client / site"
                description="Cible de la mesure."
              />
              <FwGrid>
                <FwField label="Client">
                  <select
                    value={scoreForm.clientId}
                    onChange={(e) =>
                      setScoreForm((f) => ({
                        ...f,
                        clientId: e.target.value,
                      }))
                    }
                  >
                    <option value="">— Saisie libre —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company || c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </FwField>
                <FwField label="Site">
                  <select
                    value={scoreForm.siteId}
                    onChange={(e) =>
                      setScoreForm((f) => ({
                        ...f,
                        siteId: e.target.value,
                      }))
                    }
                  >
                    <option value="">— Aucun —</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FwField>
                {!scoreForm.clientId ? (
                  <>
                    <FwField label="Nom client">
                      <input
                        value={scoreForm.clientName}
                        onChange={(e) =>
                          setScoreForm((f) => ({
                            ...f,
                            clientName: e.target.value,
                          }))
                        }
                      />
                    </FwField>
                    <FwField label="Société">
                      <input
                        value={scoreForm.company}
                        onChange={(e) =>
                          setScoreForm((f) => ({
                            ...f,
                            company: e.target.value,
                          }))
                        }
                      />
                    </FwField>
                  </>
                ) : null}
                <FwField label="Commentaire" wide>
                  <textarea
                    rows={3}
                    value={scoreForm.comment}
                    onChange={(e) =>
                      setScoreForm((f) => ({
                        ...f,
                        comment: e.target.value,
                      }))
                    }
                  />
                </FwField>
              </FwGrid>
            </FwPanel>
          ) : null}
          {scoreStep === "revue" ? (
            <FwPanel aria-label="Revue">
              <FwPanelHead
                title="Revue"
                description="Vérifiez avant enregistrement."
              />
              <FwReview>
                <FwReviewCard
                  title="Mesure"
                  rows={[
                    { label: "Score", value: `${scoreForm.score}/100` },
                    {
                      label: "Période",
                      value: formatPeriodLabel(scoreForm.period),
                    },
                    {
                      label: "Canal",
                      value: SATISFACTION_CHANNEL_LABELS[scoreForm.channel],
                    },
                  ]}
                />
                <FwReviewCard
                  title="Cible"
                  rows={[
                    {
                      label: "Client",
                      value:
                        clients.find((c) => c.id === scoreForm.clientId)
                          ?.company ||
                        scoreForm.company ||
                        scoreForm.clientName ||
                        "—",
                    },
                    {
                      label: "Site",
                      value:
                        sites.find((s) => s.id === scoreForm.siteId)?.name ||
                        "—",
                    },
                  ]}
                />
              </FwReview>
            </FwPanel>
          ) : null}
        </AdminFormWizard>
      ) : null}

      {planOpen ? (
        <AdminFormWizard
          open={planOpen}
          onClose={() => {
            setPlanOpen(false);
            setPlanStep("objectif");
          }}
          titleId="sat-plan-title"
          eyebrow="Qualité"
          title="Plan d’amélioration"
          lead="Action corrective par client / site."
          steps={[
            { id: "objectif", label: "Objectif", hint: "Titre & responsable" },
            { id: "cible", label: "Cible", hint: "Client / site" },
            { id: "revue", label: "Revue", hint: "Contrôle" },
          ]}
          stepId={planStep}
          onStepChange={(id) => setPlanStep(id as typeof planStep)}
          canEnterStep={(id) => id === "objectif" || planReady}
          onStepBlocked={() => {
            setPlanShake(true);
            window.setTimeout(() => setPlanShake(false), 420);
          }}
          shake={planShake}
          formId="sat-plan-form"
          onSubmit={(e) => void onCreatePlan(e)}
          submitLabel="Créer le plan"
          busy={busy}
          canSubmit={planReady}
        >
          {planStep === "objectif" ? (
            <FwPanel aria-label="Objectif">
              <FwPanelHead
                title="Objectif"
                description="Action corrective client."
              />
              <FwGrid>
                <FwField label="Titre *" wide>
                  <input
                    value={planForm.title}
                    onChange={(e) =>
                      setPlanForm((f) => ({ ...f, title: e.target.value }))
                    }
                    required
                  />
                </FwField>
                <FwField label="Description" wide>
                  <textarea
                    rows={4}
                    value={planForm.description}
                    onChange={(e) =>
                      setPlanForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Échéance">
                  <input
                    type="date"
                    value={planForm.dueDate}
                    onChange={(e) =>
                      setPlanForm((f) => ({
                        ...f,
                        dueDate: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Responsable">
                  <select
                    value={planForm.ownerId}
                    onChange={(e) =>
                      setPlanForm((f) => ({
                        ...f,
                        ownerId: e.target.value,
                      }))
                    }
                  >
                    {assignees.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.role})
                      </option>
                    ))}
                  </select>
                </FwField>
              </FwGrid>
            </FwPanel>
          ) : null}
          {planStep === "cible" ? (
            <FwPanel aria-label="Cible">
              <FwPanelHead title="Client / site" />
              <FwGrid>
                <FwField label="Client">
                  <select
                    value={planForm.clientId}
                    onChange={(e) =>
                      setPlanForm((f) => ({
                        ...f,
                        clientId: e.target.value,
                      }))
                    }
                  >
                    <option value="">— Saisie libre —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company || c.name}
                      </option>
                    ))}
                  </select>
                </FwField>
                <FwField label="Site">
                  <select
                    value={planForm.siteId}
                    onChange={(e) =>
                      setPlanForm((f) => ({
                        ...f,
                        siteId: e.target.value,
                      }))
                    }
                  >
                    <option value="">— Aucun —</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FwField>
                {!planForm.clientId ? (
                  <>
                    <FwField label="Nom client">
                      <input
                        value={planForm.clientName}
                        onChange={(e) =>
                          setPlanForm((f) => ({
                            ...f,
                            clientName: e.target.value,
                          }))
                        }
                      />
                    </FwField>
                    <FwField label="Société">
                      <input
                        value={planForm.company}
                        onChange={(e) =>
                          setPlanForm((f) => ({
                            ...f,
                            company: e.target.value,
                          }))
                        }
                      />
                    </FwField>
                  </>
                ) : null}
                <FwField label="Score déclencheur" wide>
                  <select
                    value={planForm.triggerScoreId}
                    onChange={(e) =>
                      setPlanForm((f) => ({
                        ...f,
                        triggerScoreId: e.target.value,
                      }))
                    }
                  >
                    <option value="">— Aucun —</option>
                    {scores.slice(0, 40).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.score}/100 · {s.clientName || s.company} ·{" "}
                        {s.period}
                      </option>
                    ))}
                  </select>
                </FwField>
              </FwGrid>
            </FwPanel>
          ) : null}
          {planStep === "revue" ? (
            <FwPanel aria-label="Revue">
              <FwPanelHead title="Revue" description="Contrôle avant création." />
              <FwReview>
                <FwReviewCard
                  title="Plan"
                  rows={[
                    { label: "Titre", value: planForm.title || "—" },
                    {
                      label: "Description",
                      value: planForm.description.trim() || "—",
                    },
                    { label: "Échéance", value: planForm.dueDate || "—" },
                  ]}
                />
                <FwReviewCard
                  title="Cible"
                  rows={[
                    {
                      label: "Client",
                      value:
                        clients.find((c) => c.id === planForm.clientId)
                          ?.company ||
                        planForm.company ||
                        planForm.clientName ||
                        "—",
                    },
                    {
                      label: "Site",
                      value:
                        sites.find((s) => s.id === planForm.siteId)?.name ||
                        "—",
                    },
                  ]}
                />
              </FwReview>
            </FwPanel>
          ) : null}
        </AdminFormWizard>
      ) : null}

      <style jsx>{`
        .sat-kpis .leads-kpi em {
          display: block;
          font-size: 0.75rem;
          font-style: normal;
          margin-top: 0.15rem;
        }
        .sat-kpis .leads-kpi em.up {
          color: #15803d;
        }
        .sat-kpis .leads-kpi em.down {
          color: #b91c1c;
        }
        .sat-site-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0.65rem;
        }
        .sat-site-list li {
          display: grid;
          grid-template-columns: 3.5rem 1fr;
          gap: 0.15rem 0.75rem;
          align-items: baseline;
        }
        .sat-site-list strong {
          font-size: 1.05rem;
        }
        .sat-site-list em {
          grid-column: 2;
          font-style: normal;
          opacity: 0.7;
          font-size: 0.8rem;
        }
        .sat-history {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0.85rem;
        }
        .sat-history li {
          display: grid;
          gap: 0.15rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
        }
        .sat-dl {
          display: grid;
          gap: 0.5rem;
          margin: 1rem 0;
        }
        .sat-dl div {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }
        .sat-dl dt {
          opacity: 0.65;
        }
        .sat-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin: 1rem 0;
        }
      `}</style>
    </div>
  );
}
