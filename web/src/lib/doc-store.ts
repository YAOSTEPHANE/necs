import type { DocRecord } from "@/lib/documents-catalog";

export type DocPhoto = {
  id: string;
  kind: string;
  dataUrl: string;
  takenAt: string;
};

export type StoredDocRecord = DocRecord & {
  values: Record<string, string>;
  checks: Record<string, boolean>;
  lineRows: string[][];
  photos: DocPhoto[];
};

function storageKey(slug: string): string {
  return `necs_doc_store_${slug}_v1`;
}

function normalizeRecord(
  r: Partial<StoredDocRecord> & DocRecord,
  seedLines: string[][] = [],
): StoredDocRecord {
  return {
    ...r,
    values: r.values ?? {},
    checks: r.checks ?? {},
    lineRows:
      Array.isArray(r.lineRows) && r.lineRows.length > 0
        ? r.lineRows
        : seedLines.map((row) => [...row]),
    photos: Array.isArray(r.photos) ? r.photos : [],
  };
}

export function loadDocStore(
  slug: string,
  seed: DocRecord[],
  seedLineRows: string[][] = [],
): StoredDocRecord[] {
  if (typeof window === "undefined") {
    return seed.map((r) => normalizeRecord(r, seedLineRows));
  }
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) {
      return seed.map((r) => normalizeRecord(r, seedLineRows));
    }
    const parsed = JSON.parse(raw) as StoredDocRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seed.map((r) => normalizeRecord(r, seedLineRows));
    }
    return parsed.map((r) => normalizeRecord(r, seedLineRows));
  } catch {
    return seed.map((r) => normalizeRecord(r, seedLineRows));
  }
}

export function saveDocStore(slug: string, records: StoredDocRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(slug), JSON.stringify(records));
}

export function createPhotoId(): string {
  return `PH-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}
