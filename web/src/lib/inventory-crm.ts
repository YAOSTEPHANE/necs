import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { listOpsSites } from "@/lib/ops-referential-crm";
import type { UserRole } from "@/lib/settings";
import {
  CENTRAL_WAREHOUSE_ID,
  CENTRAL_WAREHOUSE_NAME,
  isBelowThreshold,
  isInventoryCategory,
  isInventoryMovementKind,
  type InventoryArticle,
  type InventoryBalance,
  type InventoryCategory,
  type InventoryMovement,
  type InventoryMovementKind,
} from "@/lib/inventory-shared";

const ARTICLES = "ops_inventory_articles";
const BALANCES = "ops_inventory_balances";
const MOVEMENTS = "ops_inventory_movements";

type Actor = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
};

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

async function articlesCol() {
  const db = await getDb();
  const c = db.collection<InventoryArticle>(ARTICLES);
  void Promise.all([
    c.createIndex({ sku: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ active: 1, category: 1 }).catch(() => undefined),
  ]);
  return c;
}

async function balancesCol() {
  const db = await getDb();
  const c = db.collection<InventoryBalance>(BALANCES);
  void Promise.all([
    c
      .createIndex({ siteId: 1, articleId: 1 }, { unique: true })
      .catch(() => undefined),
    c.createIndex({ siteId: 1 }).catch(() => undefined),
    c.createIndex({ quantity: 1, minQty: 1 }).catch(() => undefined),
  ]);
  return c;
}

async function movementsCol() {
  const db = await getDb();
  const c = db.collection<InventoryMovement>(MOVEMENTS);
  void Promise.all([
    c.createIndex({ at: -1 }).catch(() => undefined),
    c.createIndex({ siteId: 1, at: -1 }).catch(() => undefined),
    c.createIndex({ articleId: 1, at: -1 }).catch(() => undefined),
    c.createIndex({ id: 1 }, { unique: true }).catch(() => undefined),
  ]);
  return c;
}

function coerceArticle(raw: Record<string, unknown>): InventoryArticle {
  return {
    id: String(raw.id ?? ""),
    sku: String(raw.sku ?? ""),
    label: String(raw.label ?? ""),
    unit: String(raw.unit ?? "u"),
    category: isInventoryCategory(raw.category) ? raw.category : "consommable",
    active: raw.active !== false,
    defaultMinQty: Math.max(0, Number(raw.defaultMinQty) || 0),
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
  };
}

function coerceBalance(raw: Record<string, unknown>): InventoryBalance {
  return {
    id: String(raw.id ?? ""),
    siteId: String(raw.siteId ?? ""),
    siteName: String(raw.siteName ?? ""),
    articleId: String(raw.articleId ?? ""),
    articleSku: String(raw.articleSku ?? ""),
    articleLabel: String(raw.articleLabel ?? ""),
    unit: String(raw.unit ?? "u"),
    category: isInventoryCategory(raw.category) ? raw.category : "consommable",
    quantity: Number(raw.quantity) || 0,
    minQty: Math.max(0, Number(raw.minQty) || 0),
    lastMovementAt: raw.lastMovementAt ? String(raw.lastMovementAt) : null,
    lastMovementId: String(raw.lastMovementId ?? ""),
    updatedAt: String(raw.updatedAt ?? nowIso()),
  };
}

function coerceMovement(raw: Record<string, unknown>): InventoryMovement {
  return {
    id: String(raw.id ?? ""),
    kind: isInventoryMovementKind(raw.kind) ? raw.kind : "ajustement",
    siteId: String(raw.siteId ?? ""),
    siteName: String(raw.siteName ?? ""),
    toSiteId: String(raw.toSiteId ?? ""),
    toSiteName: String(raw.toSiteName ?? ""),
    articleId: String(raw.articleId ?? ""),
    articleSku: String(raw.articleSku ?? ""),
    articleLabel: String(raw.articleLabel ?? ""),
    unit: String(raw.unit ?? "u"),
    quantity: Number(raw.quantity) || 0,
    balanceAfter: Number(raw.balanceAfter) || 0,
    note: String(raw.note ?? ""),
    at: String(raw.at ?? nowIso()),
    by: String(raw.by ?? ""),
    byName: String(raw.byName ?? ""),
    ref: String(raw.ref ?? ""),
  };
}

export async function listInventoryArticles(
  activeOnly = false,
): Promise<InventoryArticle[]> {
  const q = activeOnly ? { active: true } : {};
  const rows = await (await articlesCol())
    .find(q)
    .sort({ label: 1 })
    .limit(500)
    .toArray();
  return rows.map((r) => coerceArticle(stripMongo(r) as Record<string, unknown>));
}

