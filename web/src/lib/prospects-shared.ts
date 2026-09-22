import type { UserRole } from "@/lib/settings";

export type ProspectPotential =
  | "faible"
  | "moyen"
  | "fort"
  | "strategique";

export type ProspectHistoryKind =
  | "created"
  | "updated"
  | "assigned"
  | "status"
  | "qualified"
  | "contact_added"
  | "contact_removed"
  | "note"
  | "imported";

export type ProspectContact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
};

export type ProspectHistoryEntry = {
  id: string;
  at: string;
  kind: ProspectHistoryKind;
  by: string;
  byName: string;
  detail: string;
};

export type ProspectStatusDef = {
  id: string;
  label: string;
  color: string;
  qualifies: boolean;
  terminal: boolean;
  active: boolean;
  order: number;
};

export type Prospect = {
  id: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  sector: string;
  source: string;
  campaign: string;
  potential: ProspectPotential;
  potentialValue: number;
  status: string;
  assigneeEmail: string;
  assigneeName: string;
  contacts: ProspectContact[];
  note: string;
  qualifiedAt: string | null;
  qualifiedBy: string;
  qualifiedByName: string;
  history: ProspectHistoryEntry[];
  leadEmail: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
};

export type ProspectInput = {
  company: string;
  name?: string;
  email: string;
  phone?: string;
  city?: string;
  address?: string;
  sector?: string;
  source?: string;
  campaign?: string;
  potential?: ProspectPotential;
  potentialValue?: number;
  status?: string;
  assigneeEmail?: string;
  assigneeName?: string;
  note?: string;
  contacts?: Array<Partial<ProspectContact>>;
};

export const DEFAULT_PROSPECT_STATUSES: ProspectStatusDef[] = [
  {
    id: "nouveau",
    label: "Nouveau",
    color: "#0369a1",
    qualifies: false,
    terminal: false,
    active: true,
    order: 10,
  },
  {
    id: "a_contacter",
    label: "À contacter",
    color: "#c2410c",
    qualifies: false,
    terminal: false,
    active: true,
    order: 20,
  },
  {
    id: "qualifie",
    label: "Qualifié",
    color: "#15803d",
    qualifies: true,
    terminal: false,
    active: true,
    order: 30,
  },
  {
    id: "en_negociation",
    label: "En négociation",
    color: "#7c3aed",
    qualifies: true,
    terminal: false,
    active: true,
    order: 40,
  },
  {
    id: "gagne",
    label: "Gagné",
    color: "#0f766e",
    qualifies: true,
    terminal: true,
    active: true,
    order: 50,
  },
  {
    id: "perdu",
    label: "Perdu",
    color: "#64748b",
    qualifies: false,
    terminal: true,
    active: true,
    order: 60,
  },
  {
    id: "en_veille",
    label: "En veille",
    color: "#475569",
    qualifies: false,
    terminal: false,
    active: true,
    order: 70,
  },
];

export const PROSPECT_POTENTIAL_LABELS: Record<ProspectPotential, string> = {
  faible: "Faible",
  moyen: "Moyen",
  fort: "Fort",
  strategique: "Stratégique",
};

export const PROSPECT_POTENTIALS = Object.keys(
  PROSPECT_POTENTIAL_LABELS,
) as ProspectPotential[];

export const PROSPECT_SOURCE_LABELS: Record<string, string> = {
  saisie_commerciale: "Saisie commerciale",
  site_web: "Site web",
  facebook: "Facebook / Meta",
  recommandation: "Recommandation",
  appel_entrant: "Appel entrant",
  salon: "Salon / événement",
  lead_web: "Lead web",
  import: "Import",
  autre: "Autre",
};

export function prospectSourceLabel(source: string): string {
  const key = String(source || "").trim();
  if (!key) return "—";
  return PROSPECT_SOURCE_LABELS[key] || key;
}

export function formatProspectFcfa(amount: number): string {
  return `${Math.round(amount || 0).toLocaleString("fr-FR")} FCFA`;
}

export function canAccessProspects(role: UserRole): boolean {
  return role === "admin" || role === "commercial";
}

export function canManageProspects(role: UserRole): boolean {
  return role === "admin" || role === "commercial";
}

export function canConfigureProspectStatuses(role: UserRole): boolean {
  return role === "admin" || role === "commercial";
}

export function isProspectPotential(v: unknown): v is ProspectPotential {
  return (
    typeof v === "string" &&
    PROSPECT_POTENTIALS.includes(v as ProspectPotential)
  );
}

export function normalizeProspectEmail(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
}
