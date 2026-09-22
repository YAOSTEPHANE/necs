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
  FwReview,
  FwReviewCard,
  FwWarn,
  FwOk,
} from "@/components/admin/form-wizard";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconOffer, IconSearch } from "@/components/admin/Icons";
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
  COMMERCIAL_OFFER_STATUS_LABELS,
  CONFIDENTIALITY_LABELS,
  DEFAULT_OFFER_ARGUMENTS,
  DEFAULT_OFFER_CONDITIONS,
  DEFAULT_OFFER_DIGITAL,
  DEFAULT_OFFER_MEANS,
  DEFAULT_OFFER_METHODOLOGY,
  DEFAULT_OFFER_PLANNING,
  DEFAULT_OFFER_SUPERVISION,
  DEFAULT_OFFER_TEAM,
  DEFAULT_OFFER_TITLE,
  formatOfferFcfa,
  makeOfferLine,
  offerReadyToSend,
  type CommercialOffer,
  type CommercialOfferLine,
  type CommercialOfferStatus,
} from "@/lib/commercial-offers-shared";
import {
  OPPORTUNITY_STAGE_LABELS,
  type OpportunityStage,
} from "@/lib/need-qualification-shared";
import {
  QUOTE_STATUS_LABELS,
  type QuoteStatus,
} from "@/lib/quotes-shared";
import { toast } from "@/lib/toast";

type Filter =
  | "all"
  | "a_traiter"
  | CommercialOfferStatus;

type OfferSourceOpp = {
  id: string;
  company: string;
  title: string;
  stage: OpportunityStage;
  prospectId: string;
  valueEstimate: number;
  surfaceM2: number | null;
  frequency: NeedFrequency | "";
  serviceLevel: ServiceLevel | "";
};

type OfferSourceQuote = {
  id: string;
  company: string;
  title: string;
  status: QuoteStatus;
  opportunityId: string;
  prospectId: string;
  visitId: string;
  totalHT: number;
  surfaceM2: number;
  frequency: NeedFrequency | "";
  serviceLevel: ServiceLevel | "";
  lineCount: number;
};

type Draft = {
  title: string;
  company: string;
  site: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  opportunityId: string;
  quoteId: string;
  visitId: string;
  premisesKind: PrestationKind | "";
  surfaceM2: string;
  frequency: NeedFrequency | "";
  serviceLevel: ServiceLevel | "";
  validityDays: string;
  offerDate: string;
  startDate: string;
  needSummary: string;
  zones: string;
  constraints: string;
  prestationsSummary: string;
  methodology: string;
  means: string;
  arguments: string;
  teamDetail: string;
  supervision: string;
  digitalPilotage: string;
  indicativePlanning: string;
  conditions: string;
  confidentiality: CommercialOffer["confidentiality"];
  lines: CommercialOfferLine[];
  note: string;
};

