import type { UserRole } from "@/lib/settings";

/** Statuts du bulletin de paie. */
export type PayslipStatus =
  | "brouillon"
  | "calcule"
  | "valide"
  | "paye"
  | "annule";

export type PayslipLineKind = "gain" | "retenue" | "info";

export type PayslipLine = {
  code: string;
  label: string;
  kind: PayslipLineKind;
  amount: number;
};

export type PayslipHistoryEntry = {
  id: string;
  at: string;
  kind:
    | "created"
    | "updated"
    | "recalculate"
    | "validate"
    | "pay"
    | "cancel"
    | "note";
  note: string;
  byEmail: string;
  byName: string;
  byRole: UserRole | string;
};

export type Payslip = {
  id: string;
  status: PayslipStatus;
  /** Période YYYY-MM */
  period: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeUserId: string;
  matricule: string;
  jobTitle: string;
  site: string;
  cnpsNumber: string;
  /** Salaire de base (XAF) */
  baseSalary: number;
  /** Indemnité de transport (souvent hors cotisation) */
  transportAllowance: number;
  /** Primes imposables (assiduité, rendement…) */
  primes: number;
  overtimeHours: number;
  overtimeAmount: number;
  otherGains: number;
  otherDeductions: number;
  cnpsEmployee: number;
  cnpsEmployer: number;
  irpp: number;
  gross: number;
  net: number;
  lines: PayslipLine[];
  paymentMethod: string;
  paidAt: string | null;
  note: string;
  history: PayslipHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  createdByName: string;
  validatedAt: string | null;
  validatedByEmail: string;
  validatedByName: string;
};

export type PayslipInput = {
  period: string;
  employeeId?: string;
  employeeName: string;
  employeeEmail?: string;
  employeeUserId?: string;
  matricule?: string;
  jobTitle?: string;
  site?: string;
  cnpsNumber?: string;
  baseSalary: number;
  transportAllowance?: number;
  primes?: number;
  overtimeHours?: number;
  overtimeAmount?: number;
  otherGains?: number;
  otherDeductions?: number;
  paymentMethod?: string;
  note?: string;
};

export type PayrollRates = {
  /** Cotisation CNPS salarié (vieillesse) */
  cnpsEmployeeRate: number;
  /** Cotisation CNPS employeur (info bulletin) */
  cnpsEmployerRate: number;
  /** Plafond mensuel assiette CNPS (XAF) */
  cnpsCeiling: number;
  /** Taux horaire OT = base / heuresMensuellesRef * multiplicateur */
  monthlyHoursRef: number;
  overtimeMultiplier: number;
};

/** Taux simplifiés Cameroun — paramètres métier ajustables. */
export const DEFAULT_PAYROLL_RATES: PayrollRates = {
  cnpsEmployeeRate: 0.042,
  cnpsEmployerRate: 0.077,
  cnpsCeiling: 750_000,
  monthlyHoursRef: 173.33,
  overtimeMultiplier: 1.25,
};

export const PAYSLIP_STATUS_LABELS: Record<PayslipStatus, string> = {
  brouillon: "Brouillon",
  calcule: "Calculé",
  valide: "Validé",
  paye: "Payé",
  annule: "Annulé",
};

export const PAYSLIP_STATUSES = Object.keys(
  PAYSLIP_STATUS_LABELS,
) as PayslipStatus[];

export const PAYMENT_METHODS = [
  "Virement bancaire",
  "Mobile Money",
  "Espèces",
  "Chèque",
] as const;

export function canAccessPayroll(role: UserRole | string): boolean {
  return (
    role === "admin" ||
    role === "rh" ||
    role === "manager" ||
    role === "finance" ||
    role === "nettoyeur"
  );
}

export function canManagePayroll(role: UserRole | string): boolean {
  return role === "admin" || role === "rh" || role === "finance";
}

export function canValidatePayroll(role: UserRole | string): boolean {
  return role === "admin" || role === "rh" || role === "finance";
}

export function isPayslipStatus(value: unknown): value is PayslipStatus {
  return (
    typeof value === "string" &&
    PAYSLIP_STATUSES.includes(value as PayslipStatus)
  );
}

