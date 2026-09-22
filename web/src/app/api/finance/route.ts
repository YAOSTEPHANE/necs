import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  buildClientStatement,
  createFinanceAck,
  createFinanceCreditNote,
  createFinanceInvoice,
  createFinancePayment,
  createFinancePrefacture,
  createFinanceQuote,
  createFinanceReminder,
  createFinanceStatement,
  listFinanceAcks,
  listFinanceClientNames,
  listFinanceCreditNotes,
  listFinanceInvoices,
  listFinancePayments,
  listFinancePrefactures,
  listFinanceQuotes,
  listFinanceReminders,
  listFinanceStatements,
  updateFinanceAck,
  updateFinanceCreditNote,
  updateFinanceInvoice,
  updateFinancePrefacture,
  updateFinanceQuote,
  updateFinanceReminder,
} from "@/lib/finance-crm";
import {
  ackReady,
  canAccessFinance,
  canEditFinance,
  canValidateFinance,
  creditNoteReady,
  invoiceReady,
  isFinanceAckStatus,
  isFinanceDocStatus,
  isPrefactureStatus,
  isReminderStatus,
  prefactureReady,
  quoteReady,
  reminderReady,
  statementReady,
  type FinanceAckChannel,
  type FinanceAckDocType,
  type FinanceAckStatus,
  type FinanceDocStatus,
  type FinanceLine,
  type FinancePaymentMethod,
  type FinancePeriodicity,
  type NecsIssuer,
  type PrefactureLine,
  type PrefactureStatus,
  type ReminderChannel,
  type ReminderInvoiceLine,
  type ReminderLevel,
  type ReminderStatus,
} from "@/lib/finance-shared";
import {
  assertSameOrigin,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

type Resource =
  | "devis"
  | "factures"
  | "avoirs"
  | "releves"
  | "acks"
  | "reglements"
  | "clients"
  | "prefactures"
  | "relances";

function mongoUnavailable() {
  return NextResponse.json(
    {
      error:
        "Base de données indisponible. Configurez DATABASE_URL pour la finance.",
    },
    { status: 503 },
  );
}

function parseResource(raw: string | null): Resource {
  if (raw === "factures" || raw === "facture" || raw === "invoices") {
    return "factures";
  }
  if (raw === "avoirs" || raw === "avoir" || raw === "credits") {
    return "avoirs";
  }
  if (raw === "releves" || raw === "releve" || raw === "statements") {
    return "releves";
  }
  if (
    raw === "acks" ||
    raw === "ack" ||
    raw === "accusés" ||
    raw === "accuses" ||
    raw === "preuves"
  ) {
    return "acks";
  }
  if (
    raw === "prefactures" ||
    raw === "prefacture" ||
    raw === "préfactures" ||
    raw === "tmp-18"
  ) {
    return "prefactures";
  }
  if (
    raw === "relances" ||
    raw === "relance" ||
    raw === "reminders" ||
    raw === "tmp-22"
  ) {
    return "relances";
  }
  if (raw === "reglements" || raw === "reglement" || raw === "payments") {
    return "reglements";
  }
  if (raw === "clients" || raw === "client") {
    return "clients";
  }
  return "devis";
}

async function requireAccess(edit = false) {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!canAccessFinance(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé finance / direction" },
        { status: 403 },
      ),
    };
  }
  if (edit && !canEditFinance(session.role) && !canValidateFinance(session.role)) {
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
  const resource = parseResource(url.searchParams.get("resource"));
  const clientName = url.searchParams.get("client") || "";
  const periodStart = url.searchParams.get("from") || "";
  const periodEnd = url.searchParams.get("to") || "";

  const meta = {
    canEdit: canEditFinance(auth.session.role),
    canValidate: canValidateFinance(auth.session.role),
    email: auth.session.email,
    role: auth.session.role,
    resource,
  };

  try {
    if (resource === "factures") {
      const items = await listFinanceInvoices(auth.actor);
      return NextResponse.json({ items, ...meta });
    }
    if (resource === "avoirs") {
      const items = await listFinanceCreditNotes(auth.actor);
      return NextResponse.json({ items, ...meta });
    }
    if (resource === "reglements") {
      const items = await listFinancePayments(auth.actor, clientName || undefined);
      return NextResponse.json({ items, ...meta });
    }
    if (resource === "clients") {
      const clients = await listFinanceClientNames(auth.actor);
      return NextResponse.json({ clients, ...meta });
    }
    if (resource === "releves") {
      const preview = url.searchParams.get("preview") === "1";
      if (preview) {
        const statement = await buildClientStatement(
          clientName,
          periodStart || `${new Date().getFullYear()}-01-01`,
          periodEnd || new Date().toISOString().slice(0, 10),
          auth.actor,
        );
        return NextResponse.json({ statement, ...meta });
      }
      const items = await listFinanceStatements(auth.actor);
      return NextResponse.json({ items, ...meta });
    }
    if (resource === "acks") {
      const items = await listFinanceAcks(auth.actor);
      return NextResponse.json({ items, ...meta });
    }
    if (resource === "prefactures") {
      const items = await listFinancePrefactures(auth.actor);
      return NextResponse.json({ items, ...meta });
    }
    if (resource === "relances") {
      const items = await listFinanceReminders(auth.actor);
      return NextResponse.json({ items, ...meta });
    }
    const items = await listFinanceQuotes(auth.actor);
    return NextResponse.json({ items, ...meta });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Chargement impossible") },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "JSON requis" }, { status: 415 });
  }
  const limited = rateLimit(`finance:post:${clientIp(request)}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const auth = await requireAccess(true);
  if (auth.error) return auth.error;
  if (!canEditFinance(auth.session.role)) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const resource = parseResource(String(body.resource || "devis"));
    const lines = Array.isArray(body.lines)
      ? (body.lines as Partial<FinanceLine>[])
      : undefined;

    if (resource === "factures") {
      const item = await createFinanceInvoice(
        {
          clientName: String(body.clientName || ""),
          site: String(body.site || ""),
          contactName: String(body.contactName || ""),
          contactEmail: String(body.contactEmail || ""),
          contractRef: String(body.contractRef || ""),
          periodStart: String(body.periodStart || ""),
          periodEnd: String(body.periodEnd || ""),
          issueDate: String(body.issueDate || ""),
          dueDate: String(body.dueDate || ""),
          taxRatePct: Number(body.taxRatePct),
          paymentTerms: String(body.paymentTerms || ""),
          paymentRefs: String(body.paymentRefs || ""),
          quoteId: String(body.quoteId || ""),
          quoteNumber: String(body.quoteNumber || ""),
          issuer: body.issuer as Partial<NecsIssuer> | undefined,
          note: String(body.note || ""),
          lines,
        },
        auth.actor,
      );
      return NextResponse.json(
        { item, recipe: invoiceReady(item) },
        { status: 201 },
      );
    }

    if (resource === "avoirs") {
      const item = await createFinanceCreditNote(
        {
          invoiceId: String(body.invoiceId || ""),
          invoiceNumber: String(body.invoiceNumber || ""),
          clientName: String(body.clientName || ""),
          reason: String(body.reason || ""),
          issueDate: String(body.issueDate || ""),
          taxRatePct: Number(body.taxRatePct),
          note: String(body.note || ""),
          lines,
        },
        auth.actor,
      );
      return NextResponse.json(
        { item, recipe: creditNoteReady(item) },
        { status: 201 },
      );
    }

    if (resource === "reglements") {
      const item = await createFinancePayment(
        {
          clientName: String(body.clientName || ""),
          invoiceId: String(body.invoiceId || ""),
          invoiceNumber: String(body.invoiceNumber || ""),
          amount: Number(body.amount) || 0,
          paidAt: String(body.paidAt || ""),
          method: body.method as FinancePaymentMethod | "",
          reference: String(body.reference || ""),
          note: String(body.note || ""),
        },
        auth.actor,
      );
      return NextResponse.json({ item }, { status: 201 });
    }

    if (resource === "releves") {
      const item = await createFinanceStatement(
        {
          clientName: String(body.clientName || ""),
          periodStart: String(body.periodStart || ""),
          periodEnd: String(body.periodEnd || ""),
          note: String(body.note || ""),
        },
        auth.actor,
      );
      return NextResponse.json(
        { item, recipe: statementReady(item) },
        { status: 201 },
      );
    }

    if (resource === "acks") {
      const item = await createFinanceAck(
        {
          documentType: body.documentType as FinanceAckDocType | "",
          documentId: String(body.documentId || ""),
          documentNumber: String(body.documentNumber || ""),
          documentLabel: String(body.documentLabel || ""),
          recipientName: String(body.recipientName || ""),
          recipientEmail: String(body.recipientEmail || ""),
          recipientOrg: String(body.recipientOrg || ""),
          channel: body.channel as FinanceAckChannel | "",
          transmittedAt: String(body.transmittedAt || ""),
          status: body.status as FinanceAckStatus | "",
          proofNote: String(body.proofNote || ""),
          note: String(body.note || ""),
        },
        auth.actor,
      );
      return NextResponse.json(
        { item, recipe: ackReady(item) },
        { status: 201 },
      );
    }

    if (resource === "prefactures") {
      const item = await createFinancePrefacture(
        {
          clientName: String(body.clientName || ""),
          contractRef: String(body.contractRef || ""),
          site: String(body.site || ""),
          periodStart: String(body.periodStart || ""),
          periodEnd: String(body.periodEnd || ""),
          taxRatePct: Number(body.taxRatePct),
          note: String(body.note || ""),
          lines: Array.isArray(body.lines)
            ? (body.lines as Partial<PrefactureLine>[])
            : undefined,
          status: body.status as PrefactureStatus | "",
        },
        auth.actor,
      );
      return NextResponse.json(
        { item, recipe: prefactureReady(item) },
        { status: 201 },
      );
    }

    if (resource === "relances") {
      const item = await createFinanceReminder(
        {
          clientName: String(body.clientName || ""),
          level: body.level as ReminderLevel | "",
          channel: body.channel as ReminderChannel | "",
          subject: String(body.subject || ""),
          body: String(body.body || ""),
          note: String(body.note || ""),
          invoices: Array.isArray(body.invoices)
            ? (body.invoices as Partial<ReminderInvoiceLine>[])
            : undefined,
          status: body.status as ReminderStatus | "",
        },
        auth.actor,
      );
      return NextResponse.json(
        { item, recipe: reminderReady(item) },
        { status: 201 },
      );
    }

    const item = await createFinanceQuote(
      {
        clientName: String(body.clientName || ""),
        site: String(body.site || ""),
        contactName: String(body.contactName || ""),
        contactEmail: String(body.contactEmail || ""),
        issueDate: String(body.issueDate || ""),
        validityDays: Number(body.validityDays) || 30,
        periodicity: body.periodicity as FinancePeriodicity | "",
        taxRatePct: Number(body.taxRatePct),
        paymentTerms: String(body.paymentTerms || ""),
        conditions: String(body.conditions || ""),
        note: String(body.note || ""),
        lines,
      },
      auth.actor,
    );
    return NextResponse.json(
      { item, recipe: quoteReady(item) },
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
  const limited = rateLimit(`finance:patch:${clientIp(request)}`, 80, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const auth = await requireAccess(true);
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }
    const resource = parseResource(String(body.resource || "devis"));
    const action = String(body.action || "update");

    if (resource === "acks") {
      const statusFromAction =
        action === "transmit"
          ? "transmis"
          : action === "ack"
            ? "accuse"
            : action === "fail"
              ? "echec"
              : isFinanceAckStatus(body.status)
                ? body.status
                : undefined;
      if (
        statusFromAction &&
        (statusFromAction === "accuse" || statusFromAction === "echec") &&
        !canValidateFinance(auth.session.role) &&
        !canEditFinance(auth.session.role)
      ) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      const item = await updateFinanceAck(
        id,
        {
          documentType: body.documentType as FinanceAckDocType | "",
          documentId: body.documentId as string | undefined,
          documentNumber: body.documentNumber as string | undefined,
          documentLabel: body.documentLabel as string | undefined,
          recipientName: body.recipientName as string | undefined,
          recipientEmail: body.recipientEmail as string | undefined,
          recipientOrg: body.recipientOrg as string | undefined,
          channel: body.channel as FinanceAckChannel | "",
          transmittedAt: body.transmittedAt as string | undefined,
          proofNote: body.proofNote as string | undefined,
          note: body.note as string | undefined,
          status: statusFromAction,
        },
        auth.actor,
      );
      return NextResponse.json({ item, recipe: ackReady(item) });
    }

    if (resource === "prefactures") {
      if (
        action === "validate" &&
        !canValidateFinance(auth.session.role)
      ) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      if (
        action !== "validate" &&
        !canEditFinance(auth.session.role)
      ) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      const status =
        action === "validate"
          ? "validee"
          : action === "control"
            ? "en_controle"
            : action === "invoice"
              ? "facturee"
              : action === "cancel"
                ? "annulee"
                : isPrefactureStatus(body.status)
                  ? body.status
                  : undefined;
      const item = await updateFinancePrefacture(
        id,
        {
          clientName: body.clientName as string | undefined,
          contractRef: body.contractRef as string | undefined,
          site: body.site as string | undefined,
          periodStart: body.periodStart as string | undefined,
          periodEnd: body.periodEnd as string | undefined,
          taxRatePct:
            body.taxRatePct !== undefined
              ? Number(body.taxRatePct)
              : undefined,
          note: body.note as string | undefined,
          lines: Array.isArray(body.lines)
            ? (body.lines as Partial<PrefactureLine>[])
            : undefined,
          status,
        },
        auth.actor,
      );
      return NextResponse.json({ item, recipe: prefactureReady(item) });
    }

    if (resource === "relances") {
      if (!canEditFinance(auth.session.role)) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      const status =
        action === "send"
          ? "envoyee"
          : action === "ignore"
            ? "ignoree"
            : action === "settle"
              ? "soldee"
              : isReminderStatus(body.status)
                ? body.status
                : undefined;
      const item = await updateFinanceReminder(
        id,
        {
          clientName: body.clientName as string | undefined,
          level: body.level as ReminderLevel | "",
          channel: body.channel as ReminderChannel | "",
          subject: body.subject as string | undefined,
          body: body.body as string | undefined,
          note: body.note as string | undefined,
          invoices: Array.isArray(body.invoices)
            ? (body.invoices as Partial<ReminderInvoiceLine>[])
            : undefined,
          status,
          send: action === "send",
        },
        auth.actor,
      );
      return NextResponse.json({ item, recipe: reminderReady(item) });
    }

    const status =
      action === "validate"
        ? "valide"
        : action === "send"
          ? "envoye"
          : action === "pay"
            ? "paye"
            : action === "cancel"
              ? "annule"
              : isFinanceDocStatus(body.status)
                ? (body.status as FinanceDocStatus)
                : undefined;

    if (status) {
      const needsValidate =
        status === "valide" || status === "paye" || status === "annule";
      const canSendAsEditor =
        status === "envoye" && canEditFinance(auth.session.role);
      if (needsValidate && !canValidateFinance(auth.session.role)) {
        return NextResponse.json(
          { error: "Droits insuffisants" },
          { status: 403 },
        );
      }
      if (
        status === "envoye" &&
        !canSendAsEditor &&
        !canValidateFinance(auth.session.role)
      ) {
        return NextResponse.json(
          { error: "Droits insuffisants" },
          { status: 403 },
        );
      }
    }

    const lines = Array.isArray(body.lines)
      ? (body.lines as Partial<FinanceLine>[])
      : undefined;

    if (resource === "factures") {
      if (!canEditFinance(auth.session.role) && action === "update" && !status) {
        return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
      }
      const item = await updateFinanceInvoice(
        id,
        {
          clientName: body.clientName as string | undefined,
          site: body.site as string | undefined,
          contactName: body.contactName as string | undefined,
          contactEmail: body.contactEmail as string | undefined,
          contractRef: body.contractRef as string | undefined,
          periodStart: body.periodStart as string | undefined,
          periodEnd: body.periodEnd as string | undefined,
          issueDate: body.issueDate as string | undefined,
          dueDate: body.dueDate as string | undefined,
          taxRatePct:
            body.taxRatePct !== undefined ? Number(body.taxRatePct) : undefined,
          paymentTerms: body.paymentTerms as string | undefined,
          paymentRefs: body.paymentRefs as string | undefined,
          quoteId: body.quoteId as string | undefined,
          quoteNumber: body.quoteNumber as string | undefined,
          issuer: body.issuer as Partial<NecsIssuer> | undefined,
          note: body.note as string | undefined,
          lines,
          status,
        },
        auth.actor,
      );
      return NextResponse.json({ item, recipe: invoiceReady(item) });
    }

    if (resource === "avoirs") {
      const item = await updateFinanceCreditNote(
        id,
        {
          invoiceId: body.invoiceId as string | undefined,
          invoiceNumber: body.invoiceNumber as string | undefined,
          clientName: body.clientName as string | undefined,
          reason: body.reason as string | undefined,
          issueDate: body.issueDate as string | undefined,
          taxRatePct:
            body.taxRatePct !== undefined ? Number(body.taxRatePct) : undefined,
          note: body.note as string | undefined,
          lines,
          status,
        },
        auth.actor,
      );
      return NextResponse.json({ item, recipe: creditNoteReady(item) });
    }

    const item = await updateFinanceQuote(
      id,
      {
        clientName: body.clientName as string | undefined,
        site: body.site as string | undefined,
        contactName: body.contactName as string | undefined,
        contactEmail: body.contactEmail as string | undefined,
        issueDate: body.issueDate as string | undefined,
        validityDays:
          body.validityDays !== undefined
            ? Number(body.validityDays)
            : undefined,
        periodicity: body.periodicity as FinancePeriodicity | "",
        taxRatePct:
          body.taxRatePct !== undefined ? Number(body.taxRatePct) : undefined,
        paymentTerms: body.paymentTerms as string | undefined,
        conditions: body.conditions as string | undefined,
        note: body.note as string | undefined,
        lines,
        status,
      },
      auth.actor,
    );
    return NextResponse.json({ item, recipe: quoteReady(item) });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Action impossible") },
      { status: 400 },
    );
  }
}
