"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { IconCart, IconSearch } from "@/components/admin/Icons";
import {
  DEFAULT_PO_CONDITIONS,
  PURCHASE_ORDER_PRIORITY_LABELS,
  PURCHASE_ORDER_PRIORITIES,
  PURCHASE_ORDER_STATUS_LABELS,
  formatPoFcfa,
  makePurchaseOrderLine,
  purchaseOrderReadyToValidate,
  type PurchaseOrder,
  type PurchaseOrderLine,
  type PurchaseOrderPriority,
  type PurchaseOrderStatus,
} from "@/lib/purchase-orders-shared";
import { toast } from "@/lib/toast";

type QuoteOption = {
  id: string;
  title: string;
  company: string;
  status: string;
  totalHT: number;
};

type DraftLine = {
  id: string;
  label: string;
  quantity: string;
  unit: string;
  scheduledDate: string;
  site: string;
  unitPrice: string;
};

function emptyLine(site = "", date = ""): DraftLine {
  return {
    id: makePurchaseOrderLine({ label: "x" }).id,
    label: "",
    quantity: "1",
    unit: "u",
    scheduledDate: date,
    site,
    unitPrice: "",
  };
}

function linesFromDraft(rows: DraftLine[]): PurchaseOrderLine[] {
  return rows
    .filter((r) => r.label.trim())
    .map((r) =>
      makePurchaseOrderLine({
        id: r.id,
        label: r.label,
        quantity: Number(r.quantity) || 0,
        unit: r.unit || "u",
        scheduledDate: r.scheduledDate,
        site: r.site,
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function PurchaseOrdersWorkspace({
  embedded = false,
  opsView = false,
}: {
  embedded?: boolean;
  /** Vue opérations : focus transmis / exécution. */
  opsView?: boolean;
}) {
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [canTransmit, setCanTransmit] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | PurchaseOrderStatus | "action">(
    opsView ? "transmis_ops" : "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const [company, setCompany] = useState("");
  const [clientRef, setClientRef] = useState("");
  const [site, setSite] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [quoteRef, setQuoteRef] = useState("");
  const [orderDate, setOrderDate] = useState(today);
  const [startDate, setStartDate] = useState("");
  const [priority, setPriority] = useState<PurchaseOrderPriority>("normale");
  const [conditions, setConditions] = useState(DEFAULT_PO_CONDITIONS);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([emptyLine()]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, qRes] = await Promise.all([
        fetch("/api/purchase-orders", { cache: "no-store" }),
        fetch("/api/purchase-orders?view=quotes", { cache: "no-store" }),
      ]);
      const poData = (await poRes.json()) as {
        items?: PurchaseOrder[];
        canEdit?: boolean;
        canValidate?: boolean;
        canTransmit?: boolean;
        error?: string;
      };
      if (!poRes.ok) throw new Error(poData.error || "Chargement impossible");
      setItems(poData.items ?? []);
      setCanEdit(Boolean(poData.canEdit));
      setCanValidate(Boolean(poData.canValidate));
      setCanTransmit(Boolean(poData.canTransmit));
      if (qRes.ok) {
        const qData = (await qRes.json()) as { quotes?: QuoteOption[] };
        setQuotes(qData.quotes ?? []);
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

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "action") {
        if (
          !["brouillon", "en_validation", "valide"].includes(item.status)
        ) {
          return false;
        }
      } else if (filter !== "all" && item.status !== filter) {
        return false;
      }
      if (!q) return true;
      return [
        item.ref,
        item.clientRef,
        item.company,
        item.site,
        item.quoteRef,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, query]);

  useEffect(() => {
    if (!filtered.length) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((i) => i.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  function openComposer() {
    const d = today();
    setCompany("");
    setClientRef("");
    setSite("");
    setQuoteId("");
    setQuoteRef("");
    setOrderDate(d);
    setStartDate(d);
    setPriority("normale");
    setConditions(DEFAULT_PO_CONDITIONS);
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setNote("");
    setDraftLines([emptyLine("", d)]);
    setComposerOpen(true);
  }

  function applyQuote(id: string) {
    setQuoteId(id);
    const q = quotes.find((x) => x.id === id);
    if (!q) return;
    setCompany(q.company);
    setQuoteRef(q.id);
    if (!clientRef) setClientRef(`CMD-${q.company.slice(0, 12).toUpperCase()}`);
  }

  async function createPo(e: FormEvent) {
    e.preventDefault();
    if (!company.trim()) {
      toast.warning("Client requis");
      return;
    }
    if (!clientRef.trim() && !quoteRef.trim()) {
      toast.warning("Référence client requise");
      return;
    }
    setBusy(true);
    try {
      const lines = linesFromDraft(draftLines);
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quoteId || undefined,
          company,
          clientRef,
          site,
          quoteRef,
          orderDate,
          startDate,
          priority,
          conditions,
          contactName,
          contactEmail,
          contactPhone,
          note,
          lines: quoteId ? undefined : lines,
        }),
      });
      const data = (await res.json()) as {
        item?: PurchaseOrder;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      if (data.item) {
        setItems((prev) => [data.item!, ...prev]);
        setSelectedId(data.item.id);
      }
      setComposerOpen(false);
      toast.success("Bon de commande créé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: string, extra?: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, action, ...extra }),
      });
      const data = (await res.json()) as {
        item?: PurchaseOrder;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action impossible");
      if (data.item) {
        setItems((prev) =>
          prev.map((p) => (p.id === data.item!.id ? data.item! : p)),
        );
      }
      const messages: Record<string, string> = {
        submit: "BC soumis à validation",
        validate: "BC validé",
        reject: "BC refusé",
        transmit: "BC transmis aux opérations",
      };
      toast.success(messages[action] || "Mise à jour");
      if (action === "reject") {
        setRejectOpen(false);
        setRejectReason("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const recipe = selected ? purchaseOrderReadyToValidate(selected) : null;

  return (
    <div
      className={`leads-page po-page${embedded ? " po-page--embedded" : ""}`}
      data-testid="purchase-orders"
    >
      {embedded ? (
        <div className="fin-embedded-bar po-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">CRM · BC</p>
            <h2>Bon de commande</h2>
            <p>
              Référence client, prestations commandées, quantités, dates, site,
              conditions et validation → ops
            </p>
          </div>
          <div className="leads-header-actions">
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => void refresh()}
              disabled={loading}
            >
              Actualiser
            </button>
            {canEdit && !opsView ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={openComposer}
              >
                Nouveau BC
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Réf., client, site…"
            aria-label="Rechercher"
          />
        </label>
        <div className="leads-filters" role="tablist">
          {(
            [
              ["all", "Tous"],
              ["action", "À traiter"],
              ["brouillon", "Brouillons"],
              ["en_validation", "Validation"],
              ["valide", "Validés"],
              ["transmis_ops", "Ops"],
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
              <IconCart size={28} />
              <h2>Aucun bon de commande</h2>
              <p>
                Créez un BC depuis un devis validé ou saisissez une commande
                manuelle.
              </p>
              {canEdit && !opsView ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={openComposer}
                >
                  Nouveau BC
                </button>
              ) : null}
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`leads-card po-card${selectedId === item.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{item.company}</strong>
                    <time>{formatPoFcfa(item.totalHT)}</time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-pill">{item.ref}</span>
                    <span className={`po-status po-status--${item.status}`}>
                      {PURCHASE_ORDER_STATUS_LABELS[item.status]}
                    </span>
                  </span>
                  <span className="leads-card__preview">
                    {item.clientRef || "Sans réf. client"} · {item.site || "Site —"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <h2>Sélectionnez un bon de commande</h2>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    <span className={`po-status po-status--${selected.status}`}>
                      {PURCHASE_ORDER_STATUS_LABELS[selected.status]}
                    </span>
                    <span>{selected.ref}</span>
                    <span>
                      {PURCHASE_ORDER_PRIORITY_LABELS[selected.priority]}
                    </span>
                  </p>
                  <h2>{selected.company}</h2>
                  <p className="leads-detail__sub">
                    Réf. client {selected.clientRef || "—"} · commande{" "}
                    {formatWhen(selected.orderDate)}
                  </p>
                </div>
                <div className="fin-detail-total">
                  <span>Total HT</span>
                  <strong>{formatPoFcfa(selected.totalHT)}</strong>
                </div>
              </header>

              <section className="fin-section">
                <h3>Cadre commande</h3>
                <dl className="fin-dl">
                  <div>
                    <dt>Référence client</dt>
                    <dd>{selected.clientRef || "—"}</dd>
                  </div>
                  <div>
                    <dt>Devis lié</dt>
                    <dd>{selected.quoteRef || "—"}</dd>
                  </div>
                  <div>
                    <dt>Site</dt>
                    <dd>{selected.site || "—"}</dd>
                  </div>
                  <div>
                    <dt>Date commande</dt>
                    <dd>{formatWhen(selected.orderDate)}</dd>
                  </div>
                  <div>
                    <dt>Date démarrage</dt>
                    <dd>{formatWhen(selected.startDate)}</dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>
                      {selected.contactName || "—"}
                      {selected.contactPhone
                        ? ` · ${selected.contactPhone}`
                        : ""}
                      {selected.contactEmail
                        ? ` · ${selected.contactEmail}`
                        : ""}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="fin-section">
                <h3>Prestations commandées</h3>
                <div className="fin-table-wrap">
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Prestation</th>
                        <th>Qté</th>
                        <th>Unité</th>
                        <th>Date</th>
                        <th>Site</th>
                        <th>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.lines.map((l) => (
                        <tr key={l.id}>
                          <td>{l.label}</td>
                          <td>{l.quantity}</td>
                          <td>{l.unit}</td>
                          <td>{formatWhen(l.scheduledDate)}</td>
                          <td>{l.site || selected.site || "—"}</td>
                          <td>{formatPoFcfa(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="fin-section">
                <h3>Conditions</h3>
                <p className="fin-block">{selected.conditions || "—"}</p>
              </section>

              {recipe && !recipe.ok ? (
                <div className="offers-recipe is-blocked">
                  <strong>Avant validation</strong>
                  <ul>
                    {recipe.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : recipe?.ok ? (
                <div className="offers-recipe is-ok">
                  <strong>Prêt à valider</strong>
                  <p>
                    Réf. client, prestations, dates, site et conditions
                    renseignés.
                  </p>
                </div>
              ) : null}

              <div className="fin-actions">
                {canEdit &&
                (selected.status === "brouillon" ||
                  selected.status === "refuse") ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy || !recipe?.ok}
                    onClick={() => void runAction("submit")}
                  >
                    Soumettre validation
                  </button>
                ) : null}
                {canValidate && selected.status === "en_validation" ? (
                  <>
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy || !recipe?.ok}
                      onClick={() => void runAction("validate")}
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={busy}
                      onClick={() => setRejectOpen(true)}
                    >
                      Refuser
                    </button>
                  </>
                ) : null}
                {canTransmit && selected.status === "valide" ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                    onClick={() => void runAction("transmit")}
                  >
                    Transmettre aux ops
                  </button>
                ) : null}
                {selected.validatedAt ? (
                  <span className="po-validated-meta">
                    Validé le {formatWhen(selected.validatedAt)}
                    {selected.validatedByName
                      ? ` · ${selected.validatedByName}`
                      : ""}
                  </span>
                ) : null}
              </div>

              {selected.rejectionReason ? (
                <p className="fin-block">
                  <strong>Motif de refus</strong>
                  {selected.rejectionReason}
                </p>
              ) : null}

              <section className="fin-history">
                <h3>Traçabilité</h3>
                <ol>
                  {[...selected.history].reverse().map((h) => (
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
                  <p className="doc-overlay-header__tag">CRM-BC</p>
                  <h2>Nouveau bon de commande</h2>
                </div>
                <button
                  type="button"
                  className="doc-overlay-close-btn"
                  onClick={() => setComposerOpen(false)}
                >
                  ×
                </button>
              </div>
              <form
                id="po-create-form"
                className="doc-overlay-body fin-composer"
                onSubmit={createPo}
              >
                <fieldset className="fin-composer__section">
                  <legend>Client & références</legend>
                  <div className="fin-composer__grid">
                    <label className="fin-composer__full">
                      <span>Depuis un devis (optionnel)</span>
                      <select
                        value={quoteId}
                        onChange={(e) => applyQuote(e.target.value)}
                      >
                        <option value="">— Saisie manuelle —</option>
                        {quotes.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.company} · {q.id} · {formatPoFcfa(q.totalHT)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Client *</span>
                      <input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      <span>Référence client *</span>
                      <input
                        value={clientRef}
                        onChange={(e) => setClientRef(e.target.value)}
                        placeholder="N° BC client"
                        required={!quoteRef}
                      />
                    </label>
                    <label>
                      <span>Site *</span>
                      <input
                        value={site}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSite(v);
                          setDraftLines((rows) =>
                            rows.map((r) => ({ ...r, site: r.site || v })),
                          );
                        }}
                        required
                      />
                    </label>
                    <label>
                      <span>Réf. devis NECS</span>
                      <input
                        value={quoteRef}
                        onChange={(e) => setQuoteRef(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Date commande</span>
                      <input
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Date démarrage</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Priorité</span>
                      <select
                        value={priority}
                        onChange={(e) =>
                          setPriority(e.target.value as PurchaseOrderPriority)
                        }
                      >
                        {PURCHASE_ORDER_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {PURCHASE_ORDER_PRIORITY_LABELS[p]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Contact</span>
                      <input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Téléphone</span>
                      <input
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                      />
                    </label>
                    <label className="fin-composer__full">
                      <span>E-mail contact</span>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                    </label>
                  </div>
                </fieldset>

                {!quoteId ? (
                  <fieldset className="fin-composer__section">
                    <legend>Prestations (qté × dates × site)</legend>
                    <div className="fin-lines-edit">
                      {draftLines.map((line, idx) => (
                        <div key={line.id} className="po-line-row">
                          <input
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
                            type="date"
                            value={line.scheduledDate}
                            onChange={(e) =>
                              setDraftLines((rows) =>
                                rows.map((r, i) =>
                                  i === idx
                                    ? { ...r, scheduledDate: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          />
                          <input
                            placeholder="Site ligne"
                            value={line.site}
                            onChange={(e) =>
                              setDraftLines((rows) =>
                                rows.map((r, i) =>
                                  i === idx ? { ...r, site: e.target.value } : r,
                                ),
                              )
                            }
                          />
                          <input
                            type="number"
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
                          setDraftLines((rows) => [
                            ...rows,
                            emptyLine(site, startDate || orderDate),
                          ])
                        }
                      >
                        + Ligne
                      </button>
                    </div>
                  </fieldset>
                ) : (
                  <p className="fin-composer__issuer">
                    Les prestations seront reprises du devis sélectionné.
                  </p>
                )}

                <fieldset className="fin-composer__section">
                  <legend>Conditions</legend>
                  <div className="fin-composer__grid">
                    <label className="fin-composer__full">
                      <span>Conditions *</span>
                      <textarea
                        rows={3}
                        value={conditions}
                        onChange={(e) => setConditions(e.target.value)}
                        required
                      />
                    </label>
                    <label className="fin-composer__full">
                      <span>Note</span>
                      <textarea
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
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
                    onClick={() => setComposerOpen(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    form="po-create-form"
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

      {rejectOpen && selected ? (
        <AdminOverlayPortal>
          <div
            className="doc-overlay-backdrop"
            role="presentation"
            onClick={() => setRejectOpen(false)}
          >
            <div
              className="doc-overlay-dialog"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              style={{ width: "min(420px, 94vw)" }}
            >
              <div className="doc-overlay-header">
                <div className="doc-overlay-header__left">
                  <h2>Refuser le BC</h2>
                </div>
                <button
                  type="button"
                  className="doc-overlay-close-btn"
                  onClick={() => setRejectOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className="doc-overlay-body">
                <label className="fin-composer__grid" style={{ display: "grid" }}>
                  <span>Motif</span>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </label>
              </div>
              <footer className="doc-overlay-footer">
                <div className="doc-overlay-footer__actions">
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() => setRejectOpen(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy || !rejectReason.trim()}
                    onClick={() =>
                      void runAction("reject", { reason: rejectReason })
                    }
                  >
                    Confirmer le refus
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
