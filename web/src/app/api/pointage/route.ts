import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  correctPunchRecord,
  flagPunchAnomaly,
  listPunchesForDate,
  pointageMeta,
  punchInAtomic,
  punchOutAtomic,
  runConcurrentPunchTest,
  updatePunchNoteRecord,
  validatePunchRecord,
} from "@/lib/pointage-crm";
import {
  canAccessPointage,
  canSupervisePointage,
  isPunchMode,
  todayIso,
} from "@/lib/pointage-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour le pointage.",
    },
    { status: 503 },
  );
}

async function requireAccess(supervise = false) {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!canAccessPointage(session.role)) {
    return {
      error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    };
  }
  if (supervise && !canSupervisePointage(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Action réservée superviseur / RH" },
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
  const date = url.searchParams.get("date") || todayIso();
  const punches = await listPunchesForDate(date, auth.actor);
  const meta = pointageMeta();

  return NextResponse.json({
    punches,
    date,
    ...meta,
    canSupervise: canSupervisePointage(auth.session.role),
    role: auth.session.role,
    userId: auth.session.userId,
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
  // Pic matinal : plafond large (agents simultanés)
  const rl = rateLimit(`pointage:post:${ip}`, 240, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    const superviseActions = new Set([
      "validate",
      "correct",
      "anomaly",
      "concurrent_test",
      "punch_for",
    ]);
    const auth = await requireAccess(superviseActions.has(action));
    if (auth.error) return auth.error;

    switch (action) {
      case "punch_in": {
        const targetUserId =
          String(body.userId ?? "") || auth.actor.userId;
        if (
          targetUserId !== auth.actor.userId &&
          !canSupervisePointage(auth.session.role)
        ) {
          return NextResponse.json(
            { error: "Pointage tiers réservé superviseur" },
            { status: 403 },
          );
        }
        const result = await punchInAtomic(targetUserId, auth.actor, {
          date: body.date !== undefined ? String(body.date) : undefined,
          mode: isPunchMode(body.mode) ? body.mode : "Mobile",
          clientRequestId:
            body.clientRequestId !== undefined
              ? String(body.clientRequestId)
              : undefined,
          geo: body.geo,
          note: body.note !== undefined ? String(body.note) : undefined,
        });
        return NextResponse.json(result);
      }
      case "punch_out": {
        const targetUserId =
          String(body.userId ?? "") || auth.actor.userId;
        if (
          targetUserId !== auth.actor.userId &&
          !canSupervisePointage(auth.session.role)
        ) {
          return NextResponse.json(
            { error: "Pointage tiers réservé superviseur" },
            { status: 403 },
          );
        }
        const result = await punchOutAtomic(targetUserId, auth.actor, {
          date: body.date !== undefined ? String(body.date) : undefined,
          mode: isPunchMode(body.mode) ? body.mode : "Mobile",
          clientRequestId:
            body.clientRequestId !== undefined
              ? String(body.clientRequestId)
              : undefined,
          geo: body.geo,
        });
        return NextResponse.json(result);
      }
      case "punch_for": {
        const targetUserId = String(body.userId ?? "");
        if (!targetUserId) {
          return NextResponse.json(
            { error: "userId requis" },
            { status: 400 },
          );
        }
        const kind = String(body.kind ?? "in");
        const result =
          kind === "out"
            ? await punchOutAtomic(targetUserId, auth.actor, {
                date:
                  body.date !== undefined ? String(body.date) : undefined,
                mode: "Terminal",
                clientRequestId:
                  body.clientRequestId !== undefined
                    ? String(body.clientRequestId)
                    : undefined,
              })
            : await punchInAtomic(targetUserId, auth.actor, {
                date:
                  body.date !== undefined ? String(body.date) : undefined,
                mode: "Terminal",
                clientRequestId:
                  body.clientRequestId !== undefined
                    ? String(body.clientRequestId)
                    : undefined,
              });
        return NextResponse.json(result);
      }
      case "validate": {
        const punch = await validatePunchRecord(
          String(body.id ?? ""),
          auth.actor,
        );
        return NextResponse.json({ punch });
      }
      case "correct": {
        const punch = await correctPunchRecord(
          String(body.id ?? ""),
          {
            actualIn:
              body.actualIn !== undefined
                ? body.actualIn === null
                  ? null
                  : String(body.actualIn)
                : undefined,
            actualOut:
              body.actualOut !== undefined
                ? body.actualOut === null
                  ? null
                  : String(body.actualOut)
                : undefined,
            plannedIn:
              body.plannedIn !== undefined
                ? String(body.plannedIn)
                : undefined,
            plannedOut:
              body.plannedOut !== undefined
                ? String(body.plannedOut)
                : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
            mode: isPunchMode(body.mode) ? body.mode : "Manuel",
          },
          auth.actor,
        );
        return NextResponse.json({ punch });
      }
      case "note": {
        const punch = await updatePunchNoteRecord(
          String(body.id ?? ""),
          String(body.note ?? ""),
          auth.actor,
        );
        return NextResponse.json({ punch });
      }
      case "anomaly": {
        const punch = await flagPunchAnomaly(
          String(body.id ?? ""),
          String(body.reason ?? ""),
          auth.actor,
        );
        return NextResponse.json({ punch });
      }
      case "concurrent_test": {
        const test = await runConcurrentPunchTest(
          auth.actor,
          body.target !== undefined ? Number(body.target) : undefined,
        );
        return NextResponse.json({ test });
      }
      default:
        return NextResponse.json(
          { error: "Action inconnue" },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Pointage impossible") },
      { status: 400 },
    );
  }
}
