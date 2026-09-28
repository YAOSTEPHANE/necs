import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  DEFAULT_POSTE_PROFILES,
  DEFAULT_SKILL_CATALOG,
  buildGapViews,
  canAccessFormationsCompetences,
  canEditCollaboratorSkills,
  canManageSkillCatalog,
  computeExpiryFromCertification,
  findPoste,
  findSkill,
  isSkillLevel,
  skillGapsRecipe,
  summarizeGaps,
  type AcquiredSkill,
  type CollaboratorSkills,
  type CollaboratorSkillsInput,
  type PosteProfile,
  type SkillDef,
  type SkillHistoryEntry,
  type SkillLevel,
} from "@/lib/formations-competences-shared";

const COL_COLLAB = "skill_collaborators";
const COL_CATALOG = "skill_catalog";
const COL_POSTES = "skill_postes";

type Actor = { userId: string; name: string; email: string; role: UserRole };

export {
  canAccessFormationsCompetences,
  canEditCollaboratorSkills,
  canManageSkillCatalog,
};

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanEmail(value: unknown): string {
  return clean(value, 180).toLowerCase();
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

function hist(
  kind: SkillHistoryEntry["kind"],
  actor: Actor,
  note: string,
): SkillHistoryEntry {
  return {
    id: `SKH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    kind,
    note: note.slice(0, 400),
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  };
}

async function collabCol() {
  const db = await getDb();
  const c = db.collection<CollaboratorSkills>(COL_COLLAB);
  void Promise.all([
    c.createIndex({ updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ posteId: 1 }).catch(() => undefined),
    c.createIndex({ employeeName: 1 }).catch(() => undefined),
  ]);
  return c;
}

async function catalogCol() {
  const db = await getDb();
  const c = db.collection<SkillDef & { _id?: unknown }>(COL_CATALOG);
  void c.createIndex({ id: 1 }, { unique: true }).catch(() => undefined);
  return c;
}

async function postesCol() {
  const db = await getDb();
  const c = db.collection<PosteProfile & { _id?: unknown }>(COL_POSTES);
  void c.createIndex({ id: 1 }, { unique: true }).catch(() => undefined);
  return c;
}

export async function getSkillCatalog(): Promise<SkillDef[]> {
  const col = await catalogCol();
  const count = await col.countDocuments();
  if (count === 0) {
    await col.insertMany(DEFAULT_SKILL_CATALOG.map((s) => ({ ...s })));
    return DEFAULT_SKILL_CATALOG.map((s) => ({ ...s }));
  }
  const rows = await col.find({}).toArray();
  return rows
    .map((r) => stripMongo(r) as SkillDef)
    .filter((s) => s.active)
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
}

export async function getPosteProfiles(): Promise<PosteProfile[]> {
  const col = await postesCol();
  const count = await col.countDocuments();
  if (count === 0) {
    await col.insertMany(DEFAULT_POSTE_PROFILES.map((p) => ({ ...p })));
    return DEFAULT_POSTE_PROFILES.map((p) => ({ ...p }));
  }
  const rows = await col.find({}).toArray();
  return rows
    .map((r) => stripMongo(r) as PosteProfile)
    .filter((p) => p.active);
}

function enrich(
  item: CollaboratorSkills,
  catalog: SkillDef[],
  postes: PosteProfile[],
) {
  const poste = findPoste(postes, item.posteId);
  const views = buildGapViews({
    catalog,
    poste,
    skills: item.skills,
  });
  const summary = summarizeGaps(views);
  const recipe = skillGapsRecipe(views);
  return {
    ...item,
    posteLabel: poste?.label ?? item.posteId,
    views,
    summary,
    recipe,
  };
}

export async function listCollaboratorSkills() {
  const [col, catalog, postes] = await Promise.all([
    collabCol(),
    getSkillCatalog(),
    getPosteProfiles(),
  ]);
  const rows = await col.find({}).sort({ updatedAt: -1 }).toArray();
  return rows
    .map((r) => stripMongo(r) as CollaboratorSkills)
    .map((item) => enrich(item, catalog, postes));
}

export async function countSkillAlerts() {
  const items = await listCollaboratorSkills();
  let gapPeople = 0;
  let renewalCount = 0;
  let gapCount = 0;
  for (const item of items) {
    if (item.summary.gapCount > 0) gapPeople += 1;
    gapCount += item.summary.gapCount;
    renewalCount += item.summary.alertCount + item.summary.expiredCount;
  }
  return {
    collaborators: items.length,
    gapPeople,
    gapCount,
    renewalCount,
    coverageAvg:
      items.length === 0
        ? 100
        : Math.round(
            items.reduce((a, i) => a + i.summary.coveragePct, 0) / items.length,
          ),
  };
}

export async function createCollaboratorSkills(
  input: CollaboratorSkillsInput,
  actor: Actor,
): Promise<CollaboratorSkills> {
  const postes = await getPosteProfiles();
  const posteId = clean(input.posteId, 40);
  if (!findPoste(postes, posteId)) {
    throw new Error("Poste / profil de compétences invalide.");
  }
  const employeeName = clean(input.employeeName, 120);
  if (employeeName.length < 2) {
    throw new Error("Nom du collaborateur requis.");
  }

  const item: CollaboratorSkills = {
    id: `SK-${randomUUID().slice(0, 8).toUpperCase()}`,
    employeeName,
    email: cleanEmail(input.email),
    phone: clean(input.phone, 40),
    posteId,
    site: clean(input.site, 160),
    managerName: clean(input.managerName, 120),
    rhOwner: clean(input.rhOwner, 120) || actor.name,
    skills: [],
    comments: clean(input.comments, 2000),
    history: [hist("created", actor, `Fiche compétences créée — poste ${posteId}`)],
    createdAt: nowMs(),
    updatedAt: nowMs(),
  };

  const col = await collabCol();
  await col.insertOne(item);
  return item;
}

export async function setCollaboratorSkill(args: {
  id: string;
  skillId: string;
  level: SkillLevel;
  certifiedAt?: string;
  trainingTitle?: string;
  note?: string;
  actor: Actor;
}): Promise<CollaboratorSkills> {
  if (!canEditCollaboratorSkills(args.actor.role)) {
    throw new Error("Modification réservée RH / manager / admin.");
  }
  const catalog = await getSkillCatalog();
  const def = findSkill(catalog, args.skillId);
  if (!def) throw new Error("Compétence inconnue.");
  if (!isSkillLevel(args.level)) throw new Error("Niveau invalide (1–5).");

  const col = await collabCol();
  const existing = await col.findOne({ id: args.id });
  if (!existing) throw new Error("Fiche collaborateur introuvable.");
  const item = stripMongo(existing) as CollaboratorSkills;

  const certifiedAt =
    clean(args.certifiedAt, 40) ||
    item.skills.find((s) => s.skillId === args.skillId)?.certifiedAt ||
    nowIso();
  const expiresAt = computeExpiryFromCertification(certifiedAt, def.renewalMonths);
  const trainingTitle =
    clean(args.trainingTitle, 160) ||
    item.skills.find((s) => s.skillId === args.skillId)?.trainingTitle ||
    def.label;

  const nextSkill: AcquiredSkill = {
    skillId: def.id,
    level: args.level,
    certifiedAt,
    expiresAt,
    trainingTitle,
    note: clean(args.note, 500),
  };

  const skills = [
    ...item.skills.filter((s) => s.skillId !== def.id),
    nextSkill,
  ];

  const updated: CollaboratorSkills = {
    ...item,
    skills,
    history: [
      hist(
        "skill",
        args.actor,
        `${def.label} · niveau ${args.level}${expiresAt ? ` · échéance ${expiresAt.slice(0, 10)}` : ""}`,
      ),
      ...item.history,
    ].slice(0, 80),
    updatedAt: nowMs(),
  };

  await col.replaceOne({ id: item.id }, updated);
  return updated;
}

export async function renewCollaboratorSkill(args: {
  id: string;
  skillId: string;
  trainingTitle?: string;
  level?: SkillLevel;
  actor: Actor;
}): Promise<CollaboratorSkills> {
  if (!canEditCollaboratorSkills(args.actor.role)) {
    throw new Error("Modification réservée RH / manager / admin.");
  }
  const catalog = await getSkillCatalog();
  const def = findSkill(catalog, args.skillId);
  if (!def) throw new Error("Compétence inconnue.");
  if (def.renewalMonths == null) {
    throw new Error("Cette compétence n’a pas d’échéance de renouvellement.");
  }

  const col = await collabCol();
  const existing = await col.findOne({ id: args.id });
  if (!existing) throw new Error("Fiche collaborateur introuvable.");
  const item = stripMongo(existing) as CollaboratorSkills;
  const prev = item.skills.find((s) => s.skillId === args.skillId);
  const level =
    args.level && isSkillLevel(args.level)
      ? args.level
      : (prev?.level ?? def.defaultMinLevel);

  const certifiedAt = nowIso();
  const expiresAt = computeExpiryFromCertification(
    certifiedAt,
    def.renewalMonths,
  );
  const trainingTitle =
    clean(args.trainingTitle, 160) || `Renouvellement ${def.label}`;

  const nextSkill: AcquiredSkill = {
    skillId: def.id,
    level,
    certifiedAt,
    expiresAt,
    trainingTitle,
    note: "Renouvellement enregistré",
  };

  const updated: CollaboratorSkills = {
    ...item,
    skills: [...item.skills.filter((s) => s.skillId !== def.id), nextSkill],
    history: [
      hist("renewal", args.actor, `Renouvellement — ${def.label} · niv. ${level}`),
      ...item.history,
    ].slice(0, 80),
    updatedAt: nowMs(),
  };
  await col.replaceOne({ id: item.id }, updated);
  return updated;
}

export async function updateCollaboratorMeta(args: {
  id: string;
  posteId?: string;
  site?: string;
  managerName?: string;
  comments?: string;
  actor: Actor;
}): Promise<CollaboratorSkills> {
  const postes = await getPosteProfiles();
  const col = await collabCol();
  const existing = await col.findOne({ id: args.id });
  if (!existing) throw new Error("Fiche collaborateur introuvable.");
  const item = stripMongo(existing) as CollaboratorSkills;

  let posteId = item.posteId;
  if (args.posteId != null) {
    const next = clean(args.posteId, 40);
    if (!findPoste(postes, next)) throw new Error("Poste invalide.");
    posteId = next;
  }

  const updated: CollaboratorSkills = {
    ...item,
    posteId,
    site: args.site != null ? clean(args.site, 160) : item.site,
    managerName:
      args.managerName != null ? clean(args.managerName, 120) : item.managerName,
    comments:
      args.comments != null ? clean(args.comments, 2000) : item.comments,
    history:
      posteId !== item.posteId
        ? [
            hist("poste", args.actor, `Poste mis à jour → ${posteId}`),
            ...item.history,
          ].slice(0, 80)
        : item.history,
    updatedAt: nowMs(),
  };
  await col.replaceOne({ id: item.id }, updated);
  return updated;
}

export async function deleteCollaboratorSkills(
  id: string,
  actor: Actor,
): Promise<void> {
  if (!canManageSkillCatalog(actor.role)) {
    throw new Error("Suppression réservée RH / admin.");
  }
  const col = await collabCol();
  const res = await col.deleteOne({ id });
  if (res.deletedCount === 0) throw new Error("Fiche introuvable.");
}
