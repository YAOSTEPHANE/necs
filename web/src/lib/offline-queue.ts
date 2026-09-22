"use client";

import {
  OFFLINE_DB,
  OFFLINE_META,
  OFFLINE_STORE,
  emitOfflineQueueUpdate,
  newOfflineId,
  type OfflineOpKind,
  type OfflineOpStatus,
  type OfflineQueueItem,
} from "@/lib/offline-shared";

type MetaRecord = {
  id: "device";
  saltB64: string;
  keyJwk: JsonWebKey;
  userId: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        const store = db.createObjectStore(OFFLINE_STORE, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(OFFLINE_META)) {
        db.createObjectStore(OFFLINE_META, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB"));
  });
}

function b64FromBuf(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function bufFromB64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function ensureCryptoKey(userId: string): Promise<CryptoKey> {
  const db = await openDb();
  const meta = await new Promise<MetaRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_META, "readonly");
    const req = tx.objectStore(OFFLINE_META).get("device");
    req.onsuccess = () => resolve(req.result as MetaRecord | undefined);
    req.onerror = () => reject(req.error);
  });

  if (meta?.keyJwk && meta.userId === userId) {
    return crypto.subtle.importKey(
      "jwk",
      meta.keyJwk,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`necs-offline:${userId}`),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120_000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", key);
  const next: MetaRecord = {
    id: "device",
    saltB64: b64FromBuf(salt.buffer),
    keyJwk: jwk,
    userId,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_META, "readwrite");
    tx.objectStore(OFFLINE_META).put(next);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

type StoredRow = {
  id: string;
  kind: OfflineOpKind;
  status: OfflineOpStatus;
  createdAt: string;
  occurredAt: string;
  userId: string;
  attempts: number;
  lastError: string;
  syncedAt: string | null;
  /** Payload chiffré (iv + ciphertext) */
  cipherB64: string;
  ivB64: string;
  serverResultJson: string | null;
};

async function encryptPayload(
  key: CryptoKey,
  payload: Record<string, unknown>,
): Promise<{ cipherB64: string; ivB64: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plain,
  );
  return { cipherB64: b64FromBuf(cipher), ivB64: b64FromBuf(iv.buffer) };
}

async function decryptPayload(
  key: CryptoKey,
  cipherB64: string,
  ivB64: string,
): Promise<Record<string, unknown>> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(bufFromB64(ivB64)) },
    key,
    bufFromB64(cipherB64),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as Record<string, unknown>;
}

async function rowToItem(
  row: StoredRow,
  key: CryptoKey,
): Promise<OfflineQueueItem> {
  const payload = await decryptPayload(key, row.cipherB64, row.ivB64);
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    createdAt: row.createdAt,
    occurredAt: row.occurredAt,
    userId: row.userId,
    payload,
    attempts: row.attempts,
    lastError: row.lastError,
    syncedAt: row.syncedAt,
    serverResult: row.serverResultJson
      ? (JSON.parse(row.serverResultJson) as Record<string, unknown>)
      : null,
  };
}

