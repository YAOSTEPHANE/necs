import { DOCUMENTS } from "@/lib/documents-catalog";
import type { UserRole } from "@/lib/settings";

export type NavIconId =
  | "home"
  | "space"
  | "mail"
  | "contact"
  | "user"
  | "visit"
  | "quote"
  | "offer"
  | "chart"
  | "contract"
  | "folder"
  | "calendar"
  | "clipboard"
  | "package"
  | "checklist"
  | "quality"
  | "alert"
  | "briefcase"
  | "users"
  | "clock"
  | "interview"
  | "pen"
  | "camera"
  | "report"
  | "library"
  | "settings"
  | "invoice"
  | "cart";

export type AdminNavItem = {
  href: string;
  label: string;
  code: string;
  description: string;
  group?: string;
  /** Liens applicatifs (hors fiches documents). */
  kind?: "app" | "doc";
  /** Rôles autorisés ; absent = tous sauf nettoyeur (géré à part). */
  roles?: UserRole[];
  icon?: NavIconId;
  badgeKey?: "leads";
  match?: "exact" | "prefix";
  /** Libellé court collapsible / agent. */
  shortLabel?: string;
};

export const GROUP_LABEL: Record<string, string> = {
  DIG: "Digital",
  CRM: "Commercial",
  OPS: "Opérations",
  Q: "Qualité",
  RH: "Ressources humaines",
  FIN: "Finance",
  BI: "Pilotage",
  CFG: "Configuration",
  SPC: "Raccourcis",
};

export const GROUP_TONE: Record<string, string> = {
  CRM: "#3ec8e8",
  OPS: "#1570b8",
  Q: "#1260a8",
  RH: "#0a3a72",
  FIN: "#60a5fa",
  DIG: "#38bdf8",
  BI: "#64748b",
  CFG: "#94a3b8",
  SPC: "#8fd14a",
};

/** Ordre d’affichage des sections sidebar (hubs). */
export const GROUP_ORDER = ["DIG", "CRM", "OPS", "Q", "RH", "FIN", "BI"];

/** Sections sidebar complètes : raccourcis → domaines → config. */
export const SIDEBAR_SECTION_ORDER = [
  "SPC",
  "DIG",
  "CRM",
  "OPS",
  "Q",
  "RH",
  "FIN",
  "BI",
  "CFG",
] as const;

export type SidebarSectionId = (typeof SIDEBAR_SECTION_ORDER)[number];

