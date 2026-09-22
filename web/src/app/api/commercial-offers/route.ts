import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  acceptCommercialOffer,
  createCommercialOffer,
  generateCommercialOfferFromSources,
  getCommercialOffer,
  listCommercialOffers,
  listOfferGenerationSources,
  markOfferNegotiation,
  markOfferSent,
  rejectCommercialOffer,
  submitOfferForReview,
  updateCommercialOfferDraft,
} from "@/lib/commercial-offers-crm";
import {
  canAccessCommercialOffers,
  canEditCommercialOffers,
  canReviewCommercialOffers,
  offerReadyToSend,
  type CommercialOfferLine,
} from "@/lib/commercial-offers-shared";
import type {
  NeedFrequency,
  PrestationKind,
  ServiceLevel,
} from "@/lib/need-qualification-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour les offres.",
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
  if (!canAccessCommercialOffers(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé commercial / direction" },
        { status: 403 },
      ),
    };
  }
  if (
    edit &&
    !canEditCommercialOffers(session.role) &&
    !canReviewCommercialOffers(session.role)
  ) {
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
  const sources = url.searchParams.get("sources");

  if (sources === "1" || sources === "true") {
    const data = await listOfferGenerationSources(auth.actor);
    return NextResponse.json({
      ...data,
      canEdit: canEditCommercialOffers(auth.session.role),
    });
  }

  if (id) {
    const item = await getCommercialOffer(id);
    if (!item) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      item,
      recipe: offerReadyToSend(item),
      canEdit: canEditCommercialOffers(auth.session.role),
      canReview: canReviewCommercialOffers(auth.session.role),
      role: auth.session.role,
    });
  }

  const items = await listCommercialOffers(auth.actor);
  return NextResponse.json({
    items,
    canEdit: canEditCommercialOffers(auth.session.role),
    canReview: canReviewCommercialOffers(auth.session.role),
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
  const limited = rateLimit(`offers:post:${clientIp(request)}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const auth = await requireAccess(true);
  if (auth.error) return auth.error;
  if (!canEditCommercialOffers(auth.session.role)) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "generate" || body.generateFrom === true) {
      const item = await generateCommercialOfferFromSources(
        {
          opportunityId: String(body.opportunityId || ""),
          quoteId: String(body.quoteId || ""),
        },
        auth.actor,
      );
      return NextResponse.json({ item }, { status: 201 });
    }

    const item = await createCommercialOffer(
      {
        title: String(body.title || ""),
        company: String(body.company || ""),
        site: String(body.site || ""),
        contactName: String(body.contactName || ""),
        contactPhone: String(body.contactPhone || ""),
        contactEmail: String(body.contactEmail || ""),
        opportunityId: String(body.opportunityId || ""),
        quoteId: String(body.quoteId || ""),
        visitId: String(body.visitId || ""),
        prospectId: String(body.prospectId || ""),
        premisesKind: body.premisesKind as PrestationKind | "",
        surfaceM2: Number(body.surfaceM2) || 0,
        frequency: body.frequency as NeedFrequency | "",
        serviceLevel: body.serviceLevel as ServiceLevel | "",
        validityDays: Number(body.validityDays) || 30,
        offerDate: String(body.offerDate || ""),
        startDate: String(body.startDate || ""),
        needSummary: String(body.needSummary || ""),
        zones: String(body.zones || ""),
        constraints: String(body.constraints || ""),
        prestationsSummary: String(body.prestationsSummary || ""),
        methodology: String(body.methodology || ""),
        means: String(body.means || ""),
        arguments: String(body.arguments || ""),
        teamDetail: String(body.teamDetail || ""),
        supervision: String(body.supervision || ""),
        digitalPilotage: String(body.digitalPilotage || ""),
        indicativePlanning: String(body.indicativePlanning || ""),
        conditions: String(body.conditions || ""),
        confidentiality: body.confidentiality as
          | "confidentiel"
          | "interne"
          | "public_client"
          | undefined,
        note: String(body.note || ""),
        lines: Array.isArray(body.lines)
          ? (body.lines as Partial<CommercialOfferLine>[])
          : undefined,
      },
      auth.actor,
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
  const limited = rateLimit(`offers:patch:${clientIp(request)}`, 80, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const auth = await requireAccess(true);
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id || "");
    const action = String(body.action || "update");
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    let item;
    switch (action) {
      case "update":
        if (!canEditCommercialOffers(auth.session.role)) {
          return NextResponse.json(
            { error: "Droits insuffisants" },
            { status: 403 },
          );
        }
        item = await updateCommercialOfferDraft(
          id,
          {
            title: body.title as string | undefined,
            company: String(body.company || ""),
            site: body.site as string | undefined,
            contactName: body.contactName as string | undefined,
            contactPhone: body.contactPhone as string | undefined,
            contactEmail: body.contactEmail as string | undefined,
            opportunityId: body.opportunityId as string | undefined,
            quoteId: body.quoteId as string | undefined,
            visitId: body.visitId as string | undefined,
            prospectId: body.prospectId as string | undefined,
            premisesKind: body.premisesKind as PrestationKind | "",
            surfaceM2:
              body.surfaceM2 !== undefined
                ? Number(body.surfaceM2)
                : undefined,
            frequency: body.frequency as NeedFrequency | "",
            serviceLevel: body.serviceLevel as ServiceLevel | "",
            validityDays:
              body.validityDays !== undefined
                ? Number(body.validityDays)
                : undefined,
            offerDate: body.offerDate as string | undefined,
            startDate: body.startDate as string | undefined,
            needSummary: body.needSummary as string | undefined,
            zones: body.zones as string | undefined,
            constraints: body.constraints as string | undefined,
            prestationsSummary: body.prestationsSummary as string | undefined,
            methodology: body.methodology as string | undefined,
            means: body.means as string | undefined,
            arguments: body.arguments as string | undefined,
            teamDetail: body.teamDetail as string | undefined,
            supervision: body.supervision as string | undefined,
            digitalPilotage: body.digitalPilotage as string | undefined,
            indicativePlanning: body.indicativePlanning as string | undefined,
            conditions: body.conditions as string | undefined,
            confidentiality: body.confidentiality as
              | "confidentiel"
              | "interne"
              | "public_client"
              | undefined,
            note: body.note as string | undefined,
            lines: Array.isArray(body.lines)
              ? (body.lines as Partial<CommercialOfferLine>[])
              : undefined,
          },
          auth.actor,
        );
        break;
      case "submit_review":
        if (!canEditCommercialOffers(auth.session.role)) {
          return NextResponse.json(
            { error: "Droits insuffisants" },
            { status: 403 },
          );
        }
        item = await submitOfferForReview(id, auth.actor);
        break;
      case "send":
        if (!canEditCommercialOffers(auth.session.role)) {
          return NextResponse.json(
            { error: "Droits insuffisants" },
            { status: 403 },
          );
        }
        item = await markOfferSent(id, auth.actor);
        break;
      case "negotiate":
        if (!canEditCommercialOffers(auth.session.role)) {
          return NextResponse.json(
            { error: "Droits insuffisants" },
            { status: 403 },
          );
        }
        item = await markOfferNegotiation(id, auth.actor);
        break;
      case "accept":
        if (!canReviewCommercialOffers(auth.session.role)) {
          return NextResponse.json(
            { error: "Droits insuffisants" },
            { status: 403 },
          );
        }
        item = await acceptCommercialOffer(id, auth.actor);
        break;
      case "reject":
        if (!canReviewCommercialOffers(auth.session.role)) {
          return NextResponse.json(
            { error: "Droits insuffisants" },
            { status: 403 },
          );
        }
        item = await rejectCommercialOffer(
          id,
          String(body.reason || ""),
          auth.actor,
        );
        break;
      default:
        return NextResponse.json(
          { error: `Action inconnue : ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      item,
      recipe: offerReadyToSend(item),
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Action impossible") },
      { status: 400 },
    );
  }
}
