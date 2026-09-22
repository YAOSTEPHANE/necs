import type { UserRole } from "@/lib/settings";

export type SiteReportStatus =
  | "brouillon"
  | "soumis"
  | "valide"
  | "publie"
  | "annule";

export type SiteReportHistoryEntry = {
  id: string;
  at: string;
  by: string;
  byName: string;
  detail: string;
};

/** Rapport de prestation / rapport de site (TMP-14). */
export type SiteReport = {
  id: string;
  number: string;
  status: SiteReportStatus;
  clientName: string;
  siteName: string;
  periodStart: string;
  periodEnd: string;
  prestations: string;
  effectifsCount: number;
  effectifsNote: string;
  incidents: string;
  controles: string;
  observations: string;
  recommendations: string;
  actions: string;
  qualityScore: number | null;
  note: string;
  history: SiteReportHistoryEntry[];
  validatedAt: string | null;
  validatedBy: string;
  validatedByName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export const SITE_REPORT_STATUS_LABELS: Record<SiteReportStatus, string> = {
  brouillon: "Brouillon",
  soumis: "Soumis",
  valide: "Validé",
  publie: "Publié",
  annule: "Annulé",
};

export const SITE_REPORT_STATUSES = Object.keys(
  SITE_REPORT_STATUS_LABELS,
) as SiteReportStatus[];

export function canAccessSiteReports(role: UserRole | string): boolean {
  return (
    role === "admin" ||
    role === "ops" ||
    role === "manager" ||
    role === "qualite" ||
    role === "finance"
  );
}

export function canEditSiteReports(role: UserRole | string): boolean {
  return role === "admin" || role === "ops" || role === "manager";
}

export function canValidateSiteReports(role: UserRole | string): boolean {
  return (
    role === "admin" ||
    role === "ops" ||
    role === "manager" ||
    role === "qualite"
  );
}

export function isSiteReportStatus(v: unknown): v is SiteReportStatus {
  return (
    typeof v === "string" &&
    SITE_REPORT_STATUSES.includes(v as SiteReportStatus)
  );
}

export function siteReportReady(r: SiteReport): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!r.clientName.trim()) missing.push("Client");
  if (!r.siteName.trim()) missing.push("Site");
  if (!r.periodStart || !r.periodEnd) missing.push("Période");
  if (!r.prestations.trim()) missing.push("Prestations réalisées");
  if (r.effectifsCount <= 0 && !r.effectifsNote.trim()) {
    missing.push("Effectifs");
  }
  return { ok: missing.length === 0, missing };
}
