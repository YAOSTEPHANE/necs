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
import { ModuleHeader } from "@/components/admin/Ui";
import {
  AdminFormWizard,
  FwPanel,
  FwPanelHead,
  FwGrid,
  FwField,
  FwChips,
  FwChip,
  FwReview,
  FwReviewCard,
} from "@/components/admin/form-wizard";
import { IconBell, IconChart, IconClock, IconSearch } from "@/components/admin/Icons";
import {
  LOSS_REASON_OPTIONS,
  OPEN_PIPELINE_STAGES,
  OPPORTUNITY_STAGE_LABELS,
  RELANCE_CHANNEL_LABELS,
  RELANCE_CHANNELS,
  type CrmOpportunity,
  type OpportunityStage,
  type RelanceChannel,
} from "@/lib/need-qualification-shared";
import {
  PIPELINE_ALERT_LABELS,
  formatPipelineFcfa,
  type PipelineDashboard,
} from "@/lib/pipeline-shared";
import { toast } from "@/lib/toast";

function formatWhen(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dueTone(
  dueAt: string | null,
  nowMs: number,
): "ok" | "soon" | "late" | "none" {
  if (!dueAt) return "none";
  const t = new Date(dueAt).getTime();
  if (Number.isNaN(t)) return "none";
  if (t < nowMs) return "late";
  if (t - nowMs < 48 * 3600 * 1000) return "soon";
  return "ok";
}

export function PipelineWorkspace() {
  const [items, setItems] = useState<CrmOpportunity[]>([]);
  const [dashboard, setDashboard] = useState<PipelineDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [relanceOpen, setRelanceOpen] = useState(false);
  const [relanceStep, setRelanceStep] = useState<"saisie" | "revue">("saisie");
  const [shake, setShake] = useState(false);
  const [nowMs] = useState(() => Date.now());

  const [valueEstimate, setValueEstimate] = useState("");
  const [probability, setProbability] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [stage, setStage] = useState<OpportunityStage>("qualification");
  const [lossReason, setLossReason] = useState("");
  const [note, setNote] = useState("");

  const [relanceChannel, setRelanceChannel] =
    useState<RelanceChannel>("appel");
  const [relanceNote, setRelanceNote] = useState("");
  const [relanceNext, setRelanceNext] = useState("");
  const [relanceDue, setRelanceDue] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pipeline", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: CrmOpportunity[];
        dashboard?: PipelineDashboard;
        canEdit?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement pipeline");
      setItems(data.items ?? []);
      setDashboard(data.dashboard ?? null);
      setCanEdit(Boolean(data.canEdit));
      setSelectedId((prev) => prev ?? data.items?.[0]?.id ?? null);
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
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setValueEstimate(String(selected.valueEstimate || ""));
    setProbability(String(selected.probability ?? ""));
    setNextAction(selected.nextAction);
    setDueAt(toLocalInput(selected.dueAt));
    setStage(selected.stage);
    setLossReason(selected.lossReason || "");
    setNote(selected.note || "");
    setRelanceNext(selected.nextAction);
    setRelanceDue(toLocalInput(selected.dueAt));
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const alertIds = useMemo(
    () => new Set(dashboard?.alerts.map((a) => a.opportunityId) ?? []),
    [dashboard],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((o) => {
      if (filter === "open" && !OPEN_PIPELINE_STAGES.includes(o.stage)) {
        return false;
      }
      if (filter === "alerts" && !alertIds.has(o.id)) return false;
      if (filter === "relancer") {
        const tone = dueTone(o.dueAt, nowMs);
        const stalled = alertIds.has(o.id);
        if (!OPEN_PIPELINE_STAGES.includes(o.stage)) return false;
        if (tone !== "late" && tone !== "soon" && !stalled) return false;
      }
      if (
        filter !== "all" &&
        filter !== "open" &&
        filter !== "alerts" &&
        filter !== "relancer" &&
        o.stage !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        o.company.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.nextAction.toLowerCase().includes(q) ||
        o.ownerName.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter, alertIds, nowMs]);

  const toRelanceCount = useMemo(() => {
    return items.filter((o) => {
      if (!OPEN_PIPELINE_STAGES.includes(o.stage)) return false;
      const tone = dueTone(o.dueAt, nowMs);
      return tone === "late" || tone === "soon" || alertIds.has(o.id);
    }).length;
  }, [items, nowMs, alertIds]);

  const post = async (action: string, payload: Record<string, unknown>) => {
    if (busy) return null;
    if (busyLock.current) return null;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as {
        item?: CrmOpportunity;
        dashboard?: PipelineDashboard;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      if (data.item) {
        setItems((prev) => {
          const others = prev.filter((x) => x.id !== data.item!.id);
          return [data.item!, ...others];
        });
        setSelectedId(data.item.id);
      }
      if (data.dashboard) setDashboard(data.dashboard);
      toast.success("Enregistré");
      setRelanceNote("");
      setRelanceOpen(false);
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  };

  const savePipeline = () => {
    if (!selected) return;
    void post("update", {
      id: selected.id,
      valueEstimate: Number(valueEstimate) || 0,
      probability: Number(probability) || 0,
      nextAction,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      stage,
      lossReason: stage === "perdu" ? lossReason : undefined,
      note,
    });
  };

  const openRelance = () => {
    if (!selected) return;
    setRelanceChannel("appel");
    setRelanceNote("");
    setRelanceNext(selected.nextAction || "");
    setRelanceDue(toLocalInput(selected.dueAt));
    setRelanceStep("saisie");
    setRelanceOpen(true);
  };

  const submitRelance = (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    void post("relance", {
      id: selected.id,
      channel: relanceChannel,
      note: relanceNote,
      nextAction: relanceNext,
      dueAt: relanceDue ? new Date(relanceDue).toISOString() : null,
    });
  };

  const canRelance = Boolean(
    canEdit &&
      selected &&
      selected.stage !== "gagne" &&
      selected.stage !== "perdu",
  );

  const selectedDue = selected ? dueTone(selected.dueAt, nowMs) : "none";

  return (
    <div className="leads-page pipeline-page">
      <ModuleHeader
        tone="#0369a1"
        badge="Commercial"
        icon={<IconChart size={20} />}
        title="Pipeline et relances"
        meta={
          <>
            <span>
              <strong>{dashboard?.openCount ?? 0}</strong> ouvertes
            </span>
            <span>
              <strong>{toRelanceCount}</strong> à relancer
            </span>
            {dashboard ? (
              <span>
                Pondéré{" "}
                <strong>{formatPipelineFcfa(dashboard.weightedValue)}</strong>
              </span>
            ) : null}
          </>
        }
        actions={
          <div className="leads-header-actions">
            <Link
              href="/admin/commercial?tab=prospects"
              className="btn-admin btn-admin--ghost"
            >
              Prospects
            </Link>
            <Link
              href="/admin/commercial?tab=chiffrage"
              className="btn-admin btn-admin--ghost"
            >
              Chiffrage
            </Link>
            {canRelance ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={openRelance}
              >
                Relancer
              </button>
            ) : null}
          </div>
        }
      />

      {dashboard ? (
        <section className="leads-kpis" aria-label="Indicateurs pipeline">
          <article className="leads-kpi">
            <p>Pipeline brut</p>
            <strong>{formatPipelineFcfa(dashboard.totalValue)}</strong>
            <span>{dashboard.openCount} opportunités</span>
          </article>
          <article className="leads-kpi">
            <p>Pondéré</p>
            <strong>{formatPipelineFcfa(dashboard.weightedValue)}</strong>
            <span>valeur × probabilité</span>
          </article>
          <article className="leads-kpi leads-kpi--accent">
            <p>À relancer</p>
            <strong>{toRelanceCount}</strong>
            <span>
              {dashboard.overdueCount} échéance
              {dashboard.overdueCount > 1 ? "s" : ""} dépassée
              {dashboard.overdueCount > 1 ? "s" : ""}
            </span>
          </article>
          <article className="leads-kpi">
            <p>Clôturées</p>
            <strong>
              {dashboard.wonCount} / {dashboard.lostCount}
            </strong>
            <span>gagnées / perdues</span>
          </article>
        </section>
      ) : null}

      {dashboard && dashboard.alerts.length > 0 ? (
        <section className="pipeline-alerts-strip" aria-label="Alertes relance">
          <div className="pipeline-alerts-strip__head">
            <IconBell size={16} />
            <strong>
              {dashboard.alerts.length} alerte
              {dashboard.alerts.length > 1 ? "s" : ""}
            </strong>
            <button
              type="button"
              className="leads-chip"
              onClick={() => setFilter("relancer")}
            >
              Voir à relancer
            </button>
          </div>
          <ul>
            {dashboard.alerts.slice(0, 4).map((a, idx) => (
              <li key={`${a.opportunityId}-${a.kind}-${idx}`}>
                <button
                  type="button"
                  className={`pipeline-alert-chip pipeline-alert-chip--${a.severity}`}
                  onClick={() => {
                    setSelectedId(a.opportunityId);
                    setFilter("alerts");
                  }}
                >
                  <em>{PIPELINE_ALERT_LABELS[a.kind]}</em>
                  <span>
                    {a.company} — {a.message}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {loading ? (
        <div className="leads-empty">
          <span className="leads-empty__orb" aria-hidden />
          <p className="leads-empty__eyebrow">Pipeline</p>
          <h2>Chargement…</h2>
        </div>
      ) : (
        <>
          <div className="leads-toolbar pipeline-toolbar">
            <label className="leads-search">
              <IconSearch />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Société, action, propriétaire…"
              />
            </label>
            <div className="leads-filters" role="tablist" aria-label="Filtres">
              {(
                [
                  ["open", "Ouvertes", dashboard?.openCount ?? 0],
                  ["relancer", "À relancer", toRelanceCount],
                  ["alerts", "Alertes", dashboard?.alerts.length ?? 0],
                  ["all", "Toutes", items.length],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={filter === id}
                  className={`leads-chip${filter === id ? " is-active" : ""}`}
                  onClick={() => setFilter(id)}
                >
                  {label}
                  <em>{count}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="pipeline-stage-row" aria-label="Étapes">
            {(dashboard?.byStage ?? [])
              .filter((s) =>
                ["qualification", "etude", "proposition", "negociation"].includes(
                  s.stage,
                ),
              )
              .map((s) => (
                <button
                  key={s.stage}
                  type="button"
                  className={`pipeline-stage-pill${filter === s.stage ? " is-active" : ""}`}
                  onClick={() => setFilter(s.stage)}
                >
                  <span>{s.label}</span>
                  <strong>{s.count}</strong>
                </button>
              ))}
          </div>

          <div className="leads-shell">
            <div
              className="leads-inbox"
              role="listbox"
              aria-label="Opportunités"
            >
              {filtered.map((o) => {
                const tone = dueTone(o.dueAt, nowMs);
                const last = o.relances[0];
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="option"
                    aria-selected={o.id === selectedId}
                    className={`leads-card pipeline-card${o.id === selectedId ? " is-active" : ""}${tone === "late" ? " is-late" : ""}`}
                    onClick={() => setSelectedId(o.id)}
                  >
                    <span className="leads-card__body">
                      <span className="leads-card__top">
                        <strong>{o.company}</strong>
                        <time>{formatPipelineFcfa(o.valueEstimate)}</time>
                      </span>
                      <span className="leads-card__mid">
                        <span
                          className={`pipeline-stage pipeline-stage--${o.stage}`}
                        >
                          {OPPORTUNITY_STAGE_LABELS[o.stage]}
                        </span>
                        <span className="pipeline-card__prob">
                          {o.probability}%
                        </span>
                        {tone === "late" ? (
                          <span className="pipeline-due-badge is-late">
                            En retard
                          </span>
                        ) : tone === "soon" ? (
                          <span className="pipeline-due-badge is-soon">
                            Sous 48 h
                          </span>
                        ) : null}
                      </span>
                      <span className="leads-card__preview">
                        {o.nextAction || "Sans prochaine action"}
                        {o.dueAt ? ` · ${formatDay(o.dueAt)}` : ""}
                      </span>
                      <span className="pipeline-card__touch">
                        {last
                          ? `Dernière : ${RELANCE_CHANNEL_LABELS[last.channel]} · ${formatDay(last.at)}`
                          : o.lastRelanceAt
                            ? `Dernier contact ${formatDay(o.lastRelanceAt)}`
                            : "Jamais relancée"}
                      </span>
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <div className="leads-empty pipeline-inbox-empty">
                  <span className="leads-empty__orb" aria-hidden />
                  <p className="leads-empty__eyebrow">Aucune opportunité</p>
                  <h2>Rien à afficher</h2>
                  <p>
                    Qualifiez un besoin prospect pour ouvrir une affaire dans le
                    pipeline.
                  </p>
                  <Link
                    href="/admin/commercial?tab=prospects"
                    className="btn-admin btn-admin--primary"
                  >
                    Aller aux prospects
                  </Link>
                </div>
              ) : null}
            </div>

            <article className="leads-detail pipeline-detail">
              {!selected ? (
                <div className="leads-empty-detail pipeline-empty-detail">
                  <p className="leads-empty__eyebrow">Détail</p>
                  <h2>Sélectionnez une opportunité</h2>
                  <p>
                    Suivi commercial, échéances et historique de relances
                    s’affichent ici.
                  </p>
                </div>
              ) : (
                <>
                  <header className="leads-detail__head">
                    <div>
                      <p className="leads-detail__eyebrow">
                        {selected.id} · {selected.ownerName || "Sans owner"}
                      </p>
                      <h2>{selected.company}</h2>
                      <p className="leads-detail__sub">
                        {selected.title || "Opportunité"}
                        {" · "}
                        <Link href="/admin/commercial?tab=qualification">
                          Besoin
                        </Link>
                        {" · "}
                        <Link href="/admin/commercial?tab=chiffrage">
                          Chiffrage
                        </Link>
                      </p>
                    </div>
                    <div className="leads-detail__actions pipeline-detail__aside">
                      <span
                        className={`pipeline-stage pipeline-stage--${selected.stage}`}
                      >
                        {OPPORTUNITY_STAGE_LABELS[selected.stage]}
                      </span>
                      {canRelance ? (
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          onClick={openRelance}
                        >
                          Relancer
                        </button>
                      ) : null}
                    </div>
                  </header>

                  <section
                    className="pipeline-next-card"
                    data-tone={selectedDue}
                  >
                    <div className="pipeline-next-card__main">
                      <p className="pipeline-next-card__label">
                        <IconClock size={14} /> Prochaine action
                      </p>
                      <strong>
                        {selected.nextAction ||
                          "À définir lors de la relance"}
                      </strong>
                      <p>
                        Échéance :{" "}
                        <em data-tone={selectedDue}>
                          {selected.dueAt
                            ? formatWhen(selected.dueAt)
                            : "non planifiée"}
                        </em>
                      </p>
                    </div>
                    <div className="pipeline-next-card__meta">
                      <span>
                        {selected.relances.length} relance
                        {selected.relances.length > 1 ? "s" : ""}
                      </span>
                      <span>
                        Dernière :{" "}
                        {selected.lastRelanceAt
                          ? formatDay(selected.lastRelanceAt)
                          : "—"}
                      </span>
                      <span>
                        {formatPipelineFcfa(selected.valueEstimate)} ·{" "}
                        {selected.probability}%
                      </span>
                    </div>
                  </section>

                  {canRelance ? (
                    <section className="pipeline-relance-cta">
                      <div>
                        <h3>Relance commerciale</h3>
                        <p>
                          Enregistrez un contact (appel, e-mail, WhatsApp…) et
                          planifiez la suite.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        onClick={openRelance}
                      >
                        Nouvelle relance
                      </button>
                    </section>
                  ) : null}

                  <section className="pipeline-panel pipeline-relance-hist">
                    <h3>Timeline des relances</h3>
                    {selected.relances.length === 0 ? (
                      <div className="pipeline-relance-empty">
                        <p>Aucune relance enregistrée pour cette affaire.</p>
                        {canRelance ? (
                          <button
                            type="button"
                            className="btn-admin btn-admin--ghost"
                            onClick={openRelance}
                          >
                            Faire la première relance
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <ol className="pipeline-timeline">
                        {selected.relances.slice(0, 16).map((r) => (
                          <li key={r.id}>
                            <span
                              className={`pipeline-channel pipeline-channel--${r.channel}`}
                            >
                              {RELANCE_CHANNEL_LABELS[r.channel]}
                            </span>
                            <div className="pipeline-timeline__body">
                              <strong>{formatWhen(r.at)}</strong>
                              <p>
                                {r.byName} — {r.note}
                              </p>
                              {r.nextAction ? (
                                <em>Suite : {r.nextAction}</em>
                              ) : null}
                              {r.dueAt ? (
                                <em>
                                  Échéance posée : {formatWhen(r.dueAt)}
                                </em>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <section className="pipeline-panel pipeline-fields">
                    <h3>Suivi commercial</h3>
                    <div className="need-qual__grid">
                      <label>
                        Valeur estimée (FCFA)
                        <input
                          type="number"
                          min={0}
                          disabled={!canEdit}
                          value={valueEstimate}
                          onChange={(e) => setValueEstimate(e.target.value)}
                        />
                      </label>
                      <label>
                        Probabilité (%)
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={!canEdit}
                          value={probability}
                          onChange={(e) => setProbability(e.target.value)}
                        />
                      </label>
                      <label>
                        Étape
                        <select
                          disabled={!canEdit}
                          value={stage}
                          onChange={(e) =>
                            setStage(e.target.value as OpportunityStage)
                          }
                        >
                          {Object.entries(OPPORTUNITY_STAGE_LABELS).map(
                            ([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        Échéance
                        <input
                          type="datetime-local"
                          disabled={!canEdit}
                          value={dueAt}
                          onChange={(e) => setDueAt(e.target.value)}
                        />
                      </label>
                      <label className="need-qual__full">
                        Prochaine action
                        <input
                          disabled={!canEdit}
                          value={nextAction}
                          onChange={(e) => setNextAction(e.target.value)}
                          placeholder="Ex. Relance devis J+3"
                        />
                      </label>
                      {stage === "perdu" ? (
                        <label className="need-qual__full">
                          Motif de perte *
                          <select
                            disabled={!canEdit}
                            value={
                              LOSS_REASON_OPTIONS.includes(
                                lossReason as (typeof LOSS_REASON_OPTIONS)[number],
                              )
                                ? lossReason
                                : lossReason
                                  ? "Autre"
                                  : ""
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "Autre") {
                                setLossReason(
                                  lossReason &&
                                    !LOSS_REASON_OPTIONS.includes(
                                      lossReason as (typeof LOSS_REASON_OPTIONS)[number],
                                    )
                                    ? lossReason
                                    : "",
                                );
                              } else {
                                setLossReason(v);
                              }
                            }}
                          >
                            <option value="">— Choisir —</option>
                            {LOSS_REASON_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          {(lossReason === "" ||
                            lossReason === "Autre" ||
                            !LOSS_REASON_OPTIONS.includes(
                              lossReason as (typeof LOSS_REASON_OPTIONS)[number],
                            )) && (
                            <input
                              className="pipeline-loss-custom"
                              disabled={!canEdit}
                              placeholder="Préciser le motif"
                              value={
                                LOSS_REASON_OPTIONS.includes(
                                  lossReason as (typeof LOSS_REASON_OPTIONS)[number],
                                ) && lossReason !== "Autre"
                                  ? ""
                                  : lossReason === "Autre"
                                    ? ""
                                    : lossReason
                              }
                              onChange={(e) => setLossReason(e.target.value)}
                            />
                          )}
                        </label>
                      ) : null}
                      <label className="need-qual__full">
                        Note
                        <textarea
                          rows={2}
                          disabled={!canEdit}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </label>
                    </div>
                    {canEdit ? (
                      <div className="quotes-actions">
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          disabled={busy}
                          onClick={savePipeline}
                        >
                          Enregistrer le suivi
                        </button>
                        {selected.stage !== "gagne" &&
                          selected.stage !== "perdu" && (
                            <>
                              <button
                                type="button"
                                className="btn-admin btn-admin--ghost"
                                disabled={busy}
                                onClick={() =>
                                  void post("win", { id: selected.id })
                                }
                              >
                                Marquer gagnée
                              </button>
                              <button
                                type="button"
                                className="btn-admin btn-admin--ghost"
                                disabled={busy || !lossReason.trim()}
                                onClick={() =>
                                  void post("lose", {
                                    id: selected.id,
                                    lossReason,
                                  })
                                }
                              >
                                Classer perdue
                              </button>
                            </>
                          )}
                        {selected.stage === "gagne" ? (
                          <Link
                            className="btn-admin btn-admin--primary"
                            href={`/admin/contrats?opportunityId=${encodeURIComponent(selected.id)}`}
                          >
                            Créer le contrat
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                    {selected.lossReason ? (
                      <p className="pipeline-loss-banner">
                        Motif de perte : {selected.lossReason}
                        {selected.lostAt
                          ? ` · ${formatWhen(selected.lostAt)}`
                          : ""}
                      </p>
                    ) : null}
                  </section>

                  <section className="pipeline-panel need-qual__history">
                    <h3>Journal</h3>
                    <ol>
                      {selected.history.slice(0, 12).map((h) => (
                        <li key={h.id}>
                          <time>{formatWhen(h.at)}</time>
                          <span>
                            {h.byName} — {h.detail}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </section>
                </>
              )}
            </article>
          </div>
        </>
      )}

      {relanceOpen && selected && canRelance ? (
        <AdminFormWizard
          open={relanceOpen}
          onClose={() => setRelanceOpen(false)}
          titleId="pipeline-relance-title"
          eyebrow="Relance"
          title={selected.company}
          lead={`${OPPORTUNITY_STAGE_LABELS[selected.stage]} · ${formatPipelineFcfa(selected.valueEstimate)}`}
          steps={[
            { id: "saisie", label: "Relance", hint: "Canal & compte-rendu" },
            { id: "revue", label: "Revue", hint: "Contrôle avant envoi" },
          ]}
          stepId={relanceStep}
          onStepChange={(id) => setRelanceStep(id as "saisie" | "revue")}
          canEnterStep={(id) =>
            id === "saisie" || Boolean(relanceNote.trim())
          }
          onStepBlocked={() => {
            setShake(true);
            window.setTimeout(() => setShake(false), 420);
          }}
          shake={shake}
          formId="pipeline-relance-form"
          onSubmit={submitRelance}
          submitLabel="Enregistrer la relance"
          busy={busy}
          canSubmit={Boolean(relanceNote.trim())}
          footMeta={<span>Horodaté dans la timeline</span>}
          narrow
        >
          {relanceStep === "saisie" ? (
            <FwPanel aria-label="Relance">
              <FwPanelHead
                title="Canal & compte-rendu"
                description="Ce qui a été dit, décision, objection."
              />
              <FwChips>
                {RELANCE_CHANNELS.map((c) => (
                  <FwChip
                    key={c}
                    selected={relanceChannel === c}
                    title={RELANCE_CHANNEL_LABELS[c]}
                    onClick={() => setRelanceChannel(c)}
                  />
                ))}
              </FwChips>
              <FwGrid>
                <FwField label="Compte-rendu *" wide>
                  <textarea
                    required
                    rows={3}
                    value={relanceNote}
                    onChange={(e) => setRelanceNote(e.target.value)}
                    placeholder="Ce qui a été dit, décision, objection…"
                    autoFocus
                  />
                </FwField>
                <FwField label="Prochaine action">
                  <input
                    value={relanceNext}
                    onChange={(e) => setRelanceNext(e.target.value)}
                    placeholder="Ex. Envoyer devis révisé"
                  />
                </FwField>
                <FwField label="Nouvelle échéance">
                  <input
                    type="datetime-local"
                    value={relanceDue}
                    onChange={(e) => setRelanceDue(e.target.value)}
                  />
                </FwField>
              </FwGrid>
            </FwPanel>
          ) : null}
          {relanceStep === "revue" ? (
            <FwPanel aria-label="Revue">
              <FwPanelHead
                title="Revue"
                description="Contrôle avant enregistrement."
              />
              <FwReview>
                <FwReviewCard
                  title="Relance"
                  rows={[
                    {
                      label: "Canal",
                      value: RELANCE_CHANNEL_LABELS[relanceChannel],
                    },
                    { label: "Compte-rendu", value: relanceNote.trim() || "—" },
                    {
                      label: "Prochaine action",
                      value: relanceNext.trim() || "—",
                    },
                    { label: "Échéance", value: relanceDue || "—" },
                  ]}
                />
              </FwReview>
            </FwPanel>
          ) : null}
        </AdminFormWizard>
      ) : null}
    </div>
  );
}