export function formatXaf(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

export function currentPayrollPeriod(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

export function periodLabel(period: string): string {
  if (!isValidPeriod(period)) return period || "—";
  const [y, m] = period.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function roundXaf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/**
 * IRPP mensuel simplifié (barème progressif indicatif Cameroun).
 * Base = gains imposables − CNPS salarié − abattement forfaitaire 20 %.
 */
export function computeIrpp(taxableBase: number): number {
  const base = Math.max(0, taxableBase);
  const abatement = Math.min(base * 0.2, 500_000);
  let remaining = Math.max(0, base - abatement);
  const brackets: Array<{ upTo: number; rate: number }> = [
    { upTo: 166_667, rate: 0.1 },
    { upTo: 500_000, rate: 0.15 },
    { upTo: 833_333, rate: 0.25 },
    { upTo: 1_250_000, rate: 0.3 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.35 },
  ];
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    const slice = Math.min(remaining, b.upTo - prev);
    if (slice <= 0) break;
    tax += slice * b.rate;
    remaining -= slice;
    prev = b.upTo;
  }
  return roundXaf(tax);
}

export type PayrollComputationInput = {
  baseSalary: number;
  transportAllowance: number;
  primes: number;
  overtimeHours: number;
  overtimeAmount?: number;
  otherGains: number;
  otherDeductions: number;
  rates?: PayrollRates;
};

export type PayrollComputation = {
  baseSalary: number;
  transportAllowance: number;
  primes: number;
  overtimeHours: number;
  overtimeAmount: number;
  otherGains: number;
  otherDeductions: number;
  cnpsEmployee: number;
  cnpsEmployer: number;
  irpp: number;
  gross: number;
  net: number;
  lines: PayslipLine[];
};

/** Calcule brut, cotisations CNPS, IRPP et net à payer. */
export function computePayslip(
  input: PayrollComputationInput,
): PayrollComputation {
  const rates = input.rates ?? DEFAULT_PAYROLL_RATES;
  const baseSalary = roundXaf(input.baseSalary);
  const transportAllowance = roundXaf(input.transportAllowance);
  const primes = roundXaf(input.primes);
  const overtimeHours = Math.max(0, Number(input.overtimeHours) || 0);
  const hourly =
    rates.monthlyHoursRef > 0 ? baseSalary / rates.monthlyHoursRef : 0;
  const overtimeAmount =
    input.overtimeAmount !== undefined && Number.isFinite(input.overtimeAmount)
      ? roundXaf(input.overtimeAmount)
      : roundXaf(overtimeHours * hourly * rates.overtimeMultiplier);
  const otherGains = roundXaf(input.otherGains);
  const otherDeductions = roundXaf(input.otherDeductions);

  const cnpsAssiette = Math.min(
    rates.cnpsCeiling,
    baseSalary + primes + overtimeAmount,
  );
  const cnpsEmployee = roundXaf(cnpsAssiette * rates.cnpsEmployeeRate);
  const cnpsEmployer = roundXaf(cnpsAssiette * rates.cnpsEmployerRate);

  const gross = roundXaf(
    baseSalary + transportAllowance + primes + overtimeAmount + otherGains,
  );

  const taxableForIrpp = Math.max(
    0,
    baseSalary + primes + overtimeAmount + otherGains - cnpsEmployee,
  );
  const irpp = computeIrpp(taxableForIrpp);

  const net = roundXaf(
    Math.max(0, gross - cnpsEmployee - irpp - otherDeductions),
  );

  const lines: PayslipLine[] = (
    [
      {
        code: "BASE",
        label: "Salaire de base",
        kind: "gain" as const,
        amount: baseSalary,
      },
      {
        code: "TRANS",
        label: "Indemnité de transport",
        kind: "gain" as const,
        amount: transportAllowance,
      },
      {
        code: "PRIME",
        label: "Primes",
        kind: "gain" as const,
        amount: primes,
      },
      {
        code: "HS",
        label: `Heures supp. (${overtimeHours} h)`,
        kind: "gain" as const,
        amount: overtimeAmount,
      },
      {
        code: "AUTRE_G",
        label: "Autres gains",
        kind: "gain" as const,
        amount: otherGains,
      },
      {
        code: "CNPS_S",
        label: `CNPS salarié (${(rates.cnpsEmployeeRate * 100).toFixed(1)} %)`,
        kind: "retenue" as const,
        amount: cnpsEmployee,
      },
      {
        code: "IRPP",
        label: "IRPP",
        kind: "retenue" as const,
        amount: irpp,
      },
      {
        code: "AUTRE_R",
        label: "Autres retenues",
        kind: "retenue" as const,
        amount: otherDeductions,
      },
      {
        code: "CNPS_E",
        label: `CNPS employeur (${(rates.cnpsEmployerRate * 100).toFixed(1)} %)`,
        kind: "info" as const,
        amount: cnpsEmployer,
      },
      {
        code: "BRUT",
        label: "Salaire brut",
        kind: "info" as const,
        amount: gross,
      },
      {
        code: "NET",
        label: "Net à payer",
        kind: "info" as const,
        amount: net,
      },
    ] satisfies PayslipLine[]
  ).filter((l) => l.kind === "info" || l.amount > 0 || l.code === "BASE");

  return {
    baseSalary,
    transportAllowance,
    primes,
    overtimeHours,
    overtimeAmount,
    otherGains,
    otherDeductions,
    cnpsEmployee,
    cnpsEmployer,
    irpp,
    gross,
    net,
    lines,
  };
}
