"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { IconSearch, IconTruck } from "@/components/admin/Icons";
import {
  DELIVERY_LINE_STATUS_LABELS,
  DELIVERY_PROOF_KIND_LABELS,
  DELIVERY_SIGNATURE_ROLE_LABELS,
  DELIVERY_STATUS_LABELS,
  defaultSignatures,
  deliveryNoteReady,
  makeDeliveryLine,
  type DeliveryLine,
  type DeliveryNote,
  type DeliveryNoteStatus,
  type DeliveryProof,
  type DeliveryProofKind,
  type DeliverySignature,
} from "@/lib/delivery-notes-shared";
import { toast } from "@/lib/toast";

type DraftLine = {
  id: string;
  label: string;
  unit: string;
  qtyOrdered: string;
  qtyDelivered: string;
  qtyReceived: string;
  lot: string;
  articleSku: string;
};

function emptyLine(): DraftLine {
  return {
    id: makeDeliveryLine({ label: "x" }).id,
    label: "",
    unit: "u",
    qtyOrdered: "1",
    qtyDelivered: "1",
    qtyReceived: "0",
    lot: "",
    articleSku: "",
  };
}

function linesFromDraft(
  rows: DraftLine[],
  forReceive: boolean,
): DeliveryLine[] {
  return rows
    .filter((r) => r.label.trim())
    .map((r) =>
      makeDeliveryLine({
        id: r.id,
        label: r.label,
        unit: r.unit || "u",
        articleSku: r.articleSku,
        lot: r.lot,
        qtyOrdered: Number(r.qtyOrdered) || 0,
        qtyDelivered: Number(r.qtyDelivered) || 0,
        qtyReceived: forReceive
          ? Number(r.qtyReceived) || 0
          : Number(r.qtyDelivered) || 0,
      }),
    );
}

