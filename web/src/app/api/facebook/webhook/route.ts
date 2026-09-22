import { NextResponse } from "next/server";
import {
  processFacebookWebhook,
  verifyFacebookSignature,
  verifyFacebookWebhookChallenge,
} from "@/lib/facebook-leads";

export const runtime = "nodejs";

/**
 * Webhook Meta Lead Ads (officiel).
 * GET  — vérification hub.challenge
 * POST — événements leadgen → CRM
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = verifyFacebookWebhookChallenge({
    mode: url.searchParams.get("hub.mode"),
    verifyToken: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
  });
  if (challenge == null) {
    return NextResponse.json({ error: "Vérification webhook refusée" }, { status: 403 });
  }
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyFacebookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  try {
    const result = await processFacebookWebhook(
      body as Parameters<typeof processFacebookWebhook>[0],
    );
    // Meta attend 200 rapidement en succès
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[facebook/webhook]", error);
    // 503 → Meta retente (évite la perte silencieuse de leads)
    return NextResponse.json(
      { ok: false, error: "Traitement temporairement indisponible" },
      { status: 503 },
    );
  }
}
