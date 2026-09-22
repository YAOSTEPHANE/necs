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
  dateLabel: string;
  time: string;
  tone: MissionTone;
};

const ALL_MISSIONS: Mission[] = [
  {
    id: "m1",
    site: "Immeuble Horizon",
    type: "Entretien quotidien",
    status: "Confirmé",
    day: 14,
    dateLabel: "14 sep.",
    time: "06:00",
    tone: "ok",
  },
  {
    id: "m2",
    site: "Usine Bassa",
    type: "Nettoyage atelier",
    status: "Confirmé",
    day: 15,
    dateLabel: "15 sep.",
    time: "14:00",
    tone: "ok",
  },
  {
    id: "m3",
    site: "Mall Riviera",
    type: "Vitrerie + sols",
    status: "Anomalie",
    day: 18,
    dateLabel: "18 sep.",
    time: "22:00",
    tone: "danger",
  },
  {
    id: "m4",
    site: "Banque Centrale",
    type: "Contrôle qualité",
    status: "Planifié",
    day: 22,
    dateLabel: "22 sep.",
    time: "09:30",
    tone: "info",
  },
  {
    id: "m5",
    site: "Clinique Palmiers",
    type: "Désinfection zones",
    status: "Confirmé",
    day: 22,
    dateLabel: "22 sep.",
    time: "07:00",
    tone: "ok",
  },
  {
    id: "m6",
    site: "Tour Akwa",
    type: "Entretien bureaux",
    status: "Planifié",
    day: 24,
    dateLabel: "24 sep.",
    time: "08:00",
    tone: "info",
  },
  {
    id: "m7",
    site: "Hôtel Palm Beach",
    type: "Nettoyage chambres",
    status: "Confirmé",
    day: 27,
    dateLabel: "27 sep.",
    time: "10:00",
    tone: "ok",
  },
  {
    id: "m8",
    site: "Centre médical Bonanjo",
    type: "Désinfection",
    status: "Confirmé",
    day: 29,
    dateLabel: "29 sep.",
    time: "06:30",
    tone: "ok",
  },
  {
    id: "m9",
    site: "Siège MTN Douala",
    type: "Entretien bureaux",
    status: "Confirmé",
    day: 14,
    dateLabel: "14 sep.",
    time: "07:30",
    tone: "ok",
  },
  {
    id: "m10",
    site: "Port autonome",
    type: "Nettoyage industriel",
    status: "Planifié",
    day: 15,
    dateLabel: "15 sep.",
    time: "05:30",
    tone: "info",
  },
  {
    id: "m11",
    site: "Carrefour Market Akwa",
    type: "Sols + sanitaires",
    status: "Confirmé",
    day: 16,
    dateLabel: "16 sep.",
    time: "21:00",
    tone: "ok",
  },
  {
    id: "m12",
    site: "Clinique de la Côte",
    type: "Bio-désinfection",
    status: "Confirmé",
    day: 16,
    dateLabel: "16 sep.",
    time: "06:00",
    tone: "ok",
  },
  {
    id: "m13",
    site: "Immeuble Sawa",
    type: "Entretien quotidien",
    status: "Anomalie",
    day: 17,
    dateLabel: "17 sep.",
    time: "06:15",
    tone: "danger",
  },
  {
    id: "m14",
    site: "Atelier Sodéco",
    type: "Nettoyage atelier",
    status: "Confirmé",
    day: 17,
    dateLabel: "17 sep.",
    time: "13:00",
    tone: "ok",
  },
  {
    id: "m15",
    site: "Banque Atlantique",
    type: "Contrôle qualité",
    status: "Confirmé",
    day: 18,
    dateLabel: "18 sep.",
    time: "08:00",
    tone: "ok",
  },
  {
    id: "m16",
    site: "Hôtel Onomo",
    type: "Nettoyage chambres",
    status: "Planifié",
    day: 19,
    dateLabel: "19 sep.",
    time: "09:00",
    tone: "info",
  },
  {
    id: "m17",
    site: "Tour Tradex",
    type: "Vitrerie façade",
    status: "Confirmé",
    day: 20,
    dateLabel: "20 sep.",
    time: "07:00",
    tone: "ok",
  },
  {
    id: "m18",
    site: "Usine Cimencam",
    type: "Nettoyage industriel",
    status: "Confirmé",
    day: 20,
    dateLabel: "20 sep.",
    time: "15:00",
    tone: "ok",
  },
  {
    id: "m19",
    site: "Mall Douala Grand Mall",
    type: "Vitrerie + sols",
    status: "Planifié",
    day: 21,
    dateLabel: "21 sep.",
    time: "22:30",
    tone: "info",
  },
  {
    id: "m20",
    site: "Immeuble Pacifique",
    type: "Entretien bureaux",
    status: "Confirmé",
    day: 21,
    dateLabel: "21 sep.",
    time: "06:45",
    tone: "ok",
  },
  {
    id: "m21",
    site: "Clinique Fouda",
    type: "Désinfection zones",
    status: "Anomalie",
    day: 23,
    dateLabel: "23 sep.",
    time: "05:45",
    tone: "danger",
  },
  {
    id: "m22",
    site: "Siège Orange CM",
    type: "Entretien quotidien",
    status: "Confirmé",
    day: 23,
    dateLabel: "23 sep.",
    time: "07:15",
    tone: "ok",
  },
  {
    id: "m23",
    site: "Commerce Bonapriso",
    type: "Sols + sanitaires",
    status: "Confirmé",
    day: 24,
    dateLabel: "24 sep.",
    time: "20:00",
    tone: "ok",
  },
  {
    id: "m24",
    site: "Banque BICEC",
    type: "Contrôle qualité",
    status: "Planifié",
    day: 25,
    dateLabel: "25 sep.",
    time: "09:00",
    tone: "info",
  },
  {
    id: "m25",
    site: "Atelier Metalcam",
    type: "Nettoyage atelier",
    status: "Confirmé",
    day: 25,
    dateLabel: "25 sep.",
    time: "14:30",
    tone: "ok",
  },
  {
    id: "m26",
    site: "Hôtel Pullman",
    type: "Nettoyage chambres",
    status: "Confirmé",
    day: 26,
    dateLabel: "26 sep.",
    time: "10:30",
    tone: "ok",
  },
  {
    id: "m27",
    site: "Centre médical Deido",
    type: "Bio-désinfection",
    status: "Planifié",
    day: 27,
    dateLabel: "27 sep.",
    time: "06:00",
    tone: "info",
  },
  {
    id: "m28",
    site: "Immeuble Plateau",
    type: "Entretien bureaux",
    status: "Confirmé",
    day: 28,
    dateLabel: "28 sep.",
    time: "07:00",
    tone: "ok",
  },
  {
    id: "m29",
    site: "Usine Alucam",
    type: "Nettoyage industriel",
    status: "Anomalie",
    day: 28,
    dateLabel: "28 sep.",
    time: "16:00",
    tone: "danger",
  },
  {
    id: "m30",
    site: "Mall City Center",
    type: "Vitrerie + sols",
    status: "Confirmé",
    day: 29,
    dateLabel: "29 sep.",
    time: "21:30",
    tone: "ok",
  },
  {
    id: "m31",
    site: "Tour Century",
    type: "Entretien quotidien",
    status: "Planifié",
    day: 30,
    dateLabel: "30 sep.",
    time: "06:30",
    tone: "info",
  },
  {
    id: "m32",
    site: "Clinique Laquintinie",
    type: "Désinfection zones",
    status: "Confirmé",
    day: 30,
    dateLabel: "30 sep.",
    time: "05:30",
    tone: "ok",
  },
];

