import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  isSiteReportStatus,
  siteReportReady,
  type SiteReport,
  type SiteReportHistoryEntry,
  type SiteReportStatus,
} from "@/lib/site-reports-shared";

type Actor = { userId: string; name: string; email: string; role: UserRole };

const COLLECTION = "ops_site_reports";

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 8000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string): SiteReportHistoryEntry {
  return {
    id: `SRH-${randomUUID().slice(0, 8).toUpperCase()}`,
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
  const c = db.collection<SiteReport>(COLLECTION);
  void Promise.all([
    c.createIndex({ number: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ siteName: 1, periodEnd: -1 }).catch(() => undefined),
  ]);
  return c;
}

function yearPrefix() {
  return String(new Date().getFullYear());
}

async function nextNumber(): Promise<string> {
  const c = await col();
  const count = await c.countDocuments();
  return `NECS-RP-${yearPrefix()}-${String(count + 1).padStart(4, "0")}`;
}

function coerce(raw: Record<string, unknown>): SiteReport {
  const score = Number(raw.qualityScore);
  return {
    id: clean(raw.id, 40) || `RP-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: clean(raw.number, 40) || "NECS-RP-0000",
    status: isSiteReportStatus(raw.status) ? raw.status : "brouillon",
    clientName: clean(raw.clientName, 180),
    siteName: clean(raw.siteName, 160),
    periodStart: clean(raw.periodStart, 10),
    periodEnd: clean(raw.periodEnd, 10),
    prestations: clean(raw.prestations, 8000),
    effectifsCount: Math.max(0, Number(raw.effectifsCount) || 0),
    effectifsNote: clean(raw.effectifsNote, 2000),
    incidents: clean(raw.incidents, 8000),
    controles: clean(raw.controles, 8000),
    observations: clean(raw.observations, 8000),
    recommendations: clean(raw.recommendations, 8000),
    actions: clean(raw.actions, 8000),
    qualityScore: Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : null,
    note: clean(raw.note, 2000),
    history: Array.isArray(raw.history)
      ? (raw.history as SiteReportHistoryEntry[])
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

async function save(doc: SiteReport): Promise<SiteReport> {
  const next = { ...doc, updatedAt: nowIso() };
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
  const start = day(-30);
  const end = day(-1);
  await c.insertOne({
    id: `RP-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: `NECS-RP-${yearPrefix()}-0001`,
    status: "valide",
    clientName: "Horizon Immobilière SA",
    siteName: "Immeuble Horizon — Akwa",
    periodStart: start,
    periodEnd: end,
    prestations:
      "Nettoyage bureaux (22 passages), sanitaires (quotidien), halls & ascenseurs.",
    effectifsCount: 4,
    effectifsNote: "3 agents + 1 superviseur",
    incidents: "1 réclamation hall entrée (J12) — reprise effectuée J12 soir.",
    controles: "3 contrôles qualité · score moyen 91 %.",
    observations: "Flux visiteurs élevé le lundi — prévoir renfort matin.",
    recommendations: "Renforcer le passage lun matin ; revoir stock sacs 100L.",
    actions: "Dotation sacs planifiée · formation consignes escaliers J+7.",
    qualityScore: 91,
    note: "Rapport démo TMP-14",
    history: [
      hist(actor, "Rapport démo créé"),
      hist(actor, "Validé"),
    ],
    validatedAt: at(-1),
    validatedBy: actor.userId,
    validatedByName: actor.name,
    createdAt: at(-5),
    updatedAt: at(-1),
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  });
}

export async function listSiteReports(actor: Actor): Promise<SiteReport[]> {
  await ensureSeed(actor);
  const c = await col();
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) => coerce(stripMongo(r) as Record<string, unknown>));
}

export async function getSiteReport(id: string): Promise<SiteReport | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerce(stripMongo(row) as Record<string, unknown>);
}

export type SiteReportInput = {
  clientName: string;
  siteName: string;
  periodStart: string;
  periodEnd: string;
  prestations?: string;
  effectifsCount?: number;
  effectifsNote?: string;
  incidents?: string;
  controles?: string;
  observations?: string;
  recommendations?: string;
  actions?: string;
  qualityScore?: number | null;
  note?: string;
  status?: SiteReportStatus | "";
};

