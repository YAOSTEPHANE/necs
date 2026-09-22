import type { UserRole } from "@/lib/settings";

/** Réclamation client ou demande SAV centralisée (Q-03). */
export type ReclamationKind = "reclamation" | "demande";

export type ReclamationPriority = "basse" | "normale" | "haute" | "critique";

export type ReclamationStatus =
  | "ouverte"
  | "affectee"
  | "en_cours"
  | "escaladee"
  | "resolue"
  | "cloturee";

export type ReclamationChannel =
  | "telephone"
  | "email"
  | "site_web"
  | "whatsapp"
  | "terrain"
  | "autre";

export type ReclamationHistoryKind =
  | "created"
  | "assigned"
  | "status"
  | "priority"
  | "escalated"
  | "resolved"
  | "closed"
  | "note";

export type ReclamationHistoryEntry = {
  id: string;
  at: string;
  kind: ReclamationHistoryKind;
  by: string;
  byName: string;
  detail: string;
};

/** Niveau d’escalade : 0 = aucun, 1 = chef d’équipe, 2 = ops, 3 = direction. */
export type EscalationLevel = 0 | 1 | 2 | 3;

export type Reclamation = {
  id: string;
  ref: string;
  kind: ReclamationKind;
  subject: string;
  description: string;
  channel: ReclamationChannel;
  clientName: string;
  company: string;
  contactEmail: string;
  contactPhone: string;
  siteId: string;
  siteName: string;
  priority: ReclamationPriority;
  status: ReclamationStatus;
  escalationLevel: EscalationLevel;
  escalatedAt: string | null;
  assigneeId: string;
  assigneeName: string;
  /** SLA en heures selon priorité (éventuellement resserré à l’escalade). */
  slaHours: number;
  slaDueAt: string;
  slaBreached: boolean;
  /** Réponse / action de résolution (obligatoire pour résoudre). */
  resolutionNote: string;
  resolvedAt: string | null;
  resolvedBy: string;
  resolvedByName: string;
  /**
   * Délai de résolution mesurable (heures calendaires).
   * Figé à la résolution : (resolvedAt - createdAt) / 3600000.
   */
  resolutionHours: number | null;
  closedAt: string | null;
  closedBy: string;
  closedByName: string;
  history: ReclamationHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
};

export type ReclamationInput = {
  kind?: ReclamationKind;
  subject: string;
  description?: string;
  channel?: ReclamationChannel;
  clientName?: string;
  company?: string;
  contactEmail?: string;
  contactPhone?: string;
  siteId?: string;
  priority?: ReclamationPriority;
  assigneeId?: string;
};

export const RECLAMATION_KIND_LABELS: Record<ReclamationKind, string> = {
  reclamation: "Réclamation",
  demande: "Demande client",
};

export const RECLAMATION_PRIORITY_LABELS: Record<ReclamationPriority, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  critique: "Critique",
};

export const RECLAMATION_STATUS_LABELS: Record<ReclamationStatus, string> = {
  ouverte: "Ouverte",
  affectee: "Affectée",
  en_cours: "En cours",
  escaladee: "Escaladée",
  resolue: "Résolue",
  cloturee: "Clôturée",
};

export const RECLAMATION_CHANNEL_LABELS: Record<ReclamationChannel, string> = {
  telephone: "Téléphone",
  email: "E-mail",
  site_web: "Site web",
  whatsapp: "WhatsApp",
  terrain: "Terrain",
  autre: "Autre",
};

export const ESCALATION_LABELS: Record<EscalationLevel, string> = {
  0: "Aucune",
  1: "Chef d’équipe",
  2: "Opérations",
  3: "Direction",
};

/** SLA par défaut (heures calendaires) selon priorité. */
export const RECLAMATION_SLA_HOURS: Record<ReclamationPriority, number> = {
  basse: 72,
  normale: 24,
  haute: 8,
  critique: 2,
};

/** À chaque escalade, le SLA restant est plafonné à ces heures. */
export const ESCALATION_SLA_CAP_HOURS: Record<1 | 2 | 3, number> = {
  1: 12,
  2: 6,
  3: 2,
};

export const RECLAMATION_KINDS = Object.keys(
  RECLAMATION_KIND_LABELS,
) as ReclamationKind[];
export const RECLAMATION_PRIORITIES = Object.keys(
  RECLAMATION_PRIORITY_LABELS,
) as ReclamationPriority[];
export const RECLAMATION_STATUSES = Object.keys(
  RECLAMATION_STATUS_LABELS,
) as ReclamationStatus[];
export const RECLAMATION_CHANNELS = Object.keys(
  RECLAMATION_CHANNEL_LABELS,
) as ReclamationChannel[];