export async function listOfflineQueue(
  userId: string,
): Promise<OfflineQueueItem[]> {
  if (typeof indexedDB === "undefined") return [];
  const key = await ensureCryptoKey(userId);
  const db = await openDb();
  const rows = await new Promise<StoredRow[]>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readonly");
    const req = tx.objectStore(OFFLINE_STORE).getAll();
    req.onsuccess = () => resolve((req.result as StoredRow[]) || []);
    req.onerror = () => reject(req.error);
  });
  const mine = rows.filter((r) => r.userId === userId);
  const items = await Promise.all(mine.map((r) => rowToItem(r, key)));
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function enqueueOfflineOp(input: {
  userId: string;
  kind: OfflineOpKind;
  payload: Record<string, unknown>;
  occurredAt?: string;
  /** Réutiliser un id (idempotence locale) */
  id?: string;
}): Promise<OfflineQueueItem> {
  const id = input.id || newOfflineId();
  const createdAt = new Date().toISOString();
  const occurredAt = input.occurredAt || createdAt;
  const key = await ensureCryptoKey(input.userId);
  const { cipherB64, ivB64 } = await encryptPayload(key, input.payload);

  const row: StoredRow = {
    id,
    kind: input.kind,
    status: "pending",
    createdAt,
    occurredAt,
    userId: input.userId,
    attempts: 0,
    lastError: "",
    syncedAt: null,
    cipherB64,
    ivB64,
    serverResultJson: null,
  };

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    tx.objectStore(OFFLINE_STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  emitOfflineQueueUpdate();
  return rowToItem(row, key);
}

async function patchRow(
  id: string,
  patch: Partial<StoredRow>,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    const store = tx.objectStore(OFFLINE_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const cur = getReq.result as StoredRow | undefined;
      if (!cur) {
        resolve();
        return;
      }
      store.put({ ...cur, ...patch });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  emitOfflineQueueUpdate();
}

export async function discardOfflineOp(id: string): Promise<void> {
  await patchRow(id, { status: "discarded" });
}

export async function clearSyncedOfflineOps(userId: string): Promise<number> {
  const items = await listOfflineQueue(userId);
  const done = items.filter(
    (i) => i.status === "synced" || i.status === "discarded",
  );
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    const store = tx.objectStore(OFFLINE_STORE);
    for (const i of done) store.delete(i.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  emitOfflineQueueUpdate();
  return done.length;
}

async function postJson(
  url: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

async function syncOne(item: OfflineQueueItem): Promise<void> {
  await patchRow(item.id, {
    status: "syncing",
    attempts: item.attempts + 1,
  });

  try {
    let result: {
      ok: boolean;
      status: number;
      data: Record<string, unknown>;
    };

    switch (item.kind) {
      case "pointage_in":
        result = await postJson("/api/pointage", {
          action: "punch_in",
          clientRequestId: item.id,
          mode: item.payload.mode ?? "Mobile",
          date: item.payload.date,
          geo: item.payload.geo,
          userId: item.payload.userId,
        });
        break;
      case "pointage_out":
        result = await postJson("/api/pointage", {
          action: "punch_out",
          clientRequestId: item.id,
          mode: item.payload.mode ?? "Mobile",
          date: item.payload.date,
          geo: item.payload.geo,
          userId: item.payload.userId,
        });
        break;
      case "ot_checklist":
        result = await postJson("/api/work-orders", {
          action: "toggle_checklist",
          id: item.payload.workOrderId,
          itemId: item.payload.itemId,
          done: item.payload.done,
          clientRequestId: item.id,
        });
        break;
      case "ot_complete":
        result = await postJson("/api/work-orders", {
          action: "complete",
          id: item.payload.workOrderId,
          clientRequestId: item.id,
        });
        break;
      case "ot_anomaly":
        result = await postJson("/api/work-orders", {
          action: "anomaly",
          id: item.payload.workOrderId,
          note: item.payload.note,
          clientRequestId: item.id,
        });
        break;
      case "quality_start":
        result = await postJson("/api/quality-controls", {
          action: "start",
          id: item.payload.controlId,
          clientRequestId: item.id,
        });
        break;
      case "quality_score":
        result = await postJson("/api/quality-controls", {
          action: "score_item",
          id: item.payload.controlId,
          itemId: item.payload.itemId,
          score: item.payload.score,
          comment: item.payload.comment,
          photoUrl: item.payload.photoUrl,
          clientRequestId: item.id,
        });
        break;
      case "quality_photo":
        result = await postJson("/api/quality-controls", {
          action: "add_photo",
          id: item.payload.controlId,
          itemId: item.payload.itemId,
          url: item.payload.url,
          caption: item.payload.caption,
          clientRequestId: item.id,
        });
        break;
      case "quality_complete":
        result = await postJson("/api/quality-controls", {
          action: "complete",
          id: item.payload.controlId,
          ncNote: item.payload.ncNote,
          correctiveAction: item.payload.correctiveAction,
          correctiveDue: item.payload.correctiveDue,
          clientRequestId: item.id,
        });
        break;
      default: {
        const _exhaustive: never = item.kind;
        throw new Error(`Kind inconnu: ${_exhaustive}`);
      }
    }

    if (!result.ok) {
      const msg = String(result.data.error || `HTTP ${result.status}`);
      // Conflit métier déjà appliqué côté serveur
      if (
        result.status === 400 &&
        /déjà|doublon|duplicate|clôtur/i.test(msg)
      ) {
        await patchRow(item.id, {
          status: "conflict",
          lastError: msg,
          syncedAt: new Date().toISOString(),
          serverResultJson: JSON.stringify(result.data),
        });
        return;
      }
      await patchRow(item.id, { status: "error", lastError: msg });
      return;
    }

    // replay = même clientRequestId déjà appliqué → succès idempotent
    // duplicate sans replay = autre opération avait déjà fait l’état → conflit
    const replay = Boolean(result.data.replay);
    const duplicate = Boolean(result.data.duplicate) && !replay;
    await patchRow(item.id, {
      status: duplicate ? "conflict" : "synced",
      lastError: duplicate
        ? "Déjà présent serveur (unicité conservée, pas de doublon)"
        : "",
      syncedAt: new Date().toISOString(),
      serverResultJson: JSON.stringify(result.data),
    });
  } catch (error) {
    await patchRow(item.id, {
      status: "pending",
      lastError:
        error instanceof Error ? error.message : "Sync impossible (réseau)",
    });
  }
}

let syncLock = false;

export async function flushOfflineQueue(userId: string): Promise<{
  processed: number;
  synced: number;
  conflicts: number;
  errors: number;
}> {
  if (
    isForceOffline() ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  ) {
    return { processed: 0, synced: 0, conflicts: 0, errors: 0 };
  }
  if (syncLock) {
    return { processed: 0, synced: 0, conflicts: 0, errors: 0 };
  }
  syncLock = true;
  try {
    const items = (await listOfflineQueue(userId)).filter(
      (i) => i.status === "pending" || i.status === "error",
    );
    let synced = 0;
    let conflicts = 0;
    let errors = 0;
    for (const item of items) {
      await syncOne(item);
      const after = (await listOfflineQueue(userId)).find((x) => x.id === item.id);
      if (after?.status === "synced") synced += 1;
      else if (after?.status === "conflict") conflicts += 1;
      else if (after?.status === "error" || after?.status === "pending")
        errors += 1;
    }
    return {
      processed: items.length,
      synced,
      conflicts,
      errors,
    };
  } finally {
    syncLock = false;
  }
}

export function offlineQueueStats(items: OfflineQueueItem[]) {
  return {
    pending: items.filter((i) => i.status === "pending" || i.status === "error")
      .length,
    syncing: items.filter((i) => i.status === "syncing").length,
    synced: items.filter((i) => i.status === "synced").length,
    conflicts: items.filter((i) => i.status === "conflict").length,
    total: items.length,
  };
}

/** Préférence de test : forcer le mode dégradé sans couper le réseau. */
export const OFFLINE_FORCE_KEY = "necs_offline_force";

export function isForceOffline(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(OFFLINE_FORCE_KEY) === "1";
}

export function setForceOffline(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(OFFLINE_FORCE_KEY, "1");
  else window.localStorage.removeItem(OFFLINE_FORCE_KEY);
  emitOfflineQueueUpdate();
}

export function shouldUseOfflineQueue(): boolean {
  return isForceOffline() || !isBrowserOnlineSafe();
}

function isBrowserOnlineSafe(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}
