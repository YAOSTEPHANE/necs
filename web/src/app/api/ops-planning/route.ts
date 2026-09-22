import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  assignAgent,
  createPlanningSlot,
  deletePlanningSlot,
  listFieldAgents,
  listPlanningSlots,
  markAssignmentAbsent,
  planningDashboard,
  removeAssignment,
  replaceAssignment,
  updatePlanningSlot,
} from "@/lib/ops-planning-crm";
import { listOpsSites } from "@/lib/ops-referential-crm";
import {
  canAccessOpsPlanning,
  canEditOpsPlanning,
} from "@/lib/ops-referential-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour la planification.",
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
  if (!canAccessOpsPlanning(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé opérations" },
        { status: 403 },
      ),
    };
  }
  if (edit && !canEditOpsPlanning(session.role)) {
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

function weekRange(anchor?: string) {
  const d = anchor ? new Date(anchor) : new Date();
  if (Number.isNaN(d.getTime())) {
    const n = new Date();
    const from = n.toISOString().slice(0, 10);
    return { from, to: from };
  }
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  };
}

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess(false);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const from =
    url.searchParams.get("from") ||
    weekRange(url.searchParams.get("week") || undefined).from;
  const to =
    url.searchParams.get("to") ||
    weekRange(url.searchParams.get("week") || undefined).to;

  const [dashboard, agents, sites] = await Promise.all([
    planningDashboard(from, to),
    listFieldAgents(),
    listOpsSites({ status: "actif" }),
  ]);

  return NextResponse.json({
    ...dashboard,
    from,
    to,
    agents,
    sites,
    canEdit: canEditOpsPlanning(auth.session.role),
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
  const auth = await requireAccess(true);
  if (auth.error) return auth.error;

  const ip = clientIp(request);
  const rl = rateLimit(`ops-plan:post:${ip}`, 80, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "create");

    switch (action) {
      case "create": {
        const slot = await createPlanningSlot(
          {
            date: String(body.date ?? ""),
            startTime: String(body.startTime ?? ""),
            endTime: String(body.endTime ?? ""),
            siteId: String(body.siteId ?? ""),
            prestationId: String(body.prestationId ?? ""),
            requiredStaff:
              body.requiredStaff !== undefined
                ? Number(body.requiredStaff)
                : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
            agentIds: Array.isArray(body.agentIds)
              ? (body.agentIds as string[])
              : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ slot }, { status: 201 });
      }
      case "update": {
        const result = await updatePlanningSlot(
          String(body.id ?? ""),
          {
            date: body.date !== undefined ? String(body.date) : undefined,
            startTime:
              body.startTime !== undefined
                ? String(body.startTime)
                : undefined,
            endTime:
              body.endTime !== undefined ? String(body.endTime) : undefined,
            requiredStaff:
              body.requiredStaff !== undefined
                ? Number(body.requiredStaff)
                : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
            prestationId:
              body.prestationId !== undefined
                ? String(body.prestationId)
                : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({
          slot: result.slot,
          propagation: result.propagation,
        });
      }
      case "assign": {
        const result = await assignAgent(
          String(body.id ?? ""),
          String(body.agentUserId ?? ""),
          auth.actor,
        );
        return NextResponse.json({
          slot: result.slot,
          conflict: result.conflict,
        });
      }
      case "absent": {
        const slot = await markAssignmentAbsent(
          String(body.id ?? ""),
          String(body.assignmentId ?? ""),
          auth.actor,
          String(body.note ?? ""),
        );
        return NextResponse.json({ slot });
      }
      case "replace": {
        const slot = await replaceAssignment(
          String(body.id ?? ""),
          String(body.assignmentId ?? ""),
          String(body.replacementUserId ?? ""),
          auth.actor,
        );
        return NextResponse.json({ slot });
      }
      case "unassign": {
        const slot = await removeAssignment(
          String(body.id ?? ""),
          String(body.assignmentId ?? ""),
          auth.actor,
        );
        return NextResponse.json({ slot });
      }
      case "delete": {
        await deletePlanningSlot(String(body.id ?? ""), auth.actor);
        return NextResponse.json({ ok: true });
      }
      case "list": {
        const slots = await listPlanningSlots({
          from: String(body.from ?? ""),
          to: String(body.to ?? ""),
        });
        return NextResponse.json({ slots });
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
