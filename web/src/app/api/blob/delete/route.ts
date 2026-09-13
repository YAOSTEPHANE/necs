import { NextResponse } from "next/server";
import { deleteBlobByUrl, isBlobConfigured } from "@/lib/vercel-blob";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isBlobConfigured()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url) {
      return NextResponse.json({ error: "url manquante" }, { status: 400 });
    }
    await deleteBlobByUrl(body.url);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Suppression échouée" },
      { status: 400 },
    );
  }
}
