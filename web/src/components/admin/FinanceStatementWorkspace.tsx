"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { IconSearch, IconStatement } from "@/components/admin/Icons";
import {
  FINANCE_PAYMENT_METHOD_LABELS,
  FINANCE_PAYMENT_METHODS,
  STATEMENT_MOVEMENT_LABELS,
  formatFinanceFcfa,
  type FinanceInvoice,
  type FinancePayment,
  type FinancePaymentMethod,
  type FinanceStatement,
} from "@/lib/finance-shared";
import { toast } from "@/lib/toast";

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

function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function FinanceStatementWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [clients, setClients] = useState<string[]>([]);
  const [saved, setSaved] = useState<FinanceStatement[]>([]);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [preview, setPreview] = useState<FinanceStatement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const [clientName, setClientName] = useState("");
  const [periodStart, setPeriodStart] = useState(yearStart);
  const [periodEnd, setPeriodEnd] = useState(today);

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [payMethod, setPayMethod] = useState<FinancePaymentMethod>("virement");
  const [payRef, setPayRef] = useState("");
  const [payDate, setPayDate] = useState(today);
  const [payNote, setPayNote] = useState("");

  const refreshLists = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, savedRes, invRes] = await Promise.all([
        fetch("/api/finance?resource=clients", { cache: "no-store" }),
        fetch("/api/finance?resource=releves", { cache: "no-store" }),
        fetch("/api/finance?resource=factures", { cache: "no-store" }),
      ]);
      const clientsData = (await clientsRes.json()) as {
        clients?: string[];
        canEdit?: boolean;
        error?: string;
      };
      const savedData = (await savedRes.json()) as {
        items?: FinanceStatement[];
        error?: string;
      };
      const invData = (await invRes.json()) as { items?: FinanceInvoice[] };
      if (!clientsRes.ok) {
        throw new Error(clientsData.error || "Chargement clients impossible");
      }
      if (!savedRes.ok) {
        throw new Error(savedData.error || "Chargement relevés impossible");
      }
      setClients(clientsData.clients ?? []);
      setCanEdit(Boolean(clientsData.canEdit));
      setSaved(savedData.items ?? []);
      setInvoices(invData.items ?? []);
      if (!clientName && (clientsData.clients?.length ?? 0) > 0) {
        setClientName(clientsData.clients![0]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [clientName]);

  useEffect(() => {
    void refreshLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const loadPreview = useCallback(async () => {
    if (!clientName.trim()) {
      toast.warning("Sélectionnez un client");
      return;
    }
    setBusy(true);
    try {
      const params = new URLSearchParams({
        resource: "releves",
        preview: "1",
        client: clientName,
        from: periodStart,
        to: periodEnd,
      });
      const res = await fetch(`/api/finance?${params}`, { cache: "no-store" });
      const data = (await res.json()) as {
        statement?: Omit<FinanceStatement, "id" | "number"> & {
          id?: string;
          number?: string;
        };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Calcul impossible");
      if (data.statement) {
        setPreview({
          id: data.statement.id || "preview",
          number: data.statement.number || "Aperçu",
          clientName: data.statement.clientName,
          periodStart: data.statement.periodStart,
          periodEnd: data.statement.periodEnd,
          generatedAt: data.statement.generatedAt,
          openingBalance: data.statement.openingBalance,
          closingBalance: data.statement.closingBalance,
          totalInvoices: data.statement.totalInvoices,
          totalCredits: data.statement.totalCredits,
          totalPayments: data.statement.totalPayments,
          receivables: data.statement.receivables,
          overdueAmount: data.statement.overdueAmount,
          movements: data.statement.movements,
          dueItems: data.statement.dueItems,
          note: data.statement.note || "",
          history: data.statement.history || [],
          createdAt: data.statement.generatedAt,
          updatedAt: data.statement.generatedAt,
          createdBy: "",
          createdByName: "",
          ownerEmail: "",
          ownerName: "",
        });
        setSelectedId(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }, [clientName, periodStart, periodEnd]);

  async function saveStatement() {
    if (!clientName.trim()) {
      toast.warning("Client requis");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "releves",
          clientName,
          periodStart,
          periodEnd,
        }),
      });
      const data = (await res.json()) as {
        item?: FinanceStatement;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible");
      if (data.item) {
        setSaved((prev) => [data.item!, ...prev]);
        setPreview(data.item);
        setSelectedId(data.item.id);
      }
      toast.success("Relevé enregistré");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function createPayment(e: FormEvent) {
    e.preventDefault();
    const amount = Number(payAmount) || 0;
    if (!clientName.trim() || amount <= 0) {
      toast.warning("Client et montant requis");
      return;
    }
    setBusy(true);
    try {
      const inv = invoices.find((i) => i.id === payInvoiceId);
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "reglements",
          clientName,
          invoiceId: payInvoiceId,
          invoiceNumber: inv?.number || "",
          amount,
          paidAt: payDate,
          method: payMethod,
          reference: payRef,
          note: payNote,
        }),
      });
      const data = (await res.json()) as {
        item?: FinancePayment;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Règlement impossible");
      setPayOpen(false);
      toast.success("Règlement enregistré");
      await loadPreview();
      void data.item;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const selected = useMemo(() => {
    if (selectedId) return saved.find((s) => s.id === selectedId) ?? preview;
    return preview;
  }, [selectedId, saved, preview]);

  const filteredSaved = useMemo(() => {
    const q = query.trim().toLowerCase();
    return saved.filter((s) => {
      if (!q) return true;
      return `${s.number} ${s.clientName}`.toLowerCase().includes(q);
    });
  }, [saved, query]);

  const clientInvoices = useMemo(
    () =>
      invoices.filter(
        (i) =>
          i.clientName.trim().toLowerCase() ===
            clientName.trim().toLowerCase() &&
          i.status !== "annule" &&
          i.status !== "paye",
      ),
    [invoices, clientName],
  );

  return (
    <div
      className={`leads-page fin-page${embedded ? " fin-page--embedded" : ""}`}
      data-testid="finance-releves"
    >
      {embedded ? (
        <div className="fin-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">Relevé</p>
            <h2>Relevé de compte client</h2>
            <p>
              Factures, avoirs, règlements, soldes, échéances et créances
            </p>
          </div>
          <div className="leads-header-actions">
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => void refreshLists()}
              disabled={loading}
            >
              Actualiser
            </button>
            {canEdit ? (
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={() => {
                  setPayAmount("");
                  setPayInvoiceId("");
                  setPayRef("");
                  setPayNote("");
                  setPayDate(today());
                  setPayOpen(true);
                }}
                disabled={!clientName}
              >
                + Règlement
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="fin-statement-controls">
        <label>
          <span>Client</span>
          <select
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Du</span>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
        </label>
        <label>
          <span>Au</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </label>
        <div className="fin-statement-controls__actions">
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            disabled={busy || !clientName}
            onClick={() => void loadPreview()}
          >
            {busy ? "Calcul…" : "Calculer le relevé"}
          </button>
          {canEdit && preview ? (
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              disabled={busy}
              onClick={() => void saveStatement()}
            >
              Enregistrer
            </button>
          ) : null}
        </div>
      </div>

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Relevés enregistrés…"
            aria-label="Rechercher un relevé"
          />
        </label>
      </div>

      <div className="leads-layout">
        <div className="leads-list">
          {loading && saved.length === 0 ? (
            <div className="leads-empty">
              <h2>Chargement…</h2>
            </div>
          ) : filteredSaved.length === 0 ? (
            <div className="leads-empty">
              <IconStatement size={28} />
              <h2>Aucun relevé enregistré</h2>
              <p>Calculez un relevé puis enregistrez-le pour le conserver.</p>
            </div>
          ) : (
            filteredSaved.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`leads-card${selectedId === item.id ? " is-active" : ""}`}
                onClick={() => {
                  setSelectedId(item.id);
                  setPreview(item);
                  setClientName(item.clientName);
                  setPeriodStart(item.periodStart);
                  setPeriodEnd(item.periodEnd);
                }}
              >
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{item.clientName}</strong>
                    <time>{formatFinanceFcfa(item.closingBalance)}</time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-pill">{item.number}</span>
                  </span>
                  <span className="leads-card__preview">
                    {formatWhen(item.periodStart)} → {formatWhen(item.periodEnd)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <h2>Relevé de compte</h2>
              <p>Choisissez un client et calculez le relevé pour la période.</p>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    <span>{selected.number}</span>
                    <span>
                      {formatWhen(selected.periodStart)} →{" "}
                      {formatWhen(selected.periodEnd)}
                    </span>
                  </p>
                  <h2>{selected.clientName}</h2>
                </div>
                <div className="fin-detail-total">
                  <span>Solde clôture</span>
                  <strong>{formatFinanceFcfa(selected.closingBalance)}</strong>
                </div>
              </header>

              <div className="fin-kpis">
                <div className="fin-kpi">
                  <span>Solde d’ouverture</span>
                  <strong>{formatFinanceFcfa(selected.openingBalance)}</strong>
                </div>
                <div className="fin-kpi">
                  <span>Factures</span>
                  <strong>{formatFinanceFcfa(selected.totalInvoices)}</strong>
                </div>
                <div className="fin-kpi">
                  <span>Avoirs</span>
                  <strong>{formatFinanceFcfa(selected.totalCredits)}</strong>
                </div>
                <div className="fin-kpi">
                  <span>Règlements</span>
                  <strong>{formatFinanceFcfa(selected.totalPayments)}</strong>
                </div>
                <div className="fin-kpi fin-kpi--warn">
                  <span>Créances</span>
                  <strong>{formatFinanceFcfa(selected.receivables)}</strong>
                </div>
                <div className="fin-kpi fin-kpi--danger">
                  <span>Échéances dépassées</span>
                  <strong>{formatFinanceFcfa(selected.overdueAmount)}</strong>
                </div>
              </div>

              <section className="fin-section">
                <h3>Mouvements</h3>
                <div className="fin-table-wrap">
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Réf.</th>
                        <th>Libellé</th>
                        <th>Débit</th>
                        <th>Crédit</th>
                        <th>Solde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.movements.length === 0 ? (
                        <tr>
                          <td colSpan={7}>Aucun mouvement sur la période</td>
                        </tr>
                      ) : (
                        selected.movements.map((m) => (
                          <tr key={`${m.kind}-${m.id}`}>
                            <td>{formatWhen(m.date)}</td>
                            <td>
                              <span className={`fin-move fin-move--${m.kind}`}>
                                {STATEMENT_MOVEMENT_LABELS[m.kind]}
                              </span>
                            </td>
                            <td>{m.ref}</td>
                            <td>{m.label}</td>
                            <td>
                              {m.debit ? formatFinanceFcfa(m.debit) : "—"}
                            </td>
                            <td>
                              {m.credit ? formatFinanceFcfa(m.credit) : "—"}
                            </td>
                            <td>{formatFinanceFcfa(m.balanceAfter)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="fin-section">
                <h3>Échéances & créances</h3>
                <div className="fin-table-wrap">
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Facture</th>
                        <th>Échéance</th>
                        <th>Montant</th>
                        <th>Réglé</th>
                        <th>Reste dû</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.dueItems.length === 0 ? (
                        <tr>
                          <td colSpan={6}>Aucune créance ouverte</td>
                        </tr>
                      ) : (
                        selected.dueItems.map((d) => (
                          <tr
                            key={d.invoiceId}
                            className={d.overdue ? "fin-row--overdue" : undefined}
                          >
                            <td>{d.invoiceNumber}</td>
                            <td>{formatWhen(d.dueDate)}</td>
                            <td>{formatFinanceFcfa(d.amount)}</td>
                            <td>{formatFinanceFcfa(d.paidAmount)}</td>
                            <td>{formatFinanceFcfa(d.remaining)}</td>
                            <td>
                              {d.overdue ? "En retard" : d.status}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </article>
      </div>

      {payOpen ? (
        <AdminOverlayPortal>
          <div
            className="doc-overlay-backdrop"
            role="presentation"
            onClick={() => setPayOpen(false)}
          >
            <div
              className="doc-overlay-dialog fin-composer-dialog"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="doc-overlay-header">
                <div className="doc-overlay-header__left">
                  <p className="doc-overlay-header__tag">FIN-REG</p>
                  <h2>Enregistrer un règlement</h2>
                </div>
                <button
                  type="button"
                  className="doc-overlay-close-btn"
                  onClick={() => setPayOpen(false)}
                >
                  ×
                </button>
              </div>
              <form
                id="fin-pay-form"
                className="doc-overlay-body fin-composer"
                onSubmit={createPayment}
              >
                <fieldset className="fin-composer__section">
                  <legend>Règlement</legend>
                  <div className="fin-composer__grid">
                    <label className="fin-composer__full">
                      <span>Client</span>
                      <input value={clientName} readOnly />
                    </label>
                    <label className="fin-composer__full">
                      <span>Facture (optionnel)</span>
                      <select
                        value={payInvoiceId}
                        onChange={(e) => setPayInvoiceId(e.target.value)}
                      >
                        <option value="">— Aucune —</option>
                        {clientInvoices.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.number} · {formatFinanceFcfa(inv.totalTTC)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Montant *</span>
                      <input
                        type="number"
                        min={1}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      <span>Date</span>
                      <input
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Mode</span>
                      <select
                        value={payMethod}
                        onChange={(e) =>
                          setPayMethod(e.target.value as FinancePaymentMethod)
                        }
                      >
                        {FINANCE_PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {FINANCE_PAYMENT_METHOD_LABELS[m]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Référence</span>
                      <input
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="N° virement…"
                      />
                    </label>
                    <label className="fin-composer__full">
                      <span>Note</span>
                      <textarea
                        rows={2}
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                      />
                    </label>
                  </div>
                </fieldset>
              </form>
              <footer className="doc-overlay-footer">
                <div className="doc-overlay-footer__actions">
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() => setPayOpen(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    form="fin-pay-form"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                  >
                    {busy ? "Enregistrement…" : "Enregistrer"}
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
