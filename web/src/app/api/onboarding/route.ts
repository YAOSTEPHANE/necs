import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  canAccessOnboarding,
  canManageOnboardingChecklist,
  countOnboardingAlerts,
  createOnboarding,
  deleteOnboarding,
  getOnboardingChecklist,
  listOnboardings,
  saveOnboardingChecklist,
  setOnboardingStatus,
  updateOnboardingMeta,
  updateOnboardingTask,
  type OnboardingStatus,
  type OnboardingTaskDef,
} from "@/lib/onboarding-crm";
import { isOnboardingStatus } from "@/lib/onboarding-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour l’onboarding.",
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
  if (!canAccessOnboarding(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé RH / manager / ops / admin" },
        { status: 403 },
      ),
    };
  }
  return { session };
}

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { session } = auth;

  const url = new URL(request.url);
  if (url.searchParams.get("meta") === "1") {
    const [alerts, checklist] = await Promise.all([
      countOnboardingAlerts(),
      getOnboardingChecklist(),
    ]);
    return NextResponse.json({
      alerts,
      checklist,
      canManageChecklist: canManageOnboardingChecklist(session.role),
      role: session.role,
    });
  }
  if (url.searchParams.get("checklist") === "1") {
    const checklist = await getOnboardingChecklist();
    return NextResponse.json({
      checklist,
      canManageChecklist: canManageOnboardingChecklist(session.role),
    });
  }

  const items = await listOnboardings();
  return NextResponse.json({
    items,
    canManageChecklist: canManageOnboardingChecklist(session.role),
    role: session.role,
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
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { session } = auth;

  const ip = clientIp(request);
  const rl = rateLimit(`onboarding:create:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const item = await createOnboarding(
      {
        employeeName: String(body.employeeName ?? ""),
        email: String(body.email ?? ""),
        phone: String(body.phone ?? ""),
        roleTarget: String(body.roleTarget ?? ""),
        site: String(body.site ?? ""),
        managerName: String(body.managerName ?? ""),
        startDate: String(body.startDate ?? ""),
        hiringDossierId: String(body.hiringDossierId ?? ""),
        rhOwner: String(body.rhOwner ?? ""),
        comments: String(body.comments ?? ""),
      },
      {
        email: session.email,
        name: session.name,
        role: session.role,
      },
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
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { session } = auth;

  const ip = clientIp(request);
  const rl = rateLimit(`onboarding:patch:${ip}`, 80, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "").trim();

    if (action === "checklist") {
      if (!canManageOnboardingChecklist(session.role)) {
        return NextResponse.json(
          { error: "Seul RH / admin peut modifier la checklist" },
          { status: 403 },
        );
      }
      const items = Array.isArray(body.items)
        ? (body.items as OnboardingTaskDef[])
        : [];
      const checklist = await saveOnboardingChecklist(items, {
        email: session.email,
      });
      return NextResponse.json({ checklist });
    }

    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const actor = {
      email: session.email,
      name: session.name,
      role: session.role,
    };

    if (action === "task") {
      const item = await updateOnboardingTask(
        id,
        String(body.taskId ?? ""),
        Boolean(body.done),
        String(body.note ?? ""),
        actor,
      );
      if (!item) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      return NextResponse.json({ item });
    }

    if (action === "status") {
      const status = String(body.status ?? "") as OnboardingStatus;
      if (!isOnboardingStatus(status)) {
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      }
      const item = await setOnboardingStatus(
        id,
        status,
        actor,
        String(body.note ?? ""),
      );
      if (!item) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      return NextResponse.json({ item });
    }

    if (action === "meta") {
      const item = await updateOnboardingMeta(
        id,
        {
          employeeName:
            body.employeeName !== undefined
              ? String(body.employeeName)
              : undefined,
          email: body.email !== undefined ? String(body.email) : undefined,
          phone: body.phone !== undefined ? String(body.phone) : undefined,
          roleTarget:
            body.roleTarget !== undefined ? String(body.roleTarget) : undefined,
          site: body.site !== undefined ? String(body.site) : undefined,
          managerName:
            body.managerName !== undefined
              ? String(body.managerName)
              : undefined,
          startDate:
            body.startDate !== undefined ? String(body.startDate) : undefined,
          hiringDossierId:
            body.hiringDossierId !== undefined
              ? String(body.hiringDossierId)
              : undefined,
          rhOwner:
            body.rhOwner !== undefined ? String(body.rhOwner) : undefined,
          comments:
            body.comments !== undefined ? String(body.comments) : undefined,
        },
        actor,
      );
      if (!item) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      return NextResponse.json({ item });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Mise à jour impossible") },
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
  if (!canManageOnboardingChecklist(auth.session.role)) {
    return NextResponse.json(
      { error: "Seul RH / admin peut supprimer" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }
  const ok = await deleteOnboarding(id);
  if (!ok) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
