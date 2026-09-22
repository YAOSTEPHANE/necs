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
  FwWarn,
  FwOk,
} from "@/components/admin/form-wizard";
import { IconPackage, IconSearch } from "@/components/admin/Icons";
import { toast } from "@/lib/toast";
import {
  CENTRAL_WAREHOUSE_ID,
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_MOVEMENT_LABELS,
  isBelowThreshold,
  type InventoryArticle,
  type InventoryBalance,
  type InventoryCategory,
  type InventoryMovement,
  type InventoryMovementKind,
} from "@/lib/inventory-shared";

type SiteOpt = { id: string; name: string };
type TabId = "stocks" | "mouvements" | "articles";

const QUICK_KINDS: Array<{ kind: InventoryMovementKind; hint: string }> = [
  { kind: "reappro", hint: "Entrée fournisseur sur le site / magasin" },
  { kind: "dotation", hint: "Magasin central → site (2 mouvements liés)" },
  { kind: "sortie", hint: "Consommation terrain" },
  { kind: "transfert", hint: "D’un site vers un autre" },
  { kind: "ajustement", hint: "Écart d’inventaire (+/−)" },
  { kind: "entree", hint: "Entrée libre" },
];

const CATEGORY_TONE: Record<InventoryCategory, string> = {
  materiel: "#0ea5e9",
  consommable: "#b45309",
  epi: "#7c3aed",
};

function stockRatio(b: InventoryBalance): number {
  if (b.minQty <= 0) return b.quantity > 0 ? 1 : 0;
  return Math.min(1.5, b.quantity / Math.max(b.minQty, 1));
}

function initials(sku: string) {
  return sku.slice(0, 3).toUpperCase() || "ART";
}

