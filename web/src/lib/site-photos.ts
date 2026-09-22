export const NECS_SITE_PHOTOS_KEY = "necs_site_photos_v1";
export const NECS_SITE_PHOTOS_EVENT = "necs-site-photos-updated";

/** Avant = état initial ; Après = preuve une fois le nettoyage terminé. */
export type PhotoKind = "arrival" | "after";

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
  /** Horodatage de la 1re photo après nettoyage */
  afterAt: string | null;
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

function normalizePhotoKind(kind: string): PhotoKind {
  // Ancien libellé « departure » = preuve après nettoyage
  if (kind === "departure" || kind === "after") return "after";
  return "arrival";
}

function normalizeVisit(raw: SiteVisit & { departureAt?: string | null }): SiteVisit {
  const photos = (Array.isArray(raw.photos) ? raw.photos : []).map((p) => ({
    ...p,
    kind: normalizePhotoKind(p.kind),
  }));
  const hasAfter = photos.some((p) => p.kind === "after");
  const hasArrival = photos.some((p) => p.kind === "arrival");
  return {
    ...raw,
    photos,
    arrivalAt: hasArrival ? raw.arrivalAt ?? null : null,
    afterAt: hasAfter
      ? raw.afterAt ?? raw.departureAt ?? null
      : null,
    status: hasAfter ? "Terminé" : "En cours",
  };
}

function seedVisits(): SiteVisit[] {
  return [
    {
      id: "VIS-DEMO-001",
      site: "Immeuble Horizon ; Douala",
      client: "Société Exemple SA",
      date: todayIso(),
      agent: "Équipe terrain",
      notes: "Entretien quotidien bureaux & sanitaires",
      status: "En cours",
      arrivalAt: null,
      afterAt: null,
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
    const parsed = JSON.parse(raw) as Array<
      SiteVisit & { departureAt?: string | null }
    >;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seedVisits();
    }
    return parsed.map(normalizeVisit);
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
    afterAt: null,
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
  const afterAt =
    kind === "after" && !visit.afterAt ? nowLabel() : visit.afterAt;

  // La preuve après nettoyage clôture la visite (rôle nettoyeur)
  const status: SiteVisit["status"] = photos.some((p) => p.kind === "after")
    ? "Terminé"
    : "En cours";

  return {
    ...visit,
    photos,
    arrivalAt,
    afterAt,
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
  const hasAfter = photos.some((p) => p.kind === "after");
  return {
    ...visit,
    photos,
    arrivalAt: hasArrival ? visit.arrivalAt : null,
    afterAt: hasAfter ? visit.afterAt : null,
    status: hasAfter ? "Terminé" : "En cours",
    updatedAt: nowLabel(),
  };
}

export function countByKind(visit: SiteVisit, kind: PhotoKind): number {
  return visit.photos.filter((p) => p.kind === kind).length;
}

export function photoKindLabel(kind: PhotoKind): string {
  return kind === "after" ? "Après" : "Avant";
}

export function updateVisitMeta(
  visit: SiteVisit,
  patch: Partial<
    Pick<SiteVisit, "site" | "client" | "date" | "agent" | "notes">
  >,
): SiteVisit {
  return {
    ...visit,
    ...patch,
    site: (patch.site ?? visit.site).trim(),
    client: (patch.client ?? visit.client).trim(),
    agent: (patch.agent ?? visit.agent).trim(),
    notes: (patch.notes ?? visit.notes).trim(),
    updatedAt: nowLabel(),
  };
}

export function updatePhotoNote(
  visit: SiteVisit,
  photoId: string,
  note: string,
): SiteVisit {
  return {
    ...visit,
    photos: visit.photos.map((p) =>
      p.id === photoId ? { ...p, note: note.trim() } : p,
    ),
    updatedAt: nowLabel(),
  };
}

export function isTodayVisit(isoDate: string): boolean {
  return isoDate === todayIso();
}

export function visitNeedsProof(visit: SiteVisit): boolean {
  return countByKind(visit, "after") === 0;
}
