import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  listInventoryArticles,
  listInventoryBalances,
  listInventoryMovements,
  listInventorySites,
  recordInventoryMovement,
  seedDefaultArticles,
  setBalanceMinQty,
  upsertInventoryArticle,
} from "@/lib/inventory-crm";
import {
  canAccessInventory,
  canEditInventory,
  inventoryStats,
  isInventoryCategory,
  isInventoryMovementKind,
} from "@/lib/inventory-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour le matériel.",
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
  if (!canAccessInventory(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé opérations / magasin" },
        { status: 403 },
      ),
    };
  }
  if (edit && !canEditInventory(session.role)) {
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
  const siteId = url.searchParams.get("siteId") || undefined;
  const belowOnly = url.searchParams.get("below") === "1";
  const articleId = url.searchParams.get("articleId") || undefined;

  const [articles, balances, movements, sites] = await Promise.all([
    listInventoryArticles(false),
    listInventoryBalances({ siteId, belowOnly }),
    listInventoryMovements({ siteId, articleId, limit: 150 }),
    listInventorySites(),
  ]);

  return NextResponse.json({
    articles,
    balances,
    movements,
    sites,
    stats: inventoryStats(balances, movements),
    canEdit: canEditInventory(auth.session.role),
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
  const rl = rateLimit(`inventory:post:${ip}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const auth = await requireAccess(true);
    if (auth.error) return auth.error;

    switch (action) {
      case "seed": {
        const n = await seedDefaultArticles(auth.actor);
        return NextResponse.json({ seeded: n });
      }
      case "upsert_article": {
        const article = await upsertInventoryArticle(
          {
            id: body.id !== undefined ? String(body.id) : undefined,
            sku: String(body.sku ?? ""),
            label: String(body.label ?? ""),
            unit: body.unit !== undefined ? String(body.unit) : undefined,
            category: isInventoryCategory(body.category)
              ? body.category
              : undefined,
            defaultMinQty:
              body.defaultMinQty !== undefined
                ? Number(body.defaultMinQty)
                : undefined,
            active:
              body.active !== undefined ? Boolean(body.active) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ article }, { status: 201 });
      }
      case "movement": {
        const kindRaw = String(body.kind ?? "");
        if (!isInventoryMovementKind(kindRaw)) {
          return NextResponse.json(
            { error: "Type de mouvement invalide" },
            { status: 400 },
          );
        }
        const result = await recordInventoryMovement(
          {
            kind: kindRaw,
            siteId: String(body.siteId ?? ""),
            articleId: String(body.articleId ?? ""),
            quantity: Number(body.quantity),
            note: body.note !== undefined ? String(body.note) : undefined,
            ref: body.ref !== undefined ? String(body.ref) : undefined,
            toSiteId:
              body.toSiteId !== undefined ? String(body.toSiteId) : undefined,
            minQty:
              body.minQty !== undefined ? Number(body.minQty) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json(result, { status: 201 });
      }
      case "set_min": {
        const balance = await setBalanceMinQty(
          String(body.balanceId ?? ""),
          Number(body.minQty),
          auth.actor,
        );
        return NextResponse.json({ balance });
      }
      default:
        return NextResponse.json(
          { error: "Action inconnue" },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Opération stock impossible") },
      { status: 400 },
    );
  }
}
