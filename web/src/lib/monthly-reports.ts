import { loadPointageStore, type PunchRecord } from "@/lib/pointage";

export const NECS_MONTHLY_REPORTS_KEY = "necs_monthly_reports_v1";
export const NECS_MONTHLY_REPORTS_EVENT = "necs-monthly-reports-updated";

export type ReportStatus = "Brouillon" | "Soumis" | "Validé" | "Publié";

export type SitePerfRow = {
  site: string;
  realizationPct: number;
  qualityScore: number;
  complaints: number;
  absenteeismPct: number;
};

export type MonthlyReport = {
  id: string;
  month: string; // YYYY-MM
  client: string;
  sites: string;
  author: string;
  status: ReportStatus;
  realizationPct: number;
  qualityScore: number;
  complaints: number;
  actionsClosed: number;
  actionsTotal: number;
  absenteeismPct: number;
  caMonth: string;
  prestations: string;
  qualite: string;
  incidents: string;
  reclamations: string;
  actions: string;
  recommendations: string;
  siteRows: SitePerfRow[];
  createdAt: string;
  updatedAt: string;
};

function nowLabel(): string {
  return new Date().toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function currentMonthValue(): string {
  return new Date().toISOString().slice(0, 7);
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function createReportId(month: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  return `RM-${month.replace("-", "")}-${stamp.slice(-4)}`;
}

export function loadMonthlyReports(): MonthlyReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NECS_MONTHLY_REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<MonthlyReport>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r) => normalizeReport(r));
  } catch {
    return [];
  }
}

function normalizeReport(raw: Partial<MonthlyReport>): MonthlyReport {
  const incidents = String(raw.incidents ?? "");
  return {
    id: String(raw.id ?? createReportId(currentMonthValue())),
    month: String(raw.month ?? currentMonthValue()),
    client: String(raw.client ?? ""),
    sites: String(raw.sites ?? ""),
    author: String(raw.author ?? ""),
    status:
      raw.status === "Soumis" ||
      raw.status === "Validé" ||
      raw.status === "Publié" ||
      raw.status === "Brouillon"
        ? raw.status
        : "Brouillon",
    realizationPct: Number(raw.realizationPct) || 0,
    qualityScore: Number(raw.qualityScore) || 0,
    complaints: Number(raw.complaints) || 0,
    actionsClosed: Number(raw.actionsClosed) || 0,
    actionsTotal: Number(raw.actionsTotal) || 0,
    absenteeismPct: Number(raw.absenteeismPct) || 0,
    caMonth: String(raw.caMonth ?? ""),
    prestations: String(raw.prestations ?? ""),
    qualite: String(raw.qualite ?? ""),
    incidents,
    reclamations: String(
      raw.reclamations ??
        (raw.complaints
          ? `${raw.complaints} réclamation(s) / anomalie(s) sur le mois.`
          : ""),
    ),
    actions: String(raw.actions ?? ""),
    recommendations: String(raw.recommendations ?? ""),
    siteRows: Array.isArray(raw.siteRows) ? raw.siteRows : [],
    createdAt: String(raw.createdAt ?? nowLabel()),
    updatedAt: String(raw.updatedAt ?? nowLabel()),
  };
}

export function saveMonthlyReports(reports: MonthlyReport[]): void {
  localStorage.setItem(NECS_MONTHLY_REPORTS_KEY, JSON.stringify(reports));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NECS_MONTHLY_REPORTS_EVENT));
  }
}

export function upsertMonthlyReport(
  reports: MonthlyReport[],
  report: MonthlyReport,
): MonthlyReport[] {
  const idx = reports.findIndex((r) => r.id === report.id);
  if (idx === -1) return [report, ...reports];
  const next = [...reports];
  next[idx] = report;
  return next;
}

