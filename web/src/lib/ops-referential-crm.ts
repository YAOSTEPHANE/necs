import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import { listContracts, getContract } from "@/lib/contracts-crm";
import type { Contract } from "@/lib/contracts-shared";
import type { UserRole } from "@/lib/settings";
import {
  type ContractReferentialBundle,
  type OpsClient,
  type OpsHistoryEntry,
  type OpsPrestation,
  type OpsSite,
  type OpsSiteStatus,
  assertSiteAccessibleFromContract,
} from "@/lib/ops-referential-shared";

const CLIENTS = "ops_clients";
const SITES = "ops_sites";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string): OpsHistoryEntry {
  return {
    id: `OH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

async function clientsCol() {
  const db = await getDb();
  const c = db.collection<OpsClient>(CLIENTS);
  void Promise.all([
    c.createIndex({ company: 1 }).catch(() => undefined),
    c.createIndex({ contactEmail: 1 }).catch(() => undefined),
  ]);
  return c;
}

async function sitesCol() {
  const db = await getDb();
  const c = db.collection<OpsSite>(SITES);
  void Promise.all([
    c.createIndex({ contractId: 1, status: 1 }).catch(() => undefined),
    c.createIndex({ clientId: 1 }).catch(() => undefined),
    c.createIndex({ updatedAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

function coerceClient(raw: Record<string, unknown>): OpsClient {
  return {
    id: String(raw.id ?? ""),
    company: String(raw.company ?? ""),
    contactName: String(raw.contactName ?? ""),
    contactEmail: String(raw.contactEmail ?? ""),
    contractIds: Array.isArray(raw.contractIds)
      ? (raw.contractIds as string[])
      : [],
    siteCount: Math.max(0, Number(raw.siteCount) || 0),
    activeSiteCount: Math.max(0, Number(raw.activeSiteCount) || 0),
    history: Array.isArray(raw.history)
      ? (raw.history as OpsHistoryEntry[])
      : [],
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
  };
}

function coerceSite(raw: Record<string, unknown>): OpsSite {
  return {
    id: String(raw.id ?? ""),
    clientId: String(raw.clientId ?? ""),
    contractId: String(raw.contractId ?? ""),
    contractRef: String(raw.contractRef ?? ""),
    company: String(raw.company ?? ""),
    name: String(raw.name ?? ""),
    address: String(raw.address ?? ""),
    city: String(raw.city ?? ""),
    surfaceM2:
      raw.surfaceM2 === null || raw.surfaceM2 === undefined
        ? null
        : Number(raw.surfaceM2),
    status: raw.status === "inactif" ? "inactif" : "actif",
    consignes: String(raw.consignes ?? ""),
    sla: String(raw.sla ?? ""),
    staffCount: Math.max(0, Number(raw.staffCount) || 0),
    prestations: Array.isArray(raw.prestations)
      ? (raw.prestations as OpsPrestation[])
      : [],
    history: Array.isArray(raw.history)
      ? (raw.history as OpsHistoryEntry[])
      : [],
    syncedAt: String(raw.syncedAt ?? ""),
    createdAt: String(raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updatedAt ?? nowIso()),
  };
}

async function saveClient(doc: OpsClient): Promise<OpsClient> {
  const next = { ...doc, updatedAt: nowIso() };
  await (await clientsCol()).replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

async function saveSite(doc: OpsSite): Promise<OpsSite> {
  const next = { ...doc, updatedAt: nowIso() };
  await (await sitesCol()).replaceOne({ id: doc.id }, next, { upsert: true });
  return next;
}

function clientKey(contract: Contract): string {
  return (
    contract.contactEmail?.toLowerCase() ||
    contract.company.toLowerCase() ||
    contract.id
  );
}

function buildPrestations(contract: Contract, siteConsignes: string): OpsPrestation[] {
  if (contract.tariffs.length === 0) {
    return [
      {
        id: `PR-${randomUUID().slice(0, 6).toUpperCase()}`,
        label: "Entretien courant",
        frequency: contract.frequency || "selon contrat",
        requiredStaff: Math.max(1, contract.staffCount || 1),
        durationMinutes: 240,
        consignes: siteConsignes,
        active: true,
        sourceTariffId: "",
      },
    ];
  }
  return contract.tariffs.map((t) => ({
    id: `PR-${t.id}`,
    label: t.label,
    frequency: contract.frequency || t.period,
    requiredStaff: Math.max(1, Math.min(contract.staffCount || 1, 8)),
    durationMinutes: 180,
    consignes: siteConsignes,
    active: true,
    sourceTariffId: t.id,
  }));
}

/**
 * Synchronise le référentiel OPS depuis les contrats actifs (CRM-06).
 * Hiérarchie Client → Contrat → Site → Prestation.
 */
export async function syncReferentialFromContracts(
  actor: Actor,
): Promise<{ clients: number; sites: number }> {
  const contracts = (await listContracts(actor)).filter(
    (c) => c.status === "actif",
  );
  const cCol = await clientsCol();
  const sCol = await sitesCol();
  let clientCount = 0;
  let siteCount = 0;

  for (const contract of contracts) {
    let client =
      (await cCol.findOne({
        contactEmail: contract.contactEmail.toLowerCase(),
      })) || (await cCol.findOne({ company: contract.company }));
    let clientDoc: OpsClient;
    if (client) {
      clientDoc = coerceClient(stripMongo(client) as Record<string, unknown>);
      if (!clientDoc.contractIds.includes(contract.id)) {
        clientDoc.contractIds = [...clientDoc.contractIds, contract.id];
      }
      clientDoc.company = contract.company;
      clientDoc.contactName = contract.contactName;
      clientDoc.contactEmail = contract.contactEmail.toLowerCase();
      clientDoc.history = [
        hist(actor, `Sync contrat ${contract.ref}`),
        ...clientDoc.history,
      ].slice(0, 40);
    } else {
      clientDoc = {
        id: `CLI-${randomUUID().slice(0, 8).toUpperCase()}`,
        company: contract.company || clientKey(contract),
        contactName: contract.contactName,
        contactEmail: contract.contactEmail.toLowerCase(),
        contractIds: [contract.id],
        siteCount: 0,
        activeSiteCount: 0,
        history: [hist(actor, `Client créé depuis contrat ${contract.ref}`)],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      clientCount += 1;
    }
    await saveClient(clientDoc);

    for (const cs of contract.sites) {
      const existing = await sCol.findOne({
        contractId: contract.id,
        name: cs.name,
      });
      const prestations = buildPrestations(contract, cs.consignes);
      if (existing) {
        const site = coerceSite(
          stripMongo(existing) as Record<string, unknown>,
        );
        // Preserve manual inactive + custom consignes / prestation edits
        const mergedPrestations =
          site.prestations.length > 0
            ? mergePrestations(site.prestations, prestations)
            : prestations;
        const next: OpsSite = {
          ...site,
          clientId: clientDoc.id,
          contractRef: contract.ref,
          company: contract.company,
          address: cs.address,
          city: cs.city,
          surfaceM2: cs.surfaceM2,
          status:
            cs.active === false
              ? "inactif"
              : site.status === "inactif"
                ? "inactif"
                : "actif",
          consignes: site.consignes || cs.consignes,
          sla: contract.sla,
          staffCount: contract.staffCount,
          prestations: mergedPrestations,
          syncedAt: nowIso(),
          history: [
            hist(actor, `Site resynchronisé depuis ${contract.ref}`),
            ...site.history,
          ].slice(0, 40),
        };
        await saveSite(next);
      } else {
        const site: OpsSite = {
          id: `SITE-${randomUUID().slice(0, 8).toUpperCase()}`,
          clientId: clientDoc.id,
          contractId: contract.id,
          contractRef: contract.ref,
          company: contract.company,
          name: cs.name,
          address: cs.address,
          city: cs.city,
          surfaceM2: cs.surfaceM2,
          status: cs.active ? "actif" : "inactif",
          consignes: cs.consignes,
          sla: contract.sla,
          staffCount: contract.staffCount,
          prestations,
          history: [
            hist(actor, `Site créé depuis contrat ${contract.ref}`),
          ],
          syncedAt: nowIso(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        await saveSite(site);
        siteCount += 1;
      }
    }

    // Sites contrat désactivés → marquer inactifs côté OPS
    const opsSites = await sCol.find({ contractId: contract.id }).toArray();
    const activeNames = new Set(
      contract.sites.filter((s) => s.active !== false).map((s) => s.name),
    );
    for (const row of opsSites) {
      const site = coerceSite(stripMongo(row) as Record<string, unknown>);
      if (!activeNames.has(site.name) && site.status === "actif") {
        site.status = "inactif";
        site.history = [
          hist(actor, `Site désactivé (absent / inactif sur ${contract.ref})`),
          ...site.history,
        ].slice(0, 40);
        await saveSite(site);
      }
    }

    const sitesForClient = await sCol
      .find({ clientId: clientDoc.id })
      .toArray();
    clientDoc.siteCount = sitesForClient.length;
    clientDoc.activeSiteCount = sitesForClient.filter(
      (s) => s.status === "actif",
    ).length;
    await saveClient(clientDoc);
  }

  return { clients: clientCount, sites: siteCount };
}

/** Conserve consignes / effectif OPS ; met à jour libellés issus du contrat. */
function mergePrestations(
  existing: OpsPrestation[],
  fromContract: OpsPrestation[],
): OpsPrestation[] {
  const byTariff = new Map(
    existing
      .filter((p) => p.sourceTariffId)
      .map((p) => [p.sourceTariffId, p] as const),
  );
  const byId = new Map(existing.map((p) => [p.id, p] as const));
  const merged = fromContract.map((incoming) => {
    const prev =
      (incoming.sourceTariffId && byTariff.get(incoming.sourceTariffId)) ||
      byId.get(incoming.id);
    if (!prev) return incoming;
    return {
      ...incoming,
      consignes: prev.consignes || incoming.consignes,
      requiredStaff: prev.requiredStaff || incoming.requiredStaff,
      durationMinutes: prev.durationMinutes || incoming.durationMinutes,
      active: prev.active,
    };
  });
  // Prestations OPS purement manuelles (sans sourceTariffId)
  const manual = existing.filter(
    (p) =>
      !p.sourceTariffId &&
      !merged.some((m) => m.id === p.id),
  );
  return [...merged, ...manual];
}

export async function listOpsClients(): Promise<OpsClient[]> {
  const rows = await (await clientsCol())
    .find({})
    .sort({ company: 1 })
    .limit(400)
    .toArray();
  return rows.map((r) => coerceClient(stripMongo(r) as Record<string, unknown>));
}

export async function listOpsSites(filter?: {
  clientId?: string;
  contractId?: string;
  status?: OpsSiteStatus | "all";
}): Promise<OpsSite[]> {
  const q: Record<string, unknown> = {};
  if (filter?.clientId) q.clientId = filter.clientId;
  if (filter?.contractId) q.contractId = filter.contractId;
  if (filter?.status && filter.status !== "all") q.status = filter.status;
  const rows = await (await sitesCol())
    .find(q)
    .sort({ company: 1, name: 1 })
    .limit(500)
    .toArray();
  return rows.map((r) => coerceSite(stripMongo(r) as Record<string, unknown>));
}

export async function getOpsSite(id: string): Promise<OpsSite | null> {
  const row = await (await sitesCol()).findOne({ id });
  if (!row) return null;
  return coerceSite(stripMongo(row) as Record<string, unknown>);
}

export async function getOpsClient(id: string): Promise<OpsClient | null> {
  const row = await (await clientsCol()).findOne({ id });
  if (!row) return null;
  return coerceClient(stripMongo(row) as Record<string, unknown>);
}

/** Recette OPS-01 : toutes les infos site accessibles depuis le contrat. */
export async function getContractReferentialBundle(
  contractId: string,
): Promise<ContractReferentialBundle> {
  const contract = await getContract(contractId);
  const sites = await listOpsSites({ contractId });
  let client: OpsClient | null = null;
  if (sites[0]?.clientId) {
    client = await getOpsClient(sites[0].clientId);
  } else if (contract?.contactEmail) {
    const rows = await listOpsClients();
    client =
      rows.find(
        (c) =>
          c.contactEmail === contract.contactEmail.toLowerCase() ||
          c.contractIds.includes(contractId),
      ) ?? null;
  }

  const contractSites = (contract?.sites ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    city: s.city,
    surfaceM2: s.surfaceM2,
    active: s.active,
    consignes: s.consignes,
  }));

  const verdict = assertSiteAccessibleFromContract({
    contractId,
    contractRef: contract?.ref || sites[0]?.contractRef || "",
    status: contract?.status || "",
    sites,
    contractSites,
  });

  return {
    client,
    contractId,
    contractRef: contract?.ref || sites[0]?.contractRef || "",
    company: contract?.company || sites[0]?.company || "",
    sla: contract?.sla || sites[0]?.sla || "",
    status: contract?.status || "",
    frequency: contract?.frequency || "",
    staffCount: contract?.staffCount ?? sites[0]?.staffCount ?? 0,
    monthlyAmount: contract?.monthlyAmount ?? 0,
    contractSites,
    sites,
    complete: verdict.ok,
    checks: verdict.checks,
  };
}

export async function setSiteStatus(
  siteId: string,
  status: OpsSiteStatus,
  actor: Actor,
): Promise<OpsSite> {
  const site = await getOpsSite(siteId);
  if (!site) throw new Error("Site introuvable.");
  site.status = status;
  site.history = [
    hist(actor, `Site → ${status}`),
    ...site.history,
  ].slice(0, 40);
  const saved = await saveSite(site);
  const client = await getOpsClient(site.clientId);
  if (client) {
    const sites = await listOpsSites({ clientId: client.id });
    client.siteCount = sites.length;
    client.activeSiteCount = sites.filter((s) => s.status === "actif").length;
    await saveClient(client);
  }
  return saved;
}

export async function updateSiteConsignes(
  siteId: string,
  consignes: string,
  actor: Actor,
): Promise<OpsSite> {
  const site = await getOpsSite(siteId);
  if (!site) throw new Error("Site introuvable.");
  site.consignes = clean(consignes, 8000);
  site.history = [
    hist(actor, "Consignes site mises à jour"),
    ...site.history,
  ].slice(0, 40);
  return saveSite(site);
}

export async function upsertPrestation(
  siteId: string,
  input: Partial<OpsPrestation> & { label: string },
  actor: Actor,
): Promise<OpsSite> {
  const site = await getOpsSite(siteId);
  if (!site) throw new Error("Site introuvable.");
  const id = clean(input.id, 40);
  if (id) {
    site.prestations = site.prestations.map((p) =>
      p.id === id
        ? {
            ...p,
            label: clean(input.label, 240) || p.label,
            frequency: clean(input.frequency, 80) || p.frequency,
            requiredStaff:
              input.requiredStaff !== undefined
                ? Math.max(1, Number(input.requiredStaff) || 1)
                : p.requiredStaff,
            durationMinutes:
              input.durationMinutes !== undefined
                ? Math.max(30, Number(input.durationMinutes) || 30)
                : p.durationMinutes,
            consignes:
              input.consignes !== undefined
                ? clean(input.consignes, 4000)
                : p.consignes,
            active: input.active !== undefined ? Boolean(input.active) : p.active,
          }
        : p,
    );
  } else {
    site.prestations = [
      ...site.prestations,
      {
        id: `PR-${randomUUID().slice(0, 6).toUpperCase()}`,
        label: clean(input.label, 240),
        frequency: clean(input.frequency, 80) || "hebdomadaire",
        requiredStaff: Math.max(1, Number(input.requiredStaff) || 1),
        durationMinutes: Math.max(30, Number(input.durationMinutes) || 180),
        consignes: clean(input.consignes, 4000) || site.consignes,
        active: true,
        sourceTariffId: "",
      },
    ];
  }
  site.history = [
    hist(actor, `Prestation « ${input.label} » enregistrée`),
    ...site.history,
  ].slice(0, 40);
  return saveSite(site);
}
