"use client";

import Link from "next/link";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  type PhotoKind,
  type SiteVisit,
  NECS_SITE_PHOTOS_EVENT,
  addPhotoToVisit,
  countByKind,
  emptyVisit,
  isTodayVisit,
  loadSiteVisits,
  removePhotoFromVisit,
  saveSiteVisits,
  updateVisitMeta,
  visitNeedsProof,
} from "@/lib/site-photos";
import { fileToOptimizedDataUrl } from "@/lib/settings";
import {
  deleteVercelBlob,
  persistOptimizedImage,
} from "@/lib/vercel-blob-client";
import { downloadCsv, downloadImage, downloadImages } from "@/lib/download";
import { isNettoyeur, loadSession } from "@/lib/auth";
import { ModuleHeader } from "@/components/admin/Ui";
import { toast } from "@/lib/toast";
import { IconSearch, IconVisit } from "@/components/admin/Icons";

type VisitFilter = "all" | "en_cours" | "termine" | "today" | "sans_preuve";

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatRelative(isoDate: string): string {
  if (isTodayVisit(isoDate)) return "Aujourd’hui";
  try {
    const d = new Date(`${isoDate}T12:00:00`).getTime();
    const days = Math.round((Date.now() - d) / 86_400_000);
    if (days === 1) return "Hier";
    if (days > 1 && days < 7) return `Il y a ${days} j`;
    return formatDate(isoDate);
  } catch {
    return isoDate;
  }
}

