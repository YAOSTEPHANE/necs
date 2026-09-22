import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import { listFieldAgents } from "@/lib/ops-planning-crm";
import { listOpsSites } from "@/lib/ops-referential-crm";
import { listPlanningSlots } from "@/lib/ops-planning-crm";
import {
  addWorkOrderProof,
  closeWorkOrder,
  completeWorkOrder,
  createManualWorkOrder,
  createWorkOrderFromPlanning,
  flagWorkOrderAnomaly,
  getWorkOrder,
  listWorkOrders,
  startWorkOrder,
  toggleWorkOrderChecklist,
  updateWorkOrderMeta,
  workOrderDetailMeta,
} from "@/lib/work-orders-crm";
import {
  canAccessWorkOrders,
  canSuperviseWorkOrders,
  isProofKind,
} from "@/lib/work-orders-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour les ordres de travail.",
    },
    { status: 503 },
  );
}

async function requireAccess(supervise = false) {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!canAccessWorkOrders(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé opérations / agents" },
        { status: 403 },
      ),
    };
  }
  if (supervise && !canSuperviseWorkOrders(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Action réservée au superviseur" },
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
  const auth = await requireAccess(false);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const order = await getWorkOrder(id);
    if (!order) {
      return NextResponse.json({ error: "OT introuvable" }, { status: 404 });
    }
    if (
      auth.session.role === "nettoyeur" &&
      !order.agents.some((a) => a.userId === auth.session.userId)
    ) {
      return NextResponse.json({ error: "Non affecté" }, { status: 403 });
    }
    return NextResponse.json({
      order,
      ...workOrderDetailMeta(order),
      canSupervise: canSuperviseWorkOrders(auth.session.role),
      role: auth.session.role,
    });
  }

  const [orders, agents, sites] = await Promise.all([
    listWorkOrders(auth.actor),
    canSuperviseWorkOrders(auth.session.role)
      ? listFieldAgents()
      : Promise.resolve([]),
    canSuperviseWorkOrders(auth.session.role)
      ? listOpsSites({ status: "actif" })
      : Promise.resolve([]),
  ]);

  let planningSlots: Awaited<ReturnType<typeof listPlanningSlots>> = [];
  if (canSuperviseWorkOrders(auth.session.role)) {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 7);
    const to = new Date(today);
    to.setDate(today.getDate() + 21);
    planningSlots = await listPlanningSlots({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
  }

  const withMeta = orders.map((o) => ({
    ...o,
    ...workOrderDetailMeta(o),
  }));

  return NextResponse.json({
    orders: withMeta,
    agents,
    sites,
    planningSlots,
    canSupervise: canSuperviseWorkOrders(auth.session.role),
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
  const rl = rateLimit(`work-orders:post:${ip}`, 100, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    const superviseActions = new Set([
      "create_from_planning",
      "create_manual",
      "update_meta",
      "close",
    ]);
    const auth = await requireAccess(superviseActions.has(action));
    if (auth.error) return auth.error;

    switch (action) {
      case "create_from_planning": {
        const order = await createWorkOrderFromPlanning(
          String(body.planningSlotId ?? ""),
          auth.actor,
          {
            consignes:
              body.consignes !== undefined
                ? String(body.consignes)
                : undefined,
            materiel:
              body.materiel !== undefined ? String(body.materiel) : undefined,
          },
        );
        return NextResponse.json(
          { order, ...workOrderDetailMeta(order) },
          { status: 201 },
        );
      }
      case "create_manual": {
        const agents = await listFieldAgents();
        const order = await createManualWorkOrder(
          {
            siteId: String(body.siteId ?? ""),
            prestationId: String(body.prestationId ?? ""),
            date: String(body.date ?? ""),
            startTime: String(body.startTime ?? ""),
            endTime: String(body.endTime ?? ""),
            agentUserIds: Array.isArray(body.agentUserIds)
              ? (body.agentUserIds as string[])
              : [],
            consignes:
              body.consignes !== undefined
                ? String(body.consignes)
                : undefined,
            materiel:
              body.materiel !== undefined ? String(body.materiel) : undefined,
          },
          auth.actor,
          agents,
        );
        return NextResponse.json(
          { order, ...workOrderDetailMeta(order) },
          { status: 201 },
        );
      }
      case "start": {
        const order = await startWorkOrder(String(body.id ?? ""), auth.actor);
        return NextResponse.json({ order, ...workOrderDetailMeta(order) });
      }
      case "add_proof": {
        const kindRaw = String(body.kind ?? "");
        if (!isProofKind(kindRaw)) {
          return NextResponse.json(
            { error: "Type de preuve invalide" },
            { status: 400 },
          );
        }
        const order = await addWorkOrderProof(
          String(body.id ?? ""),
          {
            kind: kindRaw,
            url: String(body.url ?? ""),
            caption:
              body.caption !== undefined ? String(body.caption) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ order, ...workOrderDetailMeta(order) });
      }
      case "toggle_checklist": {
        const orderId = String(body.id ?? "");
        const idem = await findOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "ot_checklist",
          userId: auth.actor.userId,
        });
        if (idem) {
          const order = await getWorkOrder(idem.resourceId);
          if (order) {
            return NextResponse.json({
              order,
              ...workOrderDetailMeta(order),
              replay: true,
            });
          }
        }
        const order = await toggleWorkOrderChecklist(
          orderId,
          String(body.itemId ?? ""),
          Boolean(body.done),
          auth.actor,
        );
        await recordOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "ot_checklist",
          userId: auth.actor.userId,
          resourceId: order.id,
        });
        return NextResponse.json({ order, ...workOrderDetailMeta(order) });
      }
      case "complete": {
        const idem = await findOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "ot_complete",
          userId: auth.actor.userId,
        });
        if (idem) {
          const order = await getWorkOrder(idem.resourceId);
          if (order) {
            return NextResponse.json({
              order,
              ...workOrderDetailMeta(order),
              replay: true,
            });
          }
        }
        const order = await completeWorkOrder(
          String(body.id ?? ""),
          auth.actor,
        );
        await recordOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "ot_complete",
          userId: auth.actor.userId,
          resourceId: order.id,
        });
        return NextResponse.json({ order, ...workOrderDetailMeta(order) });
      }
      case "anomaly": {
        const idem = await findOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "ot_anomaly",
          userId: auth.actor.userId,
        });
        if (idem) {
          const order = await getWorkOrder(idem.resourceId);
          if (order) {
            return NextResponse.json({
              order,
              ...workOrderDetailMeta(order),
              replay: true,
            });
          }
        }
        const order = await flagWorkOrderAnomaly(
          String(body.id ?? ""),
          String(body.note ?? ""),
          auth.actor,
        );
        await recordOfflineIdempotency({
          clientRequestId: body.clientRequestId,
          scope: "ot_anomaly",
          userId: auth.actor.userId,
          resourceId: order.id,
        });
        return NextResponse.json({ order, ...workOrderDetailMeta(order) });
      }
      case "close": {
        const order = await closeWorkOrder(String(body.id ?? ""), auth.actor);
        return NextResponse.json({ order, ...workOrderDetailMeta(order) });
      }
      case "update_meta": {
        const order = await updateWorkOrderMeta(
          String(body.id ?? ""),
          {
            consignes:
              body.consignes !== undefined
                ? String(body.consignes)
                : undefined,
            materiel:
              body.materiel !== undefined ? String(body.materiel) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ order, ...workOrderDetailMeta(order) });
      }
      default:
        return NextResponse.json(
          { error: "Action inconnue" },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Opération impossible") },
      { status: 400 },
    );
  }
}
