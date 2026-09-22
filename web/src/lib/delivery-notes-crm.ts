import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  defaultSignatures,
  deliveryHasEcart,
  deliveryNoteReady,
  isDeliveryLineStatus,
  isDeliveryNoteStatus,
  isDeliveryProofKind,
  makeDeliveryLine,
  type DeliveryHistoryEntry,
  type DeliveryLine,
  type DeliveryNote,
  type DeliveryNoteStatus,
  type DeliveryProof,
  type DeliverySignature,
} from "@/lib/delivery-notes-shared";
import {
  listInventoryArticles,
  recordInventoryMovement,
} from "@/lib/inventory-crm";

type Actor = { userId: string; name: string; email: string; role: UserRole };

const COLLECTION = "ops_delivery_notes";

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string): DeliveryHistoryEntry {
  return {
    id: `DH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

async function col() {
  const db = await getDb();
  const c = db.collection<DeliveryNote>(COLLECTION);
  void Promise.all([
    c.createIndex({ number: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ status: 1, deliveryDate: -1 }).catch(() => undefined),
    c.createIndex({ siteId: 1, updatedAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

function yearPrefix() {
  return String(new Date().getFullYear());
}

async function nextNumber(): Promise<string> {
  const c = await col();
  const count = await c.countDocuments();
  return `NECS-BL-${yearPrefix()}-${String(count + 1).padStart(4, "0")}`;
}

function normalizeLine(
  raw: Partial<DeliveryLine> | Record<string, unknown>,
): DeliveryLine {
  return makeDeliveryLine({
    id: clean(raw.id, 40) || undefined,
    articleId: clean(raw.articleId, 40),
    articleSku: clean(raw.articleSku, 40),
    label: clean(raw.label, 240) || "Article",
    unit: clean(raw.unit, 40) || "u",
    category: (raw.category as DeliveryLine["category"]) || "consommable",
    qtyOrdered: Number(raw.qtyOrdered) || 0,
    qtyDelivered: Number(raw.qtyDelivered) || 0,
    qtyReceived: Number(raw.qtyReceived) || 0,
    lineStatus: isDeliveryLineStatus(raw.lineStatus)
      ? raw.lineStatus
      : undefined,
    lot: clean(raw.lot, 80),
    note: clean(raw.note, 400),
  });
}

function normalizeProofs(raw: unknown): DeliveryProof[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      const r = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
      const url = clean(r.url, 2000);
      if (!url) return null;
      return {
        id: clean(r.id, 40) || `DP-${randomUUID().slice(0, 8).toUpperCase()}`,
        kind: isDeliveryProofKind(r.kind) ? r.kind : "colis",
        url,
        caption: clean(r.caption, 240),
        at: clean(r.at, 40) || nowIso(),
        byName: clean(r.byName, 120),
      } satisfies DeliveryProof;
    })
    .filter((p): p is DeliveryProof => Boolean(p));
}

function normalizeSignatures(raw: unknown): DeliverySignature[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultSignatures();
  const mapped = raw.map((s) => {
    const r = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    const role =
      r.role === "receptionnaire" ? "receptionnaire" : "livreur";
    return {
      role,
      name: clean(r.name, 120),
      signedAt:
        typeof r.signedAt === "string" && r.signedAt ? r.signedAt : null,
      signed: Boolean(r.signed),
    } satisfies DeliverySignature;
  });
  const hasLivreur = mapped.some((s) => s.role === "livreur");
  const hasReceiver = mapped.some((s) => s.role === "receptionnaire");
  const defaults = defaultSignatures();
  if (!hasLivreur) mapped.unshift(defaults[0]!);
  if (!hasReceiver) mapped.push(defaults[1]!);
  return mapped;
}

function coerce(raw: Record<string, unknown>): DeliveryNote {
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map((l) => normalizeLine(l as Partial<DeliveryLine>))
    : [];
  return {
    id: clean(raw.id, 40) || `DN-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: clean(raw.number, 40) || "NECS-BL-0000",
    status: isDeliveryNoteStatus(raw.status) ? raw.status : "brouillon",
    siteId: clean(raw.siteId, 40),
    siteName: clean(raw.siteName, 160),
    deliveryDate: clean(raw.deliveryDate, 10),
    deliveryAt: clean(raw.deliveryAt, 40),
    carrierName: clean(raw.carrierName, 120),
    daRef: clean(raw.daRef, 80),
    reserves: clean(raw.reserves, 4000),
    lines,
    proofs: normalizeProofs(raw.proofs),
    signatures: normalizeSignatures(raw.signatures),
    receivedAt:
      typeof raw.receivedAt === "string" && raw.receivedAt
        ? raw.receivedAt
        : null,
    receivedBy: clean(raw.receivedBy, 80),
    receivedByName: clean(raw.receivedByName, 120),
    stockUpdated: Boolean(raw.stockUpdated),
    note: clean(raw.note, 2000),
    history: Array.isArray(raw.history)
      ? (raw.history as DeliveryHistoryEntry[])
      : [],
    createdAt: clean(raw.createdAt, 40) || nowIso(),
    updatedAt: clean(raw.updatedAt, 40) || nowIso(),
    createdBy: clean(raw.createdBy, 80),
    createdByName: clean(raw.createdByName, 120),
    ownerEmail: clean(raw.ownerEmail, 180).toLowerCase(),
    ownerName: clean(raw.ownerName, 120),
  };
}