const EMPTY_DRAFT: Draft = {
  title: DEFAULT_OFFER_TITLE,
  company: "",
  site: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  opportunityId: "",
  quoteId: "",
  visitId: "",
  premisesKind: "bureaux",
  surfaceM2: "",
  frequency: "5j_semaine",
  serviceLevel: "standard",
  validityDays: "30",
  offerDate: new Date().toISOString().slice(0, 10),
  startDate: "",
  needSummary:
    "Locaux tertiaires à fréquentation élevée ; entretien quotidien fiable et reporting qualité.",
  zones: "Bureaux, circulations, sanitaires, salles de réunion, accueil.",
  constraints: "",
  prestationsSummary: "",
  methodology: DEFAULT_OFFER_METHODOLOGY,
  means: DEFAULT_OFFER_MEANS,
  arguments: DEFAULT_OFFER_ARGUMENTS,
  teamDetail: DEFAULT_OFFER_TEAM,
  supervision: DEFAULT_OFFER_SUPERVISION,
  digitalPilotage: DEFAULT_OFFER_DIGITAL,
  indicativePlanning: DEFAULT_OFFER_PLANNING,
  conditions: DEFAULT_OFFER_CONDITIONS,
  confidentiality: "confidentiel",
  lines: [
    makeOfferLine({
      label: "Entretien quotidien bureaux & circulations",
      frequency: "5 j / sem",
      staffCount: 3,
      amountMonthlyHT: 550_000,
    }),
  ],
  note: "",
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function CommercialOffersWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const searchParams = useSearchParams();
  const visitFromUrl = searchParams.get("visitId") || "";
  const [items, setItems] = useState<CommercialOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<
    "client" | "perimetre" | "chiffre" | "revue"
  >("client");
  const [composerShake, setComposerShake] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [sourceOpps, setSourceOpps] = useState<OfferSourceOpp[]>([]);
  const [sourceQuotes, setSourceQuotes] = useState<OfferSourceQuote[]>([]);
  const [genOpportunityId, setGenOpportunityId] = useState("");
  const [genQuoteId, setGenQuoteId] = useState("");
  const [sourcesLoading, setSourcesLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/commercial-offers", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: CommercialOffer[];
        canEdit?: boolean;
        canReview?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items ?? []);
      setCanEdit(Boolean(data.canEdit));
      setCanReview(Boolean(data.canReview));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visitBootstrapped = useRef(false);
  useEffect(() => {
    if (visitBootstrapped.current || !visitFromUrl || !canEdit) return;
    visitBootstrapped.current = true;
    setDraft({
      ...EMPTY_DRAFT,
      visitId: visitFromUrl,
      offerDate: new Date().toISOString().slice(0, 10),
      lines: [
        makeOfferLine({
          label: "Entretien quotidien bureaux & circulations",
          frequency: "5 j / sem",
          staffCount: 3,
          amountMonthlyHT: 550_000,
        }),
      ],
    });
    setComposerStep("client");
    setComposerOpen(true);
  }, [visitFromUrl, canEdit]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const counts = useMemo(() => {
    const base: Record<string, number> = {
      all: items.length,
      a_traiter: 0,
    };
    for (const item of items) {
      base[item.status] = (base[item.status] ?? 0) + 1;
      if (
        item.status === "brouillon" ||
        item.status === "en_revue" ||
        item.status === "negociation"
      ) {
        base.a_traiter += 1;
      }
    }
    return base;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "a_traiter") {
        if (
          item.status !== "brouillon" &&
          item.status !== "en_revue" &&
          item.status !== "negociation"
        ) {
          return false;
        }
      } else if (filter !== "all" && item.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        item.company.toLowerCase().includes(q) ||
        item.site.toLowerCase().includes(q) ||
        item.ref.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  const pipelineHt = useMemo(
    () =>
      items
        .filter((i) => i.status !== "refusee" && i.status !== "expiree")
        .reduce((s, i) => s + i.totalMonthlyHT, 0),
    [items],
  );

  async function patch(
    body: Record<string, unknown>,
    okMsg?: string,
  ): Promise<CommercialOffer | null> {
    if (busyLock.current) return null;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/commercial-offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        item?: CommercialOffer;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action impossible");
      if (data.item) {
        setItems((prev) =>
          prev.map((p) => (p.id === data.item!.id ? data.item! : p)),
        );
        setSelectedId(data.item.id);
      }
      if (okMsg) toast.success(okMsg);
      return data.item ?? null;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  function openComposer() {
    setDraft({
      ...EMPTY_DRAFT,
      offerDate: new Date().toISOString().slice(0, 10),
      lines: [
        makeOfferLine({
          label: "Entretien quotidien bureaux & circulations",
          frequency: "5 j / sem",
          staffCount: 3,
          amountMonthlyHT: 550_000,
        }),
      ],
    });
    setComposerStep("client");
    setComposerOpen(true);
  }

  async function openGenerate() {
    setGenerateOpen(true);
    setGenOpportunityId("");
    setGenQuoteId("");
    setSourcesLoading(true);
    try {
      const res = await fetch("/api/commercial-offers?sources=1", {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        opportunities?: OfferSourceOpp[];
        quotes?: OfferSourceQuote[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Sources indisponibles");
      setSourceOpps(data.opportunities ?? []);
      setSourceQuotes(data.quotes ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur chargement sources",
      );
    } finally {
      setSourcesLoading(false);
    }
  }

  async function generateFromSources() {
    if (!genOpportunityId && !genQuoteId) {
      toast.warning("Choisissez une opportunité et/ou un chiffrage");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/commercial-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          opportunityId: genOpportunityId,
          quoteId: genQuoteId,
        }),
      });
      const data = (await res.json()) as {
        item?: CommercialOffer;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Génération impossible");
      if (data.item) {
        setItems((prev) => [data.item!, ...prev]);
        setSelectedId(data.item.id);
      }
      setGenerateOpen(false);
      toast.success("Proposition générée depuis les sources");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function createOffer(e: FormEvent) {
    e.preventDefault();
    if (!draft.company.trim()) {
      setComposerShake(true);
      window.setTimeout(() => setComposerShake(false), 420);
      setComposerStep("client");
      toast.warning("Client / prospect requis");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/commercial-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          surfaceM2: Number(draft.surfaceM2) || 0,
          validityDays: Number(draft.validityDays) || 30,
        }),
      });
      const data = (await res.json()) as {
        item?: CommercialOffer;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      if (data.item) {
        setItems((prev) => [data.item!, ...prev]);
        setSelectedId(data.item.id);
      }
      setComposerOpen(false);
      toast.success("Offre créée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const draftTotal = useMemo(
    () => draft.lines.reduce((s, l) => s + l.amountMonthlyHT, 0),
    [draft.lines],
  );

  const recipe = selected ? offerReadyToSend(selected) : null;

  return (
    <div
      className={`leads-page offers-page${embedded ? " offers-page--embedded" : ""}`}
      data-testid="offers-workspace"
    >
      {embedded ? (
        <div className="fin-embedded-bar offers-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">CRM-03 · Offre</p>
            <h2>Proposition de services / offre commerciale</h2>
            <p>
              Production depuis chiffrage · prestations, coûts, effectifs,
              fréquences et tarifs
            </p>
          </div>
          <div className="leads-header-actions">
            <Link
              href="/admin/commercial?tab=chiffrage"
              className="btn-admin btn-admin--ghost"
            >
              Chiffrage
            </Link>
            <Link
              href="/admin/pipeline"
              className="btn-admin btn-admin--ghost"
            >
              Pipeline
            </Link>
            <button
              type="button"
              className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
              onClick={() => void refresh()}
              disabled={loading}
            >
              {loading ? "Actualisation…" : "Actualiser"}
            </button>
            {canEdit ? (
              <>
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={() => void openGenerate()}
                >
                  Générer depuis sources
                </button>
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  onClick={openComposer}
                >
                  Saisie manuelle
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <ModuleHeader
          tone="#0a3a72"
          badge="Offre"
          icon={<IconOffer size={20} />}
          title="Proposition de services / offre commerciale"
          meta={
            <>
              <span>
                <strong>{counts.all ?? 0}</strong> offres
              </span>
              <span>
                Génération depuis <strong>opportunité</strong> &{" "}
                <strong>chiffrage</strong>
              </span>
              <span>
                Pipeline <strong>{formatOfferFcfa(pipelineHt)}</strong> / mois
              </span>
            </>
          }
          actions={
            <div className="leads-header-actions">
              <Link
                href="/admin/commercial?tab=chiffrage"
                className="btn-admin btn-admin--ghost"
              >
                Chiffrage
              </Link>
              <Link
                href="/admin/pipeline"
                className="btn-admin btn-admin--ghost"
              >
                Pipeline
              </Link>
              <button
                type="button"
                className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
                onClick={() => void refresh()}
                disabled={loading}
              >
                {loading ? "Actualisation…" : "Actualiser"}
              </button>
              {canEdit ? (
                <>
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    onClick={() => void openGenerate()}
                  >
                    Générer depuis sources
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={openComposer}
                  >
                    Saisie manuelle
                  </button>
                </>
              ) : null}
            </div>
          }
        />
      )}

      <section className="leads-kpis" aria-label="Indicateurs offres">
        <article className="leads-kpi leads-kpi--accent">
          <p>À traiter</p>
          <strong>{counts.a_traiter ?? 0}</strong>
          <span>brouillon · revue · négo</span>
        </article>
        <article className="leads-kpi">
          <p>Envoyées</p>
          <strong>{counts.envoyee ?? 0}</strong>
          <span>chez le client</span>
        </article>
        <article className="leads-kpi">
          <p>Acceptées</p>
          <strong>{counts.acceptee ?? 0}</strong>
          <span>→ devis / BC</span>
        </article>
        <article className="leads-kpi offers-kpi--value">
          <p>Pipeline HT / mois</p>
          <strong>{formatOfferFcfa(pipelineHt)}</strong>
          <span>{items.length} offres</span>
        </article>
      </section>

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Client, site, réf…"
            aria-label="Rechercher une offre"
          />
        </label>
        <div className="leads-filters" role="tablist" aria-label="Filtres offres">
          {(
            [
              ["all", "Tous"],
              ["a_traiter", "À traiter"],
              ["brouillon", "Brouillons"],
              ["en_revue", "En revue"],
              ["envoyee", "Envoyées"],
              ["negociation", "Négociation"],
              ["acceptee", "Acceptées"],
              ["refusee", "Refusées"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={`leads-chip${filter === id ? " is-active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
              <em>{counts[id] ?? 0}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="leads-layout">
        <div className="leads-list" aria-label="Liste des offres">
          {loading && items.length === 0 ? (
            <div className="leads-empty">
              <span className="leads-empty__orb" aria-hidden />
              <p className="leads-empty__eyebrow">Offres</p>
              <h2>Chargement…</h2>
            </div>
          ) : filtered.length === 0 ? (
            <div className="leads-empty">
              <span className="leads-empty__orb" aria-hidden />
              <p className="leads-empty__eyebrow">Proposition</p>
              <h2>Aucune offre sur ce filtre</h2>
              <p>
                Générez une proposition depuis une opportunité et un chiffrage,
                ou saisissez-la manuellement (prestations, méthodo, moyens,
                équipe, planning, conditions).
              </p>
              {canEdit ? (
                <div className="leads-header-actions">
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    onClick={() => void openGenerate()}
                  >
                    Générer depuis sources
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={openComposer}
                  >
                    Saisie manuelle
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`leads-card offers-card${
                  selectedId === item.id ? " is-active" : ""
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="leads-card__avatar" aria-hidden>
                  {initials(item.company)}
                </span>
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{item.company}</strong>
                    <time>{formatOfferFcfa(item.totalMonthlyHT)}</time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-pill">{item.ref}</span>
                    <span
                      className={`offers-status offers-status--${item.status}`}
                    >
                      {COMMERCIAL_OFFER_STATUS_LABELS[item.status]}
                    </span>
                  </span>
                  <span className="leads-card__preview">
                    {item.site || "Site à définir"} ·{" "}
                    {item.serviceLevel
                      ? SERVICE_LEVEL_LABELS[item.serviceLevel]
                      : "SLA —"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail offers-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <p className="leads-empty__eyebrow">Détail</p>
              <h2>Sélectionnez une offre</h2>
              <p>
                Prestations, méthodologie, moyens, équipe, planning indicatif,
                validité et conditions — générés depuis l’opportunité et le
                chiffrage.
              </p>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div className="leads-detail__identity">
                  <span className="leads-detail__avatar" aria-hidden>
                    {initials(selected.company)}
                  </span>
                  <div>
                    <p className="leads-detail__eyebrow">
                      <span
                        className={`offers-status offers-status--${selected.status}`}
                      >
                        {COMMERCIAL_OFFER_STATUS_LABELS[selected.status]}
                      </span>
                      <span>{selected.ref}</span>
                    </p>
                    <h2>{selected.title}</h2>
                    <p className="leads-detail__sub">
                      {selected.company} · {selected.site || "Site —"}
                    </p>
                  </div>
                </div>
                <div className="offers-detail__total">
                  <span>HT / mois</span>
                  <strong>{formatOfferFcfa(selected.totalMonthlyHT)}</strong>
                </div>
              </header>

              <div className="offers-flow" aria-label="Parcours offre">
                {(
                  [
                    "brouillon",
                    "en_revue",
                    "envoyee",
                    "negociation",
                    "acceptee",
                  ] as CommercialOfferStatus[]
                ).map((st) => {
                  const order = [
                    "brouillon",
                    "en_revue",
                    "envoyee",
                    "negociation",
                    "acceptee",
                  ];
                  const cur = order.indexOf(selected.status);
                  const idx = order.indexOf(st);
                  const isCurrent = selected.status === st;
                  const isDone =
                    cur > idx ||
                    (selected.status === "acceptee" && st === "acceptee");
                  return (
                    <span
                      key={st}
                      className={`offers-flow__step${isCurrent ? " is-current" : ""}${isDone && !isCurrent ? " is-done" : ""}`}
                    >
                      {COMMERCIAL_OFFER_STATUS_LABELS[st]}
                    </span>
                  );
                })}
              </div>

              {recipe && !recipe.ok ? (
                <div className="offers-recipe is-blocked">
                  <strong>Avant envoi</strong>
                  <ul>
                    {recipe.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : recipe?.ok ? (
                <div className="offers-recipe is-ok">
                  <strong>Prête à envoyer / accepter</strong>
                  <p>Périmètre et chiffrage mensuel cohérents.</p>
                </div>
              ) : null}

              <section className="offers-section">
                <h3>Sources</h3>
                <dl className="offers-dl">
                  <div>
                    <dt>Opportunité</dt>
                    <dd>
                      {selected.opportunityId ? (
                        <Link href="/admin/pipeline">
                          {selected.opportunityId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Chiffrage</dt>
                    <dd>
                      {selected.quoteId ? (
                        <Link href="/admin/commercial?tab=chiffrage">
                          {selected.quoteId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Visite technique</dt>
                    <dd>
                      {selected.visitId ? (
                        <Link href="/admin/commercial?tab=audit-visite">
                          {selected.visitId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Validité</dt>
                    <dd>
                      {selected.validityDays} j · expire{" "}
                      {selected.expiresAt || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Confidentialité</dt>
                    <dd>
                      {CONFIDENTIALITY_LABELS[selected.confidentiality]}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="offers-section">
                <h3>Périmètre</h3>
                <dl className="offers-dl">
                  <div>
                    <dt>Surface</dt>
                    <dd>{selected.surfaceM2 || "—"} m²</dd>
                  </div>
                  <div>
                    <dt>Locaux</dt>
                    <dd>
                      {selected.premisesKind
                        ? PRESTATION_LABELS[selected.premisesKind]
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Fréquence</dt>
                    <dd>
                      {selected.frequency
                        ? FREQUENCY_LABELS[selected.frequency]
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Niveau</dt>
                    <dd>
                      {selected.serviceLevel
                        ? SERVICE_LEVEL_LABELS[selected.serviceLevel]
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <p className="offers-block">
                  <strong>Besoin</strong>
                  {selected.needSummary || "—"}
                </p>
                {selected.prestationsSummary ? (
                  <p className="offers-block">
                    <strong>Prestations</strong>
                    {selected.prestationsSummary}
                  </p>
                ) : null}
                {selected.zones ? (
                  <p className="offers-block">
                    <strong>Zones</strong>
                    {selected.zones}
                  </p>
                ) : null}
                {selected.constraints ? (
                  <p className="offers-block">
                    <strong>Contraintes</strong>
                    {selected.constraints}
                  </p>
                ) : null}
              </section>

              <section className="offers-section">
                <h3>Méthodologie, moyens & équipe</h3>
                <p className="offers-block">
                  <strong>Méthodologie</strong>
                  {selected.methodology || "—"}
                </p>
                <p className="offers-block">
                  <strong>Moyens</strong>
                  {selected.means || "—"}
                </p>
                <p className="offers-block">
                  <strong>Équipe</strong>
                  {selected.teamDetail || "—"}
                </p>
                <p className="offers-block">
                  <strong>Arguments</strong>
                  {selected.arguments || "—"}
                </p>
                <p className="offers-meta">
                  Supervision : {selected.supervision || "—"} · Pilotage :{" "}
                  {selected.digitalPilotage || "—"}
                </p>
              </section>

              <section className="offers-section">
                <h3>Planning indicatif</h3>
                <p className="offers-block">
                  {selected.indicativePlanning || "—"}
                </p>
              </section>

              <section className="offers-section">
                <h3>Validité & conditions</h3>
                <p className="offers-block">
                  <strong>Validité</strong>
                  {selected.validityDays} jours · offre du{" "}
                  {selected.offerDate || "—"} · expire le{" "}
                  {selected.expiresAt || "—"}
                </p>
                <p className="offers-block">
                  <strong>Conditions</strong>
                  {selected.conditions || "—"}
                </p>
              </section>

              <section className="offers-section">
                <h3>Chiffrage mensuel (prestations)</h3>
                <div className="offers-table-wrap">
                  <table className="offers-table">
                    <thead>
                      <tr>
                        <th>Prestation</th>
                        <th>Fréquence</th>
                        <th>Effectif</th>
                        <th>HT / mois</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.lines.map((l) => (
                        <tr key={l.id}>
                          <td>{l.label}</td>
                          <td>{l.frequency || "—"}</td>
                          <td>{l.staffCount || "—"}</td>
                          <td>{formatOfferFcfa(l.amountMonthlyHT)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}>Total mensuel HT</td>
                        <td>{formatOfferFcfa(selected.totalMonthlyHT)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              <div className="offers-actions">
                {canEdit &&
                (selected.status === "brouillon" ||
                  selected.status === "refusee") ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                    onClick={() =>
                      void patch(
                        { id: selected.id, action: "submit_review" },
                        "Soumise en revue",
                      )
                    }
                  >
                    Soumettre en revue
                  </button>
                ) : null}
                {canEdit &&
                (selected.status === "en_revue" ||
                  selected.status === "brouillon" ||
                  selected.status === "negociation") ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                    onClick={() =>
                      void patch(
                        { id: selected.id, action: "send" },
                        "Offre envoyée",
                      )
                    }
                  >
                    Envoyer au client
                  </button>
                ) : null}
                {canEdit && selected.status === "envoyee" ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={busy}
                    onClick={() =>
                      void patch(
                        { id: selected.id, action: "negotiate" },
                        "Négociation ouverte",
                      )
                    }
                  >
                    Ouvrir négociation
                  </button>
                ) : null}
                {canReview &&
                (selected.status === "envoyee" ||
                  selected.status === "negociation") ? (
                  <>
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy}
                      onClick={() =>
                        void patch(
                          { id: selected.id, action: "accept" },
                          "Offre acceptée",
                        )
                      }
                    >
                      Marquer acceptée
                    </button>
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={busy}
                      onClick={() => {
                        setRejectReason("");
                        setRejectOpen(true);
                      }}
                    >
                      Refuser
                    </button>
                  </>
                ) : null}
                {selected.status === "acceptee" ? (
                  <>
                    <Link
                      href="/admin/commercial?tab=chiffrage"
                      className="btn-admin btn-admin--primary"
                    >
                      Créer le devis
                    </Link>
                    <Link
                      href="/admin/commercial?tab=bons-commande"
                      className="btn-admin btn-admin--ghost"
                    >
                      Créer un BC
                    </Link>
                  </>
                ) : null}
              </div>

              <section className="offers-history">
                <h3>Historique</h3>
                <ol>
                  {[...selected.history].reverse().map((h) => (
                    <li key={h.id}>
                      <div className="offers-history__top">
                        <strong>{h.detail}</strong>
                        <span>{formatWhen(h.at)}</span>
                      </div>
                      <p className="offers-history__meta">{h.byName}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </article>
      </div>

      {composerOpen ? (
        <AdminFormWizard
          open={composerOpen}
          portal
          onClose={() => setComposerOpen(false)}
          titleId="offer-composer-title"
          eyebrow="Offre"
          title="Nouvelle proposition de services"
          lead="Offre commerciale : génération opportunité/chiffrage, prestations, méthodologie, moyens, équipe, planning, validité & conditions."
          steps={[
            { id: "client", label: "Client", hint: "Identification" },
            { id: "perimetre", label: "Contenu", hint: "Méthodo & conditions" },
            { id: "chiffre", label: "Prestations", hint: "Lignes HT" },
            { id: "revue", label: "Revue", hint: "Contrôle" },
          ]}
          stepId={composerStep}
          onStepChange={(id) =>
            setComposerStep(
              id as "client" | "perimetre" | "chiffre" | "revue",
            )
          }
          canEnterStep={(id) => {
            if (id === "client") return true;
            return Boolean(draft.company.trim());
          }}
          onStepBlocked={() => {
            setComposerShake(true);
            window.setTimeout(() => setComposerShake(false), 420);
            toast.warning("Client / prospect requis");
          }}
          shake={composerShake}
          formId="necs-offer-create-form"
          onSubmit={createOffer}
          submitLabel="Créer l’offre"
          busy={busy}
          canSubmit={Boolean(draft.company.trim())}
        >
          {composerStep === "client" ? (
            <FwPanel aria-label="Client">
              <FwPanelHead
                title="Identification"
                description="Prospect, site et contacts."
              />
              <FwGrid>
                <FwField label="Client / prospect *" wide>
                  <input
                    value={draft.company}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, company: e.target.value }))
                    }
                    required
                  />
                </FwField>
                <FwField label="Site">
                  <input
                    value={draft.site}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, site: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Contact">
                  <input
                    value={draft.contactName}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        contactName: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Téléphone">
                  <input
                    value={draft.contactPhone}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        contactPhone: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="E-mail" wide>
                  <input
                    type="email"
                    value={draft.contactEmail}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        contactEmail: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Intitulé" wide>
                  <input
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, title: e.target.value }))
                    }
                  />
                </FwField>
              </FwGrid>
            </FwPanel>
          ) : null}

          {composerStep === "perimetre" ? (
            <FwPanel aria-label="Périmètre">
              <FwPanelHead
                title="Périmètre & contenu offre"
                description="Surface, SLA, méthodologie, moyens, équipe, planning et conditions."
              />
              <FwGrid>
                <FwField label="Type de locaux">
                  <select
                    value={draft.premisesKind}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        premisesKind: e.target.value as PrestationKind,
                      }))
                    }
                  >
                    {PRESTATION_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {PRESTATION_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </FwField>
                <FwField label="Surface (m²)">
                  <input
                    type="number"
                    min={0}
                    value={draft.surfaceM2}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        surfaceM2: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Fréquence">
                  <select
                    value={draft.frequency}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        frequency: e.target.value as NeedFrequency,
                      }))
                    }
                  >
                    {NEED_FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </FwField>
                <FwField label="Niveau de service">
                  <select
                    value={draft.serviceLevel}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        serviceLevel: e.target.value as ServiceLevel,
                      }))
                    }
                  >
                    {SERVICE_LEVELS.map((s) => (
                      <option key={s} value={s}>
                        {SERVICE_LEVEL_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </FwField>
                <FwField label="Date offre">
                  <input
                    type="date"
                    value={draft.offerDate}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        offerDate: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Validité (jours)">
                  <input
                    type="number"
                    min={1}
                    value={draft.validityDays}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        validityDays: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Réf. visite technique">
                  <input
                    value={draft.visitId}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, visitId: e.target.value }))
                    }
                    placeholder="VIS-… ou id visite"
                  />
                </FwField>
                <FwField label="Confidentialité">
                  <select
                    value={draft.confidentiality}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        confidentiality: e.target
                          .value as CommercialOffer["confidentiality"],
                      }))
                    }
                  >
                    {(
                      Object.keys(CONFIDENTIALITY_LABELS) as Array<
                        CommercialOffer["confidentiality"]
                      >
                    ).map((k) => (
                      <option key={k} value={k}>
                        {CONFIDENTIALITY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </FwField>
                <FwField label="Compréhension du besoin" wide>
                  <textarea
                    rows={3}
                    value={draft.needSummary}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        needSummary: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Zones" wide>
                  <textarea
                    rows={2}
                    value={draft.zones}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, zones: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Contraintes d’accès / horaires" wide>
                  <textarea
                    rows={2}
                    value={draft.constraints}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        constraints: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Prestations (synthèse)" wide>
                  <textarea
                    rows={2}
                    value={draft.prestationsSummary}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        prestationsSummary: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Méthodologie" wide>
                  <textarea
                    rows={3}
                    value={draft.methodology}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        methodology: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Moyens" wide>
                  <textarea
                    rows={2}
                    value={draft.means}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, means: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Pourquoi NECS (arguments)" wide>
                  <textarea
                    rows={2}
                    value={draft.arguments}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        arguments: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Équipe" wide>
                  <textarea
                    rows={2}
                    value={draft.teamDetail}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        teamDetail: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Supervision">
                  <input
                    value={draft.supervision}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        supervision: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Pilotage digital">
                  <input
                    value={draft.digitalPilotage}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        digitalPilotage: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Planning indicatif" wide>
                  <textarea
                    rows={2}
                    value={draft.indicativePlanning}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        indicativePlanning: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Conditions" wide>
                  <textarea
                    rows={3}
                    value={draft.conditions}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        conditions: e.target.value,
                      }))
                    }
                  />
                </FwField>
              </FwGrid>
            </FwPanel>
          ) : null}

          {composerStep === "chiffre" ? (
            <FwPanel aria-label="Chiffrage">
              <FwPanelHead
                title="Lignes de chiffrage"
                description="Prestations mensuelles HT."
              />
              <FwBlock>
                {draft.lines.map((line, idx) => (
                  <div key={line.id} className="offers-line-edit">
                    <input
                      aria-label="Prestation"
                      value={line.label}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          lines: d.lines.map((l, i) =>
                            i === idx ? { ...l, label: e.target.value } : l,
                          ),
                        }))
                      }
                    />
                    <input
                      aria-label="Fréquence"
                      placeholder="Fréquence"
                      value={line.frequency}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          lines: d.lines.map((l, i) =>
                            i === idx
                              ? { ...l, frequency: e.target.value }
                              : l,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      aria-label="Effectif"
                      placeholder="Eff."
                      value={line.staffCount || ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          lines: d.lines.map((l, i) =>
                            i === idx
                              ? {
                                  ...l,
                                  staffCount: Number(e.target.value) || 0,
                                }
                              : l,
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      aria-label="Montant HT"
                      placeholder="HT / mois"
                      value={line.amountMonthlyHT || ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          lines: d.lines.map((l, i) =>
                            i === idx
                              ? makeOfferLine({
                                  ...l,
                                  amountMonthlyHT:
                                    Number(e.target.value) || 0,
                                })
                              : l,
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      lines: [
                        ...d.lines,
                        makeOfferLine({
                          label: "Nouvelle prestation",
                          frequency: "",
                          staffCount: 0,
                          amountMonthlyHT: 0,
                        }),
                      ],
                    }))
                  }
                >
                  + Ligne
                </button>
                <p className="offers-draft-total">
                  Total mensuel HT :{" "}
                  <strong>{formatOfferFcfa(draftTotal)}</strong>
                </p>
              </FwBlock>
            </FwPanel>
          ) : null}

          {composerStep === "revue" ? (
            <FwPanel aria-label="Revue">
              <FwPanelHead
                title="Revue"
                description="Vérifiez avant création — l’offre sera en brouillon."
              />
              <FwReview>
                <FwReviewCard
                  title="Client"
                  rows={[
                    { label: "Société", value: draft.company || "—" },
                    { label: "Site", value: draft.site || "—" },
                  ]}
                />
                <FwReviewCard
                  title="Périmètre"
                  rows={[
                    {
                      label: "Surface",
                      value: `${draft.surfaceM2 || "—"} m²`,
                    },
                    {
                      label: "Fréquence",
                      value: draft.frequency
                        ? FREQUENCY_LABELS[draft.frequency]
                        : "—",
                    },
                    {
                      label: "Niveau",
                      value: draft.serviceLevel
                        ? SERVICE_LEVEL_LABELS[draft.serviceLevel]
                        : "—",
                    },
                  ]}
                />
                <FwReviewCard
                  title="Chiffrage"
                  rows={[
                    {
                      label: "Lignes",
                      value: String(draft.lines.length),
                    },
                    {
                      label: "Total HT / mois",
                      value: formatOfferFcfa(draftTotal),
                    },
                  ]}
                />
              </FwReview>
              {draft.company.trim() ? (
                <FwOk>Prêt à créer la proposition.</FwOk>
              ) : (
                <FwWarn>Client manquant.</FwWarn>
              )}
            </FwPanel>
          ) : null}
        </AdminFormWizard>
      ) : null}

      {generateOpen ? (
        <AdminOverlayPortal>
          <div
            className="doc-overlay-backdrop"
            role="presentation"
            onClick={() => setGenerateOpen(false)}
          >
            <div
              className="doc-overlay-dialog offers-generate-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="offer-generate-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="doc-overlay-header">
                <div className="doc-overlay-header__left">
                  <p className="doc-overlay-header__tag">Offre</p>
                  <h2 id="offer-generate-title">
                    Générer la proposition de services
                  </h2>
                  <p className="doc-overlay-header__sub">
                    Sélectionnez une opportunité et/ou un chiffrage. Prestations,
                    méthodologie, moyens, équipe, planning et conditions seront
                    préremplis.
                  </p>
                </div>
                <div className="doc-overlay-header__right">
                  <button
                    type="button"
                    className="doc-overlay-close-btn"
                    aria-label="Fermer"
                    onClick={() => setGenerateOpen(false)}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="doc-overlay-body offers-generate-body">
                {sourcesLoading ? (
                  <p className="offers-generate-loading">
                    Chargement des sources…
                  </p>
                ) : sourceOpps.length === 0 && sourceQuotes.length === 0 ? (
                  <div className="offers-generate-empty">
                    <strong>Aucune source disponible</strong>
                    <p>
                      Créez d’abord une opportunité dans le pipeline ou un
                      chiffrage, puis revenez générer l’offre.
                    </p>
                    <div className="leads-header-actions">
                      <Link
                        href="/admin/pipeline"
                        className="btn-admin btn-admin--ghost"
                      >
                        Ouvrir le pipeline
                      </Link>
                      <Link
                        href="/admin/commercial?tab=chiffrage"
                        className="btn-admin btn-admin--ghost"
                      >
                        Ouvrir le chiffrage
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <fieldset className="offers-generate-section">
                      <legend>1 · Sources</legend>
                      <div className="offers-generate-grid">
                        <label>
                          <span>Opportunité pipeline</span>
                          <select
                            value={genOpportunityId}
                            onChange={(e) => {
                              const id = e.target.value;
                              setGenOpportunityId(id);
                              const linked = sourceQuotes.find(
                                (q) => q.opportunityId === id,
                              );
                              if (linked) setGenQuoteId(linked.id);
                            }}
                          >
                            <option value="">— Choisir une opportunité —</option>
                            {sourceOpps.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.company} · {o.title} ·{" "}
                                {OPPORTUNITY_STAGE_LABELS[o.stage]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Chiffrage / devis</span>
                          <select
                            value={genQuoteId}
                            onChange={(e) => {
                              const id = e.target.value;
                              setGenQuoteId(id);
                              const q = sourceQuotes.find((x) => x.id === id);
                              if (q?.opportunityId) {
                                setGenOpportunityId(q.opportunityId);
                              }
                            }}
                          >
                            <option value="">— Choisir un chiffrage —</option>
                            {(genOpportunityId
                              ? sourceQuotes.filter(
                                  (q) =>
                                    !q.opportunityId ||
                                    q.opportunityId === genOpportunityId,
                                )
                              : sourceQuotes
                            ).map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.company} · {q.title} ·{" "}
                                {QUOTE_STATUS_LABELS[q.status]} ·{" "}
                                {formatOfferFcfa(q.totalHT)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <p className="offers-generate-hint">
                        Au moins une source est requise. Le chiffrage alimente
                        les lignes de prestations ; l’opportunité complète le
                        périmètre.
                      </p>
                    </fieldset>

                    {(genOpportunityId || genQuoteId) && (
                      <fieldset className="offers-generate-section">
                        <legend>2 · Aperçu sélection</legend>
                        <div className="offers-generate-preview">
                          {(() => {
                            const opp = sourceOpps.find(
                              (o) => o.id === genOpportunityId,
                            );
                            const quote = sourceQuotes.find(
                              (q) => q.id === genQuoteId,
                            );
                            return (
                              <>
                                {opp ? (
                                  <article>
                                    <em>Opportunité</em>
                                    <strong>{opp.company}</strong>
                                    <p>{opp.title}</p>
                                    <span>
                                      {OPPORTUNITY_STAGE_LABELS[opp.stage]}
                                      {opp.surfaceM2
                                        ? ` · ${opp.surfaceM2} m²`
                                        : ""}
                                      {opp.valueEstimate
                                        ? ` · ${formatOfferFcfa(opp.valueEstimate)}`
                                        : ""}
                                    </span>
                                  </article>
                                ) : null}
                                {quote ? (
                                  <article>
                                    <em>Chiffrage</em>
                                    <strong>{quote.company}</strong>
                                    <p>{quote.title}</p>
                                    <span>
                                      {QUOTE_STATUS_LABELS[quote.status]} ·{" "}
                                      {quote.lineCount} ligne
                                      {quote.lineCount > 1 ? "s" : ""} ·{" "}
                                      {formatOfferFcfa(quote.totalHT)}
                                    </span>
                                  </article>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      </fieldset>
                    )}

                    <fieldset className="offers-generate-section">
                      <legend>3 · Contenu prérempli</legend>
                      <ul className="offers-generate-checklist">
                        <li>Prestations (lignes du chiffrage)</li>
                        <li>Méthodologie d’intervention</li>
                        <li>Moyens matériels & équipements</li>
                        <li>Équipe & supervision</li>
                        <li>Planning indicatif</li>
                        <li>Validité (30 j) & conditions commerciales</li>
                      </ul>
                    </fieldset>
                  </>
                )}
              </div>

              <footer className="doc-overlay-footer">
                <p className="doc-overlay-footer__hint">
                  L’offre sera créée en brouillon, modifiable avant envoi.
                </p>
                <div className="doc-overlay-footer__actions">
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() => setGenerateOpen(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={
                      busy ||
                      sourcesLoading ||
                      (!genOpportunityId && !genQuoteId)
                    }
                    onClick={() => void generateFromSources()}
                  >
                    {busy ? "Génération…" : "Générer l’offre"}
                  </button>
                </div>
              </footer>
            </div>
          </div>
        </AdminOverlayPortal>
      ) : null}

      {rejectOpen && selected ? (
        <AdminOverlayPortal>
          <div className="doc-overlay-backdrop" role="presentation">
            <div
              className="doc-overlay-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="offer-reject-title"
            >
              <header className="doc-overlay-header">
                <h2 id="offer-reject-title">Refuser l’offre</h2>
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  onClick={() => setRejectOpen(false)}
                >
                  Fermer
                </button>
              </header>
              <div className="doc-overlay-body">
                <label className="fw-field">
                  <span>Motif</span>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </label>
              </div>
              <footer className="doc-overlay-footer">
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  disabled={busy}
                  onClick={() => {
                    void patch(
                      {
                        id: selected.id,
                        action: "reject",
                        reason: rejectReason,
                      },
                      "Offre refusée",
                    ).then(() => setRejectOpen(false));
                  }}
                >
                  Confirmer le refus
                </button>
              </footer>
            </div>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </div>
  );
}
