import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  canManageJobDescriptions,
  DEFAULT_AGENT_JOB_DESCRIPTION,
  isJobDescriptionStatus,
  type JobDescription,
  type JobDescriptionInput,
  type JobDescriptionStatus,
} from "@/lib/job-descriptions-shared";

export {
  canAccessJobDescriptions,
  canManageJobDescriptions,
  DEFAULT_AGENT_JOB_DESCRIPTION,
  JOB_DESCRIPTION_STATUS_LABELS,
  JOB_DESCRIPTION_STATUSES,
  isJobDescriptionStatus,
} from "@/lib/job-descriptions-shared";
export type {
  JobDescription,
  JobDescriptionInput,
  JobDescriptionStatus,
} from "@/lib/job-descriptions-shared";

type DbJobDescription = Omit<JobDescription, "id"> & { _id?: ObjectId };

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function col() {
  const db = await getDb();
  const c = db.collection<DbJobDescription>("job_descriptions");
  void Promise.all([
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ title: 1 }).catch(() => undefined),
  ]);
  return c;
}

function mapDoc(doc: WithId<DbJobDescription> | DbJobDescription): JobDescription {
  const id =
    doc._id instanceof ObjectId
      ? doc._id.toHexString()
      : String((doc as { _id?: unknown })._id ?? "");
  return {
    id,
    status: isJobDescriptionStatus(doc.status) ? doc.status : "brouillon",
    title: doc.title || "",
    mission: doc.mission || "",
    responsibilities: doc.responsibilities || "",
    skills: doc.skills || "",
    schedule: doc.schedule || "",
    reportingLine: doc.reportingLine || "",
    workLocation: doc.workLocation || "",
    safetyNotes: doc.safetyNotes || "",
    performanceCriteria: doc.performanceCriteria || "",
    note: doc.note || "",
    version: Number(doc.version || 1),
    createdAt: doc.createdAt || nowIso(),
    updatedAt: doc.updatedAt || nowIso(),
    createdByEmail: doc.createdByEmail || "",
    createdByName: doc.createdByName || "",
    updatedByEmail: doc.updatedByEmail || "",
    updatedByName: doc.updatedByName || "",
  };
}

export async function listJobDescriptions(): Promise<JobDescription[]> {
  const c = await col();
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(200).toArray();
  return rows.map(mapDoc);
}

export async function getJobDescription(
  id: string,
): Promise<JobDescription | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col();
  const row = await c.findOne({ _id: new ObjectId(id) });
  return row ? mapDoc(row) : null;
}

export async function createJobDescription(
  input: JobDescriptionInput,
  actor: { email: string; name: string; role: UserRole },
): Promise<JobDescription> {
  if (!canManageJobDescriptions(actor.role)) {
    throw new Error("Seul RH / admin peut créer une fiche de poste.");
  }
  const title = clean(input.title, 160);
  const mission = clean(input.mission, 4000);
  if (!title || !mission) {
    throw new Error("Intitulé et mission obligatoires.");
  }
  const stamp = nowIso();
  const doc: DbJobDescription = {
    status: isJobDescriptionStatus(input.status) ? input.status : "brouillon",
    title,
    mission,
    responsibilities: clean(input.responsibilities, 4000),
    skills: clean(input.skills, 4000),
    schedule: clean(input.schedule, 400),
    reportingLine: clean(input.reportingLine, 200),
    workLocation: clean(input.workLocation, 200),
    safetyNotes: clean(input.safetyNotes, 2000),
    performanceCriteria: clean(input.performanceCriteria, 2000),
    note: clean(input.note, 2000),
    version: 1,
    createdAt: stamp,
    updatedAt: stamp,
    createdByEmail: actor.email,
    createdByName: actor.name,
    updatedByEmail: actor.email,
    updatedByName: actor.name,
  };
  const c = await col();
  const result = await c.insertOne(doc);
  return mapDoc({ ...doc, _id: result.insertedId });
}

export async function updateJobDescription(
  id: string,
  input: Partial<JobDescriptionInput> & { bumpVersion?: boolean },
  actor: { email: string; name: string; role: UserRole },
): Promise<JobDescription> {
  if (!canManageJobDescriptions(actor.role)) {
    throw new Error("Seul RH / admin peut modifier une fiche de poste.");
  }
  const existing = await getJobDescription(id);
  if (!existing) throw new Error("Fiche de poste introuvable.");
  if (existing.status === "archive" && input.status !== "active") {
    throw new Error("Fiche archivée : réactivez-la avant modification.");
  }

  const next: Partial<DbJobDescription> = {
    updatedAt: nowIso(),
    updatedByEmail: actor.email,
    updatedByName: actor.name,
  };
  if (input.title !== undefined) next.title = clean(input.title, 160);
  if (input.mission !== undefined) next.mission = clean(input.mission, 4000);
  if (input.responsibilities !== undefined) {
    next.responsibilities = clean(input.responsibilities, 4000);
  }
  if (input.skills !== undefined) next.skills = clean(input.skills, 4000);
  if (input.schedule !== undefined) next.schedule = clean(input.schedule, 400);
  if (input.reportingLine !== undefined) {
    next.reportingLine = clean(input.reportingLine, 200);
  }
  if (input.workLocation !== undefined) {
    next.workLocation = clean(input.workLocation, 200);
  }
  if (input.safetyNotes !== undefined) {
    next.safetyNotes = clean(input.safetyNotes, 2000);
  }
  if (input.performanceCriteria !== undefined) {
    next.performanceCriteria = clean(input.performanceCriteria, 2000);
  }
  if (input.note !== undefined) next.note = clean(input.note, 2000);
  if (isJobDescriptionStatus(input.status)) next.status = input.status;
  if (input.bumpVersion) next.version = existing.version + 1;

  if (next.title === "" || next.mission === "") {
    throw new Error("Intitulé et mission obligatoires.");
  }

  const c = await col();
  await c.updateOne({ _id: new ObjectId(id) }, { $set: next });
  const updated = await getJobDescription(id);
  if (!updated) throw new Error("Mise à jour impossible.");
  return updated;
}

export async function ensureDefaultAgentJobDescription(actor: {
  email: string;
  name: string;
  role: UserRole;
}): Promise<JobDescription | null> {
  if (!canManageJobDescriptions(actor.role)) return null;
  const c = await col();
  const existing = await c.findOne({
    title: DEFAULT_AGENT_JOB_DESCRIPTION.title,
  });
  if (existing) return mapDoc(existing);
  return createJobDescription(
    { ...DEFAULT_AGENT_JOB_DESCRIPTION, status: "active" },
    actor,
  );
}