export type SidebarSection = {
  id: SidebarSectionId;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_DASHBOARD: AdminNavItem = {
  href: "/admin",
  label: "Tableau de bord",
  code: "SPC",
  description: "Pilotage & synthèse",
  kind: "app",
  roles: ["admin"],
  icon: "home",
  match: "exact",
  shortLabel: "Accueil",
};

export const ADMIN_SETTINGS: AdminNavItem = {
  href: "/admin/parametres",
  label: "Paramètres",
  code: "CFG",
  description: "Entreprise & marque",
  kind: "app",
  roles: ["admin"],
  icon: "settings",
  match: "prefix",
  shortLabel: "Config",
};

/**
 * Applications Accueil — hubs métier uniquement (pas de doublons d’onglets CRM).
 * Ordre : Digital → CRM → Ops → Qualité → RH → Finance → Pilotage → Config.
 */
export const ADMIN_HOME_APPS: AdminNavItem[] = [
  ADMIN_DASHBOARD,
  {
    href: "/admin/espace",
    label: "Mon espace",
    code: "SPC",
    description: "Espace métier",
    kind: "app",
    roles: ["commercial", "marketing", "ops", "rh", "manager", "finance", "qualite"],
    icon: "space",
    match: "prefix",
    shortLabel: "Espace",
  },
  {
    href: "/admin/demandes",
    label: "Demandes digitales",
    code: "DIG",
    description: "Leads, messages, intégrations, campagnes, consentements",
    kind: "app",
    roles: ["admin", "commercial", "marketing", "qualite"],
    icon: "mail",
    badgeKey: "leads",
    match: "prefix",
    shortLabel: "Demandes",
  },
  {
    href: "/admin/commercial",
    label: "CRM",
    code: "CRM",
    description: "Prospect → besoin → visite → chiffrage → offre → BC → contrat",
    kind: "app",
    roles: ["admin", "commercial", "ops", "finance", "manager", "qualite"],
    icon: "briefcase",
    match: "prefix",
    shortLabel: "CRM",
  },
  {
    href: "/admin/clients",
    label: "Clients",
    code: "CRM",
    description: "Fiches & travaux locaux",
    kind: "app",
    roles: ["admin", "commercial", "marketing"],
    icon: "contact",
    match: "prefix",
    shortLabel: "Clients",
  },
  {
    href: "/admin/pipeline",
    label: "Pipeline et relances",
    code: "CRM",
    description: "Valeur, proba, actions, alertes",
    kind: "app",
    roles: ["admin", "commercial", "manager"],
    icon: "chart",
    match: "prefix",
    shortLabel: "Pipeline",
  },
  {
    href: "/admin/contrats",
    label: "Contrats",
    code: "CRM",
    description: "Sites, SLA, tarifs, avenants (activation)",
    kind: "app",
    roles: ["admin", "commercial", "ops", "finance", "manager"],
    icon: "contract",
    match: "prefix",
    shortLabel: "Contrats",
  },
  {
    href: "/admin/operations",
    label: "Opérations",
    code: "OPS",
    description: "Planning, missions, matériel, qualité, pointage",
    kind: "app",
    roles: ["admin", "ops", "manager", "rh", "qualite", "finance", "nettoyeur"],
    icon: "clipboard",
    match: "prefix",
    shortLabel: "Ops",
  },
  {
    href: "/admin/logistique",
    label: "Logistique",
    code: "OPS",
    description: "Bons de livraison / réception, DA et stocks",
    kind: "app",
    roles: ["admin", "ops", "manager", "finance", "qualite"],
    icon: "package",
    match: "prefix",
    shortLabel: "Logistique",
  },
  {
    href: "/admin/achat",
    label: "Achats",
    code: "OPS",
    description: "Demande d’achat / BC interne, validation N+1",
    kind: "app",
    roles: ["admin", "ops", "manager", "finance", "qualite"],
    icon: "cart",
    match: "prefix",
    shortLabel: "Achats",
  },
  {
    href: "/admin/qualite",
    label: "Qualité",
    code: "Q",
    description: "Contrôles, rapports site, performance client, audits",
    kind: "app",
    roles: ["admin", "qualite", "ops", "manager", "commercial"],
    icon: "quality",
    match: "prefix",
    shortLabel: "Qualité",
  },
  {
    href: "/admin/rh",
    label: "Ressources humaines",
    code: "RH",
    description:
      "Recrutement, embauche, signatures, onboarding, compétences, paie",
    kind: "app",
    roles: ["admin", "rh", "manager", "finance"],
    icon: "interview",
    match: "prefix",
    shortLabel: "RH",
  },
  {
    href: "/admin/paie",
    label: "Paie employés",
    code: "RH",
    description: "Bulletins, CNPS, IRPP, net à payer (FCFA)",
    kind: "app",
    roles: ["admin", "rh", "manager", "finance"],
    icon: "invoice",
    match: "prefix",
    shortLabel: "Paie",
  },
  {
    href: "/admin/finance",
    label: "Finance",
    code: "FIN",
    description: "Devis, préfactures, factures, relances et preuves",
    kind: "app",
    roles: ["admin", "finance", "manager", "commercial"],
    icon: "invoice",
    match: "prefix",
    shortLabel: "Finance",
  },
  {
    href: "/admin/direction",
    label: "Direction",
    code: "BI",
    description: "Contrat, avenants et rapport performance client",
    kind: "app",
    roles: ["admin", "manager", "commercial", "finance", "qualite"],
    icon: "report",
    match: "prefix",
    shortLabel: "Direction",
  },
  {
    href: "/admin/juridique",
    label: "Juridique",
    code: "BI",
    description: "Contrat de prestation client",
    kind: "app",
    roles: ["admin", "commercial", "manager", "finance"],
    icon: "contract",
    match: "prefix",
    shortLabel: "Juridique",
  },
  {
    href: "/admin/utilisateurs",
    label: "Utilisateurs",
    code: "BI",
    description: "Comptes & rôles",
    kind: "app",
    roles: ["admin"],
    icon: "users",
    match: "prefix",
    shortLabel: "Users",
  },
  {
    href: "/admin/templates",
    label: "Bibliothèque",
    code: "BI",
    description: "Tous les modèles",
    kind: "app",
    roles: ["admin", "commercial", "marketing", "ops", "rh", "manager", "finance", "qualite"],
    icon: "library",
    match: "exact",
    shortLabel: "Docs",
  },
  ADMIN_SETTINGS,
];

/** Menu agent terrain. */
export const ADMIN_AGENT_APPS: AdminNavItem[] = [
  {
    href: "/admin/mon-espace",
    label: "Accueil agent",
    code: "AGT",
    description: "Ma journée",
    kind: "app",
    roles: ["nettoyeur"],
    icon: "home",
    match: "prefix",
  },
  {
    href: "/admin/operations?tab=pointage",
    label: "Mon pointage",
    code: "OPS",
    description: "Arrivée & départ mobile",
    kind: "app",
    roles: ["nettoyeur"],
    icon: "clock",
    match: "prefix",
    shortLabel: "Pointage",
  },
  {
    href: "/admin/operations?tab=missions",
    label: "Mes missions",
    code: "OPS",
    description: "OT, consignes & preuves",
    kind: "app",
    roles: ["nettoyeur"],
    icon: "clipboard",
    match: "prefix",
    shortLabel: "Missions",
  },
  {
    href: "/admin/operations?tab=terrain",
    label: "Photos terrain",
    code: "TRN",
    description: "Arrivée & départ",
    kind: "app",
    roles: ["nettoyeur"],
    icon: "camera",
    match: "prefix",
    shortLabel: "Photos",
  },
  {
    href: "/admin/documents-signatures",
    label: "Mes documents",
    code: "RH",
    description: "Signatures & engagements",
    kind: "app",
    roles: ["nettoyeur"],
    icon: "pen",
    match: "prefix",
    shortLabel: "Docs",
  },
];

/** Menu portail client. */
export const ADMIN_CLIENT_APPS: AdminNavItem[] = [
  {
    href: "/admin/espace",
    label: "Accueil client",
    code: "CLT",
    description: "Mon portail",
    kind: "app",
    roles: ["client"],
    icon: "home",
    match: "prefix",
  },
  {
    href: "/admin/templates?domain=CRM",
    label: "Devis & contrats",
    code: "CRM",
    description: "Documents commerciaux",
    kind: "app",
    roles: ["client"],
    icon: "contract",
    match: "exact",
  },
  {
    href: "/admin/templates?domain=FIN",
    label: "Factures",
    code: "FIN",
    description: "Facturation",
    kind: "app",
    roles: ["client"],
    icon: "invoice",
    match: "exact",
  },
];

/**
 * Documents TMP/DIG remplacés par un module Accueil — exclus du menu latéral
 * (toujours accessibles via Bibliothèque).
 */
const DOC_IDS_SUPERSEDED_BY_APPS = new Set([
  "DIG-01", // → Demandes digitales
  "DIG-02", // → Demandes / Messages
  "DIG-03", // → Visite technique
  "TMP-01", // Proposition → CRM
  "TMP-02", // Devis → CRM / Finance
  "TMP-03", // BC → CRM
  "TMP-04", // BL → Matériel
  "TMP-05", // Contrat → Direction / Juridique
  "TMP-06", // Avenant → Direction / CRM
  "TMP-07", // Contrat agent → RH signatures
  "TMP-08", // Fiche de poste → RH fiches-poste
  "TMP-09", // Dossier embauche → RH embauche
  "TMP-10", // Entretien → Recrutement
  "TMP-11", // Onboarding → RH onboarding
  "TMP-12", // OT → Ordres de travail
  "TMP-13", // Contrôle Q → Qualité
  "TMP-14", // Rapport prestation → Qualité
  "TMP-15", // Demande d’achat → Achats
  "TMP-16", // Congés → RH conges
  "TMP-17", // Pointage → RH / Ops pointage
  "TMP-26", // Bulletin paie → RH paie /admin/paie
  "TMP-18", // Préfacture → Finance
  "TMP-19", // Facture → Finance
  "TMP-20", // Avoir → Finance
  "TMP-21", // Relevé → Finance
  "TMP-22", // Relance → Finance
  "TMP-23", // Accusé → CRM / Finance
  "TMP-24", // Rapport perf → Qualité / Direction
  "TMP-25", // Audit VT → Qualité / CRM
]);

/**
 * Fiches documents pour recherche menu (Ctrl+K) — plus affichées en accordéon sidebar.
 */
export const ADMIN_DOC_NAV: AdminNavItem[] = DOCUMENTS.filter(
  (d) => !DOC_IDS_SUPERSEDED_BY_APPS.has(d.id),
).map((d) => ({
  href: `/admin/templates/${d.slug}`,
  label: d.title,
  code: d.domain,
  description: d.subtitle,
  group: d.domain,
  kind: "doc" as const,
  match: "exact" as const,
}));

/** Limite résultats docs dans la recherche sidebar. */
export const SIDEBAR_DOC_SEARCH_LIMIT = 8;

export const ADMIN_NAV: AdminNavItem[] = [
  ...ADMIN_HOME_APPS,
  ...ADMIN_DOC_NAV,
];

export const ADMIN_TOP_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/demandes", label: "Digital" },
  { href: "/admin/commercial", label: "CRM" },
  { href: "/admin/operations", label: "Opérations" },
  { href: "/admin/qualite", label: "Qualité" },
  { href: "/admin/rh", label: "RH" },
  { href: "/admin/finance", label: "Finance" },
] as const;

