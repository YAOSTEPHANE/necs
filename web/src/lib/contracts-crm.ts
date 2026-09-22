import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import {
  getOpportunity,
  listOpportunities,
} from "@/lib/need-qualification-crm";
import {
  isNeedFrequency,
  isServiceLevel,
  type CrmOpportunity,
} from "@/lib/need-qualification-shared";
import { getProspect } from "@/lib/prospects-crm";
import { findQuoteByOpportunity } from "@/lib/quotes-crm";
import type { UserRole } from "@/lib/settings";
import { getTechnicalVisit } from "@/lib/technical-visit-crm";
import {
  addMonthsIso,
  assertNoResaisie,
  computeMonthlyAmount,
  CONTRACT_AMENDMENT_MOD_LABELS,
  DEFAULT_CONTRACT_BILLING,
  DEFAULT_CONTRACT_DEPOSIT,
  DEFAULT_CONTRACT_INDEXATION,
  DEFAULT_CONTRACT_OBJECT,
  DEFAULT_CONTRACT_OBLIGATIONS,
  DEFAULT_CONTRACT_PENALTIES,
  DEFAULT_CONTRACT_TERMINATION,
  DEFAULT_CONTRACT_VERSION,
  DEFAULT_NECS_REP_NAME,
  DEFAULT_NECS_REP_TITLE,
  DEFAULT_SIGNATURE_PLACE,
  defaultContractSignatures,
  isContractSla,
  isContractStatus,
  makePrestationLine,
  makeTariffLine,
  roundMoney,
  slaFromServiceLevel,
  contractFullySigned,
  serviceContractReady,
  type Contract,
  type ContractAmendment,
  type ContractAmendmentModType,
  type ContractMilestone,
  type ContractMilestoneKind,
  type ContractPrestationLine,
  type ContractRenewal,
  type ContractSignature,
  type ContractSignatureRole,
  type ContractSite,
  type ContractSla,
  type ContractSourceSnapshot,
  type ContractStatus,
  type ContractTariffLine,
  type ContractFromWonPreview,
  isContractAmendmentModType,
} from "@/lib/contracts-shared";

const COLLECTION = "crm_contracts";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string) {
  return {
    id: `CH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

async function col() {
  const db = await getDb();
  const c = db.collection<Contract>(COLLECTION);
  void Promise.all([
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ opportunityId: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ prospectId: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ ref: 1 }, { unique: true }).catch(() => undefined),
  ]);
  return c;
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

async function save(doc: Contract): Promise<Contract> {
  const next = { ...doc, updatedAt: nowIso() };
  const c = await col();
  await c.replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

function normalizeSite(raw: Partial<ContractSite>): ContractSite {
  return {
    id: clean(raw.id, 40) || `ST-${randomUUID().slice(0, 6).toUpperCase()}`,
    name: clean(raw.name, 160) || "Site principal",
    address: clean(raw.address, 400),
    city: clean(raw.city, 120),
    surfaceM2:
      raw.surfaceM2 === null || raw.surfaceM2 === undefined
        ? null
        : Math.max(0, Number(raw.surfaceM2) || 0) || null,
    active: raw.active !== false,
    consignes: clean(raw.consignes, 4000),
  };
}

function normalizeTariff(raw: Partial<ContractTariffLine>): ContractTariffLine {
  const period =
    raw.period === "annuel" || raw.period === "forfait" || raw.period === "mensuel"
      ? raw.period
      : "mensuel";
  return makeTariffLine({
    id: clean(raw.id, 40) || undefined,
    label: clean(raw.label, 240) || "Prestation",
    unit: clean(raw.unit, 40) || "u",
    quantity: Math.max(0, Number(raw.quantity) || 0),
    unitPrice: Math.max(0, Number(raw.unitPrice) || 0),
    period,
  });
}

function normalizeMilestone(
  raw: Partial<ContractMilestone>,
): ContractMilestone {
  const kind: ContractMilestoneKind =
    raw.kind === "facture" ||
    raw.kind === "renouvellement" ||
    raw.kind === "revision" ||
    raw.kind === "autre"
      ? raw.kind
      : "autre";
  return {
    id: clean(raw.id, 40) || `MS-${randomUUID().slice(0, 6).toUpperCase()}`,
    label: clean(raw.label, 200) || "Échéance",
    dueAt: clean(raw.dueAt, 40),
    kind,
    done: Boolean(raw.done),
    doneAt: raw.doneAt ? String(raw.doneAt) : null,
  };
}

function normalizePrestation(
  raw: Partial<ContractPrestationLine>,
): ContractPrestationLine {
  return makePrestationLine({
    id: clean(raw.id, 40) || undefined,
    label: clean(raw.label, 240) || "Prestation",
    frequency: clean(raw.frequency, 80),
    staffAssigned: Math.max(0, Number(raw.staffAssigned) || 0),
    siteName: clean(raw.siteName, 160),
  });
}

function normalizeSignature(
  raw: Partial<ContractSignature>,
  fallbackRole: ContractSignatureRole,
): ContractSignature {
  const role: ContractSignatureRole =
    raw.role === "client" || raw.role === "necs" ? raw.role : fallbackRole;
  return {
    role,
    name: clean(raw.name, 160),
    title: clean(raw.title, 160),
    signedAt: raw.signedAt ? String(raw.signedAt) : null,
    signed: Boolean(raw.signed),
  };
}

function normalizeAmendment(
  raw: Partial<ContractAmendment> & { snapshot?: Record<string, unknown> },
  contractRef: string,
): ContractAmendment {
  const snap = (raw.snapshot || {}) as Partial<ContractAmendment["snapshot"]> &
    Record<string, unknown>;
  return {
    id: clean(raw.id, 40) || `AVN-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: Math.max(1, Number(raw.number) || 1),
    contractRef: clean(raw.contractRef, 80) || contractRef,
    at: String(raw.at ?? nowIso()),
    by: String(raw.by ?? ""),
    byName: String(raw.byName ?? ""),
    reason: clean(raw.reason, 500),
    effectiveAt: String(raw.effectiveAt ?? ""),
    modificationType: isContractAmendmentModType(raw.modificationType)
      ? raw.modificationType
      : "mixte",
    impactFinancial: Number(raw.impactFinancial) || 0,
    changes: clean(raw.changes, 1000),
    snapshot: {
      monthlyAmount: Math.max(0, Number(snap.monthlyAmount) || 0),
      sla: isContractSla(snap.sla) ? snap.sla : "standard",
      endAt: snap.endAt ? String(snap.endAt) : null,
      durationMonths: Math.max(1, Number(snap.durationMonths) || 12),
      staffCount: Math.max(0, Number(snap.staffCount) || 0),
      perimeter: String(snap.perimeter ?? ""),
      sites: Array.isArray(snap.sites)
        ? (snap.sites as Partial<ContractSite>[]).map(normalizeSite)
        : [],
      tariffs: Array.isArray(snap.tariffs)
        ? (snap.tariffs as Partial<ContractTariffLine>[]).map(normalizeTariff)
        : [],
      prestations: Array.isArray(snap.prestations)
        ? (snap.prestations as Partial<ContractPrestationLine>[]).map(
            normalizePrestation,
          )
        : [],
    },
  };
}

