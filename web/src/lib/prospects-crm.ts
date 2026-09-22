import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  DEFAULT_PROSPECT_STATUSES,
  isProspectPotential,
  normalizeProspectEmail,
  type Prospect,
  type ProspectContact,
  type ProspectHistoryEntry,
  type ProspectInput,
  type ProspectPotential,
  type ProspectStatusDef,
} from "@/lib/prospects-shared";

const COLLECTION = "crm_prospects";
const STATUS_COLLECTION = "crm_prospect_statuses";
const STATUS_DOC_ID = "default";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 400): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function history(
  kind: ProspectHistoryEntry["kind"],
  actor: Actor,
  detail: string,
): ProspectHistoryEntry {
  return {
    id: `PH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    kind,
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

async function col() {
  const db = await getDb();
  const c = db.collection<Prospect>(COLLECTION);
  void Promise.all([
    c.createIndex({ email: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ company: 1 }).catch(() => undefined),
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ assigneeEmail: 1, status: 1 }).catch(() => undefined),
    c.createIndex({ updatedAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

function makeContact(
  partial: Partial<ProspectContact>,
  isPrimary = false,
): ProspectContact {
  return {
    id: clean(partial.id, 40) || `PC-${randomUUID().slice(0, 6).toUpperCase()}`,
    name: clean(partial.name, 120),
    email: normalizeProspectEmail(partial.email),
    phone: clean(partial.phone, 40),
    role: clean(partial.role, 80),
    isPrimary,
  };
}

function ensurePrimaryContacts(
  contacts: ProspectContact[],
  fallback: { name: string; email: string; phone: string },
): ProspectContact[] {
  let list = contacts.filter((c) => c.name || c.email || c.phone);
  if (list.length === 0) {
    list = [
      makeContact(
        {
          name: fallback.name,
          email: fallback.email,
          phone: fallback.phone,
          role: "Contact principal",
        },
        true,
      ),
    ];
  }
  if (!list.some((c) => c.isPrimary)) {
    list = list.map((c, i) => ({ ...c, isPrimary: i === 0 }));
  }
  const primary = list.find((c) => c.isPrimary)!;
  return list.map((c) =>
    c.id === primary.id ? { ...c, isPrimary: true } : { ...c, isPrimary: false },
  );
}

async function save(doc: Prospect): Promise<Prospect> {
  const stamp = nowIso();
  const next = { ...doc, updatedAt: stamp };
  const c = await col();
  await c.replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

export async function listProspectStatuses(): Promise<ProspectStatusDef[]> {
  const db = await getDb();
  const doc = await db
    .collection<{ id: string; statuses: ProspectStatusDef[] }>(STATUS_COLLECTION)
    .findOne({ id: STATUS_DOC_ID });
  const statuses =
    doc?.statuses?.length && Array.isArray(doc.statuses)
      ? doc.statuses
      : DEFAULT_PROSPECT_STATUSES;
  return [...statuses]
    .filter((s) => s.active !== false)
    .sort((a, b) => a.order - b.order);
}

export async function listAllProspectStatuses(): Promise<ProspectStatusDef[]> {
  const db = await getDb();
  const doc = await db
    .collection<{ id: string; statuses: ProspectStatusDef[] }>(STATUS_COLLECTION)
    .findOne({ id: STATUS_DOC_ID });
  if (!doc?.statuses?.length) return [...DEFAULT_PROSPECT_STATUSES];
  return [...doc.statuses].sort((a, b) => a.order - b.order);
}

export async function saveProspectStatuses(
  statuses: ProspectStatusDef[],
  actor: Actor,
): Promise<ProspectStatusDef[]> {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    throw new Error("Au moins un statut est requis.");
  }
  const cleaned: ProspectStatusDef[] = statuses.map((s, i) => ({
    id: clean(s.id, 40)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_") || `statut_${i + 1}`,
    label: clean(s.label, 60) || `Statut ${i + 1}`,
    color: clean(s.color, 20) || "#64748b",
    qualifies: Boolean(s.qualifies),
    terminal: Boolean(s.terminal),
    active: s.active !== false,
    order: Number.isFinite(s.order) ? Number(s.order) : (i + 1) * 10,
  }));
  const ids = new Set(cleaned.map((s) => s.id));
  if (ids.size !== cleaned.length) {
    throw new Error("Identifiants de statut en double.");
  }
  if (!cleaned.some((s) => s.active)) {
    throw new Error("Au moins un statut actif est requis.");
  }
  const db = await getDb();
  await db.collection(STATUS_COLLECTION).replaceOne(
    { id: STATUS_DOC_ID },
    {
      id: STATUS_DOC_ID,
      statuses: cleaned,
      updatedAt: nowIso(),
      updatedBy: actor.userId,
      updatedByName: actor.name,
    },
    { upsert: true },
  );
  return cleaned.sort((a, b) => a.order - b.order);
}

async function resolveStatusId(
  raw: string | undefined,
  statuses: ProspectStatusDef[],
): Promise<string> {
  const active = statuses.filter((s) => s.active !== false);
  if (raw && active.some((s) => s.id === raw)) return raw;
  return active[0]?.id || "nouveau";
}

export async function listProspects(actor: Actor): Promise<Prospect[]> {
  const c = await col();
  const filter =
    actor.role === "commercial"
      ? {
          $or: [
            { assigneeEmail: actor.email.toLowerCase() },
            { assigneeEmail: "" },
            { assigneeEmail: { $exists: false } },
            { createdBy: actor.userId },
          ],
        }
      : {};
  const rows = await c.find(filter).sort({ updatedAt: -1 }).limit(500).toArray();
  return rows.map((r) => stripMongo(r) as Prospect);
}

export async function getProspect(id: string): Promise<Prospect | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return stripMongo(row) as Prospect;
}

export async function getProspectByEmail(
  emailRaw: string,
): Promise<Prospect | null> {
  const email = normalizeProspectEmail(emailRaw);
  if (!email) return null;
  const c = await col();
  const row = await c.findOne({ email });
  if (!row) return null;
  return stripMongo(row) as Prospect;
}

export async function searchProspects(query: string): Promise<Prospect[]> {
  const q = clean(query, 120).toLowerCase();
  if (!q) return [];
  const c = await col();
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rows = await c
    .find({
      $or: [
        { email: { $regex: esc, $options: "i" } },
        { company: { $regex: esc, $options: "i" } },
        { name: { $regex: esc, $options: "i" } },
        { phone: { $regex: esc, $options: "i" } },
        { city: { $regex: esc, $options: "i" } },
        { source: { $regex: esc, $options: "i" } },
        { campaign: { $regex: esc, $options: "i" } },
        { "contacts.name": { $regex: esc, $options: "i" } },
        { "contacts.email": { $regex: esc, $options: "i" } },
        { "contacts.phone": { $regex: esc, $options: "i" } },
      ],
    })
    .sort({ updatedAt: -1 })
    .limit(50)
    .toArray();
  return rows.map((r) => stripMongo(r) as Prospect);
}

export async function createProspect(
  input: ProspectInput,
  actor: Actor,
): Promise<{ prospect: Prospect; created: boolean; duplicate?: boolean }> {
  const email = normalizeProspectEmail(input.email);
  if (!email || !email.includes("@")) {
    throw new Error("E-mail principal requis (déduplication).");
  }
  const company = clean(input.company, 160);
  if (!company) throw new Error("Raison sociale / entreprise requise.");

  const existing = await getProspectByEmail(email);
  if (existing) {
    return { prospect: existing, created: false, duplicate: true };
  }

  const statuses = await listProspectStatuses();
  const status = await resolveStatusId(input.status, statuses);
  const potential: ProspectPotential = isProspectPotential(input.potential)
    ? input.potential
    : "moyen";
  const name = clean(input.name, 120) || company;
  const phone = clean(input.phone, 40);
  const contacts = ensurePrimaryContacts(
    (input.contacts || []).map((c, i) => makeContact(c, i === 0)),
    { name, email, phone },
  );
  const stamp = nowIso();
  const assigneeEmail =
    normalizeProspectEmail(input.assigneeEmail) || actor.email.toLowerCase();
  const assigneeName =
    clean(input.assigneeName, 120) ||
    (assigneeEmail === actor.email.toLowerCase() ? actor.name : "");

  const doc: Prospect = {
    id: `PRO-${randomUUID().slice(0, 8).toUpperCase()}`,
    company,
    name,
    email,
    phone,
    city: clean(input.city, 80),
    address: clean(input.address, 200),
    sector: clean(input.sector, 80),
    source: clean(input.source, 80) || "saisie_commerciale",
    campaign: clean(input.campaign, 120),
    potential,
    potentialValue: Math.max(0, Number(input.potentialValue) || 0),
    status,
    assigneeEmail,
    assigneeName,
    contacts,
    note: clean(input.note, 4000),
    qualifiedAt: null,
    qualifiedBy: "",
    qualifiedByName: "",
    history: [
      history(
        "created",
        actor,
        `Dossier créé · source ${clean(input.source, 80) || "saisie_commerciale"} · attribué à ${assigneeName || assigneeEmail}`,
      ),
    ],
    leadEmail: "",
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
  };

  await save(doc);
  return { prospect: doc, created: true };
}

export async function updateProspect(
  id: string,
  patch: Partial<ProspectInput>,
  actor: Actor,
): Promise<Prospect> {
  const existing = await getProspect(id);
  if (!existing) throw new Error("Prospect introuvable.");

  if (patch.email) {
    const nextEmail = normalizeProspectEmail(patch.email);
    if (nextEmail && nextEmail !== existing.email) {
      const clash = await getProspectByEmail(nextEmail);
      if (clash && clash.id !== existing.id) {
        throw new Error("Un prospect existe déjà avec cet e-mail (déduplication).");
      }
      existing.email = nextEmail;
    }
  }

  if (patch.company !== undefined) {
    const company = clean(patch.company, 160);
    if (!company) throw new Error("Entreprise requise.");
    existing.company = company;
  }
  if (patch.name !== undefined) existing.name = clean(patch.name, 120) || existing.company;
  if (patch.phone !== undefined) existing.phone = clean(patch.phone, 40);
  if (patch.city !== undefined) existing.city = clean(patch.city, 80);
  if (patch.address !== undefined) existing.address = clean(patch.address, 200);
  if (patch.sector !== undefined) existing.sector = clean(patch.sector, 80);
  if (patch.source !== undefined) existing.source = clean(patch.source, 80);
  if (patch.campaign !== undefined) existing.campaign = clean(patch.campaign, 120);
  if (isProspectPotential(patch.potential)) existing.potential = patch.potential;
  if (patch.potentialValue !== undefined) {
    existing.potentialValue = Math.max(0, Number(patch.potentialValue) || 0);
  }
  if (patch.note !== undefined) existing.note = clean(patch.note, 4000);

  existing.history = [
    history("updated", actor, "Fiche prospect mise à jour"),
    ...existing.history,
  ].slice(0, 80);

  return save(existing);
}

export async function assignProspect(
  id: string,
  input: { assigneeEmail: string; assigneeName?: string },
  actor: Actor,
): Promise<Prospect> {
  const existing = await getProspect(id);
  if (!existing) throw new Error("Prospect introuvable.");
  const email = normalizeProspectEmail(input.assigneeEmail);
  if (!email || !email.includes("@")) {
    throw new Error("E-mail commercial requis pour l’attribution.");
  }
  const name = clean(input.assigneeName, 120) || email;
  existing.assigneeEmail = email;
  existing.assigneeName = name;
  existing.history = [
    history("assigned", actor, `Attribué à ${name} <${email}>`),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function setProspectStatus(
  id: string,
  statusId: string,
  actor: Actor,
  note = "",
): Promise<Prospect> {
  const existing = await getProspect(id);
  if (!existing) throw new Error("Prospect introuvable.");
  const statuses = await listAllProspectStatuses();
  const def = statuses.find((s) => s.id === statusId && s.active !== false);
  if (!def) throw new Error("Statut invalide ou inactif.");

  const prev = existing.status;
  existing.status = def.id;
  if (note) existing.note = clean(note, 4000) || existing.note;
  if (def.qualifies && !existing.qualifiedAt) {
    existing.qualifiedAt = nowIso();
    existing.qualifiedBy = actor.userId;
    existing.qualifiedByName = actor.name;
  }
  existing.history = [
    history(
      def.qualifies ? "qualified" : "status",
      actor,
      `Statut ${prev} → ${def.label}${note ? ` · ${clean(note, 120)}` : ""}`,
    ),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function qualifyProspect(
  id: string,
  actor: Actor,
  input?: { potential?: ProspectPotential; potentialValue?: number; note?: string },
): Promise<Prospect> {
  const existing = await getProspect(id);
  if (!existing) throw new Error("Prospect introuvable.");
  if (!existing.company || !existing.email) {
    throw new Error("Entreprise et e-mail requis pour qualifier.");
  }
  if (!existing.source) {
    throw new Error("Source requise pour qualifier.");
  }
  if (existing.contacts.length === 0) {
    throw new Error("Au moins un contact est requis pour qualifier.");
  }

  const statuses = await listProspectStatuses();
  const qualifyStatus =
    statuses.find((s) => s.qualifies && !s.terminal) ||
    statuses.find((s) => s.id === "qualifie") ||
    statuses[0];
  if (!qualifyStatus) throw new Error("Aucun statut de qualification configuré.");

  if (isProspectPotential(input?.potential)) {
    existing.potential = input.potential;
  }
  if (input?.potentialValue !== undefined) {
    existing.potentialValue = Math.max(0, Number(input.potentialValue) || 0);
  }
  if (input?.note) existing.note = clean(input.note, 4000);

  existing.status = qualifyStatus.id;
  existing.qualifiedAt = nowIso();
  existing.qualifiedBy = actor.userId;
  existing.qualifiedByName = actor.name;
  existing.history = [
    history(
      "qualified",
      actor,
      `Prospect qualifié · potentiel ${existing.potential}${
        existing.potentialValue
          ? ` · ${existing.potentialValue.toLocaleString("fr-FR")} FCFA`
          : ""
      }`,
    ),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function addProspectContact(
  id: string,
  contact: Partial<ProspectContact>,
  actor: Actor,
): Promise<Prospect> {
  const existing = await getProspect(id);
  if (!existing) throw new Error("Prospect introuvable.");
  const name = clean(contact.name, 120);
  if (!name) throw new Error("Nom du contact requis.");
  const next = makeContact(contact, Boolean(contact.isPrimary));
  next.name = name;
  let contacts = [...existing.contacts, next];
  if (next.isPrimary) {
    contacts = contacts.map((c) => ({
      ...c,
      isPrimary: c.id === next.id,
    }));
    existing.name = next.name;
    if (next.email) existing.email = next.email;
    if (next.phone) existing.phone = next.phone;
  }
  existing.contacts = ensurePrimaryContacts(contacts, {
    name: existing.name,
    email: existing.email,
    phone: existing.phone,
  });
  existing.history = [
    history("contact_added", actor, `Contact ajouté : ${next.name}`),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function removeProspectContact(
  id: string,
  contactId: string,
  actor: Actor,
): Promise<Prospect> {
  const existing = await getProspect(id);
  if (!existing) throw new Error("Prospect introuvable.");
  if (existing.contacts.length <= 1) {
    throw new Error("Conservez au moins un contact sur le dossier.");
  }
  const target = existing.contacts.find((c) => c.id === contactId);
  if (!target) throw new Error("Contact introuvable.");
  existing.contacts = ensurePrimaryContacts(
    existing.contacts.filter((c) => c.id !== contactId),
    {
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
    },
  );
  existing.history = [
    history("contact_removed", actor, `Contact retiré : ${target.name}`),
    ...existing.history,
  ].slice(0, 80);
  return save(existing);
}

export async function importProspectFromLead(
  lead: {
    email: string;
    name?: string;
    company?: string;
    phone?: string;
    source?: string;
    campaign?: string;
    subject?: string;
    message?: string;
  },
  actor: Actor,
): Promise<{ prospect: Prospect; created: boolean; duplicate?: boolean }> {
  const result = await createProspect(
    {
      email: lead.email,
      name: lead.name,
      company: lead.company || lead.name || lead.email,
      phone: lead.phone,
      source: lead.source || "lead_site",
      campaign: lead.campaign,
      note: [lead.subject, lead.message].filter(Boolean).join("\n\n"),
      assigneeEmail: actor.email,
      assigneeName: actor.name,
    },
    actor,
  );
  if (result.created) {
    result.prospect.leadEmail = normalizeProspectEmail(lead.email);
    result.prospect.history = [
      history("imported", actor, "Importé depuis un lead site"),
      ...result.prospect.history,
    ].slice(0, 80);
    await save(result.prospect);
  }
  return result;
}

export async function countProspectsByStatus(): Promise<Record<string, number>> {
  const c = await col();
  const rows = await c
    .aggregate<{ _id: string; n: number }>([
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ])
    .toArray();
  return Object.fromEntries(rows.map((r) => [r._id || "inconnu", r.n]));
}
