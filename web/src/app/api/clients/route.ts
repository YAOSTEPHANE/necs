import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  deleteClient,
  listClients,
  updateClientStatus,
  upsertClientAndSubmit,
  type ClientStatus,
} from "@/lib/clients-crm";
import type { LeadFormType } from "@/lib/leads-crm";
import {
  assertSameOrigin,
  clampText,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

const STATUSES: ClientStatus[] = ["prospect", "actif", "inactif"];
const FORM_TYPES: LeadFormType[] = ["devis", "contact", "visite", "autre"];

function mongoUnavailable() {
  return NextResponse.json(
    {
      error:
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB).",
    },
    { status: 503 },
  );
}

async function requireClientsAccess() {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (
    session.role !== "admin" &&
    session.role !== "commercial" &&
    session.role !== "marketing"
  ) {
    return {
      error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    };
  }
  return { session };
}

function normalizeStatus(raw: unknown): ClientStatus {
  const value = String(raw || "prospect");
  return STATUSES.includes(value as ClientStatus)
    ? (value as ClientStatus)
    : "prospect";
}

function normalizeFormType(raw: unknown): LeadFormType {
  const value = String(raw || "devis");
  return FORM_TYPES.includes(value as LeadFormType)
    ? (value as LeadFormType)
    : "devis";
}

function mapClient(c: Record<string, unknown>) {
  return {
    id: String(c._id),
    name: String(c.name ?? ""),
    company: String(c.company ?? ""),
    email: String(c.email ?? ""),
    phone: String(c.phone ?? ""),
    city: String(c.city ?? ""),
    address: String(c.address ?? ""),
    siteType: String(c.siteType ?? ""),
    surface: String(c.surface ?? ""),
    status: normalizeStatus(c.status),
    source: String(c.source ?? ""),
    campaign: String(c.campaign ?? ""),
    consent: Boolean(c.consent),
    consentAt: c.consentAt ? String(c.consentAt) : null,
    lastSubject: String(c.lastSubject ?? ""),
    lastMessage: String(c.lastMessage ?? ""),
    lastFormType: String(c.lastFormType ?? "devis"),
    createdBy: String(c.createdBy ?? ""),
    touchCount: Number(c.touchCount ?? 1),
    at: String(c.at ?? ""),
    firstAt: String(c.firstAt ?? ""),
    updatedAt: Number(c.updatedAt ?? c.createdAt ?? 0),
  };
}

export async function GET() {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireClientsAccess();
  if (auth.error) return auth.error;

  const clients = await listClients(150);
  return NextResponse.json({
    clients: clients.map((c) => mapClient(c as Record<string, unknown>)),
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

    const auth = await requireClientsAccess();
    if (auth.error) return auth.error;
    const { session } = auth;

    const rl = rateLimit(
      `clients-staff:${session.email}`,
      40,
      15 * 60 * 1000,
    );
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de saisies. Réessayez plus tard." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      company?: string;
      email?: string;
      phone?: string;
      city?: string;
      address?: string;
      siteType?: string;
      surface?: string;
      source?: string;
      campaign?: string;
      formType?: string;
      subject?: string;
      message?: string;
      consent?: boolean;
      status?: string;
      submitRequest?: boolean;
    };

    const name = clampText(String(body.name || ""), 120);
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    const company = clampText(String(body.company || ""), 120);
    const phone = clampText(String(body.phone || ""), 40);
    const city = clampText(String(body.city || ""), 80);
    const address = clampText(String(body.address || ""), 200);
    const siteType = clampText(String(body.siteType || ""), 80);
    const surface = clampText(String(body.surface || ""), 40);
    const message = clampText(String(body.message || ""), 4000);
    const consent = Boolean(body.consent);
    const submitRequest = body.submitRequest !== false;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nom et e-mail requis." },
        { status: 400 },
      );
    }
    if (!email.includes("@") || email.length < 5) {
      return NextResponse.json({ error: "E-mail invalide." }, { status: 400 });
    }
    if (submitRequest && !message) {
      return NextResponse.json(
        { error: "Décrivez le besoin / travaux dans les locaux." },
        { status: 400 },
      );
    }
    if (!consent) {
      return NextResponse.json(
        {
          error:
            "Confirmez que le consentement client a été obtenu (oral / écrit).",
        },
        { status: 400 },
      );
    }

    const saved = await upsertClientAndSubmit({
      name,
      company,
      email,
      phone,
      city,
      address,
      siteType,
      surface,
      source: clampText(String(body.source || "saisie_interne"), 80),
      campaign: clampText(String(body.campaign || ""), 120),
      formType: normalizeFormType(body.formType),
      subject: clampText(
        String(body.subject || "Demande travaux locaux"),
        160,
      ),
      message,
      consent,
      status: normalizeStatus(body.status),
      createdBy: session.name || session.email,
      createdByRole: session.role,
      submitRequest,
    });

    return NextResponse.json({
      ok: true,
      clientId: saved.clientId,
      leadId: saved.leadId,
      at: saved.at,
      created: saved.created,
      deduped: !saved.created,
      requestSubmitted: saved.requestSubmitted,
      client: mapClient(saved.client as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[clients]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Enregistrement impossible.") },
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
    const auth = await requireClientsAccess();
    if (auth.error) return auth.error;

    const body = (await request.json()) as { email?: string; status?: string };
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    const status = normalizeStatus(body.status);
    if (!email) {
      return NextResponse.json({ error: "E-mail requis." }, { status: 400 });
    }
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }
    const ok = await updateClientStatus(email, status);
    if (!ok) {
      return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error("[clients:patch]", error);
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
    const auth = await requireClientsAccess();
    if (auth.error) return auth.error;

    const body = (await request.json()) as { email?: string };
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    if (!email) {
      return NextResponse.json({ error: "E-mail requis." }, { status: 400 });
    }
    const removed = await deleteClient(email);
    if (!removed) {
      return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[clients:delete]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Suppression impossible.") },
      { status: 500 },
    );
  }
}
