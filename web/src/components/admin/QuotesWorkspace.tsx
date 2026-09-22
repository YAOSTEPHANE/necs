"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
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
  FwOk,
} from "@/components/admin/form-wizard";
import { IconSearch, IconQuote } from "@/components/admin/Icons";
import {
  FREQUENCY_LABELS,
  NEED_FREQUENCIES,
  PRESTATION_KINDS,
  PRESTATION_LABELS,
  SERVICE_LEVEL_LABELS,
  SERVICE_LEVELS,
  type NeedFrequency,
  type PrestationKind,
  type ServiceLevel,
} from "@/lib/need-qualification-shared";
import {
  QUOTE_LINE_KIND_LABELS,
  QUOTE_STATUS_LABELS,
  formatFcfa,
  type Quote,
  type QuoteLine,
  type QuoteLineKind,
  type QuoteTariffs,
} from "@/lib/quotes-shared";
import type { Prospect } from "@/lib/prospects-shared";
import { toast } from "@/lib/toast";

type QuoteMeta = {
  requiredLevel: string;
  thresholdCommercial: number;
  thresholdFinance: number;
  totalHT: number;
  reconstitutable: {
    linesOk: boolean;
    lineErrors: string[];
    subtotal: number;
    totalHT: number;
    matchesStored: boolean;
  };
};

