"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  EmptyState,
  ModuleHeader,
  Panel,
  StatusBadge,
} from "@/components/admin/Ui";
import { toast } from "@/lib/toast";
import type { DocumentDef } from "@/lib/documents-catalog";
import {
  type DocPhoto,
  type StoredDocRecord,
  createPhotoId,
  loadDocStore,
  saveDocStore,
} from "@/lib/doc-store";
import type { StatusTone } from "@/lib/mock-data";
import { DocIcon, docIconTone } from "@/components/admin/Icons";
import { BrandLogo } from "@/components/BrandAssets";
import { fileToOptimizedDataUrl, loadSettings } from "@/lib/settings";
import { downloadImage } from "@/lib/download";
import {
  deleteVercelBlob,
  persistOptimizedImage,
} from "@/lib/vercel-blob-client";

function toneForStatus(status: string): StatusTone {
  const s = status.toLowerCase();
  if (
    s.includes("non conforme") ||
    s.includes("retard") ||
    s.includes("anomalie") ||
    s.includes("recouvrement") ||
    s.includes("bloqué") ||
    s.includes("échec") ||
    s.includes("refus")
  ) {
    return "danger";
  }
  if (
    s.includes("conforme") ||
    s.includes("valid") ||
    s.includes("actif") ||
    s.includes("publié") ||
    s.includes("retenu") ||
    s.includes("approuv") ||
    s.includes("signé") ||
    s.includes("terminé") ||
    s.includes("clos") ||
    (s.includes("complet") && !s.includes("incomplet")) ||
    s === "ok"
  ) {
    return "ok";
  }
  if (
    s.includes("incomplet") ||
    s.includes("contrôle") ||
    s.includes("validation") ||
    s.includes("rappel") ||
    s.includes("attente")
  ) {
    return "warn";
  }
  if (
    s.includes("brouillon") ||
    s.includes("cours") ||
    s.includes("nouveau") ||
    s.includes("planifié") ||
    s.includes("émis") ||
    s.includes("envoy")
  ) {
    return "info";
  }
  return "neutral";
}

function buildDefaults(doc: DocumentDef): Record<string, string> {
  const values: Record<string, string> = {};
  for (const section of doc.sections) {
    for (const field of section.fields) {
      values[field.name] = field.defaultValue ?? "";
    }
  }
  return values;
}

function PrintValue({ value }: { value: string }) {
  const text = value.trim() ? value : "—";
  return <div className="doc-print-value">{text}</div>;
}

