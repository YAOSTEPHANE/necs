import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  canAccessHiringDossier,
  countHiringAlerts,
  createHiringDossier,
  deleteHiringDossier,
  getHiringChecklist,
  listHiringDossiers,
  saveHiringChecklist,
  setHiringDossierStatus,
  updateHiringDossierMeta,
  updateHiringPiece,
  type HiringChecklistItemDef,
  type HiringDossierStatus,
} from "@/lib/dossier-embauche-crm";
import {
  assertSameOrigin,
  clampText,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

const STATUSES: HiringDossierStatus[] = [
  "incomplet",
  "complet",
  "valide",
  "bloque",
];

function mongoUnavailable() {
  return NextResponse.json(
    {
      error:
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour les dossiers d’embauche.",
    },
    { status: 503 },
  );
}

async function requireHr() {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!canAccessHiringDossier(session.role)) {
    return {
      error: NextResponse.json({ error: "Accès réservé RH / admin" }, { status: 403 }),
    };
  }
  return { session };
}

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireHr();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  if (url.searchParams.get("meta") === "1") {
    const [alerts, checklist] = await Promise.all([
      countHiringAlerts(),
      getHiringChecklist(),
    ]);
    return NextResponse.json({ alerts, checklist });
  }
  if (url.searchParams.get("checklist") === "1") {
    const checklist = await getHiringChecklist();
    return NextResponse.json({ checklist });
  }

  const items = await listHiringDossiers();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "JSON requis" }, { status: 415 });
  }
  const auth = await requireHr();
  if (auth.error) return auth.error;
  const { session } = auth;

  const ip = clientIp(request);
  const rlCreate = rateLimit(`dossier-embauche:create:${ip}`, 30, 60_000);
  if (!rlCreate.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      {
        status: 429,
        headers: { "Retry-After": String(rlCreate.retryAfterSec) },
      },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const employeeName = clampText(String(body.employeeName || ""), 120);
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    if (!employeeName || !email.includes("@")) {
      return NextResponse.json(
        { error: "Nom et e-mail valides requis" },
        { status: 400 },
      );
    }
    const item = await createHiringDossier(
      {
        employeeName,
        email,
        phone: clampText(String(body.phone || ""), 40),
        roleTarget: clampText(String(body.roleTarget || "Agent terrain"), 120),
        startDate: clampText(String(body.startDate || ""), 20),
        recruitmentId: clampText(String(body.recruitmentId || ""), 40),
        rhOwner: clampText(String(body.rhOwner || session.name || ""), 120),
        comments: clampText(String(body.comments || ""), 2000),
      },
      {
        email: session.email,
        name: session.name || session.email,
        role: session.role,
      },
    );
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Création impossible") },
      { status: 500 },
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
  const auth = await requireHr();
  if (auth.error) return auth.error;
  const { session } = auth;

  const ip = clientIp(request);
  const rlPatch = rateLimit(`dossier-embauche:patch:${ip}`, 80, 60_000);
  if (!rlPatch.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      {
        status: 429,
        headers: { "Retry-After": String(rlPatch.retryAfterSec) },
      },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = clampText(String(body.action || "piece"), 40);
    const actor = {
      email: session.email,
      name: session.name || session.email,
      role: session.role,
    };

    if (action === "checklist") {
      const items = Array.isArray(body.items)
        ? (body.items as HiringChecklistItemDef[])
        : [];
      const checklist = await saveHiringChecklist(items, {
        email: session.email,
      });
      return NextResponse.json({ ok: true, checklist });
    }

    const id = clampText(String(body.id || ""), 40);
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    if (action === "piece") {
      const itemId = clampText(String(body.itemId || ""), 40);
      if (!itemId) {
        return NextResponse.json({ error: "itemId requis" }, { status: 400 });
      }
      const item = await updateHiringPiece(
        id,
        {
          itemId,
          present:
            body.present === undefined ? undefined : Boolean(body.present),
          receivedAt:
            body.receivedAt === undefined
              ? undefined
              : clampText(String(body.receivedAt || ""), 20) || null,
          expiresAt:
            body.expiresAt === undefined
              ? undefined
              : clampText(String(body.expiresAt || ""), 20) || null,
          note:
            body.note === undefined
              ? undefined
              : clampText(String(body.note || ""), 400),
          fileRef:
            body.fileRef === undefined
              ? undefined
              : clampText(String(body.fileRef || ""), 200),
        },
        actor,
      );
      if (!item) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, item });
    }

    if (action === "status") {
      const status = String(body.status || "") as HiringDossierStatus;
      if (!STATUSES.includes(status)) {
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      }
      const item = await setHiringDossierStatus(
        id,
        status,
        actor,
        clampText(String(body.note || ""), 800),
      );
      if (!item) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, item });
    }

    if (action === "meta") {
      const item = await updateHiringDossierMeta(
        id,
        {
          employeeName:
            body.employeeName === undefined
              ? undefined
              : clampText(String(body.employeeName || ""), 120),
          email:
            body.email === undefined
              ? undefined
              : clampText(String(body.email || "").toLowerCase(), 180),
          phone:
            body.phone === undefined
              ? undefined
              : clampText(String(body.phone || ""), 40),
          roleTarget:
            body.roleTarget === undefined
              ? undefined
              : clampText(String(body.roleTarget || ""), 120),
          startDate:
            body.startDate === undefined
              ? undefined
              : clampText(String(body.startDate || ""), 20),
          recruitmentId:
            body.recruitmentId === undefined
              ? undefined
              : clampText(String(body.recruitmentId || ""), 40),
          rhOwner:
            body.rhOwner === undefined
              ? undefined
              : clampText(String(body.rhOwner || ""), 120),
          comments:
            body.comments === undefined
              ? undefined
              : clampText(String(body.comments || ""), 2000),
        },
        actor,
      );
      if (!item) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, item });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Mise à jour impossible";
    const status = msg.includes("Impossible") || msg.includes("Checklist")
      ? 400
      : 500;
    return NextResponse.json(
      { error: safeErrorMessage(e, msg) },
      { status },
    );
  }
}

export async function DELETE(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  const auth = await requireHr();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const id = clampText(url.searchParams.get("id") || "", 40);
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }
  try {
    const ok = await deleteHiringDossier(id);
    if (!ok) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Suppression impossible") },
      { status: 500 },
    );
  }
}
