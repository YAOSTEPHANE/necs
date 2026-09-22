"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { IconMail, IconSearch } from "@/components/admin/Icons";
import {
  DEFAULT_REMINDER_BODY,
  DEFAULT_REMINDER_SUBJECT,
  daysLateFromDue,
  formatFinanceFcfa,
  makeReminderInvoiceLine,
  REMINDER_CHANNEL_LABELS,
  REMINDER_LEVEL_LABELS,
  REMINDER_STATUS_LABELS,
  reminderReady,
  type FinanceInvoice,
  type FinanceReminder,
  type ReminderChannel,
  type ReminderLevel,
  type ReminderStatus,
} from "@/lib/finance-shared";
import { toast } from "@/lib/toast";

type DraftInv = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  dueDate: string;
  amountDue: string;
};

function emptyInv(): DraftInv {
  return {
    id: makeReminderInvoiceLine({
      invoiceNumber: "x",
      amountDue: 0,
    }).id,
    invoiceId: "",
    invoiceNumber: "",
    dueDate: "",
    amountDue: "",
  };
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

export function FinanceReminderWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<FinanceReminder[]>([]);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ReminderStatus | ReminderLevel>(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const [clientName, setClientName] = useState("");
  const [level, setLevel] = useState<ReminderLevel>("R1");
  const [channel, setChannel] = useState<ReminderChannel>("email");
  const [subject, setSubject] = useState(DEFAULT_REMINDER_SUBJECT);
  const [body, setBody] = useState(DEFAULT_REMINDER_BODY);
  const [note, setNote] = useState("");
  const [draftInvs, setDraftInvs] = useState<DraftInv[]>([emptyInv()]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, iRes] = await Promise.all([
        fetch("/api/finance?resource=relances", { cache: "no-store" }),
        fetch("/api/finance?resource=factures", { cache: "no-store" }),
      ]);
      const rData = (await rRes.json()) as {
        items?: FinanceReminder[];
        canEdit?: boolean;
        error?: string;
      };
      if (!rRes.ok) throw new Error(rData.error || "Chargement impossible");
      setItems(rData.items || []);
      setCanEdit(Boolean(rData.canEdit));
      if (iRes.ok) {
        const iData = (await iRes.json()) as { items?: FinanceInvoice[] };
        setInvoices(iData.items || []);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const overdueInvoices = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return invoices.filter(
      (i) =>
        (i.status === "envoye" || i.status === "valide") &&
        i.dueDate &&
        i.dueDate < today &&
        i.totalTTC > 0,
    );
  }, [invoices]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === "R1" || filter === "R2" || filter === "R3" || filter === "R4") {
        if (i.level !== filter) return false;
      } else if (filter !== "all" && i.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        i.number.toLowerCase().includes(q) ||
        i.clientName.toLowerCase().includes(q) ||
        i.subject.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  function resetComposer() {
    setClientName("");
    setLevel("R1");
    setChannel("email");
    setSubject(DEFAULT_REMINDER_SUBJECT);
    setBody(DEFAULT_REMINDER_BODY);
    setNote("");
    setDraftInvs([emptyInv()]);
  }

  function pickClientOverdue(name: string) {
    setClientName(name);
    const rows = overdueInvoices.filter(
      (i) => i.clientName.toLowerCase() === name.toLowerCase(),
    );
    if (!rows.length) {
      setDraftInvs([emptyInv()]);
      return;
    }
    setDraftInvs(
      rows.map((i) => ({
        id: makeReminderInvoiceLine({
          invoiceNumber: i.number,
          amountDue: i.totalTTC,
        }).id,
        invoiceId: i.id,
        invoiceNumber: i.number,
        dueDate: i.dueDate,
        amountDue: String(i.totalTTC),
      })),
    );
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const invoicesPayload = draftInvs
      .filter((r) => r.invoiceNumber.trim() && Number(r.amountDue) > 0)
      .map((r) =>
        makeReminderInvoiceLine({
          id: r.id,
          invoiceId: r.invoiceId,
          invoiceNumber: r.invoiceNumber,
          dueDate: r.dueDate,
          amountDue: Number(r.amountDue) || 0,
          daysLate: daysLateFromDue(r.dueDate),
        }),
      );
    setBusy(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "relances",
          clientName,
          level,
          channel,
          subject,
          body,
          note,
          invoices: invoicesPayload,
        }),
      });
      const data = (await res.json()) as {
        item?: FinanceReminder;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      if (data.item) {
        setItems((prev) => [data.item!, ...prev]);
        setSelectedId(data.item.id);
        toast.success(`Relance ${data.item.number} créée`);
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
          resource: "relances",
          id: selected.id,
          action,
        }),
      });
      const data = (await res.json()) as {
        item?: FinanceReminder;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action impossible");
      if (data.item) {
        setItems((prev) =>
          prev.map((x) => (x.id === data.item!.id ? data.item! : x)),
        );
        toast.success(
          action === "send" ? "Relance envoyée" : "Relance mise à jour",
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const ready = selected ? reminderReady(selected) : null;
  const overdueClients = useMemo(() => {
    const set = new Set(overdueInvoices.map((i) => i.clientName));
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [overdueInvoices]);

  return (
    <div
      className={`leads-page fin-page rlc-page${embedded ? " fin-page--embedded" : ""}`}
    >
      {embedded ? (
        <div className="fin-embedded-bar rlc-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">Recouvrement</p>
            <h2>Lettre / e-mail de relance client</h2>
          </div>
          {canEdit ? (
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={() => {
                resetComposer();
                setComposerOpen(true);
              }}
            >
              Nouvelle relance
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="leads-kpis" aria-label="Indicateurs relances">
        <article>
          <strong>{items.length}</strong>
          <p>Relances</p>
        </article>
        <article>
          <strong>{items.filter((i) => i.status === "envoyee").length}</strong>
          <p>Envoyées</p>
        </article>
        <article>
          <strong>{overdueInvoices.length}</strong>
          <p>Factures échues</p>
        </article>
        <article>
          <strong>
            {formatFinanceFcfa(
              items
                .filter((i) => i.status !== "soldee")
                .reduce((s, i) => s + i.totalDue, 0),
            )}
          </strong>
          <p>Encours rappelé</p>
        </article>
      </section>

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Client, n°, objet…"
          />
        </label>
        <div className="leads-filters">
          {(
            [
              ["all", "Tous"],
              ["brouillon", "Brouillons"],
              ["envoyee", "Envoyées"],
              ["R2", "R2+"],
              ["R3", "R3"],
              ["R4", "R4"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={filter === k ? "is-active" : undefined}
              onClick={() => setFilter(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="leads-layout">
        <ul className="leads-list">
          {loading ? (
            <li className="leads-empty">Chargement…</li>
          ) : filtered.length === 0 ? (
            <li className="leads-empty">Aucune relance</li>
          ) : (
            filtered.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  className={`leads-card${selectedId === i.id ? " is-selected" : ""}`}
                  onClick={() => setSelectedId(i.id)}
                >
                  <span className="leads-card__top">
                    <strong>{i.number}</strong>
                    <span className={`rlc-level rlc-level--${i.level}`}>
                      {i.level}
                    </span>
                  </span>
                  <span className="leads-card__title">{i.clientName}</span>
                  <span className="leads-card__meta">
                    {REMINDER_STATUS_LABELS[i.status]} ·{" "}
                    {formatFinanceFcfa(i.totalDue)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="leads-detail-wrap">
          {!selected ? (
            <div className="leads-empty-detail">
              <IconMail size={28} />
              <p>Sélectionnez une relance</p>
            </div>
          ) : (
            <article className="leads-detail">
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    {selected.number} · {REMINDER_LEVEL_LABELS[selected.level]}
                  </p>
                  <h2>{selected.clientName}</h2>
                  <p className="leads-detail__sub">
                    {REMINDER_CHANNEL_LABELS[selected.channel]} ·{" "}
                    {REMINDER_STATUS_LABELS[selected.status]}
                    {selected.sentAt
                      ? ` · envoyée le ${formatWhen(selected.sentAt)}`
                      : ""}
                  </p>
                </div>
                <div className="leads-detail__actions">
                  {canEdit && selected.status === "brouillon" ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy || (ready != null && !ready.ok)}
                      onClick={() => void patchAction("send")}
                    >
                      Envoyer
                    </button>
                  ) : null}
                  {canEdit && selected.status === "envoyee" ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={busy}
                      onClick={() => void patchAction("settle")}
                    >
                      Marquer soldée
                    </button>
                  ) : null}
                </div>
              </header>

              <section className="contracts-section">
                <h3>Message</h3>
                <p>
                  <strong>Objet :</strong> {selected.subject}
                </p>
                <pre className="rlc-body">{selected.body}</pre>
              </section>

              <section className="contracts-section">
                <h3>Factures · montants dus · échéances</h3>
                <div className="quotes-table-wrap">
                  <table className="quotes-table">
                    <thead>
                      <tr>
                        <th>Facture</th>
                        <th>Échéance</th>
                        <th>Montant dû</th>
                        <th>Jours de retard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td>{inv.invoiceNumber}</td>
                          <td>{formatWhen(inv.dueDate)}</td>
                          <td>{formatFinanceFcfa(inv.amountDue)}</td>
                          <td>{inv.daysLate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="contracts-amount">
                  Total dû : {formatFinanceFcfa(selected.totalDue)}
                </p>
              </section>

              <section className="contracts-section">
                <h3>Historique des niveaux de relance</h3>
                {selected.reminderHistory.length === 0 ? (
                  <p className="leads-empty">Aucun envoi antérieur pour ce client</p>
                ) : (
                  <ol className="avn-versions">
                    {selected.reminderHistory.map((h) => (
                      <li key={h.id}>
                        <strong>{REMINDER_LEVEL_LABELS[h.level]}</strong>
                        <time>{formatWhen(h.at)}</time>
                        <span>
                          {REMINDER_CHANNEL_LABELS[h.channel]} · {h.byName} ·{" "}
                          {h.detail}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </article>
          )}
        </div>
      </div>

      {composerOpen ? (
        <AdminOverlayPortal>
          <div className="contracts-composer-overlay sc-composer-overlay">
            <form className="sc-composer" onSubmit={(e) => void onCreate(e)}>
              <header>
                <h2>Nouvelle relance</h2>
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  onClick={() => setComposerOpen(false)}
                >
                  Fermer
                </button>
              </header>
              <div className="sc-composer__body">
                <div className="need-qual__grid">
                  <label>
                    Client *
                    {overdueClients.length > 0 ? (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) pickClientOverdue(e.target.value);
                        }}
                      >
                        <option value="">Choisir un client à échéance…</option>
                        {overdueClients.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <input
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Raison sociale"
                    />
                  </label>
                  <label>
                    Niveau *
                    <select
                      value={level}
                      onChange={(e) =>
                        setLevel(e.target.value as ReminderLevel)
                      }
                    >
                      {Object.entries(REMINDER_LEVEL_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Canal
                    <select
                      value={channel}
                      onChange={(e) =>
                        setChannel(e.target.value as ReminderChannel)
                      }
                    >
                      {Object.entries(REMINDER_CHANNEL_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="need-qual__full">
                    Objet
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </label>
                  <label className="need-qual__full">
                    Corps du message *
                    <textarea
                      required
                      rows={5}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  </label>
                </div>
                <fieldset>
                  <legend>Factures dues</legend>
                  {draftInvs.map((row, idx) => (
                    <div key={row.id} className="sc-line rlc-line">
                      <input
                        placeholder="N° facture"
                        value={row.invoiceNumber}
                        onChange={(e) => {
                          const next = [...draftInvs];
                          next[idx] = {
                            ...row,
                            invoiceNumber: e.target.value,
                          };
                          setDraftInvs(next);
                        }}
                      />
                      <input
                        type="date"
                        value={row.dueDate}
                        onChange={(e) => {
                          const next = [...draftInvs];
                          next[idx] = { ...row, dueDate: e.target.value };
                          setDraftInvs(next);
                        }}
                      />
                      <input
                        placeholder="Montant dû"
                        value={row.amountDue}
                        onChange={(e) => {
                          const next = [...draftInvs];
                          next[idx] = { ...row, amountDue: e.target.value };
                          setDraftInvs(next);
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() =>
                      setDraftInvs((rows) => [...rows, emptyInv()])
                    }
                  >
                    + Facture
                  </button>
                </fieldset>
              </div>
              <footer>
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  onClick={() => setComposerOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-admin btn-admin--primary"
                  disabled={busy}
                >
                  Créer la relance
                </button>
              </footer>
            </form>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </div>
  );
}
