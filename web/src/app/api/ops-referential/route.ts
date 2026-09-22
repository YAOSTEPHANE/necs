import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  getContractReferentialBundle,
  getOpsSite,
  listOpsClients,
  listOpsSites,
  setSiteStatus,
  syncReferentialFromContracts,
  updateSiteConsignes,
  upsertPrestation,
} from "@/lib/ops-referential-crm";
import {
  canAccessOpsReferential,
  canEditOpsReferential,
  type OpsSiteStatus,
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
        "Base de données indisponible. Configurez DATABASE_URL pour le référentiel OPS.",
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
  if (!canAccessOpsReferential(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé opérations" },
        { status: 403 },
      ),
    };
  }
  if (edit && !canEditOpsReferential(session.role)) {
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
  const contractId = url.searchParams.get("contractId");
  const siteId = url.searchParams.get("siteId");
  const clientId = url.searchParams.get("clientId");

  if (contractId) {
    const bundle = await getContractReferentialBundle(contractId);
    return NextResponse.json({
      bundle,
      canEdit: canEditOpsReferential(auth.session.role),
    });
  }

  if (siteId) {
    const site = await getOpsSite(siteId);
    if (!site) {
      return NextResponse.json({ error: "Site introuvable" }, { status: 404 });
    }
    const bundle = await getContractReferentialBundle(site.contractId);
    return NextResponse.json({
      site,
      bundle,
      canEdit: canEditOpsReferential(auth.session.role),
    });
  }

  const [clients, sites] = await Promise.all([
    listOpsClients(),
    listOpsSites({
      clientId: clientId || undefined,
      status: "all",
    }),
  ]);

  return NextResponse.json({
    clients,
    sites,
    canEdit: canEditOpsReferential(auth.session.role),
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
  const rl = rateLimit(`ops-ref:post:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "sync");

    switch (action) {
      case "sync": {
        const result = await syncReferentialFromContracts(auth.actor);
        const [clients, sites] = await Promise.all([
          listOpsClients(),
          listOpsSites({ status: "all" }),
        ]);
        return NextResponse.json({
          clients,
          sites,
          createdClients: result.clients,
          createdSites: result.sites,
        });
      }
      case "site-status": {
        const site = await setSiteStatus(
          String(body.siteId ?? ""),
          String(body.status ?? "actif") as OpsSiteStatus,
          auth.actor,
        );
        return NextResponse.json({ site });
      }
      case "consignes": {
        const site = await updateSiteConsignes(
          String(body.siteId ?? ""),
          String(body.consignes ?? ""),
          auth.actor,
        );
        return NextResponse.json({ site });
      }
      case "prestation": {
        const site = await upsertPrestation(
          String(body.siteId ?? ""),
          {
            id: body.id !== undefined ? String(body.id) : undefined,
            label: String(body.label ?? ""),
            frequency:
              body.frequency !== undefined
                ? String(body.frequency)
                : undefined,
            requiredStaff:
              body.requiredStaff !== undefined
                ? Number(body.requiredStaff)
                : undefined,
            durationMinutes:
              body.durationMinutes !== undefined
                ? Number(body.durationMinutes)
                : undefined,
            consignes:
              body.consignes !== undefined
                ? String(body.consignes)
                : undefined,
            active:
              body.active !== undefined ? Boolean(body.active) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ site });
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