export function roleCanSeeNavItem(
  item: AdminNavItem,
  role: UserRole,
): boolean {
  if (!item.roles || item.roles.length === 0) {
    return role !== "nettoyeur" && role !== "client";
  }
  return item.roles.includes(role);
}

export function homeAppsForRole(role: UserRole): AdminNavItem[] {
  if (role === "nettoyeur") return ADMIN_AGENT_APPS;
  if (role === "client") return ADMIN_CLIENT_APPS;
  return ADMIN_HOME_APPS.filter((item) => roleCanSeeNavItem(item, role));
}

/**
 * Hubs groupés par section domaine pour la sidebar (hors agent / client).
 */
export function homeAppsGroupedForRole(role: UserRole): SidebarSection[] {
  if (role === "nettoyeur" || role === "client") return [];
  const apps = homeAppsForRole(role);
  const byCode = new Map<string, AdminNavItem[]>();
  for (const item of apps) {
    const key = item.code || "BI";
    const list = byCode.get(key) ?? [];
    list.push(item);
    byCode.set(key, list);
  }
  return SIDEBAR_SECTION_ORDER.map((id) => ({
    id,
    label: GROUP_LABEL[id] ?? id,
    items: byCode.get(id) ?? [],
  })).filter((s) => s.items.length > 0);
}

