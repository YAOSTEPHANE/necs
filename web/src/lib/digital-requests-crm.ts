import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { upsertClientAndSubmit } from "@/lib/clients-crm";
import {
  notifyCommercialNewLead,
  upsertLeadFromWeb,
} from "@/lib/leads-crm";
import { importProspectFromLead } from "@/lib/prospects-crm";
import type { UserRole } from "@/lib/settings";
import {
  DIGITAL_CONVERT_LABELS,
  DIGITAL_SLA_HOURS,
  computeSlaDueAt,
  isDigitalChannel,
  isDigitalConvertKind,
  isDigitalPriority,
  isSlaBreached,
  type DigitalConversion,
  type DigitalConvertKind,
  type DigitalHistoryEntry,
  type DigitalPriority,
  type DigitalRequest,
  type DigitalRequestInput,
  type DigitalRequestStatus,
} from "@/lib/digital-requests-shared";

const COLLECTION = "digital_requests";
const TASKS = "crm_tasks";
const OPPS = "crm_opportunities";
const TICKETS = "crm_tickets";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function history(
  kind: DigitalHistoryEntry["kind"],
  actor: Actor,
  detail: string,
): DigitalHistoryEntry {
  return {
    id: `DH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    kind,
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

async function col() {
  const db = await getDb();
  const c = db.collection<DigitalRequest>(COLLECTION);
  void Promise.all([
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ assigneeEmail: 1, status: 1 }).catch(() => undefined),
    c.createIndex({ slaDueAt: 1 }).catch(() => undefined),
    c.createIndex({ createdAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

function withLiveSla(doc: DigitalRequest): DigitalRequest {
  const breached = isSlaBreached(doc);
  return { ...doc, slaBreached: breached };
}

export async function listDigitalRequests(
  actor: Actor,
): Promise<DigitalRequest[]> {
  const c = await col();
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(400).toArray();
  return rows.map((r) => withLiveSla(stripMongo(r) as DigitalRequest));
}

export async function getDigitalRequest(
  id: string,
): Promise<DigitalRequest | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return withLiveSla(stripMongo(row) as DigitalRequest);
}

export async function createDigitalRequest(
  input: DigitalRequestInput,
  actor: Actor,
): Promise<DigitalRequest> {
  const subject = clean(input.subject, 200);
  const message = clean(input.message, 8000);
  if (!subject || !message) {
    throw new Error("Sujet et message obligatoires.");
  }

  const priority: DigitalPriority = isDigitalPriority(input.priority)
    ? input.priority
    : "normale";
  const channel = isDigitalChannel(input.channel) ? input.channel : "contact";
  const slaHours = DIGITAL_SLA_HOURS[priority];
  const stamp = nowIso();
  const assigneeEmail = clean(input.assigneeEmail, 180).toLowerCase();
  const assigneeName = clean(input.assigneeName, 120);
  const status: DigitalRequestStatus = assigneeEmail ? "affecte" : "nouveau";

  const doc: DigitalRequest = {
    id: `MSG-${randomUUID().slice(0, 8).toUpperCase()}`,
    channel,
    subject,
    message,
    contactName: clean(input.contactName, 120),
    contactEmail: clean(input.contactEmail, 180).toLowerCase(),
    contactPhone: clean(input.contactPhone, 40),
    company: clean(input.company, 120),
    status,
    priority,
    assigneeEmail,
    assigneeName,
    slaHours,
    slaDueAt: computeSlaDueAt(stamp, priority, slaHours),
    slaBreached: false,
    conversion: null,
    note: clean(input.note, 2000),
    history: [
      history(
        "created",
        actor,
        `Demande créée · ${channel} · SLA ${slaHours}h · ${priority}`,
      ),
      ...(assigneeEmail
        ? [
            history(
              "assigned",
              actor,
              `Affecté à ${assigneeName || assigneeEmail}`,
            ),
          ]
        : []),
    ],
    createdAt: stamp,
    updatedAt: stamp,
    closedAt: null,
    createdBy: actor.userId,
    createdByName: actor.name,
  };

  const c = await col();
  await c.insertOne({ ...doc });
  return doc;
}

async function save(doc: DigitalRequest): Promise<DigitalRequest> {
  const next = { ...doc, updatedAt: nowIso(), slaBreached: isSlaBreached(doc) };
  const c = await col();
  await c.replaceOne({ id: doc.id }, next);
  return withLiveSla(next);
}

export async function assignDigitalRequest(
  id: string,
  input: { assigneeEmail: string; assigneeName?: string },
  actor: Actor,
): Promise<DigitalRequest> {
  const existing = await getDigitalRequest(id);
  if (!existing) throw new Error("Demande introuvable.");
  if (existing.status === "clos" || existing.status === "annule") {
    throw new Error("Demande clôturée.");
  }
  const email = clean(input.assigneeEmail, 180).toLowerCase();
  if (!email.includes("@")) throw new Error("E-mail destinataire invalide.");
  const name = clean(input.assigneeName, 120) || email;

  return save({
    ...existing,
    assigneeEmail: email,
    assigneeName: name,
    status: existing.status === "nouveau" ? "affecte" : existing.status,
    history: [
      history("assigned", actor, `Affecté à ${name} <${email}>`),
      ...existing.history,
    ].slice(0, 80),
  });
}

export async function updateDigitalRequestStatus(
  id: string,
  status: DigitalRequestStatus,
  actor: Actor,
  note = "",
): Promise<DigitalRequest> {
  const existing = await getDigitalRequest(id);
  if (!existing) throw new Error("Demande introuvable.");

  if (status === "clos") {
    return closeDigitalRequest(id, actor, note);
  }

  if (existing.status === "clos") {
    const stamp = nowIso();
    return save({
      ...existing,
      status,
      closedAt: null,
      note: clean(note, 2000) || existing.note,
      history: [
        history("reopened", actor, `Rouvert → ${status}`),
        ...existing.history,
      ].slice(0, 80),
      updatedAt: stamp,
    });
  }

  return save({
    ...existing,
    status,
    note: clean(note, 2000) || existing.note,
    history: [
      history("status", actor, `Statut ${existing.status} → ${status}`),
      ...existing.history,
    ].slice(0, 80),
  });
}

export async function setDigitalRequestPriority(
  id: string,
  priority: DigitalPriority,
  actor: Actor,
): Promise<DigitalRequest> {
  const existing = await getDigitalRequest(id);
  if (!existing) throw new Error("Demande introuvable.");
  if (existing.status === "clos" || existing.status === "annule") {
    throw new Error("Demande clôturée.");
  }
  const slaHours = DIGITAL_SLA_HOURS[priority];
  return save({
    ...existing,
    priority,
    slaHours,
    slaDueAt: computeSlaDueAt(existing.createdAt, priority, slaHours),
    history: [
      history(
        "priority",
        actor,
        `Priorité ${existing.priority} → ${priority} · SLA ${slaHours}h`,
      ),
      ...existing.history,
    ].slice(0, 80),
  });
}

async function createTaskArtifact(
  req: DigitalRequest,
  actor: Actor,
): Promise<DigitalConversion> {
  const db = await getDb();
  const id = `TSK-${randomUUID().slice(0, 8).toUpperCase()}`;
  const stamp = nowIso();
  await db.collection(TASKS).insertOne({
    id,
    title: req.subject,
    description: req.message,
    status: "ouverte",
    assigneeEmail: req.assigneeEmail || actor.email,
    assigneeName: req.assigneeName || actor.name,
    requestId: req.id,
    contactEmail: req.contactEmail,
    dueAt: req.slaDueAt,
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
  });
  return {
    kind: "tache",
    refId: id,
    label: `Tâche ${id}`,
    at: stamp,
    by: actor.userId,
    byName: actor.name,
  };
}

async function createOpportunityArtifact(
  req: DigitalRequest,
  actor: Actor,
): Promise<DigitalConversion> {
  const db = await getDb();
  const id = `OPP-${randomUUID().slice(0, 8).toUpperCase()}`;
  const stamp = nowIso();
  await db.collection(OPPS).insertOne({
    id,
    title: req.subject,
    description: req.message,
    stage: "qualification",
    amount: 0,
    contactName: req.contactName,
    contactEmail: req.contactEmail,
    company: req.company,
    requestId: req.id,
    ownerEmail: req.assigneeEmail || actor.email,
    ownerName: req.assigneeName || actor.name,
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
  });
  return {
    kind: "opportunite",
    refId: id,
    label: `Opportunité ${id}`,
    at: stamp,
    by: actor.userId,
    byName: actor.name,
  };
}

async function createTicketArtifact(
  req: DigitalRequest,
  actor: Actor,
): Promise<DigitalConversion> {
  const db = await getDb();
  const id = `TKT-${randomUUID().slice(0, 8).toUpperCase()}`;
  const stamp = nowIso();
  await db.collection(TICKETS).insertOne({
    id,
    subject: req.subject,
    body: req.message,
    status: "ouvert",
    priority: req.priority,
    slaDueAt: req.slaDueAt,
    contactName: req.contactName,
    contactEmail: req.contactEmail,
    contactPhone: req.contactPhone,
    requestId: req.id,
    assigneeEmail: req.assigneeEmail || actor.email,
    assigneeName: req.assigneeName || actor.name,
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
  });
  return {
    kind: "ticket",
    refId: id,
    label: `Ticket ${id}`,
    at: stamp,
    by: actor.userId,
    byName: actor.name,
  };
}

async function createLeadArtifact(
  req: DigitalRequest,
  actor: Actor,
): Promise<DigitalConversion> {
  const email =
    req.contactEmail ||
    `msg-${req.id.toLowerCase()}@digital.request`;
  const result = await upsertLeadFromWeb({
    name: req.contactName || email,
    company: req.company,
    email,
    phone: req.contactPhone,
    subject: req.subject,
    message: `[${req.id}] ${req.message}`,
    formType: "contact",
    source: req.channel === "site_web" ? "site_web" : req.channel,
    campaign: `digital_request`,
    medium: "digital_message",
    utmSource: req.channel,
    pagePath: `/admin/messages-digitaux`,
    consent: true,
  });
  if (result.created) {
    void notifyCommercialNewLead({ lead: result.lead, created: true }).catch(
      () => undefined,
    );
  }
  return {
    kind: "lead",
    refId: result.id,
    label: `Lead ${email}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
  };
}

