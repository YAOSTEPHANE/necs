import type { UserRole } from "@/lib/settings";
import type {
  NeedFrequency,
  ServiceLevel,
} from "@/lib/need-qualification-shared";

export type ContractStatus =
  | "brouillon"
  | "en_revue"
  | "actif"
  | "suspendu"
  | "resilie"
  | "expire";

export type ContractSla = "standard" | "premium" | "critique";

export type ContractRenewal = "tacite" | "express" | "sans";

export type ContractTariffPeriod = "mensuel" | "forfait" | "annuel";

export type ContractMilestoneKind =
  | "facture"
  | "renouvellement"
  | "revision"
  | "autre";

export type ContractSignatureRole = "client" | "necs";

export type ContractSite = {
  id: string;
  name: string;
  address: string;
  city: string;
  surfaceM2: number | null;
  active: boolean;
  consignes: string;
};

export type ContractTariffLine = {
  id: string;
  label: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  period: ContractTariffPeriod;
};

export type ContractPrestationLine = {
  id: string;
  label: string;
  frequency: string;
  staffAssigned: number;
  siteName: string;
};

export type ContractMilestone = {
  id: string;
  label: string;
  dueAt: string;
  kind: ContractMilestoneKind;
  done: boolean;
  doneAt: string | null;
};

export type ContractSignature = {
  role: ContractSignatureRole;
  name: string;
  title: string;
  signedAt: string | null;
  signed: boolean;
};

/** Snapshot figé des sources CRM (recette : sans ressaisie). */
export type ContractSourceSnapshot = {
  opportunityId: string;
  opportunityTitle: string;
  opportunityValue: number;
  quoteId: string;
  quoteVersion: number;
  quoteTotalHT: number;
  visitId: string;
  prospectId: string;
  company: string;
  contactName: string;
  contactEmail: string;
  siteAddress: string;
  surfaceM2: number | null;
  frequency: NeedFrequency | "";
  serviceLevel: ServiceLevel | "";
  staffCount: number;
  capturedAt: string;
};

export type ContractAmendmentModType =
  | "perimetre"
  | "tarif"
  | "duree"
  | "effectifs"
  | "prestations"
  | "mixte";

export type ContractAmendmentSnapshot = {
  monthlyAmount: number;
  sla: ContractSla;
  endAt: string | null;
  durationMonths: number;
  staffCount: number;
  perimeter: string;
  sites: ContractSite[];
  tariffs: ContractTariffLine[];
  prestations: ContractPrestationLine[];
};

export type ContractAmendment = {
  id: string;
  number: number;
  /** Référence du contrat initial (ex. NECS-CTR-2026-0034). */
  contractRef: string;
  at: string;
  by: string;
  byName: string;
  reason: string;
  effectiveAt: string;
  modificationType: ContractAmendmentModType;
  impactFinancial: number;
  changes: string;
  /** État du contrat avant application de l’avenant. */
  snapshot: ContractAmendmentSnapshot;
};

export type Contract = {
  id: string;
  ref: string;
  opportunityId: string;
  quoteId: string;
  prospectId: string;
  visitId: string;
  /** BC / devis de référence (TMP-03 / TMP-02). */
  bcRef: string;
  /** Version documentaire (ex. 1.0). */
  contractVersion: string;
  signaturePlace: string;
  indexation: string;
  deposit: string;
  penalties: string;
  company: string;
  contactName: string;
  contactEmail: string;
  /** Parties */
  clientRccm: string;
  clientRepName: string;
  clientRepTitle: string;
  necsRepName: string;
  necsRepTitle: string;
  /** Objet & clauses */
  object: string;
  perimeter: string;
  obligations: string;
  pricingTerms: string;
  billingTerms: string;
  terminationTerms: string;
  status: ContractStatus;
  sla: ContractSla;
  startAt: string;
  endAt: string | null;
  durationMonths: number;
  renewal: ContractRenewal;
  frequency: NeedFrequency | "";
  serviceLevel: ServiceLevel | "";
  staffCount: number;
  sites: ContractSite[];
  tariffs: ContractTariffLine[];
  prestations: ContractPrestationLine[];
  monthlyAmount: number;
  milestones: ContractMilestone[];
  amendments: ContractAmendment[];
  signatures: ContractSignature[];
  signedAt: string | null;
  sourceSnapshot: ContractSourceSnapshot;
  note: string;
  history: Array<{
    id: string;
    at: string;
    by: string;
    byName: string;
    detail: string;
  }>;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  brouillon: "Brouillon",
  en_revue: "En revue juridique",
  actif: "Actif",
  suspendu: "Suspendu",
  resilie: "Résilié",
  expire: "Expiré",
};

