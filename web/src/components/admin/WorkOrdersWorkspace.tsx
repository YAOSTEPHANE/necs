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
import { IconSearch, IconVisit } from "@/components/admin/Icons";
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
import { toast } from "@/lib/toast";
import { fileToOptimizedDataUrl } from "@/lib/settings";
import { persistOptimizedImage } from "@/lib/vercel-blob-client";
import { loadSession } from "@/lib/auth";
import {
  enqueueOfflineOp,
  shouldUseOfflineQueue,
} from "@/lib/offline-queue";
import type { OpsSite } from "@/lib/ops-referential-shared";
import type { PlanningSlot } from "@/lib/ops-planning-shared";
import {
  PROOF_KIND_LABELS,
  WORK_ORDER_STATUS_LABELS,
  type ProofKind,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/lib/work-orders-shared";

type OrderRow = WorkOrder & {
  coverage?: { ok: boolean; missing: string[] };
  trace?: {
    ok: boolean;
    steps: Array<{ key: string; ok: boolean; detail: string }>;
  };
};

type Agent = { id: string; name: string; email: string; role?: string };

function formatWhen(ts: string | null) {
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

const STATUS_FILTERS: Array<{
  id: WorkOrderStatus | "all" | "action";
  label: string;
}> = [
  { id: "all", label: "Tous" },
  { id: "action", label: "À traiter" },
  { id: "planifie", label: "Planifiés" },
  { id: "en_cours", label: "En cours" },
  { id: "termine", label: "Terminés" },
  { id: "anomalie", label: "Anomalies" },
  { id: "cloture", label: "Clôturés" },
];

export function WorkOrdersWorkspace() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [sites, setSites] = useState<OpsSite[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [planningSlots, setPlanningSlots] = useState<PlanningSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [canSupervise, setCanSupervise] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    WorkOrderStatus | "all" | "action"
  >("action");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<
    "mission" | "details" | "revue"
  >("mission");
  const [composerShake, setComposerShake] = useState(false);
  const [anomalyNote, setAnomalyNote] = useState("");
  const [editConsignes, setEditConsignes] = useState("");
  const [editMateriel, setEditMateriel] = useState("");
  const [proofKind, setProofKind] = useState<ProofKind>("photo_avant");
  const [proofCaption, setProofCaption] = useState("");
  const proofInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    mode: "planning" as "planning" | "manual",
    planningSlotId: "",
    siteId: "",
    prestationId: "",
    date: "",
    startTime: "08:00",
    endTime: "12:00",
    agentUserIds: [] as string[],
    consignes: "",
    materiel: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/work-orders", { cache: "no-store" });
      const data = (await res.json()) as {
        orders?: OrderRow[];
        sites?: OpsSite[];
        agents?: Agent[];
        planningSlots?: PlanningSlot[];
        canSupervise?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement");
      setOrders(data.orders ?? []);
      setSites(data.sites ?? []);
      setAgents(data.agents ?? []);
      setPlanningSlots(data.planningSlots ?? []);
      setCanSupervise(Boolean(data.canSupervise));
      setSelectedId((prev) => {
        if (prev && data.orders?.some((o) => o.id === prev)) return prev;
        return data.orders?.[0]?.id ?? null;
      });
      setForm((f) => ({
        ...f,
        date: f.date || new Date().toISOString().slice(0, 10),
        siteId: f.siteId || data.sites?.[0]?.id || "",
        planningSlotId: f.planningSlotId || data.planningSlots?.[0]?.id || "",
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
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setEditConsignes(selected.consignes);
    setEditMateriel(selected.materiel);
    setAnomalyNote("");
  }, [selected?.id, selected?.consignes, selected?.materiel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter === "action") {
        if (
          o.status !== "planifie" &&
          o.status !== "en_cours" &&
          o.status !== "termine" &&
          o.status !== "anomalie"
        ) {
          return false;
        }
      } else if (statusFilter !== "all" && o.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        o.ref.toLowerCase().includes(q) ||
        o.siteName.toLowerCase().includes(q) ||
        o.clientName.toLowerCase().includes(q) ||
        o.prestationLabel.toLowerCase().includes(q) ||
        o.agents.some((a) => a.name.toLowerCase().includes(q))
      );
    });
  }, [orders, query, statusFilter]);

  const stats = useMemo(() => {
    const by = (s: WorkOrderStatus) =>
      orders.filter((o) => o.status === s).length;
    const aTraiter =
      by("planifie") + by("en_cours") + by("termine") + by("anomalie");
    return {
      total: orders.length,
      enCours: by("en_cours"),
      aCloturer: by("termine") + by("anomalie"),
      clotures: by("cloture"),
      aTraiter,
      planifies: by("planifie"),
      anomalies: by("anomalie"),
    };
  }, [orders]);

  const filterCounts = useMemo(() => {
    return {
      all: orders.length,
      action: stats.aTraiter,
      planifie: stats.planifies,
      en_cours: stats.enCours,
      termine: orders.filter((o) => o.status === "termine").length,
      anomalie: stats.anomalies,
      cloture: stats.clotures,
    } as Record<string, number>;
  }, [orders, stats]);

  const sitePrestations = useMemo(() => {
    const site = sites.find((s) => s.id === form.siteId);
    return site?.prestations ?? [];
  }, [sites, form.siteId]);

  const slotsWithoutOt = useMemo(() => {
    const linked = new Set(
      orders.map((o) => o.planningSlotId).filter(Boolean),
    );
    return planningSlots.filter(
      (s) =>
        !linked.has(s.id) &&
        s.assignments.some((a) => a.status === "planifie"),
    );
  }, [planningSlots, orders]);

  const post = async (action: string, payload: Record<string, unknown>) => {
    if (busy) return null;
    if (busyLock.current) return null;
    busyLock.current = true;
    const offlineKinds = new Set([
      "toggle_checklist",
      "complete",
      "anomaly",
    ]);
    if (shouldUseOfflineQueue() && offlineKinds.has(action)) {
      const session = loadSession();
      if (!session?.userId) {
        toast.error("Session requise pour le mode offline.");
        busyLock.current = false;
        return null;
      }
      const kind =
        action === "toggle_checklist"
          ? ("ot_checklist" as const)
          : action === "complete"
            ? ("ot_complete" as const)
            : ("ot_anomaly" as const);
      await enqueueOfflineOp({
        userId: session.userId,
        kind,
        payload: {
          workOrderId: payload.id,
          itemId: payload.itemId,
          done: payload.done,
          note: payload.note,
        },
        occurredAt: new Date().toISOString(),
      });
      if (action === "toggle_checklist" && payload.id && payload.itemId) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === payload.id
              ? {
                  ...o,
                  checklist: o.checklist.map((c) =>
                    c.id === payload.itemId
                      ? {
                          ...c,
                          done: Boolean(payload.done),
                          doneAt: payload.done
                            ? new Date().toISOString()
                            : null,
                          doneBy: session.userId,
                          doneByName: session.name,
                        }
                      : c,
                  ),
                }
              : o,
          ),
        );
      } else if (action === "complete" && payload.id) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === payload.id
              ? {
                  ...o,
                  status: "termine",
                  completedAt: new Date().toISOString(),
                }
              : o,
          ),
        );
      } else if (action === "anomaly" && payload.id) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === payload.id
              ? {
                  ...o,
                  status: "anomalie",
                  anomalyNote: String(payload.note ?? o.anomalyNote),
                }
              : o,
          ),
        );
      }
      toast.success("Contrôle enregistré hors ligne — sync au retour réseau");
      busyLock.current = false;
      return null;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as {
        order?: OrderRow;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      toast.success("Enregistré");
      await refresh();
      if (data.order?.id) setSelectedId(data.order.id);
      return data.order;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (form.mode === "planning") {
      const order = await post("create_from_planning", {
        planningSlotId: form.planningSlotId,
        consignes: form.consignes || undefined,
        materiel: form.materiel || undefined,
      });
      if (order) {
        setComposerOpen(false);
        setComposerStep("mission");
      }
      return;
    }
    const order = await post("create_manual", {
      siteId: form.siteId,
      prestationId: form.prestationId,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      agentUserIds: form.agentUserIds,
      consignes: form.consignes || undefined,
      materiel: form.materiel || undefined,
    });
    if (order) {
      setComposerOpen(false);
      setComposerStep("mission");
    }
  };

  const missionReady =
    form.mode === "planning"
      ? Boolean(form.planningSlotId)
      : Boolean(form.siteId && form.prestationId);

  const detailsReady =
    form.mode === "planning"
      ? true
      : Boolean(form.date && form.startTime && form.endTime);

  const pulseComposerError = () => {
    setComposerShake(true);
    window.setTimeout(() => setComposerShake(false), 420);
  };

  const canEnterComposerStep = (id: string) => {
    if (id === "mission") return true;
    if (!missionReady) return false;
    if (id === "revue") return detailsReady;
    return true;
  };

  const onProofFile = async (file: File | null) => {
    if (!file || !selected) return;
    if (busy || busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const { url } = await persistOptimizedImage({
        file,
        folder: "terrain",
        maxSize: 1600,
        forceJpeg: true,
        quality: 0.82,
        optimize: fileToOptimizedDataUrl,
      });
      busyLock.current = false;
      setBusy(false);
      await post("add_proof", {
        id: selected.id,
        kind: proofKind,
        url,
        caption: proofCaption || undefined,
      });
      setProofCaption("");
      if (proofInputRef.current) proofInputRef.current.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload échoué");
      busyLock.current = false;
      setBusy(false);
    }
  };

  const checklistDone = selected
    ? selected.checklist.filter((c) => c.done).length
    : 0;
  const checklistTotal = selected?.checklist.length ?? 0;
  const proofsOk = selected?.coverage?.ok !== false;

  return (
    <div className="leads-page work-orders-page">
      <ModuleHeader
        tone="#0f766e"
        badge="Opérations"
        icon={<IconVisit size={20} />}
        title="Ordres de travail"
        meta={
          <>
            <span>Missions · consignes · preuves · clôture</span>
            <span>
              <strong>{stats.aTraiter}</strong> à traiter ·{" "}
              <strong>{stats.enCours}</strong> en cours
            </span>
          </>
        }
        actions={
          <div className="leads-header-actions">
            <Link
              href="/admin/operations?tab=planification"
              className="btn-admin btn-admin--ghost"
            >
              Planning
            </Link>
            <Link
              href="/admin/operations?tab=referentiel"
              className="btn-admin btn-admin--ghost"
            >
              Référentiel
            </Link>
            {canSupervise ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => {
                  setComposerStep("mission");
                  setComposerOpen(true);
                }}
              >
                Nouvel OT
              </button>
            ) : null}
          </div>
        }
      />

      <section className="leads-kpis" aria-label="Indicateurs OT">
        <article className="leads-kpi">
          <p>Total</p>
          <strong>{stats.total}</strong>
          <span>missions</span>
        </article>
        <article className="leads-kpi leads-kpi--accent">
          <p>À traiter</p>
          <strong>{stats.aTraiter}</strong>
          <span>ouverts + à clôturer</span>
        </article>
        <article className="leads-kpi">
          <p>En cours</p>
          <strong>{stats.enCours}</strong>
          <span>sur le terrain</span>
        </article>
        <article className="leads-kpi">
          <p>À clôturer</p>
          <strong className={stats.aCloturer ? "is-warn" : undefined}>
            {stats.aCloturer}
          </strong>
          <span>
            {stats.anomalies} anomalie{stats.anomalies > 1 ? "s" : ""}
          </span>
        </article>
      </section>

      {slotsWithoutOt.length > 0 && canSupervise ? (
        <section className="wo-planning-strip" aria-label="Créneaux sans OT">
          <div className="wo-planning-strip__head">
            <strong>
              {slotsWithoutOt.length} créneau
              {slotsWithoutOt.length > 1 ? "x" : ""} planifié
              {slotsWithoutOt.length > 1 ? "s" : ""} sans OT
            </strong>
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  mode: "planning",
                  planningSlotId: slotsWithoutOt[0]?.id || "",
                }));
                setComposerStep("mission");
                setComposerOpen(true);
              }}
            >
              Créer depuis planning
            </button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="leads-empty">
          <span className="leads-empty__orb" aria-hidden />
          <p className="leads-empty__eyebrow">Ordres de travail</p>
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
                placeholder="Site, client, agent, réf…"
              />
            </label>
            <div className="leads-filters" role="tablist" aria-label="Statuts">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === s.id}
                  className={`leads-chip${statusFilter === s.id ? " is-active" : ""}`}
                  onClick={() => setStatusFilter(s.id)}
                >
                  {s.label}
                  <em>{filterCounts[s.id] ?? 0}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="leads-shell">
            <div className="leads-inbox" role="listbox" aria-label="Missions">
              {filtered.map((o) => {
                const incomplete = o.coverage && !o.coverage.ok;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="option"
                    aria-selected={o.id === selectedId}
                    className={`leads-card${o.id === selectedId ? " is-active" : ""}${incomplete ? " wo-card--warn" : ""}${o.status === "anomalie" ? " wo-card--anomaly" : ""}`}
                    onClick={() => setSelectedId(o.id)}
                  >
                    <span className="leads-card__body">
                      <span className="leads-card__top">
                        <strong>{o.ref}</strong>
                        <time>
                          {o.date} · {o.startTime}–{o.endTime}
                        </time>
                      </span>
                      <span className="leads-card__mid">
                        <span className={`wo-status wo-status--${o.status}`}>
                          {WORK_ORDER_STATUS_LABELS[o.status]}
                        </span>
                        {incomplete ? (
                          <span className="wo-badge-warn">Incomplet</span>
                        ) : null}
                      </span>
                      <span className="leads-card__preview">
                        {o.prestationLabel} @ {o.siteName}
                        {o.agents.length
                          ? ` · ${o.agents
                              .map((a) => a.name)
                              .slice(0, 2)
                              .join(", ")}`
                          : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <div className="leads-empty">
                  <span className="leads-empty__orb" aria-hidden />
                  <p className="leads-empty__eyebrow">Missions</p>
                  <h2>Aucun ordre de travail</h2>
                  <p>
                    Créez un OT depuis un créneau du{" "}
                    <Link href="/admin/operations?tab=planification">planning</Link>.
                  </p>
                </div>
              ) : null}
            </div>

            <article className="leads-detail wo-detail">
              {!selected ? (
                <div className="leads-empty-detail">
                  <p className="leads-empty__eyebrow">Détail</p>
                  <h2>Sélectionnez une mission</h2>
                  <p>
                    Consignes, checklist, preuves et clôture s’affichent ici.
                  </p>
                </div>
              ) : (
                <>
                  <header className="leads-detail__head">
                    <div>
                      <p className="leads-detail__eyebrow">
                        {selected.ref} · {selected.clientName}
                      </p>
                      <h2>{selected.prestationLabel}</h2>
                      <p className="leads-detail__sub">
                        {selected.siteName}
                        {selected.siteAddress
                          ? ` · ${selected.siteAddress}`
                          : ""}
                        {" · "}
                        {selected.date} {selected.startTime}–{selected.endTime}
                        {" · "}
                        <Link
                          href={`/admin/operations?tab=referentiel&siteId=${encodeURIComponent(selected.siteId)}`}
                        >
                          Site OPS
                        </Link>
                        {selected.planningSlotId ? (
                          <>
                            {" · "}
                            <Link href="/admin/operations?tab=planification">
                              Créneau
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="leads-detail__actions">
                      <span
                        className={`wo-status wo-status--${selected.status}`}
                      >
                        {WORK_ORDER_STATUS_LABELS[selected.status]}
                      </span>
                    </div>
                  </header>

                  <section className="wo-mission-bar">
                    <div>
                      <p className="wo-mission-bar__label">Agents</p>
                      <strong>
                        {selected.agents.map((a) => a.name).join(", ") ||
                          "Aucun"}
                      </strong>
                    </div>
                    <div>
                      <p className="wo-mission-bar__label">Checklist</p>
                      <strong>
                        {checklistDone}/{checklistTotal}
                      </strong>
                    </div>
                    <div>
                      <p className="wo-mission-bar__label">Preuves</p>
                      <strong className={!proofsOk ? "is-warn" : undefined}>
                        {selected.proofs.length}
                        {!proofsOk ? " · manques" : " · OK"}
                      </strong>
                    </div>
                    {selected.supervisorName ? (
                      <div>
                        <p className="wo-mission-bar__label">Superviseur</p>
                        <strong>{selected.supervisorName}</strong>
                      </div>
                    ) : null}
                  </section>

                  {selected.coverage && !selected.coverage.ok ? (
                    <div className="contracts-resaisie is-warn">
                      <strong>Manques avant terminé / clôture</strong>
                      <ul>
                        {selected.coverage.missing.map((m) => (
                          <li key={m}>✗ {m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : selected.status !== "planifie" &&
                    selected.status !== "cloture" ? (
                    <div className="contracts-resaisie is-ok">
                      <strong>Couverture preuves / checklist OK</strong>
                    </div>
                  ) : null}

                  {selected.anomalyNote ? (
                    <p className="wo-anomaly">
                      Anomalie : {selected.anomalyNote}
                    </p>
                  ) : null}

                  <div className="quotes-actions wo-actions-top">
                    {selected.status === "planifie" ||
                    selected.status === "en_cours" ? (
                      <>
                        {selected.status === "planifie" ? (
                          <button
                            type="button"
                            className="btn-admin btn-admin--primary"
                            disabled={busy}
                            onClick={() =>
                              void post("start", { id: selected.id })
                            }
                          >
                            Démarrer
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          disabled={busy}
                          onClick={() =>
                            void post("complete", { id: selected.id })
                          }
                        >
                          Marquer terminé
                        </button>
                      </>
                    ) : null}
                    {canSupervise &&
                    (selected.status === "termine" ||
                      selected.status === "anomalie") ? (
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={busy}
                        onClick={() =>
                          void post("close", { id: selected.id })
                        }
                      >
                        Clôturer (superviseur)
                      </button>
                    ) : null}
                  </div>

                  {(selected.status === "planifie" ||
                    selected.status === "en_cours") && (
                    <div className="wo-anomaly-form">
                      <input
                        placeholder="Motif anomalie…"
                        value={anomalyNote}
                        onChange={(e) => setAnomalyNote(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy || !anomalyNote.trim()}
                        onClick={() =>
                          void post("anomaly", {
                            id: selected.id,
                            note: anomalyNote,
                          })
                        }
                      >
                        Signaler anomalie
                      </button>
                    </div>
                  )}

                  <section className="contracts-section">
                    <h3>Consignes & matériel</h3>
                    {canSupervise && selected.status !== "cloture" ? (
                      <>
                        <label className="ops-ref-consignes">
                          Consignes
                          <textarea
                            rows={3}
                            value={editConsignes}
                            onChange={(e) =>
                              setEditConsignes(e.target.value)
                            }
                          />
                        </label>
                        <label className="wo-field">
                          Matériel
                          <input
                            value={editMateriel}
                            onChange={(e) => setEditMateriel(e.target.value)}
                          />
                        </label>
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void post("update_meta", {
                              id: selected.id,
                              consignes: editConsignes,
                              materiel: editMateriel,
                            })
                          }
                        >
                          Enregistrer
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="wo-consignes-read">
                          {selected.consignes || "Aucune consigne."}
                        </p>
                        {selected.materiel ? (
                          <p className="wo-materiel-read">
                            <strong>Matériel :</strong> {selected.materiel}
                          </p>
                        ) : null}
                      </>
                    )}
                  </section>

                  <section className="contracts-section">
                    <h3>
                      Checklist ({checklistDone}/{checklistTotal})
                    </h3>
                    <ul className="wo-checklist">
                      {selected.checklist.map((c) => (
                        <li key={c.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={c.done}
                              disabled={
                                busy || selected.status === "cloture"
                              }
                              onChange={(e) =>
                                void post("toggle_checklist", {
                                  id: selected.id,
                                  itemId: c.id,
                                  done: e.target.checked,
                                })
                              }
                            />
                            <span>
                              {c.label}
                              {c.required ? " *" : ""}
                              {c.doneByName ? ` · ${c.doneByName}` : ""}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="contracts-section">
                    <h3>Preuves obligatoires</h3>
                    <ul className="wo-proof-rules">
                      {selected.requiredProofs.map((r) => {
                        const count = selected.proofs.filter(
                          (p) => p.kind === r.kind,
                        ).length;
                        const ok = count >= r.minCount;
                        return (
                          <li
                            key={r.kind}
                            className={ok ? "is-ok" : "is-missing"}
                          >
                            {r.label} — {count}/{r.minCount}
                            {r.required ? " *" : ""}
                          </li>
                        );
                      })}
                    </ul>
                    {selected.status !== "cloture" ? (
                      <div className="wo-proof-upload">
                        <select
                          value={proofKind}
                          onChange={(e) =>
                            setProofKind(e.target.value as ProofKind)
                          }
                        >
                          {(
                            Object.keys(PROOF_KIND_LABELS) as ProofKind[]
                          ).map((k) => (
                            <option key={k} value={k}>
                              {PROOF_KIND_LABELS[k]}
                            </option>
                          ))}
                        </select>
                        <input
                          placeholder="Légende (optionnel)"
                          value={proofCaption}
                          onChange={(e) => setProofCaption(e.target.value)}
                        />
                        <input
                          ref={proofInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={busy}
                          onChange={(e) =>
                            void onProofFile(e.target.files?.[0] ?? null)
                          }
                        />
                      </div>
                    ) : null}
                    <div className="wo-proof-grid">
                      {selected.proofs.map((p) => (
                        <figure key={p.id}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt={p.caption || p.kind} />
                          <figcaption>
                            {PROOF_KIND_LABELS[p.kind]} · {p.byName} ·{" "}
                            {formatWhen(p.at)}
                            {p.caption ? ` — ${p.caption}` : ""}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </section>

                  {selected.trace ? (
                    <section className="contracts-section">
                      <h3>
                        Traçabilité
                        {selected.trace.ok ? " ✓" : ""}
                      </h3>
                      <ol className="wo-trace">
                        {selected.trace.steps.map((s) => (
                          <li
                            key={s.key}
                            className={s.ok ? "is-ok" : "is-pending"}
                          >
                            <strong>{s.key}</strong> — {s.detail}
                          </li>
                        ))}
                      </ol>
                    </section>
                  ) : null}

                  <dl className="ops-ref-dl">
                    <div>
                      <dt>Créé</dt>
                      <dd>
                        {formatWhen(selected.createdAt)} ·{" "}
                        {selected.createdByName}
                      </dd>
                    </div>
                    <div>
                      <dt>Démarré</dt>
                      <dd>{formatWhen(selected.startedAt)}</dd>
                    </div>
                    <div>
                      <dt>Terminé</dt>
                      <dd>{formatWhen(selected.completedAt)}</dd>
                    </div>
                    <div>
                      <dt>Clôturé</dt>
                      <dd>
                        {formatWhen(selected.closedAt)}
                        {selected.closedByName
                          ? ` · ${selected.closedByName}`
                          : ""}
                      </dd>
                    </div>
                  </dl>

                  <section className="need-qual__history">
                    <h3>Journal</h3>
                    <ol>
                      {selected.history.slice(0, 16).map((h) => (
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

      <AdminFormWizard
        open={composerOpen && canSupervise}
        portal
        onClose={() => {
          setComposerOpen(false);
          setComposerStep("mission");
        }}
        titleId="wo-create-title"
        eyebrow="Mission"
        title="Nouvel ordre de travail"
        lead="Depuis un créneau planning ou saisie manuelle."
        steps={[
          { id: "mission", label: "Mission", hint: "Mode & cible" },
          { id: "details", label: "Détails", hint: "Horaires & consignes" },
          { id: "revue", label: "Revue", hint: "Contrôle avant création" },
        ]}
        stepId={composerStep}
        onStepChange={(id) =>
          setComposerStep(id as "mission" | "details" | "revue")
        }
        canEnterStep={canEnterComposerStep}
        onStepBlocked={pulseComposerError}
        shake={composerShake}
        formId="necs-wo-create-form"
        onSubmit={(e) => void onCreate(e)}
        submitLabel="Créer la mission"
        busy={busy}
        canSubmit={missionReady && detailsReady}
        footMeta={
          <span>Checklist et preuves obligatoires générées automatiquement.</span>
        }
      >
        {composerStep === "mission" ? (
          <FwPanel aria-label="Mission">
            <FwPanelHead
              title="Mode de création"
              description="Relier un créneau planning ou saisir manuellement."
            />
            <FwBlock>
              <FwChips>
                <FwChip
                  selected={form.mode === "planning"}
                  title="Depuis planning"
                  hint={`${slotsWithoutOt.length} créneau(x)`}
                  onClick={() =>
                    setForm((f) => ({ ...f, mode: "planning" }))
                  }
                />
                <FwChip
                  selected={form.mode === "manual"}
                  title="Manuel"
                  hint="Saisie libre"
                  onClick={() => setForm((f) => ({ ...f, mode: "manual" }))}
                />
              </FwChips>
            </FwBlock>

            <FwGrid>
              {form.mode === "planning" ? (
                <FwField label="Créneau avec agents *" wide>
                  <select
                    required
                    value={form.planningSlotId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        planningSlotId: e.target.value,
                      }))
                    }
                  >
                    <option value="">— Choisir —</option>
                    {slotsWithoutOt.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.date} {s.startTime}–{s.endTime} ·{" "}
                        {s.prestationLabel} @ {s.siteName}
                      </option>
                    ))}
                  </select>
                </FwField>
              ) : (
                <>
                  <FwField label="Site *" wide>
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
                      <option value="">— Site —</option>
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
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          prestationId: e.target.value,
                        }))
                      }
                    >
                      <option value="">— Prestation —</option>
                      {sitePrestations.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </FwField>
                </>
              )}
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "details" ? (
          <FwPanel aria-label="Détails">
            <FwPanelHead
              title="Détails opérationnels"
              description={
                form.mode === "manual"
                  ? "Horaires, agents, consignes et matériel."
                  : "Consignes et matériel (sinon hérités du site)."
              }
            />
            <FwGrid>
              {form.mode === "manual" ? (
                <>
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
                        setForm((f) => ({
                          ...f,
                          startTime: e.target.value,
                        }))
                      }
                    />
                  </FwField>
                  <FwField label="Fin *">
                    <input
                      type="time"
                      required
                      value={form.endTime}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          endTime: e.target.value,
                        }))
                      }
                    />
                  </FwField>
                  <FwField label="Agents" wide>
                    <div className="wo-agents-pick">
                      {agents.map((a) => {
                        const checked = form.agentUserIds.includes(a.id);
                        return (
                          <label key={a.id}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setForm((f) => ({
                                  ...f,
                                  agentUserIds: checked
                                    ? f.agentUserIds.filter(
                                        (id) => id !== a.id,
                                      )
                                    : [...f.agentUserIds, a.id],
                                }))
                              }
                            />
                            {a.name}
                          </label>
                        );
                      })}
                    </div>
                  </FwField>
                </>
              ) : null}
              <FwField label="Consignes (sinon héritées du site)" wide>
                <textarea
                  rows={3}
                  value={form.consignes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      consignes: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Matériel" wide>
                <input
                  value={form.materiel}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      materiel: e.target.value,
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
              title="Revue avant création"
              description="Vérifiez la mission avant génération de la checklist."
            />
            <FwReview>
              <FwReviewCard
                title="Mission"
                rows={[
                  {
                    label: "Mode",
                    value:
                      form.mode === "planning"
                        ? "Depuis planning"
                        : "Manuel",
                  },
                  ...(form.mode === "planning"
                    ? [
                        {
                          label: "Créneau",
                          value: (() => {
                            const s = slotsWithoutOt.find(
                              (x) => x.id === form.planningSlotId,
                            );
                            return s
                              ? `${s.date} ${s.startTime}–${s.endTime} · ${s.prestationLabel} @ ${s.siteName}`
                              : "—";
                          })(),
                        },
                      ]
                    : [
                        {
                          label: "Site",
                          value: (() => {
                            const s = sites.find((x) => x.id === form.siteId);
                            return s ? `${s.company} · ${s.name}` : "—";
                          })(),
                        },
                        {
                          label: "Prestation",
                          value:
                            sitePrestations.find(
                              (p) => p.id === form.prestationId,
                            )?.label || "—",
                        },
                        {
                          label: "Horaires",
                          value: form.date
                            ? `${form.date} · ${form.startTime}–${form.endTime}`
                            : "—",
                        },
                        {
                          label: "Agents",
                          value:
                            form.agentUserIds.length > 0
                              ? agents
                                  .filter((a) =>
                                    form.agentUserIds.includes(a.id),
                                  )
                                  .map((a) => a.name)
                                  .join(", ")
                              : "—",
                        },
                      ]),
                ]}
              />
              <FwReviewCard
                title="Consignes"
                rows={[
                  { label: "Consignes", value: form.consignes || "—" },
                  { label: "Matériel", value: form.materiel || "—" },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>
    </div>
  );
}
