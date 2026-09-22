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
  FwOk,
} from "@/components/admin/form-wizard";
import { IconSearch, IconUser } from "@/components/admin/Icons";
import {
  DOC_SIG_KIND_LABELS,
  DOC_SIG_KINDS,
  DOC_SIG_METHOD_LABELS,
  DOC_SIG_SLOT_LABELS,
  DOC_SIG_STATUS_LABELS,
  docSigRecipeRequirements,
  getCurrentVersion,
  missingSlots,
  type ContractDocument,
  type DocSigKind,
  type DocSigRoleSlot,
  type DocSigStatus,
} from "@/lib/documents-signatures-shared";
import { toast } from "@/lib/toast";

type Verification = {
  signatureId: string;
  expectedToken: string;
  ok: boolean;
  reason: string;
};

type Draft = {
  kind: DocSigKind;
  title: string;
  body: string;
  employeeName: string;
  employeeEmail: string;
  directionName: string;
  directionEmail: string;
  requireRh: boolean;
  note: string;
  connectorProvider: string;
  connectorExternalId: string;
  jobTitle: string;
  assignmentSite: string;
  assignmentZone: string;
  conditions: string;
  obligations: string;
  confidentiality: string;
  attachmentsText: string;
};

const EMPTY_DRAFT: Draft = {
  kind: "contrat",
  title: "",
  body: "",
  employeeName: "",
  employeeEmail: "",
  directionName: "Direction NECS",
  directionEmail: "direction@necs.cm",
  requireRh: false,
  note: "",
  connectorProvider: "",
  connectorExternalId: "",
  jobTitle: "Agent d’entretien",
  assignmentSite: "",
  assignmentZone: "",
  conditions: "",
  obligations: "",
  confidentiality:
    "Le collaborateur s’engage à la confidentialité des informations clients et de l’entreprise.",
  attachmentsText: "",
};

const FLOW: DocSigStatus[] = [
  "brouillon",
  "en_validation",
  "a_signer",
  "signe",
  "archive",
];

type Filter = "all" | DocSigStatus | "a_traiter";