export const DEFAULT_CONTRACT_VERSION = "1.0";
export const DEFAULT_SIGNATURE_PLACE = "Douala";
export const DEFAULT_CONTRACT_INDEXATION = "Selon IPC / avenant";
export const DEFAULT_CONTRACT_DEPOSIT = "Néant";
export const DEFAULT_CONTRACT_PENALTIES =
  "Pénalités / bonus qualité selon SLA et avenants.";

export const CONTRACT_SLA_LABELS: Record<ContractSla, string> = {
  standard: "Standard",
  premium: "Premium",
  critique: "Critique",
};

export const CONTRACT_RENEWAL_LABELS: Record<ContractRenewal, string> = {
  tacite: "Tacite",
  express: "Express",
  sans: "Sans",
};

export const CONTRACT_SIGNATURE_ROLE_LABELS: Record<
  ContractSignatureRole,
  string
> = {
  client: "Client",
  necs: "NECS",
};

export const CONTRACT_AMENDMENT_MOD_LABELS: Record<
  ContractAmendmentModType,
  string
> = {
  perimetre: "Périmètre",
  tarif: "Tarif",
  duree: "Durée",
  effectifs: "Effectifs",
  prestations: "Prestations",
  mixte: "Mixte",
};

export const CONTRACT_AMENDMENT_MOD_TYPES = Object.keys(
  CONTRACT_AMENDMENT_MOD_LABELS,
) as ContractAmendmentModType[];

export function isContractAmendmentModType(
  v: unknown,
): v is ContractAmendmentModType {
  return (
    typeof v === "string" &&
    CONTRACT_AMENDMENT_MOD_TYPES.includes(v as ContractAmendmentModType)
  );
}

export const DEFAULT_CONTRACT_OBJECT =
  "Prestation de services de nettoyage et d’entretien des locaux désignés.";

export const DEFAULT_CONTRACT_OBLIGATIONS =
  "NECS s’engage à exécuter les prestations selon le SLA convenu. Le client met à disposition les accès, consignes et moyens nécessaires sur site.";

export const DEFAULT_CONTRACT_BILLING =
  "Facturation mensuelle à 30 jours fin de mois, sur présentation de facture. Pénalités de retard applicables.";

export const DEFAULT_CONTRACT_TERMINATION =
  "Résiliation possible par l’une des parties moyennant préavis de 30 jours par lettre recommandée, sauf manquement grave.";

export const DEFAULT_NECS_REP_NAME = "Direction Générale";
export const DEFAULT_NECS_REP_TITLE = "Représentant dûment habilité";

export const CONTRACT_STATUSES = Object.keys(
  CONTRACT_STATUS_LABELS,
) as ContractStatus[];

export const CONTRACT_SLAS = Object.keys(CONTRACT_SLA_LABELS) as ContractSla[];

export function defaultContractSignatures(
  clientRep = "",
  necsRep = DEFAULT_NECS_REP_NAME,
): ContractSignature[] {
  return [
    {
      role: "client",
      name: clientRep,
      title: "Représentant client",
      signedAt: null,
      signed: false,
    },
    {
      role: "necs",
      name: necsRep,
      title: DEFAULT_NECS_REP_TITLE,
      signedAt: null,
      signed: false,
    },
  ];
}