export async function upsertInventoryArticle(
  input: {
    id?: string;
    sku: string;
    label: string;
    unit?: string;
    category?: InventoryCategory;
    defaultMinQty?: number;
    active?: boolean;
  },
  actor: Actor,
): Promise<InventoryArticle> {
  const sku = clean(input.sku, 40).toUpperCase();
  const label = clean(input.label, 200);
  if (!sku || !label) throw new Error("SKU et libellé requis.");
  const stamp = nowIso();
  const existingId = clean(input.id, 40);
  const col = await articlesCol();

  if (existingId) {
    const cur = await col.findOne({ id: existingId });
    if (!cur) throw new Error("Article introuvable.");
    const next: InventoryArticle = {
      ...coerceArticle(stripMongo(cur) as Record<string, unknown>),
      sku,
      label,
      unit: clean(input.unit, 20) || cur.unit || "u",
      category: isInventoryCategory(input.category)
        ? input.category
        : cur.category,
      defaultMinQty:
        input.defaultMinQty !== undefined
          ? Math.max(0, Number(input.defaultMinQty) || 0)
          : cur.defaultMinQty,
      active: input.active !== undefined ? Boolean(input.active) : cur.active,
      updatedAt: stamp,
    };
    await col.replaceOne({ id: existingId }, next);
    return next;
  }

  const dup = await col.findOne({ sku });
  if (dup) throw new Error(`SKU déjà utilisé (${sku}).`);

  const article: InventoryArticle = {
    id: `ART-${randomUUID().slice(0, 8).toUpperCase()}`,
    sku,
    label,
    unit: clean(input.unit, 20) || "u",
    category: isInventoryCategory(input.category)
      ? input.category
      : "consommable",
    active: input.active !== false,
    defaultMinQty: Math.max(0, Number(input.defaultMinQty) || 0),
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
  };
  await col.insertOne(article);
  return article;
}

async function resolveSiteName(siteId: string): Promise<string> {
  if (siteId === CENTRAL_WAREHOUSE_ID) return CENTRAL_WAREHOUSE_NAME;
  const sites = await listOpsSites();
  const site = sites.find((s) => s.id === siteId);
  if (!site) throw new Error("Site introuvable.");
  return `${site.company} · ${site.name}`;
}

async function getOrCreateBalance(
  siteId: string,
  siteName: string,
  article: InventoryArticle,
): Promise<InventoryBalance> {
  const col = await balancesCol();
  const existing = await col.findOne({ siteId, articleId: article.id });
  if (existing) {
    return coerceBalance(stripMongo(existing) as Record<string, unknown>);
  }
  const balance: InventoryBalance = {
    id: `BAL-${randomUUID().slice(0, 10).toUpperCase()}`,
    siteId,
    siteName,
    articleId: article.id,
    articleSku: article.sku,
    articleLabel: article.label,
    unit: article.unit,
    category: article.category,
    quantity: 0,
    minQty: article.defaultMinQty,
    lastMovementAt: null,
    lastMovementId: "",
    updatedAt: nowIso(),
  };
  try {
    await col.insertOne(balance);
    return balance;
  } catch {
    const raced = await col.findOne({ siteId, articleId: article.id });
    if (raced) {
      return coerceBalance(stripMongo(raced) as Record<string, unknown>);
    }
    throw new Error("Impossible de créer le stock site.");
  }
}

/**
 * Enregistre un mouvement tracé et met à jour le solde.
 * Recette : chaque mouvement a un id unique + historique immuable.
 *
 * Dotation : débit Magasin central → crédit site (2 mouvements liés par ref).
 * Réappro / entrée : + stock sur le site choisi.
 * Consommation (sortie) : − stock site.
 * Transfert : − source + entrée miroir destination.
 */
