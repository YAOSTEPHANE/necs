"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconSearch, IconUser } from "@/components/admin/Icons";
import { NeedQualificationPanel } from "@/components/admin/NeedQualificationPanel";
import {
  OPPORTUNITY_STAGE_LABELS,
  type CrmOpportunity,
} from "@/lib/need-qualification-shared";
import type { Prospect } from "@/lib/prospects-shared";
import { toast } from "@/lib/toast";

type Filter = "all" | "incomplet" | "pret" | "etude";

export function NeedQualificationWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const searchParams = useSearchParams();
  const prospectFromUrl = searchParams.get("prospectId") || "";
  const [opps, setOpps] = useState<CrmOpportunity[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [oppRes, proRes] = await Promise.all([
        fetch("/api/need-qualification", { cache: "no-store" }),
        fetch("/api/prospects", { cache: "no-store" }),
      ]);
      const oppData = (await oppRes.json()) as {
        items?: CrmOpportunity[];
        error?: string;
      };
      const proData = (await proRes.json()) as {
        items?: Prospect[];
        error?: string;
      };
      if (!oppRes.ok) {
        throw new Error(oppData.error || "Chargement opportunités");
      }
      if (!proRes.ok) {
        throw new Error(proData.error || "Chargement prospects");
      }
      setOpps(oppData.items ?? []);
      setProspects(proData.items ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (prospectFromUrl) {
      setSelectedProspectId(prospectFromUrl);
    }
  }, [prospectFromUrl]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromOpps = opps.map((o) => ({
      prospectId: o.prospectId,
      company: o.company,
      stage: o.stage,
      complete: o.needComplete,
      missing: o.missingFields?.length ?? 0,
      oppId: o.id,
    }));
    const oppIds = new Set(opps.map((o) => o.prospectId));
    const fromProspects = prospects
      .filter((p) => !oppIds.has(p.id))
      .map((p) => ({
        prospectId: p.id,
        company: p.company,
        stage: "—" as const,
        complete: false,
        missing: 0,
        oppId: "",
      }));
    let all = [...fromOpps, ...fromProspects];
    if (filter === "incomplet") {
      all = all.filter((r) => !r.complete || r.stage === "—");
    } else if (filter === "pret") {
      all = all.filter(
        (r) => r.complete && r.stage !== "etude" && r.stage !== "—",
      );
    } else if (filter === "etude") {
      all = all.filter((r) => r.stage === "etude");
    }
    if (!q) return all;
    return all.filter(
      (r) =>
        r.company.toLowerCase().includes(q) ||
        r.prospectId.toLowerCase().includes(q) ||
        r.oppId.toLowerCase().includes(q),
    );
  }, [opps, prospects, query, filter]);

  useEffect(() => {
    if (!rows.length) {
      if (selectedProspectId && !prospectFromUrl) setSelectedProspectId(null);
      return;
    }
    if (
      !selectedProspectId ||
      !rows.some((r) => r.prospectId === selectedProspectId)
    ) {
      if (
        prospectFromUrl &&
        rows.some((r) => r.prospectId === prospectFromUrl)
      ) {
        setSelectedProspectId(prospectFromUrl);
      } else {
        setSelectedProspectId(rows[0]!.prospectId);
      }
    }
  }, [rows, selectedProspectId, prospectFromUrl]);

  const selectedCompany =
    prospects.find((p) => p.id === selectedProspectId)?.company ||
    opps.find((o) => o.prospectId === selectedProspectId)?.company ||
    "";

  const counts = useMemo(() => {
    const incomplete =
      opps.filter((o) => !o.needComplete).length +
      prospects.filter((p) => !opps.some((o) => o.prospectId === p.id)).length;
    return {
      total: opps.length + prospects.filter((p) => !opps.some((o) => o.prospectId === p.id)).length,
      incomplete,
      ready: opps.filter(
        (o) => o.needComplete && o.stage !== "etude",
      ).length,
      study: opps.filter((o) => o.stage === "etude").length,
    };
  }, [opps, prospects]);

  const headerActions = (
    <div className="leads-header-actions">
      <Link
        href="/admin/commercial?tab=prospects"
        className="btn-admin btn-admin--ghost"
      >
        Prospects
      </Link>
      <Link
        href="/admin/pipeline"
        className="btn-admin btn-admin--ghost"
      >
        Pipeline
      </Link>
      <button
        type="button"
        className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
        onClick={() => void refresh()}
        disabled={loading}
      >
        {loading ? "Actualisation…" : "Actualiser"}
      </button>
    </div>
  );

  return (
    <div
      className={`leads-page need-qual-page${embedded ? " need-qual-page--embedded" : ""}`}
      data-testid="need-qualification-workspace"
    >
      {embedded ? (
        <div className="fin-embedded-bar need-qual-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">CRM-02 · Besoin</p>
            <h2>Qualification du besoin</h2>
            <p>
              Surface, type de locaux, fréquence, horaires, contraintes et
              niveau de service — passage à l’étude seulement si complet
            </p>
          </div>
          {headerActions}
        </div>
      ) : (
        <ModuleHeader
          tone="#0f766e"
          badge="CRM-02 · Commercial"
          icon={<IconUser size={20} />}
          title="Qualification du besoin"
          meta={
            <>
              <span>
                <strong>{counts.total}</strong> dossiers
              </span>
              <span>
                <strong>{counts.ready}</strong> prêts étude
              </span>
              <span>
                <strong>{counts.study}</strong> en étude
              </span>
            </>
          }
          actions={headerActions}
        />
      )}

      <section className="leads-kpis" aria-label="Indicateurs qualification">
        <article className="leads-kpi leads-kpi--accent">
          <p>Incomplets</p>
          <strong>{counts.incomplete}</strong>
          <span>champs manquants</span>
        </article>
        <article className="leads-kpi">
          <p>Prêts étude</p>
          <strong>{counts.ready}</strong>
          <span>besoin complet</span>
        </article>
        <article className="leads-kpi">
          <p>En étude</p>
          <strong>{counts.study}</strong>
          <span>chiffrage / visite</span>
        </article>
        <article className="leads-kpi">
          <p>Total</p>
          <strong>{counts.total}</strong>
          <span>prospects / opportunités</span>
        </article>
      </section>

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher prospect / opportunité…"
            aria-label="Rechercher"
          />
        </label>
        <div className="leads-filters" role="tablist">
          {(
            [
              ["all", "Tous", counts.total],
              ["incomplet", "Incomplets", counts.incomplete],
              ["pret", "Prêts étude", counts.ready],
              ["etude", "En étude", counts.study],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={`leads-chip${filter === id ? " is-active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
              {count > 0 ? <em>{count}</em> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="leads-layout">
        <div className="leads-list" role="listbox" aria-label="Besoins">
          {loading && rows.length === 0 ? (
            <div className="leads-empty">
              <h2>Chargement…</h2>
            </div>
          ) : rows.length === 0 ? (
            <div className="leads-empty">
              <IconUser size={28} />
              <h2>Aucun dossier</h2>
              <p>
                Créez d’abord un prospect, puis structurez le besoin de
                nettoyage.
              </p>
              <Link
                href="/admin/commercial?tab=prospects"
                className="btn-admin btn-admin--primary"
              >
                Aller aux prospects
              </Link>
            </div>
          ) : (
            rows.map((r) => (
              <button
                key={r.prospectId}
                type="button"
                role="option"
                aria-selected={selectedProspectId === r.prospectId}
                className={`leads-card${
                  selectedProspectId === r.prospectId ? " is-active" : ""
                }`}
                onClick={() => setSelectedProspectId(r.prospectId)}
              >
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{r.company || r.prospectId}</strong>
                    <em
                      className={
                        r.complete
                          ? "need-qual-pill is-ok"
                          : "need-qual-pill is-warn"
                      }
                    >
                      {r.complete ? "Complet" : "Incomplet"}
                    </em>
                  </span>
                  <span className="leads-card__preview">
                    {r.oppId || "Pas d’opportunité"} ·{" "}
                    {r.stage === "—"
                      ? "À qualifier"
                      : OPPORTUNITY_STAGE_LABELS[
                          r.stage as keyof typeof OPPORTUNITY_STAGE_LABELS
                        ] || r.stage}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {selectedProspectId ? (
            <NeedQualificationPanel
              key={selectedProspectId}
              prospectId={selectedProspectId}
              company={selectedCompany}
              embedded={false}
              onChanged={() => void refresh()}
            />
          ) : (
            <div className="leads-empty-detail">
              <IconUser size={28} />
              <h2>Sélectionnez un dossier</h2>
              <p>
                Structurez surface, locaux, fréquence, horaires, contraintes et
                niveau de service.
              </p>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