function amountColumnIndex(headers: string[]): number {
  const idx = headers.findIndex((h) =>
    /prix|total|montant|ht|ttc|fcfa/i.test(h),
  );
  return idx >= 0 ? idx : headers.length > 0 ? headers.length - 1 : -1;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function emptyRow(cols: number): string[] {
  return Array.from({ length: cols }, () => "");
}

export function DocumentWorkspace({ doc }: { doc: DocumentDef }) {
  const [records, setRecords] = useState<StoredDocRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [values, setValues] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [lineRows, setLineRows] = useState<string[][]>([]);
  const [photos, setPhotos] = useState<DocPhoto[]>([]);
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const [draftMeta, setDraftMeta] = useState({
    label: "",
    status: "Brouillon",
    owner: "Vous",
    amount: "—",
  });
  const [company, setCompany] = useState(() => loadSettings().company);
  const photoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const loaded = loadDocStore(doc.slug, doc.records, doc.lineRows);
    setRecords(loaded);
    setCompany(loadSettings().company);
    setReady(true);
  }, [doc.slug, doc.records, doc.lineRows]);

  const selected = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId],
  );

  useEffect(() => {
    if (!isOverlayOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOverlayOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOverlayOpen]);

  const persist = (next: StoredDocRecord[]) => {
    setRecords(next);
    saveDocStore(doc.slug, next);
  };

  const openRecord = (record: StoredDocRecord) => {
    setSelectedId(record.id);
    setValues({ ...buildDefaults(doc), ...record.values });
    setChecks({ ...record.checks });
    setLineRows(
      record.lineRows.length > 0
        ? record.lineRows.map((row) => [...row])
        : doc.lineRows.map((row) => [...row]),
    );
    setPhotos([...(record.photos ?? [])]);
    setDraftMeta({
      label: record.label,
      status: record.status,
      owner: record.owner,
      amount: record.amount,
    });
    setSavedAt(null);
    setIsOverlayOpen(true);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const addRecord = () => {
    const id = `${doc.refPrefix}-${String(records.length + 1).padStart(4, "0")}`;
    const neu: StoredDocRecord = {
      id,
      label: `Nouveau ; ${doc.title}`,
      status: "Brouillon",
      owner: "Vous",
      updated: new Date().toLocaleDateString("fr-FR"),
      amount: "—",
      values: buildDefaults(doc),
      checks: Object.fromEntries(doc.checks.map((_, i) => [String(i), false])),
      lineRows: doc.lineRows.map((row) => [...row]),
      photos: [],
    };
    persist([neu, ...records]);
    openRecord(neu);
  };

  const deleteRecord = (id: string) => {
    if (!confirm("Supprimer définitivement ce dossier ?")) return;
    const next = records.filter((r) => r.id !== id);
    persist(next);
    if (selectedId === id) {
      setIsOverlayOpen(false);
      setSelectedId(null);
    }
  };

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    const time = new Date().toLocaleTimeString("fr-FR");
    const amtCol = amountColumnIndex(doc.lineHeaders);
    const autoTotal =
      amtCol >= 0 && lineRows.length > 0
        ? formatAmount(
            lineRows.reduce((sum, row) => sum + parseAmount(row[amtCol] ?? ""), 0),
          )
        : null;
    const next = records.map((r) =>
      r.id === selectedId
        ? {
            ...r,
            label: draftMeta.label.trim() || r.label,
            status: draftMeta.status.trim() || r.status,
            owner: draftMeta.owner.trim() || r.owner,
            amount:
              draftMeta.amount.trim() && draftMeta.amount !== "—"
                ? draftMeta.amount.trim()
                : autoTotal
                  ? `${autoTotal} FCFA`
                  : r.amount,
            updated: `Aujourd'hui à ${time}`,
            values: { ...values },
            checks: { ...checks },
            lineRows: lineRows.map((row) => [...row]),
            photos: [...photos],
          }
        : r,
    );
    persist(next);
    if (autoTotal && (!draftMeta.amount.trim() || draftMeta.amount === "—")) {
      setDraftMeta((m) => ({ ...m, amount: `${autoTotal} FCFA` }));
    }
    setSavedAt(time);
    toast.success(`Dossier enregistré à ${time}`);
  };

  const updateLineCell = (rowIdx: number, colIdx: number, value: string) => {
    setLineRows((rows) =>
      rows.map((row, i) =>
        i === rowIdx ? row.map((cell, j) => (j === colIdx ? value : cell)) : row,
      ),
    );
  };

  const addLine = () => {
    setLineRows((rows) => [...rows, emptyRow(doc.lineHeaders.length)]);
  };

  const removeLine = (rowIdx: number) => {
    setLineRows((rows) => rows.filter((_, i) => i !== rowIdx));
  };

  const onAddPhoto = async (kind: string, file: File | null) => {
    if (!file) return;
    setPhotoBusy(kind);
    try {
      const { url } = await persistOptimizedImage({
        file,
        folder: "documents",
        maxSize: 1280,
        forceJpeg: true,
        quality: 0.72,
        optimize: fileToOptimizedDataUrl,
      });
      setPhotos((prev) => [
        ...prev,
        {
          id: createPhotoId(),
          kind,
          dataUrl: url,
          takenAt: new Date().toLocaleString("fr-FR", {
            dateStyle: "short",
            timeStyle: "short",
          }),
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo impossible");
    } finally {
      setPhotoBusy(null);
    }
  };

  const removePhoto = (id: string) => {
    if (!confirm("Supprimer cette photo ?")) return;
    const photo = photos.find((p) => p.id === id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (photo?.dataUrl) {
      void deleteVercelBlob(photo.dataUrl);
    }
  };

  const checkedCount = Object.values(checks).filter(Boolean).length;
  const amtCol = amountColumnIndex(doc.lineHeaders);
  const linesTotal =
    amtCol >= 0
      ? lineRows.reduce((sum, row) => sum + parseAmount(row[amtCol] ?? ""), 0)
      : 0;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchFilter ||
        r.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.owner.toLowerCase().includes(searchFilter.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "valide" &&
          (r.status.toLowerCase().includes("valid") ||
            r.status.toLowerCase().includes("conforme") ||
            r.status.toLowerCase().includes("approuv") ||
            r.status.toLowerCase().includes("signé") ||
            r.status.toLowerCase().includes("terminé") ||
            r.status.toLowerCase().includes("clos"))) ||
        (statusFilter === "brouillon" &&
          r.status.toLowerCase().includes("brouillon")) ||
        (statusFilter === "cours" &&
          (r.status.toLowerCase().includes("cours") ||
            r.status.toLowerCase().includes("attente") ||
            r.status.toLowerCase().includes("planifié")));

      return matchSearch && matchStatus;
    });
  }, [records, searchFilter, statusFilter]);

  if (!ready) {
    return (
      <div className="doc-workspace">
        <p className="note">Chargement des dossiers…</p>
      </div>
    );
  }

  const tone = docIconTone(doc.slug);

  return (
    <div className="doc-workspace">
      {!isOverlayOpen ? (
        <>
      <ModuleHeader
        tone={tone}
        badge={doc.domain}
        icon={<DocIcon slug={doc.slug} size={22} />}
        title={doc.title}
        description={doc.subtitle}
        meta={
          <>
            <span>
              <strong>Type</strong>
              {doc.docType}
            </span>
            <span>
              <strong>Réf.</strong>
              {doc.refPrefix}
            </span>
            <span>
              <strong>Dossiers</strong>
              {records.length}
            </span>
            {savedAt ? (
              <span className="doc-hero__saved">Enregistré {savedAt}</span>
            ) : null}
          </>
        }
        note={doc.note}
        actions={
          <>
            <Link className="btn-admin btn-admin--ghost" href="/admin/templates">
              ← Modules
            </Link>
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={addRecord}
            >
              + Nouveau dossier
            </button>
          </>
        }
      />

      {doc.kpis.length > 0 ? (
        <div className="doc-kpi-strip">
          {doc.kpis.map((k) => (
            <div key={k.label} className="doc-kpi">
              <span>{k.label}</span>
              <strong>{k.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <Panel title={`Dossiers (${records.length})`}>
        <div className="doc-records-toolbar">
          <input
            type="search"
            className="doc-records-search"
            placeholder="Rechercher un dossier…"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
          <div className="doc-records-chips">
            {(
              [
                ["all", `Tous (${records.length})`],
                ["brouillon", "Brouillons"],
                ["cours", "En cours"],
                ["valide", "Validés"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`doc-chip${statusFilter === id ? " is-active" : ""}`}
                onClick={() => setStatusFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap doc-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Intitulé</th>
                <th>Statut</th>
                <th>Responsable</th>
                <th>Montant / Réf</th>
                <th>Dernière modif.</th>
                <th className="cell-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="Aucun dossier"
                      hint="Créez un nouveau dossier ou ajustez vos filtres."
                      action={
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          onClick={addRecord}
                        >
                          + Nouveau dossier
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong className="doc-ref">{r.id}</strong>
                    </td>
                    <td>
                      <strong className="doc-label">{r.label}</strong>
                    </td>
                    <td>
                      <StatusBadge tone={toneForStatus(r.status)}>
                        {r.status}
                      </StatusBadge>
                    </td>
                    <td>{r.owner}</td>
                    <td>
                      <code className="doc-amount">{r.amount ?? "—"}</code>
                    </td>
                    <td className="doc-updated">{r.updated}</td>
                    <td style={{ textAlign: "right" }}>
                      <div className="doc-row-actions">
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary doc-btn-table-edit"
                          onClick={() => openRecord(r)}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          onClick={() => deleteRecord(r.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
        </>
      ) : null}

      {isOverlayOpen && selected ? (
        <div
          className="doc-editor"
          role="region"
          aria-labelledby="doc-overlay-title"
        >
          <header className="doc-editor__bar no-print">
            <div className="doc-editor__bar-left">
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={() => setIsOverlayOpen(false)}
              >
                ← Retour
              </button>
              <div>
                <p className="doc-editor__eyebrow">{doc.domain}</p>
                <h2 id="doc-overlay-title">{doc.title}</h2>
                <p className="doc-editor__ref">{selected.id}</p>
              </div>
            </div>
            <div className="doc-editor__bar-actions">
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={() => window.print()}
              >
                Imprimer
              </button>
              <button
                type="submit"
                form={`form-${doc.slug}`}
                className="btn-admin btn-admin--primary"
              >
                Enregistrer
              </button>
            </div>
          </header>

          <div className="doc-editor__sheet doc-print-sheet">
            <header className="doc-print-letterhead">
              <div className="doc-print-letterhead__ribbon" aria-hidden />
              <div className="doc-print-letterhead__row">
                <BrandLogo alt="NECS" width={72} height={72} />
                <div className="doc-print-letterhead__brand">
                  <p>
                    Propreté · Rigueur · Confiance
                    <br />
                    Siège : {company.address || "[Adresse ; Cameroun]"}
                    <br />
                    Tél. : {company.phone} · Email : {company.email}
                  </p>
                </div>
                <div className="doc-print-letterhead__meta">
                  <span className="doc-print-badge">{doc.docType}</span>
                  <p>
                    N° <strong>{selected.id}</strong>
                  </p>
                  <p>
                    Date :{" "}
                    <strong>
                      {new Date().toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                  </p>
                  <p>{draftMeta.status}</p>
                </div>
              </div>
            </header>

            <form
              id={`form-${doc.slug}`}
              className="doc-editor__form"
              onSubmit={onSave}
            >
                  <Panel title="Identité du dossier">
                    <div className="doc-fields">
                      <label className="doc-field is-full">
                        <span>Intitulé</span>
                        <input
                          className="doc-screen-only"
                          value={draftMeta.label}
                          onChange={(e) =>
                            setDraftMeta((m) => ({
                              ...m,
                              label: e.target.value,
                            }))
                          }
                          required
                        />
                        <PrintValue value={draftMeta.label} />
                      </label>
                      <label className="doc-field">
                        <span>Statut</span>
                        <select
                          className="doc-screen-only"
                          value={draftMeta.status}
                          onChange={(e) =>
                            setDraftMeta((m) => ({
                              ...m,
                              status: e.target.value,
                            }))
                          }
                        >
                          {[
                            "Brouillon",
                            "En cours",
                            "En validation",
                            "Validé",
                            "Conforme",
                            "Non conforme",
                            "Clos",
                            "Terminé",
                            "Envoyée",
                            "Approuvé",
                          ].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <PrintValue value={draftMeta.status} />
                      </label>
                      <label className="doc-field">
                        <span>Responsable</span>
                        <input
                          className="doc-screen-only"
                          value={draftMeta.owner}
                          onChange={(e) =>
                            setDraftMeta((m) => ({
                              ...m,
                              owner: e.target.value,
                            }))
                          }
                        />
                        <PrintValue value={draftMeta.owner} />
                      </label>
                      <label className="doc-field">
                        <span>Montant / réf.</span>
                        <input
                          className="doc-screen-only"
                          value={draftMeta.amount}
                          onChange={(e) =>
                            setDraftMeta((m) => ({
                              ...m,
                              amount: e.target.value,
                            }))
                          }
                        />
                        <PrintValue value={draftMeta.amount} />
                      </label>
                    </div>
                  </Panel>

                  {doc.sections.map((section) => (
                    <Panel key={section.title} title={section.title}>
                      <div className="doc-fields">
                        {section.fields.map((field) => (
                          <label
                            key={field.name}
                            className={`doc-field${field.full ? " is-full" : ""}`}
                          >
                            <span>
                              {field.label}
                              {field.required ? <em> *</em> : null}
                            </span>
                            {field.kind === "select" ? (
                              <select
                                className="doc-screen-only"
                                required={field.required}
                                value={values[field.name] ?? ""}
                                onChange={(e) =>
                                  setValues((v) => ({
                                    ...v,
                                    [field.name]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">— Sélectionner —</option>
                                {(field.options ?? []).map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                              </select>
                            ) : field.kind === "textarea" ? (
                              <textarea
                                className="doc-screen-only"
                                required={field.required}
                                rows={4}
                                value={values[field.name] ?? ""}
                                onChange={(e) =>
                                  setValues((v) => ({
                                    ...v,
                                    [field.name]: e.target.value,
                                  }))
                                }
                              />
                            ) : (
                              <input
                                className="doc-screen-only"
                                type={field.kind}
                                required={field.required}
                                value={values[field.name] ?? ""}
                                onChange={(e) =>
                                  setValues((v) => ({
                                    ...v,
                                    [field.name]: e.target.value,
                                  }))
                                }
                              />
                            )}
                            <PrintValue value={values[field.name] ?? ""} />
                          </label>
                        ))}
                      </div>
                    </Panel>
                  ))}

                  {doc.checks.length > 0 ? (
                    <Panel
                      title={`Checklist (${checkedCount}/${doc.checks.length})`}
                    >
                      <div className="doc-checks">
                        {doc.checks.map((item, i) => (
                          <label key={item} className="doc-check">
                            <input
                              className="doc-screen-only"
                              type="checkbox"
                              checked={Boolean(checks[String(i)])}
                              onChange={(e) =>
                                setChecks((c) => ({
                                  ...c,
                                  [String(i)]: e.target.checked,
                                }))
                              }
                            />
                            <span className="doc-print-check" aria-hidden>
                              {checks[String(i)] ? "☑" : "☐"}
                            </span>
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </Panel>
                  ) : null}

                  {doc.lineHeaders.length > 0 ? (
                    <Panel
                      title="Lignes & détail"
                      action={
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost no-print"
                          onClick={addLine}
                        >
                          + Ligne
                        </button>
                      }
                    >
                      <div className="table-wrap">
                        <table className="data-table doc-lines-table">
                          <thead>
                            <tr>
                              {doc.lineHeaders.map((h) => (
                                <th key={h}>{h}</th>
                              ))}
                              <th className="no-print" style={{ width: 72 }} />
                            </tr>
                          </thead>
                          <tbody>
                            {lineRows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={doc.lineHeaders.length + 1}
                                  style={{
                                    textAlign: "center",
                                    color: "var(--a-muted)",
                                  }}
                                >
                                  Aucune ligne ; ajoutez-en une.
                                </td>
                              </tr>
                            ) : (
                              lineRows.map((row, ri) => (
                                <tr key={`line-${ri}`}>
                                  {doc.lineHeaders.map((_, ci) => (
                                    <td key={`${ri}-${ci}`}>
                                      <input
                                        className="doc-line-input doc-screen-only"
                                        value={row[ci] ?? ""}
                                        onChange={(e) =>
                                          updateLineCell(ri, ci, e.target.value)
                                        }
                                      />
                                      <span className="doc-print-value doc-print-line-cell">
                                        {(row[ci] ?? "").trim() || "—"}
                                      </span>
                                    </td>
                                  ))}
                                  <td className="no-print">
                                    <button
                                      type="button"
                                      className="btn-admin btn-admin--ghost"
                                      onClick={() => removeLine(ri)}
                                    >
                                      Retirer
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          {amtCol >= 0 && lineRows.length > 0 ? (
                            <tfoot>
                              <tr>
                                <td colSpan={Math.max(1, amtCol)}>
                                  <strong>Total</strong>
                                </td>
                                <td colSpan={doc.lineHeaders.length - amtCol}>
                                  <strong>{formatAmount(linesTotal)} FCFA</strong>
                                </td>
                                <td className="no-print" />
                              </tr>
                            </tfoot>
                          ) : null}
                        </table>
                      </div>
                    </Panel>
                  ) : null}

                  {doc.photoKinds && doc.photoKinds.length > 0 ? (
                    <Panel title="Preuves photo">
                      <div className="doc-photo-kinds">
                        {doc.photoKinds.map((kind) => {
                          const kindPhotos = photos.filter(
                            (p) => p.kind === kind.id,
                          );
                          return (
                            <div key={kind.id} className="doc-photo-kind">
                              <div className="doc-photo-kind__head no-print">
                                <strong>{kind.label}</strong>
                                <button
                                  type="button"
                                  className="btn-admin btn-admin--primary"
                                  disabled={photoBusy === kind.id}
                                  onClick={() =>
                                    photoInputRefs.current[kind.id]?.click()
                                  }
                                >
                                  {photoBusy === kind.id
                                    ? "…"
                                    : "Prendre une photo"}
                                </button>
                                <input
                                  ref={(el) => {
                                    photoInputRefs.current[kind.id] = el;
                                  }}
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="terrain-file-input"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    void onAddPhoto(kind.id, file);
                                    e.target.value = "";
                                  }}
                                />
                              </div>
                              <p className="doc-photo-kind__label-print">
                                {kind.label} ({kindPhotos.length})
                              </p>
                              {kindPhotos.length === 0 ? (
                                <p className="note">Aucune photo.</p>
                              ) : (
                                <div className="doc-photo-grid">
                                  {kindPhotos.map((p) => (
                                    <figure key={p.id} className="doc-photo">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={p.dataUrl}
                                        alt={`${kind.label} ${p.takenAt}`}
                                      />
                                      <figcaption>
                                        <span>{p.takenAt}</span>
                                        <span className="doc-photo__actions no-print">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              void downloadImage(
                                                p.dataUrl,
                                                `necs-${doc.slug}-${kind.id}-${p.takenAt.replace(/[^\d]/g, "")}`,
                                              ).catch(() => {
                                                toast.error(
                                                  "Téléchargement de la photo impossible.",
                                                );
                                              });
                                            }}
                                          >
                                            Télécharger
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => removePhoto(p.id)}
                                          >
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
                        })}
                      </div>
                    </Panel>
                  ) : null}
            </form>
          </div>

          <footer className="doc-editor__footer no-print">
            <span>
              {savedAt
                ? `Enregistré à ${savedAt}`
                : "Faites défiler la page pour voir toutes les sections"}
            </span>
            <div className="doc-editor__bar-actions">
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={() => selectedId && deleteRecord(selectedId)}
              >
                Supprimer
              </button>
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={() => setIsOverlayOpen(false)}
              >
                Retour
              </button>
              <button
                type="submit"
                form={`form-${doc.slug}`}
                className="btn-admin btn-admin--primary"
              >
                Enregistrer
              </button>
            </div>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