async function save(doc: DeliveryNote): Promise<DeliveryNote> {
  const next = { ...doc, updatedAt: nowIso() };
  const c = await col();
  await c.replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

async function ensureSeed(actor: Actor): Promise<void> {
  const c = await col();
  if ((await c.countDocuments()) > 0) return;

  const now = Date.now();
  const day = (o: number) =>
    new Date(now + o * 86_400_000).toISOString().slice(0, 10);
  const at = (o: number) =>
    new Date(now + o * 86_400_000).toISOString();

  const seeds: DeliveryNote[] = [
    {
      id: `DN-${randomUUID().slice(0, 8).toUpperCase()}`,
      number: `NECS-BL-${yearPrefix()}-0001`,
      status: "ecart",
      siteId: "SITE-BASSA",
      siteName: "Usine Bassa",
      deliveryDate: day(-1),
      deliveryAt: at(-1),
      carrierName: "Jean Kouam (magasin)",
      daRef: "DA-0199",
      reserves: "2 rouleaux de sacs non livrés — réassort prévu J+2",
      lines: [
        makeDeliveryLine({
          label: "Détergent multi-surfaces 5L",
          unit: "Bidon",
          category: "consommable",
          articleSku: "CONS-DET-5L",
          qtyOrdered: 12,
          qtyDelivered: 12,
          qtyReceived: 12,
          lineStatus: "conforme",
        }),
        makeDeliveryLine({
          label: "Sacs poubelle 100L",
          unit: "Rouleau",
          category: "consommable",
          articleSku: "CONS-SAC-100",
          qtyOrdered: 20,
          qtyDelivered: 20,
          qtyReceived: 18,
          lineStatus: "ecart",
          note: "Écart −2",
        }),
      ],
      signatures: [
        {
          role: "livreur",
          name: "Jean Kouam",
          signedAt: at(-1),
          signed: true,
        },
        {
          role: "receptionnaire",
          name: "Paul Mbarga",
          signedAt: at(-1),
          signed: true,
        },
      ],
      receivedAt: at(-1),
      receivedBy: actor.userId,
      receivedByName: actor.name,
      proofs: [
        {
          id: `DP-${randomUUID().slice(0, 6).toUpperCase()}`,
          kind: "ecart" as const,
          url: "https://placehold.co/640x400/png?text=Ecart+sacs",
          caption: "Écart −2 rouleaux sacs 100L",
          at: at(-1),
          byName: actor.name,
        },
      ],
      stockUpdated: false,
      note: "Livraison démo avec écart partiel",
      history: [
        hist(actor, "BL démo créé"),
        hist(actor, "Livré puis réceptionné avec réserves"),
      ],
      createdAt: at(-2),
      updatedAt: at(-1),
      createdBy: actor.userId,
      createdByName: actor.name,
      ownerEmail: actor.email.toLowerCase(),
      ownerName: actor.name,
    },
    {
      id: `DN-${randomUUID().slice(0, 8).toUpperCase()}`,
      number: `NECS-BL-${yearPrefix()}-0002`,
      status: "en_livraison",
      siteId: "SITE-HORIZON",
      siteName: "Immeuble Horizon — Akwa",
      deliveryDate: day(0),
      deliveryAt: at(0),
      carrierName: "Magasin central",
      daRef: "DA-0210",
      reserves: "",
      lines: [
        makeDeliveryLine({
          label: "Serpillères microfibre",
          unit: "U",
          category: "materiel",
          articleSku: "MAT-SERP-01",
          qtyOrdered: 10,
          qtyDelivered: 10,
          qtyReceived: 0,
          lineStatus: "conforme",
        }),
        makeDeliveryLine({
          label: "Gants nitrile (boîte)",
          unit: "Boîte",
          category: "epi",
          articleSku: "EPI-GANT-N",
          qtyOrdered: 5,
          qtyDelivered: 5,
          qtyReceived: 0,
          lineStatus: "conforme",
        }),
      ],
      signatures: defaultSignatures("Magasin central", ""),
      receivedAt: null,
      receivedBy: "",
      receivedByName: "",
      proofs: [],
      stockUpdated: false,
      note: "En cours de livraison",
      history: [hist(actor, "BL démo en livraison")],
      createdAt: at(-0.5),
      updatedAt: at(-0.2),
      createdBy: actor.userId,
      createdByName: actor.name,
      ownerEmail: actor.email.toLowerCase(),
      ownerName: actor.name,
    },
  ];

  await c.insertMany(seeds);
}

export async function listDeliveryNotes(
  actor: Actor,
): Promise<DeliveryNote[]> {
  const c = await col();
  await ensureSeed(actor);
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(300).toArray();
  return rows.map((r) => coerce(stripMongo(r) as Record<string, unknown>));
}

export async function getDeliveryNote(
  id: string,
): Promise<DeliveryNote | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  return coerce(stripMongo(row) as Record<string, unknown>);
}