export function TerrainPhotosWorkspace() {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [ready, setReady] = useState(false);
  const [agentName, setAgentName] = useState("Agent terrain");
  const [agentMode, setAgentMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SiteVisit | null>(null);
  const [busyKind, setBusyKind] = useState<PhotoKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VisitFilter>("all");
  const [lightbox, setLightbox] = useState<{
    src: string;
    label: string;
  } | null>(null);
  const arrivalInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const hydrate = (name: string, agent: boolean) => {
    const loaded = loadSiteVisits();
    if (agent) {
      const visible = loaded.filter(
        (v) => v.agent.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      setVisits(visible);
      setSelectedId((prev) =>
        prev && visible.some((v) => v.id === prev)
          ? prev
          : (visible[0]?.id ?? null),
      );
    } else {
      setVisits(loaded);
      setSelectedId((prev) =>
        prev && loaded.some((v) => v.id === prev)
          ? prev
          : (loaded[0]?.id ?? null),
      );
    }
  };

  useEffect(() => {
    const session = loadSession();
    const name = session?.name || "Agent terrain";
    const agent = isNettoyeur(session);
    setAgentName(name);
    setAgentMode(agent);
    hydrate(name, agent);
    setReady(true);

    const onSync = () => hydrate(name, agent);
    window.addEventListener(NECS_SITE_PHOTOS_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(NECS_SITE_PHOTOS_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  useEffect(() => {
    if (!creating && !editing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCreating(false);
        setEditing(false);
        setLightbox(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [creating, editing]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const persist = (nextVisible: SiteVisit[]) => {
    if (agentMode) {
      const full = loadSiteVisits();
      const mineIds = new Set(
        full
          .filter(
            (v) =>
              v.agent.trim().toLowerCase() === agentName.trim().toLowerCase(),
          )
          .map((v) => v.id),
      );
      const others = full.filter((v) => !mineIds.has(v.id));
      saveSiteVisits([...nextVisible, ...others]);
      setVisits(nextVisible);
      return;
    }
    setVisits(nextVisible);
    saveSiteVisits(nextVisible);
  };

  const stats = useMemo(() => {
    const enCours = visits.filter((v) => v.status === "En cours").length;
    const termine = visits.filter((v) => v.status === "Terminé").length;
    const today = visits.filter((v) => isTodayVisit(v.date)).length;
    const sansPreuve = visits.filter(visitNeedsProof).length;
    const photos = visits.reduce((n, v) => n + v.photos.length, 0);
    return {
      total: visits.length,
      enCours,
      termine,
      today,
      sansPreuve,
      photos,
    };
  }, [visits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visits.filter((v) => {
      if (filter === "en_cours" && v.status !== "En cours") return false;
      if (filter === "termine" && v.status !== "Terminé") return false;
      if (filter === "today" && !isTodayVisit(v.date)) return false;
      if (filter === "sans_preuve" && !visitNeedsProof(v)) return false;
      if (!q) return true;
      const hay = [v.site, v.client, v.agent, v.notes, v.id]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [visits, query, filter]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((v) => v.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const selected =
    filtered.find((v) => v.id === selectedId) ?? filtered[0] ?? null;

  const openCreate = () => {
    setDraft(emptyVisit(agentName));
    setCreating(true);
    setEditing(false);
    setError(null);
  };

  const openEdit = () => {
    if (!selected) return;
    setDraft({ ...selected });
    setEditing(true);
    setCreating(false);
    setError(null);
  };

  const saveDraft = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.site.trim() || !draft.client.trim()) {
      setError("Site et client sont obligatoires.");
      return;
    }
    if (creating) {
      const visit: SiteVisit = {
        ...draft,
        site: draft.site.trim(),
        client: draft.client.trim(),
        agent: agentMode ? agentName : draft.agent.trim() || agentName,
        notes: draft.notes.trim(),
      };
      persist([visit, ...visits]);
      setSelectedId(visit.id);
      toast.success("Visite créée.");
    } else {
      const updated = updateVisitMeta(draft, {
        site: draft.site,
        client: draft.client,
        date: draft.date,
        agent: agentMode ? agentName : draft.agent,
        notes: draft.notes,
      });
      persist(visits.map((v) => (v.id === updated.id ? updated : v)));
      toast.success("Visite mise à jour.");
    }
    setCreating(false);
    setEditing(false);
    setDraft(null);
    setError(null);
  };

  const onPickPhoto = async (kind: PhotoKind, file: File | null) => {
    if (!selected || !file) return;
    setError(null);
    setBusyKind(kind);
    try {
      const { url } = await persistOptimizedImage({
        file,
        folder: "terrain",
        maxSize: 1280,
        forceJpeg: true,
        quality: 0.72,
        optimize: fileToOptimizedDataUrl,
      });
      const updated = addPhotoToVisit(selected, kind, url);
      persist(visits.map((v) => (v.id === updated.id ? updated : v)));
      toast.success(
        kind === "after"
          ? "Photo de départ enregistrée."
          : "Photo d’arrivée enregistrée.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Impossible d’enregistrer la photo.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyKind(null);
    }
  };

  const deletePhoto = (photoId: string) => {
    if (!selected) return;
    if (!confirm("Supprimer cette photo ?")) return;
    const photo = selected.photos.find((p) => p.id === photoId);
    const updated = removePhotoFromVisit(selected, photoId);
    persist(visits.map((v) => (v.id === updated.id ? updated : v)));
    if (photo?.dataUrl) {
      void deleteVercelBlob(photo.dataUrl);
    }
    toast.info("Photo supprimée.");
  };

  const deleteVisit = (id: string) => {
    if (!confirm("Supprimer cette visite et toutes ses photos ?")) return;
    const victim = visits.find((v) => v.id === id);
    const next = visits.filter((v) => v.id !== id);
    persist(next);
    setSelectedId(next[0]?.id ?? null);
    victim?.photos.forEach((p) => {
      if (p.dataUrl) void deleteVercelBlob(p.dataUrl);
    });
    toast.info("Visite supprimée.");
  };

  const exportCsv = () => {
    const rows = [
      [
        "ID",
        "Date",
        "Site",
        "Client",
        "Agent",
        "Statut",
        "Photos avant",
        "Photos après",
        "Notes",
      ],
      ...filtered.map((v) => [
        v.id,
        v.date,
        v.site,
        v.client,
        v.agent,
        v.status,
        String(countByKind(v, "arrival")),
        String(countByKind(v, "after")),
        v.notes.replace(/\s+/g, " ").trim(),
      ]),
    ];
    downloadCsv(
      rows,
      `necs-photos-terrain-${new Date().toISOString().slice(0, 10)}`,
    );
    toast.success(
      `Export CSV · ${filtered.length} visite${filtered.length > 1 ? "s" : ""}`,
    );
  };

  if (!ready) {
    return (
      <div className="terrain-page" aria-busy="true">
        <div className="terrain-skel terrain-skel--lg" />
        <div className="terrain-kpis">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="terrain-skel" />
          ))}
        </div>
        <div className="terrain-layout">
          <div className="terrain-skel terrain-skel--side" />
          <div className="terrain-skel terrain-skel--main" />
        </div>
      </div>
    );
  }

  const arrivalCount = selected ? countByKind(selected, "arrival") : 0;
  const afterCount = selected ? countByKind(selected, "after") : 0;

  const filters: Array<{ id: VisitFilter; label: string; count: number }> = [
    { id: "all", label: "Toutes", count: stats.total },
    { id: "en_cours", label: "En cours", count: stats.enCours },
    { id: "termine", label: "Terminées", count: stats.termine },
    { id: "today", label: "Aujourd’hui", count: stats.today },
    { id: "sans_preuve", label: "Sans preuve", count: stats.sansPreuve },
  ];

  return (
    <div className="terrain-page">
      <ModuleHeader
        tone="#1f6b28"
        badge={agentMode ? "Espace agent" : "Opérations"}
        icon={<IconVisit size={22} />}
        title={agentMode ? "Photos arrivée & départ" : "Photos terrain"}
        description={
          agentMode
            ? "Photo à l’arrivée sur site, puis photo au départ après nettoyage."
            : "Preuves photo avant / après nettoyage par site, agent et date."
        }
        meta={
          <>
            <span>
              <strong>{stats.total}</strong> visites
            </span>
            <span>
              <strong>{stats.sansPreuve}</strong> sans preuve
            </span>
            <span>
              <strong>{stats.photos}</strong> photos
            </span>
          </>
        }
        note={
          agentMode
            ? "Arrivée = état du site au début. Départ = preuve après nettoyage (clôture la visite)."
            : "Les agents ne voient que leurs propres sites. Stockage image : Vercel Blob (ou local)."
        }
        actions={
          <>
            {agentMode ? (
              <Link
                href="/admin/mon-espace"
                className="btn-admin btn-admin--ghost"
              >
                ← Accueil agent
              </Link>
            ) : null}
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={exportCsv}
              disabled={filtered.length === 0}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={openCreate}
            >
              {agentMode ? "+ Site à photographier" : "+ Nouvelle visite"}
            </button>
          </>
        }
      />

      <section className="terrain-kpis" aria-label="Indicateurs terrain">
        <article className="terrain-kpi terrain-kpi--accent">
          <p>Visites</p>
          <strong>{stats.total}</strong>
          <span>{stats.today} aujourd’hui</span>
        </article>
        <article className="terrain-kpi">
          <p>En cours</p>
          <strong>{stats.enCours}</strong>
          <span>sans clôture</span>
        </article>
        <article className="terrain-kpi">
          <p>Terminées</p>
          <strong>{stats.termine}</strong>
          <span>preuve après OK</span>
        </article>
        <article className="terrain-kpi">
          <p>Sans preuve</p>
          <strong>{stats.sansPreuve}</strong>
          <span>à photographier</span>
        </article>
      </section>

      <div className="terrain-toolbar">
        <label className="terrain-search">
          <IconSearch size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher site, client, agent…"
            aria-label="Rechercher une visite"
          />
        </label>
        <div className="terrain-filters" role="tablist" aria-label="Filtres">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`terrain-chip${filter === f.id ? " is-active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <em>{f.count}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="terrain-layout">
        <aside className="terrain-sidebar">
          <div className="terrain-sidebar__head">
            <h3>Visites</h3>
            <span>{filtered.length}</span>
          </div>
          <div className="terrain-visit-list">
            {filtered.length === 0 ? (
              <div className="terrain-empty-side">
                <p>
                  {visits.length === 0
                    ? "Aucune visite pour le moment."
                    : "Aucun résultat pour ce filtre."}
                </p>
                {visits.length > 0 ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    Réinitialiser
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    onClick={openCreate}
                  >
                    + Créer
                  </button>
                )}
              </div>
            ) : (
              filtered.map((v) => {
                const active = v.id === selectedId;
                const a = countByKind(v, "arrival");
                const d = countByKind(v, "after");
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`terrain-visit-item${active ? " is-active" : ""}${
                      agentMode
                        ? a === 0 || d === 0
                          ? " is-warn"
                          : ""
                        : visitNeedsProof(v)
                          ? " is-warn"
                          : ""
                    }`}
                    onClick={() => setSelectedId(v.id)}
                  >
                    <div className="terrain-visit-item__top">
                      <strong>{v.site}</strong>
                      <span
                        className={`terrain-status ${v.status === "Terminé" ? "is-done" : "is-open"}`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <span className="terrain-visit-item__client">{v.client}</span>
                    <div className="terrain-visit-item__meta">
                      <span>{formatRelative(v.date)}</span>
                      <span className="terrain-pills">
                        <em
                          data-kind="arrival"
                          title={agentMode ? "Arrivée" : "Avant"}
                        >
                          {a}
                        </em>
                        <em
                          data-kind="departure"
                          title={agentMode ? "Départ" : "Après nettoyage"}
                        >
                          {d}
                        </em>
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="terrain-main">
          {!selected ? (
            <div className="terrain-blank-state">
              <div className="terrain-blank-state__orb" aria-hidden />
              <p className="terrain-blank-state__eyebrow">Preuves terrain</p>
              <h2>Aucune visite sélectionnée</h2>
              <p>
                Choisissez une visite à gauche ou créez un site à
                photographier.
              </p>
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={openCreate}
              >
                + Nouvelle visite
              </button>
            </div>
          ) : (
            <>
              <header className="terrain-hero">
                <div className="terrain-hero__ribbon" aria-hidden />
                <div className="terrain-hero__body">
                  <div className="terrain-hero__text">
                    <span
                      className={`terrain-status ${selected.status === "Terminé" ? "is-done" : "is-open"}`}
                    >
                      {selected.status}
                    </span>
                    <h2>{selected.site}</h2>
                    <p>
                      {selected.client}
                      <span aria-hidden> · </span>
                      {formatDate(selected.date)}
                      <span aria-hidden> · </span>
                      {selected.agent}
                      <span aria-hidden> · </span>
                      <code>{selected.id}</code>
                    </p>
                  </div>
                  <div className="terrain-hero__actions">
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={openEdit}
                    >
                      Modifier
                    </button>
                    {selected.photos.length > 0 ? (
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        onClick={() => {
                          void downloadImages(
                            selected.photos.map((p, i) => ({
                              src: p.dataUrl,
                              basename: `necs-${selected.site}-${p.kind}-${i + 1}`,
                            })),
                          ).then((result) => {
                            if (result.failed > 0) {
                              toast.warning(
                                `${result.ok} photo(s), ${result.failed} échec(s).`,
                              );
                            } else if (result.ok > 0) {
                              toast.success(
                                `${result.ok} photo(s) téléchargée(s).`,
                              );
                            }
                          });
                        }}
                      >
                        Télécharger tout
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() => deleteVisit(selected.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                <div className="terrain-progress" aria-label="Progression">
                  <div
                    className={`terrain-step${arrivalCount > 0 ? " is-done" : ""}`}
                  >
                    <span className="terrain-step__num">1</span>
                    <div>
                      <strong>{agentMode ? "Arrivée" : "Avant"}</strong>
                      <small>
                        {selected.arrivalAt ??
                          (agentMode ? "Photo obligatoire" : "Optionnel")}
                      </small>
                    </div>
                  </div>
                  <div className="terrain-progress__line" aria-hidden />
                  <div
                    className={`terrain-step${afterCount > 0 ? " is-done" : ""}`}
                  >
                    <span className="terrain-step__num">2</span>
                    <div>
                      <strong>{agentMode ? "Départ" : "Après nettoyage"}</strong>
                      <small>
                        {selected.afterAt ?? "Photo obligatoire"}
                      </small>
                    </div>
                  </div>
                  <div className="terrain-progress__score">
                    <strong>
                      {arrivalCount > 0 && afterCount > 0
                        ? "OK"
                        : `${(arrivalCount > 0 ? 1 : 0) + (afterCount > 0 ? 1 : 0)}/2`}
                    </strong>
                    <span>
                      {arrivalCount > 0 && afterCount > 0
                        ? "prouvé"
                        : "en attente"}
                    </span>
                  </div>
                </div>
              </header>

              {selected.notes ? (
                <p className="terrain-notes">{selected.notes}</p>
              ) : null}

              {error ? <p className="users-form-error">{error}</p> : null}

              <div className="terrain-photo-cols">
                <PhotoLane
                  title={agentMode ? "Photo d’arrivée" : "Avant nettoyage"}
                  hint={
                    agentMode
                      ? "Capturez le site dès votre arrivée"
                      : "État du site au début (optionnel)"
                  }
                  badgeLabel={agentMode ? "Arrivée" : "Avant"}
                  captureLabel={
                    agentMode
                      ? "Photographier l’arrivée"
                      : "Prendre une photo"
                  }
                  emptyTitle={
                    agentMode
                      ? "Aucune photo d’arrivée"
                      : "Pas encore de photo"
                  }
                  emptyHint={
                    agentMode
                      ? "Pointez l’arrivée, puis photographiez l’état du site."
                      : "Appuyez sur le bouton ci-dessus pour capturer le site."
                  }
                  kind="arrival"
                  photos={selected.photos.filter((p) => p.kind === "arrival")}
                  busy={busyKind === "arrival"}
                  inputRef={arrivalInputRef}
                  onCapture={() => arrivalInputRef.current?.click()}
                  onFile={(file) => void onPickPhoto("arrival", file)}
                  onDelete={deletePhoto}
                  onPreview={(src, label) => setLightbox({ src, label })}
                />
                <PhotoLane
                  title={
                    agentMode ? "Photo de départ" : "Après nettoyage"
                  }
                  hint={
                    agentMode
                      ? "Preuve après nettoyage, avant de partir"
                      : "Preuve déposée par le nettoyeur après intervention"
                  }
                  badgeLabel={agentMode ? "Départ" : "Après"}
                  captureLabel={
                    agentMode
                      ? "Photographier le départ"
                      : "Photographier après nettoyage"
                  }
                  emptyTitle={
                    agentMode
                      ? "Aucune photo de départ"
                      : "Aucune photo après nettoyage"
                  }
                  emptyHint={
                    agentMode
                      ? "Terminez le nettoyage, photographiez, puis pointez le départ."
                      : "Terminez le nettoyage, puis capturez le résultat sur place."
                  }
                  kind="after"
                  photos={selected.photos.filter((p) => p.kind === "after")}
                  busy={busyKind === "after"}
                  inputRef={afterInputRef}
                  featured={agentMode}
                  onCapture={() => afterInputRef.current?.click()}
                  onFile={(file) => void onPickPhoto("after", file)}
                  onDelete={deletePhoto}
                  onPreview={(src, label) => setLightbox({ src, label })}
                />
              </div>
            </>
          )}
        </section>
      </div>

      {(creating || editing) && draft ? (
      <AdminOverlayPortal>
        <div
          className="doc-overlay-backdrop clients-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terrain-form-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCreating(false);
              setEditing(false);
            }
          }}
        >
          <div className="doc-overlay-dialog clients-overlay__dialog settings-user-dialog">
            <div className="doc-overlay-header">
              <div className="doc-overlay-header__left">
                <p className="doc-overlay-header__tag">Photos terrain</p>
                <h2 id="terrain-form-title">
                  {creating
                    ? agentMode
                      ? "Nouveau site à prouver"
                      : "Nouvelle visite site"
                    : "Modifier la visite"}
                </h2>
                <p className="doc-overlay-header__sub">
                  {creating
                    ? agentMode
                      ? "Puis photos d’arrivée et de départ · Esc pour fermer"
                      : `${draft.id} · Esc pour fermer`
                    : `${draft.id} · Esc pour fermer`}
                </p>
              </div>
              <div className="doc-overlay-header__right">
                <button
                  type="submit"
                  form="necs-terrain-form"
                  className="btn-admin btn-admin--primary"
                >
                  {creating
                    ? agentMode
                      ? "Créer et photographier"
                      : "Créer la visite"
                    : "Enregistrer"}
                </button>
                <button
                  type="button"
                  className="doc-overlay-close-btn"
                  aria-label="Fermer"
                  onClick={() => {
                    setCreating(false);
                    setEditing(false);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <form
              id="necs-terrain-form"
              className="settings-user-form"
              onSubmit={saveDraft}
            >
              <div className="overlay-form-scroll">
              {error ? <p className="users-form-error">{error}</p> : null}
              <div className="settings-grid">
                <label className="settings-field is-full">
                  <span>Site / lieu *</span>
                  <input
                    required
                    autoFocus
                    value={draft.site}
                    onChange={(e) =>
                      setDraft({ ...draft, site: e.target.value })
                    }
                    placeholder="Ex. Immeuble Horizon ; étage 3"
                  />
                </label>
                <label className="settings-field">
                  <span>Client *</span>
                  <input
                    required
                    value={draft.client}
                    onChange={(e) =>
                      setDraft({ ...draft, client: e.target.value })
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) =>
                      setDraft({ ...draft, date: e.target.value })
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>Agent</span>
                  <input
                    value={draft.agent}
                    readOnly={agentMode}
                    onChange={(e) =>
                      setDraft({ ...draft, agent: e.target.value })
                    }
                  />
                </label>
                <label className="settings-field is-full">
                  <span>Notes / consignes</span>
                  <textarea
                    rows={3}
                    value={draft.notes}
                    onChange={(e) =>
                      setDraft({ ...draft, notes: e.target.value })
                    }
                  />
                </label>
              </div>
              </div>
            </form>
          </div>
        </div>
        </AdminOverlayPortal>
      ) : null}

      {lightbox ? (
        <div
          className="terrain-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.label}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="terrain-lightbox__close"
            aria-label="Fermer"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.label}
            onClick={(e) => e.stopPropagation()}
          />
          <p>{lightbox.label}</p>
        </div>
      ) : null}
    </div>
  );
}

function PhotoLane({
  title,
  hint,
  kind,
  photos,
  busy,
  inputRef,
  onCapture,
  onFile,
  onDelete,
  onPreview,
  featured = false,
  badgeLabel,
  captureLabel,
  emptyTitle,
  emptyHint,
}: {
  title: string;
  hint: string;
  kind: PhotoKind;
  photos: SiteVisit["photos"];
  busy: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onCapture: () => void;
  onFile: (file: File | null) => void;
  onDelete: (id: string) => void;
  onPreview: (src: string, label: string) => void;
  featured?: boolean;
  badgeLabel?: string;
  captureLabel?: string;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const badge = badgeLabel ?? (kind === "after" ? "Après" : "Avant");
  const capture =
    captureLabel ??
    (kind === "after"
      ? "Photographier après nettoyage"
      : "Prendre une photo");
  const emptyHead =
    emptyTitle ??
    (kind === "after"
      ? "Aucune photo après nettoyage"
      : "Pas encore de photo");
  const emptyBody =
    emptyHint ??
    (kind === "after"
      ? "Terminez le nettoyage, puis capturez le résultat sur place."
      : "Appuyez sur le bouton ci-dessus pour capturer le site.");

  return (
    <div
      className={`terrain-lane terrain-lane--${kind}${featured ? " is-featured" : ""}`}
    >
      <div className="terrain-lane__head">
        <div>
          <span className="terrain-lane__badge">{badge}</span>
          <h4>{title}</h4>
          <p>{hint}</p>
        </div>
        <span className="terrain-lane__count">
          {photos.length} photo{photos.length > 1 ? "s" : ""}
        </span>
      </div>

      <button
        type="button"
        className="terrain-capture-btn"
        onClick={onCapture}
        disabled={busy}
      >
        <span className="terrain-capture-btn__icon" aria-hidden>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
        <span>
          <strong>{busy ? "Enregistrement…" : capture}</strong>
          <small>Caméra ou galerie du téléphone</small>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="terrain-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onFile(file);
          e.target.value = "";
        }}
      />

      {photos.length === 0 ? (
        <div className="terrain-lane__empty">
          <strong>{emptyHead}</strong>
          <p>{emptyBody}</p>
        </div>
      ) : (
        <div className="terrain-photo-grid">
          {photos.map((p) => (
            <figure key={p.id} className="terrain-photo">
              <button
                type="button"
                className="terrain-photo__thumb"
                onClick={() => onPreview(p.dataUrl, `${title} · ${p.takenAt}`)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.dataUrl} alt={`${title} ${p.takenAt}`} />
              </button>
              <figcaption>
                <span>{p.takenAt}</span>
                <span className="terrain-photo__actions">
                  <button
                    type="button"
                    onClick={() =>
                      onPreview(p.dataUrl, `${title} · ${p.takenAt}`)
                    }
                  >
                    Agrandir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void downloadImage(
                        p.dataUrl,
                        `necs-${kind}-${p.takenAt.replace(/[^\d]/g, "")}`,
                      ).catch(() => {
                        toast.error("Téléchargement de la photo impossible.");
                      });
                    }}
                  >
                    Télécharger
                  </button>
                  <button type="button" onClick={() => onDelete(p.id)}>
                    Supprimer
                  </button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
