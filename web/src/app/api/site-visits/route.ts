import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  deleteSiteVisit,
  listSiteVisits,
  saveSiteVisit,
} from "@/lib/site-visits-crm";
import { deleteBlobByUrl, isBlobConfigured } from "@/lib/vercel-blob";
import { canAccessWorkOrders } from "@/lib/work-orders-shared";
import {
  assertSameOrigin,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

async function requireAccess() {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!canAccessWorkOrders(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé opérations / agents" },
        { status: 403 },
      ),
    };
  }
  return {
    session,
    actor: {
      userId: session.userId,
      name: session.name,
      role: session.role,
    },
  };
}

function mongoUnavailable() {
  return NextResponse.json(
    { error: "Base de données indisponible pour les photos terrain." },
    { status: 503 },
  );
}

export async function GET() {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const visits = await listSiteVisits(auth.actor);
  return NextResponse.json({ visits, role: auth.session.role });
}

export async function POST(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "JSON requis" }, { status: 415 });
  }
  const rl = rateLimit(`site-visits:post:${clientIp(request)}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }
  const auth = await requireAccess();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as { visit?: unknown };
    const visit = await saveSiteVisit(auth.actor, body.visit);
    return NextResponse.json({ visit });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Enregistrement de la visite impossible") },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  const auth = await requireAccess();
  if (auth.error) return auth.error;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  try {
    const removed = await deleteSiteVisit(auth.actor, id);
    if (!removed) {
      return NextResponse.json({ error: "Visite introuvable" }, { status: 404 });
    }
    if (isBlobConfigured()) {
      await Promise.all(
        removed.photos
          .filter((p) => p.dataUrl.includes("blob.vercel-storage.com"))
          .map((p) => deleteBlobByUrl(p.dataUrl).catch(() => undefined)),
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Suppression impossible") },
      { status: 400 },
    );
  }
}
