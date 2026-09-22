import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  cancelStaffingNeed,
  createStaffingNeed,
  getStaffingNeed,
  listStaffingNeedSources,
  listStaffingNeeds,
  submitStaffingNeed,
  validateStaffingBudget,
  validateStaffingHierarchical,
} from "@/lib/staffing-needs-crm";
import {
  canAccessStaffingNeeds,
  canEditStaffingNeeds,
  canValidateBudget,
  canValidateHierarchical,
  isStaffingNeedSource,
  isStaffingNeedStatus,
  isStaffingProfile,
  staffingApprovalRequirements,
  staffingStats,
} from "@/lib/staffing-needs-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour l’expression du besoin.",
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
  if (!canAccessStaffingNeeds(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé RH / opérations / direction" },
        { status: 403 },
      ),
    };
  }
  if (edit && !canEditStaffingNeeds(session.role)) {
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
    const item = await getStaffingNeed(id);
    if (!item) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      item,
      approval: staffingApprovalRequirements(item),
      canEdit: canEditStaffingNeeds(auth.session.role),
      canValidateHierarchical: canValidateHierarchical(auth.session.role),
      canValidateBudget: canValidateBudget(auth.session.role),
    });
  }

  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw && isStaffingNeedStatus(statusRaw) ? statusRaw : undefined;

  const [items, sources] = await Promise.all([
    listStaffingNeeds({ status }),
    listStaffingNeedSources(auth.actor),
  ]);

  return NextResponse.json({
    items,
    sources,
    stats: staffingStats(items),
    canEdit: canEditStaffingNeeds(auth.session.role),
    canValidateHierarchical: canValidateHierarchical(auth.session.role),
    canValidateBudget: canValidateBudget(auth.session.role),
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
  const rl = rateLimit(`staffing:post:${ip}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    switch (action) {
      case "create": {
        const auth = await requireAccess(true);
        if (auth.error) return auth.error;
        const item = await createStaffingNeed(
          {
            title: String(body.title ?? ""),
            description:
              body.description !== undefined
                ? String(body.description)
                : undefined,
            source: isStaffingNeedSource(body.source)
              ? body.source
              : undefined,
            contractId:
              body.contractId !== undefined
                ? String(body.contractId)
                : undefined,
            planningSlotId:
              body.planningSlotId !== undefined
                ? String(body.planningSlotId)
                : undefined,
            siteId:
              body.siteId !== undefined ? String(body.siteId) : undefined,
            siteName:
              body.siteName !== undefined ? String(body.siteName) : undefined,
            clientName:
              body.clientName !== undefined
                ? String(body.clientName)
                : undefined,
            profile: isStaffingProfile(body.profile)
              ? body.profile
              : undefined,
            headcount:
              body.headcount !== undefined
                ? Number(body.headcount)
                : undefined,
            startDate:
              body.startDate !== undefined
                ? String(body.startDate)
                : undefined,
            endDate:
              body.endDate !== undefined ? String(body.endDate) : undefined,
            budgetEstimate:
              body.budgetEstimate !== undefined
                ? Number(body.budgetEstimate)
                : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ item }, { status: 201 });
      }
      case "submit": {
        const auth = await requireAccess(true);
        if (auth.error) return auth.error;
        const item = await submitStaffingNeed(
          String(body.id ?? ""),
          auth.actor,
        );
        return NextResponse.json({ item });
      }
      case "validate_hierarchical": {
        const auth = await requireAccess(false);
        if (auth.error) return auth.error;
        if (!canValidateHierarchical(auth.session.role)) {
          return NextResponse.json(
            { error: "Validation hiérarchique réservée à la direction" },
            { status: 403 },
          );
        }
        const item = await validateStaffingHierarchical(
          String(body.id ?? ""),
          {
            approve: body.approve !== false,
            note: body.note !== undefined ? String(body.note) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({
          item,
          approval: staffingApprovalRequirements(item),
        });
      }
      case "validate_budget": {
        const auth = await requireAccess(false);
        if (auth.error) return auth.error;
        if (!canValidateBudget(auth.session.role)) {
          return NextResponse.json(
            { error: "Validation budgétaire réservée direction / finance" },
            { status: 403 },
          );
        }
        const item = await validateStaffingBudget(
          String(body.id ?? ""),
          {
            approve: body.approve !== false,
            note: body.note !== undefined ? String(body.note) : undefined,
            budgetEstimate:
              body.budgetEstimate !== undefined
                ? Number(body.budgetEstimate)
                : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({
          item,
          approval: staffingApprovalRequirements(item),
        });
      }
      case "cancel": {
        const auth = await requireAccess(true);
        if (auth.error) return auth.error;
        const item = await cancelStaffingNeed(
          String(body.id ?? ""),
          auth.actor,
          body.note !== undefined ? String(body.note) : "",
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
      { error: safeErrorMessage(error, "Expression du besoin impossible") },
      { status: 400 },
    );
  }
}
