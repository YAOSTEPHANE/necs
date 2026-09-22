/**
 * OPS-05 — Mode offline / dégradé (étude technique → Must confirmé)
 *
 * Approche retenue : Outbox pattern
 * - File locale IndexedDB, payloads chiffrés AES-GCM (Web Crypto)
 * - Identifiants uniques client (OFF-…) + horodatage client
 * - Sync au retour réseau via APIs idempotentes (clientRequestId)
 * - Conflits : serveur déjà appliqué → statut conflict / synced (sans doublon)
 *
 * Hors scope v1 : Service Worker.
 * Photos qualité : data-URL optimisées via `quality_photo` / `quality_score.photoUrl`.
 */

export type OfflineOpKind =
  | "pointage_in"
  | "pointage_out"
  | "ot_checklist"
  | "ot_complete"
  | "ot_anomaly"
  | "quality_start"
  | "quality_score"
  | "quality_photo"
  | "quality_complete";

export type OfflineOpStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "conflict"
  | "error"
  | "discarded";

export type OfflineQueueItem = {
  id: string;
  kind: OfflineOpKind;
  status: OfflineOpStatus;
  /** Horodatage client de création (UTC ISO) */
  createdAt: string;
  /** Horloge métier (ex. heure de pointage HH:MM + date) */
  occurredAt: string;
  userId: string;
  payload: Record<string, unknown>;
  attempts: number;
  lastError: string;
  syncedAt: string | null;
  serverResult: Record<string, unknown> | null;
};

export const OFFLINE_QUEUE_EVENT = "necs-offline-queue-updated";
export const OFFLINE_DB = "necs_offline_v1";
export const OFFLINE_STORE = "outbox";
export const OFFLINE_META = "meta";

export const OFFLINE_OP_LABELS: Record<OfflineOpKind, string> = {
  pointage_in: "Pointage arrivée",
  pointage_out: "Pointage départ",
  ot_checklist: "Contrôle OT (checklist)",
  ot_complete: "Contrôle OT (terminé)",
  ot_anomaly: "Contrôle OT (anomalie)",
  quality_start: "Contrôle qualité (démarrage)",
  quality_score: "Contrôle qualité (notation)",
  quality_photo: "Contrôle qualité (photo)",
  quality_complete: "Contrôle qualité (clôture)",
};

export const OFFLINE_STATUS_LABELS: Record<OfflineOpStatus, string> = {
  pending: "En attente",
  syncing: "Sync…",
  synced: "Synchronisé",
  conflict: "Conflit",
  error: "Erreur",
  discarded: "Ignoré",
};

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function newOfflineId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `OFF-${uuid}`;
}

export function emitOfflineQueueUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));
  }
}