export function navDisplayLabel(item: AdminNavItem, compact = false): string {
  if (compact && item.shortLabel) return item.shortLabel;
  return item.label;
}

export function isNavItemActive(
  item: AdminNavItem,
  pathname: string,
  search = "",
): boolean {
  const [hrefPathRaw, hrefQuery = ""] = item.href.split("?");
  const hrefPath = hrefPathRaw || item.href;
  const mode = item.match ?? (item.kind === "doc" ? "exact" : "prefix");

  let pathOk = false;
  if (mode === "exact") {
    if (hrefPath === "/admin") {
      pathOk = pathname === "/admin" || pathname === "/admin/";
    } else if (hrefPath === "/admin/templates") {
      pathOk = pathname === "/admin/templates";
    } else {
      pathOk = pathname === hrefPath;
    }
  } else if (hrefPath === "/admin") {
    pathOk = pathname === "/admin" || pathname === "/admin/";
  } else {
    pathOk =
      pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
  }
  if (!pathOk) return false;

  if (!hrefQuery) return true;
  const want = new URLSearchParams(hrefQuery);
  const have = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  for (const [key, value] of want.entries()) {
    if (have.get(key) !== value) return false;
  }
  return true;
}

export function navItemTone(item: AdminNavItem): string {
  switch (item.icon) {
    case "mail":
      return "#ea580c";
    case "contact":
      return "#db2777";
    case "user":
      return "#0284c7";
    case "users":
      return "#1d4ed8";
    case "visit":
      return "#059669";
    case "quote":
      return "#ca8a04";
    case "offer":
      return "#0a3a72";
    case "chart":
      return "#2563eb";
    case "contract":
      return "#4f46e5";
    case "folder":
      return "#c2410c";
    case "calendar":
      return "#9333ea";
    case "clipboard":
      return "#0f766e";
    case "package":
      return "#b45309";
    case "cart":
      return "#c2410c";
    case "checklist":
      return "#16a34a";
    case "quality":
      return "#65a30d";
    case "alert":
      return "#dc2626";
    case "briefcase":
      return "#0369a1";
    case "clock":
      return "#0891b2";
    case "interview":
      return "#a21caf";
    case "pen":
      return "#7c3aed";
    case "camera":
      return "#0d9488";
    case "report":
      return "#4338ca";
    case "invoice":
      return "#1e40af";
    case "library":
      return "#64748b";
    case "settings":
      return "#475569";
    case "space":
      return "#0f766e";
    case "home":
    default:
      return "#1260a8";
  }
}

