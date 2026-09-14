import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import { insertLead, listLeads } from "@/lib/users-repo";
import {
  assertSameOrigin,
  clampText,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: "Service indisponible." },
      { status: 503 },
    );
  }
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.role !== "admin" && session.role !== "commercial") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const leads = await listLeads(80);
  return NextResponse.json({
    leads: leads.map((l) => ({
      name: String(l.name ?? "").slice(0, 120),
      company: String(l.company ?? "").slice(0, 120),
      email: String(l.email ?? "").slice(0, 180),
      phone: String(l.phone ?? "").slice(0, 40),
      subject: String(l.subject ?? "").slice(0, 160),
      message: String(l.message ?? "").slice(0, 4000),
      at: String(l.at ?? ""),
    })),
  });
}

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return NextResponse.json(
        { error: "Origine non autorisée." },
        { status: 403 },
      );
    }
    if (!isJsonRequest(request)) {
      return NextResponse.json(
        { error: "Content-Type application/json requis." },
        { status: 415 },
      );
    }

    const ip = clientIp(request);
    const rl = rateLimit(`leads:${ip}`, 8, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de messages. Réessayez plus tard." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      company?: string;
      email?: string;
      phone?: string;
      subject?: string;
      message?: string;
    };

    const name = clampText(String(body.name || ""), 120);
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    const company = clampText(String(body.company || ""), 120);
    const phone = clampText(String(body.phone || ""), 40);
    const subject = clampText(
      String(body.subject || "Demande de contact"),
      160,
    );
    const message = clampText(String(body.message || ""), 4000);

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nom et email requis." },
        { status: 400 },
      );
    }
    if (!email.includes("@") || email.length < 5) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }

    if (hasMongoConfig()) {
      await insertLead({
        name,
        company,
        email,
        phone,
        subject,
        message,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[leads]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Envoi impossible.") },
      { status: 500 },
    );
  }
}
