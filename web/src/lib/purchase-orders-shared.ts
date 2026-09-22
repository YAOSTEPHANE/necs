import type { UserRole } from "@/lib/settings";

export type PurchaseOrderStatus =
  | "brouillon"
  | "en_validation"
  | "valide"
  | "refuse"
  | "transmis_ops"
  | "en_execution"
  | "cloture"
  | "annule";

export type PurchaseOrderPriority = "normale" | "haute" | "urgente";

export type PurchaseOrderLineStatus = "prevu" | "valide" | "annule";

export type PurchaseOrderLine = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  scheduledDate: string;
  site: string;
  status: PurchaseOrderLineStatus;
  unitPrice: number;
  amount: number;
};

export type PurchaseOrderHistoryEntry = {
  id: string;
  at: string;
  by: string;
  byName: string;
  detail: string;
};

export type PurchaseOrder = {
  id: string;
  ref: string;
  /** Référence commande côté client (BC client). */
  clientRef: string;
  quoteId: string;
  quoteRef: string;
  opportunityId: string;
  prospectId: string;
  company: string;
  site: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  orderDate: string;
  startDate: string;
  priority: PurchaseOrderPriority;
  conditions: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  totalHT: number;
  note: string;
  rejectionReason: string;
  history: PurchaseOrderHistoryEntry[];
  validatedAt: string | null;
  validatedBy: string;
  validatedByName: string;
  transmittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> =
  {
    brouillon: "Brouillon",
    en_validation: "En validation",
    valide: "Validé",
    refuse: "Refusé",
    transmis_ops: "Transmis ops",
    en_execution: "En exécution",
    cloture: "Clôturé",
    annule: "Annulé",
  };

export const PURCHASE_ORDER_PRIORITY_LABELS: Record<
  PurchaseOrderPriority,
  string
> = {
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

export const PURCHASE_ORDER_LINE_STATUS_LABELS: Record<
  PurchaseOrderLineStatus,
  string
> = {
  prevu: "Prévu",
  valide: "Validé",
  annule: "Annulé",
};

export const PURCHASE_ORDER_STATUSES = Object.keys(
  PURCHASE_ORDER_STATUS_LABELS,
) as PurchaseOrderStatus[];

export const PURCHASE_ORDER_PRIORITIES = Object.keys(
  PURCHASE_ORDER_PRIORITY_LABELS,
) as PurchaseOrderPriority[];

export function canAccessPurchaseOrders(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "ops" ||
    role === "finance" ||
    role === "manager"
  );
}

export function canEditPurchaseOrders(role: UserRole): boolean {
  return role === "admin" || role === "commercial";
}

export function canValidatePurchaseOrders(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "finance" ||
    role === "manager"
  );
}

export function canTransmitPurchaseOrders(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "ops" ||
    role === "manager"
  );
}

export function isPurchaseOrderStatus(v: unknown): v is PurchaseOrderStatus {
  return (
    typeof v === "string" &&
    PURCHASE_ORDER_STATUSES.includes(v as PurchaseOrderStatus)
  );
}

export function isPurchaseOrderPriority(v: unknown): v is PurchaseOrderPriority {
  return (
    typeof v === "string" &&
    PURCHASE_ORDER_PRIORITIES.includes(v as PurchaseOrderPriority)
  );
}

export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function lineAmount(quantity: number, unitPrice: number): number {
  return roundMoney(Math.max(0, quantity) * Math.max(0, unitPrice));
}

export function computePurchaseOrderTotal(lines: PurchaseOrderLine[]): number {
  return roundMoney(
    lines
      .filter((l) => l.status !== "annule")
      .reduce((sum, l) => sum + (Number(l.amount) || 0), 0),
  );
}

export function formatPoFcfa(amount: number): string {
  return `${Math.round(amount || 0).toLocaleString("fr-FR")} FCFA`;
}

export function makePurchaseOrderLine(
  partial: Partial<PurchaseOrderLine> & { label: string },
): PurchaseOrderLine {
  const quantity = Math.max(0, Number(partial.quantity) || 0);
  const unitPrice = Math.max(0, Number(partial.unitPrice) || 0);
  const status: PurchaseOrderLineStatus =
    partial.status === "valide" || partial.status === "annule"
      ? partial.status
      : "prevu";
  return {
    id:
      partial.id ||
      `POL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    label: String(partial.label || "Prestation").trim().slice(0, 240),
    quantity,
    unit: String(partial.unit || "u").trim().slice(0, 40) || "u",
    scheduledDate: String(partial.scheduledDate || "").slice(0, 10),
    site: String(partial.site || "").trim().slice(0, 160),
    status,
    unitPrice,
    amount: lineAmount(quantity, unitPrice),
  };
}

/** Recette fin de validation BC. */
export function purchaseOrderReadyToValidate(po: PurchaseOrder): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!po.company.trim()) missing.push("Client");
  if (!po.clientRef.trim() && !po.quoteRef.trim()) {
    missing.push("Référence client");
  }
  if (!po.site.trim()) missing.push("Site");
  if (!po.orderDate) missing.push("Date de commande");
  if (!po.startDate) missing.push("Date de démarrage");
  if (!po.lines.some((l) => l.status !== "annule" && l.label.trim() && l.quantity > 0)) {
    missing.push("Prestations commandées (quantités)");
  }
  if (!po.conditions.trim()) missing.push("Conditions");
  return { ok: missing.length === 0, missing };
}

export const DEFAULT_PO_CONDITIONS =
  "Commande ferme sous réserve de validation NECS. Prestations exécutées selon le site et le planning convenus. Toute modification doit être confirmée par écrit.";
