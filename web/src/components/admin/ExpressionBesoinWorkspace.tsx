"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { RhWorkspaceShell } from "@/components/admin/RhWorkspaceShell";
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
import { IconInterview, IconSearch } from "@/components/admin/Icons";
import { toast } from "@/lib/toast";
import {
  STAFFING_PROFILE_LABELS,
  STAFFING_SOURCE_LABELS,
  STAFFING_STATUS_LABELS,
  staffingApprovalRequirements,
  type StaffingNeed,
  type StaffingNeedSource,
  type StaffingNeedStatus,
  type StaffingProfile,
} from "@/lib/staffing-needs-shared";

type ContractOpt = {
  id: string;
  label: string;
  staffCount: number;
  clientName: string;
  sites: Array<{ id: string; name: string; city: string }>;
};
type SlotOpt = {
  id: string;
  label: string;
  requiredStaff: number;
  assigned: number;
  siteId: string;
  siteName: string;
  clientName: string;
  contractId: string;
  understaffed: boolean;
};
type SiteOpt = { id: string; name: string; clientName: string };

export function ExpressionBesoinWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<StaffingNeed[]>([]);
  const [contracts, setContracts] = useState<ContractOpt[]>([]);
  const [slots, setSlots] = useState<SlotOpt[]>([]);
  const [sites, setSites] = useState<SiteOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canHier, setCanHier] = useState(false);
  const [canBudget, setCanBudget] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    StaffingNeedStatus | "all" | "pending"
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    refused: 0,
    awaitingHierarchical: 0,
    awaitingBudget: 0,
  });

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<
    "besoin" | "source" | "revue"
  >("besoin");
  const [composerShake, setComposerShake] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    source: "contrat" as StaffingNeedSource,
    contractId: "",
    planningSlotId: "",
    siteId: "",
    profile: "agent" as StaffingProfile,
    headcount: 1,
    startDate: "",
    endDate: "",
    budgetEstimate: 0,
    clientName: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staffing-needs", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: StaffingNeed[];
        sources?: {
          contracts?: ContractOpt[];
          planningSlots?: SlotOpt[];
          sites?: SiteOpt[];
        };
        stats?: typeof stats;
        canEdit?: boolean;
        canValidateHierarchical?: boolean;
        canValidateBudget?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement");
      setItems(data.items ?? []);
      setContracts(data.sources?.contracts ?? []);
      setSlots(data.sources?.planningSlots ?? []);
      setSites(data.sources?.sites ?? []);
      setCanEdit(Boolean(data.canEdit));
      setCanHier(Boolean(data.canValidateHierarchical));
      setCanBudget(Boolean(data.canValidateBudget));
      if (data.stats) setStats(data.stats);
      setSelectedId((prev) => prev ?? data.items?.[0]?.id ?? null);
      setForm((f) => ({
        ...f,
        contractId: f.contractId || data.sources?.contracts?.[0]?.id || "",
        planningSlotId:
          f.planningSlotId || data.sources?.planningSlots?.[0]?.id || "",
        siteId: f.siteId || data.sources?.sites?.[0]?.id || "",
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
    () => items.find((n) => n.id === selectedId) ?? null,
    [items, selectedId],
  );

  const approval = useMemo(
    () => (selected ? staffingApprovalRequirements(selected) : null),
    [selected],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      if (statusFilter === "pending") {
        if (n.status !== "soumis" && n.status !== "en_validation") return false;
      } else if (statusFilter !== "all" && n.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        n.ref.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q) ||
        n.clientName.toLowerCase().includes(q) ||
        n.siteName.toLowerCase().includes(q) ||
        n.contractLabel.toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter]);

  const post = async (action: string, payload: Record<string, unknown>) => {
    if (busy) return null;
    if (busyLock.current) return null;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/staffing-needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as {
        item?: StaffingNeed;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      toast.success("Enregistré");
      await refresh();
      if (data.item?.id) setSelectedId(data.item.id);
      setNote("");
      return data.item ?? null;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      return null;
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  };

  const besoinReady = Boolean(form.title.trim()) && form.headcount >= 1;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    const contract = contracts.find((c) => c.id === form.contractId);
    const slot = slots.find((s) => s.id === form.planningSlotId);
    const site = sites.find((s) => s.id === form.siteId);
    const item = await post("create", {
      title: form.title,
      description: form.description || undefined,
      source: form.source,
      contractId:
        form.source === "contrat" || form.contractId
          ? form.contractId || undefined
          : undefined,
      planningSlotId:
        form.source === "planning" || form.planningSlotId
          ? form.planningSlotId || undefined
          : undefined,
      siteId: form.siteId || slot?.siteId || site?.id || undefined,
      siteName: site?.name || slot?.siteName || undefined,
      clientName:
        form.clientName ||
        contract?.clientName ||
        slot?.clientName ||
        site?.clientName ||
        undefined,
      profile: form.profile,
      headcount: form.headcount,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      budgetEstimate: form.budgetEstimate || undefined,
    });
    if (item) {
      setComposerOpen(false);
      setComposerStep("besoin");
      setForm((f) => ({
        ...f,
        title: "",
        description: "",
        headcount: 1,
        budgetEstimate: 0,
        startDate: "",
        endDate: "",
      }));
    }
  };

  return (
    <RhWorkspaceShell
      embedded={embedded}
      className="leads-page sn-page"
      tone="#0a3a72"
      badge="RH"
      eyebrow="Expression du besoin"
      icon={<IconInterview size={20} />}
      title="Expression du besoin"
      meta={
        <>
          <span>Agents issus des contrats et plannings</span>
          <span>
            {stats.pending} en validation · {stats.approved} approuvé
            {stats.approved > 1 ? "s" : ""}
          </span>
        </>
      }
      actions={
        <>
          {canEdit ? (
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={() => {
                setComposerStep("besoin");
                setComposerOpen(true);
              }}
            >
              Nouveau besoin
            </button>
          ) : null}
          <button
            type="button"
            className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        </>
      }
    >
      <div className="leads-kpis" role="group" aria-label="Indicateurs">
        <button
          type="button"
          className={`leads-kpi${statusFilter === "all" ? " is-active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <span>Total</span>
          <strong>{stats.total}</strong>
        </button>
        <button
          type="button"
          className={`leads-kpi${statusFilter === "pending" ? " is-active" : ""}`}
          onClick={() => setStatusFilter("pending")}
        >
          <span>En validation</span>
          <strong>{stats.pending}</strong>
        </button>
        <button
          type="button"
          className={`leads-kpi${statusFilter === "approuve" ? " is-active" : ""}`}
          onClick={() => setStatusFilter("approuve")}
          data-testid="sn-kpi-approved"
        >
          <span>Approuvés</span>
          <strong>{stats.approved}</strong>
        </button>
        <div className="leads-kpi">
          <span>Attente hiérarchique</span>
          <strong>{stats.awaitingHierarchical}</strong>
        </div>
        <div className="leads-kpi">
          <span>Attente budget</span>
          <strong>{stats.awaitingBudget}</strong>
        </div>
      </div>

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher réf, client, site…"
          />
        </label>
      </div>

      {loading ? (
        <div className="leads-empty">
          <span className="leads-empty__orb" aria-hidden />
          <p className="leads-empty__eyebrow">Besoin</p>
          <h2>Chargement…</h2>
        </div>
      ) : (
        <div className="leads-layout">
          <div className="leads-list" data-testid="sn-list">
            {filtered.length === 0 ? (
              <div className="leads-empty">
                <span className="leads-empty__orb" aria-hidden />
                <p className="leads-empty__eyebrow">Effectifs</p>
                <h2>Aucune expression de besoin</h2>
                <p>
                  Déclarez un besoin d’effectif issu des contrats ou du
                  planning, puis faites-le valider.
                </p>
                {canEdit ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    onClick={() => {
                      setComposerStep("besoin");
                      setComposerOpen(true);
                    }}
                  >
                    Nouveau besoin
                  </button>
                ) : null}
              </div>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={
                    selectedId === n.id ? "leads-card is-active" : "leads-card"
                  }
                  onClick={() => setSelectedId(n.id)}
                >
                  <div className="leads-card__top">
                    <strong>{n.title}</strong>
                    <span>{STAFFING_STATUS_LABELS[n.status]}</span>
                  </div>
                  <p>
                    {n.headcount}× {STAFFING_PROFILE_LABELS[n.profile]}
                    {n.clientName ? ` · ${n.clientName}` : ""}
                  </p>
                  <small>
                    {n.ref} · {STAFFING_SOURCE_LABELS[n.source]}
                    {n.siteName ? ` · ${n.siteName}` : ""}
                  </small>
                </button>
              ))
            )}
          </div>

          <aside className="leads-detail" data-testid="sn-detail">
            {!selected ? (
              <div className="leads-empty-detail">
                <p className="leads-empty__eyebrow">Détail</p>
                <h2>Sélectionnez une demande</h2>
                <p>
                  Validez l’effectif, la source (contrat / planning) et le
                  circuit hiérarchique + budget.
                </p>
              </div>
            ) : (
              <>
                <h3>{selected.title}</h3>
                <p className="muted">
                  {selected.ref} · {STAFFING_STATUS_LABELS[selected.status]}
                </p>
                <p>{selected.description || "Pas de description."}</p>

                <dl className="sn-dl">
                  <div>
                    <dt>Effectif</dt>
                    <dd>
                      {selected.headcount}×{" "}
                      {STAFFING_PROFILE_LABELS[selected.profile]}
                    </dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{STAFFING_SOURCE_LABELS[selected.source]}</dd>
                  </div>
                  {selected.contractLabel ? (
                    <div>
                      <dt>Contrat</dt>
                      <dd>
                        {selected.contractLabel}
                        {selected.contractStaffCount
                          ? ` (${selected.contractStaffCount} agents)`
                          : ""}
                      </dd>
                    </div>
                  ) : null}
                  {selected.planningLabel ? (
                    <div>
                      <dt>Planning</dt>
                      <dd>
                        {selected.planningLabel}
                        {selected.planningRequiredStaff
                          ? ` · requis ${selected.planningRequiredStaff}`
                          : ""}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Site</dt>
                    <dd>{selected.siteName || "—"}</dd>
                  </div>
                  <div>
                    <dt>Budget estimé</dt>
                    <dd>
                      {selected.budgetEstimate
                        ? `${selected.budgetEstimate.toLocaleString("fr-FR")} FCFA/mois`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Période</dt>
                    <dd>
                      {selected.startDate || "—"}
                      {selected.endDate ? ` → ${selected.endDate}` : ""}
                    </dd>
                  </div>
                </dl>

                <section
                  className="sn-validations"
                  data-testid="sn-validations"
                >
                  <h4>Validations</h4>
                  <ul>
                    <li className={selected.hierarchical.ok ? "ok" : ""}>
                      <strong>Hiérarchique</strong>
                      {selected.hierarchical.ok ? (
                        <span>
                          OK · {selected.hierarchical.byName}
                          {selected.hierarchical.at
                            ? ` · ${new Date(selected.hierarchical.at).toLocaleString("fr-FR")}`
                            : ""}
                        </span>
                      ) : (
                        <span>En attente</span>
                      )}
                    </li>
                    <li className={selected.budget.ok ? "ok" : ""}>
                      <strong>Budgétaire</strong>
                      {selected.budget.ok ? (
                        <span>
                          OK · {selected.budget.byName}
                          {selected.budget.at
                            ? ` · ${new Date(selected.budget.at).toLocaleString("fr-FR")}`
                            : ""}
                        </span>
                      ) : (
                        <span>
                          {selected.hierarchical.ok
                            ? "En attente"
                            : "Après hiérarchique"}
                        </span>
                      )}
                    </li>
                  </ul>
                  {approval ? (
                    <p
                      className={
                        approval.ok ? "sn-recipe ok" : "sn-recipe pending"
                      }
                      data-testid="sn-recipe"
                    >
                      {approval.ok
                        ? "Demande approuvée et traçable"
                        : `Recette : manque ${approval.missing.join(", ")}`}
                    </p>
                  ) : null}
                </section>

                {(selected.status === "soumis" ||
                  selected.status === "en_validation") &&
                (canHier || canBudget) ? (
                  <div className="sn-actions">
                    <label className="sn-note">
                      <span>Note de validation</span>
                      <textarea
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </label>
                    {canHier && !selected.hierarchical.ok ? (
                      <div className="sn-actions-row">
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          disabled={busy}
                          data-testid="sn-hier-ok"
                          onClick={() =>
                            void post("validate_hierarchical", {
                              id: selected.id,
                              approve: true,
                              note,
                            })
                          }
                        >
                          Valider hiérarchique
                        </button>
                        <button
                          type="button"
                          className="btn-admin"
                          disabled={busy}
                          onClick={() =>
                            void post("validate_hierarchical", {
                              id: selected.id,
                              approve: false,
                              note,
                            })
                          }
                        >
                          Refuser
                        </button>
                      </div>
                    ) : null}
                    {canBudget &&
                    selected.hierarchical.ok &&
                    !selected.budget.ok ? (
                      <div className="sn-actions-row">
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          disabled={busy}
                          data-testid="sn-budget-ok"
                          onClick={() =>
                            void post("validate_budget", {
                              id: selected.id,
                              approve: true,
                              note,
                            })
                          }
                        >
                          Valider budget
                        </button>
                        <button
                          type="button"
                          className="btn-admin"
                          disabled={busy}
                          onClick={() =>
                            void post("validate_budget", {
                              id: selected.id,
                              approve: false,
                              note,
                            })
                          }
                        >
                          Refuser budget
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {canEdit && selected.status === "brouillon" ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                    data-testid="sn-submit"
                    onClick={() =>
                      void post("submit", { id: selected.id })
                    }
                  >
                    Soumettre pour validation
                  </button>
                ) : null}

                {selected.status === "approuve" ? (
                  <p className="sn-approved" data-testid="sn-approved">
                    Approuvée le{" "}
                    {selected.approvedAt
                      ? new Date(selected.approvedAt).toLocaleString("fr-FR")
                      : "—"}{" "}
                    par {selected.approvedByName}
                  </p>
                ) : null}

                <section className="need-qual__history">
                  <h3>Journal (traçabilité)</h3>
                  <ol data-testid="sn-history">
                    {selected.history.map((h) => (
                      <li key={h.id}>
                        <time>
                          {new Date(h.at).toLocaleString("fr-FR")}
                        </time>
                        <strong>
                          {h.byName} ({h.byRole})
                        </strong>
                        <span>{h.detail}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            )}
          </aside>
        </div>
      )}

      {composerOpen ? (
        <AdminFormWizard
          open={composerOpen}
          onClose={() => {
            setComposerOpen(false);
            setComposerStep("besoin");
          }}
          titleId="sn-composer-title"
          eyebrow="RH"
          title="Exprimer un besoin en agents"
          lead="Formalisez un besoin issu d’un contrat ou d’un planning."
          steps={[
            { id: "besoin", label: "Besoin", hint: "Effectif & profil" },
            { id: "source", label: "Source", hint: "Contrat / planning" },
            { id: "revue", label: "Revue", hint: "Contrôle" },
          ]}
          stepId={composerStep}
          onStepChange={(id) =>
            setComposerStep(id as "besoin" | "source" | "revue")
          }
          canEnterStep={(id) => id === "besoin" || besoinReady}
          onStepBlocked={() => {
            setComposerShake(true);
            window.setTimeout(() => setComposerShake(false), 420);
          }}
          shake={composerShake}
          formId="sn-create-form"
          onSubmit={(e) => void onCreate(e)}
          submitLabel="Créer le brouillon"
          busy={busy}
          canSubmit={besoinReady}
        >
          {composerStep === "besoin" ? (
            <FwPanel aria-label="Besoin">
              <FwPanelHead
                title="Besoin"
                description="Nombre d’agents et profil recherché."
              />
              <FwGrid>
                <FwField label="Titre *" wide>
                  <input
                    required
                    autoFocus
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Effectif *">
                  <input
                    type="number"
                    min={1}
                    value={form.headcount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        headcount: Number(e.target.value),
                      }))
                    }
                  />
                </FwField>
                <FwField label="Budget mensuel (FCFA)">
                  <input
                    type="number"
                    min={0}
                    value={form.budgetEstimate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        budgetEstimate: Number(e.target.value),
                      }))
                    }
                  />
                </FwField>
                <FwField label="Début">
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startDate: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Fin">
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endDate: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Description" wide>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </FwField>
              </FwGrid>
              <FwBlock>
                <FwPanelHead title="Profil" />
                <FwChips>
                  {(Object.keys(STAFFING_PROFILE_LABELS) as StaffingProfile[]).map(
                    (p) => (
                      <FwChip
                        key={p}
                        selected={form.profile === p}
                        title={STAFFING_PROFILE_LABELS[p]}
                        onClick={() =>
                          setForm((f) => ({ ...f, profile: p }))
                        }
                      />
                    ),
                  )}
                </FwChips>
              </FwBlock>
            </FwPanel>
          ) : null}

          {composerStep === "source" ? (
            <FwPanel aria-label="Source">
              <FwPanelHead
                title="Origine du besoin"
                description="Contrats actifs et créneaux planning."
              />
              <FwBlock>
                <FwPanelHead title="Type de source" />
                <FwChips>
                  {(Object.keys(STAFFING_SOURCE_LABELS) as StaffingNeedSource[]).map(
                    (s) => (
                      <FwChip
                        key={s}
                        selected={form.source === s}
                        title={STAFFING_SOURCE_LABELS[s]}
                        onClick={() =>
                          setForm((f) => ({ ...f, source: s }))
                        }
                      />
                    ),
                  )}
                </FwChips>
              </FwBlock>
              <FwGrid>
                {form.source === "contrat" || form.source === "manuel" ? (
                  <FwField label="Contrat" wide>
                    <select
                      value={form.contractId}
                      onChange={(e) => {
                        const c = contracts.find((x) => x.id === e.target.value);
                        setForm((f) => ({
                          ...f,
                          contractId: e.target.value,
                          headcount: c?.staffCount || f.headcount,
                          clientName: c?.clientName || f.clientName,
                          siteId: c?.sites[0]?.id || f.siteId,
                        }));
                      }}
                    >
                      <option value="">— Aucun —</option>
                      {contracts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} ({c.staffCount} agents)
                        </option>
                      ))}
                    </select>
                  </FwField>
                ) : null}
                {form.source === "planning" || form.source === "manuel" ? (
                  <FwField label="Créneau planning" wide>
                    <select
                      value={form.planningSlotId}
                      onChange={(e) => {
                        const s = slots.find((x) => x.id === e.target.value);
                        setForm((f) => ({
                          ...f,
                          planningSlotId: e.target.value,
                          siteId: s?.siteId || f.siteId,
                          clientName: s?.clientName || f.clientName,
                          headcount: s
                            ? Math.max(
                                1,
                                s.requiredStaff - s.assigned,
                              )
                            : f.headcount,
                          contractId: s?.contractId || f.contractId,
                        }));
                      }}
                    >
                      <option value="">— Aucun —</option>
                      {slots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.understaffed ? "⚠ " : ""}
                          {s.label} ({s.assigned}/{s.requiredStaff})
                        </option>
                      ))}
                    </select>
                  </FwField>
                ) : null}
                <FwField label="Site" wide>
                  <select
                    value={form.siteId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, siteId: e.target.value }))
                    }
                  >
                    <option value="">— Aucun —</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FwField>
              </FwGrid>
            </FwPanel>
          ) : null}

          {composerStep === "revue" ? (
            <FwPanel aria-label="Revue">
              <FwPanelHead
                title="Revue"
                description="Brouillon soumis ensuite aux validations."
              />
              <FwReview>
                <FwReviewCard
                  title="Besoin"
                  rows={[
                    { label: "Titre", value: form.title || "—" },
                    {
                      label: "Effectif",
                      value: `${form.headcount}× ${STAFFING_PROFILE_LABELS[form.profile]}`,
                    },
                    {
                      label: "Budget",
                      value: form.budgetEstimate
                        ? `${form.budgetEstimate.toLocaleString("fr-FR")} FCFA`
                        : "—",
                    },
                  ]}
                />
                <FwReviewCard
                  title="Source"
                  rows={[
                    {
                      label: "Type",
                      value: STAFFING_SOURCE_LABELS[form.source],
                    },
                    {
                      label: "Contrat",
                      value:
                        contracts.find((c) => c.id === form.contractId)
                          ?.label || "—",
                    },
                    {
                      label: "Planning",
                      value:
                        slots.find((s) => s.id === form.planningSlotId)
                          ?.label || "—",
                    },
                  ]}
                />
              </FwReview>
            </FwPanel>
          ) : null}
        </AdminFormWizard>
      ) : null}

      <style jsx>{`
        .sn-dl {
          display: grid;
          gap: 0.5rem;
          margin: 1rem 0;
        }
        .sn-dl div {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }
        .sn-dl dt {
          opacity: 0.65;
        }
        .sn-validations ul {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0;
          display: grid;
          gap: 0.5rem;
        }
        .sn-validations li {
          display: grid;
          gap: 0.15rem;
          padding: 0.5rem 0.65rem;
          border-radius: 8px;
          background: color-mix(in srgb, currentColor 6%, transparent);
        }
        .sn-validations li.ok {
          background: color-mix(in srgb, #15803d 12%, transparent);
        }
        .sn-recipe {
          font-size: 0.85rem;
          margin-top: 0.5rem;
        }
        .sn-recipe.ok {
          color: #15803d;
        }
        .sn-recipe.pending {
          opacity: 0.75;
        }
        .sn-actions {
          margin: 1rem 0;
          display: grid;
          gap: 0.75rem;
        }
        .sn-actions-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .sn-note {
          display: grid;
          gap: 0.35rem;
          font-size: 0.85rem;
        }
        .sn-note textarea {
          width: 100%;
          min-height: 3.5rem;
        }
        .sn-approved {
          color: #15803d;
          font-weight: 600;
        }
      `}</style>
    </RhWorkspaceShell>
  );
}
