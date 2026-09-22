import type { UserRole } from "@/lib/settings";
import type {
  NeedFrequency,
  PrestationKind,
  ServiceLevel,
} from "@/lib/need-qualification-shared";
import {
  PRESTATION_LABELS,
  SERVICE_LEVEL_LABELS,
} from "@/lib/need-qualification-shared";

export type QuoteStatus =
  | "brouillon"
  | "en_validation"
  | "valide"
  | "refuse"
  | "envoye";

export type QuoteLineKind =
  | "surface"
  | "effectif"
  | "consommables"
  | "forfait"
  | "autre";

export type QuoteLine = {
  id: string;
  label: string;
  kind: QuoteLineKind;
  quantity: number;
  unit: string;
  unitPrice: number;
  /** Toujours quantity × unitPrice (montant reconstituable). */
  amount: number;
};

export type QuoteTotals = {
  subtotal: number;
  overheadPct: number;
  overheadAmount: number;
  marginPct: number;
  marginAmount: number;
  totalHT: number;
};

export type QuoteVersion = {
  version: number;
  at: string;
  by: string;
  byName: string;
  reason: string;
  lines: QuoteLine[];
  totals: QuoteTotals;
  frequency: NeedFrequency | "";
  prestation: PrestationKind | "";
  staffCount: number;
  surfaceM2: number;
  hoursPerVisit: number;
  monthlyVisits: number;
  serviceLevel: ServiceLevel | "";
  note: string;
};

export type QuoteTariffs = {
  ratePerM2: number;
  hourlyRate: number;
  consumablePerM2: number;
  overheadPct: number;
  marginPct: number;
  hoursPerVisitDefault: number;
  /** Seuil max validable par commercial (FCFA HT). */
  thresholdCommercial: number;
  /** Seuil max validable par finance ; au-delà = direction/admin. */
  thresholdFinance: number;
};

export type Quote = {
  id: string;
  prospectId: string;
  opportunityId: string;
  visitId: string;
  company: string;
  title: string;
  status: QuoteStatus;
  /** Type de prestation (bureaux, médical…) — pondère les tarifs. */
  prestation: PrestationKind | "";
  frequency: NeedFrequency | "";
  serviceLevel: ServiceLevel | "";
  staffCount: number;
  surfaceM2: number;
  hoursPerVisit: number;
  monthlyVisits: number;
  lines: QuoteLine[];
  totals: QuoteTotals;
  currentVersion: number;
  versions: QuoteVersion[];
  note: string;
  history: Array<{
    id: string;
    at: string;
    by: string;
    byName: string;
    detail: string;
  }>;
  submittedAt: string | null;
  validatedAt: string | null;
  validatedBy: string;
  validatedByName: string;
  rejectedAt: string | null;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  brouillon: "Brouillon",
  en_validation: "En validation",
  valide: "Validé",
  refuse: "Refusé",
  envoye: "Envoyé client",
};

export const QUOTE_LINE_KIND_LABELS: Record<QuoteLineKind, string> = {
  surface: "Surface",
  effectif: "Effectif / main-d’œuvre",
  consommables: "Consommables",
  forfait: "Forfait",
  autre: "Autre",
};

/** Visites / mois selon fréquence (base chiffrage mensuel). */
export const MONTHLY_VISITS_BY_FREQUENCY: Record<NeedFrequency, number> = {
  quotidienne: 26,
  "5j_semaine": 22,
  "3j_semaine": 13,
  "2j_semaine": 9,
  hebdomadaire: 4,
  bi_mensuelle: 2,
  mensuelle: 1,
  ponctuelle: 1,
};

/**
 * Coeff. coût selon la prestation (complexité / EPI / protocoles).
 * Appliqué aux tarifs surface et consommables.
 */
export const PRESTATION_COST_COEFF: Record<PrestationKind, number> = {
  bureaux: 1,
  commerces: 1.05,
  industriel: 1.25,
  medical: 1.45,
  residentiel: 0.95,
  copropriete: 1.1,
  evenementiel: 1.2,
  autre: 1,
};

/** Coeff. main-d’œuvre selon le niveau de service. */
export const SERVICE_LEVEL_LABOR_COEFF: Record<ServiceLevel, number> = {
  essentiel: 0.9,
  standard: 1,
  renforce: 1.15,
  premium: 1.35,
};

export const DEFAULT_QUOTE_TARIFFS: QuoteTariffs = {
  ratePerM2: 150,
  hourlyRate: 2500,
  consumablePerM2: 25,
  overheadPct: 12,
  marginPct: 18,
  hoursPerVisitDefault: 4,
  thresholdCommercial: 500_000,
  thresholdFinance: 2_000_000,
};

export const QUOTE_STATUSES = Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[];

export function canAccessQuotes(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "finance" ||
    role === "manager"
  );
}

export function canEditQuotes(role: UserRole): boolean {
  return role === "admin" || role === "commercial";
}

export function canValidateQuotes(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "finance" ||
    role === "manager"
  );
}

export function isQuoteStatus(v: unknown): v is QuoteStatus {
  return typeof v === "string" && QUOTE_STATUSES.includes(v as QuoteStatus);
}

export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function lineAmount(quantity: number, unitPrice: number): number {
  return roundMoney(Math.max(0, quantity) * Math.max(0, unitPrice));
}

