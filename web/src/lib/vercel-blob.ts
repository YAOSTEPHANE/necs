import { put, del, list } from "@vercel/blob";

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function safePathSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "file";
}

/** Upload serveur (fichiers < ~4.5 Mo). Préférer l’upload client pour le terrain. */
export async function putBlobFile(
  file: File | Blob,
  opts: { folder: string; filename: string },
): Promise<{ url: string; pathname: string }> {
  if (!isBlobConfigured()) {
    throw new Error("BLOB_READ_WRITE_TOKEN manquant");
  }
  const name = safePathSegment(opts.filename);
  const pathname = `necs/${safePathSegment(opts.folder)}/${Date.now()}-${name}`;
  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream",
  });
  return { url: blob.url, pathname: blob.pathname };
}

export async function deleteBlobByUrl(url: string): Promise<void> {
  if (!isBlobConfigured() || !url.includes("blob.vercel-storage.com")) return;
  await del(url);
}

export async function listNecsBlobs(prefix = "necs/") {
  if (!isBlobConfigured()) return { blobs: [] as Awaited<ReturnType<typeof list>>["blobs"] };
  return list({ prefix, limit: 100 });
}
