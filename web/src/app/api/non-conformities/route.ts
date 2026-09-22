import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  addNonConformityProof,
  assignNonConformity,
  closeNonConformity,
  createNonConformity,
  getNonConformity,
  listNcAssignees,
  listNcSites,
  listNonConformities,
  submitNonConformityForValidation,
  updateNonConformityAction,
  validateNonConformity,
} from "@/lib/non-conformities-crm";
import {
  canAccessNonConformities,
  canEditNonConformities,
  canValidateNonConformities,
  isNcCriticality,
  isNcSource,
  isNcStatus,
  ncStats,
} from "@/lib/non-conformities-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour les non-conformités.",
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
  if (!canAccessNonConformities(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé Qualité / opérations" },
        { status: 403 },
      ),
    };
  }
  if (edit && !canEditNonConformities(session.role)) {
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
    const item = await getNonConformity(id);
    if (!item) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      item,
      canEdit: canEditNonConformities(auth.session.role),
      canValidate: canValidateNonConformities(auth.session.role),
    });
  }

  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw && isNcStatus(statusRaw) ? statusRaw : undefined;
  const siteId = url.searchParams.get("siteId") || undefined;
  const critRaw = url.searchParams.get("criticality");
  const criticality =
    critRaw && isNcCriticality(critRaw) ? critRaw : undefined;

  const [items, sites, assignees] = await Promise.all([
    listNonConformities({ status, siteId, criticality }),
    listNcSites(),
    listNcAssignees(),
  ]);

  return NextResponse.json({
    items,
    sites,
    assignees,
    stats: ncStats(items),
    canEdit: canEditNonConformities(auth.session.role),
    canValidate: canValidateNonConformities(auth.session.role),
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
  const rl = rateLimit(`nc:post:${ip}`, 120, 60_000);
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
        const item = await createNonConformity(
          {
            title: String(body.title ?? ""),
            description:
              body.description !== undefined
                ? String(body.description)
                : undefined,
            siteId: String(body.siteId ?? ""),
            criticality: isNcCriticality(body.criticality)
              ? body.criticality
              : undefined,
            source: isNcSource(body.source) ? body.source : undefined,
            qualityControlId:
              body.qualityControlId !== undefined
                ? String(body.qualityControlId)
                : undefined,
            dueDate:
              body.dueDate !== undefined ? String(body.dueDate) : undefined,
            correctiveAction:
              body.correctiveAction !== undefined
                ? String(body.correctiveAction)
                : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ item }, { status: 201 });
      }
      case "assign": {
        const item = await assignNonConformity(
          String(body.id ?? ""),
          {
            assigneeId: String(body.assigneeId ?? ""),
            dueDate:
              body.dueDate !== undefined ? String(body.dueDate) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ item });
      }
      case "update_action": {
        const item = await updateNonConformityAction(
          String(body.id ?? ""),
          {
            correctiveAction: String(body.correctiveAction ?? ""),
            dueDate:
              body.dueDate !== undefined ? String(body.dueDate) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ item });
      }
      case "add_proof": {
        const item = await addNonConformityProof(
          String(body.id ?? ""),
          {
            url: String(body.url ?? ""),
            caption:
              body.caption !== undefined ? String(body.caption) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ item });
      }
      case "submit_validation": {
        const item = await submitNonConformityForValidation(
          String(body.id ?? ""),
          auth.actor,
        );
        return NextResponse.json({ item });
      }
      case "validate": {
        if (!canValidateNonConformities(auth.session.role)) {
          return NextResponse.json(
            { error: "Validation réservée Qualité / direction" },
            { status: 403 },
          );
        }
        const item = await validateNonConformity(
          String(body.id ?? ""),
          {
            note: body.note !== undefined ? String(body.note) : undefined,
            approve: body.approve !== false,
          },
          auth.actor,
        );
        return NextResponse.json({ item });
      }
      case "close": {
        const item = await closeNonConformity(
          String(body.id ?? ""),
          auth.actor,
        );
        return NextResponse.json({ item });
      }
      default:
        return NextResponse.json(
          { error: "Action inconnue" },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Non-conformité impossible") },
      { status: 400 },
    );
  }
}
