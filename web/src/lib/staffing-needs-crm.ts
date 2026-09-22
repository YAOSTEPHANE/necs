import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { listContracts } from "@/lib/contracts-crm";
import { getOpsSite, listOpsSites } from "@/lib/ops-referential-crm";
import { listPlanningSlots } from "@/lib/ops-planning-crm";
import type { UserRole } from "@/lib/settings";
import {
  emptyValidation,
  isStaffingNeedSource,
  isStaffingNeedStatus,
  isStaffingProfile,
  staffingReadyToApprove,
  type StaffingHistoryEntry,
  type StaffingNeed,
  type StaffingNeedInput,
  type StaffingNeedSource,
  type StaffingNeedStatus,
  type StaffingProfile,
  type ValidationStamp,
} from "@/lib/staffing-needs-shared";

const COL = "rh_staffing_needs";

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

function hist(
  kind: StaffingHistoryEntry["kind"],
  actor: Actor,
  detail: string,
): StaffingHistoryEntry {
  return {
    id: `SNH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    kind,
    by: actor.userId,
    byName: actor.name,
    byRole: actor.role,
    detail: detail.slice(0, 400),
  };
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

async function col() {
  const db = await getDb();
  const c = db.collection<StaffingNeed>(COL);
  void Promise.all([
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ contractId: 1 }).catch(() => undefined),
    c.createIndex({ planningSlotId: 1 }).catch(() => undefined),
    c.createIndex({ ref: 1 }, { unique: true }).catch(() => undefined),
  ]);
  return c;
}

function coerceStamp(raw: unknown): ValidationStamp {
  if (!raw || typeof raw !== "object") return emptyValidation();
  const o = raw as Record<string, unknown>;
  return {
    ok: Boolean(o.ok),
    at: o.at === null || o.at === undefined ? null : String(o.at),
    by: String(o.by ?? ""),
    byName: String(o.byName ?? ""),
    note: String(o.note ?? ""),
  };
}

function coerce(raw: Record<string, unknown>): StaffingNeed {
  return {
    id: String(raw.id ?? ""),
    ref: String(raw.ref ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    status: isStaffingNeedStatus(raw.status) ? raw.status : "brouillon",
    source: isStaffingNeedSource(raw.source) ? raw.source : "manuel",
    contractId: String(raw.contractId ?? ""),
    contractLabel: String(raw.contractLabel ?? ""),
    contractStaffCount: Number(raw.contractStaffCount ?? 0) || 0,
    planningSlotId: String(raw.planningSlotId ?? ""),
    planningLabel: String(raw.planningLabel ?? ""),
    planningRequiredStaff: Number(raw.planningRequiredStaff ?? 0) || 0,
    siteId: String(raw.siteId ?? ""),
    siteName: String(raw.siteName ?? ""),
    clientName: String(raw.clientName ?? ""),
    profile: isStaffingProfile(raw.profile) ? raw.profile : "agent",
    headcount: Math.max(1, Math.round(Number(raw.headcount ?? 1) || 1)),
    startDate: String(raw.startDate ?? ""),
    endDate: String(raw.endDate ?? ""),
    budgetEstimate: Math.max(0, Math.round(Number(raw.budgetEstimate ?? 0) || 0)),
    hierarchical: coerceStamp(raw.hierarchical),
    budget: coerceStamp(raw.budget),
    approvedAt:
      raw.approvedAt === null || raw.approvedAt === undefined
        ? null
        : String(raw.approvedAt),
    approvedBy: String(raw.approvedBy ?? ""),
    approvedByName: String(raw.approvedByName ?? ""),
    refusedAt:
      raw.refusedAt === null || raw.refusedAt === undefined
        ? null
        : String(raw.refusedAt),
    refuseReason: String(raw.refuseReason ?? ""),
    history: Array.isArray(raw.history)
      ? (raw.history as StaffingHistoryEntry[])
      : [],
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
    createdByRole: String(raw.createdByRole ?? ""),
  };
}

async function save(need: StaffingNeed): Promise<StaffingNeed> {
  need.updatedAt = nowIso();
  const c = await col();
  await c.replaceOne({ id: need.id }, need, { upsert: true });
  return need;
}

export async function listStaffingNeeds(filter?: {
  status?: StaffingNeedStatus;
}): Promise<StaffingNeed[]> {
  const c = await col();
  const q: Record<string, unknown> = {};
  if (filter?.status) q.status = filter.status;
  const rows = await c.find(q).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) => coerce(stripMongo(r) as Record<string, unknown>));
}

export async function getStaffingNeed(
  id: string,
): Promise<StaffingNeed | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerce(stripMongo(row) as Record<string, unknown>);
}

export async function listStaffingNeedSources(actor: Actor) {
  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + 21);
  const to = toDate.toISOString().slice(0, 10);

  const [contracts, slots, sites] = await Promise.all([
    listContracts(actor).catch(() => []),
    listPlanningSlots({ from, to }).catch(() => []),
    listOpsSites({ status: "actif" }).catch(() => []),
  ]);

  const activeContracts = contracts
    .filter((c) => c.status === "actif" || c.status === "brouillon")
    .map((c) => ({
      id: c.id,
      label: `${c.company || c.contactName} · ${c.id}`,
      staffCount: c.staffCount,
      sites: c.sites.map((s) => ({
        id: s.id,
        name: s.name,
        city: s.city,
      })),
      clientName: c.company || c.contactName,
    }));

  const understaffed = slots
    .filter((s) => s.alerts.includes("sous_effectif") || s.requiredStaff > 0)
    .slice(0, 80)
    .map((s) => ({
      id: s.id,
      label: `${s.date} · ${s.siteName} · ${s.prestationLabel}`,
      requiredStaff: s.requiredStaff,
      assigned: s.assignments.filter((a) => a.status !== "absent").length,
      siteId: s.siteId,
      siteName: s.siteName,
      clientName: s.clientName,
      contractId: s.contractId,
      understaffed: s.alerts.includes("sous_effectif"),
    }));

  return {
    contracts: activeContracts,
    planningSlots: understaffed,
    sites: sites.map((s) => ({
      id: s.id,
      name: `${s.company} · ${s.name}`,
      clientName: s.company,
    })),
  };
}

export async function createStaffingNeed(
  input: StaffingNeedInput,
  actor: Actor,
): Promise<StaffingNeed> {
  const title = clean(input.title, 200);
  if (!title) throw new Error("Titre du besoin requis.");

  let source: StaffingNeedSource = isStaffingNeedSource(input.source)
    ? input.source
    : "manuel";
  let contractId = "";
  let contractLabel = "";
  let contractStaffCount = 0;
  let planningSlotId = "";
  let planningLabel = "";
  let planningRequiredStaff = 0;
  let siteId = clean(input.siteId, 80);
  let siteName = clean(input.siteName, 160);
  let clientName = clean(input.clientName, 120);

  if (input.contractId) {
    const contracts = await listContracts(actor);
    const c = contracts.find((x) => x.id === clean(input.contractId, 80));
    if (c) {
      contractId = c.id;
      contractLabel = `${c.company || c.contactName} · ${c.id}`;
      contractStaffCount = c.staffCount;
      clientName = clientName || c.company || c.contactName;
      source = "contrat";
      if (!siteId && c.sites[0]) {
        siteId = c.sites[0].id;
        siteName = c.sites[0].name;
      }
    }
  }

  if (input.planningSlotId) {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 7);
    const to = new Date(today);
    to.setDate(to.getDate() + 45);
    const slots = await listPlanningSlots({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
    const slot = slots.find((s) => s.id === clean(input.planningSlotId, 80));
    if (slot) {
      planningSlotId = slot.id;
      planningLabel = `${slot.date} · ${slot.siteName} · ${slot.prestationLabel}`;
      planningRequiredStaff = slot.requiredStaff;
      siteId = siteId || slot.siteId;
      siteName = siteName || slot.siteName;
      clientName = clientName || slot.clientName;
      if (!contractId && slot.contractId) {
        contractId = slot.contractId;
      }
      source = source === "manuel" ? "planning" : source;
    }
  }

  if (siteId && !siteName) {
    const site = await getOpsSite(siteId);
    if (site) {
      siteName = `${site.company} · ${site.name}`;
      clientName = clientName || site.company;
    }
  }

  const profile: StaffingProfile = isStaffingProfile(input.profile)
    ? input.profile
    : "agent";
  const headcount = Math.max(1, Math.round(Number(input.headcount ?? 1) || 1));
  const budgetEstimate = Math.max(
    0,
    Math.round(Number(input.budgetEstimate ?? 0) || 0),
  );

  const now = nowIso();
  const id = `BES-${randomUUID().slice(0, 10).toUpperCase()}`;
  const ref = `BES-${Date.now().toString(36).toUpperCase()}`;

  const need: StaffingNeed = {
    id,
    ref,
    title,
    description: clean(input.description, 4000),
    status: "brouillon",
    source,
    contractId,
    contractLabel,
    contractStaffCount,
    planningSlotId,
    planningLabel,
    planningRequiredStaff,
    siteId,
    siteName,
    clientName,
    profile,
    headcount,
    startDate: clean(input.startDate, 12),
    endDate: clean(input.endDate, 12),
    budgetEstimate,
    hierarchical: emptyValidation(),
    budget: emptyValidation(),
    approvedAt: null,
    approvedBy: "",
    approvedByName: "",
    refusedAt: null,
    refuseReason: "",
    history: [
      hist(
        "created",
        actor,
        `Besoin créé · ${headcount}× ${profile} · source ${source}`,
      ),
    ],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    createdByRole: actor.role,
  };

  return save(need);
}

export async function submitStaffingNeed(
  id: string,
  actor: Actor,
): Promise<StaffingNeed> {
  const need = await getStaffingNeed(id);
  if (!need) throw new Error("Demande introuvable.");
  if (need.status !== "brouillon" && need.status !== "refuse") {
    throw new Error("Seuls les brouillons (ou refus) peuvent être soumis.");
  }
  if (need.headcount < 1) throw new Error("Effectif demandé invalide.");
  if (!need.title.trim()) throw new Error("Titre requis.");

  return save({
    ...need,
    status: "soumis",
    hierarchical: emptyValidation(),
    budget: emptyValidation(),
    approvedAt: null,
    approvedBy: "",
    approvedByName: "",
    refusedAt: null,
    refuseReason: "",
    history: [
      hist("submitted", actor, "Demande soumise pour validations"),
      ...need.history,
    ].slice(0, 80),
  });
}

async function maybeAutoApprove(
  need: StaffingNeed,
  actor: Actor,
): Promise<StaffingNeed> {
  if (!staffingReadyToApprove(need)) return need;
  const stamp = nowIso();
  return {
    ...need,
    status: "approuve",
    approvedAt: stamp,
    approvedBy: actor.userId,
    approvedByName: actor.name,
    history: [
      hist(
        "approved",
        actor,
        "Demande approuvée — validations hiérarchique et budgétaire OK",
      ),
      ...need.history,
    ].slice(0, 80),
  };
}

export async function validateStaffingHierarchical(
  id: string,
  input: { approve: boolean; note?: string },
  actor: Actor,
): Promise<StaffingNeed> {
  const need = await getStaffingNeed(id);
  if (!need) throw new Error("Demande introuvable.");
  if (need.status !== "soumis" && need.status !== "en_validation") {
    throw new Error("Demande non soumise.");
  }

  const note = clean(input.note, 500);
  if (!input.approve) {
    return save({
      ...need,
      status: "refuse",
      hierarchical: {
        ok: false,
        at: nowIso(),
        by: actor.userId,
        byName: actor.name,
        note,
      },
      refusedAt: nowIso(),
      refuseReason: note || "Refus hiérarchique",
      history: [
        hist(
          "refused",
          actor,
          `Refus hiérarchique${note ? ` · ${note}` : ""}`,
        ),
        ...need.history,
      ].slice(0, 80),
    });
  }

  let next: StaffingNeed = {
    ...need,
    status: "en_validation",
    hierarchical: {
      ok: true,
      at: nowIso(),
      by: actor.userId,
      byName: actor.name,
      note,
    },
    history: [
      hist(
        "hierarchical",
        actor,
        `Validation hiérarchique OK${note ? ` · ${note}` : ""}`,
      ),
      ...need.history,
    ].slice(0, 80),
  };
  next = await maybeAutoApprove(next, actor);
  return save(next);
}

export async function validateStaffingBudget(
  id: string,
  input: { approve: boolean; note?: string; budgetEstimate?: number },
  actor: Actor,
): Promise<StaffingNeed> {
  const need = await getStaffingNeed(id);
  if (!need) throw new Error("Demande introuvable.");
  if (need.status !== "soumis" && need.status !== "en_validation") {
    throw new Error("Demande non soumise.");
  }
  if (!need.hierarchical.ok) {
    throw new Error("Validation hiérarchique requise avant le budget.");
  }

  const note = clean(input.note, 500);
  if (!input.approve) {
    return save({
      ...need,
      status: "refuse",
      budget: {
        ok: false,
        at: nowIso(),
        by: actor.userId,
        byName: actor.name,
        note,
      },
      refusedAt: nowIso(),
      refuseReason: note || "Refus budgétaire",
      history: [
        hist("refused", actor, `Refus budgétaire${note ? ` · ${note}` : ""}`),
        ...need.history,
      ].slice(0, 80),
    });
  }

  const budgetEstimate =
    input.budgetEstimate !== undefined
      ? Math.max(0, Math.round(Number(input.budgetEstimate) || 0))
      : need.budgetEstimate;

  let next: StaffingNeed = {
    ...need,
    budgetEstimate,
    status: "en_validation",
    budget: {
      ok: true,
      at: nowIso(),
      by: actor.userId,
      byName: actor.name,
      note,
    },
    history: [
      hist(
        "budget",
        actor,
        `Validation budgétaire OK · ${budgetEstimate} FCFA/mois${note ? ` · ${note}` : ""}`,
      ),
      ...need.history,
    ].slice(0, 80),
  };
  next = await maybeAutoApprove(next, actor);
  return save(next);
}

export async function cancelStaffingNeed(
  id: string,
  actor: Actor,
  note = "",
): Promise<StaffingNeed> {
  const need = await getStaffingNeed(id);
  if (!need) throw new Error("Demande introuvable.");
  if (need.status === "approuve") {
    throw new Error("Une demande approuvée ne peut pas être annulée.");
  }
  return save({
    ...need,
    status: "annule",
    history: [
      hist(
        "cancelled",
        actor,
        `Annulée${note ? ` · ${clean(note, 200)}` : ""}`,
      ),
      ...need.history,
    ].slice(0, 80),
  });
}