export function makeLine(
  partial: Omit<QuoteLine, "amount" | "id"> & { id?: string },
): QuoteLine {
  const quantity = Math.max(0, Number(partial.quantity) || 0);
  const unitPrice = Math.max(0, Number(partial.unitPrice) || 0);
  return {
    id:
      partial.id ||
      `QL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    label: partial.label,
    kind: partial.kind,
    quantity,
    unit: partial.unit,
    unitPrice,
    amount: lineAmount(quantity, unitPrice),
  };
}

export function computeTotals(
  lines: QuoteLine[],
  overheadPct: number,
  marginPct: number,
): QuoteTotals {
  const subtotal = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
  const oh = Math.max(0, Number(overheadPct) || 0);
  const mg = Math.max(0, Number(marginPct) || 0);
  const overheadAmount = roundMoney(subtotal * (oh / 100));
  const base = subtotal + overheadAmount;
  const marginAmount = roundMoney(base * (mg / 100));
  return {
    subtotal,
    overheadPct: oh,
    overheadAmount,
    marginPct: mg,
    marginAmount,
    totalHT: roundMoney(base + marginAmount),
  };
}

/** Vérifie que chaque ligne est reconstituable (qty × prix = montant). */
export function assertReconstitutable(lines: QuoteLine[]): string[] {
  const errors: string[] = [];
  for (const line of lines) {
    const expected = lineAmount(line.quantity, line.unitPrice);
    if (Math.abs(expected - line.amount) > 0.01) {
      errors.push(
        `${line.label}: montant ${line.amount} ≠ ${line.quantity} × ${line.unitPrice}`,
      );
    }
  }
  return errors;
}

export function monthlyVisitsFor(frequency: NeedFrequency | ""): number {
  if (!frequency) return 1;
  return MONTHLY_VISITS_BY_FREQUENCY[frequency] ?? 1;
}

export function prestationCostCoeff(prestation: PrestationKind | ""): number {
  if (!prestation) return 1;
  return PRESTATION_COST_COEFF[prestation] ?? 1;
}

export function serviceLaborCoeff(level: ServiceLevel | ""): number {
  if (!level) return 1;
  return SERVICE_LEVEL_LABOR_COEFF[level] ?? 1;
}

/**
 * Calcule les lignes d’offre à partir de :
 * prestation · surface · effectifs · fréquence · niveau de service · tarifs.
 * Chaque montant = quantité × prix unitaire (reconstituable).
 */
export function buildDefaultLines(input: {
  surfaceM2: number;
  staffCount: number;
  hoursPerVisit: number;
  monthlyVisits: number;
  tariffs: QuoteTariffs;
  prestation?: PrestationKind | "";
  serviceLevel?: ServiceLevel | "";
}): QuoteLine[] {
  const visits = Math.max(1, input.monthlyVisits);
  const surface = Math.max(0, input.surfaceM2);
  const staff = Math.max(0, input.staffCount);
  const hours = Math.max(0, input.hoursPerVisit);
  const pCoeff = prestationCostCoeff(input.prestation || "");
  const lCoeff = serviceLaborCoeff(input.serviceLevel || "");
  const prestLabel = input.prestation
    ? PRESTATION_LABELS[input.prestation]
    : "Nettoyage";
  const slaLabel = input.serviceLevel
    ? SERVICE_LEVEL_LABELS[input.serviceLevel]
    : "standard";

  const rateM2 = roundMoney(input.tariffs.ratePerM2 * pCoeff);
  const rateHour = roundMoney(input.tariffs.hourlyRate * lCoeff);
  const rateConsumable = roundMoney(input.tariffs.consumablePerM2 * pCoeff);

  const lines: QuoteLine[] = [
    makeLine({
      label: `${prestLabel} — surface (${surface} m² × ${visits} passages · coeff. ${pCoeff})`,
      kind: "surface",
      quantity: surface * visits,
      unit: "m²·passage",
      unitPrice: rateM2,
    }),
    makeLine({
      label: `Main-d’œuvre ${slaLabel} (${staff} agents × ${hours} h × ${visits} passages · coeff. ${lCoeff})`,
      kind: "effectif",
      quantity: staff * hours * visits,
      unit: "h",
      unitPrice: rateHour,
    }),
    makeLine({
      label: `Consommables / coûts variables (${surface} m² × ${visits} passages)`,
      kind: "consommables",
      quantity: surface * visits,
      unit: "m²·passage",
      unitPrice: rateConsumable,
    }),
  ];

  // Forfait protocole pour prestations à risque (EPI, désinfection, consignes).
  if (
    input.prestation === "medical" ||
    input.prestation === "industriel" ||
    input.prestation === "evenementiel"
  ) {
    const forfaitBase =
      input.prestation === "medical"
        ? 85_000
        : input.prestation === "industriel"
          ? 55_000
          : 40_000;
    lines.push(
      makeLine({
        label: `Forfait protocole ${prestLabel} (mensuel)`,
        kind: "forfait",
        quantity: 1,
        unit: "forfait",
        unitPrice: forfaitBase,
      }),
    );
  }

  return lines;
}

/** Qui peut valider selon le montant et les seuils. */
export function requiredValidatorRole(
  totalHT: number,
  tariffs: QuoteTariffs,
): "commercial" | "finance" | "direction" {
  if (totalHT <= tariffs.thresholdCommercial) return "commercial";
  if (totalHT <= tariffs.thresholdFinance) return "finance";
  return "direction";
}

export function roleCanValidateAmount(
  role: UserRole,
  totalHT: number,
  tariffs: QuoteTariffs,
): boolean {
  if (role === "admin" || role === "manager") return true;
  const required = requiredValidatorRole(totalHT, tariffs);
  if (required === "commercial") {
    return role === "commercial" || role === "finance";
  }
  if (required === "finance") {
    return role === "finance";
  }
  // direction: seuls admin / manager (déjà couverts ci-dessus)
  return false;
}

export function formatFcfa(n: number): string {
  return `${roundMoney(n).toLocaleString("fr-FR")} FCFA`;
}
