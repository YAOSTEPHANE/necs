import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  createManualQuote,
  createQuoteFromOpportunity,
  createQuoteFromVisit,
  createQuoteVersion,
  getQuote,
  getQuoteTariffs,
  listQuotes,
  markQuoteSent,
  quoteValidationMeta,
  rejectQuote,
  saveQuoteTariffs,
  submitQuoteForValidation,
  updateQuoteDraft,
  validateQuote,
  withdrawQuote,
} from "@/lib/quotes-crm";
import {
  canAccessQuotes,
  canEditQuotes,
  canValidateQuotes,
  roleCanValidateAmount,
  type QuoteLine,
} from "@/lib/quotes-shared";
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
        "Base de données indisponible. Configurez DATABASE_URL pour les devis.",
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
  if (!canAccessQuotes(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé commercial / finance / direction" },
        { status: 403 },
      ),
    };
  }
  if (edit && !canEditQuotes(session.role) && !canValidateQuotes(session.role)) {
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
  const tariffsOnly = url.searchParams.get("tariffs") === "1";

  const tariffs = await getQuoteTariffs();

  if (tariffsOnly) {
    return NextResponse.json({ tariffs });
  }

  if (id) {
    const item = await getQuote(id);
    if (!item) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      item,
      tariffs,
      meta: quoteValidationMeta(item, tariffs),
      canEdit: canEditQuotes(auth.session.role),
      canValidate:
        canValidateQuotes(auth.session.role) &&
        roleCanValidateAmount(auth.session.role, item.totals.totalHT, tariffs),
      role: auth.session.role,
    });
  }

  const items = await listQuotes(auth.actor);
  return NextResponse.json({
    items,
    tariffs,
    canEdit: canEditQuotes(auth.session.role),
    canValidate: canValidateQuotes(auth.session.role),
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
  const rl = rateLimit(`quotes:post:${ip}`, 80, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "from-visit");
    const tariffs = await getQuoteTariffs();

    const withMeta = async (item: Awaited<ReturnType<typeof getQuote>>) => {
      if (!item) throw new Error("Devis introuvable");
      return {
        item,
        tariffs,
        meta: quoteValidationMeta(item, tariffs),
        canEdit: canEditQuotes(auth.session.role),
        canValidate:
          canValidateQuotes(auth.session.role) &&
          roleCanValidateAmount(auth.session.role, item.totals.totalHT, tariffs),
      };
    };

    switch (action) {
      case "from-visit": {
        if (!canEditQuotes(auth.session.role)) {
          return NextResponse.json({ error: "Création refusée" }, { status: 403 });
        }
        const item = await createQuoteFromVisit(
          String(body.visitId ?? ""),
          auth.actor,
          {
            title: body.title !== undefined ? String(body.title) : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
          },
        );
        return NextResponse.json(await withMeta(item), { status: 201 });
      }
      case "from-opportunity": {
        if (!canEditQuotes(auth.session.role)) {
          return NextResponse.json({ error: "Création refusée" }, { status: 403 });
        }
        const item = await createQuoteFromOpportunity(
          String(body.opportunityId ?? body.prospectId ?? ""),
          auth.actor,
          {
            title: body.title !== undefined ? String(body.title) : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
          },
        );
        return NextResponse.json(await withMeta(item), { status: 201 });
      }
      case "manual": {
        if (!canEditQuotes(auth.session.role)) {
          return NextResponse.json({ error: "Création refusée" }, { status: 403 });
        }
        const item = await createManualQuote(
          {
            prospectId: String(body.prospectId ?? ""),
            opportunityId: String(body.opportunityId ?? ""),
            company: String(body.company ?? ""),
            title: body.title !== undefined ? String(body.title) : undefined,
            surfaceM2: Number(body.surfaceM2 ?? 0),
            staffCount: Number(body.staffCount ?? 0),
            hoursPerVisit:
              body.hoursPerVisit !== undefined
                ? Number(body.hoursPerVisit)
                : undefined,
            frequency: (body.frequency as NeedFrequency | "") || "",
            serviceLevel: (body.serviceLevel as ServiceLevel | "") || "",
            prestation: (body.prestation as PrestationKind | "") || "",
            note: body.note !== undefined ? String(body.note) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json(await withMeta(item), { status: 201 });
      }
      case "update": {
        if (!canEditQuotes(auth.session.role)) {
          return NextResponse.json({ error: "Modification refusée" }, { status: 403 });
        }
        const item = await updateQuoteDraft(
          String(body.id ?? ""),
          {
            title: body.title !== undefined ? String(body.title) : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
            frequency:
              body.frequency !== undefined
                ? ((body.frequency as NeedFrequency | "") || "")
                : undefined,
            serviceLevel:
              body.serviceLevel !== undefined
                ? ((body.serviceLevel as ServiceLevel | "") || "")
                : undefined,
            prestation:
              body.prestation !== undefined
                ? ((body.prestation as PrestationKind | "") || "")
                : undefined,
            staffCount:
              body.staffCount !== undefined
                ? Number(body.staffCount)
                : undefined,
            surfaceM2:
              body.surfaceM2 !== undefined ? Number(body.surfaceM2) : undefined,
            hoursPerVisit:
              body.hoursPerVisit !== undefined
                ? Number(body.hoursPerVisit)
                : undefined,
            overheadPct:
              body.overheadPct !== undefined
                ? Number(body.overheadPct)
                : undefined,
            marginPct:
              body.marginPct !== undefined ? Number(body.marginPct) : undefined,
            rebuildLines: Boolean(body.rebuildLines),
            lines: Array.isArray(body.lines)
              ? (body.lines as Partial<QuoteLine>[])
              : undefined,
          },
          auth.actor,
        );
        return NextResponse.json(await withMeta(item));
      }
      case "version": {
        const item = await createQuoteVersion(
          String(body.id ?? ""),
          auth.actor,
          String(body.reason ?? ""),
        );
        return NextResponse.json(await withMeta(item));
      }
      case "submit": {
        const item = await submitQuoteForValidation(
          String(body.id ?? ""),
          auth.actor,
        );
        return NextResponse.json(await withMeta(item));
      }
      case "validate": {
        const item = await validateQuote(String(body.id ?? ""), auth.actor);
        return NextResponse.json(await withMeta(item));
      }
      case "reject": {
        const item = await rejectQuote(
          String(body.id ?? ""),
          auth.actor,
          String(body.reason ?? ""),
        );
        return NextResponse.json(await withMeta(item));
      }
      case "withdraw": {
        const item = await withdrawQuote(String(body.id ?? ""), auth.actor);
        return NextResponse.json(await withMeta(item));
      }
      case "send": {
        const item = await markQuoteSent(String(body.id ?? ""), auth.actor);
        return NextResponse.json(await withMeta(item));
      }
      case "tariffs": {
        const next = await saveQuoteTariffs(
          {
            ratePerM2:
              body.ratePerM2 !== undefined ? Number(body.ratePerM2) : undefined,
            hourlyRate:
              body.hourlyRate !== undefined
                ? Number(body.hourlyRate)
                : undefined,
            consumablePerM2:
              body.consumablePerM2 !== undefined
                ? Number(body.consumablePerM2)
                : undefined,
            overheadPct:
              body.overheadPct !== undefined
                ? Number(body.overheadPct)
                : undefined,
            marginPct:
              body.marginPct !== undefined ? Number(body.marginPct) : undefined,
            hoursPerVisitDefault:
              body.hoursPerVisitDefault !== undefined
                ? Number(body.hoursPerVisitDefault)
                : undefined,
            thresholdCommercial:
              body.thresholdCommercial !== undefined
                ? Number(body.thresholdCommercial)
                : undefined,
            thresholdFinance:
              body.thresholdFinance !== undefined
                ? Number(body.thresholdFinance)
                : undefined,
          },
          auth.actor,
        );
        return NextResponse.json({ tariffs: next });
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
