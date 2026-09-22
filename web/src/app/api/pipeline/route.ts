import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  addOpportunityRelance,
  listPipeline,
  markOpportunityLost,
  markOpportunityWon,
  movePipelineStage,
  updatePipelineOpportunity,
} from "@/lib/pipeline-crm";
import {
  canAccessPipeline,
  canEditPipeline,
} from "@/lib/pipeline-shared";
import type { OpportunityStage, RelanceChannel } from "@/lib/need-qualification-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour le pipeline.",
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
  if (!canAccessPipeline(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé commercial / direction" },
        { status: 403 },
      ),
    };
  }
  if (edit && !canEditPipeline(session.role)) {
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

export async function GET() {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess(false);
  if (auth.error) return auth.error;

  const { items, dashboard } = await listPipeline(auth.actor);
  return NextResponse.json({
    items,
    dashboard,
    canEdit: canEditPipeline(auth.session.role),
    role: auth.session.role,
    email: auth.session.email,
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
  const auth = await requireAccess(true);
  if (auth.error) return auth.error;

  const ip = clientIp(request);
  const rl = rateLimit(`pipeline:post:${ip}`, 80, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "update");
    const id = String(body.id ?? "").trim();
    if (!id && action !== "refresh") {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    switch (action) {
      case "update": {
        const item = await updatePipelineOpportunity(
          id,
          {
            valueEstimate:
              body.valueEstimate !== undefined
                ? Number(body.valueEstimate)
                : undefined,
            probability:
              body.probability !== undefined
                ? Number(body.probability)
                : undefined,
            nextAction:
              body.nextAction !== undefined
                ? String(body.nextAction)
                : undefined,
            dueAt:
              body.dueAt !== undefined
                ? body.dueAt === null
                  ? null
                  : String(body.dueAt)
                : undefined,
            stage:
              body.stage !== undefined
                ? (String(body.stage) as OpportunityStage)
                : undefined,
            lossReason:
              body.lossReason !== undefined
                ? String(body.lossReason)
                : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
          },
          auth.actor,
        );
        const { dashboard } = await listPipeline(auth.actor);
        return NextResponse.json({ item, dashboard });
      }
      case "relance": {
        const item = await addOpportunityRelance(
          id,
          {
            channel: String(body.channel ?? "appel") as RelanceChannel,
            note: String(body.note ?? ""),
            nextAction:
              body.nextAction !== undefined
                ? String(body.nextAction)
                : undefined,
            dueAt:
              body.dueAt !== undefined
                ? body.dueAt === null
                  ? null
                  : String(body.dueAt)
                : undefined,
          },
          auth.actor,
        );
        const { dashboard } = await listPipeline(auth.actor);
        return NextResponse.json({ item, dashboard });
      }
      case "move": {
        const item = await movePipelineStage(
          id,
          String(body.stage ?? "") as OpportunityStage,
          auth.actor,
          body.lossReason !== undefined ? String(body.lossReason) : undefined,
        );
        const { dashboard } = await listPipeline(auth.actor);
        return NextResponse.json({ item, dashboard });
      }
      case "lose": {
        const item = await markOpportunityLost(
          id,
          String(body.lossReason ?? ""),
          auth.actor,
        );
        const { dashboard } = await listPipeline(auth.actor);
        return NextResponse.json({ item, dashboard });
      }
      case "win": {
        const item = await markOpportunityWon(id, auth.actor);
        const { dashboard } = await listPipeline(auth.actor);
        return NextResponse.json({ item, dashboard });
      }
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Opération impossible") },
      { status: 400 },
    );
  }
}