async function createProspectArtifact(
  req: DigitalRequest,
  actor: Actor,
): Promise<DigitalConversion> {
  const email = clean(req.contactEmail, 180).toLowerCase();
  if (!email.includes("@")) {
    throw new Error("E-mail contact requis pour créer un prospect.");
  }
  const result = await importProspectFromLead(
    {
      email,
      name: req.contactName,
      company: req.company || req.contactName || email,
      phone: req.contactPhone,
      source: req.channel === "site_web" ? "site_web" : req.channel,
      campaign: "digital_request",
      subject: req.subject,
      message: `[${req.id}] ${req.message}`,
    },
    actor,
  );
  return {
    kind: "prospect",
    refId: result.prospect.id,
    label: result.created
      ? `Prospect ${result.prospect.id}`
      : `Prospect existant ${result.prospect.id}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
  };
}

async function createClientArtifact(
  req: DigitalRequest,
  actor: Actor,
): Promise<DigitalConversion> {
  const email = clean(req.contactEmail, 180).toLowerCase();
  if (!email.includes("@")) {
    throw new Error("E-mail contact requis pour créer un client.");
  }
  const result = await upsertClientAndSubmit({
    name: req.contactName || req.company || email,
    company: req.company || req.contactName || "",
    email,
    phone: req.contactPhone || "",
    city: "",
    address: "",
    siteType: "",
    surface: "",
    source: req.channel === "site_web" ? "site_web" : req.channel,
    campaign: "digital_request",
    formType: "contact",
    subject: req.subject || "Demande digitale",
    message: `[${req.id}] ${req.message}`,
    consent: true,
    status: "actif",
    createdBy: actor.email,
    createdByRole: actor.role,
    // Évite un second lead : la demande digitale est déjà tracée.
    submitRequest: false,
  });
  return {
    kind: "client",
    refId: result.clientId,
    label: result.created
      ? `Client ${result.clientId}`
      : `Client existant ${result.clientId}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
  };
}

