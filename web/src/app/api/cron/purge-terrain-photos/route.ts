import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import {
  currentMonthStart,
  purgeSiteVisitsBefore,
} from "@/lib/site-visits-crm";
import { deleteBlobsByUrl } from "@/lib/vercel-blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cron Vercel (1er du mois) : efface les photos terrain du mois écoulé. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!hasMongoConfig()) {
    return NextResponse.json({ error: "Base de données indisponible" }, { status: 503 });
  }
  const result = await purgeSiteVisitsBefore(currentMonthStart(), deleteBlobsByUrl);
  console.log("Purge photos terrain", result);
  return NextResponse.json(result);
}
