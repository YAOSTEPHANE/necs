import { getDb } from "@/lib/mongo";
import type { SocialConnectorDefinition } from "@/lib/social-connectors/types";

export type ConnectorRuntimeState = {
  connectorId: string;
  enabled: boolean;
  lastSyncAt: string | null;
  lastError: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
};

async function stateCol() {
  const db = await getDb();
  const col = db.collection<ConnectorRuntimeState>("social_connector_state");
  void col.createIndex({ connectorId: 1 }, { unique: true }).catch(() => undefined);
  return col;
}

export async function getConnectorState(
  connectorId: string,
): Promise<ConnectorRuntimeState | null> {
  const col = await stateCol();
  return col.findOne({ connectorId });
}

export async function listConnectorStates(): Promise<ConnectorRuntimeState[]> {
  const col = await stateCol();
  return col.find({}).toArray();
}

export async function setConnectorEnabled(
  connectorId: string,
  enabled: boolean,
  actor: { userId: string; name: string },
): Promise<ConnectorRuntimeState> {
  const col = await stateCol();
  const stamp = new Date().toISOString();
  const next: ConnectorRuntimeState = {
    connectorId,
    enabled,
    lastSyncAt: (await getConnectorState(connectorId))?.lastSyncAt ?? null,
    lastError: "",
    updatedAt: stamp,
    updatedBy: actor.userId,
    updatedByName: actor.name,
  };
  await col.updateOne(
    { connectorId },
    { $set: next },
    { upsert: true },
  );
  return next;
}

export async function touchConnectorSync(
  connectorId: string,
  error = "",
): Promise<void> {
  const col = await stateCol();
  await col.updateOne(
    { connectorId },
    {
      $set: {
        lastSyncAt: new Date().toISOString(),
        lastError: error.slice(0, 400),
        updatedAt: new Date().toISOString(),
      },
      $setOnInsert: {
        connectorId,
        enabled: true,
        updatedBy: "system",
        updatedByName: "system",
      },
    },
    { upsert: true },
  );
}

/** Défaut enabled : live = true, ready/planned = false. */
export function defaultEnabled(def: SocialConnectorDefinition): boolean {
  return def.status === "live";
}
