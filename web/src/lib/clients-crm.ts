import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import {
  notifyCommercialNewLead,
  upsertLeadFromWeb,
  type LeadFormType,
} from "@/lib/leads-crm";

export type ClientStatus = "prospect" | "actif" | "inactif";

export type ClientInput = {
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  siteType: string;
  surface: string;
  source: string;
  campaign: string;
  formType?: LeadFormType;
  subject: string;
  message: string;
  consent: boolean;
  status?: ClientStatus;
  createdBy?: string;
  createdByRole?: string;
  /** Si true, crée aussi une demande dans Demandes site. */
  submitRequest?: boolean;
};

export type DbClient = {
  _id?: ObjectId;
  email: string;
  name: string;
  company: string;
  phone: string;
  city: string;
  address: string;
  siteType: string;
  surface: string;
  status: ClientStatus;
  source: string;
  campaign: string;
  consent: boolean;
  consentAt: string | null;
  lastSubject: string;
  lastMessage: string;
  lastFormType: LeadFormType;
  createdBy: string;
  createdByRole: string;
  touchCount: number;
  firstAt: string;
  at: string;
  createdAt: number;
  updatedAt: number;
};

async function clientsCollection() {
  const db = await getDb();
  const col = db.collection<DbClient>("clients");
  void Promise.all([
    col.createIndex({ email: 1 }, { unique: true }).catch(() => undefined),
    col.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    col.createIndex({ updatedAt: -1 }).catch(() => undefined),
    col.createIndex({ company: 1 }).catch(() => undefined),
  ]);
  return col;
}

/**
 * Saisie équipe : crée ou met à jour le client (dédup e-mail).
 * Optionnellement soumet une demande de travaux → lead CRM.
 */
export async function upsertClientAndSubmit(input: ClientInput): Promise<{
  clientId: string;
  leadId: string | null;
  at: string;
  created: boolean;
  client: DbClient;
  requestSubmitted: boolean;
}> {
  const col = await clientsCollection();
  const email = input.email.trim().toLowerCase();
  const nowIso = new Date().toISOString();
  const now = Date.now();
  const formType: LeadFormType = input.formType || "devis";
  const source =
    (input.source || "saisie_interne").trim().slice(0, 80) || "saisie_interne";
  const campaign = (input.campaign || "").trim().slice(0, 120);
  const consent = Boolean(input.consent);
  const status: ClientStatus = input.status || "prospect";
  const submitRequest = Boolean(input.submitRequest) && Boolean(input.message.trim());

  const existing = await col
    .find({ email })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(1)
    .next();

  const basePatch: Partial<DbClient> = {
    name: input.name.trim(),
    company: input.company.trim(),
    phone: input.phone.trim(),
    city: input.city.trim(),
    address: input.address.trim(),
    siteType: input.siteType.trim(),
    surface: input.surface.trim(),
    status: existing?.status === "actif" ? "actif" : status,
    source,
    campaign: campaign || existing?.campaign || "",
    lastSubject: input.subject.trim() || existing?.lastSubject || "",
    lastMessage: input.message.trim() || existing?.lastMessage || "",
    lastFormType: formType,
    createdBy: input.createdBy || existing?.createdBy || "",
    createdByRole: input.createdByRole || existing?.createdByRole || "",
    at: nowIso,
    updatedAt: now,
  };

  if (consent) {
    basePatch.consent = true;
    basePatch.consentAt = existing?.consentAt || nowIso;
  }

  let client: DbClient;
  let created: boolean;
  let clientId: string;

  if (!existing) {
    const doc: DbClient = {
      email,
      name: basePatch.name || "",
      company: basePatch.company || "",
      phone: basePatch.phone || "",
      city: basePatch.city || "",
      address: basePatch.address || "",
      siteType: basePatch.siteType || "",
      surface: basePatch.surface || "",
      status,
      source,
      campaign,
      consent,
      consentAt: consent ? nowIso : null,
      lastSubject: basePatch.lastSubject || "",
      lastMessage: basePatch.lastMessage || "",
      lastFormType: formType,
      createdBy: basePatch.createdBy || "",
      createdByRole: basePatch.createdByRole || "",
      touchCount: 1,
      firstAt: nowIso,
      at: nowIso,
      createdAt: now,
      updatedAt: now,
    };
    const result = await col.insertOne(doc);
    clientId = String(result.insertedId);
    client = { ...doc, _id: result.insertedId };
    created = true;
  } else {
    const touchCount = (existing.touchCount || 1) + 1;
    await col.updateOne(
      { email },
      {
        $set: {
          ...basePatch,
          touchCount,
          firstAt: existing.firstAt || existing.at || nowIso,
        },
      },
    );
    clientId = String(existing._id);
    client = {
      ...existing,
      ...basePatch,
      touchCount,
      firstAt: existing.firstAt || existing.at || nowIso,
    } as DbClient;
    created = false;
  }

  if (!submitRequest) {
    return {
      clientId,
      leadId: null,
      at: nowIso,
      created,
      client,
      requestSubmitted: false,
    };
  }

  const leadMessage = [
    input.message.trim(),
    "",
    input.city ? `Ville : ${input.city}` : "",
    input.address ? `Locaux / adresse : ${input.address}` : "",
    input.siteType ? `Type de site : ${input.siteType}` : "",
    input.surface ? `Surface : ${input.surface}` : "",
    input.createdBy
      ? `Saisi par : ${input.createdBy}${input.createdByRole ? ` (${input.createdByRole})` : ""}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const lead = await upsertLeadFromWeb({
    name: input.name,
    company: input.company,
    email,
    phone: input.phone,
    subject: input.subject || "Demande travaux locaux",
    message: leadMessage,
    formType,
    source,
    campaign,
    medium: "equipe",
    pagePath: "/admin/clients",
    consent,
  });

  void notifyCommercialNewLead({
    lead: lead.lead,
    created: lead.created,
  }).catch((err) => console.error("[clients:notify]", err));

  return {
    clientId,
    leadId: lead.id,
    at: nowIso,
    created,
    client,
    requestSubmitted: true,
  };
}

export async function listClients(limit = 150) {
  const col = await clientsCollection();
  return col
    .find({})
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function updateClientStatus(
  email: string,
  status: ClientStatus,
): Promise<boolean> {
  const col = await clientsCollection();
  const result = await col.updateOne(
    { email: email.trim().toLowerCase() },
    { $set: { status, updatedAt: Date.now() } },
  );
  return result.matchedCount > 0;
}

export async function deleteClient(email: string): Promise<boolean> {
  const col = await clientsCollection();
  const result = await col.deleteOne({ email: email.trim().toLowerCase() });
  return result.deletedCount > 0;
}
