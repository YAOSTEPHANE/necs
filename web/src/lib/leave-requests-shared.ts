import type { UserRole } from "@/lib/settings";

export type LeaveRequestType =
  | "conge_paye"
  | "permission"
  | "maladie"
  | "autre";

export type LeaveRequestStatus =
  | "brouillon"
  | "en_validation"
  | "valide"
  | "refuse"
  | "annule";

export type LeaveHistoryEntry = {
  id: string;
  at: string;
  kind: "created" | "submit" | "validate" | "refuse" | "cancel" | "note";
  note: string;
  byEmail: string;
  byName: string;
  byRole: UserRole | string;
};

export type LeaveRequest = {
  id: string;
  status: LeaveRequestStatus;
  type: LeaveRequestType;
  employeeName: string;
  employeeEmail: string;
  employeeUserId: string;
  matricule: string;
  startDate: string;
  endDate: string;
  days: number;
  motif: string;
  substituteName: string;
  /** Impact planning calculé / saisi. */
  planningImpact: string;
  /** Sites / créneaux potentiellement touchés. */
  affectedSites: string;
  rhOwner: string;
  validatedAt: string | null;
  validatedByEmail: string;
  validatedByName: string;
  note: string;
  history: LeaveHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  createdByName: string;
};

export type LeaveRequestInput = {
  type?: LeaveRequestType;
  employeeName: string;
  employeeEmail?: string;
  employeeUserId?: string;
  matricule?: string;
  startDate: string;
  endDate: string;
  days?: number;
  motif?: string;
  substituteName?: string;
  planningImpact?: string;
  affectedSites?: string;
  rhOwner?: string;
  note?: string;
};

export const LEAVE_TYPE_LABELS: Record<LeaveRequestType, string> = {
  conge_paye: "Congé payé",
  permission: "Permission",
  maladie: "Maladie",
  autre: "Autre",
};

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  brouillon: "Brouillon",
  en_validation: "En validation",
  valide: "Validé",
  refuse: "Refusé",
  annule: "Annulé",
};

export const LEAVE_TYPES = Object.keys(LEAVE_TYPE_LABELS) as LeaveRequestType[];
export const LEAVE_STATUSES = Object.keys(
  LEAVE_STATUS_LABELS,
) as LeaveRequestStatus[];

/** Motifs / règles applicables selon le type (affichage métier). */
export const LEAVE_RULE_HINTS: Record<LeaveRequestType, string> = {
  conge_paye:
    "Congé payé : solde et préavis selon règlement intérieur ; impact planning à confirmer.",
  permission:
    "Permission : durée courte ; validation manager + RH ; remplaçant recommandé.",
  maladie:
    "Maladie : justificatif médical requis ; notification immédiate au manager.",
  autre: "Autre absence : motif détaillé et validation RH obligatoires.",
};

export function canAccessLeaveRequests(role: UserRole | string): boolean {
  return (
    role === "admin" ||
    role === "rh" ||
    role === "manager" ||
    role === "ops" ||
    role === "nettoyeur"
  );
}

export function canManageLeaveRequests(role: UserRole | string): boolean {
  return role === "admin" || role === "rh";
}

export function canValidateLeaveRequests(role: UserRole | string): boolean {
  return role === "admin" || role === "rh" || role === "manager";
}

export function isLeaveRequestType(value: unknown): value is LeaveRequestType {
  return typeof value === "string" && LEAVE_TYPES.includes(value as LeaveRequestType);
}

export function isLeaveRequestStatus(
  value: unknown,
): value is LeaveRequestStatus {
  return (
    typeof value === "string" &&
    LEAVE_STATUSES.includes(value as LeaveRequestStatus)
  );
}

/** Calcule le nombre de jours calendaires inclusifs. */
export function computeLeaveDays(startDate: string, endDate: string): number {
  const a = Date.parse(startDate);
  const b = Date.parse(endDate);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

export function defaultPlanningImpact(
  days: number,
  type: LeaveRequestType,
  substituteName: string,
): string {
  const sub = substituteName.trim()
    ? `Remplaçant : ${substituteName.trim()}`
    : "Remplaçant à désigner";
  return `${LEAVE_TYPE_LABELS[type]} · ${days} j · ${sub} · créneaux à réaffecter`;
}