export type DeliveryNoteInput = {
  siteId?: string;
  siteName: string;
  deliveryDate?: string;
  deliveryAt?: string;
  carrierName?: string;
  daRef?: string;
  reserves?: string;
  note?: string;
  lines?: Array<Partial<DeliveryLine>>;
  proofs?: DeliveryProof[];
  signatures?: DeliverySignature[];
};

export async function createDeliveryNote(
  input: DeliveryNoteInput,
  actor: Actor,
): Promise<DeliveryNote> {
  const siteName = clean(input.siteName, 160);
  if (!siteName) throw new Error("Site requis");
  const lines = (input.lines || []).map((l) => normalizeLine(l));
  if (lines.length === 0) {
    lines.push(
      makeDeliveryLine({
        label: "Consommable à préciser",
        qtyOrdered: 1,
        qtyDelivered: 1,
        qtyReceived: 0,
        unit: "u",
      }),
    );
  }
  const deliveryDate =
    clean(input.deliveryDate, 10) || nowIso().slice(0, 10);
  const deliveryAt = clean(input.deliveryAt, 40) || nowIso();
  const carrierName = clean(input.carrierName, 120);
  const now = nowIso();
  const doc: DeliveryNote = {
    id: `DN-${randomUUID().slice(0, 8).toUpperCase()}`,
    number: await nextNumber(),
    status: "brouillon",
    siteId: clean(input.siteId, 40),
    siteName,
    deliveryDate,
    deliveryAt,
    carrierName,
    daRef: clean(input.daRef, 80),
    reserves: clean(input.reserves, 4000),
    lines,
    proofs: normalizeProofs(input.proofs),
    signatures: normalizeSignatures(
      input.signatures || defaultSignatures(carrierName, ""),
    ),
    receivedAt: null,
    receivedBy: "",
    receivedByName: "",
    stockUpdated: false,
    note: clean(input.note, 2000),
    history: [hist(actor, `BL créé · ${siteName}`)],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
    createdByName: actor.name,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
  };
  const ready = deliveryNoteReady(doc);
  if (!ready.ok && lines.every((l) => !l.label.trim())) {
    throw new Error(`Champs manquants : ${ready.missing.join(", ")}`);
  }
  return save(doc);
}

