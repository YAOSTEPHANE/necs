import type { AdminUser, UserRole } from "@/lib/settings";
import { ROLE_LABELS } from "@/lib/settings";
import { getDb, hasMongoConfig } from "@/lib/mongo";
import { hashPassword } from "@/lib/password";

export type DbUser = {
  _id?: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  passwordHash: string;
  active: boolean;
  lastLogin: string;
  employeeId?: string;
  createdAt: number;
  updatedAt: number;
};

export type PublicUser = Omit<AdminUser, "password"> & { password?: string };

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NE";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function toPublicUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    active: user.active,
    lastLogin: user.lastLogin,
    password: "",
    ...(user.employeeId ? { employeeId: user.employeeId } : {}),
  };
}

export function sessionFieldsFromUser(user: DbUser) {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] ?? user.role,
    initials: initialsFromName(user.name),
    ...(user.employeeId ? { employeeId: user.employeeId } : {}),
  };
}

async function usersCollection() {
  const db = await getDb();
  const col = db.collection<DbUser>("users");
  await col.createIndex({ email: 1 }, { unique: true });
  await col.createIndex({ id: 1 }, { unique: true });
  return col;
}

export async function ensureSeedAdmin(): Promise<void> {
  if (!hasMongoConfig()) return;
  const col = await usersCollection();
  const count = await col.countDocuments();
  if (count > 0) return;

  const email = (
    process.env.ADMIN_BOOTSTRAP_EMAIL ||
    "direction@necs.cm"
  )
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();
  if (!password || password.length < 8) {
    console.warn(
      "[necs-auth] Aucun utilisateur en base. Définissez ADMIN_BOOTSTRAP_PASSWORD (≥8) pour créer le compte admin initial.",
    );
    return;
  }

  const now = Date.now();
  const passwordHash = await hashPassword(password);
  await col.insertOne({
    id: "USR-001",
    name: process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "Direction NECS",
    email,
    role: "admin",
    phone: "",
    passwordHash,
    active: true,
    lastLogin: "Jamais",
    createdAt: now,
    updatedAt: now,
  });
  console.info("[necs-auth] Compte admin bootstrap créé :", email);
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  await ensureSeedAdmin();
  const col = await usersCollection();
  return col.findOne({ email: email.trim().toLowerCase() });
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const col = await usersCollection();
  return col.findOne({ id });
}

export async function listUsers(): Promise<DbUser[]> {
  await ensureSeedAdmin();
  const col = await usersCollection();
  return col.find({}).sort({ id: 1 }).toArray();
}

export async function nextDbUserId(): Promise<string> {
  const users = await listUsers();
  let max = 0;
  for (const u of users) {
    const n = Number(u.id.replace(/\D/g, ""));
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return `USR-${String(max + 1).padStart(3, "0")}`;
}

export async function upsertDbUser(input: {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  password?: string;
  active: boolean;
  employeeId?: string;
}): Promise<DbUser> {
  const col = await usersCollection();
  const email = input.email.trim().toLowerCase();
  const now = Date.now();
  const existing = input.id
    ? await col.findOne({ id: input.id })
    : await col.findOne({ email });

  if (existing) {
    const passwordHash =
      input.password && input.password.trim().length > 0
        ? await hashPassword(input.password.trim())
        : existing.passwordHash;
    const next: DbUser = {
      ...existing,
      name: input.name.trim(),
      email,
      role: input.role,
      phone: input.phone.trim(),
      passwordHash,
      active: input.active,
      updatedAt: now,
      ...(input.employeeId !== undefined
        ? { employeeId: input.employeeId || undefined }
        : {}),
    };
    await col.updateOne({ id: existing.id }, { $set: next });
    return next;
  }

  if (!input.password || input.password.trim().length < 8) {
    throw new Error("Mot de passe obligatoire (min. 8 caractères).");
  }

  const id = input.id || (await nextDbUserId());
  const doc: DbUser = {
    id,
    name: input.name.trim(),
    email,
    role: input.role,
    phone: input.phone.trim(),
    passwordHash: await hashPassword(input.password.trim()),
    active: input.active,
    lastLogin: "Jamais",
    createdAt: now,
    updatedAt: now,
    ...(input.employeeId ? { employeeId: input.employeeId } : {}),
  };
  await col.insertOne(doc);
  return doc;
}

export async function deleteDbUser(id: string): Promise<void> {
  if (id === "USR-001") {
    throw new Error("Le compte administrateur principal ne peut pas être supprimé.");
  }
  const col = await usersCollection();
  await col.deleteOne({ id });
}

export async function touchLastLogin(id: string): Promise<void> {
  const col = await usersCollection();
  await col.updateOne(
    { id },
    {
      $set: {
        lastLogin: new Date().toLocaleString("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        }),
        updatedAt: Date.now(),
      },
    },
  );
}

export async function insertLead(lead: {
  name: string;
  company: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<void> {
  const db = await getDb();
  await db.collection("leads").insertOne({
    ...lead,
    at: new Date().toISOString(),
    createdAt: Date.now(),
  });
}

export async function listLeads(limit = 50) {
  const db = await getDb();
  return db
    .collection("leads")
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
