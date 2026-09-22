import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { listPlanningSlots } from "@/lib/ops-planning-crm";
import type { UserRole } from "@/lib/settings";
import { listUsers } from "@/lib/users-repo";
import {
  concurrencyTarget,
  currentTimeHm,
  evaluatePunch,
  isPointageGeoEnabled,
  isPunchMode,
  parseGeo,
  todayIso,
  type ConcurrentTestResult,
  type GeoPoint,
  type PointagePunch,
  type PunchMode,
} from "@/lib/pointage-shared";

const COLLECTION = "ops_pointage";
const IDEMPOTENCY = "ops_pointage_idempotency";

type Actor = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
};

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string) {
  return {
    id: `PH-${randomUUID().slice(0, 8).toUpperCase()}`,
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
  const c = db.collection<PointagePunch>(COLLECTION);
  void Promise.all([
    c.createIndex({ userId: 1, date: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ date: 1, status: 1 }).catch(() => undefined),
    c.createIndex({ siteId: 1, date: 1 }).catch(() => undefined),
    c.createIndex({ "clientRequestIds": 1 }).catch(() => undefined),
  ]);
  return c;
}

async function idemCol() {
  const db = await getDb();
  const c = db.collection<{
    key: string;
    userId: string;
    action: string;
    punchId: string;
    createdAt: string;
  }>(IDEMPOTENCY);
  void Promise.all([
    c.createIndex({ key: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86_400 }).catch(
      () => undefined,
    ),
  ]);
  return c;
}

function coercePunch(raw: Record<string, unknown>): PointagePunch {
  const base: PointagePunch = {
    id: String(raw.id ?? ""),
    userId: String(raw.userId ?? ""),
    employeeId: String(raw.employeeId ?? raw.userId ?? ""),
    employeeName: String(raw.employeeName ?? ""),
    email: String(raw.email ?? ""),
    site: String(raw.site ?? ""),
    siteId: String(raw.siteId ?? ""),
    planningSlotId: String(raw.planningSlotId ?? ""),
    date: String(raw.date ?? ""),
    plannedIn: String(raw.plannedIn ?? "08:00"),
    plannedOut: String(raw.plannedOut ?? "17:00"),
    actualIn: raw.actualIn ? String(raw.actualIn) : null,
    actualOut: raw.actualOut ? String(raw.actualOut) : null,
    actualInAt: raw.actualInAt ? String(raw.actualInAt) : null,
    actualOutAt: raw.actualOutAt ? String(raw.actualOutAt) : null,
    mode: isPunchMode(raw.mode) ? raw.mode : "Mobile",
    status: (raw.status as PointagePunch["status"]) || "Absent",
    anomaly: String(raw.anomaly ?? ""),
    anomalies: Array.isArray(raw.anomalies)
      ? (raw.anomalies as string[])
      : [],
    validatedBy: raw.validatedBy ? String(raw.validatedBy) : null,
    validatedById: raw.validatedById ? String(raw.validatedById) : null,
    note: String(raw.note ?? ""),
    geoIn: parseGeo(raw.geoIn),
    geoOut: parseGeo(raw.geoOut),
    clientRequestIds: Array.isArray(raw.clientRequestIds)
      ? (raw.clientRequestIds as string[]).map(String).slice(0, 40)
      : [],
    history: Array.isArray(raw.history)
      ? (raw.history as PointagePunch["history"])
      : [],
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
  };
  return evaluatePunch(base);
}

async function getByUserDate(
  userId: string,
  date: string,
): Promise<PointagePunch | null> {
  const row = await (await col()).findOne({ userId, date });
  if (!row) return null;
  return coercePunch(stripMongo(row) as Record<string, unknown>);
}

async function save(doc: PointagePunch): Promise<PointagePunch> {
  const next = evaluatePunch({ ...doc, updatedAt: nowIso() });
  await (await col()).replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

type PlanningMatch = {
  planningSlotId: string;
  siteId: string;
  site: string;
  plannedIn: string;
  plannedOut: string;
};

async function matchPlanning(
  userId: string,
  date: string,
): Promise<PlanningMatch | null> {
  const slots = await listPlanningSlots({ from: date, to: date });
  const mine = slots.filter((s) =>
    s.assignments.some(
      (a) => a.agentUserId === userId && a.status === "planifie",
    ),
  );
  if (mine.length === 0) return null;
  mine.sort((a, b) => a.startTime.localeCompare(b.startTime));
  const slot = mine[0]!;
  return {
    planningSlotId: slot.id,
    siteId: slot.siteId,
    site: slot.siteName,
    plannedIn: slot.startTime,
    plannedOut: slot.endTime,
  };
}

/**
 * Garantit une ligne du jour (upsert atomique) — rapprochement planning.
 */
export async function ensurePunchForUser(
  user: { userId: string; name: string; email: string },
  date: string,
  actor?: Actor,
): Promise<PointagePunch> {
  const existing = await getByUserDate(user.userId, date);
  if (existing) {
    if (!existing.planningSlotId) {
      const plan = await matchPlanning(user.userId, date);
      if (plan) {
        return save({
          ...existing,
          ...plan,
          history: [
            hist(
              actor || {
                userId: user.userId,
                name: user.name,
                email: user.email,
                role: "nettoyeur",
              },
              `Rapprochement planning ${plan.planningSlotId}`,
            ),
            ...existing.history,
          ].slice(0, 80),
        });
      }
    }
    return existing;
  }

  const plan = await matchPlanning(user.userId, date);
  const stamp = nowIso();
  const draft: PointagePunch = {
    id: `PTG-${randomUUID().slice(0, 10).toUpperCase()}`,
    userId: user.userId,
    employeeId: user.userId,
    employeeName: user.name,
    email: user.email,
    site: plan?.site || "Non planifié",
    siteId: plan?.siteId || "",
    planningSlotId: plan?.planningSlotId || "",
    date,
    plannedIn: plan?.plannedIn || "08:00",
    plannedOut: plan?.plannedOut || "17:00",
    actualIn: null,
    actualOut: null,
    actualInAt: null,
    actualOutAt: null,
    mode: "Mobile",
    status: "Absent",
    anomaly: "",
    anomalies: [],
    validatedBy: null,
    validatedById: null,
    note: "",
    geoIn: null,
    geoOut: null,
    clientRequestIds: [],
    history: [
      hist(
        actor || {
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: "nettoyeur",
        },
        plan
          ? `Ligne créée · planning ${plan.planningSlotId}`
          : "Ligne créée · hors planning",
      ),
    ],
    createdAt: stamp,
    updatedAt: stamp,
  };
  const evaluated = evaluatePunch(draft);

  try {
    await (await col()).insertOne(evaluated);
    return evaluated;
  } catch (error) {
    // Course : un autre insert concurrent a gagné l’unique (userId, date)
    const raced = await getByUserDate(user.userId, date);
    if (raced) return raced;
    throw error;
  }
}

async function rememberIdempotency(
  key: string,
  userId: string,
  action: string,
  punchId: string,
): Promise<"new" | "replay"> {
  if (!key) return "new";
  try {
    await (await idemCol()).insertOne({
      key: `${action}:${userId}:${key}`,
      userId,
      action,
      punchId,
      createdAt: nowIso(),
    });
    return "new";
  } catch {
    return "replay";
  }
}

export type PunchActionResult = {
  punch: PointagePunch;
  duplicate: boolean;
  replay: boolean;
};

/**
 * Arrivée atomique : anti double-pointage même sous pics simultanés.
 */
export async function punchInAtomic(
  targetUserId: string,
  actor: Actor,
  opts: {
    date?: string;
    mode?: PunchMode;
    clientRequestId?: string;
    geo?: unknown;
    note?: string;
  } = {},
): Promise<PunchActionResult> {
  const date = clean(opts.date, 12) || todayIso();
  const mode = isPunchMode(opts.mode) ? opts.mode : "Mobile";
  const clientRequestId = clean(opts.clientRequestId, 80);

  const users = await listUsers();
  const fromRepo = users.find((u) => u.id === targetUserId);
  const target = fromRepo
    ? {
        id: fromRepo.id,
        name: fromRepo.name,
        email: fromRepo.email,
        active: fromRepo.active,
      }
    : actor.userId === targetUserId
      ? {
          id: actor.userId,
          name: actor.name,
          email: actor.email,
          active: true,
        }
      : null;
  if (!target || !target.active) throw new Error("Agent introuvable.");

  if (actor.role === "nettoyeur" && actor.userId !== targetUserId) {
    throw new Error("Vous ne pouvez pointer que pour vous-même.");
  }

  const punch = await ensurePunchForUser(
    { userId: target.id, name: target.name, email: target.email },
    date,
    actor,
  );

  if (clientRequestId) {
    const replay = await rememberIdempotency(
      clientRequestId,
      targetUserId,
      "in",
      punch.id,
    );
    if (replay === "replay") {
      const current = (await getByUserDate(targetUserId, date)) || punch;
      return { punch: current, duplicate: Boolean(current.actualIn), replay: true };
    }
  }

  if (punch.actualIn) {
    return { punch, duplicate: true, replay: false };
  }

  const stamp = new Date();
  const geo =
    isPointageGeoEnabled() && opts.geo !== undefined
      ? parseGeo(opts.geo)
      : null;

  const pushDoc: Record<string, unknown> = {
    history: {
      $each: [
        hist(
          actor,
          `Arrivée ${currentTimeHm(stamp)} · ${mode}${geo ? " · geo" : ""}`,
        ),
      ],
      $position: 0,
      $slice: 80,
    },
  };
  if (clientRequestId) {
    pushDoc.clientRequestIds = {
      $each: [clientRequestId],
      $position: 0,
      $slice: 40,
    };
  }

  const c = await col();
  const updated = await c.findOneAndUpdate(
    { userId: targetUserId, date, actualIn: null },
    {
      $set: {
        actualIn: currentTimeHm(stamp),
        actualInAt: stamp.toISOString(),
        mode,
        validatedBy: null,
        validatedById: null,
        geoIn: geo,
        note: opts.note !== undefined ? clean(opts.note, 1000) : punch.note,
        updatedAt: stamp.toISOString(),
      },
      $push: pushDoc,
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    const current = await getByUserDate(targetUserId, date);
    if (current?.actualIn) {
      return { punch: current, duplicate: true, replay: false };
    }
    throw new Error("Échec pointage arrivée (concurrence).");
  }

  const coerced = coercePunch(stripMongo(updated) as Record<string, unknown>);
  const final = evaluatePunch(coerced);
  await c.updateOne(
    { id: final.id },
    {
      $set: {
        status: final.status,
        anomaly: final.anomaly,
        anomalies: final.anomalies,
      },
    },
  );
  return { punch: final, duplicate: false, replay: false };
}

/**
 * Départ atomique.
 */
export async function punchOutAtomic(
  targetUserId: string,
  actor: Actor,
  opts: {
    date?: string;
    mode?: PunchMode;
    clientRequestId?: string;
    geo?: unknown;
  } = {},
): Promise<PunchActionResult> {
  const date = clean(opts.date, 12) || todayIso();
  const mode = isPunchMode(opts.mode) ? opts.mode : "Mobile";
  const clientRequestId = clean(opts.clientRequestId, 80);

  if (actor.role === "nettoyeur" && actor.userId !== targetUserId) {
    throw new Error("Vous ne pouvez pointer que pour vous-même.");
  }

  const users = await listUsers();
  const fromRepo = users.find((u) => u.id === targetUserId);
  const target = fromRepo
    ? {
        id: fromRepo.id,
        name: fromRepo.name,
        email: fromRepo.email,
      }
    : actor.userId === targetUserId
      ? { id: actor.userId, name: actor.name, email: actor.email }
      : null;
  if (!target) throw new Error("Agent introuvable.");

  const punch = await ensurePunchForUser(
    {
      userId: target.id,
      name: target.name,
      email: target.email,
    },
    date,
    actor,
  );

  if (clientRequestId) {
    const replay = await rememberIdempotency(
      clientRequestId,
      targetUserId,
      "out",
      punch.id,
    );
    if (replay === "replay") {
      const current = (await getByUserDate(targetUserId, date)) || punch;
      return {
        punch: current,
        duplicate: Boolean(current.actualOut),
        replay: true,
      };
    }
  }

  if (!punch.actualIn) {
    throw new Error("Pointer l’arrivée d’abord.");
  }
  if (punch.actualOut) {
    return { punch, duplicate: true, replay: false };
  }

  const stamp = new Date();
  const geo =
    isPointageGeoEnabled() && opts.geo !== undefined
      ? parseGeo(opts.geo)
      : null;

  const pushDoc: Record<string, unknown> = {
    history: {
      $each: [
        hist(
          actor,
          `Départ ${currentTimeHm(stamp)} · ${mode}${geo ? " · geo" : ""}`,
        ),
      ],
      $position: 0,
      $slice: 80,
    },
  };
  if (clientRequestId) {
    pushDoc.clientRequestIds = {
      $each: [clientRequestId],
      $position: 0,
      $slice: 40,
    };
  }

  const c = await col();
  const updated = await c.findOneAndUpdate(
    {
      userId: targetUserId,
      date,
      actualIn: { $ne: null },
      actualOut: null,
    },
    {
      $set: {
        actualOut: currentTimeHm(stamp),
        actualOutAt: stamp.toISOString(),
        mode,
        validatedBy: null,
        validatedById: null,
        geoOut: geo,
        updatedAt: stamp.toISOString(),
      },
      $push: pushDoc,
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    const current = await getByUserDate(targetUserId, date);
    if (current?.actualOut) {
      return { punch: current, duplicate: true, replay: false };
    }
    throw new Error("Échec pointage départ (concurrence).");
  }

  const coerced = coercePunch(stripMongo(updated) as Record<string, unknown>);
  const final = evaluatePunch(coerced);
  await c.updateOne(
    { id: final.id },
    {
      $set: {
        status: final.status,
        anomaly: final.anomaly,
        anomalies: final.anomalies,
      },
    },
  );
  return { punch: final, duplicate: false, replay: false };
}

export async function listPunchesForDate(
  date: string,
  actor: Actor,
): Promise<PointagePunch[]> {
  const c = await col();
  if (actor.role === "nettoyeur") {
    await ensurePunchForUser(
      { userId: actor.userId, name: actor.name, email: actor.email },
      date,
      actor,
    );
    const mine = await getByUserDate(actor.userId, date);
    return mine ? [mine] : [];
  }

  const rows = await c.find({ date }).sort({ employeeName: 1 }).limit(800).toArray();
  return rows.map((r) => coercePunch(stripMongo(r) as Record<string, unknown>));
}

export async function validatePunchRecord(
  punchId: string,
  actor: Actor,
): Promise<PointagePunch> {
  const row = await (await col()).findOne({ id: punchId });
  if (!row) throw new Error("Pointage introuvable.");
  const punch = coercePunch(stripMongo(row) as Record<string, unknown>);
  if (!punch.actualIn || !punch.actualOut) {
    throw new Error("Arrivée et départ requis pour valider.");
  }
  const next = evaluatePunch({
    ...punch,
    validatedBy: actor.name,
    validatedById: actor.userId,
    history: [
      hist(actor, "Pointage validé"),
      ...punch.history,
    ].slice(0, 80),
  });
  return save(next);
}

export async function correctPunchRecord(
  punchId: string,
  patch: {
    actualIn?: string | null;
    actualOut?: string | null;
    plannedIn?: string;
    plannedOut?: string;
    note?: string;
    mode?: PunchMode;
  },
  actor: Actor,
): Promise<PointagePunch> {
  const row = await (await col()).findOne({ id: punchId });
  if (!row) throw new Error("Pointage introuvable.");
  const punch = coercePunch(stripMongo(row) as Record<string, unknown>);
  const next = evaluatePunch({
    ...punch,
    actualIn:
      patch.actualIn !== undefined ? patch.actualIn || null : punch.actualIn,
    actualOut:
      patch.actualOut !== undefined
        ? patch.actualOut || null
        : punch.actualOut,
    plannedIn: patch.plannedIn?.trim() || punch.plannedIn,
    plannedOut: patch.plannedOut?.trim() || punch.plannedOut,
    note: patch.note !== undefined ? clean(patch.note, 1000) : punch.note,
    mode: patch.mode ?? "Manuel",
    validatedBy: null,
    validatedById: null,
    history: [
      hist(actor, "Correction manuelle"),
      ...punch.history,
    ].slice(0, 80),
  });
  return save(next);
}

export async function updatePunchNoteRecord(
  punchId: string,
  note: string,
  actor: Actor,
): Promise<PointagePunch> {
  const row = await (await col()).findOne({ id: punchId });
  if (!row) throw new Error("Pointage introuvable.");
  const punch = coercePunch(stripMongo(row) as Record<string, unknown>);
  return save({
    ...punch,
    note: clean(note, 1000),
    history: [hist(actor, "Note mise à jour"), ...punch.history].slice(0, 80),
  });
}

export async function flagPunchAnomaly(
  punchId: string,
  reason: string,
  actor: Actor,
): Promise<PointagePunch> {
  const row = await (await col()).findOne({ id: punchId });
  if (!row) throw new Error("Pointage introuvable.");
  const punch = coercePunch(stripMongo(row) as Record<string, unknown>);
  const msg = clean(reason, 400);
  if (!msg) throw new Error("Motif d’anomalie requis.");
  return save({
    ...punch,
    status: "Anomalie",
    anomaly: msg,
    anomalies: Array.from(new Set([...punch.anomalies, msg])),
    history: [hist(actor, `Anomalie · ${msg}`), ...punch.history].slice(0, 80),
  });
}

/**
 * Recette : N pointages simultanés sans perte ni duplication.
 */
export async function runConcurrentPunchTest(
  actor: Actor,
  targetOverride?: number,
): Promise<ConcurrentTestResult> {
  const target = targetOverride
    ? Math.min(200, Math.max(5, Math.floor(targetOverride)))
    : concurrencyTarget();
  const date = `TEST-${todayIso()}-${randomUUID().slice(0, 6)}`;
  const started = Date.now();

  const fakeAgents = Array.from({ length: target }, (_, i) => ({
    userId: `TEST-USR-${date}-${i}`,
    name: `Agent test ${i + 1}`,
    email: `test-${i}@pointage.local`,
  }));

  // Pré-création des lignes (comme un matin de vacation)
  await Promise.all(
    fakeAgents.map((a) =>
      ensurePunchForUser(a, date, {
        ...actor,
        userId: a.userId,
        name: a.name,
        email: a.email,
      }),
    ),
  );

  // Pic simultané : 2× arrivée par agent (doit bloquer le doublon)
  const results = await Promise.all(
    fakeAgents.flatMap((a) => {
      const fakeActor: Actor = {
        userId: a.userId,
        name: a.name,
        email: a.email,
        role: "nettoyeur",
      };
      const reqA = `burst-${a.userId}-a`;
      const reqB = `burst-${a.userId}-b`;
      return [
        punchInAtomic(a.userId, fakeActor, {
          date,
          mode: "Mobile",
          clientRequestId: reqA,
        }),
        punchInAtomic(a.userId, fakeActor, {
          date,
          mode: "Mobile",
          clientRequestId: reqB,
        }),
      ];
    }),
  );

  const byUser = new Map<string, PointagePunch>();
  let duplicatesBlocked = 0;
  for (const r of results) {
    if (r.duplicate || r.replay) duplicatesBlocked += 1;
    byUser.set(r.punch.userId, r.punch);
  }

  const inserted = [...byUser.values()].filter((p) => p.actualIn).length;
  const lost = target - inserted;
  const durationMs = Date.now() - started;
  const ok = inserted === target && lost === 0;

  // Nettoyage des lignes de test
  await (await col()).deleteMany({ date });
  await (await idemCol()).deleteMany({
    key: { $regex: `^in:TEST-USR-${date}` },
  });

  return {
    target,
    attempted: results.length,
    inserted,
    duplicatesBlocked,
    lost,
    durationMs,
    ok,
    detail: ok
      ? `${inserted}/${target} pointages uniques · ${duplicatesBlocked} doublons bloqués · ${durationMs} ms`
      : `ÉCHEC : ${inserted}/${target} (perdus ${lost}) · ${durationMs} ms`,
  };
}

export function pointageMeta() {
  return {
    geoEnabled: isPointageGeoEnabled(),
    concurrencyTarget: concurrencyTarget(),
  };
}

export type { GeoPoint };
