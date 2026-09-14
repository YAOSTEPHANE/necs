"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  DOCUMENT_DOMAINS,
  DOCUMENTS,
} from "@/lib/documents-catalog";
import { applyDocEnrichment } from "@/lib/documents-enrichment";
import { DocIcon, docIconTone } from "@/components/admin/Icons";
import { EmptyState, ModuleHeader } from "@/components/admin/Ui";
import { loadSession } from "@/lib/auth";
import { domainsForRole, type DocDomain } from "@/lib/role-spaces";
import type { UserRole } from "@/lib/settings";

function HubInner() {
  const search = useSearchParams();
  const initialDomain = search.get("domain") ?? "all";
  const [domain, setDomain] = useState(initialDomain);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    setRole(loadSession()?.role ?? null);
  }, []);

  const urlDomain = search.get("domain") ?? "all";
  const activeDomain = urlDomain !== domain && !q ? urlDomain : domain;

  const allowedDomains = useMemo(() => {
    if (!role) return "all" as const;
    return domainsForRole(role);
  }, [role]);

  const enrichedDocs = useMemo(
    () => DOCUMENTS.map((d) => applyDocEnrichment(d)),
    [],
  );

  const visibleDocs = useMemo(() => {
    if (allowedDomains === "all") return enrichedDocs;
    return enrichedDocs.filter((d) =>
      allowedDomains.includes(d.domain as DocDomain),
    );
  }, [enrichedDocs, allowedDomains]);

  const domainChips = useMemo(() => {
    if (allowedDomains === "all") return DOCUMENT_DOMAINS;
    return DOCUMENT_DOMAINS.filter(
      (d) =>
        d.id === "all" || allowedDomains.includes(d.id as DocDomain),
    );
  }, [allowedDomains]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const dom = search.get("domain") ?? domain;
    return visibleDocs.filter((d) => {
      const domainOk = dom === "all" || d.domain === dom;
      const searchOk =
        !query ||
        d.id.toLowerCase().includes(query) ||
        d.title.toLowerCase().includes(query) ||
        d.module.toLowerCase().includes(query);
      return domainOk && searchOk;
    });
  }, [domain, q, search, visibleDocs]);

  return (
    <div className="symp-dash doc-hub doc-workspace">
      <ModuleHeader
        tone="#1260a8"
        badge="Bibliothèque métier"
        title="Documents & modules"
        description={`${visibleDocs.length} module${visibleDocs.length > 1 ? "s" : ""} accessible${visibleDocs.length > 1 ? "s" : ""} selon votre rôle.`}
        meta={
          <>
            <span>
              <strong>Modules</strong>
              {visibleDocs.length}
            </span>
            <span>
              <strong>Domaines</strong>
              {allowedDomains === "all"
                ? DOCUMENT_DOMAINS.length - 1
                : allowedDomains.length}
            </span>
          </>
        }
      />

      <div className="doc-hub-filters panel-card">
        <div className="doc-records-toolbar">
          <input
            type="search"
            className="doc-records-search"
            placeholder="Rechercher un document…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="doc-records-chips">
            {domainChips.map((d) => (
              <Link
                key={d.id}
                href={
                  d.id === "all"
                    ? "/admin/templates"
                    : `/admin/templates?domain=${d.id}`
                }
                className={`doc-chip${(search.get("domain") ?? "all") === d.id ? " is-active" : ""}`}
                onClick={() => setDomain(d.id)}
              >
                {d.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="doc-hub-grid">
        {filtered.map((doc) => (
          <Link
            key={doc.id}
            href={`/admin/templates/${doc.slug}`}
            className="doc-hub-card"
          >
            <div className="doc-hub-card__top">
              <span
                className="doc-hub-card__icon"
                style={{ ["--icon-c" as string]: docIconTone(doc.slug) }}
              >
                <DocIcon slug={doc.slug} size={20} />
              </span>
              <span className="symp-status tone-info">
                <i />
                {doc.domain}
              </span>
            </div>
            <h3>{doc.title}</h3>
            <p>{doc.subtitle}</p>
            <div className="doc-hub-card__meta">
              <span>{doc.module}</span>
              <span>
                {doc.records.length} dossier
                {doc.records.length > 1 ? "s" : ""}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun document"
          hint="Aucun document pour ce filtre."
        />
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
