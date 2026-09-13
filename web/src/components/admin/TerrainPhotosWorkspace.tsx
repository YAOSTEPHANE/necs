"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  type PhotoKind,
  type SiteVisit,
  addPhotoToVisit,
  countByKind,
  emptyVisit,
  loadSiteVisits,
  removePhotoFromVisit,
  saveSiteVisits,
} from "@/lib/site-photos";
import { fileToOptimizedDataUrl } from "@/lib/settings";
import {
  deleteVercelBlob,
  persistOptimizedImage,
} from "@/lib/vercel-blob-client";
import { downloadImage, downloadImages } from "@/lib/download";
import { isNettoyeur, loadSession } from "@/lib/auth";
import { PageHeader, StatusBadge } from "@/components/admin/Ui";
import { IconVisit } from "@/components/admin/Icons";

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

export function TerrainPhotosWorkspace() {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [ready, setReady] = useState(false);
  const [agentName, setAgentName] = useState("Agent terrain");
  const [agentMode, setAgentMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<SiteVisit | null>(null);
  const [busyKind, setBusyKind] = useState<PhotoKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const arrivalInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = loadSession();
    const name = session?.name || "Agent terrain";
    const agent = isNettoyeur(session);
    setAgentName(name);
    setAgentMode(agent);
    const loaded = loadSiteVisits();
    if (agent) {
      const visible = loaded.filter(
        (v) =>
          v.agent.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      setVisits(visible);
      if (visible[0]) setSelectedId(visible[0].id);
    } else {
      setVisits(loaded);
      if (loaded[0]) setSelectedId(loaded[0].id);
    }
    setReady(true);
  }, []);

  const selected = useMemo(
    () => visits.find((v) => v.id === selectedId) ?? null,
    [visits, selectedId],
  );

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

  const openCreate = () => {
    setDraft(emptyVisit(agentName));
    setCreating(true);
    setError(null);
  };

  const saveCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.site.trim() || !draft.client.trim()) {
      setError("Site et client sont obligatoires.");
      return;
    }
    const visit: SiteVisit = {
      ...draft,
      site: draft.site.trim(),
      client: draft.client.trim(),
      agent: agentMode ? agentName : draft.agent.trim() || agentName,
      notes: draft.notes.trim(),
    };
    persist([visit, ...visits]);
    setSelectedId(visit.id);
    setCreating(false);
    setDraft(null);
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d’enregistrer la photo.",
      );
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
  };

  const deleteVisit = (id: string) => {
    if (!confirm("Supprimer cette visite et toutes ses photos ?")) return;
    const next = visits.filter((v) => v.id !== id);
    persist(next);
    setSelectedId(next[0]?.id ?? null);
  };

  if (!ready) {
    return <p className="note">Chargement du terrain…</p>;
  }

  const arrivalCount = selected ? countByKind(selected, "arrival") : 0;
  const afterCount = selected ? countByKind(selected, "after") : 0;
  const progress = afterCount > 0 ? 2 : arrivalCount > 0 ? 1 : 0;

  return (
    <div className="terrain-page">
      <PageHeader
        code={
          <span className="page-header__icon">
            <span
              className="page-header__glyph"
              style={{ ["--icon-c" as string]: "#1f6b28" }}
            >
              <IconVisit size={18} />
            </span>
            {agentMode ? "AGENT" : "OPS"}
          </span>
        }
        title={agentMode ? "Photos après nettoyage" : "Photos terrain"}
        description={
          agentMode
            ? "Prenez les photos du site une fois le nettoyage terminé — preuve obligatoire."
            : "Les nettoyeurs déposent les preuves photo après nettoyage sur chaque site."
        }
        actions={
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={openCreate}
          >
            {agentMode ? "+ Site à photographier" : "+ Nouvelle visite"}
          </button>
        }
      />

      <div className="terrain-layout">
        <aside className="terrain-sidebar">
          <div className="terrain-sidebar__head">
            <h3>Visites</h3>
            <span>{visits.length}</span>
          </div>
          <div className="terrain-visit-list">
            {visits.length === 0 ? (
              <p className="terrain-empty-hint">
                {agentMode
                  ? "Créez un site, nettoyez, puis photographiez le résultat."
                  : "Aucune visite. Créez-en une pour commencer."}
              </p>
            ) : (
              visits.map((v) => {
                const active = v.id === selectedId;
                const a = countByKind(v, "arrival");
                const d = countByKind(v, "after");
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`terrain-visit-item${active ? " is-active" : ""}`}
                    onClick={() => setSelectedId(v.id)}
                  >
                    <div className="terrain-visit-item__top">
                      <strong>{v.site}</strong>
                      <StatusBadge
                        tone={v.status === "Terminé" ? "ok" : "info"}
                      >
                        {v.status}
                      </StatusBadge>
                    </div>
                    <span className="terrain-visit-item__client">{v.client}</span>
                    <div className="terrain-visit-item__meta">
                      <span>{formatDate(v.date)}</span>
                      <span className="terrain-pills">
                        <em data-kind="arrival" title="Avant">
                          {a}
                        </em>
                        <em data-kind="departure" title="Après nettoyage">
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
            <div className="terrain-blank">
              <strong>Aucune visite sélectionnée</strong>
              <p>Choisissez une visite à gauche ou créez-en une nouvelle.</p>
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
                    <StatusBadge
                      tone={selected.status === "Terminé" ? "ok" : "info"}
                    >
                      {selected.status}
                    </StatusBadge>
                    <h2>{selected.site}</h2>
                    <p>
                      {selected.client}
                      <span aria-hidden> · </span>
                      {formatDate(selected.date)}
                      <span aria-hidden> · </span>
                      {selected.agent}
                    </p>
                  </div>
                  <div className="terrain-hero__actions">
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
                              window.alert(
                                `${result.ok} photo(s) téléchargée(s), ${result.failed} échec(s).`,
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
                  {!agentMode ? (
                    <>
                      <div
                        className={`terrain-step${arrivalCount > 0 ? " is-done" : ""}`}
                      >
                        <span className="terrain-step__num">1</span>
                        <div>
                          <strong>Avant</strong>
                          <small>
                            {selected.arrivalAt ?? "Optionnel"}
                          </small>
                        </div>
                      </div>
                      <div className="terrain-progress__line" aria-hidden />
                    </>
                  ) : null}
                  <div
                    className={`terrain-step${afterCount > 0 ? " is-done" : ""}`}
                  >
                    <span className="terrain-step__num">
                      {agentMode ? "✓" : "2"}
                    </span>
                    <div>
                      <strong>Après nettoyage</strong>
                      <small>
                        {selected.afterAt ?? "Photo obligatoire"}
                      </small>
                    </div>
                  </div>
                  <div className="terrain-progress__score">
                    <strong>
                      {afterCount > 0 ? "OK" : `${progress}/2`}
                    </strong>
                    <span>{afterCount > 0 ? "prouvé" : "en attente"}</span>
                  </div>
                </div>
              </header>

              {selected.notes ? (
                <p className="terrain-notes">{selected.notes}</p>
              ) : null}

              {error ? <p className="users-form-error">{error}</p> : null}

              <div
                className={`terrain-photo-cols${agentMode ? " terrain-photo-cols--agent" : ""}`}
              >
                {!agentMode ? (
                  <PhotoLane
                    title="Avant nettoyage"
                    hint="État du site au début (optionnel)"
                    kind="arrival"
                    photos={selected.photos.filter((p) => p.kind === "arrival")}
                    busy={busyKind === "arrival"}
                    inputRef={arrivalInputRef}
                    onCapture={() => arrivalInputRef.current?.click()}
                    onFile={(file) => void onPickPhoto("arrival", file)}
                    onDelete={deletePhoto}
                  />
                ) : null}
                <PhotoLane
                  title="Après nettoyage"
                  hint={
                    agentMode
                      ? "Prenez vos photos une fois le travail terminé"
                      : "Preuve déposée par le nettoyeur après intervention"
                  }
                  kind="after"
                  photos={selected.photos.filter((p) => p.kind === "after")}
                  busy={busyKind === "after"}
                  inputRef={afterInputRef}
                  featured={agentMode}
                  onCapture={() => afterInputRef.current?.click()}
                  onFile={(file) => void onPickPhoto("after", file)}
                  onDelete={deletePhoto}
                />
              </div>
            </>
          )}
        </section>
      </div>

      {creating && draft ? (
        <div
          className="doc-overlay-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terrain-create-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreating(false);
          }}
        >
          <div className="settings-user-dialog">
            <div className="doc-overlay-header">
              <div>
                <h2 id="terrain-create-title">
                  {agentMode ? "Nouveau site à prouver" : "Nouvelle visite site"}
                </h2>
                <p className="doc-overlay-header__sub">
                  {agentMode
                    ? "Puis prenez les photos après nettoyage"
                    : draft.id}
                </p>
              </div>
              <button
                type="button"
                className="doc-overlay-close-btn"
                aria-label="Fermer"
                onClick={() => setCreating(false)}
              >
                ✕
              </button>
            </div>
            <form className="settings-user-form" onSubmit={saveCreate}>
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
                    placeholder="Ex. Immeuble Horizon — étage 3"
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
              <div className="settings-actions">
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  onClick={() => setCreating(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-admin btn-admin--primary">
                  {agentMode
                    ? "Créer et photographier après nettoyage"
                    : "Créer et prendre des photos"}
                </button>
              </div>
            </form>
          </div>
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
  featured = false,
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
  featured?: boolean;
}) {
  return (
    <div
      className={`terrain-lane terrain-lane--${kind}${featured ? " is-featured" : ""}`}
    >
      <div className="terrain-lane__head">
        <div>
          <span className="terrain-lane__badge">
            {kind === "after" ? "Après" : "Avant"}
          </span>
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
          <strong>
            {busy
              ? "Enregistrement…"
              : kind === "after"
                ? "Photographier après nettoyage"
                : "Prendre une photo"}
          </strong>
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
          <strong>
            {kind === "after"
              ? "Aucune photo après nettoyage"
              : "Pas encore de photo"}
          </strong>
          <p>
            {kind === "after"
              ? "Terminez le nettoyage, puis capturez le résultat sur place."
              : "Appuyez sur le bouton ci-dessus pour capturer le site."}
          </p>
        </div>
      ) : (
        <div className="terrain-photo-grid">
          {photos.map((p) => (
            <figure key={p.id} className="terrain-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.dataUrl} alt={`${title} ${p.takenAt}`} />
              <figcaption>
                <span>{p.takenAt}</span>
                <span className="terrain-photo__actions">
                  <button
                    type="button"
                    onClick={() => {
                      void downloadImage(
                        p.dataUrl,
                        `necs-${kind}-${p.takenAt.replace(/[^\d]/g, "")}`,
                      ).catch(() => {
                        window.alert("Téléchargement de la photo impossible.");
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
