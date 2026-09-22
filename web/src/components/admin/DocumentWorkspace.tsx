"use client";

import Link from "next/link";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  EmptyState,
  ModuleHeader,
  Panel,
  StatusBadge,
} from "@/components/admin/Ui";
import { toast } from "@/lib/toast";
import type { DocField, DocumentDef } from "@/lib/documents-catalog";
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
import { GROUP_LABEL } from "@/lib/admin-nav";
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
  const text = value.trim();
  if (!text) {
    return (
      <div className="doc-print-value doc-print-value--empty" aria-hidden>
        —
      </div>
    );
  }
  return <div className="doc-print-value">{text}</div>;
}

function fieldPlaceholder(field: DocField): string {
  if (field.hint) return field.hint;
  if (field.kind === "email") return "ex. contact@entreprise.cm";
  if (field.kind === "tel") return "ex. +237 6XX XX XX XX";
  if (field.kind === "number") return "0";
  if (field.kind === "textarea") return `Saisir ${field.label.toLowerCase()}…`;
  return "";
}

function DocFieldControl({
  field,
  value,
  onChange,
}: {
  field: DocField;
  value: string;
  onChange: (next: string) => void;
}) {
  const filled = value.trim().length > 0;
  return (
    <label
      className={`doc-field${field.full ? " is-full" : ""}${filled ? " is-filled" : " is-empty"}${field.required ? " is-required" : ""}`}
    >
      <span className="doc-field__label">
        {field.label}
        {field.required ? <em> *</em> : null}
      </span>
      {field.kind === "select" ? (
        <select
          className="doc-screen-only"
          required={field.required}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            e.currentTarget.blur();
          }}
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
          placeholder={fieldPlaceholder(field)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="doc-screen-only"
          type={field.kind}
          required={field.required}
          placeholder={fieldPlaceholder(field)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.hint ? (
        <small className="doc-field__hint no-print">{field.hint}</small>
      ) : null}
      <PrintValue value={value} />
    </label>
  );
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
  const [pdfFooter, setPdfFooter] = useState(
    () => loadSettings().documents.pdfFooter,
  );
  const photoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const loaded = loadDocStore(doc.slug, doc.records, doc.lineRows);
    const settings = loadSettings();
    setRecords(loaded);
    setCompany(settings.company);
    setPdfFooter(settings.documents.pdfFooter);
    setReady(true);
  }, [doc.slug, doc.records, doc.lineRows]);

  const selected = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId],
  );

  useEffect(() => {
    if (!isOverlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOverlayOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
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

  const formProgress = useMemo(() => {
    const required: Array<{ key: string; ok: boolean }> = [
      { key: "label", ok: draftMeta.label.trim().length > 0 },
    ];
    for (const section of doc.sections) {
      for (const field of section.fields) {
        if (!field.required) continue;
        required.push({
          key: field.name,
          ok: (values[field.name] ?? "").trim().length > 0,
        });
      }
    }
    const done = required.filter((r) => r.ok).length;
    const total = Math.max(1, required.length);
    return {
      done,
      total,
      pct: Math.round((done / total) * 100),
    };
  }, [doc.sections, draftMeta.label, values]);

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

  const tone = docIconTone(doc.slug);

  const formSections = useMemo(() => {
    const items: Array<{ id: string; title: string }> = [
      { id: "doc-sec-identite", title: "Identité du dossier" },
      ...doc.sections.map((section, i) => ({
        id: `doc-sec-${i}`,
        title: section.title,
      })),
    ];
    if (doc.checks.length > 0) {
      items.push({ id: "doc-sec-checklist", title: "Checklist" });
    }
    if (doc.lineHeaders.length > 0) {
      items.push({ id: "doc-sec-lignes", title: "Lignes & détail" });
    }
    if (doc.photoKinds && doc.photoKinds.length > 0) {
      items.push({ id: "doc-sec-photos", title: "Preuves photo" });
    }
    return items;
  }, [doc]);

  const sectionStepOf = useMemo(() => {
    const map = new Map<string, number>();
    formSections.forEach((sec, i) => map.set(sec.id, i + 1));
    return map;
  }, [formSections]);

  if (!ready) {
    return (
      <div className="doc-workspace">
        <p className="note">Chargement des dossiers…</p>
      </div>
    );
  }

  return (
    <div className="doc-workspace">
      <ModuleHeader
        tone={tone}
        badge={GROUP_LABEL[doc.domain] ?? doc.domain}
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
          </>
        }
        note={doc.note?.replace(/\b(?:TMP|DIG|CRM|RH|OPS|FIN|BI)-\d+\b/gi, "").replace(/\s{2,}/g, " ").replace(/\s([·,;])/g, "$1").trim() || undefined}
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

      {doc.slug === "dig-01" || doc.slug === "dig-02" ? (
        <div className="leads-callout" role="note">
          <div>
            <strong>Les envois du site public sont ailleurs</strong>
            <p>
              Les devis et contacts remplis sur le site web apparaissent dans{" "}
              <Link href="/admin/demandes">Demandes site</Link>
              . Cette page sert uniquement à créer un dossier manuel.
            </p>
          </div>
          <Link className="btn-admin btn-admin--primary" href="/admin/demandes">
            Ouvrir les demandes reçues
          </Link>
        </div>
      ) : null}

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

      {isOverlayOpen && selected ? (
      <AdminOverlayPortal>
        <div
          className="doc-overlay-backdrop clients-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOverlayOpen(false);
          }}
        >
          <div
            className="doc-overlay-dialog doc-overlay-dialog--template"
            role="dialog"
            aria-modal="true"
            aria-labelledby="doc-overlay-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="doc-overlay-header no-print">
              <div className="doc-overlay-header__left">
                <p className="doc-overlay-header__tag">
                  {GROUP_LABEL[doc.domain] ?? doc.domain}
                </p>
                <h2 id="doc-overlay-title">{doc.title}</h2>
                <p className="doc-overlay-header__sub">
                  {selected.id} · Esc ou clic hors zone pour fermer
                </p>
              </div>
              <div className="doc-overlay-header__right">
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
                <button
                  type="button"
                  className="doc-overlay-close-btn"
                  aria-label="Fermer"
                  onClick={() => setIsOverlayOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="clients-overlay__body doc-overlay-editor-body">
              <div className="doc-editor">
          <header className="doc-editor__bar no-print">
            <div className="doc-editor__bar-left">
              <div>
                <p className="doc-editor__eyebrow">
                  {GROUP_LABEL[doc.domain] ?? doc.domain}
                </p>
                <h2>{doc.title}</h2>
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
            <nav className="doc-editor__toc no-print" aria-label="Sections du formulaire">
              <div className="doc-editor__progress">
                <div className="doc-editor__progress-top">
                  <p className="doc-editor__toc-label">
                    Progression · {formProgress.done}/{formProgress.total} champs requis
                  </p>
                  <strong>{formProgress.pct}%</strong>
                </div>
                <div
                  className="doc-editor__progress-bar"
                  role="progressbar"
                  aria-valuenow={formProgress.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${formProgress.pct}%` }} />
                </div>
              </div>
              <p className="doc-editor__toc-label">
                Sections ({formSections.length})
              </p>
              {formSections.map((sec, i) => (
                <a key={sec.id} href={`#${sec.id}`}>
                  <em>{String(i + 1).padStart(2, "0")}</em>
                  {sec.title}
                </a>
              ))}
            </nav>
            <header className="doc-print-letterhead">
              <div className="doc-print-letterhead__ribbon" aria-hidden />
              <div className="doc-print-letterhead__row">
                <BrandLogo alt="NECS" width={72} height={72} />
                <div className="doc-print-letterhead__brand">
                  <strong className="doc-print-letterhead__company">
                    {company.legalName || "NECLEANING & SERVICES SARL"}
                  </strong>
                  <span className="doc-print-letterhead__trade">
                    {company.tradeName || "NECS"} · Propreté · Rigueur · Confiance
                  </span>
                  <p>
                    {company.address || "[Adresse ; Cameroun]"}
                    <br />
                    Tél. : {company.phone}
                    {company.email ? ` · ${company.email}` : ""}
                    {company.rccm ? (
                      <>
                        <br />
                        RCCM : {company.rccm}
                        {company.nif ? ` · NIF : ${company.nif}` : ""}
                      </>
                    ) : null}
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
                  <p className="doc-print-letterhead__status">
                    Statut : <strong>{draftMeta.status}</strong>
                  </p>
                </div>
              </div>
              <div className="doc-print-doc-title">
                <p className="doc-print-doc-title__domain">
                  {GROUP_LABEL[doc.domain] ?? doc.domain}
                </p>
                <h1>{doc.title}</h1>
                <p className="doc-print-doc-title__label">
                  {draftMeta.label.trim() || "Document sans intitulé"}
                </p>
              </div>
            </header>

            <form
              id={`form-${doc.slug}`}
              className="doc-editor__form"
              onSubmit={onSave}
            >
                  <Panel
                    id="doc-sec-identite"
                    step={sectionStepOf.get("doc-sec-identite")}
                    title="Identité du dossier"
                    hint="Référence, statut et responsable du document"
                  >
                    <div className="doc-fields">
                      <label
                        className={`doc-field is-full is-required${draftMeta.label.trim() ? " is-filled" : " is-empty"}`}
                      >
                        <span className="doc-field__label">
                          Intitulé<em> *</em>
                        </span>
                        <input
                          className="doc-screen-only"
                          value={draftMeta.label}
                          placeholder="Nom clair du dossier"
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
                      <label
                        className={`doc-field${draftMeta.status.trim() ? " is-filled" : " is-empty"}`}
                      >
                        <span className="doc-field__label">Statut</span>
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
                      <label
                        className={`doc-field${draftMeta.owner.trim() ? " is-filled" : " is-empty"}`}
                      >
                        <span className="doc-field__label">Responsable</span>
                        <input
                          className="doc-screen-only"
                          value={draftMeta.owner}
                          placeholder="Nom du responsable"
                          onChange={(e) =>
                            setDraftMeta((m) => ({
                              ...m,
                              owner: e.target.value,
                            }))
                          }
                        />
                        <PrintValue value={draftMeta.owner} />
                      </label>
                      <label
                        className={`doc-field${
                          draftMeta.amount.trim() && draftMeta.amount !== "—"
                            ? " is-filled"
                            : " is-empty"
                        }`}
                      >
                        <span className="doc-field__label">Montant / réf.</span>
                        <input
                          className="doc-screen-only"
                          value={draftMeta.amount}
                          placeholder="ex. 250 000 FCFA"
                          onChange={(e) =>
                            setDraftMeta((m) => ({
                              ...m,
                              amount: e.target.value,
                            }))
                          }
                        />
                        <PrintValue
                          value={
                            draftMeta.amount === "—" ? "" : draftMeta.amount
                          }
                        />
                      </label>
                    </div>
                  </Panel>

                  {doc.sections.map((section, sectionIndex) => (
                    <Panel
                      key={section.title}
                      id={`doc-sec-${sectionIndex}`}
                      step={sectionStepOf.get(`doc-sec-${sectionIndex}`)}
                      title={section.title}
                      hint={`${section.fields.length} champ${section.fields.length > 1 ? "s" : ""}`}
                    >
                      <div className="doc-fields">
                        {section.fields.map((field) => (
                          <DocFieldControl
                            key={field.name}
                            field={field}
                            value={values[field.name] ?? ""}
                            onChange={(next) =>
                              setValues((v) => ({
                                ...v,
                                [field.name]: next,
                              }))
                            }
                          />
                        ))}
                      </div>
                    </Panel>
                  ))}

                  {doc.checks.length > 0 ? (
                    <Panel
                      id="doc-sec-checklist"
                      step={sectionStepOf.get("doc-sec-checklist")}
                      title={`Checklist (${checkedCount}/${doc.checks.length})`}
                      hint="Cochez chaque point avant validation"
                    >
                      <div className="doc-checks">
                        {doc.checks.map((item, i) => (
                          <label
                            key={item}
                            className={`doc-check${checks[String(i)] ? " is-done" : ""}`}
                          >
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
                            <span className="doc-check__mark" aria-hidden>
                              {checks[String(i)] ? "✓" : ""}
                            </span>
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </Panel>
                  ) : null}

                  {doc.lineHeaders.length > 0 ? (
                    <Panel
                      id="doc-sec-lignes"
                      step={sectionStepOf.get("doc-sec-lignes")}
                      title="Lignes & détail"
                      hint="Ajoutez les lignes de détail du document"
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
                    <Panel
                      id="doc-sec-photos"
                      step={sectionStepOf.get("doc-sec-photos")}
                      title="Preuves photo"
                      hint="Ajoutez les photos de preuve par catégorie"
                    >
                      <div className="doc-photo-kinds">
                        {doc.photoKinds.map((kind) => {
                          const kindPhotos = photos.filter(
                            (p) => p.kind === kind.id,
                          );
                          return (
                            <div
                              key={kind.id}
                              className={`doc-photo-kind${kindPhotos.length === 0 ? " is-empty" : ""}`}
                            >
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

            <div className="doc-print-spacer" aria-hidden />

            <footer className="doc-print-signoff">
              <div className="doc-print-signoff__grid">
                <div>
                  <p className="doc-print-signoff__role">Pour NECS</p>
                  <p className="doc-print-signoff__name">
                    {draftMeta.owner.trim() || "Responsable"}
                  </p>
                  <div className="doc-print-signoff__line" />
                  <p className="doc-print-signoff__cap">
                    Nom, signature et cachet
                  </p>
                </div>
                <div>
                  <p className="doc-print-signoff__role">Client / Partenaire</p>
                  <p className="doc-print-signoff__name">&nbsp;</p>
                  <div className="doc-print-signoff__line" />
                  <p className="doc-print-signoff__cap">
                    Nom, signature et date
                  </p>
                </div>
              </div>
              <div className="doc-print-signoff__foot">
                <p>
                  {pdfFooter ||
                    `${company.tradeName || "NECS"} · Propreté · Rigueur · Confiance`}
                </p>
                <p>
                  {[
                    company.address,
                    company.phone ? `Tél. ${company.phone}` : "",
                    company.email,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p>
                  {doc.refPrefix} · {selected.id} ·{" "}
                  {new Date().toLocaleDateString("fr-FR")}
                </p>
              </div>
            </footer>
          </div>

          <footer className="doc-editor__footer no-print">
            <span>
              {savedAt
                ? `Enregistré à ${savedAt}`
                : `${formProgress.pct}% complété · ${formSections.length} sections`}
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
                Fermer
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
            </div>
          </div>
        </div>
      </AdminOverlayPortal>
      ) : null}
    </div>
  );
}
