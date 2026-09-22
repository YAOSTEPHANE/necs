import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  assignDigitalRequest,
  closeDigitalRequest,
  convertDigitalRequest,
  countDigitalRequestAlerts,
  createDigitalRequest,
  listDigitalRequests,
  setDigitalRequestPriority,
  updateDigitalRequestStatus,
} from "@/lib/digital-requests-crm";
import {
  canAccessDigitalRequests,
  canManageDigitalRequests,
  isDigitalChannel,
  isDigitalConvertKind,
  isDigitalPriority,
  isDigitalStatus,
  type DigitalRequestStatus,
} from "@/lib/digital-requests-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour les messages digitaux.",
    },
    { status: 503 },
  );
}

async function requireAccess(manage = false) {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!canAccessDigitalRequests(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé commercial / service client" },
        { status: 403 },
      ),
    };
  }
  if (manage && !canManageDigitalRequests(session.role)) {
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
  if (url.searchParams.get("meta") === "1") {
    const alerts = await countDigitalRequestAlerts();
    return NextResponse.json({ ...alerts });
  }

  const items = await listDigitalRequests(auth.actor);
  return NextResponse.json({
    items,
    canManage: canManageDigitalRequests(auth.session.role),
    role: auth.session.role,
    email: auth.session.email,
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
  const rl = rateLimit(`digital-req:create:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const item = await createDigitalRequest(
      {
        channel: isDigitalChannel(body.channel) ? body.channel : "contact",
        subject: String(body.subject ?? ""),
        message: String(body.message ?? ""),
        contactName: String(body.contactName ?? ""),
        contactEmail: String(body.contactEmail ?? ""),
        contactPhone: String(body.contactPhone ?? ""),
        company: String(body.company ?? ""),
        priority: isDigitalPriority(body.priority) ? body.priority : "normale",
        assigneeEmail: String(body.assigneeEmail ?? ""),
        assigneeName: String(body.assigneeName ?? ""),
        note: String(body.note ?? ""),
      },
      auth.actor,
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
  const auth = await requireAccess(true);
  if (auth.error) return auth.error;

  const ip = clientIp(request);
  const rl = rateLimit(`digital-req:patch:${ip}`, 80, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    const action = String(body.action ?? "").trim();
    if (!id || !action) {
      return NextResponse.json({ error: "id et action requis" }, { status: 400 });
    }

    let item;
    switch (action) {
      case "assign":
        item = await assignDigitalRequest(
          id,
          {
            assigneeEmail: String(body.assigneeEmail ?? ""),
            assigneeName: String(body.assigneeName ?? ""),
          },
          auth.actor,
        );
        break;
      case "status": {
        const status = String(body.status ?? "");
        if (!isDigitalStatus(status)) {
          return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
        }
        item = await updateDigitalRequestStatus(
          id,
          status as DigitalRequestStatus,
          auth.actor,
          String(body.note ?? ""),
        );
        break;
      }
      case "priority": {
        if (!isDigitalPriority(body.priority)) {
          return NextResponse.json({ error: "Priorité invalide" }, { status: 400 });
        }
        item = await setDigitalRequestPriority(id, body.priority, auth.actor);
        break;
      }
      case "convert": {
        if (!isDigitalConvertKind(body.kind)) {
          return NextResponse.json(
            { error: "Type de conversion invalide" },
            { status: 400 },
          );
        }
        item = await convertDigitalRequest(id, body.kind, auth.actor);
        break;
      }
      case "close":
        item = await closeDigitalRequest(
          id,
          auth.actor,
          String(body.note ?? ""),
        );
        break;
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Mise à jour impossible") },
      { status: 400 },
    );
  }
}
