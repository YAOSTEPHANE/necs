import { compare, hash } from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ROUNDS);
}

export async function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash) return false;
  return compare(plain, passwordHash);
}
