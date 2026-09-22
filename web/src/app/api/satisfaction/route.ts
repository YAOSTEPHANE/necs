import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  addSatisfactionScore,
  createImprovementPlan,
  getSatisfactionBundle,
  getSatisfactionDashboardKpis,
  updateImprovementPlan,
  updateImprovementPlanStatus,
} from "@/lib/satisfaction-crm";
import {
  canAccessSatisfaction,
  canEditSatisfaction,
  isPlanStatus,
  isSatisfactionChannel,
} from "@/lib/satisfaction-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour la satisfaction.",
    },
    { status: 503 },
  );
}

async function requireAccess(edit = false) {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!canAccessSatisfaction(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé Direction / qualité" },
        { status: 403 },
      ),
    };
  }
  if (edit && !canEditSatisfaction(session.role)) {
    return {
      error: NextResponse.json({ error: "Droits insuffisants" }, { status: 403 }),
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

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess(false);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const view = url.searchParams.get("view");
  const period = url.searchParams.get("period") || undefined;

  if (view === "dashboard") {
    const dashboard = await getSatisfactionDashboardKpis(period);
    return NextResponse.json({
      dashboard,
      canEdit: canEditSatisfaction(auth.session.role),
    });
  }

  const bundle = await getSatisfactionBundle({ period });
  return NextResponse.json({
    ...bundle,
    canEdit: canEditSatisfaction(auth.session.role),
    role: auth.session.role,
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

  const ip = clientIp(request);
  const rl = rateLimit(`sat:post:${ip}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const auth = await requireAccess(true);
    if (auth.error) return auth.error;

    switch (action) {
      case "add_score": {
        const score = await addSatisfactionScore(
          {
            clientId:
              body.clientId !== undefined ? String(body.clientId) : undefined,
            clientName:
              body.clientName !== undefined
                ? String(body.clientName)
                : undefined,
            company:
              body.company !== undefined ? String(body.company) : undefined,
            siteId:
              body.siteId !== undefined ? String(body.siteId) : undefined,
            score: Number(body.score),
            period:
              body.period !== undefined ? String(body.period) : undefined,
            comment:
              body.comment !== undefined ? String(body.comment) : undefined,
            channel: isSatisfactionChannel(body.channel)
              ? body.channel
              : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ score }, { status: 201 });
      }
      case "create_plan": {
        const plan = await createImprovementPlan(
          {
            clientId:
              body.clientId !== undefined ? String(body.clientId) : undefined,
            clientName:
              body.clientName !== undefined
                ? String(body.clientName)
                : undefined,
            company:
              body.company !== undefined ? String(body.company) : undefined,
            siteId:
              body.siteId !== undefined ? String(body.siteId) : undefined,
            title: String(body.title ?? ""),
            description:
              body.description !== undefined
                ? String(body.description)
                : undefined,
            dueDate:
              body.dueDate !== undefined ? String(body.dueDate) : undefined,
            ownerId:
              body.ownerId !== undefined ? String(body.ownerId) : undefined,
            triggerScoreId:
              body.triggerScoreId !== undefined
                ? String(body.triggerScoreId)
                : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ plan }, { status: 201 });
      }
      case "update_plan": {
        const plan = await updateImprovementPlan(
          String(body.id ?? ""),
          {
            title: body.title !== undefined ? String(body.title) : undefined,
            description:
              body.description !== undefined
                ? String(body.description)
                : undefined,
            dueDate:
              body.dueDate !== undefined ? String(body.dueDate) : undefined,
            ownerId:
              body.ownerId !== undefined ? String(body.ownerId) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ plan });
      }
      case "set_plan_status": {
        const status = body.status;
        if (!isPlanStatus(status)) {
          return NextResponse.json(
            { error: "Statut de plan invalide" },
            { status: 400 },
          );
        }
        const plan = await updateImprovementPlanStatus(
          String(body.id ?? ""),
          status,
          auth.actor,
        );
        return NextResponse.json({ plan });
      }
      default:
        return NextResponse.json(
          { error: "Action inconnue" },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Satisfaction impossible") },
      { status: 400 },
    );
  }
}
