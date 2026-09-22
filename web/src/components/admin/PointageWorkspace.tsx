"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EmptyState, ModuleHeader, StatusBadge } from "@/components/admin/Ui";
import { RhWorkspaceShell } from "@/components/admin/RhWorkspaceShell";
import { IconClock, IconSearch } from "@/components/admin/Icons";
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
  FwWarn,
} from "@/components/admin/form-wizard";
import { toast } from "@/lib/toast";
import { downloadCsv } from "@/lib/download";
import { loadSession } from "@/lib/auth";
import {
  enqueueOfflineOp,
  shouldUseOfflineQueue,
} from "@/lib/offline-queue";
import type { StatusTone } from "@/lib/mock-data";
import {
  currentTimeHm,
  pointageStats,
  todayIso,
  workedHours,
  type ConcurrentTestResult,
  type PointagePunch,
  type PunchMode,
} from "@/lib/pointage-shared";

type StatusFilter = "all" | "open" | "late" | "absent" | "ok" | "validated";

function toneForStatus(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s.includes("valid")) return "ok";
  if (s.includes("retard") || s.includes("anomal")) return "warn";
  if (s.includes("absent")) return "danger";
  if (s.includes("cours") || s.includes("complet")) return "info";
  return "neutral";
}

function formatDateLabel(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readGeo(
  enabled: boolean,
): Promise<{ lat: number; lng: number; accuracy: number | null } | undefined> {
  if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
    return undefined;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        }),
      () => resolve(undefined),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60_000 },
    );
  });
}

