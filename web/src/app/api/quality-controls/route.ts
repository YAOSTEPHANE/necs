import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  addQualityPhoto,
  closeQualityControl,
  completeQualityControl,
  createQualityControl,
  getQualityControl,
  listQualityControls,
  listQualitySites,
  listQualityTemplates,
  scoreQualityItem,
  startQualityControl,
} from "@/lib/quality-controls-crm";
import {
  canAccessQualityControls,
  canEditQualityControls,
  isQualityControlStatus,
  isQualityPeriodicity,
  qualityStats,
} from "@/lib/quality-controls-shared";
import {
  assertSameOrigin,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";
import {
  findOfflineIdempotency,
  recordOfflineIdempotency,
} from "@/lib/offline-idempotency";

export const runtime = "nodejs";

function mongoUnavailable() {
  return NextResponse.json(
    {
      error:
        "Base de données indisponible. Configurez DATABASE_URL pour les contrôles qualité.",
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
  if (!canAccessQualityControls(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé Qualité / superviseurs" },
        { status: 403 },
      ),
    };
  }
  if (edit && !canEditQualityControls(session.role)) {
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
  const id = url.searchParams.get("id");
  if (id) {
    const control = await getQualityControl(id);
    if (!control) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      control,
      canEdit: canEditQualityControls(auth.session.role),
    });
  }

  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw && isQualityControlStatus(statusRaw) ? statusRaw : undefined;
  const siteId = url.searchParams.get("siteId") || undefined;

  const [controls, templates, sites] = await Promise.all([
    listQualityControls({ status, siteId }),
    listQualityTemplates(),
    listQualitySites(),
  ]);

  return NextResponse.json({
    controls,
    templates,
    sites,
    stats: qualityStats(controls),
    canEdit: canEditQualityControls(auth.session.role),
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
  const rl = rateLimit(`quality:post:${ip}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const auth = await requireAccess(true);
    if (auth.error) return auth.error;

    switch (action) {
      case "create": {
        const control = await createQualityControl(
          {
            siteId: String(body.siteId ?? ""),
            prestationId: String(body.prestationId ?? ""),
            templateId:
              body.templateId !== undefined
                ? String(body.templateId)
                : undefined,
            periodicity: isQualityPeriodicity(body.periodicity)
              ? body.periodicity
              : undefined,
            dueDate:
              body.dueDate !== undefined ? String(body.dueDate) : undefined,
            passThreshold:
              body.passThreshold !== undefined
                ? Number(body.passThreshold)
                : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ control }, { status: 201 });
      }
      case "start": {
        const idem = await findOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "quality_start",
          userId: auth.actor.userId,
        });
        if (idem) {
          const control = await getQualityControl(idem.resourceId);
          if (control) {
            return NextResponse.json({ control, replay: true });
          }
        }
        const control = await startQualityControl(
          String(body.id ?? ""),
          auth.actor,
        );
        await recordOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "quality_start",
          userId: auth.actor.userId,
          resourceId: control.id,
        });
        return NextResponse.json({ control });
      }
      case "score_item": {
        const idem = await findOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "quality_score",
          userId: auth.actor.userId,
        });
        if (idem) {
          const control = await getQualityControl(idem.resourceId);
          if (control) {
            return NextResponse.json({ control, replay: true });
          }
        }
        const control = await scoreQualityItem(
          String(body.id ?? ""),
          {
            itemId: String(body.itemId ?? ""),
            score: Number(body.score),
            comment:
              body.comment !== undefined ? String(body.comment) : undefined,
            photoUrl:
              body.photoUrl !== undefined ? String(body.photoUrl) : undefined,
          },
          auth.actor,
        );
        await recordOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "quality_score",
          userId: auth.actor.userId,
          resourceId: control.id,
        });
        return NextResponse.json({ control });
      }
      case "add_photo": {
        const control = await addQualityPhoto(
          String(body.id ?? ""),
          {
            url: String(body.url ?? ""),
            caption:
              body.caption !== undefined ? String(body.caption) : undefined,
            itemId:
              body.itemId !== undefined ? String(body.itemId) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ control });
      }
      case "complete": {
        const idem = await findOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "quality_complete",
          userId: auth.actor.userId,
        });
        if (idem) {
          const control = await getQualityControl(idem.resourceId);
          if (control) {
            return NextResponse.json({ control, replay: true });
          }
        }
        const control = await completeQualityControl(
          String(body.id ?? ""),
          {
            observations:
              body.observations !== undefined
                ? String(body.observations)
                : undefined,
            ncNote: body.ncNote !== undefined ? String(body.ncNote) : undefined,
            correctiveAction:
              body.correctiveAction !== undefined
                ? String(body.correctiveAction)
                : undefined,
            correctiveDue:
              body.correctiveDue !== undefined
                ? String(body.correctiveDue)
                : undefined,
          },
          auth.actor,
        );
        await recordOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "quality_complete",
          userId: auth.actor.userId,
          resourceId: control.id,
        });
        return NextResponse.json({ control });
      }
      case "close": {
        const control = await closeQualityControl(
          String(body.id ?? ""),
          auth.actor,
        );
        return NextResponse.json({ control });
      }
      default:
        return NextResponse.json(
          { error: "Action inconnue" },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Contrôle impossible") },
      { status: 400 },
    );
  }
}
