import type { UserRole } from "@/lib/settings";

export type OpsSiteStatus = "actif" | "inactif";

export type OpsHistoryEntry = {
  id: string;
  at: string;
  by: string;
  byName: string;
  detail: string;
};

export type OpsPrestation = {
  id: string;
  label: string;
  frequency: string;
  requiredStaff: number;
  durationMinutes: number;
  consignes: string;
  active: boolean;
  sourceTariffId: string;
};

export type OpsSite = {
  id: string;
  clientId: string;
  contractId: string;
  contractRef: string;
  company: string;
  name: string;
  address: string;
  city: string;
  surfaceM2: number | null;
  status: OpsSiteStatus;
  consignes: string;
  sla: string;
  staffCount: number;
  prestations: OpsPrestation[];
  history: OpsHistoryEntry[];
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type OpsClient = {
  id: string;
  company: string;
  contactName: string;
  contactEmail: string;
  contractIds: string[];
  siteCount: number;
  activeSiteCount: number;
  history: OpsHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

/** Vue hiérarchique Client → Contrat → Sites → Prestations (recette OPS-01). */
export type ContractReferentialBundle = {
  client: OpsClient | null;
  contractId: string;
  contractRef: string;
  company: string;
  sla: string;
  status: string;
  frequency: string;
  staffCount: number;
  monthlyAmount: number;
  /** Sites du contrat source (CRM-06). */
  contractSites: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    surfaceM2: number | null;
    active: boolean;
    consignes: string;
  }>;
  /** Sites OPS liés au contrat. */
  sites: OpsSite[];
  /** Toutes les infos site accessibles depuis le contrat. */
  complete: boolean;
  checks: Array<{ key: string; ok: boolean; detail: string }>;
};

/** Recette OPS-01 : infos site accessibles via le contrat. */
export function assertSiteAccessibleFromContract(bundle: {
  contractId: string;
  contractRef: string;
  status: string;
  sites: OpsSite[];
  contractSites: Array<{ id: string; name: string }>;
}): {
  ok: boolean;
  checks: Array<{ key: string; ok: boolean; detail: string }>;
} {
  const { sites, contractId, contractRef, status, contractSites } = bundle;
  const checks = [
    {
      key: "contract",
      ok: Boolean(contractId) && Boolean(contractRef),
      detail: contractRef
        ? `Contrat ${contractRef} (${status || "—"})`
        : "Contrat manquant",
    },
    {
      key: "sites",
      ok: sites.length > 0,
      detail:
        sites.length > 0
          ? `${sites.length} site(s) OPS liés`
          : "Aucun site synchronisé",
    },
    {
      key: "parity",
      ok:
        contractSites.length === 0 ||
        sites.length >= contractSites.filter((s) => s).length,
      detail:
        contractSites.length > 0
          ? `${sites.length}/${contractSites.length} site(s) contrat repris`
          : "Pas de sites contrat source",
    },
    {
      key: "identity",
      ok: sites.every((s) => s.contractId === contractId),
      detail: "Lien site → contrat cohérent",
    },
    {
      key: "address",
      ok:
        sites.length > 0 &&
        sites.every((s) => Boolean(s.address || s.city || s.name)),
      detail: "Adresse / identité site renseignée",
    },
    {
      key: "prestations",
      ok: sites.length > 0 && sites.every((s) => s.prestations.length > 0),
      detail: "Prestations présentes sur chaque site",
    },
    {
      key: "consignes",
      ok: sites.every((s) => typeof s.consignes === "string"),
      detail: "Consignes accessibles (site + prestations)",
    },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

export function canAccessOpsReferential(role: UserRole): boolean {
  return role === "admin" || role === "ops" || role === "manager";
}

export function canEditOpsReferential(role: UserRole): boolean {
  return role === "admin" || role === "ops";
}

export function canAccessOpsPlanning(role: UserRole): boolean {
  return role === "admin" || role === "ops" || role === "manager" || role === "rh";
}

export function canEditOpsPlanning(role: UserRole): boolean {
  return role === "admin" || role === "ops";
}
