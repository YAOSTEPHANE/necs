import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  isPurchaseRequestStatus,
  isPurchaseUrgency,
  makePurchaseRequestLine,
  purchaseRequestReady,
  type PurchaseRequest,
  type PurchaseRequestHistoryEntry,
  type PurchaseRequestLine,
  type PurchaseRequestStatus,
  type PurchaseUrgency,
} from "@/lib/purchase-requests-shared";

type Actor = { userId: string; name: string; email: string; role: UserRole };

const COLLECTION = "ops_purchase_requests";

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string): PurchaseRequestHistoryEntry {
  return {
    id: `DAH-${randomUUID().slice(0, 8).toUpperCase()}`,
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
  const c = db.collection<PurchaseRequest>(COLLECTION);
  void Promise.all([
    c.createIndex({ number: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ siteName: 1, updatedAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

function yearPrefix() {
  return String(new Date().getFullYear());
}

async function nextNumber(): Promise<string> {
  const c = await col();
  const count = await c.countDocuments();
  return `NECS-DA-${yearPrefix()}-${String(count + 1).padStart(4, "0")}`;
}

function normalizeLine(
  raw: Partial<PurchaseRequestLine> | Record<string, unknown>,
): PurchaseRequestLine {
  return makePurchaseRequestLine({
    id: clean(raw.id, 40) || undefined,
    label: clean(raw.label, 240) || "Article",
    quantity: Number(raw.quantity) || 0,
    unit: clean(raw.unit, 40) || "u",
    unitPrice: Number(raw.unitPrice) || 0,
    estimate: Number(raw.estimate) || 0,
    urgency: isPurchaseUrgency(raw.urgency) ? raw.urgency : "normale",
  });
}

function coerce(raw: Record<string, unknown>): PurchaseRequest {
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map((l) => normalizeLine(l as Partial<PurchaseRequestLine>))
    : [];
  return {
    id: clean(raw.id, 40) || `DA-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: clean(raw.number, 40) || "NECS-DA-0000",
    status: isPurchaseRequestStatus(raw.status) ? raw.status : "brouillon",
    requesterName: clean(raw.requesterName, 120),
    siteName: clean(raw.siteName, 160),
    needDate: clean(raw.needDate, 10),
    supplier: clean(raw.supplier, 180),
    altSupplier: clean(raw.altSupplier, 180),
    costCenter: clean(raw.costCenter, 160),
    approverName: clean(raw.approverName, 120),
    urgency: isPurchaseUrgency(raw.urgency) ? raw.urgency : "normale",
    expectedDelivery: clean(raw.expectedDelivery, 10),
    justification: clean(raw.justification, 4000),
    lines,
    totalEstimate: lines.reduce((s, l) => s + l.estimate, 0),
    rejectionReason: clean(raw.rejectionReason, 2000),
    validationComment: clean(raw.validationComment, 2000),
    note: clean(raw.note, 2000),
    history: Array.isArray(raw.history)
      ? (raw.history as PurchaseRequestHistoryEntry[])
      : [],
    validatedAt:
      typeof raw.validatedAt === "string" && raw.validatedAt
        ? raw.validatedAt
        : null,
    validatedBy: clean(raw.validatedBy, 80),
    validatedByName: clean(raw.validatedByName, 120),
    createdAt: clean(raw.createdAt, 40) || nowIso(),
    updatedAt: clean(raw.updatedAt, 40) || nowIso(),
    createdBy: clean(raw.createdBy, 80),
    createdByName: clean(raw.createdByName, 120),
    ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
    ownerName: clean(raw.ownerName, 120),
  };
}

async function save(doc: PurchaseRequest): Promise<PurchaseRequest> {
  const next = {
    ...doc,
    totalEstimate: doc.lines.reduce((s, l) => s + l.estimate, 0),
    updatedAt: nowIso(),
  };
  const c = await col();
  await c.replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

async function ensureSeed(actor: Actor): Promise<void> {
  const c = await col();
  if ((await c.countDocuments()) > 0) return;
  const now = Date.now();
  const day = (o: number) =>
    new Date(now + o * 86_400_000).toISOString().slice(0, 10);
  const at = (o: number) => new Date(now + o * 86_400_000).toISOString();
  await c.insertOne({
    id: `DA-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: `NECS-DA-${yearPrefix()}-0001`,
    status: "en_validation",
    requesterName: actor.name,
    siteName: "Usine Bassa",
    needDate: day(3),
    supplier: "Propre Shop Douala",
    altSupplier: "Clean Pro Yaoundé",
    costCenter: "OPS-BASSA",
    approverName: "Manager site",
    urgency: "haute",
    expectedDelivery: day(7),
    justification:
      "Réappro consommables suite écart BL et hausse passages atelier.",
    lines: [
      makePurchaseRequestLine({
        label: "Serpillères microfibre",
        quantity: 30,
        unit: "Pce",
        unitPrice: 1_500,
        estimate: 45_000,
        urgency: "normale",
      }),
      makePurchaseRequestLine({
        label: "Gants nitrile",
        quantity: 100,
        unit: "Paire",
        unitPrice: 280,
        estimate: 28_000,
        urgency: "haute",
      }),
    ],
    totalEstimate: 73_000,
    rejectionReason: "",
    validationComment: "",
    note: "DA démo TMP-15",
    history: [hist(actor, "DA démo créée · en validation")],
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    createdAt: at(-1),
    updatedAt: at(-0.5),
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  });
}

export async function listPurchaseRequests(
  actor: Actor,
): Promise<PurchaseRequest[]> {
  await ensureSeed(actor);
  const c = await col();
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) => coerce(stripMongo(r) as Record<string, unknown>));
}

export async function getPurchaseRequest(
  id: string,
): Promise<PurchaseRequest | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerce(stripMongo(row) as Record<string, unknown>);
}

export type PurchaseRequestInput = {
  requesterName: string;
  siteName: string;
  needDate?: string;
  supplier?: string;
  altSupplier?: string;
  costCenter?: string;
  approverName?: string;
  urgency?: PurchaseUrgency | string;
  expectedDelivery?: string;
  justification: string;
  lines?: Partial<PurchaseRequestLine>[];
  note?: string;
  validationComment?: string;
  status?: PurchaseRequestStatus | "";
};

export async function createPurchaseRequest(
  input: PurchaseRequestInput,
  actor: Actor,
): Promise<PurchaseRequest> {
  const requesterName = clean(input.requesterName, 120) || actor.name;
  const siteName = clean(input.siteName, 160);
  const justification = clean(input.justification, 4000);
  if (!siteName) throw new Error("Site requis");
  if (!justification) throw new Error("Justification requise");
  const lines = (input.lines || [])
    .map(normalizeLine)
    .filter((l) => l.label.trim() && l.quantity > 0);
  if (!lines.length) throw new Error("Au moins un article requis");

  const now = nowIso();
  const doc: PurchaseRequest = {
    id: `DA-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: await nextNumber(),
    status: isPurchaseRequestStatus(input.status) ? input.status : "brouillon",
    requesterName,
    siteName,
    needDate: clean(input.needDate, 10),
    supplier: clean(input.supplier, 180),
    altSupplier: clean(input.altSupplier, 180),
    costCenter: clean(input.costCenter, 160),
    approverName: clean(input.approverName, 120),
    urgency: isPurchaseUrgency(input.urgency) ? input.urgency : "normale",
    expectedDelivery: clean(input.expectedDelivery, 10),
    justification,
    lines,
    totalEstimate: lines.reduce((s, l) => s + l.estimate, 0),
    rejectionReason: "",
    validationComment: clean(input.validationComment, 2000),
    note: clean(input.note, 2000),
    history: [
      hist(actor, `DA créée · ${siteName} · ${lines.length} article(s)`),
    ],
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  await save(doc);
  return doc;
}

export async function updatePurchaseRequest(
  id: string,
  patch: Partial<PurchaseRequestInput>,
  actor: Actor,
): Promise<PurchaseRequest> {
  const existing = await getPurchaseRequest(id);
  if (!existing) throw new Error("Demande introuvable");
  if (
    existing.status === "validee" ||
    existing.status === "commandee" ||
    existing.status === "annulee"
  ) {
    throw new Error("Demande verrouillée");
  }
  const lines =
    patch.lines !== undefined
      ? patch.lines.map(normalizeLine).filter((l) => l.label.trim())
      : existing.lines;
  return save({
    ...existing,
    requesterName:
      patch.requesterName !== undefined
        ? clean(patch.requesterName, 120) || existing.requesterName
        : existing.requesterName,
    siteName:
      patch.siteName !== undefined
        ? clean(patch.siteName, 160) || existing.siteName
        : existing.siteName,
    needDate:
      patch.needDate !== undefined
        ? clean(patch.needDate, 10)
        : existing.needDate,
    supplier:
      patch.supplier !== undefined
        ? clean(patch.supplier, 180)
        : existing.supplier,
    altSupplier:
      patch.altSupplier !== undefined
        ? clean(patch.altSupplier, 180)
        : existing.altSupplier,
    costCenter:
      patch.costCenter !== undefined
        ? clean(patch.costCenter, 160)
        : existing.costCenter,
    approverName:
      patch.approverName !== undefined
        ? clean(patch.approverName, 120)
        : existing.approverName,
    urgency:
      patch.urgency !== undefined && isPurchaseUrgency(patch.urgency)
        ? patch.urgency
        : existing.urgency,
    expectedDelivery:
      patch.expectedDelivery !== undefined
        ? clean(patch.expectedDelivery, 10)
        : existing.expectedDelivery,
    justification:
      patch.justification !== undefined
        ? clean(patch.justification, 4000) || existing.justification
        : existing.justification,
    lines,
    note: patch.note !== undefined ? clean(patch.note, 2000) : existing.note,
    validationComment:
      patch.validationComment !== undefined
        ? clean(patch.validationComment, 2000)
        : existing.validationComment,
    history: [hist(actor, "DA mise à jour"), ...existing.history].slice(0, 80),
  });
}

export async function submitPurchaseRequest(
  id: string,
  actor: Actor,
): Promise<PurchaseRequest> {
  const existing = await getPurchaseRequest(id);
  if (!existing) throw new Error("Demande introuvable");
  const recipe = purchaseRequestReady(existing);
  if (!recipe.ok) throw new Error(`Incomplet : ${recipe.missing.join(", ")}`);
  return save({
    ...existing,
    status: "en_validation",
    history: [
      hist(actor, "Soumise pour validation"),
      ...existing.history,
    ].slice(0, 80),
  });
}

export async function validatePurchaseRequest(
  id: string,
  actor: Actor,
  comment = "",
): Promise<PurchaseRequest> {
  const existing = await getPurchaseRequest(id);
  if (!existing) throw new Error("Demande introuvable");
  const recipe = purchaseRequestReady(existing);
  if (!recipe.ok) throw new Error(`Incomplet : ${recipe.missing.join(", ")}`);
  const now = nowIso();
  return save({
    ...existing,
    status: "validee",
    validatedAt: now,
    validatedBy: actor.userId,
    validatedByName: actor.name,
    rejectionReason: "",
    validationComment: clean(comment, 2000) || existing.validationComment,
    history: [hist(actor, "DA validée"), ...existing.history].slice(0, 80),
  });
}

export async function rejectPurchaseRequest(
  id: string,
  reason: string,
  actor: Actor,
): Promise<PurchaseRequest> {
  const existing = await getPurchaseRequest(id);
  if (!existing) throw new Error("Demande introuvable");
  const rejectionReason = clean(reason, 2000);
  if (!rejectionReason) throw new Error("Motif de refus requis");
  return save({
    ...existing,
    status: "refusee",
    rejectionReason,
    history: [
      hist(actor, `DA refusée · ${rejectionReason.slice(0, 80)}`),
      ...existing.history,
    ].slice(0, 80),
  });
}

export async function markPurchaseRequestOrdered(
  id: string,
  actor: Actor,
): Promise<PurchaseRequest> {
  const existing = await getPurchaseRequest(id);
  if (!existing) throw new Error("Demande introuvable");
  if (existing.status !== "validee") {
    throw new Error("Seule une DA validée peut passer en commandée");
  }
  return save({
    ...existing,
    status: "commandee",
    history: [
      hist(actor, "Marquée commandée (fournisseur)"),
      ...existing.history,
    ].slice(0, 80),
  });
}

export async function cancelPurchaseRequest(
  id: string,
  actor: Actor,
  note = "",
): Promise<PurchaseRequest> {
  const existing = await getPurchaseRequest(id);
  if (!existing) throw new Error("Demande introuvable");
  if (existing.status === "commandee" || existing.status === "annulee") {
    throw new Error("Demande déjà clôturée");
  }
  return save({
    ...existing,
    status: "annulee",
    history: [
      hist(actor, clean(note, 200) || "DA annulée"),
      ...existing.history,
    ].slice(0, 80),
  });
}
