import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import {
  getOpportunity,
  getOpportunityByProspect,
} from "@/lib/need-qualification-crm";
import {
  isNeedFrequency,
  isPrestationKind,
  isServiceLevel,
  type NeedFrequency,
  type PrestationKind,
  type ServiceLevel,
} from "@/lib/need-qualification-shared";
import type { UserRole } from "@/lib/settings";
import { getVisitQuotePayload, getTechnicalVisit } from "@/lib/technical-visit-crm";
import {
  assertReconstitutable,
  buildDefaultLines,
  canEditQuotes,
  canValidateQuotes,
  computeTotals,
  DEFAULT_QUOTE_TARIFFS,
  formatFcfa,
  isQuoteStatus,
  lineAmount,
  makeLine,
  monthlyVisitsFor,
  requiredValidatorRole,
  roleCanValidateAmount,
  roundMoney,
  type Quote,
  type QuoteLine,
  type QuoteLineKind,
  type QuoteTariffs,
  type QuoteTotals,
  type QuoteVersion,
} from "@/lib/quotes-shared";

const COLLECTION = "crm_quotes";
const TARIFFS_COLLECTION = "crm_quote_tariffs";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string) {
  return {
    id: `QH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

async function col() {
  const db = await getDb();
  const c = db.collection<Quote>(COLLECTION);
  void Promise.all([
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ prospectId: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ visitId: 1 }).catch(() => undefined),
    c.createIndex({ ownerEmail: 1, status: 1 }).catch(() => undefined),
  ]);
  return c;
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

async function save(doc: Quote): Promise<Quote> {
  const next = { ...doc, updatedAt: nowIso() };
  const c = await col();
  await c.replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

function normalizeLine(raw: Partial<QuoteLine> | Record<string, unknown>): QuoteLine {
  const quantity = Math.max(0, Number(raw.quantity) || 0);
  const unitPrice = Math.max(0, Number(raw.unitPrice) || 0);
  const kind = (raw.kind as QuoteLineKind) || "autre";
  return makeLine({
    id: clean(raw.id, 40) || undefined,
    label: clean(raw.label, 240) || "Ligne",
    kind:
      kind === "surface" ||
      kind === "effectif" ||
      kind === "consommables" ||
      kind === "forfait" ||
      kind === "autre"
        ? kind
        : "autre",
    quantity,
    unit: clean(raw.unit, 40) || "u",
    unitPrice,
  });
}

function normalizeTotals(
  lines: QuoteLine[],
  overheadPct: number,
  marginPct: number,
  raw?: Partial<QuoteTotals>,
): QuoteTotals {
  const computed = computeTotals(lines, overheadPct, marginPct);
  if (!raw) return computed;
  // Prefer recomputed reconstitutable totals; keep pct from input.
  return {
    ...computed,
    overheadPct: Math.max(0, Number(raw.overheadPct ?? overheadPct) || 0),
    marginPct: Math.max(0, Number(raw.marginPct ?? marginPct) || 0),
    overheadAmount: computed.overheadAmount,
    marginAmount: computed.marginAmount,
    subtotal: computed.subtotal,
    totalHT: computed.totalHT,
  };
}

function coerceQuote(raw: Record<string, unknown>): Quote {
  const lines = Array.isArray(raw.lines)
    ? (raw.lines as Partial<QuoteLine>[]).map(normalizeLine)
    : [];
  const overheadPct = Math.max(
    0,
    Number((raw.totals as QuoteTotals | undefined)?.overheadPct) ||
      DEFAULT_QUOTE_TARIFFS.overheadPct,
  );
  const marginPct = Math.max(
    0,
    Number((raw.totals as QuoteTotals | undefined)?.marginPct) ||
      DEFAULT_QUOTE_TARIFFS.marginPct,
  );
  const totals = normalizeTotals(lines, overheadPct, marginPct, raw.totals as QuoteTotals);
  const frequency = isNeedFrequency(raw.frequency)
    ? (raw.frequency as NeedFrequency)
    : "";
  const serviceLevel = isServiceLevel(raw.serviceLevel)
    ? (raw.serviceLevel as ServiceLevel)
    : "";
  const prestation = isPrestationKind(raw.prestation)
    ? (raw.prestation as PrestationKind)
    : "";

  const versions: QuoteVersion[] = Array.isArray(raw.versions)
    ? (raw.versions as QuoteVersion[]).map((v) => {
        const vLines = Array.isArray(v.lines)
          ? v.lines.map(normalizeLine)
          : [];
        const vTotals = normalizeTotals(
          vLines,
          Number(v.totals?.overheadPct) || overheadPct,
          Number(v.totals?.marginPct) || marginPct,
          v.totals,
        );
        return {
          version: Number(v.version) || 1,
          at: String(v.at ?? ""),
          by: String(v.by ?? ""),
          byName: String(v.byName ?? ""),
          reason: String(v.reason ?? ""),
          lines: vLines,
          totals: vTotals,
          frequency: isNeedFrequency(v.frequency) ? v.frequency : "",
          prestation: isPrestationKind(v.prestation) ? v.prestation : "",
          staffCount: Math.max(0, Number(v.staffCount) || 0),
          surfaceM2: Math.max(0, Number(v.surfaceM2) || 0),
          hoursPerVisit: Math.max(0, Number(v.hoursPerVisit) || 0),
          monthlyVisits: Math.max(1, Number(v.monthlyVisits) || 1),
          serviceLevel: isServiceLevel(v.serviceLevel) ? v.serviceLevel : "",
          note: String(v.note ?? ""),
        };
      })
    : [];

  return {
    id: String(raw.id ?? ""),
    prospectId: String(raw.prospectId ?? ""),
    opportunityId: String(raw.opportunityId ?? ""),
    visitId: String(raw.visitId ?? ""),
    company: String(raw.company ?? ""),
    title: String(raw.title ?? ""),
    status: isQuoteStatus(raw.status) ? raw.status : "brouillon",
    prestation,
    frequency,
    serviceLevel,
    staffCount: Math.max(0, Number(raw.staffCount) || 0),
    surfaceM2: Math.max(0, Number(raw.surfaceM2) || 0),
    hoursPerVisit: Math.max(0, Number(raw.hoursPerVisit) || 0),
    monthlyVisits: Math.max(1, Number(raw.monthlyVisits) || 1),
    lines,
    totals,
    currentVersion: Math.max(1, Number(raw.currentVersion) || 1),
    versions,
    note: String(raw.note ?? ""),
    history: Array.isArray(raw.history) ? (raw.history as Quote["history"]) : [],
    submittedAt: (raw.submittedAt as string | null) ?? null,
    validatedAt: (raw.validatedAt as string | null) ?? null,
    validatedBy: String(raw.validatedBy ?? ""),
    validatedByName: String(raw.validatedByName ?? ""),
    rejectedAt: (raw.rejectedAt as string | null) ?? null,
    rejectionReason: String(raw.rejectionReason ?? ""),
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
    ownerEmail: String(raw.ownerEmail ?? ""),
    ownerName: String(raw.ownerName ?? ""),
  };
}

function snapshotVersion(
  quote: Quote,
  actor: Actor,
  reason: string,
): QuoteVersion {
  return {
    version: quote.currentVersion,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    reason: reason.slice(0, 240),
    lines: quote.lines.map((l) => ({ ...l })),
    totals: { ...quote.totals },
    frequency: quote.frequency,
    prestation: quote.prestation,
    staffCount: quote.staffCount,
    surfaceM2: quote.surfaceM2,
    hoursPerVisit: quote.hoursPerVisit,
    monthlyVisits: quote.monthlyVisits,
    serviceLevel: quote.serviceLevel,
    note: quote.note,
  };
}

export async function getQuoteTariffs(): Promise<QuoteTariffs> {
  const db = await getDb();
  const row = await db
    .collection<{ id: string } & QuoteTariffs>(TARIFFS_COLLECTION)
    .findOne({ id: "default" });
  if (!row) return { ...DEFAULT_QUOTE_TARIFFS };
  return {
    ratePerM2: Math.max(0, Number(row.ratePerM2) || DEFAULT_QUOTE_TARIFFS.ratePerM2),
    hourlyRate: Math.max(
      0,
      Number(row.hourlyRate) || DEFAULT_QUOTE_TARIFFS.hourlyRate,
    ),
    consumablePerM2: Math.max(
      0,
      Number(row.consumablePerM2) || DEFAULT_QUOTE_TARIFFS.consumablePerM2,
    ),
    overheadPct: Math.max(
      0,
      Number(row.overheadPct) || DEFAULT_QUOTE_TARIFFS.overheadPct,
    ),
    marginPct: Math.max(
      0,
      Number(row.marginPct) || DEFAULT_QUOTE_TARIFFS.marginPct,
    ),
    hoursPerVisitDefault: Math.max(
      0,
      Number(row.hoursPerVisitDefault) ||
        DEFAULT_QUOTE_TARIFFS.hoursPerVisitDefault,
    ),
    thresholdCommercial: Math.max(
      0,
      Number(row.thresholdCommercial) ||
        DEFAULT_QUOTE_TARIFFS.thresholdCommercial,
    ),
    thresholdFinance: Math.max(
      0,
      Number(row.thresholdFinance) || DEFAULT_QUOTE_TARIFFS.thresholdFinance,
    ),
  };
}

export async function saveQuoteTariffs(
  patch: Partial<QuoteTariffs>,
  actor: Actor,
): Promise<QuoteTariffs> {
  if (actor.role !== "admin" && actor.role !== "finance" && actor.role !== "manager") {
    throw new Error("Seuls finance / direction peuvent modifier les tarifs.");
  }
  const current = await getQuoteTariffs();
  const next: QuoteTariffs = {
    ratePerM2:
      patch.ratePerM2 !== undefined
        ? Math.max(0, Number(patch.ratePerM2) || 0)
        : current.ratePerM2,
    hourlyRate:
      patch.hourlyRate !== undefined
        ? Math.max(0, Number(patch.hourlyRate) || 0)
        : current.hourlyRate,
    consumablePerM2:
      patch.consumablePerM2 !== undefined
        ? Math.max(0, Number(patch.consumablePerM2) || 0)
        : current.consumablePerM2,
    overheadPct:
      patch.overheadPct !== undefined
        ? Math.max(0, Number(patch.overheadPct) || 0)
        : current.overheadPct,
    marginPct:
      patch.marginPct !== undefined
        ? Math.max(0, Number(patch.marginPct) || 0)
        : current.marginPct,
    hoursPerVisitDefault:
      patch.hoursPerVisitDefault !== undefined
        ? Math.max(0, Number(patch.hoursPerVisitDefault) || 0)
        : current.hoursPerVisitDefault,
    thresholdCommercial:
      patch.thresholdCommercial !== undefined
        ? Math.max(0, Number(patch.thresholdCommercial) || 0)
        : current.thresholdCommercial,
    thresholdFinance:
      patch.thresholdFinance !== undefined
        ? Math.max(0, Number(patch.thresholdFinance) || 0)
        : current.thresholdFinance,
  };
  if (next.thresholdFinance < next.thresholdCommercial) {
    throw new Error("Le seuil finance doit être ≥ seuil commercial.");
  }
  const db = await getDb();
  await db.collection(TARIFFS_COLLECTION).replaceOne(
    { id: "default" },
    { id: "default", ...next, updatedAt: nowIso(), updatedBy: actor.userId },
    { upsert: true },
  );
  return next;
}

export async function listQuotes(actor: Actor): Promise<Quote[]> {
  const c = await col();
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
  return rows.map((r) => coerceQuote(stripMongo(r) as Record<string, unknown>));
}

export async function getQuote(id: string): Promise<Quote | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerceQuote(stripMongo(row) as Record<string, unknown>);
}

export async function findQuoteByOpportunity(
  opportunityId: string,
): Promise<Quote | null> {
  if (!opportunityId) return null;
  const c = await col();
  const row = await c
    .find({
      opportunityId,
      status: { $in: ["valide", "envoye"] },
    })
    .sort({ updatedAt: -1 })
    .limit(1)
    .next();
  if (row) return coerceQuote(stripMongo(row) as Record<string, unknown>);
  const any = await c
    .find({ opportunityId })
    .sort({ updatedAt: -1 })
    .limit(1)
    .next();
  if (!any) return null;
  return coerceQuote(stripMongo(any) as Record<string, unknown>);
}

export async function createQuoteFromVisit(
  visitId: string,
  actor: Actor,
  opts?: { title?: string; note?: string },
): Promise<Quote> {
  if (!canEditQuotes(actor.role)) {
    throw new Error("Création réservée commercial / direction.");
  }
  const snapshot = await getVisitQuotePayload(visitId);
  const visit = await getTechnicalVisit(visitId);
  if (!visit) throw new Error("Visite introuvable.");

  const existing = await (await col()).findOne({ visitId });
  if (existing && existing.status !== "refuse") {
    throw new Error(
      `Un devis existe déjà pour cette visite (${existing.id}). Ouvrez-le ou créez une nouvelle version.`,
    );
  }

  const tariffs = await getQuoteTariffs();
  let frequency: NeedFrequency | "" = "";
  let serviceLevel: ServiceLevel | "" = "";
  let prestation: PrestationKind | "" = "";
  if (visit.opportunityId) {
    const opp = await getOpportunity(visit.opportunityId);
    if (opp?.need) {
      frequency = isNeedFrequency(opp.need.frequency) ? opp.need.frequency : "";
      serviceLevel = isServiceLevel(opp.need.serviceLevel)
        ? opp.need.serviceLevel
        : "";
      prestation = isPrestationKind(opp.need.prestation)
        ? opp.need.prestation
        : "";
    }
  }

  const surfaceM2 = snapshot.surfaceTotalM2 ?? 0;
  const staffCount = snapshot.recommendedStaff ?? 2;
  const hoursPerVisit = tariffs.hoursPerVisitDefault;
  const monthlyVisits = monthlyVisitsFor(frequency);
  const lines = buildDefaultLines({
    surfaceM2,
    staffCount,
    hoursPerVisit,
    monthlyVisits,
    tariffs,
    prestation,
    serviceLevel,
  });
  const errors = assertReconstitutable(lines);
  if (errors.length) throw new Error(errors.join(" · "));

  const totals = computeTotals(lines, tariffs.overheadPct, tariffs.marginPct);
  const stamp = nowIso();
  const id = `DV-${randomUUID().slice(0, 8).toUpperCase()}`;
  const quote: Quote = {
    id,
    prospectId: visit.prospectId,
    opportunityId: visit.opportunityId,
    visitId: visit.id,
    company: visit.company || snapshot.company,
    title:
      clean(opts?.title, 200) ||
      `Devis ${visit.company || snapshot.company} — mensuel`,
    status: "brouillon",
    prestation,
    frequency,
    serviceLevel,
    staffCount,
    surfaceM2,
    hoursPerVisit,
    monthlyVisits,
    lines,
    totals,
    currentVersion: 1,
    versions: [],
    note: clean(opts?.note, 4000),
    history: [
      hist(
        actor,
        `Devis créé depuis visite ${visitId} · ${formatFcfa(totals.totalHT)} HT · v1`,
      ),
    ],
    submittedAt: null,
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    rejectedAt: null,
    rejectionReason: "",
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };

  // Version initiale figée
  quote.versions = [snapshotVersion(quote, actor, "Version initiale")];
  return save(quote);
}

export async function createManualQuote(
  input: {
    prospectId: string;
    opportunityId?: string;
    company: string;
    title?: string;
    surfaceM2: number;
    staffCount: number;
    hoursPerVisit?: number;
    frequency?: NeedFrequency | "";
    serviceLevel?: ServiceLevel | "";
    prestation?: PrestationKind | "";
    note?: string;
  },
  actor: Actor,
): Promise<Quote> {
  if (!canEditQuotes(actor.role)) {
    throw new Error("Création réservée commercial / direction.");
  }
  const prospectId = clean(input.prospectId, 40);
  if (!prospectId) throw new Error("Prospect requis.");
  const tariffs = await getQuoteTariffs();
  const frequency = isNeedFrequency(input.frequency) ? input.frequency : "";
  const serviceLevel = isServiceLevel(input.serviceLevel)
    ? input.serviceLevel
    : "";
  const prestation = isPrestationKind(input.prestation) ? input.prestation : "";
  const surfaceM2 = Math.max(0, Number(input.surfaceM2) || 0);
  const staffCount = Math.max(0, Number(input.staffCount) || 0);
  const hoursPerVisit =
    input.hoursPerVisit !== undefined
      ? Math.max(0, Number(input.hoursPerVisit) || 0)
      : tariffs.hoursPerVisitDefault;
  const monthlyVisits = monthlyVisitsFor(frequency);
  const lines = buildDefaultLines({
    surfaceM2,
    staffCount,
    hoursPerVisit,
    monthlyVisits,
    tariffs,
    prestation,
    serviceLevel,
  });
  const totals = computeTotals(lines, tariffs.overheadPct, tariffs.marginPct);
  const stamp = nowIso();
  const id = `DV-${randomUUID().slice(0, 8).toUpperCase()}`;
  const quote: Quote = {
    id,
    prospectId,
    opportunityId: clean(input.opportunityId, 40),
    visitId: "",
    company: clean(input.company, 200) || "Sans nom",
    title:
      clean(input.title, 200) ||
      `Devis ${clean(input.company, 120) || prospectId}`,
    status: "brouillon",
    prestation,
    frequency,
    serviceLevel,
    staffCount,
    surfaceM2,
    hoursPerVisit,
    monthlyVisits,
    lines,
    totals,
    currentVersion: 1,
    versions: [],
    note: clean(input.note, 4000),
    history: [hist(actor, `Devis manuel créé · ${formatFcfa(totals.totalHT)} HT`)],
    submittedAt: null,
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    rejectedAt: null,
    rejectionReason: "",
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  quote.versions = [snapshotVersion(quote, actor, "Version initiale")];
  return save(quote);
}

/**
 * CRM-03 : chiffrage depuis opportunité (besoin qualifié / étude).
 * Reprend surface, effectif, fréquence, niveau de service → lignes reconstituables.
 */
export async function createQuoteFromOpportunity(
  opportunityIdOrProspectId: string,
  actor: Actor,
  opts?: { title?: string; note?: string },
): Promise<Quote> {
  if (!canEditQuotes(actor.role)) {
    throw new Error("Création réservée commercial / direction.");
  }
  const key = clean(opportunityIdOrProspectId, 40);
  if (!key) throw new Error("Opportunité ou prospect requis.");

  let opp = await getOpportunity(key);
  if (!opp) opp = await getOpportunityByProspect(key);
  if (!opp) throw new Error("Opportunité introuvable.");

  if (!opp.needComplete) {
    throw new Error(
      `Besoin incomplet — ${opp.missingFields.join(", ") || "champs manquants"}. Qualifiez le besoin avant chiffrage.`,
    );
  }

  const tariffs = await getQuoteTariffs();
  const need = opp.need;
  const frequency = isNeedFrequency(need.frequency) ? need.frequency : "";
  const serviceLevel = isServiceLevel(need.serviceLevel)
    ? need.serviceLevel
    : "";
  const prestation = isPrestationKind(need.prestation) ? need.prestation : "";
  const surfaceM2 = Math.max(0, Number(need.surfaceM2) || 0);
  const staffCount = Math.max(
    0,
    Number(need.staffEstimate) || Math.max(1, Math.ceil(surfaceM2 / 400)),
  );
  const hoursPerVisit = tariffs.hoursPerVisitDefault;
  const monthlyVisits = monthlyVisitsFor(frequency);
  const lines = buildDefaultLines({
    surfaceM2,
    staffCount,
    hoursPerVisit,
    monthlyVisits,
    tariffs,
    prestation,
    serviceLevel,
  });
  const errors = assertReconstitutable(lines);
  if (errors.length) throw new Error(errors.join(" · "));

  const totals = computeTotals(lines, tariffs.overheadPct, tariffs.marginPct);
  const stamp = nowIso();
  const id = `DV-${randomUUID().slice(0, 8).toUpperCase()}`;
  const noteParts = [
    clean(opts?.note, 2000),
    need.constraints ? `Contraintes : ${clean(need.constraints, 800)}` : "",
    need.schedule ? `Horaires : ${clean(need.schedule, 400)}` : "",
    need.prestation ? `Prestation : ${clean(need.prestation, 80)}` : "",
  ].filter(Boolean);

  const quote: Quote = {
    id,
    prospectId: opp.prospectId,
    opportunityId: opp.id,
    visitId: "",
    company: opp.company,
    title:
      clean(opts?.title, 200) ||
      `Chiffrage ${opp.company} — ${frequency || "mensuel"}`,
    status: "brouillon",
    prestation,
    frequency,
    serviceLevel,
    staffCount,
    surfaceM2,
    hoursPerVisit,
    monthlyVisits,
    lines,
    totals,
    currentVersion: 1,
    versions: [],
    note: noteParts.join("\n"),
    history: [
      hist(
        actor,
        `Devis depuis opportunité ${opp.id} · ${formatFcfa(totals.totalHT)} HT · v1`,
      ),
    ],
    submittedAt: null,
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    rejectedAt: null,
    rejectionReason: "",
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  quote.versions = [snapshotVersion(quote, actor, "Version initiale")];
  return save(quote);
}

function assertEditable(quote: Quote) {
  if (quote.status === "valide" || quote.status === "envoye") {
    throw new Error(
      "Devis validé/envoyé — créez une nouvelle version pour modifier.",
    );
  }
  if (quote.status === "en_validation") {
    throw new Error("Devis en validation — retirez-le avant modification.");
  }
}

export async function updateQuoteDraft(
  id: string,
  patch: {
    title?: string;
    note?: string;
    frequency?: NeedFrequency | "";
    serviceLevel?: ServiceLevel | "";
    prestation?: PrestationKind | "";
    staffCount?: number;
    surfaceM2?: number;
    hoursPerVisit?: number;
    overheadPct?: number;
    marginPct?: number;
    lines?: Array<Partial<QuoteLine>>;
    rebuildLines?: boolean;
  },
  actor: Actor,
): Promise<Quote> {
  if (!canEditQuotes(actor.role)) throw new Error("Modification refusée.");
  const existing = await getQuote(id);
  if (!existing) throw new Error("Devis introuvable.");
  assertEditable(existing);

  if (patch.title !== undefined) existing.title = clean(patch.title, 200);
  if (patch.note !== undefined) existing.note = clean(patch.note, 4000);
  if (patch.frequency !== undefined) {
    existing.frequency = isNeedFrequency(patch.frequency) ? patch.frequency : "";
    existing.monthlyVisits = monthlyVisitsFor(existing.frequency);
  }
  if (patch.serviceLevel !== undefined) {
    existing.serviceLevel = isServiceLevel(patch.serviceLevel)
      ? patch.serviceLevel
      : "";
  }
  if (patch.prestation !== undefined) {
    existing.prestation = isPrestationKind(patch.prestation)
      ? patch.prestation
      : "";
  }
  if (patch.staffCount !== undefined) {
    existing.staffCount = Math.max(0, Number(patch.staffCount) || 0);
  }
  if (patch.surfaceM2 !== undefined) {
    existing.surfaceM2 = Math.max(0, Number(patch.surfaceM2) || 0);
  }
  if (patch.hoursPerVisit !== undefined) {
    existing.hoursPerVisit = Math.max(0, Number(patch.hoursPerVisit) || 0);
  }

  const tariffs = await getQuoteTariffs();
  let overheadPct =
    patch.overheadPct !== undefined
      ? Math.max(0, Number(patch.overheadPct) || 0)
      : existing.totals.overheadPct;
  let marginPct =
    patch.marginPct !== undefined
      ? Math.max(0, Number(patch.marginPct) || 0)
      : existing.totals.marginPct;

  if (patch.rebuildLines) {
    existing.lines = buildDefaultLines({
      surfaceM2: existing.surfaceM2,
      staffCount: existing.staffCount,
      hoursPerVisit: existing.hoursPerVisit,
      monthlyVisits: existing.monthlyVisits,
      tariffs: {
        ...tariffs,
        overheadPct,
        marginPct,
      },
      prestation: existing.prestation,
      serviceLevel: existing.serviceLevel,
    });
  } else if (patch.lines) {
    existing.lines = patch.lines.map(normalizeLine);
  }

  // Always recompute amounts from qty × unitPrice
  existing.lines = existing.lines.map((l) =>
    makeLine({
      id: l.id,
      label: l.label,
      kind: l.kind,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
    }),
  );

  const errors = assertReconstitutable(existing.lines);
  if (errors.length) throw new Error(errors.join(" · "));

  existing.totals = computeTotals(existing.lines, overheadPct, marginPct);
  existing.history = [
    hist(
      actor,
      `Brouillon mis à jour · ${formatFcfa(existing.totals.totalHT)} HT · v${existing.currentVersion}`,
    ),
    ...existing.history,
  ].slice(0, 80);

  return save(existing);
}

/** Nouvelle version immuable : archive l’état courant puis incrémente. */
export async function createQuoteVersion(
  id: string,
  actor: Actor,
  reason = "",
): Promise<Quote> {
  if (!canEditQuotes(actor.role)) throw new Error("Version réservée commercial.");
  const existing = await getQuote(id);
  if (!existing) throw new Error("Devis introuvable.");
  if (existing.status === "en_validation") {
    throw new Error("Retirez le devis de validation avant une nouvelle version.");
  }

  // Archive current state if not already last snapshot
  const last = existing.versions[0];
  const needsArchive =
    !last ||
    last.version !== existing.currentVersion ||
    Math.abs(last.totals.totalHT - existing.totals.totalHT) > 0.01 ||
    last.lines.length !== existing.lines.length;

  if (needsArchive) {
    existing.versions = [
      snapshotVersion(
        existing,
        actor,
        clean(reason, 240) || `Archive v${existing.currentVersion}`,
      ),
      ...existing.versions,
    ].slice(0, 40);
  }

  existing.currentVersion += 1;
  existing.status = "brouillon";
  existing.submittedAt = null;
  existing.validatedAt = null;
  existing.validatedBy = "";
  existing.validatedByName = "";
  existing.rejectedAt = null;
  existing.rejectionReason = "";
  existing.versions = [
    snapshotVersion(
      existing,
      actor,
      clean(reason, 240) || `Nouvelle version v${existing.currentVersion}`,
    ),
    ...existing.versions,
  ].slice(0, 40);
  existing.history = [
    hist(
      actor,
      `Nouvelle version v${existing.currentVersion}${reason ? ` · ${clean(reason, 120)}` : ""}`,
    ),
    ...existing.history,
  ].slice(0, 80);

  return save(existing);
}

export async function submitQuoteForValidation(
  id: string,
  actor: Actor,
): Promise<Quote> {
  if (!canEditQuotes(actor.role)) throw new Error("Soumission refusée.");
  const existing = await getQuote(id);
  if (!existing) throw new Error("Devis introuvable.");
  if (existing.status !== "brouillon" && existing.status !== "refuse") {
    throw new Error("Seuls les brouillons/refusés peuvent être soumis.");
  }
  if (existing.lines.length === 0) throw new Error("Ajoutez au moins une ligne.");
  const errors = assertReconstitutable(existing.lines);
  if (errors.length) throw new Error(errors.join(" · "));

  // Freeze version snapshot at submission
  existing.versions = [
    snapshotVersion(existing, actor, `Soumission validation v${existing.currentVersion}`),
    ...existing.versions.filter((v) => v.version !== existing.currentVersion),
  ].slice(0, 40);

  const tariffs = await getQuoteTariffs();
  const required = requiredValidatorRole(existing.totals.totalHT, tariffs);
  existing.status = "en_validation";
  existing.submittedAt = nowIso();
  existing.rejectedAt = null;
  existing.rejectionReason = "";
  existing.history = [
    hist(
      actor,
      `Soumis validation · ${formatFcfa(existing.totals.totalHT)} HT · seuil ${required}`,
    ),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function validateQuote(
  id: string,
  actor: Actor,
): Promise<Quote> {
  if (!canValidateQuotes(actor.role)) {
    throw new Error("Validation non autorisée pour ce rôle.");
  }
  const existing = await getQuote(id);
  if (!existing) throw new Error("Devis introuvable.");
  if (existing.status !== "en_validation") {
    throw new Error("Le devis n’est pas en attente de validation.");
  }

  const tariffs = await getQuoteTariffs();
  if (!roleCanValidateAmount(actor.role, existing.totals.totalHT, tariffs)) {
    const req = requiredValidatorRole(existing.totals.totalHT, tariffs);
    throw new Error(
      `Montant ${formatFcfa(existing.totals.totalHT)} — validation réservée au niveau « ${req} » (seuils commercial ${formatFcfa(tariffs.thresholdCommercial)} / finance ${formatFcfa(tariffs.thresholdFinance)}).`,
    );
  }

  const errors = assertReconstitutable(existing.lines);
  if (errors.length) throw new Error(errors.join(" · "));

  const stamp = nowIso();
  existing.status = "valide";
  existing.validatedAt = stamp;
  existing.validatedBy = actor.userId;
  existing.validatedByName = actor.name;
  existing.versions = [
    snapshotVersion(existing, actor, `Validé v${existing.currentVersion}`),
    ...existing.versions.filter((v) => v.version !== existing.currentVersion),
  ].slice(0, 40);
  existing.history = [
    hist(
      actor,
      `Validé · ${formatFcfa(existing.totals.totalHT)} HT · v${existing.currentVersion}`,
    ),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function rejectQuote(
  id: string,
  actor: Actor,
  reason: string,
): Promise<Quote> {
  if (!canValidateQuotes(actor.role)) {
    throw new Error("Refus non autorisé.");
  }
  const existing = await getQuote(id);
  if (!existing) throw new Error("Devis introuvable.");
  if (existing.status !== "en_validation") {
    throw new Error("Le devis n’est pas en validation.");
  }
  existing.status = "refuse";
  existing.rejectedAt = nowIso();
  existing.rejectionReason = clean(reason, 500) || "Refusé";
  existing.history = [
    hist(actor, `Refusé · ${existing.rejectionReason}`),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function markQuoteSent(
  id: string,
  actor: Actor,
): Promise<Quote> {
  if (!canEditQuotes(actor.role)) throw new Error("Action refusée.");
  const existing = await getQuote(id);
  if (!existing) throw new Error("Devis introuvable.");
  if (existing.status !== "valide") {
    throw new Error("Seuls les devis validés peuvent être marqués envoyés.");
  }
  existing.status = "envoye";
  existing.history = [
    hist(actor, "Marqué envoyé au client"),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function withdrawQuote(
  id: string,
  actor: Actor,
): Promise<Quote> {
  if (!canEditQuotes(actor.role)) throw new Error("Retrait refusé.");
  const existing = await getQuote(id);
  if (!existing) throw new Error("Devis introuvable.");
  if (existing.status !== "en_validation") {
    throw new Error("Seul un devis en validation peut être retiré.");
  }
  existing.status = "brouillon";
  existing.submittedAt = null;
  existing.history = [
    hist(actor, "Retiré de la validation → brouillon"),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

/** Recette : montant reconstituable = Σ (qty × unitPrice) + frais + marge. */
export function reconstituteAmount(quote: Quote): {
  linesOk: boolean;
  lineErrors: string[];
  subtotal: number;
  totalHT: number;
  matchesStored: boolean;
} {
  const lineErrors = assertReconstitutable(quote.lines);
  const recomputed = computeTotals(
    quote.lines.map((l) => ({
      ...l,
      amount: lineAmount(l.quantity, l.unitPrice),
    })),
    quote.totals.overheadPct,
    quote.totals.marginPct,
  );
  return {
    linesOk: lineErrors.length === 0,
    lineErrors,
    subtotal: recomputed.subtotal,
    totalHT: recomputed.totalHT,
    matchesStored:
      Math.abs(recomputed.totalHT - quote.totals.totalHT) < 0.02 &&
      Math.abs(recomputed.subtotal - quote.totals.subtotal) < 0.02,
  };
}

export function quoteValidationMeta(quote: Quote, tariffs: QuoteTariffs) {
  const required = requiredValidatorRole(quote.totals.totalHT, tariffs);
  return {
    requiredLevel: required,
    thresholdCommercial: tariffs.thresholdCommercial,
    thresholdFinance: tariffs.thresholdFinance,
    totalHT: quote.totals.totalHT,
    reconstitutable: reconstituteAmount(quote),
  };
}

export { roundMoney };
