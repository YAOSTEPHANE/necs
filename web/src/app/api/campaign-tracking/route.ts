import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  buildCampaignAnalytics,
  getCampaignTrackingConfig,
  saveCampaignTrackingConfig,
} from "@/lib/campaign-tracking";
import {
  canAccessCampaignTracking,
  canManageCampaignTracking,
  type CampaignPeriod,
} from "@/lib/campaign-tracking-shared";
import {
  assertSameOrigin,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

const PERIODS: CampaignPeriod[] = ["7d", "30d", "90d", "all"];

function mongoUnavailable() {
  return NextResponse.json(
    {
      error:
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour le suivi des campagnes.",
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
  if (!canAccessCampaignTracking(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé Marketing / direction commerciale" },
        { status: 403 },
      ),
    };
  }
  if (manage && !canManageCampaignTracking(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Configuration réservée admin / marketing" },
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
  const periodRaw = url.searchParams.get("period") || "30d";
  const period: CampaignPeriod = PERIODS.includes(periodRaw as CampaignPeriod)
    ? (periodRaw as CampaignPeriod)
    : "30d";

  const [config, analytics] = await Promise.all([
    getCampaignTrackingConfig(),
    buildCampaignAnalytics(period),
  ]);

  return NextResponse.json({
    config,
    analytics,
    canManage: canManageCampaignTracking(auth.session.role),
    role: auth.session.role,
  });
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
  const rl = rateLimit(`campaign-tracking:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const params = body.params as
      | {
          sourceParams?: string[];
          campaignParams?: string[];
          mediumParams?: string[];
          extraParams?: string[];
        }
      | undefined;

    const channels = Array.isArray(body.channels)
      ? (body.channels as Array<{
          id: string;
          label: string;
          sources: string[];
          color: string;
        }>)
      : undefined;

    const conversionLeadStatuses = Array.isArray(body.conversionLeadStatuses)
      ? (body.conversionLeadStatuses.filter(
          (s) => s === "traite" || s === "en_cours",
        ) as Array<"traite" | "en_cours">)
      : undefined;

    const config = await saveCampaignTrackingConfig(
      {
        params,
        channels,
        conversionLeadStatuses,
        countClientAsWon:
          typeof body.countClientAsWon === "boolean"
            ? body.countClientAsWon
            : undefined,
      },
      auth.actor,
    );

    const periodRaw = String(body.period || "30d");
    const period: CampaignPeriod = PERIODS.includes(periodRaw as CampaignPeriod)
      ? (periodRaw as CampaignPeriod)
      : "30d";
    const analytics = await buildCampaignAnalytics(period);

    return NextResponse.json({ config, analytics });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Enregistrement impossible") },
      { status: 400 },
    );
  }
}
