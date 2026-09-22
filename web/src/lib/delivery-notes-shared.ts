import type { UserRole } from "@/lib/settings";
import type { InventoryCategory } from "@/lib/inventory-shared";

export type DeliveryNoteStatus =
  | "brouillon"
  | "en_livraison"
  | "livre"
  | "receptionne"
  | "ecart"
  | "annule";

export type DeliveryLineStatus =
  | "conforme"
  | "ecart"
  | "refuse"
  | "manquant";

export type DeliverySignatureRole = "livreur" | "receptionnaire";

export type DeliveryLine = {
  id: string;
  articleId: string;
  articleSku: string;
  label: string;
  unit: string;
  category: InventoryCategory | "autre";
  qtyOrdered: number;
  qtyDelivered: number;
  qtyReceived: number;
  lineStatus: DeliveryLineStatus;
  /** Lot / n° de série (TMP-04). */
  lot: string;
  note: string;
};

export type DeliveryProofKind = "colis" | "ecart" | "signature";

export type DeliveryProof = {
  id: string;
  kind: DeliveryProofKind;
  url: string;
  caption: string;
  at: string;
  byName: string;
};

export type DeliverySignature = {
  role: DeliverySignatureRole;
  name: string;
  signedAt: string | null;
  signed: boolean;
};

export type DeliveryHistoryEntry = {
  id: string;
  at: string;
  by: string;
  byName: string;
  detail: string;
};

export type DeliveryNote = {
  id: string;
  number: string;
  status: DeliveryNoteStatus;
  siteId: string;
  siteName: string;
  deliveryDate: string;
  deliveryAt: string;
  carrierName: string;
  daRef: string;
  reserves: string;
  lines: DeliveryLine[];
  proofs: DeliveryProof[];
  signatures: DeliverySignature[];
  receivedAt: string | null;
  receivedBy: string;
  receivedByName: string;
  stockUpdated: boolean;
  note: string;
  history: DeliveryHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryNoteStatus, string> = {
  brouillon: "Brouillon",
  en_livraison: "En livraison",
  livre: "Livré",
  receptionne: "Réceptionné",
  ecart: "Écart / réserves",
  annule: "Annulé",
};

export const DELIVERY_LINE_STATUS_LABELS: Record<DeliveryLineStatus, string> = {
  conforme: "Conforme",
  ecart: "Écart",
  refuse: "Refusé",
  manquant: "Manquant",
};

export const DELIVERY_SIGNATURE_ROLE_LABELS: Record<
  DeliverySignatureRole,
  string
> = {
  livreur: "Livreur / magasinier",
  receptionnaire: "Réceptionnaire site",
};

export const DELIVERY_STATUSES = Object.keys(
  DELIVERY_STATUS_LABELS,
) as DeliveryNoteStatus[];

export const DELIVERY_LINE_STATUSES = Object.keys(
  DELIVERY_LINE_STATUS_LABELS,
) as DeliveryLineStatus[];

export function canAccessDeliveryNotes(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "ops" ||
    role === "manager" ||
    role === "finance" ||
    role === "qualite"
  );
}

export function canEditDeliveryNotes(role: UserRole): boolean {
  return role === "admin" || role === "ops" || role === "manager";
}

export function canReceiveDeliveryNotes(role: UserRole): boolean {
  return role === "admin" || role === "ops" || role === "manager";
}

export function isDeliveryNoteStatus(v: unknown): v is DeliveryNoteStatus {
  return (
    typeof v === "string" &&
    DELIVERY_STATUSES.includes(v as DeliveryNoteStatus)
  );
}

export function isDeliveryLineStatus(v: unknown): v is DeliveryLineStatus {
  return (
    typeof v === "string" &&
    DELIVERY_LINE_STATUSES.includes(v as DeliveryLineStatus)
  );
}

export const DELIVERY_PROOF_KIND_LABELS: Record<DeliveryProofKind, string> = {
  colis: "Colis / livraison",
  ecart: "Écart / casse",
  signature: "Preuve signature",
};

export function isDeliveryProofKind(v: unknown): v is DeliveryProofKind {
  return v === "colis" || v === "ecart" || v === "signature";
}

export function makeDeliveryLine(
  partial: Partial<DeliveryLine> & { label: string },
): DeliveryLine {
  const qtyOrdered = Math.max(0, Number(partial.qtyOrdered) || 0);
  const qtyDelivered = Math.max(
    0,
    Number(partial.qtyDelivered ?? qtyOrdered) || 0,
  );
  const qtyReceived = Math.max(
    0,
    Number(
      partial.qtyReceived !== undefined ? partial.qtyReceived : qtyDelivered,
    ) || 0,
  );
  let lineStatus: DeliveryLineStatus =
    partial.lineStatus === "conforme" ||
    partial.lineStatus === "ecart" ||
    partial.lineStatus === "refuse" ||
    partial.lineStatus === "manquant"
      ? partial.lineStatus
      : "conforme";
  if (qtyReceived === 0 && qtyDelivered > 0) lineStatus = "manquant";
  else if (qtyReceived !== qtyDelivered && lineStatus === "conforme") {
    lineStatus = "ecart";
  }
  return {
    id:
      partial.id ||
      `DL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    articleId: String(partial.articleId || "").slice(0, 40),
    articleSku: String(partial.articleSku || "").trim().slice(0, 40),
    label: String(partial.label || "Article").trim().slice(0, 240),
    unit: String(partial.unit || "u").trim().slice(0, 40) || "u",
    category: (partial.category as DeliveryLine["category"]) || "consommable",
    qtyOrdered,
    qtyDelivered,
    qtyReceived,
    lineStatus,
    lot: String(partial.lot || "").trim().slice(0, 80),
    note: String(partial.note || "").trim().slice(0, 400),
  };
}

export function defaultSignatures(
  carrierName = "",
  receiverName = "",
): DeliverySignature[] {
  return [
    {
      role: "livreur",
      name: carrierName,
      signedAt: null,
      signed: false,
    },
    {
      role: "receptionnaire",
      name: receiverName,
      signedAt: null,
      signed: false,
    },
  ];
}

export function deliveryHasEcart(lines: DeliveryLine[]): boolean {
  return lines.some(
    (l) =>
      l.lineStatus === "ecart" ||
      l.lineStatus === "refuse" ||
      l.lineStatus === "manquant" ||
      l.qtyReceived !== l.qtyDelivered,
  );
}

export function deliveryNoteReady(dn: DeliveryNote): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!dn.siteName.trim()) missing.push("Site");
  if (!dn.deliveryDate) missing.push("Date");
  if (!dn.lines.some((l) => l.label.trim() && l.qtyDelivered > 0)) {
    missing.push("Produits / consommables livrés");
  }
  return { ok: missing.length === 0, missing };
}

export function deliveryReceiveReady(dn: DeliveryNote): {
  ok: boolean;
  missing: string[];
} {
  const base = deliveryNoteReady(dn);
  const missing = [...base.missing];
  const livreur = dn.signatures.find((s) => s.role === "livreur");
  const receptionnaire = dn.signatures.find(
    (s) => s.role === "receptionnaire",
  );
  if (!livreur?.name.trim() || !livreur.signed) {
    missing.push("Signature livreur");
  }
  if (!receptionnaire?.name.trim() || !receptionnaire.signed) {
    missing.push("Signature réceptionnaire");
  }
  return { ok: missing.length === 0, missing };
}
