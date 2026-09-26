import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  canAccessPayroll,
  canManagePayroll,
  canValidatePayroll,
  cancelPayslip,
  createPayslip,
  currentPayrollPeriod,
  getPayslip,
  isValidPeriod,
  listPayslips,
  markPayslipPaid,
  payrollPeriodSummary,
  updatePayslip,
  validatePayslip,
} from "@/lib/payroll-crm";
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
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour la paie.",
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
  if (!canAccessPayroll(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé RH / finance / manager / agent concerné" },
        { status: 403 },
      ),
    };
  }
  return {
    session,
    actor: {
      email: session.email,
      name: session.name,
      role: session.role,
      userId: session.userId,
    },
  };
}

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { session, actor } = auth;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const period =
    url.searchParams.get("period") || currentPayrollPeriod();
  const summary = url.searchParams.get("summary") === "1";

  if (id) {
    const item = await getPayslip(id, actor);
    if (!item) {
      return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      item,
      canManage: canManagePayroll(session.role),
      canValidate: canValidatePayroll(session.role),
      role: session.role,
    });
  }

  if (summary) {
    if (!isValidPeriod(period)) {
      return NextResponse.json({ error: "Période invalide" }, { status: 400 });
    }
    const data = await payrollPeriodSummary(actor, period);
    return NextResponse.json({
      summary: data,
      canManage: canManagePayroll(session.role),
      canValidate: canValidatePayroll(session.role),
    });
  }

  const items = await listPayslips(
    actor,
    isValidPeriod(period) ? period : undefined,
  );
  return NextResponse.json({
    items,
    period: isValidPeriod(period) ? period : currentPayrollPeriod(),
    canManage: canManagePayroll(session.role),
    canValidate: canValidatePayroll(session.role),
    role: session.role,
    email: session.email,
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
  const { actor } = auth;

  const ip = clientIp(request);
  const rl = rateLimit(`payroll:post:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const item = await createPayslip(
      {
        period: String(body.period ?? ""),
        employeeId: String(body.employeeId ?? ""),
        employeeName: String(body.employeeName ?? ""),
        employeeEmail: String(body.employeeEmail ?? ""),
        employeeUserId: String(body.employeeUserId ?? ""),
        matricule: String(body.matricule ?? ""),
        jobTitle: String(body.jobTitle ?? ""),
        site: String(body.site ?? ""),
        cnpsNumber: String(body.cnpsNumber ?? ""),
        baseSalary: Number(body.baseSalary ?? 0),
        transportAllowance: Number(body.transportAllowance ?? 0),
        primes: Number(body.primes ?? 0),
        overtimeHours: Number(body.overtimeHours ?? 0),
        overtimeAmount:
          body.overtimeAmount !== undefined
            ? Number(body.overtimeAmount)
            : undefined,
        otherGains: Number(body.otherGains ?? 0),
        otherDeductions: Number(body.otherDeductions ?? 0),
        paymentMethod: String(body.paymentMethod ?? ""),
        note: String(body.note ?? ""),
      },
      actor,
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
  const { actor } = auth;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    const action = String(body.action ?? "update").trim();
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    let item;
    switch (action) {
      case "validate":
        item = await validatePayslip(id, actor);
        break;
      case "pay":
        item = await markPayslipPaid(
          id,
          actor,
          String(body.paymentMethod ?? ""),
        );
        break;
      case "cancel":
        item = await cancelPayslip(id, actor, String(body.note ?? ""));
        break;
      case "update":
      case "recalculate":
        item = await updatePayslip(
          id,
          {
            period:
              body.period !== undefined ? String(body.period) : undefined,
            employeeId:
              body.employeeId !== undefined
                ? String(body.employeeId)
                : undefined,
            employeeName:
              body.employeeName !== undefined
                ? String(body.employeeName)
                : undefined,
            employeeEmail:
              body.employeeEmail !== undefined
                ? String(body.employeeEmail)
                : undefined,
            employeeUserId:
              body.employeeUserId !== undefined
                ? String(body.employeeUserId)
                : undefined,
            matricule:
              body.matricule !== undefined
                ? String(body.matricule)
                : undefined,
            jobTitle:
              body.jobTitle !== undefined ? String(body.jobTitle) : undefined,
            site: body.site !== undefined ? String(body.site) : undefined,
            cnpsNumber:
              body.cnpsNumber !== undefined
                ? String(body.cnpsNumber)
                : undefined,
            baseSalary:
              body.baseSalary !== undefined
                ? Number(body.baseSalary)
                : undefined,
            transportAllowance:
              body.transportAllowance !== undefined
                ? Number(body.transportAllowance)
                : undefined,
            primes:
              body.primes !== undefined ? Number(body.primes) : undefined,
            overtimeHours:
              body.overtimeHours !== undefined
                ? Number(body.overtimeHours)
                : undefined,
            overtimeAmount:
              body.overtimeAmount !== undefined
                ? Number(body.overtimeAmount)
                : undefined,
            otherGains:
              body.otherGains !== undefined
                ? Number(body.otherGains)
                : undefined,
            otherDeductions:
              body.otherDeductions !== undefined
                ? Number(body.otherDeductions)
                : undefined,
            paymentMethod:
              body.paymentMethod !== undefined
                ? String(body.paymentMethod)
                : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
          },
          actor,
        );
        break;
      default:
        return NextResponse.json(
          { error: `Action inconnue: ${action}` },
          { status: 400 },
        );
    }

    if (!item) {
      return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Action impossible") },
      { status: 400 },
    );
  }
}
