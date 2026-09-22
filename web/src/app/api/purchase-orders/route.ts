import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  createManualPurchaseOrder,
  createPurchaseOrderFromQuote,
  listPurchaseOrders,
  listQuotesEligibleForPo,
  rejectPurchaseOrder,
  submitPurchaseOrder,
  transmitPurchaseOrderToOps,
  updatePurchaseOrderDraft,
  validatePurchaseOrder,
} from "@/lib/purchase-orders-crm";
import {
  canAccessPurchaseOrders,
  canEditPurchaseOrders,
  canTransmitPurchaseOrders,
  canValidatePurchaseOrders,
  purchaseOrderReadyToValidate,
  type PurchaseOrderLine,
  type PurchaseOrderPriority,
} from "@/lib/purchase-orders-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour les bons de commande.",
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
  if (!canAccessPurchaseOrders(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé commercial / opérations" },
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
  const view = url.searchParams.get("view");

  const meta = {
    canEdit: canEditPurchaseOrders(auth.session.role),
    canValidate: canValidatePurchaseOrders(auth.session.role),
    canTransmit: canTransmitPurchaseOrders(auth.session.role),
    email: auth.session.email,
    role: auth.session.role,
  };

  try {
    if (view === "quotes") {
      const quotes = await listQuotesEligibleForPo(auth.actor);
      return NextResponse.json({ quotes, ...meta });
    }
    const items = await listPurchaseOrders(auth.actor);
    return NextResponse.json({ items, ...meta });
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
  const limited = rateLimit(`po:post:${clientIp(request)}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const auth = await requireAccess();
  if (auth.error) return auth.error;
  if (!canEditPurchaseOrders(auth.session.role)) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const quoteId = String(body.quoteId || "");
    const lines = Array.isArray(body.lines)
      ? (body.lines as Partial<PurchaseOrderLine>[])
      : undefined;

    const item = quoteId
      ? await createPurchaseOrderFromQuote(
          quoteId,
          {
            site: String(body.site || ""),
            clientRef: String(body.clientRef || ""),
            orderDate: String(body.orderDate || ""),
            startDate: String(body.startDate || ""),
            priority: body.priority as PurchaseOrderPriority | undefined,
            conditions: String(body.conditions || ""),
            note: String(body.note || ""),
          },
          auth.actor,
        )
      : await createManualPurchaseOrder(
          {
            company: String(body.company || ""),
            clientRef: String(body.clientRef || ""),
            site: String(body.site || ""),
            quoteRef: String(body.quoteRef || ""),
            orderDate: String(body.orderDate || ""),
            startDate: String(body.startDate || ""),
            priority: body.priority as PurchaseOrderPriority | undefined,
            conditions: String(body.conditions || ""),
            note: String(body.note || ""),
            contactName: String(body.contactName || ""),
            contactEmail: String(body.contactEmail || ""),
            contactPhone: String(body.contactPhone || ""),
            lines,
          },
          auth.actor,
        );

    return NextResponse.json(
      { item, recipe: purchaseOrderReadyToValidate(item) },
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
  const limited = rateLimit(`po:patch:${clientIp(request)}`, 80, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const auth = await requireAccess();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }
    const action = String(body.action || "update");

    if (action === "submit") {
      if (!canEditPurchaseOrders(auth.session.role)) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      const item = await submitPurchaseOrder(id, auth.actor);
      return NextResponse.json({
        item,
        recipe: purchaseOrderReadyToValidate(item),
      });
    }

    if (action === "validate") {
      if (!canValidatePurchaseOrders(auth.session.role)) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      const item = await validatePurchaseOrder(id, auth.actor);
      return NextResponse.json({
        item,
        recipe: purchaseOrderReadyToValidate(item),
      });
    }

    if (action === "reject") {
      if (!canValidatePurchaseOrders(auth.session.role)) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      const item = await rejectPurchaseOrder(
        id,
        String(body.reason || ""),
        auth.actor,
      );
      return NextResponse.json({ item });
    }

    if (action === "transmit") {
      if (!canTransmitPurchaseOrders(auth.session.role)) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      const item = await transmitPurchaseOrderToOps(id, auth.actor);
      return NextResponse.json({ item });
    }

    if (!canEditPurchaseOrders(auth.session.role)) {
      return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
    }

    const lines = Array.isArray(body.lines)
      ? (body.lines as Partial<PurchaseOrderLine>[])
      : undefined;

    const item = await updatePurchaseOrderDraft(
      id,
      {
        company: body.company as string | undefined,
        clientRef: body.clientRef as string | undefined,
        site: body.site as string | undefined,
        contactName: body.contactName as string | undefined,
        contactEmail: body.contactEmail as string | undefined,
        contactPhone: body.contactPhone as string | undefined,
        orderDate: body.orderDate as string | undefined,
        startDate: body.startDate as string | undefined,
        priority: body.priority as PurchaseOrderPriority | undefined,
        conditions: body.conditions as string | undefined,
        note: body.note as string | undefined,
        quoteRef: body.quoteRef as string | undefined,
        lines,
      },
      auth.actor,
    );
    return NextResponse.json({
      item,
      recipe: purchaseOrderReadyToValidate(item),
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Action impossible") },
      { status: 400 },
    );
  }
}
