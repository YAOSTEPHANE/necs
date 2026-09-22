"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { IconInvoice, IconSearch } from "@/components/admin/Icons";
import {
  DEFAULT_TAX_RATE,
  formatFinanceFcfa,
  makePrefactureLine,
  PREFACTURE_STATUS_LABELS,
  prefactureReady,
  type FinancePrefacture,
  type PrefactureLine,
  type PrefactureStatus,
} from "@/lib/finance-shared";
import { toast } from "@/lib/toast";

type Filter = "all" | "action" | PrefactureStatus;

type DraftLine = {
  id: string;
  label: string;
  qtyPlanned: string;
  qtyDone: string;
  adjustment: string;
  unit: string;
  unitPrice: string;
};

function emptyLine(): DraftLine {
  return {
    id: makePrefactureLine({ label: "x" }).id,
    label: "",
    qtyPlanned: "0",
    qtyDone: "0",
    adjustment: "0",
    unit: "u",
    unitPrice: "",
  };
}

function linesFromDraft(rows: DraftLine[]): PrefactureLine[] {
  return rows
    .filter((r) => r.label.trim())
    .map((r) =>
      makePrefactureLine({
        id: r.id,
        label: r.label,
        qtyPlanned: Number(r.qtyPlanned) || 0,
        qtyDone: Number(r.qtyDone) || 0,
        adjustment: Number(r.adjustment) || 0,
        unit: r.unit || "u",
        unitPrice: Number(r.unitPrice) || 0,
      }),
    );
}

