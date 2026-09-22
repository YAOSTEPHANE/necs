import type { UserRole } from "@/lib/settings";

export type TechnicalVisitStatus =
  | "planifiee"
  | "en_cours"
  | "rapport_brouillon"
  | "validee"
  | "annulee";

export type ChecklistItemId =
  | "acces"
  | "surfaces"
  | "zones"
  | "contraintes"
  | "photos"
  | "observations"
  | "interlocuteur";

export type VisitChecklistItem = {
  id: ChecklistItemId;
  label: string;
  done: boolean;
  required: boolean;
  doneAt: string | null;
  doneBy: string;
  doneByName: string;
};

export type VisitPhoto = {
  id: string;
  url: string;
  caption: string;
  takenAt: string;
  uploadedBy: string;
  uploadedByName: string;
};

export type VisitZone = {
  id: string;
  name: string;
  surfaceM2: number | null;
  note: string;
};

export type TechnicalVisitReport = {
  surfaceTotalM2: number | null;
  zones: VisitZone[];
  constraints: string;
  observations: string;
  accessNotes: string;
  interlocutor: string;
  recommendedStaff: number | null;
  /** Risques identifiés sur site. */
  risks: string;
  /** Besoins / écarts à traiter. */
  needs: string;
  recommendations: string;
  actions: string;
  photos: VisitPhoto[];
  checklist: VisitChecklistItem[];
  /** Rapport validé — horodaté, exploitable pour chiffrage. */
  validatedAt: string | null;
  validatedBy: string;
  validatedByName: string;
  reportVersion: number;
};

export type TechnicalVisit = {
  id: string;
  prospectId: string;
  opportunityId: string;
  company: string;
  siteAddress: string;
  city: string;
  status: TechnicalVisitStatus;
  scheduledAt: string;
  scheduledEndAt: string;
  assigneeEmail: string;
  assigneeName: string;
  assigneeRole: string;
  contactName: string;
  contactPhone: string;
  note: string;
  report: TechnicalVisitReport;
  history: Array<{
    id: string;
    at: string;
    by: string;
    byName: string;
    detail: string;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
};

export type TechnicalVisitInput = {
  prospectId: string;
  opportunityId?: string;
  company?: string;
  siteAddress?: string;
  city?: string;
  scheduledAt: string;
  scheduledEndAt?: string;
  assigneeEmail?: string;
  assigneeName?: string;
  assigneeRole?: string;
  contactName?: string;
  contactPhone?: string;
  note?: string;
};

export const VISIT_STATUS_LABELS: Record<TechnicalVisitStatus, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  rapport_brouillon: "Rapport brouillon",
  validee: "Rapport validé",
  annulee: "Annulée",
};

export const DEFAULT_VISIT_CHECKLIST: Array<{
  id: ChecklistItemId;
  label: string;
  required: boolean;
}> = [
  { id: "acces", label: "Accès site vérifié", required: true },
  { id: "surfaces", label: "Surfaces relevées", required: true },
  { id: "zones", label: "Zones inventoriées", required: true },
  { id: "contraintes", label: "Contraintes notées", required: true },
  { id: "photos", label: "Photos prises (≥ 1)", required: true },
  { id: "observations", label: "Observations rédigées", required: true },
  { id: "interlocuteur", label: "Interlocuteur rencontré", required: false },
];

export const VISIT_STATUSES = Object.keys(
  VISIT_STATUS_LABELS,
) as TechnicalVisitStatus[];

export function canAccessTechnicalVisits(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "ops" ||
    role === "qualite" ||
    role === "manager"
  );
}

export function canManageTechnicalVisits(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "ops" ||
    role === "qualite" ||
    role === "manager"
  );
}

export function canValidateVisitReport(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "ops" ||
    role === "qualite" ||
    role === "manager"
  );
}

export function isTechnicalVisitStatus(v: unknown): v is TechnicalVisitStatus {
  return (
    typeof v === "string" &&
    VISIT_STATUSES.includes(v as TechnicalVisitStatus)
  );
}

export function emptyVisitReport(): TechnicalVisitReport {
  return {
    surfaceTotalM2: null,
    zones: [],
    constraints: "",
    observations: "",
    accessNotes: "",
    interlocutor: "",
    recommendedStaff: null,
    risks: "",
    needs: "",
    recommendations: "",
    actions: "",
    photos: [],
    checklist: DEFAULT_VISIT_CHECKLIST.map((c) => ({
      id: c.id,
      label: c.label,
      done: false,
      required: c.required,
      doneAt: null,
      doneBy: "",
      doneByName: "",
    })),
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    reportVersion: 0,
  };
}

/** Prépare un résumé horodaté exploitable pour le chiffrage (CRM-04). */
export function buildVisitReportSnapshot(visit: TechnicalVisit): {
  visitId: string;
  company: string;
  siteAddress: string;
  validatedAt: string | null;
  surfaceTotalM2: number | null;
  zones: Array<{ name: string; surfaceM2: number | null; note: string }>;
  constraints: string;
  observations: string;
  accessNotes: string;
  recommendedStaff: number | null;
  photoCount: number;
  checklistComplete: boolean;
  exploitableForQuote: boolean;
} {
  const report = visit.report;
  const requiredDone = report.checklist
    .filter((c) => c.required)
    .every((c) => c.done);
  const exploitable =
    visit.status === "validee" &&
    Boolean(report.validatedAt) &&
    requiredDone &&
    report.surfaceTotalM2 !== null &&
    report.surfaceTotalM2 > 0 &&
    report.zones.length > 0 &&
    report.observations.trim().length > 0 &&
    report.photos.length > 0;

  return {
    visitId: visit.id,
    company: visit.company,
    siteAddress: visit.siteAddress,
    validatedAt: report.validatedAt,
    surfaceTotalM2: report.surfaceTotalM2,
    zones: report.zones.map((z) => ({
      name: z.name,
      surfaceM2: z.surfaceM2,
      note: z.note,
    })),
    constraints: report.constraints,
    observations: report.observations,
    accessNotes: report.accessNotes,
    recommendedStaff: report.recommendedStaff,
    photoCount: report.photos.length,
    checklistComplete: requiredDone,
    exploitableForQuote: exploitable,
  };
}

export function visitReportBlockingReasons(
  visit: TechnicalVisit,
): string[] {
  const r = visit.report;
  const reasons: string[] = [];
  for (const c of r.checklist.filter((x) => x.required && !x.done)) {
    reasons.push(`Checklist : ${c.label}`);
  }
  if (r.surfaceTotalM2 === null || r.surfaceTotalM2 <= 0) {
    reasons.push("Surface totale manquante");
  }
  if (r.zones.length === 0) reasons.push("Aucune zone saisie");
  if (!r.constraints.trim()) reasons.push("Contraintes manquantes");
  if (!r.observations.trim()) reasons.push("Observations manquantes");
  if (r.photos.length === 0) reasons.push("Au moins une photo requise");
  return reasons;
}
