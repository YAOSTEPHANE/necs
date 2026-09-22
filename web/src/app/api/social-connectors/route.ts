import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  canAccessSocialConnectors,
  canManageSocialConnectors,
  enableConnector,
  howToAddConnectorMarkdown,
  injectConnectorTest,
  listConnectorsPublic,
  listRecentIngestions,
  syncConnector,
} from "@/lib/social-connectors";
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
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour les connecteurs sociaux.",
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
  if (!canAccessSocialConnectors(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé Marketing / IT (admin)" },
        { status: 403 },
      ),
    };
  }
  if (manage && !canManageSocialConnectors(session.role)) {
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
  const connectorId = url.searchParams.get("connectorId") || undefined;

  const [connectors, recent] = await Promise.all([
    listConnectorsPublic(),
    listRecentIngestions(connectorId),
  ]);

  return NextResponse.json({
    connectors,
    recent,
    howToAdd: howToAddConnectorMarkdown(),
    canManage: canManageSocialConnectors(auth.session.role),
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
  const rl = rateLimit(`social-connectors:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const auth = await requireAccess(true);
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "").trim();
    const id = String(body.id ?? body.connectorId ?? "").trim();

    if (action === "enable") {
      if (!id) {
        return NextResponse.json({ error: "id requis" }, { status: 400 });
      }
      const connector = await enableConnector(
        id,
        body.enabled !== false,
        auth.actor,
      );
      return NextResponse.json({ connector });
    }

    if (action === "sync") {
      if (!id) {
        return NextResponse.json({ error: "id requis" }, { status: 400 });
      }
      const result = await syncConnector(id);
      const recent = await listRecentIngestions(id);
      return NextResponse.json({ ...result, recent });
    }

    if (action === "inject_test") {
      if (!id) {
        return NextResponse.json({ error: "id requis" }, { status: 400 });
      }
      const injected = await injectConnectorTest(id, {
        name: String(body.name ?? ""),
        email: String(body.email ?? ""),
        phone: String(body.phone ?? ""),
      });
      const connectors = await listConnectorsPublic();
      const recent = await listRecentIngestions(id);
      return NextResponse.json({
        injected,
        connectors,
        recent,
      });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Action connecteur impossible") },
      { status: 400 },
    );
  }
}