export async function recordInventoryMovement(
  input: {
    kind: InventoryMovementKind;
    siteId: string;
    articleId: string;
    quantity: number;
    note?: string;
    ref?: string;
    toSiteId?: string;
    minQty?: number;
  },
  actor: Actor,
): Promise<{
  movement: InventoryMovement;
  balance: InventoryBalance;
  linked?: InventoryMovement;
}> {
  const kind = isInventoryMovementKind(input.kind) ? input.kind : null;
  if (!kind) throw new Error("Type de mouvement invalide.");

  const qty = Math.abs(Number(input.quantity) || 0);
  if (qty <= 0) throw new Error("Quantité invalide.");

  const articleRow = await (await articlesCol()).findOne({
    id: clean(input.articleId, 40),
  });
  if (!articleRow) throw new Error("Article introuvable.");
  const article = coerceArticle(
    stripMongo(articleRow) as Record<string, unknown>,
  );
  if (!article.active) throw new Error("Article inactif.");

  const siteId = clean(input.siteId, 80);
  if (!siteId) throw new Error("Site requis.");

  // Dotation = transfert magasin → site (raccourci métier)
  if (kind === "dotation") {
    if (siteId === CENTRAL_WAREHOUSE_ID) {
      throw new Error(
        "Pour une dotation, choisissez le site bénéficiaire (pas le magasin).",
      );
    }
    const r = await recordInventoryMovement(
      {
        kind: "transfert",
        siteId: CENTRAL_WAREHOUSE_ID,
        toSiteId: siteId,
        articleId: article.id,
        quantity: qty,
        note: clean(
          `Dotation site${input.note ? ` · ${input.note}` : ""}`,
          1000,
        ),
        ref: input.ref || "dotation",
        minQty: input.minQty,
      },
      actor,
    );
    const src: InventoryMovement = { ...r.movement, kind: "dotation" };
    await (await movementsCol()).replaceOne({ id: r.movement.id }, src);

    const siteName = await resolveSiteName(siteId);
    const destBalance = await getOrCreateBalance(siteId, siteName, article);
    return {
      movement: src,
      balance: destBalance,
      linked: r.linked,
    };
  }

  const siteName = await resolveSiteName(siteId);

  let toSiteId = "";
  let toSiteName = "";
  if (kind === "transfert") {
    toSiteId = clean(input.toSiteId, 80);
    if (!toSiteId || toSiteId === siteId) {
      throw new Error("Site destination requis (différent).");
    }
    toSiteName = await resolveSiteName(toSiteId);
  }

  const balance = await getOrCreateBalance(siteId, siteName, article);
  if (input.minQty !== undefined) {
    balance.minQty = Math.max(0, Number(input.minQty) || 0);
  }

  let delta: number;
  if (kind === "entree" || kind === "reappro") {
    delta = qty;
  } else if (kind === "ajustement") {
    delta = Number(input.quantity);
    if (!Number.isFinite(delta) || delta === 0) {
      throw new Error("Ajustement : delta non nul requis.");
    }
  } else {
    // sortie | transfert (et dotation déjà redirigée)
    delta = -qty;
  }

  const nextQty = balance.quantity + delta;
  if (nextQty < 0) {
    throw new Error(
      `Stock insuffisant (${balance.quantity} ${balance.unit} disponible).`,
    );
  }

  const stamp = nowIso();
  const movement: InventoryMovement = {
    id: `MVT-${randomUUID().slice(0, 10).toUpperCase()}`,
    kind,
    siteId,
    siteName,
    toSiteId,
    toSiteName,
    articleId: article.id,
    articleSku: article.sku,
    articleLabel: article.label,
    unit: article.unit,
    quantity: kind === "ajustement" ? delta : qty,
    balanceAfter: nextQty,
    note: clean(input.note, 1000),
    at: stamp,
    by: actor.userId,
    byName: actor.name,
    ref: clean(input.ref, 80),
  };

  const nextBalance: InventoryBalance = {
    ...balance,
    quantity: nextQty,
    lastMovementAt: stamp,
    lastMovementId: movement.id,
    updatedAt: stamp,
    siteName,
    articleSku: article.sku,
    articleLabel: article.label,
    unit: article.unit,
    category: article.category,
  };

  await (await movementsCol()).insertOne(movement);
  await (await balancesCol()).replaceOne({ id: balance.id }, nextBalance, {
    upsert: true,
  });

  let linked: InventoryMovement | undefined;

  if (kind === "transfert" && toSiteId) {
    const dest = await getOrCreateBalance(toSiteId, toSiteName, article);
    const destQty = dest.quantity + qty;
    const destMovement: InventoryMovement = {
      id: `MVT-${randomUUID().slice(0, 10).toUpperCase()}`,
      kind: "entree",
      siteId: toSiteId,
      siteName: toSiteName,
      toSiteId: "",
      toSiteName: "",
      articleId: article.id,
      articleSku: article.sku,
      articleLabel: article.label,
      unit: article.unit,
      quantity: qty,
      balanceAfter: destQty,
      note: clean(
        `Transfert depuis ${siteName}${input.note ? ` · ${input.note}` : ""}`,
        1000,
      ),
      at: stamp,
      by: actor.userId,
      byName: actor.name,
      ref: movement.id,
    };
    await (await movementsCol()).insertOne(destMovement);
    await (await balancesCol()).replaceOne(
      { id: dest.id },
      {
        ...dest,
        quantity: destQty,
        lastMovementAt: stamp,
        lastMovementId: destMovement.id,
        updatedAt: stamp,
      },
      { upsert: true },
    );
    linked = destMovement;
  }

  return { movement, balance: nextBalance, linked };
}

