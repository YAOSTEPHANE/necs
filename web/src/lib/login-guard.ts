import { getDb, hasMongoConfig } from "@/lib/mongo";

const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

type AttemptDoc = {
  key: string;
  fails: number;
  firstAt: number;
  lockedUntil?: number;
  updatedAt: number;
};

async function attempts() {
  const db = await getDb();
  const col = db.collection<AttemptDoc>("auth_attempts");
  await col.createIndex({ key: 1 }, { unique: true });
  return col;
}

export async function checkLoginLock(
  key: string,
): Promise<{ locked: boolean; retryAfterSec?: number }> {
  if (!hasMongoConfig()) return { locked: false };
  const col = await attempts();
  const doc = await col.findOne({ key });
  if (!doc?.lockedUntil) return { locked: false };
  const now = Date.now();
  if (doc.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSec: Math.ceil((doc.lockedUntil - now) / 1000),
    };
  }
  return { locked: false };
}

export async function registerLoginFailure(key: string): Promise<{
  locked: boolean;
  remaining: number;
  retryAfterSec?: number;
}> {
  if (!hasMongoConfig()) {
    return { locked: false, remaining: LOCK_AFTER };
  }
  const col = await attempts();
  const now = Date.now();
  const existing = await col.findOne({ key });

  if (existing?.lockedUntil && existing.lockedUntil > now) {
    return {
      locked: true,
      remaining: 0,
      retryAfterSec: Math.ceil((existing.lockedUntil - now) / 1000),
    };
  }

  const inWindow =
    existing && existing.firstAt > now - WINDOW_MS ? existing.fails : 0;
  const fails = inWindow + 1;
  const shouldLock = fails >= LOCK_AFTER;

  if (shouldLock) {
    await col.updateOne(
      { key },
      {
        $set: {
          key,
          fails,
          firstAt: inWindow > 0 && existing ? existing.firstAt : now,
          updatedAt: now,
          lockedUntil: now + LOCK_MS,
        },
      },
      { upsert: true },
    );
    return {
      locked: true,
      remaining: 0,
      retryAfterSec: Math.ceil(LOCK_MS / 1000),
    };
  }

  await col.updateOne(
    { key },
    {
      $set: {
        key,
        fails,
        firstAt: inWindow > 0 && existing ? existing.firstAt : now,
        updatedAt: now,
      },
      $unset: { lockedUntil: "" },
    },
    { upsert: true },
  );

  return { locked: false, remaining: Math.max(0, LOCK_AFTER - fails) };
}

export async function clearLoginFailures(key: string): Promise<void> {
  if (!hasMongoConfig()) return;
  const col = await attempts();
  await col.deleteOne({ key });
}
