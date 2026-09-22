"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
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
} from "@/components/admin/form-wizard";
import {
  IconCamera,
  IconCheck,
  IconChecklist,
  IconClock,
  IconQuality,
  IconSearch,
} from "@/components/admin/Icons";
import { toast } from "@/lib/toast";
import { fileToOptimizedDataUrl } from "@/lib/settings";
import { persistOptimizedImage } from "@/lib/vercel-blob-client";
import {
  QUALITY_PERIODICITY_LABELS,
  QUALITY_STATUS_LABELS,
  computeQualityScore,
  type QualityChecklistTemplate,
  type QualityControl,
  type QualityControlStatus,
  type QualityPeriodicity,
} from "@/lib/quality-controls-shared";
import {
  enqueueOfflineOp,
  shouldUseOfflineQueue,
} from "@/lib/offline-queue";
import { loadSession } from "@/lib/auth";

type SiteOpt = {
  id: string;
  name: string;
  prestations: Array<{ id: string; label: string }>;
};

const SCORE_PRESETS = [
  { value: 100, label: "Excellent", tone: "ok" },
  { value: 80, label: "Bon", tone: "ok" },
  { value: 60, label: "Moyen", tone: "warn" },
  { value: 40, label: "Faible", tone: "warn" },
  { value: 0, label: "Échec", tone: "danger" },
] as const;

type StatusFilter = QualityControlStatus | "all" | "overdue" | "open";

function isOverdue(c: QualityControl) {
  if (c.status !== "planifie" && c.status !== "en_cours") return false;
  if (!c.dueDate) return false;
  return c.dueDate < new Date().toISOString().slice(0, 10);
}

function itemProgress(c: QualityControl) {
  if (c.items.length === 0) return 0;
  const done = c.items.filter((i) => i.score !== null).length;
  return Math.round((done / c.items.length) * 100);
}

function missingPhotoCount(c: QualityControl) {
  return c.items.filter((i) => i.photoRequired && !i.photoUrl).length;
}

function formatDue(due: string) {
  if (!due) return "—";
  try {
    return new Date(`${due}T12:00:00`).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return due;
  }
}

