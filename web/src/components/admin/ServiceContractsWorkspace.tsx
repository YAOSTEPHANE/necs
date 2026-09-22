"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import { IconContract, IconSearch } from "@/components/admin/Icons";
import {
  CONTRACT_RENEWAL_LABELS,
  CONTRACT_SIGNATURE_ROLE_LABELS,
  CONTRACT_SLA_LABELS,
  CONTRACT_STATUS_LABELS,
  DEFAULT_CONTRACT_BILLING,
  DEFAULT_CONTRACT_DEPOSIT,
  DEFAULT_CONTRACT_INDEXATION,
  DEFAULT_CONTRACT_OBJECT,
  DEFAULT_CONTRACT_OBLIGATIONS,
  DEFAULT_CONTRACT_PENALTIES,
  DEFAULT_CONTRACT_TERMINATION,
  DEFAULT_CONTRACT_VERSION,
  DEFAULT_NECS_REP_NAME,
  DEFAULT_NECS_REP_TITLE,
  DEFAULT_SIGNATURE_PLACE,
  contractDraftEditable,
  contractFullySigned,
  formatContractFcfa,
  makePrestationLine,
  makeTariffLine,
  serviceContractReady,
  type Contract,
  type ContractPrestationLine,
  type ContractRenewal,
  type ContractSignatureRole,
  type ContractSite,
  type ContractSla,
  type ContractStatus,
  type ContractTariffLine,
} from "@/lib/contracts-shared";
import { toast } from "@/lib/toast";

type EligibleWon = {
  id: string;
  company: string;
  valueEstimate: number;
  title?: string;
};

type DraftSite = {
  id: string;
  name: string;
  address: string;
  city: string;
  surfaceM2: string;
  consignes: string;
};

type DraftTariff = {
  id: string;
  label: string;
  unit: string;
  quantity: string;
  unitPrice: string;
};

type DraftPrestation = {
  id: string;
  label: string;
  frequency: string;
  staffAssigned: string;
  siteName: string;
};

