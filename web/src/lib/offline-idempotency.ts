import { getDb } from "@/lib/mongo";

/**
 * Idempotence serveur pour la file offline (clientRequestId / OFF-…).
 * Rejeu du même id → replay:true, sans doublon métier.
 */

const COLLECTION = "ops_offline_idempotency";

type IdemRow = {
  key: string;
  scope: string;
  userId: string;
  resourceId: string;
  createdAt: string;
};

async function col() {
  const db = await getDb();
  const c = db.collection<IdemRow>(COLLECTION);
  void Promise.all([
    c.createIndex({ key: 1 }, { unique: true }).catch(() => undefined),
    c
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 })
      .catch(() => undefined),
  ]);
  return c;
}

function cleanKey(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function fullKey(scope: string, userId: string, clientRequestId: string) {
  return `${scope}:${userId}:${clientRequestId}`;
}

/** Si la clé existe déjà → rejeu (retourne resourceId). */
export async function findOfflineIdempotency(input: {
  clientRequestId: unknown;
  scope: string;
  userId: string;
}): Promise<{ resourceId: string } | null> {
  const id = cleanKey(input.clientRequestId);
  if (!id) return null;
  const row = await (await col()).findOne({
    key: fullKey(input.scope, input.userId, id),
  });
  return row ? { resourceId: row.resourceId } : null;
}

/** Enregistre la clé après succès métier (ignore course concurrente). */
export async function recordOfflineIdempotency(input: {
  clientRequestId: unknown;
  scope: string;
  userId: string;
  resourceId: string;
}): Promise<void> {
  const id = cleanKey(input.clientRequestId);
  if (!id || !input.resourceId) return;
  try {
    await (await col()).insertOne({
      key: fullKey(input.scope, input.userId, id),
      scope: input.scope,
      userId: input.userId,
      resourceId: input.resourceId,
      createdAt: new Date().toISOString(),
    });
  } catch {
    /* unique race — OK, déjà enregistré */
  }
}
