import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  computeCriteriaTotal,
  DEFAULT_RECRUITMENT_CRITERIA,
  isRecruitmentHr,
  isRecruitmentManager,
  nextAllowedStatuses,
  RECRUITMENT_DECISION_LABELS,
  RECRUITMENT_STATUS_LABELS,
  RECRUITMENT_STATUSES,
  type RecruitmentCriterionScore,
  type RecruitmentDecision,
  type RecruitmentHistoryEntry,
  type RecruitmentStatus,
} from "@/lib/recrutement-shared";

export type { RecruitmentDecision, RecruitmentHistoryEntry, RecruitmentStatus };
export {
  canAccessRecruitment,
  canEvaluateRecruitment,
  computeCriteriaTotal,
  DEFAULT_RECRUITMENT_CRITERIA,
  isRecruitmentHr,
  isRecruitmentManager,
  nextAllowedStatuses,
  recruitmentJourneyRequirements,
  RECRUITMENT_DECISION_LABELS,
  RECRUITMENT_DECISIONS,
  RECRUITMENT_STATUS_LABELS,
  RECRUITMENT_STATUSES,
} from "@/lib/recrutement-shared";
export type {
  RecruitmentCriterionDef,
  RecruitmentCriterionScore,
} from "@/lib/recrutement-shared";

export type RecruitmentInput = {
  name: string;
  email: string;
  phone: string;
  roleTarget: string;
  source: string;
  city: string;
  experience: string;
  message: string;
  managerEmail?: string;
  managerName?: string;
};

export type DbRecruitment = {
  _id?: ObjectId;
  name: string;
  email: string;
  phone: string;
  roleTarget: string;
  source: string;
  city: string;
  experience: string;
  message: string;
  status: RecruitmentStatus;
  decision: RecruitmentDecision;
  score: number | null;
  evaluationNote: string;
  criteriaScores: RecruitmentCriterionScore[];
  /** Validation / signature RH de la décision. */
  validatedAt: string | null;
  validatedByEmail: string;
  validatedByName: string;
  managerEmail: string;
  managerName: string;
  history: RecruitmentHistoryEntry[];
  createdAt: number;
  updatedAt: number;
  createdByEmail: string;
  createdByName: string;
};