export function makePrestationLine(
  partial: Partial<ContractPrestationLine> & { label: string },
): ContractPrestationLine {
  return {
    id:
      partial.id ||
      `PR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    label: String(partial.label || "Prestation").trim().slice(0, 240),
    frequency: String(partial.frequency || "").trim().slice(0, 80),
    staffAssigned: Math.max(0, Number(partial.staffAssigned) || 0),
    siteName: String(partial.siteName || "").trim().slice(0, 160),
  };
}

export function serviceContractReady(c: Contract): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!c.company.trim()) missing.push("Partie client");
  if (!c.object.trim()) missing.push("Objet");
  if (!c.perimeter.trim() && c.sites.length === 0) missing.push("Périmètre / sites");
  if (!c.sites.length && !c.prestations.length) missing.push("Sites / prestations");
  if (!c.startAt) missing.push("Durée (date d’effet)");
  if (!c.billingTerms.trim() && c.tariffs.length === 0) {
    missing.push("Prix / facturation");
  }
  if (!c.terminationTerms.trim()) missing.push("Résiliation");
  return { ok: missing.length === 0, missing };
}

/** Signatures client + NECS requises avant activation. */
export function contractFullySigned(c: Contract): boolean {
  return c.signatures.length > 0 && c.signatures.every((s) => s.signed);
}

/** Brouillon ou revue juridique encore éditable. */
export function contractDraftEditable(c: Contract): boolean {
  return c.status === "brouillon" || c.status === "en_revue";
}

export function canAccessContracts(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "ops" ||
    role === "finance" ||
    role === "manager"
  );
}

/** Création / activation / avenants : commercial + direction. */
export function canManageContracts(role: UserRole): boolean {
  return role === "admin" || role === "commercial" || role === "manager";
}

/** OPS / finance consultent et marquent échéances. */
export function canOperateContracts(role: UserRole): boolean {
  return canAccessContracts(role);
}

export function isContractStatus(v: unknown): v is ContractStatus {
  return typeof v === "string" && CONTRACT_STATUSES.includes(v as ContractStatus);
}

export function isContractSla(v: unknown): v is ContractSla {
  return typeof v === "string" && CONTRACT_SLAS.includes(v as ContractSla);
}

export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function lineAmount(quantity: number, unitPrice: number): number {
  return roundMoney(Math.max(0, quantity) * Math.max(0, unitPrice));
}

export function makeTariffLine(
  partial: Omit<ContractTariffLine, "amount" | "id"> & { id?: string },
): ContractTariffLine {
  const quantity = Math.max(0, Number(partial.quantity) || 0);
  const unitPrice = Math.max(0, Number(partial.unitPrice) || 0);
  return {
    id: partial.id || `TL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    label: partial.label,
    unit: partial.unit,
    quantity,
    unitPrice,
    amount: lineAmount(quantity, unitPrice),
    period: partial.period,
  };
}

export function computeMonthlyAmount(tariffs: ContractTariffLine[]): number {
  return roundMoney(
    tariffs.reduce((s, t) => {
      if (t.period === "mensuel") return s + t.amount;
      if (t.period === "annuel") return s + t.amount / 12;
      return s; // forfait hors mensuel
    }, 0),
  );
}

export function slaFromServiceLevel(
  level: ServiceLevel | "",
): ContractSla {
  if (level === "premium" || level === "renforce") return "premium";
  if (level === "essentiel") return "standard";
  return "standard";
}

export function formatContractFcfa(n: number): string {
  return `${roundMoney(n).toLocaleString("fr-FR")} FCFA`;
}

export function addMonthsIso(isoDate: string, months: number): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/** Recette : le contrat reprend les IDs sources et montants d’origine. */
export function assertNoResaisie(contract: Contract): {
  ok: boolean;
  checks: Array<{ key: string; ok: boolean; detail: string }>;
} {
  const s = contract.sourceSnapshot;
  const checks = [
    {
      key: "opportunity",
      ok: Boolean(s.opportunityId) && s.opportunityId === contract.opportunityId,
      detail: `Affaire ${s.opportunityId || "—"}`,
    },
    {
      key: "company",
      ok: Boolean(s.company) && s.company === contract.company,
      detail: `Client « ${s.company} »`,
    },
    {
      key: "quote",
      ok: !s.quoteId || s.quoteId === contract.quoteId,
      detail: s.quoteId
        ? `Devis ${s.quoteId} v${s.quoteVersion}`
        : "Sans devis lié",
    },
    {
      key: "sites",
      ok: contract.sites.length > 0,
      detail: `${contract.sites.length} site(s) repris`,
    },
    {
      key: "tariffs",
      ok: contract.tariffs.length > 0 || contract.monthlyAmount >= 0,
      detail: `${contract.tariffs.length} ligne(s) tarifaires`,
    },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

/** Aperçu de transformation affaire → contrat (avant création). */
export type ContractFromWonPreview = {
  opportunityId: string;
  company: string;
  contactName: string;
  contactEmail: string;
  valueEstimate: number;
  quoteId: string;
  quoteVersion: number;
  quoteTotalHT: number;
  visitId: string;
  prospectId: string;
  sla: ContractSla;
  frequency: NeedFrequency | "";
  serviceLevel: ServiceLevel | "";
  staffCount: number;
  monthlyAmount: number;
  sites: ContractSite[];
  tariffs: ContractTariffLine[];
  sources: string[];
  noResaisie: ReturnType<typeof assertNoResaisie>;
  existingContractId: string | null;
  existingContractRef: string | null;
};
