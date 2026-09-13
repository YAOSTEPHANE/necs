import { NextResponse } from "next/server";
import { isBlobConfigured } from "@/lib/vercel-blob";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    configured: isBlobConfigured(),
    provider: "vercel-blob",
  });
}
