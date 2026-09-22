import type { UserRole } from "@/lib/settings";

export type JobDescriptionStatus = "brouillon" | "active" | "archive";

export type JobDescription = {
  id: string;
  status: JobDescriptionStatus;
  /** Intitulé du poste (ex. Agent d’entretien). */
  title: string;
  /** Mission principale. */
  mission: string;
  /** Responsabilités (texte multi-lignes). */
  responsibilities: string;
  /** Compétences attendues. */
  skills: string;
  /** Horaires types. */
  schedule: string;
  /** Rattachement N+1. */
  reportingLine: string;
  /** Lieu / type de site d’exercice. */
  workLocation: string;
  /** Sécurité / EPI. */
  safetyNotes: string;
  /** Critères de performance. */
  performanceCriteria: string;
  note: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  createdByName: string;
  updatedByEmail: string;
  updatedByName: string;
};

export type JobDescriptionInput = {
  title: string;
  mission: string;
  responsibilities?: string;
  skills?: string;
  schedule?: string;
  reportingLine?: string;
  workLocation?: string;
  safetyNotes?: string;
  performanceCriteria?: string;
  note?: string;
  status?: JobDescriptionStatus;
};

export const JOB_DESCRIPTION_STATUS_LABELS: Record<
  JobDescriptionStatus,
  string
> = {
  brouillon: "Brouillon",
  active: "Active",
  archive: "Archivée",
};

export const JOB_DESCRIPTION_STATUSES = Object.keys(
  JOB_DESCRIPTION_STATUS_LABELS,
) as JobDescriptionStatus[];

export const DEFAULT_AGENT_JOB_DESCRIPTION: Omit<
  JobDescription,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "createdByEmail"
  | "createdByName"
  | "updatedByEmail"
  | "updatedByName"
> = {
  status: "active",
  title: "Agent d’entretien",
  mission:
    "Assurer la propreté, l’hygiène et la présentation des locaux clients selon les standards NECS et le cahier des charges du site.",
  responsibilities:
    "Exécuter les prestations planifiées\nRespecter les consignes site et sécurité\nSignaler anomalies, risques et besoins consommables\nRemonter les preuves photo selon procédure\nCollaborer avec le superviseur et l’équipe",
  skills:
    "Rigueur et ponctualité\nMaîtrise des gestes d’entretien et produits\nSens du service client\nLecture des consignes / planning\nTravail en équipe",
  schedule: "Selon planning site (journées / nuits / week-end)",
  reportingLine: "Superviseur de site / Chef d’équipe",
  workLocation: "Sites clients (bureaux, commerces, immeubles…)",
  safetyNotes:
    "Port des EPI obligatoires ; formation consignes sécurité avant affectation.",
  performanceCriteria:
    "Qualité visuelle, respect horaires, zéro incident sécurité, feedback client.",
  note: "",
  version: 1,
};

export function canAccessJobDescriptions(role: UserRole | string): boolean {
  return role === "admin" || role === "rh" || role === "manager";
}

export function canManageJobDescriptions(role: UserRole | string): boolean {
  return role === "admin" || role === "rh";
}

export function isJobDescriptionStatus(
  value: unknown,
): value is JobDescriptionStatus {
  return (
    typeof value === "string" &&
    JOB_DESCRIPTION_STATUSES.includes(value as JobDescriptionStatus)
  );
}
