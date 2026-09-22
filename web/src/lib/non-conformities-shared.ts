import type { UserRole } from "@/lib/settings";

export type NcCriticality = "critique" | "majeure" | "mineure";

export type NcStatus =
  | "ouverte"
  | "affectee"
  | "en_cours"
  | "a_valider"
  | "cloturee";

export type NcSource =
  | "controle_qualite"
  | "terrain"
  | "client"
  | "interne"
  | "autre";

export type NonConformity = {
  id: string;
  ref: string;
  title: string;
  description: string;
  siteId: string;
  siteName: string;
  criticality: NcCriticality;
  status: NcStatus;
  source: NcSource;
  /** Lien optionnel contrôle qualité OPS-07 */
  qualityControlId: string;
  qualityControlRef: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  correctiveAction: string;
  proofs: Array<{
    id: string;
    url: string;
    caption: string;
    at: string;
    by: string;
    byName: string;
  }>;
  /** Validation Qualité / ops avant clôture */
  validated: boolean;
  validatedAt: string | null;
  validatedBy: string;
  validatedByName: string;
  validationNote: string;
  closedAt: string | null;
  closedBy: string;
  closedByName: string;
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

export const NC_CRITICALITY_LABELS: Record<NcCriticality, string> = {
  critique: "Critique",
  majeure: "Majeure",
  mineure: "Mineure",
};

export const NC_STATUS_LABELS: Record<NcStatus, string> = {
  ouverte: "Ouverte",
  affectee: "Affectée",
  en_cours: "En cours",
  a_valider: "À valider",
  cloturee: "Clôturée",
};

export const NC_SOURCE_LABELS: Record<NcSource, string> = {
  controle_qualite: "Contrôle qualité",
  terrain: "Terrain",
  client: "Client",
  interne: "Interne",
  autre: "Autre",
};

export function canAccessNonConformities(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "qualite" ||
    role === "ops" ||
    role === "manager"
  );
}

export function canEditNonConformities(role: UserRole): boolean {
  return canAccessNonConformities(role);
}

/** Seuls Qualité / admin valident la clôture. */
export function canValidateNonConformities(role: UserRole): boolean {
  return role === "admin" || role === "qualite" || role === "manager";
}

export function isNcCriticality(v: unknown): v is NcCriticality {
  return v === "critique" || v === "majeure" || v === "mineure";
}

export function isNcStatus(v: unknown): v is NcStatus {
  return (
    v === "ouverte" ||
    v === "affectee" ||
    v === "en_cours" ||
    v === "a_valider" ||
    v === "cloturee"
  );
}

export function isNcSource(v: unknown): v is NcSource {
  return (
    v === "controle_qualite" ||
    v === "terrain" ||
    v === "client" ||
    v === "interne" ||
    v === "autre"
  );
}

/**
 * Éléments requis pour clôturer une NC.
 * Recette : une clôture exige tous ces éléments.
 */
export function ncClosureRequirements(nc: NonConformity): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!nc.assigneeId || !nc.assigneeName) missing.push("responsable");
  if (!nc.dueDate) missing.push("échéance");
  if (!nc.correctiveAction.trim()) missing.push("action corrective");
  if (nc.proofs.length === 0) missing.push("preuve");
  if (!nc.validated) missing.push("validation");
  return { ok: missing.length === 0, missing };
}

export function ncStats(items: NonConformity[]) {
  const open = items.filter((n) => n.status !== "cloturee").length;
  const critique = items.filter(
    (n) => n.criticality === "critique" && n.status !== "cloturee",
  ).length;
  const overdue = items.filter((n) => {
    if (n.status === "cloturee" || !n.dueDate) return false;
    return n.dueDate < new Date().toISOString().slice(0, 10);
  }).length;
  const aValider = items.filter((n) => n.status === "a_valider").length;
  return {
    total: items.length,
    open,
    critique,
    overdue,
    aValider,
  };
}
