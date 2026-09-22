"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  OFFLINE_QUEUE_EVENT,
  OFFLINE_OP_LABELS,
  OFFLINE_STATUS_LABELS,
  isBrowserOnline,
  type OfflineQueueItem,
} from "@/lib/offline-shared";
import {
  clearSyncedOfflineOps,
  flushOfflineQueue,
  isForceOffline,
  listOfflineQueue,
  offlineQueueStats,
  setForceOffline,
} from "@/lib/offline-queue";
import { loadSession } from "@/lib/auth";
import { toast } from "@/lib/toast";

function readOnline(): boolean {
  if (isForceOffline()) return false;
  return isBrowserOnline();
}

type OfflineSyncContextValue = {
  ready: boolean;
  online: boolean;
  busy: boolean;
  open: boolean;
  setOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  items: OfflineQueueItem[];
  pending: number;
  conflicts: number;
  syncNow: () => Promise<void>;
  toggleForceOffline: () => void;
  purgeSynced: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

export function useOfflineSync() {
  return useContext(OfflineSyncContext);
}

export function OfflineSyncHost({ children }: { children?: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const flushingRef = useRef(false);

  const refresh = useCallback(async () => {
    const session = loadSession();
    const uid = session?.userId || "";
    setUserId(uid);
    setOnline(readOnline());
    if (!uid) {
      setItems([]);
      return;
    }
    try {
      setItems(await listOfflineQueue(uid));
    } catch {
      setItems([]);
    }
  }, []);

  const runFlush = useCallback(
    async (uid: string) => {
      if (!uid || !readOnline() || flushingRef.current) return;
      flushingRef.current = true;
      try {
        await flushOfflineQueue(uid);
        await refresh();
      } finally {
        flushingRef.current = false;
      }
    },
    [refresh],
  );

  const syncNow = useCallback(async () => {
    if (!userId) return;
    if (!readOnline()) {
      toast.warning("Toujours hors ligne — sync impossible.");
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      const r = await flushOfflineQueue(userId);
      await refresh();
      if (r.processed === 0) {
        toast.info("File vide.");
      } else if (r.errors === 0) {
        toast.success(
          `Sync OK · ${r.synced} synchronisé(s) · ${r.conflicts} conflit(s) (sans doublon)`,
        );
      } else {
        toast.warning(
          `Sync partielle · ${r.synced} OK · ${r.errors} en attente/erreur`,
        );
      }
    } finally {
      setBusy(false);
    }
  }, [userId, refresh]);

  const toggleForceOffline = useCallback(() => {
    const next = !isForceOffline();
    setForceOffline(next);
    setOnline(readOnline());
    toast.info(
      next
        ? "Mode dégradé forcé (recette) — opérations mises en file"
        : "Mode dégradé forcé désactivé",
    );
    void refresh();
  }, [refresh]);

  const purgeSynced = useCallback(async () => {
    if (!userId) return;
    const n = await clearSyncedOfflineOps(userId);
    toast.success(`${n} entrée(s) purgée(s)`);
    await refresh();
  }, [userId, refresh]);

  useEffect(() => {
    void refresh();
    const onNet = () => {
      void refresh();
    };
    const onQueue = () => void refresh();
    window.addEventListener("online", onNet);
    window.addEventListener("offline", onNet);
    window.addEventListener(OFFLINE_QUEUE_EVENT, onQueue);
    window.addEventListener("storage", onQueue);
    return () => {
      window.removeEventListener("online", onNet);
      window.removeEventListener("offline", onNet);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, onQueue);
      window.removeEventListener("storage", onQueue);
    };
  }, [refresh]);

  useEffect(() => {
    if (online && userId) {
      void runFlush(userId);
    }
  }, [online, userId, runFlush]);

  const stats = offlineQueueStats(items);
  const pending = stats.pending + stats.syncing;

  const value = useMemo<OfflineSyncContextValue>(
    () => ({
      ready: Boolean(userId),
      online,
      busy,
      open,
      setOpen,
      items,
      pending,
      conflicts: stats.conflicts,
      syncNow,
      toggleForceOffline,
      purgeSynced,
    }),
    [
      userId,
      online,
      busy,
      open,
      items,
      pending,
      stats.conflicts,
      syncNow,
      toggleForceOffline,
      purgeSynced,
    ],
  );

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

/** Contrôles offline à placer dans le header admin. */
export function OfflineSyncBar() {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx?.ready) return null;

  const {
    online,
    busy,
    open,
    setOpen,
    items,
    pending,
    conflicts,
    syncNow,
    toggleForceOffline,
    purgeSynced,
  } = ctx;

  return (
    <div className="offline-sync-slot">
      <div
        className={`offline-bar offline-bar--topbar${online ? "" : " is-offline"}${pending ? " has-queue" : ""}`}
        role="status"
      >
        <button
          type="button"
          className="offline-bar__toggle"
          onClick={() => setOpen((v) => !v)}
        >
          {online ? "En ligne" : "Hors ligne / dégradé"}
          {pending > 0 ? ` · ${pending} en file` : ""}
          {conflicts > 0 ? ` · ${conflicts} conflit(s)` : ""}
        </button>
        <div className="offline-bar__actions">
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            disabled={busy || !online}
            onClick={() => void syncNow()}
          >
            Synchroniser
          </button>
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            onClick={toggleForceOffline}
          >
            {isForceOffline() ? "Fin test offline" : "Simuler offline"}
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="offline-panel offline-panel--topbar panel-card"
          role="dialog"
        >
          <header className="offline-panel__head">
            <h3>File de synchronisation</h3>
            <p>
              Données locales chiffrées (AES-GCM) · id uniques · horodatage ·
              anti-doublon à la sync
            </p>
          </header>
          {items.length === 0 ? (
            <p className="note">Aucune opération en file.</p>
          ) : (
            <ul className="offline-panel__list">
              {items
                .slice()
                .reverse()
                .map((i) => (
                  <li key={i.id} className={`is-${i.status}`}>
                    <strong>
                      {OFFLINE_OP_LABELS[i.kind]} ·{" "}
                      {OFFLINE_STATUS_LABELS[i.status]}
                    </strong>
                    <span>
                      {i.id} · {new Date(i.createdAt).toLocaleString("fr-FR")}
                    </span>
                    {i.lastError ? <em>{i.lastError}</em> : null}
                  </li>
                ))}
            </ul>
          )}
          <div className="offline-panel__foot">
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => void purgeSynced()}
            >
              Purger synchronisées
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => setOpen(false)}
            >
              Fermer
            </button>
          </div>
          <p className="note offline-panel__recette">
            Recette : « Simuler offline » → plusieurs pointages et contrôles
            (OT / qualité) → « Fin test offline » + Synchroniser → vérifier
            unicité (pas de doublon, rejeux marqués synchronisés, conflits
            métier signalés).
          </p>
        </div>
      ) : null}
    </div>
  );
}