function coerceSignatures(raw: unknown, clientRep: string): ContractSignature[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultContractSignatures(clientRep);
  }
  const mapped = (raw as Partial<ContractSignature>[]).map((s, i) =>
    normalizeSignature(s, i === 0 ? "client" : "necs"),
  );
  const hasClient = mapped.some((s) => s.role === "client");
  const hasNecs = mapped.some((s) => s.role === "necs");
  if (!hasClient || !hasNecs) {
    const defaults = defaultContractSignatures(clientRep);
    return [
      hasClient ? mapped.find((s) => s.role === "client")! : defaults[0]!,
      hasNecs ? mapped.find((s) => s.role === "necs")! : defaults[1]!,
    ];
  }
  return [
    mapped.find((s) => s.role === "client")!,
    mapped.find((s) => s.role === "necs")!,
  ];
}

function coerceContract(raw: Record<string, unknown>): Contract {
  const tariffs = Array.isArray(raw.tariffs)
    ? (raw.tariffs as Partial<ContractTariffLine>[]).map(normalizeTariff)
    : [];
  const sites = Array.isArray(raw.sites)
    ? (raw.sites as Partial<ContractSite>[]).map(normalizeSite)
    : [];
  const prestations = Array.isArray(raw.prestations)
    ? (raw.prestations as Partial<ContractPrestationLine>[]).map(
        normalizePrestation,
      )
    : [];
  const snap = (raw.sourceSnapshot || {}) as Partial<ContractSourceSnapshot>;
  const contactName = String(raw.contactName ?? "");
  const clientRepName = String(raw.clientRepName ?? contactName);
  return {
    id: String(raw.id ?? ""),
    ref: String(raw.ref ?? ""),
    opportunityId: String(raw.opportunityId ?? ""),
    quoteId: String(raw.quoteId ?? ""),
    prospectId: String(raw.prospectId ?? ""),
    visitId: String(raw.visitId ?? ""),
    bcRef: String(raw.bcRef ?? ""),
    contractVersion: String(raw.contractVersion ?? DEFAULT_CONTRACT_VERSION),
    signaturePlace: String(raw.signaturePlace ?? DEFAULT_SIGNATURE_PLACE),
    indexation: String(raw.indexation ?? DEFAULT_CONTRACT_INDEXATION),
    deposit: String(raw.deposit ?? DEFAULT_CONTRACT_DEPOSIT),
    penalties: String(raw.penalties ?? DEFAULT_CONTRACT_PENALTIES),
    company: String(raw.company ?? ""),
    contactName,
    contactEmail: String(raw.contactEmail ?? ""),
    clientRccm: String(raw.clientRccm ?? ""),
    clientRepName,
    clientRepTitle: String(raw.clientRepTitle ?? ""),
    necsRepName: String(raw.necsRepName ?? DEFAULT_NECS_REP_NAME),
    necsRepTitle: String(raw.necsRepTitle ?? DEFAULT_NECS_REP_TITLE),
    object: String(raw.object ?? DEFAULT_CONTRACT_OBJECT),
    perimeter: String(raw.perimeter ?? ""),
    obligations: String(raw.obligations ?? DEFAULT_CONTRACT_OBLIGATIONS),
    pricingTerms: String(raw.pricingTerms ?? ""),
    billingTerms: String(raw.billingTerms ?? DEFAULT_CONTRACT_BILLING),
    terminationTerms: String(
      raw.terminationTerms ?? DEFAULT_CONTRACT_TERMINATION,
    ),
    status: isContractStatus(raw.status) ? raw.status : "brouillon",
    sla: isContractSla(raw.sla) ? raw.sla : "standard",
    startAt: String(raw.startAt ?? ""),
    endAt: raw.endAt ? String(raw.endAt) : null,
    durationMonths: Math.max(1, Number(raw.durationMonths) || 12),
    renewal:
      raw.renewal === "express" || raw.renewal === "sans" || raw.renewal === "tacite"
        ? (raw.renewal as ContractRenewal)
        : "tacite",
    frequency: isNeedFrequency(raw.frequency) ? raw.frequency : "",
    serviceLevel: isServiceLevel(raw.serviceLevel) ? raw.serviceLevel : "",
    staffCount: Math.max(0, Number(raw.staffCount) || 0),
    sites,
    tariffs,
    prestations,
    monthlyAmount:
      Number(raw.monthlyAmount) >= 0
        ? roundMoney(Number(raw.monthlyAmount) || computeMonthlyAmount(tariffs))
        : computeMonthlyAmount(tariffs),
    milestones: Array.isArray(raw.milestones)
      ? (raw.milestones as Partial<ContractMilestone>[]).map(normalizeMilestone)
      : [],
    amendments: Array.isArray(raw.amendments)
      ? (raw.amendments as Partial<ContractAmendment>[]).map((a) =>
          normalizeAmendment(a, String(raw.ref ?? "")),
        )
      : [],
    signatures: coerceSignatures(raw.signatures, clientRepName),
    signedAt: raw.signedAt ? String(raw.signedAt) : null,
    sourceSnapshot: {
      opportunityId: String(snap.opportunityId ?? raw.opportunityId ?? ""),
      opportunityTitle: String(snap.opportunityTitle ?? ""),
      opportunityValue: Math.max(0, Number(snap.opportunityValue) || 0),
      quoteId: String(snap.quoteId ?? raw.quoteId ?? ""),
      quoteVersion: Math.max(0, Number(snap.quoteVersion) || 0),
      quoteTotalHT: Math.max(0, Number(snap.quoteTotalHT) || 0),
      visitId: String(snap.visitId ?? raw.visitId ?? ""),
      prospectId: String(snap.prospectId ?? raw.prospectId ?? ""),
      company: String(snap.company ?? raw.company ?? ""),
      contactName: String(snap.contactName ?? raw.contactName ?? ""),
      contactEmail: String(snap.contactEmail ?? raw.contactEmail ?? ""),
      siteAddress: String(snap.siteAddress ?? ""),
      surfaceM2:
        snap.surfaceM2 === null || snap.surfaceM2 === undefined
          ? null
          : Number(snap.surfaceM2),
      frequency: isNeedFrequency(snap.frequency) ? snap.frequency : "",
      serviceLevel: isServiceLevel(snap.serviceLevel) ? snap.serviceLevel : "",
      staffCount: Math.max(0, Number(snap.staffCount) || 0),
      capturedAt: String(snap.capturedAt ?? raw.createdAt ?? nowIso()),
    },
    note: String(raw.note ?? ""),
    history: Array.isArray(raw.history) ? (raw.history as Contract["history"]) : [],
    activatedAt: raw.activatedAt ? String(raw.activatedAt) : null,
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
    ownerEmail: String(raw.ownerEmail ?? ""),
    ownerName: String(raw.ownerName ?? ""),
  };
}

