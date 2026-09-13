const REVOKE_MS = 2000;

function safeFilename(basename: string, fallback = "fichier-necs"): string {
  const cleaned = basename
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
  return cleaned || fallback;
}

function extensionFromMime(mime: string): string {
  const type = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/svg+xml") return "svg";
  if (type === "image/gif") return "gif";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  if (type === "text/csv") return "csv";
  if (type === "application/pdf") return "pdf";
  if (type === "application/json") return "json";
  if (type.includes("spreadsheet") || type.includes("excel")) return "xlsx";
  return "bin";
}

function withExtension(basename: string, mime: string): string {
  const base = safeFilename(basename);
  const ext = extensionFromMime(mime);
  if (base.toLowerCase().endsWith(`.${ext}`)) return base;
  return `${base}.${ext}`;
}

/** Déclenche le téléchargement d’une URL (blob:, data:, http…). */
export function downloadFromUrl(url: string, filename: string): void {
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Cœur Blob : crée un object URL, télécharge, puis révoque. */
export function downloadBlob(blob: Blob, filename: string): void {
  if (!blob || blob.size === 0) {
    throw new Error("Fichier vide — rien à télécharger");
  }
  const name = withExtension(filename, blob.type || "application/octet-stream");
  const objectUrl = URL.createObjectURL(blob);
  try {
    downloadFromUrl(objectUrl, name);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), REVOKE_MS);
  }
}

/** Convertit un data URL en Blob (plus fiable que le download data: direct). */
export function dataUrlToBlob(dataUrl: string): Blob {
  if (!dataUrl.startsWith("data:")) {
    throw new Error("Data URL invalide");
  }
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Data URL mal formée");

  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const mimeMatch = /^data:([^;]+)/i.exec(header);
  const mime = mimeMatch?.[1] || "application/octet-stream";
  const isBase64 = /;base64/i.test(header);

  if (isBase64) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }

  return new Blob([decodeURIComponent(payload)], { type: mime });
}

/** Télécharge du texte (CSV, JSON, TXT…) via Blob. */
export function downloadText(
  content: string,
  filename: string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  downloadBlob(blob, filename);
}

/** CSV avec BOM UTF-8 pour Excel. */
export function downloadCsv(
  rows: string[][],
  filename: string,
  separator = ";",
): void {
  const escapeCell = (value: string) => {
    const safe = value.replace(/"/g, '""');
    return new RegExp(`[${separator}"\\n]`).test(safe) ? `"${safe}"` : safe;
  };
  const body = rows.map((row) => row.map(escapeCell).join(separator)).join("\n");
  const csv = `\uFEFF${body}`;
  downloadText(csv, filename.endsWith(".csv") ? filename : `${filename}.csv`, "text/csv;charset=utf-8");
}

/** Télécharge une image (data URL, blob URL ou chemin public) via Blob. */
export async function downloadImage(
  src: string,
  basename: string,
): Promise<void> {
  if (!src) throw new Error("Aucune image à télécharger");

  const base = safeFilename(basename, "image-necs");

  if (src.startsWith("data:")) {
    const blob = dataUrlToBlob(src);
    downloadBlob(blob, base);
    return;
  }

  if (src.startsWith("blob:")) {
    const response = await fetch(src);
    if (!response.ok) throw new Error("Blob image inaccessible");
    downloadBlob(await response.blob(), base);
    return;
  }

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error("Impossible de récupérer l’image");
  }
  const blob = await response.blob();
  if (!blob.type.startsWith("image/") && blob.type !== "application/octet-stream") {
    // certains serveurs omettent le mime — on force jpeg/png selon extension
    const forced = src.toLowerCase().endsWith(".png")
      ? "image/png"
      : src.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    downloadBlob(new Blob([blob], { type: forced }), base);
    return;
  }
  downloadBlob(blob, base);
}

/** Télécharge plusieurs images en séquence (délai pour éviter les blocages navigateur). */
export async function downloadImages(
  items: Array<{ src: string; basename: string }>,
  delayMs = 350,
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await downloadImage(item.src, item.basename);
      ok += 1;
    } catch {
      failed += 1;
    }
    if (delayMs > 0) {
      await new Promise((r) => window.setTimeout(r, delayMs));
    }
  }
  return { ok, failed };
}
