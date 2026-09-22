import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { getOpsSite, listOpsSites } from "@/lib/ops-referential-crm";
import { listUsers } from "@/lib/users-repo";
import type { UserRole } from "@/lib/settings";
import {
  ESCALATION_LABELS,
  ESCALATION_SLA_CAP_HOURS,
  RECLAMATION_SLA_HOURS,
  computeResolutionHours,
  computeSlaDueAt,
  isEscalationLevel,
  isReclamationChannel,
  isReclamationKind,
  isReclamationPriority,
  isReclamationStatus,
  isSlaBreached,
  reclamationResolveRequirements,
  type EscalationLevel,
  type Reclamation,
  type ReclamationChannel,
  type ReclamationHistoryEntry,
  type ReclamationInput,
  type ReclamationKind,
  type ReclamationPriority,
  type ReclamationStatus,
} from "@/lib/reclamations-shared";

const COL = "reclamations";

type Actor = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
};

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(
  kind: ReclamationHistoryEntry["kind"],
  actor: Actor,
  detail: string,
): ReclamationHistoryEntry {
  return {
    id: `RH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    kind,
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

async function col() {
  const db = await getDb();
  const c = db.collection<Reclamation>(COL);
  void Promise.all([
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ priority: 1, status: 1 }).catch(() => undefined),
    c.createIndex({ slaDueAt: 1 }).catch(() => undefined),
    c.createIndex({ ref: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ assigneeId: 1, status: 1 }).catch(() => undefined),
    c.createIndex({ siteId: 1, updatedAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

function coerce(raw: Record<string, unknown>): Reclamation {
  const status: ReclamationStatus = isReclamationStatus(raw.status)
    ? raw.status
    : "ouverte";
  const priority: ReclamationPriority = isReclamationPriority(raw.priority)
    ? raw.priority
    : "normale";
  const escalationRaw = Number(raw.escalationLevel ?? 0);
  const escalationLevel: EscalationLevel = isEscalationLevel(escalationRaw)
    ? escalationRaw
    : 0;
  const base: Reclamation = {
    id: String(raw.id ?? ""),
    ref: String(raw.ref ?? ""),
    kind: isReclamationKind(raw.kind) ? raw.kind : "reclamation",
    subject: String(raw.subject ?? ""),
    description: String(raw.description ?? ""),
    channel: isReclamationChannel(raw.channel) ? raw.channel : "telephone",
    clientName: String(raw.clientName ?? ""),
    company: String(raw.company ?? ""),
    contactEmail: String(raw.contactEmail ?? ""),
    contactPhone: String(raw.contactPhone ?? ""),
    siteId: String(raw.siteId ?? ""),
    siteName: String(raw.siteName ?? ""),
    priority,
    status,
    escalationLevel,
    escalatedAt:
      raw.escalatedAt === null || raw.escalatedAt === undefined
        ? null
        : String(raw.escalatedAt),
    assigneeId: String(raw.assigneeId ?? ""),
    assigneeName: String(raw.assigneeName ?? ""),
    slaHours:
      typeof raw.slaHours === "number" && raw.slaHours > 0
        ? raw.slaHours
        : RECLAMATION_SLA_HOURS[priority],
    slaDueAt: String(raw.slaDueAt ?? nowIso()),
    slaBreached: Boolean(raw.slaBreached),
    resolutionNote: String(raw.resolutionNote ?? ""),
    resolvedAt:
      raw.resolvedAt === null || raw.resolvedAt === undefined
        ? null
        : String(raw.resolvedAt),
    resolvedBy: String(raw.resolvedBy ?? ""),
    resolvedByName: String(raw.resolvedByName ?? ""),
    resolutionHours:
      raw.resolutionHours === null || raw.resolutionHours === undefined
        ? null
        : Number(raw.resolutionHours),
    closedAt:
      raw.closedAt === null || raw.closedAt === undefined
        ? null
        : String(raw.closedAt),
    closedBy: String(raw.closedBy ?? ""),
    closedByName: String(raw.closedByName ?? ""),
    history: Array.isArray(raw.history)
      ? (raw.history as ReclamationHistoryEntry[])
      : [],
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
  };
  return { ...base, slaBreached: isSlaBreached(base) };
}

async function save(item: Reclamation): Promise<Reclamation> {
  const next = {
    ...item,
    updatedAt: nowIso(),
    slaBreached: isSlaBreached(item),
  };
  const c = await col();
  await c.replaceOne({ id: next.id }, next, { upsert: true });
  return coerce(next as unknown as Record<string, unknown>);
}

export async function listReclamations(filter?: {
  status?: ReclamationStatus;
  priority?: ReclamationPriority;
  kind?: ReclamationKind;
  siteId?: string;
}): Promise<Reclamation[]> {
  const c = await col();
  const q: Record<string, unknown> = {};
  if (filter?.status) q.status = filter.status;
  if (filter?.priority) q.priority = filter.priority;
  if (filter?.kind) q.kind = filter.kind;
  if (filter?.siteId) q.siteId = filter.siteId;
  const rows = await c.find(q).sort({ updatedAt: -1 }).limit(400).toArray();
  return rows.map((r) => coerce(stripMongo(r) as Record<string, unknown>));
}

export async function getReclamation(
  id: string,
): Promise<Reclamation | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerce(stripMongo(row) as Record<string, unknown>);
}

export async function listReclamationSites(): Promise<
  Array<{ id: string; name: string }>
> {
  const sites = await listOpsSites();
  return sites.map((s) => ({
    id: s.id,
    name: `${s.company} · ${s.name}`,
  }));
}

export async function listReclamationAssignees(): Promise<
  Array<{ id: string; name: string; role: string }>
> {
  const users = await listUsers();
  return users
    .filter((u) =>
      ["admin", "qualite", "ops", "manager", "commercial"].includes(u.role),
    )
    .map((u) => ({
      id: u.id,
      name: u.name || u.email,
      role: u.role,
    }));
}

export async function createReclamation(
  input: ReclamationInput,
  actor: Actor,
): Promise<Reclamation> {
  const subject = clean(input.subject, 200);
  if (!subject) throw new Error("Objet de la réclamation requis.");

  const kind: ReclamationKind = isReclamationKind(input.kind)
    ? input.kind
    : "reclamation";
  const priority: ReclamationPriority = isReclamationPriority(input.priority)
    ? input.priority
    : "normale";
  const channel: ReclamationChannel = isReclamationChannel(input.channel)
    ? input.channel
    : "telephone";
  const slaHours = RECLAMATION_SLA_HOURS[priority];
  const now = nowIso();

  let siteId = "";
  let siteName = "";
  if (input.siteId) {
    const site = await getOpsSite(clean(input.siteId, 80));
    if (site) {
      siteId = site.id;
      siteName = `${site.company} · ${site.name}`;
    }
  }

  let assigneeId = "";
  let assigneeName = "";
  let status: ReclamationStatus = "ouverte";
  if (input.assigneeId) {
    const users = await listUsers();
    const u = users.find((x) => x.id === clean(input.assigneeId, 80));
    if (u) {
      assigneeId = u.id;
      assigneeName = u.name || u.email;
      status = "affectee";
    }
  }

  const id = `REC-${randomUUID().slice(0, 10).toUpperCase()}`;
  const ref = `REC-${Date.now().toString(36).toUpperCase()}`;

  const doc: Reclamation = {
    id,
    ref,
    kind,
    subject,
    description: clean(input.description, 8000),
    channel,
    clientName: clean(input.clientName, 120),
    company: clean(input.company, 120),
    contactEmail: clean(input.contactEmail, 180).toLowerCase(),
    contactPhone: clean(input.contactPhone, 40),
    siteId,
    siteName,
    priority,
    status,
    escalationLevel: 0,
    escalatedAt: null,
    assigneeId,
    assigneeName,
    slaHours,
    slaDueAt: computeSlaDueAt(now, slaHours),
    slaBreached: false,
    resolutionNote: "",
    resolvedAt: null,
    resolvedBy: "",
    resolvedByName: "",
    resolutionHours: null,
    closedAt: null,
    closedBy: "",
    closedByName: "",
    history: [
      hist(
        "created",
        actor,
        `${RECLAMATION_KIND_LABEL_SAFE(kind)} créée · ${priority} · SLA ${slaHours}h`,
      ),
      ...(assigneeId
        ? [hist("assigned", actor, `Affecté à ${assigneeName}`)]
        : []),
    ],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
  };

  return save(doc);
}

function RECLAMATION_KIND_LABEL_SAFE(kind: ReclamationKind): string {
  return kind === "demande" ? "Demande" : "Réclamation";
}

export async function assignReclamation(
  id: string,
  input: { assigneeId: string },
  actor: Actor,
): Promise<Reclamation> {
  const item = await getReclamation(id);
  if (!item) throw new Error("Réclamation introuvable.");
  if (item.status === "cloturee") throw new Error("Réclamation clôturée.");

  const users = await listUsers();
  const u = users.find((x) => x.id === clean(input.assigneeId, 80));
  if (!u) throw new Error("Responsable introuvable.");

  const reopen = item.status === "resolue";
  const nextStatus: ReclamationStatus = reopen
    ? "en_cours"
    : item.status === "ouverte" || item.status === "affectee"
      ? "affectee"
      : item.status;

  return save({
    ...item,
    assigneeId: u.id,
    assigneeName: u.name || u.email,
    status: nextStatus,
    resolvedAt: reopen ? null : item.resolvedAt,
    resolutionHours: reopen ? null : item.resolutionHours,
    history: [
      hist("assigned", actor, `Affecté à ${u.name || u.email}`),
      ...item.history,
    ].slice(0, 80),
  });
}

export async function setReclamationPriority(
  id: string,
  priority: ReclamationPriority,
  actor: Actor,
): Promise<Reclamation> {
  const item = await getReclamation(id);
  if (!item) throw new Error("Réclamation introuvable.");
  if (item.status === "cloturee" || item.status === "resolue") {
    throw new Error("Réclamation déjà résolue.");
  }
  const slaHours = RECLAMATION_SLA_HOURS[priority];
  return save({
    ...item,
    priority,
    slaHours,
    slaDueAt: computeSlaDueAt(item.createdAt, slaHours),
    history: [
      hist(
        "priority",
        actor,
        `Priorité ${item.priority} → ${priority} · SLA ${slaHours}h`,
      ),
      ...item.history,
    ].slice(0, 80),
  });
}

export async function updateReclamationStatus(
  id: string,
  status: ReclamationStatus,
  actor: Actor,
): Promise<Reclamation> {
  const item = await getReclamation(id);
  if (!item) throw new Error("Réclamation introuvable.");
  if (item.status === "cloturee") throw new Error("Réclamation clôturée.");
  if (status === "resolue") {
    throw new Error("Utilisez l’action résoudre pour figer le délai.");
  }
  if (status === "cloturee") {
    throw new Error("Utilisez l’action clôturer.");
  }
  return save({
    ...item,
    status,
    history: [
      hist("status", actor, `Statut ${item.status} → ${status}`),
      ...item.history,
    ].slice(0, 80),
  });
}

export async function escalateReclamation(
  id: string,
  input: { note?: string },
  actor: Actor,
): Promise<Reclamation> {
  const item = await getReclamation(id);
  if (!item) throw new Error("Réclamation introuvable.");
  if (item.status === "cloturee" || item.status === "resolue") {
    throw new Error("Réclamation déjà résolue.");
  }
  if (item.escalationLevel >= 3) {
    throw new Error("Escalade maximale (direction) déjà atteinte.");
  }

  const nextLevel = (item.escalationLevel + 1) as 1 | 2 | 3;
  const cap = ESCALATION_SLA_CAP_HOURS[nextLevel];
  const stamp = nowIso();
  const note = clean(input.note, 500);

  return save({
    ...item,
    escalationLevel: nextLevel,
    escalatedAt: stamp,
    status: "escaladee",
    slaHours: Math.min(item.slaHours, cap),
    slaDueAt: computeSlaDueAt(stamp, Math.min(item.slaHours, cap)),
    history: [
      hist(
        "escalated",
        actor,
        `Escalade → ${ESCALATION_LABELS[nextLevel]} · SLA cap ${cap}h${note ? ` · ${note}` : ""}`,
      ),
      ...item.history,
    ].slice(0, 80),
  });
}

export async function resolveReclamation(
  id: string,
  input: { resolutionNote: string },
  actor: Actor,
): Promise<Reclamation> {
  const item = await getReclamation(id);
  if (!item) throw new Error("Réclamation introuvable.");
  if (item.status === "cloturee") throw new Error("Réclamation clôturée.");
  if (item.status === "resolue") throw new Error("Déjà résolue.");

  const resolutionNote = clean(input.resolutionNote, 4000);
  const draft: Reclamation = { ...item, resolutionNote };
  const gate = reclamationResolveRequirements(draft);
  if (!gate.ok) {
    throw new Error(
      `Résolution impossible — manquant : ${gate.missing.join(", ")}.`,
    );
  }

  const stamp = nowIso();
  const resolutionHours = computeResolutionHours(item.createdAt, stamp);
  const resolved: Reclamation = {
    ...draft,
    status: "resolue",
    resolutionNote,
    resolvedAt: stamp,
    resolvedBy: actor.userId,
    resolvedByName: actor.name,
    resolutionHours,
    history: [
      hist(
        "resolved",
        actor,
        `Résolue en ${resolutionHours} h · SLA ${isSlaBreached({ ...draft, status: "resolue", resolvedAt: stamp }) ? "dépassé" : "respecté"}`,
      ),
      ...item.history,
    ].slice(0, 80),
  };
  resolved.slaBreached = isSlaBreached(resolved);
  return save(resolved);
}

export async function closeReclamation(
  id: string,
  actor: Actor,
): Promise<Reclamation> {
  const item = await getReclamation(id);
  if (!item) throw new Error("Réclamation introuvable.");
  if (item.status === "cloturee") throw new Error("Déjà clôturée.");
  if (item.status !== "resolue" || item.resolutionHours === null) {
    throw new Error(
      "Clôture réservée aux dossiers résolus (délai de résolution mesuré).",
    );
  }

  const stamp = nowIso();
  return save({
    ...item,
    status: "cloturee",
    closedAt: stamp,
    closedBy: actor.userId,
    closedByName: actor.name,
    history: [
      hist(
        "closed",
        actor,
        `Clôturée · délai ${item.resolutionHours} h`,
      ),
      ...item.history,
    ].slice(0, 80),
  });
}

export async function addReclamationNote(
  id: string,
  note: string,
  actor: Actor,
): Promise<Reclamation> {
  const item = await getReclamation(id);
  if (!item) throw new Error("Réclamation introuvable.");
  const detail = clean(note, 500);
  if (!detail) throw new Error("Note vide.");
  return save({
    ...item,
    history: [hist("note", actor, detail), ...item.history].slice(0, 80),
  });
}
