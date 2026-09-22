import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  canAccessJobDescriptions,
  canManageJobDescriptions,
  createJobDescription,
  ensureDefaultAgentJobDescription,
  getJobDescription,
  listJobDescriptions,
  updateJobDescription,
  isJobDescriptionStatus,
} from "@/lib/job-descriptions-crm";
import {
  assertSameOrigin,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

function mongoUnavailable() {
  return NextResponse.json(
    {
      error:
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour les fiches de poste.",
    },
    { status: 503 },
  );
}

async function requireAccess() {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!canAccessJobDescriptions(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé RH / manager / admin" },
        { status: 403 },
      ),
    };
  }
  return { session };
}

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { session } = auth;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const item = await getJobDescription(id);
    if (!item) {
      return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      item,
      canManage: canManageJobDescriptions(session.role),
      role: session.role,
    });
  }

  const items = await listJobDescriptions();
  return NextResponse.json({
    items,
    canManage: canManageJobDescriptions(session.role),
    role: session.role,
  });
}

export async function POST(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "JSON requis" }, { status: 415 });
  }
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { session } = auth;

  const ip = clientIp(request);
  const rl = rateLimit(`job-desc:post:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "ensure_default") {
      const item = await ensureDefaultAgentJobDescription({
        email: session.email,
        name: session.name,
        role: session.role,
      });
      return NextResponse.json({ item });
    }
    const item = await createJobDescription(
      {
        title: String(body.title ?? ""),
        mission: String(body.mission ?? ""),
        responsibilities: String(body.responsibilities ?? ""),
        skills: String(body.skills ?? ""),
        schedule: String(body.schedule ?? ""),
        reportingLine: String(body.reportingLine ?? ""),
        workLocation: String(body.workLocation ?? ""),
        safetyNotes: String(body.safetyNotes ?? ""),
        performanceCriteria: String(body.performanceCriteria ?? ""),
        note: String(body.note ?? ""),
        status: isJobDescriptionStatus(body.status) ? body.status : "brouillon",
      },
      { email: session.email, name: session.name, role: session.role },
    );
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Création impossible") },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "JSON requis" }, { status: 415 });
  }
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }
    const item = await updateJobDescription(
      id,
      {
        title: body.title !== undefined ? String(body.title) : undefined,
        mission: body.mission !== undefined ? String(body.mission) : undefined,
        responsibilities:
          body.responsibilities !== undefined
            ? String(body.responsibilities)
            : undefined,
        skills: body.skills !== undefined ? String(body.skills) : undefined,
        schedule:
          body.schedule !== undefined ? String(body.schedule) : undefined,
        reportingLine:
          body.reportingLine !== undefined
            ? String(body.reportingLine)
            : undefined,
        workLocation:
          body.workLocation !== undefined
            ? String(body.workLocation)
            : undefined,
        safetyNotes:
          body.safetyNotes !== undefined ? String(body.safetyNotes) : undefined,
        performanceCriteria:
          body.performanceCriteria !== undefined
            ? String(body.performanceCriteria)
            : undefined,
        note: body.note !== undefined ? String(body.note) : undefined,
        status: isJobDescriptionStatus(body.status) ? body.status : undefined,
        bumpVersion: body.bumpVersion === true,
      },
      { email: session.email, name: session.name, role: session.role },
    );
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Mise à jour impossible") },
      { status: 400 },
    );
  }
}
