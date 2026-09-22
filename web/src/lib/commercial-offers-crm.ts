import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  isNeedFrequency,
  isPrestationKind,
  isServiceLevel,
  type NeedFrequency,
  type PrestationKind,
  type ServiceLevel,
} from "@/lib/need-qualification-shared";
import {
  computeOfferTotal,
  DEFAULT_OFFER_ARGUMENTS,
  DEFAULT_OFFER_CONDITIONS,
  DEFAULT_OFFER_MEANS,
  DEFAULT_OFFER_METHODOLOGY,
  DEFAULT_OFFER_PLANNING,
  DEFAULT_OFFER_TEAM,
  DEFAULT_OFFER_TITLE,
  isCommercialOfferStatus,
  makeOfferLine,
  offerExpiryDate,
  offerReadyToSend,
  type CommercialOffer,
  type CommercialOfferHistoryEntry,
  type CommercialOfferLine,
  type CommercialOfferStatus,
} from "@/lib/commercial-offers-shared";
import { getOpportunity, listOpportunities } from "@/lib/need-qualification-crm";
import { getQuote, listQuotes } from "@/lib/quotes-crm";
import {
  FREQUENCY_LABELS,
  type CleaningNeed,
} from "@/lib/need-qualification-shared";
import { getProspect } from "@/lib/prospects-crm";

