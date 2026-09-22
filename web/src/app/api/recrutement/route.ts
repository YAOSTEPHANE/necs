import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  assignRecruitmentManager,
  canAccessRecruitment,
  createRecruitment,
  countRecruitmentsByStatus,
  deleteRecruitment,
  isRecruitmentHr,
  isRecruitmentManager,
  listRecruitments,
  proposeRecruitmentDecision,
  RECRUITMENT_DECISIONS,
  RECRUITMENT_STATUSES,
  saveRecruitmentEvaluation,
  setRecruitmentDecision,
  updateRecruitmentStatus,
  type RecruitmentDecision,
  type RecruitmentStatus,
} from "@/lib/recrutement-crm";
import {
  assertSameOrigin,
  clampText,
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
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour le recrutement.",
    },
    { status: 503 },
  );
}

async function requireRecruitmentAccess() {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!canAccessRecruitment(session.role)) {
    return {
      error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    };
  }
  return { session };
}

function normalizeStatus(raw: unknown): RecruitmentStatus | null {
  const value = String(raw || "");
  return RECRUITMENT_STATUSES.includes(value as RecruitmentStatus)
    ? (value as RecruitmentStatus)
    : null;
}

function normalizeDecision(raw: unknown): RecruitmentDecision | null {
  const value = String(raw || "");
  return RECRUITMENT_DECISIONS.includes(value as RecruitmentDecision)
    ? (value as RecruitmentDecision)
    : null;
}

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireRecruitmentAccess();
  if (auth.error) return auth.error;
  const { session } = auth;

  const url = new URL(request.url);
  const managerScope = isRecruitmentManager(session.role)
    ? session.email
    : undefined;

  if (url.searchParams.get("meta") === "1") {
    const counts = await countRecruitmentsByStatus({
      managerEmail: managerScope,
    });
    return NextResponse.json({
      counts,
      role: session.role,
      canManageAll: isRecruitmentHr(session.role),
    });
  }

  const statusFilter = normalizeStatus(url.searchParams.get("status"));
  const items = await listRecruitments({
    managerEmail: managerScope,
    status: statusFilter || undefined,
  });
  return NextResponse.json({
    items,
    role: session.role,
    canManageAll: isRecruitmentHr(session.role),
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
  const auth = await requireRecruitmentAccess();
  if (auth.error) return auth.error;
  const { session } = auth;
  if (!isRecruitmentHr(session.role)) {
    return NextResponse.json(
      { error: "Seuls RH / admin créent une candidature" },
      { status: 403 },
    );
  }

  const ip = clientIp(request);
  const rlCreate = rateLimit(`recrutement:create:${ip}`, 30, 60_000);
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
    const name = clampText(String(body.name || ""), 120);
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    if (!name || !email.includes("@")) {
      return NextResponse.json(
        { error: "Nom et e-mail valides requis" },
        { status: 400 },
      );
    }
    const item = await createRecruitment(
      {
        name,
        email,
        phone: clampText(String(body.phone || ""), 40),
        roleTarget: clampText(String(body.roleTarget || "Agent terrain"), 120),
        source: clampText(String(body.source || "saisie_rh"), 80),
        city: clampText(String(body.city || ""), 80),
        experience: clampText(String(body.experience || ""), 200),
        message: clampText(String(body.message || ""), 4000),
        managerEmail: clampText(String(body.managerEmail || ""), 180),
        managerName: clampText(String(body.managerName || ""), 120),
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
  const auth = await requireRecruitmentAccess();
  if (auth.error) return auth.error;
  const { session } = auth;

  const ip = clientIp(request);
  const rlPatch = rateLimit(`recrutement:patch:${ip}`, 60, 60_000);
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
    const id = clampText(String(body.id || ""), 40);
    const action = clampText(String(body.action || "status"), 40);
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const actor = {
      email: session.email,
      name: session.name || session.email,
      role: session.role,
    };

    if (action === "status") {
      const status = normalizeStatus(body.status);
      if (!status) {
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      }
      const item = await updateRecruitmentStatus(
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

    if (action === "evaluation") {
      const score = Number(body.score);
      if (!Number.isFinite(score)) {
        return NextResponse.json({ error: "Score invalide" }, { status: 400 });
      }
      const criteriaRaw = Array.isArray(body.criteriaScores)
        ? (body.criteriaScores as {
            criterionId?: string;
            score?: number;
            appreciation?: string;
          }[])
        : undefined;
      const item = await saveRecruitmentEvaluation(
        id,
        score,
        clampText(String(body.evaluationNote || body.note || ""), 2000),
        actor,
        criteriaRaw?.map((c) => ({
          criterionId: String(c.criterionId || ""),
          score: Number(c.score) || 0,
          appreciation: String(c.appreciation || ""),
        })),
      );
      if (!item) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, item });
    }

    if (action === "decision") {
      const decision = normalizeDecision(body.decision);
      if (!decision || decision === "en_attente") {
        return NextResponse.json(
          { error: "Décision invalide" },
          { status: 400 },
        );
      }
      const item = await setRecruitmentDecision(
        id,
        decision,
        actor,
        clampText(String(body.note || ""), 800),
      );
      if (!item) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, item });
    }

    if (action === "propose") {
      const decision = normalizeDecision(body.decision);
      if (!decision || decision === "en_attente") {
        return NextResponse.json(
          { error: "Proposition invalide" },
          { status: 400 },
        );
      }
      const item = await proposeRecruitmentDecision(
        id,
        decision,
        actor,
        clampText(String(body.note || ""), 800),
      );
      if (!item) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, item });
    }

    if (action === "assign") {
      const item = await assignRecruitmentManager(
        id,
        clampText(String(body.managerEmail || ""), 180),
        clampText(String(body.managerName || ""), 120),
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
    const status =
      msg.includes("autorisé") ||
      msg.includes("Accès") ||
      msg.includes("Seuls") ||
      msg.includes("Transition") ||
      msg.includes("Évaluation") ||
      msg.includes("Décision") ||
      msg.includes("Proposition") ||
      msg.includes("parcours") ||
      msg.includes("requise")
        ? 403
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
  const auth = await requireRecruitmentAccess();
  if (auth.error) return auth.error;
  const { session } = auth;
  if (!isRecruitmentHr(session.role)) {
    return NextResponse.json(
      { error: "Suppression réservée RH / admin" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const id = clampText(url.searchParams.get("id") || "", 40);
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }
  try {
    const ok = await deleteRecruitment(id, { role: session.role });
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