function formatWhen(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts.length <= 10 ? `${ts}T12:00:00` : ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

function formatVariance(n: number) {
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : String(n);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function FinancePrefactureWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const bounds = monthBounds();
  const [items, setItems] = useState<FinancePrefacture[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const [clientName, setClientName] = useState("");
  const [contractRef, setContractRef] = useState("");
  const [site, setSite] = useState("");
  const [periodStart, setPeriodStart] = useState(bounds.start);
  const [periodEnd, setPeriodEnd] = useState(bounds.end);
  const [note, setNote] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([emptyLine()]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance?resource=prefactures", {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        items?: FinancePrefacture[];
        canEdit?: boolean;
        canValidate?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items || []);
      setCanEdit(Boolean(data.canEdit));
      setCanValidate(Boolean(data.canValidate));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const base: Record<string, number> = {
      all: items.length,
      action: 0,
      brouillon: 0,
      en_controle: 0,
      validee: 0,
      facturee: 0,
    };
    for (const i of items) {
      base[i.status] = (base[i.status] ?? 0) + 1;
      if (i.status === "brouillon" || i.status === "en_controle") {
        base.action += 1;
      }
    }
    return base;
  }, [items]);

  const pipelineTtc = useMemo(
    () =>
      items
        .filter(
          (i) => i.status === "validee" || i.status === "en_controle",
        )
        .reduce((s, i) => s + i.totalTTC, 0),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === "action") {
        if (i.status !== "brouillon" && i.status !== "en_controle") {
          return false;
        }
      } else if (filter !== "all" && i.status !== filter) {
        return false;
      }
      if (!q) return true;
      return [i.number, i.clientName, i.contractRef, i.site]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, query, filter]);

  useEffect(() => {
    if (!filtered.length) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((i) => i.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId],
  );

  const ready = selected ? prefactureReady(selected) : null;

  const draftPreview = useMemo(() => {
    const lines = linesFromDraft(draftLines);
    const subtotalHT = lines.reduce((s, l) => s + l.amount, 0);
    return { lines, subtotalHT, count: lines.length };
  }, [draftLines]);

  function resetComposer() {
    const b = monthBounds();
    setClientName("");
    setContractRef("");
    setSite("");
    setPeriodStart(b.start);
    setPeriodEnd(b.end);
    setNote("");
    setDraftLines([emptyLine()]);
  }

  function openComposer() {
    resetComposer();
    setComposerOpen(true);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.warning("Client requis");
      return;
    }
    if (!contractRef.trim()) {
      toast.warning("Référence contrat requise");
      return;
    }
    const lines = linesFromDraft(draftLines);
    if (lines.length === 0) {
      toast.warning("Ajoutez au moins une prestation");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "prefactures",
          clientName,
          contractRef,
          site,
          periodStart,
          periodEnd,
          taxRatePct: DEFAULT_TAX_RATE,
          note,
          lines,
        }),
      });
      const data = (await res.json()) as {
        item?: FinancePrefacture;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      if (data.item) {
        setItems((prev) => [data.item!, ...prev]);
        setSelectedId(data.item.id);
        toast.success(`Préfacture ${data.item.number} créée`);
        setComposerOpen(false);
        resetComposer();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function patchAction(action: string) {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "prefactures",
          id: selected.id,
          action,
        }),
      });
      const data = (await res.json()) as {
        item?: FinancePrefacture;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action impossible");
      if (data.item) {
        setItems((prev) =>
          prev.map((x) => (x.id === data.item!.id ? data.item! : x)),
        );
        const labels: Record<string, string> = {
          control: "Soumise au contrôle",
          validate: "Préfacture validée",
          invoice: "Marquée facturée",
        };
        toast.success(labels[action] || "Préfacture mise à jour");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const flowSteps: PrefactureStatus[] = [
    "brouillon",
    "en_controle",
    "validee",
    "facturee",
  ];

  return (
    <div
      className={`leads-page fin-page pf-page${embedded ? " fin-page--embedded" : ""}`}
      data-testid="prefactures-workspace"
    >
      {embedded ? (
        <div className="fin-embedded-bar pf-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">Finance · TMP-18</p>
            <h2>Préfacture / prestations facturables</h2>
            <p>
              Période, contrat, quantités réalisées, écarts, ajustements et
              validation → facture
            </p>
          </div>
          <div className="leads-header-actions">
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? "Actualisation…" : "Actualiser"}
            </button>
            {canEdit ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={openComposer}
              >
                Nouvelle préfacture
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="leads-kpis" aria-label="Indicateurs préfactures">
        <article className="leads-kpi leads-kpi--accent">
          <p>À traiter</p>
          <strong>{counts.action ?? 0}</strong>
          <span>brouillon · contrôle</span>
        </article>
        <article className="leads-kpi">
          <p>En contrôle</p>
          <strong>{counts.en_controle ?? 0}</strong>
          <span>ops / finance</span>
        </article>
        <article className="leads-kpi">
          <p>Validées</p>
          <strong>{counts.validee ?? 0}</strong>
          <span>prêtes facture</span>
        </article>
        <article className="leads-kpi offers-kpi--value">
          <p>Pipeline TTC</p>
          <strong>{formatFinanceFcfa(pipelineTtc)}</strong>
          <span>{counts.all ?? 0} préfactures</span>
        </article>
      </section>

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="N°, client, contrat, site…"
            aria-label="Rechercher une préfacture"
          />
        </label>
        <div className="leads-filters" role="tablist">
          {(
            [
              ["all", "Tous"],
              ["action", "À traiter"],
              ["brouillon", "Brouillons"],
              ["en_controle", "Contrôle"],
              ["validee", "Validées"],
              ["facturee", "Facturées"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={filter === k}
              className={`leads-chip${filter === k ? " is-active" : ""}`}
              onClick={() => setFilter(k)}
            >
              {label}
              {k !== "all" && (counts[k] ?? 0) > 0 ? (
                <em>{counts[k]}</em>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="leads-layout">
        <div className="leads-list">
          {loading && items.length === 0 ? (
            <div className="leads-empty">
              <h2>Chargement…</h2>
            </div>
          ) : filtered.length === 0 ? (
            <div className="leads-empty">
              <IconInvoice size={28} />
              <h2>Aucune préfacture</h2>
              <p>
                Saisissez l’état des prestations facturables sur une période
                (prévu / réalisé / ajustements).
              </p>
              {canEdit ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={openComposer}
                >
                  Nouvelle préfacture
                </button>
              ) : null}
            </div>
          ) : (
            filtered.map((i) => (
              <button
                key={i.id}
                type="button"
                className={`leads-card pf-card${selectedId === i.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(i.id)}
              >
                <span className="leads-card__avatar" aria-hidden>
                  {initials(i.clientName)}
                </span>
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{i.number}</strong>
                    <span className={`pf-status pf-status--${i.status}`}>
                      {PREFACTURE_STATUS_LABELS[i.status]}
                    </span>
                  </span>
                  <span className="leads-card__title">{i.clientName}</span>
                  <span className="leads-card__preview">
                    {i.contractRef || "Sans contrat"} · {i.site || "Site —"}
                  </span>
                  <span className="leads-card__meta">
                    {formatWhen(i.periodStart)} → {formatWhen(i.periodEnd)} ·{" "}
                    {formatFinanceFcfa(i.totalTTC)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <IconInvoice size={28} />
              <h2>Sélectionnez une préfacture</h2>
              <p>
                Consultez le cadre, les écarts de quantités et validez avant
                facturation.
              </p>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    <span className={`pf-status pf-status--${selected.status}`}>
                      {PREFACTURE_STATUS_LABELS[selected.status]}
                    </span>
                    <span>{selected.number}</span>
                  </p>
                  <h2>{selected.clientName}</h2>
                  <p className="leads-detail__sub">
                    Contrat {selected.contractRef || "—"} ·{" "}
                    {formatWhen(selected.periodStart)} →{" "}
                    {formatWhen(selected.periodEnd)}
                    {selected.site ? ` · ${selected.site}` : ""}
                  </p>
                </div>
                <div className="fin-detail-total">
                  <span>Total TTC</span>
                  <strong>{formatFinanceFcfa(selected.totalTTC)}</strong>
                </div>
              </header>

              <div className="offers-flow pf-flow" aria-label="Circuit">
                {flowSteps.map((st) => {
                  const order = flowSteps;
                  const cur = order.indexOf(selected.status);
                  const idx = order.indexOf(st);
                  const isCurrent = selected.status === st;
                  const isDone =
                    cur > idx ||
                    (selected.status === "facturee" && st === "facturee");
                  return (
                    <span
                      key={st}
                      className={`offers-flow__step${isCurrent ? " is-current" : ""}${isDone && !isCurrent ? " is-done" : ""}`}
                    >
                      {PREFACTURE_STATUS_LABELS[st]}
                    </span>
                  );
                })}
              </div>

              {ready && !ready.ok ? (
                <div className="offers-recipe is-blocked">
                  <strong>Avant validation</strong>
                  <ul>
                    {ready.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : ready?.ok &&
                (selected.status === "brouillon" ||
                  selected.status === "en_controle") ? (
                <div className="offers-recipe is-ok">
                  <strong>Prête à valider</strong>
                  <p>
                    Client, contrat, période et prestations renseignés.
                  </p>
                </div>
              ) : null}

              <section className="fin-section">
                <h3>Cadre</h3>
                <dl className="fin-dl">
                  <div>
                    <dt>Contrat</dt>
                    <dd>{selected.contractRef || "—"}</dd>
                  </div>
                  <div>
                    <dt>Site</dt>
                    <dd>{selected.site || "—"}</dd>
                  </div>
                  <div>
                    <dt>Période</dt>
                    <dd>
                      {formatWhen(selected.periodStart)} →{" "}
                      {formatWhen(selected.periodEnd)}
                    </dd>
                  </div>
                  <div>
                    <dt>Lignes</dt>
                    <dd>{selected.lines.length}</dd>
                  </div>
                  <div>
                    <dt>Total HT</dt>
                    <dd>{formatFinanceFcfa(selected.subtotalHT)}</dd>
                  </div>
                  <div>
                    <dt>TVA {selected.taxRatePct}%</dt>
                    <dd>{formatFinanceFcfa(selected.taxAmount)}</dd>
                  </div>
                </dl>
              </section>

              <section className="fin-section">
                <h3>Prestations · quantités · écarts · ajustements</h3>
                <div className="fin-table-wrap">
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Prestation</th>
                        <th>Prévu</th>
                        <th>Réalisé</th>
                        <th>Écart</th>
                        <th>Ajust.</th>
                        <th>P.U. HT</th>
                        <th>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.lines.map((l) => (
                        <tr key={l.id}>
                          <td>{l.label}</td>
                          <td>
                            {l.qtyPlanned} {l.unit}
                          </td>
                          <td>
                            {l.qtyDone} {l.unit}
                          </td>
                          <td>
                            <span
                              className={
                                l.variance === 0
                                  ? "pf-var"
                                  : l.variance > 0
                                    ? "pf-var is-up"
                                    : "pf-var is-down"
                              }
                            >
                              {formatVariance(l.variance)}
                            </span>
                          </td>
                          <td>{l.adjustment}</td>
                          <td>{formatFinanceFcfa(l.unitPrice)}</td>
                          <td>{formatFinanceFcfa(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={6}>Sous-total HT</td>
                        <td>{formatFinanceFcfa(selected.subtotalHT)}</td>
                      </tr>
                      <tr>
                        <td colSpan={6}>TVA</td>
                        <td>{formatFinanceFcfa(selected.taxAmount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={6}>Total TTC</td>
                        <td>{formatFinanceFcfa(selected.totalTTC)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              {selected.note ? (
                <section className="fin-section">
                  <h3>Note</h3>
                  <p className="fin-block">{selected.note}</p>
                </section>
              ) : null}

              {selected.validatedAt ? (
                <p className="sc-signed-banner">
                  Validée le {formatWhen(selected.validatedAt)} par{" "}
                  {selected.validatedByName || "—"}
                </p>
              ) : null}

              <div className="fin-actions">
                {canEdit && selected.status === "brouillon" ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={busy}
                    onClick={() => void patchAction("control")}
                  >
                    Soumettre au contrôle
                  </button>
                ) : null}
                {canValidate &&
                (selected.status === "brouillon" ||
                  selected.status === "en_controle") ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy || (ready != null && !ready.ok)}
                    onClick={() => void patchAction("validate")}
                  >
                    Valider
                  </button>
                ) : null}
                {canEdit && selected.status === "validee" ? (
                  <>
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy}
                      onClick={() => void patchAction("invoice")}
                    >
                      Marquer facturée
                    </button>
                    <Link
                      href="/admin/finance?tab=factures"
                      className="btn-admin btn-admin--ghost"
                    >
                      Ouvrir les factures
                    </Link>
                  </>
                ) : null}
                {selected.status === "facturee" ? (
                  <Link
                    href="/admin/finance?tab=factures"
                    className="btn-admin btn-admin--ghost"
                  >
                    Voir les factures
                  </Link>
                ) : null}
              </div>

              {selected.history?.length ? (
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
              ) : null}
            </>
          )}
        </article>
      </div>

      {composerOpen ? (
        <AdminOverlayPortal>
          <div
            className="doc-overlay-root"
            role="presentation"
            onClick={() => setComposerOpen(false)}
          >
            <div
              className="doc-overlay-dialog fin-composer-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pf-composer-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="doc-overlay-header">
                <div className="doc-overlay-header__left">
                  <p className="doc-overlay-header__tag">Préfacture</p>
                  <h2 id="pf-composer-title">
                    Nouvelle préfacture / état facturable
                  </h2>
                </div>
                <button
                  type="button"
                  className="doc-overlay-close-btn"
                  onClick={() => setComposerOpen(false)}
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              <form
                id="pf-create-form"
                className="doc-overlay-body fin-composer"
                onSubmit={(e) => void onCreate(e)}
              >
                <fieldset className="fin-composer__section">
                  <legend>Cadre période</legend>
                  <div className="fin-composer__grid">
                    <label className="fin-composer__full">
                      <span>Client *</span>
                      <input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        required
                        autoFocus
                      />
                    </label>
                    <label>
                      <span>Contrat *</span>
                      <input
                        value={contractRef}
                        onChange={(e) => setContractRef(e.target.value)}
                        placeholder="NECS-CTR-…"
                        required
                      />
                    </label>
                    <label>
                      <span>Site</span>
                      <input
                        value={site}
                        onChange={(e) => setSite(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Période du *</span>
                      <input
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      <span>au *</span>
                      <input
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        required
                      />
                    </label>
                    <label className="fin-composer__full">
                      <span>Note</span>
                      <textarea
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Écarts, réserves, commentaires contrôle…"
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>
                    Prestations ({draftPreview.count}) · HT estimé{" "}
                    {formatFinanceFcfa(draftPreview.subtotalHT)}
                  </legend>
                  <div className="fin-lines-edit pf-lines-edit">
                    {draftLines.map((row, idx) => {
                      const preview = makePrefactureLine({
                        label: row.label || "—",
                        qtyPlanned: Number(row.qtyPlanned) || 0,
                        qtyDone: Number(row.qtyDone) || 0,
                        adjustment: Number(row.adjustment) || 0,
                        unit: row.unit || "u",
                        unitPrice: Number(row.unitPrice) || 0,
                      });
                      return (
                        <div key={row.id} className="po-line-row pf-line-row">
                          <input
                            placeholder="Prestation *"
                            value={row.label}
                            onChange={(e) =>
                              setDraftLines((rows) =>
                                rows.map((r, i) =>
                                  i === idx
                                    ? { ...r, label: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            aria-label="Prestation"
                          />
                          <input
                            type="number"
                            min={0}
                            step="any"
                            placeholder="Prévu"
                            value={row.qtyPlanned}
                            onChange={(e) =>
                              setDraftLines((rows) =>
                                rows.map((r, i) =>
                                  i === idx
                                    ? { ...r, qtyPlanned: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            aria-label="Quantité prévue"
                          />
                          <input
                            type="number"
                            min={0}
                            step="any"
                            placeholder="Réalisé"
                            value={row.qtyDone}
                            onChange={(e) =>
                              setDraftLines((rows) =>
                                rows.map((r, i) =>
                                  i === idx
                                    ? { ...r, qtyDone: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            aria-label="Quantité réalisée"
                          />
                          <input
                            type="number"
                            step="any"
                            placeholder="Ajust."
                            value={row.adjustment}
                            onChange={(e) =>
                              setDraftLines((rows) =>
                                rows.map((r, i) =>
                                  i === idx
                                    ? { ...r, adjustment: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            aria-label="Ajustement"
                          />
                          <input
                            placeholder="Unité"
                            value={row.unit}
                            onChange={(e) =>
                              setDraftLines((rows) =>
                                rows.map((r, i) =>
                                  i === idx
                                    ? { ...r, unit: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            aria-label="Unité"
                          />
                          <input
                            type="number"
                            min={0}
                            step="any"
                            placeholder="P.U. HT"
                            value={row.unitPrice}
                            onChange={(e) =>
                              setDraftLines((rows) =>
                                rows.map((r, i) =>
                                  i === idx
                                    ? { ...r, unitPrice: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            aria-label="Prix unitaire HT"
                          />
                          <span className="pf-line-amount" title="Montant ligne">
                            {formatFinanceFcfa(preview.amount)}
                            {preview.variance !== 0 ? (
                              <em
                                className={
                                  preview.variance > 0 ? "is-up" : "is-down"
                                }
                              >
                                {formatVariance(preview.variance)}
                              </em>
                            ) : null}
                          </span>
                          <button
                            type="button"
                            className="btn-admin btn-admin--ghost"
                            disabled={draftLines.length <= 1}
                            onClick={() =>
                              setDraftLines((rows) =>
                                rows.filter((_, i) => i !== idx),
                              )
                            }
                            aria-label="Retirer la ligne"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() =>
                      setDraftLines((rows) => [...rows, emptyLine()])
                    }
                  >
                    + Ajouter une ligne
                  </button>
                </fieldset>
              </form>
              <div className="doc-overlay-footer">
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  onClick={() => setComposerOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  form="pf-create-form"
                  className="btn-admin btn-admin--primary"
                  disabled={busy}
                >
                  {busy ? "Création…" : "Créer la préfacture"}
                </button>
              </div>
            </div>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </div>
  );
}