export async function createSiteReport(
  input: SiteReportInput,
  actor: Actor,
): Promise<SiteReport> {
  const clientName = clean(input.clientName, 180);
  const siteName = clean(input.siteName, 160);
  if (!clientName) throw new Error("Client requis");
  if (!siteName) throw new Error("Site requis");
  const periodStart = clean(input.periodStart, 10);
  const periodEnd = clean(input.periodEnd, 10);
  if (!periodStart || !periodEnd) throw new Error("Période requise");

  const now = nowIso();
  const doc: SiteReport = {
    id: `RP-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: await nextNumber(),
    status: isSiteReportStatus(input.status) ? input.status : "brouillon",
    clientName,
    siteName,
    periodStart,
    periodEnd,
    prestations: clean(input.prestations, 8000),
    effectifsCount: Math.max(0, Number(input.effectifsCount) || 0),
    effectifsNote: clean(input.effectifsNote, 2000),
    incidents: clean(input.incidents, 8000),
    controles: clean(input.controles, 8000),
    observations: clean(input.observations, 8000),
    recommendations: clean(input.recommendations, 8000),
    actions: clean(input.actions, 8000),
    qualityScore:
      input.qualityScore === null || input.qualityScore === undefined
        ? null
        : Math.min(100, Math.max(0, Number(input.qualityScore) || 0)),
    note: clean(input.note, 2000),
    history: [
      hist(
        actor,
        `Rapport créé · ${siteName} · ${periodStart} → ${periodEnd}`,
      ),
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
  const recipe = siteReportReady(doc);
  if (!recipe.ok && doc.status !== "brouillon") {
    throw new Error(`Incomplet : ${recipe.missing.join(", ")}`);
  }
  await save(doc);
  return doc;
}

export async function updateSiteReport(
  id: string,
  patch: Partial<SiteReportInput> & { status?: SiteReportStatus },
  actor: Actor,
): Promise<SiteReport> {
  const existing = await getSiteReport(id);
  if (!existing) throw new Error("Rapport introuvable");
  if (existing.status === "publie" || existing.status === "annule") {
    throw new Error("Rapport verrouillé");
  }

  const next: SiteReport = {
    ...existing,
    clientName:
      patch.clientName !== undefined
        ? clean(patch.clientName, 180) || existing.clientName
        : existing.clientName,
    siteName:
      patch.siteName !== undefined
        ? clean(patch.siteName, 160) || existing.siteName
        : existing.siteName,
    periodStart:
      patch.periodStart !== undefined
        ? clean(patch.periodStart, 10) || existing.periodStart
        : existing.periodStart,
    periodEnd:
      patch.periodEnd !== undefined
        ? clean(patch.periodEnd, 10) || existing.periodEnd
        : existing.periodEnd,
    prestations:
      patch.prestations !== undefined
        ? clean(patch.prestations, 8000)
        : existing.prestations,
    effectifsCount:
      patch.effectifsCount !== undefined
        ? Math.max(0, Number(patch.effectifsCount) || 0)
        : existing.effectifsCount,
    effectifsNote:
      patch.effectifsNote !== undefined
        ? clean(patch.effectifsNote, 2000)
        : existing.effectifsNote,
    incidents:
      patch.incidents !== undefined
        ? clean(patch.incidents, 8000)
        : existing.incidents,
    controles:
      patch.controles !== undefined
        ? clean(patch.controles, 8000)
        : existing.controles,
    observations:
      patch.observations !== undefined
        ? clean(patch.observations, 8000)
        : existing.observations,
    recommendations:
      patch.recommendations !== undefined
        ? clean(patch.recommendations, 8000)
        : existing.recommendations,
    actions:
      patch.actions !== undefined ? clean(patch.actions, 8000) : existing.actions,
    qualityScore:
      patch.qualityScore === undefined
        ? existing.qualityScore
        : patch.qualityScore === null
          ? null
          : Math.min(100, Math.max(0, Number(patch.qualityScore) || 0)),
    note: patch.note !== undefined ? clean(patch.note, 2000) : existing.note,
    status: isSiteReportStatus(patch.status) ? patch.status : existing.status,
    history: [
      hist(actor, "Rapport mis à jour"),
      ...existing.history,
    ].slice(0, 80),
  };
  return save(next);
}

export async function submitSiteReport(
  id: string,
  actor: Actor,
): Promise<SiteReport> {
  const existing = await getSiteReport(id);
  if (!existing) throw new Error("Rapport introuvable");
  const recipe = siteReportReady(existing);
  if (!recipe.ok) {
    throw new Error(`Incomplet : ${recipe.missing.join(", ")}`);
  }
  return save({
    ...existing,
    status: "soumis",
    history: [hist(actor, "Soumis pour validation"), ...existing.history].slice(
      0,
      80,
    ),
  });
}

export async function validateSiteReport(
  id: string,
  actor: Actor,
  publish = false,
): Promise<SiteReport> {
  const existing = await getSiteReport(id);
  if (!existing) throw new Error("Rapport introuvable");
  const recipe = siteReportReady(existing);
  if (!recipe.ok) {
    throw new Error(`Incomplet : ${recipe.missing.join(", ")}`);
  }
  const now = nowIso();
  return save({
    ...existing,
    status: publish ? "publie" : "valide",
    validatedAt: now,
    validatedBy: actor.userId,
    validatedByName: actor.name,
    history: [
      hist(actor, publish ? "Validé et publié" : "Validé"),
      ...existing.history,
    ].slice(0, 80),
  });
}