function buildRef(): string {
  const y = new Date().getFullYear();
  return `NECS-CTR-${y}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

function defaultMilestones(
  startAt: string,
  endAt: string | null,
  durationMonths: number,
): ContractMilestone[] {
  const items: ContractMilestone[] = [];
  // Première facturation J+30
  items.push({
    id: `MS-${randomUUID().slice(0, 6).toUpperCase()}`,
    label: "Première facturation",
    dueAt: addMonthsIso(startAt, 1),
    kind: "facture",
    done: false,
    doneAt: null,
  });
  // Révision mi-parcours
  if (durationMonths >= 6) {
    items.push({
      id: `MS-${randomUUID().slice(0, 6).toUpperCase()}`,
      label: "Révision tarifaire / SLA",
      dueAt: addMonthsIso(startAt, Math.floor(durationMonths / 2)),
      kind: "revision",
      done: false,
      doneAt: null,
    });
  }
  if (endAt) {
    items.push({
      id: `MS-${randomUUID().slice(0, 6).toUpperCase()}`,
      label: "Échéance renouvellement",
      dueAt: endAt,
      kind: "renouvellement",
      done: false,
      doneAt: null,
    });
  }
  return items;
}

export async function listContracts(actor: Actor): Promise<Contract[]> {
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
  return rows.map((r) => coerceContract(stripMongo(r) as Record<string, unknown>));
}

export async function getContract(id: string): Promise<Contract | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerceContract(stripMongo(row) as Record<string, unknown>);
}

export async function getContractByOpportunity(
  opportunityId: string,
): Promise<Contract | null> {
  const c = await col();
  const row = await c.findOne({ opportunityId });
  if (!row) return null;
  return coerceContract(stripMongo(row) as Record<string, unknown>);
}

/** Affaires gagnées sans contrat — candidates à la transformation. */
export async function listWonOpportunitiesEligible(
  actor: Actor,
): Promise<CrmOpportunity[]> {
  const opps = await listOpportunities(actor);
  const won = opps.filter((o) => o.stage === "gagne");
  const c = await col();
  const existing = await c
    .find({ opportunityId: { $in: won.map((o) => o.id) } })
    .project({ opportunityId: 1 })
    .toArray();
  const taken = new Set(existing.map((e) => String(e.opportunityId)));
  return won.filter((o) => !taken.has(o.id));
}

export type { ContractFromWonPreview } from "@/lib/contracts-shared";

type AssembleOpts = {
  startAt?: string;
  durationMonths?: number;
  renewal?: ContractRenewal;
  note?: string;
};

/**
 * Assemble le contrat depuis l’affaire gagnée (prospect / besoin / visite / devis).
 * Ne persiste pas — utilisé par aperçu et création.
 */
async function assembleContractFromWon(
  opportunityId: string,
  actor: Actor,
  opts?: AssembleOpts,
): Promise<{ contract: Contract; sources: string[] }> {
  const opp = await getOpportunity(opportunityId);
  if (!opp) throw new Error("Opportunité introuvable.");
  if (opp.stage !== "gagne") {
    throw new Error(
      "Seule une affaire gagnée peut être transformée en contrat.",
    );
  }

  const prospect = opp.prospectId ? await getProspect(opp.prospectId) : null;
  const quote = await findQuoteByOpportunity(opportunityId);
  const visit = quote?.visitId
    ? await getTechnicalVisit(quote.visitId)
    : null;

  const sources: string[] = ["affaire"];
  if (prospect) sources.push("prospect");
  if (quote) sources.push("devis");
  if (visit) sources.push("visite");

  const stamp = nowIso();
  const startAt = opts?.startAt
    ? clean(opts.startAt, 40)
    : stamp.slice(0, 10) + "T00:00:00.000Z";
  const durationMonths = Math.max(1, Number(opts?.durationMonths) || 12);
  const endAt = addMonthsIso(startAt, durationMonths);
  const renewal = opts?.renewal || "tacite";

  const frequency =
    (quote?.frequency && isNeedFrequency(quote.frequency)
      ? quote.frequency
      : isNeedFrequency(opp.need.frequency)
        ? opp.need.frequency
        : "") || "";
  const serviceLevel =
    (quote?.serviceLevel && isServiceLevel(quote.serviceLevel)
      ? quote.serviceLevel
      : isServiceLevel(opp.need.serviceLevel)
        ? opp.need.serviceLevel
        : "") || "";
  const staffCount =
    quote?.staffCount ||
    opp.need.staffEstimate ||
    visit?.report.recommendedStaff ||
    0;
  const surfaceM2 =
    quote?.surfaceM2 ||
    opp.need.surfaceM2 ||
    visit?.report.surfaceTotalM2 ||
    null;

  const siteAddress =
    visit?.siteAddress ||
    prospect?.address ||
    opp.need.zones ||
    prospect?.city ||
    "";

  const sites: ContractSite[] = [
    normalizeSite({
      name: visit?.company
        ? `Site ${visit.company}`
        : `Site ${opp.company}`,
      address: siteAddress,
      city: visit?.city || prospect?.city || "",
      surfaceM2,
      active: true,
      consignes:
        visit?.report.accessNotes ||
        opp.need.accessNotes ||
        opp.need.constraints ||
        "",
    }),
  ];

  if (visit?.report.zones?.length) {
    for (const z of visit.report.zones.slice(0, 8)) {
      if (!z.name) continue;
      sites.push(
        normalizeSite({
          name: z.name,
          address: siteAddress,
          city: visit.city || "",
          surfaceM2: z.surfaceM2,
          active: true,
          consignes: z.note || "",
        }),
      );
    }
  }

  let tariffs: ContractTariffLine[] = [];
  if (quote?.lines?.length) {
    tariffs = quote.lines.map((l) =>
      makeTariffLine({
        label: l.label,
        unit: l.unit,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        period: "mensuel",
      }),
    );
  } else if (opp.valueEstimate > 0) {
    tariffs = [
      makeTariffLine({
        label: "Prestation mensuelle (valeur affaire)",
        unit: "mois",
        quantity: 1,
        unitPrice: opp.valueEstimate,
        period: "mensuel",
      }),
    ];
  }

  const monthlyAmount = computeMonthlyAmount(tariffs);
  const sla = slaFromServiceLevel(serviceLevel);

  const sourceSnapshot: ContractSourceSnapshot = {
    opportunityId: opp.id,
    opportunityTitle: opp.title,
    opportunityValue: opp.valueEstimate,
    quoteId: quote?.id || "",
    quoteVersion: quote?.currentVersion || 0,
    quoteTotalHT: quote?.totals.totalHT || 0,
    visitId: visit?.id || quote?.visitId || "",
    prospectId: opp.prospectId,
    company: opp.company,
    contactName: opp.contactName || prospect?.name || "",
    contactEmail: opp.contactEmail || prospect?.email || "",
    siteAddress,
    surfaceM2,
    frequency,
    serviceLevel,
    staffCount,
    capturedAt: stamp,
  };

  const id = `CTR-${randomUUID().slice(0, 8).toUpperCase()}`;
  const perimeter =
    sites
      .map((s) =>
        [s.name, s.address, s.city].filter(Boolean).join(" — "),
      )
      .filter(Boolean)
      .join(" · ") || siteAddress;
  const prestations: ContractPrestationLine[] = tariffs.map((t) =>
    makePrestationLine({
      label: t.label,
      frequency: frequency || "",
      staffAssigned: staffCount,
      siteName: sites[0]?.name || "",
    }),
  );
  const contract: Contract = {
    id,
    ref: buildRef(),
    opportunityId: opp.id,
    quoteId: quote?.id || "",
    prospectId: opp.prospectId,
    visitId: visit?.id || quote?.visitId || "",
    bcRef: quote?.id || "",
    contractVersion: DEFAULT_CONTRACT_VERSION,
    signaturePlace: DEFAULT_SIGNATURE_PLACE,
    indexation: DEFAULT_CONTRACT_INDEXATION,
    deposit: DEFAULT_CONTRACT_DEPOSIT,
    penalties: DEFAULT_CONTRACT_PENALTIES,
    company: opp.company,
    contactName: sourceSnapshot.contactName,
    contactEmail: sourceSnapshot.contactEmail,
    clientRccm: "",
    clientRepName: sourceSnapshot.contactName,
    clientRepTitle: "",
    necsRepName: DEFAULT_NECS_REP_NAME,
    necsRepTitle: DEFAULT_NECS_REP_TITLE,
    object: DEFAULT_CONTRACT_OBJECT,
    perimeter,
    obligations: DEFAULT_CONTRACT_OBLIGATIONS,
    pricingTerms: monthlyAmount
      ? `Montant mensuel HT : ${monthlyAmount.toLocaleString("fr-FR")} FCFA.`
      : "",
    billingTerms: DEFAULT_CONTRACT_BILLING,
    terminationTerms: DEFAULT_CONTRACT_TERMINATION,
    status: "brouillon",
    sla,
    startAt,
    endAt,
    durationMonths,
    renewal,
    frequency,
    serviceLevel,
    staffCount,
    sites,
    tariffs,
    prestations,
    monthlyAmount,
    milestones: defaultMilestones(startAt, endAt, durationMonths),
    amendments: [],
    signatures: defaultContractSignatures(sourceSnapshot.contactName),
    signedAt: null,
    sourceSnapshot,
    note: clean(opts?.note, 4000),
    history: [
      hist(
        actor,
        `Contrat créé depuis affaire gagnée ${opp.id}${quote ? ` · devis ${quote.id}` : ""} · ${monthlyAmount.toLocaleString("fr-FR")} FCFA/mois`,
      ),
    ],
    activatedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: opp.ownerEmail || actor.email.toLowerCase(),
    ownerName: opp.ownerName || actor.name,
  };

  return { contract, sources };
}

/** Aperçu de reprise (recette : sans ressaisie) — ne crée pas le contrat. */
export async function previewContractFromWonOpportunity(
  opportunityId: string,
  actor: Actor,
): Promise<ContractFromWonPreview> {
  const existing = await getContractByOpportunity(opportunityId);
  const { contract, sources } = await assembleContractFromWon(
    opportunityId,
    actor,
  );
  return {
    opportunityId: contract.opportunityId,
    company: contract.company,
    contactName: contract.contactName,
    contactEmail: contract.contactEmail,
    valueEstimate: contract.sourceSnapshot.opportunityValue,
    quoteId: contract.quoteId,
    quoteVersion: contract.sourceSnapshot.quoteVersion,
    quoteTotalHT: contract.sourceSnapshot.quoteTotalHT,
    visitId: contract.visitId,
    prospectId: contract.prospectId,
    sla: contract.sla,
    frequency: contract.frequency,
    serviceLevel: contract.serviceLevel,
    staffCount: contract.staffCount,
    monthlyAmount: contract.monthlyAmount,
    sites: contract.sites,
    tariffs: contract.tariffs,
    sources,
    noResaisie: assertNoResaisie(contract),
    existingContractId: existing?.id ?? null,
    existingContractRef: existing?.ref ?? null,
  };
}

/**
 * CRM-06 : transforme une affaire gagnée en contrat.
 * Reprend sans ressaisie : prospect, besoin, visite, devis validé.
 */
export async function createContractFromWonOpportunity(
  opportunityId: string,
  actor: Actor,
  opts?: AssembleOpts,
): Promise<Contract> {
  const existing = await getContractByOpportunity(opportunityId);
  if (existing) {
    throw new Error(`Un contrat existe déjà pour cette affaire (${existing.ref}).`);
  }

  const { contract } = await assembleContractFromWon(
    opportunityId,
    actor,
    opts,
  );

  const check = assertNoResaisie(contract);
  if (!check.ok) {
    throw new Error(
      `Reprise incomplète : ${check.checks
        .filter((c) => !c.ok)
        .map((c) => c.detail)
        .join(" · ")}`,
    );
  }

  return save(contract);
}

/** Création manuelle — Juridique / Direction (contrat de prestation). */
export async function createManualServiceContract(
  input: {
    company: string;
    contactName?: string;
    contactEmail?: string;
    clientRccm?: string;
    clientRepName?: string;
    clientRepTitle?: string;
    necsRepName?: string;
    necsRepTitle?: string;
    object?: string;
    perimeter?: string;
    obligations?: string;
    pricingTerms?: string;
    billingTerms?: string;
    terminationTerms?: string;
    sla?: ContractSla;
    startAt?: string;
    durationMonths?: number;
    renewal?: ContractRenewal;
    staffCount?: number;
    frequency?: string;
    serviceLevel?: string;
    note?: string;
    bcRef?: string;
    contractVersion?: string;
    signaturePlace?: string;
    indexation?: string;
    deposit?: string;
    penalties?: string;
    sites?: Partial<ContractSite>[];
    tariffs?: Partial<ContractTariffLine>[];
    prestations?: Partial<ContractPrestationLine>[];
  },
  actor: Actor,
): Promise<Contract> {
  const company = clean(input.company, 200);
  if (!company) throw new Error("Raison sociale client requise.");

  const stamp = nowIso();
  const startAt = input.startAt
    ? clean(input.startAt, 40)
    : `${stamp.slice(0, 10)}T00:00:00.000Z`;
  const durationMonths = Math.max(1, Number(input.durationMonths) || 12);
  const endAt = addMonthsIso(startAt, durationMonths);
  const renewal =
    input.renewal === "express" ||
    input.renewal === "sans" ||
    input.renewal === "tacite"
      ? input.renewal
      : "tacite";
  const tariffs = (input.tariffs || []).map(normalizeTariff);
  const sites = (input.sites || []).map(normalizeSite);
  if (!sites.length) {
    sites.push(
      normalizeSite({
        name: `Site ${company}`,
        address: clean(input.perimeter, 400),
        city: "",
        active: true,
      }),
    );
  }
  const monthlyAmount = computeMonthlyAmount(tariffs);
  const staffCount = Math.max(0, Number(input.staffCount) || 0);
  const frequency = isNeedFrequency(input.frequency) ? input.frequency : "";
  const serviceLevel = isServiceLevel(input.serviceLevel)
    ? input.serviceLevel
    : "";
  const sla =
    input.sla && isContractSla(input.sla)
      ? input.sla
      : slaFromServiceLevel(serviceLevel);
  const contactName = clean(input.contactName, 160);
  const clientRepName =
    clean(input.clientRepName, 160) || contactName;
  const prestations = (input.prestations || []).map(normalizePrestation);
  if (!prestations.length && tariffs.length) {
    for (const t of tariffs) {
      prestations.push(
        makePrestationLine({
          label: t.label,
          frequency: frequency || "",
          staffAssigned: staffCount,
          siteName: sites[0]?.name || "",
        }),
      );
    }
  }

  const manualKey = `MANUAL-${randomUUID().slice(0, 8).toUpperCase()}`;
  const id = `CTR-${randomUUID().slice(0, 8).toUpperCase()}`;
  const contract: Contract = {
    id,
    ref: buildRef(),
    opportunityId: manualKey,
    quoteId: "",
    prospectId: "",
    visitId: "",
    bcRef: clean(input.bcRef, 120),
    contractVersion:
      clean(input.contractVersion, 40) || DEFAULT_CONTRACT_VERSION,
    signaturePlace:
      clean(input.signaturePlace, 120) || DEFAULT_SIGNATURE_PLACE,
    indexation: clean(input.indexation, 400) || DEFAULT_CONTRACT_INDEXATION,
    deposit: clean(input.deposit, 200) || DEFAULT_CONTRACT_DEPOSIT,
    penalties: clean(input.penalties, 2000) || DEFAULT_CONTRACT_PENALTIES,
    company,
    contactName,
    contactEmail: clean(input.contactEmail, 200),
    clientRccm: clean(input.clientRccm, 80),
    clientRepName,
    clientRepTitle: clean(input.clientRepTitle, 120),
    necsRepName: clean(input.necsRepName, 160) || DEFAULT_NECS_REP_NAME,
    necsRepTitle: clean(input.necsRepTitle, 160) || DEFAULT_NECS_REP_TITLE,
    object: clean(input.object, 2000) || DEFAULT_CONTRACT_OBJECT,
    perimeter:
      clean(input.perimeter, 4000) ||
      sites
        .map((s) => [s.name, s.address, s.city].filter(Boolean).join(" — "))
        .join(" · "),
    obligations: clean(input.obligations, 4000) || DEFAULT_CONTRACT_OBLIGATIONS,
    pricingTerms:
      clean(input.pricingTerms, 4000) ||
      (monthlyAmount
        ? `Montant mensuel HT : ${monthlyAmount.toLocaleString("fr-FR")} FCFA.`
        : ""),
    billingTerms: clean(input.billingTerms, 4000) || DEFAULT_CONTRACT_BILLING,
    terminationTerms:
      clean(input.terminationTerms, 4000) || DEFAULT_CONTRACT_TERMINATION,
    status: "brouillon",
    sla,
    startAt,
    endAt,
    durationMonths,
    renewal,
    frequency,
    serviceLevel,
    staffCount,
    sites,
    tariffs,
    prestations,
    monthlyAmount,
    milestones: defaultMilestones(startAt, endAt, durationMonths),
    amendments: [],
    signatures: defaultContractSignatures(
      clientRepName,
      clean(input.necsRepName, 160) || DEFAULT_NECS_REP_NAME,
    ),
    signedAt: null,
    sourceSnapshot: {
      opportunityId: manualKey,
      opportunityTitle: "Contrat prestation (saisie juridique)",
      opportunityValue: monthlyAmount,
      quoteId: "",
      quoteVersion: 0,
      quoteTotalHT: monthlyAmount,
      visitId: "",
      prospectId: "",
      company,
      contactName,
      contactEmail: clean(input.contactEmail, 200),
      siteAddress: sites[0]?.address || "",
      surfaceM2: sites[0]?.surfaceM2 ?? null,
      frequency,
      serviceLevel,
      staffCount,
      capturedAt: stamp,
    },
    note: clean(input.note, 4000),
    history: [
      hist(
        actor,
        `Contrat de prestation créé (Juridique / Direction) · ${company}`,
      ),
    ],
    activatedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };

  return save(contract);
}

export async function updateContractDraft(
  id: string,
  patch: {
    sla?: ContractSla;
    startAt?: string;
    endAt?: string | null;
    durationMonths?: number;
    renewal?: ContractRenewal;
    staffCount?: number;
    note?: string;
    company?: string;
    contactName?: string;
    contactEmail?: string;
    clientRccm?: string;
    clientRepName?: string;
    clientRepTitle?: string;
    necsRepName?: string;
    necsRepTitle?: string;
    object?: string;
    perimeter?: string;
    obligations?: string;
    pricingTerms?: string;
    billingTerms?: string;
    terminationTerms?: string;
    frequency?: string;
    serviceLevel?: string;
    bcRef?: string;
    contractVersion?: string;
    signaturePlace?: string;
    indexation?: string;
    deposit?: string;
    penalties?: string;
    sites?: Partial<ContractSite>[];
    tariffs?: Partial<ContractTariffLine>[];
    prestations?: Partial<ContractPrestationLine>[];
    milestones?: Partial<ContractMilestone>[];
    signatures?: Partial<ContractSignature>[];
  },
  actor: Actor,
): Promise<Contract> {
  const existing = await getContract(id);
  if (!existing) throw new Error("Contrat introuvable.");
  if (
    existing.status !== "brouillon" &&
    existing.status !== "en_revue" &&
    existing.status !== "actif"
  ) {
    throw new Error("Contrat non modifiable dans cet état.");
  }
  // Avenants for actif changes to tariffs/sites — draft can edit freely
  if (existing.status === "actif" && (patch.tariffs || patch.sites || patch.sla)) {
    throw new Error(
      "Contrat actif : utilisez un avenant pour modifier tarifs, sites ou SLA.",
    );
  }

  if (patch.sla && isContractSla(patch.sla)) existing.sla = patch.sla;
  if (patch.startAt !== undefined) existing.startAt = clean(patch.startAt, 40);
  if (patch.endAt !== undefined) {
    existing.endAt =
      patch.endAt === null || patch.endAt === ""
        ? null
        : clean(patch.endAt, 40);
  }
  if (patch.durationMonths !== undefined) {
    existing.durationMonths = Math.max(1, Number(patch.durationMonths) || 12);
    if (existing.startAt) {
      existing.endAt = addMonthsIso(existing.startAt, existing.durationMonths);
    }
  }
  if (patch.renewal === "tacite" || patch.renewal === "express" || patch.renewal === "sans") {
    existing.renewal = patch.renewal;
  }
  if (patch.staffCount !== undefined) {
    existing.staffCount = Math.max(0, Number(patch.staffCount) || 0);
  }
  if (patch.note !== undefined) existing.note = clean(patch.note, 4000);
  if (patch.company !== undefined) existing.company = clean(patch.company, 200);
  if (patch.contactName !== undefined) {
    existing.contactName = clean(patch.contactName, 160);
  }
  if (patch.contactEmail !== undefined) {
    existing.contactEmail = clean(patch.contactEmail, 200);
  }
  if (patch.clientRccm !== undefined) {
    existing.clientRccm = clean(patch.clientRccm, 80);
  }
  if (patch.clientRepName !== undefined) {
    existing.clientRepName = clean(patch.clientRepName, 160);
  }
  if (patch.clientRepTitle !== undefined) {
    existing.clientRepTitle = clean(patch.clientRepTitle, 120);
  }
  if (patch.necsRepName !== undefined) {
    existing.necsRepName = clean(patch.necsRepName, 160) || DEFAULT_NECS_REP_NAME;
  }
  if (patch.necsRepTitle !== undefined) {
    existing.necsRepTitle =
      clean(patch.necsRepTitle, 160) || DEFAULT_NECS_REP_TITLE;
  }
  if (patch.object !== undefined) {
    existing.object = clean(patch.object, 2000) || DEFAULT_CONTRACT_OBJECT;
  }
  if (patch.perimeter !== undefined) {
    existing.perimeter = clean(patch.perimeter, 4000);
  }
  if (patch.obligations !== undefined) {
    existing.obligations =
      clean(patch.obligations, 4000) || DEFAULT_CONTRACT_OBLIGATIONS;
  }
  if (patch.pricingTerms !== undefined) {
    existing.pricingTerms = clean(patch.pricingTerms, 4000);
  }
  if (patch.billingTerms !== undefined) {
    existing.billingTerms =
      clean(patch.billingTerms, 4000) || DEFAULT_CONTRACT_BILLING;
  }
  if (patch.terminationTerms !== undefined) {
    existing.terminationTerms =
      clean(patch.terminationTerms, 4000) || DEFAULT_CONTRACT_TERMINATION;
  }
  if (patch.bcRef !== undefined) existing.bcRef = clean(patch.bcRef, 120);
  if (patch.contractVersion !== undefined) {
    existing.contractVersion =
      clean(patch.contractVersion, 40) || DEFAULT_CONTRACT_VERSION;
  }
  if (patch.signaturePlace !== undefined) {
    existing.signaturePlace =
      clean(patch.signaturePlace, 120) || DEFAULT_SIGNATURE_PLACE;
  }
  if (patch.indexation !== undefined) {
    existing.indexation =
      clean(patch.indexation, 400) || DEFAULT_CONTRACT_INDEXATION;
  }
  if (patch.deposit !== undefined) {
    existing.deposit = clean(patch.deposit, 200) || DEFAULT_CONTRACT_DEPOSIT;
  }
  if (patch.penalties !== undefined) {
    existing.penalties =
      clean(patch.penalties, 2000) || DEFAULT_CONTRACT_PENALTIES;
  }
  if (patch.frequency !== undefined) {
    existing.frequency = isNeedFrequency(patch.frequency) ? patch.frequency : "";
  }
  if (patch.serviceLevel !== undefined) {
    existing.serviceLevel = isServiceLevel(patch.serviceLevel)
      ? patch.serviceLevel
      : "";
  }
  if (patch.sites) existing.sites = patch.sites.map(normalizeSite);
  if (patch.tariffs) {
    existing.tariffs = patch.tariffs.map(normalizeTariff);
    existing.monthlyAmount = computeMonthlyAmount(existing.tariffs);
  }
  if (patch.prestations) {
    existing.prestations = patch.prestations.map(normalizePrestation);
  }
  if (patch.milestones) {
    existing.milestones = patch.milestones.map(normalizeMilestone);
  }
  if (patch.signatures) {
    existing.signatures = coerceSignatures(
      patch.signatures,
      existing.clientRepName || existing.contactName,
    );
  }

  existing.history = [
    hist(actor, "Contrat mis à jour"),
    ...existing.history,
  ].slice(0, 80);

  return save(existing);
}

/** Enregistre la signature d’une partie (client ou NECS). */
export async function signServiceContract(
  id: string,
  input: {
    role: ContractSignatureRole;
    name?: string;
    title?: string;
  },
  actor: Actor,
): Promise<Contract> {
  const existing = await getContract(id);
  if (!existing) throw new Error("Contrat introuvable.");
  if (existing.status === "resilie" || existing.status === "expire") {
    throw new Error("Contrat non signable dans cet état.");
  }
  const role = input.role === "necs" ? "necs" : "client";
  const stamp = nowIso();
  existing.signatures = existing.signatures.map((s) => {
    if (s.role !== role) return s;
    return {
      ...s,
      name: clean(input.name, 160) || s.name || actor.name,
      title: clean(input.title, 160) || s.title,
      signed: true,
      signedAt: stamp,
    };
  });
  const allSigned = existing.signatures.every((s) => s.signed);
  if (allSigned) existing.signedAt = stamp;
  existing.history = [
    hist(
      actor,
      `Signature ${role === "client" ? "client" : "NECS"}${allSigned ? " · contrat signé des deux parts" : ""}`,
    ),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function submitContractForReview(
  id: string,
  actor: Actor,
): Promise<Contract> {
  const existing = await getContract(id);
  if (!existing) throw new Error("Contrat introuvable.");
  if (existing.status !== "brouillon") {
    throw new Error("Seul un brouillon peut être soumis en revue.");
  }
  const ready = serviceContractReady(existing);
  if (!ready.ok) {
    throw new Error(`Champs manquants : ${ready.missing.join(", ")}`);
  }
  existing.status = "en_revue";
  existing.history = [
    hist(actor, "Soumis en revue juridique"),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function activateContract(
  id: string,
  actor: Actor,
): Promise<Contract> {
  const existing = await getContract(id);
  if (!existing) throw new Error("Contrat introuvable.");
  if (existing.status !== "brouillon" && existing.status !== "en_revue") {
    throw new Error("Seul un brouillon ou un contrat en revue peut être activé.");
  }
  if (!existing.sites.length) throw new Error("Au moins un site requis.");
  if (!existing.startAt) throw new Error("Date de début requise.");
  if (!contractFullySigned(existing)) {
    throw new Error(
      "Signatures client et NECS requises avant activation du contrat.",
    );
  }

  const stamp = nowIso();
  existing.status = "actif";
  existing.activatedAt = stamp;
  existing.history = [
    hist(
      actor,
      `Contrat activé · exploitable OPS / Finance · ${existing.ref}`,
    ),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function createAmendment(
  id: string,
  input: {
    reason: string;
    effectiveAt?: string;
    modificationType?: ContractAmendmentModType;
    impactFinancial?: number;
    sla?: ContractSla;
    endAt?: string | null;
    durationMonths?: number;
    staffCount?: number;
    perimeter?: string;
    sites?: Partial<ContractSite>[];
    tariffs?: Partial<ContractTariffLine>[];
    prestations?: Partial<ContractPrestationLine>[];
  },
  actor: Actor,
): Promise<Contract> {
  const existing = await getContract(id);
  if (!existing) throw new Error("Contrat introuvable.");
  if (existing.status !== "actif") {
    throw new Error("Les avenants s’appliquent aux contrats actifs.");
  }
  const reason = clean(input.reason, 500);
  if (!reason) throw new Error("Motif d’avenant obligatoire.");

  const maxNum = existing.amendments.reduce(
    (m, a) => Math.max(m, a.number),
    0,
  );
  const number = maxNum + 1;
  const before = {
    monthlyAmount: existing.monthlyAmount,
    sla: existing.sla,
    endAt: existing.endAt,
    durationMonths: existing.durationMonths,
    staffCount: existing.staffCount,
    perimeter: existing.perimeter,
    sites: existing.sites.map((s) => ({ ...s })),
    tariffs: existing.tariffs.map((t) => ({ ...t })),
    prestations: existing.prestations.map((p) => ({ ...p })),
  };

  const changes: string[] = [];
  const touched = new Set<ContractAmendmentModType>();

  if (input.sla && isContractSla(input.sla) && input.sla !== existing.sla) {
    existing.sla = input.sla;
    changes.push(`SLA → ${input.sla}`);
    touched.add("mixte");
  }
  if (input.perimeter !== undefined) {
    const next = clean(input.perimeter, 4000);
    if (next !== existing.perimeter) {
      existing.perimeter = next;
      changes.push("périmètre modifié");
      touched.add("perimetre");
    }
  }
  if (input.endAt !== undefined) {
    existing.endAt =
      input.endAt === null || input.endAt === ""
        ? null
        : clean(input.endAt, 40);
    changes.push(`fin → ${existing.endAt || "ouverte"}`);
    touched.add("duree");
  }
  if (input.durationMonths !== undefined) {
    const months = Math.max(1, Number(input.durationMonths) || 12);
    if (months !== existing.durationMonths) {
      existing.durationMonths = months;
      if (existing.startAt) {
        existing.endAt = addMonthsIso(existing.startAt, months);
      }
      changes.push(`durée → ${months} mois`);
      touched.add("duree");
    }
  }
  if (input.staffCount !== undefined) {
    const next = Math.max(0, Number(input.staffCount) || 0);
    if (next !== existing.staffCount) {
      existing.staffCount = next;
      changes.push(`effectif → ${existing.staffCount}`);
      touched.add("effectifs");
    }
  }
  if (input.sites) {
    existing.sites = input.sites.map(normalizeSite);
    changes.push(`${existing.sites.length} site(s)`);
    touched.add("perimetre");
  }
  if (input.tariffs) {
    existing.tariffs = input.tariffs.map(normalizeTariff);
    existing.monthlyAmount = computeMonthlyAmount(existing.tariffs);
    changes.push(
      `tarifs → ${existing.monthlyAmount.toLocaleString("fr-FR")} FCFA/mois`,
    );
    touched.add("tarif");
  }
  if (input.prestations) {
    existing.prestations = input.prestations.map(normalizePrestation);
    changes.push(`${existing.prestations.length} prestation(s)`);
    touched.add("prestations");
  }

  if (!changes.length) {
    throw new Error("Aucune modification dans l’avenant.");
  }

  let modificationType: ContractAmendmentModType =
    input.modificationType && isContractAmendmentModType(input.modificationType)
      ? input.modificationType
      : "mixte";
  if (!input.modificationType) {
    const concrete = [...touched].filter((t) => t !== "mixte");
    modificationType =
      concrete.length === 1 ? concrete[0]! : concrete.length > 1 ? "mixte" : "mixte";
  }

  const impactFinancial =
    input.impactFinancial !== undefined
      ? Number(input.impactFinancial) || 0
      : roundMoney(existing.monthlyAmount - before.monthlyAmount);

  const amendment: ContractAmendment = {
    id: `AVN-${randomUUID().slice(0, 8).toUpperCase()}`,
    number,
    contractRef: existing.ref,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    reason,
    effectiveAt: input.effectiveAt
      ? clean(input.effectiveAt, 40)
      : nowIso().slice(0, 10) + "T00:00:00.000Z",
    modificationType,
    impactFinancial,
    changes: changes.join(" · "),
    snapshot: before,
  };

  existing.amendments = [amendment, ...existing.amendments].slice(0, 40);
  existing.history = [
    hist(
      actor,
      `Avenant n°${String(number).padStart(2, "0")} · ${existing.ref} · ${CONTRACT_AMENDMENT_MOD_LABELS[modificationType]} · ${reason} · ${amendment.changes}`,
    ),
    ...existing.history,
  ].slice(0, 80);

  return save(existing);
}

export async function toggleMilestone(
  id: string,
  milestoneId: string,
  done: boolean,
  actor: Actor,
): Promise<Contract> {
  const existing = await getContract(id);
  if (!existing) throw new Error("Contrat introuvable.");
  existing.milestones = existing.milestones.map((m) =>
    m.id === milestoneId
      ? {
          ...m,
          done,
          doneAt: done ? nowIso() : null,
        }
      : m,
  );
  existing.history = [
    hist(
      actor,
      `Échéance ${milestoneId} → ${done ? "faite" : "à faire"}`,
    ),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function setContractStatus(
  id: string,
  status: ContractStatus,
  actor: Actor,
): Promise<Contract> {
  if (!isContractStatus(status)) throw new Error("Statut invalide.");
  const existing = await getContract(id);
  if (!existing) throw new Error("Contrat introuvable.");
  if (status === "brouillon") throw new Error("Retour brouillon interdit.");
  if (status === "actif") {
    if (existing.status !== "suspendu") {
      throw new Error(
        "Utilisez l’action d’activation pour passer un brouillon / revue à actif.",
      );
    }
  }
  if (status === "en_revue") {
    if (existing.status !== "brouillon") {
      throw new Error("Seul un brouillon peut passer en revue.");
    }
  }
  existing.status = status;
  existing.history = [
    hist(actor, `Statut → ${status}`),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export function contractOpsFinanceView(contract: Contract) {
  return {
    ref: contract.ref,
    company: contract.company,
    status: contract.status,
    sla: contract.sla,
    startAt: contract.startAt,
    endAt: contract.endAt,
    monthlyAmount: contract.monthlyAmount,
    sites: contract.sites.filter((s) => s.active),
    tariffs: contract.tariffs,
    milestones: contract.milestones,
    frequency: contract.frequency,
    staffCount: contract.staffCount,
    source: contract.sourceSnapshot,
    noResaisie: assertNoResaisie(contract),
  };
}
