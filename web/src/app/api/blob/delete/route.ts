import { NextResponse } from "next/server";
import { deleteBlobByUrl, isBlobConfigured } from "@/lib/vercel-blob";
import { getServerSession } from "@/lib/session-server";
import {
  assertSameOrigin,
  clampText,
  isJsonRequest,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

function isAllowedBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return (
      host.endsWith(".public.blob.vercel-storage.com") ||
      host.endsWith(".blob.vercel-storage.com") ||
      host === "blob.vercel-storage.com"
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json(
      { error: "Content-Type application/json requis." },
      { status: 415 },
    );
  }

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!isBlobConfigured()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const body = (await request.json()) as { url?: string };
    const url = clampText(String(body.url || ""), 2048);
    if (!url) {
      return NextResponse.json({ error: "url manquante" }, { status: 400 });
    }
    if (!isAllowedBlobUrl(url)) {
      return NextResponse.json({ error: "URL Blob non autorisée." }, { status: 400 });
    }
    await deleteBlobByUrl(url);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[blob/delete]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Suppression échouée.") },
      { status: 400 },
    );
  }
}
