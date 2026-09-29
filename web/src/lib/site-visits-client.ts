"use client";

import {
  type SiteVisit,
  loadPendingSiteVisits,
  normalizeVisit,
  notifySiteVisitsChanged,
  savePendingSiteVisits,
} from "@/lib/site-photos";
import {
  dataUrlToFile,
  isVercelBlobAvailable,
  uploadImageToVercelBlob,
} from "@/lib/vercel-blob-client";

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchSiteVisits(): Promise<SiteVisit[]> {
  const res = await fetch("/api/site-visits", { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, "Chargement des visites impossible"));
  const data = (await res.json()) as { visits?: SiteVisit[] };
  return (data.visits ?? []).map(normalizeVisit);
}

class SiteVisitHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function postSiteVisit(visit: SiteVisit): Promise<SiteVisit> {
  const res = await fetch("/api/site-visits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visit }),
  });
  if (!res.ok) {
    throw new SiteVisitHttpError(
      await readError(res, "Enregistrement impossible"),
      res.status,
    );
  }
  const data = (await res.json()) as { visit: SiteVisit };
  return normalizeVisit(data.visit);
}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  );
}

function queuePending(visit: SiteVisit): void {
  const pending = loadPendingSiteVisits().filter((v) => v.id !== visit.id);
  savePendingSiteVisits([visit, ...pending]);
}

/**
 * Enregistre la visite sur le serveur. Sans réseau, elle est mise en attente
 * sur l’appareil et synchronisée plus tard (`syncPendingSiteVisits`).
 */
export async function saveSiteVisitRemote(
  visit: SiteVisit,
): Promise<{ visit: SiteVisit; queued: boolean }> {
  try {
    const saved = await postSiteVisit(visit);
    notifySiteVisitsChanged();
    return { visit: saved, queued: false };
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    queuePending(visit);
    notifySiteVisitsChanged();
    return { visit, queued: true };
  }
}

export async function deleteSiteVisitRemote(id: string): Promise<void> {
  const res = await fetch(`/api/site-visits?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(await readError(res, "Suppression impossible"));
  }
  savePendingSiteVisits(loadPendingSiteVisits().filter((v) => v.id !== id));
  notifySiteVisitsChanged();
}

async function uploadInlinePhotos(visit: SiteVisit): Promise<SiteVisit> {
  if (!visit.photos.some((p) => p.dataUrl.startsWith("data:"))) return visit;
  if (!(await isVercelBlobAvailable())) return visit;
  const photos = [];
  for (const photo of visit.photos) {
    if (!photo.dataUrl.startsWith("data:")) {
      photos.push(photo);
      continue;
    }
    try {
      const file = dataUrlToFile(photo.dataUrl, `terrain-${photo.id}.jpg`);
      const url = await uploadImageToVercelBlob(file, "terrain");
      photos.push({ ...photo, dataUrl: url });
    } catch {
      photos.push(photo);
    }
  }
  return { ...visit, photos };
}

/**
 * Envoie au serveur les visites restées sur l’appareil (hors ligne ou ancien
 * stockage local). `keep` permet d’ignorer les visites d’un autre agent sur
 * un téléphone partagé.
 */
export async function syncPendingSiteVisits(
  keep: (visit: SiteVisit) => boolean = () => true,
): Promise<number> {
  const pending = loadPendingSiteVisits();
  if (pending.length === 0) return 0;
  let synced = 0;
  const remaining: SiteVisit[] = [];
  for (const visit of pending) {
    if (!keep(visit)) {
      remaining.push(visit);
      continue;
    }
    try {
      await postSiteVisit(await uploadInlinePhotos(visit));
      synced += 1;
    } catch (error) {
      const rejected =
        error instanceof SiteVisitHttpError && error.status === 400;
      if (!rejected) remaining.push(visit);
    }
  }
  savePendingSiteVisits(remaining);
  if (synced > 0) notifySiteVisitsChanged();
  return synced;
}