/** Service client (qualité) + opérations + pilotage. */
export function canAccessReclamations(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "qualite" ||
    role === "ops" ||
    role === "manager" ||
    role === "commercial"
  );
}

export function canEditReclamations(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "qualite" ||
    role === "ops" ||
    role === "manager"
  );
}

export function canEscalateReclamations(role: UserRole): boolean {
  return canEditReclamations(role);
}

export function isReclamationKind(v: unknown): v is ReclamationKind {
  return v === "reclamation" || v === "demande";
}

export function isReclamationPriority(v: unknown): v is ReclamationPriority {
  return (
    v === "basse" || v === "normale" || v === "haute" || v === "critique"
  );
}

export function isReclamationStatus(v: unknown): v is ReclamationStatus {
  return (
    v === "ouverte" ||
    v === "affectee" ||
    v === "en_cours" ||
    v === "escaladee" ||
    v === "resolue" ||
    v === "cloturee"
  );
}

export function isReclamationChannel(v: unknown): v is ReclamationChannel {
  return (
    typeof v === "string" &&
    RECLAMATION_CHANNELS.includes(v as ReclamationChannel)
  );
}

export function isEscalationLevel(v: unknown): v is EscalationLevel {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

export function computeSlaDueAt(
  fromIso: string,
  slaHours: number,
): string {
  const start = Date.parse(fromIso);
  const base = Number.isNaN(start) ? Date.now() : start;
  return new Date(base + slaHours * 60 * 60 * 1000).toISOString();
}

export function isSlaBreached(
  item: Pick<Reclamation, "slaDueAt" | "status" | "resolvedAt" | "closedAt">,
  now = Date.now(),
): boolean {
  const endIso =
    item.status === "resolue" || item.status === "cloturee"
      ? item.resolvedAt || item.closedAt
      : null;
  if (endIso) {
    return Date.parse(endIso) > Date.parse(item.slaDueAt);
  }
  return now > Date.parse(item.slaDueAt);
}

export function slaLabel(
  item: Pick<
    Reclamation,
    "slaDueAt" | "status" | "resolvedAt" | "closedAt" | "slaBreached"
  >,
): "OK" | "Retard" | "Résolu OK" | "Résolu hors SLA" {
  const breached = item.slaBreached || isSlaBreached(item);
  if (item.status === "resolue" || item.status === "cloturee") {
    return breached ? "Résolu hors SLA" : "Résolu OK";
  }
  return breached ? "Retard" : "OK";
}

/** Heures calendaires entre création et résolution (2 décimales). */
export function computeResolutionHours(
  createdAt: string,
  resolvedAt: string,
): number {
  const a = Date.parse(createdAt);
  const b = Date.parse(resolvedAt);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round(((b - a) / 3_600_000) * 100) / 100;
}

/**
 * Éléments requis pour marquer résolu (recette : délai mesurable).
 * La résolution fige `resolutionHours`.
 */
export function reclamationResolveRequirements(item: Reclamation): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!item.assigneeId || !item.assigneeName) missing.push("responsable");
  if (!item.resolutionNote.trim()) missing.push("note de résolution");
  return { ok: missing.length === 0, missing };
}

export function reclamationStats(items: Reclamation[]) {
  const open = items.filter(
    (r) => r.status !== "resolue" && r.status !== "cloturee",
  );
  const resolved = items.filter(
    (r) => r.status === "resolue" || r.status === "cloturee",
  );
  const breachedOpen = open.filter((r) => r.slaBreached || isSlaBreached(r));
  const withHours = resolved.filter(
    (r) => r.resolutionHours !== null && r.resolutionHours !== undefined,
  );
  const avgResolutionHours =
    withHours.length === 0
      ? null
      : Math.round(
          (withHours.reduce((s, r) => s + (r.resolutionHours ?? 0), 0) /
            withHours.length) *
            100,
        ) / 100;
  const withinSla = resolved.filter((r) => !isSlaBreached(r)).length;
  const slaRespectRate =
    resolved.length === 0
      ? null
      : Math.round((withinSla / resolved.length) * 1000) / 10;

  return {
    total: items.length,
    open: open.length,
    escalated: open.filter((r) => r.escalationLevel > 0).length,
    breached: breachedOpen.length,
    resolved: resolved.length,
    avgResolutionHours,
    slaRespectRate,
  };
}
