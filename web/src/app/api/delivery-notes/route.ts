import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  createDeliveryNote,
  dispatchDeliveryNote,
  listDeliveryNotes,
  markDelivered,
  receiveDeliveryNote,
  updateDeliveryNote,
} from "@/lib/delivery-notes-crm";
import {
  canAccessDeliveryNotes,
  canEditDeliveryNotes,
  canReceiveDeliveryNotes,
  deliveryNoteReady,
  deliveryReceiveReady,
  type DeliveryLine,
  type DeliveryNoteStatus,
  type DeliveryProof,
  type DeliverySignature,
} from "@/lib/delivery-notes-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour la logistique.",
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
  if (!canAccessDeliveryNotes(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé opérations / logistique" },
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
    const items = await listDeliveryNotes(auth.actor);
    return NextResponse.json({
      items,
      canEdit: canEditDeliveryNotes(auth.session.role),
      canReceive: canReceiveDeliveryNotes(auth.session.role),
      email: auth.session.email,
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
  const limited = rateLimit(`bl:post:${clientIp(request)}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const auth = await requireAccess();
  if (auth.error) return auth.error;
  if (!canEditDeliveryNotes(auth.session.role)) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const lines = Array.isArray(body.lines)
      ? (body.lines as Partial<DeliveryLine>[])
      : undefined;
    const item = await createDeliveryNote(
      {
        siteId: String(body.siteId || ""),
        siteName: String(body.siteName || ""),
        deliveryDate: String(body.deliveryDate || ""),
        deliveryAt: String(body.deliveryAt || ""),
        carrierName: String(body.carrierName || ""),
        daRef: String(body.daRef || ""),
        reserves: String(body.reserves || ""),
        note: String(body.note || ""),
        lines,
        signatures: body.signatures as DeliverySignature[] | undefined,
      },
      auth.actor,
    );
    return NextResponse.json(
      { item, recipe: deliveryNoteReady(item) },
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
  const limited = rateLimit(`bl:patch:${clientIp(request)}`, 80, 60_000);
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
    const lines = Array.isArray(body.lines)
      ? (body.lines as Partial<DeliveryLine>[])
      : undefined;

    if (action === "dispatch") {
      if (!canEditDeliveryNotes(auth.session.role)) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      const item = await dispatchDeliveryNote(id, auth.actor);
      return NextResponse.json({ item });
    }

    if (action === "deliver") {
      if (!canEditDeliveryNotes(auth.session.role)) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      const item = await markDelivered(id, auth.actor);
      return NextResponse.json({ item });
    }

    if (action === "receive") {
      if (!canReceiveDeliveryNotes(auth.session.role)) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      const item = await receiveDeliveryNote(
        id,
        {
          lines,
          reserves: body.reserves as string | undefined,
          signatures: body.signatures as DeliverySignature[] | undefined,
          receiverName: body.receiverName as string | undefined,
          proofs: Array.isArray(body.proofs)
            ? (body.proofs as DeliveryProof[])
            : undefined,
          updateStock: body.updateStock !== false,
        },
        auth.actor,
      );
      return NextResponse.json({
        item,
        recipe: deliveryReceiveReady(item),
      });
    }

    if (!canEditDeliveryNotes(auth.session.role)) {
      return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
    }

    const item = await updateDeliveryNote(
      id,
      {
        siteId: body.siteId as string | undefined,
        siteName: body.siteName as string | undefined,
        deliveryDate: body.deliveryDate as string | undefined,
        deliveryAt: body.deliveryAt as string | undefined,
        carrierName: body.carrierName as string | undefined,
        daRef: body.daRef as string | undefined,
        reserves: body.reserves as string | undefined,
        note: body.note as string | undefined,
        lines,
        signatures: body.signatures as DeliverySignature[] | undefined,
        status: body.status as DeliveryNoteStatus | undefined,
      },
      auth.actor,
    );
    return NextResponse.json({ item, recipe: deliveryNoteReady(item) });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Action impossible") },
      { status: 400 },
    );
  }
}