function emptySite(): DraftSite {
  return {
    id: `ST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name: "",
    address: "",
    city: "",
    surfaceM2: "",
    consignes: "",
  };
}

function emptyTariff(): DraftTariff {
  return {
    id: makeTariffLine({
      label: "x",
      unit: "mois",
      quantity: 1,
      unitPrice: 0,
      period: "mensuel",
    }).id,
    label: "",
    unit: "mois",
    quantity: "1",
    unitPrice: "",
  };
}

function emptyPrestation(): DraftPrestation {
  return {
    id: makePrestationLine({ label: "x" }).id,
    label: "",
    frequency: "",
    staffAssigned: "0",
    siteName: "",
  };
}

function sitesFromDraft(rows: DraftSite[]): Partial<ContractSite>[] {
  return rows
    .filter((r) => r.name.trim() || r.address.trim())
    .map((r) => ({
      id: r.id,
      name: r.name.trim() || "Site",
      address: r.address.trim(),
      city: r.city.trim(),
      surfaceM2: r.surfaceM2 === "" ? null : Number(r.surfaceM2) || null,
      active: true,
      consignes: r.consignes.trim(),
    }));
}

function tariffsFromDraft(rows: DraftTariff[]): Partial<ContractTariffLine>[] {
  return rows
    .filter((r) => r.label.trim())
    .map((r) =>
      makeTariffLine({
        id: r.id,
        label: r.label,
        unit: r.unit || "u",
        quantity: Number(r.quantity) || 0,
        unitPrice: Number(r.unitPrice) || 0,
        period: "mensuel",
      }),
    );
}

function prestationsFromDraft(
  rows: DraftPrestation[],
): Partial<ContractPrestationLine>[] {
  return rows
    .filter((r) => r.label.trim())
    .map((r) =>
      makePrestationLine({
        id: r.id,
        label: r.label,
        frequency: r.frequency,
        staffAssigned: Number(r.staffAssigned) || 0,
        siteName: r.siteName,
      }),
    );
}

function draftSitesFromContract(c: Contract): DraftSite[] {
  if (!c.sites.length) return [emptySite()];
  return c.sites.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    city: s.city,
    surfaceM2: s.surfaceM2 == null ? "" : String(s.surfaceM2),
    consignes: s.consignes,
  }));
}

function draftTariffsFromContract(c: Contract): DraftTariff[] {
  if (!c.tariffs.length) return [emptyTariff()];
  return c.tariffs.map((t) => ({
    id: t.id,
    label: t.label,
    unit: t.unit,
    quantity: String(t.quantity),
    unitPrice: String(t.unitPrice),
  }));
}

function draftPrestationsFromContract(c: Contract): DraftPrestation[] {
  if (!c.prestations.length) return [emptyPrestation()];
  return c.prestations.map((p) => ({
    id: p.id,
    label: p.label,
    frequency: p.frequency,
    staffAssigned: String(p.staffAssigned),
    siteName: p.siteName,
  }));
}

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

export function ServiceContractsWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<Contract[]>([]);
  const [wonEligible, setWonEligible] = useState<EligibleWon[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ContractStatus | "a-signer">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [clientRccm, setClientRccm] = useState("");
  const [clientRepName, setClientRepName] = useState("");
  const [clientRepTitle, setClientRepTitle] = useState("");
  const [necsRepName, setNecsRepName] = useState(DEFAULT_NECS_REP_NAME);
  const [necsRepTitle, setNecsRepTitle] = useState(DEFAULT_NECS_REP_TITLE);
  const [object, setObject] = useState(DEFAULT_CONTRACT_OBJECT);
  const [perimeter, setPerimeter] = useState("");
  const [obligations, setObligations] = useState(DEFAULT_CONTRACT_OBLIGATIONS);
  const [pricingTerms, setPricingTerms] = useState("");
  const [billingTerms, setBillingTerms] = useState(DEFAULT_CONTRACT_BILLING);
  const [terminationTerms, setTerminationTerms] = useState(
    DEFAULT_CONTRACT_TERMINATION,
  );
  const [bcRef, setBcRef] = useState("");
  const [contractVersion, setContractVersion] = useState(
    DEFAULT_CONTRACT_VERSION,
  );
  const [signaturePlace, setSignaturePlace] = useState(DEFAULT_SIGNATURE_PLACE);
  const [indexation, setIndexation] = useState(DEFAULT_CONTRACT_INDEXATION);
  const [deposit, setDeposit] = useState(DEFAULT_CONTRACT_DEPOSIT);
  const [penalties, setPenalties] = useState(DEFAULT_CONTRACT_PENALTIES);
  const [sla, setSla] = useState<ContractSla>("standard");
  const [startAt, setStartAt] = useState(today);
  const [durationMonths, setDurationMonths] = useState("12");
  const [renewal, setRenewal] = useState<ContractRenewal>("tacite");
  const [staffCount, setStaffCount] = useState("0");
  const [frequency, setFrequency] = useState("");
  const [note, setNote] = useState("");
  const [draftSites, setDraftSites] = useState<DraftSite[]>([emptySite()]);
  const [draftTariffs, setDraftTariffs] = useState<DraftTariff[]>([
    emptyTariff(),
  ]);
  const [draftPrestations, setDraftPrestations] = useState<DraftPrestation[]>([
    emptyPrestation(),
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, eligRes] = await Promise.all([
        fetch("/api/contracts", { cache: "no-store" }),
        fetch("/api/contracts?eligible=1", { cache: "no-store" }),
      ]);
      const data = (await res.json()) as {
        items?: Contract[];
        canManage?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items || []);
      setCanManage(Boolean(data.canManage));
      if (eligRes.ok) {
        const elig = (await eligRes.json()) as { items?: EligibleWon[] };
        setWonEligible(elig.items || []);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => items.find((c) => c.id === selectedId) || null,
    [items, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (filter === "a-signer") {
        if (c.signatures.every((s) => s.signed)) return false;
      } else if (filter !== "all" && c.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        c.ref.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.object.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  const kpis = useMemo(() => {
    const actifs = items.filter((c) => c.status === "actif").length;
    const brouillons = items.filter((c) => c.status === "brouillon").length;
    const enRevue = items.filter((c) => c.status === "en_revue").length;
    const aSigner = items.filter(
      (c) =>
        (c.status === "brouillon" || c.status === "en_revue") &&
        c.signatures.some((s) => !s.signed),
    ).length;
    const mrr = items
      .filter((c) => c.status === "actif")
      .reduce((s, c) => s + c.monthlyAmount, 0);
    return { actifs, brouillons, enRevue, aSigner, mrr };
  }, [items]);

  function resetComposer() {
    setCompany("");
    setContactName("");
    setContactEmail("");
    setClientRccm("");
    setClientRepName("");
    setClientRepTitle("");
    setNecsRepName(DEFAULT_NECS_REP_NAME);
    setNecsRepTitle(DEFAULT_NECS_REP_TITLE);
    setObject(DEFAULT_CONTRACT_OBJECT);
    setPerimeter("");
    setObligations(DEFAULT_CONTRACT_OBLIGATIONS);
    setPricingTerms("");
    setBillingTerms(DEFAULT_CONTRACT_BILLING);
    setTerminationTerms(DEFAULT_CONTRACT_TERMINATION);
    setBcRef("");
    setContractVersion(DEFAULT_CONTRACT_VERSION);
    setSignaturePlace(DEFAULT_SIGNATURE_PLACE);
    setIndexation(DEFAULT_CONTRACT_INDEXATION);
    setDeposit(DEFAULT_CONTRACT_DEPOSIT);
    setPenalties(DEFAULT_CONTRACT_PENALTIES);
    setSla("standard");
    setStartAt(today());
    setDurationMonths("12");
    setRenewal("tacite");
    setStaffCount("0");
    setFrequency("");
    setNote("");
    setDraftSites([emptySite()]);
    setDraftTariffs([emptyTariff()]);
    setDraftPrestations([emptyPrestation()]);
  }

  function hydrateFromSelected(c: Contract) {
    setCompany(c.company);
    setContactName(c.contactName);
    setContactEmail(c.contactEmail);
    setClientRccm(c.clientRccm);
    setClientRepName(c.clientRepName);
    setClientRepTitle(c.clientRepTitle);
    setNecsRepName(c.necsRepName || DEFAULT_NECS_REP_NAME);
    setNecsRepTitle(c.necsRepTitle || DEFAULT_NECS_REP_TITLE);
    setObject(c.object || DEFAULT_CONTRACT_OBJECT);
    setPerimeter(c.perimeter);
    setObligations(c.obligations || DEFAULT_CONTRACT_OBLIGATIONS);
    setPricingTerms(c.pricingTerms);
    setBillingTerms(c.billingTerms || DEFAULT_CONTRACT_BILLING);
    setTerminationTerms(c.terminationTerms || DEFAULT_CONTRACT_TERMINATION);
    setBcRef(c.bcRef || "");
    setContractVersion(c.contractVersion || DEFAULT_CONTRACT_VERSION);
    setSignaturePlace(c.signaturePlace || DEFAULT_SIGNATURE_PLACE);
    setIndexation(c.indexation || DEFAULT_CONTRACT_INDEXATION);
    setDeposit(c.deposit || DEFAULT_CONTRACT_DEPOSIT);
    setPenalties(c.penalties || DEFAULT_CONTRACT_PENALTIES);
    setSla(c.sla);
    setStartAt(c.startAt.slice(0, 10));
    setDurationMonths(String(c.durationMonths));
    setRenewal(c.renewal);
    setStaffCount(String(c.staffCount));
    setFrequency(c.frequency || "");
    setNote(c.note);
    setDraftSites(draftSitesFromContract(c));
    setDraftTariffs(draftTariffsFromContract(c));
    setDraftPrestations(draftPrestationsFromContract(c));
  }

  useEffect(() => {
    if (selected && contractDraftEditable(selected)) {
      hydrateFromSelected(selected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate on selection change
  }, [selected?.id, selected?.status]);

  async function post(action: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = (await res.json()) as {
        item?: Contract;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action impossible");
      if (data.item) {
        setItems((prev) => {
          const i = prev.findIndex((x) => x.id === data.item!.id);
          if (i < 0) return [data.item!, ...prev];
          const next = [...prev];
          next[i] = data.item!;
          return next;
        });
        setSelectedId(data.item.id);
      }
      return data.item;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!company.trim()) {
      toast.error("Raison sociale client requise");
      return;
    }
    const item = await post("create-manual", {
      company,
      contactName,
      contactEmail,
      clientRccm,
      clientRepName: clientRepName || contactName,
      clientRepTitle,
      necsRepName,
      necsRepTitle,
      object,
      perimeter,
      obligations,
      pricingTerms,
      billingTerms,
      terminationTerms,
      bcRef,
      contractVersion,
      signaturePlace,
      indexation,
      deposit,
      penalties,
      sla,
      startAt,
      durationMonths: Number(durationMonths) || 12,
      renewal,
      staffCount: Number(staffCount) || 0,
      frequency,
      note,
      sites: sitesFromDraft(draftSites),
      tariffs: tariffsFromDraft(draftTariffs),
      prestations: prestationsFromDraft(draftPrestations),
    });
    if (item) {
      toast.success(`Contrat ${item.ref} créé`);
      setComposerOpen(false);
      resetComposer();
      void load();
    }
  }

  async function onSaveDraft() {
    if (!selected) return;
    const item = await post("update", {
      id: selected.id,
      company,
      contactName,
      contactEmail,
      clientRccm,
      clientRepName,
      clientRepTitle,
      necsRepName,
      necsRepTitle,
      object,
      perimeter,
      obligations,
      pricingTerms,
      billingTerms,
      terminationTerms,
      bcRef,
      contractVersion,
      signaturePlace,
      indexation,
      deposit,
      penalties,
      sla,
      startAt,
      durationMonths: Number(durationMonths) || 12,
      renewal,
      staffCount: Number(staffCount) || 0,
      frequency,
      note,
      sites: sitesFromDraft(draftSites),
      tariffs: tariffsFromDraft(draftTariffs),
      prestations: prestationsFromDraft(draftPrestations),
    });
    if (item) toast.success("Brouillon enregistré");
  }

  async function onSign(role: ContractSignatureRole) {
    if (!selected) return;
    const item = await post("sign", {
      id: selected.id,
      role,
      name: role === "client" ? clientRepName || selected.clientRepName : necsRepName,
      title:
        role === "client"
          ? clientRepTitle || selected.clientRepTitle
          : necsRepTitle,
    });
    if (item) toast.success(`Signature ${CONTRACT_SIGNATURE_ROLE_LABELS[role]} enregistrée`);
  }

  async function onFromWon(opportunityId: string) {
    const item = await post("from-won", { opportunityId });
    if (item) {
      toast.success(`Contrat ${item.ref} créé depuis l’affaire`);
      setWonEligible((prev) => prev.filter((o) => o.id !== opportunityId));
    }
  }

  function openComposer() {
    resetComposer();
    setComposerOpen(true);
  }

  const ready = selected ? serviceContractReady(selected) : null;
  const editable = canManage && selected != null && contractDraftEditable(selected);
  const fullySigned = selected ? contractFullySigned(selected) : false;

  return (
    <div
      className={`leads-page sc-page${embedded ? " sc-page--embedded" : ""}`}
      data-testid="service-contracts"
    >
      {embedded ? (
        <div className="fin-embedded-bar sc-embedded-bar">
          <div>
            <p className="fin-embedded-bar__eyebrow">Direction</p>
            <h2>Contrat de prestation client</h2>
            <p>
              Parties, BC/devis, sites, prestations, SLA, tarifs, signatures et
              activation
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
            {canManage ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={openComposer}
              >
                Nouveau contrat
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <header className="leads-page__head">
          <div>
            <p className="leads-page__eyebrow">Juridique / Direction</p>
            <h1>Contrat de prestation</h1>
            <p>
              Parties, BC/devis, sites, prestations, SLA, tarifs, signatures et
              activation
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
            {canManage ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={openComposer}
              >
                Nouveau contrat
              </button>
            ) : null}
          </div>
        </header>
      )}

      <section className="leads-kpis" aria-label="Indicateurs contrats">
        <article className="leads-kpi">
          <p>Actifs</p>
          <strong>{kpis.actifs}</strong>
          <span>en exploitation</span>
        </article>
        <article className="leads-kpi">
          <p>Brouillons</p>
          <strong>{kpis.brouillons}</strong>
          <span>en rédaction</span>
        </article>
        <article className="leads-kpi">
          <p>En revue</p>
          <strong>{kpis.enRevue}</strong>
          <span>juridique</span>
        </article>
        <article className="leads-kpi">
          <p>À signer</p>
          <strong>{kpis.aSigner}</strong>
          <span>signatures manquantes</span>
        </article>
        <article className="leads-kpi leads-kpi--accent">
          <p>MRR actifs</p>
          <strong>{formatContractFcfa(kpis.mrr)}</strong>
          <span>mensualisé</span>
        </article>
      </section>

      {wonEligible.length > 0 && canManage ? (
        <section
          className="contracts-eligible-strip sc-eligible-strip"
          aria-label="Affaires à contractualiser"
        >
          <div className="contracts-eligible-strip__head">
            <strong>
              {wonEligible.length} affaire
              {wonEligible.length > 1 ? "s" : ""} gagnée
              {wonEligible.length > 1 ? "s" : ""} sans contrat
            </strong>
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              disabled={busy}
              onClick={() => void onFromWon(wonEligible[0]!.id)}
            >
              Transformer
            </button>
          </div>
          <ul>
            {wonEligible.slice(0, 4).map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="contracts-eligible-chip"
                  disabled={busy}
                  onClick={() => void onFromWon(o.id)}
                >
                  <em>{o.company}</em>
                  <span>
                    {formatContractFcfa(o.valueEstimate)} · {o.id}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Réf., client, objet…"
            aria-label="Rechercher"
          />
        </label>
        <div className="leads-filters" role="tablist" aria-label="Filtres">
          {(
            [
              ["all", "Tous"],
              ["brouillon", "Brouillons"],
              ["en_revue", "En revue"],
              ["actif", "Actifs"],
              ["a-signer", "À signer"],
              ["suspendu", "Suspendus"],
              ["resilie", "Résiliés"],
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
      </div>

      <div className="leads-layout">
        <div className="leads-list" role="listbox" aria-label="Liste contrats">
          {loading && items.length === 0 ? (
            <div className="leads-empty">
              <h2>Chargement…</h2>
            </div>
          ) : filtered.length === 0 ? (
            <div className="leads-empty">
              <IconContract size={28} />
              <h2>Aucun contrat de prestation</h2>
              <p>
                Créez un contrat manuel ou transformez une affaire gagnée.
              </p>
              {canManage ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={openComposer}
                >
                  Nouveau contrat
                </button>
              ) : null}
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={selectedId === c.id}
                className={`leads-card sc-card${selectedId === c.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(c.id)}
              >
                <span className="leads-card__body">
                  <span className="leads-card__top">
                    <strong>{c.company}</strong>
                    <time>{formatWhen(c.startAt)}</time>
                  </span>
                  <span className="leads-card__mid">
                    <span className="leads-pill">{c.ref}</span>
                    <span
                      className={`contracts-status contracts-status--${c.status}`}
                    >
                      {CONTRACT_STATUS_LABELS[c.status]}
                    </span>
                  </span>
                  <span className="leads-card__preview">
                    {CONTRACT_SLA_LABELS[c.sla]} ·{" "}
                    {formatContractFcfa(c.monthlyAmount)}/mois
                    {c.bcRef ? ` · ${c.bcRef}` : ""}
                  </span>
                  <span className="sc-card__signs">
                    {c.signatures.map((s) => (
                      <em
                        key={s.role}
                        className={s.signed ? "is-signed" : "is-pending"}
                      >
                        {CONTRACT_SIGNATURE_ROLE_LABELS[s.role]}
                        {s.signed ? " ✓" : " ○"}
                      </em>
                    ))}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail contracts-detail sc-detail">
          {!selected ? (
            <div className="leads-empty-detail">
              <IconContract size={28} />
              <h2>Sélectionnez un contrat de prestation</h2>
              <p>Détail, édition brouillon, signatures et activation.</p>
            </div>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    {selected.ref} ·{" "}
                    <span
                      className={`contracts-status contracts-status--${selected.status}`}
                    >
                      {CONTRACT_STATUS_LABELS[selected.status]}
                    </span>
                  </p>
                  <h2>{selected.company}</h2>
                  <p className="leads-detail__sub">
                    Effet {formatWhen(selected.startAt)} →{" "}
                    {formatWhen(selected.endAt)} · {selected.durationMonths} mois
                    · {CONTRACT_RENEWAL_LABELS[selected.renewal]}
                  </p>
                </div>
                <div className="leads-detail__actions">
                  {editable ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={busy}
                      onClick={() => void onSaveDraft()}
                    >
                      Enregistrer
                    </button>
                  ) : null}
                  {canManage && selected.status === "brouillon" ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={busy || (ready != null && !ready.ok)}
                      onClick={() =>
                        void post("submit-review", { id: selected.id }).then(
                          (item) => {
                            if (item) toast.success("Soumis en revue juridique");
                          },
                        )
                      }
                    >
                      En revue
                    </button>
                  ) : null}
                  {canManage &&
                  (selected.status === "brouillon" ||
                    selected.status === "en_revue") ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={
                        busy ||
                        (ready != null && !ready.ok) ||
                        !fullySigned
                      }
                      title={
                        !fullySigned
                          ? "Signatures client et NECS requises"
                          : undefined
                      }
                      onClick={() =>
                        void post("activate", { id: selected.id }).then(
                          (item) => {
                            if (item) toast.success("Contrat activé");
                          },
                        )
                      }
                    >
                      Activer
                    </button>
                  ) : null}
                  {canManage && selected.status === "actif" ? (
                    <>
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy}
                        onClick={() =>
                          void post("status", {
                            id: selected.id,
                            status: "suspendu",
                          }).then((item) => {
                            if (item) toast.success("Contrat suspendu");
                          })
                        }
                      >
                        Suspendre
                      </button>
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy}
                        onClick={() =>
                          void post("status", {
                            id: selected.id,
                            status: "resilie",
                          }).then((item) => {
                            if (item) toast.success("Contrat résilié");
                          })
                        }
                      >
                        Résilier
                      </button>
                    </>
                  ) : null}
                  {canManage && selected.status === "suspendu" ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busy}
                      onClick={() =>
                        void post("status", {
                          id: selected.id,
                          status: "actif",
                        }).then((item) => {
                          if (item) toast.success("Contrat réactivé");
                        })
                      }
                    >
                      Réactiver
                    </button>
                  ) : null}
                  <a
                    className="btn-admin btn-admin--ghost"
                    href="/galerie/templates/TMP-05-contrat-prestation.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Modèle contrat
                  </a>
                </div>
              </header>

              {ready && !ready.ok ? (
                <p className="sc-ready-warn">
                  Compléter : {ready.missing.join(" · ")}
                </p>
              ) : null}

              {!fullySigned &&
              (selected.status === "brouillon" ||
                selected.status === "en_revue") ? (
                <p className="sc-ready-warn">
                  Signatures client et NECS requises avant activation.
                </p>
              ) : null}

              <section className="fin-section contracts-section">
                <h3>Références &amp; version</h3>
                <div className="need-qual__grid">
                  <label>
                    BC / devis de référence
                    <input
                      disabled={!editable}
                      value={editable ? bcRef : selected.bcRef}
                      onChange={(e) => setBcRef(e.target.value)}
                      placeholder="NECS-BC-… / NECS-DEV-…"
                    />
                  </label>
                  <label>
                    Version contrat
                    <input
                      disabled={!editable}
                      value={
                        editable ? contractVersion : selected.contractVersion
                      }
                      onChange={(e) => setContractVersion(e.target.value)}
                    />
                  </label>
                  <label>
                    Lieu de signature
                    <input
                      disabled={!editable}
                      value={
                        editable ? signaturePlace : selected.signaturePlace
                      }
                      onChange={(e) => setSignaturePlace(e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="fin-section contracts-section">
                <h3>Parties</h3>
                <div className="need-qual__grid">
                  <label>
                    Client (raison sociale)
                    <input
                      disabled={!editable}
                      value={editable ? company : selected.company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </label>
                  <label>
                    RCCM / NIU
                    <input
                      disabled={!editable}
                      value={editable ? clientRccm : selected.clientRccm}
                      onChange={(e) => setClientRccm(e.target.value)}
                    />
                  </label>
                  <label>
                    Représentant client
                    <input
                      disabled={!editable}
                      value={
                        editable ? clientRepName : selected.clientRepName
                      }
                      onChange={(e) => setClientRepName(e.target.value)}
                    />
                  </label>
                  <label>
                    Qualité
                    <input
                      disabled={!editable}
                      value={
                        editable ? clientRepTitle : selected.clientRepTitle
                      }
                      onChange={(e) => setClientRepTitle(e.target.value)}
                    />
                  </label>
                  <label>
                    Contact
                    <input
                      disabled={!editable}
                      value={editable ? contactName : selected.contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </label>
                  <label>
                    E-mail
                    <input
                      disabled={!editable}
                      value={editable ? contactEmail : selected.contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    Représentant NECS
                    <input
                      disabled={!editable}
                      value={editable ? necsRepName : selected.necsRepName}
                      onChange={(e) => setNecsRepName(e.target.value)}
                    />
                  </label>
                  <label>
                    Qualité NECS
                    <input
                      disabled={!editable}
                      value={editable ? necsRepTitle : selected.necsRepTitle}
                      onChange={(e) => setNecsRepTitle(e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="fin-section contracts-section">
                <h3>Objet & périmètre</h3>
                <div className="need-qual__grid">
                  <label className="need-qual__full">
                    Objet
                    <textarea
                      rows={2}
                      disabled={!editable}
                      value={editable ? object : selected.object}
                      onChange={(e) => setObject(e.target.value)}
                    />
                  </label>
                  <label className="need-qual__full">
                    Périmètre
                    <textarea
                      rows={2}
                      disabled={!editable}
                      value={editable ? perimeter : selected.perimeter}
                      onChange={(e) => setPerimeter(e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="fin-section contracts-section">
                <h3>Sites</h3>
                {editable ? (
                  <div className="sc-lines">
                    {draftSites.map((row, idx) => (
                      <div key={row.id} className="sc-line">
                        <input
                          placeholder="Nom du site"
                          value={row.name}
                          onChange={(e) => {
                            const next = [...draftSites];
                            next[idx] = { ...row, name: e.target.value };
                            setDraftSites(next);
                          }}
                        />
                        <input
                          placeholder="Adresse"
                          value={row.address}
                          onChange={(e) => {
                            const next = [...draftSites];
                            next[idx] = { ...row, address: e.target.value };
                            setDraftSites(next);
                          }}
                        />
                        <input
                          placeholder="Ville"
                          value={row.city}
                          onChange={(e) => {
                            const next = [...draftSites];
                            next[idx] = { ...row, city: e.target.value };
                            setDraftSites(next);
                          }}
                        />
                        <input
                          placeholder="m²"
                          value={row.surfaceM2}
                          onChange={(e) => {
                            const next = [...draftSites];
                            next[idx] = { ...row, surfaceM2: e.target.value };
                            setDraftSites(next);
                          }}
                        />
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          onClick={() =>
                            setDraftSites((rows) =>
                              rows.length <= 1
                                ? [emptySite()]
                                : rows.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() =>
                        setDraftSites((rows) => [...rows, emptySite()])
                      }
                    >
                      + Site
                    </button>
                  </div>
                ) : (
                  <ul className="contracts-sites">
                    {selected.sites.map((s) => (
                      <li key={s.id}>
                        <strong>{s.name}</strong>
                        <em>
                          {[s.address, s.city].filter(Boolean).join(", ") ||
                            "—"}
                          {s.surfaceM2 != null ? ` · ${s.surfaceM2} m²` : ""}
                        </em>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="fin-section contracts-section">
                <h3>Prestations · effectifs · fréquences</h3>
                <div className="need-qual__grid">
                  <label>
                    Effectif global
                    <input
                      type="number"
                      min={0}
                      disabled={!editable}
                      value={editable ? staffCount : selected.staffCount}
                      onChange={(e) => setStaffCount(e.target.value)}
                    />
                  </label>
                  <label>
                    Fréquence
                    <input
                      disabled={!editable}
                      value={editable ? frequency : selected.frequency || ""}
                      onChange={(e) => setFrequency(e.target.value)}
                      placeholder="ex. quotidien, 3×/sem."
                    />
                  </label>
                  <label>
                    SLA
                    <select
                      disabled={!editable}
                      value={editable ? sla : selected.sla}
                      onChange={(e) => setSla(e.target.value as ContractSla)}
                    >
                      {Object.entries(CONTRACT_SLA_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {editable ? (
                  <div className="sc-lines">
                    {draftPrestations.map((row, idx) => (
                      <div key={row.id} className="sc-line sc-line--presta">
                        <input
                          placeholder="Prestation"
                          value={row.label}
                          onChange={(e) => {
                            const next = [...draftPrestations];
                            next[idx] = { ...row, label: e.target.value };
                            setDraftPrestations(next);
                          }}
                        />
                        <input
                          placeholder="Fréquence"
                          value={row.frequency}
                          onChange={(e) => {
                            const next = [...draftPrestations];
                            next[idx] = { ...row, frequency: e.target.value };
                            setDraftPrestations(next);
                          }}
                        />
                        <input
                          placeholder="Effectif"
                          value={row.staffAssigned}
                          onChange={(e) => {
                            const next = [...draftPrestations];
                            next[idx] = {
                              ...row,
                              staffAssigned: e.target.value,
                            };
                            setDraftPrestations(next);
                          }}
                        />
                        <input
                          placeholder="Site"
                          value={row.siteName}
                          onChange={(e) => {
                            const next = [...draftPrestations];
                            next[idx] = { ...row, siteName: e.target.value };
                            setDraftPrestations(next);
                          }}
                        />
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          onClick={() =>
                            setDraftPrestations((rows) =>
                              rows.length <= 1
                                ? [emptyPrestation()]
                                : rows.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() =>
                        setDraftPrestations((rows) => [
                          ...rows,
                          emptyPrestation(),
                        ])
                      }
                    >
                      + Prestation
                    </button>
                  </div>
                ) : (
                  <ul className="contracts-sites">
                    {(selected.prestations.length
                      ? selected.prestations
                      : selected.tariffs.map((t) => ({
                          id: t.id,
                          label: t.label,
                          frequency: selected.frequency || "—",
                          staffAssigned: selected.staffCount,
                          siteName: selected.sites[0]?.name || "—",
                        }))
                    ).map((p) => (
                      <li key={p.id}>
                        <strong>{p.label}</strong>
                        <em>
                          {p.frequency || "—"} · {p.staffAssigned} agent(s) ·{" "}
                          {p.siteName || "—"}
                        </em>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="fin-section contracts-section">
                <h3>Prix & facturation</h3>
                {editable ? (
                  <div className="sc-lines">
                    {draftTariffs.map((row, idx) => (
                      <div key={row.id} className="sc-line sc-line--tarif">
                        <input
                          placeholder="Libellé"
                          value={row.label}
                          onChange={(e) => {
                            const next = [...draftTariffs];
                            next[idx] = { ...row, label: e.target.value };
                            setDraftTariffs(next);
                          }}
                        />
                        <input
                          placeholder="Qté"
                          value={row.quantity}
                          onChange={(e) => {
                            const next = [...draftTariffs];
                            next[idx] = { ...row, quantity: e.target.value };
                            setDraftTariffs(next);
                          }}
                        />
                        <input
                          placeholder="PU HT"
                          value={row.unitPrice}
                          onChange={(e) => {
                            const next = [...draftTariffs];
                            next[idx] = { ...row, unitPrice: e.target.value };
                            setDraftTariffs(next);
                          }}
                        />
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          onClick={() =>
                            setDraftTariffs((rows) =>
                              rows.length <= 1
                                ? [emptyTariff()]
                                : rows.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() =>
                        setDraftTariffs((rows) => [...rows, emptyTariff()])
                      }
                    >
                      + Ligne tarifaire
                    </button>
                  </div>
                ) : (
                  <ul className="contracts-sites">
                    {selected.tariffs.map((t) => (
                      <li key={t.id}>
                        <strong>{t.label}</strong>
                        <em>
                          {t.quantity} × {formatContractFcfa(t.unitPrice)} ={" "}
                          {formatContractFcfa(t.amount)}
                        </em>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="need-qual__grid" style={{ marginTop: "0.75rem" }}>
                  <label className="need-qual__full">
                    Conditions de prix
                    <textarea
                      rows={2}
                      disabled={!editable}
                      value={editable ? pricingTerms : selected.pricingTerms}
                      onChange={(e) => setPricingTerms(e.target.value)}
                    />
                  </label>
                  <label className="need-qual__full">
                    Facturation
                    <textarea
                      rows={2}
                      disabled={!editable}
                      value={editable ? billingTerms : selected.billingTerms}
                      onChange={(e) => setBillingTerms(e.target.value)}
                    />
                  </label>
                  <label>
                    Indexation annuelle
                    <input
                      disabled={!editable}
                      value={editable ? indexation : selected.indexation}
                      onChange={(e) => setIndexation(e.target.value)}
                    />
                  </label>
                  <label>
                    Dépôt / caution
                    <input
                      disabled={!editable}
                      value={editable ? deposit : selected.deposit}
                      onChange={(e) => setDeposit(e.target.value)}
                    />
                  </label>
                  <label className="need-qual__full">
                    Pénalités / bonus qualité
                    <textarea
                      rows={2}
                      disabled={!editable}
                      value={editable ? penalties : selected.penalties}
                      onChange={(e) => setPenalties(e.target.value)}
                    />
                  </label>
                  <p className="contracts-amount">
                    Mensuel : {formatContractFcfa(selected.monthlyAmount)} HT
                  </p>
                </div>
              </section>

              <section className="fin-section contracts-section">
                <h3>Durée · renouvellement · résiliation · obligations</h3>
                <div className="need-qual__grid">
                  <label>
                    Date d’effet
                    <input
                      type="date"
                      disabled={!editable}
                      value={editable ? startAt : selected.startAt.slice(0, 10)}
                      onChange={(e) => setStartAt(e.target.value)}
                    />
                  </label>
                  <label>
                    Durée (mois)
                    <input
                      type="number"
                      min={1}
                      disabled={!editable}
                      value={
                        editable ? durationMonths : selected.durationMonths
                      }
                      onChange={(e) => setDurationMonths(e.target.value)}
                    />
                  </label>
                  <label>
                    Renouvellement
                    <select
                      disabled={!editable}
                      value={editable ? renewal : selected.renewal}
                      onChange={(e) =>
                        setRenewal(e.target.value as ContractRenewal)
                      }
                    >
                      {Object.entries(CONTRACT_RENEWAL_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="need-qual__full">
                    Obligations
                    <textarea
                      rows={3}
                      disabled={!editable}
                      value={editable ? obligations : selected.obligations}
                      onChange={(e) => setObligations(e.target.value)}
                    />
                  </label>
                  <label className="need-qual__full">
                    Résiliation
                    <textarea
                      rows={3}
                      disabled={!editable}
                      value={
                        editable
                          ? terminationTerms
                          : selected.terminationTerms
                      }
                      onChange={(e) => setTerminationTerms(e.target.value)}
                    />
                  </label>
                  <label className="need-qual__full">
                    Note interne
                    <textarea
                      rows={2}
                      disabled={!editable}
                      value={editable ? note : selected.note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="fin-section contracts-section">
                <h3>Échéances</h3>
                {selected.milestones.length === 0 ? (
                  <p className="leads-empty">Aucune échéance</p>
                ) : (
                  <ul className="sc-milestones">
                    {selected.milestones.map((m) => (
                      <li key={m.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={m.done}
                            disabled={busy || selected.status === "resilie"}
                            onChange={(e) =>
                              void post("milestone", {
                                id: selected.id,
                                milestoneId: m.id,
                                done: e.target.checked,
                              })
                            }
                          />
                          <strong>{m.label}</strong>
                          <span>
                            {formatWhen(m.dueAt)}
                            {m.done && m.doneAt
                              ? ` · fait ${formatWhen(m.doneAt)}`
                              : ""}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="fin-section contracts-section">
                <h3>Signatures</h3>
                <ul className="sc-signatures">
                  {selected.signatures.map((s) => (
                    <li key={s.role}>
                      <div>
                        <strong>
                          {CONTRACT_SIGNATURE_ROLE_LABELS[s.role]}
                        </strong>
                        <em>
                          {s.name || "—"}
                          {s.title ? ` · ${s.title}` : ""}
                        </em>
                        <span>
                          {s.signed
                            ? `Signé le ${formatWhen(s.signedAt)}`
                            : "En attente"}
                        </span>
                      </div>
                      {canManage && !s.signed ? (
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          disabled={busy}
                          onClick={() => void onSign(s.role)}
                        >
                          Signer
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {selected.signedAt ? (
                  <p className="sc-signed-banner">
                    Contrat signé des deux parts le{" "}
                    {formatWhen(selected.signedAt)}
                  </p>
                ) : null}
              </section>

              <section className="need-qual__history">
                <h3>Historique</h3>
                <ul>
                  {selected.history.slice(0, 12).map((h) => (
                    <li key={h.id}>
                      <time>{formatWhen(h.at)}</time>
                      <span>
                        {h.byName} — {h.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </article>
      </div>

      {composerOpen ? (
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
              aria-labelledby="sc-create-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="doc-overlay-header">
                <div className="doc-overlay-header__left">
                  <p className="doc-overlay-header__tag">Contrat</p>
                  <h2 id="sc-create-title">Nouveau contrat de prestation</h2>
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
                id="sc-create-form"
                className="doc-overlay-body fin-composer"
                onSubmit={(e) => void onCreate(e)}
              >
                <fieldset className="fin-composer__section">
                  <legend>Références</legend>
                  <div className="fin-composer__grid">
                    <label>
                      <span>BC / devis de référence</span>
                      <input
                        value={bcRef}
                        onChange={(e) => setBcRef(e.target.value)}
                        placeholder="NECS-BC-… / NECS-DEV-…"
                      />
                    </label>
                    <label>
                      <span>Version</span>
                      <input
                        value={contractVersion}
                        onChange={(e) => setContractVersion(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Lieu de signature</span>
                      <input
                        value={signaturePlace}
                        onChange={(e) => setSignaturePlace(e.target.value)}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>Parties</legend>
                  <div className="fin-composer__grid">
                    <label className="fin-composer__full">
                      <span>Client (raison sociale) *</span>
                      <input
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Société cliente"
                      />
                    </label>
                    <label>
                      <span>RCCM / NIU</span>
                      <input
                        value={clientRccm}
                        onChange={(e) => setClientRccm(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Représentant client</span>
                      <input
                        value={clientRepName}
                        onChange={(e) => setClientRepName(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Qualité</span>
                      <input
                        value={clientRepTitle}
                        onChange={(e) => setClientRepTitle(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Contact</span>
                      <input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>E-mail</span>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Représentant NECS</span>
                      <input
                        value={necsRepName}
                        onChange={(e) => setNecsRepName(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Qualité NECS</span>
                      <input
                        value={necsRepTitle}
                        onChange={(e) => setNecsRepTitle(e.target.value)}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>Objet & clauses</legend>
                  <div className="fin-composer__grid">
                    <label className="fin-composer__full">
                      <span>Objet</span>
                      <textarea
                        rows={2}
                        value={object}
                        onChange={(e) => setObject(e.target.value)}
                      />
                    </label>
                    <label className="fin-composer__full">
                      <span>Périmètre</span>
                      <textarea
                        rows={2}
                        value={perimeter}
                        onChange={(e) => setPerimeter(e.target.value)}
                      />
                    </label>
                    <label className="fin-composer__full">
                      <span>Obligations</span>
                      <textarea
                        rows={2}
                        value={obligations}
                        onChange={(e) => setObligations(e.target.value)}
                      />
                    </label>
                    <label className="fin-composer__full">
                      <span>Facturation</span>
                      <textarea
                        rows={2}
                        value={billingTerms}
                        onChange={(e) => setBillingTerms(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Indexation</span>
                      <input
                        value={indexation}
                        onChange={(e) => setIndexation(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Dépôt / caution</span>
                      <input
                        value={deposit}
                        onChange={(e) => setDeposit(e.target.value)}
                      />
                    </label>
                    <label className="fin-composer__full">
                      <span>Pénalités / bonus</span>
                      <textarea
                        rows={2}
                        value={penalties}
                        onChange={(e) => setPenalties(e.target.value)}
                      />
                    </label>
                    <label className="fin-composer__full">
                      <span>Résiliation</span>
                      <textarea
                        rows={2}
                        value={terminationTerms}
                        onChange={(e) => setTerminationTerms(e.target.value)}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>Durée & SLA</legend>
                  <div className="fin-composer__grid">
                    <label>
                      <span>Date d’effet</span>
                      <input
                        type="date"
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                      />
                    </label>
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
                      <span>Renouvellement</span>
                      <select
                        value={renewal}
                        onChange={(e) =>
                          setRenewal(e.target.value as ContractRenewal)
                        }
                      >
                        {Object.entries(CONTRACT_RENEWAL_LABELS).map(
                          ([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      <span>SLA</span>
                      <select
                        value={sla}
                        onChange={(e) => setSla(e.target.value as ContractSla)}
                      >
                        {Object.entries(CONTRACT_SLA_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Effectif</span>
                      <input
                        type="number"
                        min={0}
                        value={staffCount}
                        onChange={(e) => setStaffCount(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Fréquence</span>
                      <input
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        placeholder="ex. 5 j / sem"
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>Sites couverts</legend>
                  <div className="fin-lines-edit">
                    {draftSites.map((row, idx) => (
                      <div key={row.id} className="sc-line sc-line--site">
                        <input
                          placeholder="Site *"
                          value={row.name}
                          onChange={(e) => {
                            const next = [...draftSites];
                            next[idx] = { ...row, name: e.target.value };
                            setDraftSites(next);
                          }}
                        />
                        <input
                          placeholder="Adresse"
                          value={row.address}
                          onChange={(e) => {
                            const next = [...draftSites];
                            next[idx] = { ...row, address: e.target.value };
                            setDraftSites(next);
                          }}
                        />
                        <input
                          placeholder="Ville"
                          value={row.city}
                          onChange={(e) => {
                            const next = [...draftSites];
                            next[idx] = { ...row, city: e.target.value };
                            setDraftSites(next);
                          }}
                        />
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          onClick={() =>
                            setDraftSites((rows) =>
                              rows.length <= 1
                                ? rows
                                : rows.filter((_, i) => i !== idx),
                            )
                          }
                          aria-label="Retirer le site"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() =>
                        setDraftSites((rows) => [...rows, emptySite()])
                      }
                    >
                      + Site
                    </button>
                  </div>
                </fieldset>

                <fieldset className="fin-composer__section">
                  <legend>Tarifs mensuels HT</legend>
                  <div className="fin-lines-edit">
                    {draftTariffs.map((row, idx) => (
                      <div key={row.id} className="sc-line sc-line--tarif">
                        <input
                          placeholder="Libellé prestation"
                          value={row.label}
                          onChange={(e) => {
                            const next = [...draftTariffs];
                            next[idx] = { ...row, label: e.target.value };
                            setDraftTariffs(next);
                          }}
                        />
                        <input
                          placeholder="Qté"
                          value={row.quantity}
                          onChange={(e) => {
                            const next = [...draftTariffs];
                            next[idx] = { ...row, quantity: e.target.value };
                            setDraftTariffs(next);
                          }}
                        />
                        <input
                          placeholder="P.U. HT"
                          value={row.unitPrice}
                          onChange={(e) => {
                            const next = [...draftTariffs];
                            next[idx] = { ...row, unitPrice: e.target.value };
                            setDraftTariffs(next);
                          }}
                        />
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          onClick={() =>
                            setDraftTariffs((rows) =>
                              rows.length <= 1
                                ? rows
                                : rows.filter((_, i) => i !== idx),
                            )
                          }
                          aria-label="Retirer la ligne"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() =>
                        setDraftTariffs((rows) => [...rows, emptyTariff()])
                      }
                    >
                      + Ligne tarifaire
                    </button>
                  </div>
                  <p className="fin-composer__issuer">
                    Note optionnelle : {note ? "renseignée" : "vide"} — à
                    compléter après création si besoin.
                  </p>
                  <label className="fin-composer__full">
                    <span>Note interne</span>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                </fieldset>
              </form>
              <footer className="doc-overlay-footer">
                <p className="doc-overlay-footer__hint">
                  Le contrat est créé en brouillon — signatures puis activation.
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
                    form="sc-create-form"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                  >
                    {busy ? "Création…" : "Créer le contrat"}
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
