import type { UserRole } from "@/lib/settings";

export type InventoryCategory = "materiel" | "consommable" | "epi";

export type InventoryMovementKind =
  | "entree"
  | "sortie"
  | "dotation"
  | "reappro"
  | "ajustement"
  | "transfert";

export type InventoryArticle = {
  id: string;
  sku: string;
  label: string;
  unit: string;
  category: InventoryCategory;
  active: boolean;
  defaultMinQty: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
};

/** Stock d’un article sur un site (ou magasin central). */
export type InventoryBalance = {
  id: string;
  siteId: string;
  siteName: string;
  articleId: string;
  articleSku: string;
  articleLabel: string;
  unit: string;
  category: InventoryCategory;
  quantity: number;
  minQty: number;
  lastMovementAt: string | null;
  lastMovementId: string;
  updatedAt: string;
};

export type InventoryMovement = {
  id: string;
  kind: InventoryMovementKind;
  siteId: string;
  siteName: string;
  /** Pour transfert : site destination */
  toSiteId: string;
  toSiteName: string;
  articleId: string;
  articleSku: string;
  articleLabel: string;
  unit: string;
  quantity: number;
  /** Solde après mouvement sur le site source (ou unique) */
  balanceAfter: number;
  note: string;
  at: string;
  by: string;
  byName: string;
  /** Lien optionnel OT / demande */
  ref: string;
};

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  materiel: "Matériel",
  consommable: "Consommable",
  epi: "EPI",
};

export const INVENTORY_MOVEMENT_LABELS: Record<InventoryMovementKind, string> = {
  entree: "Entrée stock",
  sortie: "Consommation",
  dotation: "Dotation site",
  reappro: "Réapprovisionnement",
  ajustement: "Ajustement",
  transfert: "Transfert",
};

export const INVENTORY_CATEGORIES = Object.keys(
  INVENTORY_CATEGORY_LABELS,
) as InventoryCategory[];

export const INVENTORY_MOVEMENT_KINDS = Object.keys(
  INVENTORY_MOVEMENT_LABELS,
) as InventoryMovementKind[];

/** Magasin central (hors site client). */
export const CENTRAL_WAREHOUSE_ID = "SITE-MAGASIN-CENTRAL";
export const CENTRAL_WAREHOUSE_NAME = "Magasin central";

export function canAccessInventory(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "ops" ||
    role === "manager" ||
    role === "finance"
  );
}

export function canEditInventory(role: UserRole): boolean {
  return role === "admin" || role === "ops" || role === "manager";
}

export function isInventoryCategory(v: unknown): v is InventoryCategory {
  return (
    typeof v === "string" &&
    INVENTORY_CATEGORIES.includes(v as InventoryCategory)
  );
}

export function isInventoryMovementKind(
  v: unknown,
): v is InventoryMovementKind {
  return (
    typeof v === "string" &&
    INVENTORY_MOVEMENT_KINDS.includes(v as InventoryMovementKind)
  );
}

export function isBelowThreshold(balance: InventoryBalance): boolean {
  return balance.quantity <= balance.minQty;
}

export function inventoryStats(
  balances: InventoryBalance[],
  movements: InventoryMovement[],
) {
  const below = balances.filter(isBelowThreshold).length;
  const sites = new Set(balances.map((b) => b.siteId)).size;
  const articles = new Set(balances.map((b) => b.articleId)).size;
  return {
    balances: balances.length,
    below,
    sites,
    articles,
    movements: movements.length,
  };
}
