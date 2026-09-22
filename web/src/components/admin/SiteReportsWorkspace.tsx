"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { IconSearch, IconVisit } from "@/components/admin/Icons";
import {
  SITE_REPORT_STATUS_LABELS,
  siteReportReady,
  type SiteReport,
  type SiteReportStatus,
} from "@/lib/site-reports-shared";
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

export function SiteReportsWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const bounds = monthBounds();
  const [items, setItems] = useState<SiteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | SiteReportStatus | "action">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const [clientName, setClientName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [periodStart, setPeriodStart] = useState(bounds.start);
  const [periodEnd, setPeriodEnd] = useState(bounds.end);
  const [prestations, setPrestations] = useState("");
  const [effectifsCount, setEffectifsCount] = useState("0");
  const [effectifsNote, setEffectifsNote] = useState("");
  const [incidents, setIncidents] = useState("");
  const [controles, setControles] = useState("");
  const [observations, setObservations] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [actions, setActions] = useState("");
  const [qualityScore, setQualityScore] = useState("");
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/site-reports", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: SiteReport[];
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
        if (!["brouillon", "soumis"].includes(item.status)) return false;
      } else if (filter !== "all" && item.status !== filter) {
        return false;
      }
      if (!q) return true;
      return [item.number, item.clientName, item.siteName, item.prestations]
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
    setClientName("");
    setSiteName("");
    setPeriodStart(bounds.start);
    setPeriodEnd(bounds.end);
    setPrestations("");
    setEffectifsCount("0");
    setEffectifsNote("");
    setIncidents("");
    setControles("");
    setObservations("");
    setRecommendations("");
    setActions("");
    setQualityScore("");
    setNote("");
    setComposerOpen(true);
  }

  async function createItem(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/site-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          siteName,
          periodStart,
          periodEnd,
          prestations,
          effectifsCount: Number(effectifsCount) || 0,
          effectifsNote,
          incidents,
          controles,
          observations,
          recommendations,
          actions,
          qualityScore: qualityScore === "" ? null : Number(qualityScore),
          note,
        }),
      });
      const data = (await res.json()) as { item?: SiteReport; error?: string };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      toast.success("Rapport de site créé");
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
      const res = await fetch("/api/site-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, action, ...extra }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Action impossible");
      toast.success("Rapport mis à jour");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const recipe = selected ? siteReportReady(selected) : null;

  return (
    <div
      className={`leads-page sr-page${embedded ? " sr-page--embedded" : ""}`}
      data-testid="site-reports"
    >
      {embedded ? (
        <div className="fin-embedded-bar sr-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">Rapport de prestation</p>
            <h2>Rapport de prestation / site</h2>
            <p>
              Synthèse prestations, effectifs, incidents, contrôles,
              observations, recommandations et actions
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
                Nouveau rapport
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
            placeholder="Site, client, ref…"
            aria-label="Rechercher"
          />
        </label>
        <div className="leads-filters" role="tablist">
          {(
            [
              ["all", "Tous"],
              ["action", "À traiter"],
              ["brouillon", "Brouillons"],
              ["soumis", "Soumis"],
              ["valide", "Validés"],
              ["publie", "Publiés"],
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
              <IconVisit size={28} />
              <h2>Aucun rapport de site</h2>
              <p>Créez une synthèse période pour alimenter qualité et préfacture.</p>
              {canEdit ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={openComposer}
                >
                  Nouveau rapport
                </button>
              ) : null}
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`leads-card sr-card${selectedId === item.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{item.siteName}</strong>
                    <time>
                      {item.qualityScore != null
                        ? `${item.qualityScore}%`
                        : formatWhen(item.periodEnd)}
                    </time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-pill">{item.number}</span>
                    <span className={`sr-status sr-status--${item.status}`}>
                      {SITE_REPORT_STATUS_LABELS[item.status]}
                    </span>
                  </span>
                  <span className="leads-card__preview">
                    {item.clientName} · {formatWhen(item.periodStart)} →{" "}
                    {formatWhen(item.periodEnd)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <h2>Sélectionnez un rapport</h2>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    <span className={`sr-status sr-status--${selected.status}`}>
                      {SITE_REPORT_STATUS_LABELS[selected.status]}
                    </span>
                    <span>{selected.number}</span>
                  </p>
                  <h2>{selected.siteName}</h2>
                  <p>
                    {selected.clientName} · {formatWhen(selected.periodStart)} →{" "}
                    {formatWhen(selected.periodEnd)}
                  </p>
                </div>
                {selected.qualityScore != null ? (
                  <strong>{selected.qualityScore}%</strong>
                ) : null}
              </header>

              {recipe && !recipe.ok ? (
                <p className="po-missing">
                  Incomplet : {recipe.missing.join(", ")}
                </p>
              ) : null}

              <dl className="leads-detail__meta">
                <div>
                  <dt>Effectifs</dt>
                  <dd>
                    {selected.effectifsCount || "—"}
                    {selected.effectifsNote
                      ? ` · ${selected.effectifsNote}`
                      : ""}
                  </dd>
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

              {(
                [
                  ["Prestations", selected.prestations],
                  ["Incidents", selected.incidents],
                  ["Contrôles", selected.controles],
                  ["Observations", selected.observations],
                  ["Recommandations", selected.recommendations],
                  ["Actions", selected.actions],
                ] as const
              ).map(([label, text]) => (
                <section key={label} className="fin-block-wrap">
                  <h3>{label}</h3>
                  <p className="fin-block">{text || "—"}</p>
                </section>
              ))}

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
                {canValidate && selected.status === "soumis" ? (
                  <>
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy}
                      onClick={() => void patch("validate")}
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={busy}
                      onClick={() => void patch("publish")}
                    >
                      Valider & publier
                    </button>
                  </>
                ) : null}
                {canValidate && selected.status === "valide" ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                    onClick={() => void patch("publish")}
                  >
                    Publier
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
                  <p className="eyebrow">Rapport</p>
                  <h2>Nouveau rapport de site</h2>
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
                  Client
                  <input
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </label>
                <label>
                  Site
                  <input
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </label>
                <label>
                  Du
                  <input
                    type="date"
                    required
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </label>
                <label>
                  Au
                  <input
                    type="date"
                    required
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </label>
                <label className="is-full">
                  Prestations réalisées
                  <textarea
                    rows={3}
                    value={prestations}
                    onChange={(e) => setPrestations(e.target.value)}
                  />
                </label>
                <label>
                  Effectifs (nb)
                  <input
                    type="number"
                    min={0}
                    value={effectifsCount}
                    onChange={(e) => setEffectifsCount(e.target.value)}
                  />
                </label>
                <label>
                  Effectifs (détail)
                  <input
                    value={effectifsNote}
                    onChange={(e) => setEffectifsNote(e.target.value)}
                  />
                </label>
                <label className="is-full">
                  Incidents
                  <textarea
                    rows={2}
                    value={incidents}
                    onChange={(e) => setIncidents(e.target.value)}
                  />
                </label>
                <label className="is-full">
                  Contrôles
                  <textarea
                    rows={2}
                    value={controles}
                    onChange={(e) => setControles(e.target.value)}
                  />
                </label>
                <label className="is-full">
                  Observations
                  <textarea
                    rows={2}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                  />
                </label>
                <label className="is-full">
                  Recommandations
                  <textarea
                    rows={2}
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                  />
                </label>
                <label className="is-full">
                  Actions
                  <textarea
                    rows={2}
                    value={actions}
                    onChange={(e) => setActions(e.target.value)}
                  />
                </label>
                <label>
                  Score qualité %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={qualityScore}
                    onChange={(e) => setQualityScore(e.target.value)}
                  />
                </label>
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
    </div>
  );
}