export async function updateDeliveryNote(
  id: string,
  patch: Partial<DeliveryNoteInput> & {
    status?: DeliveryNoteStatus;
    lines?: Array<Partial<DeliveryLine>>;
  },
  actor: Actor,
): Promise<DeliveryNote> {
  const existing = await getDeliveryNote(id);
  if (!existing) throw new Error("Bon de livraison introuvable");
  if (existing.status === "annule" || existing.status === "receptionne") {
    if (patch.status !== "annule" && !patch.reserves && !patch.note) {
      throw new Error("Ce BL ne peut plus être modifié");
    }
  }

  const lines = Array.isArray(patch.lines)
    ? patch.lines.map((l) => normalizeLine(l))
    : existing.lines;

  let signatures = existing.signatures;
  if (patch.signatures) {
    signatures = normalizeSignatures(patch.signatures);
  } else if (patch.carrierName !== undefined) {
    signatures = signatures.map((s) =>
      s.role === "livreur"
        ? { ...s, name: clean(patch.carrierName, 120) || s.name }
        : s,
    );
  }

  const next: DeliveryNote = {
    ...existing,
    siteId:
      patch.siteId !== undefined
        ? clean(patch.siteId, 40)
        : existing.siteId,
    siteName:
      patch.siteName !== undefined
        ? clean(patch.siteName, 160) || existing.siteName
        : existing.siteName,
    deliveryDate:
      patch.deliveryDate !== undefined
        ? clean(patch.deliveryDate, 10)
        : existing.deliveryDate,
    deliveryAt:
      patch.deliveryAt !== undefined
        ? clean(patch.deliveryAt, 40)
        : existing.deliveryAt,
    carrierName:
      patch.carrierName !== undefined
        ? clean(patch.carrierName, 120)
        : existing.carrierName,
    daRef: patch.daRef !== undefined ? clean(patch.daRef, 80) : existing.daRef,
    reserves:
      patch.reserves !== undefined
        ? clean(patch.reserves, 4000)
        : existing.reserves,
    note: patch.note !== undefined ? clean(patch.note, 2000) : existing.note,
    lines,
    signatures,
    status: isDeliveryNoteStatus(patch.status)
      ? patch.status
      : existing.status,
    history: [...existing.history, hist(actor, "BL mis à jour")].slice(-80),
  };
  return save(next);
}

export async function dispatchDeliveryNote(
  id: string,
  actor: Actor,
): Promise<DeliveryNote> {
  const existing = await getDeliveryNote(id);
  if (!existing) throw new Error("Bon de livraison introuvable");
  if (existing.status !== "brouillon") {
    throw new Error("Seul un brouillon peut partir en livraison");
  }
  const ready = deliveryNoteReady(existing);
  if (!ready.ok) {
    throw new Error(`Incomplet : ${ready.missing.join(", ")}`);
  }
  return save({
    ...existing,
    status: "en_livraison",
    history: [
      ...existing.history,
      hist(actor, "Départ livraison"),
    ].slice(-80),
  });
}

export async function markDelivered(
  id: string,
  actor: Actor,
): Promise<DeliveryNote> {
  const existing = await getDeliveryNote(id);
  if (!existing) throw new Error("Bon de livraison introuvable");
  if (
    existing.status !== "en_livraison" &&
    existing.status !== "brouillon"
  ) {
    throw new Error("Statut incompatible pour marquer livré");
  }
  const signatures = existing.signatures.map((s) =>
    s.role === "livreur" && s.name
      ? { ...s, signed: true, signedAt: s.signedAt || nowIso() }
      : s,
  );
  return save({
    ...existing,
    status: "livre",
    signatures,
    history: [...existing.history, hist(actor, "Livraison effectuée")].slice(
      -80,
    ),
  });
}

