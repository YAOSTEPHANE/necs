import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  buildTaskViews,
  canAccessOnboarding,
  canToggleOnboardingTask,
  canValidateOnboardingEnd,
  DEFAULT_ONBOARDING_CHECKLIST,
  isOnboardingCategory,
  isOnboardingReadyToValidate,
  onboardingEndRequirements,
  summarizeOnboarding,
  type OnboardingCategory,
  type OnboardingHistoryEntry,
  type OnboardingStatus,
  type OnboardingTask,
  type OnboardingTaskDef,
} from "@/lib/onboarding-shared";

export {
  buildTaskViews,
  canAccessOnboarding,
  canManageOnboardingChecklist,
  canToggleOnboardingTask,
  canValidateOnboardingEnd,
  DEFAULT_ONBOARDING_CHECKLIST,
  isOnboardingReadyToValidate,
  onboardingEndRequirements,
  summarizeOnboarding,
  ONBOARDING_CATEGORY_LABELS,
  ONBOARDING_STATUS_LABELS,
} from "@/lib/onboarding-shared";
export type {
  OnboardingCategory,
  OnboardingHistoryEntry,
  OnboardingStatus,
  OnboardingTask,
  OnboardingTaskDef,
  OnboardingTaskView,
} from "@/lib/onboarding-shared";

export type DbOnboarding = {
  _id?: ObjectId;
  employeeName: string;
  email: string;
  phone: string;
  roleTarget: string;
  site: string;
  managerName: string;
  startDate: string;
  hiringDossierId: string;
  status: OnboardingStatus;
  tasks: OnboardingTask[];
  rhOwner: string;
  comments: string;
  validatedAt: string | null;
  validatedByEmail: string;
  validatedByName: string;
  history: OnboardingHistoryEntry[];
  createdAt: number;
  updatedAt: number;
  createdByEmail: string;
  createdByName: string;
};

export type OnboardingInput = {
  employeeName: string;
  email: string;
  phone?: string;
  roleTarget?: string;
  site?: string;
  managerName?: string;
  startDate?: string;
  hiringDossierId?: string;
  rhOwner?: string;
  comments?: string;
};

type ChecklistConfigDoc = {
  _id?: ObjectId;
  key: "default";
  items: OnboardingTaskDef[];
  updatedAt: number;
  updatedByEmail: string;
};