const DATES = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
const OFF_DAYS = new Set<number>([]);

type Period = "mensuel" | "hebdo";

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
  const [selectedDay, setSelectedDay] = useState<number | null>(22);
  const [showAll, setShowAll] = useState(false);
  const [openMissionId, setOpenMissionId] = useState<string | null>(null);
  const [menuMissionId, setMenuMissionId] = useState<string | null>(null);
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
    void (async () => {
      try {
        const [pipeRes, satRes] = await Promise.all([
          fetch("/api/pipeline", { cache: "no-store" }),
          fetch("/api/satisfaction?view=dashboard", { cache: "no-store" }),
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
      } catch {
        /* dashboard optionnel */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    const q = query.trim().toLowerCase();
    let list = ALL_MISSIONS;
    if (period === "hebdo") {
      list = list.filter((m) => m.day >= 14 && m.day <= 20);
    }
    if (selectedDay != null && !showAll) {
      list = list.filter((m) => m.day === selectedDay);
    }
    if (q) {
      list = list.filter(
        (m) =>
          m.site.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q) ||
          m.status.toLowerCase().includes(q),
      );
    }
    return list;
  }, [period, query, selectedDay, showAll]);

  const demoPipelineKpi = {
    openCount: 28,
    weightedValue: 74_400_000,
    totalValue: 186_000_000,
    overdueCount: 4,
  };
  const demoSatisfactionKpi = {
    rate: 92,
    delta: 2.4,
    plansOpen: 6,
  };
  const pipeKpi = pipelineKpi ?? demoPipelineKpi;
  const satKpi = satisfactionKpi ?? demoSatisfactionKpi;
  const openMission = ALL_MISSIONS.find((m) => m.id === openMissionId) ?? null;

  function onExport() {
    exportMissionsCsv(filtered.length ? filtered : ALL_MISSIONS, period);
    toast.success(
      `Export CSV · ${filtered.length || ALL_MISSIONS.length} mission${
        (filtered.length || ALL_MISSIONS.length) > 1 ? "s" : ""
      }`,
    );
  }

  function onPickDay(day: number) {
    if (OFF_DAYS.has(day)) {
      toast.warning(`Le ${day} sep. est indisponible`);
      return;
    }
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
            <div className="module-header__btns dash-period" role="group" aria-label="Période">
              <button
                type="button"
                className={`btn-admin${period === "mensuel" ? " btn-admin--primary" : " btn-admin--ghost"}`}
                aria-pressed={period === "mensuel"}
                onClick={() => {
                  setPeriod("mensuel");
                  setShowAll(false);
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

      {(pipelineKpi?.overdueCount ||
        ALL_MISSIONS.some((m) => m.tone === "danger")) && (
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
            {ALL_MISSIONS.filter((m) => m.tone === "danger").map((m) => (
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
                  Anomalie · {m.site} ({m.dateLabel})
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
              {(pipeKpi.weightedValue / 1_000_000).toLocaleString("fr-FR", {
                maximumFractionDigits: 1,
              })}{" "}
              M
            </strong>
            <em className={pipeKpi.overdueCount ? "down" : "up"}>
              {pipeKpi.openCount} opp.
            </em>
          </div>
          <p className="dash-kpi__foot">
            Brut{" "}
            {(pipeKpi.totalValue / 1_000_000).toLocaleString("fr-FR", {
              maximumFractionDigits: 1,
            })}{" "}
            M · <Link href="/admin/pipeline">Ouvrir</Link>
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
            <strong>
              {period === "mensuel"
                ? String(ALL_MISSIONS.length)
                : String(
                    ALL_MISSIONS.filter((m) => m.day >= 14 && m.day <= 20)
                      .length,
                  )}
            </strong>
            {ALL_MISSIONS.some((m) => m.tone === "danger") ? (
              <em className="down">
                {ALL_MISSIONS.filter((m) => m.tone === "danger").length}{" "}
                anomalie
                {ALL_MISSIONS.filter((m) => m.tone === "danger").length > 1
                  ? "s"
                  : ""}
              </em>
            ) : (
              <em className="up">OK</em>
            )}
          </div>
          <p className="dash-kpi__foot">
            {ALL_MISSIONS.filter((m) => m.tone === "ok").length} confirmées ·{" "}
            {ALL_MISSIONS.filter((m) => m.tone === "info").length} planifiées
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
            <Link href="/admin/operations?tab=qualite&feature=satisfaction">
              Voir le détail →
            </Link>
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
            <strong>214</strong>
            <em className="up">+12</em>
          </div>
          <div className="symp-stackbar dash-kpi__stack" aria-hidden>
            <span style={{ flex: 148 }} title="Agents" />
            <span style={{ flex: 42 }} title="Chefs" />
            <span style={{ flex: 24 }} title="Recrutement" />
          </div>
          <p className="dash-kpi__foot">148 agents · 42 chefs · 24 recrut.</p>
        </article>
      </section>

      <DashboardCharts
        period={period}
        missions={
          period === "hebdo"
            ? ALL_MISSIONS.filter((m) => m.day >= 14 && m.day <= 20)
            : ALL_MISSIONS
        }
      />

      <div className="symp-grid">
        <section className="symp-panel symp-panel--missions">
          <header className="symp-panel__head">
            <div>
              <h2>Missions à venir</h2>
              <p>
                {showAll || selectedDay == null
                  ? `Planning terrain · ${filtered.length} mission${filtered.length > 1 ? "s" : ""}`
                  : `Jour ${selectedDay} sep. · ${filtered.length} mission${filtered.length > 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              type="button"
              className="symp-link"
              onClick={() => {
                setShowAll((v) => !v);
                if (!showAll) setSelectedDay(null);
                else setSelectedDay(22);
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
              <span>
                <i className="dot d4" />
                Indisponible
              </span>
            </div>
            <div className="symp-dates__row">
              {DATES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`symp-date${selectedDay === d && !showAll ? " is-selected" : ""}${OFF_DAYS.has(d) ? " is-off" : ""}`}
                  aria-pressed={selectedDay === d && !showAll}
                  disabled={OFF_DAYS.has(d)}
                  onClick={() => onPickDay(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="symp-table-wrap">
            {filtered.length === 0 ? (
              <p className="symp-empty">
                Aucune mission pour ce filtre.
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
                                    href="/admin/operations?tab=terrain"
                                    role="menuitem"
                                    onClick={() => setMenuMissionId(null)}
                                  >
                                    Photos terrain
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
                    <article
                      key={`m-${m.id}`}
                      className="symp-mission-card"
                    >
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
                href="/admin/operations?tab=terrain"
                className="symp-btn symp-btn--ghost"
                onClick={() => setOpenMissionId(null)}
              >
                Photos terrain
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