export async function setBalanceMinQty(
  balanceId: string,
  minQty: number,
  actor: Actor,
): Promise<InventoryBalance> {
  const col = await balancesCol();
  const row = await col.findOne({ id: balanceId });
  if (!row) throw new Error("Stock introuvable.");
  const balance = coerceBalance(stripMongo(row) as Record<string, unknown>);
  balance.minQty = Math.max(0, Number(minQty) || 0);
  balance.updatedAt = nowIso();
  await col.replaceOne({ id: balanceId }, balance);

  // Trace seuil via mouvement d’ajustement 0? Better: dedicated note movement
  await (await movementsCol()).insertOne({
    id: `MVT-${randomUUID().slice(0, 10).toUpperCase()}`,
    kind: "ajustement",
    siteId: balance.siteId,
    siteName: balance.siteName,
    toSiteId: "",
    toSiteName: "",
    articleId: balance.articleId,
    articleSku: balance.articleSku,
    articleLabel: balance.articleLabel,
    unit: balance.unit,
    quantity: 0,
    balanceAfter: balance.quantity,
    note: `Seuil mini → ${balance.minQty} (par ${actor.name})`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    ref: "seuil",
  } satisfies InventoryMovement);

  return balance;
}

export async function listInventoryBalances(filter?: {
  siteId?: string;
  belowOnly?: boolean;
}): Promise<InventoryBalance[]> {
  const q: Record<string, unknown> = {};
  if (filter?.siteId) q.siteId = filter.siteId;
  const rows = await (await balancesCol())
    .find(q)
    .sort({ siteName: 1, articleLabel: 1 })
    .limit(800)
    .toArray();
  let list = rows.map((r) =>
    coerceBalance(stripMongo(r) as Record<string, unknown>),
  );
  if (filter?.belowOnly) list = list.filter(isBelowThreshold);
  return list;
}

export async function listInventoryMovements(filter?: {
  siteId?: string;
  articleId?: string;
  limit?: number;
}): Promise<InventoryMovement[]> {
  const q: Record<string, unknown> = {};
  if (filter?.siteId) {
    q.$or = [{ siteId: filter.siteId }, { toSiteId: filter.siteId }];
  }
  if (filter?.articleId) q.articleId = filter.articleId;
  const rows = await (await movementsCol())
    .find(q)
    .sort({ at: -1 })
    .limit(Math.min(500, filter?.limit || 200))
    .toArray();
  return rows.map((r) =>
    coerceMovement(stripMongo(r) as Record<string, unknown>),
  );
}

export async function listInventorySites(): Promise<
  Array<{ id: string; name: string }>
> {
  const sites = await listOpsSites({ status: "actif" });
  return [
    { id: CENTRAL_WAREHOUSE_ID, name: CENTRAL_WAREHOUSE_NAME },
    ...sites.map((s) => ({
      id: s.id,
      name: `${s.company} · ${s.name}`,
    })),
  ];
}

export async function seedDefaultArticles(actor: Actor): Promise<number> {
  const existing = await listInventoryArticles();
  if (existing.length > 0) return 0;
  const defaults: Array<{
    sku: string;
    label: string;
    unit: string;
    category: InventoryCategory;
    defaultMinQty: number;
  }> = [
    {
      sku: "DET-01",
      label: "Détergent multi-surfaces",
      unit: "L",
      category: "consommable",
      defaultMinQty: 10,
    },
    {
      sku: "SAC-01",
      label: "Sacs poubelle 100 L",
      unit: "rouleau",
      category: "consommable",
      defaultMinQty: 5,
    },
    {
      sku: "EPI-GLV",
      label: "Gants nitrile",
      unit: "boîte",
      category: "epi",
      defaultMinQty: 3,
    },
    {
      sku: "MAT-BAL",
      label: "Balai microfibre",
      unit: "u",
      category: "materiel",
      defaultMinQty: 2,
    },
  ];
  for (const d of defaults) {
    await upsertInventoryArticle(d, actor);
  }
  return defaults.length;
}
