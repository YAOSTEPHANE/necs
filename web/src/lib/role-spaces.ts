import type { UserRole } from "@/lib/settings";
import { DOCUMENTS } from "@/lib/documents-catalog";
import { ADMIN_DOC_NAV, type AdminNavItem } from "@/lib/admin-nav";

export type DocDomain = "DIG" | "CRM" | "OPS" | "Q" | "RH" | "FIN" | "BI";

export type RoleTool = {
  href: string;
  label: string;
  hint: string;
  tone: string;
};

export type RoleSpaceConfig = {
  role: UserRole;
  eyebrow: string;
  title: string;
  lead: string;
  domains: DocDomain[];
  tools: RoleTool[];
  accent: string;
};

/** Espaces métier (hors admin & nettoyeur qui a /admin/mon-espace). */
export const ROLE_SPACES: Partial<Record<UserRole, RoleSpaceConfig>> = {
  commercial: {
    role: "commercial",
    eyebrow: "Espace Commercial",
    title: "Pilotage CRM",
    lead: "Offres, devis, commandes et suivi client ; votre portefeuille au quotidien.",
    domains: ["CRM", "DIG"],
    tools: [
      {
        href: "/admin/templates?domain=CRM",
        label: "Bibliothèque commerciale",
        hint: "Tous les modèles CRM",
        tone: "#3ec8e8",
      },
    ],
    accent: "#1260a8",
  },
  ops: {
    role: "ops",
    eyebrow: "Espace Opérations",
    title: "Terrain & exécution",
    lead: "Ordres de travail, pointage équipes et preuves photo après nettoyage.",
    domains: ["OPS"],
    tools: [
      {
        href: "/admin/pointage",
        label: "Pointage",
        hint: "Présences employés",
        tone: "#3ec8e8",
      },
      {
        href: "/admin/terrain",
        label: "Photos terrain",
        hint: "Preuves après nettoyage",
        tone: "#8fd14a",
      },
    ],
    accent: "#4faf2a",
  },
  rh: {
    role: "rh",
    eyebrow: "Espace RH",
    title: "Équipes & dossiers",
    lead: "Recrutement, contrats agents, congés et suivi des présences.",
    domains: ["RH"],
    tools: [
      {
        href: "/admin/pointage",
        label: "Pointage RH",
        hint: "Contrôle des présences",
        tone: "#a78bfa",
      },
    ],
    accent: "#7c3aed",
  },
  finance: {
    role: "finance",
    eyebrow: "Espace Finance",
    title: "Facturation & règlements",
    lead: "Préfactures, factures, avoirs et suivi des encaissements.",
    domains: ["FIN"],
    tools: [
      {
        href: "/admin/templates?domain=FIN",
        label: "Documents finance",
        hint: "Tous les modèles FIN",
        tone: "#60a5fa",
      },
    ],
    accent: "#2563eb",
  },
  qualite: {
    role: "qualite",
    eyebrow: "Espace Qualité",
    title: "Contrôles & conformité",
    lead: "Contrôles qualité, non-conformités et preuves terrain.",
    domains: ["Q", "OPS"],
    tools: [
      {
        href: "/admin/terrain",
        label: "Photos terrain",
        hint: "Vérifier les preuves site",
        tone: "#fbbf24",
      },
    ],
    accent: "#d97706",
  },
};

export function getRoleSpace(role: UserRole): RoleSpaceConfig | null {
  return ROLE_SPACES[role] ?? null;
}

export function roleHomePath(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "nettoyeur") return "/admin/mon-espace";
  if (ROLE_SPACES[role]) return "/admin/espace";
  return "/admin";
}

export function domainsForRole(role: UserRole): DocDomain[] | "all" {
  if (role === "admin") return "all";
  if (role === "nettoyeur") return [];
  return ROLE_SPACES[role]?.domains ?? "all";
}

export function filterNavByRole(
  items: AdminNavItem[],
  role: UserRole,
): AdminNavItem[] {
  const domains = domainsForRole(role);
  if (domains === "all") return items;
  if (domains.length === 0) return [];
  return items.filter((item) =>
    domains.includes((item.group ?? "CRM") as DocDomain),
  );
}

export function modulesForRole(role: UserRole) {
  const domains = domainsForRole(role);
  if (domains === "all") return DOCUMENTS;
  if (domains.length === 0) return [];
  return DOCUMENTS.filter((d) => domains.includes(d.domain));
}

export function canAccessDocSlug(role: UserRole, slug: string): boolean {
  if (role === "admin") return true;
  if (role === "nettoyeur") return false;
  const doc = DOCUMENTS.find((d) => d.slug === slug);
  if (!doc) return false;
  const domains = domainsForRole(role);
  if (domains === "all") return true;
  return domains.includes(doc.domain);
}

export function isRoleSpacePath(pathname: string): boolean {
  return pathname.startsWith("/admin/espace");
}
