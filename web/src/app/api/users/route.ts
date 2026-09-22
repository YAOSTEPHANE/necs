import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  deleteDbUser,
  listUsers,
  setUserActive,
  toPublicUser,
  upsertDbUser,
} from "@/lib/users-repo";
import type { UserRole } from "@/lib/settings";
import {
  assertSameOrigin,
  clampText,
  isJsonRequest,
  isValidRole,
  safeErrorMessage,
  validatePasswordStrength,
} from "@/lib/security";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (session.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Accès admin requis" }, { status: 403 }),
    };
  }
  return { session };
}

export async function GET() {
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: "Service indisponible." },
      { status: 503 },
    );
  }
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const users = await listUsers();
  return NextResponse.json({ users: users.map(toPublicUser) });
}

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json(
      { error: "Content-Type application/json requis." },
      { status: 415 },
    );
  }
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: "Service indisponible." },
      { status: 503 },
    );
  }
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      email?: string;
      role?: string;
      phone?: string;
      password?: string;
      active?: boolean;
      employeeId?: string;
    };

    const name = clampText(String(body.name || ""), 120);
    const email = clampText(String(body.email || "").toLowerCase(), 180);
    const role = String(body.role || "");
    const phone = clampText(String(body.phone || ""), 40);
    const password =
      typeof body.password === "string" && body.password.length > 0
        ? body.password.slice(0, 200)
        : undefined;
    const employeeId = body.employeeId
      ? clampText(String(body.employeeId), 40)
      : undefined;
    const id = body.id ? clampText(String(body.id), 64) : undefined;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Nom, email et rôle sont obligatoires." },
        { status: 400 },
      );
    }
    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }
    if (!email.includes("@") || email.length < 5) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }
    if (password) {
      const pwdErr = validatePasswordStrength(password);
      if (pwdErr) {
        return NextResponse.json({ error: pwdErr }, { status: 400 });
      }
    }
    if (!id && !password) {
      return NextResponse.json(
        { error: "Mot de passe obligatoire pour un nouvel utilisateur." },
        { status: 400 },
      );
    }

    const user = await upsertDbUser({
      id,
      name,
      email,
      role: role as UserRole,
      phone,
      password,
      active: body.active !== false,
      employeeId,
    });
    return NextResponse.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("[users/POST]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Enregistrement impossible.") },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json(
      { error: "Content-Type application/json requis." },
      { status: 415 },
    );
  }
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: "Service indisponible." },
      { status: 503 },
    );
  }
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const body = (await request.json()) as { id?: string; active?: boolean };
    const id = clampText(String(body.id || ""), 64);
    if (!id) {
      return NextResponse.json({ error: "id manquant" }, { status: 400 });
    }
    if (typeof body.active !== "boolean") {
      return NextResponse.json(
        { error: "Champ active (boolean) requis." },
        { status: 400 },
      );
    }
    if (id === gate.session.userId && body.active === false) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas désactiver votre propre compte." },
        { status: 400 },
      );
    }
    const user = await setUserActive(id, body.active);
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    return NextResponse.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("[users/PATCH]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Mise à jour impossible.") },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: "Service indisponible." },
      { status: 503 },
    );
  }
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = clampText(searchParams.get("id") || "", 64);
    if (!id) {
      return NextResponse.json({ error: "id manquant" }, { status: 400 });
    }
    if (id === gate.session.userId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte." },
        { status: 400 },
      );
    }
    await deleteDbUser(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[users/DELETE]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Suppression impossible.") },
      { status: 400 },
    );
  }
}
