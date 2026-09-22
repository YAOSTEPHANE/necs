"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import {
  AdminFormWizard,
  FwPanel,
  FwPanelHead,
  FwGrid,
  FwField,
  FwBlock,
  FwChips,
  FwChip,
  FwReview,
  FwReviewCard,
  FwWarn,
  FwOk,
} from "@/components/admin/form-wizard";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconContract, IconSearch } from "@/components/admin/Icons";
import {
  FREQUENCY_LABELS,
  SERVICE_LEVEL_LABELS,
  type CrmOpportunity,
} from "@/lib/need-qualification-shared";
import {
  CONTRACT_RENEWAL_LABELS,
  CONTRACT_SLA_LABELS,
  CONTRACT_STATUS_LABELS,
  formatContractFcfa,
  type Contract,
  type ContractFromWonPreview,
  type ContractRenewal,
  type ContractSla,
  type ContractStatus,
} from "@/lib/contracts-shared";
import { toast } from "@/lib/toast";

type NoResaisie = {
  ok: boolean;
  checks: Array<{ key: string; ok: boolean; detail: string }>;
};

function formatWhen(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDateInput(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function ContractsWorkspace() {
  const searchParams = useSearchParams();
  const oppFromUrl = searchParams.get("opportunityId") || "";

  const [items, setItems] = useState<Contract[]>([]);
  const [wonEligible, setWonEligible] = useState<CrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("actifs");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noResaisie, setNoResaisie] = useState<NoResaisie | null>(null);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<
    "affaire" | "conditions" | "revue"
  >("affaire");
  const [composerShake, setComposerShake] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  const [pickOpp, setPickOpp] = useState("");
  const [startAt, setStartAt] = useState("");
  const [durationMonths, setDurationMonths] = useState("12");
  const [renewal, setRenewal] = useState<ContractRenewal>("tacite");
  const [preview, setPreview] = useState<ContractFromWonPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [sla, setSla] = useState<ContractSla>("standard");
  const [staffCount, setStaffCount] = useState("");
  const [note, setNote] = useState("");
  const [endAt, setEndAt] = useState("");

  const [amendReason, setAmendReason] = useState("");
  const [amendSla, setAmendSla] = useState<ContractSla>("standard");
  const [amendStaff, setAmendStaff] = useState("");
  const [amendEnd, setAmendEnd] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contracts", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: Contract[];
        wonEligible?: CrmOpportunity[];
        canManage?: boolean;
        role?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement contrats");
      setItems(data.items ?? []);
      setWonEligible(data.wonEligible ?? []);
      setCanManage(Boolean(data.canManage));
      setRole(data.role || "");
      setSelectedId((prev) => prev ?? data.items?.[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/contracts?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        item?: Contract;
        noResaisie?: NoResaisie;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Détail");
      if (data.item) {
        setItems((prev) => {
          const others = prev.filter((x) => x.id !== data.item!.id);
          return [data.item!, ...others];
        });
        setNoResaisie(data.noResaisie ?? null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    setSla(selected.sla);
    setStaffCount(String(selected.staffCount));
    setNote(selected.note);
    setEndAt(toDateInput(selected.endAt));
    setAmendSla(selected.sla);
    setAmendStaff(String(selected.staffCount));
    setAmendEnd(toDateInput(selected.endAt));
    void loadDetail(selected.id);
  }, [
    selected?.id,
    selected?.sla,
    selected?.staffCount,
    selected?.note,
    selected?.endAt,
    loadDetail,
  ]);

  /** Deep-link depuis pipeline : ?opportunityId= */
  useEffect(() => {
    if (deepLinkHandled || loading || !oppFromUrl) return;
    const existing = items.find((c) => c.opportunityId === oppFromUrl);
    if (existing) {
      setSelectedId(existing.id);
      setFilter("all");
      setDeepLinkHandled(true);
      toast.success(`Contrat ${existing.ref} déjà créé pour cette affaire`);
      return;
    }
    if (canManage && wonEligible.some((o) => o.id === oppFromUrl)) {
      setPickOpp(oppFromUrl);
      setStartAt(new Date().toISOString().slice(0, 10));
      setComposerStep("affaire");
      setComposerOpen(true);
      setDeepLinkHandled(true);
      return;
    }
    if (!loading && items.length >= 0) {
      setDeepLinkHandled(true);
      if (canManage) {
        toast.error(
          "Affaire non éligible (doit être gagnée et sans contrat).",
        );
      }
    }
  }, [
    oppFromUrl,
    loading,
    items,
    wonEligible,
    canManage,
    deepLinkHandled,
  ]);

  const loadPreview = useCallback(async (opportunityId: string) => {
    if (!opportunityId) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/contracts?preview=1&opportunityId=${encodeURIComponent(opportunityId)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        preview?: ContractFromWonPreview;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Aperçu impossible");
      setPreview(data.preview ?? null);
    } catch (error) {
      setPreview(null);
      toast.error(error instanceof Error ? error.message : "Erreur aperçu");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!composerOpen || !pickOpp) {
      setPreview(null);
      return;
    }
    void loadPreview(pickOpp);
  }, [composerOpen, pickOpp, loadPreview]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (filter === "actifs" && c.status !== "actif" && c.status !== "brouillon") {
        return false;
      }
      if (filter === "ops" && c.status !== "actif") return false;
      if (filter !== "all" && filter !== "actifs" && filter !== "ops" && c.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        c.company.toLowerCase().includes(q) ||
        c.ref.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.opportunityId.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  const post = async (action: string, payload: Record<string, unknown> = {}) => {
    if (busy) return null;
    if (busyLock.current) return null;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as {
        item?: Contract;
        noResaisie?: NoResaisie;
        opsSync?: { clients: number; sites: number } | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      if (data.item) {
        setItems((prev) => {
          const others = prev.filter((x) => x.id !== data.item!.id);
          return [data.item!, ...others];
        });
        setSelectedId(data.item.id);
        setNoResaisie(data.noResaisie ?? null);
        if (action === "activate" && data.opsSync) {
          toast.success(
            `Activé · référentiel synchronisé (${data.opsSync.sites} site(s))`,
          );
        } else {
          toast.success("Enregistré");
        }
        setComposerOpen(false);
        setComposerStep("affaire");
        setAmendOpen(false);
        if (action === "from-won") {
          setWonEligible((prev) =>
            prev.filter((o) => o.id !== data.item!.opportunityId),
          );
        }
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

  const activeCount = items.filter((c) => c.status === "actif").length;
  const draftCount = items.filter((c) => c.status === "brouillon").length;
  const monthlySum = items
    .filter((c) => c.status === "actif")
    .reduce((s, c) => s + c.monthlyAmount, 0);

  const editableDraft =
    canManage && selected && selected.status === "brouillon";

  const openComposer = (oppId?: string) => {
    setPickOpp(oppId || wonEligible[0]?.id || "");
    setStartAt(new Date().toISOString().slice(0, 10));
    setDurationMonths("12");
    setRenewal("tacite");
    setComposerStep("affaire");
    setComposerOpen(true);
  };

  const affaireReady = Boolean(pickOpp);
  const conditionsReady = Boolean(startAt) && Number(durationMonths) > 0;
  const canSubmitContract =
    affaireReady &&
    conditionsReady &&
    !preview?.existingContractId &&
    (preview === null || preview.noResaisie.ok);

  const pulseComposerError = () => {
    setComposerShake(true);
    window.setTimeout(() => setComposerShake(false), 420);
  };

  const canEnterComposerStep = (id: string) => {
    if (id === "affaire") return true;
    if (id === "conditions") return affaireReady;
    return affaireReady && conditionsReady;
  };

  const submitFromWon = (e: FormEvent) => {
    e.preventDefault();
    if (preview?.existingContractId) {
      toast.error(`Contrat déjà existant (${preview.existingContractRef})`);
      return;
    }
    void post("from-won", {
      opportunityId: pickOpp,
      startAt: startAt ? `${startAt}T00:00:00.000Z` : undefined,
      durationMonths: Number(durationMonths) || 12,
      renewal,
    });
  };

  const selectedOpp = wonEligible.find((o) => o.id === pickOpp);

  const isOpsOrFinance = role === "ops" || role === "finance";

  return (
    <div className="leads-page contracts-page">
      <ModuleHeader
        tone="#7c3aed"
        badge="Commercial"
        icon={<IconContract size={20} />}
        title="Contrats"
        meta={
          <>
            <span>Affaire gagnée → contrat OPS / Finance</span>
            <span>
              <strong>{activeCount}</strong> actifs ·{" "}
              <strong>{formatContractFcfa(monthlySum)}</strong>/mois
            </span>
          </>
        }
        actions={
          <div className="leads-header-actions">
            <Link
              href="/admin/pipeline"
              className="btn-admin btn-admin--ghost"
            >
              Pipeline
            </Link>
            <Link
              href="/admin/operations?tab=referentiel"
              className="btn-admin btn-admin--ghost"
            >
              Référentiel OPS
            </Link>
            {canManage ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => openComposer()}
                disabled={wonEligible.length === 0}
              >
                Depuis affaire gagnée
              </button>
            ) : null}
          </div>
        }
      />

      <section className="leads-kpis" aria-label="Indicateurs contrats">
        <article className="leads-kpi">
          <p>Brouillons</p>
          <strong>{draftCount}</strong>
          <span>à activer</span>
        </article>
        <article className="leads-kpi">
          <p>Actifs</p>
          <strong>{activeCount}</strong>
          <span>exploités OPS / Finance</span>
        </article>
        <article className="leads-kpi leads-kpi--accent">
          <p>MRR contrats</p>
          <strong>{formatContractFcfa(monthlySum)}</strong>
          <span>mensualisé actif</span>
        </article>
        <article className="leads-kpi">
          <p>À contractualiser</p>
          <strong>{wonEligible.length}</strong>
          <span>affaires gagnées</span>
        </article>
      </section>

      {wonEligible.length > 0 && canManage ? (
        <section className="contracts-eligible-strip" aria-label="Affaires à contractualiser">
          <div className="contracts-eligible-strip__head">
            <strong>
              {wonEligible.length} affaire
              {wonEligible.length > 1 ? "s" : ""} gagnée
              {wonEligible.length > 1 ? "s" : ""} sans contrat
            </strong>
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={() => openComposer(wonEligible[0]?.id)}
            >
              Transformer
            </button>
          </div>
          <ul>
            {wonEligible.slice(0, 4).map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="contracts-eligible-chip"
                  onClick={() => openComposer(o.id)}
                >
                  <em>{o.company}</em>
                  <span>
                    {formatContractFcfa(o.valueEstimate)} · {o.id}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {loading ? (
        <div className="leads-empty">
          <span className="leads-empty__orb" aria-hidden />
          <p className="leads-empty__eyebrow">Contrats</p>
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
                placeholder="Réf, client, affaire…"
              />
            </label>
            <div className="leads-filters" role="tablist" aria-label="Filtres">
              {(
                [
                  ["actifs", "Actifs + brouillons", draftCount + activeCount],
                  ["ops", "Exploitable OPS", activeCount],
                  ["all", "Tous", items.length],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={filter === id}
                  className={`leads-chip${filter === id ? " is-active" : ""}`}
                  onClick={() => setFilter(id)}
                >
                  {label}
                  <em>{count}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="leads-shell">
            <div className="leads-inbox" role="listbox" aria-label="Contrats">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={c.id === selectedId}
                  className={`leads-card${c.id === selectedId ? " is-active" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <span className="leads-card__body">
                    <span className="leads-card__top">
                      <strong>{c.company}</strong>
                      <time>{formatContractFcfa(c.monthlyAmount)}/mois</time>
                    </span>
                    <span className="leads-card__mid">
                      <span
                        className={`contracts-status contracts-status--${c.status}`}
                      >
                        {CONTRACT_STATUS_LABELS[c.status]}
                      </span>
                      <span className="contracts-card__sla">
                        SLA {CONTRACT_SLA_LABELS[c.sla]}
                      </span>
                    </span>
                    <span className="leads-card__preview">
                      {c.ref} · {c.sites.length} site
                      {c.sites.length > 1 ? "s" : ""} ·{" "}
                      {formatWhen(c.startAt)}
                      {c.endAt ? ` → ${formatWhen(c.endAt)}` : ""}
                    </span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 ? (
                <div className="leads-empty">
                  <span className="leads-empty__orb" aria-hidden />
                  <p className="leads-empty__eyebrow">Aucun contrat</p>
                  <h2>Rien à afficher</h2>
                  <p>
                    Marquez une affaire gagnée dans le pipeline, puis
                    transformez-la ici — sites et tarifs sont repris
                    automatiquement.
                  </p>
                  <Link
                    href="/admin/pipeline"
                    className="btn-admin btn-admin--primary"
                  >
                    Ouvrir le pipeline
                  </Link>
                </div>
              ) : null}
            </div>

            <article className="leads-detail contracts-detail">
              {!selected ? (
                <div className="leads-empty-detail">
                  <p className="leads-empty__eyebrow">Détail</p>
                  <h2>Sélectionnez un contrat</h2>
                  <p>
                    Cadre, sites, tarifs, échéances et avenants s’affichent ici.
                  </p>
                </div>
              ) : (
                <>
                  <header className="leads-detail__head">
                    <div>
                      <p className="leads-detail__eyebrow">
                        {selected.ref} · {selected.id}
                      </p>
                      <h2>{selected.company}</h2>
                      <p className="leads-detail__sub">
                        <Link href="/admin/pipeline">
                          Affaire {selected.opportunityId}
                        </Link>
                        {selected.quoteId ? (
                          <>
                            {" · "}
                            <Link href="/admin/commercial?tab=chiffrage">
                              Devis {selected.quoteId}
                            </Link>
                          </>
                        ) : null}
                        {selected.status === "actif" ? (
                          <>
                            {" · "}
                            <Link
                              href={`/admin/operations?tab=referentiel&contractId=${encodeURIComponent(selected.id)}`}
                            >
                              Sites OPS
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="leads-detail__actions">
                      <span
                        className={`contracts-status contracts-status--${selected.status}`}
                      >
                        {CONTRACT_STATUS_LABELS[selected.status]}
                      </span>
                    </div>
                  </header>

                  {noResaisie ? (
                    <div
                      className={
                        noResaisie.ok
                          ? "contracts-resaisie is-ok"
                          : "contracts-resaisie is-warn"
                      }
                    >
                      <strong>
                        {noResaisie.ok
                          ? "Données reprises sans ressaisie"
                          : "Reprise incomplète"}
                      </strong>
                      <ul>
                        {noResaisie.checks.map((c) => (
                          <li key={c.key}>
                            {c.ok ? "✓" : "✗"} {c.detail}
                          </li>
                        ))}
                      </ul>
                      <p className="contracts-source">
                        Source figée le{" "}
                        {formatWhen(selected.sourceSnapshot.capturedAt)} ·
                        valeur affaire{" "}
                        {formatContractFcfa(
                          selected.sourceSnapshot.opportunityValue,
                        )}
                        {selected.sourceSnapshot.quoteTotalHT > 0
                          ? ` · devis ${formatContractFcfa(selected.sourceSnapshot.quoteTotalHT)} HT`
                          : ""}
                      </p>
                    </div>
                  ) : null}

                  {(isOpsOrFinance || selected.status === "actif") && (
                    <section className="contracts-ops-banner">
                      <div>
                        <h3>Exploitation OPS / Finance</h3>
                        <p>
                          {selected.sites.filter((s) => s.active).length} site
                          {selected.sites.filter((s) => s.active).length > 1
                            ? "s"
                            : ""}{" "}
                          · SLA {CONTRACT_SLA_LABELS[selected.sla]} ·{" "}
                          {formatContractFcfa(selected.monthlyAmount)}/mois ·{" "}
                          {selected.staffCount} agent
                          {selected.staffCount > 1 ? "s" : ""}
                        </p>
                      </div>
                      {selected.status === "actif" ? (
                        <Link
                          href={`/admin/operations?tab=referentiel&contractId=${encodeURIComponent(selected.id)}`}
                          className="btn-admin btn-admin--ghost"
                        >
                          Voir référentiel
                        </Link>
                      ) : (
                        <span className="contracts-ops-banner__hint">
                          Activez le brouillon pour pousser vers OPS
                        </span>
                      )}
                    </section>
                  )}

                  <section className="contracts-section">
                    <h3>Cadre contractuel</h3>
                    <div className="need-qual__grid">
                      <label>
                        SLA
                        <select
                          disabled={!editableDraft}
                          value={sla}
                          onChange={(e) =>
                            setSla(e.target.value as ContractSla)
                          }
                        >
                          {Object.entries(CONTRACT_SLA_LABELS).map(
                            ([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        Effectif
                        <input
                          type="number"
                          min={0}
                          disabled={!editableDraft}
                          value={staffCount}
                          onChange={(e) => setStaffCount(e.target.value)}
                        />
                      </label>
                      <label>
                        Début
                        <input
                          type="date"
                          disabled
                          value={toDateInput(selected.startAt)}
                        />
                      </label>
                      <label>
                        Fin
                        <input
                          type="date"
                          disabled={!editableDraft}
                          value={endAt}
                          onChange={(e) => setEndAt(e.target.value)}
                        />
                      </label>
                      <label>
                        Durée / renouvellement
                        <input
                          disabled
                          value={`${selected.durationMonths} mois · ${CONTRACT_RENEWAL_LABELS[selected.renewal]}`}
                        />
                      </label>
                      <label>
                        Fréquence / niveau
                        <input
                          disabled
                          value={`${selected.frequency ? FREQUENCY_LABELS[selected.frequency] : "—"} · ${selected.serviceLevel ? SERVICE_LEVEL_LABELS[selected.serviceLevel] : "—"}`}
                        />
                      </label>
                      <label className="need-qual__full">
                        Note
                        <textarea
                          rows={2}
                          disabled={!editableDraft}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </label>
                    </div>
                    {editableDraft ? (
                      <div className="quotes-actions">
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void post("update", {
                              id: selected.id,
                              sla,
                              staffCount: Number(staffCount) || 0,
                              endAt: endAt || null,
                              note,
                            })
                          }
                        >
                          Enregistrer brouillon
                        </button>
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          disabled={busy}
                          onClick={() =>
                            void post("activate", { id: selected.id })
                          }
                        >
                          Activer (OPS / Finance)
                        </button>
                      </div>
                    ) : null}
                    {canManage && selected.status === "actif" ? (
                      <div className="quotes-actions">
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          onClick={() => {
                            setAmendReason("");
                            setAmendOpen(true);
                          }}
                        >
                          Créer un avenant
                        </button>
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void post("status", {
                              id: selected.id,
                              status: "suspendu" as ContractStatus,
                            })
                          }
                        >
                          Suspendre
                        </button>
                      </div>
                    ) : null}
                  </section>

                  <section className="contracts-section">
                    <h3>Sites ({selected.sites.length})</h3>
                    <ul className="contracts-sites">
                      {selected.sites.map((s) => (
                        <li key={s.id}>
                          <strong>
                            {s.name}
                            {!s.active ? " (inactif)" : ""}
                          </strong>
                          <span>
                            {s.address || "—"}
                            {s.city ? ` · ${s.city}` : ""}
                            {s.surfaceM2 != null ? ` · ${s.surfaceM2} m²` : ""}
                          </span>
                          {s.consignes ? <em>{s.consignes}</em> : null}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="contracts-section">
                    <h3>
                      Tarifs · {formatContractFcfa(selected.monthlyAmount)}
                      /mois
                    </h3>
                    <div className="quotes-table-wrap">
                      <table className="quotes-table">
                        <thead>
                          <tr>
                            <th>Libellé</th>
                            <th>Qté</th>
                            <th>P.U.</th>
                            <th>Période</th>
                            <th>Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.tariffs.map((t) => (
                            <tr key={t.id}>
                              <td>{t.label}</td>
                              <td>
                                {t.quantity} {t.unit}
                              </td>
                              <td>{formatContractFcfa(t.unitPrice)}</td>
                              <td>{t.period}</td>
                              <td>{formatContractFcfa(t.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="contracts-section">
                    <h3>Échéances</h3>
                    <ul className="contracts-milestones">
                      {selected.milestones.map((m) => (
                        <li key={m.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={m.done}
                              disabled={
                                busy || selected.status === "brouillon"
                              }
                              onChange={(e) =>
                                void post("milestone", {
                                  id: selected.id,
                                  milestoneId: m.id,
                                  done: e.target.checked,
                                })
                              }
                            />
                            <span>
                              <strong>{m.label}</strong> ·{" "}
                              {formatWhen(m.dueAt)} · {m.kind}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="contracts-section">
                    <h3>Avenants ({selected.amendments.length})</h3>
                    {selected.amendments.length === 0 ? (
                      <p className="leads-empty">Aucun avenant.</p>
                    ) : (
                      <ul className="contracts-amendments">
                        {selected.amendments.map((a) => (
                          <li key={a.id}>
                            <strong>
                              Avenant n°{String(a.number).padStart(2, "0")}
                            </strong>
                            <span>
                              {formatWhen(a.at)} · {a.byName} · effet{" "}
                              {formatWhen(a.effectiveAt)}
                            </span>
                            <em>
                              {a.reason} — {a.changes}
                            </em>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="need-qual__history">
                    <h3>Journal</h3>
                    <ol>
                      {selected.history.slice(0, 14).map((h) => (
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
        </>
      )}

      <AdminFormWizard
        open={composerOpen}
        portal
        onClose={() => {
          setComposerOpen(false);
          setComposerStep("affaire");
        }}
        titleId="contracts-from-won-title"
        eyebrow="Sans ressaisie"
        title="Transformer une affaire gagnée"
        lead="Sites, tarifs, SLA et effectif repris du devis / visite / besoin."
        steps={[
          { id: "affaire", label: "Affaire", hint: "Opportunité gagnée" },
          { id: "conditions", label: "Conditions", hint: "Effet & durée" },
          { id: "revue", label: "Revue", hint: "Contrôle avant création" },
        ]}
        stepId={composerStep}
        onStepChange={(id) =>
          setComposerStep(id as "affaire" | "conditions" | "revue")
        }
        canEnterStep={canEnterComposerStep}
        onStepBlocked={pulseComposerError}
        shake={composerShake}
        formId="necs-contract-from-won"
        onSubmit={submitFromWon}
        submitLabel="Créer le contrat brouillon"
        busy={busy}
        canSubmit={canSubmitContract}
      >
        {composerStep === "affaire" ? (
          <FwPanel aria-label="Affaire">
            <FwPanelHead
              title="Affaire gagnée"
              description="Choisissez l’opportunité à transformer en contrat."
            />
            <FwGrid>
              <FwField label="Affaire gagnée *" wide>
                <select
                  required
                  value={pickOpp}
                  onChange={(e) => setPickOpp(e.target.value)}
                >
                  <option value="">— Choisir —</option>
                  {wonEligible.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.company} ({o.id}) ·{" "}
                      {formatContractFcfa(o.valueEstimate)}
                    </option>
                  ))}
                </select>
              </FwField>
            </FwGrid>
            {wonEligible.length === 0 ? (
              <FwWarn>
                Aucune affaire gagnée disponible.{" "}
                <Link href="/admin/pipeline">Ouvrir le pipeline</Link>
              </FwWarn>
            ) : previewLoading ? (
              <FwOk>Calcul de la reprise…</FwOk>
            ) : preview ? (
              preview.noResaisie.ok ? (
                <FwOk>
                  Reprise OK · sources : {preview.sources.join(", ")} ·{" "}
                  {preview.sites.length} site(s) ·{" "}
                  {formatContractFcfa(preview.monthlyAmount)} / mois
                </FwOk>
              ) : (
                <FwWarn>
                  Reprise incomplète — vérifiez devis / visite / besoin avant
                  de continuer.
                </FwWarn>
              )
            ) : null}
          </FwPanel>
        ) : null}

        {composerStep === "conditions" ? (
          <FwPanel aria-label="Conditions">
            <FwPanelHead
              title="Conditions contractuelles"
              description="Seules la date d’effet, la durée et le renouvellement sont saisis ici."
            />
            <FwGrid>
              <FwField label="Date d’effet *">
                <input
                  type="date"
                  required
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </FwField>
              <FwField label="Durée (mois)">
                <input
                  type="number"
                  min={1}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                />
              </FwField>
            </FwGrid>
            <FwBlock>
              <FwPanelHead
                title="Renouvellement"
                description="Modalité à l’échéance du contrat."
              />
              <FwChips>
                {(
                  Object.entries(CONTRACT_RENEWAL_LABELS) as Array<
                    [ContractRenewal, string]
                  >
                ).map(([k, v]) => (
                  <FwChip
                    key={k}
                    selected={renewal === k}
                    title={v}
                    onClick={() => setRenewal(k)}
                  />
                ))}
              </FwChips>
            </FwBlock>
          </FwPanel>
        ) : null}

        {composerStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue avant création"
              description="Vérifiez l’affaire et les conditions. Le contrat part en brouillon."
            />
            <FwReview>
              <FwReviewCard
                title="Affaire"
                rows={[
                  {
                    label: "Société",
                    value: selectedOpp?.company || preview?.contactName || "—",
                  },
                  { label: "ID", value: pickOpp || "—" },
                  {
                    label: "Valeur estimée",
                    value: selectedOpp
                      ? formatContractFcfa(selectedOpp.valueEstimate)
                      : "—",
                  },
                ]}
              />
              <FwReviewCard
                title="Conditions"
                rows={[
                  { label: "Date d’effet", value: startAt || "—" },
                  { label: "Durée", value: `${durationMonths || "—"} mois` },
                  {
                    label: "Renouvellement",
                    value: CONTRACT_RENEWAL_LABELS[renewal],
                  },
                ]}
              />
              <FwReviewCard
                title="Reprise"
                rows={[
                  {
                    label: "SLA",
                    value: preview
                      ? CONTRACT_SLA_LABELS[preview.sla]
                      : "—",
                  },
                  {
                    label: "Mensuel",
                    value: preview
                      ? formatContractFcfa(preview.monthlyAmount)
                      : "—",
                  },
                  {
                    label: "Sites / tarifs",
                    value: preview
                      ? `${preview.sites.length} / ${preview.tariffs.length}`
                      : "—",
                  },
                  {
                    label: "Effectif",
                    value: preview ? String(preview.staffCount) : "—",
                  },
                  {
                    label: "Contact",
                    value: preview
                      ? `${preview.contactName || "—"}${
                          preview.contactEmail
                            ? ` · ${preview.contactEmail}`
                            : ""
                        }`
                      : "—",
                  },
                ]}
              />
            </FwReview>
            {preview?.existingContractId ? (
              <FwWarn>
                Un contrat existe déjà (
                <Link
                  href={`/admin/contrats?opportunityId=${encodeURIComponent(preview.opportunityId)}`}
                >
                  {preview.existingContractRef}
                </Link>
                ).
              </FwWarn>
            ) : null}
            {preview && !preview.noResaisie.ok ? (
              <FwWarn>
                {preview.noResaisie.checks
                  .filter((c) => !c.ok)
                  .map((c) => c.detail)
                  .join(" · ")}
              </FwWarn>
            ) : null}
          </FwPanel>
        ) : null}
      </AdminFormWizard>

      {amendOpen && selected ? (
        <AdminOverlayPortal>
          <div
            className="doc-overlay-backdrop clients-overlay"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAmendOpen(false);
            }}
          >
            <div
              className="doc-overlay-dialog clients-overlay__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="contracts-amend-title"
            >
              <div className="doc-overlay-header">
                <div className="doc-overlay-header__left">
                  <p className="doc-overlay-header__tag">Avenant</p>
                  <h2 id="contracts-amend-title">{selected.ref}</h2>
                  <p className="doc-overlay-header__sub">
                    Modification SLA, effectif ou fin de contrat
                  </p>
                </div>
                <div className="doc-overlay-header__right">
                  <button
                    type="button"
                    className="doc-overlay-close-btn"
                    aria-label="Fermer"
                    onClick={() => setAmendOpen(false)}
                  >
                    ×
                  </button>
                </div>
              </div>
              <form
                className="doc-overlay-form clients-form clients-form--embedded"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void post("amend", {
                    id: selected.id,
                    reason: amendReason,
                    sla: amendSla,
                    staffCount: Number(amendStaff) || 0,
                    endAt: amendEnd || null,
                  });
                }}
              >
                <div className="doc-overlay-body need-qual__grid">
                  <label className="need-qual__full">
                    Motif *
                    <input
                      required
                      value={amendReason}
                      onChange={(e) => setAmendReason(e.target.value)}
                      placeholder="Ex. Extension surface +2 agents"
                      autoFocus
                    />
                  </label>
                  <label>
                    Nouveau SLA
                    <select
                      value={amendSla}
                      onChange={(e) =>
                        setAmendSla(e.target.value as ContractSla)
                      }
                    >
                      {Object.entries(CONTRACT_SLA_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Effectif
                    <input
                      type="number"
                      min={0}
                      value={amendStaff}
                      onChange={(e) => setAmendStaff(e.target.value)}
                    />
                  </label>
                  <label>
                    Nouvelle fin
                    <input
                      type="date"
                      value={amendEnd}
                      onChange={(e) => setAmendEnd(e.target.value)}
                    />
                  </label>
                </div>
                <footer className="doc-overlay-footer">
                  <p className="doc-overlay-footer__hint">
                    Snapshot avant avenant conservé dans l’historique.
                  </p>
                  <div className="doc-overlay-footer__actions">
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() => setAmendOpen(false)}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn-admin btn-admin--primary"
                      disabled={busy || !amendReason.trim()}
                    >
                      Enregistrer l’avenant
                    </button>
                  </div>
                </footer>
              </form>
            </div>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </div>
  );
}
