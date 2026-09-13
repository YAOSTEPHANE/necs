/**
 * Variables d’environnement base de données.
 * App = Vercel · MySQL = Hostinger (accès distant).
 */

function required(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(
      `Variable manquante : ${name}. Renseignez .env.local (dev) ou Vercel Environment Variables (prod).`,
    );
  }
  return value.trim();
}

export type DatabaseEnv = {
  url: string;
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
};

/** Lit la config MySQL Hostinger depuis l’environnement. */
export function getDatabaseEnv(): DatabaseEnv {
  const url = process.env.DATABASE_URL?.trim();

  if (url && url.startsWith("mysql")) {
    try {
      const parsed = new URL(url);
      return {
        url,
        host: parsed.hostname,
        port: Number(parsed.port || 3306),
        name: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        ssl: (process.env.DB_SSL ?? "true").toLowerCase() !== "false",
      };
    } catch {
      throw new Error("DATABASE_URL invalide (attendu : mysql://user:pass@host:3306/db)");
    }
  }

  const host = required("DB_HOST", process.env.DB_HOST);
  const port = Number(process.env.DB_PORT || 3306);
  const name = required("DB_NAME", process.env.DB_NAME);
  const user = required("DB_USER", process.env.DB_USER);
  const password = required("DB_PASSWORD", process.env.DB_PASSWORD);
  const ssl = (process.env.DB_SSL ?? "true").toLowerCase() !== "false";

  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(password);
  const built = `mysql://${encodedUser}:${encodedPass}@${host}:${port}/${name}`;

  return { url: built, host, port, name, user, password, ssl };
}

/** Indique si une config DB est présente (sans lever d’erreur). */
export function hasDatabaseConfig(): boolean {
  if (process.env.DATABASE_URL?.startsWith("mysql")) return true;
  return Boolean(
    process.env.DB_HOST &&
      process.env.DB_NAME &&
      process.env.DB_USER &&
      process.env.DB_PASSWORD,
  );
}
