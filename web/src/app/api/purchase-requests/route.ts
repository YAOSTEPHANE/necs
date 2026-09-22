import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  cancelPurchaseRequest,
  createPurchaseRequest,
  listPurchaseRequests,
  markPurchaseRequestOrdered,
  rejectPurchaseRequest,
  submitPurchaseRequest,
  updatePurchaseRequest,
  validatePurchaseRequest,
} from "@/lib/purchase-requests-crm";
import {
  canAccessPurchaseRequests,
  canEditPurchaseRequests,
  canValidatePurchaseRequests,
  isPurchaseUrgency,
  purchaseRequestReady,
  type PurchaseRequestLine,
} from "@/lib/purchase-requests-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour les demandes d’achat.",
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
  if (!canAccessPurchaseRequests(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé opérations / achats" },
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

export async function GET() {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  try {
    const items = await listPurchaseRequests(auth.actor);
    return NextResponse.json({
      items,
      canEdit: canEditPurchaseRequests(auth.session.role),
      canValidate: canValidatePurchaseRequests(auth.session.role),
      role: auth.session.role,
    });
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
  const limited = rateLimit(`da:post:${clientIp(request)}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  if (!canEditPurchaseRequests(auth.session.role)) {
    return NextResponse.json({ error: "Création non autorisée" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const item = await createPurchaseRequest(
      {
        requesterName: String(body.requesterName || auth.actor.name),
        siteName: String(body.siteName || ""),
        needDate: String(body.needDate || ""),
        supplier: String(body.supplier || ""),
        altSupplier: String(body.altSupplier || ""),
        costCenter: String(body.costCenter || ""),
        approverName: String(body.approverName || ""),
        urgency: isPurchaseUrgency(body.urgency) ? body.urgency : "normale",
        expectedDelivery: String(body.expectedDelivery || ""),
        justification: String(body.justification || ""),
        lines: Array.isArray(body.lines)
          ? (body.lines as Partial<PurchaseRequestLine>[])
          : [],
        note: String(body.note || ""),
      },
      auth.actor,
    );
    return NextResponse.json(
      { item, recipe: purchaseRequestReady(item) },
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
  const limited = rateLimit(`da:patch:${clientIp(request)}`, 80, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }
  const auth = await requireAccess();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id || "");
    if (!id) throw new Error("Identifiant requis");
    const action = String(body.action || "update");

    if (action === "submit") {
      if (!canEditPurchaseRequests(auth.session.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
      }
      const item = await submitPurchaseRequest(id, auth.actor);
      return NextResponse.json({ item, recipe: purchaseRequestReady(item) });
    }
    if (action === "validate") {
      if (!canValidatePurchaseRequests(auth.session.role)) {
        return NextResponse.json({ error: "Validation non autorisée" }, { status: 403 });
      }
      const item = await validatePurchaseRequest(
        id,
        auth.actor,
        String(body.comment || body.validationComment || ""),
      );
      return NextResponse.json({ item, recipe: purchaseRequestReady(item) });
    }
    if (action === "reject") {
      if (!canValidatePurchaseRequests(auth.session.role)) {
        return NextResponse.json({ error: "Refus non autorisé" }, { status: 403 });
      }
      const item = await rejectPurchaseRequest(
        id,
        String(body.reason || ""),
        auth.actor,
      );
      return NextResponse.json({ item, recipe: purchaseRequestReady(item) });
    }
    if (action === "order") {
      if (!canEditPurchaseRequests(auth.session.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
      }
      const item = await markPurchaseRequestOrdered(id, auth.actor);
      return NextResponse.json({ item, recipe: purchaseRequestReady(item) });
    }
    if (action === "cancel") {
      if (!canEditPurchaseRequests(auth.session.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
      }
      const item = await cancelPurchaseRequest(
        id,
        auth.actor,
        String(body.note || ""),
      );
      return NextResponse.json({ item, recipe: purchaseRequestReady(item) });
    }

    if (!canEditPurchaseRequests(auth.session.role)) {
      return NextResponse.json({ error: "Modification non autorisée" }, { status: 403 });
    }
    const item = await updatePurchaseRequest(
      id,
      {
        requesterName:
          body.requesterName !== undefined
            ? String(body.requesterName)
            : undefined,
        siteName: body.siteName !== undefined ? String(body.siteName) : undefined,
        needDate: body.needDate !== undefined ? String(body.needDate) : undefined,
        supplier: body.supplier !== undefined ? String(body.supplier) : undefined,
        altSupplier:
          body.altSupplier !== undefined ? String(body.altSupplier) : undefined,
        costCenter:
          body.costCenter !== undefined ? String(body.costCenter) : undefined,
        approverName:
          body.approverName !== undefined
            ? String(body.approverName)
            : undefined,
        urgency: isPurchaseUrgency(body.urgency) ? body.urgency : undefined,
        expectedDelivery:
          body.expectedDelivery !== undefined
            ? String(body.expectedDelivery)
            : undefined,
        justification:
          body.justification !== undefined
            ? String(body.justification)
            : undefined,
        lines: Array.isArray(body.lines)
          ? (body.lines as Partial<PurchaseRequestLine>[])
          : undefined,
        note: body.note !== undefined ? String(body.note) : undefined,
        validationComment:
          body.validationComment !== undefined
            ? String(body.validationComment)
            : undefined,
      },
      auth.actor,
    );
    return NextResponse.json({ item, recipe: purchaseRequestReady(item) });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Mise à jour impossible") },
      { status: 400 },
    );
  }
}
