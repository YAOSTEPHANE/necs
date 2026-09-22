"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconMail, IconUser } from "@/components/admin/Icons";
import type {
  FacebookLeadConfigPublic,
  FacebookSyncResult,
} from "@/lib/facebook-leads-shared";
import { toast } from "@/lib/toast";

type RecentRow = {
  facebookLeadId: string;
  email: string;
  crmLeadId: string;
  at: string;
  source: string;
};

function formatWhen(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FacebookLeadsWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [canManage, setCanManage] = useState(false);
  const [config, setConfig] = useState<FacebookLeadConfigPublic | null>(null);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [lastSync, setLastSync] = useState<FacebookSyncResult | null>(null);

  const [pageId, setPageId] = useState("");
  const [pageName, setPageName] = useState("");
  const [formIdsCsv, setFormIdsCsv] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [tokenExpiresAt, setTokenExpiresAt] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [testName, setTestName] = useState("Lead Facebook Test");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/facebook/leads", { cache: "no-store" });
      const data = (await res.json()) as {
        config?: FacebookLeadConfigPublic;
        recent?: RecentRow[];
        canManage?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setConfig(data.config ?? null);
      setRecent(data.recent ?? []);
      setCanManage(Boolean(data.canManage));
      if (data.config) {
        setPageId(data.config.pageId);
        setPageName(data.config.pageName);
        setFormIdsCsv(data.config.formIds.join(", "));
        setTokenExpiresAt(data.config.tokenExpiresAt?.slice(0, 16) || "");
        setEnabled(data.config.enabled);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function postAction(
    action: string,
    extra: Record<string, unknown> = {},
  ) {
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/facebook/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json()) as {
        config?: FacebookLeadConfigPublic;
        recent?: RecentRow[];
        sync?: FacebookSyncResult;
        injected?: { leadId: string; email: string; created: boolean };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action échouée");
      if (data.config) {
        setConfig(data.config);
        setPageId(data.config.pageId);
        setPageName(data.config.pageName);
        setFormIdsCsv(data.config.formIds.join(", "));
        setTokenExpiresAt(data.config.tokenExpiresAt?.slice(0, 16) || "");
        setEnabled(data.config.enabled);
      }
      if (data.recent) setRecent(data.recent);
      if (data.sync) {
        setLastSync(data.sync);
        toast.success(
          `Sync : ${data.sync.created} créés · ${data.sync.updated} maj · ${data.sync.skipped} ignorés`,
        );
      } else if (data.injected) {
        toast.success(
          data.injected.created
            ? `Lead test créé · ${data.injected.email}`
            : `Lead test déjà présent · ${data.injected.email}`,
        );
      } else {
        toast.success("Enregistré");
      }
      setPageAccessToken("");
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    await postAction("save_config", {
      enabled,
      pageId,
      pageName,
      formIdsCsv,
      pageAccessToken,
      tokenExpiresAt: tokenExpiresAt
        ? new Date(tokenExpiresAt).toISOString()
        : null,
    });
  }

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";
  const callbackUrl = `${appUrl}${config?.webhookCallbackPath || "/api/facebook/webhook"}`;

  return (
    <div
      className={
        embedded
          ? "leads-page fb-leads-page leads-page--embedded"
          : "leads-page fb-leads-page"
      }
    >
      {embedded ? (
        <header className="dig-feature__head">
          <div>
            <p className="dig-feature__eyebrow">Facebook Lead Ads</p>
            <h2>Facebook Lead Ads</h2>
            <p>Tokens sécurisés, webhook, déduplication → CRM.</p>
          </div>
          <div className="dig-feature__meta">
            <span>
              <strong>{config?.processedCount ?? 0}</strong> leads FB
            </span>
            <span>
              <strong>{config?.enabled ? "ON" : "OFF"}</strong> sync
            </span>
            {canManage ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                disabled={busy || !config?.tokenPresent}
                onClick={() => void postAction("sync")}
              >
                Synchroniser
              </button>
            ) : null}
            <button
              type="button"
              className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
              onClick={() => void refresh()}
              disabled={loading}
            >
              Actualiser
            </button>
          </div>
        </header>
      ) : (
      <ModuleHeader
        tone="#1877f2"
        badge="Facebook"
        icon={<IconMail size={20} />}
        title="Intégration Facebook"
        meta={
          <>
            <span>
              <strong>{config?.processedCount ?? 0}</strong> leads FB
            </span>
            <span>
              <strong>{config?.enabled ? "ON" : "OFF"}</strong> sync
            </span>
            <span>
              Token{" "}
              <strong>
                {config?.tokenExpired
                  ? "expiré"
                  : config?.tokenPresent
                    ? "OK"
                    : "manquant"}
              </strong>
            </span>
          </>
        }
        actions={
          <>
            {canManage ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                disabled={busy || !config?.tokenPresent}
                onClick={() => void postAction("sync")}
              >
                Synchroniser maintenant
              </button>
            ) : null}
            <button
              type="button"
              className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
              onClick={() => void refresh()}
              disabled={loading}
            >
              Actualiser
            </button>
          </>
        }
      />
      )}

      {loading && !config ? (
        <p className="leads-empty">Chargement…</p>
      ) : (
        <div className="fb-leads-grid">
          <section className="fb-card">
            <header className="fb-card__head">
              <h2>État & permissions</h2>
              <p>
                Récupération officielle Meta Lead Ads → injection CRM (source
                conservée, déduplication).
              </p>
            </header>

            <ul className="fb-status-list">
              <li>
                <span>App Meta (env)</span>
                <strong
                  className={config?.appConfigured ? "is-ok" : "is-warn"}
                >
                  {config?.appConfigured ? "Configurée" : "À renseigner"}
                </strong>
              </li>
              <li>
                <span>Verify token webhook</span>
                <strong
                  className={
                    config?.webhookVerifyConfigured ? "is-ok" : "is-warn"
                  }
                >
                  {config?.webhookVerifyConfigured ? "OK" : "Manquant"}
                </strong>
              </li>
              <li>
                <span>Page Access Token</span>
                <strong
                  className={
                    config?.tokenExpired
                      ? "is-bad"
                      : config?.tokenPresent
                        ? "is-ok"
                        : "is-warn"
                  }
                >
                  {config?.tokenExpired
                    ? "Expiré"
                    : config?.tokenMasked || "Non enregistré"}
                </strong>
              </li>
              <li>
                <span>Expiration token</span>
                <strong>{formatWhen(config?.tokenExpiresAt ?? null)}</strong>
              </li>
              <li>
                <span>Dernière sync</span>
                <strong>{formatWhen(config?.lastSyncAt ?? null)}</strong>
              </li>
              <li>
                <span>Dernier webhook</span>
                <strong>{formatWhen(config?.lastWebhookAt ?? null)}</strong>
              </li>
            </ul>

            {config?.lastError ? (
              <p className="fb-error" role="alert">
                {config.lastError}
              </p>
            ) : null}

            <div className="fb-perms">
              <h3>Permissions Graph API</h3>
              <ul>
                {(config?.permissions ?? []).map((p) => (
                  <li key={p.scope}>
                    <code>{p.scope}</code>
                    <span>{p.why}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="fb-callback">
              <h3>Callback webhook</h3>
              <code>{callbackUrl}</code>
              <p>
                Dans Meta for Developers → Webhooks → Page → champ{" "}
                <strong>leadgen</strong>. Verify token ={" "}
                <code>FACEBOOK_VERIFY_TOKEN</code>.
              </p>
            </div>
          </section>

          <section className="fb-card">
            <header className="fb-card__head">
              <h2>Configuration Page</h2>
              <p>
                Tokens stockés chiffrés (AES-GCM). Jamais renvoyés en clair à
                l’UI.
              </p>
            </header>

            {canManage ? (
              <form className="fb-form" onSubmit={onSave}>
                <label className="fb-check">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  Intégration active
                </label>
                <label>
                  <span>Page ID</span>
                  <input
                    required
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder="Ex. 1234567890"
                  />
                </label>
                <label>
                  <span>Nom de la Page</span>
                  <input
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    placeholder="NECS Cameroun"
                  />
                </label>
                <label>
                  <span>Form IDs (optionnel, séparés par virgule)</span>
                  <input
                    value={formIdsCsv}
                    onChange={(e) => setFormIdsCsv(e.target.value)}
                    placeholder="Tous les formulaires si vide"
                  />
                </label>
                <label>
                  <span>
                    Page Access Token
                    {config?.tokenPresent
                      ? ` (actuel ${config.tokenMasked})`
                      : ""}
                  </span>
                  <input
                    type="password"
                    autoComplete="off"
                    value={pageAccessToken}
                    onChange={(e) => setPageAccessToken(e.target.value)}
                    placeholder={
                      config?.tokenPresent
                        ? "Laisser vide pour conserver"
                        : "Collez le token longue durée"
                    }
                  />
                </label>
                <label>
                  <span>Expiration token (optionnel)</span>
                  <input
                    type="datetime-local"
                    value={tokenExpiresAt}
                    onChange={(e) => setTokenExpiresAt(e.target.value)}
                  />
                </label>
                <div className="fb-form__actions">
                  <button
                    type="submit"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            ) : (
              <p className="fb-readonly">
                Lecture seule (commercial). La configuration est gérée par
                marketing / admin.
              </p>
            )}

            {canManage ? (
              <div className="fb-test">
                <h3>Recette — injecter un lead Facebook</h3>
                <p>
                  Simule un leadgen supporté (source <code>facebook</code>,
                  medium <code>lead_ad</code>, historique conservé). Vérifiable
                  dans{" "}
                  <Link href="/admin/demandes">Demandes site</Link>.
                </p>
                <div className="fb-test__row">
                  <input
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Nom"
                  />
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="email@test.com (auto si vide)"
                  />
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={busy}
                    onClick={() =>
                      void postAction("inject_test", {
                        name: testName,
                        email: testEmail,
                      })
                    }
                  >
                    Créer lead test
                  </button>
                </div>
              </div>
            ) : null}

            {lastSync ? (
              <div className="fb-sync-result">
                <h3>Dernière sync</h3>
                <p>
                  {lastSync.fetched} lus · {lastSync.created} créés ·{" "}
                  {lastSync.updated} mis à jour · {lastSync.skipped} dédupliqués
                </p>
                {lastSync.errors.length > 0 ? (
                  <ul>
                    {lastSync.errors.slice(0, 5).map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="fb-card fb-card--wide">
            <header className="fb-card__head">
              <h2>Historique d’injection</h2>
              <p>
                Déduplication par <code>facebookLeadId</code> + e-mail CRM.
                Première source conservée.
              </p>
            </header>
            {recent.length === 0 ? (
              <p className="fb-empty">Aucun lead Facebook ingéré pour l’instant.</p>
            ) : (
              <div className="fb-table-wrap">
                <table className="fb-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Leadgen ID</th>
                      <th>E-mail</th>
                      <th>Origine</th>
                      <th>CRM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((row) => (
                      <tr key={`${row.facebookLeadId}-${row.at}`}>
                        <td>{formatWhen(row.at)}</td>
                        <td>
                          <code>{row.facebookLeadId}</code>
                        </td>
                        <td>{row.email}</td>
                        <td>
                          <span className={`fb-origin fb-origin--${row.source}`}>
                            {row.source}
                          </span>
                        </td>
                        <td>
                          <Link href="/admin/demandes">
                            <IconUser size={14} /> Voir inbox
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