function formatWhen(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts.length <= 10 ? `${ts}T12:00:00` : ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DeliveryNotesWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canReceive, setCanReceive] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | DeliveryNoteStatus | "action">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const [siteName, setSiteName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [deliveryAt, setDeliveryAt] = useState(
    toLocalInputValue(new Date().toISOString()),
  );
  const [carrierName, setCarrierName] = useState("");
  const [daRef, setDaRef] = useState("");
  const [note, setNote] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([emptyLine()]);

  const [recvLines, setRecvLines] = useState<DraftLine[]>([]);
  const [reserves, setReserves] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [livreurName, setLivreurName] = useState("");
  const [livreurSigned, setLivreurSigned] = useState(true);
  const [receiverSigned, setReceiverSigned] = useState(true);
  const [proofKind, setProofKind] = useState<DeliveryProofKind>("colis");
  const [proofUrl, setProofUrl] = useState("");
  const [proofCaption, setProofCaption] = useState("");
  const [updateStock, setUpdateStock] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/delivery-notes", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: DeliveryNote[];
        canEdit?: boolean;
        canReceive?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items ?? []);
      setCanEdit(Boolean(data.canEdit));
      setCanReceive(Boolean(data.canReceive));
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
          !["brouillon", "en_livraison", "livre", "ecart"].includes(item.status)
        ) {
          return false;
        }
      } else if (filter !== "all" && item.status !== filter) {
        return false;
      }
      if (!q) return true;
      return `${item.number} ${item.siteName} ${item.daRef} ${item.carrierName}`
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
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  function openComposer() {
    setSiteName("");
    setDeliveryDate(today());
    setDeliveryAt(toLocalInputValue(new Date().toISOString()));
    setCarrierName("");
    setDaRef("");
    setNote("");
    setDraftLines([
      {
        ...emptyLine(),
        label: "Consommable",
        qtyOrdered: "1",
        qtyDelivered: "1",
      },
    ]);
    setComposerOpen(true);
  }

  function openReceive() {
    if (!selected) return;
    setRecvLines(
      selected.lines.map((l) => ({
        id: l.id,
        label: l.label,
        unit: l.unit,
        qtyOrdered: String(l.qtyOrdered),
        qtyDelivered: String(l.qtyDelivered),
        qtyReceived: String(
          l.qtyReceived > 0 ? l.qtyReceived : l.qtyDelivered,
        ),
        lot: l.lot || "",
        articleSku: l.articleSku || "",
      })),
    );
    setReserves(selected.reserves);
    setLivreurName(
      selected.signatures.find((s) => s.role === "livreur")?.name ||
        selected.carrierName,
    );
    setReceiverName(
      selected.signatures.find((s) => s.role === "receptionnaire")?.name || "",
    );
    setLivreurSigned(true);
    setReceiverSigned(true);
    setProofKind("colis");
    setProofUrl("");
    setProofCaption("");
    setUpdateStock(true);
    setReceiveOpen(true);
  }

  async function createBl(e: FormEvent) {
    e.preventDefault();
    if (!siteName.trim()) {
      toast.warning("Site requis");
      return;
    }
    setBusy(true);
    try {
      const lines = linesFromDraft(draftLines, false);
      const deliveryAtIso = deliveryAt
        ? new Date(deliveryAt).toISOString()
        : new Date().toISOString();
      const res = await fetch("/api/delivery-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          deliveryDate,
          deliveryAt: deliveryAtIso,
          carrierName,
          daRef,
          note,
          lines,
          signatures: defaultSignatures(carrierName, ""),
        }),
      });
      const data = (await res.json()) as {
        item?: DeliveryNote;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      if (data.item) {
        setItems((prev) => [data.item!, ...prev]);
        setSelectedId(data.item.id);
      }
      setComposerOpen(false);
      toast.success("Bon de livraison créé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(
    action: string,
    extra?: Record<string, unknown>,
  ) {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/delivery-notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, action, ...extra }),
      });
      const data = (await res.json()) as {
        item?: DeliveryNote;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action impossible");
      if (data.item) {
        setItems((prev) =>
          prev.map((p) => (p.id === data.item!.id ? data.item! : p)),
        );
      }
      const msgs: Record<string, string> = {
        dispatch: "En livraison",
        deliver: "Marqué livré",
        receive: "Réception enregistrée",
      };
      toast.success(msgs[action] || "Mise à jour");
      if (action === "receive") setReceiveOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function submitReceive(e: FormEvent) {
    e.preventDefault();
    if (!receiverName.trim()) {
      toast.warning("Nom du réceptionnaire requis");
      return;
    }
    if (!livreurSigned || !receiverSigned) {
      toast.warning("Les deux signatures sont requises");
      return;
    }
    const lines = linesFromDraft(recvLines, true);
    const signatures: DeliverySignature[] = [
      {
        role: "livreur",
        name: livreurName || selected?.carrierName || "Livreur",
        signed: true,
        signedAt: new Date().toISOString(),
      },
      {
        role: "receptionnaire",
        name: receiverName,
        signed: true,
        signedAt: new Date().toISOString(),
      },
    ];
    const proofs: DeliveryProof[] = [];
    if (proofUrl.trim()) {
      proofs.push({
        id: `DP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        kind: proofKind,
        url: proofUrl.trim(),
        caption: proofCaption.trim(),
        at: new Date().toISOString(),
        byName: receiverName,
      });
    }
    await runAction("receive", {
      lines,
      reserves,
      signatures,
      receiverName,
      proofs,
      updateStock,
    });
  }

  const recipe = selected ? deliveryNoteReady(selected) : null;

  return (
    <div
      className={`leads-page bl-page${embedded ? " bl-page--embedded" : ""}`}
      data-testid="delivery-notes"
    >
      {embedded ? (
        <div className="fin-embedded-bar bl-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">Logistique</p>
            <h2>Bon de livraison / réception</h2>
            <p>
              Site, date/heure, livreur, réf. DA, articles, quantités, réception,
              réserves, signatures et mise à jour stock
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
            {canEdit ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={openComposer}
              >
                Nouveau BL
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
            placeholder="N°, site, DA…"
            aria-label="Rechercher"
          />
        </label>
        <div className="leads-filters" role="tablist">
          {(
            [
              ["all", "Tous"],
              ["action", "À traiter"],
              ["brouillon", "Brouillons"],
              ["en_livraison", "En livraison"],
              ["livre", "Livrés"],
              ["receptionne", "Réceptionnés"],
              ["ecart", "Écarts"],
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
              <IconTruck size={28} />
              <h2>Aucun bon de livraison</h2>
              <p>Créez un BL pour suivre livraison et réception site.</p>
              {canEdit ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={openComposer}
                >
                  Nouveau BL
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
                    <strong>{item.siteName}</strong>
                    <time>{formatWhen(item.deliveryDate)}</time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-pill">{item.number}</span>
                    <span className={`bl-status bl-status--${item.status}`}>
                      {DELIVERY_STATUS_LABELS[item.status]}
                    </span>
                  </span>
                  <span className="leads-card__preview">
                    {item.lines.length} ligne
                    {item.lines.length > 1 ? "s" : ""} ·{" "}
                    {item.carrierName || "Livreur —"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <h2>Sélectionnez un bon de livraison</h2>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    <span className={`bl-status bl-status--${selected.status}`}>
                      {DELIVERY_STATUS_LABELS[selected.status]}
                    </span>
                    <span>{selected.number}</span>
                  </p>
                  <h2>{selected.siteName}</h2>
                  <p className="leads-detail__sub">
                    {formatWhen(selected.deliveryAt || selected.deliveryDate)} ·{" "}
                    {selected.carrierName || "Livreur —"}
                  </p>
                </div>
              </header>

              <section className="fin-section">
                <h3>Livraison</h3>
                <dl className="fin-dl">
                  <div>
                    <dt>Site</dt>
                    <dd>{selected.siteName}</dd>
                  </div>
                  <div>
                    <dt>Date / heure</dt>
                    <dd>
                      {formatWhen(selected.deliveryAt || selected.deliveryDate)}
                    </dd>
                  </div>
                  <div>
                    <dt>Livreur</dt>
                    <dd>{selected.carrierName || "—"}</dd>
                  </div>
                  <div>
                    <dt>Réf. DA</dt>
                    <dd>{selected.daRef || "—"}</dd>
                  </div>
                </dl>
              </section>

              <section className="fin-section">
                <h3>Produits / consommables</h3>
                <div className="fin-table-wrap">
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Article</th>
                        <th>Unité</th>
                        <th>Prévu</th>
                        <th>Livré</th>
                        <th>Reçu</th>
                        <th>Lot</th>
                        <th>État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.lines.map((l) => (
                        <tr key={l.id}>
                          <td>{l.label}</td>
                          <td>{l.unit}</td>
                          <td>{l.qtyOrdered}</td>
                          <td>{l.qtyDelivered}</td>
                          <td>{l.qtyReceived}</td>
                          <td>{l.lot || "—"}</td>
                          <td>
                            <span
                              className={`bl-line-status bl-line-status--${l.lineStatus}`}
                            >
                              {DELIVERY_LINE_STATUS_LABELS[l.lineStatus]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {selected.reserves ? (
                <section className="fin-section">
                  <h3>Réserves</h3>
                  <p className="fin-block">{selected.reserves}</p>
                </section>
              ) : null}

              <section className="fin-section">
                <h3>Signatures</h3>
                <ul className="bl-signatures">
                  {selected.signatures.map((s) => (
                    <li key={s.role}>
                      <strong>{DELIVERY_SIGNATURE_ROLE_LABELS[s.role]}</strong>
                      <span>
                        {s.name || "—"} ·{" "}
                        {s.signed
                          ? `Signé ${formatWhen(s.signedAt)}`
                          : "Non signé"}
                      </span>
                    </li>
                  ))}
                </ul>
                {selected.stockUpdated ? (
                  <p className="bl-stock-ok">Stock mis à jour après réception</p>
                ) : null}
              </section>

              {selected.proofs.length > 0 ? (
                <section className="fin-section">
                  <h3>Preuves photo</h3>
                  <ul className="bl-proofs">
                    {selected.proofs.map((p) => (
                      <li key={p.id}>
                        <strong>{DELIVERY_PROOF_KIND_LABELS[p.kind]}</strong>
                        <a href={p.url} target="_blank" rel="noreferrer">
                          {p.caption || p.url}
                        </a>
                        <span>
                          {formatWhen(p.at)}
                          {p.byName ? ` · ${p.byName}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {recipe && !recipe.ok ? (
                <p className="po-missing">
                  Manque : {recipe.missing.join(", ")}
                </p>
              ) : null}

              <div className="fin-actions">
                {canEdit && selected.status === "brouillon" ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy || !recipe?.ok}
                    onClick={() => void runAction("dispatch")}
                  >
                    Départ livraison
                  </button>
                ) : null}
                {canEdit &&
                (selected.status === "en_livraison" ||
                  selected.status === "brouillon") ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={busy}
                    onClick={() => void runAction("deliver")}
                  >
                    Marquer livré
                  </button>
                ) : null}
                {canReceive &&
                (selected.status === "livre" ||
                  selected.status === "en_livraison" ||
                  selected.status === "ecart") ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                    onClick={openReceive}
                  >
                    Réceptionner
                  </button>
                ) : null}
              </div>

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
                  <p className="doc-overlay-header__tag">OPS-BL</p>
                  <h2>Nouveau bon de livraison</h2>
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
                id="bl-create-form"
                className="doc-overlay-body fin-composer"
                onSubmit={createBl}
              >
                <fieldset className="fin-composer__section">
                  <legend>Site & date</legend>
                  <div className="fin-composer__grid">
                    <label className="fin-composer__full">
                      <span>Site *</span>
                      <input
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        required
                        placeholder="Site destinataire"
                      />
                    </label>
                    <label>
                      <span>Date</span>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Date / heure</span>
                      <input
                        type="datetime-local"
                        value={deliveryAt}
                        onChange={(e) => setDeliveryAt(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Livreur / magasinier</span>
                      <input
                        value={carrierName}
                        onChange={(e) => setCarrierName(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Réf. demande d’achat</span>
                      <input
                        value={daRef}
                        onChange={(e) => setDaRef(e.target.value)}
                        placeholder="DA-…"
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>Produits / consommables (quantités)</legend>
                  <div className="fin-lines-edit">
                    {draftLines.map((line, idx) => (
                      <div key={line.id} className="bl-line-row bl-line-row--full">
                        <input
                          placeholder="Article"
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
                          placeholder="SKU"
                          value={line.articleSku}
                          onChange={(e) =>
                            setDraftLines((rows) =>
                              rows.map((r, i) =>
                                i === idx
                                  ? { ...r, articleSku: e.target.value }
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
                          type="number"
                          placeholder="Prévu"
                          value={line.qtyOrdered}
                          onChange={(e) =>
                            setDraftLines((rows) =>
                              rows.map((r, i) =>
                                i === idx
                                  ? { ...r, qtyOrdered: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                        <input
                          type="number"
                          placeholder="Livré"
                          value={line.qtyDelivered}
                          onChange={(e) =>
                            setDraftLines((rows) =>
                              rows.map((r, i) =>
                                i === idx
                                  ? { ...r, qtyDelivered: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                        <input
                          placeholder="Lot"
                          value={line.lot}
                          onChange={(e) =>
                            setDraftLines((rows) =>
                              rows.map((r, i) =>
                                i === idx ? { ...r, lot: e.target.value } : r,
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
                  </div>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>Note</legend>
                  <label className="fin-composer__full">
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
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
                    form="bl-create-form"
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

      {receiveOpen && selected ? (
        <AdminOverlayPortal>
          <div
            className="doc-overlay-backdrop"
            role="presentation"
            onClick={() => setReceiveOpen(false)}
          >
            <div
              className="doc-overlay-dialog fin-composer-dialog"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="doc-overlay-header">
                <div className="doc-overlay-header__left">
                  <p className="doc-overlay-header__tag">Réception</p>
                  <h2>{selected.number}</h2>
                </div>
                <button
                  type="button"
                  className="doc-overlay-close-btn"
                  onClick={() => setReceiveOpen(false)}
                >
                  ×
                </button>
              </div>
              <form
                id="bl-receive-form"
                className="doc-overlay-body fin-composer"
                onSubmit={submitReceive}
              >
                <fieldset className="fin-composer__section">
                  <legend>Quantités reçues</legend>
                  <div className="fin-lines-edit">
                    {recvLines.map((line, idx) => (
                      <div key={line.id} className="bl-recv-row">
                        <span>{line.label}</span>
                        <em>
                          livré {line.qtyDelivered} {line.unit}
                        </em>
                        <input
                          type="number"
                          aria-label={`Qté reçue ${line.label}`}
                          value={line.qtyReceived}
                          onChange={(e) =>
                            setRecvLines((rows) =>
                              rows.map((r, i) =>
                                i === idx
                                  ? { ...r, qtyReceived: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>Réserves</legend>
                  <label className="fin-composer__full">
                    <textarea
                      rows={2}
                      value={reserves}
                      onChange={(e) => setReserves(e.target.value)}
                      placeholder="Écarts, casse, observations…"
                    />
                  </label>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>Preuve photo (écart / colis)</legend>
                  <div className="fin-composer__grid">
                    <label>
                      Type
                      <select
                        value={proofKind}
                        onChange={(e) =>
                          setProofKind(e.target.value as DeliveryProofKind)
                        }
                      >
                        {(
                          Object.keys(DELIVERY_PROOF_KIND_LABELS) as DeliveryProofKind[]
                        ).map((k) => (
                          <option key={k} value={k}>
                            {DELIVERY_PROOF_KIND_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="fin-composer__full">
                      URL image
                      <input
                        value={proofUrl}
                        onChange={(e) => setProofUrl(e.target.value)}
                        placeholder="https://…"
                      />
                    </label>
                    <label className="fin-composer__full">
                      Légende
                      <input
                        value={proofCaption}
                        onChange={(e) => setProofCaption(e.target.value)}
                      />
                    </label>
                  </div>
                </fieldset>

                <label className="bl-stock-toggle">
                  <input
                    type="checkbox"
                    checked={updateStock}
                    onChange={(e) => setUpdateStock(e.target.checked)}
                  />
                  Mettre à jour le stock site (articles avec SKU connus)
                </label>

                <fieldset className="fin-composer__section">
                  <legend>Signatures</legend>
                  <div className="fin-composer__grid">
                    <label>
                      <span>Livreur</span>
                      <input
                        value={livreurName}
                        onChange={(e) => setLivreurName(e.target.value)}
                      />
                    </label>
                    <label className="bl-sign-check">
                      <input
                        type="checkbox"
                        checked={livreurSigned}
                        onChange={(e) => setLivreurSigned(e.target.checked)}
                      />
                      <span>Signé livreur</span>
                    </label>
                    <label>
                      <span>Réceptionnaire *</span>
                      <input
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        required
                      />
                    </label>
                    <label className="bl-sign-check">
                      <input
                        type="checkbox"
                        checked={receiverSigned}
                        onChange={(e) => setReceiverSigned(e.target.checked)}
                      />
                      <span>Signé réceptionnaire</span>
                    </label>
                  </div>
                </fieldset>
              </form>
              <footer className="doc-overlay-footer">
                <div className="doc-overlay-footer__actions">
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() => setReceiveOpen(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    form="bl-receive-form"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                  >
                    {busy ? "Enregistrement…" : "Valider la réception"}
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
