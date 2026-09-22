import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { getOpsSite, listOpsSites } from "@/lib/ops-referential-crm";
import { getQualityControl } from "@/lib/quality-controls-crm";
import { listUsers } from "@/lib/users-repo";
import type { UserRole } from "@/lib/settings";
import {
  isNcCriticality,
  isNcSource,
  isNcStatus,
  ncClosureRequirements,
  type NcCriticality,
  type NcSource,
  type NcStatus,
  type NonConformity,
} from "@/lib/non-conformities-shared";

const COL = "ops_non_conformities";

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

function hist(actor: Actor, detail: string) {
  return {
    id: `NCH-${randomUUID().slice(0, 8).toUpperCase()}`,
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
  const c = db.collection<NonConformity>(COL);
  void Promise.all([
    c.createIndex({ status: 1, dueDate: 1 }).catch(() => undefined),
    c.createIndex({ criticality: 1, status: 1 }).catch(() => undefined),
    c.createIndex({ siteId: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ ref: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ assigneeId: 1, status: 1 }).catch(() => undefined),
  ]);
  return c;
}

function coerce(raw: Record<string, unknown>): NonConformity {
  return {
    id: String(raw.id ?? ""),
    ref: String(raw.ref ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    siteId: String(raw.siteId ?? ""),
    siteName: String(raw.siteName ?? ""),
    criticality: isNcCriticality(raw.criticality) ? raw.criticality : "majeure",
    status: isNcStatus(raw.status) ? raw.status : "ouverte",
    source: isNcSource(raw.source) ? raw.source : "interne",
    qualityControlId: String(raw.qualityControlId ?? ""),
    qualityControlRef: String(raw.qualityControlRef ?? ""),
    assigneeId: String(raw.assigneeId ?? ""),
    assigneeName: String(raw.assigneeName ?? ""),
    dueDate: String(raw.dueDate ?? ""),
    correctiveAction: String(raw.correctiveAction ?? ""),
    proofs: Array.isArray(raw.proofs)
      ? (raw.proofs as NonConformity["proofs"])
      : [],
    validated: Boolean(raw.validated),
    validatedAt:
      raw.validatedAt === null || raw.validatedAt === undefined
        ? null
        : String(raw.validatedAt),
    validatedBy: String(raw.validatedBy ?? ""),
    validatedByName: String(raw.validatedByName ?? ""),
    validationNote: String(raw.validationNote ?? ""),
    closedAt:
      raw.closedAt === null || raw.closedAt === undefined
        ? null
        : String(raw.closedAt),
    closedBy: String(raw.closedBy ?? ""),
    closedByName: String(raw.closedByName ?? ""),
    history: Array.isArray(raw.history)
      ? (raw.history as NonConformity["history"])
      : [],
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
  };
}

async function save(nc: NonConformity): Promise<NonConformity> {
  nc.updatedAt = nowIso();
  const c = await col();
  await c.replaceOne({ id: nc.id }, nc, { upsert: true });
  return nc;
}

export async function listNonConformities(filter?: {
  status?: NcStatus;
  siteId?: string;
  criticality?: NcCriticality;
}): Promise<NonConformity[]> {
  const c = await col();
  const q: Record<string, unknown> = {};
  if (filter?.status) q.status = filter.status;
  if (filter?.siteId) q.siteId = filter.siteId;
  if (filter?.criticality) q.criticality = filter.criticality;
  const rows = await c.find(q).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) => coerce(stripMongo(r) as Record<string, unknown>));
}

export async function getNonConformity(
  id: string,
): Promise<NonConformity | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerce(stripMongo(row) as Record<string, unknown>);
}

