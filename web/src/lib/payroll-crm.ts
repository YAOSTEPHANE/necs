import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  canManagePayroll,
  canValidatePayroll,
  computePayslip,
  isPayslipStatus,
  isValidPeriod,
  PAYSLIP_STATUSES,
  type Payslip,
  type PayslipHistoryEntry,
  type PayslipInput,
  type PayslipStatus,
} from "@/lib/payroll-shared";

export {
  canAccessPayroll,
  canManagePayroll,
  canValidatePayroll,
  computeIrpp,
  computePayslip,
  currentPayrollPeriod,
  DEFAULT_PAYROLL_RATES,
  formatXaf,
  isPayslipStatus,
  isValidPeriod,
  PAYMENT_METHODS,
  periodLabel,
  PAYSLIP_STATUS_LABELS,
  PAYSLIP_STATUSES,
} from "@/lib/payroll-shared";
export type {
  PayrollComputation,
  Payslip,
  PayslipHistoryEntry,
  PayslipInput,
  PayslipLine,
  PayslipStatus,
} from "@/lib/payroll-shared";

type DbPayslip = Omit<Payslip, "id"> & { _id?: ObjectId };

type Actor = { email: string; name: string; role: UserRole; userId?: string };

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanEmail(value: unknown): string {
  return clean(value, 180).toLowerCase();
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function historyId(): string {
  return `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeHistory(
  partial: Omit<PayslipHistoryEntry, "id" | "at"> & { at?: string },
): PayslipHistoryEntry {
  return {
    id: historyId(),
    at: partial.at || nowIso(),
    kind: partial.kind,
    note: (partial.note || "").trim().slice(0, 800),
    byEmail: partial.byEmail,
    byName: partial.byName,
    byRole: partial.byRole,
  };
}

async function col() {
  const db = await getDb();
  const c = db.collection<DbPayslip>("payslips");
  void Promise.all([
    c.createIndex({ period: 1, employeeEmail: 1 }).catch(() => undefined),
    c.createIndex({ status: 1, updatedAt: -1 }).catch(() => undefined),
    c.createIndex({ period: 1, status: 1 }).catch(() => undefined),
  ]);
  return c;
}

function mapDoc(doc: WithId<DbPayslip> | DbPayslip): Payslip {
  const id =
    doc._id instanceof ObjectId
      ? doc._id.toHexString()
      : String((doc as { _id?: unknown })._id ?? "");
  return {
    id,
    status: isPayslipStatus(doc.status) ? doc.status : "brouillon",
    period: doc.period || "",
    employeeId: doc.employeeId || "",
    employeeName: doc.employeeName || "",
    employeeEmail: doc.employeeEmail || "",
    employeeUserId: doc.employeeUserId || "",
    matricule: doc.matricule || "",
    jobTitle: doc.jobTitle || "",
    site: doc.site || "",
    cnpsNumber: doc.cnpsNumber || "",
    baseSalary: Number(doc.baseSalary || 0),
    transportAllowance: Number(doc.transportAllowance || 0),
    primes: Number(doc.primes || 0),
    overtimeHours: Number(doc.overtimeHours || 0),
    overtimeAmount: Number(doc.overtimeAmount || 0),
    otherGains: Number(doc.otherGains || 0),
    otherDeductions: Number(doc.otherDeductions || 0),
    cnpsEmployee: Number(doc.cnpsEmployee || 0),
    cnpsEmployer: Number(doc.cnpsEmployer || 0),
    irpp: Number(doc.irpp || 0),
    gross: Number(doc.gross || 0),
    net: Number(doc.net || 0),
    lines: Array.isArray(doc.lines) ? doc.lines : [],
    paymentMethod: doc.paymentMethod || "Virement bancaire",
    paidAt: doc.paidAt ?? null,
    note: doc.note || "",
    history: Array.isArray(doc.history) ? doc.history : [],
    createdAt: doc.createdAt || nowIso(),
    updatedAt: doc.updatedAt || nowIso(),
    createdByEmail: doc.createdByEmail || "",
    createdByName: doc.createdByName || "",
    validatedAt: doc.validatedAt ?? null,
    validatedByEmail: doc.validatedByEmail || "",
    validatedByName: doc.validatedByName || "",
  };
}

function canView(doc: Payslip, actor: Actor): boolean {
  if (canManagePayroll(actor.role) || canValidatePayroll(actor.role)) {
    return true;
  }
  const email = actor.email.toLowerCase();
  return (
    doc.employeeEmail === email ||
    (Boolean(actor.userId) && doc.employeeUserId === actor.userId)
  );
}

function buildFromInput(
  input: PayslipInput,
  actor: Actor,
  existing?: Payslip,
): Omit<Payslip, "id"> {
  const period = clean(input.period, 7);
  if (!isValidPeriod(period)) {
    throw new Error("Période invalide (format YYYY-MM)");
  }
  const employeeName = clean(input.employeeName, 120);
  if (!employeeName) throw new Error("Nom de l’employé requis");

  const baseSalary = num(input.baseSalary);
  if (baseSalary <= 0) throw new Error("Salaire de base requis");

  const calc = computePayslip({
    baseSalary,
    transportAllowance: num(input.transportAllowance),
    primes: num(input.primes),
    overtimeHours: num(input.overtimeHours),
    overtimeAmount:
      input.overtimeAmount !== undefined
        ? num(input.overtimeAmount)
        : undefined,
    otherGains: num(input.otherGains),
    otherDeductions: num(input.otherDeductions),
  });

  const now = nowIso();
  return {
    status: existing?.status === "annule" ? "brouillon" : existing?.status || "calcule",
    period,
    employeeId: clean(input.employeeId, 80) || existing?.employeeId || "",
    employeeName,
    employeeEmail: cleanEmail(input.employeeEmail) || existing?.employeeEmail || "",
    employeeUserId:
      clean(input.employeeUserId, 80) || existing?.employeeUserId || "",
    matricule: clean(input.matricule, 40) || existing?.matricule || "",
    jobTitle: clean(input.jobTitle, 120) || existing?.jobTitle || "",
    site: clean(input.site, 120) || existing?.site || "",
    cnpsNumber: clean(input.cnpsNumber, 40) || existing?.cnpsNumber || "",
    ...calc,
    paymentMethod:
      clean(input.paymentMethod, 60) ||
      existing?.paymentMethod ||
      "Virement bancaire",
    paidAt: existing?.paidAt ?? null,
    note: clean(input.note, 2000) || existing?.note || "",
    history: existing?.history ?? [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    createdByEmail: existing?.createdByEmail || actor.email,
    createdByName: existing?.createdByName || actor.name,
    validatedAt: existing?.validatedAt ?? null,
    validatedByEmail: existing?.validatedByEmail || "",
    validatedByName: existing?.validatedByName || "",
  };
}

export async function listPayslips(actor: Actor, period?: string) {
  const c = await col();
  const filter: Record<string, unknown> = {};
  if (period && isValidPeriod(period)) filter.period = period;

  const rows = await c.find(filter).sort({ period: -1, employeeName: 1 }).toArray();
  return rows.map(mapDoc).filter((d) => canView(d, actor));
}

export async function getPayslip(id: string, actor: Actor) {
  if (!ObjectId.isValid(id)) return null;
  const c = await col();
  const doc = await c.findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  const mapped = mapDoc(doc);
  return canView(mapped, actor) ? mapped : null;
}

export async function createPayslip(input: PayslipInput, actor: Actor) {
  if (!canManagePayroll(actor.role)) {
    throw new Error("Droits insuffisants pour créer un bulletin");
  }
  const built = buildFromInput(input, actor);
  built.status = "calcule";
  built.history = [
    makeHistory({
      kind: "created",
      note: `Bulletin ${built.period} créé`,
      byEmail: actor.email,
      byName: actor.name,
      byRole: actor.role,
    }),
  ];

  const c = await col();
  if (built.employeeEmail) {
    const dup = await c.findOne({
      period: built.period,
      employeeEmail: built.employeeEmail,
      status: { $ne: "annule" },
    });
    if (dup) {
      throw new Error(
        `Un bulletin existe déjà pour ${built.employeeName} sur ${built.period}`,
      );
    }
  }

  const result = await c.insertOne(built);
  return mapDoc({ ...built, _id: result.insertedId });
}

export async function updatePayslip(
  id: string,
  input: Partial<PayslipInput>,
  actor: Actor,
) {
  if (!canManagePayroll(actor.role)) {
    throw new Error("Droits insuffisants");
  }
  const existing = await getPayslip(id, actor);
  if (!existing) throw new Error("Bulletin introuvable");
  if (existing.status === "paye" || existing.status === "annule") {
    throw new Error("Bulletin verrouillé (payé ou annulé)");
  }
  if (existing.status === "valide") {
    throw new Error("Bulletin validé : annulez-le avant modification");
  }

  const merged: PayslipInput = {
    period: input.period ?? existing.period,
    employeeId: input.employeeId ?? existing.employeeId,
    employeeName: input.employeeName ?? existing.employeeName,
    employeeEmail: input.employeeEmail ?? existing.employeeEmail,
    employeeUserId: input.employeeUserId ?? existing.employeeUserId,
    matricule: input.matricule ?? existing.matricule,
    jobTitle: input.jobTitle ?? existing.jobTitle,
    site: input.site ?? existing.site,
    cnpsNumber: input.cnpsNumber ?? existing.cnpsNumber,
    baseSalary: input.baseSalary ?? existing.baseSalary,
    transportAllowance: input.transportAllowance ?? existing.transportAllowance,
    primes: input.primes ?? existing.primes,
    overtimeHours: input.overtimeHours ?? existing.overtimeHours,
    overtimeAmount: input.overtimeAmount ?? existing.overtimeAmount,
    otherGains: input.otherGains ?? existing.otherGains,
    otherDeductions: input.otherDeductions ?? existing.otherDeductions,
    paymentMethod: input.paymentMethod ?? existing.paymentMethod,
    note: input.note ?? existing.note,
  };

  const built = buildFromInput(merged, actor, existing);
  built.status = "calcule";
  built.history = [
    ...existing.history,
    makeHistory({
      kind: "recalculate",
      note: "Bulletin recalculé",
      byEmail: actor.email,
      byName: actor.name,
      byRole: actor.role,
    }),
  ];

  const c = await col();
  const updated = await c.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...built,
        updatedAt: nowIso(),
      },
    },
    { returnDocument: "after" },
  );
  return updated ? mapDoc(updated) : null;
}

export async function validatePayslip(id: string, actor: Actor) {
  if (!canValidatePayroll(actor.role)) {
    throw new Error("Droits insuffisants pour valider");
  }
  const existing = await getPayslip(id, actor);
  if (!existing) throw new Error("Bulletin introuvable");
  if (existing.status !== "calcule" && existing.status !== "brouillon") {
    throw new Error("Seuls les bulletins calculés peuvent être validés");
  }
  const now = nowIso();
  const c = await col();
  const updated = await c.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "valide" satisfies PayslipStatus,
        validatedAt: now,
        validatedByEmail: actor.email,
        validatedByName: actor.name,
        updatedAt: now,
      },
      $push: {
        history: makeHistory({
          kind: "validate",
          note: "Bulletin validé",
          byEmail: actor.email,
          byName: actor.name,
          byRole: actor.role,
        }),
      },
    },
    { returnDocument: "after" },
  );
  return updated ? mapDoc(updated) : null;
}

export async function markPayslipPaid(
  id: string,
  actor: Actor,
  paymentMethod?: string,
) {
  if (!canValidatePayroll(actor.role)) {
    throw new Error("Droits insuffisants pour marquer payé");
  }
  const existing = await getPayslip(id, actor);
  if (!existing) throw new Error("Bulletin introuvable");
  if (existing.status !== "valide") {
    throw new Error("Validez le bulletin avant paiement");
  }
  const now = nowIso();
  const method = clean(paymentMethod, 60) || existing.paymentMethod;
  const c = await col();
  const updated = await c.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "paye" satisfies PayslipStatus,
        paymentMethod: method,
        paidAt: now,
        updatedAt: now,
      },
      $push: {
        history: makeHistory({
          kind: "pay",
          note: `Payé · ${method}`,
          byEmail: actor.email,
          byName: actor.name,
          byRole: actor.role,
        }),
      },
    },
    { returnDocument: "after" },
  );
  return updated ? mapDoc(updated) : null;
}

export async function cancelPayslip(id: string, actor: Actor, note = "") {
  if (!canManagePayroll(actor.role)) {
    throw new Error("Droits insuffisants");
  }
  const existing = await getPayslip(id, actor);
  if (!existing) throw new Error("Bulletin introuvable");
  if (existing.status === "paye") {
    throw new Error("Un bulletin payé ne peut pas être annulé");
  }
  const c = await col();
  const updated = await c.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "annule" satisfies PayslipStatus,
        updatedAt: nowIso(),
      },
      $push: {
        history: makeHistory({
          kind: "cancel",
          note: note || "Bulletin annulé",
          byEmail: actor.email,
          byName: actor.name,
          byRole: actor.role,
        }),
      },
    },
    { returnDocument: "after" },
  );
  return updated ? mapDoc(updated) : null;
}

export async function payrollPeriodSummary(actor: Actor, period: string) {
  const items = await listPayslips(actor, period);
  const active = items.filter((i) => i.status !== "annule");
  return {
    period,
    count: active.length,
    grossTotal: active.reduce((s, i) => s + i.gross, 0),
    netTotal: active.reduce((s, i) => s + i.net, 0),
    cnpsEmployeeTotal: active.reduce((s, i) => s + i.cnpsEmployee, 0),
    cnpsEmployerTotal: active.reduce((s, i) => s + i.cnpsEmployer, 0),
    irppTotal: active.reduce((s, i) => s + i.irpp, 0),
    byStatus: PAYSLIP_STATUSES.reduce(
      (acc, st) => {
        acc[st] = items.filter((i) => i.status === st).length;
        return acc;
      },
      {} as Record<PayslipStatus, number>,
    ),
  };
}