export async function receiveDeliveryNote(
  id: string,
  input: {
    lines?: Array<Partial<DeliveryLine>>;
    reserves?: string;
    signatures?: DeliverySignature[];
    receiverName?: string;
    proofs?: DeliveryProof[];
    updateStock?: boolean;
  },
  actor: Actor,
): Promise<DeliveryNote> {
  const existing = await getDeliveryNote(id);
  if (!existing) throw new Error("Bon de livraison introuvable");
  if (
    existing.status !== "livre" &&
    existing.status !== "en_livraison" &&
    existing.status !== "ecart"
  ) {
    throw new Error("Réception impossible sur ce statut");
  }

  const lines = Array.isArray(input.lines)
    ? input.lines.map((l) => normalizeLine(l))
    : existing.lines.map((l) =>
        makeDeliveryLine({
          ...l,
          qtyReceived: l.qtyReceived || l.qtyDelivered,
        }),
      );

  let signatures = input.signatures
    ? normalizeSignatures(input.signatures)
    : existing.signatures;

  const receiverName =
    clean(input.receiverName, 120) ||
    signatures.find((s) => s.role === "receptionnaire")?.name ||
    actor.name;

  signatures = signatures.map((s) => {
    if (s.role === "receptionnaire") {
      return {
        ...s,
        name: receiverName,
        signed: true,
        signedAt: nowIso(),
      };
    }
    if (s.role === "livreur" && s.name && !s.signed) {
      return { ...s, signed: true, signedAt: s.signedAt || nowIso() };
    }
    return s;
  });

  const hasEcart =
    deliveryHasEcart(lines) || Boolean(clean(input.reserves, 4000));
  const reserves =
    input.reserves !== undefined
      ? clean(input.reserves, 4000)
      : existing.reserves;

  const proofs =
    input.proofs !== undefined
      ? [...existing.proofs, ...normalizeProofs(input.proofs)]
      : existing.proofs;

  let stockUpdated = existing.stockUpdated;
  const stockNotes: string[] = [];
  if (input.updateStock !== false && !existing.stockUpdated) {
    const siteId =
      clean(existing.siteId, 80) ||
      `SITE-${existing.siteName
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 24) || "SITE"}`;
    try {
      const articles = await listInventoryArticles(true);
      const bySku = new Map(
        articles.map((a) => [a.sku.toUpperCase(), a.id] as const),
      );
      for (const line of lines) {
        if (line.qtyReceived <= 0 || line.lineStatus === "refuse") continue;
        const articleId =
          clean(line.articleId, 40) ||
          (line.articleSku
            ? bySku.get(line.articleSku.toUpperCase()) || ""
            : "");
        if (!articleId) continue;
        await recordInventoryMovement(
          {
            kind: "entree",
            siteId,
            articleId,
            quantity: line.qtyReceived,
            note: `Réception BL ${existing.number}${
              line.lot ? ` · lot ${line.lot}` : ""
            }`,
            ref: existing.number,
          },
          actor,
        );
        stockNotes.push(line.label);
      }
      if (stockNotes.length) stockUpdated = true;
    } catch {
      // Réception OK même si le stock n’a pas pu être mis à jour
    }
  }

  return save({
    ...existing,
    siteId:
      existing.siteId ||
      `SITE-${existing.siteName
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 24)}`,
    lines,
    signatures,
    proofs,
    reserves,
    status: hasEcart ? "ecart" : "receptionne",
    receivedAt: nowIso(),
    receivedBy: actor.userId,
    receivedByName: receiverName,
    stockUpdated,
    history: [
      ...existing.history,
      hist(
        actor,
        hasEcart
          ? "Réception avec réserves / écarts"
          : "Réception conforme — signatures enregistrées",
      ),
      ...(stockNotes.length
        ? [
            hist(
              actor,
              `Stock mis à jour · ${stockNotes.length} article(s)`,
            ),
          ]
        : []),
    ].slice(-80),
  });
}
