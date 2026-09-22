"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { IconAmend, IconSearch } from "@/components/admin/Icons";
import {
  CONTRACT_AMENDMENT_MOD_LABELS,
  CONTRACT_SLA_LABELS,
  CONTRACT_STATUS_LABELS,
  formatContractFcfa,
  makePrestationLine,
  makeTariffLine,
  type Contract,
  type ContractAmendment,
  type ContractAmendmentModType,
  type ContractPrestationLine,
  type ContractSla,
  type ContractTariffLine,
} from "@/lib/contracts-shared";
import { toast } from "@/lib/toast";

type FlatAmendment = ContractAmendment & {
  contractId: string;
  company: string;
  contractStatus: Contract["status"];
};

function formatWhen(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts.length <= 10 ? `${ts}T12:00:00` : ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ContractAmendmentsWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [filter, setFilter] = useState<"all" | ContractAmendmentModType>("all");
  const [query, setQuery] = useState("");
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null,
  );
  const [selectedAmendId, setSelectedAmendId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const [reason, setReason] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(today);
  const [modType, setModType] = useState<ContractAmendmentModType>("mixte");
  const [impact, setImpact] = useState("");
  const [perimeter, setPerimeter] = useState("");
  const [sla, setSla] = useState<ContractSla>("standard");
  const [durationMonths, setDurationMonths] = useState("12");
  const [endAt, setEndAt] = useState("");
  const [staffCount, setStaffCount] = useState("0");
  const [tariffLabel, setTariffLabel] = useState("");
  const [tariffPrice, setTariffPrice] = useState("");
  const [prestaLabel, setPrestaLabel] = useState("");
  const [prestaFreq, setPrestaFreq] = useState("");
  const [prestaStaff, setPrestaStaff] = useState("0");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contracts", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: Contract[];
        canManage?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items || []);
      setCanManage(Boolean(data.canManage));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeContracts = useMemo(
    () => items.filter((c) => c.status === "actif"),
    [items],
  );

  const flatAmendments = useMemo(() => {
    const rows: FlatAmendment[] = [];
    for (const c of items) {
      for (const a of c.amendments) {
        rows.push({
          ...a,
          contractId: c.id,
          company: c.company,
          contractStatus: c.status,
        });
      }
    }
    return rows.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flatAmendments.filter((a) => {
      if (filter !== "all" && a.modificationType !== filter) return false;
      if (!q) return true;
      return (
        a.contractRef.toLowerCase().includes(q) ||
        a.company.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q) ||
        a.changes.toLowerCase().includes(q) ||
        `n°${a.number}`.includes(q)
      );
    });
  }, [flatAmendments, query, filter]);

  const kpis = useMemo(() => {
    const tarifaires = flatAmendments.filter(
      (a) => a.modificationType === "tarif",
    ).length;
    const perimetre = flatAmendments.filter(
      (a) => a.modificationType === "perimetre",
    ).length;
    const mixte = flatAmendments.filter(
      (a) => a.modificationType === "mixte",
    ).length;
    return {
      total: flatAmendments.length,
      actifs: activeContracts.length,
      tarifaires,
      perimetre,
      mixte,
    };
  }, [flatAmendments, activeContracts.length]);

  const selectedContract = useMemo(
    () => items.find((c) => c.id === selectedContractId) || null,
    [items, selectedContractId],
  );

  const selectedAmend = useMemo(() => {
    if (selectedAmendId) {
      return flatAmendments.find((a) => a.id === selectedAmendId) || null;
    }
    if (selectedContract?.amendments[0]) {
      const a = selectedContract.amendments[0];
      return {
        ...a,
        contractId: selectedContract.id,
        company: selectedContract.company,
        contractStatus: selectedContract.status,
      } satisfies FlatAmendment;
    }
    return filtered[0] || null;
  }, [selectedAmendId, selectedContract, flatAmendments, filtered]);

  useEffect(() => {
    if (selectedAmend && !selectedContractId) {
      setSelectedContractId(selectedAmend.contractId);
    }
  }, [selectedAmend, selectedContractId]);

  function openComposer(contract: Contract) {
    setSelectedContractId(contract.id);
    setReason("");
    setEffectiveAt(today());
    setModType("mixte");
    setImpact("");
    setPerimeter(contract.perimeter);
    setSla(contract.sla);
    setDurationMonths(String(contract.durationMonths));
    setEndAt(contract.endAt ? contract.endAt.slice(0, 10) : "");
    setStaffCount(String(contract.staffCount));
    setTariffLabel(contract.tariffs[0]?.label || "Prestation mensuelle");
    setTariffPrice(
      contract.tariffs[0] ? String(contract.tariffs[0].unitPrice) : "",
    );
    setPrestaLabel(contract.prestations[0]?.label || "");
    setPrestaFreq(contract.prestations[0]?.frequency || contract.frequency || "");
    setPrestaStaff(
      String(contract.prestations[0]?.staffAssigned || contract.staffCount || 0),
    );
    setComposerOpen(true);
  }

  async function submitAmend(e: FormEvent) {
    e.preventDefault();
    if (!selectedContract) return;
    if (!reason.trim()) {
      toast.error("Motif obligatoire");
      return;
    }

    const body: Record<string, unknown> = {
      action: "amend",
      id: selectedContract.id,
      reason,
      effectiveAt,
      modificationType: modType,
      impactFinancial: impact === "" ? undefined : Number(impact) || 0,
      perimeter,
      sla,
      durationMonths: Number(durationMonths) || selectedContract.durationMonths,
      endAt: endAt || null,
      staffCount: Number(staffCount) || 0,
    };

    if (modType === "tarif" || modType === "mixte") {
      const price = Number(tariffPrice);
      if (Number.isFinite(price) && tariffLabel.trim()) {
        const tariffs: Partial<ContractTariffLine>[] =
          selectedContract.tariffs.length > 0
            ? selectedContract.tariffs.map((t, i) =>
                i === 0
                  ? makeTariffLine({
                      ...t,
                      label: tariffLabel,
                      unitPrice: price,
                      quantity: t.quantity || 1,
                      unit: t.unit || "mois",
                      period: t.period || "mensuel",
                    })
                  : t,
              )
            : [
                makeTariffLine({
                  label: tariffLabel,
                  unit: "mois",
                  quantity: 1,
                  unitPrice: price,
                  period: "mensuel",
                }),
              ];
        body.tariffs = tariffs;
      }
    }

    if (modType === "prestations" || modType === "mixte") {
      if (prestaLabel.trim()) {
        const prestations: Partial<ContractPrestationLine>[] = [
          makePrestationLine({
            label: prestaLabel,
            frequency: prestaFreq,
            staffAssigned: Number(prestaStaff) || 0,
            siteName: selectedContract.sites[0]?.name || "",
          }),
          ...selectedContract.prestations.slice(1),
        ];
        body.prestations = prestations;
      }
    }

    setBusy(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { item?: Contract; error?: string };
      if (!res.ok) throw new Error(data.error || "Avenant impossible");
      if (data.item) {
        setItems((prev) =>
          prev.map((c) => (c.id === data.item!.id ? data.item! : c)),
        );
        setSelectedAmendId(data.item.amendments[0]?.id || null);
        toast.success(`Avenant n°${String(data.item.amendments[0]?.number || "").padStart(2, "0")} enregistré`);
        setComposerOpen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const versionHistory = useMemo(() => {
    if (!selectedContract) return [];
    const versions: Array<{
      key: string;
      label: string;
      at: string;
      detail: string;
      kind: "initial" | "avenant";
    }> = [
      {
        key: "v0",
        label: "V0 — Contrat initial",
        at: selectedContract.activatedAt || selectedContract.createdAt,
        detail: `${selectedContract.ref} · ${formatContractFcfa(selectedContract.monthlyAmount)}/mois · ${selectedContract.staffCount} agent(s)`,
        kind: "initial",
      },
    ];
    const chronological = [...selectedContract.amendments].sort(
      (a, b) => a.number - b.number,
    );
    for (const a of chronological) {
      versions.push({
        key: a.id,
        label: `V${a.number} — Avenant n°${String(a.number).padStart(2, "0")}`,
        at: a.at,
        detail: `${CONTRACT_AMENDMENT_MOD_LABELS[a.modificationType]} · ${a.changes}${
          a.impactFinancial
            ? ` · impact ${a.impactFinancial > 0 ? "+" : ""}${formatContractFcfa(a.impactFinancial)}`
            : ""
        }`,
        kind: "avenant",
      });
    }
    return versions.reverse();
  }, [selectedContract]);

  return (
    <div
      className={`leads-page avn-page${embedded ? " avn-page--embedded" : ""}`}
      data-testid="contract-amendments"
    >
      {embedded ? (
        <div className="fin-embedded-bar avn-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">Direction</p>
            <h2>Avenant au contrat client</h2>
            <p>
              Contrat initial, type de modification, date d’effet, impact
              financier et historique de versions
            </p>
          </div>
          <div className="leads-header-actions">
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => void load()}
              disabled={loading}
            >
              Actualiser
            </button>
            {canManage && activeContracts.length > 0 ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => openComposer(activeContracts[0]!)}
              >
                Nouvel avenant
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <header className="leads-page__head">
          <div>
            <p className="leads-page__eyebrow">Direction</p>
            <h1>Avenant au contrat client</h1>
            <p>
              Contrat initial, type de modification, date d’effet, impact
              financier et historique de versions
            </p>
          </div>
          <div className="leads-header-actions">
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => void load()}
              disabled={loading}
            >
              Actualiser
            </button>
            {canManage && activeContracts.length > 0 ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => openComposer(activeContracts[0]!)}
              >
                Nouvel avenant
              </button>
            ) : null}
          </div>
        </header>
      )}

      <section className="leads-kpis" aria-label="Indicateurs avenants">
        <article className="leads-kpi">
          <p>Avenants</p>
          <strong>{kpis.total}</strong>
          <span>enregistrés</span>
        </article>
        <article className="leads-kpi">
          <p>Contrats actifs</p>
          <strong>{kpis.actifs}</strong>
          <span>modifiables</span>
        </article>
        <article className="leads-kpi">
          <p>Tarifaires</p>
          <strong>{kpis.tarifaires}</strong>
          <span>révisions prix</span>
        </article>
        <article className="leads-kpi">
          <p>Périmètre</p>
          <strong>{kpis.perimetre}</strong>
          <span>extensions</span>
        </article>
        <article className="leads-kpi leads-kpi--accent">
          <p>Mixtes</p>
          <strong>{kpis.mixte}</strong>
          <span>plusieurs axes</span>
        </article>
      </section>

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Contrat, client, motif…"
            aria-label="Rechercher"
          />
        </label>
        <div className="leads-filters" role="tablist" aria-label="Filtres">
          {(
            [
              ["all", "Tous"],
              ["perimetre", "Périmètre"],
              ["tarif", "Tarif"],
              ["duree", "Durée"],
              ["effectifs", "Effectifs"],
              ["prestations", "Prestations"],
              ["mixte", "Mixte"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={filter === k}
              className={`leads-chip${filter === k ? " is-active" : ""}`}
              onClick={() => setFilter(k)}
            >
              {label}
            </button>
          ))}
        </div>
        {canManage && activeContracts.length > 0 ? (
          <select
            className="avn-contract-pick"
            defaultValue=""
            aria-label="Choisir un contrat pour nouvel avenant"
            onChange={(e) => {
              const c = activeContracts.find((x) => x.id === e.target.value);
              if (c) openComposer(c);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Nouvel avenant sur…
            </option>
            {activeContracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ref} — {c.company}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="leads-layout">
        <div className="leads-list" role="listbox" aria-label="Liste avenants">
          {loading && flatAmendments.length === 0 ? (
            <div className="leads-empty">
              <h2>Chargement…</h2>
            </div>
          ) : filtered.length === 0 ? (
            <div className="leads-empty">
              <IconAmend size={28} />
              <h2>Aucun avenant</h2>
              <p>
                {activeContracts.length === 0
                  ? "Activez d’abord un contrat de prestation."
                  : "Créez un avenant depuis un contrat actif."}
              </p>
              {canManage && activeContracts.length > 0 ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={() => openComposer(activeContracts[0]!)}
                >
                  Nouvel avenant
                </button>
              ) : null}
            </div>
          ) : (
            filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={selectedAmend?.id === a.id}
                className={`leads-card avn-card${selectedAmend?.id === a.id ? " is-active" : ""}`}
                onClick={() => {
                  setSelectedAmendId(a.id);
                  setSelectedContractId(a.contractId);
                }}
              >
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{a.company}</strong>
                    <time>{formatWhen(a.effectiveAt)}</time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-pill">
                      AVN-{String(a.number).padStart(2, "0")}
                    </span>
                    <span className="avn-mod-pill">
                      {CONTRACT_AMENDMENT_MOD_LABELS[a.modificationType]}
                    </span>
                  </span>
                  <span className="leads-card__preview">
                    {a.contractRef}
                    {a.impactFinancial
                      ? ` · ${a.impactFinancial > 0 ? "+" : ""}${formatContractFcfa(a.impactFinancial)}`
                      : ""}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail contracts-detail avn-detail">
          {!selectedAmend || !selectedContract ? (
            <div className="leads-empty-detail">
              <IconAmend size={28} />
              <h2>Sélectionnez un avenant</h2>
              <p>Détail, snapshot avant modification et historique de versions.</p>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    <span className="avn-mod-pill">
                      {
                        CONTRACT_AMENDMENT_MOD_LABELS[
                          selectedAmend.modificationType
                        ]
                      }
                    </span>
                    <span>
                      AVN-{String(selectedAmend.number).padStart(2, "0")}
                    </span>
                  </p>
                  <h2>{selectedAmend.company}</h2>
                  <p className="leads-detail__sub">
                    Contrat {selectedAmend.contractRef} · effet{" "}
                    {formatWhen(selectedAmend.effectiveAt)} ·{" "}
                    {CONTRACT_STATUS_LABELS[selectedContract.status]}
                  </p>
                </div>
                <div className="leads-detail__actions">
                  {canManage && selectedContract.status === "actif" ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      onClick={() => openComposer(selectedContract)}
                    >
                      Nouvel avenant
                    </button>
                  ) : null}
                  <a
                    className="btn-admin btn-admin--ghost"
                    href="/galerie/templates/TMP-06-avenant-contrat.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Modèle avenant
                  </a>
                </div>
              </header>

              <section className="fin-section contracts-section">
                <h3>Référence & modification</h3>
                <dl className="fin-dl">
                  <div>
                    <dt>Contrat initial</dt>
                    <dd>{selectedAmend.contractRef}</dd>
                  </div>
                  <div>
                    <dt>N° avenant</dt>
                    <dd>{String(selectedAmend.number).padStart(2, "0")}</dd>
                  </div>
                  <div>
                    <dt>Date d’effet</dt>
                    <dd>{formatWhen(selectedAmend.effectiveAt)}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>
                      {
                        CONTRACT_AMENDMENT_MOD_LABELS[
                          selectedAmend.modificationType
                        ]
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Impact financier HT</dt>
                    <dd>
                      {selectedAmend.impactFinancial
                        ? `${selectedAmend.impactFinancial > 0 ? "+" : ""}${formatContractFcfa(selectedAmend.impactFinancial)}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Auteur</dt>
                    <dd>{selectedAmend.byName}</dd>
                  </div>
                </dl>
                <div className="fin-composer__grid" style={{ marginTop: "0.75rem" }}>
                  <label className="fin-composer__full">
                    <span>Description / motif</span>
                    <textarea disabled rows={2} value={selectedAmend.reason} />
                  </label>
                  <label className="fin-composer__full">
                    <span>Changements appliqués</span>
                    <textarea disabled rows={2} value={selectedAmend.changes} />
                  </label>
                </div>
              </section>

              <section className="fin-section contracts-section">
                <h3>État avant avenant (snapshot)</h3>
                <dl className="fin-dl">
                  <div>
                    <dt>Mensuel</dt>
                    <dd>
                      {formatContractFcfa(selectedAmend.snapshot.monthlyAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt>Effectif</dt>
                    <dd>{selectedAmend.snapshot.staffCount}</dd>
                  </div>
                  <div>
                    <dt>Durée</dt>
                    <dd>{selectedAmend.snapshot.durationMonths} mois</dd>
                  </div>
                  <div>
                    <dt>SLA</dt>
                    <dd>
                      {CONTRACT_SLA_LABELS[selectedAmend.snapshot.sla]}
                    </dd>
                  </div>
                  <div>
                    <dt>Sites / prestations</dt>
                    <dd>
                      {selectedAmend.snapshot.sites.length} site(s) ·{" "}
                      {selectedAmend.snapshot.prestations.length} prestation(s)
                    </dd>
                  </div>
                </dl>
                {selectedAmend.snapshot.perimeter ? (
                  <p className="leads-detail__sub" style={{ marginTop: "0.5rem" }}>
                    Périmètre : {selectedAmend.snapshot.perimeter}
                  </p>
                ) : null}
              </section>

              <section className="fin-section contracts-section">
                <h3>Historique des versions</h3>
                <ol className="avn-versions">
                  {versionHistory.map((v) => (
                    <li
                      key={v.key}
                      className={
                        v.kind === "avenant" && v.key === selectedAmend.id
                          ? "is-current"
                          : undefined
                      }
                    >
                      <strong>{v.label}</strong>
                      <time>{formatWhen(v.at)}</time>
                      <span>{v.detail}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="fin-section contracts-section">
                <h3>État actuel du contrat</h3>
                <p className="leads-detail__sub">
                  {formatContractFcfa(selectedContract.monthlyAmount)}/mois ·{" "}
                  {selectedContract.staffCount} agent(s) ·{" "}
                  {selectedContract.durationMonths} mois ·{" "}
                  {CONTRACT_SLA_LABELS[selectedContract.sla]} · fin{" "}
                  {formatWhen(selectedContract.endAt)}
                </p>
              </section>
            </>
          )}
        </article>
      </div>

      {composerOpen && selectedContract ? (
        <AdminOverlayPortal>
          <div
            className="doc-overlay-backdrop"
            role="presentation"
            onClick={() => setComposerOpen(false)}
          >
            <div
              className="doc-overlay-dialog fin-composer-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="avn-create-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="doc-overlay-header">
                <div className="doc-overlay-header__left">
                  <p className="doc-overlay-header__tag">Avenant</p>
                  <h2 id="avn-create-title">
                    Nouvel avenant — {selectedContract.ref}
                  </h2>
                </div>
                <button
                  type="button"
                  className="doc-overlay-close-btn"
                  onClick={() => setComposerOpen(false)}
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              <form
                id="avn-create-form"
                className="doc-overlay-body fin-composer"
                onSubmit={(e) => void submitAmend(e)}
              >
                <p className="fin-composer__issuer">
                  Client : <strong>{selectedContract.company}</strong>
                </p>

                <fieldset className="fin-composer__section">
                  <legend>Références</legend>
                  <div className="fin-composer__grid">
                    <label>
                      <span>Contrat initial</span>
                      <input disabled value={selectedContract.ref} />
                    </label>
                    <label>
                      <span>Prochain n°</span>
                      <input
                        disabled
                        value={String(
                          (selectedContract.amendments.reduce(
                            (m, a) => Math.max(m, a.number),
                            0,
                          ) || 0) + 1,
                        ).padStart(2, "0")}
                      />
                    </label>
                    <label>
                      <span>Date d’effet</span>
                      <input
                        type="date"
                        value={effectiveAt}
                        onChange={(e) => setEffectiveAt(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Type de modification</span>
                      <select
                        value={modType}
                        onChange={(e) =>
                          setModType(e.target.value as ContractAmendmentModType)
                        }
                      >
                        {Object.entries(CONTRACT_AMENDMENT_MOD_LABELS).map(
                          ([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="fin-composer__full">
                      <span>Motif / description *</span>
                      <textarea
                        required
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ex. Extension surface + révision tarifaire"
                      />
                    </label>
                    <label>
                      <span>Impact financier HT (optionnel)</span>
                      <input
                        type="number"
                        value={impact}
                        onChange={(e) => setImpact(e.target.value)}
                        placeholder="Delta mensuel"
                      />
                    </label>
                  </div>
                </fieldset>

                {modType === "perimetre" || modType === "mixte" ? (
                  <fieldset className="fin-composer__section">
                    <legend>Périmètre</legend>
                    <div className="fin-composer__grid">
                      <label className="fin-composer__full">
                        <span>Nouveau périmètre</span>
                        <textarea
                          rows={2}
                          value={perimeter}
                          onChange={(e) => setPerimeter(e.target.value)}
                        />
                      </label>
                    </div>
                  </fieldset>
                ) : null}

                {modType === "tarif" || modType === "mixte" ? (
                  <fieldset className="fin-composer__section">
                    <legend>Tarif</legend>
                    <div className="fin-composer__grid">
                      <label className="fin-composer__full">
                        <span>Libellé ligne principale</span>
                        <input
                          value={tariffLabel}
                          onChange={(e) => setTariffLabel(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Nouveau PU mensuel HT</span>
                        <input
                          type="number"
                          min={0}
                          value={tariffPrice}
                          onChange={(e) => setTariffPrice(e.target.value)}
                        />
                      </label>
                    </div>
                  </fieldset>
                ) : null}

                {modType === "duree" || modType === "mixte" ? (
                  <fieldset className="fin-composer__section">
                    <legend>Durée</legend>
                    <div className="fin-composer__grid">
                      <label>
                        <span>Durée (mois)</span>
                        <input
                          type="number"
                          min={1}
                          value={durationMonths}
                          onChange={(e) => setDurationMonths(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Nouvelle fin</span>
                        <input
                          type="date"
                          value={endAt}
                          onChange={(e) => setEndAt(e.target.value)}
                        />
                      </label>
                    </div>
                  </fieldset>
                ) : null}

                {modType === "effectifs" || modType === "mixte" ? (
                  <fieldset className="fin-composer__section">
                    <legend>Effectifs</legend>
                    <div className="fin-composer__grid">
                      <label>
                        <span>Effectif contractuel</span>
                        <input
                          type="number"
                          min={0}
                          value={staffCount}
                          onChange={(e) => setStaffCount(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>SLA</span>
                        <select
                          value={sla}
                          onChange={(e) =>
                            setSla(e.target.value as ContractSla)
                          }
                        >
                          {Object.entries(CONTRACT_SLA_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </fieldset>
                ) : null}

                {modType === "prestations" || modType === "mixte" ? (
                  <fieldset className="fin-composer__section">
                    <legend>Prestations</legend>
                    <div className="fin-composer__grid">
                      <label className="fin-composer__full">
                        <span>Prestation principale</span>
                        <input
                          value={prestaLabel}
                          onChange={(e) => setPrestaLabel(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Fréquence</span>
                        <input
                          value={prestaFreq}
                          onChange={(e) => setPrestaFreq(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Effectif affecté</span>
                        <input
                          type="number"
                          min={0}
                          value={prestaStaff}
                          onChange={(e) => setPrestaStaff(e.target.value)}
                        />
                      </label>
                    </div>
                  </fieldset>
                ) : null}
              </form>
              <footer className="doc-overlay-footer">
                <p className="doc-overlay-footer__hint">
                  L’avenant s’applique immédiatement au contrat actif (snapshot
                  conservé).
                </p>
                <div className="doc-overlay-footer__actions">
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() => setComposerOpen(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    form="avn-create-form"
                    className="btn-admin btn-admin--primary"
                    disabled={busy || !reason.trim()}
                  >
                    {busy ? "Enregistrement…" : "Enregistrer l’avenant"}
                  </button>
                </div>
              </footer>
            </div>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </div>
  );
}
