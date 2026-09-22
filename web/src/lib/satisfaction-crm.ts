import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { listClients } from "@/lib/clients-crm";
import { getOpsSite, listOpsSites } from "@/lib/ops-referential-crm";
import { listUsers } from "@/lib/users-repo";
import type { UserRole } from "@/lib/settings";
import {
  buildSatisfactionDashboard,
  clampScore,
  currentPeriod,
  isPlanStatus,
  isSatisfactionChannel,
  planCloseRequirements,
  type ImprovementPlan,
  type ImprovementPlanInput,
  type PlanStatus,
  type SatisfactionChannel,
  type SatisfactionScore,
  type SatisfactionScoreInput,
} from "@/lib/satisfaction-shared";

const SCORES_COL = "satisfaction_scores";
const PLANS_COL = "satisfaction_plans";

type Actor = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
};

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

function hist(actor: Actor, detail: string) {
  return {
    id: `SH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

async function scoresCol() {
  const db = await getDb();
  const c = db.collection<SatisfactionScore>(SCORES_COL);
  void Promise.all([
    c.createIndex({ period: 1, createdAt: -1 }).catch(() => undefined),
    c.createIndex({ clientId: 1, period: 1 }).catch(() => undefined),
    c.createIndex({ siteId: 1, period: 1 }).catch(() => undefined),
    c.createIndex({ ref: 1 }, { unique: true }).catch(() => undefined),
  ]);
  return c;
}

async function plansCol() {
  const db = await getDb();
  const c = db.collection<ImprovementPlan>(PLANS_COL);
  void Promise.all([
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ clientId: 1, status: 1 }).catch(() => undefined),
    c.createIndex({ siteId: 1, status: 1 }).catch(() => undefined),
    c.createIndex({ ref: 1 }, { unique: true }).catch(() => undefined),
  ]);
  return c;
}

function coerceScore(raw: Record<string, unknown>): SatisfactionScore {
  return {
    id: String(raw.id ?? ""),
    ref: String(raw.ref ?? ""),
    clientId: String(raw.clientId ?? ""),
    clientName: String(raw.clientName ?? ""),
    company: String(raw.company ?? ""),
    siteId: String(raw.siteId ?? ""),
    siteName: String(raw.siteName ?? ""),
    score: clampScore(Number(raw.score ?? 0)),
    period: String(raw.period ?? currentPeriod()),
    comment: String(raw.comment ?? ""),
    channel: isSatisfactionChannel(raw.channel) ? raw.channel : "questionnaire",
    createdAt: String(raw.createdAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
  };
}

function coercePlan(raw: Record<string, unknown>): ImprovementPlan {
  return {
    id: String(raw.id ?? ""),
    ref: String(raw.ref ?? ""),
    clientId: String(raw.clientId ?? ""),
    clientName: String(raw.clientName ?? ""),
    company: String(raw.company ?? ""),
    siteId: String(raw.siteId ?? ""),
    siteName: String(raw.siteName ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    status: isPlanStatus(raw.status) ? raw.status : "ouvert",
    dueDate: String(raw.dueDate ?? ""),
    ownerId: String(raw.ownerId ?? ""),
    ownerName: String(raw.ownerName ?? ""),
    triggerScoreId: String(raw.triggerScoreId ?? ""),
    triggerScore:
      raw.triggerScore === null || raw.triggerScore === undefined
        ? null
        : clampScore(Number(raw.triggerScore)),
    history: Array.isArray(raw.history)
      ? (raw.history as ImprovementPlan["history"])
      : [],
    closedAt:
      raw.closedAt === null || raw.closedAt === undefined
        ? null
        : String(raw.closedAt),
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
  };
}

async function resolveClientSite(input: {
  clientId?: string;
  clientName?: string;
  company?: string;
  siteId?: string;
}): Promise<{
  clientId: string;
  clientName: string;
  company: string;
  siteId: string;
  siteName: string;
}> {
  let clientId = clean(input.clientId, 80);
  let clientName = clean(input.clientName, 120);
  let company = clean(input.company, 120);

  if (clientId) {
    const clients = await listClients(200);
    const found = clients.find(
      (c) => String(c._id) === clientId || c.email === clientId,
    );
    if (found) {
      clientId = String(found._id ?? found.email);
      clientName = found.name || clientName;
      company = found.company || company;
    }
  }

  let siteId = "";
  let siteName = "";
  if (input.siteId) {
    const site = await getOpsSite(clean(input.siteId, 80));
    if (site) {
      siteId = site.id;
      siteName = `${site.company} · ${site.name}`;
      if (!company) company = site.company;
      if (!clientName) clientName = site.company;
    }
  }

  if (!clientName && !company && !siteName) {
    throw new Error("Client ou site requis.");
  }

  return {
    clientId,
    clientName: clientName || company || siteName,
    company: company || clientName,
    siteId,
    siteName,
  };
}

export async function listSatisfactionScores(filter?: {
  clientId?: string;
  siteId?: string;
  period?: string;
}): Promise<SatisfactionScore[]> {
  const c = await scoresCol();
  const q: Record<string, unknown> = {};
  if (filter?.clientId) q.clientId = filter.clientId;
  if (filter?.siteId) q.siteId = filter.siteId;
  if (filter?.period) q.period = filter.period;
  const rows = await c.find(q).sort({ createdAt: -1 }).limit(500).toArray();
  return rows.map((r) => coerceScore(stripMongo(r) as Record<string, unknown>));
}

export async function listImprovementPlans(filter?: {
  clientId?: string;
  siteId?: string;
  status?: PlanStatus;
}): Promise<ImprovementPlan[]> {
  const c = await plansCol();
  const q: Record<string, unknown> = {};
  if (filter?.clientId) q.clientId = filter.clientId;
  if (filter?.siteId) q.siteId = filter.siteId;
  if (filter?.status) q.status = filter.status;
  const rows = await c.find(q).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) => coercePlan(stripMongo(r) as Record<string, unknown>));
}

export async function getSatisfactionBundle(opts?: { period?: string }) {
  const [scores, plans, sites, clients, users] = await Promise.all([
    listSatisfactionScores(),
    listImprovementPlans(),
    listOpsSites(),
    listClients(150),
    listUsers(),
  ]);

  const dashboard = buildSatisfactionDashboard(scores, plans, {
    period: opts?.period,
  });

  return {
    scores,
    plans,
    dashboard,
    sites: sites.map((s) => ({
      id: s.id,
      name: `${s.company} · ${s.name}`,
    })),
    clients: clients.map((c) => ({
      id: String(c._id ?? c.email),
      name: c.name,
      company: c.company,
      email: c.email,
    })),
    assignees: users
      .filter((u) =>
        ["admin", "qualite", "manager", "ops"].includes(u.role),
      )
      .map((u) => ({
        id: u.id,
        name: u.name || u.email,
        role: u.role,
      })),
  };
}

/** KPI légers pour le tableau de bord admin (recette). */
export async function getSatisfactionDashboardKpis(period?: string) {
  const [scores, plans] = await Promise.all([
    listSatisfactionScores(),
    listImprovementPlans(),
  ]);
  return buildSatisfactionDashboard(scores, plans, { period });
}

export async function addSatisfactionScore(
  input: SatisfactionScoreInput,
  actor: Actor,
): Promise<SatisfactionScore> {
  const score = clampScore(Number(input.score));
  if (Number(input.score) !== score && !Number.isFinite(Number(input.score))) {
    throw new Error("Score invalide (0–100).");
  }

  const resolved = await resolveClientSite(input);
  const channel: SatisfactionChannel = isSatisfactionChannel(input.channel)
    ? input.channel
    : "questionnaire";
  const period =
    clean(input.period, 7).match(/^\d{4}-\d{2}$/)?.[0] || currentPeriod();
  const now = nowIso();
  const id = `SAT-${randomUUID().slice(0, 10).toUpperCase()}`;
  const ref = `SAT-${Date.now().toString(36).toUpperCase()}`;

  const doc: SatisfactionScore = {
    id,
    ref,
    ...resolved,
    score,
    period,
    comment: clean(input.comment, 2000),
    channel,
    createdAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
  };

  const c = await scoresCol();
  await c.insertOne({ ...doc });
  return doc;
}

export async function createImprovementPlan(
  input: ImprovementPlanInput,
  actor: Actor,
): Promise<ImprovementPlan> {
  const title = clean(input.title, 200);
  if (!title) throw new Error("Titre du plan requis.");

  const resolved = await resolveClientSite(input);
  let ownerId = "";
  let ownerName = "";
  if (input.ownerId) {
    const users = await listUsers();
    const u = users.find((x) => x.id === clean(input.ownerId, 80));
    if (u) {
      ownerId = u.id;
      ownerName = u.name || u.email;
    }
  }
  if (!ownerId) {
    ownerId = actor.userId;
    ownerName = actor.name;
  }

  let triggerScoreId = "";
  let triggerScore: number | null = null;
  if (input.triggerScoreId) {
    const scores = await listSatisfactionScores();
    const s = scores.find((x) => x.id === clean(input.triggerScoreId, 80));
    if (s) {
      triggerScoreId = s.id;
      triggerScore = s.score;
    }
  }

  const now = nowIso();
  const id = `PLN-${randomUUID().slice(0, 10).toUpperCase()}`;
  const ref = `PLN-${Date.now().toString(36).toUpperCase()}`;

  const plan: ImprovementPlan = {
    id,
    ref,
    ...resolved,
    title,
    description: clean(input.description, 4000),
    status: "ouvert",
    dueDate: clean(input.dueDate, 12),
    ownerId,
    ownerName,
    triggerScoreId,
    triggerScore,
    history: [hist(actor, `Plan créé · ${title}`)],
    closedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
  };

  const c = await plansCol();
  await c.insertOne({ ...plan });
  return plan;
}

export async function updateImprovementPlanStatus(
  id: string,
  status: PlanStatus,
  actor: Actor,
): Promise<ImprovementPlan> {
  const c = await plansCol();
  const row = await c.findOne({ id });
  if (!row) throw new Error("Plan introuvable.");
  const plan = coercePlan(stripMongo(row) as Record<string, unknown>);

  if (status === "clos") {
    const gate = planCloseRequirements(plan);
    if (!gate.ok) {
      throw new Error(`Clôture impossible — manquant : ${gate.missing.join(", ")}.`);
    }
  }

  const next: ImprovementPlan = {
    ...plan,
    status,
    closedAt: status === "clos" ? nowIso() : null,
    updatedAt: nowIso(),
    history: [
      hist(actor, `Statut ${plan.status} → ${status}`),
      ...plan.history,
    ].slice(0, 80),
  };

  await c.replaceOne({ id }, next);
  return next;
}

export async function updateImprovementPlan(
  id: string,
  input: {
    title?: string;
    description?: string;
    dueDate?: string;
    ownerId?: string;
  },
  actor: Actor,
): Promise<ImprovementPlan> {
  const c = await plansCol();
  const row = await c.findOne({ id });
  if (!row) throw new Error("Plan introuvable.");
  const plan = coercePlan(stripMongo(row) as Record<string, unknown>);
  if (plan.status === "clos") throw new Error("Plan déjà clos.");

  let ownerId = plan.ownerId;
  let ownerName = plan.ownerName;
  if (input.ownerId) {
    const users = await listUsers();
    const u = users.find((x) => x.id === clean(input.ownerId, 80));
    if (u) {
      ownerId = u.id;
      ownerName = u.name || u.email;
    }
  }

  const next: ImprovementPlan = {
    ...plan,
    title: input.title !== undefined ? clean(input.title, 200) : plan.title,
    description:
      input.description !== undefined
        ? clean(input.description, 4000)
        : plan.description,
    dueDate:
      input.dueDate !== undefined ? clean(input.dueDate, 12) : plan.dueDate,
    ownerId,
    ownerName,
    updatedAt: nowIso(),
    history: [hist(actor, "Plan mis à jour"), ...plan.history].slice(0, 80),
  };

  await c.replaceOne({ id }, next);
  return next;
}
