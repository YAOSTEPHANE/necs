import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import { getQuote, listQuotes } from "@/lib/quotes-crm";
import type { Quote } from "@/lib/quotes-shared";
import {
  DEFAULT_PO_CONDITIONS,
  computePurchaseOrderTotal,
  isPurchaseOrderPriority,
  isPurchaseOrderStatus,
  makePurchaseOrderLine,
  purchaseOrderReadyToValidate,
  type PurchaseOrder,
  type PurchaseOrderHistoryEntry,
  type PurchaseOrderLine,
  type PurchaseOrderPriority,
  type PurchaseOrderStatus,
} from "@/lib/purchase-orders-shared";

const COLLECTION = "crm_purchase_orders";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string): PurchaseOrderHistoryEntry {
  return {
    id: `POH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

async function col() {
  const db = await getDb();
  const c = db.collection<PurchaseOrder>(COLLECTION);
  void Promise.all([
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ quoteId: 1 }).catch(() => undefined),
    c.createIndex({ ref: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ ownerEmail: 1, status: 1 }).catch(() => undefined),
  ]);
  return c;
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

function normalizeLine(
  raw: Partial<PurchaseOrderLine> | Record<string, unknown>,
): PurchaseOrderLine {
  return makePurchaseOrderLine({
    id: clean(raw.id, 40) || undefined,
    label: clean(raw.label, 240) || "Prestation",
    quantity: Number(raw.quantity) || 0,
    unit: clean(raw.unit, 40) || "u",
    scheduledDate: clean(raw.scheduledDate, 10),
    site: clean(raw.site, 160),
    status:
      raw.status === "valide" || raw.status === "annule" ? raw.status : "prevu",
    unitPrice: Number(raw.unitPrice) || 0,
  });
}

function coercePo(raw: Record<string, unknown>): PurchaseOrder {
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map((l) =>
        normalizeLine(l as Partial<PurchaseOrderLine>),
      )
    : [];
  const status = isPurchaseOrderStatus(raw.status) ? raw.status : "brouillon";
  const priority = isPurchaseOrderPriority(raw.priority)
    ? raw.priority
    : "normale";
  const totalHT = computePurchaseOrderTotal(lines);
  return {
    id: clean(raw.id, 40) || `PO-${randomUUID().slice(0, 8).toUpperCase()}`,
    ref: clean(raw.ref, 40) || "NECS-BC-0000",
    clientRef: clean(raw.clientRef, 80),
    quoteId: clean(raw.quoteId, 40),
    quoteRef: clean(raw.quoteRef, 80),
    opportunityId: clean(raw.opportunityId, 40),
    prospectId: clean(raw.prospectId, 40),
    company: clean(raw.company, 180),
    site: clean(raw.site, 160),
    contactName: clean(raw.contactName, 120),
    contactEmail: clean(raw.contactEmail, 180).toLowerCase(),
    contactPhone: clean(raw.contactPhone, 40),
    orderDate: clean(raw.orderDate, 10),
    startDate: clean(raw.startDate, 10),
    priority,
    conditions: clean(raw.conditions, 4000),
    status,
    lines,
    totalHT,
    note: clean(raw.note, 2000),
    rejectionReason: clean(raw.rejectionReason, 800),
    history: Array.isArray(raw.history)
      ? (raw.history as PurchaseOrderHistoryEntry[])
      : [],
    validatedAt:
      typeof raw.validatedAt === "string" && raw.validatedAt
        ? raw.validatedAt
        : null,
    validatedBy: clean(raw.validatedBy, 80),
    validatedByName: clean(raw.validatedByName, 120),
    transmittedAt:
      typeof raw.transmittedAt === "string" && raw.transmittedAt
        ? raw.transmittedAt
        : null,
    createdAt: clean(raw.createdAt, 40) || nowIso(),
    updatedAt: clean(raw.updatedAt, 40) || nowIso(),
    createdBy: clean(raw.createdBy, 80),
    createdByName: clean(raw.createdByName, 120),
    ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
    ownerName: clean(raw.ownerName, 120),
  };
}

async function save(doc: PurchaseOrder): Promise<PurchaseOrder> {
  const next = {
    ...doc,
    totalHT: computePurchaseOrderTotal(doc.lines),
    updatedAt: nowIso(),
  };
  const c = await col();
  await c.replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

async function nextRef(): Promise<string> {
  const c = await col();
  const count = await c.countDocuments();
  const n = String(count + 1).padStart(4, "0");
  return `NECS-BC-${n}`;
}

function linesFromQuote(quote: Quote, site: string, startDate: string) {
  return quote.lines.map((l) =>
    makePurchaseOrderLine({
      label: l.label,
      quantity: l.quantity,
      unit: l.unit,
      scheduledDate: startDate,
      site,
      status: "prevu",
      unitPrice: l.unitPrice,
    }),
  );
}

async function ensureDemoSeed(actor: Actor): Promise<void> {
  const c = await col();
  const count = await c.countDocuments();
  if (count > 0) return;

  const now = Date.now();
  const day = (offset: number) =>
    new Date(now + offset * 86_400_000).toISOString().slice(0, 10);

  const seeds: PurchaseOrder[] = [
    {
      id: `PO-${randomUUID().slice(0, 8).toUpperCase()}`,
      ref: "NECS-BC-0001",
      clientRef: "BC-HORIZON-2026-03",
      quoteId: "",
      quoteRef: "NECS-DEV-0142",
      opportunityId: "",
      prospectId: "",
      company: "Société Horizon SA",
      site: "Immeuble Horizon — Akwa",
      contactName: "Aïcha Nkomo",
      contactEmail: "a.nkomo@horizon.cm",
      contactPhone: "+237 6 90 11 22 33",
      orderDate: day(-5),
      startDate: day(7),
      priority: "haute",
      conditions: "Démarrage sous 7 jours après validation · paiement 30 j.",
      status: "en_validation",
      lines: [
        makePurchaseOrderLine({
          label: "Entretien quotidien bureaux (sols, postes, circulations)",
          quantity: 22,
          unit: "Jour",
          scheduledDate: day(7),
          site: "Immeuble Horizon — Akwa",
          unitPrice: 25_000,
        }),
        makePurchaseOrderLine({
          label: "Vitrerie intérieure mensuelle",
          quantity: 1,
          unit: "Forfait",
          scheduledDate: day(10),
          site: "Immeuble Horizon — Akwa",
          unitPrice: 180_000,
        }),
      ],
      totalHT: 0,
      note: "Commande liée au devis accepté Horizon",
      rejectionReason: "",
      history: [
        hist(actor, "BC démo créé · en validation"),
      ],
      validatedAt: null,
      validatedBy: "",
      validatedByName: "",
      transmittedAt: null,
      createdAt: new Date(now - 5 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 86_400_000).toISOString(),
      createdBy: actor.userId,
      createdByName: actor.name,
      ownerEmail: actor.email.toLowerCase(),
      ownerName: actor.name,
    },
    {
      id: `PO-${randomUUID().slice(0, 8).toUpperCase()}`,
      ref: "NECS-BC-0002",
      clientRef: "PO-BASSA-089",
      quoteId: "",
      quoteRef: "NECS-DEV-0098",
      opportunityId: "",
      prospectId: "",
      company: "Usine Bassa Industries",
      site: "Usine Bassa",
      contactName: "Paul Mbarga",
      contactEmail: "p.mbarga@bassa.cm",
      contactPhone: "+237 6 77 44 55 66",
      orderDate: day(-12),
      startDate: day(-2),
      priority: "normale",
      conditions: "Planning ops déjà synchronisé",
      status: "transmis_ops",
      lines: [
        makePurchaseOrderLine({
          label: "Nettoyage industriel ateliers",
          quantity: 20,
          unit: "Jour",
          scheduledDate: day(-2),
          site: "Usine Bassa",
          status: "valide",
          unitPrice: 45_000,
        }),
      ],
      totalHT: 0,
      note: "",
      rejectionReason: "",
      history: [
        hist(actor, "BC démo validé"),
        hist(actor, "Transmis aux opérations"),
      ],
      validatedAt: new Date(now - 8 * 86_400_000).toISOString(),
      validatedBy: actor.userId,
      validatedByName: actor.name,
      transmittedAt: new Date(now - 7 * 86_400_000).toISOString(),
      createdAt: new Date(now - 12 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 7 * 86_400_000).toISOString(),
      createdBy: actor.userId,
      createdByName: actor.name,
      ownerEmail: actor.email.toLowerCase(),
      ownerName: actor.name,
    },
    {
      id: `PO-${randomUUID().slice(0, 8).toUpperCase()}`,
      ref: "NECS-BC-0003",
      clientRef: "CMD-RIVIERA-441",
      quoteId: "",
      quoteRef: "NECS-DEV-0110",
      opportunityId: "",
      prospectId: "",
      company: "Mall Riviera",
      site: "Mall Riviera — Douala",
      contactName: "Sarah Essomba",
      contactEmail: "s.essomba@riviera.cm",
      contactPhone: "+237 6 55 88 99 00",
      orderDate: day(-2),
      startDate: day(14),
      priority: "urgente",
      conditions: "Urgence ouverture boutique — démarrage prioritaire",
      status: "brouillon",
      lines: [
        makePurchaseOrderLine({
          label: "Remise en état magasin + vitrerie",
          quantity: 1,
          unit: "Forfait",
          scheduledDate: day(14),
          site: "Mall Riviera — Douala",
          unitPrice: 650_000,
        }),
      ],
      totalHT: 0,
      note: "Brouillon à finaliser",
      rejectionReason: "",
      history: [hist(actor, "BC démo brouillon")],
      validatedAt: null,
      validatedBy: "",
      validatedByName: "",
      transmittedAt: null,
      createdAt: new Date(now - 2 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 3_600_000).toISOString(),
      createdBy: actor.userId,
      createdByName: actor.name,
      ownerEmail: actor.email.toLowerCase(),
      ownerName: actor.name,
    },
  ];

  for (const s of seeds) {
    s.totalHT = computePurchaseOrderTotal(s.lines);
  }
  await c.insertMany(seeds);
}

export async function listPurchaseOrders(
  actor: Actor,
): Promise<PurchaseOrder[]> {
  const c = await col();
  await ensureDemoSeed(actor);
  const filter =
    actor.role === "commercial"
      ? {
          $or: [
            { ownerEmail: actor.email.toLowerCase() },
            { createdBy: actor.userId },
          ],
        }
      : {};
  const rows = await c.find(filter).sort({ updatedAt: -1 }).limit(400).toArray();
  return rows.map((r) => coercePo(stripMongo(r) as Record<string, unknown>));
}

export async function getPurchaseOrder(
  id: string,
): Promise<PurchaseOrder | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coercePo(stripMongo(row) as Record<string, unknown>);
}

export type QuoteEligibleForPo = {
  id: string;
  title: string;
  company: string;
  status: string;
  totalHT: number;
  opportunityId: string;
  prospectId: string;
};

export async function listQuotesEligibleForPo(
  actor: Actor,
): Promise<QuoteEligibleForPo[]> {
  const quotes = await listQuotes(actor);
  return quotes
    .filter((q) => q.status === "valide" || q.status === "envoye")
    .map((q) => ({
      id: q.id,
      title: q.title || q.company,
      company: q.company,
      status: q.status,
      totalHT: q.totals.totalHT,
      opportunityId: q.opportunityId,
      prospectId: q.prospectId,
    }));
}

export async function createPurchaseOrderFromQuote(
  quoteId: string,
  input: {
    site?: string;
    clientRef?: string;
    orderDate?: string;
    startDate?: string;
    priority?: PurchaseOrderPriority;
    conditions?: string;
    note?: string;
  },
  actor: Actor,
): Promise<PurchaseOrder> {
  const quote = await getQuote(quoteId);
  if (!quote) throw new Error("Devis introuvable");
  if (quote.status !== "valide" && quote.status !== "envoye") {
    throw new Error("Seuls les devis validés ou envoyés peuvent devenir un BC");
  }

  const orderDate =
    clean(input.orderDate, 10) || nowIso().slice(0, 10);
  const startDate = clean(input.startDate, 10);
  const site = clean(input.site, 160) || "Site principal";
  const priority = isPurchaseOrderPriority(input.priority)
    ? input.priority
    : "normale";
  const lines = linesFromQuote(quote, site, startDate);
  const ref = await nextRef();
  const now = nowIso();

  const doc: PurchaseOrder = {
    id: `PO-${randomUUID().slice(0, 8).toUpperCase()}`,
    ref,
    clientRef: clean(input.clientRef, 80) || quote.id,
    quoteId: quote.id,
    quoteRef: quote.id,
    opportunityId: quote.opportunityId,
    prospectId: quote.prospectId,
    company: quote.company,
    site,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    orderDate,
    startDate,
    priority,
    conditions: clean(input.conditions, 4000) || DEFAULT_PO_CONDITIONS,
    status: "brouillon",
    lines,
    totalHT: computePurchaseOrderTotal(lines),
    note: clean(input.note, 2000),
    rejectionReason: "",
    history: [
      hist(
        actor,
        `BC créé depuis devis ${quote.id} · ${quote.company}`,
      ),
    ],
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    transmittedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };

  return save(doc);
}

export async function createManualPurchaseOrder(
  input: {
    company: string;
    clientRef?: string;
    site?: string;
    quoteRef?: string;
    orderDate?: string;
    startDate?: string;
    priority?: PurchaseOrderPriority;
    conditions?: string;
    note?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    lines?: Array<Partial<PurchaseOrderLine>>;
  },
  actor: Actor,
): Promise<PurchaseOrder> {
  const company = clean(input.company, 180);
  if (!company) throw new Error("Client requis");

  const orderDate =
    clean(input.orderDate, 10) || nowIso().slice(0, 10);
  const startDate = clean(input.startDate, 10);
  const site = clean(input.site, 160);
  const priority = isPurchaseOrderPriority(input.priority)
    ? input.priority
    : "normale";
  const lines = (input.lines || []).map((l) =>
    normalizeLine({ ...l, site: clean(l.site, 160) || site }),
  );
  if (lines.length === 0) {
    lines.push(
      makePurchaseOrderLine({
        label: "Prestation à préciser",
        quantity: 1,
        unit: "u",
        scheduledDate: startDate,
        site,
        unitPrice: 0,
      }),
    );
  }

  const ref = await nextRef();
  const now = nowIso();
  const doc: PurchaseOrder = {
    id: `PO-${randomUUID().slice(0, 8).toUpperCase()}`,
    ref,
    clientRef: clean(input.clientRef, 80),
    quoteId: "",
    quoteRef: clean(input.quoteRef, 80),
    opportunityId: "",
    prospectId: "",
    company,
    site,
    contactName: clean(input.contactName, 120),
    contactEmail: clean(input.contactEmail, 180).toLowerCase(),
    contactPhone: clean(input.contactPhone, 40),
    orderDate,
    startDate,
    priority,
    conditions: clean(input.conditions, 4000) || DEFAULT_PO_CONDITIONS,
    status: "brouillon",
    lines,
    totalHT: computePurchaseOrderTotal(lines),
    note: clean(input.note, 2000),
    rejectionReason: "",
    history: [hist(actor, `BC manuel créé · ${company}`)],
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    transmittedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };

  return save(doc);
}

export async function updatePurchaseOrderDraft(
  id: string,
  patch: {
    company?: string;
    clientRef?: string;
    site?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    orderDate?: string;
    startDate?: string;
    priority?: PurchaseOrderPriority;
    conditions?: string;
    note?: string;
    quoteRef?: string;
    lines?: Array<Partial<PurchaseOrderLine>>;
  },
  actor: Actor,
): Promise<PurchaseOrder> {
  const existing = await getPurchaseOrder(id);
  if (!existing) throw new Error("Bon de commande introuvable");
  if (
    existing.status !== "brouillon" &&
    existing.status !== "refuse"
  ) {
    throw new Error("Seul un brouillon (ou refus) peut être modifié");
  }

  const lines = Array.isArray(patch.lines)
    ? patch.lines.map((l) => normalizeLine(l))
    : existing.lines;

  const next: PurchaseOrder = {
    ...existing,
    company:
      patch.company !== undefined
        ? clean(patch.company, 180)
        : existing.company,
    clientRef:
      patch.clientRef !== undefined
        ? clean(patch.clientRef, 80)
        : existing.clientRef,
    site: patch.site !== undefined ? clean(patch.site, 160) : existing.site,
    contactName:
      patch.contactName !== undefined
        ? clean(patch.contactName, 120)
        : existing.contactName,
    contactEmail:
      patch.contactEmail !== undefined
        ? clean(patch.contactEmail, 180).toLowerCase()
        : existing.contactEmail,
    contactPhone:
      patch.contactPhone !== undefined
        ? clean(patch.contactPhone, 40)
        : existing.contactPhone,
    orderDate:
      patch.orderDate !== undefined
        ? clean(patch.orderDate, 10)
        : existing.orderDate,
    startDate:
      patch.startDate !== undefined
        ? clean(patch.startDate, 10)
        : existing.startDate,
    priority: isPurchaseOrderPriority(patch.priority)
      ? patch.priority
      : existing.priority,
    conditions:
      patch.conditions !== undefined
        ? clean(patch.conditions, 4000)
        : existing.conditions,
    note: patch.note !== undefined ? clean(patch.note, 2000) : existing.note,
    quoteRef:
      patch.quoteRef !== undefined
        ? clean(patch.quoteRef, 80)
        : existing.quoteRef,
    lines,
    totalHT: computePurchaseOrderTotal(lines),
    status: existing.status === "refuse" ? "brouillon" : existing.status,
    rejectionReason:
      existing.status === "refuse" ? "" : existing.rejectionReason,
    history: [
      ...existing.history,
      hist(actor, "Brouillon mis à jour"),
    ].slice(-80),
  };

  return save(next);
}

export async function submitPurchaseOrder(
  id: string,
  actor: Actor,
): Promise<PurchaseOrder> {
  const existing = await getPurchaseOrder(id);
  if (!existing) throw new Error("Bon de commande introuvable");
  if (existing.status !== "brouillon" && existing.status !== "refuse") {
    throw new Error("Ce BC ne peut pas être soumis");
  }
  const ready = purchaseOrderReadyToValidate(existing);
  if (!ready.ok) {
    throw new Error(`Incomplet : ${ready.missing.join(", ")}`);
  }
  return save({
    ...existing,
    status: "en_validation",
    rejectionReason: "",
    history: [
      ...existing.history,
      hist(actor, "Soumis pour validation"),
    ].slice(-80),
  });
}

export async function validatePurchaseOrder(
  id: string,
  actor: Actor,
): Promise<PurchaseOrder> {
  const existing = await getPurchaseOrder(id);
  if (!existing) throw new Error("Bon de commande introuvable");
  if (existing.status !== "en_validation") {
    throw new Error("Le BC n’est pas en attente de validation");
  }
  const ready = purchaseOrderReadyToValidate(existing);
  if (!ready.ok) {
    throw new Error(`Incomplet : ${ready.missing.join(", ")}`);
  }
  return save({
    ...existing,
    status: "valide",
    validatedAt: nowIso(),
    validatedBy: actor.userId,
    validatedByName: actor.name,
    rejectionReason: "",
    history: [
      ...existing.history,
      hist(actor, "BC validé"),
    ].slice(-80),
  });
}

export async function rejectPurchaseOrder(
  id: string,
  reason: string,
  actor: Actor,
): Promise<PurchaseOrder> {
  const existing = await getPurchaseOrder(id);
  if (!existing) throw new Error("Bon de commande introuvable");
  if (existing.status !== "en_validation") {
    throw new Error("Le BC n’est pas en attente de validation");
  }
  const rejectionReason = clean(reason, 800) || "Refusé";
  return save({
    ...existing,
    status: "refuse",
    rejectionReason,
    history: [
      ...existing.history,
      hist(actor, `Refusé · ${rejectionReason}`),
    ].slice(-80),
  });
}

export async function transmitPurchaseOrderToOps(
  id: string,
  actor: Actor,
): Promise<PurchaseOrder> {
  const existing = await getPurchaseOrder(id);
  if (!existing) throw new Error("Bon de commande introuvable");
  if (existing.status !== "valide" && existing.status !== "transmis_ops") {
    throw new Error("Validez le BC avant transmission ops");
  }
  return save({
    ...existing,
    status: "transmis_ops",
    transmittedAt: existing.transmittedAt || nowIso(),
    history: [
      ...existing.history,
      hist(actor, "Transmis aux opérations"),
    ].slice(-80),
  });
}

export async function setPurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus,
  actor: Actor,
): Promise<PurchaseOrder> {
  const existing = await getPurchaseOrder(id);
  if (!existing) throw new Error("Bon de commande introuvable");
  if (!isPurchaseOrderStatus(status)) throw new Error("Statut invalide");

  const allowed: Partial<Record<PurchaseOrderStatus, PurchaseOrderStatus[]>> = {
    transmis_ops: ["en_execution", "annule"],
    en_execution: ["cloture", "annule"],
    valide: ["annule", "transmis_ops"],
    brouillon: ["annule"],
    en_validation: ["annule"],
    refuse: ["annule", "brouillon"],
  };
  const from = allowed[existing.status] || [];
  if (!from.includes(status) && status !== existing.status) {
    throw new Error(
      `Transition ${existing.status} → ${status} non autorisée`,
    );
  }

  return save({
    ...existing,
    status,
    history: [
      ...existing.history,
      hist(actor, `Statut → ${status}`),
    ].slice(-80),
  });
}