function formatWhen(ts: string | null | undefined) {
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

export function QuotesWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const searchParams = useSearchParams();
  const visitFromUrl = searchParams.get("visitId") || "";
  const prospectFromUrl = searchParams.get("prospectId") || "";
  const opportunityFromUrl = searchParams.get("opportunityId") || "";

  const [items, setItems] = useState<Quote[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [tariffs, setTariffs] = useState<QuoteTariffs | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("actifs");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [meta, setMeta] = useState<QuoteMeta | null>(null);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<
    "source" | "details" | "revue"
  >("source");
  const [composerShake, setComposerShake] = useState(false);
  const [tariffsOpen, setTariffsOpen] = useState(false);
  const [versionReason, setVersionReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [draft, setDraft] = useState({
    title: "",
    note: "",
    prestation: "" as PrestationKind | "",
    frequency: "" as NeedFrequency | "",
    serviceLevel: "" as ServiceLevel | "",
    staffCount: "",
    surfaceM2: "",
    hoursPerVisit: "",
    overheadPct: "",
    marginPct: "",
  });
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [tariffForm, setTariffForm] = useState<QuoteTariffs | null>(null);
  const [manual, setManual] = useState({
    prospectId: "",
    company: "",
    surfaceM2: "",
    staffCount: "2",
    frequency: "" as NeedFrequency | "",
  });
  const [fromVisitId, setFromVisitId] = useState(visitFromUrl);
  const [fromOpportunityId, setFromOpportunityId] = useState(
    opportunityFromUrl || prospectFromUrl,
  );
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, pRes] = await Promise.all([
        fetch("/api/quotes", { cache: "no-store" }),
        fetch("/api/prospects", { cache: "no-store" }),
      ]);
      const qData = (await qRes.json()) as {
        items?: Quote[];
        tariffs?: QuoteTariffs;
        canEdit?: boolean;
        canValidate?: boolean;
        role?: string;
        error?: string;
      };
      const pData = (await pRes.json()) as {
        items?: Prospect[];
        error?: string;
      };
      if (!qRes.ok) throw new Error(qData.error || "Chargement devis");
      setItems(qData.items ?? []);
      setTariffs(qData.tariffs ?? null);
      setTariffForm(qData.tariffs ?? null);
      setCanEdit(Boolean(qData.canEdit));
      setCanValidate(Boolean(qData.canValidate));
      setRole(qData.role ?? "");
      if (pRes.ok) setProspects(pData.items ?? []);
      setSelectedId((prev) => prev ?? qData.items?.[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (visitFromUrl) {
      setFromVisitId(visitFromUrl);
      setFromOpportunityId("");
      setComposerStep("source");
      setComposerOpen(true);
      return;
    }
    if (opportunityFromUrl || prospectFromUrl) {
      setFromVisitId("");
      setFromOpportunityId(opportunityFromUrl || prospectFromUrl);
      if (prospectFromUrl) {
        setManual((d) => ({ ...d, prospectId: prospectFromUrl }));
      }
      setComposerStep("source");
      setComposerOpen(true);
    }
  }, [visitFromUrl, opportunityFromUrl, prospectFromUrl]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/quotes?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        item?: Quote;
        meta?: QuoteMeta;
        canValidate?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Détail");
      if (data.item) {
        setItems((prev) => {
          const others = prev.filter((x) => x.id !== data.item!.id);
          return [data.item!, ...others];
        });
        setMeta(data.meta ?? null);
        if (data.canValidate !== undefined) setCanValidate(data.canValidate);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDraft({
      title: selected.title,
      note: selected.note,
      prestation: selected.prestation,
      frequency: selected.frequency,
      serviceLevel: selected.serviceLevel,
      staffCount: String(selected.staffCount),
      surfaceM2: String(selected.surfaceM2),
      hoursPerVisit: String(selected.hoursPerVisit),
      overheadPct: String(selected.totals.overheadPct),
      marginPct: String(selected.totals.marginPct),
    });
    setLines(selected.lines.map((l) => ({ ...l })));
    void loadDetail(selected.id);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((v) => {
      if (filter === "actifs" && (v.status === "envoye" || v.status === "refuse")) {
        return false;
      }
      if (filter !== "all" && filter !== "actifs" && v.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        v.company.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        v.title.toLowerCase().includes(q) ||
        v.visitId.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  const post = async (action: string, payload: Record<string, unknown> = {}) => {
    if (busy) return null;
    if (busyLock.current) return null;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as {
        item?: Quote;
        tariffs?: QuoteTariffs;
        meta?: QuoteMeta;
        error?: string;
        canValidate?: boolean;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      if (data.tariffs) {
        setTariffs(data.tariffs);
        setTariffForm(data.tariffs);
      }
      if (data.item) {
        setItems((prev) => {
          const others = prev.filter((x) => x.id !== data.item!.id);
          return [data.item!, ...others];
        });
        setSelectedId(data.item.id);
        setMeta(data.meta ?? null);
        if (data.canValidate !== undefined) setCanValidate(data.canValidate);
        toast.success("Enregistré");
        setComposerOpen(false);
        setComposerStep("source");
      } else if (data.tariffs) {
        toast.success("Tarifs mis à jour");
        setTariffsOpen(false);
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

  const editable =
    canEdit &&
    selected &&
    (selected.status === "brouillon" || selected.status === "refuse");

  const createMode: "visit" | "opportunity" | "manual" = fromVisitId.trim()
    ? "visit"
    : fromOpportunityId.trim()
      ? "opportunity"
      : "manual";
  const sourceReady =
    createMode === "visit"
      ? Boolean(fromVisitId.trim())
      : createMode === "opportunity"
        ? Boolean(fromOpportunityId.trim())
        : Boolean(manual.prospectId || manual.company.trim());
  const pulseComposerError = () => {
    setComposerShake(true);
    window.setTimeout(() => setComposerShake(false), 420);
  };
  const canEnterComposerStep = (id: string) => {
    if (id === "source") return true;
    return sourceReady;
  };
  const submitCreateQuote = (e: FormEvent) => {
    e.preventDefault();
    if (fromVisitId.trim()) {
      void post("from-visit", { visitId: fromVisitId.trim() });
    } else if (fromOpportunityId.trim()) {
      void post("from-opportunity", {
        opportunityId: fromOpportunityId.trim(),
        prospectId: fromOpportunityId.trim(),
      });
    } else {
      void post("manual", {
        prospectId: manual.prospectId,
        company: manual.company,
        surfaceM2: Number(manual.surfaceM2) || 0,
        staffCount: Number(manual.staffCount) || 0,
        frequency: manual.frequency,
      });
    }
  };

  const saveDraft = () => {
    if (!selected) return;
    void post("update", {
      id: selected.id,
      title: draft.title,
      note: draft.note,
      prestation: draft.prestation,
      frequency: draft.frequency,
      serviceLevel: draft.serviceLevel,
      staffCount: Number(draft.staffCount) || 0,
      surfaceM2: Number(draft.surfaceM2) || 0,
      hoursPerVisit: Number(draft.hoursPerVisit) || 0,
      overheadPct: Number(draft.overheadPct) || 0,
      marginPct: Number(draft.marginPct) || 0,
      lines,
    });
  };

  const rebuild = () => {
    if (!selected) return;
    void post("update", {
      id: selected.id,
      title: draft.title,
      note: draft.note,
      prestation: draft.prestation,
      frequency: draft.frequency,
      serviceLevel: draft.serviceLevel,
      staffCount: Number(draft.staffCount) || 0,
      surfaceM2: Number(draft.surfaceM2) || 0,
      hoursPerVisit: Number(draft.hoursPerVisit) || 0,
      overheadPct: Number(draft.overheadPct) || 0,
      marginPct: Number(draft.marginPct) || 0,
      rebuildLines: true,
    });
  };

  const produceOffer = async () => {
    if (!selected) return;
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/commercial-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          quoteId: selected.id,
          opportunityId: selected.opportunityId || undefined,
        }),
      });
      const data = (await res.json()) as {
        item?: { id: string; ref?: string };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Production offre impossible");
      toast.success(
        data.item?.ref
          ? `Offre ${data.item.ref} produite depuis le chiffrage`
          : "Offre produite depuis le chiffrage",
      );
      window.location.href = `/admin/commercial?tab=offre&offerId=${encodeURIComponent(data.item?.id || "")}`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  };

  const updateLine = (id: string, patch: Partial<QuoteLine>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const quantity =
          patch.quantity !== undefined
            ? Math.max(0, Number(patch.quantity) || 0)
            : l.quantity;
        const unitPrice =
          patch.unitPrice !== undefined
            ? Math.max(0, Number(patch.unitPrice) || 0)
            : l.unitPrice;
        return {
          ...l,
          ...patch,
          quantity,
          unitPrice,
          amount: Math.round(quantity * unitPrice * 100) / 100,
        };
      }),
    );
  };

  const addLine = () => {
    const id = `QL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setLines((prev) => [
      ...prev,
      {
        id,
        label: "Nouvelle ligne",
        kind: "autre" as QuoteLineKind,
        quantity: 1,
        unit: "u",
        unitPrice: 0,
        amount: 0,
      },
    ]);
  };

  const pendingCount = items.filter((i) => i.status === "en_validation").length;
  const draftCount = items.filter((i) => i.status === "brouillon").length;
  const validatedCount = items.filter(
    (i) => i.status === "valide" || i.status === "envoye",
  ).length;
  const pipelineHt = items
    .filter((i) => i.status !== "refuse")
    .reduce((sum, i) => sum + (i.totals?.totalHT || 0), 0);

  const headerActions = (
    <div className="leads-header-actions">
      {!embedded && (
        <Link
          href="/admin/commercial?tab=offre"
          className="btn-admin btn-admin--ghost"
        >
          Propositions / offres
        </Link>
      )}
      {!embedded && (
        <Link
          href="/admin/commercial?tab=audit-visite"
          className="btn-admin btn-admin--ghost"
        >
          Visites techniques
        </Link>
      )}
      {(role === "admin" || role === "finance" || role === "manager") && (
        <button
          type="button"
          className="btn-admin btn-admin--ghost"
          onClick={() => setTariffsOpen(true)}
        >
          Tarifs & seuils
        </button>
      )}
      {canEdit && (
        <button
          type="button"
          className="btn-admin btn-admin--primary"
          onClick={() => {
            setComposerStep("source");
            setComposerOpen(true);
          }}
        >
          Nouveau devis
        </button>
      )}
    </div>
  );

  return (
    <div
      className={`leads-page quotes-page${embedded ? " quotes-page--embedded" : ""}`}
      data-testid="quotes-workspace"
    >
      {embedded ? (
        <div className="fin-embedded-bar quotes-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">CRM-03 · Chiffrage</p>
            <h2>Chiffrage et devis</h2>
            <p>
              Prestations, coûts, effectifs, fréquences et tarifs — montant
              reconstituable, versions et seuils commercial / finance /
              direction
            </p>
          </div>
          {headerActions}
        </div>
      ) : (
        <ModuleHeader
          tone="#0369a1"
          badge="CRM-03 · Commercial"
          icon={<IconQuote size={20} />}
          title="Chiffrage et devis"
          meta={
            <>
              <span>
                <strong>{draftCount}</strong> brouillons
              </span>
              <span>
                <strong>{pendingCount}</strong> en validation
              </span>
              <span>
                <strong>{validatedCount}</strong> validés / envoyés
              </span>
            </>
          }
          actions={headerActions}
        />
      )}

      <section className="leads-kpis" aria-label="Indicateurs devis">
        <article className="leads-kpi">
          <p>Brouillons</p>
          <strong>{draftCount}</strong>
          <span>à finaliser</span>
        </article>
        <article className="leads-kpi leads-kpi--accent">
          <p>En validation</p>
          <strong>{pendingCount}</strong>
          <span>seuils commercial / finance</span>
        </article>
        <article className="leads-kpi">
          <p>Validés</p>
          <strong>{validatedCount}</strong>
          <span>prêts client</span>
        </article>
        <article className="leads-kpi quotes-kpi--value">
          <p>Pipeline HT</p>
          <strong>{formatFcfa(pipelineHt)}</strong>
          <span>{items.length} devis au total</span>
        </article>
      </section>

      {loading ? (
        <div className="leads-empty">
          <span className="leads-empty__orb" aria-hidden />
          <p className="leads-empty__eyebrow">Chiffrage</p>
          <h2>Chargement des devis…</h2>
        </div>
      ) : (
        <>
          <div className="leads-toolbar quotes-toolbar">
            <label className="leads-search">
              <IconSearch />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher société, id, visite…"
              />
            </label>
            <div className="leads-filters" role="tablist" aria-label="Filtrer les devis">
              {(
                [
                  ["actifs", "Actifs", items.filter((i) => i.status !== "envoye" && i.status !== "refuse").length],
                  ["all", "Tous", items.length],
                  ["brouillon", "Brouillons", draftCount],
                  ["en_validation", "Validation", pendingCount],
                  ["valide", "Validés", items.filter((i) => i.status === "valide").length],
                  ["envoye", "Envoyés", items.filter((i) => i.status === "envoye").length],
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
            <div className="leads-inbox" role="listbox" aria-label="Liste des devis">
              {filtered.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  role="option"
                  aria-selected={q.id === selectedId}
                  className={`leads-card quotes-card${q.id === selectedId ? " is-active" : ""}`}
                  onClick={() => setSelectedId(q.id)}
                >
                  <span className="leads-card__body">
                    <span className="leads-card__top">
                      <strong>{q.company}</strong>
                      <time>{formatFcfa(q.totals.totalHT)}</time>
                    </span>
                    <span className="leads-card__mid">
                      <span className={`quotes-status quotes-status--${q.status}`}>
                        {QUOTE_STATUS_LABELS[q.status]}
                      </span>
                      <span className="quotes-card__version">v{q.currentVersion}</span>
                    </span>
                    <span className="leads-card__preview">
                      {q.id}
                      {q.visitId ? ` · ${q.visitId}` : ""}
                      {q.title ? ` · ${q.title}` : ""}
                    </span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 ? (
                <div className="leads-empty quotes-inbox-empty">
                  <span className="leads-empty__orb" aria-hidden />
                  <p className="leads-empty__eyebrow">Aucun résultat</p>
                  <h2>Aucun devis</h2>
                  <p>
                    Utilisez le bouton en haut à droite pour créer une offre depuis
                    une visite validée ou en saisie manuelle.
                  </p>
                </div>
              ) : null}
            </div>

            <article className="leads-detail quotes-detail">
              {!selected ? (
                <div className="leads-empty-detail quotes-empty-detail">
                  <p className="leads-empty__eyebrow">Détail devis</p>
                  <h2>Sélectionnez un devis</h2>
                  <p>
                    Paramètres, lignes, validation et versions s’affichent ici.
                  </p>
                  <div className="quotes-empty-detail__actions">
                    <Link href="/admin/commercial?tab=audit-visite" className="btn-admin btn-admin--ghost">
                      Voir les visites
                    </Link>
                  </div>
                </div>
              ) : (
              <>
                <header className="leads-detail__head">
                  <div>
                    <p className="leads-detail__eyebrow">
                      {selected.id} · version {selected.currentVersion}
                    </p>
                    <h2>{selected.title || selected.company}</h2>
                    <p className="leads-detail__sub">
                      {selected.company}
                      {selected.visitId ? (
                        <>
                          {" "}
                          · visite{" "}
                          <Link href="/admin/commercial?tab=audit-visite">{selected.visitId}</Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="leads-detail__actions quotes-detail__aside">
                    <span className={`quotes-status quotes-status--${selected.status}`}>
                      {QUOTE_STATUS_LABELS[selected.status]}
                    </span>
                    <div className="quotes-detail__total">
                      <span>Total HT</span>
                      <strong>{formatFcfa(selected.totals.totalHT)}</strong>
                    </div>
                  </div>
                </header>

                {meta && (
                  <div
                    className={
                      meta.reconstitutable.matchesStored &&
                      meta.reconstitutable.linesOk
                        ? "quotes-reconstitute is-ok"
                        : "quotes-reconstitute is-warn"
                    }
                  >
                    <div className="quotes-reconstitute__head">
                      <strong>Contrôle de reconstitution</strong>
                      <span>
                        {meta.reconstitutable.matchesStored &&
                        meta.reconstitutable.linesOk
                          ? "Conforme"
                          : "Écart détecté"}
                      </span>
                    </div>
                    <p>
                      Σ lignes {formatFcfa(meta.reconstitutable.subtotal)} →
                      total HT {formatFcfa(meta.reconstitutable.totalHT)}
                      {meta.reconstitutable.matchesStored
                        ? " · aligné avec le devis stocké"
                        : " · écart avec le total stocké"}
                    </p>
                    <p>
                      Seuil validation :{" "}
                      <strong>{meta.requiredLevel}</strong> (commercial ≤{" "}
                      {formatFcfa(meta.thresholdCommercial)} · finance ≤{" "}
                      {formatFcfa(meta.thresholdFinance)})
                    </p>
                  </div>
                )}

                <section className="quotes-panel quotes-params">
                  <h3>Paramètres de chiffrage</h3>
                  <p className="quotes-params__hint">
                    L’offre se calcule à partir de la prestation, des coûts
                    (surface / main-d’œuvre / consommables), des effectifs, de
                    la fréquence et des tarifs. Puis « Recalculer » pour
                    régénérer les lignes.
                  </p>
                  <div className="need-qual__grid">
                    <label>
                      Titre
                      <input
                        disabled={!editable}
                        value={draft.title}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, title: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Prestation
                      <select
                        disabled={!editable}
                        value={draft.prestation}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            prestation: e.target.value as PrestationKind | "",
                          }))
                        }
                      >
                        <option value="">—</option>
                        {PRESTATION_KINDS.map((p) => (
                          <option key={p} value={p}>
                            {PRESTATION_LABELS[p]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Fréquence
                      <select
                        disabled={!editable}
                        value={draft.frequency}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            frequency: e.target.value as NeedFrequency | "",
                          }))
                        }
                      >
                        <option value="">—</option>
                        {NEED_FREQUENCIES.map((f) => (
                          <option key={f} value={f}>
                            {FREQUENCY_LABELS[f]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Niveau de service
                      <select
                        disabled={!editable}
                        value={draft.serviceLevel}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            serviceLevel: e.target
                              .value as ServiceLevel | "",
                          }))
                        }
                      >
                        <option value="">—</option>
                        {SERVICE_LEVELS.map((s) => (
                          <option key={s} value={s}>
                            {SERVICE_LEVEL_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Surface (m²)
                      <input
                        type="number"
                        min={0}
                        disabled={!editable}
                        value={draft.surfaceM2}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            surfaceM2: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Effectif (agents)
                      <input
                        type="number"
                        min={0}
                        disabled={!editable}
                        value={draft.staffCount}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            staffCount: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Heures / passage
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        disabled={!editable}
                        value={draft.hoursPerVisit}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            hoursPerVisit: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Frais généraux (%)
                      <input
                        type="number"
                        min={0}
                        disabled={!editable}
                        value={draft.overheadPct}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            overheadPct: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Marge (%)
                      <input
                        type="number"
                        min={0}
                        disabled={!editable}
                        value={draft.marginPct}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            marginPct: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="need-qual__full">
                      Note
                      <textarea
                        rows={2}
                        disabled={!editable}
                        value={draft.note}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, note: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                  {editable && (
                    <div className="quotes-actions">
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy}
                        onClick={rebuild}
                      >
                        Recalculer depuis presta / effectifs / freq / tarifs
                      </button>
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={busy}
                        onClick={saveDraft}
                      >
                        Enregistrer le brouillon
                      </button>
                    </div>
                  )}
                </section>

                <section className="quotes-panel quotes-lines">
                  <div className="quotes-lines__head">
                    <h3>Lignes de chiffrage</h3>
                    {editable && (
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        onClick={addLine}
                      >
                        Ajouter une ligne
                      </button>
                    )}
                  </div>
                  <div className="quotes-table-wrap">
                    <table className="quotes-table">
                      <thead>
                        <tr>
                          <th>Libellé</th>
                          <th>Type</th>
                          <th>Qté</th>
                          <th>Unité</th>
                          <th>P.U.</th>
                          <th>Montant</th>
                          {editable && <th />}
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l) => (
                          <tr key={l.id}>
                            <td>
                              {editable ? (
                                <input
                                  value={l.label}
                                  onChange={(e) =>
                                    updateLine(l.id, {
                                      label: e.target.value,
                                    })
                                  }
                                />
                              ) : (
                                l.label
                              )}
                            </td>
                            <td>
                              {editable ? (
                                <select
                                  value={l.kind}
                                  onChange={(e) =>
                                    updateLine(l.id, {
                                      kind: e.target.value as QuoteLineKind,
                                    })
                                  }
                                >
                                  {Object.entries(QUOTE_LINE_KIND_LABELS).map(
                                    ([k, v]) => (
                                      <option key={k} value={k}>
                                        {v}
                                      </option>
                                    ),
                                  )}
                                </select>
                              ) : (
                                QUOTE_LINE_KIND_LABELS[l.kind]
                              )}
                            </td>
                            <td>
                              {editable ? (
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={l.quantity}
                                  onChange={(e) =>
                                    updateLine(l.id, {
                                      quantity: Number(e.target.value),
                                    })
                                  }
                                />
                              ) : (
                                l.quantity
                              )}
                            </td>
                            <td>
                              {editable ? (
                                <input
                                  value={l.unit}
                                  onChange={(e) =>
                                    updateLine(l.id, { unit: e.target.value })
                                  }
                                />
                              ) : (
                                l.unit
                              )}
                            </td>
                            <td>
                              {editable ? (
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={l.unitPrice}
                                  onChange={(e) =>
                                    updateLine(l.id, {
                                      unitPrice: Number(e.target.value),
                                    })
                                  }
                                />
                              ) : (
                                formatFcfa(l.unitPrice)
                              )}
                            </td>
                            <td className="quotes-table__amount">
                              {formatFcfa(l.amount)}
                            </td>
                            {editable && (
                              <td>
                                <button
                                  type="button"
                                  className="btn-admin btn-admin--ghost quotes-table__remove"
                                  aria-label="Supprimer la ligne"
                                  onClick={() =>
                                    setLines((prev) =>
                                      prev.filter((x) => x.id !== l.id),
                                    )
                                  }
                                >
                                  ×
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <dl className="quotes-totals">
                    <div>
                      <dt>Sous-total</dt>
                      <dd>{formatFcfa(selected.totals.subtotal)}</dd>
                    </div>
                    <div>
                      <dt>
                        Frais généraux ({selected.totals.overheadPct} %)
                      </dt>
                      <dd>{formatFcfa(selected.totals.overheadAmount)}</dd>
                    </div>
                    <div>
                      <dt>Marge ({selected.totals.marginPct} %)</dt>
                      <dd>{formatFcfa(selected.totals.marginAmount)}</dd>
                    </div>
                    <div className="quotes-totals__grand">
                      <dt>Total HT</dt>
                      <dd>{formatFcfa(selected.totals.totalHT)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="quotes-panel quotes-workflow">
                  <h3>Validation & envoi</h3>
                  <div className="quotes-actions">
                    {canEdit &&
                      (selected.status === "valide" ||
                        selected.status === "envoye" ||
                        selected.status === "brouillon") && (
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          disabled={busy || selected.lines.length === 0}
                          onClick={() => void produceOffer()}
                        >
                          Produire l’offre commerciale
                        </button>
                      )}
                    {canEdit &&
                      (selected.status === "brouillon" ||
                        selected.status === "refuse") && (
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void post("submit", { id: selected.id })
                          }
                        >
                          Soumettre à validation
                        </button>
                      )}
                    {canEdit && selected.status === "en_validation" && (
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy}
                        onClick={() =>
                          void post("withdraw", { id: selected.id })
                        }
                      >
                        Retirer de validation
                      </button>
                    )}
                    {canValidate && selected.status === "en_validation" && (
                      <>
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          disabled={busy}
                          onClick={() =>
                            void post("validate", { id: selected.id })
                          }
                        >
                          Valider
                        </button>
                        <input
                          placeholder="Motif de refus"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void post("reject", {
                              id: selected.id,
                              reason: rejectReason,
                            })
                          }
                        >
                          Refuser
                        </button>
                      </>
                    )}
                    {canEdit && selected.status === "valide" && (
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={busy}
                        onClick={() => void post("send", { id: selected.id })}
                      >
                        Marquer envoyé client
                      </button>
                    )}
                    {canEdit && (
                      <>
                        <input
                          placeholder="Motif nouvelle version"
                          value={versionReason}
                          onChange={(e) => setVersionReason(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void post("version", {
                              id: selected.id,
                              reason: versionReason,
                            })
                          }
                        >
                          Nouvelle version
                        </button>
                      </>
                    )}
                  </div>
                  {selected.rejectionReason && (
                    <p className="quotes-reject">
                      Refus : {selected.rejectionReason}
                    </p>
                  )}
                </section>

                <section className="quotes-panel quotes-versions">
                  <h3>Historique des versions ({selected.versions.length})</h3>
                  <ul>
                    {selected.versions.map((v) => (
                      <li key={`${v.version}-${v.at}`}>
                        <div className="quotes-versions__row">
                          <strong>v{v.version}</strong>
                          <span className="quotes-versions__amount">
                            {formatFcfa(v.totals.totalHT)} HT
                          </span>
                        </div>
                        <span>
                          {formatWhen(v.at)} · {v.byName}
                        </span>
                        <em>{v.reason || "Sans motif"}</em>
                        <span>
                          {v.lines.length} lignes · sous-total{" "}
                          {formatFcfa(v.totals.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="quotes-panel need-qual__history">
                  <h3>Journal</h3>
                  <ol>
                    {selected.history.slice(0, 16).map((h) => (
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
          setComposerStep("source");
        }}
        titleId="quotes-composer-title"
        eyebrow="Devis"
        title="Nouveau devis"
        lead="Depuis opportunité qualifiée, visite technique ou saisie manuelle. Brouillon jusqu’à soumission ; validation selon seuils."
        steps={[
          { id: "source", label: "Source", hint: "Opp. · visite · manuel" },
          { id: "details", label: "Détails", hint: "Chiffrage de base" },
          { id: "revue", label: "Revue", hint: "Contrôle avant création" },
        ]}
        stepId={composerStep}
        onStepChange={(id) =>
          setComposerStep(id as "source" | "details" | "revue")
        }
        canEnterStep={canEnterComposerStep}
        onStepBlocked={pulseComposerError}
        shake={composerShake}
        formId="necs-quote-create-form"
        onSubmit={submitCreateQuote}
        submitLabel="Créer le devis"
        busy={busy}
        canSubmit={sourceReady}
      >
        {composerStep === "source" ? (
          <FwPanel aria-label="Source">
            <FwPanelHead
              title="Origine du devis"
              description="Reprise depuis une opportunité (besoin complet), une visite technique ou saisie manuelle."
            />
            <FwBlock>
              <FwChips>
                <FwChip
                  selected={createMode === "opportunity"}
                  title="Depuis opportunité"
                  hint="Besoin qualifié"
                  onClick={() => {
                    setFromVisitId("");
                    if (!fromOpportunityId.trim()) {
                      setFromOpportunityId(prospectFromUrl || "OPP-");
                    }
                    setManual((d) => ({ ...d, prospectId: "", company: "" }));
                  }}
                />
                <FwChip
                  selected={createMode === "visit"}
                  title="Depuis visite"
                  hint="ID VT-…"
                  onClick={() => {
                    setFromOpportunityId("");
                    if (!fromVisitId.trim()) setFromVisitId("VT-");
                    setManual((d) => ({ ...d, prospectId: "", company: "" }));
                  }}
                />
                <FwChip
                  selected={createMode === "manual"}
                  title="Saisie manuelle"
                  hint="Prospect / société"
                  onClick={() => {
                    setFromVisitId("");
                    setFromOpportunityId("");
                  }}
                />
              </FwChips>
            </FwBlock>
            {createMode === "opportunity" ? (
              <FwGrid>
                <FwField label="ID opportunité ou prospect *" wide>
                  <input
                    placeholder="OPP-… ou ID prospect"
                    value={fromOpportunityId}
                    onChange={(e) => setFromOpportunityId(e.target.value)}
                    autoFocus
                  />
                </FwField>
              </FwGrid>
            ) : createMode === "visit" ? (
              <FwGrid>
                <FwField label="ID visite technique validée *" wide>
                  <input
                    placeholder="ID visite (VT-…)"
                    value={fromVisitId}
                    onChange={(e) => setFromVisitId(e.target.value)}
                    autoFocus
                  />
                </FwField>
              </FwGrid>
            ) : (
              <FwGrid>
                <FwField label="Prospect">
                  <select
                    value={manual.prospectId}
                    onChange={(e) => {
                      const p = prospects.find((x) => x.id === e.target.value);
                      setManual((d) => ({
                        ...d,
                        prospectId: e.target.value,
                        company: p?.company || d.company,
                      }));
                      setFromVisitId("");
                      setFromOpportunityId("");
                    }}
                  >
                    <option value="">—</option>
                    {prospects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.company}
                      </option>
                    ))}
                  </select>
                </FwField>
                <FwField label="Société">
                  <input
                    value={manual.company}
                    onChange={(e) =>
                      setManual((d) => ({
                        ...d,
                        company: e.target.value,
                      }))
                    }
                  />
                </FwField>
              </FwGrid>
            )}
          </FwPanel>
        ) : null}

        {composerStep === "details" ? (
          <FwPanel aria-label="Détails">
            <FwPanelHead
              title="Paramètres de base"
              description={
                createMode === "visit"
                  ? "La visite portera surface, effectif et fréquence. Vous pouvez affiner après création."
                  : createMode === "opportunity"
                    ? "Le besoin qualifié (surface, effectif, fréquence) alimente les lignes de chiffrage."
                    : "Surface, effectif et fréquence pour amorcer le chiffrage."
              }
            />
            {createMode === "visit" ? (
              <FwOk>
                Les données opérationnelles seront reprises de la visite{" "}
                {fromVisitId.trim() || "—"}.
              </FwOk>
            ) : createMode === "opportunity" ? (
              <FwOk>
                Surface, effectif, fréquence et niveau de service seront repris
                de l’opportunité / prospect {fromOpportunityId.trim() || "—"}.
              </FwOk>
            ) : (
              <>
                <FwGrid>
                  <FwField label="Surface m²">
                    <input
                      type="number"
                      min={0}
                      value={manual.surfaceM2}
                      onChange={(e) =>
                        setManual((d) => ({
                          ...d,
                          surfaceM2: e.target.value,
                        }))
                      }
                    />
                  </FwField>
                  <FwField label="Effectif">
                    <input
                      type="number"
                      min={0}
                      value={manual.staffCount}
                      onChange={(e) =>
                        setManual((d) => ({
                          ...d,
                          staffCount: e.target.value,
                        }))
                      }
                    />
                  </FwField>
                </FwGrid>
                <FwBlock>
                  <FwPanelHead title="Fréquence" />
                  <FwChips>
                    {NEED_FREQUENCIES.map((f) => (
                      <FwChip
                        key={f}
                        selected={manual.frequency === f}
                        title={FREQUENCY_LABELS[f]}
                        onClick={() =>
                          setManual((d) => ({ ...d, frequency: f }))
                        }
                      />
                    ))}
                  </FwChips>
                </FwBlock>
              </>
            )}
          </FwPanel>
        ) : null}

        {composerStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue avant création"
              description="Le devis sera créé en brouillon."
            />
            <FwReview>
              <FwReviewCard
                title="Source"
                rows={[
                  {
                    label: "Mode",
                    value:
                      createMode === "visit"
                        ? "Depuis visite"
                        : createMode === "opportunity"
                          ? "Depuis opportunité"
                          : "Saisie manuelle",
                  },
                  {
                    label:
                      createMode === "visit"
                        ? "Visite"
                        : createMode === "opportunity"
                          ? "Opportunité / prospect"
                          : "Prospect",
                    value:
                      createMode === "visit"
                        ? fromVisitId.trim() || "—"
                        : createMode === "opportunity"
                          ? fromOpportunityId.trim() || "—"
                          : prospects.find((p) => p.id === manual.prospectId)
                              ?.company ||
                            manual.company ||
                            "—",
                  },
                ]}
              />
              <FwReviewCard
                title="Paramètres"
                rows={[
                  {
                    label: "Surface",
                    value:
                      createMode === "visit" || createMode === "opportunity"
                        ? "Repris source"
                        : manual.surfaceM2
                          ? `${manual.surfaceM2} m²`
                          : "—",
                  },
                  {
                    label: "Effectif",
                    value:
                      createMode === "visit" || createMode === "opportunity"
                        ? "Repris source"
                        : manual.staffCount || "—",
                  },
                  {
                    label: "Fréquence",
                    value:
                      createMode === "visit" || createMode === "opportunity"
                        ? "Repris source"
                        : manual.frequency
                          ? FREQUENCY_LABELS[manual.frequency]
                          : "—",
                  },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>

      {portalReady && tariffsOpen && tariffForm
        ? createPortal(
            <div
              className="doc-overlay-backdrop clients-overlay quotes-overlay-root"
              role="presentation"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 5000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                margin: 0,
                padding: "1rem 0.75rem",
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setTariffsOpen(false);
              }}
            >
              <div
                className="doc-overlay-dialog clients-overlay__dialog quotes-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="quotes-tariffs-title"
                style={{
                  position: "relative",
                  margin: 0,
                  maxHeight: "calc(100dvh - 1.5rem)",
                  width: "min(40rem, 100%)",
                }}
              >
                <div className="doc-overlay-header">
                  <div className="doc-overlay-header__left">
                    <p className="doc-overlay-header__tag">Devis</p>
                    <h2 id="quotes-tariffs-title">Tarifs & seuils</h2>
                    <p className="doc-overlay-header__sub">
                      Barème de reconstitution et validation
                    </p>
                  </div>
                  <div className="doc-overlay-header__right">
                    <button
                      type="button"
                      className="doc-overlay-close-btn"
                      aria-label="Fermer"
                      onClick={() => setTariffsOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <form
                  className="doc-overlay-form clients-form clients-form--embedded"
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    void post("tariffs", { ...tariffForm });
                  }}
                >
                  <div className="doc-overlay-body">
                    <div className="quotes-composer-grid">
                      <label>
                        Tarif / m²·passage
                        <input
                          type="number"
                          min={0}
                          value={tariffForm.ratePerM2}
                          onChange={(e) =>
                            setTariffForm((t) =>
                              t
                                ? {
                                    ...t,
                                    ratePerM2: Number(e.target.value) || 0,
                                  }
                                : t,
                            )
                          }
                        />
                      </label>
                      <label>
                        Taux horaire
                        <input
                          type="number"
                          min={0}
                          value={tariffForm.hourlyRate}
                          onChange={(e) =>
                            setTariffForm((t) =>
                              t
                                ? {
                                    ...t,
                                    hourlyRate: Number(e.target.value) || 0,
                                  }
                                : t,
                            )
                          }
                        />
                      </label>
                      <label>
                        Consommables / m²
                        <input
                          type="number"
                          min={0}
                          value={tariffForm.consumablePerM2}
                          onChange={(e) =>
                            setTariffForm((t) =>
                              t
                                ? {
                                    ...t,
                                    consumablePerM2:
                                      Number(e.target.value) || 0,
                                  }
                                : t,
                            )
                          }
                        />
                      </label>
                      <label>
                        Frais généraux % défaut
                        <input
                          type="number"
                          min={0}
                          value={tariffForm.overheadPct}
                          onChange={(e) =>
                            setTariffForm((t) =>
                              t
                                ? {
                                    ...t,
                                    overheadPct: Number(e.target.value) || 0,
                                  }
                                : t,
                            )
                          }
                        />
                      </label>
                      <label>
                        Marge % défaut
                        <input
                          type="number"
                          min={0}
                          value={tariffForm.marginPct}
                          onChange={(e) =>
                            setTariffForm((t) =>
                              t
                                ? {
                                    ...t,
                                    marginPct: Number(e.target.value) || 0,
                                  }
                                : t,
                            )
                          }
                        />
                      </label>
                      <label>
                        Heures / passage défaut
                        <input
                          type="number"
                          min={0}
                          value={tariffForm.hoursPerVisitDefault}
                          onChange={(e) =>
                            setTariffForm((t) =>
                              t
                                ? {
                                    ...t,
                                    hoursPerVisitDefault:
                                      Number(e.target.value) || 0,
                                  }
                                : t,
                            )
                          }
                        />
                      </label>
                      <label>
                        Seuil commercial (FCFA)
                        <input
                          type="number"
                          min={0}
                          value={tariffForm.thresholdCommercial}
                          onChange={(e) =>
                            setTariffForm((t) =>
                              t
                                ? {
                                    ...t,
                                    thresholdCommercial:
                                      Number(e.target.value) || 0,
                                  }
                                : t,
                            )
                          }
                        />
                      </label>
                      <label>
                        Seuil finance (FCFA)
                        <input
                          type="number"
                          min={0}
                          value={tariffForm.thresholdFinance}
                          onChange={(e) =>
                            setTariffForm((t) =>
                              t
                                ? {
                                    ...t,
                                    thresholdFinance:
                                      Number(e.target.value) || 0,
                                  }
                                : t,
                            )
                          }
                        />
                      </label>
                    </div>
                    {tariffs ? (
                      <p className="quotes-tariff-hint">
                        Au-delà du seuil finance → validation direction (admin /
                        manager).
                      </p>
                    ) : null}
                  </div>
                  <footer className="doc-overlay-footer">
                    <p className="doc-overlay-footer__hint">
                      Appliqué au recalcul des lignes.
                    </p>
                    <div className="doc-overlay-footer__actions">
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        onClick={() => setTariffsOpen(false)}
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="btn-admin btn-admin--primary"
                        disabled={busy}
                      >
                        Enregistrer tarifs
                      </button>
                    </div>
                  </footer>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
