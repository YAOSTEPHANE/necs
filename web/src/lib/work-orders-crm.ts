import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { getOpsSite } from "@/lib/ops-referential-crm";
import { getPlanningSlot } from "@/lib/ops-planning-crm";
import type { UserRole } from "@/lib/settings";
import {
  defaultChecklist,
  defaultRequiredProofs,
  isProofKind,
  isWorkOrderStatus,
  isTraceableToClosure,
  proofCoverage,
  type ProofKind,
  type WorkOrder,
  type WorkOrderChecklistItem,
  type WorkOrderProof,
  type WorkOrderStatus,
} from "@/lib/work-orders-shared";

const COLLECTION = "ops_work_orders";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 8000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string) {
  return {
    id: `WOH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
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
  const c = db.collection<WorkOrder>(COLLECTION);
  void Promise.all([
    c.createIndex({ status: 1, date: -1 }).catch(() => undefined),
    c.createIndex({ planningSlotId: 1 }).catch(() => undefined),
    c.createIndex({ "agents.userId": 1, date: -1 }).catch(() => undefined),
    c.createIndex({ siteId: 1, date: -1 }).catch(() => undefined),
    c.createIndex({ ref: 1 }, { unique: true }).catch(() => undefined),
  ]);
  return c;
}

function coerceOrder(raw: Record<string, unknown>): WorkOrder {
  return {
    id: String(raw.id ?? ""),
    ref: String(raw.ref ?? ""),
    planningSlotId: String(raw.planningSlotId ?? ""),
    clientId: String(raw.clientId ?? ""),
    contractId: String(raw.contractId ?? ""),
    siteId: String(raw.siteId ?? ""),
    prestationId: String(raw.prestationId ?? ""),
    clientName: String(raw.clientName ?? ""),
    siteName: String(raw.siteName ?? ""),
    siteAddress: String(raw.siteAddress ?? ""),
    prestationLabel: String(raw.prestationLabel ?? ""),
    date: String(raw.date ?? ""),
    startTime: String(raw.startTime ?? ""),
    endTime: String(raw.endTime ?? ""),
    status: isWorkOrderStatus(raw.status) ? raw.status : "planifie",
    consignes: String(raw.consignes ?? ""),
    materiel: String(raw.materiel ?? ""),
    requiredProofs: Array.isArray(raw.requiredProofs)
      ? (raw.requiredProofs as WorkOrder["requiredProofs"])
      : defaultRequiredProofs(),
    proofs: Array.isArray(raw.proofs)
      ? (raw.proofs as WorkOrderProof[])
      : [],
    checklist: Array.isArray(raw.checklist)
      ? (raw.checklist as WorkOrderChecklistItem[])
      : [],
    agents: Array.isArray(raw.agents)
      ? (raw.agents as WorkOrder["agents"])
      : [],
    supervisorId: String(raw.supervisorId ?? ""),
    supervisorName: String(raw.supervisorName ?? ""),
    startedAt: raw.startedAt ? String(raw.startedAt) : null,
    completedAt: raw.completedAt ? String(raw.completedAt) : null,
    closedAt: raw.closedAt ? String(raw.closedAt) : null,
    closedBy: String(raw.closedBy ?? ""),
    closedByName: String(raw.closedByName ?? ""),
    anomalyNote: String(raw.anomalyNote ?? ""),
    history: Array.isArray(raw.history)
      ? (raw.history as WorkOrder["history"])
      : [],
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
  };
}

async function save(doc: WorkOrder): Promise<WorkOrder> {
  const next = { ...doc, updatedAt: nowIso() };
  await (await col()).replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

function buildRef(): string {
  return `NECS-OT-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function listWorkOrders(actor: Actor): Promise<WorkOrder[]> {
  const c = await col();
  const filter =
    actor.role === "nettoyeur"
      ? { "agents.userId": actor.userId }
      : {};
  const rows = await c.find(filter).sort({ date: -1, startTime: -1 }).limit(400).toArray();
  return rows.map((r) => coerceOrder(stripMongo(r) as Record<string, unknown>));
}

export async function getWorkOrder(id: string): Promise<WorkOrder | null> {
  const row = await (await col()).findOne({ id });
  if (!row) return null;
  return coerceOrder(stripMongo(row) as Record<string, unknown>);
}

export async function createWorkOrderFromPlanning(
  planningSlotId: string,
  actor: Actor,
  opts?: { consignes?: string; materiel?: string },
): Promise<WorkOrder> {
  const slot = await getPlanningSlot(planningSlotId);
  if (!slot) throw new Error("Créneau planning introuvable.");

  const existing = await (await col()).findOne({ planningSlotId });
  if (existing) {
    throw new Error(
      `Un OT existe déjà pour ce créneau (${existing.ref}).`,
    );
  }

  const site = await getOpsSite(slot.siteId);
  const prestation = site?.prestations.find((p) => p.id === slot.prestationId);
  const consignes =
    clean(opts?.consignes, 8000) ||
    prestation?.consignes ||
    site?.consignes ||
    slot.note ||
    "";

  const agents = slot.assignments
    .filter((a) => a.status === "planifie")
    .map((a) => ({
      userId: a.agentUserId,
      name: a.agentName,
      email: a.agentEmail,
    }));

  if (agents.length === 0) {
    throw new Error("Aucun agent planifié sur ce créneau.");
  }

  const stamp = nowIso();
  const order: WorkOrder = {
    id: `OT-${randomUUID().slice(0, 8).toUpperCase()}`,
    ref: buildRef(),
    planningSlotId: slot.id,
    clientId: slot.clientId,
    contractId: slot.contractId,
    siteId: slot.siteId,
    prestationId: slot.prestationId,
    clientName: slot.clientName,
    siteName: slot.siteName,
    siteAddress: site
      ? [site.address, site.city].filter(Boolean).join(", ")
      : "",
    prestationLabel: slot.prestationLabel,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    status: "planifie",
    consignes,
    materiel: clean(opts?.materiel, 2000),
    requiredProofs: defaultRequiredProofs(),
    proofs: [],
    checklist: defaultChecklist(slot.prestationLabel),
    agents,
    supervisorId: actor.userId,
    supervisorName: actor.name,
    startedAt: null,
    completedAt: null,
    closedAt: null,
    closedBy: "",
    closedByName: "",
    anomalyNote: "",
    history: [
      hist(
        actor,
        `OT créé depuis planning ${slot.id} · ${slot.prestationLabel} @ ${slot.siteName} · ${agents.length} agent(s)`,
      ),
    ],
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
  };

  return save(order);
}

export async function createManualWorkOrder(
  input: {
    siteId: string;
    prestationId: string;
    date: string;
    startTime: string;
    endTime: string;
    agentUserIds: string[];
    consignes?: string;
    materiel?: string;
  },
  actor: Actor,
  agentsCatalog: Array<{ id: string; name: string; email: string }>,
): Promise<WorkOrder> {
  const site = await getOpsSite(input.siteId);
  if (!site) throw new Error("Site introuvable.");
  if (site.status !== "actif") throw new Error("Site inactif.");
  const prestation = site.prestations.find((p) => p.id === input.prestationId);
  if (!prestation) throw new Error("Prestation introuvable.");

  const agents = input.agentUserIds
    .map((id) => {
      const a = agentsCatalog.find((x) => x.id === id);
      return a
        ? { userId: a.id, name: a.name, email: a.email }
        : null;
    })
    .filter(Boolean) as WorkOrder["agents"];

  if (agents.length === 0) throw new Error("Au moins un agent requis.");

  const stamp = nowIso();
  const order: WorkOrder = {
    id: `OT-${randomUUID().slice(0, 8).toUpperCase()}`,
    ref: buildRef(),
    planningSlotId: "",
    clientId: site.clientId,
    contractId: site.contractId,
    siteId: site.id,
    prestationId: prestation.id,
    clientName: site.company,
    siteName: site.name,
    siteAddress: [site.address, site.city].filter(Boolean).join(", "),
    prestationLabel: prestation.label,
    date: clean(input.date, 12),
    startTime: clean(input.startTime, 8),
    endTime: clean(input.endTime, 8),
    status: "planifie",
    consignes: clean(input.consignes, 8000) || prestation.consignes || site.consignes,
    materiel: clean(input.materiel, 2000),
    requiredProofs: defaultRequiredProofs(),
    proofs: [],
    checklist: defaultChecklist(prestation.label),
    agents,
    supervisorId: actor.userId,
    supervisorName: actor.name,
    startedAt: null,
    completedAt: null,
    closedAt: null,
    closedBy: "",
    closedByName: "",
    anomalyNote: "",
    history: [
      hist(actor, `OT manuel · ${prestation.label} @ ${site.name}`),
    ],
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
  };
  return save(order);
}

function assertAgentOrSupervisor(order: WorkOrder, actor: Actor) {
  const isAgent = order.agents.some((a) => a.userId === actor.userId);
  const isSuper =
    actor.role === "admin" ||
    actor.role === "ops" ||
    actor.role === "manager" ||
    actor.role === "qualite";
  if (!isAgent && !isSuper) {
    throw new Error("Non affecté à cette mission.");
  }
}

export async function startWorkOrder(
  id: string,
  actor: Actor,
): Promise<WorkOrder> {
  const order = await getWorkOrder(id);
  if (!order) throw new Error("OT introuvable.");
  assertAgentOrSupervisor(order, actor);
  if (order.status === "cloture") throw new Error("Mission déjà clôturée.");
  if (order.status === "termine") throw new Error("Mission déjà terminée.");
  order.status = "en_cours";
  order.startedAt = order.startedAt || nowIso();
  order.history = [
    hist(actor, "Mission démarrée"),
    ...order.history,
  ].slice(0, 100);
  return save(order);
}

export async function addWorkOrderProof(
  id: string,
  input: { kind: ProofKind; url: string; caption?: string },
  actor: Actor,
): Promise<WorkOrder> {
  const order = await getWorkOrder(id);
  if (!order) throw new Error("OT introuvable.");
  assertAgentOrSupervisor(order, actor);
  if (order.status === "cloture") throw new Error("Mission clôturée.");
  if (order.status === "planifie") {
    order.status = "en_cours";
    order.startedAt = order.startedAt || nowIso();
  }
  const kind = isProofKind(input.kind) ? input.kind : "autre";
  const url = clean(input.url, 2_000_000);
  if (!url) throw new Error("Preuve (image) requise.");

  const proof: WorkOrderProof = {
    id: `PRF-${randomUUID().slice(0, 8).toUpperCase()}`,
    kind,
    url,
    caption: clean(input.caption, 200),
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
  };
  order.proofs = [proof, ...order.proofs].slice(0, 60);
  order.history = [
    hist(actor, `Preuve ajoutée · ${kind}`),
    ...order.history,
  ].slice(0, 100);
  return save(order);
}

export async function toggleWorkOrderChecklist(
  id: string,
  itemId: string,
  done: boolean,
  actor: Actor,
): Promise<WorkOrder> {
  const order = await getWorkOrder(id);
  if (!order) throw new Error("OT introuvable.");
  assertAgentOrSupervisor(order, actor);
  if (order.status === "cloture") throw new Error("Mission clôturée.");
  if (order.status === "planifie") {
    order.status = "en_cours";
    order.startedAt = order.startedAt || nowIso();
  }
  order.checklist = order.checklist.map((c) =>
    c.id === itemId
      ? {
          ...c,
          done,
          doneAt: done ? nowIso() : null,
          doneBy: done ? actor.userId : "",
          doneByName: done ? actor.name : "",
        }
      : c,
  );
  order.history = [
    hist(actor, `Checklist « ${itemId} » → ${done ? "OK" : "à faire"}`),
    ...order.history,
  ].slice(0, 100);
  return save(order);
}

export async function completeWorkOrder(
  id: string,
  actor: Actor,
): Promise<WorkOrder> {
  const order = await getWorkOrder(id);
  if (!order) throw new Error("OT introuvable.");
  assertAgentOrSupervisor(order, actor);
  if (order.status === "cloture") throw new Error("Déjà clôturé.");
  const coverage = proofCoverage(order);
  if (!coverage.ok) {
    throw new Error(
      `Preuves obligatoires manquantes : ${coverage.missing.join(" · ")}`,
    );
  }
  order.status = "termine";
  order.completedAt = nowIso();
  order.history = [
    hist(actor, "Mission marquée terminée — preuves OK"),
    ...order.history,
  ].slice(0, 100);
  return save(order);
}

export async function flagWorkOrderAnomaly(
  id: string,
  note: string,
  actor: Actor,
): Promise<WorkOrder> {
  const order = await getWorkOrder(id);
  if (!order) throw new Error("OT introuvable.");
  assertAgentOrSupervisor(order, actor);
  if (order.status === "cloture") throw new Error("Mission clôturée.");
  const anomalyNote = clean(note, 2000);
  if (!anomalyNote) throw new Error("Motif d’anomalie requis.");
  order.status = "anomalie";
  order.anomalyNote = anomalyNote;
  order.history = [
    hist(actor, `Anomalie · ${anomalyNote}`),
    ...order.history,
  ].slice(0, 100);
  return save(order);
}

/**
 * Recette OPS-03 : clôture superviseur — mission traçable jusqu’à la fin.
 */
export async function closeWorkOrder(
  id: string,
  actor: Actor,
): Promise<WorkOrder> {
  if (
    actor.role !== "admin" &&
    actor.role !== "ops" &&
    actor.role !== "manager"
  ) {
    throw new Error("Clôture réservée au superviseur.");
  }
  const order = await getWorkOrder(id);
  if (!order) throw new Error("OT introuvable.");
  if (order.status !== "termine" && order.status !== "anomalie") {
    throw new Error(
      "Clôture possible uniquement si terminé ou anomalie traitée.",
    );
  }
  if (order.status === "termine") {
    const coverage = proofCoverage(order);
    if (!coverage.ok) {
      throw new Error(
        `Impossible de clôturer : ${coverage.missing.join(" · ")}`,
      );
    }
  }
  const stamp = nowIso();
  order.status = "cloture";
  order.closedAt = stamp;
  order.closedBy = actor.userId;
  order.closedByName = actor.name;
  order.history = [
    hist(actor, `Mission clôturée · traçabilité complète`),
    ...order.history,
  ].slice(0, 100);

  const trace = isTraceableToClosure(order);
  if (!trace.ok) {
    throw new Error(
      `Traçabilité incomplète : ${trace.steps
        .filter((s) => !s.ok)
        .map((s) => s.detail)
        .join(" · ")}`,
    );
  }
  return save(order);
}

export async function updateWorkOrderMeta(
  id: string,
  patch: { consignes?: string; materiel?: string },
  actor: Actor,
): Promise<WorkOrder> {
  if (
    actor.role !== "admin" &&
    actor.role !== "ops" &&
    actor.role !== "manager"
  ) {
    throw new Error("Modification réservée superviseur.");
  }
  const order = await getWorkOrder(id);
  if (!order) throw new Error("OT introuvable.");
  if (order.status === "cloture") throw new Error("Mission clôturée.");
  if (patch.consignes !== undefined) {
    order.consignes = clean(patch.consignes, 8000);
  }
  if (patch.materiel !== undefined) {
    order.materiel = clean(patch.materiel, 2000);
  }
  order.history = [
    hist(actor, "Consignes / matériel mis à jour"),
    ...order.history,
  ].slice(0, 100);
  return save(order);
}

export function workOrderDetailMeta(order: WorkOrder) {
  return {
    coverage: proofCoverage(order),
    trace: isTraceableToClosure(order),
  };
}

export type { WorkOrderStatus };