function historyId(): string {
  return `rh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeHistory(
  partial: Omit<RecruitmentHistoryEntry, "id" | "at"> & { at?: string },
): RecruitmentHistoryEntry {
  return {
    id: historyId(),
    at: partial.at || new Date().toISOString(),
    kind: partial.kind,
    from: partial.from ?? null,
    to: partial.to ?? null,
    decision: partial.decision ?? null,
    score: partial.score ?? null,
    note: (partial.note || "").trim().slice(0, 800),
    byEmail: partial.byEmail,
    byName: partial.byName,
    byRole: partial.byRole,
  };
}

async function recruitmentCollection() {
  const db = await getDb();
  const col = db.collection<DbRecruitment>("recruitment");
  void Promise.all([
    col.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    col.createIndex({ email: 1 }).catch(() => undefined),
    col.createIndex({ managerEmail: 1, updatedAt: -1 }).catch(() => undefined),
    col.createIndex({ createdAt: -1 }).catch(() => undefined),
  ]);
  return col;
}

export function mapRecruitment(doc: WithId<DbRecruitment> | DbRecruitment) {
  const id =
    doc._id instanceof ObjectId
      ? doc._id.toHexString()
      : String((doc as { _id?: unknown })._id ?? "");
  return {
    id,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    roleTarget: doc.roleTarget,
    source: doc.source,
    city: doc.city,
    experience: doc.experience,
    message: doc.message,
    status: doc.status,
    decision: doc.decision,
    score: doc.score,
    evaluationNote: doc.evaluationNote,
    criteriaScores: Array.isArray(doc.criteriaScores) ? doc.criteriaScores : [],
    validatedAt: doc.validatedAt ?? null,
    validatedByEmail: doc.validatedByEmail || "",
    validatedByName: doc.validatedByName || "",
    managerEmail: doc.managerEmail,
    managerName: doc.managerName,
    history: Array.isArray(doc.history) ? doc.history : [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    createdByEmail: doc.createdByEmail,
    createdByName: doc.createdByName,
  };
}

export async function listRecruitments(opts?: {
  managerEmail?: string;
  status?: RecruitmentStatus;
}): Promise<ReturnType<typeof mapRecruitment>[]> {
  const col = await recruitmentCollection();
  const filter: Record<string, unknown> = {};
  if (opts?.managerEmail) {
    filter.managerEmail = opts.managerEmail.trim().toLowerCase();
  }
  if (opts?.status) filter.status = opts.status;
  const rows = await col
    .find(filter)
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(500)
    .toArray();
  return rows.map(mapRecruitment);
}

export async function countRecruitmentsByStatus(opts?: {
  managerEmail?: string;
}): Promise<Record<RecruitmentStatus, number>> {
  const col = await recruitmentCollection();
  const match: Record<string, unknown> = {};
  if (opts?.managerEmail) {
    match.managerEmail = opts.managerEmail.trim().toLowerCase();
  }
  const pipeline = [
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ];
  const rows = await col
    .aggregate<{ _id: string; n: number }>(pipeline)
    .toArray();
  const out: Record<RecruitmentStatus, number> = {
    candidature: 0,
    preselection: 0,
    entretien: 0,
    evaluation: 0,
    decision: 0,
  };
  for (const row of rows) {
    if (RECRUITMENT_STATUSES.includes(row._id as RecruitmentStatus)) {
      out[row._id as RecruitmentStatus] = row.n;
    }
  }
  return out;
}

export async function createRecruitment(
  input: RecruitmentInput,
  actor: { email: string; name: string; role: UserRole | string },
): Promise<ReturnType<typeof mapRecruitment>> {
  const col = await recruitmentCollection();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const entry = makeHistory({
    at: nowIso,
    kind: "created",
    to: "candidature",
    note: "Candidature enregistrée",
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });
  const doc: DbRecruitment = {
    name: input.name.trim().slice(0, 120),
    email: input.email.trim().toLowerCase().slice(0, 180),
    phone: input.phone.trim().slice(0, 40),
    roleTarget: input.roleTarget.trim().slice(0, 120) || "Agent terrain",
    source: input.source.trim().slice(0, 80) || "saisie_rh",
    city: input.city.trim().slice(0, 80),
    experience: input.experience.trim().slice(0, 200),
    message: input.message.trim().slice(0, 4000),
    status: "candidature",
    decision: "en_attente",
    score: null,
    evaluationNote: "",
    criteriaScores: [],
    validatedAt: null,
    validatedByEmail: "",
    validatedByName: "",
    managerEmail: (input.managerEmail || "").trim().toLowerCase().slice(0, 180),
    managerName: (input.managerName || "").trim().slice(0, 120),
    history: [entry],
    createdAt: now,
    updatedAt: now,
    createdByEmail: actor.email,
    createdByName: actor.name,
  };
  if (doc.managerEmail) {
    doc.history.push(
      makeHistory({
        at: nowIso,
        kind: "assignment",
        note: `Manager affecté : ${doc.managerName || doc.managerEmail}`,
        byEmail: actor.email,
        byName: actor.name,
        byRole: actor.role,
      }),
    );
  }
  const result = await col.insertOne(doc);
  return mapRecruitment({ ...doc, _id: result.insertedId });
}

export async function getRecruitmentById(
  id: string,
): Promise<(ReturnType<typeof mapRecruitment> & { _rawId: ObjectId }) | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await recruitmentCollection();
  const oid = new ObjectId(id);
  const doc = await col.findOne({ _id: oid });
  if (!doc) return null;
  return { ...mapRecruitment(doc), _rawId: oid };
}

function assertCanView(
  doc: ReturnType<typeof mapRecruitment>,
  actor: { email: string; role: UserRole | string },
): boolean {
  if (isRecruitmentHr(actor.role)) return true;
  if (isRecruitmentManager(actor.role)) {
    return doc.managerEmail === actor.email.trim().toLowerCase();
  }
  return false;
}

export async function updateRecruitmentStatus(
  id: string,
  nextStatus: RecruitmentStatus,
  actor: { email: string; name: string; role: UserRole | string },
  note = "",
): Promise<ReturnType<typeof mapRecruitment> | null> {
  const found = await getRecruitmentById(id);
  if (!found) return null;
  if (!assertCanView(found, actor)) {
    throw new Error("Accès refusé à cette candidature");
  }
  const allowed = nextAllowedStatuses(found.status, actor.role);
  if (!allowed.includes(nextStatus)) {
    throw new Error("Transition de statut non autorisée");
  }
  const col = await recruitmentCollection();
  const entry = makeHistory({
    kind: "status",
    from: found.status,
    to: nextStatus,
    note:
      note ||
      `${RECRUITMENT_STATUS_LABELS[found.status]} → ${RECRUITMENT_STATUS_LABELS[nextStatus]}`,
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });
  await col.updateOne(
    { _id: found._rawId },
    {
      $set: {
        status: nextStatus,
        updatedAt: Date.now(),
      },
      $push: { history: entry },
    },
  );
  const updated = await getRecruitmentById(id);
  if (!updated) return null;
  const { _rawId: _, ...rest } = updated;
  return rest;
}

export async function saveRecruitmentEvaluation(
  id: string,
  score: number,
  evaluationNote: string,
  actor: { email: string; name: string; role: UserRole | string },
  criteriaScores?: RecruitmentCriterionScore[],
): Promise<ReturnType<typeof mapRecruitment> | null> {
  const found = await getRecruitmentById(id);
  if (!found) return null;
  if (!assertCanView(found, actor)) {
    throw new Error("Accès refusé à cette candidature");
  }
  if (
    found.status !== "entretien" &&
    found.status !== "evaluation" &&
    found.status !== "decision"
  ) {
    throw new Error("Évaluation possible à partir de l’entretien");
  }

  const cleanedCriteria = Array.isArray(criteriaScores)
    ? criteriaScores
        .map((row) => {
          const def = DEFAULT_RECRUITMENT_CRITERIA.find(
            (d) => d.id === row.criterionId,
          );
          if (!def) return null;
          return {
            criterionId: def.id,
            score: Math.max(0, Math.min(def.maxScore, Math.round(Number(row.score) || 0))),
            appreciation: String(row.appreciation || "").trim().slice(0, 400),
          };
        })
        .filter((r): r is RecruitmentCriterionScore => Boolean(r))
    : found.criteriaScores || [];

  const fromCriteria =
    cleanedCriteria.length > 0
      ? computeCriteriaTotal(cleanedCriteria)
      : null;
  const safeScore = Math.max(
    0,
    Math.min(100, Math.round(fromCriteria ?? score)),
  );
  const col = await recruitmentCollection();
  const evalEntry = makeHistory({
    kind: "evaluation",
    to: found.status === "entretien" ? "evaluation" : found.status,
    score: safeScore,
    note: evaluationNote || `Score ${safeScore}/100`,
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });
  const historyPush: RecruitmentHistoryEntry[] = [];
  const nextStatus: RecruitmentStatus =
    found.status === "entretien" ? "evaluation" : found.status;
  if (found.status === "entretien") {
    historyPush.push(
      makeHistory({
        kind: "status",
        from: "entretien",
        to: "evaluation",
        note: "Passage automatique à évaluation après score",
        byEmail: actor.email,
        byName: actor.name,
        byRole: actor.role,
      }),
    );
  }
  historyPush.push(evalEntry);

  await col.updateOne(
    { _id: found._rawId },
    {
      $set: {
        score: safeScore,
        evaluationNote: evaluationNote.trim().slice(0, 2000),
        criteriaScores: cleanedCriteria,
        status: nextStatus,
        updatedAt: Date.now(),
      },
      $push: { history: { $each: historyPush } },
    },
  );
  const updated = await getRecruitmentById(id);
  if (!updated) return null;
  const { _rawId: _, ...rest } = updated;
  return rest;
}

export async function setRecruitmentDecision(
  id: string,
  decision: RecruitmentDecision,
  actor: { email: string; name: string; role: UserRole | string },
  note = "",
): Promise<ReturnType<typeof mapRecruitment> | null> {
  if (!isRecruitmentHr(actor.role)) {
    throw new Error("Seuls RH / admin valident la décision finale");
  }
  const found = await getRecruitmentById(id);
  if (!found) return null;
  if (found.status !== "evaluation" && found.status !== "decision") {
    throw new Error(
      "Décision finale possible après l’évaluation (parcours séquentiel)",
    );
  }
  if (found.score == null) {
    throw new Error("Une évaluation (score) est requise avant la décision");
  }
  if (decision === "en_attente") {
    throw new Error("Décision invalide");
  }
  const col = await recruitmentCollection();
  const entries: RecruitmentHistoryEntry[] = [];
  if (found.status !== "decision") {
    entries.push(
      makeHistory({
        kind: "status",
        from: found.status,
        to: "decision",
        note: "Passage en décision",
        byEmail: actor.email,
        byName: actor.name,
        byRole: actor.role,
      }),
    );
  }
  entries.push(
    makeHistory({
      kind: "decision",
      from: found.status,
      to: "decision",
      decision,
      note: note || `Décision : ${RECRUITMENT_DECISION_LABELS[decision]}`,
      byEmail: actor.email,
      byName: actor.name,
      byRole: actor.role,
    }),
  );
  await col.updateOne(
    { _id: found._rawId },
    {
      $set: {
        status: "decision",
        decision,
        validatedAt: new Date().toISOString(),
        validatedByEmail: actor.email,
        validatedByName: actor.name,
        updatedAt: Date.now(),
      },
      $push: { history: { $each: entries } },
    },
  );
  const updated = await getRecruitmentById(id);
  if (!updated) return null;
  const { _rawId: _, ...rest } = updated;
  return rest;
}

/**
 * Manager : proposition de décision (historisée), sans valider le final.
 */
export async function proposeRecruitmentDecision(
  id: string,
  decision: RecruitmentDecision,
  actor: { email: string; name: string; role: UserRole | string },
  note = "",
): Promise<ReturnType<typeof mapRecruitment> | null> {
  if (!isRecruitmentManager(actor.role) && !isRecruitmentHr(actor.role)) {
    throw new Error("Proposition réservée manager / RH");
  }
  if (decision === "en_attente") {
    throw new Error("Proposition invalide");
  }
  const found = await getRecruitmentById(id);
  if (!found) return null;
  if (!assertCanView(found, actor)) {
    throw new Error("Accès refusé à cette candidature");
  }
  if (found.status !== "evaluation" && found.status !== "decision") {
    throw new Error("Proposition possible à partir de l’évaluation");
  }
  const col = await recruitmentCollection();
  const entry = makeHistory({
    kind: "note",
    decision,
    to: found.status,
    note:
      note ||
      `Proposition manager : ${RECRUITMENT_DECISION_LABELS[decision]}`,
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });
  // Préfixe pour distinguer clairement dans le journal
  entry.note = `[Proposition] ${entry.note}`.slice(0, 800);
  await col.updateOne(
    { _id: found._rawId },
    {
      $set: { updatedAt: Date.now() },
      $push: { history: entry },
    },
  );
  const updated = await getRecruitmentById(id);
  if (!updated) return null;
  const { _rawId: _, ...rest } = updated;
  return rest;
}

export async function assignRecruitmentManager(
  id: string,
  managerEmail: string,
  managerName: string,
  actor: { email: string; name: string; role: UserRole | string },
): Promise<ReturnType<typeof mapRecruitment> | null> {
  if (!isRecruitmentHr(actor.role)) {
    throw new Error("Seuls RH / admin affectent un manager");
  }
  const found = await getRecruitmentById(id);
  if (!found) return null;
  const col = await recruitmentCollection();
  const email = managerEmail.trim().toLowerCase().slice(0, 180);
  const name = managerName.trim().slice(0, 120);
  const entry = makeHistory({
    kind: "assignment",
    note: email ? `Manager affecté : ${name || email}` : "Manager retiré",
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });
  await col.updateOne(
    { _id: found._rawId },
    {
      $set: {
        managerEmail: email,
        managerName: name,
        updatedAt: Date.now(),
      },
      $push: { history: entry },
    },
  );
  const updated = await getRecruitmentById(id);
  if (!updated) return null;
  const { _rawId: _, ...rest } = updated;
  return rest;
}

export async function deleteRecruitment(
  id: string,
  actor: { role: UserRole | string },
): Promise<boolean> {
  if (!isRecruitmentHr(actor.role)) {
    throw new Error("Suppression réservée RH / admin");
  }
  if (!ObjectId.isValid(id)) return false;
  const col = await recruitmentCollection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}