export function QualityControlsWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [controls, setControls] = useState<QualityControl[]>([]);
  const [templates, setTemplates] = useState<QualityChecklistTemplate[]>([]);
  const [sites, setSites] = useState<SiteOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<"site" | "params" | "revue">(
    "site",
  );
  const [composerShake, setComposerShake] = useState(false);
  const [ncNote, setNcNote] = useState("");
  const [observations, setObservations] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [correctiveDue, setCorrectiveDue] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    conforme: 0,
    nc: 0,
    avg: null as number | null,
  });
  const photoRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const checklistRef = useRef<HTMLElement | null>(null);

  const [form, setForm] = useState({
    siteId: "",
    prestationId: "",
    templateId: "",
    periodicity: "hebdo" as QualityPeriodicity,
    passThreshold: "80",
    dueDate: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quality-controls", { cache: "no-store" });
      const data = (await res.json()) as {
        controls?: QualityControl[];
        templates?: QualityChecklistTemplate[];
        sites?: SiteOpt[];
        stats?: typeof stats;
        canEdit?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement");
      setControls(data.controls ?? []);
      setTemplates(data.templates ?? []);
      setSites(data.sites ?? []);
      setCanEdit(Boolean(data.canEdit));
      if (data.stats) setStats(data.stats);
      setSelectedId((prev) => {
        if (prev && data.controls?.some((c) => c.id === prev)) return prev;
        return data.controls?.[0]?.id ?? null;
      });
      setForm((f) => ({
        ...f,
        siteId: f.siteId || data.sites?.[0]?.id || "",
        templateId: f.templateId || data.templates?.[0]?.id || "",
        periodicity:
          f.periodicity || data.templates?.[0]?.periodicity || "hebdo",
        passThreshold: String(
          data.templates?.[0]?.passThreshold ?? f.passThreshold,
        ),
      }));
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
    () => controls.find((c) => c.id === selectedId) ?? null,
    [controls, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setNcNote(selected.ncNote || "");
    setObservations(selected.observations || "");
    setCorrectiveAction(selected.correctiveAction || "");
    setCorrectiveDue(selected.correctiveDue || "");
  }, [selected?.id]);

  const sitePrestations = useMemo(() => {
    return sites.find((s) => s.id === form.siteId)?.prestations ?? [];
  }, [sites, form.siteId]);

  const overdueCount = useMemo(
    () => controls.filter(isOverdue).length,
    [controls],
  );

  const filterCounts = useMemo(() => {
    const open = controls.filter(
      (c) => c.status === "planifie" || c.status === "en_cours",
    ).length;
    return {
      all: controls.length,
      open,
      planifie: controls.filter((c) => c.status === "planifie").length,
      en_cours: controls.filter((c) => c.status === "en_cours").length,
      conforme: controls.filter((c) => c.status === "conforme").length,
      non_conforme: controls.filter((c) => c.status === "non_conforme").length,
      overdue: overdueCount,
    };
  }, [controls, overdueCount]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return controls.filter((c) => {
      if (statusFilter === "open") {
        if (c.status !== "planifie" && c.status !== "en_cours") return false;
      } else if (statusFilter === "overdue") {
        if (!isOverdue(c)) return false;
      } else if (statusFilter !== "all" && c.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.ref.toLowerCase().includes(q) ||
        c.siteName.toLowerCase().includes(q) ||
        c.prestationLabel.toLowerCase().includes(q) ||
        c.templateLabel.toLowerCase().includes(q)
      );
    });
  }, [controls, query, statusFilter]);

  const liveScore = useMemo(() => {
    if (!selected) return null;
    return computeQualityScore(selected.items);
  }, [selected]);

  const progress = useMemo(() => {
    if (!selected || selected.items.length === 0) {
      return { done: 0, total: 0, pct: 0 };
    }
    const done = selected.items.filter((i) => i.score !== null).length;
    const total = selected.items.length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [selected]);

  const nextItemId = useMemo(() => {
    if (!selected) return null;
    const pending = selected.items.find(
      (i) =>
        i.score === null || (i.photoRequired && !i.photoUrl),
    );
    return pending?.itemId ?? null;
  }, [selected]);

  const editable =
    selected &&
    selected.status !== "cloture" &&
    selected.status !== "conforme" &&
    selected.status !== "non_conforme";

  const canComplete =
    Boolean(editable) &&
    progress.done >= progress.total &&
    progress.total > 0 &&
    !liveScore?.missingPhotos.length;

  const belowThreshold =
    liveScore?.score !== null &&
    liveScore?.score !== undefined &&
    selected !== null &&
    liveScore.score < selected.passThreshold;

  const post = async (
    action: string,
    payload: Record<string, unknown>,
    opts?: { manageBusy?: boolean },
  ) => {
    const manageBusy = opts?.manageBusy !== false;
    if (manageBusy && busy) return null;

    const offlineKinds = new Set(["start", "score_item", "add_photo", "complete"]);
    if (shouldUseOfflineQueue() && offlineKinds.has(action)) {
      const session = loadSession();
      if (!session?.userId) {
        toast.error("Session requise pour le mode offline.");
        return null;
      }
      const controlId = String(payload.id ?? "");
      if (action === "start") {
        await enqueueOfflineOp({
          userId: session.userId,
          kind: "quality_start",
          payload: { controlId },
          occurredAt: new Date().toISOString(),
        });
        setControls((prev) =>
          prev.map((c) =>
            c.id === controlId
              ? {
                  ...c,
                  status: "en_cours",
                  startedAt: c.startedAt || new Date().toISOString(),
                  controllerId: session.userId,
                  controllerName: session.name,
                }
              : c,
          ),
        );
      } else if (action === "score_item") {
        await enqueueOfflineOp({
          userId: session.userId,
          kind: "quality_score",
          payload: {
            controlId,
            itemId: payload.itemId,
            score: payload.score,
            comment: payload.comment,
            photoUrl: payload.photoUrl,
          },
          occurredAt: new Date().toISOString(),
        });
        const score = Number(payload.score);
        setControls((prev) =>
          prev.map((c) => {
            if (c.id !== controlId) return c;
            const items = c.items.map((it) =>
              it.itemId === payload.itemId
                ? {
                    ...it,
                    score,
                    done: true,
                    photoUrl:
                      typeof payload.photoUrl === "string"
                        ? payload.photoUrl
                        : it.photoUrl,
                  }
                : it,
            );
            return {
              ...c,
              status: c.status === "planifie" ? "en_cours" : c.status,
              items,
            };
          }),
        );
      } else if (action === "add_photo") {
        await enqueueOfflineOp({
          userId: session.userId,
          kind: "quality_photo",
          payload: {
            controlId,
            itemId: payload.itemId,
            url: payload.url,
            caption: payload.caption,
          },
          occurredAt: new Date().toISOString(),
        });
        setControls((prev) =>
          prev.map((c) => {
            if (c.id !== controlId) return c;
            const items = c.items.map((it) =>
              it.itemId === payload.itemId
                ? {
                    ...it,
                    photoUrl:
                      typeof payload.url === "string" ? payload.url : it.photoUrl,
                  }
                : it,
            );
            return { ...c, items };
          }),
        );
      } else {
        await enqueueOfflineOp({
          userId: session.userId,
          kind: "quality_complete",
          payload: {
            controlId,
            ncNote: payload.ncNote,
            observations: payload.observations,
            correctiveAction: payload.correctiveAction,
            correctiveDue: payload.correctiveDue,
          },
          occurredAt: new Date().toISOString(),
        });
        setControls((prev) =>
          prev.map((c) =>
            c.id === controlId
              ? {
                  ...c,
                  ncNote: String(payload.ncNote ?? c.ncNote),
                  observations: String(
                    payload.observations ?? c.observations ?? "",
                  ),
                  correctiveAction: String(
                    payload.correctiveAction ?? c.correctiveAction,
                  ),
                  correctiveDue: String(
                    payload.correctiveDue ?? c.correctiveDue,
                  ),
                  history: [
                    {
                      id: `OFF-${Date.now()}`,
                      at: new Date().toISOString(),
                      by: session.userId,
                      byName: session.name,
                      detail: "Clôture en file offline (sync pending)",
                    },
                    ...c.history,
                  ].slice(0, 80),
                }
              : c,
          ),
        );
      }
      toast.success("Contrôle enregistré hors ligne — sync au retour réseau");
      return null;
    }

    if (manageBusy) setBusy(true);
    try {
      const res = await fetch("/api/quality-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as {
        control?: QualityControl;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      toast.success("Enregistré");
      await refresh();
      if (data.control?.id) setSelectedId(data.control.id);
      return data.control ?? null;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      if (manageBusy) setBusy(false);
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    const control = await post("create", {
      siteId: form.siteId,
      prestationId: form.prestationId,
      templateId: form.templateId || undefined,
      periodicity: form.periodicity,
      passThreshold: Number(form.passThreshold),
      dueDate: form.dueDate || undefined,
    });
    if (control) {
      setComposerOpen(false);
      setComposerStep("site");
      setMobileDetail(true);
    }
  };

  const siteReady = Boolean(form.siteId && form.prestationId);

  const pulseComposerError = () => {
    setComposerShake(true);
    window.setTimeout(() => setComposerShake(false), 420);
  };

  const canEnterComposerStep = (id: string) => {
    if (id === "site") return true;
    return siteReady;
  };

  const onScore = async (
    itemId: string,
    score: number,
    photoUrl?: string,
  ) => {
    if (!selected) return;
    await post("score_item", {
      id: selected.id,
      itemId,
      score,
      photoUrl,
    });
  };

  const onPhoto = async (itemId: string, file: File | null) => {
    if (!file || !selected || busy) return;
    if (busy) return null;

    setBusy(true);
    try {
      const { url } = await persistOptimizedImage({
        file,
        folder: "terrain",
        maxSize: 1280,
        forceJpeg: true,
        quality: 0.75,
        optimize: fileToOptimizedDataUrl,
      });
      const item = selected.items.find((i) => i.itemId === itemId);
      if (item?.score !== null && item?.score !== undefined) {
        await post(
          "score_item",
          {
            id: selected.id,
            itemId,
            score: item.score,
            photoUrl: url,
          },
          { manageBusy: false },
        );
      } else {
        await post(
          "add_photo",
          {
            id: selected.id,
            itemId,
            url,
            caption: itemId,
          },
          { manageBusy: false },
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo échouée");
    } finally {
      setBusy(false);
    }
  };

  const selectControl = (id: string) => {
    setSelectedId(id);
    setMobileDetail(true);
  };

  const scrollToComplete = () => {
    document.getElementById("qa-complete-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const displayScore =
    liveScore?.score ?? selected?.score ?? null;

  const showDock =
    mobileDetail &&
    selected &&
    canEdit &&
    (selected.status === "planifie" ||
      (Boolean(editable) && selected.status === "en_cours"));

  return (
    <div
      className={`admin-page qa-page${embedded ? " qa-page--embedded" : ""}${mobileDetail ? " is-detail" : ""}${showDock ? " has-dock" : ""}`}
    >
      <div className="qa-chrome">
        {embedded ? (
          <div className="fin-embedded-bar qa-embedded-bar">
            <div>
              <p className="fin-embedded-bar__eyebrow">Contrôle qualité</p>
              <h2>Fiche de contrôle qualité</h2>
              <p>
                Critères, notation, observations, photos, non-conformités,
                actions correctives et validation
              </p>
            </div>
            {canEdit ? (
              <div className="leads-header-actions">
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={() => {
                    setComposerStep("site");
                    setComposerOpen(true);
                  }}
                >
                  Nouveau contrôle
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <ModuleHeader
            tone="#c2410c"
            badge="Qualité"
            icon={<IconQuality size={20} />}
            title="Contrôles qualité"
            meta={
              <>
                <span>
                  Critères · notation · observations · photos · NC · validation
                </span>
                <span>
                  {stats.open} ouverts
                  {overdueCount > 0 ? ` · ${overdueCount} en retard` : ""}
                  {stats.avg !== null ? ` · moy. ${stats.avg}/100` : ""}
                </span>
              </>
            }
            actions={
              canEdit ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={() => {
                    setComposerStep("site");
                    setComposerOpen(true);
                  }}
                >
                  Nouveau contrôle
                </button>
              ) : null
            }
          />
        )}

        <div className="qa-kpis" role="group" aria-label="Indicateurs">
          <button
            type="button"
            className={`qa-kpi${statusFilter === "all" ? " is-active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            <span>Total</span>
            <strong>{stats.total}</strong>
          </button>
          <button
            type="button"
            className={`qa-kpi${statusFilter === "open" ? " is-active" : ""}`}
            onClick={() => setStatusFilter("open")}
          >
            <span>À faire</span>
            <strong>{stats.open}</strong>
          </button>
          <button
            type="button"
            className={`qa-kpi qa-kpi--ok${statusFilter === "conforme" ? " is-active" : ""}`}
            onClick={() => setStatusFilter("conforme")}
          >
            <span>Conformes</span>
            <strong>{stats.conforme}</strong>
          </button>
          <button
            type="button"
            className={`qa-kpi qa-kpi--danger${statusFilter === "overdue" || statusFilter === "non_conforme" ? " is-active" : ""}`}
            onClick={() =>
              setStatusFilter(overdueCount > 0 ? "overdue" : "non_conforme")
            }
          >
            <span>{overdueCount > 0 ? "Retards" : "NC"}</span>
            <strong>{overdueCount > 0 ? overdueCount : stats.nc}</strong>
          </button>
        </div>
      </div>

      <div className={`qa-shell${mobileDetail ? " is-detail" : ""}`}>
        <aside className="qa-inbox" aria-label="Liste des contrôles">
          <div className="qa-toolbar">
            <label className="qa-search">
              <IconSearch size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Site, prestation, réf…"
                enterKeyHint="search"
              />
            </label>
            <div className="qa-filters" role="tablist">
              {(
                [
                  ["open", "À faire", filterCounts.open],
                  ["overdue", "Retard", filterCounts.overdue],
                  ["en_cours", "En cours", filterCounts.en_cours],
                  ["conforme", "OK", filterCounts.conforme],
                  ["non_conforme", "NC", filterCounts.non_conforme],
                  ["all", "Tous", filterCounts.all],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === id}
                  className={`qa-filter${statusFilter === id ? " is-active" : ""}${id === "overdue" && count > 0 ? " is-alert" : ""}`}
                  onClick={() => setStatusFilter(id)}
                >
                  {label}
                  <em>{count}</em>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="qa-empty">
              <IconChecklist size={28} />
              <p>Chargement des contrôles…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="qa-empty">
              <IconChecklist size={28} />
              <p>Aucun contrôle dans ce filtre.</p>
              {canEdit ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={() => {
                  setComposerStep("site");
                  setComposerOpen(true);
                }}
                >
                  Créer un contrôle
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="qa-list">
              {filtered.map((c, i) => {
                const pct = itemProgress(c);
                const photosMissing = missingPhotoCount(c);
                const late = isOverdue(c);
                return (
                  <li key={c.id} style={{ ["--i" as string]: i }}>
                    <button
                      type="button"
                      className={`qa-card${c.id === selectedId ? " is-active" : ""}${c.status === "non_conforme" ? " is-nc" : ""}${late ? " is-late" : ""}`}
                      onClick={() => selectControl(c.id)}
                    >
                      <span className="qa-card__rail" aria-hidden />
                      <span className="qa-card__body">
                        <span className="qa-card__top">
                          <strong>{c.ref}</strong>
                          <em
                            className={`qa-status qa-status--${c.status}`}
                          >
                            {QUALITY_STATUS_LABELS[c.status]}
                          </em>
                        </span>
                        <span className="qa-card__title">
                          {c.prestationLabel}
                        </span>
                        <span className="qa-card__site">{c.siteName}</span>
                        <span className="qa-card__meta">
                          <span>
                            <IconClock size={12} /> {formatDue(c.dueDate)}
                          </span>
                          <span>
                            {QUALITY_PERIODICITY_LABELS[c.periodicity]}
                          </span>
                          {c.score !== null ? (
                            <span>{c.score}/100</span>
                          ) : (
                            <span>{pct}%</span>
                          )}
                        </span>
                        {(late || photosMissing > 0) &&
                        (c.status === "planifie" ||
                          c.status === "en_cours") ? (
                          <span className="qa-card__flags">
                            {late ? (
                              <span className="qa-flag qa-flag--late">
                                En retard
                              </span>
                            ) : null}
                            {photosMissing > 0 ? (
                              <span className="qa-flag qa-flag--photo">
                                {photosMissing} photo
                                {photosMissing > 1 ? "s" : ""}
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                        {(c.status === "planifie" ||
                          c.status === "en_cours") && (
                          <span
                            className="qa-meter"
                            aria-hidden
                          >
                            <i style={{ width: `${pct}%` }} />
                          </span>
                        )}
                      </span>
                      <span className="qa-card__score" aria-hidden>
                        {c.score !== null ? c.score : "—"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <main className="qa-detail" aria-live="polite">
          {!selected ? (
            <div className="qa-detail__empty">
              <IconQuality size={40} />
              <p className="qa-detail__empty-title">Prêt pour le terrain</p>
              <p>
                Sélectionnez un contrôle ou créez-en un pour démarrer la
                checklist sur site.
              </p>
              {canEdit ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={() => {
                  setComposerStep("site");
                  setComposerOpen(true);
                }}
                >
                  Nouveau contrôle
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <header className="qa-detail__head">
                <button
                  type="button"
                  className="qa-back"
                  onClick={() => setMobileDetail(false)}
                >
                  ← Liste
                </button>
                <div className="qa-detail__title">
                  <p className="qa-detail__eyebrow">
                    {QUALITY_PERIODICITY_LABELS[selected.periodicity]} · seuil{" "}
                    {selected.passThreshold}% ·{" "}
                    {QUALITY_STATUS_LABELS[selected.status]}
                  </p>
                  <h2>{selected.prestationLabel}</h2>
                  <p>{selected.siteName}</p>
                  <p className="qa-detail__ref">
                    {selected.ref} · échéance {formatDue(selected.dueDate)}
                    {isOverdue(selected) ? " · en retard" : ""}
                  </p>
                </div>
              </header>

              <div className="qa-mission" aria-label="Synthèse du contrôle">
                <div>
                  <p className="qa-mission__label">Score</p>
                  <strong
                    className={
                      belowThreshold
                        ? "is-low"
                        : displayScore !== null
                          ? "is-ok"
                          : undefined
                    }
                  >
                    {displayScore ?? "—"}
                    <small>/100</small>
                  </strong>
                </div>
                <div>
                  <p className="qa-mission__label">Seuil</p>
                  <strong>{selected.passThreshold}%</strong>
                </div>
                <div>
                  <p className="qa-mission__label">Checklist</p>
                  <strong>
                    {progress.done}/{progress.total}
                  </strong>
                </div>
                <div>
                  <p className="qa-mission__label">Photos</p>
                  <strong
                    className={
                      liveScore?.missingPhotos.length ? "is-low" : undefined
                    }
                  >
                    {liveScore?.missingPhotos.length
                      ? `${liveScore.missingPhotos.length} manq.`
                      : "OK"}
                  </strong>
                </div>
                <div className="qa-mission__bar" aria-hidden>
                  <i style={{ width: `${progress.pct}%` }} />
                </div>
              </div>

              {selected.status === "planifie" && canEdit ? (
                <div className="qa-start-banner">
                  <div>
                    <strong>Contrôle planifié</strong>
                    <p>
                      Démarrez pour noter chaque point et prendre les photos
                      obligatoires.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary qa-btn-lg qa-start-banner__btn"
                    disabled={busy}
                    onClick={() => void post("start", { id: selected.id })}
                  >
                    Démarrer
                  </button>
                </div>
              ) : null}

              <section
                className="qa-checklist"
                aria-label="Checklist digitale"
                ref={checklistRef}
              >
                <div className="qa-checklist__head">
                  <h3>Checklist</h3>
                  <span>
                    {progress.pct}% · {selected.templateLabel}
                  </span>
                </div>
                {selected.items.map((item, idx) => {
                  const needsPhoto = item.photoRequired && !item.photoUrl;
                  const isNext = item.itemId === nextItemId && editable;
                  const scored = item.score !== null;
                  return (
                    <article
                      key={item.itemId}
                      id={`qa-item-${item.itemId}`}
                      className={`qa-item${scored && !needsPhoto ? " is-done" : ""}${needsPhoto ? " needs-photo" : ""}${isNext ? " is-next" : ""}`}
                    >
                      <header>
                        <span className="qa-item__index">{idx + 1}</span>
                        <div>
                          <strong>{item.label}</strong>
                          <span>
                            Poids {item.weight}
                            {item.photoRequired ? " · photo req." : ""}
                            {scored ? ` · ${item.score}/100` : ""}
                          </span>
                        </div>
                        {scored && !needsPhoto ? (
                          <IconCheck size={18} className="qa-item__check" />
                        ) : null}
                      </header>

                      {editable ? (
                        <>
                          <div
                            className="qa-score-presets"
                            role="group"
                            aria-label={`Note ${item.label}`}
                          >
                            {SCORE_PRESETS.map((s) => (
                              <button
                                key={s.value}
                                type="button"
                                className={`qa-score-btn qa-score-btn--${s.tone}${item.score === s.value ? " is-on" : ""}`}
                                disabled={busy}
                                onClick={() =>
                                  void onScore(
                                    item.itemId,
                                    s.value,
                                    item.photoUrl || undefined,
                                  )
                                }
                              >
                                <b>{s.value}</b>
                                <small>{s.label}</small>
                              </button>
                            ))}
                          </div>

                          <div className="qa-photo-row">
                            <input
                              ref={(el) => {
                                photoRefs.current[item.itemId] = el;
                              }}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="qa-photo-input"
                              disabled={busy}
                              aria-label={`Photo ${item.label}`}
                              onChange={(e) => {
                                void onPhoto(
                                  item.itemId,
                                  e.target.files?.[0] ?? null,
                                );
                                e.target.value = "";
                              }}
                            />
                            <button
                              type="button"
                              className={`qa-photo-btn${needsPhoto ? " is-required" : ""}${item.photoUrl ? " has-photo" : ""}`}
                              disabled={busy}
                              onClick={() =>
                                photoRefs.current[item.itemId]?.click()
                              }
                            >
                              <IconCamera size={18} />
                              {item.photoUrl
                                ? "Reprendre"
                                : item.photoRequired
                                  ? "Photo obligatoire"
                                  : "Photo (optionnel)"}
                            </button>
                            {item.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.photoUrl} alt={item.label} />
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <div className="qa-item__readonly">
                          <p>
                            Note{" "}
                            <strong>{item.score ?? "—"}</strong>
                            /100
                          </p>
                          {item.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.photoUrl} alt={item.label} />
                          ) : item.photoRequired ? (
                            <p className="qa-complete__warn">
                              Photo manquante
                            </p>
                          ) : null}
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>

              {editable && canEdit ? (
                <section className="qa-complete" id="qa-complete-panel">
                  <h3>Validation</h3>
                  <p className="qa-complete__hint">
                    Score{" "}
                    <strong>
                      {displayScore ?? "—"} / seuil {selected.passThreshold}
                    </strong>
                    {belowThreshold
                      ? " — motif NC requis"
                      : canComplete
                        ? " — prêt à valider"
                        : " — terminez notes et photos"}
                  </p>
                  <label>
                    Observations
                    <textarea
                      rows={2}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Constats généraux, contexte site…"
                    />
                  </label>
                  {belowThreshold || ncNote ? (
                    <>
                      <label>
                        Non-conformités
                        <textarea
                          rows={2}
                          value={ncNote}
                          onChange={(e) => setNcNote(e.target.value)}
                          placeholder="Ex. sanitaires non conformes zone B"
                          required={belowThreshold}
                        />
                      </label>
                      <label>
                        Actions correctives
                        <textarea
                          rows={2}
                          value={correctiveAction}
                          onChange={(e) => setCorrectiveAction(e.target.value)}
                          placeholder="Actions à mener sur site"
                        />
                      </label>
                      <label>
                        Échéance corrective
                        <input
                          type="date"
                          value={correctiveDue}
                          onChange={(e) => setCorrectiveDue(e.target.value)}
                        />
                      </label>
                    </>
                  ) : null}
                  {!canComplete ? (
                    <p className="qa-complete__warn">
                      {progress.done < progress.total
                        ? `Encore ${progress.total - progress.done} point(s) à noter.`
                        : null}
                      {liveScore?.missingPhotos.length
                        ? ` Photos manquantes : ${liveScore.missingPhotos.join(" · ")}.`
                        : null}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary qa-btn-lg qa-complete__submit"
                    disabled={
                      busy ||
                      !canComplete ||
                      (belowThreshold && !ncNote.trim())
                    }
                    onClick={() =>
                      void post("complete", {
                        id: selected.id,
                        observations,
                        ncNote,
                        correctiveAction,
                        correctiveDue,
                      })
                    }
                  >
                    {belowThreshold ? "Valider en NC" : "Valider conforme"}
                  </button>
                </section>
              ) : null}

              {(selected.status === "conforme" ||
                selected.status === "non_conforme") &&
              canEdit ? (
                <div className="qa-archive">
                  {selected.status === "non_conforme" ? (
                    <a
                      className="btn-admin btn-admin--primary qa-btn-lg"
                      href="/admin/operations?tab=qualite&feature=nc"
                    >
                      Voir / traiter la NC
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost qa-btn-lg"
                    disabled={busy}
                    onClick={() => void post("close", { id: selected.id })}
                  >
                    Archiver
                  </button>
                </div>
              ) : null}

              {selected.observations ? (
                <p className="qa-obs">Observations : {selected.observations}</p>
              ) : null}

              {selected.validatedAt ? (
                <p className="qa-validated">
                  Validé le{" "}
                  {new Date(selected.validatedAt).toLocaleString("fr-FR")}
                  {selected.validatedByName
                    ? ` · ${selected.validatedByName}`
                    : ""}
                </p>
              ) : null}

              {selected.ncNote ? (
                <p className="qa-nc">NC : {selected.ncNote}</p>
              ) : null}

              {selected.correctiveAction ? (
                <p className="qa-corrective">
                  Correctif : {selected.correctiveAction}
                  {selected.correctiveDue
                    ? ` · échéance ${formatDue(selected.correctiveDue)}`
                    : ""}
                </p>
              ) : null}

              <section className="qa-history">
                <h3>Journal</h3>
                <ol>
                  {selected.history.slice(0, 8).map((h) => (
                    <li key={h.id}>
                      <time>{new Date(h.at).toLocaleString("fr-FR")}</time>
                      <span>
                        {h.byName} — {h.detail}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </main>
      </div>

      {showDock && selected ? (
        <div className="qa-dock" role="region" aria-label="Actions terrain">
          {selected.status === "planifie" ? (
            <button
              type="button"
              className="btn-admin btn-admin--primary qa-dock__btn"
              disabled={busy}
              onClick={() => void post("start", { id: selected.id })}
            >
              Démarrer le contrôle
            </button>
          ) : canComplete ? (
            <button
              type="button"
              className="btn-admin btn-admin--primary qa-dock__btn"
              disabled={busy || (belowThreshold && !ncNote.trim())}
              onClick={() => {
                if (belowThreshold && !ncNote.trim()) {
                  scrollToComplete();
                  toast.error("Indiquez le motif de non-conformité");
                  return;
                }
                void post("complete", {
                  id: selected.id,
                  observations,
                  ncNote,
                  correctiveAction,
                  correctiveDue,
                });
              }}
            >
              {belowThreshold ? "Valider en NC" : "Valider conforme"}
            </button>
          ) : (
            <button
              type="button"
              className="btn-admin btn-admin--primary qa-dock__btn"
              disabled={busy}
              onClick={() => {
                if (nextItemId) {
                  document
                    .getElementById(`qa-item-${nextItemId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
            >
              Continuer · {progress.done}/{progress.total}
            </button>
          )}
        </div>
      ) : null}

      <AdminFormWizard
        open={composerOpen && canEdit}
        portal
        onClose={() => {
          setComposerOpen(false);
          setComposerStep("site");
        }}
        titleId="qa-composer-title"
        eyebrow="Qualité"
        title="Nouveau contrôle"
        lead="Checklist digitale liée à un site et une prestation, avec périodicité et seuil de conformité."
        steps={[
          { id: "site", label: "Site", hint: "Lieu & prestation" },
          { id: "params", label: "Paramètres", hint: "Modèle & échéance" },
          { id: "revue", label: "Revue", hint: "Contrôle avant création" },
        ]}
        stepId={composerStep}
        onStepChange={(id) =>
          setComposerStep(id as "site" | "params" | "revue")
        }
        canEnterStep={canEnterComposerStep}
        onStepBlocked={pulseComposerError}
        shake={composerShake}
        formId="necs-qa-create-form"
        onSubmit={(e) => void onCreate(e)}
        submitLabel="Créer le contrôle"
        busy={busy}
        canSubmit={siteReady}
      >
        {composerStep === "site" ? (
          <FwPanel aria-label="Site">
            <FwPanelHead
              title="Site & prestation"
              description="Choisissez le lieu contrôlé et la prestation associée."
            />
            <FwGrid>
              <FwField label="Site *">
                <select
                  required
                  value={form.siteId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      siteId: e.target.value,
                      prestationId: "",
                    }))
                  }
                >
                  <option value="">— Site —</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </FwField>
              <FwField label="Prestation *">
                <select
                  required
                  value={form.prestationId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      prestationId: e.target.value,
                    }))
                  }
                >
                  <option value="">— Prestation —</option>
                  {sitePrestations.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "params" ? (
          <FwPanel aria-label="Paramètres">
            <FwPanelHead
              title="Paramètres du contrôle"
              description="Modèle de checklist, périodicité, seuil et échéance."
            />
            <FwGrid>
              <FwField label="Modèle checklist" wide>
                <select
                  value={form.templateId}
                  onChange={(e) => {
                    const tpl = templates.find((t) => t.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      templateId: e.target.value,
                      periodicity: tpl?.periodicity || f.periodicity,
                      passThreshold: String(
                        tpl?.passThreshold ?? f.passThreshold,
                      ),
                    }));
                  }}
                >
                  {templates.length === 0 ? (
                    <option value="">Modèle standard (auto)</option>
                  ) : (
                    templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} ({t.passThreshold}%)
                      </option>
                    ))
                  )}
                </select>
              </FwField>
              <FwField label="Seuil %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.passThreshold}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      passThreshold: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Échéance">
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                />
              </FwField>
            </FwGrid>
            <FwBlock>
              <FwPanelHead
                title="Périodicité"
                description="Cadence prévue pour ce contrôle."
              />
              <FwChips>
                {(
                  Object.keys(
                    QUALITY_PERIODICITY_LABELS,
                  ) as QualityPeriodicity[]
                ).map((p) => (
                  <FwChip
                    key={p}
                    selected={form.periodicity === p}
                    title={QUALITY_PERIODICITY_LABELS[p]}
                    onClick={() =>
                      setForm((f) => ({ ...f, periodicity: p }))
                    }
                  />
                ))}
              </FwChips>
            </FwBlock>
          </FwPanel>
        ) : null}

        {composerStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue avant création"
              description="Vérifiez le site, la prestation et les paramètres."
            />
            <FwReview>
              <FwReviewCard
                title="Cible"
                rows={[
                  {
                    label: "Site",
                    value:
                      sites.find((s) => s.id === form.siteId)?.name || "—",
                  },
                  {
                    label: "Prestation",
                    value:
                      sitePrestations.find((p) => p.id === form.prestationId)
                        ?.label || "—",
                  },
                ]}
              />
              <FwReviewCard
                title="Paramètres"
                rows={[
                  {
                    label: "Modèle",
                    value:
                      templates.find((t) => t.id === form.templateId)?.label ||
                      "Standard (auto)",
                  },
                  {
                    label: "Périodicité",
                    value: QUALITY_PERIODICITY_LABELS[form.periodicity],
                  },
                  { label: "Seuil", value: `${form.passThreshold}%` },
                  { label: "Échéance", value: form.dueDate || "—" },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>
    </div>
  );
}
