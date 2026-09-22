import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  getFacebookLeadConfigPublic,
  injectFacebookTestLead,
  listRecentFacebookIngestions,
  saveFacebookLeadConfig,
  syncFacebookLeads,
} from "@/lib/facebook-leads";
import {
  canAccessFacebookLeads,
  canManageFacebookLeads,
} from "@/lib/facebook-leads-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour Facebook → CRM.",
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
  if (!canAccessFacebookLeads(session.role)) {
    return {
      error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    };
  }
  if (manage && !canManageFacebookLeads(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Réservé admin / marketing" },
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
  const auth = await requireAccess(false);
  if (auth.error) return auth.error;

  const [config, recent] = await Promise.all([
    getFacebookLeadConfigPublic(),
    listRecentFacebookIngestions(25),
  ]);

  return NextResponse.json({
    config,
    recent,
    canManage: canManageFacebookLeads(auth.session.role),
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
  const rl = rateLimit(`fb-leads:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "").trim();

    if (action === "save_config") {
      const auth = await requireAccess(true);
      if (auth.error) return auth.error;
      const formIds = Array.isArray(body.formIds)
        ? body.formIds.map((x) => String(x))
        : String(body.formIdsCsv ?? "")
            .split(/[\s,;]+/)
            .map((s) => s.trim())
            .filter(Boolean);
      const config = await saveFacebookLeadConfig(
        {
          enabled: body.enabled !== false,
          pageId: String(body.pageId ?? ""),
          pageName: String(body.pageName ?? ""),
          formIds,
          pageAccessToken: String(body.pageAccessToken ?? ""),
          tokenExpiresAt:
            body.tokenExpiresAt === null || body.tokenExpiresAt === ""
              ? null
              : String(body.tokenExpiresAt ?? ""),
        },
        auth.actor,
      );
      return NextResponse.json({ config });
    }

    if (action === "sync") {
      const auth = await requireAccess(true);
      if (auth.error) return auth.error;
      const sync = await syncFacebookLeads({
        limitPerForm: Number(body.limitPerForm ?? 25) || 25,
      });
      const config = await getFacebookLeadConfigPublic();
      const recent = await listRecentFacebookIngestions(25);
      return NextResponse.json({ sync, config, recent });
    }

    if (action === "inject_test") {
      const auth = await requireAccess(true);
      if (auth.error) return auth.error;
      const injected = await injectFacebookTestLead({
        name: String(body.name ?? ""),
        email: String(body.email ?? ""),
        phone: String(body.phone ?? ""),
      });
      const config = await getFacebookLeadConfigPublic();
      const recent = await listRecentFacebookIngestions(25);
      return NextResponse.json({ injected, config, recent });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Action Facebook impossible") },
      { status: 400 },
    );
  }
}
