"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import Link from "next/link";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconMail } from "@/components/admin/Icons";
import type {
  CampaignAnalyticsSnapshot,
  CampaignPeriod,
  CampaignTrackingConfig,
  ChannelMapping,
} from "@/lib/campaign-tracking-shared";
import { toast } from "@/lib/toast";

const PERIODS: { id: CampaignPeriod; label: string }[] = [
  { id: "7d", label: "7 jours" },
  { id: "30d", label: "30 jours" },
  { id: "90d", label: "90 jours" },
  { id: "all", label: "Tout" },
];

function pct(n: number) {
  return `${n.toFixed(n % 1 === 0 ? 0 : 1)} %`;
}

export function CampaignTrackingWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [canManage, setCanManage] = useState(false);
  const [period, setPeriod] = useState<CampaignPeriod>("30d");
  const [config, setConfig] = useState<CampaignTrackingConfig | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalyticsSnapshot | null>(
    null,
  );
  const [configOpen, setConfigOpen] = useState(false);

  const [sourceParams, setSourceParams] = useState("");
  const [campaignParams, setCampaignParams] = useState("");
  const [mediumParams, setMediumParams] = useState("");
  const [extraParams, setExtraParams] = useState("");
  const [channelsCsv, setChannelsCsv] = useState("");
  const [countClientAsWon, setCountClientAsWon] = useState(true);
  const [convTraite, setConvTraite] = useState(true);
  const [convEnCours, setConvEnCours] = useState(false);

  const applyConfigToForm = useCallback((cfg: CampaignTrackingConfig) => {
    setSourceParams(cfg.params.sourceParams.join(", "));
    setCampaignParams(cfg.params.campaignParams.join(", "));
    setMediumParams(cfg.params.mediumParams.join(", "));
    setExtraParams(cfg.params.extraParams.join(", "));
    setChannelsCsv(
      cfg.channels
        .map((c) => `${c.id}|${c.label}|${c.sources.join("+")}|${c.color}`)
        .join("\n"),
    );
    setCountClientAsWon(cfg.countClientAsWon);
    setConvTraite(cfg.conversionLeadStatuses.includes("traite"));
    setConvEnCours(cfg.conversionLeadStatuses.includes("en_cours"));
  }, []);

  const refresh = useCallback(async (p: CampaignPeriod = period) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/campaign-tracking?period=${encodeURIComponent(p)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        config?: CampaignTrackingConfig;
        analytics?: CampaignAnalyticsSnapshot;
        canManage?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setConfig(data.config ?? null);
      setAnalytics(data.analytics ?? null);
      setCanManage(Boolean(data.canManage));
      if (data.config) applyConfigToForm(data.config);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [period, applyConfigToForm]);

  useEffect(() => {
    void refresh(period);
  }, [period, refresh]);

  function parseChannels(raw: string): ChannelMapping[] {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [id, label, sources, color] = line.split("|").map((s) => s.trim());
        return {
          id: id || "channel",
          label: label || id || "Canal",
          sources: (sources || "")
            .split(/[+,\s]+/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
          color: color || "#64748b",
        };
      });
  }

  async function saveConfig() {
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const conversionLeadStatuses: Array<"traite" | "en_cours"> = [];
      if (convTraite) conversionLeadStatuses.push("traite");
      if (convEnCours) conversionLeadStatuses.push("en_cours");
      if (conversionLeadStatuses.length === 0) {
        conversionLeadStatuses.push("traite");
      }

      const res = await fetch("/api/campaign-tracking", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          params: {
            sourceParams: sourceParams.split(/[,\s]+/).filter(Boolean),
            campaignParams: campaignParams.split(/[,\s]+/).filter(Boolean),
            mediumParams: mediumParams.split(/[,\s]+/).filter(Boolean),
            extraParams: extraParams.split(/[,\s]+/).filter(Boolean),
          },
          channels: parseChannels(channelsCsv),
          conversionLeadStatuses,
          countClientAsWon,
        }),
      });
      const data = (await res.json()) as {
        config?: CampaignTrackingConfig;
        analytics?: CampaignAnalyticsSnapshot;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Enregistrement échoué");
      if (data.config) {
        setConfig(data.config);
        applyConfigToForm(data.config);
      }
      if (data.analytics) setAnalytics(data.analytics);
      setConfigOpen(false);
      toast.success("Paramètres de tracking enregistrés");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  const totals = analytics?.totals;
  const maxChannelLeads = Math.max(
    ...(analytics?.byChannel.filter((c) => c.leads > 0).map((c) => c.leads) ?? [
      1,
    ]),
    1,
  );

  return (
    <div
      className={
        embedded
          ? "leads-page camp-page leads-page--embedded"
          : "leads-page camp-page"
      }
    >
      {embedded ? (
        <header className="dig-feature__head">
          <div>
            <p className="dig-feature__eyebrow">Suivi des campagnes</p>
            <h2>Suivi des campagnes</h2>
            <p>
              Performance par canal : leads rattachés à source, campagne et
              canal (source d’origine conservée).
            </p>
          </div>
          <div className="dig-feature__meta">
            <span>
              <strong>{totals?.leads ?? 0}</strong> leads
            </span>
            <span>
              <strong>{pct(totals?.conversionRate ?? 0)}</strong> conversion
            </span>
            {canManage ? (
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={() => setConfigOpen(true)}
              >
                Paramètres
              </button>
            ) : null}
          </div>
        </header>
      ) : (
      <ModuleHeader
        tone="#c45c26"
        badge="Campagnes"
        icon={<IconMail size={20} />}
        title="Suivi des campagnes"
        meta={
          <>
            <span>
              Source · campagne · canal — mesure conversion (pas de création)
            </span>
            <span>
              <strong>{totals?.leads ?? 0}</strong> leads
            </span>
            <span>
              <strong>{pct(totals?.conversionRate ?? 0)}</strong> conversion
            </span>
            <span>
              <strong>{totals?.wonClients ?? 0}</strong> clients
            </span>
          </>
        }
        actions={
          <>
            {canManage ? (
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={() => setConfigOpen(true)}
              >
                Paramètres tracking
              </button>
            ) : null}
            <button
              type="button"
              className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
              onClick={() => void refresh(period)}
              disabled={loading}
            >
              Actualiser
            </button>
          </>
        }
      />
      )}

      <div className="camp-toolbar">
        <div className="leads-filters" role="tablist" aria-label="Période">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              className={`leads-chip${period === p.id ? " is-active" : ""}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="camp-note">
          First-touch : source d’origine figée à la capture · canal dérivé du
          mapping. Mesure uniquement — pas de création de campagnes.
        </p>
      </div>

      {loading && !analytics ? (
        <p className="leads-empty">Chargement…</p>
      ) : (
        <>
          <section className="camp-kpis" aria-label="Totaux période">
            <article className="camp-kpi camp-kpi--accent">
              <span className="camp-kpi__label">Leads</span>
              <strong className="camp-kpi__value">{totals?.leads ?? 0}</strong>
              <span className="camp-kpi__hint">Source d’origine figée</span>
            </article>
            <article className="camp-kpi">
              <span className="camp-kpi__label">Nouveaux</span>
              <strong className="camp-kpi__value">{totals?.nouveau ?? 0}</strong>
              <span className="camp-kpi__hint">À qualifier</span>
            </article>
            <article className="camp-kpi">
              <span className="camp-kpi__label">En cours</span>
              <strong className="camp-kpi__value">{totals?.enCours ?? 0}</strong>
              <span className="camp-kpi__hint">Pipeline</span>
            </article>
            <article className="camp-kpi">
              <span className="camp-kpi__label">Traités</span>
              <strong className="camp-kpi__value">{totals?.traite ?? 0}</strong>
              <span className="camp-kpi__hint">
                {pct(totals?.conversionRate ?? 0)} conversion
              </span>
            </article>
            <article className="camp-kpi">
              <span className="camp-kpi__label">Clients CRM</span>
              <strong className="camp-kpi__value">
                {totals?.wonClients ?? 0}
              </strong>
              <span className="camp-kpi__hint">
                {pct(totals?.wonRate ?? 0)} gagnés
              </span>
            </article>
          </section>

          <section className="camp-panel">
            <header className="camp-panel__head">
              <h2>Performance par canal</h2>
              <p>Comparer leads et conversions entre canaux (période active).</p>
            </header>
            {(analytics?.byChannel.filter((c) => c.leads > 0).length ?? 0) ===
            0 ? (
              <p className="camp-empty">Aucun lead sur la période.</p>
            ) : (
              <ul className="camp-channels">
                {analytics!.byChannel
                  .filter((ch) => ch.leads > 0)
                  .map((ch) => (
                    <li key={ch.channelId} className="camp-channel">
                      <div className="camp-channel__top">
                        <span
                          className="camp-channel__dot"
                          style={{ background: ch.color }}
                        />
                        <strong>{ch.channelLabel}</strong>
                        <span className="camp-channel__count">
                          {ch.leads} lead{ch.leads > 1 ? "s" : ""}
                        </span>
                        <span className="camp-channel__conv">
                          {pct(ch.conversionRate)}
                        </span>
                      </div>
                      <div className="camp-bar" aria-hidden>
                        <span
                          style={{
                            width: `${Math.max(6, (ch.leads / maxChannelLeads) * 100)}%`,
                            background: ch.color,
                          }}
                        />
                      </div>
                      <div className="camp-channel__stats">
                        <span>
                          Nouveaux <b>{ch.nouveau}</b>
                        </span>
                        <span>
                          En cours <b>{ch.enCours}</b>
                        </span>
                        <span>
                          Traités <b>{ch.traite}</b>
                        </span>
                        <span>
                          Clients <b>{ch.wonClients}</b> ({pct(ch.wonRate)})
                        </span>
                      </div>
                      {ch.sources.length > 0 ? (
                        <p className="camp-channel__sources">
                          Sources : {ch.sources.join(", ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
              </ul>
            )}
            {(analytics?.byChannel.some((c) => c.leads === 0) ?? false) ? (
              <details className="camp-zero">
                <summary>
                  Canaux sans volume (
                  {analytics!.byChannel.filter((c) => c.leads === 0).length})
                </summary>
                <ul>
                  {analytics!.byChannel
                    .filter((c) => c.leads === 0)
                    .map((ch) => (
                      <li key={ch.channelId}>
                        <span
                          className="camp-channel__dot"
                          style={{ background: ch.color }}
                        />
                        {ch.channelLabel}
                        {ch.sources.length > 0
                          ? ` · ${ch.sources.join(", ")}`
                          : ""}
                      </li>
                    ))}
                </ul>
              </details>
            ) : null}
          </section>

          <div className="camp-split">
            <section className="camp-panel">
              <header className="camp-panel__head">
                <h2>Par source d’origine</h2>
                <p>firstSource conservé à la capture.</p>
              </header>
              <div className="camp-table-wrap">
                <table className="camp-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Canal</th>
                      <th>Leads</th>
                      <th>Traités</th>
                      <th>Conv.</th>
                      <th>Clients</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.bySource ?? []).map((row) => (
                      <tr key={row.source}>
                        <td>
                          <code>{row.source}</code>
                        </td>
                        <td>{row.channelLabel}</td>
                        <td>{row.leads}</td>
                        <td>{row.traite}</td>
                        <td>{pct(row.conversionRate)}</td>
                        <td>
                          {row.wonClients} ({pct(row.wonRate)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="camp-panel">
              <header className="camp-panel__head">
                <h2>Par campagne</h2>
                <p>firstCampaign + canal.</p>
              </header>
              <div className="camp-table-wrap">
                <table className="camp-table">
                  <thead>
                    <tr>
                      <th>Campagne</th>
                      <th>Source</th>
                      <th>Canal</th>
                      <th>Leads</th>
                      <th>Conv.</th>
                      <th>Clients</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.byCampaign ?? []).map((row) => (
                      <tr
                        key={`${row.channelId}-${row.campaign}-${row.firstSource}`}
                      >
                        <td>{row.campaign}</td>
                        <td>
                          <code>{row.firstSource}</code>
                        </td>
                        <td>{row.channelLabel}</td>
                        <td>{row.leads}</td>
                        <td>{pct(row.conversionRate)}</td>
                        <td>
                          {row.wonClients} ({pct(row.wonRate)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <p className="camp-footer">
            Inbox leads : <Link href="/admin/demandes">Demandes site</Link>
            {" · "}
            Config tracking : paramètres UTM / mapping canaux
            {config?.updatedAt
              ? ` · maj ${new Date(config.updatedAt).toLocaleString("fr-FR")}`
              : ""}
          </p>
        </>
      )}

      <AdminOverlayPortal open={configOpen && canManage}>
        <div
          className="doc-overlay-backdrop clients-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfigOpen(false);
          }}
        >
          <div
            className="doc-overlay-dialog clients-overlay__dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Paramètres de tracking"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="doc-overlay-header">
              <div className="doc-overlay-header__left">
                <p className="doc-overlay-header__tag">Campagne</p>
                <h2>Paramètres de tracking</h2>
                <p className="doc-overlay-header__sub">
                  Configure les query params lus à la capture des leads et le
                  mapping source → canal (mesure, pas création de campagnes).
                </p>
              </div>
              <div className="doc-overlay-header__right">
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  disabled={busy}
                  onClick={() => void saveConfig()}
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  className="doc-overlay-close-btn"
                  onClick={() => setConfigOpen(false)}
                >
                  Fermer
                </button>
              </div>
            </div>
            <div className="clients-overlay__body">
              <div className="clients-form clients-form--embedded camp-config">
                <fieldset className="clients-form__section">
                  <legend>Paramètres URL</legend>
                  <div className="clients-form__grid">
                    <label className="clients-form__full">
                      <span>Source (ordre de priorité)</span>
                      <input
                        value={sourceParams}
                        onChange={(e) => setSourceParams(e.target.value)}
                        placeholder="utm_source, source"
                      />
                    </label>
                    <label className="clients-form__full">
                      <span>Campagne</span>
                      <input
                        value={campaignParams}
                        onChange={(e) => setCampaignParams(e.target.value)}
                        placeholder="utm_campaign, campaign"
                      />
                    </label>
                    <label className="clients-form__full">
                      <span>Canal / medium</span>
                      <input
                        value={mediumParams}
                        onChange={(e) => setMediumParams(e.target.value)}
                        placeholder="utm_medium, medium"
                      />
                    </label>
                    <label className="clients-form__full">
                      <span>Extras (conservés côté capture)</span>
                      <input
                        value={extraParams}
                        onChange={(e) => setExtraParams(e.target.value)}
                        placeholder="utm_content, gclid, fbclid"
                      />
                    </label>
                  </div>
                </fieldset>
                <fieldset className="clients-form__section">
                  <legend>Canaux (id|label|sources+|couleur)</legend>
                  <label className="clients-form__full">
                    <span>Une ligne par canal</span>
                    <textarea
                      rows={6}
                      value={channelsCsv}
                      onChange={(e) => setChannelsCsv(e.target.value)}
                    />
                  </label>
                </fieldset>
                <fieldset className="clients-form__section">
                  <legend>Conversion</legend>
                  <label className="camp-check">
                    <input
                      type="checkbox"
                      checked={convTraite}
                      onChange={(e) => setConvTraite(e.target.checked)}
                    />
                    Lead « traité » = conversion qualifiée
                  </label>
                  <label className="camp-check">
                    <input
                      type="checkbox"
                      checked={convEnCours}
                      onChange={(e) => setConvEnCours(e.target.checked)}
                    />
                    Inclure « en cours » dans la conversion
                  </label>
                  <label className="camp-check">
                    <input
                      type="checkbox"
                      checked={countClientAsWon}
                      onChange={(e) => setCountClientAsWon(e.target.checked)}
                    />
                    Client CRM (même e-mail) = conversion gagnée
                  </label>
                </fieldset>
              </div>
            </div>
          </div>
        </div>
        </AdminOverlayPortal>
    </div>
  );
}
