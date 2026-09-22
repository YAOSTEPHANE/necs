"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { IconMail, IconSearch } from "@/components/admin/Icons";
import {
  FINANCE_ACK_CHANNEL_LABELS,
  FINANCE_ACK_CHANNELS,
  FINANCE_ACK_DOC_TYPE_LABELS,
  FINANCE_ACK_DOC_TYPES,
  FINANCE_ACK_STATUS_LABELS,
  type FinanceAck,
  type FinanceAckChannel,
  type FinanceAckDocType,
  type FinanceAckStatus,
  type FinanceCreditNote,
  type FinanceInvoice,
  type FinanceQuote,
  type FinanceStatement,
} from "@/lib/finance-shared";
import { toast } from "@/lib/toast";

function formatDateTime(ts: string | null | undefined) {
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

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(local: string) {
  if (!local) return new Date().toISOString();
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function FinanceAckWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<FinanceAck[]>([]);
  const [quotes, setQuotes] = useState<FinanceQuote[]>([]);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [credits, setCredits] = useState<FinanceCreditNote[]>([]);
  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | FinanceAckStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const [documentType, setDocumentType] =
    useState<FinanceAckDocType>("facture");
  const [documentId, setDocumentId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentLabel, setDocumentLabel] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientOrg, setRecipientOrg] = useState("");
  const [channel, setChannel] = useState<FinanceAckChannel>("email");
  const [transmittedAt, setTransmittedAt] = useState(
    toLocalInputValue(new Date().toISOString()),
  );
  const [status, setStatus] = useState<FinanceAckStatus>("transmis");
  const [proofNote, setProofNote] = useState("");
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [acksRes, qRes, iRes, aRes, sRes] = await Promise.all([
        fetch("/api/finance?resource=acks", { cache: "no-store" }),
        fetch("/api/finance?resource=devis", { cache: "no-store" }),
        fetch("/api/finance?resource=factures", { cache: "no-store" }),
        fetch("/api/finance?resource=avoirs", { cache: "no-store" }),
        fetch("/api/finance?resource=releves", { cache: "no-store" }),
      ]);
      const acksData = (await acksRes.json()) as {
        items?: FinanceAck[];
        canEdit?: boolean;
        error?: string;
      };
      if (!acksRes.ok) throw new Error(acksData.error || "Chargement impossible");
      setItems(acksData.items ?? []);
      setCanEdit(Boolean(acksData.canEdit));
      setQuotes(((await qRes.json()) as { items?: FinanceQuote[] }).items ?? []);
      setInvoices(
        ((await iRes.json()) as { items?: FinanceInvoice[] }).items ?? [],
      );
      setCredits(
        ((await aRes.json()) as { items?: FinanceCreditNote[] }).items ?? [],
      );
      setStatements(
        ((await sRes.json()) as { items?: FinanceStatement[] }).items ?? [],
      );
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
      if (filter !== "all" && item.status !== filter) return false;
      if (!q) return true;
      return [
        item.number,
        item.documentNumber,
        item.documentLabel,
        item.recipientName,
        item.recipientOrg,
        item.channel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, query]);

  const docOptions = useMemo(() => {
    if (documentType === "devis") {
      return quotes.map((d) => ({
        id: d.id,
        number: d.number,
        label: `${d.number} · ${d.clientName}`,
        recipientName: d.contactName,
        recipientEmail: d.contactEmail,
        recipientOrg: d.clientName,
      }));
    }
    if (documentType === "facture") {
      return invoices.map((d) => ({
        id: d.id,
        number: d.number,
        label: `${d.number} · ${d.clientName}`,
        recipientName: d.contactName,
        recipientEmail: d.contactEmail,
        recipientOrg: d.clientName,
      }));
    }
    if (documentType === "avoir") {
      return credits.map((d) => ({
        id: d.id,
        number: d.number,
        label: `${d.number} · ${d.clientName}`,
        recipientName: "",
        recipientEmail: "",
        recipientOrg: d.clientName,
      }));
    }
    if (documentType === "releve") {
      return statements.map((d) => ({
        id: d.id,
        number: d.number,
        label: `${d.number} · ${d.clientName}`,
        recipientName: "",
        recipientEmail: "",
        recipientOrg: d.clientName,
      }));
    }
    return [];
  }, [documentType, quotes, invoices, credits, statements]);

  function openComposer() {
    setDocumentType("facture");
    setDocumentId("");
    setDocumentNumber("");
    setDocumentLabel("");
    setRecipientName("");
    setRecipientEmail("");
    setRecipientOrg("");
    setChannel("email");
    setTransmittedAt(toLocalInputValue(new Date().toISOString()));
    setStatus("transmis");
    setProofNote("");
    setNote("");
    setComposerOpen(true);
  }

  function applyDocChoice(id: string) {
    setDocumentId(id);
    const doc = docOptions.find((d) => d.id === id);
    if (!doc) return;
    setDocumentNumber(doc.number);
    setDocumentLabel(doc.label);
    if (doc.recipientName) setRecipientName(doc.recipientName);
    if (doc.recipientEmail) setRecipientEmail(doc.recipientEmail);
    if (doc.recipientOrg) setRecipientOrg(doc.recipientOrg);
  }

  async function createAck(e: FormEvent) {
    e.preventDefault();
    if (!recipientName.trim()) {
      toast.warning("Destinataire requis");
      return;
    }
    if (!documentNumber.trim() && !documentLabel.trim()) {
      toast.warning("Document transmis requis");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "acks",
          documentType,
          documentId,
          documentNumber,
          documentLabel,
          recipientName,
          recipientEmail,
          recipientOrg,
          channel,
          transmittedAt: fromLocalInputValue(transmittedAt),
          status,
          proofNote,
          note,
        }),
      });
      const data = (await res.json()) as { item?: FinanceAck; error?: string };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      if (data.item) {
        setItems((prev) => [data.item!, ...prev]);
        setSelectedId(data.item.id);
      }
      setComposerOpen(false);
      toast.success("Preuve de transmission enregistrée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function patchAck(action: string, msg: string) {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "acks",
          id: selected.id,
          action,
        }),
      });
      const data = (await res.json()) as { item?: FinanceAck; error?: string };
      if (!res.ok) throw new Error(data.error || "Action impossible");
      if (data.item) {
        setItems((prev) =>
          prev.map((p) => (p.id === data.item!.id ? data.item! : p)),
        );
      }
      toast.success(msg);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`leads-page fin-page${embedded ? " fin-page--embedded" : ""}`}
      data-testid="finance-acks"
    >
      {embedded ? (
        <div className="fin-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">FIN-ACK</p>
            <h2>Accusé de réception / preuve de transmission</h2>
            <p>Document transmis, destinataire, canal, date/heure et statut</p>
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
            {canEdit ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={openComposer}
              >
                Nouvelle preuve
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
            placeholder="Document, destinataire…"
            aria-label="Rechercher"
          />
        </label>
        <div className="leads-filters" role="tablist">
          {(
            [
              ["all", "Tous"],
              ["en_attente", "En attente"],
              ["transmis", "Transmis"],
              ["accuse", "Accusés"],
              ["echec", "Échecs"],
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
              <IconMail size={28} />
              <h2>Aucune preuve</h2>
              <p>Enregistrez la transmission d’un devis, facture ou relevé.</p>
              {canEdit ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={openComposer}
                >
                  Nouvelle preuve
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
                    <strong>
                      {item.documentNumber || item.documentLabel}
                    </strong>
                    <time>{formatDateTime(item.transmittedAt)}</time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-pill">{item.number}</span>
                    <span className={`fin-ack-status fin-ack-status--${item.status}`}>
                      {FINANCE_ACK_STATUS_LABELS[item.status]}
                    </span>
                  </span>
                  <span className="leads-card__preview">
                    {item.recipientName} ·{" "}
                    {FINANCE_ACK_CHANNEL_LABELS[item.channel]}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <h2>Sélectionnez une preuve</h2>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    <span
                      className={`fin-ack-status fin-ack-status--${selected.status}`}
                    >
                      {FINANCE_ACK_STATUS_LABELS[selected.status]}
                    </span>
                    <span>{selected.number}</span>
                  </p>
                  <h2>
                    {selected.documentLabel || selected.documentNumber}
                  </h2>
                  <p className="leads-detail__sub">
                    {FINANCE_ACK_DOC_TYPE_LABELS[selected.documentType]} ·{" "}
                    {formatDateTime(selected.transmittedAt)}
                  </p>
                </div>
              </header>

              <section className="fin-section">
                <h3>Document transmis</h3>
                <dl className="fin-dl">
                  <div>
                    <dt>Type</dt>
                    <dd>
                      {FINANCE_ACK_DOC_TYPE_LABELS[selected.documentType]}
                    </dd>
                  </div>
                  <div>
                    <dt>N°</dt>
                    <dd>{selected.documentNumber || "—"}</dd>
                  </div>
                  <div>
                    <dt>Libellé</dt>
                    <dd>{selected.documentLabel || "—"}</dd>
                  </div>
                </dl>
              </section>

              <section className="fin-section">
                <h3>Destinataire</h3>
                <dl className="fin-dl">
                  <div>
                    <dt>Nom</dt>
                    <dd>{selected.recipientName}</dd>
                  </div>
                  <div>
                    <dt>Organisation</dt>
                    <dd>{selected.recipientOrg || "—"}</dd>
                  </div>
                  <div>
                    <dt>E-mail</dt>
                    <dd>{selected.recipientEmail || "—"}</dd>
                  </div>
                </dl>
              </section>

              <section className="fin-section">
                <h3>Transmission</h3>
                <dl className="fin-dl">
                  <div>
                    <dt>Canal</dt>
                    <dd>{FINANCE_ACK_CHANNEL_LABELS[selected.channel]}</dd>
                  </div>
                  <div>
                    <dt>Date / heure</dt>
                    <dd>{formatDateTime(selected.transmittedAt)}</dd>
                  </div>
                  <div>
                    <dt>Statut</dt>
                    <dd>{FINANCE_ACK_STATUS_LABELS[selected.status]}</dd>
                  </div>
                </dl>
                {selected.proofNote ? (
                  <p className="fin-block">
                    <strong>Preuve / détail</strong>
                    {selected.proofNote}
                  </p>
                ) : null}
              </section>

              {canEdit ? (
                <div className="fin-actions">
                  {selected.status === "en_attente" ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy}
                      onClick={() =>
                        void patchAck("transmit", "Marqué transmis")
                      }
                    >
                      Marquer transmis
                    </button>
                  ) : null}
                  {selected.status === "transmis" ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy}
                      onClick={() =>
                        void patchAck("ack", "Accusé de réception enregistré")
                      }
                    >
                      Accusé reçu
                    </button>
                  ) : null}
                  {selected.status !== "echec" &&
                  selected.status !== "accuse" ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={busy}
                      onClick={() => void patchAck("fail", "Échec enregistré")}
                    >
                      Marquer échec
                    </button>
                  ) : null}
                </div>
              ) : null}

              <section className="fin-history">
                <h3>Traçabilité</h3>
                <ol>
                  {[...selected.history].reverse().map((h) => (
                    <li key={h.id}>
                      <strong>{h.detail}</strong>
                      <span>
                        {formatDateTime(h.at)} · {h.byName}
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
                  <p className="doc-overlay-header__tag">FIN-ACK</p>
                  <h2>Nouvelle preuve de transmission</h2>
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
                id="fin-ack-form"
                className="doc-overlay-body fin-composer"
                onSubmit={createAck}
              >
                <fieldset className="fin-composer__section">
                  <legend>Document transmis</legend>
                  <div className="fin-composer__grid">
                    <label>
                      <span>Type</span>
                      <select
                        value={documentType}
                        onChange={(e) => {
                          setDocumentType(e.target.value as FinanceAckDocType);
                          setDocumentId("");
                          setDocumentNumber("");
                          setDocumentLabel("");
                        }}
                      >
                        {FINANCE_ACK_DOC_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {FINANCE_ACK_DOC_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Document existant</span>
                      <select
                        value={documentId}
                        onChange={(e) => applyDocChoice(e.target.value)}
                      >
                        <option value="">— Saisie libre —</option>
                        {docOptions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>N° document</span>
                      <input
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Libellé</span>
                      <input
                        value={documentLabel}
                        onChange={(e) => setDocumentLabel(e.target.value)}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>Destinataire</legend>
                  <div className="fin-composer__grid">
                    <label>
                      <span>Nom *</span>
                      <input
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      <span>Organisation</span>
                      <input
                        value={recipientOrg}
                        onChange={(e) => setRecipientOrg(e.target.value)}
                      />
                    </label>
                    <label className="fin-composer__full">
                      <span>E-mail</span>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>Canal, date/heure & statut</legend>
                  <div className="fin-composer__grid">
                    <label>
                      <span>Canal</span>
                      <select
                        value={channel}
                        onChange={(e) =>
                          setChannel(e.target.value as FinanceAckChannel)
                        }
                      >
                        {FINANCE_ACK_CHANNELS.map((c) => (
                          <option key={c} value={c}>
                            {FINANCE_ACK_CHANNEL_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Date / heure</span>
                      <input
                        type="datetime-local"
                        value={transmittedAt}
                        onChange={(e) => setTransmittedAt(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Statut</span>
                      <select
                        value={status}
                        onChange={(e) =>
                          setStatus(e.target.value as FinanceAckStatus)
                        }
                      >
                        {(
                          Object.keys(
                            FINANCE_ACK_STATUS_LABELS,
                          ) as FinanceAckStatus[]
                        ).map((s) => (
                          <option key={s} value={s}>
                            {FINANCE_ACK_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="fin-composer__full">
                      <span>Détail de preuve</span>
                      <textarea
                        rows={3}
                        value={proofNote}
                        onChange={(e) => setProofNote(e.target.value)}
                        placeholder="Ex. e-mail envoyé, ID message, signature…"
                      />
                    </label>
                    <label className="fin-composer__full">
                      <span>Note interne</span>
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
                    form="fin-ack-form"
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