export function deleteMonthlyReport(
  reports: MonthlyReport[],
  id: string,
): MonthlyReport[] {
  return reports.filter((r) => r.id !== id);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Agrège le pointage du mois pour préremplir les KPI. */
export function computeMonthStatsFromPointage(month: string): {
  realizationPct: number;
  qualityScore: number;
  absenteeismPct: number;
  complaints: number;
  siteRows: SitePerfRow[];
  sitesLabel: string;
} {
  const store = loadPointageStore();
  const punches = store.punches.filter((p) => p.date.startsWith(month));
  if (punches.length === 0) {
    return {
      realizationPct: 0,
      qualityScore: 0,
      absenteeismPct: 0,
      complaints: 0,
      siteRows: [],
      sitesLabel: "",
    };
  }

  const present = punches.filter((p) => p.actualIn).length;
  const absent = punches.filter((p) => !p.actualIn).length;
  const late = punches.filter((p) => p.status === "Retard").length;
  const anomaly = punches.filter(
    (p) => p.status === "Anomalie" || (p.anomaly && p.anomaly !== "Aucune"),
  ).length;
  const validated = punches.filter((p) => p.status === "Validé").length;

  const realizationPct = round1((present / punches.length) * 100);
  const absenteeismPct = round1((absent / punches.length) * 100);
  const qualityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          (late / punches.length) * 25 -
          (anomaly / punches.length) * 35 -
          (absent / punches.length) * 20 +
          (validated / punches.length) * 5,
      ),
    ),
  );

  const bySite = new Map<string, PunchRecord[]>();
  for (const p of punches) {
    const key = p.site.trim() || "Site non renseigné";
    const list = bySite.get(key) ?? [];
    list.push(p);
    bySite.set(key, list);
  }

  const siteRows: SitePerfRow[] = [...bySite.entries()]
    .map(([site, list]) => {
      const sitePresent = list.filter((p) => p.actualIn).length;
      const siteAbsent = list.filter((p) => !p.actualIn).length;
      const siteLate = list.filter((p) => p.status === "Retard").length;
      const siteAnomaly = list.filter(
        (p) => p.status === "Anomalie" || (p.anomaly && p.anomaly !== "Aucune"),
      ).length;
      return {
        site,
        realizationPct: round1((sitePresent / list.length) * 100),
        qualityScore: Math.max(
          0,
          Math.min(
            100,
            Math.round(
              100 -
                (siteLate / list.length) * 25 -
                (siteAnomaly / list.length) * 35 -
                (siteAbsent / list.length) * 20,
            ),
          ),
        ),
        complaints: siteAnomaly,
        absenteeismPct: round1((siteAbsent / list.length) * 100),
      };
    })
    .sort((a, b) => a.site.localeCompare(b.site, "fr"));

  return {
    realizationPct,
    qualityScore,
    absenteeismPct,
    complaints: anomaly,
    siteRows,
    sitesLabel: siteRows.map((r) => r.site).join(", "),
  };
}

export function buildDraftReport(input: {
  month: string;
  author: string;
  client?: string;
}): MonthlyReport {
  const stats = computeMonthStatsFromPointage(input.month);
  const stamp = nowLabel();
  return {
    id: createReportId(input.month),
    month: input.month,
    client: input.client?.trim() || "NECS — multi-sites",
    sites: stats.sitesLabel || "À préciser",
    author: input.author.trim() || "Direction NECS",
    status: "Brouillon",
    realizationPct: stats.realizationPct,
    qualityScore: stats.qualityScore,
    complaints: stats.complaints,
    actionsClosed: 0,
    actionsTotal: 0,
    absenteeismPct: stats.absenteeismPct,
    caMonth: "",
    prestations:
      stats.siteRows.length > 0
        ? `Mois ${formatMonthLabel(input.month)} : ${stats.siteRows.length} site(s) couverts, ${stats.realizationPct} % de réalisation sur le pointage.`
        : `Aucun pointage pour ${formatMonthLabel(input.month)}. Complétez manuellement.`,
    qualite: `Score qualité estimé ${stats.qualityScore}/100 (retards, anomalies, absences).`,
    incidents:
      stats.complaints > 0
        ? `${stats.complaints} anomalie(s) relevée(s) sur le mois.`
        : "Aucune anomalie majeure recensée.",
    reclamations:
      stats.complaints > 0
        ? `${stats.complaints} réclamation(s) / anomalie(s) à traiter avec le client.`
        : "Aucune réclamation client ouverte.",
    actions: "Actions correctives à planifier pour le mois suivant.",
    recommendations:
      "Maintenir le SLA, renforcer le contrôle qualité sur les sites à score < 85.",
    siteRows: stats.siteRows,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function refreshReportFromPointage(report: MonthlyReport): MonthlyReport {
  const stats = computeMonthStatsFromPointage(report.month);
  return {
    ...report,
    sites: stats.sitesLabel || report.sites,
    realizationPct: stats.realizationPct,
    qualityScore: stats.qualityScore,
    complaints: stats.complaints,
    absenteeismPct: stats.absenteeismPct,
    siteRows: stats.siteRows.length > 0 ? stats.siteRows : report.siteRows,
    updatedAt: nowLabel(),
  };
}
