import { DOCUMENTS } from "@/lib/documents-catalog";

export type AdminNavItem = {
  href: string;
  label: string;
  code: string;
  description: string;
  group?: string;
};

export const ADMIN_DASHBOARD: AdminNavItem = {
  href: "/admin",
  label: "Tableau de bord",
  code: "BI",
  description: "Pilotage NECS",
};

export const ADMIN_SETTINGS: AdminNavItem = {
  href: "/admin/parametres",
  label: "Paramètres",
  code: "CFG",
  description: "Entreprise, utilisateurs, documents, site",
};

/** Documents métier dans le menu (plus sur le dashboard). */
export const ADMIN_DOC_NAV: AdminNavItem[] = DOCUMENTS.map((d) => ({
  href: `/admin/templates/${d.slug}`,
  label: d.title,
  code: d.id,
  description: d.subtitle,
  group: d.domain,
}));

export const ADMIN_NAV: AdminNavItem[] = [
  ADMIN_DASHBOARD,
  ADMIN_SETTINGS,
  ...ADMIN_DOC_NAV,
];

export const ADMIN_TOP_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/templates?domain=CRM", label: "Commercial" },
  { href: "/admin/templates?domain=OPS", label: "Opérations" },
  { href: "/admin/templates?domain=RH", label: "RH" },
  { href: "/admin/templates?domain=FIN", label: "Finance" },
  { href: "/admin/templates?domain=DIG", label: "Digital" },
  { href: "/admin/templates?domain=Q", label: "Qualité" },
] as const;
