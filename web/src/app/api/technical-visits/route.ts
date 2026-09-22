import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  addVisitPhoto,
  cancelTechnicalVisit,
  getTechnicalVisit,
  getVisitQuotePayload,
  listTechnicalVisits,
  planTechnicalVisit,
  removeVisitPhoto,
  startTechnicalVisit,
  toggleVisitChecklist,
  updateVisitCollection,
  validateVisitReport,
} from "@/lib/technical-visit-crm";
import {
  buildVisitReportSnapshot,
  canAccessTechnicalVisits,
  canManageTechnicalVisits,
  canValidateVisitReport,
  visitReportBlockingReasons,
  type ChecklistItemId,
  type VisitZone,
} from "@/lib/technical-visit-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour les visites techniques.",
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
  if (!canAccessTechnicalVisits(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé commercial / exploitation" },
        { status: 403 },
      ),
    };
  }
  if (manage && !canManageTechnicalVisits(session.role)) {
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
  const id = url.searchParams.get("id");
  const quote = url.searchParams.get("quote");

  if (id && quote === "1") {
    try {
      const snapshot = await getVisitQuotePayload(id);
      return NextResponse.json({ snapshot });
    } catch (error) {
      return NextResponse.json(
        { error: safeErrorMessage(error, "Rapport non exploitable") },
        { status: 400 },
      );
    }
  }

  if (id) {
    const item = await getTechnicalVisit(id);
    if (!item) {
      return NextResponse.json({ error: "Visite introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      item,
      snapshot: buildVisitReportSnapshot(item),
      blockers: visitReportBlockingReasons(item),
      canValidate: canValidateVisitReport(auth.session.role),
    });
  }

  const items = await listTechnicalVisits(auth.actor);
  return NextResponse.json({
    items,
    canManage: canManageTechnicalVisits(auth.session.role),
    canValidate: canValidateVisitReport(auth.session.role),
    email: auth.session.email,
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
  const rl = rateLimit(`tech-visit:post:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "plan");

    if (action === "plan") {
      const item = await planTechnicalVisit(
        {
          prospectId: String(body.prospectId ?? ""),
          opportunityId: String(body.opportunityId ?? ""),
          company: String(body.company ?? ""),
          siteAddress: String(body.siteAddress ?? ""),
          city: String(body.city ?? ""),
          scheduledAt: String(body.scheduledAt ?? ""),
          scheduledEndAt: String(body.scheduledEndAt ?? ""),
          assigneeEmail: String(body.assigneeEmail ?? ""),
          assigneeName: String(body.assigneeName ?? ""),
          assigneeRole: String(body.assigneeRole ?? auth.session.role),
          contactName: String(body.contactName ?? ""),
          contactPhone: String(body.contactPhone ?? ""),
          note: String(body.note ?? ""),
        },
        auth.actor,
      );
      return NextResponse.json({ item }, { status: 201 });
    }

    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    switch (action) {
      case "start": {
        const item = await startTechnicalVisit(id, auth.actor);
        return NextResponse.json({ item });
      }
      case "collect": {
        const item = await updateVisitCollection(
          id,
          {
            surfaceTotalM2:
              body.surfaceTotalM2 === null || body.surfaceTotalM2 === undefined
                ? undefined
                : Number(body.surfaceTotalM2),
            constraints:
              body.constraints !== undefined
                ? String(body.constraints)
                : undefined,
            observations:
              body.observations !== undefined
                ? String(body.observations)
                : undefined,
            accessNotes:
              body.accessNotes !== undefined
                ? String(body.accessNotes)
                : undefined,
            interlocutor:
              body.interlocutor !== undefined
                ? String(body.interlocutor)
                : undefined,
            recommendedStaff:
              body.recommendedStaff === null ||
              body.recommendedStaff === undefined
                ? undefined
                : Number(body.recommendedStaff),
            risks:
              body.risks !== undefined ? String(body.risks) : undefined,
            needs:
              body.needs !== undefined ? String(body.needs) : undefined,
            recommendations:
              body.recommendations !== undefined
                ? String(body.recommendations)
                : undefined,
            actions:
              body.actions !== undefined ? String(body.actions) : undefined,
            siteAddress:
              body.siteAddress !== undefined
                ? String(body.siteAddress)
                : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
            zones: Array.isArray(body.zones)
              ? (body.zones as VisitZone[])
              : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({
          item,
          blockers: visitReportBlockingReasons(item),
        });
      }
      case "checklist": {
        const item = await toggleVisitChecklist(
          id,
          String(body.itemId ?? "") as ChecklistItemId,
          Boolean(body.done),
          auth.actor,
        );
        return NextResponse.json({ item });
      }
      case "add-photo": {
        const item = await addVisitPhoto(
          id,
          {
            url: String(body.url ?? ""),
            caption: String(body.caption ?? ""),
          },
          auth.actor,
        );
        return NextResponse.json({ item });
      }
      case "remove-photo": {
        const item = await removeVisitPhoto(
          id,
          String(body.photoId ?? ""),
          auth.actor,
        );
        return NextResponse.json({ item });
      }
      case "validate": {
        if (!canValidateVisitReport(auth.session.role)) {
          return NextResponse.json({ error: "Validation refusée" }, { status: 403 });
        }
        const result = await validateVisitReport(id, auth.actor);
        return NextResponse.json(result);
      }
      case "cancel": {
        const item = await cancelTechnicalVisit(
          id,
          auth.actor,
          String(body.reason ?? ""),
        );
        return NextResponse.json({ item });
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