function formatWhen(ts: string) {
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

function shortHash(hash: string) {
  if (!hash) return "—";
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function initials(name: string, fallback = "D") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function DocumentsSignaturesWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [role, setRole] = useState("rh");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContractDocument | null>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [docStep, setDocStep] = useState<
    "document" | "parties" | "conditions" | "revue"
  >("document");
  const [docShake, setDocShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [versionTitle, setVersionTitle] = useState("");
  const [versionBody, setVersionBody] = useState("");
  const [signName, setSignName] = useState("");
  const [signMethod, setSignMethod] = useState<"electronique" | "connecteur">(
    "electronique",
  );
  const [connectorRef, setConnectorRef] = useState("");
  const [validateNote, setValidateNote] = useState("");
  const [connProvider, setConnProvider] = useState("");
  const [connExternalId, setConnExternalId] = useState("");
  const [metaJobTitle, setMetaJobTitle] = useState("");
  const [metaSite, setMetaSite] = useState("");
  const [metaZone, setMetaZone] = useState("");
  const [metaConditions, setMetaConditions] = useState("");
  const [metaObligations, setMetaObligations] = useState("");
  const [metaConfidentiality, setMetaConfidentiality] = useState("");
  const [metaAttachments, setMetaAttachments] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents-signatures", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: ContractDocument[];
        canManage?: boolean;
        canValidate?: boolean;
        role?: string;
        email?: string;
        userId?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items ?? []);
      setCanManage(Boolean(data.canManage));
      setCanValidate(Boolean(data.canValidate));
      setRole(data.role ?? "rh");
      setEmail((data.email ?? "").toLowerCase());
      setUserId(data.userId ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(
        `/api/documents-signatures?id=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        item?: ContractDocument;
        verifications?: Verification[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Détail impossible");
      if (data.item) {
        setSelected(data.item);
        setVerifications(data.verifications ?? []);
        const cur = getCurrentVersion(data.item);
        setVersionTitle(cur?.title ?? "");
        setVersionBody(cur?.body ?? "");
        setConnProvider(data.item.connectorProvider || "");
        setConnExternalId(data.item.connectorExternalId || "");
        setMetaJobTitle(data.item.jobTitle || "");
        setMetaSite(data.item.assignmentSite || "");
        setMetaZone(data.item.assignmentZone || "");
        setMetaConditions(data.item.conditions || "");
        setMetaObligations(data.item.obligations || "");
        setMetaConfidentiality(data.item.confidentiality || "");
        setMetaAttachments(
          (data.item.attachments || []).map((a) => a.label).join("\n"),
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur détail");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else {
      setSelected(null);
      setVerifications([]);
    }
  }, [selectedId, loadDetail]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((doc) => {
      if (filter === "a_traiter") {
        const mine =
          (canValidate && doc.status === "en_validation") ||
          (doc.status === "a_signer" &&
            (doc.employeeEmail === email ||
              (Boolean(userId) && doc.employeeUserId === userId) ||
              canValidate ||
              canManage));
        if (!mine) return false;
      } else if (filter !== "all" && doc.status !== filter) {
        return false;
      }
      if (!q) return true;
      const cur = getCurrentVersion(doc);
      return (
        doc.id.toLowerCase().includes(q) ||
        doc.employeeName.toLowerCase().includes(q) ||
        doc.employeeEmail.toLowerCase().includes(q) ||
        (cur?.title ?? "").toLowerCase().includes(q) ||
        DOC_SIG_KIND_LABELS[doc.kind].toLowerCase().includes(q)
      );
    });
  }, [items, filter, query, canValidate, canManage, email, userId]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: items.length, a_traiter: 0 };
    for (const doc of items) {
      base[doc.status] = (base[doc.status] ?? 0) + 1;
      if (
        (canValidate && doc.status === "en_validation") ||
        (doc.status === "a_signer" &&
          (doc.employeeEmail === email ||
            (Boolean(userId) && doc.employeeUserId === userId) ||
            canValidate ||
            canManage))
      ) {
        base.a_traiter += 1;
      }
    }
    return base;
  }, [items, canValidate, canManage, email, userId]);

  function pulseDocError() {
    setDocShake(true);
    window.setTimeout(() => setDocShake(false), 420);
  }

  function openComposer() {
    setDraft(EMPTY_DRAFT);
    setDocStep("document");
    setComposerOpen(true);
  }

  const documentReady =
    Boolean(draft.title.trim()) && Boolean(draft.body.trim());
  const partiesReady =
    Boolean(draft.employeeEmail.trim()) &&
    draft.employeeEmail.includes("@");

  function canEnterDocStep(id: string) {
    if (id === "document") return true;
    if (!documentReady) return false;
    if (id === "conditions" || id === "revue") return partiesReady;
    return true;
  }

  async function createDoc(e: FormEvent) {
    e.preventDefault();
    if (!documentReady) {
      setDocStep("document");
      pulseDocError();
      toast.error("Titre et contenu sont obligatoires.");
      return;
    }
    if (!partiesReady) {
      setDocStep("parties");
      pulseDocError();
      toast.error("E-mail employé requis.");
      return;
    }
    setCreating(true);
    try {
      const requiredSlots: DocSigRoleSlot[] = ["employe", "direction"];
      if (draft.requireRh) requiredSlots.push("rh");
      const res = await fetch("/api/documents-signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: draft.kind,
          title: draft.title,
          body: draft.body,
          employeeName: draft.employeeName,
          employeeEmail: draft.employeeEmail,
          directionName: draft.directionName,
          directionEmail: draft.directionEmail,
          requiredSlots,
          note: draft.note,
          connectorProvider: draft.connectorProvider,
          connectorExternalId: draft.connectorExternalId,
          jobTitle: draft.jobTitle,
          assignmentSite: draft.assignmentSite,
          assignmentZone: draft.assignmentZone,
          conditions: draft.conditions,
          obligations: draft.obligations,
          confidentiality: draft.confidentiality,
          attachments: draft.attachmentsText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((label, idx) => ({
              id: `ATT-${idx + 1}`,
              label,
              fileRef: "",
              note: "",
            })),
        }),
      });
      const data = (await res.json()) as {
        item?: ContractDocument;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création échouée");
      toast.success("Document préparé (v1)");
      setComposerOpen(false);
      setDraft(EMPTY_DRAFT);
      setDocStep("document");
      await refresh();
      if (data.item) setSelectedId(data.item.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
      pulseDocError();
    } finally {
      setCreating(false);
    }
  }

  async function patch(
    action: string,
    extra: Record<string, unknown> = {},
  ) {
    if (!selectedId) return;
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/documents-signatures", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, action, ...extra }),
      });
      const data = (await res.json()) as {
        item?: ContractDocument;
        verifications?: Verification[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action échouée");
      if (data.item) {
        setSelected(data.item);
        setVerifications(data.verifications ?? []);
        const cur = getCurrentVersion(data.item);
        setVersionTitle(cur?.title ?? "");
        setVersionBody(cur?.body ?? "");
        setConnProvider(data.item.connectorProvider || "");
        setConnExternalId(data.item.connectorExternalId || "");
        setMetaJobTitle(data.item.jobTitle || "");
        setMetaSite(data.item.assignmentSite || "");
        setMetaZone(data.item.assignmentZone || "");
        setMetaConditions(data.item.conditions || "");
        setMetaObligations(data.item.obligations || "");
        setMetaConfidentiality(data.item.confidentiality || "");
        setMetaAttachments(
          (data.item.attachments || []).map((a) => a.label).join("\n"),
        );
      }
      await refresh();
      toast.success("Mis à jour");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  const current = selected ? getCurrentVersion(selected) : null;
  const pendingSlots = selected ? missingSlots(selected) : [];
  const recipe = selected ? docSigRecipeRequirements(selected) : null;
  const isEmployee = role === "nettoyeur";
  const isAssignedEmployee =
    Boolean(selected) &&
    (selected!.employeeEmail === email ||
      (Boolean(userId) && selected!.employeeUserId === userId));
  const canSignSelected =
    selected &&
    selected.status === "a_signer" &&
    pendingSlots.length > 0 &&
    (canManage || canValidate || isAssignedEmployee);

  const flowIndex =
    selected?.status === "refuse"
      ? 0
      : selected
        ? FLOW.indexOf(selected.status)
        : -1;

  return (
    <RhWorkspaceShell
      embedded={embedded}
      className="leads-page docsig-page"
      tone="#0a3a72"
      badge={isEmployee ? "Espace agent" : "Contrats"}
      eyebrow={
        isEmployee
          ? "Mes documents"
          : "Contrat agent · signatures & pièces"
      }
      icon={<IconUser size={20} />}
      title={
        isEmployee
          ? "Mes documents & signatures"
          : "Contrat / document contractuel agent"
      }
      meta={
        <>
          <span>
            <strong>{counts.all ?? 0}</strong> docs
          </span>
          <span>
            <strong>{counts.a_traiter ?? 0}</strong> à traiter
          </span>
          <span>
            <strong>{counts.a_signer ?? 0}</strong> à signer
          </span>
          <span>
            <strong>{counts.archive ?? 0}</strong> archivés
          </span>
        </>
      }
      actions={
        <>
          {canManage ? (
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={openComposer}
            >
              Préparer un document
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
      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Titre, employé, id…"
          />
        </label>
        <div className="leads-filters" role="tablist" aria-label="Filtres">
          {(
            [
              ["all", "Tous"],
              ["a_traiter", "À traiter"],
              ["brouillon", "Brouillons"],
              ["en_validation", "Validation"],
              ["a_signer", "À signer"],
              ["signe", "Signés"],
              ["archive", "Archives"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={`leads-chip${filter === id ? " is-active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
              <em>{counts[id] ?? 0}</em>
            </button>
          ))}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="leads-shell" aria-busy="true">
          <div className="leads-inbox">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="leads-skel" />
            ))}
          </div>
          <div className="leads-detail leads-detail--skel">
            <div className="leads-skel leads-skel--lg" />
            <div className="leads-skel" />
            <div className="leads-skel leads-skel--block" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="leads-empty">
          <div className="leads-empty__orb" aria-hidden />
          <p className="leads-empty__eyebrow">Documents & signatures</p>
          <h2>Aucun document sur ce filtre</h2>
          <p>
            Préparez un contrat ou un engagement, faites-le valider par la
            direction, puis collectez les signatures.
          </p>
          {canManage ? (
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={openComposer}
            >
              Préparer un document
            </button>
          ) : null}
        </div>
      ) : (
        <div className="leads-shell">
          <ul className="leads-inbox" aria-label="Liste des documents">
            {filtered.map((doc) => {
              const cur = getCurrentVersion(doc);
              const active = selectedId === doc.id;
              const label = cur?.title || doc.id;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    className={`leads-card docsig-card${active ? " is-active" : ""}`}
                    onClick={() => setSelectedId(doc.id)}
                  >
                    <span className="leads-card__avatar" aria-hidden>
                      {initials(doc.employeeName || label)}
                    </span>
                    <span className="leads-card__body">
                      <span className="leads-card__top">
                        <strong>{label}</strong>
                        <time dateTime={doc.updatedAt}>
                          {formatWhen(doc.updatedAt)}
                        </time>
                      </span>
                      <span className="leads-card__mid">
                        <span className="leads-pill">
                          {DOC_SIG_KIND_LABELS[doc.kind]}
                        </span>
                        <span
                          className={`docsig-status docsig-status--${doc.status}`}
                        >
                          {DOC_SIG_STATUS_LABELS[doc.status]}
                        </span>
                        <span className="leads-card__subject">
                          v{doc.currentVersion}
                        </span>
                      </span>
                      <span className="leads-card__preview">
                        {doc.employeeName || doc.employeeEmail || "—"} ·{" "}
                        {shortHash(cur?.contentHash ?? "")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <article className="leads-detail docsig-detail" aria-live="polite">
            {!selected ? (
              <div className="leads-empty-detail">
                <p>Sélectionnez un document pour préparer, valider, signer ou archiver.</p>
              </div>
            ) : (
              <>
                <header className="leads-detail__head">
                  <div className="leads-detail__identity">
                    <span className="leads-detail__avatar" aria-hidden>
                      {initials(selected.employeeName || current?.title || "D")}
                    </span>
                    <div>
                      <p className="leads-detail__eyebrow">
                        <span className="leads-pill">
                          {DOC_SIG_KIND_LABELS[selected.kind]}
                        </span>
                        <span
                          className={`docsig-status docsig-status--${selected.status}`}
                        >
                          {DOC_SIG_STATUS_LABELS[selected.status]}
                        </span>
                        <span>{selected.id}</span>
                      </p>
                      <h2>{current?.title}</h2>
                      <p className="leads-detail__sub">
                        v{selected.currentVersion} · rôle {role} ·{" "}
                        {selected.employeeEmail || "employé non renseigné"}
                      </p>
                    </div>
                  </div>
                </header>

                <div className="docsig-flow" aria-label="Parcours">
                  {FLOW.map((st, i) => (
                    <span
                      key={st}
                      className={`docsig-flow__step${
                        selected.status === st ||
                        (selected.status === "refuse" && st === "brouillon")
                          ? " is-current"
                          : ""
                      }${flowIndex > i ? " is-done" : ""}`}
                    >
                      {DOC_SIG_STATUS_LABELS[st]}
                    </span>
                  ))}
                  {selected.status === "refuse" ? (
                    <span className="docsig-flow__step is-current is-refuse">
                      Refusé
                    </span>
                  ) : null}
                </div>

                <section className="docsig-section">
                  <h3>Contrat agent — informations</h3>
                  <div className="recruit-eval-grid">
                    <label className="recruit-field">
                      Poste
                      <input
                        value={metaJobTitle}
                        disabled={!canManage}
                        onChange={(e) => setMetaJobTitle(e.target.value)}
                      />
                    </label>
                    <label className="recruit-field">
                      Affectation (site)
                      <input
                        value={metaSite}
                        disabled={!canManage}
                        onChange={(e) => setMetaSite(e.target.value)}
                      />
                    </label>
                    <label className="recruit-field">
                      Zone
                      <input
                        value={metaZone}
                        disabled={!canManage}
                        onChange={(e) => setMetaZone(e.target.value)}
                      />
                    </label>
                    <label className="recruit-field recruit-field--grow" style={{ gridColumn: "1 / -1" }}>
                      Conditions applicables
                      <textarea
                        rows={2}
                        value={metaConditions}
                        disabled={!canManage}
                        onChange={(e) => setMetaConditions(e.target.value)}
                      />
                    </label>
                    <label className="recruit-field recruit-field--grow" style={{ gridColumn: "1 / -1" }}>
                      Obligations
                      <textarea
                        rows={2}
                        value={metaObligations}
                        disabled={!canManage}
                        onChange={(e) => setMetaObligations(e.target.value)}
                      />
                    </label>
                    <label className="recruit-field recruit-field--grow" style={{ gridColumn: "1 / -1" }}>
                      Confidentialité
                      <textarea
                        rows={2}
                        value={metaConfidentiality}
                        disabled={!canManage}
                        onChange={(e) => setMetaConfidentiality(e.target.value)}
                      />
                    </label>
                    <label className="recruit-field recruit-field--grow" style={{ gridColumn: "1 / -1" }}>
                      Pièces associées (1 par ligne)
                      <textarea
                        rows={2}
                        value={metaAttachments}
                        disabled={!canManage}
                        onChange={(e) => setMetaAttachments(e.target.value)}
                      />
                    </label>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      style={{ marginTop: "0.75rem" }}
                      disabled={busy}
                      onClick={() =>
                        void patch("meta", {
                          jobTitle: metaJobTitle,
                          assignmentSite: metaSite,
                          assignmentZone: metaZone,
                          conditions: metaConditions,
                          obligations: metaObligations,
                          confidentiality: metaConfidentiality,
                          attachments: metaAttachments
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean)
                            .map((label, idx) => ({
                              id: `ATT-${idx + 1}`,
                              label,
                              fileRef: "",
                              note: "",
                            })),
                        })
                      }
                    >
                      Enregistrer infos contrat
                    </button>
                  ) : null}
                </section>

                {recipe ? (
                  <div
                    className={
                      recipe.ok
                        ? "docsig-recipe is-ok"
                        : "docsig-recipe is-blocked"
                    }
                    data-testid="docsig-recipe"
                    role="status"
                  >
                    <strong>
                      {recipe.ok
                        ? "Recette OK — signature / version / date vérifiables"
                        : "Recette incomplète"}
                    </strong>
                    {!recipe.ok ? (
                      <ul>
                        {recipe.missing.slice(0, 8).map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        {recipe.proofs.length} preuve
                        {recipe.proofs.length > 1 ? "s" : ""} contrôlée
                        {recipe.proofs.length > 1 ? "s" : ""}
                        {selected.status === "archive"
                          ? " · archive scellée"
                          : ""}
                      </p>
                    )}
                  </div>
                ) : null}

                <dl className="leads-detail__meta">
                  <div>
                    <dt>Employé</dt>
                    <dd>
                      {selected.employeeName || "—"}
                      <br />
                      <small>{selected.employeeEmail || "—"}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Direction</dt>
                    <dd>
                      {selected.directionName || "—"}
                      <br />
                      <small>{selected.directionEmail || "—"}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Empreinte v{selected.currentVersion}</dt>
                    <dd className="docsig-mono">
                      {shortHash(current?.contentHash ?? "")}
                    </dd>
                  </div>
                  <div>
                    <dt>Connecteur</dt>
                    <dd>
                      {selected.connectorProvider || "—"}
                      <br />
                      <small>
                        {selected.connectorExternalId || "non lié"}
                      </small>
                    </dd>
                  </div>
                </dl>

                <div className="leads-detail__message">
                  <div className="leads-detail__message-head">
                    <h3>Contenu contractuel</h3>
                  </div>
                  <pre>{current?.body}</pre>
                </div>

                <section className="docsig-section">
                  <h3>Signatures requises</h3>
                  <ul className="docsig-slots">
                    {selected.requiredSlots.map((slot) => {
                      const sig = selected.signatures.find(
                        (s) =>
                          s.roleSlot === slot &&
                          s.version === selected.currentVersion,
                      );
                      const check = sig
                        ? verifications.find((v) => v.signatureId === sig.id)
                        : null;
                      return (
                        <li
                          key={slot}
                          className={`docsig-slot${sig ? " is-signed" : " is-pending"}`}
                        >
                          <div>
                            <strong>{DOC_SIG_SLOT_LABELS[slot]}</strong>
                            {sig ? (
                              <p>
                                {sig.signerName} · {formatWhen(sig.signedAt)} ·{" "}
                                {DOC_SIG_METHOD_LABELS[sig.method]} · v
                                {sig.version}
                              </p>
                            ) : (
                              <p>En attente</p>
                            )}
                          </div>
                          {sig ? (
                            <span
                              className={`docsig-verify${check?.ok ? " is-ok" : " is-bad"}`}
                            >
                              {check?.ok
                                ? "Vérifié"
                                : check?.reason || "À contrôler"}
                            </span>
                          ) : (
                            <span className="docsig-verify">Manquant</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {selected.signatures.length > 0 ? (
                  <section className="docsig-section">
                    <h3>Preuves (signature / version / date)</h3>
                    <ul className="docsig-proofs">
                      {selected.signatures.map((sig) => {
                        const check = verifications.find(
                          (v) => v.signatureId === sig.id,
                        );
                        return (
                          <li key={sig.id}>
                            <span className="docsig-proofs__icon" aria-hidden>
                              <IconUser size={16} />
                            </span>
                            <div>
                              <strong>
                                {DOC_SIG_SLOT_LABELS[sig.roleSlot]} · {sig.id}
                              </strong>
                              <p>
                                {formatWhen(sig.signedAt)} · contenu{" "}
                                {shortHash(sig.contentHash)} · jeton{" "}
                                {shortHash(sig.signatureToken)}
                              </p>
                              <p
                                className={`docsig-proofs__check${
                                  check?.ok ? " is-ok" : " is-bad"
                                }`}
                              >
                                {check?.reason ?? "—"}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null}

                {selected.status === "archive" ? (
                  <div className="docsig-archive" role="status">
                    <h3>Archivage sécurisé</h3>
                    <p>
                      Scellé le {formatWhen(selected.archiveSealedAt ?? "")}
                    </p>
                    <code className="docsig-mono">
                      {selected.archiveSealHash}
                    </code>
                  </div>
                ) : null}

                <div className="recruit-actions docsig-actions">
                  <h3>Actions</h3>

                  {canManage &&
                  (selected.status === "brouillon" ||
                    selected.status === "refuse") ? (
                    <div className="recruit-actions__row">
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={busy}
                        onClick={() => void patch("submit_validation")}
                      >
                        Soumettre à la direction
                      </button>
                    </div>
                  ) : null}

                  {canValidate && selected.status === "en_validation" ? (
                    <div className="recruit-actions__row">
                      <input
                        value={validateNote}
                        onChange={(e) => setValidateNote(e.target.value)}
                        placeholder="Motif (si refus)"
                      />
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={busy}
                        onClick={() =>
                          void patch("validate", {
                            decision: "approve",
                            note: validateNote,
                          })
                        }
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy}
                        onClick={() =>
                          void patch("validate", {
                            decision: "refuse",
                            note: validateNote,
                          })
                        }
                      >
                        Refuser
                      </button>
                    </div>
                  ) : null}

                  {canSignSelected ? (
                    <div className="docsig-panel">
                      <p className="docsig-panel__title">Signer</p>
                      <div className="docsig-panel__grid">
                        <label>
                          <span>Nom signataire</span>
                          <input
                            value={signName}
                            onChange={(e) => setSignName(e.target.value)}
                            placeholder="Nom complet"
                          />
                        </label>
                        <label>
                          <span>Méthode</span>
                          <select
                            value={signMethod}
                            onChange={(e) =>
                              setSignMethod(
                                e.target.value === "connecteur"
                                  ? "connecteur"
                                  : "electronique",
                              )
                            }
                          >
                            <option value="electronique">
                              Signature électronique
                            </option>
                            <option value="connecteur">
                              Connecteur externe
                            </option>
                          </select>
                        </label>
                        {signMethod === "connecteur" ? (
                          <label className="docsig-panel__full">
                            <span>Réf. connecteur</span>
                            <input
                              value={connectorRef}
                              onChange={(e) => setConnectorRef(e.target.value)}
                              placeholder="ID Yousign / DocuSign…"
                            />
                          </label>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={busy}
                        onClick={() =>
                          void patch("sign", {
                            method: signMethod,
                            signerName: signName,
                            connectorRef,
                          })
                        }
                      >
                        Signer
                      </button>
                    </div>
                  ) : null}

                  {canManage && selected.status === "signe" ? (
                    <div className="recruit-actions__row">
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={busy}
                        onClick={() => void patch("archive")}
                      >
                        Archiver (sceau sécurisé)
                      </button>
                    </div>
                  ) : null}

                  {canManage && selected.status !== "archive" ? (
                    <>
                      <div className="docsig-panel">
                        <p className="docsig-panel__title">
                          Nouvelle version
                        </p>
                        <div className="docsig-panel__grid">
                          <label className="docsig-panel__full">
                            <span>Titre</span>
                            <input
                              value={versionTitle}
                              onChange={(e) => setVersionTitle(e.target.value)}
                              placeholder="Titre"
                            />
                          </label>
                          <label className="docsig-panel__full">
                            <span>Contenu</span>
                            <textarea
                              value={versionBody}
                              onChange={(e) => setVersionBody(e.target.value)}
                              rows={4}
                              placeholder="Contenu"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void patch("version", {
                              title: versionTitle,
                              body: versionBody,
                            })
                          }
                        >
                          Créer v{selected.currentVersion + 1}
                        </button>
                      </div>
                      <div className="docsig-panel">
                        <p className="docsig-panel__title">Connecteur</p>
                        <div className="docsig-panel__grid">
                          <label>
                            <span>Fournisseur</span>
                            <input
                              value={connProvider}
                              onChange={(e) => setConnProvider(e.target.value)}
                              placeholder="Yousign…"
                            />
                          </label>
                          <label>
                            <span>ID externe</span>
                            <input
                              value={connExternalId}
                              onChange={(e) =>
                                setConnExternalId(e.target.value)
                              }
                              placeholder="Référence"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void patch("connector", {
                              provider: connProvider,
                              externalId: connExternalId,
                            })
                          }
                        >
                          Lier connecteur
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="recruit-history">
                  <h3>Historique</h3>
                  {selected.history.length === 0 ? (
                    <p className="leads-empty" style={{ padding: "1rem" }}>
                      Aucun événement.
                    </p>
                  ) : (
                    <ol>
                      {selected.history.map((h) => (
                        <li key={h.id}>
                          <strong>{h.kind}</strong>
                          <span>
                            {formatWhen(h.at)} · {h.byName}
                          </span>
                          <p>{h.detail}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <section className="docsig-section">
                  <h3>Versions</h3>
                  <ul className="docsig-versions">
                    {selected.versions
                      .slice()
                      .reverse()
                      .map((v) => (
                        <li
                          key={v.version}
                          className={
                            v.version === selected.currentVersion
                              ? "is-current"
                              : undefined
                          }
                        >
                          <div>
                            <strong>
                              v{v.version}
                              {v.version === selected.currentVersion
                                ? " · courante"
                                : ""}
                            </strong>
                            <span>
                              {formatWhen(v.createdAt)} · {v.createdByName}
                            </span>
                          </div>
                          <code className="docsig-mono">
                            {shortHash(v.contentHash)}
                          </code>
                        </li>
                      ))}
                  </ul>
                </section>
              </>
            )}
          </article>
        </div>
      )}

      <AdminFormWizard
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        titleId="docsig-create-title"
        eyebrow="Contrats"
        title="Contrat / document contractuel agent"
        lead="Collaborateur, poste, affectation, conditions, obligations, confidentialité, signatures"
        avatar={initials(draft.title || "D")}
        steps={[
          { id: "document", label: "Document", hint: "Type & contenu" },
          { id: "parties", label: "Parties", hint: "Signataires" },
          { id: "conditions", label: "Conditions", hint: "Poste & clauses" },
          { id: "revue", label: "Revue", hint: "Contrôle" },
        ]}
        stepId={docStep}
        onStepChange={(id) =>
          setDocStep(
            id as "document" | "parties" | "conditions" | "revue",
          )
        }
        canEnterStep={canEnterDocStep}
        onStepBlocked={pulseDocError}
        shake={docShake}
        formId="docsig-create-form"
        onSubmit={(e) => void createDoc(e)}
        submitLabel="Créer v1"
        busy={creating}
        canSubmit={documentReady && partiesReady}
      >
        {docStep === "document" ? (
          <FwPanel aria-label="Document">
            <FwPanelHead
              title="Type & contenu"
              description="Le contenu est versionné (hash) à la création."
            />
            <FwBlock>
              <FwChips>
                {DOC_SIG_KINDS.map((k) => (
                  <FwChip
                    key={k}
                    selected={draft.kind === k}
                    title={DOC_SIG_KIND_LABELS[k]}
                    onClick={() => setDraft((d) => ({ ...d, kind: k }))}
                  />
                ))}
              </FwChips>
            </FwBlock>
            <FwGrid>
              <FwField label="Titre *" wide>
                <input
                  required
                  autoFocus
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, title: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Contenu contractuel *" wide>
                <textarea
                  required
                  rows={6}
                  value={draft.body}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, body: e.target.value }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {docStep === "parties" ? (
          <FwPanel aria-label="Parties">
            <FwPanelHead
              title="Parties & connecteur"
              description="Signataires requis et liaison éventuelle au fournisseur."
            />
            <FwGrid>
              <FwField label="Employé — nom">
                <input
                  value={draft.employeeName}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      employeeName: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Employé — e-mail *">
                <input
                  type="email"
                  required
                  value={draft.employeeEmail}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      employeeEmail: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Direction — nom">
                <input
                  value={draft.directionName}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      directionName: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Direction — e-mail">
                <input
                  type="email"
                  value={draft.directionEmail}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      directionEmail: e.target.value,
                    }))
                  }
                />
              </FwField>
            </FwGrid>
            <FwBlock>
              <FwChips>
                <FwChip
                  selected={draft.requireRh}
                  title="Signature RH requise"
                  hint="Slot RH ajouté"
                  onClick={() =>
                    setDraft((d) => ({ ...d, requireRh: !d.requireRh }))
                  }
                />
              </FwChips>
              {draft.requireRh ? (
                <FwOk>La validation RH sera exigée avant signature.</FwOk>
              ) : null}
            </FwBlock>
            <FwGrid>
              <FwField label="Fournisseur">
                <input
                  value={draft.connectorProvider}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      connectorProvider: e.target.value,
                    }))
                  }
                  placeholder="Yousign / DocuSign…"
                />
              </FwField>
              <FwField label="ID externe">
                <input
                  value={draft.connectorExternalId}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      connectorExternalId: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Note" wide>
                <textarea
                  rows={2}
                  value={draft.note}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, note: e.target.value }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {docStep === "conditions" ? (
          <FwPanel aria-label="Conditions">
            <FwPanelHead
              title="Poste, affectation & clauses"
              description="Informations collaborateur, conditions, obligations, confidentialité et pièces."
            />
            <FwGrid>
              <FwField label="Poste">
                <input
                  value={draft.jobTitle}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, jobTitle: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Affectation (site)">
                <input
                  value={draft.assignmentSite}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, assignmentSite: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Zone">
                <input
                  value={draft.assignmentZone}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, assignmentZone: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Conditions applicables" wide>
                <textarea
                  rows={2}
                  value={draft.conditions}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, conditions: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Obligations" wide>
                <textarea
                  rows={2}
                  value={draft.obligations}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, obligations: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Confidentialité" wide>
                <textarea
                  rows={2}
                  value={draft.confidentiality}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      confidentiality: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Pièces associées (1 par ligne)" wide>
                <textarea
                  rows={2}
                  value={draft.attachmentsText}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      attachmentsText: e.target.value,
                    }))
                  }
                  placeholder="CNI, dossier embauche, fiche de poste…"
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {docStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue avant création"
              description="Une version v1 sera créée avec hash de contenu."
            />
            <FwReview>
              <FwReviewCard
                title="Document"
                rows={[
                  {
                    label: "Type",
                    value: DOC_SIG_KIND_LABELS[draft.kind],
                  },
                  { label: "Titre", value: draft.title || "—" },
                  {
                    label: "Contenu",
                    value: draft.body
                      ? `${draft.body.slice(0, 80)}${draft.body.length > 80 ? "…" : ""}`
                      : "—",
                  },
                ]}
              />
              <FwReviewCard
                title="Parties"
                rows={[
                  {
                    label: "Employé",
                    value: `${draft.employeeName || "—"} · ${draft.employeeEmail || "—"}`,
                  },
                  {
                    label: "Direction",
                    value: `${draft.directionName || "—"} · ${draft.directionEmail || "—"}`,
                  },
                  {
                    label: "RH",
                    value: draft.requireRh ? "Requis" : "Non",
                  },
                  {
                    label: "Connecteur",
                    value: draft.connectorProvider
                      ? `${draft.connectorProvider}${draft.connectorExternalId ? ` · ${draft.connectorExternalId}` : ""}`
                      : "—",
                  },
                  { label: "Note", value: draft.note || "—" },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>
    </RhWorkspaceShell>
  );
}
