import type { UserRole } from "@/lib/settings";
import type {
  NeedFrequency,
  PrestationKind,
  ServiceLevel,
} from "@/lib/need-qualification-shared";

export type CommercialOfferStatus =
  | "brouillon"
  | "en_revue"
  | "envoyee"
  | "negociation"
  | "acceptee"
  | "refusee"
  | "expiree";

export type CommercialOfferLine = {
  id: string;
  label: string;
  frequency: string;
  staffCount: number;
  amountMonthlyHT: number;
};

export type CommercialOfferHistoryEntry = {
  id: string;
  at: string;
  by: string;
  byName: string;
  detail: string;
};

export type CommercialOffer = {
  id: string;
  ref: string;
  title: string;
  status: CommercialOfferStatus;
  company: string;
  site: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  opportunityId: string;
  quoteId: string;
  visitId: string;
  prospectId: string;
  premisesKind: PrestationKind | "";
  surfaceM2: number;
  frequency: NeedFrequency | "";
  serviceLevel: ServiceLevel | "";
  validityDays: number;
  offerDate: string;
  startDate: string;
  needSummary: string;
  zones: string;
  constraints: string;
  /** Prestations décrites aussi via lines ; texte libre complémentaire. */
  prestationsSummary: string;
  methodology: string;
  /** Moyens matériels, équipements, consommables. */
  means: string;
  arguments: string;
  teamDetail: string;
  supervision: string;
  digitalPilotage: string;
  /** Planning indicatif de démarrage / jalons. */
  indicativePlanning: string;
  /** Conditions commerciales & juridiques. */
  conditions: string;
  confidentiality: "confidentiel" | "interne" | "public_client";
  lines: CommercialOfferLine[];
  totalMonthlyHT: number;
  note: string;
  rejectionReason: string;
  history: CommercialOfferHistoryEntry[];
  sentAt: string | null;
  acceptedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export const COMMERCIAL_OFFER_STATUS_LABELS: Record<
  CommercialOfferStatus,
  string
> = {
  brouillon: "Brouillon",
  en_revue: "En revue",
  envoyee: "Envoyée",
  negociation: "Négociation",
  acceptee: "Acceptée",
  refusee: "Refusée",
  expiree: "Expirée",
};

export const CONFIDENTIALITY_LABELS: Record<
  CommercialOffer["confidentiality"],
  string
> = {
  confidentiel: "Confidentiel",
  interne: "Usage interne",
  public_client: "Public client",
};

export const COMMERCIAL_OFFER_STATUSES = Object.keys(
  COMMERCIAL_OFFER_STATUS_LABELS,
) as CommercialOfferStatus[];

export function canAccessCommercialOffers(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "finance" ||
    role === "manager"
  );
}

export function canEditCommercialOffers(role: UserRole): boolean {
  return role === "admin" || role === "commercial";
}

export function canReviewCommercialOffers(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "finance" ||
    role === "manager"
  );
}

export function isCommercialOfferStatus(
  v: unknown,
): v is CommercialOfferStatus {
  return (
    typeof v === "string" &&
    COMMERCIAL_OFFER_STATUSES.includes(v as CommercialOfferStatus)
  );
}

export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function computeOfferTotal(lines: CommercialOfferLine[]): number {
  return roundMoney(
    lines.reduce((sum, l) => sum + (Number(l.amountMonthlyHT) || 0), 0),
  );
}

export function formatOfferFcfa(amount: number): string {
  return `${Math.round(amount || 0).toLocaleString("fr-FR")} FCFA`;
}

export function makeOfferLine(
  partial: Partial<CommercialOfferLine> & { label: string },
): CommercialOfferLine {
  return {
    id:
      partial.id ||
      `OFL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    label: String(partial.label || "Prestation").trim().slice(0, 240),
    frequency: String(partial.frequency || "").trim().slice(0, 80),
    staffCount: Math.max(0, Math.round(Number(partial.staffCount) || 0)),
    amountMonthlyHT: roundMoney(Math.max(0, Number(partial.amountMonthlyHT) || 0)),
  };
}

export function offerExpiryDate(
  offerDate: string,
  validityDays: number,
): string | null {
  if (!offerDate || !validityDays) return null;
  const d = new Date(`${offerDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Math.max(1, validityDays));
  return d.toISOString().slice(0, 10);
}

export function offerReadyToSend(offer: CommercialOffer): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!offer.company.trim()) missing.push("Client / prospect");
  if (!offer.site.trim()) missing.push("Site");
  if (!offer.title.trim()) missing.push("Intitulé");
  if (!offer.offerDate) missing.push("Date de l’offre");
  if (!offer.surfaceM2 || offer.surfaceM2 <= 0) missing.push("Surface");
  if (!offer.lines.some((l) => l.label.trim() && l.amountMonthlyHT > 0)) {
    missing.push("Au moins une prestation chiffrée");
  }
  if (!offer.needSummary.trim()) missing.push("Compréhension du besoin");
  if (!offer.methodology.trim()) missing.push("Méthodologie");
  if (!offer.means.trim()) missing.push("Moyens");
  if (!offer.teamDetail.trim()) missing.push("Équipe");
  if (!offer.indicativePlanning.trim()) missing.push("Planning indicatif");
  if (!offer.conditions.trim()) missing.push("Conditions");
  if (!offer.validityDays || offer.validityDays < 1) missing.push("Validité");
  return { ok: missing.length === 0, missing };
}

export const DEFAULT_OFFER_TITLE =
  "Proposition de services de nettoyage professionnel";

export const DEFAULT_OFFER_METHODOLOGY =
  "1) Diagnostic & cadrage · 2) Organisation opérationnelle · 3) Exécution & preuves · 4) Amélioration continue.";

export const DEFAULT_OFFER_MEANS =
  "Matériel professionnel adapté au site · consommables standards · EPI · engins / machines selon zones.";

export const DEFAULT_OFFER_TEAM =
  "Équipe dédiée dimensionnée au périmètre · chef d’équipe / supervision · formation continue.";

export const DEFAULT_OFFER_PLANNING =
  "S+0 : cadrage & accès · S+1 : démarrage opérationnel · J+7 / J+30 : contrôles qualité · revue mensuelle.";

export const DEFAULT_OFFER_CONDITIONS =
  "Montants HT mensuels · révision annuelle possible · préavis 30 jours · paiement 30 jours fin de mois · la présente offre est valable pour la durée indiquée.";

export const DEFAULT_OFFER_ARGUMENTS =
  "Qualité mesurable · Équipes formées · Digitalisation bout-en-bout · Interlocuteur unique.";

export const DEFAULT_OFFER_SUPERVISION =
  "Visites terrain + contrôles qualité périodiques · interlocuteur unique NECS.";

export const DEFAULT_OFFER_DIGITAL =
  "Pointage digital · OT · photos preuves · reporting qualité & non-conformités.";