export async function createNonConformity(
  input: {
    title: string;
    description?: string;
    siteId: string;
    criticality?: NcCriticality;
    source?: NcSource;
    qualityControlId?: string;
    dueDate?: string;
    correctiveAction?: string;
  },
  actor: Actor,
): Promise<NonConformity> {
  const title = clean(input.title, 200);
  if (!title) throw new Error("Titre de l’écart requis.");
  const siteId = clean(input.siteId, 80);
  if (!siteId) throw new Error("Site requis.");

  const site = await getOpsSite(siteId);
  if (!site) throw new Error("Site introuvable.");

  let qualityControlId = "";
  let qualityControlRef = "";
  let source: NcSource = isNcSource(input.source) ? input.source : "interne";

  if (input.qualityControlId) {
    const qc = await getQualityControl(clean(input.qualityControlId, 80));
    if (qc) {
      qualityControlId = qc.id;
      qualityControlRef = qc.ref;
      source = "controle_qualite";
    }
  }

  const criticality: NcCriticality = isNcCriticality(input.criticality)
    ? input.criticality
    : "majeure";

  const id = `NC-${randomUUID().slice(0, 10).toUpperCase()}`;
  const ref = `NC-${Date.now().toString(36).toUpperCase()}`;
  const now = nowIso();

  const nc: NonConformity = {
    id,
    ref,
    title,
    description: clean(input.description, 4000),
    siteId: site.id,
    siteName: `${site.company} · ${site.name}`,
    criticality,
    status: "ouverte",
    source,
    qualityControlId,
    qualityControlRef,
    assigneeId: "",
    assigneeName: "",
    dueDate: clean(input.dueDate, 12),
    correctiveAction: clean(input.correctiveAction, 4000),
    proofs: [],
    validated: false,
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    validationNote: "",
    closedAt: null,
    closedBy: "",
    closedByName: "",
    history: [hist(actor, `NC créée · ${criticality}`)],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
  };

  return save(nc);
}

export async function assignNonConformity(
  id: string,
  input: { assigneeId: string; dueDate?: string },
  actor: Actor,
): Promise<NonConformity> {
  const nc = await getNonConformity(id);
  if (!nc) throw new Error("Non-conformité introuvable.");
  if (nc.status === "cloturee") throw new Error("NC déjà clôturée.");

  const assigneeId = clean(input.assigneeId, 80);
  if (!assigneeId) throw new Error("Responsable requis.");

  const users = await listUsers();
  const user = users.find((u) => u.id === assigneeId && u.active);
  if (!user) throw new Error("Responsable introuvable ou inactif.");

  nc.assigneeId = user.id;
  nc.assigneeName = user.name || user.email;
  if (input.dueDate !== undefined) {
    const due = clean(input.dueDate, 12);
    if (!due) throw new Error("Échéance invalide.");
    nc.dueDate = due;
  }
  if (!nc.dueDate) throw new Error("Échéance requise pour l’affectation.");

  if (nc.status === "ouverte") nc.status = "affectee";
  else if (nc.status !== "a_valider" && nc.status !== "en_cours") {
    nc.status = "affectee";
  }

  nc.validated = false;
  nc.validatedAt = null;
  nc.validatedBy = "";
  nc.validatedByName = "";

  nc.history = [
    hist(
      actor,
      `Affectée à ${nc.assigneeName} · échéance ${nc.dueDate}`,
    ),
    ...nc.history,
  ].slice(0, 80);
  return save(nc);
}

export async function updateNonConformityAction(
  id: string,
  input: { correctiveAction: string; dueDate?: string },
  actor: Actor,
): Promise<NonConformity> {
  const nc = await getNonConformity(id);
  if (!nc) throw new Error("Non-conformité introuvable.");
  if (nc.status === "cloturee") throw new Error("NC déjà clôturée.");

  const action = clean(input.correctiveAction, 4000);
  if (!action) throw new Error("Action corrective requise.");

  nc.correctiveAction = action;
  if (input.dueDate !== undefined) {
    const due = clean(input.dueDate, 12);
    if (due) nc.dueDate = due;
  }
  if (nc.status === "ouverte" || nc.status === "affectee") {
    nc.status = "en_cours";
  }
  nc.validated = false;
  nc.validatedAt = null;
  nc.validatedBy = "";
  nc.validatedByName = "";

  nc.history = [
    hist(actor, "Action corrective mise à jour"),
    ...nc.history,
  ].slice(0, 80);
  return save(nc);
}

