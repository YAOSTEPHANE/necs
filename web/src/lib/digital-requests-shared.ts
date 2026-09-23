import type { UserRole } from "@/lib/settings";

export type DigitalChannel =
  | "site_web"
  | "contact"
  | "facebook"
  | "whatsapp"
  | "email"
  | "telephone"
  | "autre";

export type DigitalRequestStatus =
  | "nouveau"
  | "affecte"
  | "en_cours"
  | "converti"
  | "clos"
  | "annule";

export type DigitalPriority = "basse" | "normale" | "haute" | "critique";

export type DigitalConvertKind =
  | "prospect"
  | "client"
  | "lead"
  | "tache"
  | "opportunite"
  | "ticket";

export type DigitalHistoryKind =
  | "created"
  | "assigned"
  | "status"
  | "priority"
  | "converted"
  | "closed"
  | "reopened"
  | "note";

export type DigitalHistoryEntry = {
  id: string;
  at: string;
  kind: DigitalHistoryKind;
  by: string;
  byName: string;
  detail: string;
};

export type DigitalConversion = {
  kind: DigitalConvertKind;
  refId: string;
  label: string;
  at: string;
  by: string;
  byName: string;
};

export type DigitalRequest = {
  id: string;
  channel: DigitalChannel;
  subject: string;
  message: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  company: string;
  status: DigitalRequestStatus;
  priority: DigitalPriority;
  assigneeEmail: string;
  assigneeName: string;
  /** SLA en heures selon priorité (configurable à la création). */
  slaHours: number;
  slaDueAt: string;
  slaBreached: boolean;
  conversion: DigitalConversion | null;
  note: string;
  history: DigitalHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  createdBy: string;
  createdByName: string;
};

export type DigitalRequestInput = {
  channel?: DigitalChannel;
  subject: string;
  message: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  company?: string;
  priority?: DigitalPriority;
  assigneeEmail?: string;
  assigneeName?: string;
  note?: string;
};

export const DIGITAL_CHANNEL_LABELS: Record<DigitalChannel, string> = {
  site_web: "Site web",
  contact: "Formulaire contact",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  email: "E-mail",
  telephone: "Téléphone",
  autre: "Autre",
};

export const DIGITAL_STATUS_LABELS: Record<DigitalRequestStatus, string> = {
  nouveau: "Nouveau",
  affecte: "Affecté",
  en_cours: "En cours",
  converti: "Converti",
  clos: "Clos",
  annule: "Annulé",
};

export const DIGITAL_PRIORITY_LABELS: Record<DigitalPriority, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  critique: "Critique",
};

export const DIGITAL_CONVERT_LABELS: Record<DigitalConvertKind, string> = {
  prospect: "Prospect",
  client: "Client",
  lead: "Lead CRM",
  tache: "Tâche",
  opportunite: "Opportunité",
  ticket: "Ticket",
};

/** SLA par défaut (heures ouvrées simplifiées = heures calendaires). */
export const DIGITAL_SLA_HOURS: Record<DigitalPriority, number> = {
  basse: 72,
  normale: 24,
  haute: 8,
  critique: 2,
};

export const DIGITAL_CHANNELS = Object.keys(
  DIGITAL_CHANNEL_LABELS,
) as DigitalChannel[];
export const DIGITAL_STATUSES = Object.keys(
  DIGITAL_STATUS_LABELS,
) as DigitalRequestStatus[];
export const DIGITAL_PRIORITIES = Object.keys(
  DIGITAL_PRIORITY_LABELS,
) as DigitalPriority[];
export const DIGITAL_CONVERT_KINDS = Object.keys(
  DIGITAL_CONVERT_LABELS,
) as DigitalConvertKind[];

export function canAccessDigitalRequests(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "qualite" ||
    role === "marketing"
  );
}

/** Commercial + service client (qualité) + admin. */
export function canManageDigitalRequests(role: UserRole): boolean {
  return role === "admin" || role === "commercial" || role === "qualite";
}

export function isDigitalChannel(v: unknown): v is DigitalChannel {
  return typeof v === "string" && DIGITAL_CHANNELS.includes(v as DigitalChannel);
}

export function isDigitalPriority(v: unknown): v is DigitalPriority {
  return (
    typeof v === "string" && DIGITAL_PRIORITIES.includes(v as DigitalPriority)
  );
}

export function isDigitalStatus(v: unknown): v is DigitalRequestStatus {
  return typeof v === "string" && DIGITAL_STATUSES.includes(v as DigitalRequestStatus);
}

export function isDigitalConvertKind(v: unknown): v is DigitalConvertKind {
  return (
    typeof v === "string" &&
    DIGITAL_CONVERT_KINDS.includes(v as DigitalConvertKind)
  );
}

export function computeSlaDueAt(
  fromIso: string,
  priority: DigitalPriority,
  slaHours = DIGITAL_SLA_HOURS[priority],
): string {
  const start = Date.parse(fromIso);
  const base = Number.isNaN(start) ? Date.now() : start;
  return new Date(base + slaHours * 60 * 60 * 1000).toISOString();
}

export function isSlaBreached(
  req: Pick<DigitalRequest, "slaDueAt" | "status" | "closedAt">,
  now = Date.now(),
): boolean {
  if (req.status === "clos" || req.status === "annule") {
    if (!req.closedAt) return false;
    return Date.parse(req.closedAt) > Date.parse(req.slaDueAt);
  }
  return now > Date.parse(req.slaDueAt);
}

export function slaLabel(
  req: Pick<DigitalRequest, "slaDueAt" | "status" | "closedAt" | "slaBreached">,
): "OK" | "Retard" | "Clos OK" | "Clos hors SLA" {
  const breached = req.slaBreached || isSlaBreached(req);
  if (req.status === "clos" || req.status === "annule") {
    return breached ? "Clos hors SLA" : "Clos OK";
  }
  return breached ? "Retard" : "OK";
}
