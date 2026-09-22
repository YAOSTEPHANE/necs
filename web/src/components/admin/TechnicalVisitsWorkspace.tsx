"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import {
  AdminFormWizard,
  FwPanel,
  FwPanelHead,
  FwGrid,
  FwField,
  FwReview,
  FwReviewCard,
} from "@/components/admin/form-wizard";
import { IconSearch, IconVisit } from "@/components/admin/Icons";
import { fileToOptimizedDataUrl } from "@/lib/settings";
import {
  VISIT_STATUS_LABELS,
  buildVisitReportSnapshot,
  visitReportBlockingReasons,
  type ChecklistItemId,
  type TechnicalVisit,
  type VisitZone,
} from "@/lib/technical-visit-shared";
import type { Prospect } from "@/lib/prospects-shared";
import { toast } from "@/lib/toast";

function formatWhen(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInputValue(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TechnicalVisitsWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const searchParams = useSearchParams();
  const prospectFromUrl = searchParams.get("prospectId") || "";
  const [items, setItems] = useState<TechnicalVisit[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("actives");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<
    "prospect" | "planning" | "revue"
  >("prospect");
  const [composerShake, setComposerShake] = useState(false);

  const [plan, setPlan] = useState({
    prospectId: "",
    scheduledAt: "",
    scheduledEndAt: "",
    siteAddress: "",
    assigneeEmail: "",
    assigneeName: "",
    contactName: "",
    contactPhone: "",
    note: "",
  });

  const [surface, setSurface] = useState("");
  const [constraints, setConstraints] = useState("");
  const [observations, setObservations] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [interlocutor, setInterlocutor] = useState("");
  const [staff, setStaff] = useState("");
  const [risks, setRisks] = useState("");
  const [needs, setNeeds] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [actions, setActions] = useState("");
  const [zones, setZones] = useState<VisitZone[]>([]);
  const [zoneName, setZoneName] = useState("");
  const [zoneSurface, setZoneSurface] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([
        fetch("/api/technical-visits", { cache: "no-store" }),
        fetch("/api/prospects", { cache: "no-store" }),
      ]);
      const vData = (await vRes.json()) as {
        items?: TechnicalVisit[];
        canManage?: boolean;
        canValidate?: boolean;
        email?: string;
        error?: string;
      };
      const pData = (await pRes.json()) as {
        items?: Prospect[];
        error?: string;
      };
      if (!vRes.ok) throw new Error(vData.error || "Chargement visites");
      setItems(vData.items ?? []);
      setCanManage(Boolean(vData.canManage));
      setCanValidate(Boolean(vData.canValidate));
      setEmail(vData.email ?? "");
      if (pRes.ok) setProspects(pData.items ?? []);
      setSelectedId((prev) => prev ?? vData.items?.[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const prospectBootstrapped = useRef(false);

  useEffect(() => {
    if (prospectBootstrapped.current) return;
    if (!prospectFromUrl || prospects.length === 0 || !canManage) return;
    const p = prospects.find((x) => x.id === prospectFromUrl);
    if (!p) return;
    prospectBootstrapped.current = true;
    setPlan({
      prospectId: p.id,
      scheduledAt: toLocalInputValue(
        new Date(Date.now() + 86400000).toISOString(),
      ),
      scheduledEndAt: toLocalInputValue(
        new Date(Date.now() + 86400000 + 2 * 3600000).toISOString(),
      ),
      siteAddress: p.address || p.city || "",
      assigneeEmail: email,
      assigneeName: "",
      contactName: p.name || "",
      contactPhone: p.phone || "",
      note: "",
    });
    setComposerStep("prospect");
    setComposerOpen(true);
  }, [prospectFromUrl, prospects, canManage, email]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setSurface(
      selected.report.surfaceTotalM2 != null
        ? String(selected.report.surfaceTotalM2)
        : "",
    );
    setConstraints(selected.report.constraints);
    setObservations(selected.report.observations);
    setAccessNotes(selected.report.accessNotes);
    setInterlocutor(selected.report.interlocutor);
    setStaff(
      selected.report.recommendedStaff != null
        ? String(selected.report.recommendedStaff)
        : "",
    );
    setRisks(selected.report.risks || "");
    setNeeds(selected.report.needs || "");
    setRecommendations(selected.report.recommendations || "");
    setActions(selected.report.actions || "");
    setZones(selected.report.zones);
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((v) => {
      if (filter === "actives" && (v.status === "validee" || v.status === "annulee")) {
        return false;
      }
      if (filter !== "all" && filter !== "actives" && v.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        v.company.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        v.siteAddress.toLowerCase().includes(q) ||
        v.assigneeName.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  const counts = useMemo(() => {
    return {
      total: items.length,
      planifiee: items.filter((v) => v.status === "planifiee").length,
      en_cours: items.filter(
        (v) => v.status === "en_cours" || v.status === "rapport_brouillon",
      ).length,
      validee: items.filter((v) => v.status === "validee").length,
    };
  }, [items]);

  async function post(
    action: string,
    body: Record<string, unknown> = {},
    opts?: { manageBusy?: boolean },
  ) {
    const manageBusy = opts?.manageBusy !== false;
    if (manageBusy && busy) return null;
    if (manageBusy && busyLock.current) return null;
    if (manageBusy) {
      busyLock.current = true;
      setBusy(true);
    }
    try {
      const res = await fetch("/api/technical-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = (await res.json()) as {
        item?: TechnicalVisit;
        visit?: TechnicalVisit;
        snapshot?: ReturnType<typeof buildVisitReportSnapshot>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      const item = data.item ?? data.visit;
      if (item) {
        setItems((prev) => {
          const rest = prev.filter((p) => p.id !== item.id);
          return [item, ...rest];
        });
        setSelectedId(item.id);
      }
      if (action === "validate" && data.snapshot) {
        toast.success(
          `Rapport validé ${formatWhen(data.snapshot.validatedAt)} — prêt chiffrage`,
        );
      } else if (action === "plan") {
        toast.success("Visite planifiée");
        setComposerOpen(false);
        setComposerStep("prospect");
      } else {
        toast.success("Mis à jour");
      }
      return item;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      if (manageBusy) {
        busyLock.current = false;
        setBusy(false);
      }
    }
  }

  async function saveCollect() {
    if (!selected) return;
    const zonesSurface = zones.reduce(
      (acc, z) => acc + (typeof z.surfaceM2 === "number" ? z.surfaceM2 : 0),
      0,
    );
    const surfaceValue = surface
      ? Number(surface)
      : zonesSurface > 0
        ? zonesSurface
        : null;
    await post("collect", {
      id: selected.id,
      surfaceTotalM2: surfaceValue,
      constraints,
      observations,
      accessNotes,
      interlocutor,
      recommendedStaff: staff ? Number(staff) : null,
      risks,
      needs,
      recommendations,
      actions,
      zones,
    });
    if (!surface && zonesSurface > 0) {
      setSurface(String(zonesSurface));
    }
  }

  async function onPhotoSelected(file: File | null) {
    if (!selected || !file) return;
    if (busy || busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const url = await fileToOptimizedDataUrl(file, 1400);
      busyLock.current = false;
      setBusy(false);
      await post(
        "add-photo",
        {
          id: selected.id,
          url,
          caption: file.name,
        },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload impossible");
      busyLock.current = false;
      setBusy(false);
    }
  }

  const blockers = selected ? visitReportBlockingReasons(selected) : [];
  const snapshot = selected ? buildVisitReportSnapshot(selected) : null;
  const locked = selected?.status === "validee";

  const prospectReady =
    Boolean(plan.prospectId) &&
    Boolean(plan.assigneeEmail.trim()) &&
    plan.assigneeEmail.includes("@");
  const planningReady = Boolean(plan.scheduledAt);
  const pulseComposerError = () => {
    setComposerShake(true);
    window.setTimeout(() => setComposerShake(false), 420);
  };
  const canEnterComposerStep = (id: string) => {
    if (id === "prospect") return true;
    if (id === "planning") return prospectReady;
    return prospectReady && planningReady;
  };
  const submitPlan = (e: FormEvent) => {
    e.preventDefault();
    void post("plan", {
      ...plan,
      scheduledAt: plan.scheduledAt
        ? new Date(plan.scheduledAt).toISOString()
        : "",
      scheduledEndAt: plan.scheduledEndAt
        ? new Date(plan.scheduledEndAt).toISOString()
        : "",
    });
  };
  const selectedProspect = prospects.find((p) => p.id === plan.prospectId);

  return (
    <div
      className={`leads-page tech-visit-page${embedded ? " tech-visit-page--embedded" : ""}`}
    >
      {embedded ? (
        <div className="fin-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">CRM · Audit VT</p>
            <h2>Rapport d’audit / visite technique</h2>
            <p>
              Constats, photos, mesures, risques, besoins, recommandations et
              actions → offre / devis
            </p>
          </div>
          <div className="leads-header-actions">
            {canManage ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => {
                  setPlan({
                    prospectId: prospects[0]?.id || "",
                    scheduledAt: toLocalInputValue(
                      new Date(Date.now() + 86400000).toISOString(),
                    ),
                    scheduledEndAt: toLocalInputValue(
                      new Date(
                        Date.now() + 86400000 + 2 * 3600000,
                      ).toISOString(),
                    ),
                    siteAddress:
                      prospects[0]?.address || prospects[0]?.city || "",
                    assigneeEmail: email,
                    assigneeName: "",
                    contactName: prospects[0]?.name || "",
                    contactPhone: prospects[0]?.phone || "",
                    note: "",
                  });
                  setComposerStep("prospect");
                  setComposerOpen(true);
                }}
              >
                Planifier
              </button>
            ) : null}
            <button
              type="button"
              className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
              onClick={() => void refresh()}
              disabled={loading}
            >
              Actualiser
            </button>
          </div>
        </div>
      ) : (
        <ModuleHeader
          tone="#0a3a72"
          badge="CRM / Qualité"
          icon={<IconVisit size={20} />}
          title="Rapport d’audit / visite technique"
          meta={
            <>
              <span>
                Constats · photos · mesures · risques · besoins · actions
              </span>
              <span>
                <strong>{counts.validee}</strong> rapports validés
              </span>
            </>
          }
          actions={
            <>
              <Link
                href="/admin/commercial?tab=prospects"
                className="btn-admin btn-admin--ghost"
              >
                Prospects / besoin
              </Link>
              {canManage ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={() => {
                    setPlan({
                      prospectId: prospects[0]?.id || "",
                      scheduledAt: toLocalInputValue(
                        new Date(Date.now() + 86400000).toISOString(),
                      ),
                      scheduledEndAt: toLocalInputValue(
                        new Date(
                          Date.now() + 86400000 + 2 * 3600000,
                        ).toISOString(),
                      ),
                      siteAddress:
                        prospects[0]?.address || prospects[0]?.city || "",
                      assigneeEmail: email,
                      assigneeName: "",
                      contactName: prospects[0]?.name || "",
                      contactPhone: prospects[0]?.phone || "",
                      note: "",
                    });
                    setComposerStep("prospect");
                    setComposerOpen(true);
                  }}
                >
                  Planifier
                </button>
              ) : null}
              <button
                type="button"
                className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
                onClick={() => void refresh()}
                disabled={loading}
              >
                Actualiser
              </button>
            </>
          }
        />
      )}

      <section className="leads-kpis" aria-label="Indicateurs visites">
        <article className="leads-kpi leads-kpi--accent">
          <p>Planifiées</p>
          <strong>{counts.planifiee}</strong>
          <span>à réaliser</span>
        </article>
        <article className="leads-kpi">
          <p>En collecte</p>
          <strong>{counts.en_cours}</strong>
          <span>checklist & terrain</span>
        </article>
        <article className="leads-kpi">
          <p>Rapports validés</p>
          <strong>{counts.validee}</strong>
          <span>prêts chiffrage</span>
        </article>
        <article className="leads-kpi">
          <p>Total</p>
          <strong>{counts.total}</strong>
          <span>visites</span>
        </article>
      </section>

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher entreprise, site, visite…"
          />
        </label>
        <div className="leads-filters" role="tablist">
          {[
            ["actives", "Actives"],
            ["all", "Toutes"],
            ["planifiee", "Planifiées"],
            ["rapport_brouillon", "Brouillons"],
            ["validee", "Validées"],
          ].map(([id, label]) => (
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

      {loading ? (
        <p className="leads-empty">Chargement…</p>
      ) : (
        <div className="leads-shell">
          <div className="leads-inbox" role="listbox">
            {filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                role="option"
                aria-selected={selectedId === v.id}
                className={`leads-card${selectedId === v.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(v.id)}
              >
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{v.company}</strong>
                    <time>{formatWhen(v.scheduledAt)}</time>
                  </span>
                  <span className="leads-card__mid">
                    <span className={`tech-visit-status tech-visit-status--${v.status}`}>
                      {VISIT_STATUS_LABELS[v.status]}
                    </span>
                  </span>
                  <span className="leads-card__preview">
                    {v.id} · {v.siteAddress || "Site à préciser"} ·{" "}
                    {v.assigneeName || v.assigneeEmail}
                  </span>
                </span>
              </button>
            ))}
            {filtered.length === 0 ? (
              <p className="leads-empty">Aucune visite.</p>
            ) : null}
          </div>

          <article className="leads-detail tech-visit-detail">
            {!selected ? (
              <div className="leads-empty-detail">
                <p>Sélectionnez une visite pour collecter ou valider le rapport.</p>
              </div>
            ) : (
              <>
                <header className="leads-detail__head">
                  <div>
                    <p className="leads-detail__eyebrow">{selected.id}</p>
                    <h2>{selected.company}</h2>
                    <p className="leads-detail__sub">
                      {formatWhen(selected.scheduledAt)} ·{" "}
                      {VISIT_STATUS_LABELS[selected.status]}
                      {selected.report.validatedAt
                        ? ` · validé ${formatWhen(selected.report.validatedAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="leads-detail__actions">
                    {canManage && selected.status === "planifiee" ? (
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={busy}
                        onClick={() => void post("start", { id: selected.id })}
                      >
                        Démarrer la visite
                      </button>
                    ) : null}
                    {canValidate && selected.status !== "validee" && selected.status !== "annulee" ? (
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={busy || blockers.length > 0}
                        title={
                          blockers.length
                            ? blockers.join(" · ")
                            : "Valider le rapport horodaté"
                        }
                        onClick={() =>
                          void post("validate", { id: selected.id })
                        }
                      >
                        Valider le rapport
                      </button>
                    ) : null}
                    {canManage &&
                    selected.status !== "validee" &&
                    selected.status !== "annulee" ? (
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt(
                            "Motif d’annulation (optionnel)",
                          );
                          if (reason === null) return;
                          void post("cancel", {
                            id: selected.id,
                            reason,
                          });
                        }}
                      >
                        Annuler
                      </button>
                    ) : null}
                  </div>
                </header>

                {snapshot?.exploitableForQuote ? (
                  <div className="tech-visit-ready">
                    <strong>Rapport horodaté exploitable pour le chiffrage</strong>
                    <p>
                      v{selected.report.reportVersion} · validé{" "}
                      {formatWhen(selected.report.validatedAt)} par{" "}
                      {selected.report.validatedByName || "—"} ·{" "}
                      {selected.report.surfaceTotalM2} m² ·{" "}
                      {selected.report.zones.length} zone(s) ·{" "}
                      {selected.report.photos.length} photo(s)
                    </p>
                    <Link
                      className="btn-admin btn-admin--primary"
                      href={`/admin/commercial?tab=chiffrage&visitId=${encodeURIComponent(selected.id)}`}
                    >
                      Créer le devis
                    </Link>
                    <Link
                      className="btn-admin btn-admin--ghost"
                      href={`/admin/commercial?tab=offre&visitId=${encodeURIComponent(selected.id)}`}
                    >
                      Générer l’offre
                    </Link>
                  </div>
                ) : blockers.length > 0 ? (
                  <div className="tech-visit-blockers">
                    <strong>Avant validation (Must)</strong>
                    <ul>
                      {blockers.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="tech-visit-hint">
                    Checklist complète — validez pour horodater le rapport et
                    l’envoyer au chiffrage.
                  </div>
                )}

                {selected.status === "validee" ? (
                  <section className="tech-visit-report" aria-label="Rapport horodaté">
                    <h3>Rapport technique (chiffrage)</h3>
                    <dl className="tech-visit-report__grid">
                      <div>
                        <dt>Horodatage</dt>
                        <dd>{formatWhen(selected.report.validatedAt)}</dd>
                      </div>
                      <div>
                        <dt>Version</dt>
                        <dd>v{selected.report.reportVersion}</dd>
                      </div>
                      <div>
                        <dt>Surface totale</dt>
                        <dd>{selected.report.surfaceTotalM2 ?? "—"} m²</dd>
                      </div>
                      <div>
                        <dt>Effectif recommandé</dt>
                        <dd>{selected.report.recommendedStaff ?? "—"}</dd>
                      </div>
                      <div className="tech-visit-report__full">
                        <dt>Zones</dt>
                        <dd>
                          {selected.report.zones.length === 0
                            ? "—"
                            : selected.report.zones
                                .map(
                                  (z) =>
                                    `${z.name}${z.surfaceM2 != null ? ` (${z.surfaceM2} m²)` : ""}`,
                                )
                                .join(" · ")}
                        </dd>
                      </div>
                      <div className="tech-visit-report__full">
                        <dt>Contraintes</dt>
                        <dd>{selected.report.constraints || "—"}</dd>
                      </div>
                      <div className="tech-visit-report__full">
                        <dt>Observations</dt>
                        <dd>{selected.report.observations || "—"}</dd>
                      </div>
                      <div className="tech-visit-report__full">
                        <dt>Risques</dt>
                        <dd>{selected.report.risks || "—"}</dd>
                      </div>
                      <div className="tech-visit-report__full">
                        <dt>Besoins</dt>
                        <dd>{selected.report.needs || "—"}</dd>
                      </div>
                      <div className="tech-visit-report__full">
                        <dt>Recommandations</dt>
                        <dd>{selected.report.recommendations || "—"}</dd>
                      </div>
                      <div className="tech-visit-report__full">
                        <dt>Actions</dt>
                        <dd>{selected.report.actions || "—"}</dd>
                      </div>
                      <div className="tech-visit-report__full">
                        <dt>Accès</dt>
                        <dd>{selected.report.accessNotes || "—"}</dd>
                      </div>
                    </dl>
                  </section>
                ) : null}

                <section className="tech-visit-checklist">
                  <h3>Checklist</h3>
                  <ul>
                    {selected.report.checklist.map((c) => (
                      <li key={c.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={c.done}
                            disabled={busy || locked || !canManage}
                            onChange={(e) =>
                              void post("checklist", {
                                id: selected.id,
                                itemId: c.id as ChecklistItemId,
                                done: e.target.checked,
                              })
                            }
                          />
                          <span>
                            {c.label}
                            {c.required ? " *" : ""}
                          </span>
                        </label>
                        {c.doneAt ? (
                          <em>{formatWhen(c.doneAt)}</em>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="tech-visit-collect">
                  <h3>Collecte terrain</h3>
                  <div className="need-qual__grid">
                    <label>
                      Surface totale m² *
                      <input
                        type="number"
                        min={0}
                        value={surface}
                        disabled={locked || !canManage}
                        onChange={(e) => setSurface(e.target.value)}
                      />
                    </label>
                    <label>
                      Effectif recommandé
                      <input
                        type="number"
                        min={0}
                        value={staff}
                        disabled={locked || !canManage}
                        onChange={(e) => setStaff(e.target.value)}
                      />
                    </label>
                    <label>
                      Interlocuteur
                      <input
                        value={interlocutor}
                        disabled={locked || !canManage}
                        onChange={(e) => setInterlocutor(e.target.value)}
                      />
                    </label>
                    <label className="need-qual__full">
                      Contraintes *
                      <textarea
                        rows={2}
                        value={constraints}
                        disabled={locked || !canManage}
                        onChange={(e) => setConstraints(e.target.value)}
                      />
                    </label>
                    <label className="need-qual__full">
                      Observations *
                      <textarea
                        rows={3}
                        value={observations}
                        disabled={locked || !canManage}
                        onChange={(e) => setObservations(e.target.value)}
                      />
                    </label>
                    <label className="need-qual__full">
                      Risques
                      <textarea
                        rows={2}
                        value={risks}
                        disabled={locked || !canManage}
                        onChange={(e) => setRisks(e.target.value)}
                        placeholder="Risques sécurité, hygiène, accès…"
                      />
                    </label>
                    <label className="need-qual__full">
                      Besoins
                      <textarea
                        rows={2}
                        value={needs}
                        disabled={locked || !canManage}
                        onChange={(e) => setNeeds(e.target.value)}
                        placeholder="Besoins matériel, effectifs, fréquences…"
                      />
                    </label>
                    <label className="need-qual__full">
                      Recommandations
                      <textarea
                        rows={2}
                        value={recommendations}
                        disabled={locked || !canManage}
                        onChange={(e) => setRecommendations(e.target.value)}
                      />
                    </label>
                    <label className="need-qual__full">
                      Actions
                      <textarea
                        rows={2}
                        value={actions}
                        disabled={locked || !canManage}
                        onChange={(e) => setActions(e.target.value)}
                        placeholder="Actions à engager après l’audit"
                      />
                    </label>
                    <label className="need-qual__full">
                      Accès / consignes
                      <textarea
                        rows={2}
                        value={accessNotes}
                        disabled={locked || !canManage}
                        onChange={(e) => setAccessNotes(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="tech-visit-zones">
                    <h4>Zones *</h4>
                    <ul>
                      {zones.map((z) => (
                        <li key={z.id}>
                          <strong>{z.name}</strong>
                          <span>
                            {z.surfaceM2 != null ? `${z.surfaceM2} m²` : "—"}
                            {z.note ? ` · ${z.note}` : ""}
                          </span>
                          {!locked && canManage ? (
                            <button
                              type="button"
                              className="btn-admin btn-admin--ghost"
                              onClick={() =>
                                setZones((prev) =>
                                  prev.filter((x) => x.id !== z.id),
                                )
                              }
                            >
                              Retirer
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {!locked && canManage ? (
                      <div className="recruit-actions__row">
                        <input
                          value={zoneName}
                          onChange={(e) => setZoneName(e.target.value)}
                          placeholder="Nom zone"
                        />
                        <input
                          type="number"
                          min={0}
                          value={zoneSurface}
                          onChange={(e) => setZoneSurface(e.target.value)}
                          placeholder="m²"
                        />
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          onClick={() => {
                            if (!zoneName.trim()) return;
                            setZones((prev) => [
                              ...prev,
                              {
                                id: `ZN-${Date.now()}`,
                                name: zoneName.trim(),
                                surfaceM2: zoneSurface
                                  ? Number(zoneSurface)
                                  : null,
                                note: "",
                              },
                            ]);
                            setZoneName("");
                            setZoneSurface("");
                          }}
                        >
                          Ajouter zone
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {!locked && canManage ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy}
                      onClick={() => void saveCollect()}
                    >
                      Enregistrer la collecte
                    </button>
                  ) : null}
                </section>

                <section className="tech-visit-photos">
                  <h3>Photos *</h3>
                  {!locked && canManage ? (
                    <label className="tech-visit-upload">
                      Ajouter une photo
                      <input
                        type="file"
                        accept="image/*"
                        disabled={busy}
                        onChange={(e) =>
                          void onPhotoSelected(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  ) : null}
                  <div className="tech-visit-photos__grid">
                    {selected.report.photos.map((p) => (
                      <figure key={p.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={p.caption || p.id} />
                        <figcaption>
                          {formatWhen(p.takenAt)}
                          {!locked && canManage ? (
                            <button
                              type="button"
                              className="btn-admin btn-admin--ghost"
                              disabled={busy}
                              onClick={() =>
                                void post("remove-photo", {
                                  id: selected.id,
                                  photoId: p.id,
                                })
                              }
                            >
                              Retirer
                            </button>
                          ) : null}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </section>

                <section className="prospect-history">
                  <h3>Historique</h3>
                  <ol>
                    {selected.history.slice(0, 12).map((h) => (
                      <li key={h.id}>
                        <time>{formatWhen(h.at)}</time>
                        <span>
                          {h.byName} — {h.detail}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            )}
          </article>
        </div>
      )}

      <AdminFormWizard
        open={composerOpen}
        portal
        onClose={() => {
          setComposerOpen(false);
          setComposerStep("prospect");
        }}
        titleId="tech-visit-plan-title"
        eyebrow="Visite technique"
        title="Planifier une visite"
        lead="Commercial ou exploitation — checklist & rapport horodaté pour le chiffrage."
        steps={[
          { id: "prospect", label: "Prospect", hint: "Site & assigné" },
          { id: "planning", label: "Planning", hint: "Créneau & notes" },
          { id: "revue", label: "Revue", hint: "Contrôle avant planification" },
        ]}
        stepId={composerStep}
        onStepChange={(id) =>
          setComposerStep(id as "prospect" | "planning" | "revue")
        }
        canEnterStep={canEnterComposerStep}
        onStepBlocked={pulseComposerError}
        shake={composerShake}
        formId="necs-tech-visit-plan"
        onSubmit={submitPlan}
        submitLabel="Planifier"
        busy={busy}
        canSubmit={prospectReady && planningReady}
      >
        {composerStep === "prospect" ? (
          <FwPanel aria-label="Prospect">
            <FwPanelHead
              title="Prospect & assignation"
              description="Choisissez le prospect et le responsable de la visite."
            />
            <FwGrid>
              <FwField label="Prospect *" wide>
                <select
                  required
                  value={plan.prospectId}
                  onChange={(e) => {
                    const p = prospects.find((x) => x.id === e.target.value);
                    setPlan((d) => ({
                      ...d,
                      prospectId: e.target.value,
                      siteAddress: p?.address || p?.city || d.siteAddress,
                      contactName: p?.name || d.contactName,
                      contactPhone: p?.phone || d.contactPhone,
                    }));
                  }}
                >
                  <option value="">— Choisir —</option>
                  {prospects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.company} ({p.id})
                    </option>
                  ))}
                </select>
              </FwField>
              <FwField label="Assigné (e-mail) *">
                <input
                  type="email"
                  required
                  value={plan.assigneeEmail}
                  onChange={(e) =>
                    setPlan((d) => ({
                      ...d,
                      assigneeEmail: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Nom assigné">
                <input
                  value={plan.assigneeName}
                  placeholder="Commercial / exploitation"
                  onChange={(e) =>
                    setPlan((d) => ({
                      ...d,
                      assigneeName: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Adresse site" wide>
                <input
                  value={plan.siteAddress}
                  onChange={(e) =>
                    setPlan((d) => ({ ...d, siteAddress: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Contact site">
                <input
                  value={plan.contactName}
                  onChange={(e) =>
                    setPlan((d) => ({
                      ...d,
                      contactName: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Téléphone site">
                <input
                  value={plan.contactPhone}
                  onChange={(e) =>
                    setPlan((d) => ({
                      ...d,
                      contactPhone: e.target.value,
                    }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "planning" ? (
          <FwPanel aria-label="Planning">
            <FwPanelHead
              title="Créneau & objectif"
              description="Horaires prévus et points à vérifier sur site."
            />
            <FwGrid>
              <FwField label="Début *">
                <input
                  type="datetime-local"
                  required
                  value={plan.scheduledAt}
                  onChange={(e) =>
                    setPlan((d) => ({ ...d, scheduledAt: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Fin prévue">
                <input
                  type="datetime-local"
                  value={plan.scheduledEndAt}
                  onChange={(e) =>
                    setPlan((d) => ({
                      ...d,
                      scheduledEndAt: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Note / objectif" wide>
                <textarea
                  rows={3}
                  value={plan.note}
                  placeholder="Points à vérifier, accès, urgences…"
                  onChange={(e) =>
                    setPlan((d) => ({ ...d, note: e.target.value }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue avant planification"
              description="Vérifiez prospect, créneau et assignation."
            />
            <FwReview>
              <FwReviewCard
                title="Prospect"
                rows={[
                  {
                    label: "Société",
                    value: selectedProspect?.company || "—",
                  },
                  { label: "Adresse", value: plan.siteAddress || "—" },
                  {
                    label: "Contact",
                    value: plan.contactName
                      ? `${plan.contactName}${
                          plan.contactPhone ? ` · ${plan.contactPhone}` : ""
                        }`
                      : "—",
                  },
                ]}
              />
              <FwReviewCard
                title="Planning"
                rows={[
                  {
                    label: "Début",
                    value: plan.scheduledAt
                      ? formatWhen(new Date(plan.scheduledAt).toISOString())
                      : "—",
                  },
                  {
                    label: "Fin",
                    value: plan.scheduledEndAt
                      ? formatWhen(new Date(plan.scheduledEndAt).toISOString())
                      : "—",
                  },
                  {
                    label: "Assigné",
                    value: plan.assigneeName
                      ? `${plan.assigneeName} · ${plan.assigneeEmail}`
                      : plan.assigneeEmail || "—",
                  },
                  { label: "Note", value: plan.note.trim() || "—" },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>
    </div>
  );
}
