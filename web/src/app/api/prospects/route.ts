import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  addProspectContact,
  assignProspect,
  createProspect,
  getProspect,
  importProspectFromLead,
  listAllProspectStatuses,
  listProspectStatuses,
  listProspects,
  qualifyProspect,
  removeProspectContact,
  saveProspectStatuses,
  searchProspects,
  setProspectStatus,
  updateProspect,
} from "@/lib/prospects-crm";
import { upsertOpportunityNeed } from "@/lib/need-qualification-crm";
import type { CleaningNeed } from "@/lib/need-qualification-shared";
import {
  canAccessProspects,
  canConfigureProspectStatuses,
  canManageProspects,
  isProspectPotential,
  type ProspectStatusDef,
} from "@/lib/prospects-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour les prospects.",
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
  if (!canAccessProspects(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé commercial / admin" },
        { status: 403 },
      ),
    };
  }
  if (manage && !canManageProspects(session.role)) {
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
  const q = url.searchParams.get("q");
  const meta = url.searchParams.get("meta");

  if (meta === "statuses") {
    const statuses = await listAllProspectStatuses();
    return NextResponse.json({
      statuses,
      active: await listProspectStatuses(),
      canConfigure: canConfigureProspectStatuses(auth.session.role),
    });
  }

  if (id) {
    const item = await getProspect(id);
    if (!item) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
    }
    return NextResponse.json({ item });
  }

  if (q) {
    const items = await searchProspects(q);
    return NextResponse.json({
      items,
      canManage: canManageProspects(auth.session.role),
      statuses: await listProspectStatuses(),
    });
  }

  const items = await listProspects(auth.actor);
  return NextResponse.json({
    items,
    canManage: canManageProspects(auth.session.role),
    canConfigure: canConfigureProspectStatuses(auth.session.role),
    statuses: await listProspectStatuses(),
    role: auth.session.role,
    email: auth.session.email,
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
  const rl = rateLimit(`prospects:create:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "create");

    if (action === "import-lead") {
      const result = await importProspectFromLead(
        {
          email: String(body.email ?? ""),
          name: String(body.name ?? ""),
          company: String(body.company ?? ""),
          phone: String(body.phone ?? ""),
          source: String(body.source ?? ""),
          campaign: String(body.campaign ?? ""),
          subject: String(body.subject ?? ""),
          message: String(body.message ?? ""),
        },
        auth.actor,
      );
      return NextResponse.json(result, { status: result.created ? 201 : 200 });
    }

    if (action === "save-statuses") {
      if (!canConfigureProspectStatuses(auth.session.role)) {
        return NextResponse.json({ error: "Configuration refusée" }, { status: 403 });
      }
      const raw = Array.isArray(body.statuses) ? body.statuses : [];
      const statuses = await saveProspectStatuses(
        raw as ProspectStatusDef[],
        auth.actor,
      );
      return NextResponse.json({ statuses });
    }

    const result = await createProspect(
      {
        company: String(body.company ?? ""),
        name: String(body.name ?? ""),
        email: String(body.email ?? ""),
        phone: String(body.phone ?? ""),
        city: String(body.city ?? ""),
        address: String(body.address ?? ""),
        sector: String(body.sector ?? ""),
        source: String(body.source ?? ""),
        campaign: String(body.campaign ?? ""),
        potential: isProspectPotential(body.potential)
          ? body.potential
          : "moyen",
        potentialValue: Number(body.potentialValue) || 0,
        status: String(body.status ?? ""),
        assigneeEmail: String(body.assigneeEmail ?? ""),
        assigneeName: String(body.assigneeName ?? ""),
        note: String(body.note ?? ""),
      },
      auth.actor,
    );

    if (result.duplicate) {
      return NextResponse.json(
        {
          error: "Prospect déjà existant (déduplication e-mail).",
          item: result.prospect,
          duplicate: true,
        },
        { status: 409 },
      );
    }

    // CRM-02 : rattacher la qualification besoin dès la création du prospect
    let opportunity = null;
    let needWarning: string | null = null;
    const needRaw = body.need;
    if (needRaw && typeof needRaw === "object") {
      try {
        opportunity = await upsertOpportunityNeed(
          result.prospect.id,
          needRaw as Partial<CleaningNeed>,
          auth.actor,
          { valueEstimate: Number(body.potentialValue) || 0 },
        );
      } catch (err) {
        console.warn("[prospects] need upsert", err);
        needWarning =
          "Prospect créé, mais la qualification besoin n’a pas pu être initialisée.";
      }
    } else {
      try {
        opportunity = await upsertOpportunityNeed(
          result.prospect.id,
          {},
          auth.actor,
          { valueEstimate: Number(body.potentialValue) || 0 },
        );
      } catch (err) {
        console.warn("[prospects] empty need upsert", err);
        needWarning =
          "Prospect créé, mais la qualification besoin n’a pas pu être initialisée.";
      }
    }

    return NextResponse.json(
      {
        item: result.prospect,
        opportunity,
        warning: needWarning,
        created: true,
      },
      { status: 201 },
    );
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
  const auth = await requireAccess(true);
  if (auth.error) return auth.error;

  const ip = clientIp(request);
  const rl = rateLimit(`prospects:patch:${ip}`, 80, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    const action = String(body.action ?? "").trim();
    if (!id || !action) {
      return NextResponse.json({ error: "id et action requis" }, { status: 400 });
    }

    let item;
    switch (action) {
      case "update":
        item = await updateProspect(
          id,
          {
            company: body.company !== undefined ? String(body.company) : undefined,
            name: body.name !== undefined ? String(body.name) : undefined,
            email: body.email !== undefined ? String(body.email) : undefined,
            phone: body.phone !== undefined ? String(body.phone) : undefined,
            city: body.city !== undefined ? String(body.city) : undefined,
            address:
              body.address !== undefined ? String(body.address) : undefined,
            sector: body.sector !== undefined ? String(body.sector) : undefined,
            source: body.source !== undefined ? String(body.source) : undefined,
            campaign:
              body.campaign !== undefined ? String(body.campaign) : undefined,
            potential: isProspectPotential(body.potential)
              ? body.potential
              : undefined,
            potentialValue:
              body.potentialValue !== undefined
                ? Number(body.potentialValue)
                : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
          },
          auth.actor,
        );
        break;
      case "assign":
        item = await assignProspect(
          id,
          {
            assigneeEmail: String(body.assigneeEmail ?? ""),
            assigneeName: String(body.assigneeName ?? ""),
          },
          auth.actor,
        );
        break;
      case "status":
        item = await setProspectStatus(
          id,
          String(body.status ?? ""),
          auth.actor,
          String(body.note ?? ""),
        );
        break;
      case "qualify":
        item = await qualifyProspect(id, auth.actor, {
          potential: isProspectPotential(body.potential)
            ? body.potential
            : undefined,
          potentialValue:
            body.potentialValue !== undefined
              ? Number(body.potentialValue)
              : undefined,
          note: String(body.note ?? ""),
        });
        break;
      case "add-contact":
        item = await addProspectContact(
          id,
          {
            name: String(body.name ?? ""),
            email: String(body.email ?? ""),
            phone: String(body.phone ?? ""),
            role: String(body.role ?? ""),
            isPrimary: Boolean(body.isPrimary),
          },
          auth.actor,
        );
        break;
      case "remove-contact":
        item = await removeProspectContact(
          id,
          String(body.contactId ?? ""),
          auth.actor,
        );
        break;
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Mise à jour impossible") },
      { status: 400 },
    );
  }
}
