"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  IconArrow,
  IconCalendar,
  IconClipboard,
  IconClose,
  IconMore,
  IconQuality,
  IconSearch,
  IconUser,
} from "@/components/admin/Icons";
import { DashboardRequests } from "@/components/admin/DashboardRequests";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { ModuleHeader } from "@/components/admin/Ui";
import { downloadCsv } from "@/lib/download";
import { toast } from "@/lib/toast";

type MissionTone = "ok" | "danger" | "info";

type Mission = {
  id: string;
  site: string;
  type: string;
  status: string;
  day: number;
  date: string;
  dateLabel: string;
  time: string;
  tone: MissionTone;
};

type Period = "mensuel" | "hebdo";

type EffectifKpi = {
  agents: number;
  chefs: number;
  recrut: number;
};

type PlanningSlotApi = {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  siteName?: string;
  clientName?: string;
  prestationLabel?: string;
  requiredStaff?: number;
  assignments?: Array<{ status?: string }>;
  alerts?: string[];
};

type FieldAgentApi = {
  id: string;
  role?: string;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function periodRange(period: Period): { from: string; to: string } {
  const now = new Date();
  if (period === "hebdo") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: isoDate(monday), to: isoDate(sunday) };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: isoDate(from), to: isoDate(to) };
}

function daysInRange(from: string, to: string): number[] {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const days: number[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(cursor.getDate());
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function slotToMission(slot: PlanningSlotApi): Mission {
  const d = new Date(`${slot.date}T12:00:00`);
  const day = Number.isNaN(d.getTime()) ? 0 : d.getDate();
  const dateLabel = Number.isNaN(d.getTime())
    ? slot.date
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const alerts = Array.isArray(slot.alerts) ? slot.alerts : [];
  const required = Number(slot.requiredStaff) || 0;
  const assigned = (slot.assignments ?? []).filter(
    (a) => a.status !== "absent",
  ).length;
  const hasAlert = alerts.length > 0;
  const tone: MissionTone = hasAlert
    ? "danger"
    : required > 0 && assigned >= required
      ? "ok"
      : "info";
  let status = "Planifié";
  if (hasAlert) {
    if (alerts.includes("absence")) status = "Absence";
    else if (alerts.includes("sous_effectif")) status = "Sous-effectif";
    else if (alerts.includes("conflit")) status = "Conflit";
    else status = "Alerte";
  } else if (required > 0 && assigned >= required) {
    status = "Confirmé";
  }
  return {
    id: slot.id,
    site: slot.siteName || slot.clientName || "Site",
    type: slot.prestationLabel || "Prestation",
    status,
    day,
    date: slot.date,
    dateLabel,
    time: slot.startTime || "—",
    tone,
  };
}

function exportMissionsCsv(missions: Mission[], period: Period) {
  const rows: string[][] = [
    ["Site", "Prestation", "Statut", "Date", "Heure"],
    ...missions.map((m) => [m.site, m.type, m.status, m.dateLabel, m.time]),
  ];
  downloadCsv(
    rows,
    `necs-missions-${period}-${new Date().toISOString().slice(0, 10)}`,
  );
}

export function DashboardWorkspace() {
  const [period, setPeriod] = useState<Period>("mensuel");
  const [query, setQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(true);
  const [openMissionId, setOpenMissionId] = useState<string | null>(null);
  const [menuMissionId, setMenuMissionId] = useState<string | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionsError, setMissionsError] = useState<string | null>(null);
  const [calendarDays, setCalendarDays] = useState<number[]>([]);
  const [effectif, setEffectif] = useState<EffectifKpi | null>(null);
  const [pipelineKpi, setPipelineKpi] = useState<{
    openCount: number;
    weightedValue: number;
    totalValue: number;
    overdueCount: number;
  } | null>(null);
  const [satisfactionKpi, setSatisfactionKpi] = useState<{
    rate: number | null;
    delta: number | null;
    plansOpen: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = periodRange(period);
    setCalendarDays(daysInRange(from, to));
    setMissionsLoading(true);
    setMissionsError(null);

    void (async () => {
      try {
        const [pipeRes, satRes, planRes, recrutRes] = await Promise.all([
          fetch("/api/pipeline", { cache: "no-store" }),
          fetch("/api/satisfaction?view=dashboard", { cache: "no-store" }),
          fetch(`/api/ops-planning?from=${from}&to=${to}`, {
            cache: "no-store",
            credentials: "same-origin",
          }),
          fetch("/api/recrutement?meta=1", {
            cache: "no-store",
            credentials: "same-origin",
          }),
        ]);

        if (pipeRes.ok) {
          const data = (await pipeRes.json()) as {
            dashboard?: {
              openCount: number;
              weightedValue: number;
              totalValue: number;
              overdueCount: number;
            };
          };
          if (!cancelled && data.dashboard) {
            setPipelineKpi({
              openCount: data.dashboard.openCount,
              weightedValue: data.dashboard.weightedValue,
              totalValue: data.dashboard.totalValue,
              overdueCount: data.dashboard.overdueCount,
            });
          }
        }

        if (satRes.ok) {
          const data = (await satRes.json()) as {
            dashboard?: {
              satisfactionRate: number | null;
              deltaPoints: number | null;
              plansOpen: number;
            };
          };
          if (!cancelled && data.dashboard) {
            setSatisfactionKpi({
              rate: data.dashboard.satisfactionRate,
              delta: data.dashboard.deltaPoints,
              plansOpen: data.dashboard.plansOpen,
            });
          }
        }

        let agents = 0;
        let chefs = 0;
        if (planRes.ok) {
          const data = (await planRes.json()) as {
            slots?: PlanningSlotApi[];
            agents?: FieldAgentApi[];
            error?: string;
          };
          const mapped = (data.slots ?? []).map(slotToMission);
          if (!cancelled) {
            setMissions(mapped);
            setMissionsLoading(false);
          }
          const field = data.agents ?? [];
          agents = field.filter((a) => a.role === "nettoyeur").length;
          chefs = field.filter((a) => a.role === "ops").length;
        } else if (!cancelled) {
          setMissions([]);
          setMissionsLoading(false);
          if (planRes.status === 403) {
            setMissionsError("Planning réservé aux rôles opérations / RH.");
          } else if (planRes.status === 503) {
            setMissionsError("Base de données indisponible.");
          } else {
            setMissionsError("Impossible de charger le planning.");
          }
        }

        let recrut = 0;
        if (recrutRes.ok) {
          const data = (await recrutRes.json()) as {
            counts?: Record<string, number>;
          };
          recrut = Object.values(data.counts ?? {}).reduce(
            (sum, n) => sum + (Number(n) || 0),
            0,
          );
        }

        if (!cancelled && (planRes.ok || recrutRes.ok)) {
          setEffectif({ agents, chefs, recrut });
        }
      } catch {
        if (!cancelled) {
          setMissions([]);
          setMissionsLoading(false);
          setMissionsError("Impossible de charger le tableau de bord.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [period]);

  useEffect(() => {
    if (!openMissionId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMissionId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [openMissionId]);

  const filtered = useMemo(() => {
    let list = missions;
    if (!showAll && selectedDay != null) {
      list = list.filter((m) => m.day === selectedDay);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.site.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q) ||
          m.status.toLowerCase().includes(q),
      );
    }
    return list;
  }, [missions, period, query, selectedDay, showAll]);

  const pipeKpi = pipelineKpi ?? {
    openCount: 0,
    weightedValue: 0,
    totalValue: 0,
    overdueCount: 0,
  };
  const satKpi = satisfactionKpi ?? {
    rate: null as number | null,
    delta: null as number | null,
    plansOpen: 0,
  };
  const pipelineReady = pipelineKpi != null;
  const openMission = missions.find((m) => m.id === openMissionId) ?? null;
  const dangerMissions = missions.filter((m) => m.tone === "danger");
  const effectifTotal = effectif
    ? effectif.agents + effectif.chefs
    : null;

  function onExport() {
    exportMissionsCsv(filtered.length ? filtered : missions, period);
    toast.success(
      `Export CSV · ${filtered.length || missions.length} mission${
        (filtered.length || missions.length) > 1 ? "s" : ""
      }`,
    );
  }

  function onPickDay(day: number) {
    setSelectedDay(day);
    setShowAll(false);
    setMenuMissionId(null);
  }

  return (
    <div className="leads-page symp-dash doc-workspace">
      <ModuleHeader
        tone="#0a3a72"
        badge={
          period === "mensuel"
            ? "Pilotage · Vue mensuelle"
            : "Pilotage · Vue hebdo"
        }
        title="Tableau de bord"
        description="Synthèse opérationnelle et accès rapides aux hubs métier."
        meta={
          <>
            <span>
              Synthèse <strong>opérationnelle</strong>
            </span>
            <span>
              Période{" "}
              <strong>{period === "mensuel" ? "mensuelle" : "hebdo"}</strong>
            </span>
          </>
        }
        actions={
          <div className="module-header__tools">
            <label className="symp-search">
              <IconSearch size={16} />
              <input
                placeholder="Site, prestation, statut…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher un site ou une prestation"
              />
            </label>
            <div
              className="module-header__btns dash-period"
              role="group"
              aria-label="Période"
            >
              <button
                type="button"
                className={`btn-admin${period === "mensuel" ? " btn-admin--primary" : " btn-admin--ghost"}`}
                aria-pressed={period === "mensuel"}
                onClick={() => {
                  setPeriod("mensuel");
                  setShowAll(true);
                  setSelectedDay(null);
                }}
              >
                Mensuel
              </button>
              <button
                type="button"
                className={`btn-admin${period === "hebdo" ? " btn-admin--primary" : " btn-admin--ghost"}`}
                aria-pressed={period === "hebdo"}
                onClick={() => {
                  setPeriod("hebdo");
                  setSelectedDay(null);
                  setShowAll(true);
                }}
              >
                Hebdo
              </button>
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={onExport}
              >
                Exporter
              </button>
            </div>
          </div>
        }
      />

      <nav className="dash-shortcuts" aria-label="Accès rapides">
        <Link href="/admin/commercial" className="dash-shortcut">
          CRM
        </Link>
        <Link href="/admin/pipeline" className="dash-shortcut">
          Pipeline
        </Link>
        <Link href="/admin/operations?tab=missions" className="dash-shortcut">
          Missions
        </Link>
        <Link
          href="/admin/operations?tab=planification"
          className="dash-shortcut"
        >
          Planning
        </Link>
        <Link href="/admin/demandes" className="dash-shortcut">
          Demandes
        </Link>
        <Link href="/admin/rh" className="dash-shortcut">
          RH
        </Link>
        <Link href="/admin/finance" className="dash-shortcut">
          Finance
        </Link>
        <Link href="/admin/qualite" className="dash-shortcut">
          Qualité
        </Link>
      </nav>

      {((pipelineKpi?.overdueCount ?? 0) > 0 || dangerMissions.length > 0) && (
        <div className="dash-attention" role="status">
          <strong>À traiter</strong>
          <ul>
            {pipelineKpi && pipelineKpi.overdueCount > 0 ? (
              <li>
                <Link href="/admin/pipeline">
                  {pipelineKpi.overdueCount} échéance
                  {pipelineKpi.overdueCount > 1 ? "s" : ""} pipeline dépassée
                  {pipelineKpi.overdueCount > 1 ? "s" : ""}
                </Link>
              </li>
            ) : null}
            {dangerMissions.slice(0, 5).map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="dash-attention__link"
                  onClick={() => {
                    setSelectedDay(m.day);
                    setShowAll(false);
                    setOpenMissionId(m.id);
                  }}
                >
                  {m.status} · {m.site} ({m.dateLabel})
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="symp-kpis dash-kpis" aria-label="Indicateurs clés">
        <article
          className="symp-kpi dash-kpi"
          style={{ ["--kpi-c" as string]: "#0369a1" }}
        >
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconClipboard size={18} />
            </span>
            <span className="symp-kpi__hint">Commercial</span>
          </div>
          <h3>Pipeline pondéré</h3>
          <div className="symp-kpi__value">
            <strong>
              {pipelineReady
                ? `${(pipeKpi.weightedValue / 1_000_000).toLocaleString("fr-FR", {
                    maximumFractionDigits: 1,
                  })} M`
                : "—"}
            </strong>
            <em className={pipeKpi.overdueCount ? "down" : "up"}>
              {pipelineReady ? `${pipeKpi.openCount} opp.` : "…"}
            </em>
          </div>
          <p className="dash-kpi__foot">
            {pipelineReady ? (
              <>
                Brut{" "}
                {(pipeKpi.totalValue / 1_000_000).toLocaleString("fr-FR", {
                  maximumFractionDigits: 1,
                })}{" "}
                M · <Link href="/admin/pipeline">Ouvrir</Link>
              </>
            ) : (
              <>
                Chargement… · <Link href="/admin/pipeline">Ouvrir</Link>
              </>
            )}
          </p>
        </article>

        <article
          className="symp-kpi dash-kpi"
          style={{ ["--kpi-c" as string]: "#1260a8" }}
        >
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconCalendar size={18} />
            </span>
            <span className="symp-kpi__hint">
              {period === "mensuel" ? "Ce mois" : "Cette semaine"}
            </span>
          </div>
          <h3>Missions</h3>
          <div className="symp-kpi__value">
            <strong>{missionsLoading ? "…" : String(missions.length)}</strong>
            {dangerMissions.length > 0 ? (
              <em className="down">
                {dangerMissions.length} alerte
                {dangerMissions.length > 1 ? "s" : ""}
              </em>
            ) : (
              <em className="up">{missionsLoading ? "…" : "OK"}</em>
            )}
          </div>
          <p className="dash-kpi__foot">
            {missions.filter((m) => m.tone === "ok").length} confirmées ·{" "}
            {missions.filter((m) => m.tone === "info").length} planifiées
          </p>
        </article>

        <article
          className="symp-kpi dash-kpi"
          style={{ ["--kpi-c" as string]: "#0f766e" }}
          data-testid="dash-satisfaction-kpi"
        >
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconQuality size={18} />
            </span>
            <span className="symp-kpi__hint">
              {satKpi.plansOpen
                ? `${satKpi.plansOpen} plan${satKpi.plansOpen > 1 ? "s" : ""}`
                : "Qualité"}
            </span>
          </div>
          <h3>Satisfaction</h3>
          <div className="symp-kpi__value">
            <strong>
              {satKpi.rate == null ? "—" : `${Math.round(satKpi.rate)}%`}
            </strong>
            {satKpi.delta == null ? (
              <em className="muted">n/d</em>
            ) : (
              <em className={satKpi.delta >= 0 ? "up" : "down"}>
                {satKpi.delta >= 0 ? "+" : ""}
                {satKpi.delta} pts
              </em>
            )}
          </div>
          <p className="dash-kpi__foot">
            <Link href="/admin/qualite">Ouvrir qualité</Link>
          </p>
        </article>

        <article
          className="symp-kpi dash-kpi"
          style={{ ["--kpi-c" as string]: "#0a3a72" }}
        >
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconUser size={18} />
            </span>
            <span className="symp-kpi__hint">RH / Ops</span>
          </div>
          <h3>Effectif terrain</h3>
          <div className="symp-kpi__value">
            <strong>
              {effectifTotal == null ? "—" : String(effectifTotal)}
            </strong>
            {effectif && effectif.recrut > 0 ? (
              <em className="up">+{effectif.recrut} recrut.</em>
            ) : (
              <em className="muted">n/d</em>
            )}
          </div>
          {effectif ? (
            <>
              <div className="symp-stackbar dash-kpi__stack" aria-hidden>
                <span
                  style={{ flex: Math.max(effectif.agents, 1) }}
                  title="Agents"
                />
                <span
                  style={{ flex: Math.max(effectif.chefs, 1) }}
                  title="Chefs"
                />
                <span
                  style={{ flex: Math.max(effectif.recrut, 1) }}
                  title="Recrutement"
                />
              </div>
              <p className="dash-kpi__foot">
                {effectif.agents} agents · {effectif.chefs} chefs ·{" "}
                {effectif.recrut} recrut.
              </p>
            </>
          ) : (
            <p className="dash-kpi__foot">Chargement effectif…</p>
          )}
        </article>
      </section>

      <DashboardCharts period={period} missions={missions} />

      <div className="symp-grid">
        <section className="symp-panel symp-panel--missions">
          <header className="symp-panel__head">
            <div>
              <h2>Missions à venir</h2>
              <p>
                {missionsLoading
                  ? "Chargement du planning…"
                  : missionsError
                    ? missionsError
                    : showAll || selectedDay == null
                      ? `Planning terrain · ${filtered.length} mission${filtered.length > 1 ? "s" : ""}`
                      : `Jour ${selectedDay} · ${filtered.length} mission${filtered.length > 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              type="button"
              className="symp-link"
              onClick={() => {
                setShowAll((v) => !v);
                if (!showAll) setSelectedDay(null);
                else if (calendarDays.length)
                  setSelectedDay(calendarDays[0] ?? null);
                setMenuMissionId(null);
              }}
            >
              {showAll ? "Filtrer par jour" : "Voir tout"}
            </button>
          </header>

          <div className="symp-dates">
            <div className="symp-dates__legend">
              <span>
                <i className="dot d2" />
                Disponible
              </span>
              <span>
                <i className="dot d1" />
                Sélectionné
              </span>
            </div>
            <div className="symp-dates__row">
              {calendarDays.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`symp-date${selectedDay === d && !showAll ? " is-selected" : ""}`}
                  aria-pressed={selectedDay === d && !showAll}
                  onClick={() => onPickDay(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="symp-table-wrap">
            {missionsLoading ? (
              <p className="symp-empty">Chargement des missions…</p>
            ) : filtered.length === 0 ? (
              <p className="symp-empty">
                {missionsError || "Aucune mission pour ce filtre."}
                {query ? " Essayez une autre recherche." : null}
              </p>
            ) : (
              <>
                <table className="symp-table">
                  <thead>
                    <tr>
                      <th>Site / Client</th>
                      <th>Prestation</th>
                      <th>Statut</th>
                      <th>Date</th>
                      <th>Heure</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className="symp-person">
                            <span className="dash-avatar sm">
                              {m.site.slice(0, 1)}
                            </span>
                            <strong>{m.site}</strong>
                          </div>
                        </td>
                        <td className="symp-muted">{m.type}</td>
                        <td>
                          <span className={`symp-status tone-${m.tone}`}>
                            <i />
                            {m.status}
                          </span>
                        </td>
                        <td>{m.dateLabel}</td>
                        <td className="symp-time">{m.time}</td>
                        <td>
                          <div className="symp-row-actions">
                            <button
                              type="button"
                              className="symp-round"
                              aria-label={`Ouvrir ${m.site}`}
                              onClick={() => {
                                setOpenMissionId(m.id);
                                setMenuMissionId(null);
                              }}
                            >
                              <IconArrow size={16} />
                            </button>
                            <div className="symp-more-wrap">
                              <button
                                type="button"
                                className="symp-more"
                                aria-label={`Actions ${m.site}`}
                                aria-expanded={menuMissionId === m.id}
                                onClick={() =>
                                  setMenuMissionId((id) =>
                                    id === m.id ? null : m.id,
                                  )
                                }
                              >
                                <IconMore size={16} />
                              </button>
                              {menuMissionId === m.id ? (
                                <div className="symp-more-menu" role="menu">
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMissionId(m.id);
                                      setMenuMissionId(null);
                                    }}
                                  >
                                    Détail mission
                                  </button>
                                  <Link
                                    href="/admin/operations?tab=planification"
                                    role="menuitem"
                                    onClick={() => setMenuMissionId(null)}
                                  >
                                    Ouvrir le planning
                                  </Link>
                                  <Link
                                    href="/admin/operations?tab=pointage"
                                    role="menuitem"
                                    onClick={() => setMenuMissionId(null)}
                                  >
                                    Pointage
                                  </Link>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="symp-missions-mobile" aria-label="Missions">
                  {filtered.map((m) => (
                    <article key={`m-${m.id}`} className="symp-mission-card">
                      <div className="symp-mission-card__top">
                        <div className="symp-person">
                          <span className="dash-avatar sm">
                            {m.site.slice(0, 1)}
                          </span>
                          <div>
                            <strong>{m.site}</strong>
                            <span>{m.type}</span>
                          </div>
                        </div>
                        <div className="symp-row-actions">
                          <button
                            type="button"
                            className="symp-round"
                            aria-label={`Ouvrir ${m.site}`}
                            onClick={() => setOpenMissionId(m.id)}
                          >
                            <IconArrow size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="symp-mission-card__meta">
                        <span className={`symp-status tone-${m.tone}`}>
                          <i />
                          {m.status}
                        </span>
                        <span>{m.dateLabel}</span>
                        <span>{m.time}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <DashboardRequests />
      </div>

      {openMission ? (
        <div
          className="symp-modal-backdrop"
          role="presentation"
          onClick={() => setOpenMissionId(null)}
        >
          <div
            className="symp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mission-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="symp-modal__head">
              <div>
                <p className="symp-modal__eyebrow">Mission</p>
                <h2 id="mission-dialog-title">{openMission.site}</h2>
              </div>
              <button
                type="button"
                className="symp-modal__close"
                aria-label="Fermer"
                onClick={() => setOpenMissionId(null)}
              >
                <IconClose size={18} />
              </button>
            </header>
            <div className="symp-modal__body">
              <p>
                <strong>Prestation</strong>
                <span>{openMission.type}</span>
              </p>
              <p>
                <strong>Statut</strong>
                <span className={`symp-status tone-${openMission.tone}`}>
                  <i />
                  {openMission.status}
                </span>
              </p>
              <p>
                <strong>Date</strong>
                <span>
                  {openMission.dateLabel} · {openMission.time}
                </span>
              </p>
            </div>
            <footer className="symp-modal__foot">
              <Link
                href="/admin/operations?tab=planification"
                className="symp-btn symp-btn--ghost"
                onClick={() => setOpenMissionId(null)}
              >
                Planning
              </Link>
              <Link
                href="/admin/operations?tab=pointage"
                className="symp-btn symp-btn--primary"
                onClick={() => setOpenMissionId(null)}
              >
                Voir le pointage
              </Link>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