export function PointageWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [punches, setPunches] = useState<PointagePunch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [canSupervise, setCanSupervise] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [userId, setUserId] = useState("");
  const [actorName, setActorName] = useState("Superviseur");
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [concurrencyTarget, setConcurrencyTarget] = useState(50);
  const [date, setDate] = useState(todayIso());
  const [siteFilter, setSiteFilter] = useState("Tous les sites");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clock, setClock] = useState(currentTimeHm());
  const [punchOverlay, setPunchOverlay] = useState(false);
  const [punchDraft, setPunchDraft] = useState<PointagePunch | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [punchStep, setPunchStep] = useState<"horaires" | "revue">("horaires");
  const [punchShake, setPunchShake] = useState(false);
  const [punchBusy, setPunchBusy] = useState(false);
  const [anomalyReason, setAnomalyReason] = useState("");
  const [lastTest, setLastTest] = useState<ConcurrentTestResult | null>(null);

  const refresh = useCallback(async (d?: string) => {
    setLoading(true);
    try {
      const day = d || date;
      const res = await fetch(
        `/api/pointage?date=${encodeURIComponent(day)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        punches?: PointagePunch[];
        canSupervise?: boolean;
        role?: string;
        userId?: string;
        geoEnabled?: boolean;
        concurrencyTarget?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement");
      setPunches(data.punches ?? []);
      setCanSupervise(Boolean(data.canSupervise));
      setAgentMode(data.role === "nettoyeur");
      setUserId(data.userId ?? "");
      setGeoEnabled(Boolean(data.geoEnabled));
      setConcurrencyTarget(data.concurrencyTarget ?? 50);
      setSelectedId((prev) => {
        const list = data.punches ?? [];
        if (prev && list.some((p) => p.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const t = window.setInterval(() => setClock(currentTimeHm()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!punchOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPunchOverlay(false);
        setFormError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [punchOverlay]);

  useEffect(() => {
    const session = loadSession();
    if (session?.name) setActorName(session.name);
  }, []);

  const stats = useMemo(() => pointageStats(punches), [punches]);

  const sites = useMemo(() => {
    const set = new Set(punches.map((p) => p.site).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [punches]);

  const filters = useMemo(() => {
    const count = (id: StatusFilter) => {
      if (id === "all") return punches.length;
      if (id === "open")
        return punches.filter((p) => p.actualIn && !p.actualOut).length;
      if (id === "late")
        return punches.filter((p) => p.status === "Retard").length;
      if (id === "absent")
        return punches.filter((p) => !p.actualIn).length;
      if (id === "ok")
        return punches.filter(
          (p) => p.status === "Complet" || p.status === "Validé",
        ).length;
      return punches.filter((p) => p.status === "Validé").length;
    };
    return (
      [
        { id: "all" as const, label: "Tous" },
        { id: "open" as const, label: "En service" },
        { id: "late" as const, label: "Retards" },
        { id: "absent" as const, label: "Absents" },
        { id: "ok" as const, label: "OK" },
        { id: "validated" as const, label: "Validés" },
      ] as const
    ).map((f) => ({ ...f, count: count(f.id) }));
  }, [punches]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return punches
      .filter((p) => {
        if (siteFilter !== "Tous les sites" && p.site !== siteFilter)
          return false;
        if (statusFilter === "open") return Boolean(p.actualIn && !p.actualOut);
        if (statusFilter === "late") return p.status === "Retard";
        if (statusFilter === "absent") return !p.actualIn;
        if (statusFilter === "ok")
          return p.status === "Complet" || p.status === "Validé";
        if (statusFilter === "validated") return p.status === "Validé";
        return true;
      })
      .filter((p) => {
        if (!q) return true;
        return (
          p.employeeName.toLowerCase().includes(q) ||
          p.site.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "fr"));
  }, [punches, siteFilter, statusFilter, query]);

  const selected = useMemo(
    () => punches.find((p) => p.id === selectedId) ?? null,
    [punches, selectedId],
  );

  const post = async (
    action: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> => {
    if (busy) return null;
    if (busyLock.current) return null;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/pointage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as Record<string, unknown> & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  };

  const onPunchIn = async (punch: PointagePunch) => {
    if (punch.actualIn) {
      toast.warning("Arrivée déjà enregistrée (anti double-pointage).");
      return;
    }
    const geo = await readGeo(geoEnabled);
    const uid = punch.userId || userId;
    if (shouldUseOfflineQueue()) {
      const session = loadSession();
      const actorId = session?.userId || uid;
      await enqueueOfflineOp({
        userId: actorId,
        kind: "pointage_in",
        payload: {
          userId: uid,
          date,
          mode: agentMode ? "Mobile" : "Terminal",
          geo,
        },
        occurredAt: new Date().toISOString(),
      });
      // Miroir local optimiste pour l’UI
      setPunches((prev) =>
        prev.map((p) =>
          p.id === punch.id
            ? {
                ...p,
                actualIn: currentTimeHm(),
                actualInAt: new Date().toISOString(),
                status: "En cours",
                anomaly: "Départ manquant · sync pending",
              }
            : p,
        ),
      );
      toast.success("Arrivée enregistrée hors ligne — sync au retour réseau");
      return;
    }
    const data = await post("punch_in", {
      userId: uid,
      date,
      mode: agentMode ? "Mobile" : "Terminal",
      clientRequestId: newClientRequestId(),
      geo,
    });
    if (!data) return;
    if (data.duplicate || data.replay) {
      toast.warning("Arrivée déjà enregistrée (anti double-pointage).");
    } else {
      toast.success(`Arrivée pointée à ${currentTimeHm()}`);
    }
    await refresh();
  };

  const onPunchOut = async (punch: PointagePunch) => {
    if (!punch.actualIn) {
      toast.warning("Pointer l’arrivée d’abord.");
      return;
    }
    if (punch.actualOut) {
      toast.warning("Départ déjà enregistré.");
      return;
    }
    const geo = await readGeo(geoEnabled);
    const uid = punch.userId || userId;
    if (shouldUseOfflineQueue()) {
      const session = loadSession();
      const actorId = session?.userId || uid;
      await enqueueOfflineOp({
        userId: actorId,
        kind: "pointage_out",
        payload: {
          userId: uid,
          date,
          mode: agentMode ? "Mobile" : "Terminal",
          geo,
        },
        occurredAt: new Date().toISOString(),
      });
      setPunches((prev) =>
        prev.map((p) =>
          p.id === punch.id
            ? {
                ...p,
                actualOut: currentTimeHm(),
                actualOutAt: new Date().toISOString(),
                status: "Complet",
                anomaly: "Sync pending",
              }
            : p,
        ),
      );
      toast.success("Départ enregistré hors ligne — sync au retour réseau");
      return;
    }
    const data = await post("punch_out", {
      userId: uid,
      date,
      mode: agentMode ? "Mobile" : "Terminal",
      clientRequestId: newClientRequestId(),
      geo,
    });
    if (!data) return;
    if (data.duplicate || data.replay) {
      toast.warning("Départ déjà enregistré.");
    } else {
      toast.success(`Départ pointé à ${currentTimeHm()}`);
    }
    await refresh();
  };

  const onValidate = async (punch: PointagePunch, note?: string) => {
    if (note !== undefined && note !== punch.note) {
      await post("note", { id: punch.id, note });
    }
    const data = await post("validate", { id: punch.id });
    if (!data) return;
    toast.success("Pointage validé.");
    await refresh();
  };

  const onSaveNote = async (id: string, note: string) => {
    await post("note", { id, note });
    await refresh();
  };

  const onFlagAnomaly = async (punch: PointagePunch) => {
    if (!anomalyReason.trim()) {
      toast.warning("Indiquez le motif d’anomalie.");
      return;
    }
    const data = await post("anomaly", {
      id: punch.id,
      reason: anomalyReason,
    });
    if (!data) return;
    setAnomalyReason("");
    toast.success("Anomalie enregistrée.");
    await refresh();
  };

  function pulsePunchError() {
    setPunchShake(true);
    window.setTimeout(() => setPunchShake(false), 420);
  }

  const openCorrectPunch = () => {
    if (!selected) return;
    setPunchDraft({ ...selected });
    setFormError(null);
    setPunchStep("horaires");
    setPunchOverlay(true);
  };

  const punchHorairesReady = Boolean(
    punchDraft &&
      !(punchDraft.actualOut && !punchDraft.actualIn),
  );

  const savePunchCorrection = async (e: FormEvent) => {
    e.preventDefault();
    if (!punchDraft || punchBusy) return;
    if (punchDraft.actualOut && !punchDraft.actualIn) {
      setFormError("Indiquez l’arrivée avant le départ.");
      setPunchStep("horaires");
      pulsePunchError();
      return;
    }
    setPunchBusy(true);
    try {
      const data = await post("correct", {
        id: punchDraft.id,
        actualIn: punchDraft.actualIn,
        actualOut: punchDraft.actualOut,
        plannedIn: punchDraft.plannedIn,
        plannedOut: punchDraft.plannedOut,
        note: punchDraft.note,
        mode: punchDraft.mode,
      });
      if (!data) return;
      setPunchOverlay(false);
      setPunchDraft(null);
      toast.success("Pointage corrigé (mode Manuel).");
      await refresh();
    } finally {
      setPunchBusy(false);
    }
  };

  const runBurstTest = async () => {
    const data = await post("concurrent_test", {
      target: concurrencyTarget,
    });
    if (!data?.test) return;
    const test = data.test as ConcurrentTestResult;
    setLastTest(test);
    if (test.ok) toast.success(test.detail);
    else toast.error(test.detail);
  };

  const exportCsv = () => {
    const rows = [
      [
        "ID",
        "Date",
        "Employé",
        "Site",
        "Planning",
        "Prévu entrée",
        "Prévu sortie",
        "Réel entrée",
        "Réel sortie",
        "Durée",
        "Mode",
        "Statut",
        "Anomalie",
        "Validé par",
        "Note",
      ],
      ...filtered.map((p) => [
        p.id,
        p.date,
        p.employeeName,
        p.site,
        p.planningSlotId || "hors planning",
        p.plannedIn,
        p.plannedOut,
        p.actualIn ?? "",
        p.actualOut ?? "",
        workedHours(p),
        p.mode,
        p.status,
        p.anomaly,
        p.validatedBy ?? "",
        p.note,
      ]),
    ];
    downloadCsv(rows, `necs-pointage-${date}`);
  };

  if (loading && punches.length === 0) {
    return (
      <div className="pointage-page" aria-busy="true">
        <div className="pointage-skel pointage-skel--lg" />
        <div className="pointage-kpis">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="pointage-skel" />
          ))}
        </div>
        <div className="pointage-skel pointage-skel--board" />
      </div>
    );
  }

  return (
    <div className={`pointage-page${embedded ? " rh-workspace--embedded" : ""}`}>
      {embedded ? (
        <RhWorkspaceShell
          embedded
          badge="Pointage"
          eyebrow="Présences"
          icon={<IconClock size={20} />}
          title="Fiche de pointage / relevé de présence"
          meta={
            <>
              <span>
                Agent · site · date · arrivée · départ · anomalies · export
              </span>
              <span>
                <strong>{formatDateLabel(date)}</strong>
              </span>
            </>
          }
          actions={
            !agentMode ? (
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={exportCsv}
              >
                Export CSV
              </button>
            ) : null
          }
        >
          {null}
        </RhWorkspaceShell>
      ) : (
      <ModuleHeader
        tone="#1260a8"
        badge={agentMode ? "Agent" : "Pointage"}
        icon={<IconClock size={22} />}
        title={agentMode ? "Mon pointage mobile" : "Pointage mobile simultané"}
        meta={
          <>
            <span>
              <strong>{formatDateLabel(date)}</strong>
              {date === todayIso() ? " · Aujourd’hui" : ""}
            </span>
            <span>
              <strong>{clock}</strong>
            </span>
            <span>
              {geoEnabled ? "Géo active" : "Géo désactivée"}
            </span>
            {!agentMode ? (
              <span>
                Cible charge <strong>{concurrencyTarget}</strong>
              </span>
            ) : (
              <span>
                <strong>{selected?.status ?? "—"}</strong>
              </span>
            )}
          </>
        }
        actions={
          agentMode ? (
            <Link href="/admin/mon-espace" className="btn-admin btn-admin--ghost">
              ← Accueil agent
            </Link>
          ) : (
            <>
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={() => void runBurstTest()}
                disabled={busy}
              >
                Test charge ×{concurrencyTarget}
              </button>
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={exportCsv}
                disabled={filtered.length === 0}
              >
                Export CSV
              </button>
              <input
                type="date"
                className="pointage-date"
                value={date}
                onChange={(e) => {
                  const next = e.target.value || todayIso();
                  setDate(next);
                  void refresh(next);
                }}
                aria-label="Date de pointage"
              />
            </>
          )
        }
      />
      )}

      {lastTest ? (
        <p
          className={
            lastTest.ok
              ? "pointage-burst pointage-burst--ok"
              : "pointage-burst pointage-burst--fail"
          }
        >
          Recette simultanée : {lastTest.detail}
        </p>
      ) : null}

      {agentMode && selected ? (
        <section
          className="agent-pointage-strip panel-card"
          aria-label="Résumé du jour"
        >
          <div>
            <strong>{selected.site}</strong>
            <span>
              Shift {selected.plannedIn} – {selected.plannedOut}
              {selected.planningSlotId ? " · lié planning" : " · hors planning"}{" "}
              · Durée {workedHours(selected)}
            </span>
          </div>
          <div className="agent-pointage-strip__actions">
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              disabled={busy || Boolean(selected.actualIn)}
              onClick={() => void onPunchIn(selected)}
            >
              {selected.actualIn
                ? `Arrivée ${selected.actualIn}`
                : "Pointer l’arrivée"}
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              disabled={
                busy || !selected.actualIn || Boolean(selected.actualOut)
              }
              onClick={() => void onPunchOut(selected)}
            >
              {selected.actualOut
                ? `Départ ${selected.actualOut}`
                : "Pointer le départ"}
            </button>
            <Link href="/admin/operations?tab=terrain" className="btn-admin btn-admin--ghost">
              Photos terrain
            </Link>
            <Link
              href="/admin/operations?tab=missions"
              className="btn-admin btn-admin--ghost"
            >
              Missions
            </Link>
          </div>
        </section>
      ) : null}

      {!agentMode ? (
        <section className="pointage-kpis" aria-label="Indicateurs pointage">
          <article className="pointage-kpi pointage-kpi--accent">
            <p>Présents</p>
            <strong>{stats.present}</strong>
            <span>
              {stats.total} au tableau · {stats.validated} validés
            </span>
          </article>
          <article className="pointage-kpi">
            <p>En service</p>
            <strong>{stats.open}</strong>
            <span>arrivée sans départ</span>
          </article>
          <article className="pointage-kpi">
            <p>Retards / anomalies</p>
            <strong>
              {stats.late}/{stats.anomaly}
            </strong>
            <span>grâce 10 min · hors planning</span>
          </article>
          <article className="pointage-kpi">
            <p>Absents</p>
            <strong>{stats.absent}</strong>
            <span>pas d’arrivée</span>
          </article>
        </section>
      ) : null}

      {!agentMode ? (
        <div className="pointage-toolbar-bar">
          <label className="pointage-search">
            <IconSearch size={16} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher agent, site…"
              aria-label="Rechercher un agent"
            />
          </label>
          <select
            className="pointage-site-select"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            aria-label="Filtrer par site"
          >
            <option value="Tous les sites">Tous les sites</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="pointage-filters" role="tablist" aria-label="Filtres">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === f.id}
                className={`pointage-chip${statusFilter === f.id ? " is-active" : ""}`}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
                <em>{f.count}</em>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <section className="panel-card pointage-board">
        <div className="panel-card__head">
          <h3>
            {agentMode
              ? "Ma fiche du jour"
              : `Tableau du jour (${filtered.length})`}
          </h3>
        </div>

        <div className="pointage-grid">
          <div className="pointage-list">
            {filtered.length === 0 ? (
              <EmptyState
                title="Aucun pointage"
                hint={
                  agentMode
                    ? "Votre fiche sera créée au premier chargement."
                    : "Les agents apparaissent dès qu’ils ouvrent le pointage ou sont planifiés."
                }
              />
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  className={`pointage-card${selectedId === p.id ? " is-active" : ""}${!p.actualIn ? " is-warn" : ""}`}
                  onClick={() => setSelectedId(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(p.id);
                    }
                  }}
                >
                  <div className="pointage-card__top">
                    <strong>{p.employeeName}</strong>
                    <StatusBadge tone={toneForStatus(p.status)}>
                      {p.status}
                    </StatusBadge>
                  </div>
                  <p>
                    {p.mode} · {p.site}
                    {!p.planningSlotId ? " · hors planning" : ""}
                  </p>
                  <div className="pointage-card__times">
                    <span>
                      Arrivée <b>{p.actualIn ?? "—"}</b>
                    </span>
                    <span>
                      Départ <b>{p.actualOut ?? "—"}</b>
                    </span>
                    <span>
                      Durée <b>{workedHours(p)}</b>
                    </span>
                  </div>
                  {p.anomaly !== "Aucune" && p.anomaly ? (
                    <em className="pointage-card__anomaly">{p.anomaly}</em>
                  ) : null}
                  <div
                    className="pointage-card__actions"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy || Boolean(p.actualIn)}
                      onClick={() => void onPunchIn(p)}
                    >
                      Arrivée
                    </button>
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={
                        busy || !p.actualIn || Boolean(p.actualOut)
                      }
                      onClick={() => void onPunchOut(p)}
                    >
                      Départ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <aside className="pointage-detail panel-card">
            {selected ? (
              <PunchDetail
                punch={selected}
                actorName={actorName}
                agentMode={agentMode}
                canSupervise={canSupervise}
                busy={busy}
                geoEnabled={geoEnabled}
                anomalyReason={anomalyReason}
                onAnomalyReason={setAnomalyReason}
                onPunchIn={() => void onPunchIn(selected)}
                onPunchOut={() => void onPunchOut(selected)}
                onValidate={(pendingNote) =>
                  void onValidate(selected, pendingNote)
                }
                onNote={(note) => void onSaveNote(selected.id, note)}
                onFlagAnomaly={() => void onFlagAnomaly(selected)}
                onCorrectPunch={
                  canSupervise ? openCorrectPunch : undefined
                }
              />
            ) : (
              <EmptyState
                title="Sélectionnez un agent"
                hint="Consultez le détail et validez le pointage."
              />
            )}
          </aside>
        </div>
      </section>

      {punchOverlay && punchDraft ? (
        <AdminFormWizard
          open={punchOverlay}
          onClose={() => {
            setPunchOverlay(false);
            setFormError(null);
          }}
          titleId="pointage-correct-title"
          eyebrow="Correction"
          title="Corriger le pointage"
          lead={`${punchDraft.employeeName} · mode Manuel`}
          avatar={
            punchDraft.employeeName
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0] ?? "")
              .join("")
              .toUpperCase() || "P"
          }
          steps={[
            { id: "horaires", label: "Horaires", hint: "Prévu & réel" },
            { id: "revue", label: "Revue", hint: "Contrôle avant enregistrement" },
          ]}
          stepId={punchStep}
          onStepChange={(id) => setPunchStep(id as "horaires" | "revue")}
          canEnterStep={(id) => id === "horaires" || punchHorairesReady}
          onStepBlocked={() => {
            setFormError("Indiquez l’arrivée avant le départ.");
            pulsePunchError();
          }}
          shake={punchShake}
          formId="necs-pointage-correct-form"
          onSubmit={(e) => void savePunchCorrection(e)}
          submitLabel="Enregistrer la correction"
          busy={punchBusy}
          canSubmit={punchHorairesReady}
          narrow
        >
          {punchStep === "horaires" ? (
            <FwPanel aria-label="Horaires">
              <FwPanelHead
                title="Horaires & mode"
                description="Ajustez les heures prévues et réelles. La correction passe en mode Manuel."
              />
              {formError ? <FwWarn>{formError}</FwWarn> : null}
              <FwGrid>
                <FwField label="Prévu entrée">
                  <input
                    type="time"
                    value={punchDraft.plannedIn}
                    onChange={(e) =>
                      setPunchDraft({
                        ...punchDraft,
                        plannedIn: e.target.value,
                      })
                    }
                  />
                </FwField>
                <FwField label="Prévu sortie">
                  <input
                    type="time"
                    value={punchDraft.plannedOut}
                    onChange={(e) =>
                      setPunchDraft({
                        ...punchDraft,
                        plannedOut: e.target.value,
                      })
                    }
                  />
                </FwField>
                <FwField label="Arrivée réelle">
                  <input
                    type="time"
                    value={punchDraft.actualIn ?? ""}
                    onChange={(e) => {
                      setFormError(null);
                      setPunchDraft({
                        ...punchDraft,
                        actualIn: e.target.value || null,
                      });
                    }}
                  />
                </FwField>
                <FwField label="Départ réel">
                  <input
                    type="time"
                    value={punchDraft.actualOut ?? ""}
                    onChange={(e) => {
                      setFormError(null);
                      setPunchDraft({
                        ...punchDraft,
                        actualOut: e.target.value || null,
                      });
                    }}
                  />
                </FwField>
                <FwField label="Note" wide>
                  <textarea
                    rows={3}
                    value={punchDraft.note}
                    onChange={(e) =>
                      setPunchDraft({
                        ...punchDraft,
                        note: e.target.value,
                      })
                    }
                  />
                </FwField>
              </FwGrid>
              <FwChips>
                {(
                  [
                    { value: "Manuel" as PunchMode, hint: "Saisie superviseur" },
                    { value: "Mobile" as PunchMode, hint: "App terrain" },
                    { value: "Terminal" as PunchMode, hint: "Badgeuse" },
                  ] as const
                ).map((m) => (
                  <FwChip
                    key={m.value}
                    selected={punchDraft.mode === m.value}
                    title={m.value}
                    hint={m.hint}
                    onClick={() =>
                      setPunchDraft({ ...punchDraft, mode: m.value })
                    }
                  />
                ))}
              </FwChips>
            </FwPanel>
          ) : null}
          {punchStep === "revue" ? (
            <FwPanel aria-label="Revue">
              <FwPanelHead
                title="Revue avant enregistrement"
                description="Vérifiez les horaires corrigés."
              />
              <FwReview>
                <FwReviewCard
                  title="Pointage"
                  rows={[
                    { label: "Agent", value: punchDraft.employeeName },
                    {
                      label: "Prévu",
                      value: `${punchDraft.plannedIn || "—"} → ${punchDraft.plannedOut || "—"}`,
                    },
                    {
                      label: "Réel",
                      value: `${punchDraft.actualIn || "—"} → ${punchDraft.actualOut || "—"}`,
                    },
                    { label: "Mode", value: punchDraft.mode },
                    { label: "Note", value: punchDraft.note || "—" },
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

function PunchDetail({
  punch,
  actorName,
  agentMode,
  canSupervise,
  busy,
  geoEnabled,
  anomalyReason,
  onAnomalyReason,
  onPunchIn,
  onPunchOut,
  onValidate,
  onNote,
  onFlagAnomaly,
  onCorrectPunch,
}: {
  punch: PointagePunch;
  actorName: string;
  agentMode: boolean;
  canSupervise: boolean;
  busy: boolean;
  geoEnabled: boolean;
  anomalyReason: string;
  onAnomalyReason: (v: string) => void;
  onPunchIn: () => void;
  onPunchOut: () => void;
  onValidate: (pendingNote?: string) => void;
  onNote: (note: string) => void;
  onFlagAnomaly: () => void;
  onCorrectPunch?: () => void;
}) {
  const [note, setNote] = useState(punch.note);

  useEffect(() => {
    setNote(punch.note);
  }, [punch.id, punch.note]);

  return (
    <div className="pointage-detail__inner">
      <header className="pointage-detail__head">
        <div>
          <p className="pointage-detail__eyebrow">
            {punch.mode}
            {geoEnabled ? " · géo applicable" : ""}
          </p>
          <h3>{punch.employeeName}</h3>
          <p>
            {punch.site}
            {punch.planningSlotId
              ? ` · créneau ${punch.planningSlotId}`
              : " · hors planning"}
          </p>
        </div>
        <StatusBadge tone={toneForStatus(punch.status)}>
          {punch.status}
        </StatusBadge>
      </header>

      {!agentMode && onCorrectPunch ? (
        <div className="pointage-detail__admin-actions">
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            onClick={onCorrectPunch}
          >
            Corriger horaires
          </button>
        </div>
      ) : null}

      <div className="pointage-detail__plan">
        <div>
          <span>Planning</span>
          <strong>
            {punch.plannedIn} – {punch.plannedOut}
          </strong>
        </div>
        <div>
          <span>Mode</span>
          <strong>{punch.mode}</strong>
        </div>
        <div>
          <span>Durée</span>
          <strong>{workedHours(punch)}</strong>
        </div>
      </div>

      <div className="pointage-detail__punch">
        <div className={`pointage-slot${punch.actualIn ? " is-done" : ""}`}>
          <span>Arrivée réelle</span>
          <strong>{punch.actualIn ?? "En attente"}</strong>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            disabled={busy || Boolean(punch.actualIn)}
            onClick={onPunchIn}
          >
            Pointer arrivée
          </button>
        </div>
        <div className={`pointage-slot${punch.actualOut ? " is-done" : ""}`}>
          <span>Départ réel</span>
          <strong>{punch.actualOut ?? "En attente"}</strong>
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            disabled={busy || !punch.actualIn || Boolean(punch.actualOut)}
            onClick={onPunchOut}
          >
            Pointer départ
          </button>
        </div>
      </div>

      {punch.anomaly && punch.anomaly !== "Aucune" ? (
        <p className="pointage-detail__warn">{punch.anomaly}</p>
      ) : (
        <p className="pointage-detail__ok">Aucune anomalie détectée</p>
      )}

      {(punch.geoIn || punch.geoOut) && geoEnabled ? (
        <p className="pointage-detail__ok">
          Géo arrivée{" "}
          {punch.geoIn
            ? `${punch.geoIn.lat.toFixed(4)}, ${punch.geoIn.lng.toFixed(4)}`
            : "—"}{" "}
          · départ{" "}
          {punch.geoOut
            ? `${punch.geoOut.lat.toFixed(4)}, ${punch.geoOut.lng.toFixed(4)}`
            : "—"}
        </p>
      ) : null}

      {canSupervise && !agentMode ? (
        <div className="pointage-anomaly-row">
          <input
            placeholder="Motif anomalie…"
            value={anomalyReason}
            onChange={(e) => onAnomalyReason(e.target.value)}
          />
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            disabled={busy || !anomalyReason.trim()}
            onClick={onFlagAnomaly}
          >
            Signaler
          </button>
        </div>
      ) : null}

      {!agentMode ? (
        <label className="doc-field">
          <span>Commentaire superviseur</span>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onNote(note)}
            placeholder="Observation, justification retard…"
          />
        </label>
      ) : null}

      {!agentMode ? (
        <div className="pointage-detail__footer">
          <span>
            {punch.validatedBy
              ? `Validé par ${punch.validatedBy}`
              : `Validateur : ${actorName}`}
          </span>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            disabled={
              busy ||
              !punch.actualIn ||
              !punch.actualOut ||
              punch.status === "Validé"
            }
            onClick={() => onValidate(note)}
          >
            Valider
          </button>
        </div>
      ) : punch.validatedBy ? (
        <p className="pointage-detail__ok">Validé par {punch.validatedBy}</p>
      ) : null}

      {punch.history.length > 0 ? (
        <ol className="pointage-history">
          {punch.history.slice(0, 8).map((h) => (
            <li key={h.id}>
              <time>{new Date(h.at).toLocaleString("fr-FR")}</time>
              <span>
                {h.byName} — {h.detail}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
