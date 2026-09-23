import "server-only";

import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var __necsMongoClientPromise: Promise<MongoClient> | undefined;
}

function resolveMongoUri(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url && (url.startsWith("mongodb://") || url.startsWith("mongodb+srv://"))) {
    return url;
  }
  throw new Error(
    "DATABASE_URL MongoDB manquant. Exemple : mongodb+srv://user:pass@cluster/necs",
  );
}

export function hasMongoConfig(): boolean {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  return url.startsWith("mongodb://") || url.startsWith("mongodb+srv://");
}

function getClientPromise(): Promise<MongoClient> {
  if (!global.__necsMongoClientPromise) {
    const client = new MongoClient(resolveMongoUri(), {
      maxPoolSize: 32,
    });
    global.__necsMongoClientPromise = client.connect();
  }
  return global.__necsMongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const fromUrl = process.env.DATABASE_URL?.trim();
  let dbName = process.env.DB_NAME?.trim() || "necs";
  if (fromUrl) {
    try {
      const parsed = new URL(fromUrl);
      const path = parsed.pathname.replace(/^\//, "");
      if (path) dbName = path.split("?")[0] || dbName;
    } catch {
      /* ignore */
    }
  }
  return client.db(dbName);
}