export function matchesNavQuery(
  item: AdminNavItem,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.label.toLowerCase().includes(q) ||
    item.code.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    (item.shortLabel ?? "").toLowerCase().includes(q) ||
    (item.group ?? "").toLowerCase().includes(q) ||
    (GROUP_LABEL[item.group ?? ""] ?? "").toLowerCase().includes(q) ||
    (GROUP_LABEL[item.code] ?? "").toLowerCase().includes(q)
  );
}

/** Recherche fiches documents (max SIDEBAR_DOC_SEARCH_LIMIT). */
export function searchDocNav(
  query: string,
  limit = SIDEBAR_DOC_SEARCH_LIMIT,
): AdminNavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: AdminNavItem[] = [];
  for (const item of ADMIN_DOC_NAV) {
    if (!matchesNavQuery(item, q)) continue;
    hits.push(item);
    if (hits.length >= limit) break;
  }
  return hits;
}

export function orderedNavGroups(
  grouped: Map<string, AdminNavItem[]>,
): Array<{ group: string; items: AdminNavItem[] }> {
  const keys = [
    ...GROUP_ORDER.filter((k) => grouped.has(k)),
    ...[...grouped.keys()].filter((k) => !GROUP_ORDER.includes(k)),
  ];
  return keys
    .map((group) => ({
      group,
      items: grouped.get(group) ?? [],
    }))
    .filter((g) => g.items.length > 0);
}
