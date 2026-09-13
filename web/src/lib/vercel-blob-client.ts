"use client";

import { upload } from "@vercel/blob/client";

export type BlobUploadFolder =
  | "terrain"
  | "documents"
  | "branding"
  | "site";

function safeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "image.jpg";
}

/** Convertit un data URL en File (pour upload Blob après optimisation canvas). */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Data URL invalide");
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const mime = (/^data:([^;]+)/i.exec(header)?.[1]) || "image/jpeg";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

let blobAvailableCache: boolean | null = null;

/** Vérifie si le store Blob Vercel est configuré côté serveur. */
export async function isVercelBlobAvailable(): Promise<boolean> {
  if (blobAvailableCache != null) return blobAvailableCache;
  try {
    const res = await fetch("/api/blob/status", { cache: "no-store" });
    if (!res.ok) {
      blobAvailableCache = false;
      return false;
    }
    const data = (await res.json()) as { configured?: boolean };
    blobAvailableCache = Boolean(data.configured);
    return blobAvailableCache;
  } catch {
    blobAvailableCache = false;
    return false;
  }
}

/**
 * Upload une image vers Vercel Blob (direct client).
 * Retourne l’URL publique https://….blob.vercel-storage.com/…
 */
export async function uploadImageToVercelBlob(
  file: File,
  folder: BlobUploadFolder,
): Promise<string> {
  const pathname = `necs/${folder}/${Date.now()}-${safeName(file.name)}`;
  const result = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
    contentType: file.type || "image/jpeg",
  });
  return result.url;
}

/**
 * Optimise l’image puis tente Blob Vercel ; sinon conserve le data URL local.
 */
export async function persistOptimizedImage(opts: {
  file: File;
  folder: BlobUploadFolder;
  maxSize: number;
  forceJpeg?: boolean;
  quality?: number;
  optimize: (
    file: File,
    maxSize: number,
    options?: { forceJpeg?: boolean; quality?: number },
  ) => Promise<string>;
}): Promise<{ url: string; via: "blob" | "data" }> {
  const dataUrl = await opts.optimize(opts.file, opts.maxSize, {
    forceJpeg: opts.forceJpeg,
    quality: opts.quality,
  });

  const available = await isVercelBlobAvailable();
  if (!available) {
    return { url: dataUrl, via: "data" };
  }

  try {
    const ext = opts.forceJpeg ? "jpg" : "img";
    const file = dataUrlToFile(dataUrl, `${opts.folder}-${Date.now()}.${ext}`);
    const url = await uploadImageToVercelBlob(file, opts.folder);
    return { url, via: "blob" };
  } catch (err) {
    console.warn("Vercel Blob indisponible, fallback data URL", err);
    return { url: dataUrl, via: "data" };
  }
}

export async function deleteVercelBlob(url: string): Promise<void> {
  if (!url.includes("blob.vercel-storage.com")) return;
  await fetch("/api/blob/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}
