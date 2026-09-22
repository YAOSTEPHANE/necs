import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { getOpsSite, listOpsSites } from "@/lib/ops-referential-crm";
import {
  assertAssignmentsPropagated,
  computeSlotAlerts,
  type PlanningAlertKind,
  type PlanningAssignment,
  type PlanningSlot,
} from "@/lib/ops-planning-shared";
import type { UserRole } from "@/lib/settings";
import { listUsers } from "@/lib/users-repo";

const COLLECTION = "ops_planning_slots";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string) {
  return {
    id: `PLH-${randomUUID().slice(0, 8).toUpperCase()}`,
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
  const c = db.collection<PlanningSlot>(COLLECTION);
  void Promise.all([
    c.createIndex({ date: 1, startTime: 1 }).catch(() => undefined),
    c.createIndex({ siteId: 1, date: 1 }).catch(() => undefined),
    c.createIndex({ "assignments.agentUserId": 1, date: 1 }).catch(() => undefined),
  ]);
  return c;
}

function coerceSlot(raw: Record<string, unknown>): PlanningSlot {
  return {
    id: String(raw.id ?? ""),
    date: String(raw.date ?? ""),
    startTime: String(raw.startTime ?? "08:00"),
    endTime: String(raw.endTime ?? "12:00"),
    clientId: String(raw.clientId ?? ""),
    contractId: String(raw.contractId ?? ""),
    siteId: String(raw.siteId ?? ""),
    prestationId: String(raw.prestationId ?? ""),
    clientName: String(raw.clientName ?? ""),
    siteName: String(raw.siteName ?? ""),
    prestationLabel: String(raw.prestationLabel ?? ""),
    requiredStaff: Math.max(1, Number(raw.requiredStaff) || 1),
    assignments: Array.isArray(raw.assignments)
      ? (raw.assignments as PlanningAssignment[])
      : [],
    alerts: Array.isArray(raw.alerts)
      ? (raw.alerts as PlanningAlertKind[])
      : [],
    note: String(raw.note ?? ""),
    history: Array.isArray(raw.history)
      ? (raw.history as PlanningSlot["history"])
      : [],
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
  };
}

async function save(doc: PlanningSlot): Promise<PlanningSlot> {
  const next = { ...doc, updatedAt: nowIso() };
  await (await col()).replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

async function refreshAlerts(slots: PlanningSlot[]): Promise<PlanningSlot[]> {
  const withAlerts = slots.map((s) => ({
    ...s,
    alerts: computeSlotAlerts(s, slots),
  }));
  // Persist alert changes for slots that differ
  const c = await col();
  await Promise.all(
    withAlerts.map(async (s) => {
      const prev = slots.find((x) => x.id === s.id);
      if (
        !prev ||
        JSON.stringify(prev.alerts) !== JSON.stringify(s.alerts)
      ) {
        await c.updateOne(
          { id: s.id },
          { $set: { alerts: s.alerts, updatedAt: nowIso() } },
        );
      }
    }),
  );
  return withAlerts;
}

export async function listPlanningSlots(opts?: {
  from?: string;
  to?: string;
  siteId?: string;
}): Promise<PlanningSlot[]> {
  const q: Record<string, unknown> = {};
  if (opts?.from || opts?.to) {
    q.date = {};
    if (opts.from) (q.date as Record<string, string>).$gte = opts.from;
    if (opts.to) (q.date as Record<string, string>).$lte = opts.to;
  }
  if (opts?.siteId) q.siteId = opts.siteId;
  const rows = await (await col())
    .find(q)
    .sort({ date: 1, startTime: 1 })
    .limit(500)
    .toArray();
  const slots = rows.map((r) =>
    coerceSlot(stripMongo(r) as Record<string, unknown>),
  );
  return refreshAlerts(slots);
}

export async function getPlanningSlot(
  id: string,
): Promise<PlanningSlot | null> {
  const row = await (await col()).findOne({ id });
  if (!row) return null;
  const slot = coerceSlot(stripMongo(row) as Record<string, unknown>);
  const week = await listPlanningSlots({
    from: slot.date,
    to: slot.date,
  });
  return week.find((s) => s.id === id) || slot;
}

export async function listFieldAgents(): Promise<
  Array<{ id: string; name: string; email: string; role: UserRole }>
> {
  const users = await listUsers();
  return users
    .filter(
      (u) =>
        u.active &&
        (u.role === "nettoyeur" || u.role === "ops"),
    )
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
}

export async function createPlanningSlot(
  input: {
    date: string;
    startTime: string;
    endTime: string;
    siteId: string;
    prestationId: string;
    requiredStaff?: number;
    note?: string;
    agentIds?: string[];
  },
  actor: Actor,
): Promise<PlanningSlot> {
  const date = clean(input.date, 12);
  const startTime = clean(input.startTime, 8);
  const endTime = clean(input.endTime, 8);
  if (!date || !startTime || !endTime) {
    throw new Error("Date et horaires requis.");
  }
  if (startTime >= endTime) {
    throw new Error("L’heure de fin doit être après le début.");
  }
  const site = await getOpsSite(input.siteId);
  if (!site) throw new Error("Site introuvable dans le référentiel.");
  if (site.status !== "actif") {
    throw new Error("Impossible de planifier sur un site inactif.");
  }
  const prestation = site.prestations.find((p) => p.id === input.prestationId);
  if (!prestation || !prestation.active) {
    throw new Error("Prestation introuvable ou inactive.");
  }

  const agents = await listFieldAgents();
  const assignments: PlanningAssignment[] = (input.agentIds || [])
    .map((id) => {
      const a = agents.find((x) => x.id === id);
      if (!a) return null;
      return {
        id: `ASG-${randomUUID().slice(0, 6).toUpperCase()}`,
        agentUserId: a.id,
        agentName: a.name,
        agentEmail: a.email,
        role: "titulaire" as const,
        status: "planifie" as const,
        replacedAssignmentId: "",
        note: "",
      };
    })
    .filter(Boolean) as PlanningAssignment[];

  const stamp = nowIso();
  const slot: PlanningSlot = {
    id: `PLN-${randomUUID().slice(0, 8).toUpperCase()}`,
    date,
    startTime,
    endTime,
    clientId: site.clientId,
    contractId: site.contractId,
    siteId: site.id,
    prestationId: prestation.id,
    clientName: site.company,
    siteName: site.name,
    prestationLabel: prestation.label,
    requiredStaff:
      input.requiredStaff !== undefined
        ? Math.max(1, Number(input.requiredStaff) || 1)
        : prestation.requiredStaff,
    assignments,
    alerts: [],
    note: clean(input.note, 2000),
    history: [
      hist(
        actor,
        `Créneau créé · ${date} ${startTime}-${endTime} · ${prestation.label} @ ${site.name}`,
      ),
    ],
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
  };

  await save(slot);
  const daySlots = await listPlanningSlots({ from: date, to: date });
  return daySlots.find((s) => s.id === slot.id) || slot;
}

/**
 * Recette OPS-02 : modification du planning répercutée aux affectations
 * (les assignments restent attachées au créneau mis à jour).
 */
export async function updatePlanningSlot(
  id: string,
  patch: {
    date?: string;
    startTime?: string;
    endTime?: string;
    requiredStaff?: number;
    note?: string;
    prestationId?: string;
  },
  actor: Actor,
): Promise<{
  slot: PlanningSlot;
  propagation: ReturnType<typeof assertAssignmentsPropagated>;
}> {
  const existing = await (await col()).findOne({ id });
  if (!existing) throw new Error("Créneau introuvable.");
  const slot = coerceSlot(stripMongo(existing) as Record<string, unknown>);
  const before = {
    assignmentIds: slot.assignments.map((a) => a.id),
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
  };
  const changes: string[] = [];
  const oldDate = slot.date;

  if (patch.date !== undefined) {
    slot.date = clean(patch.date, 12);
    changes.push(`date ${slot.date}`);
  }
  if (patch.startTime !== undefined) {
    slot.startTime = clean(patch.startTime, 8);
    changes.push(`début ${slot.startTime}`);
  }
  if (patch.endTime !== undefined) {
    slot.endTime = clean(patch.endTime, 8);
    changes.push(`fin ${slot.endTime}`);
  }
  if (slot.startTime >= slot.endTime) {
    throw new Error("Horaires invalides.");
  }
  if (patch.requiredStaff !== undefined) {
    slot.requiredStaff = Math.max(1, Number(patch.requiredStaff) || 1);
    changes.push(`effectif requis ${slot.requiredStaff}`);
  }
  if (patch.note !== undefined) slot.note = clean(patch.note, 2000);
  if (patch.prestationId !== undefined) {
    const site = await getOpsSite(slot.siteId);
    const p = site?.prestations.find((x) => x.id === patch.prestationId);
    if (!p) throw new Error("Prestation introuvable.");
    slot.prestationId = p.id;
    slot.prestationLabel = p.label;
    changes.push(`prestation ${p.label}`);
  }

  // Affectations conservées et déplacées avec le créneau
  slot.history = [
    hist(
      actor,
      `Planning modifié · ${changes.join(" · ") || "maj"} · ${slot.assignments.length} affectation(s) répercutée(s)`,
    ),
    ...slot.history,
  ].slice(0, 60);

  await save(slot);

  // Recalcul alertes sur l’ancien et le nouveau jour (conflits agents)
  const from = oldDate < slot.date ? oldDate : slot.date;
  const to = oldDate > slot.date ? oldDate : slot.date;
  const rangeSlots = await listPlanningSlots({ from, to });
  const updated = rangeSlots.find((s) => s.id === slot.id) || slot;
  const propagation = assertAssignmentsPropagated(before, updated);
  return { slot: updated, propagation };
}

export async function assignAgent(
  slotId: string,
  agentUserId: string,
  actor: Actor,
): Promise<{ slot: PlanningSlot; conflict: boolean }> {
  const existing = await (await col()).findOne({ id: slotId });
  if (!existing) throw new Error("Créneau introuvable.");
  const slot = coerceSlot(stripMongo(existing) as Record<string, unknown>);
  if (
    slot.assignments.some(
      (a) => a.agentUserId === agentUserId && a.status === "planifie",
    )
  ) {
    throw new Error("Agent déjà affecté sur ce créneau.");
  }
  const agents = await listFieldAgents();
  const agent = agents.find((a) => a.id === agentUserId);
  if (!agent) throw new Error("Agent introuvable.");

  // Détection conflit avant affectation
  const daySlots = await listPlanningSlots({
    from: slot.date,
    to: slot.date,
  });
  const conflict = daySlots.some((other) => {
    if (other.id === slot.id) return false;
    const otherActive = other.assignments.filter((x) => x.status === "planifie");
    if (!otherActive.some((x) => x.agentUserId === agentUserId)) return false;
    return (
      other.startTime < slot.endTime && slot.startTime < other.endTime
    );
  });

  slot.assignments = [
    ...slot.assignments,
    {
      id: `ASG-${randomUUID().slice(0, 6).toUpperCase()}`,
      agentUserId: agent.id,
      agentName: agent.name,
      agentEmail: agent.email,
      role: "titulaire",
      status: "planifie",
      replacedAssignmentId: "",
      note: conflict ? "Attention : chevauchement horaire" : "",
    },
  ];
  slot.history = [
    hist(
      actor,
      conflict
        ? `Affectation ${agent.name} (conflit horaire détecté)`
        : `Affectation ${agent.name}`,
    ),
    ...slot.history,
  ].slice(0, 60);
  await save(slot);
  const day = await listPlanningSlots({ from: slot.date, to: slot.date });
  const updated = day.find((s) => s.id === slot.id) || slot;
  return { slot: updated, conflict };
}

export async function markAssignmentAbsent(
  slotId: string,
  assignmentId: string,
  actor: Actor,
  note = "",
): Promise<PlanningSlot> {
  const existing = await (await col()).findOne({ id: slotId });
  if (!existing) throw new Error("Créneau introuvable.");
  const slot = coerceSlot(stripMongo(existing) as Record<string, unknown>);
  slot.assignments = slot.assignments.map((a) =>
    a.id === assignmentId
      ? {
          ...a,
          status: "absent" as const,
          note: clean(note, 400) || a.note,
        }
      : a,
  );
  slot.history = [
    hist(actor, `Absence déclarée (${assignmentId})`),
    ...slot.history,
  ].slice(0, 60);
  await save(slot);
  const day = await listPlanningSlots({ from: slot.date, to: slot.date });
  return day.find((s) => s.id === slot.id) || slot;
}

export async function replaceAssignment(
  slotId: string,
  assignmentId: string,
  replacementUserId: string,
  actor: Actor,
): Promise<PlanningSlot> {
  const existing = await (await col()).findOne({ id: slotId });
  if (!existing) throw new Error("Créneau introuvable.");
  const slot = coerceSlot(stripMongo(existing) as Record<string, unknown>);
  const original = slot.assignments.find((a) => a.id === assignmentId);
  if (!original) throw new Error("Affectation introuvable.");

  const agents = await listFieldAgents();
  const replacement = agents.find((a) => a.id === replacementUserId);
  if (!replacement) throw new Error("Remplaçant introuvable.");

  slot.assignments = slot.assignments.map((a) =>
    a.id === assignmentId
      ? { ...a, status: "remplace" as const }
      : a,
  );
  slot.assignments.push({
    id: `ASG-${randomUUID().slice(0, 6).toUpperCase()}`,
    agentUserId: replacement.id,
    agentName: replacement.name,
    agentEmail: replacement.email,
    role: "remplacant",
    status: "planifie",
    replacedAssignmentId: assignmentId,
    note: `Remplace ${original.agentName}`,
  });
  slot.history = [
    hist(
      actor,
      `Remplacement : ${replacement.name} remplace ${original.agentName}`,
    ),
    ...slot.history,
  ].slice(0, 60);
  await save(slot);
  const day = await listPlanningSlots({ from: slot.date, to: slot.date });
  return day.find((s) => s.id === slot.id) || slot;
}

export async function removeAssignment(
  slotId: string,
  assignmentId: string,
  actor: Actor,
): Promise<PlanningSlot> {
  const existing = await (await col()).findOne({ id: slotId });
  if (!existing) throw new Error("Créneau introuvable.");
  const slot = coerceSlot(stripMongo(existing) as Record<string, unknown>);
  slot.assignments = slot.assignments.filter((a) => a.id !== assignmentId);
  slot.history = [
    hist(actor, `Affectation retirée (${assignmentId})`),
    ...slot.history,
  ].slice(0, 60);
  await save(slot);
  const day = await listPlanningSlots({ from: slot.date, to: slot.date });
  return day.find((s) => s.id === slot.id) || slot;
}

export async function deletePlanningSlot(
  id: string,
  actor: Actor,
): Promise<void> {
  const existing = await (await col()).findOne({ id });
  if (!existing) throw new Error("Créneau introuvable.");
  await (await col()).deleteOne({ id });
  void actor;
}

export async function planningDashboard(from: string, to: string) {
  const slots = await listPlanningSlots({ from, to });
  const sites = await listOpsSites({ status: "actif" });
  return {
    slotCount: slots.length,
    conflictCount: slots.filter((s) => s.alerts.includes("conflit")).length,
    understaffedCount: slots.filter((s) =>
      s.alerts.includes("sous_effectif"),
    ).length,
    absenceCount: slots.filter((s) => s.alerts.includes("absence")).length,
    activeSites: sites.length,
    slots,
  };
}
