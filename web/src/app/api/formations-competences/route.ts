import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  canAccessFormationsCompetences,
  canManageSkillCatalog,
  countSkillAlerts,
  createCollaboratorSkills,
  deleteCollaboratorSkills,
  getPosteProfiles,
  getSkillCatalog,
  listCollaboratorSkills,
  renewCollaboratorSkill,
  setCollaboratorSkill,
  updateCollaboratorMeta,
} from "@/lib/formations-competences-crm";
import { isSkillLevel } from "@/lib/formations-competences-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour Formation & compétences.",
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
  if (!canAccessFormationsCompetences(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé RH / manager / admin" },
        { status: 403 },
      ),
    };
  }
  return { session };
}

function actorFrom(session: {
  userId: string;
  name: string;
  email: string;
  role: import("@/lib/settings").UserRole;
}) {
  return {
    userId: session.userId,
    name: session.name,
    email: session.email,
    role: session.role,
  };
}

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { session } = auth;
  const actor = actorFrom(session);

  const url = new URL(request.url);
  if (url.searchParams.get("meta") === "1") {
    const [alerts, catalog, postes] = await Promise.all([
      countSkillAlerts(actor),
      getSkillCatalog(),
      getPosteProfiles(),
    ]);
    return NextResponse.json({
      alerts,
      catalog,
      postes,
      canManageCatalog: canManageSkillCatalog(session.role),
      role: session.role,
    });
  }

  const [items, catalog, postes, alerts] = await Promise.all([
    listCollaboratorSkills(actor),
    getSkillCatalog(),
    getPosteProfiles(),
    countSkillAlerts(actor),
  ]);

  return NextResponse.json({
    items,
    catalog,
    postes,
    alerts,
    canManageCatalog: canManageSkillCatalog(session.role),
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
  const actor = actorFrom(session);

  const ip = clientIp(request);
  const limited = rateLimit(`skills:${session.userId}:${ip}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes, réessayez plus tard." },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "create";

    if (action === "create") {
      const item = await createCollaboratorSkills(
        {
          employeeName: String(body.employeeName ?? ""),
          email: String(body.email ?? ""),
          phone: String(body.phone ?? ""),
          posteId: String(body.posteId ?? ""),
          site: String(body.site ?? ""),
          managerName: String(body.managerName ?? ""),
          rhOwner: String(body.rhOwner ?? ""),
          comments: String(body.comments ?? ""),
        },
        actor,
      );
      return NextResponse.json({ ok: true, item }, { status: 201 });
    }

    if (action === "set_skill") {
      const id = String(body.id ?? "");
      const skillId = String(body.skillId ?? "");
      const level = Number(body.level);
      if (!id || !skillId || !isSkillLevel(level)) {
        return NextResponse.json(
          { error: "id, skillId et level (1–5) requis" },
          { status: 400 },
        );
      }
      const item = await setCollaboratorSkill({
        id,
        skillId,
        level,
        certifiedAt:
          typeof body.certifiedAt === "string" ? body.certifiedAt : undefined,
        trainingTitle:
          typeof body.trainingTitle === "string"
            ? body.trainingTitle
            : undefined,
        note: typeof body.note === "string" ? body.note : undefined,
        actor,
      });
      return NextResponse.json({ ok: true, item });
    }

    if (action === "renew") {
      const id = String(body.id ?? "");
      const skillId = String(body.skillId ?? "");
      if (!id || !skillId) {
        return NextResponse.json(
          { error: "id et skillId requis" },
          { status: 400 },
        );
      }
      const levelRaw = body.level != null ? Number(body.level) : undefined;
      const item = await renewCollaboratorSkill({
        id,
        skillId,
        trainingTitle:
          typeof body.trainingTitle === "string"
            ? body.trainingTitle
            : undefined,
        level: isSkillLevel(levelRaw) ? levelRaw : undefined,
        actor,
      });
      return NextResponse.json({ ok: true, item });
    }

    if (action === "update_meta") {
      const id = String(body.id ?? "");
      if (!id) {
        return NextResponse.json({ error: "id requis" }, { status: 400 });
      }
      const item = await updateCollaboratorMeta({
        id,
        posteId: typeof body.posteId === "string" ? body.posteId : undefined,
        site: typeof body.site === "string" ? body.site : undefined,
        managerName:
          typeof body.managerName === "string" ? body.managerName : undefined,
        comments: typeof body.comments === "string" ? body.comments : undefined,
        actor,
      });
      return NextResponse.json({ ok: true, item });
    }

    if (action === "delete") {
      const id = String(body.id ?? "");
      if (!id) {
        return NextResponse.json({ error: "id requis" }, { status: 400 });
      }
      await deleteCollaboratorSkills(id, actor);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Erreur Formation & compétences") },
      { status: 400 },
    );
  }
}
