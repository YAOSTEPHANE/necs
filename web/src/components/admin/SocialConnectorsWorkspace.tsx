"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconMail } from "@/components/admin/Icons";
import {
  SOCIAL_CONNECTOR_STATUS_LABELS,
  type SocialConnectorPublic,
  type SocialConnectorSyncResult,
} from "@/lib/social-connectors/types";
import { toast } from "@/lib/toast";

type RecentRow = {
  connectorId: string;
  externalId: string;
  email: string;
  crmLeadId: string;
  at: string;
  origin: string;
};

function formatWhen(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SocialConnectorsWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [canManage, setCanManage] = useState(false);
  const [connectors, setConnectors] = useState<SocialConnectorPublic[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [howToAdd, setHowToAdd] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<SocialConnectorSyncResult | null>(
    null,
  );

  const refresh = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    try {
      const res = await fetch("/api/social-connectors", { cache: "no-store" });
      const data = (await res.json()) as {
        connectors?: SocialConnectorPublic[];
        recent?: RecentRow[];
        howToAdd?: string;
        canManage?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setConnectors(data.connectors ?? []);
      setRecent(data.recent ?? []);
      setHowToAdd(data.howToAdd ?? "");
      setCanManage(Boolean(data.canManage));
      setSelectedId((prev) => prev ?? data.connectors?.[0]?.id ?? null);
    } catch (error) {
      if (!opts?.soft) {
        toast.error(error instanceof Error ? error.message : "Erreur");
      }
    } finally {
      if (!opts?.soft) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = useMemo(
    () => connectors.find((c) => c.id === selectedId) ?? null,
    [connectors, selectedId],
  );

  const recentForSelected = useMemo(
    () =>
      selected
        ? recent.filter((r) => r.connectorId === selected.id)
        : recent,
    [recent, selected],
  );

  async function postAction(
    action: string,
    extra: Record<string, unknown> = {},
  ) {
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/social-connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json()) as {
        connector?: SocialConnectorPublic;
        connectors?: SocialConnectorPublic[];
        sync?: SocialConnectorSyncResult;
        injected?: {
          email: string;
          created: boolean;
          externalId: string;
        };
        recent?: RecentRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action échouée");
      if (data.connectors) setConnectors(data.connectors);
      if (data.connector) {
        setConnectors((prev) =>
          prev.map((c) => (c.id === data.connector!.id ? data.connector! : c)),
        );
      }
      if (data.recent) setRecent(data.recent);
      if (data.sync) {
        setLastSync(data.sync);
        toast.success(
          `Sync : ${data.sync.created} créés · ${data.sync.skipped} dédup`,
        );
      } else if (data.injected) {
        toast.success(
          data.injected.created
            ? `Lead test → CRM (${data.injected.email})`
            : `Déjà présent (${data.injected.email})`,
        );
        await refresh({ soft: true });
      } else {
        toast.success("Mis à jour");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  const liveCount = connectors.filter((c) => c.status === "live").length;
  const enabledCount = connectors.filter((c) => c.enabled).length;

  return (
    <div
      className={
        embedded
          ? "leads-page soc-page leads-page--embedded"
          : "leads-page soc-page"
      }
    >
      {embedded ? (
        <header className="dig-feature__head">
          <div>
            <p className="dig-feature__eyebrow">Connecteurs sociaux</p>
            <h2>Autres réseaux sociaux</h2>
            <p>
              Architecture de connecteurs : ajouter un réseau sans modifier le
              cœur CRM.
            </p>
          </div>
          <div className="dig-feature__meta">
            <span>
              <strong>{connectors.length}</strong> connecteurs
            </span>
            <span>
              <strong>{liveCount}</strong> live
            </span>
          </div>
        </header>
      ) : (
      <ModuleHeader
        tone="#0f766e"
        badge="Réseaux sociaux"
        icon={<IconMail size={20} />}
        title="Autres réseaux sociaux"
        meta={
          <>
            <span>
              <strong>{connectors.length}</strong> connecteurs
            </span>
            <span>
              <strong>{liveCount}</strong> live
            </span>
            <span>
              <strong>{enabledCount}</strong> actifs
            </span>
          </>
        }
        actions={
          <button
            type="button"
            className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
            onClick={() => void refresh()}
            disabled={loading}
          >
            Actualiser
          </button>
        }
      />
      )}

      <p className="soc-lead">
        Architecture de connecteurs : chaque réseau expose permissions et
        limites propres. Ajouter un connecteur = un fichier + une ligne au
        registre — <strong>sans modifier le cœur CRM</strong>.
      </p>

      {loading && connectors.length === 0 ? (
        <p className="leads-empty">Chargement…</p>
      ) : (
        <div className="soc-layout">
          <section className="soc-list" aria-label="Connecteurs">
            <ul>
              {connectors.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`soc-card${selectedId === c.id ? " is-active" : ""}`}
                    onClick={() => setSelectedId(c.id)}
                    style={{ ["--soc-color" as string]: c.brandColor }}
                  >
                    <span className="soc-card__dot" aria-hidden />
                    <span className="soc-card__body">
                      <span className="soc-card__top">
                        <strong>{c.label}</strong>
                        <span
                          className={`soc-badge soc-badge--${c.status}`}
                        >
                          {SOCIAL_CONNECTOR_STATUS_LABELS[c.status]}
                        </span>
                      </span>
                      <span className="soc-card__meta">
                        {c.enabled ? "Activé" : "Désactivé"}
                        {" · "}
                        {c.processedCount} leads
                        {" · "}
                        {c.configured ? "config OK" : "secrets manquants"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="soc-howto">
              <h3>Ajouter un connecteur</h3>
              <pre>{howToAdd}</pre>
            </div>
          </section>

          <article className="soc-detail" aria-live="polite">
            {!selected ? (
              <p className="soc-empty">Sélectionnez un connecteur.</p>
            ) : (
              <>
                <header className="soc-detail__head">
                  <div>
                    <p className="soc-detail__eyebrow">
                      {selected.id} ·{" "}
                      {SOCIAL_CONNECTOR_STATUS_LABELS[selected.status]}
                    </p>
                    <h2>{selected.label}</h2>
                    <p>{selected.description}</p>
                  </div>
                  <span
                    className="soc-detail__swatch"
                    style={{ background: selected.brandColor }}
                    aria-hidden
                  />
                </header>

                <div className="soc-detail__flags">
                  <span
                    className={`soc-pill${selected.enabled ? " is-on" : ""}`}
                  >
                    {selected.enabled ? "Activé" : "Désactivé"}
                  </span>
                  <span
                    className={`soc-pill${selected.configured ? " is-on" : " is-warn"}`}
                  >
                    {selected.configured
                      ? "Secrets présents"
                      : "Secrets à renseigner"}
                  </span>
                  <span className="soc-pill">
                    {selected.processedCount} injections
                  </span>
                </div>

                {canManage ? (
                  <div className="soc-actions">
                    <button
                      type="button"
                      className={`btn-admin ${selected.enabled ? "btn-admin--ghost" : "btn-admin--primary"}`}
                      disabled={busy}
                      onClick={() =>
                        void postAction("enable", {
                          id: selected.id,
                          enabled: !selected.enabled,
                        })
                      }
                    >
                      {selected.enabled ? "Désactiver" : "Activer"}
                    </button>
                    {selected.capabilities.includes("sync") ? (
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy || !selected.enabled}
                        onClick={() =>
                          void postAction("sync", { id: selected.id })
                        }
                      >
                        Synchroniser
                      </button>
                    ) : null}
                    {selected.capabilities.includes("test_inject") ? (
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy}
                        onClick={() =>
                          void postAction("inject_test", {
                            id: selected.id,
                          })
                        }
                      >
                        Lead test → CRM
                      </button>
                    ) : null}
                    {selected.manageHref ? (
                      <Link
                        href={selected.manageHref}
                        className="btn-admin btn-admin--primary"
                      >
                        Configurer
                      </Link>
                    ) : null}
                    <a
                      href={selected.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-admin btn-admin--ghost"
                    >
                      Docs API
                    </a>
                  </div>
                ) : null}

                {lastSync && selected.capabilities.includes("sync") ? (
                  <p className="soc-sync-hint">
                    Dernière sync UI : {lastSync.fetched} lus ·{" "}
                    {lastSync.created} créés · {lastSync.skipped} ignorés
                  </p>
                ) : null}

                {selected.lastError ? (
                  <p className="soc-error" role="alert">
                    {selected.lastError}
                  </p>
                ) : null}

                <section className="soc-section">
                  <h3>Permissions</h3>
                  <ul className="soc-perms">
                    {selected.permissions.map((p) => (
                      <li key={p.scope}>
                        <code>{p.scope}</code>
                        <span>{p.why}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="soc-section">
                  <h3>Limites plateforme</h3>
                  <ul className="soc-limits">
                    {selected.rateLimits.map((r) => (
                      <li key={r.label}>
                        <strong>{r.label}</strong>
                        <span>{r.detail}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="soc-section">
                  <h3>Capacités</h3>
                  <div className="soc-caps">
                    {selected.capabilities.map((cap) => (
                      <span key={cap} className="soc-cap">
                        {cap}
                      </span>
                    ))}
                  </div>
                  <p className="soc-meta-line">
                    Dernière sync : {formatWhen(selected.lastSyncAt)}
                  </p>
                </section>

                <section className="soc-section">
                  <h3>Injections récentes</h3>
                  {recentForSelected.length === 0 ? (
                    <p className="soc-empty">Aucune injection pour ce connecteur.</p>
                  ) : (
                    <ul className="soc-ingest">
                      {recentForSelected.slice(0, 12).map((row) => (
                        <li key={`${row.externalId}-${row.at}`}>
                          <div>
                            <strong>{row.email}</strong>
                            <span>
                              {formatWhen(row.at)} · {row.origin} ·{" "}
                              {row.externalId}
                            </span>
                          </div>
                          <Link href="/admin/demandes">CRM</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
