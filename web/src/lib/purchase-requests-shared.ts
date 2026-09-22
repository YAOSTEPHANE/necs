import type { UserRole } from "@/lib/settings";

export type PurchaseRequestStatus =
  | "brouillon"
  | "en_validation"
  | "validee"
  | "refusee"
  | "commandee"
  | "annulee";

export type PurchaseUrgency = "basse" | "normale" | "haute" | "critique";

export type PurchaseRequestLine = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  /** Prix unitaire estimé (FCFA). */
  unitPrice: number;
  /** Total ligne (= qty × PU, ou saisie directe). */
  estimate: number;
  urgency: PurchaseUrgency;
};

export type PurchaseRequestHistoryEntry = {
  id: string;
  at: string;
  by: string;
  byName: string;
  detail: string;
};

/** Bon de commande interne / demande d’achat (TMP-15). */
export type PurchaseRequest = {
  id: string;
  number: string;
  status: PurchaseRequestStatus;
  requesterName: string;
  siteName: string;
  needDate: string;
  supplier: string;
  /** Fournisseur alternatif. */
  altSupplier: string;
  /** Centre de coût / site budgétaire. */
  costCenter: string;
  /** Approbateur N+1 attendu. */
  approverName: string;
  /** Urgence globale de la demande. */
  urgency: PurchaseUrgency;
  /** Livraison / BL prévue. */
  expectedDelivery: string;
  justification: string;
  lines: PurchaseRequestLine[];
  totalEstimate: number;
  rejectionReason: string;
  /** Commentaire validation. */
  validationComment: string;
  note: string;
  history: PurchaseRequestHistoryEntry[];
  validatedAt: string | null;
  validatedBy: string;
  validatedByName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export const PURCHASE_REQUEST_STATUS_LABELS: Record<
  PurchaseRequestStatus,
  string
> = {
  brouillon: "Brouillon",
  en_validation: "En validation",
  validee: "Validée",
  refusee: "Refusée",
  commandee: "Commandée",
  annulee: "Annulée",
};

export const PURCHASE_URGENCY_LABELS: Record<PurchaseUrgency, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  critique: "Critique",
};

export const PURCHASE_REQUEST_STATUSES = Object.keys(
  PURCHASE_REQUEST_STATUS_LABELS,
) as PurchaseRequestStatus[];

export const PURCHASE_URGENCIES = Object.keys(
  PURCHASE_URGENCY_LABELS,
) as PurchaseUrgency[];

export function canAccessPurchaseRequests(role: UserRole | string): boolean {
  return (
    role === "admin" ||
    role === "ops" ||
    role === "manager" ||
    role === "finance" ||
    role === "qualite"
  );
}

export function canEditPurchaseRequests(role: UserRole | string): boolean {
  return role === "admin" || role === "ops" || role === "manager";
}

export function canValidatePurchaseRequests(role: UserRole | string): boolean {
  return role === "admin" || role === "manager" || role === "finance";
}

export function isPurchaseRequestStatus(
  v: unknown,
): v is PurchaseRequestStatus {
  return (
    typeof v === "string" &&
    PURCHASE_REQUEST_STATUSES.includes(v as PurchaseRequestStatus)
  );
}

export function isPurchaseUrgency(v: unknown): v is PurchaseUrgency {
  return (
    typeof v === "string" && PURCHASE_URGENCIES.includes(v as PurchaseUrgency)
  );
}

export function makePurchaseRequestLine(
  partial: Partial<PurchaseRequestLine> & { label: string },
): PurchaseRequestLine {
  const quantity = Math.max(0, Number(partial.quantity) || 0);
  const unitPrice = Math.max(0, Number(partial.unitPrice) || 0);
  const estimateRaw = Number(partial.estimate);
  const estimate =
    Number.isFinite(estimateRaw) && estimateRaw > 0
      ? Math.max(0, estimateRaw)
      : Math.round(quantity * unitPrice);
  return {
    id:
      partial.id ||
      `DAL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    label: String(partial.label || "Article").trim().slice(0, 240),
    quantity,
    unit: String(partial.unit || "u").trim().slice(0, 40) || "u",
    unitPrice,
    estimate,
    urgency: isPurchaseUrgency(partial.urgency) ? partial.urgency : "normale",
  };
}

export function purchaseRequestReady(r: PurchaseRequest): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!r.requesterName.trim()) missing.push("Demandeur");
  if (!r.siteName.trim()) missing.push("Site");
  if (!r.justification.trim()) missing.push("Justification");
  if (!r.approverName.trim()) missing.push("Approbateur N+1");
  if (!r.lines.some((l) => l.label.trim() && l.quantity > 0)) {
    missing.push("Au moins un article avec quantité");
  }
  return { ok: missing.length === 0, missing };
}

export function formatDaFcfa(amount: number): string {
  return `${Math.round(amount || 0).toLocaleString("fr-FR")} FCFA`;
}