export function InventoryWorkspace() {
  const [articles, setArticles] = useState<InventoryArticle[]>([]);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [sites, setSites] = useState<SiteOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [query, setQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [belowOnly, setBelowOnly] = useState(false);
  const [kindFilter, setKindFilter] = useState<InventoryMovementKind | "all">(
    "all",
  );
  const [selectedBalanceId, setSelectedBalanceId] = useState<string | null>(
    null,
  );
  const [tab, setTab] = useState<TabId>("stocks");
  const [composerOpen, setComposerOpen] = useState(false);
  const [articleComposerOpen, setArticleComposerOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [moveStep, setMoveStep] = useState<"type" | "details" | "revue">(
    "type",
  );
  const [composerShake, setComposerShake] = useState(false);
  const [articleStep, setArticleStep] = useState<"fiche" | "revue">("fiche");
  const [articleShake, setArticleShake] = useState(false);

  const [articleForm, setArticleForm] = useState({
    sku: "",
    label: "",
    unit: "u",
    category: "consommable" as InventoryCategory,
    defaultMinQty: "5",
  });

  const [moveForm, setMoveForm] = useState({
    kind: "reappro" as InventoryMovementKind,
    siteId: CENTRAL_WAREHOUSE_ID,
    toSiteId: "",
    articleId: "",
    quantity: "1",
    note: "",
    ref: "",
  });

  const [stats, setStats] = useState({
    balances: 0,
    below: 0,
    sites: 0,
    articles: 0,
    movements: 0,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (siteFilter) qs.set("siteId", siteFilter);
      if (belowOnly) qs.set("below", "1");
      const res = await fetch(`/api/inventory?${qs}`, { cache: "no-store" });
      const data = (await res.json()) as {
        articles?: InventoryArticle[];
        balances?: InventoryBalance[];
        movements?: InventoryMovement[];
        sites?: SiteOpt[];
        stats?: typeof stats;
        canEdit?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement");
      setArticles(data.articles ?? []);
      setBalances(data.balances ?? []);
      setMovements(data.movements ?? []);
      setSites(data.sites ?? []);
      setCanEdit(Boolean(data.canEdit));
      if (data.stats) setStats(data.stats);
      setMoveForm((f) => ({
        ...f,
        siteId: f.siteId || data.sites?.[0]?.id || CENTRAL_WAREHOUSE_ID,
        articleId: f.articleId || data.articles?.[0]?.id || "",
      }));
      setSelectedBalanceId((prev) => {
        if (prev && data.balances?.some((b) => b.id === prev)) return prev;
        return data.balances?.[0]?.id ?? null;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [siteFilter, belowOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const post = async (action: string, payload: Record<string, unknown>) => {
    if (busy) return null;
    if (busyLock.current) return null;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as {
        error?: string;
        movement?: InventoryMovement;
        linked?: InventoryMovement;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      if (data.movement?.id) {
        const linked = data.linked?.id ? ` + ${data.linked.id}` : "";
        toast.success(`Mouvement tracé · ${data.movement.id}${linked}`);
      } else {
        toast.success("Enregistré");
      }
      await refresh();
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  };

  const filteredBalances = useMemo(() => {
    const q = query.trim().toLowerCase();
    return balances.filter((b) => {
      if (!q) return true;
      return (
        b.articleLabel.toLowerCase().includes(q) ||
        b.articleSku.toLowerCase().includes(q) ||
        b.siteName.toLowerCase().includes(q)
      );
    });
  }, [balances, query]);

  const filteredMovements = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movements.filter((m) => {
      if (kindFilter !== "all" && m.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        m.id.toLowerCase().includes(q) ||
        m.articleSku.toLowerCase().includes(q) ||
        m.articleLabel.toLowerCase().includes(q) ||
        m.siteName.toLowerCase().includes(q) ||
        m.byName.toLowerCase().includes(q) ||
        m.note.toLowerCase().includes(q)
      );
    });
  }, [movements, kindFilter, query]);

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.sku.toLowerCase().includes(q) ||
        a.label.toLowerCase().includes(q) ||
        INVENTORY_CATEGORY_LABELS[a.category].toLowerCase().includes(q),
    );
  }, [articles, query]);

  const selected = useMemo(
    () => balances.find((b) => b.id === selectedBalanceId) ?? null,
    [balances, selectedBalanceId],
  );

  const relatedMoves = useMemo(() => {
    if (!selected) return [];
    return movements
      .filter(
        (m) =>
          m.articleId === selected.articleId &&
          (m.siteId === selected.siteId || m.toSiteId === selected.siteId),
      )
      .slice(0, 40);
  }, [movements, selected]);

  const openComposer = (opts?: {
    kind?: InventoryMovementKind;
    balance?: InventoryBalance;
  }) => {
    if (articles.filter((a) => a.active).length === 0) {
      toast.warning("Créez d’abord un article dans le catalogue.");
      setTab("articles");
      setEditingArticleId(null);
      setArticleForm({
        sku: "",
        label: "",
        unit: "u",
        category: "consommable",
        defaultMinQty: "5",
      });
      setArticleStep("fiche");
      setArticleComposerOpen(true);
      return;
    }
    const b = opts?.balance ?? selected;
    const kind = opts?.kind ?? "reappro";
    setMoveForm((f) => {
      let siteId = b?.siteId || f.siteId || CENTRAL_WAREHOUSE_ID;
      if (kind === "dotation") {
        if (!siteId || siteId === CENTRAL_WAREHOUSE_ID) {
          siteId =
            sites.find((s) => s.id !== CENTRAL_WAREHOUSE_ID)?.id || siteId;
        }
      }
      return {
        ...f,
        kind,
        siteId,
        toSiteId: "",
        articleId: b?.articleId || f.articleId || articles.find((a) => a.active)?.id || "",
        quantity: "1",
        note: "",
        ref: "",
      };
    });
    setMoveStep(opts?.kind || opts?.balance ? "details" : "type");
    setComposerOpen(true);
  };

  const previewBalance = useMemo(() => {
    if (!moveForm.articleId || !moveForm.siteId) return null;
    return (
      balances.find(
        (b) =>
          b.articleId === moveForm.articleId && b.siteId === moveForm.siteId,
      ) ?? null
    );
  }, [balances, moveForm.articleId, moveForm.siteId]);

  const previewCentral = useMemo(() => {
    if (!moveForm.articleId) return null;
    return (
      balances.find(
        (b) =>
          b.articleId === moveForm.articleId &&
          b.siteId === CENTRAL_WAREHOUSE_ID,
      ) ?? null
    );
  }, [balances, moveForm.articleId]);

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === moveForm.articleId) ?? null,
    [articles, moveForm.articleId],
  );

  const qtyNum = Number(moveForm.quantity);
  const qtyValid =
    Number.isFinite(qtyNum) &&
    (moveForm.kind === "ajustement" ? qtyNum !== 0 : qtyNum > 0);

  const stockSource =
    moveForm.kind === "dotation"
      ? previewCentral
      : moveForm.kind === "sortie" || moveForm.kind === "transfert"
        ? previewBalance
        : previewBalance;

  const stockOk =
    moveForm.kind === "reappro" ||
    moveForm.kind === "entree" ||
    moveForm.kind === "ajustement"
      ? true
      : (stockSource?.quantity ?? 0) >= Math.abs(qtyNum || 0);

  const canGoStep3 =
    Boolean(moveForm.articleId && moveForm.siteId) &&
    qtyValid &&
    (moveForm.kind !== "transfert" || Boolean(moveForm.toSiteId)) &&
    (moveForm.kind !== "dotation" ||
      moveForm.siteId !== CENTRAL_WAREHOUSE_ID);

  const onMovement = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canGoStep3) {
      toast.warning("Complétez le type, le site, l’article et la quantité.");
      return;
    }
    if (!stockOk && moveForm.kind !== "ajustement") {
      toast.error("Stock insuffisant pour ce mouvement.");
      return;
    }
    const ok = await post("movement", {
      kind: moveForm.kind,
      siteId: moveForm.siteId,
      toSiteId: moveForm.kind === "transfert" ? moveForm.toSiteId : undefined,
      articleId: moveForm.articleId,
      quantity: Number(moveForm.quantity),
      note: moveForm.note || undefined,
      ref: moveForm.ref || undefined,
    });
    if (!ok) return;
    setComposerOpen(false);
    setMoveStep("type");
    setTab("mouvements");
  };

  const pulseComposerError = () => {
    setComposerShake(true);
    window.setTimeout(() => setComposerShake(false), 420);
  };
  const pulseArticleError = () => {
    setArticleShake(true);
    window.setTimeout(() => setArticleShake(false), 420);
  };
  const canEnterMoveStep = (id: string) => {
    if (id === "type") return true;
    if (id === "details") return true;
    return canGoStep3;
  };

  const articleFicheReady =
    Boolean(articleForm.sku.trim()) && Boolean(articleForm.label.trim());

  const onSaveArticle = async (e: FormEvent) => {
    e.preventDefault();
    if (!articleFicheReady) {
      setArticleStep("fiche");
      pulseArticleError();
      toast.warning("SKU et libellé sont obligatoires.");
      return;
    }
    const ok = await post("upsert_article", {
      id: editingArticleId || undefined,
      sku: articleForm.sku,
      label: articleForm.label,
      unit: articleForm.unit,
      category: articleForm.category,
      defaultMinQty: Number(articleForm.defaultMinQty) || 0,
    });
    if (!ok) {
      pulseArticleError();
      return;
    }
    setEditingArticleId(null);
    setArticleComposerOpen(false);
    setArticleStep("fiche");
    setArticleForm({
      sku: "",
      label: "",
      unit: "u",
      category: "consommable",
      defaultMinQty: "5",
    });
  };

  const onEditArticle = (a: InventoryArticle) => {
    setEditingArticleId(a.id);
    setArticleForm({
      sku: a.sku,
      label: a.label,
      unit: a.unit,
      category: a.category,
      defaultMinQty: String(a.defaultMinQty),
    });
    setArticleStep("fiche");
    setArticleComposerOpen(true);
  };

  const setKpiFilter = (mode: "all" | "below" | "articles" | "mouvements") => {
    if (mode === "below") {
      setBelowOnly(true);
      setTab("stocks");
    } else if (mode === "articles") {
      setTab("articles");
    } else if (mode === "mouvements") {
      setTab("mouvements");
    } else {
      setBelowOnly(false);
      setTab("stocks");
    }
  };

  return (
    <div className="admin-page inv-page">
      <ModuleHeader
        tone="#b45309"
        badge="Magasin"
        icon={<IconPackage size={20} />}
        title="Matériel et consommables"
        meta={
          <>
            <span>Stocks par site · dotations · conso · réappro</span>
            <span>
              {stats.below > 0
                ? `${stats.below} alerte${stats.below > 1 ? "s" : ""} seuil`
                : "Seuils OK"}
            </span>
          </>
        }
        actions={
          canEdit ? (
            <>
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                disabled={busy}
                onClick={() => void post("seed", {})}
              >
                Articles démo
              </button>
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                disabled={busy}
                onClick={() => openComposer()}
              >
                Nouveau mouvement
              </button>
            </>
          ) : (
            <Link
              href="/admin/operations?tab=referentiel"
              className="btn-admin btn-admin--ghost"
            >
              Sites OPS
            </Link>
          )
        }
      />

      <div className="inv-kpis" role="group" aria-label="Indicateurs stock">
        <button
          type="button"
          className={`inv-kpi${!belowOnly && tab === "stocks" ? " is-active" : ""}`}
          onClick={() => setKpiFilter("all")}
        >
          <span>Lignes stock</span>
          <strong>{stats.balances}</strong>
        </button>
        <button
          type="button"
          className={`inv-kpi inv-kpi--warn${belowOnly ? " is-active" : ""}`}
          onClick={() => setKpiFilter("below")}
        >
          <span>Sous seuil</span>
          <strong>{stats.below}</strong>
        </button>
        <button
          type="button"
          className={`inv-kpi${tab === "articles" ? " is-active" : ""}`}
          onClick={() => setKpiFilter("articles")}
        >
          <span>Articles</span>
          <strong>{articles.length}</strong>
        </button>
        <button
          type="button"
          className={`inv-kpi${tab === "mouvements" ? " is-active" : ""}`}
          onClick={() => setKpiFilter("mouvements")}
        >
          <span>Mouvements</span>
          <strong>{stats.movements}</strong>
        </button>
      </div>

      <div className="inv-toolbar">
        <label className="inv-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "mouvements"
                ? "Rechercher un MVT, SKU, site…"
                : "Rechercher SKU, article, site…"
            }
          />
        </label>
        <select
          className="inv-select"
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          aria-label="Filtrer par site"
        >
          <option value="">Tous les sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="inv-tabs" role="tablist">
          {(
            [
              ["stocks", "Stocks", filteredBalances.length],
              ["mouvements", "Mouvements", filteredMovements.length],
              ["articles", "Articles", filteredArticles.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`inv-tab${tab === id ? " is-active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
              <em>{count}</em>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="inv-empty">Chargement du magasin…</p>
      ) : tab === "articles" ? (
        <div className="inv-articles">
          <div className="inv-articles__head">
            <div>
              <h3>Catalogue</h3>
              <p>Référentiel magasin — seuils par défaut à la première entrée.</p>
            </div>
            {canEdit ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => {
                  setEditingArticleId(null);
                  setArticleForm({
                    sku: "",
                    label: "",
                    unit: "u",
                    category: "consommable",
                    defaultMinQty: "5",
                  });
                  setArticleStep("fiche");
                  setArticleComposerOpen(true);
                }}
              >
                Nouvel article
              </button>
            ) : null}
          </div>
          {filteredArticles.length === 0 ? (
            <p className="inv-empty">
              Aucun article. Créez-en un ou chargez les articles démo.
            </p>
          ) : (
            <ul className="inv-article-grid">
              {filteredArticles.map((a) => (
                <li key={a.id} className="inv-article-card">
                  <span
                    className="inv-article-card__dot"
                    style={{ background: CATEGORY_TONE[a.category] }}
                    aria-hidden
                  />
                  <div className="inv-article-card__body">
                    <strong>
                      {a.sku}
                      <span>{INVENTORY_CATEGORY_LABELS[a.category]}</span>
                    </strong>
                    <p>{a.label}</p>
                    <small>
                      Unité {a.unit} · seuil défaut {a.defaultMinQty}
                      {!a.active ? " · inactif" : ""}
                    </small>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() => onEditArticle(a)}
                    >
                      Modifier
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : tab === "mouvements" ? (
        <section className="inv-timeline-panel">
          <header className="inv-timeline-panel__head">
            <div>
              <h3>Historique tracé</h3>
              <p>Chaque mouvement porte un id, un acteur et un solde après.</p>
            </div>
            <select
              className="inv-select"
              value={kindFilter}
              onChange={(e) =>
                setKindFilter(
                  e.target.value === "all"
                    ? "all"
                    : (e.target.value as InventoryMovementKind),
                )
              }
              aria-label="Type de mouvement"
            >
              <option value="all">Tous les types</option>
              {(
                Object.keys(INVENTORY_MOVEMENT_LABELS) as InventoryMovementKind[]
              ).map((k) => (
                <option key={k} value={k}>
                  {INVENTORY_MOVEMENT_LABELS[k]}
                </option>
              ))}
            </select>
          </header>
          {filteredMovements.length === 0 ? (
            <p className="inv-empty">Aucun mouvement pour ce filtre.</p>
          ) : (
            <ol className="inv-timeline">
              {filteredMovements.map((m) => (
                <li key={m.id} className={`inv-timeline__item is-${m.kind}`}>
                  <div className="inv-timeline__rail" aria-hidden />
                  <div className="inv-timeline__card">
                    <header>
                      <code>{m.id}</code>
                      <span className={`inv-chip inv-chip--${m.kind}`}>
                        {INVENTORY_MOVEMENT_LABELS[m.kind]}
                      </span>
                    </header>
                    <strong>
                      {m.articleSku} · {m.articleLabel}
                    </strong>
                    <p>
                      {m.quantity} {m.unit}
                      {m.kind === "ajustement" && m.quantity > 0 ? " (+)" : ""}
                      {" · solde "}
                      {m.balanceAfter}
                      {" · "}
                      {m.siteName}
                      {m.toSiteName ? ` → ${m.toSiteName}` : ""}
                    </p>
                    <footer>
                      <time dateTime={m.at}>
                        {new Date(m.at).toLocaleString("fr-FR")}
                      </time>
                      <span>{m.byName}</span>
                      {(m.note || m.ref) && (
                        <em>{m.note || m.ref}</em>
                      )}
                    </footer>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : (
        <div className="inv-shell">
          <aside className="inv-inbox" aria-label="Lignes de stock">
            {filteredBalances.length === 0 ? (
              <p className="inv-empty">
                Aucun stock. Lancez un réappro ou une dotation.
              </p>
            ) : (
              <ul>
                {filteredBalances.map((b, i) => {
                  const ratio = stockRatio(b);
                  const low = isBelowThreshold(b);
                  return (
                    <li key={b.id} style={{ ["--i" as string]: i }}>
                      <button
                        type="button"
                        className={`inv-card${b.id === selectedBalanceId ? " is-active" : ""}${low ? " is-low" : ""}`}
                        onClick={() => setSelectedBalanceId(b.id)}
                      >
                        <span
                          className="inv-card__avatar"
                          style={{
                            ["--av" as string]: CATEGORY_TONE[b.category],
                          }}
                        >
                          {initials(b.articleSku)}
                        </span>
                        <span className="inv-card__body">
                          <strong>
                            {b.articleLabel}
                            {low ? (
                              <em className="inv-card__alert">Seuil</em>
                            ) : null}
                          </strong>
                          <span>
                            {b.articleSku} · {b.siteName}
                          </span>
                          <span className="inv-meter" aria-hidden>
                            <i
                              style={{
                                width: `${Math.min(100, ratio * 66.6)}%`,
                              }}
                            />
                          </span>
                          <span className="inv-card__qty">
                            <b>
                              {b.quantity} {b.unit}
                            </b>
                            <small>min {b.minQty}</small>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <main className="inv-detail">
            {selected ? (
              <>
                <header className="inv-detail__head">
                  <div>
                    <p className="inv-detail__eyebrow">
                      {INVENTORY_CATEGORY_LABELS[selected.category]} ·{" "}
                      {selected.articleSku}
                    </p>
                    <h2>{selected.articleLabel}</h2>
                    <p>{selected.siteName}</p>
                  </div>
                  <div className="inv-detail__stock">
                    <strong>
                      {selected.quantity}
                      <small>{selected.unit}</small>
                    </strong>
                    <span
                      className={
                        isBelowThreshold(selected) ? "is-low" : undefined
                      }
                    >
                      Seuil {selected.minQty}
                    </span>
                  </div>
                </header>

                {canEdit ? (
                  <div className="inv-detail__actions">
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      onClick={() =>
                        openComposer({ kind: "sortie", balance: selected })
                      }
                    >
                      Consommer
                    </button>
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() =>
                        openComposer({ kind: "reappro", balance: selected })
                      }
                    >
                      Réappro
                    </button>
                    {selected.siteId !== CENTRAL_WAREHOUSE_ID ? (
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        onClick={() =>
                          openComposer({ kind: "dotation", balance: selected })
                        }
                      >
                        Dotation
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {canEdit ? (
                  <div className="inv-seuil">
                    <label>
                      Seuil mini sur ce site
                      <input
                        type="number"
                        min={0}
                        defaultValue={selected.minQty}
                        key={selected.id}
                        id={`min-${selected.id}`}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={busy}
                      onClick={() => {
                        const el = document.getElementById(
                          `min-${selected.id}`,
                        ) as HTMLInputElement | null;
                        void post("set_min", {
                          balanceId: selected.id,
                          minQty: Number(el?.value ?? selected.minQty),
                        });
                      }}
                    >
                      Enregistrer le seuil
                    </button>
                  </div>
                ) : null}

                <section className="inv-detail__history">
                  <h3>Mouvements de cette ligne</h3>
                  {relatedMoves.length === 0 ? (
                    <p className="inv-empty">Pas encore de mouvement.</p>
                  ) : (
                    <ol>
                      {relatedMoves.map((m) => (
                        <li key={m.id}>
                          <div>
                            <code>{m.id}</code>
                            <span className={`inv-chip inv-chip--${m.kind}`}>
                              {INVENTORY_MOVEMENT_LABELS[m.kind]}
                            </span>
                          </div>
                          <p>
                            {m.quantity} {m.unit} → solde {m.balanceAfter} ·{" "}
                            {m.byName}
                            {m.note ? ` — ${m.note}` : ""}
                          </p>
                          <time dateTime={m.at}>
                            {new Date(m.at).toLocaleString("fr-FR")}
                          </time>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </>
            ) : (
              <div className="inv-detail__empty">
                <IconPackage size={36} />
                <p>Sélectionnez une ligne de stock pour voir le détail.</p>
                {canEdit && articles.length > 0 ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    onClick={() => openComposer({ kind: "reappro" })}
                  >
                    Premier réappro
                  </button>
                ) : null}
              </div>
            )}
          </main>
        </div>
      )}

      <AdminFormWizard
        open={composerOpen && canEdit}
        portal
        onClose={() => {
          setComposerOpen(false);
          setMoveStep("type");
        }}
        titleId="inv-move-title"
        eyebrow="Stock"
        title="Nouveau mouvement"
        lead="Dotation, réappro, sortie, transfert ou ajustement — avec contrôle de stock."
        steps={[
          { id: "type", label: "Type", hint: "Opération" },
          { id: "details", label: "Détails", hint: "Article & quantité" },
          { id: "revue", label: "Revue", hint: "Confirmation" },
        ]}
        stepId={moveStep}
        onStepChange={(id) => {
          if (id === "revue" && !canGoStep3) {
            pulseComposerError();
            toast.warning("Complétez les champs requis.");
            return;
          }
          setMoveStep(id as "type" | "details" | "revue");
        }}
        canEnterStep={canEnterMoveStep}
        onStepBlocked={() => {
          pulseComposerError();
          toast.warning("Complétez les champs requis.");
        }}
        shake={composerShake}
        formId="necs-inv-move-form"
        onSubmit={(e) => void onMovement(e)}
        submitLabel="Confirmer le mouvement"
        busy={busy}
        canSubmit={canGoStep3 && stockOk}
      >
        {moveStep === "type" ? (
          <FwPanel aria-label="Type">
            <FwPanelHead
              title="Type d’opération"
              description="Choisissez le mouvement à enregistrer."
            />
            <FwChips>
              {QUICK_KINDS.map((q) => (
                <FwChip
                  key={q.kind}
                  selected={moveForm.kind === q.kind}
                  title={INVENTORY_MOVEMENT_LABELS[q.kind]}
                  hint={q.hint}
                  onClick={() => {
                    setMoveForm((f) => {
                      const nextSite =
                        q.kind === "dotation" &&
                        (f.siteId === CENTRAL_WAREHOUSE_ID || !f.siteId)
                          ? sites.find((s) => s.id !== CENTRAL_WAREHOUSE_ID)
                              ?.id || f.siteId
                          : f.siteId;
                      return { ...f, kind: q.kind, siteId: nextSite };
                    });
                    setMoveStep("details");
                  }}
                />
              ))}
            </FwChips>
          </FwPanel>
        ) : null}

        {moveStep === "details" ? (
          <FwPanel aria-label="Détails">
            <FwPanelHead
              title={INVENTORY_MOVEMENT_LABELS[moveForm.kind]}
              description={
                QUICK_KINDS.find((q) => q.kind === moveForm.kind)?.hint
              }
            />
            <FwGrid>
              <FwField
                label={`Site${moveForm.kind === "dotation" ? " bénéficiaire" : ""} *`}
              >
                <select
                  required
                  value={moveForm.siteId}
                  onChange={(e) =>
                    setMoveForm((f) => ({ ...f, siteId: e.target.value }))
                  }
                >
                  {sites
                    .filter((s) =>
                      moveForm.kind === "dotation"
                        ? s.id !== CENTRAL_WAREHOUSE_ID
                        : true,
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </FwField>
              {moveForm.kind === "transfert" ? (
                <FwField label="Destination *">
                  <select
                    required
                    value={moveForm.toSiteId}
                    onChange={(e) =>
                      setMoveForm((f) => ({
                        ...f,
                        toSiteId: e.target.value,
                      }))
                    }
                  >
                    <option value="">— Site —</option>
                    {sites
                      .filter((s) => s.id !== moveForm.siteId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </FwField>
              ) : null}
              <FwField label="Article *">
                <select
                  required
                  value={moveForm.articleId}
                  onChange={(e) =>
                    setMoveForm((f) => ({
                      ...f,
                      articleId: e.target.value,
                    }))
                  }
                >
                  <option value="">— Article —</option>
                  {articles
                    .filter((a) => a.active)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.sku} · {a.label}
                      </option>
                    ))}
                </select>
              </FwField>
              <FwField
                label={`Quantité${moveForm.kind === "ajustement" ? " (+/−)" : ""} *`}
              >
                <input
                  type="number"
                  required
                  step="any"
                  value={moveForm.quantity}
                  onChange={(e) =>
                    setMoveForm((f) => ({
                      ...f,
                      quantity: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Réf. (OT / BL…)">
                <input
                  value={moveForm.ref}
                  onChange={(e) =>
                    setMoveForm((f) => ({ ...f, ref: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Note" wide>
                <input
                  value={moveForm.note}
                  onChange={(e) =>
                    setMoveForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder="Contexte du mouvement"
                />
              </FwField>
            </FwGrid>
            <FwBlock>
              <FwPanelHead title="Aperçu stock" />
              <FwReview>
                <FwReviewCard
                  title="Solde"
                  rows={[
                    {
                      label: "Stock actuel",
                      value:
                        moveForm.kind === "dotation"
                          ? `${previewCentral?.quantity ?? 0} ${selectedArticle?.unit ?? "u"} (magasin)`
                          : `${previewBalance?.quantity ?? 0} ${selectedArticle?.unit ?? "u"}`,
                    },
                    {
                      label: "Après mouvement",
                      value: (() => {
                        const unit = selectedArticle?.unit ?? "u";
                        const cur =
                          moveForm.kind === "dotation"
                            ? (previewCentral?.quantity ?? 0)
                            : (previewBalance?.quantity ?? 0);
                        if (!qtyValid) return `— ${unit}`;
                        if (
                          moveForm.kind === "reappro" ||
                          moveForm.kind === "entree"
                        ) {
                          const siteCur = previewBalance?.quantity ?? 0;
                          return `${siteCur + Math.abs(qtyNum)} ${unit}`;
                        }
                        if (moveForm.kind === "dotation") {
                          return `${Math.max(0, cur - Math.abs(qtyNum))} ${unit} magasin`;
                        }
                        if (moveForm.kind === "ajustement") {
                          return `${cur + qtyNum} ${unit}`;
                        }
                        return `${Math.max(0, cur - Math.abs(qtyNum))} ${unit}`;
                      })(),
                    },
                  ]}
                />
              </FwReview>
              {!stockOk && qtyValid ? (
                <FwWarn>
                  Stock insuffisant — réduisez la quantité ou réapprovisionnez.
                </FwWarn>
              ) : (
                <FwOk>Stock compatible avec ce mouvement.</FwOk>
              )}
            </FwBlock>
          </FwPanel>
        ) : null}

        {moveStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Confirmation"
              description={
                moveForm.kind === "dotation"
                  ? "Un id MVT-… sera créé. Deux mouvements liés (magasin + site)."
                  : "Un id MVT-… sera créé et l’historique mis à jour."
              }
            />
            <FwReview>
              <FwReviewCard
                title="Mouvement"
                rows={[
                  {
                    label: "Type",
                    value: INVENTORY_MOVEMENT_LABELS[moveForm.kind],
                  },
                  {
                    label: "Article",
                    value: selectedArticle
                      ? `${selectedArticle.sku} · ${selectedArticle.label}`
                      : "—",
                  },
                  {
                    label: "Site",
                    value: (() => {
                      const from =
                        sites.find((s) => s.id === moveForm.siteId)?.name ||
                        "—";
                      if (moveForm.kind === "transfert" && moveForm.toSiteId) {
                        const to =
                          sites.find((s) => s.id === moveForm.toSiteId)
                            ?.name || "";
                        return `${from} → ${to}`;
                      }
                      return from;
                    })(),
                  },
                  {
                    label: "Quantité",
                    value: `${moveForm.quantity} ${selectedArticle?.unit ?? "u"}`,
                  },
                  { label: "Réf.", value: moveForm.ref || "—" },
                  { label: "Note", value: moveForm.note || "—" },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>

      <AdminFormWizard
        open={articleComposerOpen && canEdit}
        onClose={() => {
          setArticleComposerOpen(false);
          setArticleStep("fiche");
        }}
        titleId="inv-art-title"
        eyebrow="Catalogue"
        title={editingArticleId ? "Modifier l’article" : "Nouvel article"}
        lead="Référentiel magasin — seuils par défaut à la première entrée."
        avatar={(articleForm.sku || "A").slice(0, 2).toUpperCase()}
        steps={[
          { id: "fiche", label: "Fiche", hint: "SKU & catégorie" },
          { id: "revue", label: "Revue", hint: "Contrôle avant enregistrement" },
        ]}
        stepId={articleStep}
        onStepChange={(id) => setArticleStep(id as "fiche" | "revue")}
        canEnterStep={(id) => id === "fiche" || articleFicheReady}
        onStepBlocked={pulseArticleError}
        shake={articleShake}
        formId="necs-inv-article-form"
        onSubmit={(e) => void onSaveArticle(e)}
        submitLabel={editingArticleId ? "Enregistrer" : "Créer"}
        busy={busy}
        canSubmit={articleFicheReady}
        narrow
      >
        {articleStep === "fiche" ? (
          <FwPanel aria-label="Fiche">
            <FwPanelHead
              title="Fiche article"
              description="SKU unique dans le catalogue."
            />
            <FwGrid>
              <FwField label="SKU *">
                <input
                  required
                  autoFocus
                  value={articleForm.sku}
                  onChange={(e) =>
                    setArticleForm((f) => ({ ...f, sku: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Unité">
                <input
                  value={articleForm.unit}
                  onChange={(e) =>
                    setArticleForm((f) => ({ ...f, unit: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Libellé *" wide>
                <input
                  required
                  value={articleForm.label}
                  onChange={(e) =>
                    setArticleForm((f) => ({ ...f, label: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Seuil défaut">
                <input
                  type="number"
                  min={0}
                  value={articleForm.defaultMinQty}
                  onChange={(e) =>
                    setArticleForm((f) => ({
                      ...f,
                      defaultMinQty: e.target.value,
                    }))
                  }
                />
              </FwField>
            </FwGrid>
            <FwBlock>
              <FwPanelHead
                title="Catégorie"
                description="Oriente les filtres magasin."
              />
              <FwChips>
                {(
                  Object.keys(
                    INVENTORY_CATEGORY_LABELS,
                  ) as InventoryCategory[]
                ).map((c) => (
                  <FwChip
                    key={c}
                    selected={articleForm.category === c}
                    title={INVENTORY_CATEGORY_LABELS[c]}
                    onClick={() =>
                      setArticleForm((f) => ({ ...f, category: c }))
                    }
                  />
                ))}
              </FwChips>
            </FwBlock>
          </FwPanel>
        ) : null}
        {articleStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue"
              description="Contrôle avant enregistrement au catalogue."
            />
            <FwReview>
              <FwReviewCard
                title="Article"
                rows={[
                  { label: "SKU", value: articleForm.sku || "—" },
                  { label: "Libellé", value: articleForm.label || "—" },
                  { label: "Unité", value: articleForm.unit || "—" },
                  {
                    label: "Catégorie",
                    value: INVENTORY_CATEGORY_LABELS[articleForm.category],
                  },
                  {
                    label: "Seuil défaut",
                    value: articleForm.defaultMinQty || "0",
                  },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>
    </div>
  );
}
