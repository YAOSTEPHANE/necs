import "server-only";

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { sendAppMail } from "@/lib/mail";
import { listUsers } from "@/lib/users-repo";
import { syncConsentPreferenceFromLead } from "@/lib/consent-preferences-crm";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseLeadObjectId(id?: string): ObjectId | null {
  const raw = (id || "").trim();
  if (!raw || !ObjectId.isValid(raw)) return null;
  try {
    return new ObjectId(raw);
  } catch {
    return null;
  }
}

export type LeadStatus = "nouveau" | "en_cours" | "traite";

export type LeadFormType = "devis" | "contact" | "visite" | "autre";

export type LeadInput = {
  name: string;
  company: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  formType?: LeadFormType;
  source?: string;
  campaign?: string;
  medium?: string;
  utmSource?: string;
  pagePath?: string;
  consent?: boolean;
  /** Identifiant leadgen Facebook (dédup externe). */
  facebookLeadId?: string;
  facebookFormId?: string;
  facebookPageId?: string;
  facebookAdId?: string;
  facebookFormName?: string;
};

export type DbLead = {
  _id?: ObjectId;
  email: string;
  name: string;
  company: string;
  phone: string;
  subject: string;
  message: string;
  status: LeadStatus;
  formType: LeadFormType;
  source: string;
  campaign: string;
  medium: string;
  utmSource: string;
  pagePath: string;
  consent: boolean;
  consentAt: string | null;
  /** Première attribution (conservée). */
  firstSource: string;
  firstCampaign: string;
  firstAt: string;
  /** Dernière interaction. */
  lastSource: string;
  lastCampaign: string;
  at: string;
  touchCount: number;
  createdAt: number;
  updatedAt: number;
  facebookLeadId?: string;
  facebookFormId?: string;
  facebookPageId?: string;
  facebookAdId?: string;
  facebookFormName?: string;
  submissions?: Array<{
    at: string;
    formType: LeadFormType;
    subject: string;
    source: string;
    campaign: string;
    pagePath: string;
    facebookLeadId?: string;
  }>;
};

function inferFormType(subject: string, explicit?: LeadFormType): LeadFormType {
  if (explicit) return explicit;
  const s = subject.toLowerCase();
  if (s.includes("visite")) return "visite";
  if (s.includes("devis")) return "devis";
  if (s.includes("contact")) return "contact";
  return "autre";
}

async function leadsCollection() {
  const db = await getDb();
  const col = db.collection<DbLead>("leads");
  // Index non bloquant : uniques échouent s’il reste des doublons legacy.
  void Promise.all([
    col.createIndex({ email: 1 }, { unique: true }).catch(() => undefined),
    col.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    col.createIndex({ createdAt: -1 }).catch(() => undefined),
    col.createIndex({ firstSource: 1, createdAt: -1 }).catch(() => undefined),
    col.createIndex({ firstCampaign: 1, createdAt: -1 }).catch(() => undefined),
    col
      .createIndex(
        { facebookLeadId: 1 },
        { unique: true, partialFilterExpression: { facebookLeadId: { $type: "string" } } },
      )
      .catch(() => undefined),
  ]);
  return col;
}

/**
 * Capture CRM : crée ou met à jour le prospect (déduplication e-mail).
 * Conserve la première source/campagne ; enregistre le dernier touch.
 */
