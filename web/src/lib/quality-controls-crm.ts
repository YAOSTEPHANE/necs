import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { getOpsSite, listOpsSites } from "@/lib/ops-referential-crm";
import type { UserRole } from "@/lib/settings";
import {
  computeQualityScore,
  defaultQualityTemplate,
  dueDateForPeriodicity,
  isQualityControlStatus,
  isQualityPeriodicity,
  type QualityChecklistTemplate,
  type QualityControl,
  type QualityControlStatus,
  type QualityItemResult,
  type QualityPeriodicity,
} from "@/lib/quality-controls-shared";

const TEMPLATES = "ops_quality_templates";
const CONTROLS = "ops_quality_controls";

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
    id: `QH-${randomUUID().slice(0, 8).toUpperCase()}`,
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

async function templatesCol() {
  const db = await getDb();
  const c = db.collection<QualityChecklistTemplate>(TEMPLATES);
  void c.createIndex({ active: 1 }).catch(() => undefined);
  return c;
}

async function controlsCol() {
  const db = await getDb();
  const c = db.collection<QualityControl>(CONTROLS);
  void Promise.all([
    c.createIndex({ status: 1, dueDate: -1 }).catch(() => undefined),
    c.createIndex({ siteId: 1, dueDate: -1 }).catch(() => undefined),
    c.createIndex({ ref: 1 }, { unique: true }).catch(() => undefined),
  ]);
  return c;
}

function coerceTemplate(
  raw: Record<string, unknown>,
): QualityChecklistTemplate {
  return {
    id: String(raw.id ?? ""),
    label: String(raw.label ?? ""),
    periodicity: isQualityPeriodicity(raw.periodicity)
      ? raw.periodicity
      : "hebdo",
    passThreshold: Math.min(100, Math.max(0, Number(raw.passThreshold) || 80)),
    items: Array.isArray(raw.items)
      ? (raw.items as QualityChecklistTemplate["items"])
      : [],
    active: raw.active !== false,
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
  };
}

function coerceControl(raw: Record<string, unknown>): QualityControl {
  return {
    id: String(raw.id ?? ""),
    ref: String(raw.ref ?? ""),
    siteId: String(raw.siteId ?? ""),
    siteName: String(raw.siteName ?? ""),
    prestationId: String(raw.prestationId ?? ""),
    prestationLabel: String(raw.prestationLabel ?? ""),
    templateId: String(raw.templateId ?? ""),
    templateLabel: String(raw.templateLabel ?? ""),
    periodicity: isQualityPeriodicity(raw.periodicity)
      ? raw.periodicity
      : "hebdo",
    passThreshold: Math.min(100, Math.max(0, Number(raw.passThreshold) || 80)),
    dueDate: String(raw.dueDate ?? ""),
    status: isQualityControlStatus(raw.status) ? raw.status : "planifie",
    items: Array.isArray(raw.items)
      ? (raw.items as QualityItemResult[])
      : [],
    score: raw.score === null || raw.score === undefined ? null : Number(raw.score),
    passed:
      raw.passed === null || raw.passed === undefined
        ? null
        : Boolean(raw.passed),
    observations: String(raw.observations ?? ""),
    ncNote: String(raw.ncNote ?? ""),
    correctiveAction: String(raw.correctiveAction ?? ""),
    correctiveDue: String(raw.correctiveDue ?? ""),
    photos: Array.isArray(raw.photos)
      ? (raw.photos as QualityControl["photos"])
      : [],
    history: Array.isArray(raw.history)
      ? (raw.history as QualityControl["history"])
      : [],
    controllerId: String(raw.controllerId ?? ""),
    controllerName: String(raw.controllerName ?? ""),
    startedAt: raw.startedAt ? String(raw.startedAt) : null,
    completedAt: raw.completedAt ? String(raw.completedAt) : null,
    validatedAt: raw.validatedAt ? String(raw.validatedAt) : null,
    validatedBy: String(raw.validatedBy ?? ""),
    validatedByName: String(raw.validatedByName ?? ""),
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
  };
}

async function saveControl(doc: QualityControl): Promise<QualityControl> {
  const next = { ...doc, updatedAt: nowIso() };
  await (await controlsCol()).replaceOne({ id: doc.id }, next, {
    upsert: true,
  });
  return next;
}

