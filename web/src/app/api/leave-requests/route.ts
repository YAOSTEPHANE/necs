import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  canAccessLeaveRequests,
  canManageLeaveRequests,
  canValidateLeaveRequests,
  cancelLeaveRequest,
  createLeaveRequest,
  getLeaveRequest,
  isLeaveRequestType,
  listLeaveRequests,
  submitLeaveRequest,
  updateLeaveRequestMeta,
  validateLeaveRequest,
} from "@/lib/leave-requests-crm";
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
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour les congés.",
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
  if (!canAccessLeaveRequests(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé RH / manager / agent concerné" },
        { status: 403 },
      ),
    };
  }
  return {
    session,
    actor: {
      email: session.email,
      name: session.name,
      role: session.role,
      userId: session.userId,
    },
  };
}

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { session, actor } = auth;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const item = await getLeaveRequest(id, actor);
    if (!item) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      item,
      canManage: canManageLeaveRequests(session.role),
      canValidate: canValidateLeaveRequests(session.role),
      role: session.role,
    });
  }

  const items = await listLeaveRequests(actor);
  return NextResponse.json({
    items,
    canManage: canManageLeaveRequests(session.role),
    canValidate: canValidateLeaveRequests(session.role),
    role: session.role,
    email: session.email,
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
  const { actor } = auth;

  const ip = clientIp(request);
  const rl = rateLimit(`leave:post:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const item = await createLeaveRequest(
      {
        type: isLeaveRequestType(body.type) ? body.type : "conge_paye",
        employeeName: String(body.employeeName ?? ""),
        employeeEmail: String(body.employeeEmail ?? ""),
        employeeUserId: String(body.employeeUserId ?? ""),
        matricule: String(body.matricule ?? ""),
        startDate: String(body.startDate ?? ""),
        endDate: String(body.endDate ?? ""),
        days: body.days !== undefined ? Number(body.days) : undefined,
        motif: String(body.motif ?? ""),
        substituteName: String(body.substituteName ?? ""),
        planningImpact: String(body.planningImpact ?? ""),
        affectedSites: String(body.affectedSites ?? ""),
        rhOwner: String(body.rhOwner ?? ""),
        note: String(body.note ?? ""),
      },
      actor,
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
  const { actor } = auth;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    const action = String(body.action ?? "meta").trim();
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    let item;
    switch (action) {
      case "submit":
        item = await submitLeaveRequest(id, actor);
        break;
      case "validate":
        item = await validateLeaveRequest(
          id,
          actor,
          body.decision === "refuse" ? "refuse" : "approve",
          String(body.note ?? ""),
        );
        break;
      case "cancel":
        item = await cancelLeaveRequest(id, actor, String(body.note ?? ""));
        break;
      case "meta":
      default:
        item = await updateLeaveRequestMeta(
          id,
          {
            type: isLeaveRequestType(body.type) ? body.type : undefined,
            employeeName:
              body.employeeName !== undefined
                ? String(body.employeeName)
                : undefined,
            employeeEmail:
              body.employeeEmail !== undefined
                ? String(body.employeeEmail)
                : undefined,
            matricule:
              body.matricule !== undefined ? String(body.matricule) : undefined,
            startDate:
              body.startDate !== undefined ? String(body.startDate) : undefined,
            endDate:
              body.endDate !== undefined ? String(body.endDate) : undefined,
            days: body.days !== undefined ? Number(body.days) : undefined,
            motif: body.motif !== undefined ? String(body.motif) : undefined,
            substituteName:
              body.substituteName !== undefined
                ? String(body.substituteName)
                : undefined,
            planningImpact:
              body.planningImpact !== undefined
                ? String(body.planningImpact)
                : undefined,
            affectedSites:
              body.affectedSites !== undefined
                ? String(body.affectedSites)
                : undefined,
            rhOwner:
              body.rhOwner !== undefined ? String(body.rhOwner) : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
          },
          actor,
        );
        break;
    }
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Mise à jour impossible") },
      { status: 400 },
    );
  }
}
