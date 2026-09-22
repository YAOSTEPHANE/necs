import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  advanceOpportunityToStudy,
  getOpportunity,
  getOpportunityByProspect,
  listOpportunities,
  setOpportunityStage,
  upsertOpportunityNeed,
} from "@/lib/need-qualification-crm";
import {
  canAccessNeedQualification,
  isOpportunityStage,
  requiredFieldsForNeed,
  validateCleaningNeed,
  type CleaningNeed,
} from "@/lib/need-qualification-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour la qualification du besoin.",
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
  if (!canAccessNeedQualification(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé commercial / admin" },
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

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const prospectId = url.searchParams.get("prospectId");

  if (id) {
    const item = await getOpportunity(id);
    if (!item) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      item,
      requiredFields: requiredFieldsForNeed(item.need),
      validation: validateCleaningNeed(item.need),
    });
  }

  if (prospectId) {
    const item = await getOpportunityByProspect(prospectId);
    return NextResponse.json({
      item,
      requiredFields: item
        ? requiredFieldsForNeed(item.need)
        : requiredFieldsForNeed({
            prestation: "",
            surfaceM2: null,
            localType: "",
            frequency: "",
            schedule: "",
            constraints: "",
            serviceLevel: "",
            zones: "",
            accessNotes: "",
            staffEstimate: null,
          }),
      validation: item
        ? validateCleaningNeed(item.need)
        : { ok: false, missing: ["prestation"], issues: [] },
    });
  }

  const items = await listOpportunities(auth.actor);
  return NextResponse.json({ items });
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

  const ip = clientIp(request);
  const rl = rateLimit(`need-qual:post:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "save-need");

    if (action === "advance-study") {
      const item = await advanceOpportunityToStudy(
        String(body.id ?? body.opportunityId ?? ""),
        auth.actor,
      );
      return NextResponse.json({ item, advanced: true });
    }

    if (action === "set-stage") {
      const stage = String(body.stage ?? "");
      if (!isOpportunityStage(stage)) {
        return NextResponse.json({ error: "Étape invalide" }, { status: 400 });
      }
      const item = await setOpportunityStage(
        String(body.id ?? ""),
        stage,
        auth.actor,
        {
          lossReason:
            body.lossReason !== undefined
              ? String(body.lossReason)
              : undefined,
        },
      );
      return NextResponse.json({ item });
    }

    const prospectId = String(body.prospectId ?? "").trim();
    if (!prospectId) {
      return NextResponse.json({ error: "prospectId requis" }, { status: 400 });
    }

    const need = (body.need ?? body) as Partial<CleaningNeed>;
    const item = await upsertOpportunityNeed(prospectId, need, auth.actor, {
      note: body.note !== undefined ? String(body.note) : undefined,
      valueEstimate:
        body.valueEstimate !== undefined
          ? Number(body.valueEstimate)
          : undefined,
    });

    return NextResponse.json({
      item,
      validation: validateCleaningNeed(item.need),
      requiredFields: requiredFieldsForNeed(item.need),
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Enregistrement impossible") },
      { status: 400 },
    );
  }
}
