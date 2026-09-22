import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  buildPieceViews,
  canAccessHiringDossier,
  DEFAULT_HIRING_CHECKLIST,
  deriveExpiresAt,
  hiringReadinessRequirements,
  summarizeDossier,
  type HiringChecklistItemDef,
  type HiringDossierStatus,
  type HiringHistoryEntry,
  type HiringPiece,
} from "@/lib/dossier-embauche-shared";

export {
  buildPieceViews,
  canAccessHiringDossier,
  DEFAULT_HIRING_CHECKLIST,
  deriveExpiresAt,
  hiringReadinessRequirements,
  isDossierReadyForOnboarding,
  listAlertPieces,
  listExpiredPieces,
  listMissingPieces,
  HIRING_DOSSIER_STATUS_LABELS,
  PIECE_STATUS_LABELS,
  summarizeDossier,
} from "@/lib/dossier-embauche-shared";
export type {
  HiringChecklistItemDef,
  HiringDossierStatus,
  HiringHistoryEntry,
  HiringPiece,
  HiringPieceStatus,
  HiringPieceView,
} from "@/lib/dossier-embauche-shared";

export type DbHiringDossier = {
  _id?: ObjectId;
  employeeName: string;
  email: string;
  phone: string;
  roleTarget: string;
  startDate: string;
  recruitmentId: string;
  status: HiringDossierStatus;
  pieces: HiringPiece[];
  rhOwner: string;
  comments: string;
  history: HiringHistoryEntry[];
  createdAt: number;
  updatedAt: number;
  createdByEmail: string;
  createdByName: string;
};

export type HiringDossierInput = {
  employeeName: string;
  email: string;
  phone: string;
  roleTarget: string;
  startDate: string;
  recruitmentId?: string;
  rhOwner?: string;
  comments?: string;
};

type ChecklistConfigDoc = {
  _id?: ObjectId;
  key: "default";
  items: HiringChecklistItemDef[];
  updatedAt: number;
  updatedByEmail: string;
};