export async function upsertLeadFromWeb(
  input: LeadInput,
): Promise<{
  id: string;
  at: string;
  created: boolean;
  lead: DbLead;
  duplicate?: boolean;
}> {
  const col = await leadsCollection();
  const email = input.email.trim().toLowerCase();
  const nowIso = new Date().toISOString();
  const now = Date.now();
  const formType = inferFormType(input.subject, input.formType);
  const source = (input.source || "site_web").trim().slice(0, 80) || "site_web";
  const campaign = (input.campaign || "").trim().slice(0, 120);
  const medium = (input.medium || "").trim().slice(0, 80);
  const utmSource = (input.utmSource || "").trim().slice(0, 80);
  const pagePath = (input.pagePath || "").trim().slice(0, 200);
  const consent = Boolean(input.consent);
  const facebookLeadId = (input.facebookLeadId || "").trim().slice(0, 80);
  const facebookFormId = (input.facebookFormId || "").trim().slice(0, 80);
  const facebookPageId = (input.facebookPageId || "").trim().slice(0, 80);
  const facebookAdId = (input.facebookAdId || "").trim().slice(0, 80);
  const facebookFormName = (input.facebookFormName || "").trim().slice(0, 160);

  void syncConsentPreferenceFromLead({
    email,
    contactName: input.name,
    company: input.company,
    consent,
  }).catch(() => undefined);

  // Dédup Facebook leadgen id (prioritaire)
  if (facebookLeadId) {
    const byFb = await col.findOne({ facebookLeadId });
    if (byFb) {
      return {
        id: String(byFb._id),
        at: byFb.at,
        created: false,
        lead: byFb,
        duplicate: true as const,
      };
    }
  }

  // Dédup e-mail : dernier document si doublons legacy
  const existing = await col.find({ email }).sort({ updatedAt: -1, createdAt: -1 }).limit(1).next();

  const submission = {
    at: nowIso,
    formType,
    subject: input.subject,
    source,
    campaign,
    pagePath,
    ...(facebookLeadId ? { facebookLeadId } : {}),
  };

  if (!existing) {
    const doc: DbLead = {
      email,
      name: input.name,
      company: input.company,
      phone: input.phone,
      subject: input.subject,
      message: input.message,
      status: "nouveau",
      formType,
      source,
      campaign,
      medium,
      utmSource,
      pagePath,
      consent,
      consentAt: consent ? nowIso : null,
      firstSource: source,
      firstCampaign: campaign,
      firstAt: nowIso,
      lastSource: source,
      lastCampaign: campaign,
      at: nowIso,
      touchCount: 1,
      createdAt: now,
      updatedAt: now,
      submissions: [submission],
      ...(facebookLeadId ? { facebookLeadId } : {}),
      ...(facebookFormId ? { facebookFormId } : {}),
      ...(facebookPageId ? { facebookPageId } : {}),
      ...(facebookAdId ? { facebookAdId } : {}),
      ...(facebookFormName ? { facebookFormName } : {}),
    };
    const result = await col.insertOne(doc);
    return {
      id: String(result.insertedId),
      at: nowIso,
      created: true,
      lead: { ...doc, _id: result.insertedId },
    };
  }

  const submissions = [...(existing.submissions ?? []), submission].slice(-20);
  // Ne jamais réouvrir un lead déjà traité / en cours : le badge « nouveau »
  // et les demandes du tableau de bord resteraient sinon à chaque retouch
  // (re-soumission formulaire, saisie client admin, sync Facebook e-mail).
  const nextStatus: LeadStatus =
    existing.status === "en_cours" || existing.status === "traite"
      ? existing.status
      : existing.status || "nouveau";

  const patch: Partial<DbLead> = {
    name: input.name || existing.name,
    company: input.company || existing.company,
    phone: input.phone || existing.phone,
    subject: input.subject || existing.subject,
    message: input.message || existing.message,
    status: nextStatus,
    formType,
    source,
    campaign: campaign || existing.campaign,
    medium: medium || existing.medium,
    utmSource: utmSource || existing.utmSource,
    pagePath: pagePath || existing.pagePath,
    lastSource: source,
    lastCampaign: campaign || existing.lastCampaign,
    at: nowIso,
    touchCount: (existing.touchCount || 1) + 1,
    updatedAt: now,
    submissions,
    // Première attribution figée
    firstSource: existing.firstSource || existing.source || source,
    firstCampaign: existing.firstCampaign || existing.campaign || campaign,
    firstAt: existing.firstAt || existing.at || nowIso,
  };

  if (consent && !existing.consent) {
    patch.consent = true;
    patch.consentAt = nowIso;
  }
  if (facebookLeadId && !existing.facebookLeadId) {
    patch.facebookLeadId = facebookLeadId;
  }
  if (facebookFormId) patch.facebookFormId = facebookFormId;
  if (facebookPageId) patch.facebookPageId = facebookPageId;
  if (facebookAdId) patch.facebookAdId = facebookAdId;
  if (facebookFormName) patch.facebookFormName = facebookFormName;

  // Toujours cibler le document trouvé (évite de patcher un doublon legacy).
  if (existing._id) {
    await col.updateOne({ _id: existing._id }, { $set: patch });
  } else {
    await col.updateOne({ email }, { $set: patch });
  }
  const lead = { ...existing, ...patch } as DbLead;
  return {
    id: String(existing._id),
    at: nowIso,
    created: false,
    lead,
  };
}

export async function listLeads(limit = 120) {
  const col = await leadsCollection();
  return col.find({}).sort({ updatedAt: -1, createdAt: -1 }).limit(limit).toArray();
}

export async function countLeadsByStatus(
  status: LeadStatus = "nouveau",
): Promise<number> {
  const col = await leadsCollection();
  return col.countDocuments({
    $or: [
      { status },
      ...(status === "nouveau" ? [{ status: { $exists: false } }] : []),
    ],
  });
}

export async function updateLeadStatus(
  email: string,
  at: string,
  status: LeadStatus,
  id?: string,
): Promise<boolean> {
  const col = await leadsCollection();
  const patch = { $set: { status, updatedAt: Date.now() } };

  const oid = parseLeadObjectId(id);
  if (oid) {
    const byId = await col.updateOne({ _id: oid }, patch);
    if (byId.matchedCount > 0) return true;
  }

  const normalized = email.trim().toLowerCase();
  if (at) {
    const byAt = await col.updateOne({ email: normalized, at }, patch);
    if (byAt.matchedCount > 0) return true;
  }

  // Doublons legacy / `at` réécrit par upsert : cibler le plus récent seulement.
  const latest = await col
    .find({ email: normalized })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(1)
    .next();
  if (!latest?._id) return false;
  const fallback = await col.updateOne({ _id: latest._id }, patch);
  return fallback.matchedCount > 0;
}

