export const NECS_SITE_PHOTOS_KEY = "necs_site_photos_v1";
export const NECS_SITE_PHOTOS_EVENT = "necs-site-photos-updated";

export type PhotoKind = "arrival" | "departure";

export type SitePhoto = {
  id: string;
  kind: PhotoKind;
  dataUrl: string;
  takenAt: string;
  note: string;
};

export type SiteVisit = {
  id: string;
  site: string;
  client: string;
  date: string;
  agent: string;
  notes: string;
  status: "En cours" | "Terminé";
  arrivalAt: string | null;
  departureAt: string | null;
  photos: SitePhoto[];
  updatedAt: string;
};

function nowLabel(): string {
  return new Date().toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createVisitId(): string {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
  ].join("");
  return `VIS-${stamp}-${Math.floor(Math.random() * 90 + 10)}`;
}

export function createPhotoId(): string {
  return `PH-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

function seedVisits(): SiteVisit[] {
  return [
    {
      id: "VIS-DEMO-001",
      site: "Immeuble Horizon — Douala",
      client: "Société Exemple SA",
      date: todayIso(),
      agent: "Équipe terrain",
      notes: "Entretien quotidien bureaux & sanitaires",
      status: "En cours",
      arrivalAt: null,
      departureAt: null,
      photos: [],
      updatedAt: nowLabel(),
    },
  ];
}

export function loadSiteVisits(): SiteVisit[] {
  if (typeof window === "undefined") return seedVisits();
  try {
    const raw = localStorage.getItem(NECS_SITE_PHOTOS_KEY);
    if (!raw) return seedVisits();
    const parsed = JSON.parse(raw) as SiteVisit[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seedVisits();
    }
    return parsed.map((v) => ({
      ...v,
      photos: Array.isArray(v.photos) ? v.photos : [],
      arrivalAt: v.arrivalAt ?? null,
      departureAt: v.departureAt ?? null,
    }));
  } catch {
    return seedVisits();
  }
}

export function saveSiteVisits(visits: SiteVisit[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NECS_SITE_PHOTOS_KEY, JSON.stringify(visits));
  window.dispatchEvent(new Event(NECS_SITE_PHOTOS_EVENT));
}

export function emptyVisit(agent: string): SiteVisit {
  return {
    id: createVisitId(),
    site: "",
    client: "",
    date: todayIso(),
    agent: agent || "Agent terrain",
    notes: "",
    status: "En cours",
    arrivalAt: null,
    departureAt: null,
    photos: [],
    updatedAt: nowLabel(),
  };
}

export function addPhotoToVisit(
  visit: SiteVisit,
  kind: PhotoKind,
  dataUrl: string,
  note = "",
): SiteVisit {
  const photo: SitePhoto = {
    id: createPhotoId(),
    kind,
    dataUrl,
    takenAt: nowLabel(),
    note,
  };
  const photos = [...visit.photos, photo];
  const arrivalAt =
    kind === "arrival" && !visit.arrivalAt ? nowLabel() : visit.arrivalAt;
  const departureAt =
    kind === "departure" && !visit.departureAt
      ? nowLabel()
      : visit.departureAt;

  let status = visit.status;
  if (
    photos.some((p) => p.kind === "arrival") &&
    photos.some((p) => p.kind === "departure")
  ) {
    status = "Terminé";
  }

  return {
    ...visit,
    photos,
    arrivalAt,
    departureAt,
    status,
    updatedAt: nowLabel(),
  };
}

export function removePhotoFromVisit(
  visit: SiteVisit,
  photoId: string,
): SiteVisit {
  const photos = visit.photos.filter((p) => p.id !== photoId);
  const hasArrival = photos.some((p) => p.kind === "arrival");
  const hasDeparture = photos.some((p) => p.kind === "departure");
  return {
    ...visit,
    photos,
    arrivalAt: hasArrival ? visit.arrivalAt : null,
    departureAt: hasDeparture ? visit.departureAt : null,
    status: hasArrival && hasDeparture ? "Terminé" : "En cours",
    updatedAt: nowLabel(),
  };
}

export function countByKind(visit: SiteVisit, kind: PhotoKind): number {
  return visit.photos.filter((p) => p.kind === kind).length;
}