function historyId(): string {
  return `onb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeHistory(
  partial: Omit<OnboardingHistoryEntry, "id" | "at"> & { at?: string },
): OnboardingHistoryEntry {
  return {
    id: historyId(),
    at: partial.at || new Date().toISOString(),
    kind: partial.kind,
    note: (partial.note || "").trim().slice(0, 800),
    byEmail: partial.byEmail,
    byName: partial.byName,
    byRole: partial.byRole,
  };
}

async function onboardingsCollection() {
  const db = await getDb();
  const col = db.collection<DbOnboarding>("onboardings");
  void Promise.all([
    col.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    col.createIndex({ email: 1 }).catch(() => undefined),
    col.createIndex({ createdAt: -1 }).catch(() => undefined),
  ]);
  return col;
}

async function checklistCollection() {
  const db = await getDb();
  const col = db.collection<ChecklistConfigDoc>("onboarding_checklist");
  void col.createIndex({ key: 1 }, { unique: true }).catch(() => undefined);
  return col;
}

export async function getOnboardingChecklist(): Promise<OnboardingTaskDef[]> {
  const col = await checklistCollection();
  const doc = await col.findOne({ key: "default" });
  const fromDb = doc?.items?.length
    ? doc.items
        .map((i) => normalizeChecklistItem(i))
        .filter((i): i is OnboardingTaskDef => Boolean(i))
    : [];

  const byId = new Map(fromDb.map((i) => [i.id, i]));
  // Migration additive : nouvelles tâches / catégorie « accès »
  for (const def of DEFAULT_ONBOARDING_CHECKLIST) {
    const existing = byId.get(def.id);
    if (!existing) {
      byId.set(def.id, { ...def });
      continue;
    }
    if (def.id === "acces_app" && existing.category === "documents") {
      existing.category = "acces";
    }
  }

  return [...byId.values()]
    .filter((i) => i.id && i.label)
    .sort((a, b) => a.sort - b.sort);
}

function normalizeChecklistItem(
  i: Partial<OnboardingTaskDef> | OnboardingTaskDef,
): OnboardingTaskDef | null {
  const id = String(i.id || "").slice(0, 40);
  const label = String(i.label || "").slice(0, 160);
  if (!id || !label) return null;
  let category: OnboardingCategory = isOnboardingCategory(i.category)
    ? i.category
    : "documents";
  if (id === "acces_app" || id.startsWith("acces_")) {
    category = "acces";
  }
  return {
    id,
    label,
    category,
    required: Boolean(i.required),
    ownerRole: (["rh", "manager", "either"].includes(String(i.ownerRole))
      ? i.ownerRole
      : "either") as OnboardingTaskDef["ownerRole"],
    active: i.active !== false,
    sort: Number(i.sort || 0),
  };
}

export async function saveOnboardingChecklist(
  items: OnboardingTaskDef[],
  actor: { email: string },
): Promise<OnboardingTaskDef[]> {
  const cleaned = items
    .map((i, idx) => ({
      id: String(i.id || `task_${idx + 1}`).trim().slice(0, 40),
      label: String(i.label || "").trim().slice(0, 160),
      category: i.category,
      required: Boolean(i.required),
      ownerRole: i.ownerRole,
      active: i.active !== false,
      sort: Number.isFinite(i.sort) ? i.sort : (idx + 1) * 10,
    }))
    .filter((i) => i.id && i.label);
  if (cleaned.length === 0) throw new Error("Checklist vide");
  const col = await checklistCollection();
  await col.updateOne(
    { key: "default" },
    {
      $set: {
        key: "default",
        items: cleaned,
        updatedAt: Date.now(),
        updatedByEmail: actor.email,
      },
    },
    { upsert: true },
  );
  return cleaned;
}

function emptyTasks(checklist: OnboardingTaskDef[]): OnboardingTask[] {
  return checklist
    .filter((c) => c.active)
    .map((c) => ({
      taskId: c.id,
      done: false,
      doneAt: null,
      doneByEmail: "",
      doneByName: "",
      note: "",
    }));
}

function doneTasks(
  checklist: OnboardingTaskDef[],
  exceptIds: string[] = [],
  actor = { email: "rh@necs.cm", name: "RH NECS" },
): OnboardingTask[] {
  const skip = new Set(exceptIds);
  const stamp = new Date().toISOString();
  return checklist
    .filter((c) => c.active)
    .map((c) => {
      const done = !skip.has(c.id);
      return {
        taskId: c.id,
        done,
        doneAt: done ? stamp : null,
        doneByEmail: done ? actor.email : "",
        doneByName: done ? actor.name : "",
        note: "",
      };
    });
}

async function ensureOnboardingDemoSeed(
  checklist: OnboardingTaskDef[],
): Promise<void> {
  const col = await onboardingsCollection();
  const count = await col.countDocuments();
  if (count > 0) return;

  const now = Date.now();
  const hist = (
    kind: OnboardingHistoryEntry["kind"],
    note: string,
  ): OnboardingHistoryEntry =>
    makeHistory({
      kind,
      note,
      byEmail: "rh@necs.cm",
      byName: "RH NECS",
      byRole: "rh",
    });

  const seed: DbOnboarding[] = [
    {
      employeeName: "Aïcha Nkomo",
      email: "aicha.nkomo@necs.cm",
      phone: "+237 6 90 11 22 33",
      roleTarget: "Agent terrain / Nettoyeur",
      site: "Immeuble Horizon — Akwa",
      managerName: "Paul Mbarga",
      startDate: "2026-09-15",
      hiringDossierId: "",
      status: "en_cours",
      tasks: doneTasks(checklist, [
        "formation_site",
        "presentation_equipe",
        "affectation_planning",
        "validation_fin",
      ]),
      rhOwner: "RH NECS",
      comments: "Intégration en cours — formations site restantes",
      validatedAt: null,
      validatedByEmail: "",
      validatedByName: "",
      history: [hist("created", "Parcours démo · en cours")],
      createdAt: now - 3 * 86_400_000,
      updatedAt: now - 3_600_000,
      createdByEmail: "rh@necs.cm",
      createdByName: "RH NECS",
    },
    {
      employeeName: "Jean Owona",
      email: "jean.owona@necs.cm",
      phone: "+237 6 77 44 55 66",
      roleTarget: "Agent terrain / Nettoyeur",
      site: "Usine Bassa",
      managerName: "Paul Mbarga",
      startDate: "2026-09-10",
      hiringDossierId: "",
      status: "pret",
      tasks: doneTasks(checklist, ["validation_fin"]),
      rhOwner: "RH NECS",
      comments: "Prêt à valider la fin d’intégration",
      validatedAt: null,
      validatedByEmail: "",
      validatedByName: "",
      history: [
        hist("created", "Parcours démo · prêt"),
        hist("status", "Checklist complète — prêt à valider"),
      ],
      createdAt: now - 7 * 86_400_000,
      updatedAt: now - 86_400_000,
      createdByEmail: "rh@necs.cm",
      createdByName: "RH NECS",
    },
    {
      employeeName: "Sarah Essomba",
      email: "sarah.essomba@necs.cm",
      phone: "+237 6 55 88 99 00",
      roleTarget: "Chef d’équipe",
      site: "Mall Riviera",
      managerName: "Direction Ops",
      startDate: "2026-08-20",
      hiringDossierId: "",
      status: "valide",
      tasks: doneTasks(checklist),
      rhOwner: "RH NECS",
      comments: "Intégration validée",
      validatedAt: new Date(now - 5 * 86_400_000).toISOString(),
      validatedByEmail: "manager@necs.cm",
      validatedByName: "Paul Mbarga",
      history: [
        hist("created", "Parcours démo · validé"),
        hist("validated", "Fin d’intégration validée"),
      ],
      createdAt: now - 30 * 86_400_000,
      updatedAt: now - 5 * 86_400_000,
      createdByEmail: "rh@necs.cm",
      createdByName: "RH NECS",
    },
    {
      employeeName: "Marc Fotso",
      email: "marc.fotso@necs.cm",
      phone: "+237 6 22 33 44 55",
      roleTarget: "Agent terrain / Nettoyeur",
      site: "Tour Akwa",
      managerName: "Paul Mbarga",
      startDate: "2026-09-18",
      hiringDossierId: "",
      status: "bloque",
      tasks: emptyTasks(checklist),
      rhOwner: "RH NECS",
      comments: "Dossier embauche incomplet — intégration bloquée",
      validatedAt: null,
      validatedByEmail: "",
      validatedByName: "",
      history: [
        hist("created", "Parcours démo · bloqué"),
        hist("status", "Bloqué — pièces manquantes"),
      ],
      createdAt: now - 2 * 86_400_000,
      updatedAt: now - 86_400_000,
      createdByEmail: "rh@necs.cm",
      createdByName: "RH NECS",
    },
  ];

  await col.insertMany(seed);
}

export function mapOnboarding(
  doc: WithId<DbOnboarding> | DbOnboarding,
  checklist: OnboardingTaskDef[],
) {
  const id =
    doc._id instanceof ObjectId
      ? doc._id.toHexString()
      : String((doc as { _id?: unknown })._id ?? "");
  const views = buildTaskViews(checklist, doc.tasks || []);
  const summary = summarizeOnboarding(views);
  const endRecipe = onboardingEndRequirements({
    status: doc.status,
    validatedAt: doc.validatedAt,
    views,
  });
  return {
    id,
    employeeName: doc.employeeName,
    email: doc.email,
    phone: doc.phone,
    roleTarget: doc.roleTarget,
    site: doc.site,
    managerName: doc.managerName,
    startDate: doc.startDate,
    hiringDossierId: doc.hiringDossierId,
    status: doc.status,
    tasks: doc.tasks || [],
    rhOwner: doc.rhOwner,
    comments: doc.comments,
    validatedAt: doc.validatedAt,
    validatedByEmail: doc.validatedByEmail,
    validatedByName: doc.validatedByName,
    history: doc.history || [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    views,
    summary,
    endRecipe,
  };
}

async function getRaw(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const col = await onboardingsCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function listOnboardings() {
  const [col, checklist] = await Promise.all([
    onboardingsCollection(),
    getOnboardingChecklist(),
  ]);
  await ensureOnboardingDemoSeed(checklist);
  const rows = await col.find({}).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) => mapOnboarding(r, checklist));
}

export async function createOnboarding(
  input: OnboardingInput,
  actor: { email: string; name: string; role: UserRole | string },
) {
  if (!canAccessOnboarding(actor.role)) {
    throw new Error("Accès refusé");
  }
  const employeeName = String(input.employeeName || "").trim().slice(0, 120);
  if (!employeeName) throw new Error("Nom collaborateur requis");
  const email = String(input.email || "")
    .trim()
    .toLowerCase()
    .slice(0, 180);
  if (!email || !email.includes("@")) throw new Error("Email invalide");

  const checklist = await getOnboardingChecklist();
  const now = Date.now();
  const entry = makeHistory({
    kind: "created",
    note: `Onboarding créé · ${employeeName}`,
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });

  const doc: DbOnboarding = {
    employeeName,
    email,
    phone: String(input.phone || "").trim().slice(0, 40),
    roleTarget: String(input.roleTarget || "Agent terrain / Nettoyeur")
      .trim()
      .slice(0, 80),
    site: String(input.site || "").trim().slice(0, 120),
    managerName: String(input.managerName || "").trim().slice(0, 120),
    startDate: String(input.startDate || "").trim().slice(0, 20),
    hiringDossierId: String(input.hiringDossierId || "").trim().slice(0, 40),
    status: "en_cours",
    tasks: emptyTasks(checklist),
    rhOwner: String(input.rhOwner || actor.name || "").trim().slice(0, 120),
    comments: String(input.comments || "").trim().slice(0, 2000),
    validatedAt: null,
    validatedByEmail: "",
    validatedByName: "",
    history: [entry],
    createdAt: now,
    updatedAt: now,
    createdByEmail: actor.email,
    createdByName: actor.name,
  };

  const col = await onboardingsCollection();
  const result = await col.insertOne(doc);
  return mapOnboarding({ ...doc, _id: result.insertedId }, checklist);
}

export async function updateOnboardingTask(
  id: string,
  taskId: string,
  done: boolean,
  note: string,
  actor: { email: string; name: string; role: UserRole | string },
) {
  const [doc, checklist] = await Promise.all([
    getRaw(id),
    getOnboardingChecklist(),
  ]);
  if (!doc) return null;
  if (doc.status === "valide") {
    throw new Error("Onboarding déjà validé — tâches verrouillées.");
  }

  const def = checklist.find((c) => c.id === taskId && c.active);
  if (!def) throw new Error("Tâche introuvable dans la checklist.");
  if (!canToggleOnboardingTask(actor.role, def.ownerRole)) {
    throw new Error("Vous ne pouvez pas modifier cette tâche.");
  }
  if (def.id === "validation_fin" && done) {
    throw new Error(
      "Utilisez « Valider la fin d’intégration » pour cette étape.",
    );
  }

  const tasks = [...(doc.tasks || [])];
  const idx = tasks.findIndex((t) => t.taskId === taskId);
  const stamp = done ? new Date().toISOString() : null;
  const next: OnboardingTask = {
    taskId,
    done,
    doneAt: stamp,
    doneByEmail: done ? actor.email : "",
    doneByName: done ? actor.name : "",
    note: String(note || "").trim().slice(0, 400),
  };
  if (idx >= 0) tasks[idx] = next;
  else tasks.push(next);

  const views = buildTaskViews(checklist, tasks);
  const summary = summarizeOnboarding(views);
  let status: OnboardingStatus = doc.status;
  if (doc.status !== "bloque") {
    status = summary.pendingBeforeValidate.length === 0 ? "pret" : "en_cours";
  }

  const entry = makeHistory({
    kind: "task",
    note: `${def.label} : ${done ? "fait" : "à faire"}${
      note ? ` · ${String(note).slice(0, 80)}` : ""
    }`,
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });

  const col = await onboardingsCollection();
  await col.updateOne(
    { _id: doc._id },
    {
      $set: { tasks, status, updatedAt: Date.now() },
      $push: { history: entry },
    },
  );
  const updated = await getRaw(id);
  return updated ? mapOnboarding(updated, checklist) : null;
}

export async function setOnboardingStatus(
  id: string,
  status: OnboardingStatus,
  actor: { email: string; name: string; role: UserRole | string },
  note = "",
) {
  const [doc, checklist] = await Promise.all([
    getRaw(id),
    getOnboardingChecklist(),
  ]);
  if (!doc) return null;

  if (status === "valide") {
    if (!canValidateOnboardingEnd(actor.role)) {
      throw new Error("Seuls RH / manager / admin peuvent valider la fin.");
    }
    const views = buildTaskViews(checklist, doc.tasks || []);
    if (!isOnboardingReadyToValidate(views)) {
      const pending = summarizeOnboarding(views).pendingBeforeValidate;
      throw new Error(
        `Impossible de valider la fin d’intégration — ${pending.slice(0, 6).join(" · ")}`,
      );
    }

    // Marquer la tâche validation_fin + sceau date
    const stamp = new Date().toISOString();
    const tasks = [...(doc.tasks || [])];
    const finIdx = tasks.findIndex((t) => t.taskId === "validation_fin");
    const finTask: OnboardingTask = {
      taskId: "validation_fin",
      done: true,
      doneAt: stamp,
      doneByEmail: actor.email,
      doneByName: actor.name,
      note: note || "Fin d’intégration validée",
    };
    if (finIdx >= 0) tasks[finIdx] = finTask;
    else tasks.push(finTask);

    const entry = makeHistory({
      kind: "validated",
      note: note || "Fin d’intégration validée",
      byEmail: actor.email,
      byName: actor.name,
      byRole: actor.role,
      at: stamp,
    });

    const col = await onboardingsCollection();
    await col.updateOne(
      { _id: doc._id },
      {
        $set: {
          status: "valide",
          tasks,
          validatedAt: stamp,
          validatedByEmail: actor.email,
          validatedByName: actor.name,
          updatedAt: Date.now(),
        },
        $push: { history: entry },
      },
    );
    const updated = await getRaw(id);
    return updated ? mapOnboarding(updated, checklist) : null;
  }

  if (status === "pret") {
    const views = buildTaskViews(checklist, doc.tasks || []);
    if (!isOnboardingReadyToValidate(views)) {
      throw new Error(
        `Checklist incomplète — ${summarizeOnboarding(views).pendingBeforeValidate.slice(0, 6).join(" · ")}`,
      );
    }
  }

  if (doc.status === "valide") {
    throw new Error("Réouverture d’un onboarding validé non autorisée.");
  }

  const entry = makeHistory({
    kind: "status",
    note: note || `Statut → ${status}`,
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });

  const col = await onboardingsCollection();
  await col.updateOne(
    { _id: doc._id },
    {
      $set: {
        status,
        updatedAt: Date.now(),
        validatedAt: null,
        validatedByEmail: "",
        validatedByName: "",
      },
      $push: { history: entry },
    },
  );
  const updated = await getRaw(id);
  return updated ? mapOnboarding(updated, checklist) : null;
}

export async function updateOnboardingMeta(
  id: string,
  patch: Partial<OnboardingInput>,
  actor: { email: string; name: string; role: UserRole | string },
) {
  const [doc, checklist] = await Promise.all([
    getRaw(id),
    getOnboardingChecklist(),
  ]);
  if (!doc) return null;
  if (doc.status === "valide") {
    throw new Error("Onboarding validé — fiche verrouillée.");
  }

  const entry = makeHistory({
    kind: "note",
    note: "Fiche onboarding mise à jour",
    byEmail: actor.email,
    byName: actor.name,
    byRole: actor.role,
  });

  const col = await onboardingsCollection();
  await col.updateOne(
    { _id: doc._id },
    {
      $set: {
        employeeName:
          patch.employeeName !== undefined
            ? patch.employeeName.trim().slice(0, 120)
            : doc.employeeName,
        email:
          patch.email !== undefined
            ? patch.email.trim().toLowerCase().slice(0, 180)
            : doc.email,
        phone:
          patch.phone !== undefined
            ? patch.phone.trim().slice(0, 40)
            : doc.phone,
        roleTarget:
          patch.roleTarget !== undefined
            ? patch.roleTarget.trim().slice(0, 80)
            : doc.roleTarget,
        site:
          patch.site !== undefined
            ? patch.site.trim().slice(0, 120)
            : doc.site,
        managerName:
          patch.managerName !== undefined
            ? patch.managerName.trim().slice(0, 120)
            : doc.managerName,
        startDate:
          patch.startDate !== undefined
            ? patch.startDate.trim().slice(0, 20)
            : doc.startDate,
        hiringDossierId:
          patch.hiringDossierId !== undefined
            ? patch.hiringDossierId.trim().slice(0, 40)
            : doc.hiringDossierId,
        rhOwner:
          patch.rhOwner !== undefined
            ? patch.rhOwner.trim().slice(0, 120)
            : doc.rhOwner,
        comments:
          patch.comments !== undefined
            ? patch.comments.trim().slice(0, 2000)
            : doc.comments,
        updatedAt: Date.now(),
      },
      $push: { history: entry },
    },
  );
  const updated = await getRaw(id);
  return updated ? mapOnboarding(updated, checklist) : null;
}

export async function deleteOnboarding(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await onboardingsCollection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}

export async function countOnboardingAlerts(): Promise<{
  enCours: number;
  pret: number;
  valides: number;
}> {
  const items = await listOnboardings();
  return {
    enCours: items.filter((i) => i.status === "en_cours").length,
    pret: items.filter((i) => i.status === "pret").length,
    valides: items.filter((i) => i.status === "valide").length,
  };
}