function historyId(): string {
  return `de-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeHistory(
  partial: Omit<HiringHistoryEntry, "id" | "at"> & { at?: string },
): HiringHistoryEntry {
  return {
    id: historyId(),
    at: partial.at || new Date().toISOString(),
    kind: partial.kind,
    note: (partial.note || "").trim().slice(0, 800),
    byEmail: partial.byEmail,
    byName: partial.byName,
    byRole: partial.byRole,
  };
}

async function dossiersCollection() {
  const db = await getDb();
  const col = db.collection<DbHiringDossier>("hiring_dossiers");
  void Promise.all([
    col.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    col.createIndex({ email: 1 }).catch(() => undefined),
    col.createIndex({ createdAt: -1 }).catch(() => undefined),
  ]);
  return col;
}

async function checklistCollection() {
  const db = await getDb();
  const col = db.collection<ChecklistConfigDoc>("hiring_checklist");
  void col.createIndex({ key: 1 }, { unique: true }).catch(() => undefined);
  return col;
}

export async function getHiringChecklist(): Promise<HiringChecklistItemDef[]> {
  const col = await checklistCollection();
  const doc = await col.findOne({ key: "default" });
  if (!doc?.items?.length) return DEFAULT_HIRING_CHECKLIST.map((i) => ({ ...i }));
  return doc.items
    .map((i) => ({
      id: String(i.id || "").slice(0, 40),
      label: String(i.label || "").slice(0, 160),
      required: Boolean(i.required),
      validityDays:
        i.validityDays == null || Number.isNaN(Number(i.validityDays))
          ? null
          : Math.max(0, Math.round(Number(i.validityDays))),
      alertDaysBefore: Math.max(0, Math.round(Number(i.alertDaysBefore || 0))),
      active: i.active !== false,
      sort: Number(i.sort || 0),
    }))
    .filter((i) => i.id && i.label)
    .sort((a, b) => a.sort - b.sort);
}

export async function saveHiringChecklist(
  items: HiringChecklistItemDef[],
  actor: { email: string },
): Promise<HiringChecklistItemDef[]> {
  const cleaned = items
    .map((i, idx) => ({
      id: String(i.id || `item_${idx + 1}`).trim().slice(0, 40),
      label: String(i.label || "").trim().slice(0, 160),
      required: Boolean(i.required),
      validityDays:
        i.validityDays == null ? null : Math.max(0, Math.round(i.validityDays)),
      alertDaysBefore: Math.max(0, Math.round(i.alertDaysBefore || 0)),
      active: i.active !== false,
      sort: Number.isFinite(i.sort) ? i.sort : (idx + 1) * 10,
    }))
    .filter((i) => i.id && i.label);
  if (cleaned.length === 0) {
    throw new Error("Checklist vide");
  }
  const col = await checklistCollection();
  await col.updateOne(
    { key: "default" },
    {
      $set: {
        key: "default",
        items: cleaned,
        updatedAt: Date.now(),
        updatedByEmail: actor.email,
      },
    },
    { upsert: true },
  );
  return cleaned;
}

function emptyPieces(checklist: HiringChecklistItemDef[]): HiringPiece[] {
  return checklist
    .filter((c) => c.active)
    .map((c) => ({
      itemId: c.id,
      present: false,
      receivedAt: null,
      expiresAt: null,
      note: "",
      fileRef: "",
    }));
}

export function mapHiringDossier(
  doc: WithId<DbHiringDossier> | DbHiringDossier,
  checklist: HiringChecklistItemDef[],
) {
  const id =
    doc._id instanceof ObjectId
      ? doc._id.toHexString()
      : String((doc as { _id?: unknown })._id ?? "");
  const views = buildPieceViews(checklist, doc.pieces || []);
  const summary = summarizeDossier(views);
  return {
    id,
    employeeName: doc.employeeName,
    email: doc.email,
    phone: doc.phone,
    roleTarget: doc.roleTarget,
    startDate: doc.startDate,
    recruitmentId: doc.recruitmentId,
    status: doc.status,
    pieces: doc.pieces || [],
    rhOwner: doc.rhOwner,
    comments: doc.comments,
    history: Array.isArray(doc.history) ? doc.history : [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    createdByEmail: doc.createdByEmail,
    createdByName: doc.createdByName,
    views,
    summary,
  };
}

export async function listHiringDossiers() {
  const [col, checklist] = await Promise.all([
    dossiersCollection(),
    getHiringChecklist(),
  ]);
  const rows = await col
    .find({})
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(400)
    .toArray();
  return rows.map((r) => mapHiringDossier(r, checklist));
}

export async function countHiringAlerts() {
  const items = await listHiringDossiers();
  let missing = 0;
  let expired = 0;
  let alert = 0;
  let incomplets = 0;
  for (const d of items) {
    missing += d.summary.missingCount;
    expired += d.summary.expiredCount;
    alert += d.summary.alertCount;
    if (d.summary.missingCount > 0 || d.summary.expiredCount > 0) {
      incomplets += 1;
    }
  }
  return {
    total: items.length,
    incomplets,
    missingPieces: missing,
    expiredPieces: expired,
    alertPieces: alert,
  };
}

export async function createHiringDossier(
  input: HiringDossierInput,
  actor: { email: string; name: string; role: UserRole | string },
) {
  const checklist = await getHiringChecklist();
  const col = await dossiersCollection();
  const now = Date.now();
  const entry = makeHistory({
    kind: "created",
    note: "Dossier d’embauche ouvert",
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });
  const doc: DbHiringDossier = {
    employeeName: input.employeeName.trim().slice(0, 120),
    email: input.email.trim().toLowerCase().slice(0, 180),
    phone: input.phone.trim().slice(0, 40),
    roleTarget: input.roleTarget.trim().slice(0, 120) || "Agent terrain",
    startDate: (input.startDate || "").trim().slice(0, 20),
    recruitmentId: (input.recruitmentId || "").trim().slice(0, 40),
    status: "incomplet",
    pieces: emptyPieces(checklist),
    rhOwner: (input.rhOwner || actor.name).trim().slice(0, 120),
    comments: (input.comments || "").trim().slice(0, 2000),
    history: [entry],
    createdAt: now,
    updatedAt: now,
    createdByEmail: actor.email,
    createdByName: actor.name,
  };
  const result = await col.insertOne(doc);
  return mapHiringDossier({ ...doc, _id: result.insertedId }, checklist);
}

async function getRaw(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const col = await dossiersCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function updateHiringPiece(
  id: string,
  piecePatch: Partial<HiringPiece> & { itemId: string },
  actor: { email: string; name: string; role: UserRole | string },
) {
  const [doc, checklist] = await Promise.all([getRaw(id), getHiringChecklist()]);
  if (!doc) return null;
  const def = checklist.find((c) => c.id === piecePatch.itemId);
  if (!def) throw new Error("Pièce inconnue dans la checklist");

  const pieces = [...(doc.pieces || [])];
  const idx = pieces.findIndex((p) => p.itemId === piecePatch.itemId);
  const current =
    idx >= 0
      ? pieces[idx]!
      : {
          itemId: piecePatch.itemId,
          present: false,
          receivedAt: null,
          expiresAt: null,
          note: "",
          fileRef: "",
        };

  const present =
    piecePatch.present !== undefined ? Boolean(piecePatch.present) : current.present;
  let receivedAt =
    piecePatch.receivedAt !== undefined
      ? piecePatch.receivedAt
      : current.receivedAt;
  if (present && !receivedAt) {
    receivedAt = new Date().toISOString().slice(0, 10);
  }
  if (!present) {
    receivedAt = null;
  }

  let expiresAt =
    piecePatch.expiresAt !== undefined
      ? piecePatch.expiresAt
      : current.expiresAt;
  if (present && def.validityDays != null && !piecePatch.expiresAt) {
    expiresAt = deriveExpiresAt(receivedAt, def.validityDays);
  }
  if (!present) expiresAt = null;

  const next: HiringPiece = {
    itemId: piecePatch.itemId,
    present,
    receivedAt,
    expiresAt,
    note: (piecePatch.note !== undefined ? piecePatch.note : current.note)
      .trim()
      .slice(0, 400),
    fileRef: (piecePatch.fileRef !== undefined
      ? piecePatch.fileRef
      : current.fileRef
    )
      .trim()
      .slice(0, 200),
  };

  if (idx >= 0) pieces[idx] = next;
  else pieces.push(next);

  const views = buildPieceViews(checklist, pieces);
  const summary = summarizeDossier(views);
  let status: HiringDossierStatus = doc.status;
  if (doc.status !== "bloque" && doc.status !== "valide") {
    status =
      summary.missingCount === 0 && summary.expiredCount === 0
        ? "complet"
        : "incomplet";
  }

  const entry = makeHistory({
    kind: "piece",
    note: `${def.label} : ${present ? "présent" : "manquant"}${
      expiresAt ? ` (expire ${expiresAt})` : ""
    }`,
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });

  const col = await dossiersCollection();
  await col.updateOne(
    { _id: doc._id },
    {
      $set: {
        pieces,
        status,
        updatedAt: Date.now(),
      },
      $push: { history: entry },
    },
  );
  const updated = await getRaw(id);
  return updated ? mapHiringDossier(updated, checklist) : null;
}

export async function setHiringDossierStatus(
  id: string,
  status: HiringDossierStatus,
  actor: { email: string; name: string; role: UserRole | string },
  note = "",
) {
  const [doc, checklist] = await Promise.all([getRaw(id), getHiringChecklist()]);
  if (!doc) return null;
  const views = buildPieceViews(checklist, doc.pieces || []);
  const readiness = hiringReadinessRequirements(views);

  if (
    (status === "valide" || status === "complet") &&
    !readiness.ok
  ) {
    const detail = readiness.blocking.slice(0, 6).join(" · ");
    throw new Error(
      status === "valide"
        ? `Impossible de valider l’intégration — ${detail}`
        : `Impossible de marquer complet — ${detail}`,
    );
  }

  const entry = makeHistory({
    kind: "status",
    note:
      note ||
      (status === "valide"
        ? "Dossier validé — prêt pour intégration"
        : `Statut → ${status}`),
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });
  const col = await dossiersCollection();
  await col.updateOne(
    { _id: doc._id },
    {
      $set: { status, updatedAt: Date.now() },
      $push: { history: entry },
    },
  );
  const updated = await getRaw(id);
  return updated ? mapHiringDossier(updated, checklist) : null;
}

export async function updateHiringDossierMeta(
  id: string,
  patch: Partial<HiringDossierInput> & { comments?: string; rhOwner?: string },
  actor: { email: string; name: string; role: UserRole | string },
) {
  const [doc, checklist] = await Promise.all([getRaw(id), getHiringChecklist()]);
  if (!doc) return null;
  const entry = makeHistory({
    kind: "note",
    note: "Fiche dossier mise à jour",
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });
  const col = await dossiersCollection();
  await col.updateOne(
    { _id: doc._id },
    {
      $set: {
        employeeName:
          patch.employeeName !== undefined
            ? patch.employeeName.trim().slice(0, 120)
            : doc.employeeName,
        email:
          patch.email !== undefined
            ? patch.email.trim().toLowerCase().slice(0, 180)
            : doc.email,
        phone:
          patch.phone !== undefined
            ? patch.phone.trim().slice(0, 40)
            : doc.phone,
        roleTarget:
          patch.roleTarget !== undefined
            ? patch.roleTarget.trim().slice(0, 120)
            : doc.roleTarget,
        startDate:
          patch.startDate !== undefined
            ? patch.startDate.trim().slice(0, 20)
            : doc.startDate,
        recruitmentId:
          patch.recruitmentId !== undefined
            ? patch.recruitmentId.trim().slice(0, 40)
            : doc.recruitmentId,
        rhOwner:
          patch.rhOwner !== undefined
            ? patch.rhOwner.trim().slice(0, 120)
            : doc.rhOwner,
        comments:
          patch.comments !== undefined
            ? patch.comments.trim().slice(0, 2000)
            : doc.comments,
        updatedAt: Date.now(),
      },
      $push: { history: entry },
    },
  );
  const updated = await getRaw(id);
  return updated ? mapHiringDossier(updated, checklist) : null;
}

export async function deleteHiringDossier(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await dossiersCollection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}
