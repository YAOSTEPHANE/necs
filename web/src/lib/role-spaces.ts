import type { UserRole } from "@/lib/settings";
import { DOCUMENTS } from "@/lib/documents-catalog";
import { type AdminNavItem } from "@/lib/admin-nav";

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
    title: "Pilotage commercial",
    lead: "Offres, devis, commandes et suivi client ; votre portefeuille au quotidien.",
    domains: ["CRM", "DIG"],
    tools: [
      {
        href: "/admin/commercial",
        label: "CRM",
        hint: "Prospect → besoin → visite → chiffrage → offre → BC",
        tone: "#0a3a72",
      },
      {
        href: "/admin/clients",
        label: "Clients",
        hint: "Portefeuille CRM",
        tone: "#0ea5e9",
      },
      {
        href: "/admin/pipeline",
        label: "Pipeline et relances",
        hint: "Valeur, proba, échéances",
        tone: "#0ea5e9",
      },
      {
        href: "/admin/contrats",
        label: "Contrats actifs",
        hint: "Sites, SLA, activation",
        tone: "#7c3aed",
      },
      {
        href: "/admin/finance",
        label: "Finance",
        hint: "Préfactures, factures, avoirs",
        tone: "#1e40af",
      },
      {
        href: "/admin/demandes",
        label: "Demandes digitales",
        hint: "Leads · messages · campagnes",
        tone: "#f59e0b",
      },
      {
        href: "/admin/direction",
        label: "Direction",
        hint: "Pilotage commercial & rapports",
        tone: "#6d28d9",
      },
      {
        href: "/admin/juridique",
        label: "Juridique",
        hint: "Contrat de prestation client",
        tone: "#5b21b6",
      },
      {
        href: "/admin/templates?domain=CRM",
        label: "Bibliothèque commerciale",
        hint: "Tous les modèles CRM",
        tone: "#3ec8e8",
      },
    ],
    accent: "#1260a8",
  },
  marketing: {
    role: "marketing",
    eyebrow: "Espace Marketing",
    title: "Capture & attribution",
    lead: "Leads site web, rattachement source/campagne/canal et qualification des prospects.",
    domains: ["DIG", "CRM"],
    tools: [
      {
        href: "/admin/clients",
        label: "Clients",
        hint: "Portefeuille CRM",
        tone: "#0ea5e9",
      },
      {
        href: "/admin/demandes",
        label: "Demandes digitales",
        hint: "Leads · messages · FB · réseaux · campagnes · consent",
        tone: "#f59e0b",
      },
      {
        href: "/admin/templates?domain=DIG",
        label: "Formulaires digitaux",
        hint: "Modèles DIG",
        tone: "#3ec8e8",
      },
    ],
    accent: "#c45c26",
  },
  ops: {
    role: "ops",
    eyebrow: "Espace Opérations",
    title: "Terrain & exécution",
    lead: "Ordres de travail, pointage équipes et preuves photo après nettoyage.",
    domains: ["OPS"],
    tools: [
      {
        href: "/admin/commercial?tab=audit-visite",
        label: "Visite technique",
        hint: "Planif · checklist · rapport → devis",
        tone: "#4faf2a",
      },
      {
        href: "/admin/qualite",
        label: "Module Qualité",
        hint: "Contrôles · rapports · audits",
        tone: "#d97706",
      },
      {
        href: "/admin/contrats",
        label: "Contrats",
        hint: "Sites, SLA, consignes",
        tone: "#7c3aed",
      },
      {
        href: "/admin/operations?tab=referentiel",
        label: "Référentiel",
        hint: "Clients, sites, prestations",
        tone: "#4faf2a",
      },
      {
        href: "/admin/operations?tab=planification",
        label: "Planning",
        hint: "Créneaux & affectations",
        tone: "#1570b8",
      },
      {
        href: "/admin/operations?tab=bons-commande",
        label: "Bons de commande",
        hint: "Réception commercial → exécution",
        tone: "#0a3a72",
      },
      {
        href: "/admin/logistique?tab=livraisons",
        label: "Logistique",
        hint: "BL / réception, DA, stocks",
        tone: "#0f766e",
      },
      {
        href: "/admin/rh?tab=besoin",
        label: "Besoin agents",
        hint: "Expression issue contrats / planning",
        tone: "#7c3aed",
      },
      {
        href: "/admin/operations?tab=missions",
        label: "Ordres de travail",
        hint: "Site, horaires, agents, preuves",
        tone: "#0f766e",
      },
      {
        href: "/admin/qualite?tab=rapports-site",
        label: "Rapport de site",
        hint: "Synthèse prestations & actions",
        tone: "#1570b8",
      },
      {
        href: "/admin/achat?tab=demandes-achat",
        label: "Demandes d’achat",
        hint: "BC interne · validation · fournisseur",
        tone: "#b45309",
      },
      {
        href: "/admin/operations?tab=materiel",
        label: "Matériel",
        hint: "Stocks, dotations, réappro",
        tone: "#b45309",
      },
      {
        href: "/admin/qualite",
        label: "Qualité",
        hint: "Contrôles, rapports site, audits",
        tone: "#d97706",
      },
      {
        href: "/admin/operations?tab=pointage",
        label: "Pointage",
        hint: "Présence terrain · export",
        tone: "#3ec8e8",
      },
      {
        href: "/admin/operations?tab=prefactures",
        label: "Préfactures",
        hint: "État prestations facturables",
        tone: "#0a3a72",
      },
      {
        href: "/admin/operations?tab=integration",
        label: "Intégration",
        hint: "Checklist docs, EPI, accès, formation",
        tone: "#1570b8",
      },
      {
        href: "/admin/operations?tab=terrain",
        label: "Photos terrain",
        hint: "Preuves après nettoyage",
        tone: "#8fd14a",
      },
      {
        href: "/admin/operations?tab=rapport",
        label: "Rapport mensuel",
        hint: "KPI performance client",
        tone: "#0f766e",
      },
    ],
    accent: "#4faf2a",
  },
  rh: {
    role: "rh",
    eyebrow: "Espace Ressources humaines",
    title: "Équipes & dossiers",
    lead: "Expression du besoin, recrutement, contrats agents et présences.",
    domains: ["RH"],
    tools: [
      {
        href: "/admin/rh?tab=besoin",
        label: "Expression du besoin",
        hint: "Contrats, planning, validations",
        tone: "#7c3aed",
      },
      {
        href: "/admin/rh?tab=recrutement",
        label: "Recrutement",
        hint: "Candidatures, entretiens, décisions",
        tone: "#7c3aed",
      },
      {
        href: "/admin/rh?tab=embauche",
        label: "Embauche",
        hint: "Pièces manquantes / expirées",
        tone: "#fb923c",
      },
      {
        href: "/admin/rh?tab=signatures",
        label: "Contrats agents",
        hint: "Poste, conditions, signatures",
        tone: "#0f766e",
      },
      {
        href: "/admin/rh?tab=fiches-poste",
        label: "Fiches de poste",
        hint: "Mission & compétences",
        tone: "#7c3aed",
      },
      {
        href: "/admin/rh?tab=conges",
        label: "Congés / absences",
        hint: "Validation & planning",
        tone: "#fb923c",
      },
      {
        href: "/admin/rh?tab=pointage",
        label: "Pointage RH",
        hint: "Présences & export",
        tone: "#a78bfa",
      },
      {
        href: "/admin/operations?tab=planification",
        label: "Planification",
        hint: "Absences & remplacements",
        tone: "#1570b8",
      },
    ],
    accent: "#7c3aed",
  },
  manager: {
    role: "manager",
    eyebrow: "Espace manager",
    title: "Pilotage & validations",
    lead: "Validations RH (besoins agents), entretiens et devis.",
    domains: ["RH", "CRM"],
    tools: [
      {
        href: "/admin/rh?tab=besoin",
        label: "Besoins agents",
        hint: "Validation hiérarchique / budgétaire",
        tone: "#7c3aed",
      },
      {
        href: "/admin/rh?tab=recrutement",
        label: "Mes candidatures",
        hint: "Entretien, évaluation, proposition",
        tone: "#7c3aed",
      },
      {
        href: "/admin/commercial",
        label: "CRM",
        hint: "Offre · devis · BC · visite · contrat",
        tone: "#0a3a72",
      },
      {
        href: "/admin/commercial?tab=bons-commande",
        label: "Bons de commande",
        hint: "Validation & transmission ops",
        tone: "#0369a1",
      },
      {
        href: "/admin/commercial?tab=chiffrage",
        label: "Chiffrage et devis",
        hint: "Validation direction / seuils",
        tone: "#0369a1",
      },
      {
        href: "/admin/finance",
        label: "Finance",
        hint: "Devis, factures et avoirs",
        tone: "#1e40af",
      },
      {
        href: "/admin/pipeline",
        label: "Pipeline et relances",
        hint: "Vue direction du pipeline",
        tone: "#0ea5e9",
      },
      {
        href: "/admin/contrats",
        label: "Contrats",
        hint: "Activation & avenants",
        tone: "#7c3aed",
      },
      {
        href: "/admin/juridique",
        label: "Juridique",
        hint: "Contrat de prestation client",
        tone: "#5b21b6",
      },
      {
        href: "/admin/direction",
        label: "Direction",
        hint: "Contrat · avenants · rapport performance",
        tone: "#6d28d9",
      },
      {
        href: "/admin/qualite",
        label: "Qualité",
        hint: "Contrôles, rapports, audits",
        tone: "#d97706",
      },
      {
        href: "/admin/operations?tab=qualite&feature=satisfaction",
        label: "Satisfaction",
        hint: "Scores & plans d’amélioration",
        tone: "#0f766e",
      },
      {
        href: "/admin/operations",
        label: "Opérations",
        hint: "Planning, missions, terrain",
        tone: "#1570b8",
      },
    ],
    accent: "#6d28d9",
  },
  finance: {
    role: "finance",
    eyebrow: "Espace Finance",
    title: "Facturation & règlements",
    lead: "Préfactures, factures, avoirs et suivi des encaissements.",
    domains: ["FIN", "CRM"],
    tools: [
      {
        href: "/admin/finance?tab=devis",
        label: "Devis",
        hint: "Numéro, client, site, lignes, taxes, validité",
        tone: "#1e40af",
      },
      {
        href: "/admin/finance?tab=prefactures",
        label: "Préfactures",
        hint: "Période, contrat, écarts, validation",
        tone: "#1d4ed8",
      },
      {
        href: "/admin/finance?tab=factures",
        label: "Factures",
        hint: "Identité NECS, contrat, période, échéance",
        tone: "#2563eb",
      },
      {
        href: "/admin/finance?tab=avoirs",
        label: "Avoirs",
        hint: "Réf. facture, motif, validation",
        tone: "#0369a1",
      },
      {
        href: "/admin/finance?tab=releves",
        label: "Relevés",
        hint: "Compte client",
        tone: "#0ea5e9",
      },
      {
        href: "/admin/finance?tab=relances",
        label: "Relances client",
        hint: "Factures dues, niveaux R1–R4, historique",
        tone: "#b45309",
      },
      {
        href: "/admin/finance?tab=acks",
        label: "Accusés / preuves",
        hint: "Document, destinataire, canal, statut",
        tone: "#7c3aed",
      },
      {
        href: "/admin/commercial",
        label: "CRM",
        hint: "Offre · BC · visite · devis · contrat",
        tone: "#0a3a72",
      },
      {
        href: "/admin/contrats",
        label: "Contrats",
        hint: "Tarifs & échéances facturation",
        tone: "#7c3aed",
      },
      {
        href: "/admin/juridique",
        label: "Juridique",
        hint: "Contrat de prestation client",
        tone: "#5b21b6",
      },
      {
        href: "/admin/direction",
        label: "Direction",
        hint: "Contrat · avenants · rapport mensuel",
        tone: "#6d28d9",
      },
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
    lead: "Contrôles qualité, rapports site, performance client et audits terrain.",
    domains: ["Q", "OPS"],
    tools: [
      {
        href: "/admin/qualite?tab=controles",
        label: "Contrôles qualité",
        hint: "Critères, notation, photos, NC, validation",
        tone: "#d97706",
      },
      {
        href: "/admin/qualite?tab=rapports-site",
        label: "Rapports de prestation",
        hint: "Synthèse site · incidents · actions",
        tone: "#ea580c",
      },
      {
        href: "/admin/qualite?tab=rapport-mensuel",
        label: "Performance mensuelle",
        hint: "KPI · réclamations · recommandations",
        tone: "#c2410c",
      },
      {
        href: "/admin/qualite?tab=audit-visite",
        label: "Audits / visites",
        hint: "Constats · risques · actions",
        tone: "#9a3412",
      },
      {
        href: "/admin/non-conformites",
        label: "Non-conformités",
        hint: "Affecter, valider, clôturer",
        tone: "#b91c1c",
      },
      {
        href: "/admin/operations?tab=qualite&feature=satisfaction",
        label: "Satisfaction",
        hint: "Scores, plans, historique",
        tone: "#0f766e",
      },
      {
        href: "/admin/demandes?tab=messages",
        label: "Messages digitaux",
        hint: "Service client · SLA · tickets",
        tone: "#0ea5e9",
      },
      {
        href: "/admin/operations?tab=terrain",
        label: "Photos terrain",
        hint: "Vérifier les preuves site",
        tone: "#fbbf24",
      },
      {
        href: "/admin/operations?tab=missions",
        label: "Missions",
        hint: "Preuves & clôture",
        tone: "#0f766e",
      },
      {
        href: "/admin/operations?tab=rapport",
        label: "Rapport mensuel",
        hint: "KPI qualité & sites",
        tone: "#0f766e",
      },
    ],
    accent: "#d97706",
  },
  client: {
    role: "client",
    eyebrow: "Espace Client",
    title: "Votre portail NECS",
    lead: "Consultez vos devis, contrats et factures, et suivez vos prestations.",
    domains: ["CRM", "FIN"],
    tools: [
      {
        href: "/admin/templates?domain=CRM",
        label: "Devis & contrats",
        hint: "Documents commerciaux",
        tone: "#0ea5e9",
      },
      {
        href: "/admin/templates?domain=FIN",
        label: "Facturation",
        hint: "Factures et règlements",
        tone: "#2563eb",
      },
    ],
    accent: "#0d9488",
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