const COLLECTION = "crm_commercial_offers";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string): CommercialOfferHistoryEntry {
  return {
    id: `OFH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

async function col() {
  const db = await getDb();
  const c = db.collection<CommercialOffer>(COLLECTION);
  void Promise.all([
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ ref: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ opportunityId: 1 }).catch(() => undefined),
    c.createIndex({ quoteId: 1 }).catch(() => undefined),
    c.createIndex({ ownerEmail: 1, status: 1 }).catch(() => undefined),
  ]);
  return c;
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

function normalizeLine(
  raw: Partial<CommercialOfferLine> | Record<string, unknown>,
): CommercialOfferLine {
  return makeOfferLine({
    id: clean(raw.id, 40) || undefined,
    label: clean(raw.label, 240) || "Prestation",
    frequency: clean(raw.frequency, 80),
    staffCount: Number(raw.staffCount) || 0,
    amountMonthlyHT: Number(raw.amountMonthlyHT) || 0,
  });
}

function coerceOffer(raw: Record<string, unknown>): CommercialOffer {
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map((l) =>
        normalizeLine(l as Partial<CommercialOfferLine>),
      )
    : [];
  const status = isCommercialOfferStatus(raw.status)
    ? raw.status
    : "brouillon";
  const confidentiality =
    raw.confidentiality === "interne" ||
    raw.confidentiality === "public_client"
      ? raw.confidentiality
      : "confidentiel";
  const offerDate = clean(raw.offerDate, 10);
  const validityDays = Math.max(1, Math.round(Number(raw.validityDays) || 30));

  return {
    id: clean(raw.id, 40) || `OFF-${randomUUID().slice(0, 8).toUpperCase()}`,
    ref: clean(raw.ref, 40) || "NECS-OFF-0000",
    title: clean(raw.title, 200) || DEFAULT_OFFER_TITLE,
    status,
    company: clean(raw.company, 180),
    site: clean(raw.site, 160),
    contactName: clean(raw.contactName, 120),
    contactPhone: clean(raw.contactPhone, 40),
    contactEmail: clean(raw.contactEmail, 180).toLowerCase(),
    opportunityId: clean(raw.opportunityId, 40),
    quoteId: clean(raw.quoteId, 40),
    visitId: clean(raw.visitId, 40),
    prospectId: clean(raw.prospectId, 40),
    premisesKind: isPrestationKind(raw.premisesKind) ? raw.premisesKind : "",
    surfaceM2: Math.max(0, Number(raw.surfaceM2) || 0),
    frequency: isNeedFrequency(raw.frequency) ? raw.frequency : "",
    serviceLevel: isServiceLevel(raw.serviceLevel) ? raw.serviceLevel : "",
    validityDays,
    offerDate,
    startDate: clean(raw.startDate, 10),
    needSummary: clean(raw.needSummary, 4000),
    zones: clean(raw.zones, 2000),
    constraints: clean(raw.constraints, 2000),
    prestationsSummary: clean(raw.prestationsSummary, 4000),
    methodology: clean(raw.methodology, 4000) || DEFAULT_OFFER_METHODOLOGY,
    means: clean(raw.means, 4000) || DEFAULT_OFFER_MEANS,
    arguments: clean(raw.arguments, 4000) || DEFAULT_OFFER_ARGUMENTS,
    teamDetail: clean(raw.teamDetail, 2000) || DEFAULT_OFFER_TEAM,
    supervision: clean(raw.supervision, 240),
    digitalPilotage: clean(raw.digitalPilotage, 240),
    indicativePlanning:
      clean(raw.indicativePlanning, 4000) || DEFAULT_OFFER_PLANNING,
    conditions: clean(raw.conditions, 4000) || DEFAULT_OFFER_CONDITIONS,
    confidentiality,
    lines,
    totalMonthlyHT: computeOfferTotal(lines),
    note: clean(raw.note, 2000),
    rejectionReason: clean(raw.rejectionReason, 800),
    history: Array.isArray(raw.history)
      ? (raw.history as CommercialOfferHistoryEntry[])
      : [],
    sentAt:
      typeof raw.sentAt === "string" && raw.sentAt ? raw.sentAt : null,
    acceptedAt:
      typeof raw.acceptedAt === "string" && raw.acceptedAt
        ? raw.acceptedAt
        : null,
    expiresAt:
      typeof raw.expiresAt === "string" && raw.expiresAt
        ? raw.expiresAt
        : offerExpiryDate(offerDate, validityDays),
    createdAt: clean(raw.createdAt, 40) || nowIso(),
    updatedAt: clean(raw.updatedAt, 40) || nowIso(),
    createdBy: clean(raw.createdBy, 80),
    createdByName: clean(raw.createdByName, 120),
    ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
    ownerName: clean(raw.ownerName, 120),
  };
}

async function save(doc: CommercialOffer): Promise<CommercialOffer> {
  const next: CommercialOffer = {
    ...doc,
    totalMonthlyHT: computeOfferTotal(doc.lines),
    expiresAt: offerExpiryDate(doc.offerDate, doc.validityDays),
    updatedAt: nowIso(),
  };
  const c = await col();
  await c.replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

async function nextRef(): Promise<string> {
  const c = await col();
  const count = await c.countDocuments();
  return `NECS-OFF-${String(count + 1).padStart(4, "0")}`;
}

async function ensureDemoSeed(actor: Actor): Promise<void> {
  const c = await col();
  const count = await c.countDocuments();
  if (count > 0) return;

  const now = Date.now();
  const day = (offset: number) =>
    new Date(now + offset * 86_400_000).toISOString().slice(0, 10);

  const seeds: CommercialOffer[] = [
    {
      id: `OFF-${randomUUID().slice(0, 8).toUpperCase()}`,
      ref: "NECS-OFF-0001",
      title: "Proposition de services — Bureaux Premium Horizon",
      status: "brouillon",
      company: "Société Horizon SA",
      site: "Immeuble Horizon — Akwa",
      contactName: "Aïcha Nkomo",
      contactPhone: "+237 6 90 11 22 33",
      contactEmail: "a.nkomo@horizon.cm",
      opportunityId: "",
      quoteId: "",
      visitId: "",
      prospectId: "",
      premisesKind: "bureaux",
      surfaceM2: 2200,
      frequency: "5j_semaine",
      serviceLevel: "premium",
      validityDays: 30,
      offerDate: day(-3),
      startDate: day(14),
      needSummary:
        "Locaux tertiaires à fréquentation élevée ; entretien quotidien fiable, hygiène sanitaires et reporting qualité transparent.",
      zones: "Bureaux, circulations, sanitaires, salles de réunion, accueil.",
      constraints: "Accès 6h–8h · badge site",
      prestationsSummary:
        "Entretien quotidien, sanitaires, vitrerie intérieure, consommables.",
      methodology:
        "1) Diagnostic & cadrage · 2) Organisation opérationnelle · 3) Exécution & preuves · 4) Amélioration continue.",
      means:
        "Autolaveuses, aspirateurs HEPA, chariots, consommables écolabel, EPI.",
      arguments:
        "Qualité mesurable · Équipes formées · Digitalisation bout-en-bout · Interlocuteur unique.",
      teamDetail: "3 agents + 1 chef d’équipe partagé",
      supervision: "Visites terrain + contrôles qualité périodiques",
      digitalPilotage: "Plateforme NECS (pointage, OT, preuves)",
      indicativePlanning:
        "S+0 cadrage · S+1 démarrage · contrôles J+7 / J+30 · revue mensuelle.",
      conditions: DEFAULT_OFFER_CONDITIONS,
      confidentiality: "confidentiel",
      lines: [
        makeOfferLine({
          label: "Entretien quotidien bureaux & circulations",
          frequency: "5 j / sem",
          staffCount: 3,
          amountMonthlyHT: 550_000,
        }),
        makeOfferLine({
          label: "Entretien & désinfection sanitaires",
          frequency: "5 j / sem",
          staffCount: 1,
          amountMonthlyHT: 187_000,
        }),
        makeOfferLine({
          label: "Vitrerie intérieure",
          frequency: "Mensuel",
          staffCount: 2,
          amountMonthlyHT: 85_000,
        }),
        makeOfferLine({
          label: "Consommables standards",
          frequency: "Mensuel",
          staffCount: 0,
          amountMonthlyHT: 75_000,
        }),
      ],
      totalMonthlyHT: 0,
      note: "Offre démo · brouillon",
      rejectionReason: "",
      history: [hist(actor, "Offre démo créée · brouillon")],
      sentAt: null,
      acceptedAt: null,
      expiresAt: null,
      createdAt: new Date(now - 3 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 3_600_000).toISOString(),
      createdBy: actor.userId,
      createdByName: actor.name,
      ownerEmail: actor.email.toLowerCase(),
      ownerName: actor.name,
    },
    {
      id: `OFF-${randomUUID().slice(0, 8).toUpperCase()}`,
      ref: "NECS-OFF-0002",
      title: "Proposition de services — Mall Riviera Premium",
      status: "envoyee",
      company: "Mall Riviera",
      site: "Mall Riviera — Douala",
      contactName: "Sarah Essomba",
      contactPhone: "+237 6 55 88 99 00",
      contactEmail: "s.essomba@riviera.cm",
      opportunityId: "",
      quoteId: "",
      visitId: "",
      prospectId: "",
      premisesKind: "commerces",
      surfaceM2: 4800,
      frequency: "quotidienne",
      serviceLevel: "premium",
      validityDays: 21,
      offerDate: day(-10),
      startDate: day(5),
      needSummary:
        "Galerie commerciale : parties communes, sanitaires public, vitrerie et horaires étendus.",
      zones: "Allées, sanitaires, parking intérieur, vitrines communes.",
      constraints: "Intervention hors heures d’ouverture magasin",
      prestationsSummary:
        "Parties communes, sanitaires publics, vitrerie & mise en valeur.",
      methodology:
        "Organisation en 2 équipes (matin / soir) avec reporting digital quotidien.",
      means: "Machines haute capacité, kits sanitaires, signalétique chantier.",
      arguments: "Réactivité 24/7 · SLA Premium · preuves photo",
      teamDetail: "6 agents + 1 superviseur",
      supervision: "Contrôles aléatoires + score qualité hebdo",
      digitalPilotage: "NECS Ops + alertes NC",
      indicativePlanning:
        "Démarrage sous 5 jours · montée en charge S1 · revue qualité hebdo.",
      conditions: DEFAULT_OFFER_CONDITIONS,
      confidentiality: "confidentiel",
      lines: [
        makeOfferLine({
          label: "Entretien parties communes",
          frequency: "7 j / 7",
          staffCount: 4,
          amountMonthlyHT: 1_400_000,
        }),
        makeOfferLine({
          label: "Sanitaires publics",
          frequency: "7 j / 7",
          staffCount: 2,
          amountMonthlyHT: 520_000,
        }),
        makeOfferLine({
          label: "Vitrerie & mise en valeur",
          frequency: "Hebdo",
          staffCount: 2,
          amountMonthlyHT: 180_000,
        }),
      ],
      totalMonthlyHT: 0,
      note: "",
      rejectionReason: "",
      history: [
        hist(actor, "Offre démo créée"),
        hist(actor, "Envoyée au client"),
      ],
      sentAt: new Date(now - 8 * 86_400_000).toISOString(),
      acceptedAt: null,
      expiresAt: null,
      createdAt: new Date(now - 12 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 8 * 86_400_000).toISOString(),
      createdBy: actor.userId,
      createdByName: actor.name,
      ownerEmail: actor.email.toLowerCase(),
      ownerName: actor.name,
    },
    {
      id: `OFF-${randomUUID().slice(0, 8).toUpperCase()}`,
      ref: "NECS-OFF-0003",
      title: "Proposition de services — Usine Bassa",
      status: "acceptee",
      company: "Usine Bassa Industries",
      site: "Usine Bassa",
      contactName: "Paul Mbarga",
      contactPhone: "+237 6 77 44 55 66",
      contactEmail: "p.mbarga@bassa.cm",
      opportunityId: "",
      quoteId: "",
      visitId: "",
      prospectId: "",
      premisesKind: "industriel",
      surfaceM2: 6500,
      frequency: "5j_semaine",
      serviceLevel: "renforce",
      validityDays: 45,
      offerDate: day(-40),
      startDate: day(-20),
      needSummary:
        "Ateliers industriels : sols techniques, vestiaires, zones production hors lignes actives.",
      zones: "Ateliers, vestiaires, bureaux annexes, sanitaires.",
      constraints: "EPI obligatoires · consignes sécurité usine",
      prestationsSummary: "Nettoyage industriel ateliers & annexes.",
      methodology: "Équipe dédiée + check-list sécurité avant chaque vacation.",
      means: "Matériel industriel, aspirateurs zone ATEX si requis, EPI renforcés.",
      arguments: "Expérience industrie · traçabilité · réactivité incidents",
      teamDetail: "5 agents spécialisés",
      supervision: "Manager ops hebdomadaire",
      digitalPilotage: "NECS pointage + OT",
      indicativePlanning:
        "Brief sécurité J0 · démarrage J+2 · audit qualité mensuel.",
      conditions: DEFAULT_OFFER_CONDITIONS,
      confidentiality: "interne",
      lines: [
        makeOfferLine({
          label: "Nettoyage industriel ateliers",
          frequency: "5 j / sem",
          staffCount: 5,
          amountMonthlyHT: 980_000,
        }),
      ],
      totalMonthlyHT: 0,
      note: "Prête à convertir en devis / BC",
      rejectionReason: "",
      history: [
        hist(actor, "Offre créée"),
        hist(actor, "Envoyée"),
        hist(actor, "Acceptée par le client"),
      ],
      sentAt: new Date(now - 35 * 86_400_000).toISOString(),
      acceptedAt: new Date(now - 28 * 86_400_000).toISOString(),
      expiresAt: null,
      createdAt: new Date(now - 40 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 28 * 86_400_000).toISOString(),
      createdBy: actor.userId,
      createdByName: actor.name,
      ownerEmail: actor.email.toLowerCase(),
      ownerName: actor.name,
    },
  ];

  for (const s of seeds) {
    s.totalMonthlyHT = computeOfferTotal(s.lines);
    s.expiresAt = offerExpiryDate(s.offerDate, s.validityDays);
  }
  await c.insertMany(seeds);
}

export async function listCommercialOffers(
  actor: Actor,
): Promise<CommercialOffer[]> {
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
  return rows.map((r) =>
    coerceOffer(stripMongo(r) as Record<string, unknown>),
  );
}

export async function getCommercialOffer(
  id: string,
): Promise<CommercialOffer | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerceOffer(stripMongo(row) as Record<string, unknown>);
}

export type CommercialOfferInput = {
  title?: string;
  company: string;
  site?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  opportunityId?: string;
  quoteId?: string;
  visitId?: string;
  prospectId?: string;
  premisesKind?: PrestationKind | "";
  surfaceM2?: number;
  frequency?: NeedFrequency | "";
  serviceLevel?: ServiceLevel | "";
  validityDays?: number;
  offerDate?: string;
  startDate?: string;
  needSummary?: string;
  zones?: string;
  constraints?: string;
  prestationsSummary?: string;
  methodology?: string;
  means?: string;
  arguments?: string;
  teamDetail?: string;
  supervision?: string;
  digitalPilotage?: string;
  indicativePlanning?: string;
  conditions?: string;
  confidentiality?: CommercialOffer["confidentiality"];
  note?: string;
  lines?: Array<Partial<CommercialOfferLine>>;
};

export async function createCommercialOffer(
  input: CommercialOfferInput,
  actor: Actor,
): Promise<CommercialOffer> {
  const company = clean(input.company, 180);
  if (!company) throw new Error("Client / prospect requis");

  const offerDate = clean(input.offerDate, 10) || nowIso().slice(0, 10);
  const validityDays = Math.max(1, Math.round(Number(input.validityDays) || 30));
  const lines = (input.lines || []).map((l) => normalizeLine(l));
  if (lines.length === 0) {
    lines.push(
      makeOfferLine({
        label: "Prestation à préciser",
        frequency: "",
        staffCount: 0,
        amountMonthlyHT: 0,
      }),
    );
  }

  const ref = await nextRef();
  const now = nowIso();
  const doc: CommercialOffer = {
    id: `OFF-${randomUUID().slice(0, 8).toUpperCase()}`,
    ref,
    title: clean(input.title, 200) || DEFAULT_OFFER_TITLE,
    status: "brouillon",
    company,
    site: clean(input.site, 160),
    contactName: clean(input.contactName, 120),
    contactPhone: clean(input.contactPhone, 40),
    contactEmail: clean(input.contactEmail, 180).toLowerCase(),
    opportunityId: clean(input.opportunityId, 40),
    quoteId: clean(input.quoteId, 40),
    visitId: clean(input.visitId, 40),
    prospectId: clean(input.prospectId, 40),
    premisesKind: isPrestationKind(input.premisesKind)
      ? input.premisesKind
      : "",
    surfaceM2: Math.max(0, Number(input.surfaceM2) || 0),
    frequency: isNeedFrequency(input.frequency) ? input.frequency : "",
    serviceLevel: isServiceLevel(input.serviceLevel) ? input.serviceLevel : "",
    validityDays,
    offerDate,
    startDate: clean(input.startDate, 10),
    needSummary:
      clean(input.needSummary, 4000) ||
      "Locaux à cadrer ; entretien fiable et reporting qualité.",
    zones: clean(input.zones, 2000),
    constraints: clean(input.constraints, 2000),
    prestationsSummary: clean(input.prestationsSummary, 4000),
    methodology: clean(input.methodology, 4000) || DEFAULT_OFFER_METHODOLOGY,
    means: clean(input.means, 4000) || DEFAULT_OFFER_MEANS,
    arguments: clean(input.arguments, 4000) || DEFAULT_OFFER_ARGUMENTS,
    teamDetail: clean(input.teamDetail, 2000) || DEFAULT_OFFER_TEAM,
    supervision:
      clean(input.supervision, 240) ||
      "Visites terrain + contrôles qualité périodiques",
    digitalPilotage:
      clean(input.digitalPilotage, 240) ||
      "Plateforme NECS (pointage, OT, preuves)",
    indicativePlanning:
      clean(input.indicativePlanning, 4000) || DEFAULT_OFFER_PLANNING,
    conditions: clean(input.conditions, 4000) || DEFAULT_OFFER_CONDITIONS,
    confidentiality:
      input.confidentiality === "interne" ||
      input.confidentiality === "public_client"
        ? input.confidentiality
        : "confidentiel",
    lines,
    totalMonthlyHT: computeOfferTotal(lines),
    note: clean(input.note, 2000),
    rejectionReason: "",
    history: [hist(actor, `Offre créée · ${company}`)],
    sentAt: null,
    acceptedAt: null,
    expiresAt: offerExpiryDate(offerDate, validityDays),
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };

  return save(doc);
}

export async function updateCommercialOfferDraft(
  id: string,
  patch: CommercialOfferInput,
  actor: Actor,
): Promise<CommercialOffer> {
  const existing = await getCommercialOffer(id);
  if (!existing) throw new Error("Offre introuvable");
  if (
    existing.status !== "brouillon" &&
    existing.status !== "en_revue" &&
    existing.status !== "refusee"
  ) {
    throw new Error("Cette offre ne peut plus être modifiée librement");
  }

  const lines = Array.isArray(patch.lines)
    ? patch.lines.map((l) => normalizeLine(l))
    : existing.lines;
  const offerDate =
    patch.offerDate !== undefined
      ? clean(patch.offerDate, 10)
      : existing.offerDate;
  const validityDays =
    patch.validityDays !== undefined
      ? Math.max(1, Math.round(Number(patch.validityDays) || 30))
      : existing.validityDays;

  const next: CommercialOffer = {
    ...existing,
    title:
      patch.title !== undefined
        ? clean(patch.title, 200) || DEFAULT_OFFER_TITLE
        : existing.title,
    company:
      patch.company !== undefined
        ? clean(patch.company, 180) || existing.company
        : existing.company,
    site: patch.site !== undefined ? clean(patch.site, 160) : existing.site,
    contactName:
      patch.contactName !== undefined
        ? clean(patch.contactName, 120)
        : existing.contactName,
    contactPhone:
      patch.contactPhone !== undefined
        ? clean(patch.contactPhone, 40)
        : existing.contactPhone,
    contactEmail:
      patch.contactEmail !== undefined
        ? clean(patch.contactEmail, 180).toLowerCase()
        : existing.contactEmail,
    opportunityId:
      patch.opportunityId !== undefined
        ? clean(patch.opportunityId, 40)
        : existing.opportunityId,
    quoteId:
      patch.quoteId !== undefined
        ? clean(patch.quoteId, 40)
        : existing.quoteId,
    visitId:
      patch.visitId !== undefined
        ? clean(patch.visitId, 40)
        : existing.visitId,
    prospectId:
      patch.prospectId !== undefined
        ? clean(patch.prospectId, 40)
        : existing.prospectId,
    premisesKind: isPrestationKind(patch.premisesKind)
      ? patch.premisesKind
      : existing.premisesKind,
    surfaceM2:
      patch.surfaceM2 !== undefined
        ? Math.max(0, Number(patch.surfaceM2) || 0)
        : existing.surfaceM2,
    frequency: isNeedFrequency(patch.frequency)
      ? patch.frequency
      : existing.frequency,
    serviceLevel: isServiceLevel(patch.serviceLevel)
      ? patch.serviceLevel
      : existing.serviceLevel,
    validityDays,
    offerDate,
    startDate:
      patch.startDate !== undefined
        ? clean(patch.startDate, 10)
        : existing.startDate,
    needSummary:
      patch.needSummary !== undefined
        ? clean(patch.needSummary, 4000)
        : existing.needSummary,
    zones: patch.zones !== undefined ? clean(patch.zones, 2000) : existing.zones,
    constraints:
      patch.constraints !== undefined
        ? clean(patch.constraints, 2000)
        : existing.constraints,
    prestationsSummary:
      patch.prestationsSummary !== undefined
        ? clean(patch.prestationsSummary, 4000)
        : existing.prestationsSummary,
    methodology:
      patch.methodology !== undefined
        ? clean(patch.methodology, 4000)
        : existing.methodology,
    means:
      patch.means !== undefined ? clean(patch.means, 4000) : existing.means,
    arguments:
      patch.arguments !== undefined
        ? clean(patch.arguments, 4000)
        : existing.arguments,
    teamDetail:
      patch.teamDetail !== undefined
        ? clean(patch.teamDetail, 2000)
        : existing.teamDetail,
    supervision:
      patch.supervision !== undefined
        ? clean(patch.supervision, 240)
        : existing.supervision,
    digitalPilotage:
      patch.digitalPilotage !== undefined
        ? clean(patch.digitalPilotage, 240)
        : existing.digitalPilotage,
    indicativePlanning:
      patch.indicativePlanning !== undefined
        ? clean(patch.indicativePlanning, 4000)
        : existing.indicativePlanning,
    conditions:
      patch.conditions !== undefined
        ? clean(patch.conditions, 4000)
        : existing.conditions,
    confidentiality:
      patch.confidentiality === "interne" ||
      patch.confidentiality === "public_client" ||
      patch.confidentiality === "confidentiel"
        ? patch.confidentiality
        : existing.confidentiality,
    note: patch.note !== undefined ? clean(patch.note, 2000) : existing.note,
    lines,
    totalMonthlyHT: computeOfferTotal(lines),
    status: existing.status === "refusee" ? "brouillon" : existing.status,
    rejectionReason:
      existing.status === "refusee" ? "" : existing.rejectionReason,
    expiresAt: offerExpiryDate(offerDate, validityDays),
    history: [
      ...existing.history,
      hist(actor, "Offre mise à jour"),
    ].slice(-80),
  };

  return save(next);
}

function needToOfferFields(need: CleaningNeed) {
  const freqLabel = need.frequency ? FREQUENCY_LABELS[need.frequency] : "";
  return {
    premisesKind: need.prestation,
    surfaceM2: need.surfaceM2 ?? 0,
    frequency: need.frequency,
    serviceLevel: need.serviceLevel,
    zones: need.zones,
    constraints: [need.constraints, need.accessNotes, need.schedule]
      .filter(Boolean)
      .join(" · "),
    needSummary: [
      need.localType ? `Locaux : ${need.localType}` : "",
      need.zones ? `Zones : ${need.zones}` : "",
      freqLabel ? `Fréquence : ${freqLabel}` : "",
      need.staffEstimate
        ? `Effectif estimé : ${need.staffEstimate}`
        : "",
    ]
      .filter(Boolean)
      .join(". "),
    teamDetail: need.staffEstimate
      ? `${need.staffEstimate} agent(s) estimé(s) · supervision NECS`
      : DEFAULT_OFFER_TEAM,
    indicativePlanning: need.schedule
      ? `Horaires indicatifs : ${need.schedule}. ${DEFAULT_OFFER_PLANNING}`
      : DEFAULT_OFFER_PLANNING,
  };
}

/** Génère une proposition à partir d’une opportunité et/ou d’un chiffrage. */
export async function generateCommercialOfferFromSources(
  input: { opportunityId?: string; quoteId?: string },
  actor: Actor,
): Promise<CommercialOffer> {
  const quoteId = clean(input.quoteId, 40);
  const quote = quoteId ? await getQuote(quoteId) : null;
  if (quoteId && !quote) throw new Error("Devis / chiffrage introuvable");

  let opportunityId = clean(input.opportunityId, 40) || quote?.opportunityId || "";
  const opportunity = opportunityId
    ? await getOpportunity(opportunityId)
    : null;
  if (opportunityId && !opportunity) {
    throw new Error("Opportunité introuvable");
  }
  if (!opportunity && !quote) {
    throw new Error("Sélectionnez une opportunité et/ou un chiffrage");
  }

  if (!opportunityId && opportunity) opportunityId = opportunity.id;

  const prospectId =
    opportunity?.prospectId || quote?.prospectId || "";
  const prospect = prospectId ? await getProspect(prospectId) : null;

  const needFields = opportunity
    ? needToOfferFields(opportunity.need)
    : {
        premisesKind: "" as const,
        surfaceM2: quote?.surfaceM2 ?? 0,
        frequency: quote?.frequency ?? ("" as const),
        serviceLevel: quote?.serviceLevel ?? ("" as const),
        zones: "",
        constraints: "",
        needSummary: "",
        teamDetail: DEFAULT_OFFER_TEAM,
        indicativePlanning: DEFAULT_OFFER_PLANNING,
      };

  const lines =
    quote && quote.lines.length > 0
      ? quote.lines.map((l) =>
          makeOfferLine({
            label: l.label,
            frequency: quote.frequency
              ? FREQUENCY_LABELS[quote.frequency]
              : `${quote.monthlyVisits || "—"} visites / mois`,
            staffCount: quote.staffCount,
            amountMonthlyHT: l.amount,
          }),
        )
      : [
          makeOfferLine({
            label: "Prestation à préciser selon périmètre",
            frequency: needFields.frequency
              ? FREQUENCY_LABELS[needFields.frequency]
              : "",
            staffCount: opportunity?.need.staffEstimate ?? 0,
            amountMonthlyHT:
              opportunity?.valueEstimate || quote?.totals.totalHT || 0,
          }),
        ];

  const prestationsSummary = lines.map((l) => l.label).join(" · ");
  const company =
    opportunity?.company ||
    quote?.company ||
    prospect?.company ||
    "";
  if (!company) throw new Error("Client / prospect introuvable sur la source");

  const site =
    [prospect?.city, prospect?.address].filter(Boolean).join(" — ") ||
    opportunity?.need.localType ||
    "";
  const contactName =
    opportunity?.contactName ||
    prospect?.name ||
    prospect?.contacts.find((c) => c.isPrimary)?.name ||
    "";
  const contactEmail =
    opportunity?.contactEmail ||
    prospect?.email ||
    "";
  const contactPhone =
    prospect?.phone ||
    prospect?.contacts.find((c) => c.isPrimary)?.phone ||
    "";

  const title =
    opportunity?.title ||
    quote?.title ||
    `Proposition de services — ${company}`;

  const sourceBits = [
    opportunity ? `opportunité ${opportunity.id}` : "",
    quote ? `chiffrage ${quote.id}` : "",
  ]
    .filter(Boolean)
    .join(" + ");

  const item = await createCommercialOffer(
    {
      title,
      company,
      site,
      contactName,
      contactPhone,
      contactEmail,
      opportunityId: opportunity?.id || opportunityId,
      quoteId: quote?.id || "",
      visitId: quote?.visitId || "",
      prospectId,
      premisesKind:
        needFields.premisesKind ||
        quote?.prestation ||
        undefined,
      surfaceM2: needFields.surfaceM2 || quote?.surfaceM2 || 0,
      frequency: needFields.frequency || quote?.frequency || "",
      serviceLevel: needFields.serviceLevel || quote?.serviceLevel || "",
      validityDays: 30,
      needSummary:
        needFields.needSummary ||
        opportunity?.note ||
        quote?.note ||
        `Proposition générée depuis ${sourceBits}.`,
      zones: needFields.zones,
      constraints: needFields.constraints,
      prestationsSummary,
      methodology: DEFAULT_OFFER_METHODOLOGY,
      means: DEFAULT_OFFER_MEANS,
      arguments: DEFAULT_OFFER_ARGUMENTS,
      teamDetail: needFields.teamDetail,
      indicativePlanning: needFields.indicativePlanning,
      conditions: DEFAULT_OFFER_CONDITIONS,
      lines,
      note: `Générée automatiquement depuis ${sourceBits}.`,
    },
    actor,
  );

  const c = await col();
  const withHist: CommercialOffer = {
    ...item,
    history: [
      ...item.history,
      hist(actor, `Générée depuis ${sourceBits}`),
    ].slice(-80),
  };
  await c.replaceOne({ id: item.id }, withHist);
  return withHist;
}

/** Sources disponibles pour génération (opportunités + devis). */
export async function listOfferGenerationSources(actor: Actor) {
  const [opportunities, quotes] = await Promise.all([
    listOpportunities(actor),
    listQuotes(actor),
  ]);
  return {
    opportunities: opportunities
      .filter((o) => o.stage !== "perdu")
      .slice(0, 80)
      .map((o) => ({
        id: o.id,
        company: o.company,
        title: o.title,
        stage: o.stage,
        prospectId: o.prospectId,
        valueEstimate: o.valueEstimate,
        surfaceM2: o.need.surfaceM2,
        frequency: o.need.frequency,
        serviceLevel: o.need.serviceLevel,
      })),
    quotes: quotes
      .filter((q) => q.status !== "refuse")
      .slice(0, 80)
      .map((q) => ({
        id: q.id,
        company: q.company,
        title: q.title,
        status: q.status,
        opportunityId: q.opportunityId,
        prospectId: q.prospectId,
        visitId: q.visitId,
        totalHT: q.totals.totalHT,
        surfaceM2: q.surfaceM2,
        frequency: q.frequency,
        serviceLevel: q.serviceLevel,
        lineCount: q.lines.length,
      })),
  };
}

export async function submitOfferForReview(
  id: string,
  actor: Actor,
): Promise<CommercialOffer> {
  const existing = await getCommercialOffer(id);
  if (!existing) throw new Error("Offre introuvable");
  if (existing.status !== "brouillon" && existing.status !== "refusee") {
    throw new Error("Cette offre ne peut pas être soumise en revue");
  }
  const ready = offerReadyToSend(existing);
  if (!ready.ok) {
    throw new Error(`Incomplet : ${ready.missing.join(", ")}`);
  }
  return save({
    ...existing,
    status: "en_revue",
    rejectionReason: "",
    history: [
      ...existing.history,
      hist(actor, "Soumise en revue interne"),
    ].slice(-80),
  });
}

export async function markOfferSent(
  id: string,
  actor: Actor,
): Promise<CommercialOffer> {
  const existing = await getCommercialOffer(id);
  if (!existing) throw new Error("Offre introuvable");
  if (
    existing.status !== "en_revue" &&
    existing.status !== "brouillon" &&
    existing.status !== "negociation"
  ) {
    throw new Error("Statut incompatible avec l’envoi client");
  }
  const ready = offerReadyToSend(existing);
  if (!ready.ok) {
    throw new Error(`Incomplet : ${ready.missing.join(", ")}`);
  }
  return save({
    ...existing,
    status: "envoyee",
    sentAt: existing.sentAt || nowIso(),
    history: [
      ...existing.history,
      hist(actor, "Offre envoyée au client"),
    ].slice(-80),
  });
}

export async function markOfferNegotiation(
  id: string,
  actor: Actor,
): Promise<CommercialOffer> {
  const existing = await getCommercialOffer(id);
  if (!existing) throw new Error("Offre introuvable");
  if (existing.status !== "envoyee" && existing.status !== "negociation") {
    throw new Error("Passez l’offre en envoyée avant négociation");
  }
  return save({
    ...existing,
    status: "negociation",
    history: [
      ...existing.history,
      hist(actor, "Négociation ouverte"),
    ].slice(-80),
  });
}

export async function acceptCommercialOffer(
  id: string,
  actor: Actor,
): Promise<CommercialOffer> {
  const existing = await getCommercialOffer(id);
  if (!existing) throw new Error("Offre introuvable");
  if (
    existing.status !== "envoyee" &&
    existing.status !== "negociation"
  ) {
    throw new Error("Seule une offre envoyée / en négociation peut être acceptée");
  }
  return save({
    ...existing,
    status: "acceptee",
    acceptedAt: nowIso(),
    rejectionReason: "",
    history: [
      ...existing.history,
      hist(actor, "Offre acceptée — prête pour devis"),
    ].slice(-80),
  });
}

export async function rejectCommercialOffer(
  id: string,
  reason: string,
  actor: Actor,
): Promise<CommercialOffer> {
  const existing = await getCommercialOffer(id);
  if (!existing) throw new Error("Offre introuvable");
  if (
    existing.status !== "envoyee" &&
    existing.status !== "negociation" &&
    existing.status !== "en_revue"
  ) {
    throw new Error("Statut incompatible avec un refus");
  }
  const rejectionReason = clean(reason, 800) || "Refusée";
  return save({
    ...existing,
    status: "refusee",
    rejectionReason,
    history: [
      ...existing.history,
      hist(actor, `Refusée · ${rejectionReason}`),
    ].slice(-80),
  });
}

export async function expireStaleOffers(): Promise<number> {
  const c = await col();
  const today = nowIso().slice(0, 10);
  const rows = await c
    .find({
      status: { $in: ["envoyee", "negociation"] },
      expiresAt: { $lt: today, $ne: null },
    })
    .limit(100)
    .toArray();
  let n = 0;
  for (const row of rows) {
    const offer = coerceOffer(stripMongo(row) as Record<string, unknown>);
    await save({
      ...offer,
      status: "expiree",
      history: [
        ...offer.history,
        {
          id: `OFH-${randomUUID().slice(0, 8).toUpperCase()}`,
          at: nowIso(),
          by: "system",
          byName: "Système",
          detail: "Offre expirée (validité dépassée)",
        },
      ].slice(-80),
    });
    n += 1;
  }
  return n;
}

export async function setCommercialOfferStatus(
  id: string,
  status: CommercialOfferStatus,
  actor: Actor,
): Promise<CommercialOffer> {
  if (!isCommercialOfferStatus(status)) throw new Error("Statut invalide");
  const existing = await getCommercialOffer(id);
  if (!existing) throw new Error("Offre introuvable");
  return save({
    ...existing,
    status,
    history: [
      ...existing.history,
      hist(actor, `Statut → ${status}`),
    ].slice(-80),
  });
}