export async function addNonConformityProof(
  id: string,
  input: { url: string; caption?: string },
  actor: Actor,
): Promise<NonConformity> {
  const nc = await getNonConformity(id);
  if (!nc) throw new Error("Non-conformité introuvable.");
  if (nc.status === "cloturee") throw new Error("NC déjà clôturée.");

  const url = clean(input.url, 2000);
  if (!url) throw new Error("URL de preuve requise.");

  nc.proofs = [
    {
      id: `PRF-${randomUUID().slice(0, 8).toUpperCase()}`,
      url,
      caption: clean(input.caption, 200),
      at: nowIso(),
      by: actor.userId,
      byName: actor.name,
    },
    ...nc.proofs,
  ].slice(0, 40);

  if (nc.status === "ouverte" || nc.status === "affectee") {
    nc.status = "en_cours";
  }
  nc.validated = false;
  nc.validatedAt = null;
  nc.validatedBy = "";
  nc.validatedByName = "";

  nc.history = [
    hist(actor, "Preuve ajoutée"),
    ...nc.history,
  ].slice(0, 80);
  return save(nc);
}

export async function submitNonConformityForValidation(
  id: string,
  actor: Actor,
): Promise<NonConformity> {
  const nc = await getNonConformity(id);
  if (!nc) throw new Error("Non-conformité introuvable.");
  if (nc.status === "cloturee") throw new Error("NC déjà clôturée.");

  const check = ncClosureRequirements({ ...nc, validated: true });
  const missingWithoutValidation = check.missing.filter((m) => m !== "validation");
  if (missingWithoutValidation.length > 0) {
    throw new Error(
      `Éléments manquants avant validation : ${missingWithoutValidation.join(", ")}.`,
    );
  }

  nc.status = "a_valider";
  nc.history = [
    hist(actor, "Soumise à validation"),
    ...nc.history,
  ].slice(0, 80);
  return save(nc);
}

export async function validateNonConformity(
  id: string,
  input: { note?: string; approve?: boolean },
  actor: Actor,
): Promise<NonConformity> {
  const nc = await getNonConformity(id);
  if (!nc) throw new Error("Non-conformité introuvable.");
  if (nc.status === "cloturee") throw new Error("NC déjà clôturée.");
  if (nc.status !== "a_valider") {
    throw new Error("Soumettez d’abord la NC à validation Qualité.");
  }

  const approve = input.approve !== false;
  if (!approve) {
    nc.validated = false;
    nc.validatedAt = null;
    nc.validatedBy = "";
    nc.validatedByName = "";
    nc.validationNote = clean(input.note, 1000);
    nc.status = "en_cours";
    nc.history = [
      hist(actor, `Validation refusée${nc.validationNote ? ` · ${nc.validationNote}` : ""}`),
      ...nc.history,
    ].slice(0, 80);
    return save(nc);
  }

  const check = ncClosureRequirements({ ...nc, validated: true });
  const missing = check.missing.filter((m) => m !== "validation");
  if (missing.length > 0) {
    throw new Error(`Éléments manquants : ${missing.join(", ")}.`);
  }

  nc.validated = true;
  nc.validatedAt = nowIso();
  nc.validatedBy = actor.userId;
  nc.validatedByName = actor.name;
  nc.validationNote = clean(input.note, 1000);
  nc.status = "a_valider";
  nc.history = [
    hist(actor, "Validée — prête à clôturer"),
    ...nc.history,
  ].slice(0, 80);
  return save(nc);
}

export async function closeNonConformity(
  id: string,
  actor: Actor,
): Promise<NonConformity> {
  const nc = await getNonConformity(id);
  if (!nc) throw new Error("Non-conformité introuvable.");
  if (nc.status === "cloturee") throw new Error("Déjà clôturée.");

  const { ok, missing } = ncClosureRequirements(nc);
  if (!ok) {
    throw new Error(
      `Clôture impossible — éléments requis manquants : ${missing.join(", ")}.`,
    );
  }

  nc.status = "cloturee";
  nc.closedAt = nowIso();
  nc.closedBy = actor.userId;
  nc.closedByName = actor.name;
  nc.history = [
    hist(actor, "NC clôturée"),
    ...nc.history,
  ].slice(0, 80);
  return save(nc);
}

export async function listNcSites() {
  const sites = await listOpsSites({ status: "actif" });
  return sites.map((s) => ({
    id: s.id,
    name: `${s.company} · ${s.name}`,
  }));
}

export async function listNcAssignees() {
  const users = await listUsers();
  return users
    .filter(
      (u) =>
        u.active &&
        (u.role === "ops" ||
          u.role === "qualite" ||
          u.role === "manager" ||
          u.role === "admin" ||
          u.role === "nettoyeur"),
    )
    .map((u) => ({
      id: u.id,
      name: u.name || u.email,
      role: u.role,
    }));
}
