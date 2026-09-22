import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  canManageLeaveRequests,
  canValidateLeaveRequests,
  computeLeaveDays,
  defaultPlanningImpact,
  isLeaveRequestStatus,
  isLeaveRequestType,
  type LeaveHistoryEntry,
  type LeaveRequest,
  type LeaveRequestInput,
  type LeaveRequestStatus,
  type LeaveRequestType,
} from "@/lib/leave-requests-shared";

export {
  canAccessLeaveRequests,
  canManageLeaveRequests,
  canValidateLeaveRequests,
  computeLeaveDays,
  defaultPlanningImpact,
  LEAVE_RULE_HINTS,
  LEAVE_STATUS_LABELS,
  LEAVE_STATUSES,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPES,
  isLeaveRequestStatus,
  isLeaveRequestType,
} from "@/lib/leave-requests-shared";
export type {
  LeaveHistoryEntry,
  LeaveRequest,
  LeaveRequestInput,
  LeaveRequestStatus,
  LeaveRequestType,
} from "@/lib/leave-requests-shared";

type DbLeave = Omit<LeaveRequest, "id"> & { _id?: ObjectId };

type Actor = { email: string; name: string; role: UserRole; userId?: string };

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function historyId(): string {
  return `lv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeHistory(
  partial: Omit<LeaveHistoryEntry, "id" | "at"> & { at?: string },
): LeaveHistoryEntry {
  return {
    id: historyId(),
    at: partial.at || nowIso(),
    kind: partial.kind,
    note: (partial.note || "").trim().slice(0, 800),
    byEmail: partial.byEmail,
    byName: partial.byName,
    byRole: partial.byRole,
  };
}

async function col() {
  const db = await getDb();
  const c = db.collection<DbLeave>("leave_requests");
  void Promise.all([
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ employeeEmail: 1 }).catch(() => undefined),
    c.createIndex({ startDate: 1, endDate: 1 }).catch(() => undefined),
  ]);
  return c;
}

function mapDoc(doc: WithId<DbLeave> | DbLeave): LeaveRequest {
  const id =
    doc._id instanceof ObjectId
      ? doc._id.toHexString()
      : String((doc as { _id?: unknown })._id ?? "");
  return {
    id,
    status: isLeaveRequestStatus(doc.status) ? doc.status : "brouillon",
    type: isLeaveRequestType(doc.type) ? doc.type : "conge_paye",
    employeeName: doc.employeeName || "",
    employeeEmail: doc.employeeEmail || "",
    employeeUserId: doc.employeeUserId || "",
    matricule: doc.matricule || "",
    startDate: doc.startDate || "",
    endDate: doc.endDate || "",
    days: Number(doc.days || 0),
    motif: doc.motif || "",
    substituteName: doc.substituteName || "",
    planningImpact: doc.planningImpact || "",
    affectedSites: doc.affectedSites || "",
    rhOwner: doc.rhOwner || "",
    validatedAt: doc.validatedAt ?? null,
    validatedByEmail: doc.validatedByEmail || "",
    validatedByName: doc.validatedByName || "",
    note: doc.note || "",
    history: Array.isArray(doc.history) ? doc.history : [],
    createdAt: doc.createdAt || nowIso(),
    updatedAt: doc.updatedAt || nowIso(),
    createdByEmail: doc.createdByEmail || "",
    createdByName: doc.createdByName || "",
  };
}

function canView(doc: LeaveRequest, actor: Actor): boolean {
  if (canManageLeaveRequests(actor.role) || canValidateLeaveRequests(actor.role)) {
    return true;
  }
  const email = actor.email.toLowerCase();
  return (
    doc.employeeEmail === email ||
    (Boolean(actor.userId) && doc.employeeUserId === actor.userId)
  );
}

export async function listLeaveRequests(actor: Actor): Promise<LeaveRequest[]> {
  const c = await col();
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map(mapDoc).filter((d) => canView(d, actor));
}

export async function getLeaveRequest(
  id: string,
  actor: Actor,
): Promise<LeaveRequest | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col();
  const row = await c.findOne({ _id: new ObjectId(id) });
  if (!row) return null;
  const mapped = mapDoc(row);
  if (!canView(mapped, actor)) return null;
  return mapped;
}

export async function createLeaveRequest(
  input: LeaveRequestInput,
  actor: Actor,
): Promise<LeaveRequest> {
  const employeeName = clean(input.employeeName, 120);
  const startDate = clean(input.startDate, 20);
  const endDate = clean(input.endDate, 20);
  if (!employeeName || !startDate || !endDate) {
    throw new Error("Collaborateur et période obligatoires.");
  }
  const type: LeaveRequestType = isLeaveRequestType(input.type)
    ? input.type
    : "conge_paye";
  const days =
    Number(input.days) > 0
      ? Math.round(Number(input.days))
      : computeLeaveDays(startDate, endDate);
  if (days < 1) throw new Error("Période invalide.");

  const substituteName = clean(input.substituteName, 120);
  const planningImpact =
    clean(input.planningImpact, 400) ||
    defaultPlanningImpact(days, type, substituteName);

  const stamp = nowIso();
  const doc: DbLeave = {
    status: "brouillon",
    type,
    employeeName,
    employeeEmail: clean(input.employeeEmail, 180).toLowerCase(),
    employeeUserId: clean(input.employeeUserId, 80),
    matricule: clean(input.matricule, 40),
    startDate,
    endDate,
    days,
    motif: clean(input.motif, 2000),
    substituteName,
    planningImpact,
    affectedSites: clean(input.affectedSites, 400),
    rhOwner: clean(input.rhOwner, 120),
    validatedAt: null,
    validatedByEmail: "",
    validatedByName: "",
    note: clean(input.note, 2000),
    history: [
      makeHistory({
        kind: "created",
        note: `Demande créée · ${type} · ${days} j`,
        byEmail: actor.email,
        byName: actor.name,
        byRole: actor.role,
      }),
    ],
    createdAt: stamp,
    updatedAt: stamp,
    createdByEmail: actor.email,
    createdByName: actor.name,
  };

  const c = await col();
  const result = await c.insertOne(doc);
  return mapDoc({ ...doc, _id: result.insertedId });
}

export async function submitLeaveRequest(
  id: string,
  actor: Actor,
): Promise<LeaveRequest> {
  const existing = await getLeaveRequest(id, actor);
  if (!existing) throw new Error("Demande introuvable.");
  if (existing.status !== "brouillon" && existing.status !== "refuse") {
    throw new Error("Seules les demandes brouillon / refusées peuvent être soumises.");
  }
  if (!existing.motif.trim()) {
    throw new Error("Motif obligatoire avant soumission.");
  }
  const c = await col();
  await c.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "en_validation" satisfies LeaveRequestStatus,
        updatedAt: nowIso(),
      },
      $push: {
        history: makeHistory({
          kind: "submit",
          note: "Soumise pour validation manager / RH",
          byEmail: actor.email,
          byName: actor.name,
          byRole: actor.role,
        }),
      },
    },
  );
  const updated = await getLeaveRequest(id, actor);
  if (!updated) throw new Error("Soumission impossible.");
  return updated;
}

export async function validateLeaveRequest(
  id: string,
  actor: Actor,
  decision: "approve" | "refuse",
  note = "",
): Promise<LeaveRequest> {
  if (!canValidateLeaveRequests(actor.role)) {
    throw new Error("Validation réservée manager / RH / admin.");
  }
  const existing = await getLeaveRequest(id, actor);
  if (!existing) throw new Error("Demande introuvable.");
  if (existing.status !== "en_validation") {
    throw new Error("La demande n’est pas en validation.");
  }
  if (decision === "refuse" && !clean(note, 400)) {
    throw new Error("Motif de refus obligatoire.");
  }
  const stamp = nowIso();
  const nextStatus: LeaveRequestStatus =
    decision === "approve" ? "valide" : "refuse";
  const c = await col();
  await c.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: nextStatus,
        validatedAt: decision === "approve" ? stamp : null,
        validatedByEmail: actor.email,
        validatedByName: actor.name,
        note: clean(note, 2000) || existing.note,
        updatedAt: stamp,
        planningImpact:
          decision === "approve"
            ? existing.planningImpact ||
              defaultPlanningImpact(
                existing.days,
                existing.type,
                existing.substituteName,
              )
            : existing.planningImpact,
      },
      $push: {
        history: makeHistory({
          kind: decision === "approve" ? "validate" : "refuse",
          note:
            decision === "approve"
              ? `Validée · impact planning : ${existing.planningImpact || "à appliquer"}`
              : `Refusée · ${clean(note, 400)}`,
          byEmail: actor.email,
          byName: actor.name,
          byRole: actor.role,
        }),
      },
    },
  );
  const updated = await getLeaveRequest(id, actor);
  if (!updated) throw new Error("Validation impossible.");
  return updated;
}

export async function cancelLeaveRequest(
  id: string,
  actor: Actor,
  note = "",
): Promise<LeaveRequest> {
  const existing = await getLeaveRequest(id, actor);
  if (!existing) throw new Error("Demande introuvable.");
  if (existing.status === "annule") {
    throw new Error("Demande déjà annulée.");
  }
  const isOwner =
    existing.employeeEmail === actor.email.toLowerCase() ||
    existing.createdByEmail === actor.email.toLowerCase();
  if (!canManageLeaveRequests(actor.role) && !isOwner) {
    throw new Error("Annulation non autorisée.");
  }
  const c = await col();
  await c.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: { status: "annule" satisfies LeaveRequestStatus, updatedAt: nowIso() },
      $push: {
        history: makeHistory({
          kind: "cancel",
          note: clean(note, 400) || "Demande annulée",
          byEmail: actor.email,
          byName: actor.name,
          byRole: actor.role,
        }),
      },
    },
  );
  const updated = await getLeaveRequest(id, actor);
  if (!updated) throw new Error("Annulation impossible.");
  return updated;
}

export async function updateLeaveRequestMeta(
  id: string,
  input: Partial<LeaveRequestInput>,
  actor: Actor,
): Promise<LeaveRequest> {
  const existing = await getLeaveRequest(id, actor);
  if (!existing) throw new Error("Demande introuvable.");
  if (existing.status === "valide" || existing.status === "annule") {
    throw new Error("Demande verrouillée.");
  }
  const isOwner =
    existing.employeeEmail === actor.email.toLowerCase() ||
    existing.createdByEmail === actor.email.toLowerCase();
  if (!canManageLeaveRequests(actor.role) && !isOwner) {
    throw new Error("Modification non autorisée.");
  }

  const startDate = input.startDate
    ? clean(input.startDate, 20)
    : existing.startDate;
  const endDate = input.endDate ? clean(input.endDate, 20) : existing.endDate;
  const type = isLeaveRequestType(input.type) ? input.type : existing.type;
  const substituteName =
    input.substituteName !== undefined
      ? clean(input.substituteName, 120)
      : existing.substituteName;
  const days =
    input.days !== undefined && Number(input.days) > 0
      ? Math.round(Number(input.days))
      : computeLeaveDays(startDate, endDate);

  const next: Partial<DbLeave> = {
    updatedAt: nowIso(),
    type,
    startDate,
    endDate,
    days,
    substituteName,
    planningImpact:
      input.planningImpact !== undefined
        ? clean(input.planningImpact, 400)
        : defaultPlanningImpact(days, type, substituteName),
  };
  if (input.employeeName !== undefined) {
    next.employeeName = clean(input.employeeName, 120);
  }
  if (input.employeeEmail !== undefined) {
    next.employeeEmail = clean(input.employeeEmail, 180).toLowerCase();
  }
  if (input.matricule !== undefined) next.matricule = clean(input.matricule, 40);
  if (input.motif !== undefined) next.motif = clean(input.motif, 2000);
  if (input.affectedSites !== undefined) {
    next.affectedSites = clean(input.affectedSites, 400);
  }
  if (input.rhOwner !== undefined) next.rhOwner = clean(input.rhOwner, 120);
  if (input.note !== undefined) next.note = clean(input.note, 2000);

  const c = await col();
  await c.updateOne({ _id: new ObjectId(id) }, { $set: next });
  const updated = await getLeaveRequest(id, actor);
  if (!updated) throw new Error("Mise à jour impossible.");
  return updated;
}
