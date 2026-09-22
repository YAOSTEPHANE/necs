import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    // 200 volontaire : sonde de session (pas une action protégée).
    // Évite le bruit console "Failed to load resource 401" sur login.
    return NextResponse.json({ authenticated: false, session: null });
  }
  return NextResponse.json({
    authenticated: true,
    session: {
      ...session,
      loggedAt: Date.now(),
      // Aligner le cache UI sur l’expiration réelle du JWT (cookie).
      expiresAt:
        session.expiresAt ?? Date.now() + 4 * 60 * 60 * 1000,
    },
  });
}