export async function convertDigitalRequest(
  id: string,
  kind: DigitalConvertKind,
  actor: Actor,
): Promise<DigitalRequest> {
  if (!isDigitalConvertKind(kind)) {
    throw new Error("Type de conversion invalide.");
  }
  const existing = await getDigitalRequest(id);
  if (!existing) throw new Error("Demande introuvable.");
  if (existing.status === "clos" || existing.status === "annule") {
    throw new Error("Demande clôturée.");
  }
  if (existing.conversion) {
    throw new Error(
      `Déjà converti en ${DIGITAL_CONVERT_LABELS[existing.conversion.kind]} (${existing.conversion.refId}).`,
    );
  }

  let conversion: DigitalConversion;
  switch (kind) {
    case "prospect":
      conversion = await createProspectArtifact(existing, actor);
      break;
    case "client":
      conversion = await createClientArtifact(existing, actor);
      break;
    case "lead":
      conversion = await createLeadArtifact(existing, actor);
      break;
    case "tache":
      conversion = await createTaskArtifact(existing, actor);
      break;
    case "opportunite":
      conversion = await createOpportunityArtifact(existing, actor);
      break;
    case "ticket":
      conversion = await createTicketArtifact(existing, actor);
      break;
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Conversion non gérée: ${_exhaustive}`);
    }
  }

  return save({
    ...existing,
    status: "converti",
    conversion,
    history: [
      history(
        "converted",
        actor,
        `Converti → ${DIGITAL_CONVERT_LABELS[kind]} · ${conversion.refId}`,
      ),
      ...existing.history,
    ].slice(0, 80),
  });
}

export async function closeDigitalRequest(
  id: string,
  actor: Actor,
  note = "",
): Promise<DigitalRequest> {
  const existing = await getDigitalRequest(id);
  if (!existing) throw new Error("Demande introuvable.");
  if (existing.status === "clos") {
    throw new Error("Déjà clôturée.");
  }
  const stamp = nowIso();
  const closed: DigitalRequest = {
    ...existing,
    status: "clos",
    closedAt: stamp,
    note: clean(note, 2000) || existing.note,
    updatedAt: stamp,
    history: [
      history(
        "closed",
        actor,
        `Clôturée · SLA ${isSlaBreached({ ...existing, closedAt: stamp, status: "clos" }) ? "dépassé" : "respecté"}`,
      ),
      ...existing.history,
    ].slice(0, 80),
  };
  closed.slaBreached = isSlaBreached(closed);
  const c = await col();
  await c.replaceOne({ id }, closed);
  return withLiveSla(closed);
}

export async function countDigitalRequestAlerts(): Promise<{
  open: number;
  breached: number;
}> {
  const items = await listDigitalRequests({
    userId: "system",
    name: "system",
    email: "system@necs.cm",
    role: "admin",
  });
  const open = items.filter(
    (i) => i.status !== "clos" && i.status !== "annule",
  ).length;
  const breached = items.filter(
    (i) =>
      i.slaBreached && i.status !== "clos" && i.status !== "annule",
  ).length;
  return { open, breached };
}
