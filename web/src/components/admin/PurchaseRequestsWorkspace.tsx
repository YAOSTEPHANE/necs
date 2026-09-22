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
  PURCHASE_REQUEST_STATUS_LABELS,
  PURCHASE_URGENCY_LABELS,
  formatDaFcfa,
  makePurchaseRequestLine,
  purchaseRequestReady,
  type PurchaseRequest,
  type PurchaseRequestStatus,
  type PurchaseUrgency,
} from "@/lib/purchase-requests-shared";
import { toast } from "@/lib/toast";

type DraftLine = {
  id: string;
  label: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  estimate: string;
  urgency: PurchaseUrgency;
};

function emptyLine(): DraftLine {
  return {
    id: makePurchaseRequestLine({ label: "x" }).id,
    label: "",
    quantity: "1",
    unit: "u",
    unitPrice: "0",
    estimate: "0",
    urgency: "normale",
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function PurchaseRequestsWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | PurchaseRequestStatus | "action">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [requesterName, setRequesterName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [needDate, setNeedDate] = useState(today);
  const [supplier, setSupplier] = useState("");
  const [altSupplier, setAltSupplier] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [approverName, setApproverName] = useState("");
  const [urgency, setUrgency] = useState<PurchaseUrgency>("normale");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [justification, setJustification] = useState("");
  const [note, setNote] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([emptyLine()]);
  const [validationComment, setValidationComment] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchase-requests", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: PurchaseRequest[];
        canEdit?: boolean;
        canValidate?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items ?? []);
      setCanEdit(Boolean(data.canEdit));
      setCanValidate(Boolean(data.canValidate));
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
        if (!["brouillon", "en_validation"].includes(item.status)) return false;
      } else if (filter !== "all" && item.status !== filter) {
        return false;
      }
      if (!q) return true;
      return [
        item.number,
        item.requesterName,
        item.siteName,
        item.supplier,
        item.justification,
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
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  function openComposer() {
    setRequesterName("");
    setSiteName("");
    setNeedDate(today());
    setSupplier("");
    setAltSupplier("");
    setCostCenter("");
    setApproverName("");
    setUrgency("normale");
    setExpectedDelivery("");
    setJustification("");
    setNote("");
    setDraftLines([emptyLine()]);
    setComposerOpen(true);
  }

  async function createItem(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const lines = draftLines
        .filter((r) => r.label.trim())
        .map((r) => {
          const qty = Number(r.quantity) || 0;
          const unitPrice = Number(r.unitPrice) || 0;
          const estimate =
            Number(r.estimate) > 0 ? Number(r.estimate) : qty * unitPrice;
          return makePurchaseRequestLine({
            id: r.id,
            label: r.label,
            quantity: qty,
            unit: r.unit,
            unitPrice,
            estimate,
            urgency: r.urgency,
          });
        });
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName,
          siteName,
          needDate,
          supplier,
          altSupplier,
          costCenter,
          approverName,
          urgency,
          expectedDelivery,
          justification,
          note,
          lines,
        }),
      });
      const data = (await res.json()) as {
        item?: PurchaseRequest;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      toast.success("Demande d’achat créée");
      setComposerOpen(false);
      await refresh();
      if (data.item) setSelectedId(data.item.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function patch(action: string, extra: Record<string, unknown> = {}) {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/purchase-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, action, ...extra }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Action impossible");
      toast.success("Demande mise à jour");
      setRejectOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const recipe = selected ? purchaseRequestReady(selected) : null;

  return (
    <div
      className={`leads-page da-page${embedded ? " da-page--embedded" : ""}`}
      data-testid="purchase-requests"
    >
      {embedded ? (
        <div className="fin-embedded-bar da-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">Demande d’achat</p>
            <h2>Demande d’achat / BC interne</h2>
            <p>
              Demandeur, site, articles (P.U. / total), budget, centre de coût,
              fournisseur, validation N+1
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
                Nouvelle DA
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
            placeholder="Réf., site, demandeur…"
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
              ["validee", "Validées"],
              ["commandee", "Commandées"],
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
              <h2>Aucune demande d’achat</h2>
              <p>Créez une DA pour enchaîner validation → BL → stock.</p>
              {canEdit ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={openComposer}
                >
                  Nouvelle DA
                </button>
              ) : null}
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`leads-card da-card${selectedId === item.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{item.siteName}</strong>
                    <time>{formatDaFcfa(item.totalEstimate)}</time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-pill">{item.number}</span>
                    <span className={`da-status da-status--${item.status}`}>
                      {PURCHASE_REQUEST_STATUS_LABELS[item.status]}
                    </span>
                  </span>
                  <span className="leads-card__preview">
                    {item.requesterName} · {item.lines.length} article
                    {item.lines.length > 1 ? "s" : ""}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <h2>Sélectionnez une demande</h2>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    <span className={`da-status da-status--${selected.status}`}>
                      {PURCHASE_REQUEST_STATUS_LABELS[selected.status]}
                    </span>
                    <span>{selected.number}</span>
                  </p>
                  <h2>{selected.siteName}</h2>
                  <p>
                    {selected.requesterName} · besoin{" "}
                    {formatWhen(selected.needDate)}
                  </p>
                </div>
                <strong>{formatDaFcfa(selected.totalEstimate)}</strong>
              </header>

              {recipe && !recipe.ok ? (
                <p className="po-missing">
                  Incomplet : {recipe.missing.join(", ")}
                </p>
              ) : null}

              <dl className="leads-detail__meta">
                <div>
                  <dt>Fournisseur</dt>
                  <dd>{selected.supplier || "—"}</dd>
                </div>
                <div>
                  <dt>Fournisseur alt.</dt>
                  <dd>{selected.altSupplier || "—"}</dd>
                </div>
                <div>
                  <dt>Centre de coût</dt>
                  <dd>{selected.costCenter || "—"}</dd>
                </div>
                <div>
                  <dt>Approbateur N+1</dt>
                  <dd>{selected.approverName || "—"}</dd>
                </div>
                <div>
                  <dt>Urgence</dt>
                  <dd>{PURCHASE_URGENCY_LABELS[selected.urgency || "normale"]}</dd>
                </div>
                <div>
                  <dt>Livraison prévue</dt>
                  <dd>{formatWhen(selected.expectedDelivery)}</dd>
                </div>
                <div>
                  <dt>Validé</dt>
                  <dd>
                    {selected.validatedAt
                      ? `${formatWhen(selected.validatedAt)}${
                          selected.validatedByName
                            ? ` · ${selected.validatedByName}`
                            : ""
                        }`
                      : "—"}
                  </dd>
                </div>
              </dl>

              <section>
                <h3>Justification</h3>
                <p className="fin-block">{selected.justification || "—"}</p>
              </section>

              {selected.validationComment ? (
                <section>
                  <h3>Commentaire validation</h3>
                  <p className="fin-block">{selected.validationComment}</p>
                </section>
              ) : null}

              {selected.rejectionReason ? (
                <p className="po-missing">Refus : {selected.rejectionReason}</p>
              ) : null}

              <section>
                <h3>Articles</h3>
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Qté</th>
                      <th>Unité</th>
                      <th>P.U.</th>
                      <th>Total</th>
                      <th>Urgence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((l) => (
                      <tr key={l.id}>
                        <td>{l.label}</td>
                        <td>{l.quantity}</td>
                        <td>{l.unit}</td>
                        <td>{formatDaFcfa(l.unitPrice || 0)}</td>
                        <td>{formatDaFcfa(l.estimate)}</td>
                        <td>{PURCHASE_URGENCY_LABELS[l.urgency]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <div className="leads-detail__actions">
                {canEdit && selected.status === "brouillon" ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy || !recipe?.ok}
                    onClick={() => void patch("submit")}
                  >
                    Soumettre
                  </button>
                ) : null}
                {canValidate && selected.status === "en_validation" ? (
                  <>
                    <input
                      value={validationComment}
                      onChange={(e) => setValidationComment(e.target.value)}
                      placeholder="Commentaire validation"
                      style={{ minWidth: "12rem" }}
                    />
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy}
                      onClick={() =>
                        void patch("validate", {
                          comment: validationComment,
                        })
                      }
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
                {canEdit && selected.status === "validee" ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                    onClick={() => void patch("order")}
                  >
                    Marquer commandée
                  </button>
                ) : null}
                {canEdit &&
                selected.status !== "annulee" &&
                selected.status !== "commandee" ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={busy}
                    onClick={() => void patch("cancel")}
                  >
                    Annuler
                  </button>
                ) : null}
              </div>

              <section>
                <h3>Historique</h3>
                <ul className="leads-history">
                  {[...selected.history].reverse().map((h) => (
                    <li key={h.id}>
                      <strong>{h.byName}</strong> · {formatWhen(h.at)} —{" "}
                      {h.detail}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </article>
      </div>

      {composerOpen ? (
        <AdminOverlayPortal>
          <div className="admin-overlay" role="dialog" aria-modal>
            <form className="admin-overlay__panel" onSubmit={createItem}>
              <header className="admin-overlay__head">
                <div>
                  <p className="eyebrow">Demande d’achat</p>
                  <h2>Nouvelle demande d’achat</h2>
                </div>
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  onClick={() => setComposerOpen(false)}
                >
                  Fermer
                </button>
              </header>
              <div className="admin-overlay__body clients-form">
                <label>
                  Demandeur
                  <input
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Votre nom"
                  />
                </label>
                <label>
                  Site *
                  <input
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </label>
                <label>
                  Date besoin
                  <input
                    type="date"
                    value={needDate}
                    onChange={(e) => setNeedDate(e.target.value)}
                  />
                </label>
                <label>
                  Urgence
                  <select
                    value={urgency}
                    onChange={(e) =>
                      setUrgency(e.target.value as PurchaseUrgency)
                    }
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                  </select>
                </label>
                <label>
                  Centre de coût
                  <input
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    placeholder="OPS-SITE…"
                  />
                </label>
                <label>
                  Approbateur N+1 *
                  <input
                    required
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                  />
                </label>
                <label>
                  Fournisseur proposé
                  <input
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                  />
                </label>
                <label>
                  Fournisseur alternatif
                  <input
                    value={altSupplier}
                    onChange={(e) => setAltSupplier(e.target.value)}
                  />
                </label>
                <label>
                  Livraison / BL prévue
                  <input
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                  />
                </label>
                <label className="is-full">
                  Justification *
                  <textarea
                    required
                    rows={3}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                  />
                </label>
                <div className="is-full">
                  <p className="fw-label">Articles (Qté · P.U. · Total)</p>
                  {draftLines.map((row, idx) => (
                    <div key={row.id} className="po-line-row da-line-row">
                      <input
                        placeholder="Article"
                        value={row.label}
                        onChange={(e) => {
                          const next = [...draftLines];
                          next[idx] = { ...row, label: e.target.value };
                          setDraftLines(next);
                        }}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Qté"
                        value={row.quantity}
                        onChange={(e) => {
                          const quantity = e.target.value;
                          const pu = Number(row.unitPrice) || 0;
                          const qty = Number(quantity) || 0;
                          const next = [...draftLines];
                          next[idx] = {
                            ...row,
                            quantity,
                            estimate: String(Math.round(qty * pu)),
                          };
                          setDraftLines(next);
                        }}
                      />
                      <input
                        placeholder="Unité"
                        value={row.unit}
                        onChange={(e) => {
                          const next = [...draftLines];
                          next[idx] = { ...row, unit: e.target.value };
                          setDraftLines(next);
                        }}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="P.U."
                        value={row.unitPrice}
                        onChange={(e) => {
                          const unitPrice = e.target.value;
                          const qty = Number(row.quantity) || 0;
                          const pu = Number(unitPrice) || 0;
                          const next = [...draftLines];
                          next[idx] = {
                            ...row,
                            unitPrice,
                            estimate: String(Math.round(qty * pu)),
                          };
                          setDraftLines(next);
                        }}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Total"
                        value={row.estimate}
                        onChange={(e) => {
                          const next = [...draftLines];
                          next[idx] = { ...row, estimate: e.target.value };
                          setDraftLines(next);
                        }}
                      />
                      <select
                        value={row.urgency}
                        onChange={(e) => {
                          const next = [...draftLines];
                          next[idx] = {
                            ...row,
                            urgency: e.target.value as PurchaseUrgency,
                          };
                          setDraftLines(next);
                        }}
                      >
                        <option value="basse">Basse</option>
                        <option value="normale">Normale</option>
                        <option value="haute">Haute</option>
                        <option value="critique">Critique</option>
                      </select>
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
                <label className="is-full">
                  Note
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
              </div>
              <footer className="admin-overlay__foot">
                <button
                  type="submit"
                  className="btn-admin btn-admin--primary"
                  disabled={busy}
                >
                  Créer
                </button>
              </footer>
            </form>
          </div>
        </AdminOverlayPortal>
      ) : null}

      {rejectOpen && selected ? (
        <AdminOverlayPortal>
          <div className="admin-overlay" role="dialog" aria-modal>
            <form
              className="admin-overlay__panel"
              onSubmit={(e) => {
                e.preventDefault();
                void patch("reject", { reason: rejectReason });
              }}
            >
              <header className="admin-overlay__head">
                <h2>Refuser {selected.number}</h2>
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  onClick={() => setRejectOpen(false)}
                >
                  Fermer
                </button>
              </header>
              <div className="admin-overlay__body">
                <label>
                  Motif
                  <textarea
                    required
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </label>
              </div>
              <footer className="admin-overlay__foot">
                <button
                  type="submit"
                  className="btn-admin btn-admin--primary"
                  disabled={busy}
                >
                  Confirmer le refus
                </button>
              </footer>
            </form>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </div>
  );
}
