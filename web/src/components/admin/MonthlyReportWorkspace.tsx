"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandAssets";
import { loadSession } from "@/lib/auth";
import { downloadCsv } from "@/lib/download";
import {
  NECS_MONTHLY_REPORTS_EVENT,
  buildDraftReport,
  currentMonthValue,
  formatMonthLabel,
  loadMonthlyReports,
  refreshReportFromPointage,
  saveMonthlyReports,
  upsertMonthlyReport,
  type MonthlyReport,
  type ReportStatus,
} from "@/lib/monthly-reports";
import { NECS_POINTAGE_EVENT } from "@/lib/pointage";
import { toast } from "@/lib/toast";

const STATUSES: ReportStatus[] = ["Brouillon", "Soumis", "Validé", "Publié"];

function stamp(): string {
  return new Date().toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function ensureReportForMonth(month: string, author: string): MonthlyReport {
  const existing = loadMonthlyReports().find((r) => r.month === month);
  if (existing) return refreshReportFromPointage(existing);
  return buildDraftReport({ month, author });
}

export function MonthlyReportWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState(currentMonthValue);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const session = loadSession();
    const next = ensureReportForMonth(
      currentMonthValue(),
      session?.name || "Direction NECS",
    );
    const all = upsertMonthlyReport(loadMonthlyReports(), next);
    saveMonthlyReports(all);
    setReport(next);
    setMonth(next.month);
    setReady(true);

    const refresh = () => {
      setReport((prev) => {
        if (!prev) return prev;
        const updated = refreshReportFromPointage(prev);
        saveMonthlyReports(upsertMonthlyReport(loadMonthlyReports(), updated));
        return updated;
      });
    };
    window.addEventListener(NECS_POINTAGE_EVENT, refresh);
    window.addEventListener(NECS_MONTHLY_REPORTS_EVENT, refresh);
    return () => {
      window.removeEventListener(NECS_POINTAGE_EVENT, refresh);
      window.removeEventListener(NECS_MONTHLY_REPORTS_EVENT, refresh);
    };
  }, []);

  const monthLabel = useMemo(
    () => (report ? formatMonthLabel(report.month) : ""),
    [report],
  );

  const persist = (next: MonthlyReport) => {
    setReport(next);
    saveMonthlyReports(upsertMonthlyReport(loadMonthlyReports(), next));
  };

  const loadMonth = (value: string) => {
    const session = loadSession();
    const next = ensureReportForMonth(value, session?.name || "Direction NECS");
    persist(next);
    setMonth(value);
    setEditing(false);
    toast.success(`Rapport ${formatMonthLabel(value)}`);
  };

  const patch = (partial: Partial<MonthlyReport>) => {
    if (!report) return;
    persist({ ...report, ...partial, updatedAt: stamp() });
  };

  const onRecalc = () => {
    if (!report) return;
    persist(refreshReportFromPointage(report));
    toast.success("Indicateurs mis à jour depuis le pointage.");
  };

  const onExport = () => {
    if (!report) return;
    downloadCsv(
      [
        ["Référence", report.id],
        ["Mois", report.month],
        ["Client", report.client],
        ["Sites", report.sites],
        ["Réalisation %", String(report.realizationPct)],
        ["Qualité", String(report.qualityScore)],
        ["Réclamations", String(report.complaints)],
        ["Absentéisme %", String(report.absenteeismPct)],
        ["CA", report.caMonth],
        ...report.siteRows.map((r) => [
          r.site,
          `${r.realizationPct}% | Q${r.qualityScore} | ${r.complaints} récl. | ${r.absenteeismPct}% abs.`,
        ]),
      ],
      `necs-rapport-${report.month}.csv`,
    );
    toast.success("Export CSV prêt.");
  };

  if (!ready || !report) {
    return (
      <div className="rm-page" aria-busy="true">
        <div className="rm-skel rm-skel--lg" />
        <div className="rm-skel rm-skel--board" />
      </div>
    );
  }

  return (
    <div className={`rm-page rm-page--doc${embedded ? " rm-page--embedded" : ""}`}>
      {embedded ? (
        <div className="fin-embedded-bar rm-embedded-bar no-print">
          <div>
            <p className="fin-embedded-bar__eyebrow">Performance client</p>
            <h2>Rapport mensuel de performance client</h2>
          </div>
        </div>
      ) : null}
      <div className="rm-bar no-print">
        <div className="rm-bar__left">
          {!embedded ? (
            <>
              <p className="rm-bar__eyebrow">Pilotage</p>
              <h1>Rapport mensuel de performance</h1>
            </>
          ) : (
            <p className="rm-bar__eyebrow">KPI · qualité · incidents · actions</p>
          )}
        </div>
        <div className="rm-bar__actions">
          <label className="rm-bar__month">
            <span>Mois</span>
            <input
              type="month"
              value={month}
              onChange={(e) => loadMonth(e.target.value)}
            />
          </label>
          <button type="button" className="btn-admin" onClick={onRecalc}>
            Actualiser KPI
          </button>
          <button
            type="button"
            className="btn-admin"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Aperçu" : "Compléter"}
          </button>
          <button type="button" className="btn-admin" onClick={onExport}>
            CSV
          </button>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={() => window.print()}
          >
            Imprimer / PDF
          </button>
          <Link href="/admin/templates/tmp-24" className="btn-admin">
            Modèle
          </Link>
        </div>
      </div>

      <article className="rm-sheet">
        <header className="rm-sheet__header">
          <div className="rm-sheet__brand">
            <BrandLogo alt="NECS" width={56} height={56} />
            <div>
              <strong>NECS / NECLEANING &amp; SERVICES SARL</strong>
              <p>Propreté · Rigueur · Confiance</p>
            </div>
          </div>
          <div className="rm-sheet__meta">
            <span className="rm-sheet__type">Performance</span>
            <p>
              N° <strong>{report.id}</strong>
            </p>
            <p>
              Statut · <strong>{report.status}</strong>
            </p>
            <p className="rm-sheet__month-label">{monthLabel}</p>
          </div>
        </header>

        <div className="rm-sheet__title">
          <h2>Rapport mensuel de performance</h2>
          <p>
            Synthèse KPI multi-sites — pilotage Direction, Ops et Qualité, et
            restitution client.
          </p>
        </div>

        <section className="rm-sheet__block">
          <h3>Périmètre</h3>
          {editing ? (
            <div className="rm-sheet__fields">
              <label>
                <span>Client</span>
                <input
                  value={report.client}
                  onChange={(e) => patch({ client: e.target.value })}
                />
              </label>
              <label>
                <span>Sites inclus</span>
                <input
                  value={report.sites}
                  onChange={(e) => patch({ sites: e.target.value })}
                />
              </label>
              <label>
                <span>Rédacteur</span>
                <input
                  value={report.author}
                  onChange={(e) => patch({ author: e.target.value })}
                />
              </label>
              <label>
                <span>Statut</span>
                <select
                  value={report.status}
                  onChange={(e) =>
                    patch({ status: e.target.value as ReportStatus })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>CA du mois (FCFA)</span>
                <input
                  value={report.caMonth}
                  onChange={(e) => patch({ caMonth: e.target.value })}
                  placeholder="ex. 7 200 000"
                />
              </label>
            </div>
          ) : (
            <dl className="rm-sheet__dl">
              <div>
                <dt>Client</dt>
                <dd>{report.client || "—"}</dd>
              </div>
              <div>
                <dt>Sites</dt>
                <dd>{report.sites || "—"}</dd>
              </div>
              <div>
                <dt>Rédacteur</dt>
                <dd>{report.author || "—"}</dd>
              </div>
              <div>
                <dt>CA du mois</dt>
                <dd>{report.caMonth ? `${report.caMonth} FCFA` : "—"}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="rm-sheet__kpis" aria-label="Indicateurs clés">
          <article>
            <span>Taux réalisation</span>
            <strong>{report.realizationPct}%</strong>
          </article>
          <article>
            <span>Qualité moyenne</span>
            <strong>{report.qualityScore}/100</strong>
          </article>
          <article>
            <span>Réclamations</span>
            <strong>{report.complaints}</strong>
          </article>
          <article>
            <span>Absentéisme</span>
            <strong>{report.absenteeismPct}%</strong>
          </article>
          <article>
            <span>Actions closes</span>
            <strong>
              {report.actionsClosed}/{report.actionsTotal || "—"}
            </strong>
          </article>
        </section>

        {editing ? (
          <section className="rm-sheet__block">
            <h3>Ajuster les KPI</h3>
            <div className="rm-sheet__fields rm-sheet__fields--kpi">
              <label>
                <span>Réalisation %</span>
                <input
                  type="number"
                  value={report.realizationPct}
                  onChange={(e) =>
                    patch({ realizationPct: Number(e.target.value) || 0 })
                  }
                />
              </label>
              <label>
                <span>Score qualité</span>
                <input
                  type="number"
                  value={report.qualityScore}
                  onChange={(e) =>
                    patch({ qualityScore: Number(e.target.value) || 0 })
                  }
                />
              </label>
              <label>
                <span>Réclamations</span>
                <input
                  type="number"
                  value={report.complaints}
                  onChange={(e) =>
                    patch({ complaints: Number(e.target.value) || 0 })
                  }
                />
              </label>
              <label>
                <span>Absentéisme %</span>
                <input
                  type="number"
                  value={report.absenteeismPct}
                  onChange={(e) =>
                    patch({ absenteeismPct: Number(e.target.value) || 0 })
                  }
                />
              </label>
              <label>
                <span>Actions closes</span>
                <input
                  type="number"
                  value={report.actionsClosed}
                  onChange={(e) =>
                    patch({ actionsClosed: Number(e.target.value) || 0 })
                  }
                />
              </label>
              <label>
                <span>Actions totales</span>
                <input
                  type="number"
                  value={report.actionsTotal}
                  onChange={(e) =>
                    patch({ actionsTotal: Number(e.target.value) || 0 })
                  }
                />
              </label>
            </div>
          </section>
        ) : null}

        <section className="rm-sheet__block">
          <h3>Performance par site</h3>
          {report.siteRows.length === 0 ? (
            <p className="rm-sheet__empty">
              Aucun pointage pour ce mois — les lignes sites apparaîtront après
              saisie terrain, ou via « Actualiser KPI ».
            </p>
          ) : (
            <table className="rm-sheet__table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Réalisation</th>
                  <th>Score Q</th>
                  <th>Réclamations</th>
                  <th>Absentéisme</th>
                </tr>
              </thead>
              <tbody>
                {report.siteRows.map((row) => (
                  <tr key={row.site}>
                    <td>{row.site}</td>
                    <td>{row.realizationPct}%</td>
                    <td>{row.qualityScore}</td>
                    <td>{row.complaints}</td>
                    <td>{row.absenteeismPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rm-sheet__block">
          <h3>Analyse</h3>
          {editing ? (
            <div className="rm-sheet__areas">
              <label>
                <span>Synthèse prestations</span>
                <textarea
                  rows={3}
                  value={report.prestations}
                  onChange={(e) => patch({ prestations: e.target.value })}
                />
              </label>
              <label>
                <span>Qualité & contrôles</span>
                <textarea
                  rows={3}
                  value={report.qualite}
                  onChange={(e) => patch({ qualite: e.target.value })}
                />
              </label>
              <label>
                <span>Incidents</span>
                <textarea
                  rows={3}
                  value={report.incidents}
                  onChange={(e) => patch({ incidents: e.target.value })}
                />
              </label>
              <label>
                <span>Réclamations</span>
                <textarea
                  rows={3}
                  value={report.reclamations}
                  onChange={(e) => patch({ reclamations: e.target.value })}
                />
              </label>
              <label>
                <span>Actions</span>
                <textarea
                  rows={3}
                  value={report.actions}
                  onChange={(e) => patch({ actions: e.target.value })}
                />
              </label>
              <label>
                <span>Recommandations</span>
                <textarea
                  rows={3}
                  value={report.recommendations}
                  onChange={(e) => patch({ recommendations: e.target.value })}
                />
              </label>
            </div>
          ) : (
            <div className="rm-sheet__analysis">
              <div>
                <h4>Prestations</h4>
                <p>{report.prestations || "—"}</p>
              </div>
              <div>
                <h4>Qualité</h4>
                <p>{report.qualite || "—"}</p>
              </div>
              <div>
                <h4>Incidents</h4>
                <p>{report.incidents || "—"}</p>
              </div>
              <div>
                <h4>Réclamations</h4>
                <p>{report.reclamations || "—"}</p>
              </div>
              <div>
                <h4>Actions</h4>
                <p>{report.actions || "—"}</p>
              </div>
              <div>
                <h4>Recommandations</h4>
                <p>{report.recommendations || "—"}</p>
              </div>
            </div>
          )}
        </section>

        <section className="rm-sheet__signs">
          <div>
            <h4>Direction opérations</h4>
            <p>Rédaction</p>
            <div className="rm-sheet__sign-line">Signature / Date</div>
          </div>
          <div>
            <h4>Client</h4>
            <p>Revue mensuelle</p>
            <div className="rm-sheet__sign-line">Signature / Date</div>
          </div>
        </section>

        <footer className="rm-sheet__footer">
          <p>
            Document généré pour validation — mis à jour {report.updatedAt}
          </p>
          <span>Digitalisation NECS</span>
        </footer>
      </article>
    </div>
  );
}
