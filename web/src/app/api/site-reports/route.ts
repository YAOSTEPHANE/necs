import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  createSiteReport,
  listSiteReports,
  submitSiteReport,
  updateSiteReport,
  validateSiteReport,
} from "@/lib/site-reports-crm";
import {
  canAccessSiteReports,
  canEditSiteReports,
  canValidateSiteReports,
  isSiteReportStatus,
  siteReportReady,
  type SiteReportStatus,
} from "@/lib/site-reports-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour les rapports de site.",
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
  if (!canAccessSiteReports(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé opérations / qualité" },
        { status: 403 },
      ),
    };
  }
  return {
    session,
    actor: {
      userId: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
    },
  };
}

export async function GET() {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  try {
    const items = await listSiteReports(auth.actor);
    return NextResponse.json({
      items,
      canEdit: canEditSiteReports(auth.session.role),
      canValidate: canValidateSiteReports(auth.session.role),
      role: auth.session.role,
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Chargement impossible") },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "JSON requis" }, { status: 415 });
  }
  const limited = rateLimit(`site-report:post:${clientIp(request)}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  if (!canEditSiteReports(auth.session.role)) {
    return NextResponse.json({ error: "Création non autorisée" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const item = await createSiteReport(
      {
        clientName: String(body.clientName || ""),
        siteName: String(body.siteName || ""),
        periodStart: String(body.periodStart || ""),
        periodEnd: String(body.periodEnd || ""),
        prestations: String(body.prestations || ""),
        effectifsCount: Number(body.effectifsCount) || 0,
        effectifsNote: String(body.effectifsNote || ""),
        incidents: String(body.incidents || ""),
        controles: String(body.controles || ""),
        observations: String(body.observations || ""),
        recommendations: String(body.recommendations || ""),
        actions: String(body.actions || ""),
        qualityScore:
          body.qualityScore === null || body.qualityScore === ""
            ? null
            : Number(body.qualityScore),
        note: String(body.note || ""),
        status: isSiteReportStatus(body.status)
          ? (body.status as SiteReportStatus)
          : "",
      },
      auth.actor,
    );
    return NextResponse.json(
      { item, recipe: siteReportReady(item) },
      { status: 201 },
    );
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
  const limited = rateLimit(`site-report:patch:${clientIp(request)}`, 80, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }
  const auth = await requireAccess();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id || "");
    if (!id) throw new Error("Identifiant requis");
    const action = String(body.action || "update");

    if (action === "submit") {
      if (!canEditSiteReports(auth.session.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
      }
      const item = await submitSiteReport(id, auth.actor);
      return NextResponse.json({ item, recipe: siteReportReady(item) });
    }
    if (action === "validate" || action === "publish") {
      if (!canValidateSiteReports(auth.session.role)) {
        return NextResponse.json({ error: "Validation non autorisée" }, { status: 403 });
      }
      const item = await validateSiteReport(id, auth.actor, action === "publish");
      return NextResponse.json({ item, recipe: siteReportReady(item) });
    }

    if (!canEditSiteReports(auth.session.role)) {
      return NextResponse.json({ error: "Modification non autorisée" }, { status: 403 });
    }
    const item = await updateSiteReport(
      id,
      {
        clientName:
          body.clientName !== undefined ? String(body.clientName) : undefined,
        siteName: body.siteName !== undefined ? String(body.siteName) : undefined,
        periodStart:
          body.periodStart !== undefined ? String(body.periodStart) : undefined,
        periodEnd:
          body.periodEnd !== undefined ? String(body.periodEnd) : undefined,
        prestations:
          body.prestations !== undefined ? String(body.prestations) : undefined,
        effectifsCount:
          body.effectifsCount !== undefined
            ? Number(body.effectifsCount)
            : undefined,
        effectifsNote:
          body.effectifsNote !== undefined
            ? String(body.effectifsNote)
            : undefined,
        incidents:
          body.incidents !== undefined ? String(body.incidents) : undefined,
        controles:
          body.controles !== undefined ? String(body.controles) : undefined,
        observations:
          body.observations !== undefined
            ? String(body.observations)
            : undefined,
        recommendations:
          body.recommendations !== undefined
            ? String(body.recommendations)
            : undefined,
        actions: body.actions !== undefined ? String(body.actions) : undefined,
        qualityScore:
          body.qualityScore === undefined
            ? undefined
            : body.qualityScore === null || body.qualityScore === ""
              ? null
              : Number(body.qualityScore),
        note: body.note !== undefined ? String(body.note) : undefined,
        status: isSiteReportStatus(body.status)
          ? (body.status as SiteReportStatus)
          : undefined,
      },
      auth.actor,
    );
    return NextResponse.json({ item, recipe: siteReportReady(item) });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Mise à jour impossible") },
      { status: 400 },
    );
  }
}
