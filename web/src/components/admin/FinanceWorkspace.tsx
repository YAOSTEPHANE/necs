"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconInvoice, IconQuote, IconCredit, IconSearch } from "@/components/admin/Icons";
import {
  DEFAULT_NECS_ISSUER,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_QUOTE_CONDITIONS,
  DEFAULT_TAX_RATE,
  FINANCE_DOC_STATUS_LABELS,
  FINANCE_PERIODICITY_LABELS,
  FINANCE_PERIODICITIES,
  computeFinanceTotals,
  formatFinanceFcfa,
  makeFinanceLine,
  type FinanceCreditNote,
  type FinanceDocStatus,
  type FinanceInvoice,
  type FinanceLine,
  type FinancePeriodicity,
  type FinanceQuote,
} from "@/lib/finance-shared";
import { toast } from "@/lib/toast";

export type FinanceKind = "devis" | "factures" | "avoirs";

type AnyDoc = FinanceQuote | FinanceInvoice | FinanceCreditNote;

type DraftLine = {
  id: string;
  label: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

function emptyLine(): DraftLine {
  return {
    id: makeFinanceLine({ label: "x", quantity: 1, unitPrice: 0 }).id,
    label: "",
    quantity: "1",
    unit: "u",
    unitPrice: "",
  };
}

function linesFromDraft(rows: DraftLine[]): FinanceLine[] {
  return rows
    .filter((r) => r.label.trim())
    .map((r) =>
      makeFinanceLine({
        id: r.id,
        label: r.label,
        quantity: Number(r.quantity) || 0,
        unit: r.unit || "u",
        unitPrice: Number(r.unitPrice) || 0,
      }),
    );
}

function formatWhen(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const KIND_META: Record<
  FinanceKind,
  { title: string; badge: string; createLabel: string }
> = {
  devis: {
    title: "Devis",
    badge: "FIN-DEV",
    createLabel: "Nouveau devis",
  },
  factures: {
    title: "Factures",
    badge: "FIN-FAC",
    createLabel: "Nouvelle facture",
  },
  avoirs: {
    title: "Avoirs",
    badge: "FIN-AVO",
    createLabel: "Nouvel avoir",
  },
};

export function FinanceWorkspace({
  kind,
  embedded = false,
}: {
  kind: FinanceKind;
  embedded?: boolean;
}) {
  const meta = KIND_META[kind];
  const [items, setItems] = useState<AnyDoc[]>([]);
  const [invoicesForCredit, setInvoicesForCredit] = useState<FinanceInvoice[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | FinanceDocStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [composerOpen, setComposerOpen] = useState(false);

  // Shared draft fields
  const [clientName, setClientName] = useState("");
  const [site, setSite] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [taxRatePct, setTaxRatePct] = useState(String(DEFAULT_TAX_RATE));
  const [paymentTerms, setPaymentTerms] = useState(DEFAULT_PAYMENT_TERMS);
  const [note, setNote] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([emptyLine()]);

  // Devis-specific
  const [validityDays, setValidityDays] = useState("30");
  const [periodicity, setPeriodicity] =
    useState<FinancePeriodicity>("mensuel");
  const [conditions, setConditions] = useState(DEFAULT_QUOTE_CONDITIONS);

  // Facture-specific
  const [contractRef, setContractRef] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentRefs, setPaymentRefs] = useState("");

  // Avoir-specific
  const [invoiceId, setInvoiceId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [reason, setReason] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance?resource=${kind}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        items?: AnyDoc[];
        canEdit?: boolean;
        canValidate?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items ?? []);
      setCanEdit(Boolean(data.canEdit));
      setCanValidate(Boolean(data.canValidate));
      if (kind === "avoirs") {
        const invRes = await fetch("/api/finance?resource=factures", {
          cache: "no-store",
        });
        const invData = (await invRes.json()) as {
          items?: FinanceInvoice[];
        };
        setInvoicesForCredit(invData.items ?? []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    setSelectedId(null);
    setQuery("");
    setFilter("all");
    void refresh();
  }, [refresh]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!q) return true;
      const blob = [
        "number" in item ? item.number : "",
        "clientName" in item ? item.clientName : "",
        "site" in item ? (item as FinanceQuote).site : "",
        "invoiceNumber" in item
          ? (item as FinanceCreditNote).invoiceNumber
          : "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [items, filter, query]);

  const draftTotals = useMemo(() => {
    const lines = linesFromDraft(draftLines);
    return computeFinanceTotals(lines, Number(taxRatePct) || 0);
  }, [draftLines, taxRatePct]);

  function resetComposer() {
    const today = new Date().toISOString().slice(0, 10);
    setClientName("");
    setSite("");
    setContactName("");
    setContactEmail("");
    setIssueDate(today);
    setTaxRatePct(String(DEFAULT_TAX_RATE));
    setPaymentTerms(DEFAULT_PAYMENT_TERMS);
    setNote("");
    setDraftLines([
      {
        ...emptyLine(),
        label: "Prestation",
        quantity: "1",
        unit: kind === "factures" ? "mois" : "u",
        unitPrice: "",
      },
    ]);
    setValidityDays("30");
    setPeriodicity("mensuel");
    setConditions(DEFAULT_QUOTE_CONDITIONS);
    setContractRef("");
    setPeriodStart(today);
    setPeriodEnd(today);
    setDueDate("");
    setPaymentRefs("");
    setInvoiceId("");
    setInvoiceNumber("");
    setReason("");
  }

  function openComposer() {
    resetComposer();
    setComposerOpen(true);
  }

  async function patchDoc(
    body: Record<string, unknown>,
    okMsg?: string,
  ): Promise<AnyDoc | null> {
    if (busyLock.current) return null;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, resource: kind }),
      });
      const data = (await res.json()) as { item?: AnyDoc; error?: string };
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

  async function createDoc(e: FormEvent) {
    e.preventDefault();
    const lines = linesFromDraft(draftLines);
    setBusy(true);
    try {
      let payload: Record<string, unknown> = {
        resource: kind,
        lines,
        taxRatePct: Number(taxRatePct) || DEFAULT_TAX_RATE,
        issueDate,
        note,
      };
      if (kind === "devis") {
        if (!clientName.trim()) {
          toast.warning("Client requis");
          return;
        }
        payload = {
          ...payload,
          clientName,
          site,
          contactName,
          contactEmail,
          validityDays: Number(validityDays) || 30,
          periodicity,
          paymentTerms,
          conditions,
        };
      } else if (kind === "factures") {
        if (!clientName.trim()) {
          toast.warning("Client requis");
          return;
        }
        payload = {
          ...payload,
          clientName,
          site,
          contactName,
          contactEmail,
          contractRef,
          periodStart,
          periodEnd,
          dueDate,
          paymentTerms,
          paymentRefs,
          issuer: DEFAULT_NECS_ISSUER,
        };
      } else {
        if (!reason.trim()) {
          toast.warning("Motif requis");
          return;
        }
        if (!invoiceId && !invoiceNumber.trim()) {
          toast.warning("Facture initiale requise");
          return;
        }
        payload = {
          ...payload,
          invoiceId,
          invoiceNumber,
          clientName,
          reason,
        };
      }

      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { item?: AnyDoc; error?: string };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      if (data.item) {
        setItems((prev) => [data.item!, ...prev]);
        setSelectedId(data.item.id);
      }
      setComposerOpen(false);
      toast.success(
        kind === "devis"
          ? "Devis créé"
          : kind === "factures"
            ? "Facture créée"
            : "Avoir créé",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const Icon =
    kind === "devis" ? IconQuote : kind === "avoirs" ? IconCredit : IconInvoice;

  return (
    <div
      className={`leads-page fin-page${embedded ? " fin-page--embedded" : ""}`}
      data-testid={`finance-${kind}`}
    >
      {!embedded ? (
        <ModuleHeader
          tone="#1e40af"
          badge={meta.badge}
          icon={<Icon size={20} />}
          title={meta.title}
          actions={
            canEdit ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={openComposer}
              >
                {meta.createLabel}
              </button>
            ) : null
          }
        />
      ) : (
        <div className="fin-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">{meta.badge}</p>
            <h2>{meta.title}</h2>
            <p>
              {kind === "devis"
                ? "Numéro, client, site, prestations, quantités, prix, périodicité, taxes, total, validité & paiement"
                : kind === "factures"
                  ? "Identité NECS, client, contrat, période, prestations, taxes, échéance & modalités"
                  : "Référence facture, motif, lignes, montant, validation & traçabilité"}
            </p>
          </div>
          <div className="leads-header-actions">
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => void refresh()}
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
                {meta.createLabel}
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="N°, client…"
            aria-label="Rechercher"
          />
        </label>
        <div className="leads-filters" role="tablist">
          {(
            [
              ["all", "Tous"],
              ["brouillon", "Brouillons"],
              ["valide", "Validés"],
              ["envoye", "Envoyés"],
              ["paye", "Soldés"],
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
              <h2>Aucun document</h2>
              <p>Créez un premier {meta.title.toLowerCase().slice(0, -1)}.</p>
              {canEdit ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={openComposer}
                >
                  {meta.createLabel}
                </button>
              ) : null}
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`leads-card${selectedId === item.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{item.clientName}</strong>
                    <time>{formatFinanceFcfa(item.totalTTC)}</time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-pill">{item.number}</span>
                    <span className={`fin-status fin-status--${item.status}`}>
                      {FINANCE_DOC_STATUS_LABELS[item.status]}
                    </span>
                  </span>
                  <span className="leads-card__preview">
                    {kind === "avoirs"
                      ? `Facture ${(item as FinanceCreditNote).invoiceNumber}`
                      : "site" in item
                        ? (item as FinanceQuote).site || "Site —"
                        : "—"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <h2>Sélectionnez un document</h2>
            </div>
          ) : (
            <FinanceDetail
              kind={kind}
              doc={selected}
              busy={busy}
              canEdit={canEdit}
              canValidate={canValidate}
              onAction={(action, msg) =>
                void patchDoc({ id: selected.id, action }, msg)
              }
            />
          )}
        </article>
      </div>

      {composerOpen ? (
        <AdminOverlayPortal>
          <div
            className="doc-overlay-backdrop"
            role="presentation"
            onClick={() => setComposerOpen(false)}
          >
            <div
              className="doc-overlay-dialog fin-composer-dialog"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="doc-overlay-header">
                <div className="doc-overlay-header__left">
                  <p className="doc-overlay-header__tag">{meta.badge}</p>
                  <h2>{meta.createLabel}</h2>
                </div>
                <div className="doc-overlay-header__right">
                  <button
                    type="button"
                    className="doc-overlay-close-btn"
                    onClick={() => setComposerOpen(false)}
                  >
                    ×
                  </button>
                </div>
              </div>
              <form
                id="fin-create-form"
                className="doc-overlay-body fin-composer"
                onSubmit={createDoc}
              >
                {kind !== "avoirs" ? (
                  <fieldset className="fin-composer__section">
                    <legend>Client & site</legend>
                    <div className="fin-composer__grid">
                      <label className="fin-composer__full">
                        <span>Client *</span>
                        <input
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
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
                        <span>Contact</span>
                        <input
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                        />
                      </label>
                      <label className="fin-composer__full">
                        <span>E-mail</span>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                        />
                      </label>
                    </div>
                  </fieldset>
                ) : (
                  <fieldset className="fin-composer__section">
                    <legend>Facture initiale & motif</legend>
                    <div className="fin-composer__grid">
                      <label className="fin-composer__full">
                        <span>Facture initiale *</span>
                        <select
                          value={invoiceId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setInvoiceId(id);
                            const inv = invoicesForCredit.find(
                              (i) => i.id === id,
                            );
                            if (inv) {
                              setInvoiceNumber(inv.number);
                              setClientName(inv.clientName);
                              setDraftLines(
                                inv.lines.map((l) => ({
                                  id: l.id,
                                  label: l.label,
                                  quantity: String(l.quantity),
                                  unit: l.unit,
                                  unitPrice: String(l.unitPrice),
                                })),
                              );
                              setTaxRatePct(String(inv.taxRatePct));
                            }
                          }}
                        >
                          <option value="">— Choisir une facture —</option>
                          {invoicesForCredit.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.number} · {inv.clientName} ·{" "}
                              {formatFinanceFcfa(inv.totalTTC)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="fin-composer__full">
                        <span>Ou n° facture (saisie libre)</span>
                        <input
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          placeholder="NECS-FAC-…"
                        />
                      </label>
                      <label className="fin-composer__full">
                        <span>Client</span>
                        <input
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                        />
                      </label>
                      <label className="fin-composer__full">
                        <span>Motif *</span>
                        <textarea
                          rows={3}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          required
                        />
                      </label>
                    </div>
                  </fieldset>
                )}

                {kind === "devis" ? (
                  <fieldset className="fin-composer__section">
                    <legend>Validité & périodicité</legend>
                    <div className="fin-composer__grid">
                      <label>
                        <span>Date devis</span>
                        <input
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Validité (jours)</span>
                        <input
                          type="number"
                          min={1}
                          value={validityDays}
                          onChange={(e) => setValidityDays(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Périodicité</span>
                        <select
                          value={periodicity}
                          onChange={(e) =>
                            setPeriodicity(
                              e.target.value as FinancePeriodicity,
                            )
                          }
                        >
                          {FINANCE_PERIODICITIES.map((p) => (
                            <option key={p} value={p}>
                              {FINANCE_PERIODICITY_LABELS[p]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>TVA %</span>
                        <input
                          type="number"
                          step="0.01"
                          value={taxRatePct}
                          onChange={(e) => setTaxRatePct(e.target.value)}
                        />
                      </label>
                      <label className="fin-composer__full">
                        <span>Conditions de paiement</span>
                        <textarea
                          rows={2}
                          value={paymentTerms}
                          onChange={(e) => setPaymentTerms(e.target.value)}
                        />
                      </label>
                      <label className="fin-composer__full">
                        <span>Conditions générales</span>
                        <textarea
                          rows={2}
                          value={conditions}
                          onChange={(e) => setConditions(e.target.value)}
                        />
                      </label>
                    </div>
                  </fieldset>
                ) : null}

                {kind === "factures" ? (
                  <fieldset className="fin-composer__section">
                    <legend>Contrat, période & échéance</legend>
                    <div className="fin-composer__grid">
                      <label>
                        <span>Réf. contrat</span>
                        <input
                          value={contractRef}
                          onChange={(e) => setContractRef(e.target.value)}
                          placeholder="NECS-CTR-…"
                        />
                      </label>
                      <label>
                        <span>Date facture</span>
                        <input
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Période du</span>
                        <input
                          type="date"
                          value={periodStart}
                          onChange={(e) => setPeriodStart(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>au</span>
                        <input
                          type="date"
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Échéance</span>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>TVA %</span>
                        <input
                          type="number"
                          step="0.01"
                          value={taxRatePct}
                          onChange={(e) => setTaxRatePct(e.target.value)}
                        />
                      </label>
                      <label className="fin-composer__full">
                        <span>Modalités de paiement</span>
                        <textarea
                          rows={2}
                          value={paymentTerms}
                          onChange={(e) => setPaymentTerms(e.target.value)}
                        />
                      </label>
                      <label className="fin-composer__full">
                        <span>Références de paiement</span>
                        <input
                          value={paymentRefs}
                          onChange={(e) => setPaymentRefs(e.target.value)}
                          placeholder="N° facture · IBAN / compte"
                        />
                      </label>
                      <p className="fin-composer__issuer">
                        Émetteur : {DEFAULT_NECS_ISSUER.legalName} ·{" "}
                        {DEFAULT_NECS_ISSUER.email}
                      </p>
                    </div>
                  </fieldset>
                ) : null}

                {kind === "avoirs" ? (
                  <fieldset className="fin-composer__section">
                    <legend>Date & taxes</legend>
                    <div className="fin-composer__grid">
                      <label>
                        <span>Date avoir</span>
                        <input
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>TVA %</span>
                        <input
                          type="number"
                          step="0.01"
                          value={taxRatePct}
                          onChange={(e) => setTaxRatePct(e.target.value)}
                        />
                      </label>
                    </div>
                  </fieldset>
                ) : null}

                <fieldset className="fin-composer__section">
                  <legend>
                    {kind === "avoirs"
                      ? "Lignes concernées"
                      : "Prestations (qté × prix unitaire)"}
                  </legend>
                  <div className="fin-lines-edit">
                    {draftLines.map((line, idx) => (
                      <div key={line.id} className="fin-line-row">
                        <input
                          aria-label="Libellé"
                          placeholder="Prestation"
                          value={line.label}
                          onChange={(e) =>
                            setDraftLines((rows) =>
                              rows.map((r, i) =>
                                i === idx
                                  ? { ...r, label: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                        <input
                          type="number"
                          aria-label="Quantité"
                          placeholder="Qté"
                          value={line.quantity}
                          onChange={(e) =>
                            setDraftLines((rows) =>
                              rows.map((r, i) =>
                                i === idx
                                  ? { ...r, quantity: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                        <input
                          aria-label="Unité"
                          placeholder="Unité"
                          value={line.unit}
                          onChange={(e) =>
                            setDraftLines((rows) =>
                              rows.map((r, i) =>
                                i === idx ? { ...r, unit: e.target.value } : r,
                              ),
                            )
                          }
                        />
                        <input
                          type="number"
                          aria-label="Prix unitaire"
                          placeholder="PU HT"
                          value={line.unitPrice}
                          onChange={(e) =>
                            setDraftLines((rows) =>
                              rows.map((r, i) =>
                                i === idx
                                  ? { ...r, unitPrice: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() =>
                        setDraftLines((rows) => [...rows, emptyLine()])
                      }
                    >
                      + Ligne
                    </button>
                    <p className="fin-draft-total">
                      HT {formatFinanceFcfa(draftTotals.subtotalHT)} · TVA{" "}
                      {formatFinanceFcfa(draftTotals.taxAmount)} ·{" "}
                      <strong>
                        TTC {formatFinanceFcfa(draftTotals.totalTTC)}
                      </strong>
                    </p>
                  </div>
                </fieldset>
              </form>
              <footer className="doc-overlay-footer">
                <div className="doc-overlay-footer__actions">
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() => setComposerOpen(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    form="fin-create-form"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                  >
                    {busy ? "Création…" : "Créer"}
                  </button>
                </div>
              </footer>
            </div>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </div>
  );
}

function FinanceDetail({
  kind,
  doc,
  busy,
  canEdit,
  canValidate,
  onAction,
}: {
  kind: FinanceKind;
  doc: AnyDoc;
  busy: boolean;
  canEdit: boolean;
  canValidate: boolean;
  onAction: (action: string, msg: string) => void;
}) {
  const quote = kind === "devis" ? (doc as FinanceQuote) : null;
  const invoice = kind === "factures" ? (doc as FinanceInvoice) : null;
  const credit = kind === "avoirs" ? (doc as FinanceCreditNote) : null;

  return (
    <>
      <header className="leads-detail__head">
        <div>
          <p className="leads-detail__eyebrow">
            <span className={`fin-status fin-status--${doc.status}`}>
              {FINANCE_DOC_STATUS_LABELS[doc.status]}
            </span>
            <span>{doc.number}</span>
          </p>
          <h2>{doc.clientName}</h2>
          <p className="leads-detail__sub">
            {invoice
              ? `Contrat ${invoice.contractRef || "—"} · échéance ${formatWhen(invoice.dueDate)}`
              : credit
                ? `Facture ${credit.invoiceNumber}`
                : quote
                  ? `${quote.site || "Site —"} · validité ${quote.validityDays} j`
                  : null}
          </p>
        </div>
        <div className="fin-detail-total">
          <span>Total TTC</span>
          <strong>{formatFinanceFcfa(doc.totalTTC)}</strong>
        </div>
      </header>

      {invoice ? (
        <section className="fin-section">
          <h3>Identité NECS</h3>
          <p className="fin-block">
            <strong>{invoice.issuer.legalName}</strong>
            <br />
            {invoice.issuer.address}
            <br />
            {invoice.issuer.phone} · {invoice.issuer.email}
            <br />
            {invoice.issuer.rccm} · {invoice.issuer.niu}
          </p>
        </section>
      ) : null}

      <section className="fin-section">
        <h3>Cadre</h3>
        <dl className="fin-dl">
          <div>
            <dt>Date</dt>
            <dd>{formatWhen(doc.issueDate)}</dd>
          </div>
          {quote ? (
            <>
              <div>
                <dt>Validité</dt>
                <dd>
                  {quote.validityDays} j · expire {formatWhen(quote.expiresAt)}
                </dd>
              </div>
              <div>
                <dt>Périodicité</dt>
                <dd>{FINANCE_PERIODICITY_LABELS[quote.periodicity]}</dd>
              </div>
            </>
          ) : null}
          {invoice ? (
            <>
              <div>
                <dt>Période</dt>
                <dd>
                  {formatWhen(invoice.periodStart)} →{" "}
                  {formatWhen(invoice.periodEnd)}
                </dd>
              </div>
              <div>
                <dt>Échéance</dt>
                <dd>{formatWhen(invoice.dueDate)}</dd>
              </div>
              <div>
                <dt>Site</dt>
                <dd>{invoice.site || "—"}</dd>
              </div>
            </>
          ) : null}
          {credit ? (
            <>
              <div>
                <dt>Facture initiale</dt>
                <dd>{credit.invoiceNumber}</dd>
              </div>
              <div>
                <dt>Validation</dt>
                <dd>
                  {credit.validatedAt
                    ? `${formatWhen(credit.validatedAt)} · ${credit.validatedByName || "—"}`
                    : "En attente"}
                </dd>
              </div>
            </>
          ) : null}
          <div>
            <dt>TVA</dt>
            <dd>{doc.taxRatePct} %</dd>
          </div>
        </dl>
        {credit?.reason ? (
          <p className="fin-block">
            <strong>Motif</strong>
            {credit.reason}
          </p>
        ) : null}
      </section>

      <section className="fin-section">
        <h3>Lignes</h3>
        <div className="fin-table-wrap">
          <table className="fin-table">
            <thead>
              <tr>
                <th>Prestation</th>
                <th>Qté</th>
                <th>Unité</th>
                <th>PU HT</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {doc.lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.label}</td>
                  <td>{l.quantity}</td>
                  <td>{l.unit}</td>
                  <td>{formatFinanceFcfa(l.unitPrice)}</td>
                  <td>{formatFinanceFcfa(l.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Sous-total HT</td>
                <td>{formatFinanceFcfa(doc.subtotalHT)}</td>
              </tr>
              <tr>
                <td colSpan={4}>Taxes ({doc.taxRatePct} %)</td>
                <td>{formatFinanceFcfa(doc.taxAmount)}</td>
              </tr>
              <tr>
                <td colSpan={4}>Total TTC</td>
                <td>{formatFinanceFcfa(doc.totalTTC)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {quote ? (
        <section className="fin-section">
          <h3>Validité & conditions de paiement</h3>
          <p className="fin-block">
            <strong>Paiement</strong>
            {quote.paymentTerms}
          </p>
          <p className="fin-block">
            <strong>Conditions</strong>
            {quote.conditions}
          </p>
        </section>
      ) : null}

      {invoice ? (
        <section className="fin-section">
          <h3>Modalités & références</h3>
          <p className="fin-block">
            <strong>Paiement</strong>
            {invoice.paymentTerms}
          </p>
          <p className="fin-block">
            <strong>Références</strong>
            {invoice.paymentRefs || "—"}
          </p>
          <p className="fin-block">
            <strong>Banque / compte</strong>
            {invoice.issuer.bankRefs}
          </p>
        </section>
      ) : null}

      <div className="fin-actions">
        {canEdit && doc.status === "brouillon" ? (
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            disabled={busy}
            onClick={() => onAction("send", "Document envoyé")}
          >
            Marquer envoyé
          </button>
        ) : null}
        {canValidate &&
        (doc.status === "brouillon" || doc.status === "envoye") ? (
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            disabled={busy}
            onClick={() => onAction("validate", "Document validé")}
          >
            Valider
          </button>
        ) : null}
        {canValidate && kind === "factures" && doc.status === "envoye" ? (
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            disabled={busy}
            onClick={() => onAction("pay", "Facture soldée")}
          >
            Marquer payée
          </button>
        ) : null}
      </div>

      <section className="fin-history">
        <h3>Traçabilité</h3>
        <ol>
          {[...doc.history].reverse().map((h) => (
            <li key={h.id}>
              <strong>{h.detail}</strong>
              <span>
                {formatWhen(h.at)} · {h.byName}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
