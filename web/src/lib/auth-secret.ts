/**
 * Lecture normalisée de AUTH_SECRET / NEXTAUTH_SECRET.
 * Tolère les guillemets éventuels dans .env (Edge + Node).
 */
export function readAuthSecretRaw(): string {
  const raw =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}
