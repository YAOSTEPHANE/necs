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
import { useSearchParams, useRouter } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import {
  AdminFormWizard,
  FwPanel,
  FwPanelHead,
  FwGrid,
  FwField,
  FwReview,
  FwReviewCard,
  FwWarn,
} from "@/components/admin/form-wizard";
import { IconCalendar, IconSearch } from "@/components/admin/Icons";
import type { OpsSite } from "@/lib/ops-referential-shared";
import {
  PLANNING_ALERT_LABELS,
  type PlanningAlertKind,
  type PlanningSlot,
} from "@/lib/ops-planning-shared";
import { toast } from "@/lib/toast";
import { safeRouterPush } from "@/lib/safe-navigate";

type ComposerStep = "creneau" | "revue";

type Agent = { id: string; name: string; email: string; role: string };

type Propagation = {
  ok: boolean;
  checks: Array<{ key: string; ok: boolean; detail: string }>;
};

function formatWhen(ts: string) {
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

function shiftWeek(isoFrom: string, deltaDays: number) {
  const d = new Date(`${isoFrom}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoFrom;
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function OpsPlanningWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const siteFromUrl = searchParams.get("siteId") || "";

  const [slots, setSlots] = useState<PlanningSlot[]>([]);
  const [sites, setSites] = useState<OpsSite[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [query, setQuery] = useState("");
  const [alertFilter, setAlertFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<ComposerStep>("creneau");
  const [composerShake, setComposerShake] = useState(false);
  const [propagation, setPropagation] = useState<Propagation | null>(null);
  const [stats, setStats] = useState({
    conflictCount: 0,
    understaffedCount: 0,
    absenceCount: 0,
  });

  const [form, setForm] = useState({
    date: "",
    startTime: "08:00",
    endTime: "12:00",
    siteId: "",
    prestationId: "",
    requiredStaff: "2",
    agentIds: [] as string[],
  });
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStaff, setEditStaff] = useState("");
  const [assignAgentId, setAssignAgentId] = useState("");
  const [replaceFor, setReplaceFor] = useState("");
  const [replaceAgentId, setReplaceAgentId] = useState("");

  const refresh = useCallback(async (range?: { from: string; to: string }) => {
    setLoading(true);
    try {
      const qs = range
        ? `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
        : "";
      const res = await fetch(`/api/ops-planning${qs}`, { cache: "no-store" });
      const data = (await res.json()) as {
        slots?: PlanningSlot[];
        sites?: OpsSite[];
        agents?: Agent[];
        from?: string;
        to?: string;
        canEdit?: boolean;
        conflictCount?: number;
        understaffedCount?: number;
        absenceCount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement");
      setSlots(data.slots ?? []);
      setSites(data.sites ?? []);
      setAgents(data.agents ?? []);
      setFrom(data.from ?? "");
      setTo(data.to ?? "");
      setCanEdit(Boolean(data.canEdit));
      setStats({
        conflictCount: data.conflictCount ?? 0,
        understaffedCount: data.understaffedCount ?? 0,
        absenceCount: data.absenceCount ?? 0,
      });
      setSelectedId((prev) => {
        if (prev && data.slots?.some((s) => s.id === prev)) return prev;
        return data.slots?.[0]?.id ?? null;
      });
      setForm((f) => ({
        ...f,
        date: f.date || data.from || new Date().toISOString().slice(0, 10),
        siteId:
          f.siteId ||
          siteFromUrl ||
          data.sites?.[0]?.id ||
          "",
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [siteFromUrl]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = useMemo(
    () => slots.find((s) => s.id === selectedId) ?? null,
    [slots, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setEditDate(selected.date);
    setEditStart(selected.startTime);
    setEditEnd(selected.endTime);
    setEditStaff(String(selected.requiredStaff));
    setPropagation(null);
    setReplaceFor("");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const formSite = sites.find((s) => s.id === form.siteId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return slots.filter((s) => {
      if (siteFromUrl && s.siteId !== siteFromUrl) return false;
      if (alertFilter === "conflit" && !s.alerts.includes("conflit")) {
        return false;
      }
      if (
        alertFilter === "sous_effectif" &&
        !s.alerts.includes("sous_effectif")
      ) {
        return false;
      }
      if (alertFilter === "absence" && !s.alerts.includes("absence")) {
        return false;
      }
      if (!q) return true;
      return (
        s.siteName.toLowerCase().includes(q) ||
        s.clientName.toLowerCase().includes(q) ||
        s.prestationLabel.toLowerCase().includes(q) ||
        s.assignments.some((a) => a.agentName.toLowerCase().includes(q))
      );
    });
  }, [slots, query, alertFilter, siteFromUrl]);

  const days = useMemo(() => {
    if (!from || !to) return [] as string[];
    const list: string[] = [];
    const cur = new Date(`${from}T12:00:00`);
    const end = new Date(`${to}T12:00:00`);
    while (cur <= end) {
      list.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return list;
  }, [from, to]);

  const post = async (action: string, payload: Record<string, unknown>) => {
    if (busy) return null;
    if (busyLock.current) return null;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/ops-planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as {
        slot?: PlanningSlot;
        propagation?: Propagation;
        conflict?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      if (data.propagation) setPropagation(data.propagation);
      if (data.slot) {
        setSelectedId(data.slot.id);
        await refresh({ from, to });
        setSelectedId(data.slot.id);
      } else if (action === "delete") {
        setSelectedId(null);
        setPropagation(null);
        await refresh({ from, to });
      }
      if (action === "assign" && data.conflict) {
        toast.error("Affecté avec conflit horaire — voir alertes");
      } else if (action === "update" && data.propagation?.ok) {
        toast.success("Planning modifié · affectations répercutées");
      } else {
        toast.success("Enregistré");
      }
      setComposerOpen(false);
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  };

  const goWeek = (delta: number) => {
    if (!from) return;
    const nextFrom = shiftWeek(from, delta);
    void refresh({ from: nextFrom, to: shiftWeek(nextFrom, 6) });
  };

  const activeOnSlot = selected
    ? selected.assignments.filter((a) => a.status === "planifie").length
    : 0;

  return (
    <div className="leads-page ops-plan-page">
      <ModuleHeader
        tone="#1570b8"
        badge="Opérations"
        icon={<IconCalendar size={20} />}
        title="Planification"
        meta={
          <>
            <span>Créneaux · affectations · conflits / absences</span>
            <span>
              Semaine {from || "—"} → {to || "—"}
            </span>
          </>
        }
        actions={
          <div className="leads-header-actions">
            <Link
              href="/admin/operations?tab=referentiel"
              className="btn-admin btn-admin--ghost"
            >
              Référentiel
            </Link>
            <Link
              href="/admin/operations?tab=missions"
              className="btn-admin btn-admin--ghost"
            >
              OT
            </Link>
            {canEdit ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => {
                  setForm((f) => ({
                    ...f,
                    date: from || new Date().toISOString().slice(0, 10),
                    siteId: siteFromUrl || f.siteId || sites[0]?.id || "",
                    prestationId: "",
                    agentIds: [],
                  }));
                  setComposerStep("creneau");
                  setComposerShake(false);
                  setComposerOpen(true);
                }}
              >
                Nouveau créneau
              </button>
            ) : null}
          </div>
        }
      />

      <section className="leads-kpis" aria-label="Indicateurs semaine">
        <article className="leads-kpi leads-kpi--accent">
          <p>Créneaux</p>
          <strong>{slots.length}</strong>
          <span>
            {from || "—"} → {to || "—"}
          </span>
        </article>
        <article className="leads-kpi">
          <p>Conflits</p>
          <strong className={stats.conflictCount ? "is-warn" : undefined}>
            {stats.conflictCount}
          </strong>
          <span>Double affectation</span>
        </article>
        <article className="leads-kpi">
          <p>Sous-effectif</p>
          <strong className={stats.understaffedCount ? "is-warn" : undefined}>
            {stats.understaffedCount}
          </strong>
          <span>Effectif &lt; requis</span>
        </article>
        <article className="leads-kpi">
          <p>Absences</p>
          <strong className={stats.absenceCount ? "is-warn" : undefined}>
            {stats.absenceCount}
          </strong>
          <span>Sans remplacement</span>
        </article>
      </section>

      <div className="ops-plan-weekbar">
        <button
          type="button"
          className="btn-admin btn-admin--ghost"
          onClick={() => goWeek(-7)}
          disabled={!from || loading}
        >
          ← Semaine
        </button>
        <strong>
          {from && to
            ? `${formatDayLabel(from)} → ${formatDayLabel(to)}`
            : "Semaine en cours"}
        </strong>
        <button
          type="button"
          className="btn-admin btn-admin--ghost"
          onClick={() => goWeek(7)}
          disabled={!from || loading}
        >
          Semaine →
        </button>
        <button
          type="button"
          className="btn-admin btn-admin--ghost"
          onClick={() => void refresh()}
          disabled={loading}
        >
          Aujourd’hui
        </button>
      </div>

      {days.length > 0 ? (
        <div className="ops-plan-daystrip" aria-label="Jours de la semaine">
          {days.map((day) => {
            const count = slots.filter((s) => s.date === day).length;
            const alerts = slots
              .filter((s) => s.date === day)
              .reduce((n, s) => n + s.alerts.length, 0);
            return (
              <button
                key={day}
                type="button"
                className={`ops-plan-daypill${alerts ? " has-alert" : ""}`}
                onClick={() => {
                  const first = slots.find((s) => s.date === day);
                  if (first) setSelectedId(first.id);
                }}
              >
                <em>{formatDayLabel(day)}</em>
                <strong>{count}</strong>
                {alerts > 0 ? <span>{alerts} alerte(s)</span> : <span>OK</span>}
              </button>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <div className="leads-empty">
          <span className="leads-empty__orb" aria-hidden />
          <p className="leads-empty__eyebrow">Planification</p>
          <h2>Chargement…</h2>
        </div>
      ) : (
        <>
          <div className="leads-toolbar">
            <label className="leads-search">
              <IconSearch />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Site, agent, prestation…"
              />
            </label>
            <div className="leads-filters" role="tablist" aria-label="Alertes">
              {(
                [
                  ["all", "Tous", slots.length],
                  ["conflit", "Conflits", stats.conflictCount],
                  ["sous_effectif", "Sous-effectif", stats.understaffedCount],
                  ["absence", "Absences", stats.absenceCount],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={alertFilter === id}
                  className={`leads-chip${alertFilter === id ? " is-active" : ""}`}
                  onClick={() => setAlertFilter(id)}
                >
                  {label}
                  <em>{count}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="leads-shell">
            <div className="leads-inbox" role="listbox" aria-label="Créneaux">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={s.id === selectedId}
                  className={`leads-card${s.id === selectedId ? " is-active" : ""}${s.alerts.length ? " ops-plan-card--alert" : ""}`}
                  onClick={() => setSelectedId(s.id)}
                >
                  <span className="leads-card__body">
                    <span className="leads-card__top">
                      <strong>
                        {s.date} · {s.startTime}–{s.endTime}
                      </strong>
                      <time>
                        {
                          s.assignments.filter((a) => a.status === "planifie")
                            .length
                        }
                        /{s.requiredStaff}
                      </time>
                    </span>
                    <span className="leads-card__mid">
                      {s.alerts.map((a) => (
                        <span
                          key={a}
                          className={`ops-plan-alert-badge ops-plan-alert-badge--${a}`}
                        >
                          {PLANNING_ALERT_LABELS[a as PlanningAlertKind]}
                        </span>
                      ))}
                    </span>
                    <span className="leads-card__preview">
                      {s.siteName} · {s.prestationLabel}
                      {s.assignments.filter((a) => a.status === "planifie")
                        .length
                        ? ` · ${s.assignments
                            .filter((a) => a.status === "planifie")
                            .map((a) => a.agentName)
                            .slice(0, 2)
                            .join(", ")}`
                        : " · sans agent"}
                    </span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 ? (
                <div className="leads-empty">
                  <span className="leads-empty__orb" aria-hidden />
                  <p className="leads-empty__eyebrow">Créneaux</p>
                  <h2>Aucun créneau</h2>
                  <p>
                    Créez un créneau depuis un site actif du{" "}
                    <Link href="/admin/operations?tab=referentiel">référentiel OPS</Link>.
                  </p>
                </div>
              ) : null}
            </div>

            <article className="leads-detail ops-plan-detail">
              {!selected ? (
                <div className="leads-empty-detail">
                  <p className="leads-empty__eyebrow">Détail</p>
                  <h2>Sélectionnez un créneau</h2>
                  <p>
                    Horaires, affectations, absences et remplacements
                    s’affichent ici.
                  </p>
                </div>
              ) : (
                <>
                  <header className="leads-detail__head">
                    <div>
                      <p className="leads-detail__eyebrow">
                        {selected.id} · {selected.clientName}
                      </p>
                      <h2>
                        {selected.prestationLabel} @ {selected.siteName}
                      </h2>
                      <p className="leads-detail__sub">
                        {selected.date} · {selected.startTime}–
                        {selected.endTime} · {activeOnSlot}/
                        {selected.requiredStaff} agents
                        {" · "}
                        <Link
                          href={`/admin/operations?tab=referentiel&siteId=${encodeURIComponent(selected.siteId)}`}
                        >
                          Fiche site
                        </Link>
                      </p>
                    </div>
                    <div className="leads-detail__actions">
                      {canEdit ? (
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          disabled={busy}
                          onClick={() => {
                            void (async () => {
                              if (busy || busyLock.current) return;
                              busyLock.current = true;
                              setBusy(true);
                              try {
                                const res = await fetch("/api/work-orders", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    action: "create_from_planning",
                                    planningSlotId: selected.id,
                                  }),
                                });
                                const data = (await res.json()) as {
                                  order?: { id: string; ref: string };
                                  error?: string;
                                };
                                if (!res.ok) {
                                  throw new Error(data.error || "Échec OT");
                                }
                                toast.success(
                                  `OT ${data.order?.ref ?? ""} créé`,
                                );
                                safeRouterPush(router, "/admin/operations?tab=missions");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Erreur",
                                );
                              } finally {
                                busyLock.current = false;
                                setBusy(false);
                              }
                            })();
                          }}
                        >
                          Créer OT
                        </button>
                      ) : null}
                    </div>
                  </header>

                  {selected.alerts.length > 0 ? (
                    <div className="ops-plan-alerts-panel">
                      <strong>Alertes opérationnelles</strong>
                      <ul>
                        {selected.alerts.map((a) => (
                          <li
                            key={a}
                            className={`ops-plan-alert-badge ops-plan-alert-badge--${a}`}
                          >
                            {PLANNING_ALERT_LABELS[a]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="contracts-resaisie is-ok">
                      <strong>Créneau sain</strong>
                      <p className="contracts-source">
                        Pas de conflit, effectif couvert, aucune absence ouverte.
                      </p>
                    </div>
                  )}

                  {propagation ? (
                    <div
                      className={
                        propagation.ok
                          ? "contracts-resaisie is-ok"
                          : "contracts-resaisie is-warn"
                      }
                    >
                      <strong>
                        {propagation.ok
                          ? "Modification répercutée aux affectations"
                          : "Répercussion incomplète"}
                      </strong>
                      <ul>
                        {propagation.checks.map((c) => (
                          <li key={c.key}>
                            {c.ok ? "✓" : "✗"} {c.detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {canEdit ? (
                    <section className="contracts-section">
                      <h3>Modifier le créneau</h3>
                      <p className="ops-plan-hint">
                        Les agents affectés suivent automatiquement le nouveau
                        créneau planifié.
                      </p>
                      <div className="need-qual__grid">
                        <label>
                          Date
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                        </label>
                        <label>
                          Début
                          <input
                            type="time"
                            value={editStart}
                            onChange={(e) => setEditStart(e.target.value)}
                          />
                        </label>
                        <label>
                          Fin
                          <input
                            type="time"
                            value={editEnd}
                            onChange={(e) => setEditEnd(e.target.value)}
                          />
                        </label>
                        <label>
                          Effectif requis
                          <input
                            type="number"
                            min={1}
                            value={editStaff}
                            onChange={(e) => setEditStaff(e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="quotes-actions">
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          disabled={busy}
                          onClick={() =>
                            void post("update", {
                              id: selected.id,
                              date: editDate,
                              startTime: editStart,
                              endTime: editEnd,
                              requiredStaff: Number(editStaff) || 1,
                            })
                          }
                        >
                          Enregistrer (répercuter)
                        </button>
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void post("delete", { id: selected.id })
                          }
                        >
                          Supprimer
                        </button>
                      </div>
                    </section>
                  ) : null}

                  <section className="contracts-section">
                    <h3>
                      Affectations ({activeOnSlot}/{selected.requiredStaff})
                    </h3>
                    <ul className="contracts-sites ops-plan-assignments">
                      {selected.assignments.map((a) => (
                        <li key={a.id}>
                          <div className="ops-plan-asg__head">
                            <strong>
                              {a.agentName}
                              <span
                                className={`ops-plan-asg-status ops-plan-asg-status--${a.status}`}
                              >
                                {a.role} · {a.status}
                              </span>
                            </strong>
                          </div>
                          <span>{a.agentEmail}</span>
                          {a.note ? <em>{a.note}</em> : null}
                          {canEdit && a.status === "planifie" ? (
                            <div className="quotes-actions">
                              <button
                                type="button"
                                className="btn-admin btn-admin--ghost"
                                disabled={busy}
                                onClick={() =>
                                  void post("absent", {
                                    id: selected.id,
                                    assignmentId: a.id,
                                  })
                                }
                              >
                                Absence
                              </button>
                              <button
                                type="button"
                                className="btn-admin btn-admin--ghost"
                                disabled={busy}
                                onClick={() => {
                                  setReplaceFor(a.id);
                                  setReplaceAgentId("");
                                }}
                              >
                                Remplacer
                              </button>
                              <button
                                type="button"
                                className="btn-admin btn-admin--ghost"
                                disabled={busy}
                                onClick={() =>
                                  void post("unassign", {
                                    id: selected.id,
                                    assignmentId: a.id,
                                  })
                                }
                              >
                                Retirer
                              </button>
                            </div>
                          ) : null}
                        </li>
                      ))}
                      {selected.assignments.length === 0 ? (
                        <li>
                          <em>Aucune affectation — sous-effectif.</em>
                        </li>
                      ) : null}
                    </ul>

                    {canEdit ? (
                      <div className="ops-ref-add-presta">
                        <select
                          value={assignAgentId}
                          onChange={(e) => setAssignAgentId(e.target.value)}
                          aria-label="Agent à affecter"
                        >
                          <option value="">— Agent —</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy || !assignAgentId}
                          onClick={() =>
                            void post("assign", {
                              id: selected.id,
                              agentUserId: assignAgentId,
                            }).then(() => setAssignAgentId(""))
                          }
                        >
                          Affecter
                        </button>
                      </div>
                    ) : null}

                    {replaceFor ? (
                      <div className="ops-plan-replace">
                        <p>Remplacement pour l’affectation absente / planifiée</p>
                        <div className="ops-ref-add-presta">
                          <select
                            value={replaceAgentId}
                            onChange={(e) =>
                              setReplaceAgentId(e.target.value)
                            }
                          >
                            <option value="">— Remplaçant —</option>
                            {agents.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn-admin btn-admin--primary"
                            disabled={busy || !replaceAgentId}
                            onClick={() =>
                              void post("replace", {
                                id: selected.id,
                                assignmentId: replaceFor,
                                replacementUserId: replaceAgentId,
                              }).then(() => {
                                setReplaceFor("");
                                setReplaceAgentId("");
                              })
                            }
                          >
                            Confirmer remplacement
                          </button>
                          <button
                            type="button"
                            className="btn-admin btn-admin--ghost"
                            onClick={() => setReplaceFor("")}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className="need-qual__history">
                    <h3>Journal</h3>
                    <ol>
                      {selected.history.slice(0, 14).map((h) => (
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

      {composerOpen ? (
        <AdminFormWizard
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          titleId="ops-plan-create-title"
          eyebrow="Créneau"
          title="Nouveau créneau"
          lead="Site actif + prestation → affectation agents"
          steps={[
            { id: "creneau", label: "Créneau", hint: "Horaire & site" },
            { id: "revue", label: "Revue", hint: "Contrôle avant création" },
          ]}
          stepId={composerStep}
          onStepChange={(id) => setComposerStep(id as ComposerStep)}
          canEnterStep={(id) => {
            if (id === "creneau") return true;
            return Boolean(
              form.date &&
                form.startTime &&
                form.endTime &&
                form.siteId &&
                form.prestationId &&
                sites.length > 0,
            );
          }}
          onStepBlocked={() => {
            setComposerShake(true);
            window.setTimeout(() => setComposerShake(false), 420);
          }}
          shake={composerShake}
          formId="ops-plan-create-form"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void post("create", {
              ...form,
              requiredStaff: Number(form.requiredStaff) || 1,
            });
          }}
          submitLabel="Créer le créneau"
          busy={busy}
          canSubmit={
            sites.length > 0 &&
            Boolean(
              form.date &&
                form.startTime &&
                form.endTime &&
                form.siteId &&
                form.prestationId,
            )
          }
          footMeta={
            <span>
              Les conflits et le sous-effectif sont détectés après création.
            </span>
          }
          narrow
        >
          {composerStep === "creneau" ? (
            <FwPanel aria-label="Créneau">
              <FwPanelHead
                title="Horaire & affectation"
                description="Choisissez le site actif, la prestation et les agents initiaux."
              />
              {sites.length === 0 ? (
                <FwWarn>
                  Aucun site actif.{" "}
                  <Link href="/admin/operations?tab=referentiel">
                    Synchroniser le référentiel
                  </Link>
                  .
                </FwWarn>
              ) : null}
              <FwGrid>
                <FwField label="Date *">
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Début *">
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startTime: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Fin *">
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endTime: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Site actif *" wide>
                  <select
                    required
                    value={form.siteId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        siteId: e.target.value,
                        prestationId: "",
                      }))
                    }
                  >
                    <option value="">—</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.company} · {s.name}
                      </option>
                    ))}
                  </select>
                </FwField>
                <FwField label="Prestation *">
                  <select
                    required
                    value={form.prestationId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const p = formSite?.prestations.find((x) => x.id === pid);
                      setForm((f) => ({
                        ...f,
                        prestationId: pid,
                        requiredStaff: p
                          ? String(p.requiredStaff)
                          : f.requiredStaff,
                      }));
                    }}
                  >
                    <option value="">—</option>
                    {(formSite?.prestations || [])
                      .filter((p) => p.active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} ({p.requiredStaff} ag.)
                        </option>
                      ))}
                  </select>
                </FwField>
                <FwField label="Effectif requis">
                  <input
                    type="number"
                    min={1}
                    value={form.requiredStaff}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        requiredStaff: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Agents initiaux" wide>
                  <select
                    multiple
                    value={form.agentIds}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        agentIds: Array.from(e.target.selectedOptions).map(
                          (o) => o.value,
                        ),
                      }))
                    }
                    size={Math.min(6, Math.max(3, agents.length || 3))}
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </FwField>
              </FwGrid>
            </FwPanel>
          ) : null}
          {composerStep === "revue" ? (
            <FwPanel aria-label="Revue">
              <FwPanelHead
                title="Revue"
                description="Contrôle avant création du créneau."
              />
              <FwReview>
                <FwReviewCard
                  title="Créneau"
                  rows={[
                    { label: "Date", value: form.date || "—" },
                    {
                      label: "Horaire",
                      value: `${form.startTime || "—"} → ${form.endTime || "—"}`,
                    },
                    {
                      label: "Site",
                      value: formSite
                        ? `${formSite.company} · ${formSite.name}`
                        : "—",
                    },
                    {
                      label: "Prestation",
                      value:
                        formSite?.prestations.find(
                          (p) => p.id === form.prestationId,
                        )?.label || "—",
                    },
                    {
                      label: "Effectif",
                      value: String(Number(form.requiredStaff) || 1),
                    },
                    {
                      label: "Agents",
                      value:
                        form.agentIds.length > 0
                          ? form.agentIds
                              .map(
                                (id) =>
                                  agents.find((a) => a.id === id)?.name ?? id,
                              )
                              .join(", ")
                          : "Aucun",
                    },
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