export async function ensureDefaultQualityTemplate(): Promise<QualityChecklistTemplate> {
  const col = await templatesCol();
  const existing = await col.findOne({ active: true });
  if (existing) {
    return coerceTemplate(stripMongo(existing) as Record<string, unknown>);
  }
  const stamp = nowIso();
  const base = defaultQualityTemplate();
  const tpl: QualityChecklistTemplate = {
    ...base,
    id: `QAT-${randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await col.insertOne(tpl);
  return tpl;
}

export async function listQualityTemplates(): Promise<
  QualityChecklistTemplate[]
> {
  await ensureDefaultQualityTemplate();
  const rows = await (await templatesCol())
    .find({})
    .sort({ label: 1 })
    .limit(50)
    .toArray();
  return rows.map((r) =>
    coerceTemplate(stripMongo(r) as Record<string, unknown>),
  );
}

export async function listQualityControls(filter?: {
  status?: QualityControlStatus;
  siteId?: string;
}): Promise<QualityControl[]> {
  const q: Record<string, unknown> = {};
  if (filter?.status) q.status = filter.status;
  if (filter?.siteId) q.siteId = filter.siteId;
  const rows = await (await controlsCol())
    .find(q)
    .sort({ dueDate: -1, createdAt: -1 })
    .limit(300)
    .toArray();
  return rows.map((r) =>
    coerceControl(stripMongo(r) as Record<string, unknown>),
  );
}

export async function getQualityControl(
  id: string,
): Promise<QualityControl | null> {
  const row = await (await controlsCol()).findOne({ id });
  if (!row) return null;
  return coerceControl(stripMongo(row) as Record<string, unknown>);
}

export async function createQualityControl(
  input: {
    siteId: string;
    prestationId: string;
    templateId?: string;
    periodicity?: QualityPeriodicity;
    dueDate?: string;
    passThreshold?: number;
  },
  actor: Actor,
): Promise<QualityControl> {
  const site = await getOpsSite(input.siteId);
  if (!site) throw new Error("Site introuvable.");
  const prestation = site.prestations.find((p) => p.id === input.prestationId);
  if (!prestation) throw new Error("Prestation introuvable.");

  const templates = await listQualityTemplates();
  const tpl =
    templates.find((t) => t.id === input.templateId && t.active) ||
    templates.find((t) => t.active) ||
    (await ensureDefaultQualityTemplate());

  const periodicity = isQualityPeriodicity(input.periodicity)
    ? input.periodicity
    : tpl.periodicity;
  const passThreshold =
    input.passThreshold !== undefined
      ? Math.min(100, Math.max(0, Number(input.passThreshold) || 80))
      : tpl.passThreshold;

  const items: QualityItemResult[] = tpl.items.map((it) => ({
    itemId: it.id,
    label: it.label,
    weight: it.weight,
    photoRequired: it.photoRequired,
    score: null,
    done: false,
    comment: "",
    photoUrl: "",
    photoAt: null,
  }));

  const stamp = nowIso();
  const control: QualityControl = {
    id: `QA-${randomUUID().slice(0, 8).toUpperCase()}`,
    ref: `NECS-QA-${randomUUID().slice(0, 6).toUpperCase()}`,
    siteId: site.id,
    siteName: `${site.company} · ${site.name}`,
    prestationId: prestation.id,
    prestationLabel: prestation.label,
    templateId: tpl.id,
    templateLabel: tpl.label,
    periodicity,
    passThreshold,
    dueDate: clean(input.dueDate, 12) || dueDateForPeriodicity(periodicity),
    status: "planifie",
    items,
    score: null,
    passed: null,
    observations: "",
    ncNote: "",
    correctiveAction: "",
    correctiveDue: "",
    photos: [],
    history: [
      hist(
        actor,
        `Contrôle créé · ${prestation.label} @ ${site.name} · seuil ${passThreshold}% · ${periodicity}`,
      ),
    ],
    controllerId: actor.userId,
    controllerName: actor.name,
    startedAt: null,
    completedAt: null,
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
  };
  return saveControl(control);
}

export async function startQualityControl(
  id: string,
  actor: Actor,
): Promise<QualityControl> {
  const control = await getQualityControl(id);
  if (!control) throw new Error("Contrôle introuvable.");
  if (control.status === "cloture") throw new Error("Contrôle clôturé.");
  control.status = "en_cours";
  control.startedAt = control.startedAt || nowIso();
  control.controllerId = actor.userId;
  control.controllerName = actor.name;
  control.history = [
    hist(actor, "Contrôle démarré (mobile)"),
    ...control.history,
  ].slice(0, 80);
  return saveControl(control);
}

export async function scoreQualityItem(
  id: string,
  input: {
    itemId: string;
    score: number;
    comment?: string;
    photoUrl?: string;
  },
  actor: Actor,
): Promise<QualityControl> {
  const control = await getQualityControl(id);
  if (!control) throw new Error("Contrôle introuvable.");
  if (control.status === "cloture") throw new Error("Contrôle clôturé.");
  if (control.status === "planifie") {
    control.status = "en_cours";
    control.startedAt = control.startedAt || nowIso();
  }

  const score = Math.min(100, Math.max(0, Math.round(Number(input.score))));
  control.items = control.items.map((it) => {
    if (it.itemId !== input.itemId) return it;
    const photoUrl =
      input.photoUrl !== undefined ? clean(input.photoUrl, 2_000_000) : it.photoUrl;
    return {
      ...it,
      score,
      done: true,
      comment:
        input.comment !== undefined ? clean(input.comment, 500) : it.comment,
      photoUrl,
      photoAt: photoUrl && photoUrl !== it.photoUrl ? nowIso() : it.photoAt,
    };
  });

  const computed = computeQualityScore(control.items);
  control.score = computed.score;
  control.history = [
    hist(actor, `Item ${input.itemId} → ${score}/100`),
    ...control.history,
  ].slice(0, 80);
  return saveControl(control);
}

export async function addQualityPhoto(
  id: string,
  input: { url: string; caption?: string; itemId?: string },
  actor: Actor,
): Promise<QualityControl> {
  const control = await getQualityControl(id);
  if (!control) throw new Error("Contrôle introuvable.");
  if (control.status === "cloture") throw new Error("Contrôle clôturé.");
  const url = clean(input.url, 2_000_000);
  if (!url) throw new Error("Photo requise.");

  if (input.itemId) {
    control.items = control.items.map((it) =>
      it.itemId === input.itemId
        ? { ...it, photoUrl: url, photoAt: nowIso() }
        : it,
    );
  }

  control.photos = [
    {
      id: `QPH-${randomUUID().slice(0, 8).toUpperCase()}`,
      url,
      caption: clean(input.caption, 200),
      at: nowIso(),
    },
    ...control.photos,
  ].slice(0, 40);

  if (control.status === "planifie") {
    control.status = "en_cours";
    control.startedAt = control.startedAt || nowIso();
  }
  control.history = [
    hist(actor, `Photo ajoutée${input.itemId ? ` · ${input.itemId}` : ""}`),
    ...control.history,
  ].slice(0, 80);
  return saveControl(control);
}

export async function completeQualityControl(
  id: string,
  input: {
    observations?: string;
    ncNote?: string;
    correctiveAction?: string;
    correctiveDue?: string;
  },
  actor: Actor,
): Promise<QualityControl> {
  const control = await getQualityControl(id);
  if (!control) throw new Error("Contrôle introuvable.");
  if (control.status === "cloture") throw new Error("Déjà clôturé.");

  const computed = computeQualityScore(control.items);
  if (computed.score === null) {
    throw new Error("Tous les points de checklist doivent être notés.");
  }
  if (!computed.complete) {
    throw new Error(
      `Photos obligatoires manquantes : ${computed.missingPhotos.join(" · ")}`,
    );
  }

  const passed = computed.score >= control.passThreshold;
  control.score = computed.score;
  control.passed = passed;
  control.status = passed ? "conforme" : "non_conforme";
  control.completedAt = nowIso();
  control.observations =
    clean(input.observations, 4000) || control.observations;
  control.ncNote = passed ? "" : clean(input.ncNote, 2000) || control.ncNote;
  control.correctiveAction = passed
    ? ""
    : clean(input.correctiveAction, 2000) || control.correctiveAction;
  control.correctiveDue = passed
    ? ""
    : clean(input.correctiveDue, 12) || control.correctiveDue;
  control.validatedAt = nowIso();
  control.validatedBy = actor.userId;
  control.validatedByName = actor.name;

  if (!passed && !control.ncNote) {
    throw new Error("Motif de non-conformité requis sous le seuil.");
  }

  control.history = [
    hist(
      actor,
      `Contrôle validé · score ${computed.score}/${control.passThreshold} · ${passed ? "conforme" : "NC"}`,
    ),
    ...control.history,
  ].slice(0, 80);

  const saved = await saveControl(control);

  if (!passed) {
    try {
      const { createNonConformity } = await import(
        "@/lib/non-conformities-crm"
      );
      await createNonConformity(
        {
          title: `Écart CQ ${control.ref} — ${control.prestationLabel}`,
          description:
            control.ncNote ||
            `Score ${computed.score}/${control.passThreshold} sous le seuil.`,
          siteId: control.siteId,
          criticality: computed.score < 50 ? "critique" : "majeure",
          source: "controle_qualite",
          qualityControlId: control.id,
          dueDate: control.correctiveDue || undefined,
          correctiveAction: control.correctiveAction || undefined,
        },
        actor,
      );
      saved.history = [
        hist(actor, "Non-conformité créée automatiquement depuis le CQ"),
        ...saved.history,
      ].slice(0, 80);
      return saveControl(saved);
    } catch (err) {
      console.error("Création NC depuis CQ échouée:", err);
    }
  }

  return saved;
}

export async function closeQualityControl(
  id: string,
  actor: Actor,
): Promise<QualityControl> {
  const control = await getQualityControl(id);
  if (!control) throw new Error("Contrôle introuvable.");
  if (control.status !== "conforme" && control.status !== "non_conforme") {
    throw new Error("Terminez d’abord le contrôle.");
  }
  control.status = "cloture";
  control.history = [
    hist(actor, "Contrôle clôturé"),
    ...control.history,
  ].slice(0, 80);
  return saveControl(control);
}

export async function listQualitySites() {
  const sites = await listOpsSites({ status: "actif" });
  return sites.map((s) => ({
    id: s.id,
    name: `${s.company} · ${s.name}`,
    prestations: s.prestations
      .filter((p) => p.active)
      .map((p) => ({ id: p.id, label: p.label })),
  }));
}