export async function deleteLead(
  email: string,
  at: string,
  id?: string,
): Promise<boolean> {
  const col = await leadsCollection();
  const oid = parseLeadObjectId(id);
  if (oid) {
    const byId = await col.deleteOne({ _id: oid });
    if (byId.deletedCount > 0) return true;
  }

  const normalized = email.trim().toLowerCase();
  if (at) {
    const byAt = await col.deleteOne({ email: normalized, at });
    if (byAt.deletedCount > 0) return true;
  }

  // Évite de supprimer un document arbitraire : uniquement le plus récent.
  const latest = await col
    .find({ email: normalized })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(1)
    .next();
  if (!latest?._id) return false;
  const byLatest = await col.deleteOne({ _id: latest._id });
  return byLatest.deletedCount > 0;
}

/** Notifie le commercial (env + comptes rôle commercial actifs). */
export async function notifyCommercialNewLead(input: {
  lead: DbLead;
  created: boolean;
}): Promise<void> {
  const recipients = new Set<string>();
  const envMail =
    process.env.LEADS_NOTIFY_EMAIL?.trim() ||
    process.env.COMMERCIAL_EMAIL?.trim() ||
    "";
  if (envMail.includes("@")) recipients.add(envMail.toLowerCase());

  try {
    const users = await listUsers();
    for (const u of users) {
      if (u.role === "commercial" && u.active && u.email.includes("@")) {
        recipients.add(u.email.trim().toLowerCase());
      }
    }
  } catch {
    /* ignore si DB users indisponible */
  }

  if (recipients.size === 0) {
    console.warn("[leads] Aucun destinataire notification commercial.");
    return;
  }

  const { lead, created } = input;
  // Pas d’e-mail si retouch d’un lead déjà traité / en cours (statut conservé).
  if (!created && lead.status !== "nouveau") {
    return;
  }
  const title = created ? "Nouveau prospect site web" : "Prospect mis à jour (nouvelle demande)";
  const app = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  const inbox = app ? `${app}/admin/demandes` : "/admin/demandes";
  const text = [
    title,
    "",
    `Nom : ${lead.name}`,
    `Entreprise : ${lead.company || "—"}`,
    `E-mail : ${lead.email}`,
    `Téléphone : ${lead.phone || "—"}`,
    `Type : ${lead.formType}`,
    `Objet : ${lead.subject}`,
    `Source : ${lead.lastSource || lead.source}`,
    `Campagne : ${lead.lastCampaign || lead.campaign || "—"}`,
    `Page : ${lead.pagePath || "—"}`,
    `Consentement : ${lead.consent ? "Oui" : "Non"}`,
    `Contacts cumulés : ${lead.touchCount}`,
    "",
    lead.message,
    "",
    `Ouvrir l’inbox : ${inbox}`,
  ].join("\n");

  const safe = {
    title: escapeHtml(title),
    name: escapeHtml(lead.name || ""),
    company: escapeHtml(lead.company || "—"),
    email: escapeHtml(lead.email || ""),
    phone: escapeHtml(lead.phone || "—"),
    formType: escapeHtml(lead.formType || ""),
    source: escapeHtml(
      `${lead.lastSource || lead.source} · ${lead.lastCampaign || lead.campaign || "—"}`,
    ),
    message: escapeHtml(lead.message || ""),
    inbox: escapeHtml(inbox),
  };
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h2 style="margin:0 0 8px;color:#0A3A72">${safe.title}</h2>
      <p style="margin:0 0 12px;color:#475569">Capture automatique CRM · NECS</p>
      <table style="border-collapse:collapse;width:100%;max-width:560px">
        <tr><td style="padding:6px 0;color:#64748b">Nom</td><td style="padding:6px 0;font-weight:700">${safe.name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Entreprise</td><td style="padding:6px 0">${safe.company}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">E-mail</td><td style="padding:6px 0"><a href="mailto:${safe.email}">${safe.email}</a></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Téléphone</td><td style="padding:6px 0">${safe.phone}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Type</td><td style="padding:6px 0">${safe.formType}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Source / campagne</td><td style="padding:6px 0">${safe.source}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Consentement</td><td style="padding:6px 0">${lead.consent ? "Oui" : "Non"}</td></tr>
      </table>
      <p style="margin:16px 0;white-space:pre-wrap">${safe.message}</p>
      <p><a href="${safe.inbox}" style="display:inline-block;padding:10px 16px;background:#0A3A72;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Ouvrir les demandes</a></p>
    </div>
  `;

  await Promise.all(
    [...recipients].map((to) =>
      sendAppMail({
        to,
        subject: `NECS · ${title} — ${lead.company || lead.name}`,
        text,
        html,
      }).then((r) => {
        if (!r.sent) console.warn("[leads] notif fail", to, r.reason);
      }),
    ),
  );
}
