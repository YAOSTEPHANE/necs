/**
 * Pont d’ingestion sociale → CRM.
 * Les connecteurs n’appellent jamais Mongo/CRM directement :
 * ajouter un réseau = nouveau fichier connecteur + register, sans toucher leads-crm.
 */
import { getDb } from "@/lib/mongo";
import {
  notifyCommercialNewLead,
  upsertLeadFromWeb,
} from "@/lib/leads-crm";
import type { SocialNormalizedLead } from "@/lib/social-connectors/types";

type IngestionDoc = {
  connectorId: string;
  externalId: string;
  email: string;
  crmLeadId: string;
  at: string;
  origin: "sync" | "webhook" | "test";
};

async function ingestionsCol() {
  const db = await getDb();
  const col = db.collection<IngestionDoc>("social_connector_ingestions");
  void col
    .createIndex(
      { connectorId: 1, externalId: 1 },
      { unique: true },
    )
    .catch(() => undefined);
  return col;
}

export async function ingestSocialLead(opts: {
  connectorId: string;
  crmSource: string;
  crmMedium: string;
  lead: SocialNormalizedLead;
  origin: IngestionDoc["origin"];
}): Promise<{
  created: boolean;
  skipped: boolean;
  leadId: string;
  email: string;
}> {
  const connectorId = opts.connectorId.trim().slice(0, 40);
  const externalId = opts.lead.externalId.trim().slice(0, 120);
  if (!connectorId || !externalId) {
    throw new Error("connectorId et externalId obligatoires");
  }

  const col = await ingestionsCol();
  const existing = await col.findOne({ connectorId, externalId });
  if (existing) {
    return {
      created: false,
      skipped: true,
      leadId: existing.crmLeadId,
      email: existing.email,
    };
  }

  const email =
    opts.lead.email.trim().toLowerCase() ||
    `${connectorId}-${externalId}@social.lead`;
  const campaign =
    (opts.lead.campaign || opts.lead.formName || opts.connectorId).slice(0, 120);
  const rawLines = opts.lead.raw
    ? Object.entries(opts.lead.raw)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    : "";

  const result = await upsertLeadFromWeb({
    name: opts.lead.name || email,
    company: opts.lead.company || "",
    email,
    phone: opts.lead.phone || "",
    subject:
      opts.lead.subject ||
      `Lead ${opts.crmSource} · ${campaign}`,
    message:
      opts.lead.message ||
      [
        `Lead importé via connecteur « ${connectorId} ».`,
        rawLines ? `\nChamps:\n${rawLines}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    formType: "contact",
    source: opts.crmSource,
    campaign,
    medium: opts.crmMedium,
    utmSource: opts.crmSource,
    pagePath: `social://${connectorId}/${externalId}`,
    consent: opts.lead.consent !== false,
    // Compat Facebook si le connecteur est facebook
    ...(connectorId === "facebook"
      ? {
          facebookLeadId: externalId,
          facebookFormName: opts.lead.formName,
        }
      : {}),
  });

  if (result.duplicate) {
    try {
      await col.insertOne({
        connectorId,
        externalId,
        email,
        crmLeadId: result.id,
        at: new Date().toISOString(),
        origin: opts.origin,
      });
    } catch {
      /* race */
    }
    return {
      created: false,
      skipped: true,
      leadId: result.id,
      email,
    };
  }

  try {
    await col.insertOne({
      connectorId,
      externalId,
      email,
      crmLeadId: result.id,
      at: new Date().toISOString(),
      origin: opts.origin,
    });
  } catch {
    return {
      created: false,
      skipped: true,
      leadId: result.id,
      email,
    };
  }

  if (result.created) {
    void notifyCommercialNewLead({ lead: result.lead, created: true }).catch(
      () => undefined,
    );
  }

  return {
    created: result.created,
    skipped: false,
    leadId: result.id,
    email,
  };
}

export async function listSocialIngestions(opts?: {
  connectorId?: string;
  limit?: number;
}) {
  const col = await ingestionsCol();
  const filter = opts?.connectorId
    ? { connectorId: opts.connectorId }
    : {};
  return col
    .find(filter)
    .sort({ at: -1 })
    .limit(opts?.limit ?? 40)
    .toArray();
}

export async function countSocialIngestions(
  connectorId: string,
): Promise<number> {
  const col = await ingestionsCol();
  return col.countDocuments({ connectorId });
}
