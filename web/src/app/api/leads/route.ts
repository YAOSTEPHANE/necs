import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  countLeadsByStatus,
  deleteLead,
  listLeads,
  notifyCommercialNewLead,
  updateLeadStatus,
  upsertLeadFromWeb,
  type LeadFormType,
  type LeadStatus,
} from "@/lib/leads-crm";
import {
  assertSameOrigin,
  clampText,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

const STATUSES: LeadStatus[] = ["nouveau", "en_cours", "traite"];
const FORM_TYPES: LeadFormType[] = ["devis", "contact", "visite", "autre"];

function mongoUnavailable() {
  return NextResponse.json(
    {
      error:
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour enregistrer les devis.",
    },
    { status: 503 },
  );
}

function normalizeStatus(raw: unknown): LeadStatus {
  const value = String(raw || "nouveau");
  return STATUSES.includes(value as LeadStatus)
    ? (value as LeadStatus)
    : "nouveau";
}

function normalizeFormType(raw: unknown): LeadFormType | undefined {
  const value = String(raw || "");
  return FORM_TYPES.includes(value as LeadFormType)
    ? (value as LeadFormType)
    : undefined;
}

async function requireLeadReader() {
  const session = await getServerSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  // Marketing / commercial / admin / qualité (inbox demandes digitales)
  if (
    session.role !== "admin" &&
    session.role !== "commercial" &&
    session.role !== "marketing" &&
    session.role !== "qualite"
  ) {
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  }
  return { session };
}

function mapLead(l: Record<string, unknown>) {
  return {
    id: String(l._id),
    name: String(l.name ?? "").slice(0, 120),
    company: String(l.company ?? "").slice(0, 120),
    email: String(l.email ?? "").slice(0, 180),
    phone: String(l.phone ?? "").slice(0, 40),
    subject: String(l.subject ?? "").slice(0, 160),
    message: String(l.message ?? "").slice(0, 4000),
    status: normalizeStatus(l.status),
    at: String(l.at ?? ""),
    formType: String(l.formType ?? ""),
    source: String(l.source ?? l.lastSource ?? "site_web"),
    campaign: String(l.campaign ?? l.lastCampaign ?? ""),
    firstSource: String(l.firstSource ?? l.source ?? ""),
    firstCampaign: String(l.firstCampaign ?? l.campaign ?? ""),
    medium: String(l.medium ?? ""),
    utmSource: String(l.utmSource ?? ""),
    pagePath: String(l.pagePath ?? ""),
    consent: Boolean(l.consent),
    consentAt: l.consentAt ? String(l.consentAt) : null,
    touchCount: Number(l.touchCount ?? 1),
    updatedAt: Number(l.updatedAt ?? l.createdAt ?? 0),
    facebookLeadId: l.facebookLeadId ? String(l.facebookLeadId) : "",
    facebookFormId: l.facebookFormId ? String(l.facebookFormId) : "",
    facebookFormName: l.facebookFormName ? String(l.facebookFormName) : "",
  };
}

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireLeadReader();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  if (url.searchParams.get("meta") === "1") {
    const open = await countLeadsByStatus("nouveau");
    return NextResponse.json({ open, nouveau: open });
  }

  const leads = await listLeads(120);
  return NextResponse.json({
    leads: leads.map((l) => mapLead(l as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  try {
    if (!hasMongoConfig()) return mongoUnavailable();

    if (!assertSameOrigin(request)) {
      return NextResponse.json(
        { error: "Origine non autorisée." },
        { status: 403 },
      );
    }
    if (!isJsonRequest(request)) {
      return NextResponse.json(
        { error: "Content-Type application/json requis." },
        { status: 415 },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      company?: string;
      email?: string;
      phone?: string;
      subject?: string;
      message?: string;
      formType?: string;
      source?: string;
      campaign?: string;
      medium?: string;
      utmSource?: string;
      pagePath?: string;
      consent?: boolean;
      /** Saisie manuelle par l’équipe (admin / commercial / marketing). */
      viaStaff?: boolean;
      siteAddress?: string;
      city?: string;
    };

    const viaStaff = Boolean(body.viaStaff);
    let staffSession: Awaited<ReturnType<typeof getServerSession>> = null;
    if (viaStaff) {
      const auth = await requireLeadReader();
      if (auth.error) return auth.error;
      staffSession = auth.session;
    }

    const ip = clientIp(request);
    const rl = viaStaff
      ? rateLimit(`leads-staff:${staffSession?.email || ip}`, 40, 15 * 60 * 1000)
      : rateLimit(`leads:${ip}`, 8, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de messages. Réessayez plus tard." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        },
      );
    }

    const name = clampText(String(body.name || ""), 120);
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    const company = clampText(String(body.company || ""), 120);
    const phone = clampText(String(body.phone || ""), 40);
    const subject = clampText(
      String(body.subject || (viaStaff ? "Demande travaux locaux" : "Demande de contact")),
      160,
    );
    const city = clampText(String(body.city || ""), 80);
    const siteAddress = clampText(String(body.siteAddress || ""), 200);
    const baseMessage = clampText(String(body.message || ""), 4000);
    const messageParts = [
      baseMessage,
      city ? `Ville / localisation : ${city}` : "",
      siteAddress ? `Adresse / locaux : ${siteAddress}` : "",
      viaStaff && staffSession
        ? `Saisi par : ${staffSession.name || staffSession.email} (${staffSession.role})`
        : "",
    ].filter(Boolean);
    const message = clampText(messageParts.join("\n"), 4000);
    const consent = Boolean(body.consent);

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nom et email requis." },
        { status: 400 },
      );
    }
    if (!email.includes("@") || email.length < 5) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json(
        {
          error: viaStaff
            ? "Confirmez que le consentement client a été obtenu (oral / écrit)."
            : "Le consentement au traitement des données est requis pour envoyer la demande.",
        },
        { status: 400 },
      );
    }

    const defaultSource = viaStaff ? "saisie_interne" : "site_web";
    const saved = await upsertLeadFromWeb({
      name,
      company,
      email,
      phone,
      subject,
      message,
      formType: normalizeFormType(body.formType) || (viaStaff ? "devis" : undefined),
      source: clampText(String(body.source || defaultSource), 80),
      campaign: clampText(String(body.campaign || ""), 120),
      medium: clampText(
        String(body.medium || (viaStaff ? "equipe" : "")),
        80,
      ),
      utmSource: clampText(String(body.utmSource || ""), 80),
      pagePath: clampText(
        String(body.pagePath || (viaStaff ? "/admin/demandes" : "")),
        200,
      ),
      consent,
    });

    // Notification commercial (sauf si le saisisseur est déjà commercial — on notifie quand même l’équipe)
    void notifyCommercialNewLead({
      lead: saved.lead,
      created: saved.created,
    }).catch((err) => console.error("[leads:notify]", err));

    return NextResponse.json({
      ok: true,
      id: saved.id,
      at: saved.at,
      created: saved.created,
      deduped: !saved.created,
      viaStaff,
    });
  } catch (error) {
    console.error("[leads]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Envoi impossible.") },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!hasMongoConfig()) return mongoUnavailable();
    if (!assertSameOrigin(request)) {
      return NextResponse.json(
        { error: "Origine non autorisée." },
        { status: 403 },
      );
    }

    const auth = await requireLeadReader();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      id?: string;
      email?: string;
      at?: string;
      status?: string;
    };
    const id = clampText(String(body.id || ""), 40);
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    const at = clampText(String(body.at || ""), 40);
    const status = normalizeStatus(body.status);

    if ((!email || !at) && !id) {
      return NextResponse.json(
        { error: "Identifiant ou email + horodatage requis." },
        { status: 400 },
      );
    }
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const ok = await updateLeadStatus(email, at, status, id || undefined);
    if (!ok) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error("[leads:patch]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Mise à jour impossible.") },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!hasMongoConfig()) return mongoUnavailable();
    if (!assertSameOrigin(request)) {
      return NextResponse.json(
        { error: "Origine non autorisée." },
        { status: 403 },
      );
    }

    const auth = await requireLeadReader();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      id?: string;
      email?: string;
      at?: string;
    };
    const id = clampText(String(body.id || ""), 40);
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    const at = clampText(String(body.at || ""), 40);
    if ((!email || !at) && !id) {
      return NextResponse.json(
        { error: "Identifiant ou email + horodatage requis." },
        { status: 400 },
      );
    }

    const removed = await deleteLead(email, at, id || undefined);
    if (!removed) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[leads:delete]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Suppression impossible.") },
      { status: 500 },
    );
  }
}
