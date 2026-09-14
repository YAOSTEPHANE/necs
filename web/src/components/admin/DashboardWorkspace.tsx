"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
];

const DATES = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
const OFF_DAYS = new Set([19, 26]);

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
    <div className="symp-dash doc-workspace">
      <ModuleHeader
        tone="#1260a8"
        badge={
          period === "mensuel"
            ? "Pilotage NECS · Septembre 2026"
            : "Pilotage NECS · Semaine du 14 au 20"
        }
        title="Bon retour, Direction"
        description="Vue synthétique des prestations, de la qualité et des demandes entrantes."
        actions={
          <div className="module-header__tools">
            <label className="symp-search">
              <IconSearch size={16} />
              <input
                placeholder="Rechercher un site, client…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher un site ou une prestation"
              />
            </label>
            <div className="module-header__btns">
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

      <section className="symp-kpis" aria-label="Indicateurs clés">
        <article className="symp-kpi" style={{ ["--kpi-c" as string]: "#1260a8" }}>
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconClipboard size={18} />
            </span>
            <span className="symp-kpi__hint">
              {period === "mensuel" ? "Ce mois" : "Cette semaine"}
            </span>
          </div>
          <h3>Prestations phares</h3>
          <div className="symp-kpi__value">
            <strong>{period === "mensuel" ? "580" : "142"}</strong>
            <em className="up">{period === "mensuel" ? "+24" : "+6"}</em>
          </div>
          <div className="symp-bubbles" aria-hidden>
            <span className="b b1" />
            <span className="b b2" />
            <span className="b b3" />
            <span className="b b4" />
          </div>
          <ul className="symp-legend">
            <li>
              <i className="dot d1" />
              Bureaux
            </li>
            <li>
              <i className="dot d2" />
              Industrie
            </li>
            <li>
              <i className="dot d3" />
              Commerce
            </li>
            <li>
              <i className="dot d4" />
              Santé
            </li>
          </ul>
        </article>

        <article className="symp-kpi" style={{ ["--kpi-c" as string]: "#4faf2a" }}>
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconQuality size={18} />
            </span>
            <span className="symp-kpi__hint">Clients actifs</span>
          </div>
          <h3>Taux de satisfaction</h3>
          <div className="symp-kpi__value">
            <strong>91%</strong>
            <em className="down">-2%</em>
          </div>
          <div className="symp-gauge" aria-hidden>
            <div className="symp-gauge__arc" />
            <div className="symp-gauge__needle" />
            <span>91</span>
          </div>
        </article>

        <article className="symp-kpi" style={{ ["--kpi-c" as string]: "#1570b8" }}>
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconUser size={18} />
            </span>
            <span className="symp-kpi__hint">Agents & chefs</span>
          </div>
          <h3>Effectif terrain</h3>
          <div className="symp-kpi__value">
            <strong>214</strong>
            <em className="up">+12</em>
          </div>
          <div className="symp-stackbar" aria-hidden>
            <span style={{ flex: 148 }} />
            <span style={{ flex: 42 }} />
            <span style={{ flex: 24 }} />
          </div>
          <ul className="symp-legend">
            <li>
              <i className="dot d1" />
              Agents 148
            </li>
            <li>
              <i className="dot d2" />
              Chefs 42
            </li>
            <li>
              <i className="dot d3" />
              Recrut. 24
            </li>
          </ul>
        </article>

        <article className="symp-kpi" style={{ ["--kpi-c" as string]: "#1f6b28" }}>
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconCalendar size={18} />
            </span>
            <span className="symp-kpi__hint">
              {period === "mensuel" ? "Planifiées" : "Semaine"}
            </span>
          </div>
          <h3>Missions du mois</h3>
          <div className="symp-kpi__value">
            <strong>{period === "mensuel" ? "260" : String(filtered.length || 3)}</strong>
            <em className="up">{period === "mensuel" ? "+16" : "+2"}</em>
          </div>
          <div className="symp-bars" aria-hidden>
            {[40, 55, 35, 70, 48, 82, 60, 45, 75, 50, 68, 58].map((h, i) => (
              <span
                key={i}
                className={i === 5 ? "is-hot" : undefined}
                style={{ height: `${h}%` }}
              >
                {i === 5 ? <b>18</b> : null}
              </span>
            ))}
          </div>
        </article>
      </section>

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
                                    href="/admin/terrain"
                                    role="menuitem"
                                    onClick={() => setMenuMissionId(null)}
                                  >
                                    Photos terrain
                                  </Link>
                                  <Link
                                    href="/admin/pointage"
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
                href="/admin/terrain"
                className="symp-btn symp-btn--ghost"
                onClick={() => setOpenMissionId(null)}
              >
                Photos terrain
              </Link>
              <Link
                href="/admin/pointage"
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
