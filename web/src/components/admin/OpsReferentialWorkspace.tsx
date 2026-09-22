"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconFolder, IconSearch } from "@/components/admin/Icons";
import type {
  ContractReferentialBundle,
  OpsClient,
  OpsSite,
} from "@/lib/ops-referential-shared";
import { toast } from "@/lib/toast";

function formatWhen(ts: string) {
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

export function OpsReferentialWorkspace() {
  const searchParams = useSearchParams();
  const contractFromUrl = searchParams.get("contractId") || "";
  const siteFromUrl = searchParams.get("siteId") || "";

  const [clients, setClients] = useState<OpsClient[]>([]);
  const [sites, setSites] = useState<OpsSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("actifs");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<ContractReferentialBundle | null>(null);
  const [consignes, setConsignes] = useState("");
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [prestaLabel, setPrestaLabel] = useState("");
  const [prestaStaff, setPrestaStaff] = useState("2");
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ops-referential", { cache: "no-store" });
      const data = (await res.json()) as {
        clients?: OpsClient[];
        sites?: OpsSite[];
        canEdit?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement");
      setClients(data.clients ?? []);
      setSites(data.sites ?? []);
      setCanEdit(Boolean(data.canEdit));
      setSelectedClientId((prev) => prev ?? data.clients?.[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeSites = useMemo(
    () => sites.filter((s) => s.status === "actif").length,
    [sites],
  );
  const inactiveSites = useMemo(
    () => sites.filter((s) => s.status === "inactif").length,
    [sites],
  );
  const contractCount = useMemo(() => {
    const ids = new Set(sites.map((s) => s.contractId).filter(Boolean));
    return ids.size;
  }, [sites]);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    const matchingSiteClientIds = new Set(
      sites
        .filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.address.toLowerCase().includes(q) ||
            s.contractRef.toLowerCase().includes(q) ||
            s.company.toLowerCase().includes(q),
        )
        .map((s) => s.clientId),
    );
    return clients.filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        matchingSiteClientIds.has(c.id),
    );
  }, [clients, sites, query]);

  const clientSites = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter((s) => {
      if (selectedClientId && s.clientId !== selectedClientId) return false;
      if (statusFilter === "actifs" && s.status !== "actif") return false;
      if (statusFilter === "inactifs" && s.status !== "inactif") return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q) ||
        s.contractRef.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
      );
    });
  }, [sites, selectedClientId, query, statusFilter]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId) ?? null,
    [sites, selectedSiteId],
  );

  useEffect(() => {
    if (deepLinkHandled || loading) return;
    if (siteFromUrl) {
      const site = sites.find((s) => s.id === siteFromUrl);
      if (site) {
        setSelectedClientId(site.clientId);
        setSelectedSiteId(site.id);
        setStatusFilter("all");
        setDeepLinkHandled(true);
        return;
      }
    }
    if (contractFromUrl) {
      const forContract = sites.filter((s) => s.contractId === contractFromUrl);
      if (forContract.length) {
        setSelectedClientId(forContract[0]!.clientId);
        setSelectedSiteId(forContract[0]!.id);
        setStatusFilter("all");
        setDeepLinkHandled(true);
        return;
      }
      if (!loading && sites.length >= 0) {
        setDeepLinkHandled(true);
        toast.error(
          "Aucun site OPS pour ce contrat — synchronisez depuis les contrats actifs.",
        );
      }
    }
  }, [
    siteFromUrl,
    contractFromUrl,
    sites,
    loading,
    deepLinkHandled,
  ]);

  useEffect(() => {
    if (!selectedSite) {
      setBundle(null);
      return;
    }
    setConsignes(selectedSite.consignes);
    void (async () => {
      try {
        const res = await fetch(
          `/api/ops-referential?contractId=${encodeURIComponent(selectedSite.contractId)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          bundle?: ContractReferentialBundle;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Bundle");
        setBundle(data.bundle ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur");
      }
    })();
  }, [selectedSite?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (clientSites.length === 0) {
      if (selectedSiteId) setSelectedSiteId(null);
      return;
    }
    if (
      !selectedSiteId ||
      !clientSites.some((s) => s.id === selectedSiteId)
    ) {
      setSelectedSiteId(clientSites[0]!.id);
    }
  }, [clientSites, selectedSiteId]);

  const post = async (action: string, payload: Record<string, unknown>) => {
    if (busy) return null;
    if (busyLock.current) return null;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/ops-referential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as {
        site?: OpsSite;
        clients?: OpsClient[];
        sites?: OpsSite[];
        createdClients?: number;
        createdSites?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");

      if (data.clients) setClients(data.clients);
      if (data.sites) setSites(data.sites);
      if (data.site) {
        setSites((prev) => {
          const others = prev.filter((x) => x.id !== data.site!.id);
          return [...others, data.site!].sort((a, b) =>
            a.name.localeCompare(b.name, "fr"),
          );
        });
        setSelectedSiteId(data.site.id);
      }
      if (action === "sync") {
        toast.success(
          `Sync OK · +${data.createdClients ?? 0} client(s) · +${data.createdSites ?? 0} site(s)`,
        );
      } else {
        toast.success("Enregistré");
      }
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="leads-page ops-ref-page">
      <ModuleHeader
        tone="#4faf2a"
        badge="Opérations"
        icon={<IconFolder size={20} />}
        title="Référentiel clients / sites / prestations"
        meta={
          <>
            <span>Client → Contrat → Site → Prestation</span>
            <span>
              <strong>{clients.length}</strong> clients ·{" "}
              <strong>{activeSites}</strong> sites actifs ·{" "}
              <strong>{contractCount}</strong> contrats
            </span>
          </>
        }
        actions={
          <div className="leads-header-actions">
            <Link
              href="/admin/contrats"
              className="btn-admin btn-admin--ghost"
            >
              Contrats
            </Link>
            <Link
              href="/admin/operations?tab=planification"
              className="btn-admin btn-admin--ghost"
            >
              Planification
            </Link>
            {canEdit ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                disabled={busy}
                onClick={() => void post("sync", {})}
              >
                Synchroniser depuis contrats
              </button>
            ) : null}
          </div>
        }
      />

      <section className="leads-kpis" aria-label="Indicateurs référentiel">
        <article className="leads-kpi">
          <p>Clients</p>
          <strong>{clients.length}</strong>
          <span>portefeuille OPS</span>
        </article>
        <article className="leads-kpi">
          <p>Sites actifs</p>
          <strong>{activeSites}</strong>
          <span>{inactiveSites} inactif{inactiveSites > 1 ? "s" : ""}</span>
        </article>
        <article className="leads-kpi leads-kpi--accent">
          <p>Contrats liés</p>
          <strong>{contractCount}</strong>
          <span>hiérarchie CRM → OPS</span>
        </article>
        <article className="leads-kpi">
          <p>Prestations</p>
          <strong>
            {sites.reduce(
              (n, s) => n + s.prestations.filter((p) => p.active).length,
              0,
            )}
          </strong>
          <span>actives sur sites</span>
        </article>
      </section>

      {loading ? (
        <div className="leads-empty">
          <span className="leads-empty__orb" aria-hidden />
          <p className="leads-empty__eyebrow">Référentiel</p>
          <h2>Chargement…</h2>
        </div>
      ) : (
        <>
          <div className="leads-toolbar">
            <label className="leads-search">
              <IconSearch />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Client, site, adresse, contrat…"
              />
            </label>
            <div className="leads-filters" role="tablist" aria-label="Statut sites">
              {(
                [
                  ["actifs", "Sites actifs", activeSites],
                  ["inactifs", "Inactifs", inactiveSites],
                  ["all", "Tous", sites.length],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === id}
                  className={`leads-chip${statusFilter === id ? " is-active" : ""}`}
                  onClick={() => setStatusFilter(id)}
                >
                  {label}
                  <em>{count}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="ops-ref-shell">
            <aside className="ops-ref-clients" aria-label="Clients">
              <h3 className="ops-ref-col-title">Clients</h3>
              <div className="ops-ref-clients__list" role="listbox">
                {filteredClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={c.id === selectedClientId}
                    className={`ops-ref-client-card${c.id === selectedClientId ? " is-active" : ""}`}
                    onClick={() => {
                      setSelectedClientId(c.id);
                      setSelectedSiteId(null);
                    }}
                  >
                    <strong>{c.company}</strong>
                    <span>
                      {c.activeSiteCount}/{c.siteCount} sites ·{" "}
                      {c.contractIds.length} contrat
                      {c.contractIds.length > 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
                {filteredClients.length === 0 ? (
                  <div className="leads-empty ops-ref-mini-empty">
                    <p>
                      Aucun client. Synchronisez depuis les{" "}
                      <Link href="/admin/contrats">contrats actifs</Link>.
                    </p>
                  </div>
                ) : null}
              </div>
            </aside>

            <div className="leads-shell ops-ref-main">
              <div className="leads-inbox" role="listbox" aria-label="Sites">
                {clientSites.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    aria-selected={s.id === selectedSiteId}
                    className={`leads-card${s.id === selectedSiteId ? " is-active" : ""}`}
                    onClick={() => setSelectedSiteId(s.id)}
                  >
                    <span className="leads-card__body">
                      <span className="leads-card__top">
                        <strong>{s.name}</strong>
                        <time>
                          {s.prestations.filter((p) => p.active).length} presta.
                        </time>
                      </span>
                      <span className="leads-card__mid">
                        <span
                          className={`ops-site-status ops-site-status--${s.status}`}
                        >
                          {s.status}
                        </span>
                        <span className="ops-ref-card-ref">{s.contractRef}</span>
                      </span>
                      <span className="leads-card__preview">
                        {s.address || s.city || "Adresse à préciser"}
                        {s.surfaceM2 != null ? ` · ${s.surfaceM2} m²` : ""}
                      </span>
                    </span>
                  </button>
                ))}
                {clientSites.length === 0 ? (
                  <div className="leads-empty">
                    <span className="leads-empty__orb" aria-hidden />
                    <p className="leads-empty__eyebrow">Sites</p>
                    <h2>Aucun site</h2>
                    <p>
                      Activez un contrat puis synchronisez pour alimenter le
                      référentiel.
                    </p>
                  </div>
                ) : null}
              </div>

              <article className="leads-detail ops-ref-detail">
                {!selectedSite ? (
                  <div className="leads-empty-detail">
                    <p className="leads-empty__eyebrow">Détail</p>
                    <h2>Sélectionnez un site</h2>
                    <p>
                      Fiche, consignes, prestations et historique — accessibles
                      aussi via le contrat.
                    </p>
                  </div>
                ) : (
                  <>
                    <nav className="ops-ref-breadcrumb" aria-label="Hiérarchie">
                      <span>
                        {selectedClient?.company || selectedSite.company}
                      </span>
                      <span aria-hidden>→</span>
                      <Link
                        href={`/admin/contrats`}
                        className="ops-ref-breadcrumb__link"
                      >
                        {selectedSite.contractRef}
                      </Link>
                      <span aria-hidden>→</span>
                      <strong>{selectedSite.name}</strong>
                      <span aria-hidden>→</span>
                      <span>
                        {
                          selectedSite.prestations.filter((p) => p.active)
                            .length
                        }{" "}
                        prestation
                        {selectedSite.prestations.filter((p) => p.active)
                          .length > 1
                          ? "s"
                          : ""}
                      </span>
                    </nav>

                    <header className="leads-detail__head">
                      <div>
                        <p className="leads-detail__eyebrow">
                          {selectedSite.id} · sync{" "}
                          {formatWhen(selectedSite.syncedAt)}
                        </p>
                        <h2>{selectedSite.name}</h2>
                        <p className="leads-detail__sub">
                          {selectedSite.company}
                          {" · "}
                          <Link
                            href={`/admin/contrats`}
                          >
                            Contrat {selectedSite.contractRef}
                          </Link>
                          {" · "}
                          <Link
                            href={`/admin/operations?tab=referentiel&contractId=${encodeURIComponent(selectedSite.contractId)}`}
                          >
                            Bundle contrat
                          </Link>
                          {" · "}
                          <Link href="/admin/operations?tab=planification">Planifier</Link>
                          {" · "}
                          <Link
                            href={`/admin/operations?tab=planification&siteId=${encodeURIComponent(selectedSite.id)}`}
                          >
                            Créneaux site
                          </Link>
                        </p>
                      </div>
                      <div className="leads-detail__actions">
                        <span
                          className={`ops-site-status ops-site-status--${selectedSite.status}`}
                        >
                          {selectedSite.status}
                        </span>
                      </div>
                    </header>

                    {bundle ? (
                      <div
                        className={
                          bundle.complete
                            ? "contracts-resaisie is-ok"
                            : "contracts-resaisie is-warn"
                        }
                      >
                        <strong>
                          {bundle.complete
                            ? "Infos site accessibles depuis le contrat"
                            : "Bundle contrat incomplet"}
                        </strong>
                        <ul>
                          {(bundle.checks ?? []).map((c) => (
                            <li key={c.key}>
                              {c.ok ? "✓" : "✗"} {c.detail}
                            </li>
                          ))}
                        </ul>
                        <p className="contracts-source">
                          {bundle.contractRef} · SLA {bundle.sla || "—"} ·{" "}
                          {bundle.staffCount} agent(s) ·{" "}
                          {bundle.sites.length} site(s) OPS
                          {bundle.contractSites.length
                            ? ` / ${bundle.contractSites.length} contrat`
                            : ""}
                        </p>
                      </div>
                    ) : null}

                    {bundle && bundle.sites.length > 1 ? (
                      <section className="ops-ref-sibling-sites">
                        <h3>Sites du même contrat</h3>
                        <ul>
                          {bundle.sites.map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                className={
                                  s.id === selectedSite.id
                                    ? "ops-ref-sibling is-active"
                                    : "ops-ref-sibling"
                                }
                                onClick={() => setSelectedSiteId(s.id)}
                              >
                                <strong>{s.name}</strong>
                                <span
                                  className={`ops-site-status ops-site-status--${s.status}`}
                                >
                                  {s.status}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    <section className="contracts-section">
                      <h3>Fiche site</h3>
                      <dl className="ops-ref-dl">
                        <div>
                          <dt>Adresse</dt>
                          <dd>
                            {selectedSite.address || "—"}
                            {selectedSite.city
                              ? ` · ${selectedSite.city}`
                              : ""}
                          </dd>
                        </div>
                        <div>
                          <dt>Surface</dt>
                          <dd>
                            {selectedSite.surfaceM2 != null
                              ? `${selectedSite.surfaceM2} m²`
                              : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt>SLA / effectif</dt>
                          <dd>
                            {selectedSite.sla || "—"} ·{" "}
                            {selectedSite.staffCount} agent(s)
                          </dd>
                        </div>
                        <div>
                          <dt>Client OPS</dt>
                          <dd>
                            {selectedClient?.company || selectedSite.company}
                            {selectedClient?.contactEmail
                              ? ` · ${selectedClient.contactEmail}`
                              : ""}
                          </dd>
                        </div>
                      </dl>
                      <label className="ops-ref-consignes">
                        Consignes site
                        <textarea
                          rows={3}
                          disabled={!canEdit}
                          value={consignes}
                          onChange={(e) => setConsignes(e.target.value)}
                          placeholder="Accès, horaires, consignes sécurité…"
                        />
                      </label>
                      {canEdit ? (
                        <div className="quotes-actions">
                          <button
                            type="button"
                            className="btn-admin btn-admin--primary"
                            disabled={busy}
                            onClick={() =>
                              void post("consignes", {
                                siteId: selectedSite.id,
                                consignes,
                              })
                            }
                          >
                            Enregistrer consignes
                          </button>
                          <button
                            type="button"
                            className="btn-admin btn-admin--ghost"
                            disabled={busy}
                            onClick={() =>
                              void post("site-status", {
                                siteId: selectedSite.id,
                                status:
                                  selectedSite.status === "actif"
                                    ? "inactif"
                                    : "actif",
                              })
                            }
                          >
                            {selectedSite.status === "actif"
                              ? "Désactiver le site"
                              : "Réactiver le site"}
                          </button>
                        </div>
                      ) : null}
                    </section>

                    <section className="contracts-section">
                      <h3>
                        Prestations (
                        {
                          selectedSite.prestations.filter((p) => p.active)
                            .length
                        }
                        /
                        {selectedSite.prestations.length})
                      </h3>
                      <ul className="contracts-sites ops-ref-prestations">
                        {selectedSite.prestations.map((p) => (
                          <li key={p.id}>
                            <div className="ops-ref-presta__head">
                              <strong>
                                {p.label}
                                {!p.active ? " (inactive)" : ""}
                              </strong>
                              {canEdit ? (
                                <button
                                  type="button"
                                  className="btn-admin btn-admin--ghost"
                                  disabled={busy}
                                  onClick={() =>
                                    void post("prestation", {
                                      siteId: selectedSite.id,
                                      id: p.id,
                                      label: p.label,
                                      active: !p.active,
                                    })
                                  }
                                >
                                  {p.active ? "Désactiver" : "Réactiver"}
                                </button>
                              ) : null}
                            </div>
                            <span>
                              {p.frequency} · {p.requiredStaff} agent(s) ·{" "}
                              {p.durationMinutes} min
                              {p.sourceTariffId
                                ? ` · tarif ${p.sourceTariffId}`
                                : " · manuelle"}
                            </span>
                            {p.consignes ? <em>{p.consignes}</em> : null}
                          </li>
                        ))}
                      </ul>
                      {canEdit ? (
                        <div className="ops-ref-add-presta">
                          <input
                            placeholder="Nouvelle prestation"
                            value={prestaLabel}
                            onChange={(e) => setPrestaLabel(e.target.value)}
                          />
                          <input
                            type="number"
                            min={1}
                            value={prestaStaff}
                            onChange={(e) => setPrestaStaff(e.target.value)}
                            aria-label="Effectif"
                          />
                          <button
                            type="button"
                            className="btn-admin btn-admin--ghost"
                            disabled={busy || !prestaLabel.trim()}
                            onClick={() => {
                              void post("prestation", {
                                siteId: selectedSite.id,
                                label: prestaLabel,
                                requiredStaff: Number(prestaStaff) || 1,
                              }).then(() => setPrestaLabel(""));
                            }}
                          >
                            Ajouter
                          </button>
                        </div>
                      ) : null}
                    </section>

                    {bundle && bundle.contractSites.length > 0 ? (
                      <section className="contracts-section">
                        <h3>Source contrat (sans ressaisie)</h3>
                        <ul className="contracts-sites">
                          {bundle.contractSites.map((cs) => (
                            <li key={cs.id}>
                              <strong>
                                {cs.name}
                                {!cs.active ? " (inactif contrat)" : ""}
                              </strong>
                              <span>
                                {cs.address || "—"}
                                {cs.city ? ` · ${cs.city}` : ""}
                                {cs.surfaceM2 != null
                                  ? ` · ${cs.surfaceM2} m²`
                                  : ""}
                              </span>
                              {cs.consignes ? <em>{cs.consignes}</em> : null}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    <section className="need-qual__history">
                      <h3>Historique site</h3>
                      <ol>
                        {selectedSite.history.slice(0, 14).map((h) => (
                          <li key={h.id}>
                            <time>{formatWhen(h.at)}</time>
                            <span>
                              {h.byName} — {h.detail}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  </>
                )}
              </article>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
