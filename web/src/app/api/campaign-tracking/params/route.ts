import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getCampaignTrackingConfig } from "@/lib/campaign-tracking";
import { DEFAULT_TRACKING_PARAMS } from "@/lib/campaign-tracking-shared";

export const runtime = "nodejs";

/**
 * Endpoint public : uniquement les noms de query params de tracking.
 * Permet aux formulaires site de lire la config marketing sans auth.
 */
export async function GET() {
  if (!hasMongoConfig()) {
    return NextResponse.json({ params: DEFAULT_TRACKING_PARAMS });
  }
  try {
    const config = await getCampaignTrackingConfig();
    return NextResponse.json(
      { params: config.params },
      {
        headers: {
          "Cache-Control": "public, max-age=60",
        },
      },
    );
  } catch {
    return NextResponse.json({ params: DEFAULT_TRACKING_PARAMS });
  }
}
