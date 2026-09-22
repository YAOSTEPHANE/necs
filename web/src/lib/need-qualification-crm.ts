import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { getProspect } from "@/lib/prospects-crm";
import type { UserRole } from "@/lib/settings";
import {
  emptyCleaningNeed,
  isNeedFrequency,
  isOpportunityStage,
  isPrestationKind,
  isRelanceChannel,
  isServiceLevel,
  DEFAULT_PROBABILITY_BY_STAGE,
  clampProbability,
  validateCleaningNeed,
  type CleaningNeed,
  type CrmOpportunity,
  type NeedFieldKey,
  type OpportunityRelance,
  type OpportunityStage,
} from "@/lib/need-qualification-shared";

const COLLECTION = "crm_opportunities";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string) {
  return {
    id: `OH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

async function col() {
  const db = await getDb();
  const c = db.collection<CrmOpportunity>(COLLECTION);
  void Promise.all([
    c.createIndex({ prospectId: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ stage: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ contactEmail: 1 }).catch(() => undefined),
    c.createIndex({ updatedAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

function normalizeNeed(raw: Partial<CleaningNeed> | null | undefined): CleaningNeed {
  const base = emptyCleaningNeed();
  if (!raw) return base;
  const prestation = isPrestationKind(raw.prestation) ? raw.prestation : "";
  const frequency = isNeedFrequency(raw.frequency) ? raw.frequency : "";
  const serviceLevel = isServiceLevel(raw.serviceLevel) ? raw.serviceLevel : "";
  const surface =
    raw.surfaceM2 === null || raw.surfaceM2 === undefined
      ? null
      : Math.max(0, Number(raw.surfaceM2) || 0);
  const staff =
    raw.staffEstimate === null || raw.staffEstimate === undefined
      ? null
      : Math.max(0, Number(raw.staffEstimate) || 0);
  return {
    prestation,
    surfaceM2: surface && surface > 0 ? surface : null,
    localType: clean(raw.localType, 120),
    frequency,
    schedule: clean(raw.schedule, 200),
    constraints: clean(raw.constraints, 2000),
    serviceLevel,
    zones: clean(raw.zones, 500),
    accessNotes: clean(raw.accessNotes, 1000),
    staffEstimate: staff && staff > 0 ? staff : null,
  };
}

function normalizeRelances(raw: unknown): OpportunityRelance[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 80).map((r) => {
    const row = r as Partial<OpportunityRelance>;
    return {
      id: String(row.id ?? ""),
      at: String(row.at ?? ""),
      by: String(row.by ?? ""),
      byName: String(row.byName ?? ""),
      channel: isRelanceChannel(row.channel) ? row.channel : "autre",
      note: String(row.note ?? "").slice(0, 2000),
      nextAction: String(row.nextAction ?? "").slice(0, 400),
      dueAt: typeof row.dueAt === "string" && row.dueAt ? row.dueAt : null,
    };
  });
}

function coerceOpportunity(raw: Record<string, unknown>): CrmOpportunity {
  const need = normalizeNeed(
    (raw.need as Partial<CleaningNeed> | undefined) ?? emptyCleaningNeed(),
  );
  const validation = validateCleaningNeed(need);
  const stage = isOpportunityStage(raw.stage) ? raw.stage : "qualification";
  const defaultProb = DEFAULT_PROBABILITY_BY_STAGE[stage];
  const probability =
    raw.probability === undefined || raw.probability === null
      ? defaultProb
      : clampProbability(raw.probability);
  return {
    id: String(raw.id ?? ""),
    prospectId: String(raw.prospectId ?? ""),
    company: String(raw.company ?? raw.title ?? ""),
    contactName: String(raw.contactName ?? ""),
    contactEmail: String(raw.contactEmail ?? ""),
    title: String(raw.title ?? "Opportunité"),
    stage,
    need,
    needComplete: validation.ok,
    missingFields: validation.missing,
    valueEstimate: Math.max(0, Number(raw.valueEstimate ?? raw.amount) || 0),
    probability,
    nextAction: String(raw.nextAction ?? ""),
    dueAt: typeof raw.dueAt === "string" && raw.dueAt ? String(raw.dueAt) : null,
    lossReason: String(raw.lossReason ?? ""),
    lostAt: typeof raw.lostAt === "string" && raw.lostAt ? String(raw.lostAt) : null,
    relances: normalizeRelances(raw.relances),
    lastRelanceAt:
      typeof raw.lastRelanceAt === "string" && raw.lastRelanceAt
        ? String(raw.lastRelanceAt)
        : null,
    ownerEmail: String(raw.ownerEmail ?? ""),
    ownerName: String(raw.ownerName ?? ""),
    note: String(raw.note ?? raw.description ?? ""),
    history: Array.isArray(raw.history)
      ? (raw.history as CrmOpportunity["history"])
      : [],
    studyBlockedReason: validation.ok
      ? ""
      : `Données requises manquantes : ${validation.issues
          .map((i) => i.label)
          .join(", ")}`,
    advancedToStudyAt:
      typeof raw.advancedToStudyAt === "string" ? raw.advancedToStudyAt : null,
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
  };
}

function withNeedMeta(opp: CrmOpportunity): CrmOpportunity {
  const validation = validateCleaningNeed(opp.need);
  return {
    ...opp,
    needComplete: validation.ok,
    missingFields: validation.missing,
    studyBlockedReason: validation.ok
      ? ""
      : `Données requises manquantes : ${validation.issues
          .map((i) => i.label)
          .join(", ")}`,
  };
}

async function save(doc: CrmOpportunity): Promise<CrmOpportunity> {
  const next = withNeedMeta({ ...doc, updatedAt: nowIso() });
  const c = await col();
  await c.replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

export async function listOpportunities(actor: Actor): Promise<CrmOpportunity[]> {
  const c = await col();
  const filter =
    actor.role === "commercial"
      ? {
          $or: [
            { ownerEmail: actor.email.toLowerCase() },
            { ownerEmail: "" },
            { createdBy: actor.userId },
          ],
        }
      : {};
  const rows = await c.find(filter).sort({ updatedAt: -1 }).limit(400).toArray();
  return rows.map((r) =>
    withNeedMeta(coerceOpportunity(stripMongo(r) as Record<string, unknown>)),
  );
}

export async function getOpportunity(id: string): Promise<CrmOpportunity | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return withNeedMeta(
    coerceOpportunity(stripMongo(row) as Record<string, unknown>),
  );
}

export async function getOpportunityByProspect(
  prospectId: string,
): Promise<CrmOpportunity | null> {
  const c = await col();
  const row = await c
    .find({ prospectId })
    .sort({ updatedAt: -1 })
    .limit(1)
    .next();
  if (!row) return null;
  return withNeedMeta(
    coerceOpportunity(stripMongo(row) as Record<string, unknown>),
  );
}

export async function upsertOpportunityNeed(
  prospectId: string,
  needInput: Partial<CleaningNeed>,
  actor: Actor,
  opts?: { note?: string; valueEstimate?: number },
): Promise<CrmOpportunity> {
  const prospect = await getProspect(prospectId);
  if (!prospect) throw new Error("Prospect introuvable.");

  const need = normalizeNeed(needInput);
  const validation = validateCleaningNeed(need);
  const existing = await getOpportunityByProspect(prospectId);
  const stamp = nowIso();

  if (existing) {
    const next: CrmOpportunity = {
      ...existing,
      company: prospect.company,
      contactName: prospect.name,
      contactEmail: prospect.email,
      title: existing.title || `Besoin nettoyage — ${prospect.company}`,
      need,
      needComplete: validation.ok,
      missingFields: validation.missing,
      valueEstimate:
        opts?.valueEstimate !== undefined
          ? Math.max(0, Number(opts.valueEstimate) || 0)
          : existing.valueEstimate || prospect.potentialValue || 0,
      note: opts?.note !== undefined ? clean(opts.note, 4000) : existing.note,
      studyBlockedReason: validation.ok
        ? ""
        : `Données requises manquantes : ${validation.issues
            .map((i) => i.label)
            .join(", ")}`,
      history: [
        hist(
          actor,
          validation.ok
            ? "Besoin de nettoyage complété (prêt pour étude)"
            : `Besoin mis à jour · manquant : ${validation.missing.join(", ") || "—"}`,
        ),
        ...existing.history,
      ].slice(0, 80),
      updatedAt: stamp,
    };
    return save(next);
  }

  const doc: CrmOpportunity = {
    id: `OPP-${randomUUID().slice(0, 8).toUpperCase()}`,
    prospectId: prospect.id,
    company: prospect.company,
    contactName: prospect.name,
    contactEmail: prospect.email,
    title: `Besoin nettoyage — ${prospect.company}`,
    stage: "qualification",
    need,
    needComplete: validation.ok,
    missingFields: validation.missing as NeedFieldKey[],
    valueEstimate:
      opts?.valueEstimate !== undefined
        ? Math.max(0, Number(opts.valueEstimate) || 0)
        : prospect.potentialValue || 0,
    probability: DEFAULT_PROBABILITY_BY_STAGE.qualification,
    nextAction: "Compléter la qualification besoin",
    dueAt: null,
    lossReason: "",
    lostAt: null,
    relances: [],
    lastRelanceAt: null,
    ownerEmail: prospect.assigneeEmail || actor.email.toLowerCase(),
    ownerName: prospect.assigneeName || actor.name,
    note: clean(opts?.note, 4000),
    history: [
      hist(
        actor,
        `Opportunité créée depuis prospect ${prospect.id} · qualification du besoin`,
      ),
    ],
    studyBlockedReason: validation.ok
      ? ""
      : `Données requises manquantes : ${validation.issues
          .map((i) => i.label)
          .join(", ")}`,
    advancedToStudyAt: null,
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
  };
  return save(doc);
}

/**
 * Recette CRM-02 : une opportunité ne passe à l’étude que si le besoin est complet.
 */
export async function advanceOpportunityToStudy(
  opportunityId: string,
  actor: Actor,
): Promise<CrmOpportunity> {
  const existing = await getOpportunity(opportunityId);
  if (!existing) throw new Error("Opportunité introuvable.");

  const validation = validateCleaningNeed(existing.need);
  if (!validation.ok) {
    throw new Error(
      `Passage à l’étude refusé. ${validation.issues
        .map((i) => i.label)
        .join(", ")} manquant(s) pour la prestation.`,
    );
  }

  if (existing.stage === "etude") {
    return existing;
  }
  if (existing.stage !== "qualification") {
    throw new Error(
      `Passage à l’étude possible uniquement depuis « Qualification besoin » (stage actuel : ${existing.stage}).`,
    );
  }

  const stamp = nowIso();
  return save({
    ...existing,
    stage: "etude",
    probability: existing.probability || DEFAULT_PROBABILITY_BY_STAGE.etude,
    needComplete: true,
    missingFields: [],
    studyBlockedReason: "",
    advancedToStudyAt: stamp,
    nextAction: existing.nextAction || "Préparer le chiffrage / devis",
    history: [
      hist(actor, "Passage à l’étude autorisé — besoin de nettoyage complet"),
      ...existing.history,
    ].slice(0, 80),
  });
}

export async function setOpportunityStage(
  opportunityId: string,
  stage: OpportunityStage,
  actor: Actor,
  opts?: { lossReason?: string },
): Promise<CrmOpportunity> {
  if (!isOpportunityStage(stage)) throw new Error("Étape invalide.");
  if (stage === "etude") {
    return advanceOpportunityToStudy(opportunityId, actor);
  }
  const existing = await getOpportunity(opportunityId);
  if (!existing) throw new Error("Opportunité introuvable.");

  if (stage === "perdu") {
    const reason = clean(opts?.lossReason, 400);
    if (!reason) {
      throw new Error("Motif de perte obligatoire pour classer une affaire perdue.");
    }
    return save({
      ...existing,
      stage: "perdu",
      probability: 0,
      lossReason: reason,
      lostAt: nowIso(),
      history: [
        hist(actor, `Perdue · motif : ${reason}`),
        ...existing.history,
      ].slice(0, 80),
    });
  }

  const nextProb =
    stage === "gagne"
      ? 100
      : existing.probability || DEFAULT_PROBABILITY_BY_STAGE[stage];

  return save({
    ...existing,
    stage,
    probability: clampProbability(nextProb),
    lossReason: stage === "gagne" ? "" : existing.lossReason,
    lostAt: stage === "gagne" ? null : existing.lostAt,
    history: [
      hist(actor, `Étape → ${stage}`),
      ...existing.history,
    ].slice(0, 80),
  });
}
