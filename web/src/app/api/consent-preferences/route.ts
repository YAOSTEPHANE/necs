import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  buildConsentAudience,
  ensureConsentPreference,
  filterTargetableEmails,
  getConsentByEmail,
  listConsentPreferences,
  seedConsentFromLeads,
  setConsentChannel,
  setConsentPurpose,
} from "@/lib/consent-preferences-crm";
import {
  canAccessConsentPreferences,
  canManageConsentPreferences,
  isConsentChannel,
  isConsentPurpose,
} from "@/lib/consent-preferences-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour les consentements.",
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
  if (!canAccessConsentPreferences(session.role)) {
    return {
      error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    };
  }
  if (manage && !canManageConsentPreferences(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Réservé marketing / admin" },
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
  const email = url.searchParams.get("email");
  if (email) {
    const item = await getConsentByEmail(email);
    return NextResponse.json({
      item,
      canManage: canManageConsentPreferences(auth.session.role),
    });
  }

  const audienceChannel = url.searchParams.get("audience");
  if (audienceChannel) {
    if (!isConsentChannel(audienceChannel)) {
      return NextResponse.json({ error: "Canal audience invalide" }, { status: 400 });
    }
    const purposeRaw = url.searchParams.get("purpose") || "marketing";
    if (!isConsentPurpose(purposeRaw)) {
      return NextResponse.json({ error: "Finalité invalide" }, { status: 400 });
    }
    const audience = await buildConsentAudience(audienceChannel, purposeRaw);
    return NextResponse.json({
      audience,
      canManage: canManageConsentPreferences(auth.session.role),
    });
  }

  const items = await listConsentPreferences();
  return NextResponse.json({
    items,
    canManage: canManageConsentPreferences(auth.session.role),
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
  const rl = rateLimit(`consent:post:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "ensure");

    if (action === "seed") {
      const created = await seedConsentFromLeads();
      const items = await listConsentPreferences();
      return NextResponse.json({ created, items });
    }

    if (action === "filter-emails") {
      if (!isConsentChannel(body.channel)) {
        return NextResponse.json({ error: "Canal invalide" }, { status: 400 });
      }
      const purpose = isConsentPurpose(body.purpose)
        ? body.purpose
        : "marketing";
      const emails = Array.isArray(body.emails)
        ? body.emails.map((e) => String(e))
        : String(body.emails ?? "")
            .split(/[\s,;]+/)
            .filter(Boolean);
      const result = await filterTargetableEmails(
        emails,
        body.channel,
        purpose,
      );
      return NextResponse.json({
        channel: body.channel,
        purpose,
        ...result,
        blockedCount: result.blocked.length,
        allowedCount: result.allowed.length,
      });
    }

    if (action === "channel") {
      if (!isConsentChannel(body.channel)) {
        return NextResponse.json({ error: "Canal invalide" }, { status: 400 });
      }
      const item = await setConsentChannel(
        String(body.email ?? ""),
        body.channel,
        Boolean(body.allowed),
        auth.actor,
        String(body.note ?? ""),
      );
      return NextResponse.json({ item });
    }

    if (action === "purpose") {
      if (!isConsentPurpose(body.purpose)) {
        return NextResponse.json({ error: "Finalité invalide" }, { status: 400 });
      }
      const item = await setConsentPurpose(
        String(body.email ?? ""),
        body.purpose,
        Boolean(body.allowed),
        auth.actor,
        String(body.note ?? ""),
      );
      return NextResponse.json({ item });
    }

    const item = await ensureConsentPreference(
      {
        email: String(body.email ?? ""),
        contactName: String(body.contactName ?? ""),
        company: String(body.company ?? ""),
      },
      auth.actor,
    );
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Mise à jour impossible") },
      { status: 400 },
    );
  }
}
