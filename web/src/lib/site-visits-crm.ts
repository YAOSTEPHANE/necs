import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  normalizeVisit,
  type PhotoKind,
  type SitePhoto,
  type SiteVisit,
} from "@/lib/site-photos";
import { clampText } from "@/lib/security";

export type SiteVisitActor = {
  userId: string;
  name: string;
  role: UserRole;
};

export type StoredSiteVisit = SiteVisit & {
  agentUserId: string;
  createdAtMs: number;
  updatedAtMs: number;
};

const MAX_PHOTOS_PER_VISIT = 60;
const MAX_DATA_URL_CHARS = 700_000;
const MAX_VISIT_DATA_URL_CHARS = 8_000_000;

async function col() {
  const db = await getDb();
  const c = db.collection<StoredSiteVisit>("site_visits");
  await Promise.all([
    c.createIndex({ id: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ agentUserId: 1, date: -1 }).catch(() => undefined),
    c.createIndex({ date: -1, updatedAtMs: -1 }).catch(() => undefined),
  ]);
  return c;
}

function isAgentScoped(actor: SiteVisitActor): boolean {
  return actor.role === "nettoyeur";
}

function isAllowedPhotoUrl(url: string): boolean {
  if (url.startsWith("data:image/")) return url.length <= MAX_DATA_URL_CHARS;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.toLowerCase().endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

function sanitizePhoto(raw: unknown): SitePhoto | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const url = String(p.dataUrl ?? "");
  if (!isAllowedPhotoUrl(url)) return null;
  const kind: PhotoKind = p.kind === "after" ? "after" : "arrival";
  return {
    id: clampText(String(p.id ?? ""), 60),
    kind,
    dataUrl: url,
    takenAt: clampText(String(p.takenAt ?? ""), 40),
    note: clampText(String(p.note ?? ""), 500),
  };
}

function sanitizeVisit(raw: unknown): SiteVisit {
  if (!raw || typeof raw !== "object") throw new Error("Visite invalide");
  const v = raw as Record<string, unknown>;
  const id = clampText(String(v.id ?? ""), 60);
  if (!/^VIS-[\w-]+$/.test(id)) throw new Error("Identifiant de visite invalide");
  const site = clampText(String(v.site ?? ""), 200);
  const client = clampText(String(v.client ?? ""), 200);
  if (!site || !client) throw new Error("Site et client sont obligatoires.");
  const date = String(v.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date invalide");

  const photos = (Array.isArray(v.photos) ? v.photos : [])
    .map(sanitizePhoto)
    .filter((p): p is SitePhoto => p !== null && p.id !== "");
  if (photos.length > MAX_PHOTOS_PER_VISIT) {
    throw new Error(`Maximum ${MAX_PHOTOS_PER_VISIT} photos par visite.`);
  }
  const inlineChars = photos
    .filter((p) => p.dataUrl.startsWith("data:"))
    .reduce((n, p) => n + p.dataUrl.length, 0);
  if (inlineChars > MAX_VISIT_DATA_URL_CHARS) {
    throw new Error("Trop de photos non envoyées en ligne sur cette visite.");
  }

  const nullableLabel = (x: unknown) =>
    x === null || x === undefined || x === "" ? null : clampText(String(x), 40);

  return normalizeVisit({
    id,
    site,
    client,
    date,
    agent: clampText(String(v.agent ?? ""), 120),
    notes: clampText(String(v.notes ?? ""), 2000),
    status: "En cours",
    arrivalAt: nullableLabel(v.arrivalAt),
    afterAt: nullableLabel(v.afterAt),
    photos,
    updatedAt: clampText(String(v.updatedAt ?? ""), 40),
  });
}

async function findAgentUserIdByName(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const db = await getDb();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const user = await db
    .collection<{ id: string; name: string; role: UserRole }>("users")
    .findOne(
      { role: "nettoyeur", name: { $regex: `^${escaped}$`, $options: "i" } },
      { projection: { id: 1 } },
    );
  return user?.id ?? null;
}

export async function listSiteVisits(
  actor: SiteVisitActor,
): Promise<StoredSiteVisit[]> {
  const c = await col();
  const filter = isAgentScoped(actor) ? { agentUserId: actor.userId } : {};
  return c
    .find(filter, { projection: { _id: 0 } })
    .sort({ date: -1, updatedAtMs: -1 })
    .limit(500)
    .toArray();
}

export async function saveSiteVisit(
  actor: SiteVisitActor,
  raw: unknown,
): Promise<StoredSiteVisit> {
  const visit = sanitizeVisit(raw);
  const c = await col();
  const existing = await c.findOne({ id: visit.id });
  if (
    existing &&
    isAgentScoped(actor) &&
    existing.agentUserId !== actor.userId
  ) {
    throw new Error("Cette visite appartient à un autre agent.");
  }

  const now = Date.now();
  const agentScoped = isAgentScoped(actor);
  const agent = agentScoped ? actor.name : visit.agent || actor.name;
  let agentUserId = existing?.agentUserId ?? actor.userId;
  if (!agentScoped && (!existing || existing.agent !== agent)) {
    agentUserId = (await findAgentUserIdByName(agent)) ?? agentUserId;
  }
  const doc: StoredSiteVisit = {
    ...visit,
    agent,
    agentUserId,
    createdAtMs: existing?.createdAtMs ?? now,
    updatedAtMs: now,
  };
  await c.replaceOne({ id: doc.id }, doc, { upsert: true });
  return doc;
}

/** Premier jour du mois courant (heure du Cameroun), format YYYY-MM-DD. */
export function currentMonthStart(now = new Date()): string {
  const ym = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
  }).format(now);
  return `${ym}-01`;
}

export type PhotoPurgeResult = {
  before: string;
  visitsDeleted: number;
  photosDeleted: number;
  visitsKept: number;
};

/**
 * Supprime les visites terrain (et leurs photos Blob) antérieures à `before`.
 * Une visite dont les fichiers n’ont pas pu être effacés est conservée
 * pour être retentée au prochain passage.
 */
export async function purgeSiteVisitsBefore(
  before: string,
  deleteFiles: (urls: string[]) => Promise<void>,
): Promise<PhotoPurgeResult> {
  const c = await col();
  const result: PhotoPurgeResult = {
    before,
    visitsDeleted: 0,
    photosDeleted: 0,
    visitsKept: 0,
  };
  const failed = new Set<string>();
  for (;;) {
    const batch = await c
      .find(
        { date: { $lt: before }, id: { $nin: [...failed] } },
        { projection: { _id: 0, id: 1, photos: 1 } },
      )
      .limit(50)
      .toArray();
    if (batch.length === 0) break;
    for (const visit of batch) {
      const photos = visit.photos ?? [];
      try {
        await deleteFiles(photos.map((p) => p.dataUrl));
      } catch (error) {
        console.error("Purge photos terrain : échec Blob", visit.id, error);
        failed.add(visit.id);
        continue;
      }
      await c.deleteOne({ id: visit.id });
      result.visitsDeleted += 1;
      result.photosDeleted += photos.length;
    }
  }
  result.visitsKept = failed.size;
  return result;
}

export async function deleteSiteVisit(
  actor: SiteVisitActor,
  id: string,
): Promise<StoredSiteVisit | null> {
  const c = await col();
  const existing = await c.findOne({ id });
  if (!existing) return null;
  if (isAgentScoped(actor) && existing.agentUserId !== actor.userId) {
    throw new Error("Cette visite appartient à un autre agent.");
  }
  await c.deleteOne({ id });
  return existing;
}
