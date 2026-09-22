/**
 * Registre des connecteurs sociaux.
 *
 * Pour ajouter un réseau sans toucher au cœur CRM :
 * 1. Créer `connectors/<id>.ts` exportant un `SocialConnectorDefinition`
 * 2. L’importer et l’ajouter dans `CONNECTORS` ci-dessous
 * 3. (Optionnel) renseigner les variables d’env documentées
 *
 * Aucune modification de `leads-crm.ts` n’est requise.
 */
import { facebookConnector } from "@/lib/social-connectors/connectors/facebook";
import { instagramConnector } from "@/lib/social-connectors/connectors/instagram";
import { linkedinConnector } from "@/lib/social-connectors/connectors/linkedin";
import { tiktokConnector } from "@/lib/social-connectors/connectors/tiktok";
import { whatsappConnector } from "@/lib/social-connectors/connectors/whatsapp";
import { xConnector } from "@/lib/social-connectors/connectors/x";
import {
  countSocialIngestions,
  listSocialIngestions,
} from "@/lib/social-connectors/ingest";
import {
  defaultEnabled,
  getConnectorState,
  listConnectorStates,
  setConnectorEnabled,
  touchConnectorSync,
} from "@/lib/social-connectors/state";
import type {
  SocialConnectorDefinition,
  SocialConnectorPublic,
  SocialConnectorSyncResult,
} from "@/lib/social-connectors/types";

/** Point d’extension unique — ajouter ici le nouveau connecteur. */
const CONNECTORS: SocialConnectorDefinition[] = [
  facebookConnector,
  instagramConnector,
  linkedinConnector,
  xConnector,
  tiktokConnector,
  whatsappConnector,
];

export function listConnectorDefinitions(): SocialConnectorDefinition[] {
  return [...CONNECTORS];
}

export function getConnectorDefinition(
  id: string,
): SocialConnectorDefinition | null {
  return CONNECTORS.find((c) => c.id === id) ?? null;
}

export async function listConnectorsPublic(): Promise<SocialConnectorPublic[]> {
  const states = await listConnectorStates();
  const byId = new Map(states.map((s) => [s.connectorId, s]));

  const out: SocialConnectorPublic[] = [];
  for (const def of CONNECTORS) {
    const state = byId.get(def.id);
    const enabled = state?.enabled ?? defaultEnabled(def);
    const configured = await Promise.resolve(def.isConfigured());
    const processedCount = await countSocialIngestions(def.id);
    out.push({
      id: def.id,
      label: def.label,
      description: def.description,
      status: def.status,
      capabilities: def.capabilities,
      permissions: def.permissions,
      rateLimits: def.rateLimits,
      docsUrl: def.docsUrl,
      brandColor: def.brandColor,
      manageHref: def.manageHref ?? null,
      enabled,
      lastSyncAt: state?.lastSyncAt ?? null,
      lastError: state?.lastError ?? "",
      processedCount,
      configured,
    });
  }
  return out;
}

export async function enableConnector(
  id: string,
  enabled: boolean,
  actor: { userId: string; name: string },
): Promise<SocialConnectorPublic> {
  const def = getConnectorDefinition(id);
  if (!def) throw new Error(`Connecteur inconnu : ${id}`);
  await setConnectorEnabled(id, enabled, actor);
  const list = await listConnectorsPublic();
  const row = list.find((c) => c.id === id);
  if (!row) throw new Error("Connecteur introuvable après maj");
  return row;
}

export async function syncConnector(
  id: string,
): Promise<{ sync: SocialConnectorSyncResult; connector: SocialConnectorPublic }> {
  const def = getConnectorDefinition(id);
  if (!def) throw new Error(`Connecteur inconnu : ${id}`);
  const state = await getConnectorState(id);
  const enabled = state?.enabled ?? defaultEnabled(def);
  if (!enabled) throw new Error("Connecteur désactivé.");
  if (!def.sync) {
    throw new Error(
      `Sync non implémentée pour « ${def.label} » (status: ${def.status}).`,
    );
  }
  try {
    const sync = await def.sync();
    await touchConnectorSync(id, sync.errors[0] ?? "");
    const list = await listConnectorsPublic();
    return {
      sync,
      connector: list.find((c) => c.id === id)!,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync échouée";
    await touchConnectorSync(id, msg);
    throw err;
  }
}

export async function injectConnectorTest(
  id: string,
  input?: { name?: string; email?: string; phone?: string },
) {
  const def = getConnectorDefinition(id);
  if (!def) throw new Error(`Connecteur inconnu : ${id}`);
  if (!def.injectTest) {
    throw new Error(`Test inject non disponible pour « ${def.label} ».`);
  }
  const state = await getConnectorState(id);
  const enabled = state?.enabled ?? defaultEnabled(def);
  if (!enabled && def.status !== "live") {
    // autoriser le test même si disabled pour la recette « ajouter un connecteur »
  }
  const result = await def.injectTest(input);
  await touchConnectorSync(id, "");
  return result;
}

export async function listRecentIngestions(connectorId?: string) {
  return listSocialIngestions({ connectorId, limit: 40 });
}

export function howToAddConnectorMarkdown(): string {
  return [
    "1. Créer `src/lib/social-connectors/connectors/<id>.ts`",
    "2. Exporter un `SocialConnectorDefinition` (permissions + rate limits)",
    "3. L’ajouter au tableau `CONNECTORS` dans `registry.ts`",
    "4. Utiliser `ingestSocialLead()` pour pousser vers le CRM",
    "5. Aucune modification de `leads-crm.ts` requise",
  ].join("\n");
}
