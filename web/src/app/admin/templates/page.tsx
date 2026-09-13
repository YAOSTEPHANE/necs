"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  DOCUMENT_DOMAINS,
  DOCUMENTS,
} from "@/lib/documents-catalog";
import { applyDocEnrichment } from "@/lib/documents-enrichment";
import { DocIcon, docIconTone } from "@/components/admin/Icons";

function HubInner() {
  const search = useSearchParams();
  const initialDomain = search.get("domain") ?? "all";
  const [domain, setDomain] = useState(initialDomain);
  const [q, setQ] = useState("");

  // sync when URL domain changes
  const urlDomain = search.get("domain") ?? "all";
  const activeDomain = urlDomain !== domain && !q ? urlDomain : domain;

  const enrichedDocs = useMemo(
    () => DOCUMENTS.map((d) => applyDocEnrichment(d)),
    [],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const dom = search.get("domain") ?? domain;
    return enrichedDocs.filter((d) => {
      const domainOk = dom === "all" || d.domain === dom;
      const searchOk =
        !query ||
        d.id.toLowerCase().includes(query) ||
        d.title.toLowerCase().includes(query) ||
        d.module.toLowerCase().includes(query);
      return domainOk && searchOk;
    });
  }, [domain, q, search, enrichedDocs]);

  return (
    <div className="symp-dash">
      <div className="symp-welcome">
        <div>
          <h1>Documents métier</h1>
          <p>28 documents métier — sélectionnez un modèle dans le menu ou ci-dessous.</p>
        </div>
      </div>

      <div className="doc-hub-filters symp-card" style={{ padding: "1rem 1.1rem", marginBottom: "1rem" }}>
        <input
          className="doc-hub-search"
          placeholder="Rechercher un document…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="doc-hub-chips">
          {DOCUMENT_DOMAINS.map((d) => (
            <Link
              key={d.id}
              href={d.id === "all" ? "/admin/templates" : `/admin/templates?domain=${d.id}`}
              className={`doc-chip${(search.get("domain") ?? "all") === d.id ? " is-active" : ""}`}
              onClick={() => setDomain(d.id)}
            >
              {d.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="doc-hub-grid">
        {filtered.map((doc) => (
          <Link key={doc.id} href={`/admin/templates/${doc.slug}`} className="doc-hub-card">
            <div className="doc-hub-card__top">
              <span
                className="doc-hub-card__icon"
                style={{ ["--icon-c" as string]: docIconTone(doc.slug) }}
              >
                <DocIcon slug={doc.slug} size={20} />
              </span>
              <span className="symp-status tone-info"><i />{doc.domain}</span>
            </div>
            <h3>{doc.title}</h3>
            <p>{doc.subtitle}</p>
            <div className="doc-hub-card__meta">
              <span>{doc.module}</span>
              <span>{doc.records.length} dossier{doc.records.length > 1 ? "s" : ""}</span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="note">Aucun document pour ce filtre.</p>
      ) : null}
      <span className="sr-only">{activeDomain}</span>
    </div>
  );
}

export default function TemplatesHubPage() {
  return (
    <Suspense fallback={<p className="note">Chargement…</p>}>
      <HubInner />
    </Suspense>
  );
}
