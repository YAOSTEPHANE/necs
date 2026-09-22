import type { UserRole } from "@/lib/settings";

export type StaffingNeedSource = "contrat" | "planning" | "manuel";

export type StaffingNeedStatus =
  | "brouillon"
  | "soumis"
  | "en_validation"
  | "approuve"
  | "refuse"
  | "annule";

export type StaffingProfile =
  | "agent"
  | "chef_equipe"
  | "superviseur"
  | "remplacant";

export type StaffingHistoryKind =
  | "created"
  | "submitted"
  | "hierarchical"
  | "budget"
  | "approved"
  | "refused"
  | "cancelled"
  | "updated"
  | "note";

export type StaffingHistoryEntry = {
  id: string;
  at: string;
  kind: StaffingHistoryKind;
  by: string;
  byName: string;
  byRole: string;
  detail: string;
};

export type ValidationStamp = {
  ok: boolean;
  at: string | null;
  by: string;
  byName: string;
  note: string;
};

/** Expression du besoin en agents (RH-01). */
export type StaffingNeed = {
  id: string;
  ref: string;
  title: string;
  description: string;
  status: StaffingNeedStatus;
  source: StaffingNeedSource;
  /** Lien contrat (effectif contractuel). */
  contractId: string;
  contractLabel: string;
  contractStaffCount: number;
  /** Lien créneau planning (sous-effectif). */
  planningSlotId: string;
  planningLabel: string;
  planningRequiredStaff: number;
  siteId: string;
  siteName: string;
  clientName: string;
  profile: StaffingProfile;
  headcount: number;
  startDate: string;
  endDate: string;
  /** Estimation budgétaire mensuelle (FCFA). */
  budgetEstimate: number;
  hierarchical: ValidationStamp;
  budget: ValidationStamp;
  approvedAt: string | null;
  approvedBy: string;
  approvedByName: string;
  refusedAt: string | null;
  refuseReason: string;
  history: StaffingHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  createdByRole: string;
};

export type StaffingNeedInput = {
  title: string;
  description?: string;
  source?: StaffingNeedSource;
  contractId?: string;
  planningSlotId?: string;
  siteId?: string;
  siteName?: string;
  clientName?: string;
  profile?: StaffingProfile;
  headcount?: number;
  startDate?: string;
  endDate?: string;
  budgetEstimate?: number;
};

export const STAFFING_STATUS_LABELS: Record<StaffingNeedStatus, string> = {
  brouillon: "Brouillon",
  soumis: "Soumis",
  en_validation: "En validation",
  approuve: "Approuvé",
  refuse: "Refusé",
  annule: "Annulé",
};

export const STAFFING_SOURCE_LABELS: Record<StaffingNeedSource, string> = {
  contrat: "Contrat",
  planning: "Planning",
  manuel: "Manuel",
};

export const STAFFING_PROFILE_LABELS: Record<StaffingProfile, string> = {
  agent: "Agent",
  chef_equipe: "Chef d’équipe",
  superviseur: "Superviseur",
  remplacant: "Remplaçant",
};

export const STAFFING_STATUSES = Object.keys(
  STAFFING_STATUS_LABELS,
) as StaffingNeedStatus[];
export const STAFFING_SOURCES = Object.keys(
  STAFFING_SOURCE_LABELS,
) as StaffingNeedSource[];
export const STAFFING_PROFILES = Object.keys(
  STAFFING_PROFILE_LABELS,
) as StaffingProfile[];

export function canAccessStaffingNeeds(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "rh" ||
    role === "ops" ||
    role === "manager" ||
    role === "finance"
  );
}

/** Création / édition / soumission : RH + opérations. */
export function canEditStaffingNeeds(role: UserRole): boolean {
  return role === "admin" || role === "rh" || role === "ops";
}

/** Validation hiérarchique : direction. */
export function canValidateHierarchical(role: UserRole): boolean {
  return role === "admin" || role === "manager";
}

/** Validation budgétaire : direction / finance. */
export function canValidateBudget(role: UserRole): boolean {
  return role === "admin" || role === "manager" || role === "finance";
}

export function isStaffingNeedStatus(v: unknown): v is StaffingNeedStatus {
  return (
    typeof v === "string" &&
    STAFFING_STATUSES.includes(v as StaffingNeedStatus)
  );
}

export function isStaffingNeedSource(v: unknown): v is StaffingNeedSource {
  return (
    typeof v === "string" && STAFFING_SOURCES.includes(v as StaffingNeedSource)
  );
}

export function isStaffingProfile(v: unknown): v is StaffingProfile {
  return (
    typeof v === "string" &&
    STAFFING_PROFILES.includes(v as StaffingProfile)
  );
}

export function emptyValidation(): ValidationStamp {
  return { ok: false, at: null, by: "", byName: "", note: "" };
}

/**
 * Recette RH-01 : demande approuvée et traçable.
 * Exige les deux validations + statut approuvé + journal non vide.
 */
export function staffingApprovalRequirements(need: StaffingNeed): {
  ok: boolean;
  missing: string[];
  traceable: boolean;
} {
  const missing: string[] = [];
  if (!need.hierarchical.ok) missing.push("validation hiérarchique");
  if (!need.budget.ok) missing.push("validation budgétaire");
  if (need.status !== "approuve") missing.push("statut approuvé");
  if (!need.approvedAt) missing.push("date d’approbation");
  const traceable =
    need.history.length > 0 &&
    need.history.some((h) => h.kind === "approved" || h.kind === "created");
  if (!traceable) missing.push("historique traçable");
  return { ok: missing.length === 0, missing, traceable };
}

/** Prêt pour passage auto à « approuvé » une fois les 2 validations OK. */
export function staffingReadyToApprove(need: StaffingNeed): boolean {
  return (
    need.hierarchical.ok &&
    need.budget.ok &&
    need.status !== "approuve" &&
    need.status !== "refuse" &&
    need.status !== "annule"
  );
}

export function staffingStats(items: StaffingNeed[]) {
  return {
    total: items.length,
    draft: items.filter((n) => n.status === "brouillon").length,
    pending: items.filter(
      (n) => n.status === "soumis" || n.status === "en_validation",
    ).length,
    approved: items.filter((n) => n.status === "approuve").length,
    refused: items.filter((n) => n.status === "refuse").length,
    awaitingHierarchical: items.filter(
      (n) =>
        (n.status === "soumis" || n.status === "en_validation") &&
        !n.hierarchical.ok,
    ).length,
    awaitingBudget: items.filter(
      (n) =>
        (n.status === "soumis" || n.status === "en_validation") &&
        n.hierarchical.ok &&
        !n.budget.ok,
    ).length,
  };
}
