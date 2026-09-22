import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import {
  getOpportunity,
  getOpportunityByProspect,
} from "@/lib/need-qualification-crm";
import { getProspect } from "@/lib/prospects-crm";
import type { UserRole } from "@/lib/settings";
import {
  buildVisitReportSnapshot,
  emptyVisitReport,
  isTechnicalVisitStatus,
  visitReportBlockingReasons,
  type ChecklistItemId,
  type TechnicalVisit,
  type TechnicalVisitInput,
  type TechnicalVisitReport,
  type VisitPhoto,
  type VisitZone,
} from "@/lib/technical-visit-shared";

const COLLECTION = "crm_technical_visits";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string) {
  return {
    id: `VH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

async function col() {
  const db = await getDb();
  const c = db.collection<TechnicalVisit>(COLLECTION);
  void Promise.all([
    c.createIndex({ status: 1, scheduledAt: 1 }).catch(() => undefined),
    c.createIndex({ prospectId: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ assigneeEmail: 1, status: 1 }).catch(() => undefined),
    c.createIndex({ updatedAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

async function save(doc: TechnicalVisit): Promise<TechnicalVisit> {
  const next = { ...doc, updatedAt: nowIso() };
  const c = await col();
  await c.replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

function normalizeReport(
  raw: Partial<TechnicalVisitReport> | null | undefined,
): TechnicalVisitReport {
  const base = emptyVisitReport();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    surfaceTotalM2:
      raw.surfaceTotalM2 === null || raw.surfaceTotalM2 === undefined
        ? null
        : Math.max(0, Number(raw.surfaceTotalM2) || 0) || null,
    zones: Array.isArray(raw.zones) ? raw.zones : [],
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    checklist:
      Array.isArray(raw.checklist) && raw.checklist.length > 0
        ? raw.checklist
        : base.checklist,
    constraints: clean(raw.constraints, 4000),
    observations: clean(raw.observations, 8000),
    accessNotes: clean(raw.accessNotes, 2000),
    interlocutor: clean(raw.interlocutor, 160),
    recommendedStaff:
      raw.recommendedStaff === null || raw.recommendedStaff === undefined
        ? null
        : Math.max(0, Number(raw.recommendedStaff) || 0) || null,
    risks: clean(raw.risks, 4000),
    needs: clean(raw.needs, 4000),
    recommendations: clean(raw.recommendations, 4000),
    actions: clean(raw.actions, 4000),
    validatedAt: raw.validatedAt ?? null,
    validatedBy: clean(raw.validatedBy, 80),
    validatedByName: clean(raw.validatedByName, 120),
    reportVersion: Number(raw.reportVersion) || 0,
  };
}

function coerceVisit(raw: Record<string, unknown>): TechnicalVisit {
  return {
    id: String(raw.id ?? ""),
    prospectId: String(raw.prospectId ?? ""),
    opportunityId: String(raw.opportunityId ?? ""),
    company: String(raw.company ?? ""),
    siteAddress: String(raw.siteAddress ?? ""),
    city: String(raw.city ?? ""),
    status: isTechnicalVisitStatus(raw.status) ? raw.status : "planifiee",
    scheduledAt: String(raw.scheduledAt ?? ""),
    scheduledEndAt: String(raw.scheduledEndAt ?? ""),
    assigneeEmail: String(raw.assigneeEmail ?? ""),
    assigneeName: String(raw.assigneeName ?? ""),
    assigneeRole: String(raw.assigneeRole ?? ""),
    contactName: String(raw.contactName ?? ""),
    contactPhone: String(raw.contactPhone ?? ""),
    note: String(raw.note ?? ""),
    report: normalizeReport(raw.report as TechnicalVisitReport | undefined),
    history: Array.isArray(raw.history)
      ? (raw.history as TechnicalVisit["history"])
      : [],
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
  };
}

export async function listTechnicalVisits(
  actor: Actor,
): Promise<TechnicalVisit[]> {
  const c = await col();
  const filter =
    actor.role === "commercial" || actor.role === "ops"
      ? {
          $or: [
            { assigneeEmail: actor.email.toLowerCase() },
            { createdBy: actor.userId },
            { assigneeEmail: "" },
          ],
        }
      : {};
  const rows = await c.find(filter).sort({ scheduledAt: -1 }).limit(400).toArray();
  return rows.map((r) => coerceVisit(stripMongo(r) as Record<string, unknown>));
}

export async function getTechnicalVisit(
  id: string,
): Promise<TechnicalVisit | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerceVisit(stripMongo(row) as Record<string, unknown>);
}

export async function planTechnicalVisit(
  input: TechnicalVisitInput,
  actor: Actor,
): Promise<TechnicalVisit> {
  const prospectId = clean(input.prospectId, 40);
  if (!prospectId) throw new Error("Prospect requis.");
  const scheduledAt = clean(input.scheduledAt, 40);
  if (!scheduledAt) throw new Error("Date/heure de visite requise.");

  const prospect = await getProspect(prospectId);
  if (!prospect) throw new Error("Prospect introuvable.");

  let opportunityId = clean(input.opportunityId, 40);
  if (!opportunityId) {
    const opp = await getOpportunityByProspect(prospectId);
    opportunityId = opp?.id || "";
  }

  const stamp = nowIso();
  const assigneeEmail =
    clean(input.assigneeEmail, 200).toLowerCase() || actor.email.toLowerCase();
  const assigneeName =
    clean(input.assigneeName, 120) ||
    (assigneeEmail === actor.email.toLowerCase() ? actor.name : assigneeEmail);

  // Prefill report from opportunity need if available
  let report = emptyVisitReport();
  if (opportunityId) {
    const opp = await getOpportunity(opportunityId);
    if (opp?.need) {
      report = {
        ...report,
        surfaceTotalM2: opp.need.surfaceM2,
        constraints: opp.need.constraints,
        accessNotes: opp.need.accessNotes,
        zones: opp.need.zones
          ? [
              {
                id: `ZN-${randomUUID().slice(0, 6).toUpperCase()}`,
                name: opp.need.zones,
                surfaceM2: opp.need.surfaceM2,
                note: opp.need.localType,
              },
            ]
          : [],
        recommendedStaff: opp.need.staffEstimate,
      };
    }
  }

  const doc: TechnicalVisit = {
    id: `VIS-${randomUUID().slice(0, 8).toUpperCase()}`,
    prospectId,
    opportunityId,
    company: clean(input.company, 160) || prospect.company,
    siteAddress:
      clean(input.siteAddress, 200) || prospect.address || prospect.city,
    city: clean(input.city, 80) || prospect.city,
    status: "planifiee",
    scheduledAt,
    scheduledEndAt: clean(input.scheduledEndAt, 40),
    assigneeEmail,
    assigneeName,
    assigneeRole: clean(input.assigneeRole, 40) || actor.role,
    contactName: clean(input.contactName, 120) || prospect.name,
    contactPhone: clean(input.contactPhone, 40) || prospect.phone,
    note: clean(input.note, 2000),
    report,
    history: [
      hist(
        actor,
        `Visite planifiée le ${scheduledAt} · assignée à ${assigneeName}`,
      ),
    ],
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
  };

  return save(doc);
}

export async function startTechnicalVisit(
  id: string,
  actor: Actor,
): Promise<TechnicalVisit> {
  const existing = await getTechnicalVisit(id);
  if (!existing) throw new Error("Visite introuvable.");
  if (existing.status === "validee") {
    throw new Error("Rapport déjà validé.");
  }
  if (existing.status === "annulee") {
    throw new Error("Visite annulée.");
  }
  existing.status = "en_cours";
  existing.history = [
    hist(actor, "Visite démarrée — collecte terrain"),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function updateVisitCollection(
  id: string,
  patch: {
    surfaceTotalM2?: number | null;
    constraints?: string;
    observations?: string;
    accessNotes?: string;
    interlocutor?: string;
    recommendedStaff?: number | null;
    risks?: string;
    needs?: string;
    recommendations?: string;
    actions?: string;
    siteAddress?: string;
    note?: string;
    zones?: VisitZone[];
  },
  actor: Actor,
): Promise<TechnicalVisit> {
  const existing = await getTechnicalVisit(id);
  if (!existing) throw new Error("Visite introuvable.");
  if (existing.status === "validee") {
    throw new Error("Rapport validé — modification interdite. Dupliquez si besoin.");
  }
  if (existing.status === "annulee") throw new Error("Visite annulée.");

  const report = { ...existing.report };
  if (patch.surfaceTotalM2 !== undefined) {
    report.surfaceTotalM2 =
      patch.surfaceTotalM2 === null
        ? null
        : Math.max(0, Number(patch.surfaceTotalM2) || 0) || null;
  }
  if (patch.constraints !== undefined) {
    report.constraints = clean(patch.constraints, 4000);
  }
  if (patch.observations !== undefined) {
    report.observations = clean(patch.observations, 8000);
  }
  if (patch.accessNotes !== undefined) {
    report.accessNotes = clean(patch.accessNotes, 2000);
  }
  if (patch.interlocutor !== undefined) {
    report.interlocutor = clean(patch.interlocutor, 160);
  }
  if (patch.recommendedStaff !== undefined) {
    report.recommendedStaff =
      patch.recommendedStaff === null
        ? null
        : Math.max(0, Number(patch.recommendedStaff) || 0) || null;
  }
  if (patch.risks !== undefined) {
    report.risks = clean(patch.risks, 4000);
  }
  if (patch.needs !== undefined) {
    report.needs = clean(patch.needs, 4000);
  }
  if (patch.recommendations !== undefined) {
    report.recommendations = clean(patch.recommendations, 4000);
  }
  if (patch.actions !== undefined) {
    report.actions = clean(patch.actions, 4000);
  }
  if (patch.zones) {
    report.zones = patch.zones
      .map((z) => ({
        id: clean(z.id, 40) || `ZN-${randomUUID().slice(0, 6).toUpperCase()}`,
        name: clean(z.name, 120),
        surfaceM2:
          z.surfaceM2 === null || z.surfaceM2 === undefined
            ? null
            : Math.max(0, Number(z.surfaceM2) || 0) || null,
        note: clean(z.note, 400),
      }))
      .filter((z) => z.name);
  }

  // Auto-tick checklist from data
  report.checklist = report.checklist.map((c) => {
    let auto = c.done;
    if (c.id === "surfaces" && report.surfaceTotalM2 && report.surfaceTotalM2 > 0) {
      auto = true;
    }
    if (c.id === "zones" && report.zones.length > 0) auto = true;
    if (c.id === "contraintes" && report.constraints.trim()) auto = true;
    if (c.id === "observations" && report.observations.trim()) auto = true;
    if (c.id === "photos" && report.photos.length > 0) auto = true;
    if (c.id === "interlocuteur" && report.interlocutor.trim()) auto = true;
    if (c.id === "acces" && report.accessNotes.trim()) auto = true;
    if (auto && !c.done) {
      return {
        ...c,
        done: true,
        doneAt: nowIso(),
        doneBy: actor.userId,
        doneByName: actor.name,
      };
    }
    return c;
  });

  existing.report = report;
  if (patch.siteAddress !== undefined) {
    existing.siteAddress = clean(patch.siteAddress, 200);
  }
  if (patch.note !== undefined) existing.note = clean(patch.note, 2000);
  if (existing.status === "planifiee" || existing.status === "en_cours") {
    existing.status = "rapport_brouillon";
  }
  existing.history = [
    hist(actor, "Collecte terrain / rapport mis à jour"),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function toggleVisitChecklist(
  id: string,
  itemId: ChecklistItemId,
  done: boolean,
  actor: Actor,
): Promise<TechnicalVisit> {
  const existing = await getTechnicalVisit(id);
  if (!existing) throw new Error("Visite introuvable.");
  if (existing.status === "validee") {
    throw new Error("Rapport validé.");
  }
  existing.report.checklist = existing.report.checklist.map((c) =>
    c.id === itemId
      ? {
          ...c,
          done,
          doneAt: done ? nowIso() : null,
          doneBy: done ? actor.userId : "",
          doneByName: done ? actor.name : "",
        }
      : c,
  );
  existing.history = [
    hist(actor, `Checklist « ${itemId} » → ${done ? "OK" : "à faire"}`),
    ...existing.history,
  ].slice(0, 80);
  if (existing.status === "planifiee") existing.status = "en_cours";
  return save(existing);
}

export async function addVisitPhoto(
  id: string,
  photo: { url: string; caption?: string },
  actor: Actor,
): Promise<TechnicalVisit> {
  const existing = await getTechnicalVisit(id);
  if (!existing) throw new Error("Visite introuvable.");
  if (existing.status === "validee") throw new Error("Rapport validé.");
  const url = clean(photo.url, 2_000_000);
  if (!url) throw new Error("Photo requise.");
  const entry: VisitPhoto = {
    id: `PH-${randomUUID().slice(0, 8).toUpperCase()}`,
    url,
    caption: clean(photo.caption, 200),
    takenAt: nowIso(),
    uploadedBy: actor.userId,
    uploadedByName: actor.name,
  };
  existing.report.photos = [entry, ...existing.report.photos].slice(0, 40);
  existing.report.checklist = existing.report.checklist.map((c) =>
    c.id === "photos"
      ? {
          ...c,
          done: true,
          doneAt: nowIso(),
          doneBy: actor.userId,
          doneByName: actor.name,
        }
      : c,
  );
  if (existing.status === "planifiee") existing.status = "en_cours";
  if (existing.status === "en_cours") existing.status = "rapport_brouillon";
  existing.history = [
    hist(actor, `Photo ajoutée (${entry.id})`),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function removeVisitPhoto(
  id: string,
  photoId: string,
  actor: Actor,
): Promise<TechnicalVisit> {
  const existing = await getTechnicalVisit(id);
  if (!existing) throw new Error("Visite introuvable.");
  if (existing.status === "validee") throw new Error("Rapport validé.");
  existing.report.photos = existing.report.photos.filter((p) => p.id !== photoId);
  if (existing.report.photos.length === 0) {
    existing.report.checklist = existing.report.checklist.map((c) =>
      c.id === "photos"
        ? { ...c, done: false, doneAt: null, doneBy: "", doneByName: "" }
        : c,
    );
  }
  existing.history = [
    hist(actor, `Photo retirée (${photoId})`),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

/**
 * Recette CRM-03 : valide le rapport horodaté exploitable pour le chiffrage.
 */
export async function validateVisitReport(
  id: string,
  actor: Actor,
): Promise<{ visit: TechnicalVisit; snapshot: ReturnType<typeof buildVisitReportSnapshot> }> {
  const existing = await getTechnicalVisit(id);
  if (!existing) throw new Error("Visite introuvable.");
  if (existing.status === "annulee") throw new Error("Visite annulée.");

  const blockers = visitReportBlockingReasons(existing);
  if (blockers.length > 0) {
    throw new Error(`Rapport non validable : ${blockers.join(" · ")}`);
  }

  const stamp = nowIso();
  existing.report.validatedAt = stamp;
  existing.report.validatedBy = actor.userId;
  existing.report.validatedByName = actor.name;
  existing.report.reportVersion = (existing.report.reportVersion || 0) + 1;
  existing.status = "validee";
  existing.history = [
    hist(
      actor,
      `Rapport validé v${existing.report.reportVersion} · horodatage ${stamp} · exploitable chiffrage`,
    ),
    ...existing.history,
  ].slice(0, 80);

  const visit = await save(existing);
  return { visit, snapshot: buildVisitReportSnapshot(visit) };
}

export async function cancelTechnicalVisit(
  id: string,
  actor: Actor,
  reason = "",
): Promise<TechnicalVisit> {
  const existing = await getTechnicalVisit(id);
  if (!existing) throw new Error("Visite introuvable.");
  if (existing.status === "validee") {
    throw new Error("Impossible d’annuler un rapport validé.");
  }
  existing.status = "annulee";
  existing.history = [
    hist(actor, `Visite annulée${reason ? ` · ${clean(reason, 200)}` : ""}`),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function getVisitQuotePayload(id: string) {
  const visit = await getTechnicalVisit(id);
  if (!visit) throw new Error("Visite introuvable.");
  const snapshot = buildVisitReportSnapshot(visit);
  if (!snapshot.exploitableForQuote) {
    throw new Error(
      "Rapport non exploitable pour le chiffrage. Validez d’abord le rapport complet.",
    );
  }
  return snapshot;
}
