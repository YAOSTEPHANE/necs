import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  computeFinanceTotals,
  DEFAULT_NECS_ISSUER,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_QUOTE_CONDITIONS,
  DEFAULT_TAX_RATE,
  expiryFromValidity,
  isFinanceAckChannel,
  isFinanceAckDocType,
  isFinanceAckStatus,
  isFinanceDocStatus,
  isFinancePaymentMethod,
  isFinancePeriodicity,
  isPrefactureStatus,
  isReminderChannel,
  isReminderLevel,
  isReminderStatus,
  makeFinanceLine,
  makePrefactureLine,
  makeReminderInvoiceLine,
  roundMoney,
  type FinanceAck,
  type FinanceAckChannel,
  type FinanceAckDocType,
  type FinanceAckStatus,
  type FinanceCreditNote,
  type FinanceDocStatus,
  type FinanceHistoryEntry,
  type FinanceInvoice,
  type FinanceLine,
  type FinancePayment,
  type FinancePaymentMethod,
  type FinancePeriodicity,
  type FinancePrefacture,
  type FinanceQuote,
  type FinanceReminder,
  type FinanceStatement,
  type NecsIssuer,
  type PrefactureLine,
  type PrefactureStatus,
  type ReminderChannel,
  type ReminderHistoryEntry,
  type ReminderInvoiceLine,
  type ReminderLevel,
  type ReminderStatus,
  type StatementDueItem,
  type StatementMovement,
  DEFAULT_REMINDER_BODY,
  DEFAULT_REMINDER_SUBJECT,
} from "@/lib/finance-shared";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string): FinanceHistoryEntry {
  return {
    id: `FH-${randomUUID().slice(0, 8).toUpperCase()}`,
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

function normalizeLine(
  raw: Partial<FinanceLine> | Record<string, unknown>,
): FinanceLine {
  return makeFinanceLine({
    id: clean(raw.id, 40) || undefined,
    label: clean(raw.label, 240) || "Prestation",
    quantity: Number(raw.quantity) || 0,
    unit: clean(raw.unit, 40) || "u",
    unitPrice: Number(raw.unitPrice) || 0,
  });
}

function normalizeIssuer(raw: unknown): NecsIssuer {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    legalName: clean(r.legalName, 200) || DEFAULT_NECS_ISSUER.legalName,
    tradeName: clean(r.tradeName, 80) || DEFAULT_NECS_ISSUER.tradeName,
    address: clean(r.address, 240) || DEFAULT_NECS_ISSUER.address,
    phone: clean(r.phone, 40) || DEFAULT_NECS_ISSUER.phone,
    email: clean(r.email, 120) || DEFAULT_NECS_ISSUER.email,
    rccm: clean(r.rccm, 80) || DEFAULT_NECS_ISSUER.rccm,
    niu: clean(r.niu, 80) || DEFAULT_NECS_ISSUER.niu,
    bankRefs: clean(r.bankRefs, 400) || DEFAULT_NECS_ISSUER.bankRefs,
  };
}

async function quotesCol() {
  const db = await getDb();
  const c = db.collection<FinanceQuote>("fin_quotes");
  void Promise.all([
    c.createIndex({ number: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

async function invoicesCol() {
  const db = await getDb();
  const c = db.collection<FinanceInvoice>("fin_invoices");
  void Promise.all([
    c.createIndex({ number: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ contractRef: 1 }).catch(() => undefined),
  ]);
  return c;
}

async function creditsCol() {
  const db = await getDb();
  const c = db.collection<FinanceCreditNote>("fin_credit_notes");
  void Promise.all([
    c.createIndex({ number: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ invoiceId: 1 }).catch(() => undefined),
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

function yearPrefix() {
  return String(new Date().getFullYear());
}

async function paymentsCol() {
  const db = await getDb();
  const c = db.collection<FinancePayment>("fin_payments");
  void Promise.all([
    c.createIndex({ number: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ clientName: 1, paidAt: -1 }).catch(() => undefined),
    c.createIndex({ invoiceId: 1 }).catch(() => undefined),
  ]);
  return c;
}

async function statementsCol() {
  const db = await getDb();
  const c = db.collection<FinanceStatement>("fin_statements");
  void Promise.all([
    c.createIndex({ number: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ clientName: 1, generatedAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

async function acksCol() {
  const db = await getDb();
  const c = db.collection<FinanceAck>("fin_acks");
  void Promise.all([
    c.createIndex({ number: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ status: 1, transmittedAt: -1 }).catch(() => undefined),
    c.createIndex({ documentNumber: 1 }).catch(() => undefined),
  ]);
  return c;
}

async function prefacturesCol() {
  const db = await getDb();
  const c = db.collection<FinancePrefacture>("fin_prefactures");
  void Promise.all([
    c.createIndex({ number: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ contractRef: 1 }).catch(() => undefined),
    c.createIndex({ clientName: 1, periodStart: -1 }).catch(() => undefined),
  ]);
  return c;
}

async function remindersCol() {
  const db = await getDb();
  const c = db.collection<FinanceReminder>("fin_reminders");
  void Promise.all([
    c.createIndex({ number: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ clientName: 1, sentAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

async function nextNumber(
  kind: "DEV" | "FAC" | "AVO" | "REG" | "REL" | "ACK" | "PF" | "RLC",
  count: number,
): Promise<string> {
  return `NECS-${kind}-${yearPrefix()}-${String(count + 1).padStart(4, "0")}`;
}

function coerceQuote(raw: Record<string, unknown>): FinanceQuote {
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map((l) => normalizeLine(l as Partial<FinanceLine>))
    : [];
  const taxRatePct = Math.max(0, Number(raw.taxRatePct) || DEFAULT_TAX_RATE);
  const totals = computeFinanceTotals(lines, taxRatePct);
  const issueDate = clean(raw.issueDate, 10);
  const validityDays = Math.max(1, Math.round(Number(raw.validityDays) || 30));
  return {
    id: clean(raw.id, 40) || `FQ-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: clean(raw.number, 40) || "NECS-DEV-0000",
    status: isFinanceDocStatus(raw.status) ? raw.status : "brouillon",
    clientName: clean(raw.clientName, 180),
    site: clean(raw.site, 160),
    contactName: clean(raw.contactName, 120),
    contactEmail: clean(raw.contactEmail, 180).toLowerCase(),
    issueDate,
    validityDays,
    expiresAt:
      typeof raw.expiresAt === "string" && raw.expiresAt
        ? raw.expiresAt
        : expiryFromValidity(issueDate, validityDays),
    periodicity: isFinancePeriodicity(raw.periodicity)
      ? raw.periodicity
      : "mensuel",
    taxRatePct,
    paymentTerms: clean(raw.paymentTerms, 2000) || DEFAULT_PAYMENT_TERMS,
    conditions: clean(raw.conditions, 4000) || DEFAULT_QUOTE_CONDITIONS,
    lines,
    ...totals,
    note: clean(raw.note, 2000),
    history: Array.isArray(raw.history)
      ? (raw.history as FinanceHistoryEntry[])
      : [],
    createdAt: clean(raw.createdAt, 40) || nowIso(),
    updatedAt: clean(raw.updatedAt, 40) || nowIso(),
    createdBy: clean(raw.createdBy, 80),
    createdByName: clean(raw.createdByName, 120),
    ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
    ownerName: clean(raw.ownerName, 120),
  };
}

function coerceInvoice(raw: Record<string, unknown>): FinanceInvoice {
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map((l) => normalizeLine(l as Partial<FinanceLine>))
    : [];
  const taxRatePct = Math.max(0, Number(raw.taxRatePct) || DEFAULT_TAX_RATE);
  const totals = computeFinanceTotals(lines, taxRatePct);
  return {
    id: clean(raw.id, 40) || `FI-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: clean(raw.number, 40) || "NECS-FAC-0000",
    status: isFinanceDocStatus(raw.status) ? raw.status : "brouillon",
    issuer: normalizeIssuer(raw.issuer),
    clientName: clean(raw.clientName, 180),
    site: clean(raw.site, 160),
    contactName: clean(raw.contactName, 120),
    contactEmail: clean(raw.contactEmail, 180).toLowerCase(),
    contractRef: clean(raw.contractRef, 80),
    periodStart: clean(raw.periodStart, 10),
    periodEnd: clean(raw.periodEnd, 10),
    issueDate: clean(raw.issueDate, 10),
    dueDate: clean(raw.dueDate, 10),
    taxRatePct,
    paymentTerms: clean(raw.paymentTerms, 2000) || DEFAULT_PAYMENT_TERMS,
    paymentRefs: clean(raw.paymentRefs, 800),
    lines,
    ...totals,
    quoteId: clean(raw.quoteId, 40),
    quoteNumber: clean(raw.quoteNumber, 40),
    note: clean(raw.note, 2000),
    history: Array.isArray(raw.history)
      ? (raw.history as FinanceHistoryEntry[])
      : [],
    createdAt: clean(raw.createdAt, 40) || nowIso(),
    updatedAt: clean(raw.updatedAt, 40) || nowIso(),
    createdBy: clean(raw.createdBy, 80),
    createdByName: clean(raw.createdByName, 120),
    ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
    ownerName: clean(raw.ownerName, 120),
  };
}

function coerceCredit(raw: Record<string, unknown>): FinanceCreditNote {
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map((l) => normalizeLine(l as Partial<FinanceLine>))
    : [];
  const taxRatePct = Math.max(0, Number(raw.taxRatePct) || DEFAULT_TAX_RATE);
  const totals = computeFinanceTotals(lines, taxRatePct);
  return {
    id: clean(raw.id, 40) || `FC-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: clean(raw.number, 40) || "NECS-AVO-0000",
    status: isFinanceDocStatus(raw.status) ? raw.status : "brouillon",
    invoiceId: clean(raw.invoiceId, 40),
    invoiceNumber: clean(raw.invoiceNumber, 40),
    clientName: clean(raw.clientName, 180),
    reason: clean(raw.reason, 2000),
    issueDate: clean(raw.issueDate, 10),
    taxRatePct,
    lines,
    ...totals,
    validatedAt:
      typeof raw.validatedAt === "string" && raw.validatedAt
        ? raw.validatedAt
        : null,
    validatedBy: clean(raw.validatedBy, 80),
    validatedByName: clean(raw.validatedByName, 120),
    note: clean(raw.note, 2000),
    history: Array.isArray(raw.history)
      ? (raw.history as FinanceHistoryEntry[])
      : [],
    createdAt: clean(raw.createdAt, 40) || nowIso(),
    updatedAt: clean(raw.updatedAt, 40) || nowIso(),
    createdBy: clean(raw.createdBy, 80),
    createdByName: clean(raw.createdByName, 120),
    ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
    ownerName: clean(raw.ownerName, 120),
  };
}

async function ensureFinanceSeed(actor: Actor): Promise<void> {
  const qc = await quotesCol();
  const ic = await invoicesCol();
  const ac = await creditsCol();
  const [qCount, iCount, aCount] = await Promise.all([
    qc.countDocuments(),
    ic.countDocuments(),
    ac.countDocuments(),
  ]);
  if (qCount > 0 || iCount > 0 || aCount > 0) return;

  const now = Date.now();
  const day = (o: number) =>
    new Date(now + o * 86_400_000).toISOString().slice(0, 10);
  const lines = [
    makeFinanceLine({
      label: "Entretien quotidien bureaux & circulations",
      quantity: 1,
      unit: "mois",
      unitPrice: 550_000,
    }),
    makeFinanceLine({
      label: "Consommables standards",
      quantity: 1,
      unit: "forfait",
      unitPrice: 75_000,
    }),
  ];
  const qTotals = computeFinanceTotals(lines, DEFAULT_TAX_RATE);
  const quoteId = `FQ-${randomUUID().slice(0, 8).toUpperCase()}`;
  const invoiceId = `FI-${randomUUID().slice(0, 8).toUpperCase()}`;

  const quote: FinanceQuote = {
    id: quoteId,
    number: `NECS-DEV-${yearPrefix()}-0001`,
    status: "envoye",
    clientName: "Société Horizon SA",
    site: "Immeuble Horizon — Akwa",
    contactName: "Aïcha Nkomo",
    contactEmail: "a.nkomo@horizon.cm",
    issueDate: day(-20),
    validityDays: 30,
    expiresAt: day(10),
    periodicity: "mensuel",
    taxRatePct: DEFAULT_TAX_RATE,
    paymentTerms: DEFAULT_PAYMENT_TERMS,
    conditions: DEFAULT_QUOTE_CONDITIONS,
    lines,
    ...qTotals,
    note: "Devis démo Finance",
    history: [hist(actor, "Devis démo créé")],
    createdAt: new Date(now - 20 * 86_400_000).toISOString(),
    updatedAt: new Date(now - 18 * 86_400_000).toISOString(),
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };

  const invLines = [
    makeFinanceLine({
      label: "Entretien quotidien — Mars 2026",
      quantity: 1,
      unit: "mois",
      unitPrice: 550_000,
    }),
    makeFinanceLine({
      label: "Consommables — Mars 2026",
      quantity: 1,
      unit: "forfait",
      unitPrice: 75_000,
    }),
  ];
  const iTotals = computeFinanceTotals(invLines, DEFAULT_TAX_RATE);
  const invoice: FinanceInvoice = {
    id: invoiceId,
    number: `NECS-FAC-${yearPrefix()}-0001`,
    status: "envoye",
    issuer: { ...DEFAULT_NECS_ISSUER },
    clientName: "Société Horizon SA",
    site: "Immeuble Horizon — Akwa",
    contactName: "Aïcha Nkomo",
    contactEmail: "a.nkomo@horizon.cm",
    contractRef: "NECS-CTR-2026-0034",
    periodStart: day(-35),
    periodEnd: day(-5),
    issueDate: day(-3),
    dueDate: day(27),
    taxRatePct: DEFAULT_TAX_RATE,
    paymentTerms: DEFAULT_PAYMENT_TERMS,
    paymentRefs: `NECS-FAC-${yearPrefix()}-0001 · Virement NECS`,
    lines: invLines,
    ...iTotals,
    quoteId,
    quoteNumber: quote.number,
    note: "Facture démo Finance",
    history: [hist(actor, "Facture démo émise")],
    createdAt: new Date(now - 3 * 86_400_000).toISOString(),
    updatedAt: new Date(now - 3 * 86_400_000).toISOString(),
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };

  const creditLines = [
    makeFinanceLine({
      label: "Ajustement prestation J21 non réalisée",
      quantity: 1,
      unit: "j",
      unitPrice: 25_000,
    }),
  ];
  const cTotals = computeFinanceTotals(creditLines, DEFAULT_TAX_RATE);
  const credit: FinanceCreditNote = {
    id: `FC-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: `NECS-AVO-${yearPrefix()}-0001`,
    status: "valide",
    invoiceId,
    invoiceNumber: invoice.number,
    clientName: invoice.clientName,
    reason: "Journée non réalisée suite fermeture site client",
    issueDate: day(-1),
    taxRatePct: DEFAULT_TAX_RATE,
    lines: creditLines,
    ...cTotals,
    validatedAt: new Date(now - 86_400_000).toISOString(),
    validatedBy: actor.userId,
    validatedByName: actor.name,
    note: "Avoir démo",
    history: [
      hist(actor, "Avoir démo créé"),
      hist(actor, "Avoir validé"),
    ],
    createdAt: new Date(now - 2 * 86_400_000).toISOString(),
    updatedAt: new Date(now - 86_400_000).toISOString(),
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };

  await qc.insertOne(quote);
  await ic.insertOne(invoice);
  await ac.insertOne(credit);

  const pc = await paymentsCol();
  const kc = await acksCol();
  const payment: FinancePayment = {
    id: `FP-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: `NECS-REG-${yearPrefix()}-0001`,
    clientName: invoice.clientName,
    invoiceId,
    invoiceNumber: invoice.number,
    amount: roundMoney(iTotals.totalTTC * 0.4),
    paidAt: day(-1),
    method: "virement",
    reference: "VIR-HORIZON-001",
    note: "Acompte démo",
    history: [hist(actor, "Règlement démo enregistré")],
    createdAt: new Date(now - 86_400_000).toISOString(),
    updatedAt: new Date(now - 86_400_000).toISOString(),
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  await pc.insertOne(payment);

  const ack: FinanceAck = {
    id: `FA-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: `NECS-ACK-${yearPrefix()}-0001`,
    documentType: "facture",
    documentId: invoiceId,
    documentNumber: invoice.number,
    documentLabel: `Facture ${invoice.number}`,
    recipientName: invoice.contactName,
    recipientEmail: invoice.contactEmail,
    recipientOrg: invoice.clientName,
    channel: "email",
    transmittedAt: new Date(now - 2 * 86_400_000).toISOString(),
    status: "transmis",
    proofNote: "E-mail envoyé avec PDF joint — accusés de lecture désactivés côté client",
    note: "Preuve démo",
    history: [hist(actor, "Accusé démo créé · transmis")],
    createdAt: new Date(now - 2 * 86_400_000).toISOString(),
    updatedAt: new Date(now - 2 * 86_400_000).toISOString(),
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  await kc.insertOne(ack);
}

/* ——— Devis ——— */

export async function listFinanceQuotes(
  actor: Actor,
): Promise<FinanceQuote[]> {
  const c = await quotesCol();
  await ensureFinanceSeed(actor);
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) => coerceQuote(stripMongo(r) as Record<string, unknown>));
}

export async function getFinanceQuote(
  id: string,
): Promise<FinanceQuote | null> {
  const c = await quotesCol();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerceQuote(stripMongo(row) as Record<string, unknown>);
}

export type FinanceQuoteInput = {
  clientName: string;
  site?: string;
  contactName?: string;
  contactEmail?: string;
  issueDate?: string;
  validityDays?: number;
  periodicity?: FinancePeriodicity | "";
  taxRatePct?: number;
  paymentTerms?: string;
  conditions?: string;
  note?: string;
  lines?: Array<Partial<FinanceLine>>;
};

export async function createFinanceQuote(
  input: FinanceQuoteInput,
  actor: Actor,
): Promise<FinanceQuote> {
  const clientName = clean(input.clientName, 180);
  if (!clientName) throw new Error("Client requis");
  const c = await quotesCol();
  const count = await c.countDocuments();
  const lines = (input.lines || []).map((l) => normalizeLine(l));
  if (lines.length === 0) {
    lines.push(
      makeFinanceLine({
        label: "Prestation à préciser",
        quantity: 1,
        unit: "u",
        unitPrice: 0,
      }),
    );
  }
  const taxRatePct = Math.max(
    0,
    Number(input.taxRatePct ?? DEFAULT_TAX_RATE) || DEFAULT_TAX_RATE,
  );
  const issueDate = clean(input.issueDate, 10) || nowIso().slice(0, 10);
  const validityDays = Math.max(
    1,
    Math.round(Number(input.validityDays) || 30),
  );
  const totals = computeFinanceTotals(lines, taxRatePct);
  const now = nowIso();
  const doc: FinanceQuote = {
    id: `FQ-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: await nextNumber("DEV", count),
    status: "brouillon",
    clientName,
    site: clean(input.site, 160),
    contactName: clean(input.contactName, 120),
    contactEmail: clean(input.contactEmail, 180).toLowerCase(),
    issueDate,
    validityDays,
    expiresAt: expiryFromValidity(issueDate, validityDays),
    periodicity: isFinancePeriodicity(input.periodicity)
      ? input.periodicity
      : "mensuel",
    taxRatePct,
    paymentTerms: clean(input.paymentTerms, 2000) || DEFAULT_PAYMENT_TERMS,
    conditions: clean(input.conditions, 4000) || DEFAULT_QUOTE_CONDITIONS,
    lines,
    ...totals,
    note: clean(input.note, 2000),
    history: [hist(actor, `Devis créé · ${clientName}`)],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  await c.insertOne(doc);
  return doc;
}

export async function updateFinanceQuote(
  id: string,
  patch: Partial<FinanceQuoteInput> & { status?: FinanceDocStatus },
  actor: Actor,
): Promise<FinanceQuote> {
  const existing = await getFinanceQuote(id);
  if (!existing) throw new Error("Devis introuvable");
  if (existing.status === "annule" || existing.status === "paye") {
    throw new Error("Ce devis ne peut plus être modifié");
  }
  const lines = Array.isArray(patch.lines)
    ? patch.lines.map((l) => normalizeLine(l))
    : existing.lines;
  const taxRatePct =
    patch.taxRatePct !== undefined
      ? Math.max(0, Number(patch.taxRatePct) || 0)
      : existing.taxRatePct;
  const issueDate =
    patch.issueDate !== undefined
      ? clean(patch.issueDate, 10)
      : existing.issueDate;
  const validityDays =
    patch.validityDays !== undefined
      ? Math.max(1, Math.round(Number(patch.validityDays) || 30))
      : existing.validityDays;
  const totals = computeFinanceTotals(lines, taxRatePct);
  const next: FinanceQuote = {
    ...existing,
    clientName:
      patch.clientName !== undefined
        ? clean(patch.clientName, 180) || existing.clientName
        : existing.clientName,
    site: patch.site !== undefined ? clean(patch.site, 160) : existing.site,
    contactName:
      patch.contactName !== undefined
        ? clean(patch.contactName, 120)
        : existing.contactName,
    contactEmail:
      patch.contactEmail !== undefined
        ? clean(patch.contactEmail, 180).toLowerCase()
        : existing.contactEmail,
    issueDate,
    validityDays,
    expiresAt: expiryFromValidity(issueDate, validityDays),
    periodicity: isFinancePeriodicity(patch.periodicity)
      ? patch.periodicity
      : existing.periodicity,
    taxRatePct,
    paymentTerms:
      patch.paymentTerms !== undefined
        ? clean(patch.paymentTerms, 2000) || DEFAULT_PAYMENT_TERMS
        : existing.paymentTerms,
    conditions:
      patch.conditions !== undefined
        ? clean(patch.conditions, 4000) || DEFAULT_QUOTE_CONDITIONS
        : existing.conditions,
    note: patch.note !== undefined ? clean(patch.note, 2000) : existing.note,
    lines,
    ...totals,
    status: isFinanceDocStatus(patch.status) ? patch.status : existing.status,
    updatedAt: nowIso(),
    history: [...existing.history, hist(actor, "Devis mis à jour")].slice(-80),
  };
  const c = await quotesCol();
  await c.replaceOne({ id }, next);
  return next;
}

export async function setFinanceQuoteStatus(
  id: string,
  status: FinanceDocStatus,
  actor: Actor,
): Promise<FinanceQuote> {
  return updateFinanceQuote(id, { status }, actor);
}

/* ——— Factures ——— */

export async function listFinanceInvoices(
  actor: Actor,
): Promise<FinanceInvoice[]> {
  const c = await invoicesCol();
  await ensureFinanceSeed(actor);
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) =>
    coerceInvoice(stripMongo(r) as Record<string, unknown>),
  );
}

export async function getFinanceInvoice(
  id: string,
): Promise<FinanceInvoice | null> {
  const c = await invoicesCol();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerceInvoice(stripMongo(row) as Record<string, unknown>);
}

export type FinanceInvoiceInput = {
  clientName: string;
  site?: string;
  contactName?: string;
  contactEmail?: string;
  contractRef?: string;
  periodStart?: string;
  periodEnd?: string;
  issueDate?: string;
  dueDate?: string;
  taxRatePct?: number;
  paymentTerms?: string;
  paymentRefs?: string;
  quoteId?: string;
  quoteNumber?: string;
  issuer?: Partial<NecsIssuer>;
  note?: string;
  lines?: Array<Partial<FinanceLine>>;
};

export async function createFinanceInvoice(
  input: FinanceInvoiceInput,
  actor: Actor,
): Promise<FinanceInvoice> {
  const clientName = clean(input.clientName, 180);
  if (!clientName) throw new Error("Client requis");
  const c = await invoicesCol();
  const count = await c.countDocuments();
  const lines = (input.lines || []).map((l) => normalizeLine(l));
  if (lines.length === 0) {
    lines.push(
      makeFinanceLine({
        label: "Prestation à facturer",
        quantity: 1,
        unit: "mois",
        unitPrice: 0,
      }),
    );
  }
  const taxRatePct = Math.max(
    0,
    Number(input.taxRatePct ?? DEFAULT_TAX_RATE) || DEFAULT_TAX_RATE,
  );
  const totals = computeFinanceTotals(lines, taxRatePct);
  const issueDate = clean(input.issueDate, 10) || nowIso().slice(0, 10);
  const due =
    clean(input.dueDate, 10) ||
    (() => {
      const d = new Date(`${issueDate}T12:00:00`);
      d.setDate(d.getDate() + 30);
      return d.toISOString().slice(0, 10);
    })();
  const number = await nextNumber("FAC", count);
  const now = nowIso();
  const doc: FinanceInvoice = {
    id: `FI-${randomUUID().slice(0, 8).toUpperCase()}`,
    number,
    status: "brouillon",
    issuer: normalizeIssuer({ ...DEFAULT_NECS_ISSUER, ...input.issuer }),
    clientName,
    site: clean(input.site, 160),
    contactName: clean(input.contactName, 120),
    contactEmail: clean(input.contactEmail, 180).toLowerCase(),
    contractRef: clean(input.contractRef, 80),
    periodStart: clean(input.periodStart, 10),
    periodEnd: clean(input.periodEnd, 10),
    issueDate,
    dueDate: due,
    taxRatePct,
    paymentTerms: clean(input.paymentTerms, 2000) || DEFAULT_PAYMENT_TERMS,
    paymentRefs:
      clean(input.paymentRefs, 800) || `${number} · Virement NECS`,
    lines,
    ...totals,
    quoteId: clean(input.quoteId, 40),
    quoteNumber: clean(input.quoteNumber, 40),
    note: clean(input.note, 2000),
    history: [hist(actor, `Facture créée · ${clientName}`)],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  await c.insertOne(doc);
  return doc;
}

export async function updateFinanceInvoice(
  id: string,
  patch: Partial<FinanceInvoiceInput> & { status?: FinanceDocStatus },
  actor: Actor,
): Promise<FinanceInvoice> {
  const existing = await getFinanceInvoice(id);
  if (!existing) throw new Error("Facture introuvable");
  if (existing.status === "annule" || existing.status === "paye") {
    throw new Error("Cette facture ne peut plus être modifiée");
  }
  const lines = Array.isArray(patch.lines)
    ? patch.lines.map((l) => normalizeLine(l))
    : existing.lines;
  const taxRatePct =
    patch.taxRatePct !== undefined
      ? Math.max(0, Number(patch.taxRatePct) || 0)
      : existing.taxRatePct;
  const totals = computeFinanceTotals(lines, taxRatePct);
  const next: FinanceInvoice = {
    ...existing,
    issuer: patch.issuer
      ? normalizeIssuer({ ...existing.issuer, ...patch.issuer })
      : existing.issuer,
    clientName:
      patch.clientName !== undefined
        ? clean(patch.clientName, 180) || existing.clientName
        : existing.clientName,
    site: patch.site !== undefined ? clean(patch.site, 160) : existing.site,
    contactName:
      patch.contactName !== undefined
        ? clean(patch.contactName, 120)
        : existing.contactName,
    contactEmail:
      patch.contactEmail !== undefined
        ? clean(patch.contactEmail, 180).toLowerCase()
        : existing.contactEmail,
    contractRef:
      patch.contractRef !== undefined
        ? clean(patch.contractRef, 80)
        : existing.contractRef,
    periodStart:
      patch.periodStart !== undefined
        ? clean(patch.periodStart, 10)
        : existing.periodStart,
    periodEnd:
      patch.periodEnd !== undefined
        ? clean(patch.periodEnd, 10)
        : existing.periodEnd,
    issueDate:
      patch.issueDate !== undefined
        ? clean(patch.issueDate, 10)
        : existing.issueDate,
    dueDate:
      patch.dueDate !== undefined
        ? clean(patch.dueDate, 10)
        : existing.dueDate,
    taxRatePct,
    paymentTerms:
      patch.paymentTerms !== undefined
        ? clean(patch.paymentTerms, 2000) || DEFAULT_PAYMENT_TERMS
        : existing.paymentTerms,
    paymentRefs:
      patch.paymentRefs !== undefined
        ? clean(patch.paymentRefs, 800)
        : existing.paymentRefs,
    quoteId:
      patch.quoteId !== undefined
        ? clean(patch.quoteId, 40)
        : existing.quoteId,
    quoteNumber:
      patch.quoteNumber !== undefined
        ? clean(patch.quoteNumber, 40)
        : existing.quoteNumber,
    note: patch.note !== undefined ? clean(patch.note, 2000) : existing.note,
    lines,
    ...totals,
    status: isFinanceDocStatus(patch.status) ? patch.status : existing.status,
    updatedAt: nowIso(),
    history: [
      ...existing.history,
      hist(actor, "Facture mise à jour"),
    ].slice(-80),
  };
  const c = await invoicesCol();
  await c.replaceOne({ id }, next);
  return next;
}

/* ——— Avoirs ——— */

export async function listFinanceCreditNotes(
  actor: Actor,
): Promise<FinanceCreditNote[]> {
  const c = await creditsCol();
  await ensureFinanceSeed(actor);
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) =>
    coerceCredit(stripMongo(r) as Record<string, unknown>),
  );
}

export async function getFinanceCreditNote(
  id: string,
): Promise<FinanceCreditNote | null> {
  const c = await creditsCol();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerceCredit(stripMongo(row) as Record<string, unknown>);
}

export type FinanceCreditInput = {
  invoiceId?: string;
  invoiceNumber?: string;
  clientName?: string;
  reason: string;
  issueDate?: string;
  taxRatePct?: number;
  note?: string;
  lines?: Array<Partial<FinanceLine>>;
};

export async function createFinanceCreditNote(
  input: FinanceCreditInput,
  actor: Actor,
): Promise<FinanceCreditNote> {
  const reason = clean(input.reason, 2000);
  if (!reason) throw new Error("Motif requis");
  let invoiceId = clean(input.invoiceId, 40);
  let invoiceNumber = clean(input.invoiceNumber, 40);
  let clientName = clean(input.clientName, 180);
  if (invoiceId) {
    const inv = await getFinanceInvoice(invoiceId);
    if (!inv) throw new Error("Facture initiale introuvable");
    invoiceNumber = inv.number;
    clientName = clientName || inv.clientName;
  }
  if (!invoiceNumber) throw new Error("Référence facture initiale requise");

  const c = await creditsCol();
  const count = await c.countDocuments();
  const lines = (input.lines || []).map((l) => normalizeLine(l));
  if (lines.length === 0) {
    lines.push(
      makeFinanceLine({
        label: "Ligne d’avoir",
        quantity: 1,
        unit: "u",
        unitPrice: 0,
      }),
    );
  }
  const taxRatePct = Math.max(
    0,
    Number(input.taxRatePct ?? DEFAULT_TAX_RATE) || DEFAULT_TAX_RATE,
  );
  const totals = computeFinanceTotals(lines, taxRatePct);
  const now = nowIso();
  const doc: FinanceCreditNote = {
    id: `FC-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: await nextNumber("AVO", count),
    status: "brouillon",
    invoiceId,
    invoiceNumber,
    clientName: clientName || "Client",
    reason,
    issueDate: clean(input.issueDate, 10) || now.slice(0, 10),
    taxRatePct,
    lines,
    ...totals,
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    note: clean(input.note, 2000),
    history: [hist(actor, `Avoir créé · facture ${invoiceNumber}`)],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  await c.insertOne(doc);
  return doc;
}

export async function updateFinanceCreditNote(
  id: string,
  patch: Partial<FinanceCreditInput> & { status?: FinanceDocStatus },
  actor: Actor,
): Promise<FinanceCreditNote> {
  const existing = await getFinanceCreditNote(id);
  if (!existing) throw new Error("Avoir introuvable");
  if (existing.status === "annule") {
    throw new Error("Cet avoir ne peut plus être modifié");
  }
  const lines = Array.isArray(patch.lines)
    ? patch.lines.map((l) => normalizeLine(l))
    : existing.lines;
  const taxRatePct =
    patch.taxRatePct !== undefined
      ? Math.max(0, Number(patch.taxRatePct) || 0)
      : existing.taxRatePct;
  const totals = computeFinanceTotals(lines, taxRatePct);
  let status = isFinanceDocStatus(patch.status)
    ? patch.status
    : existing.status;
  let validatedAt = existing.validatedAt;
  let validatedBy = existing.validatedBy;
  let validatedByName = existing.validatedByName;
  const histExtra: FinanceHistoryEntry[] = [
    hist(actor, "Avoir mis à jour"),
  ];
  if (status === "valide" && existing.status !== "valide") {
    validatedAt = nowIso();
    validatedBy = actor.userId;
    validatedByName = actor.name;
    histExtra.push(hist(actor, "Avoir validé"));
  }
  const next: FinanceCreditNote = {
    ...existing,
    invoiceId:
      patch.invoiceId !== undefined
        ? clean(patch.invoiceId, 40)
        : existing.invoiceId,
    invoiceNumber:
      patch.invoiceNumber !== undefined
        ? clean(patch.invoiceNumber, 40)
        : existing.invoiceNumber,
    clientName:
      patch.clientName !== undefined
        ? clean(patch.clientName, 180) || existing.clientName
        : existing.clientName,
    reason:
      patch.reason !== undefined
        ? clean(patch.reason, 2000) || existing.reason
        : existing.reason,
    issueDate:
      patch.issueDate !== undefined
        ? clean(patch.issueDate, 10)
        : existing.issueDate,
    taxRatePct,
    note: patch.note !== undefined ? clean(patch.note, 2000) : existing.note,
    lines,
    ...totals,
    status,
    validatedAt,
    validatedBy,
    validatedByName,
    updatedAt: nowIso(),
    history: [...existing.history, ...histExtra].slice(-80),
  };
  const c = await creditsCol();
  await c.replaceOne({ id }, next);
  return next;
}

/* ——— Règlements ——— */

function coercePayment(raw: Record<string, unknown>): FinancePayment {
  return {
    id: clean(raw.id, 40) || `FP-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: clean(raw.number, 40) || "NECS-REG-0000",
    clientName: clean(raw.clientName, 180),
    invoiceId: clean(raw.invoiceId, 40),
    invoiceNumber: clean(raw.invoiceNumber, 40),
    amount: roundMoney(Math.max(0, Number(raw.amount) || 0)),
    paidAt: clean(raw.paidAt, 10),
    method: isFinancePaymentMethod(raw.method) ? raw.method : "virement",
    reference: clean(raw.reference, 120),
    note: clean(raw.note, 2000),
    history: Array.isArray(raw.history)
      ? (raw.history as FinanceHistoryEntry[])
      : [],
    createdAt: clean(raw.createdAt, 40) || nowIso(),
    updatedAt: clean(raw.updatedAt, 40) || nowIso(),
    createdBy: clean(raw.createdBy, 80),
    createdByName: clean(raw.createdByName, 120),
    ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
    ownerName: clean(raw.ownerName, 120),
  };
}

export async function listFinancePayments(
  actor: Actor,
  clientName?: string,
): Promise<FinancePayment[]> {
  const c = await paymentsCol();
  await ensureFinanceSeed(actor);
  const filter = clientName?.trim()
    ? { clientName: clientName.trim() }
    : {};
  const rows = await c
    .find(filter)
    .sort({ paidAt: -1, updatedAt: -1 })
    .limit(400)
    .toArray();
  return rows.map((r) =>
    coercePayment(stripMongo(r) as Record<string, unknown>),
  );
}

export type FinancePaymentInput = {
  clientName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  paidAt?: string;
  method?: FinancePaymentMethod | "";
  reference?: string;
  note?: string;
};

export async function createFinancePayment(
  input: FinancePaymentInput,
  actor: Actor,
): Promise<FinancePayment> {
  let clientName = clean(input.clientName, 180);
  let invoiceId = clean(input.invoiceId, 40);
  let invoiceNumber = clean(input.invoiceNumber, 40);
  if (invoiceId) {
    const inv = await getFinanceInvoice(invoiceId);
    if (!inv) throw new Error("Facture liée introuvable");
    invoiceNumber = inv.number;
    clientName = clientName || inv.clientName;
  }
  if (!clientName) throw new Error("Client requis");
  const amount = roundMoney(Math.max(0, Number(input.amount) || 0));
  if (amount <= 0) throw new Error("Montant de règlement requis");

  const c = await paymentsCol();
  const count = await c.countDocuments();
  const now = nowIso();
  const doc: FinancePayment = {
    id: `FP-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: await nextNumber("REG", count),
    clientName,
    invoiceId,
    invoiceNumber,
    amount,
    paidAt: clean(input.paidAt, 10) || now.slice(0, 10),
    method: isFinancePaymentMethod(input.method) ? input.method : "virement",
    reference: clean(input.reference, 120),
    note: clean(input.note, 2000),
    history: [
      hist(
        actor,
        `Règlement ${amount.toLocaleString("fr-FR")} FCFA · ${clientName}`,
      ),
    ],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  await c.insertOne(doc);
  return doc;
}

/* ——— Relevés de compte ——— */

function clientKey(name: string) {
  return name.trim().toLowerCase();
}

export async function listFinanceClientNames(actor: Actor): Promise<string[]> {
  await ensureFinanceSeed(actor);
  const [invoices, credits, payments] = await Promise.all([
    listFinanceInvoices(actor),
    listFinanceCreditNotes(actor),
    listFinancePayments(actor),
  ]);
  const set = new Set<string>();
  for (const i of invoices) if (i.clientName.trim()) set.add(i.clientName.trim());
  for (const c of credits) if (c.clientName.trim()) set.add(c.clientName.trim());
  for (const p of payments) if (p.clientName.trim()) set.add(p.clientName.trim());
  return [...set].sort((a, b) => a.localeCompare(b, "fr"));
}

export async function buildClientStatement(
  clientName: string,
  periodStart: string,
  periodEnd: string,
  actor: Actor,
): Promise<Omit<FinanceStatement, "id" | "number" | "history" | "createdAt" | "updatedAt" | "createdBy" | "createdByName" | "ownerEmail" | "ownerName" | "note" | "generatedAt"> & { generatedAt: string }> {
  const name = clean(clientName, 180);
  if (!name) throw new Error("Client requis");
  const start = clean(periodStart, 10);
  const end = clean(periodEnd, 10);
  if (!start || !end) throw new Error("Période requise");
  if (start > end) throw new Error("Période invalide");

  const [invoices, credits, payments] = await Promise.all([
    listFinanceInvoices(actor),
    listFinanceCreditNotes(actor),
    listFinancePayments(actor, name),
  ]);

  const matchClient = (n: string) => clientKey(n) === clientKey(name);
  const inPeriod = (d: string) => d >= start && d <= end;
  const beforePeriod = (d: string) => d && d < start;

  const clientInvoices = invoices.filter((i) => matchClient(i.clientName));
  const clientCredits = credits.filter((c) => matchClient(c.clientName));
  const clientPayments = payments.filter((p) => matchClient(p.clientName));

  let opening = 0;
  for (const inv of clientInvoices) {
    if (inv.status === "annule") continue;
    if (beforePeriod(inv.issueDate)) opening += inv.totalTTC;
  }
  for (const cr of clientCredits) {
    if (cr.status === "annule") continue;
    if (beforePeriod(cr.issueDate)) opening -= cr.totalTTC;
  }
  for (const pay of clientPayments) {
    if (beforePeriod(pay.paidAt)) opening -= pay.amount;
  }
  opening = roundMoney(opening);

  type RawMove = {
    id: string;
    kind: StatementMovement["kind"];
    date: string;
    dueDate: string | null;
    ref: string;
    label: string;
    debit: number;
    credit: number;
  };

  const raw: RawMove[] = [];
  let totalInvoices = 0;
  let totalCredits = 0;
  let totalPayments = 0;

  for (const inv of clientInvoices) {
    if (inv.status === "annule") continue;
    if (!inPeriod(inv.issueDate)) continue;
    totalInvoices += inv.totalTTC;
    raw.push({
      id: inv.id,
      kind: "facture",
      date: inv.issueDate,
      dueDate: inv.dueDate || null,
      ref: inv.number,
      label: `Facture · ${inv.site || inv.contractRef || "client"}`,
      debit: inv.totalTTC,
      credit: 0,
    });
  }
  for (const cr of clientCredits) {
    if (cr.status === "annule") continue;
    if (!inPeriod(cr.issueDate)) continue;
    totalCredits += cr.totalTTC;
    raw.push({
      id: cr.id,
      kind: "avoir",
      date: cr.issueDate,
      dueDate: null,
      ref: cr.number,
      label: `Avoir · ${cr.reason.slice(0, 80)}`,
      debit: 0,
      credit: cr.totalTTC,
    });
  }
  for (const pay of clientPayments) {
    if (!inPeriod(pay.paidAt)) continue;
    totalPayments += pay.amount;
    raw.push({
      id: pay.id,
      kind: "reglement",
      date: pay.paidAt,
      dueDate: null,
      ref: pay.number,
      label: `Règlement · ${pay.invoiceNumber || pay.reference || pay.method}`,
      debit: 0,
      credit: pay.amount,
    });
  }

  raw.sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref));

  let running = opening;
  const movements: StatementMovement[] = raw.map((m) => {
    running = roundMoney(running + m.debit - m.credit);
    return { ...m, balanceAfter: running };
  });

  const paidByInvoice = new Map<string, number>();
  for (const pay of clientPayments) {
    if (pay.invoiceId) {
      paidByInvoice.set(
        pay.invoiceId,
        roundMoney((paidByInvoice.get(pay.invoiceId) || 0) + pay.amount),
      );
    } else if (pay.invoiceNumber) {
      paidByInvoice.set(
        `num:${pay.invoiceNumber}`,
        roundMoney(
          (paidByInvoice.get(`num:${pay.invoiceNumber}`) || 0) + pay.amount,
        ),
      );
    }
  }

  const today = nowIso().slice(0, 10);
  const dueItems: StatementDueItem[] = [];
  let receivables = 0;
  let overdueAmount = 0;

  for (const inv of clientInvoices) {
    if (inv.status === "annule" || inv.status === "paye") continue;
    const paidAmount = roundMoney(
      (paidByInvoice.get(inv.id) || 0) +
        (paidByInvoice.get(`num:${inv.number}`) || 0),
    );
    const remaining = roundMoney(Math.max(0, inv.totalTTC - paidAmount));
    if (remaining <= 0) continue;
    const overdue = Boolean(inv.dueDate && inv.dueDate < today);
    receivables += remaining;
    if (overdue) overdueAmount += remaining;
    dueItems.push({
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      dueDate: inv.dueDate,
      amount: inv.totalTTC,
      paidAmount,
      remaining,
      overdue,
      status: inv.status,
    });
  }
  dueItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    clientName: name,
    periodStart: start,
    periodEnd: end,
    generatedAt: nowIso(),
    openingBalance: opening,
    closingBalance: running,
    totalInvoices: roundMoney(totalInvoices),
    totalCredits: roundMoney(totalCredits),
    totalPayments: roundMoney(totalPayments),
    receivables: roundMoney(receivables),
    overdueAmount: roundMoney(overdueAmount),
    movements,
    dueItems,
  };
}

export async function listFinanceStatements(
  actor: Actor,
): Promise<FinanceStatement[]> {
  const c = await statementsCol();
  await ensureFinanceSeed(actor);
  const rows = await c.find({}).sort({ generatedAt: -1 }).limit(200).toArray();
  return rows.map((r) => {
    const raw = stripMongo(r) as Record<string, unknown>;
    return {
      id: clean(raw.id, 40),
      number: clean(raw.number, 40),
      clientName: clean(raw.clientName, 180),
      periodStart: clean(raw.periodStart, 10),
      periodEnd: clean(raw.periodEnd, 10),
      generatedAt: clean(raw.generatedAt, 40),
      openingBalance: Number(raw.openingBalance) || 0,
      closingBalance: Number(raw.closingBalance) || 0,
      totalInvoices: Number(raw.totalInvoices) || 0,
      totalCredits: Number(raw.totalCredits) || 0,
      totalPayments: Number(raw.totalPayments) || 0,
      receivables: Number(raw.receivables) || 0,
      overdueAmount: Number(raw.overdueAmount) || 0,
      movements: Array.isArray(raw.movements)
        ? (raw.movements as StatementMovement[])
        : [],
      dueItems: Array.isArray(raw.dueItems)
        ? (raw.dueItems as StatementDueItem[])
        : [],
      note: clean(raw.note, 2000),
      history: Array.isArray(raw.history)
        ? (raw.history as FinanceHistoryEntry[])
        : [],
      createdAt: clean(raw.createdAt, 40),
      updatedAt: clean(raw.updatedAt, 40),
      createdBy: clean(raw.createdBy, 80),
      createdByName: clean(raw.createdByName, 120),
      ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
      ownerName: clean(raw.ownerName, 120),
    } satisfies FinanceStatement;
  });
}

export async function createFinanceStatement(
  input: { clientName: string; periodStart: string; periodEnd: string; note?: string },
  actor: Actor,
): Promise<FinanceStatement> {
  const built = await buildClientStatement(
    input.clientName,
    input.periodStart,
    input.periodEnd,
    actor,
  );
  const c = await statementsCol();
  const count = await c.countDocuments();
  const now = nowIso();
  const doc: FinanceStatement = {
    id: `FS-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: await nextNumber("REL", count),
    ...built,
    note: clean(input.note, 2000),
    history: [
      hist(actor, `Relevé généré · ${built.clientName} · ${built.periodStart}→${built.periodEnd}`),
    ],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  await c.insertOne(doc);
  return doc;
}

/* ——— Accusés / preuves de transmission ——— */

function coerceAck(raw: Record<string, unknown>): FinanceAck {
  return {
    id: clean(raw.id, 40) || `FA-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: clean(raw.number, 40) || "NECS-ACK-0000",
    documentType: isFinanceAckDocType(raw.documentType)
      ? raw.documentType
      : "autre",
    documentId: clean(raw.documentId, 40),
    documentNumber: clean(raw.documentNumber, 80),
    documentLabel: clean(raw.documentLabel, 240),
    recipientName: clean(raw.recipientName, 120),
    recipientEmail: clean(raw.recipientEmail, 180).toLowerCase(),
    recipientOrg: clean(raw.recipientOrg, 180),
    channel: isFinanceAckChannel(raw.channel) ? raw.channel : "email",
    transmittedAt: clean(raw.transmittedAt, 40),
    status: isFinanceAckStatus(raw.status) ? raw.status : "en_attente",
    proofNote: clean(raw.proofNote, 2000),
    note: clean(raw.note, 2000),
    history: Array.isArray(raw.history)
      ? (raw.history as FinanceHistoryEntry[])
      : [],
    createdAt: clean(raw.createdAt, 40) || nowIso(),
    updatedAt: clean(raw.updatedAt, 40) || nowIso(),
    createdBy: clean(raw.createdBy, 80),
    createdByName: clean(raw.createdByName, 120),
    ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
    ownerName: clean(raw.ownerName, 120),
  };
}

export async function listFinanceAcks(actor: Actor): Promise<FinanceAck[]> {
  const c = await acksCol();
  await ensureFinanceSeed(actor);
  const rows = await c
    .find({})
    .sort({ transmittedAt: -1 })
    .limit(300)
    .toArray();
  return rows.map((r) => coerceAck(stripMongo(r) as Record<string, unknown>));
}

export async function getFinanceAck(id: string): Promise<FinanceAck | null> {
  const c = await acksCol();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerceAck(stripMongo(row) as Record<string, unknown>);
}

export type FinanceAckInput = {
  documentType?: FinanceAckDocType | "";
  documentId?: string;
  documentNumber?: string;
  documentLabel?: string;
  recipientName: string;
  recipientEmail?: string;
  recipientOrg?: string;
  channel?: FinanceAckChannel | "";
  transmittedAt?: string;
  status?: FinanceAckStatus | "";
  proofNote?: string;
  note?: string;
};

export async function createFinanceAck(
  input: FinanceAckInput,
  actor: Actor,
): Promise<FinanceAck> {
  const recipientName = clean(input.recipientName, 120);
  if (!recipientName) throw new Error("Destinataire requis");
  const documentNumber = clean(input.documentNumber, 80);
  const documentLabel = clean(input.documentLabel, 240);
  if (!documentNumber && !documentLabel) {
    throw new Error("Document transmis requis");
  }
  const c = await acksCol();
  const count = await c.countDocuments();
  const now = nowIso();
  const transmittedAt = clean(input.transmittedAt, 40) || now;
  const status = isFinanceAckStatus(input.status) ? input.status : "transmis";
  const doc: FinanceAck = {
    id: `FA-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: await nextNumber("ACK", count),
    documentType: isFinanceAckDocType(input.documentType)
      ? input.documentType
      : "facture",
    documentId: clean(input.documentId, 40),
    documentNumber,
    documentLabel:
      documentLabel ||
      `${isFinanceAckDocType(input.documentType) ? input.documentType : "Document"} ${documentNumber}`,
    recipientName,
    recipientEmail: clean(input.recipientEmail, 180).toLowerCase(),
    recipientOrg: clean(input.recipientOrg, 180),
    channel: isFinanceAckChannel(input.channel) ? input.channel : "email",
    transmittedAt,
    status,
    proofNote: clean(input.proofNote, 2000),
    note: clean(input.note, 2000),
    history: [
      hist(
        actor,
        `Preuve enregistrée · ${documentNumber || documentLabel} → ${recipientName}`,
      ),
    ],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  await c.insertOne(doc);
  return doc;
}

export async function updateFinanceAck(
  id: string,
  patch: Partial<FinanceAckInput> & { status?: FinanceAckStatus },
  actor: Actor,
): Promise<FinanceAck> {
  const existing = await getFinanceAck(id);
  if (!existing) throw new Error("Accusé introuvable");
  const nextStatus = isFinanceAckStatus(patch.status)
    ? patch.status
    : existing.status;
  const next: FinanceAck = {
    ...existing,
    documentType: isFinanceAckDocType(patch.documentType)
      ? patch.documentType
      : existing.documentType,
    documentId:
      patch.documentId !== undefined
        ? clean(patch.documentId, 40)
        : existing.documentId,
    documentNumber:
      patch.documentNumber !== undefined
        ? clean(patch.documentNumber, 80)
        : existing.documentNumber,
    documentLabel:
      patch.documentLabel !== undefined
        ? clean(patch.documentLabel, 240)
        : existing.documentLabel,
    recipientName:
      patch.recipientName !== undefined
        ? clean(patch.recipientName, 120) || existing.recipientName
        : existing.recipientName,
    recipientEmail:
      patch.recipientEmail !== undefined
        ? clean(patch.recipientEmail, 180).toLowerCase()
        : existing.recipientEmail,
    recipientOrg:
      patch.recipientOrg !== undefined
        ? clean(patch.recipientOrg, 180)
        : existing.recipientOrg,
    channel: isFinanceAckChannel(patch.channel)
      ? patch.channel
      : existing.channel,
    transmittedAt:
      patch.transmittedAt !== undefined
        ? clean(patch.transmittedAt, 40)
        : existing.transmittedAt,
    status: nextStatus,
    proofNote:
      patch.proofNote !== undefined
        ? clean(patch.proofNote, 2000)
        : existing.proofNote,
    note: patch.note !== undefined ? clean(patch.note, 2000) : existing.note,
    updatedAt: nowIso(),
    history: [
      ...existing.history,
      hist(
        actor,
        nextStatus !== existing.status
          ? `Statut → ${nextStatus}`
          : "Accusé mis à jour",
      ),
    ].slice(-80),
  };
  const c = await acksCol();
  await c.replaceOne({ id }, next);
  return next;
}

function normalizePrefactureLine(
  raw: Partial<PrefactureLine> | Record<string, unknown>,
): PrefactureLine {
  return makePrefactureLine({
    id: clean(raw.id, 40) || undefined,
    label: clean(raw.label, 240) || "Prestation",
    qtyPlanned: Number(raw.qtyPlanned) || 0,
    qtyDone: Number(raw.qtyDone) || 0,
    variance:
      raw.variance !== undefined ? Number(raw.variance) || 0 : undefined,
    adjustment: Number(raw.adjustment) || 0,
    unit: clean(raw.unit, 40) || "u",
    unitPrice: Number(raw.unitPrice) || 0,
  });
}

function coercePrefacture(raw: Record<string, unknown>): FinancePrefacture {
  const lines = Array.isArray(raw.lines)
    ? (raw.lines as Partial<PrefactureLine>[]).map(normalizePrefactureLine)
    : [];
  const taxRatePct = Math.max(0, Number(raw.taxRatePct) || DEFAULT_TAX_RATE);
  const subtotalHT = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
  const taxAmount = roundMoney((subtotalHT * taxRatePct) / 100);
  return {
    id: clean(raw.id, 40) || `PF-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: clean(raw.number, 40) || "NECS-PF-0000",
    status: isPrefactureStatus(raw.status) ? raw.status : "brouillon",
    clientName: clean(raw.clientName, 180),
    contractRef: clean(raw.contractRef, 80),
    site: clean(raw.site, 160),
    periodStart: clean(raw.periodStart, 40),
    periodEnd: clean(raw.periodEnd, 40),
    lines,
    subtotalHT,
    taxRatePct,
    taxAmount,
    totalTTC: roundMoney(subtotalHT + taxAmount),
    validatedAt: raw.validatedAt ? String(raw.validatedAt) : null,
    validatedBy: clean(raw.validatedBy, 80),
    validatedByName: clean(raw.validatedByName, 120),
    note: clean(raw.note, 2000),
    history: Array.isArray(raw.history)
      ? (raw.history as FinanceHistoryEntry[])
      : [],
    createdAt: clean(raw.createdAt, 40) || nowIso(),
    updatedAt: clean(raw.updatedAt, 40) || nowIso(),
    createdBy: clean(raw.createdBy, 80),
    createdByName: clean(raw.createdByName, 120),
    ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
    ownerName: clean(raw.ownerName, 120),
  };
}

export async function listFinancePrefactures(
  actor: Actor,
): Promise<FinancePrefacture[]> {
  const c = await prefacturesCol();
  await ensureFinanceSeed(actor);
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) =>
    coercePrefacture(stripMongo(r) as Record<string, unknown>),
  );
}

export async function getFinancePrefacture(
  id: string,
): Promise<FinancePrefacture | null> {
  const c = await prefacturesCol();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coercePrefacture(stripMongo(row) as Record<string, unknown>);
}

export type PrefactureInput = {
  clientName: string;
  contractRef: string;
  site?: string;
  periodStart: string;
  periodEnd: string;
  taxRatePct?: number;
  note?: string;
  lines?: Partial<PrefactureLine>[];
  status?: PrefactureStatus | "";
};

export async function createFinancePrefacture(
  input: PrefactureInput,
  actor: Actor,
): Promise<FinancePrefacture> {
  const clientName = clean(input.clientName, 180);
  const contractRef = clean(input.contractRef, 80);
  if (!clientName) throw new Error("Client requis");
  if (!contractRef) throw new Error("Référence contrat requise");
  const periodStart = clean(input.periodStart, 40);
  const periodEnd = clean(input.periodEnd, 40);
  if (!periodStart || !periodEnd) throw new Error("Période requise");
  const lines = (input.lines || []).map(normalizePrefactureLine).filter((l) =>
    l.label.trim(),
  );
  if (!lines.length) throw new Error("Au moins une prestation requise");
  const c = await prefacturesCol();
  const count = await c.countDocuments();
  const now = nowIso();
  const taxRatePct = Math.max(0, Number(input.taxRatePct) || DEFAULT_TAX_RATE);
  const subtotalHT = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
  const taxAmount = roundMoney((subtotalHT * taxRatePct) / 100);
  const doc: FinancePrefacture = {
    id: `PF-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: await nextNumber("PF", count),
    status: isPrefactureStatus(input.status) ? input.status : "brouillon",
    clientName,
    contractRef,
    site: clean(input.site, 160),
    periodStart,
    periodEnd,
    lines,
    subtotalHT,
    taxRatePct,
    taxAmount,
    totalTTC: roundMoney(subtotalHT + taxAmount),
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    note: clean(input.note, 2000),
    history: [
      hist(
        actor,
        `Préfacture créée · ${contractRef} · ${periodStart} → ${periodEnd}`,
      ),
    ],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  await c.insertOne(doc);
  return doc;
}

export async function updateFinancePrefacture(
  id: string,
  patch: Partial<PrefactureInput> & { status?: PrefactureStatus },
  actor: Actor,
): Promise<FinancePrefacture> {
  const existing = await getFinancePrefacture(id);
  if (!existing) throw new Error("Préfacture introuvable");
  if (existing.status === "facturee" || existing.status === "annulee") {
    throw new Error("Préfacture non modifiable dans cet état");
  }
  const lines =
    patch.lines !== undefined
      ? patch.lines.map(normalizePrefactureLine).filter((l) => l.label.trim())
      : existing.lines;
  const taxRatePct =
    patch.taxRatePct !== undefined
      ? Math.max(0, Number(patch.taxRatePct) || DEFAULT_TAX_RATE)
      : existing.taxRatePct;
  const subtotalHT = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
  const taxAmount = roundMoney((subtotalHT * taxRatePct) / 100);
  let status = isPrefactureStatus(patch.status)
    ? patch.status
    : existing.status;
  let validatedAt = existing.validatedAt;
  let validatedBy = existing.validatedBy;
  let validatedByName = existing.validatedByName;
  if (status === "validee" && existing.status !== "validee") {
    validatedAt = nowIso();
    validatedBy = actor.userId;
    validatedByName = actor.name;
  }
  const next: FinancePrefacture = {
    ...existing,
    clientName:
      patch.clientName !== undefined
        ? clean(patch.clientName, 180) || existing.clientName
        : existing.clientName,
    contractRef:
      patch.contractRef !== undefined
        ? clean(patch.contractRef, 80) || existing.contractRef
        : existing.contractRef,
    site:
      patch.site !== undefined ? clean(patch.site, 160) : existing.site,
    periodStart:
      patch.periodStart !== undefined
        ? clean(patch.periodStart, 40)
        : existing.periodStart,
    periodEnd:
      patch.periodEnd !== undefined
        ? clean(patch.periodEnd, 40)
        : existing.periodEnd,
    lines,
    subtotalHT,
    taxRatePct,
    taxAmount,
    totalTTC: roundMoney(subtotalHT + taxAmount),
    status,
    validatedAt,
    validatedBy,
    validatedByName,
    note: patch.note !== undefined ? clean(patch.note, 2000) : existing.note,
    updatedAt: nowIso(),
    history: [
      hist(
        actor,
        status !== existing.status
          ? `Statut → ${status}`
          : "Préfacture mise à jour",
      ),
      ...existing.history,
    ].slice(0, 80),
  };
  const c = await prefacturesCol();
  await c.replaceOne({ id }, next);
  return next;
}

function normalizeReminderInvoice(
  raw: Partial<ReminderInvoiceLine> | Record<string, unknown>,
): ReminderInvoiceLine {
  return makeReminderInvoiceLine({
    id: clean(raw.id, 40) || undefined,
    invoiceId: clean(raw.invoiceId, 40),
    invoiceNumber: clean(raw.invoiceNumber, 80) || "FAC",
    dueDate: clean(raw.dueDate, 40),
    amountDue: Number(raw.amountDue) || 0,
    daysLate:
      raw.daysLate !== undefined ? Number(raw.daysLate) || 0 : undefined,
  });
}

function coerceReminder(raw: Record<string, unknown>): FinanceReminder {
  const invoices = Array.isArray(raw.invoices)
    ? (raw.invoices as Partial<ReminderInvoiceLine>[]).map(
        normalizeReminderInvoice,
      )
    : [];
  return {
    id: clean(raw.id, 40) || `RLC-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: clean(raw.number, 40) || "NECS-RLC-0000",
    status: isReminderStatus(raw.status) ? raw.status : "brouillon",
    clientName: clean(raw.clientName, 180),
    level: isReminderLevel(raw.level) ? raw.level : "R1",
    channel: isReminderChannel(raw.channel) ? raw.channel : "email",
    sentAt: raw.sentAt ? String(raw.sentAt) : null,
    subject: clean(raw.subject, 240) || DEFAULT_REMINDER_SUBJECT,
    body: clean(raw.body, 8000) || DEFAULT_REMINDER_BODY,
    invoices,
    totalDue: roundMoney(invoices.reduce((s, i) => s + i.amountDue, 0)),
    reminderHistory: Array.isArray(raw.reminderHistory)
      ? (raw.reminderHistory as ReminderHistoryEntry[])
      : [],
    note: clean(raw.note, 2000),
    history: Array.isArray(raw.history)
      ? (raw.history as FinanceHistoryEntry[])
      : [],
    createdAt: clean(raw.createdAt, 40) || nowIso(),
    updatedAt: clean(raw.updatedAt, 40) || nowIso(),
    createdBy: clean(raw.createdBy, 80),
    createdByName: clean(raw.createdByName, 120),
    ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
    ownerName: clean(raw.ownerName, 120),
  };
}

export async function listFinanceReminders(
  actor: Actor,
): Promise<FinanceReminder[]> {
  const c = await remindersCol();
  await ensureFinanceSeed(actor);
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) =>
    coerceReminder(stripMongo(r) as Record<string, unknown>),
  );
}

export async function getFinanceReminder(
  id: string,
): Promise<FinanceReminder | null> {
  const c = await remindersCol();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerceReminder(stripMongo(row) as Record<string, unknown>);
}

export type ReminderInput = {
  clientName: string;
  level?: ReminderLevel | "";
  channel?: ReminderChannel | "";
  subject?: string;
  body?: string;
  note?: string;
  invoices?: Partial<ReminderInvoiceLine>[];
  status?: ReminderStatus | "";
};

export async function createFinanceReminder(
  input: ReminderInput,
  actor: Actor,
): Promise<FinanceReminder> {
  const clientName = clean(input.clientName, 180);
  if (!clientName) throw new Error("Client requis");
  const invoices = (input.invoices || [])
    .map(normalizeReminderInvoice)
    .filter((i) => i.invoiceNumber.trim() && i.amountDue > 0);
  if (!invoices.length) throw new Error("Au moins une facture due requise");
  const c = await remindersCol();
  const count = await c.countDocuments();
  const now = nowIso();
  const level = isReminderLevel(input.level) ? input.level : "R1";
  const channel = isReminderChannel(input.channel) ? input.channel : "email";
  const previous = await c
    .find({ clientName })
    .sort({ updatedAt: -1 })
    .limit(10)
    .toArray();
  const reminderHistory: ReminderHistoryEntry[] = previous
    .filter((p) => p.sentAt)
    .map((p) => ({
      id: `RH-${randomUUID().slice(0, 6).toUpperCase()}`,
      at: String(p.sentAt),
      level: isReminderLevel(p.level) ? p.level : "R1",
      channel: isReminderChannel(p.channel) ? p.channel : "email",
      byName: String(p.createdByName || ""),
      detail: `${p.number} · ${p.level}`,
    }));
  const doc: FinanceReminder = {
    id: `RLC-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: await nextNumber("RLC", count),
    status: isReminderStatus(input.status) ? input.status : "brouillon",
    clientName,
    level,
    channel,
    sentAt: null,
    subject: clean(input.subject, 240) || DEFAULT_REMINDER_SUBJECT,
    body: clean(input.body, 8000) || DEFAULT_REMINDER_BODY,
    invoices,
    totalDue: roundMoney(invoices.reduce((s, i) => s + i.amountDue, 0)),
    reminderHistory,
    note: clean(input.note, 2000),
    history: [
      hist(actor, `Relance ${level} créée · ${clientName} · ${invoices.length} facture(s)`),
    ],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  await c.insertOne(doc);
  return doc;
}

export async function updateFinanceReminder(
  id: string,
  patch: Partial<ReminderInput> & { status?: ReminderStatus; send?: boolean },
  actor: Actor,
): Promise<FinanceReminder> {
  const existing = await getFinanceReminder(id);
  if (!existing) throw new Error("Relance introuvable");
  const invoices =
    patch.invoices !== undefined
      ? patch.invoices
          .map(normalizeReminderInvoice)
          .filter((i) => i.invoiceNumber.trim())
      : existing.invoices;
  let status = isReminderStatus(patch.status) ? patch.status : existing.status;
  let sentAt = existing.sentAt;
  let reminderHistory = existing.reminderHistory;
  if (patch.send || status === "envoyee") {
    status = "envoyee";
    sentAt = nowIso();
    reminderHistory = [
      {
        id: `RH-${randomUUID().slice(0, 6).toUpperCase()}`,
        at: sentAt,
        level: isReminderLevel(patch.level) ? patch.level : existing.level,
        channel: isReminderChannel(patch.channel)
          ? patch.channel
          : existing.channel,
        byName: actor.name,
        detail: `Envoi ${existing.number}`,
      },
      ...reminderHistory,
    ].slice(0, 40);
  }
  const next: FinanceReminder = {
    ...existing,
    clientName:
      patch.clientName !== undefined
        ? clean(patch.clientName, 180) || existing.clientName
        : existing.clientName,
    level: isReminderLevel(patch.level) ? patch.level : existing.level,
    channel: isReminderChannel(patch.channel)
      ? patch.channel
      : existing.channel,
    subject:
      patch.subject !== undefined
        ? clean(patch.subject, 240) || existing.subject
        : existing.subject,
    body:
      patch.body !== undefined
        ? clean(patch.body, 8000) || existing.body
        : existing.body,
    invoices,
    totalDue: roundMoney(invoices.reduce((s, i) => s + i.amountDue, 0)),
    status,
    sentAt,
    reminderHistory,
    note: patch.note !== undefined ? clean(patch.note, 2000) : existing.note,
    updatedAt: nowIso(),
    history: [
      hist(
        actor,
        patch.send
          ? `Relance envoyée · ${existing.level}`
          : status !== existing.status
            ? `Statut → ${status}`
            : "Relance mise à jour",
      ),
      ...existing.history,
    ].slice(0, 80),
  };
  const c = await remindersCol();
  await c.replaceOne({ id }, next);
  return next;
}
