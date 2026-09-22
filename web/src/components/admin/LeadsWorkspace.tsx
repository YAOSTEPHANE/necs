"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ModuleHeader } from "@/components/admin/Ui";
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
  FwWarn,
  FwOk,
} from "@/components/admin/form-wizard";
import { IconMail, IconSearch } from "@/components/admin/Icons";
import { downloadCsv } from "@/lib/download";
import { toast } from "@/lib/toast";

export type LeadStatus = "nouveau" | "en_cours" | "traite";

export type SiteLead = {
  id?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status?: LeadStatus;
  at: string;
  formType?: string;
  source?: string;
  campaign?: string;
  firstSource?: string;
  firstCampaign?: string;
  medium?: string;
  pagePath?: string;
  consent?: boolean;
  consentAt?: string | null;
  touchCount?: number;
  facebookLeadId?: string;
  facebookFormId?: string;
  facebookFormName?: string;
};

type LeadFilter = "all" | "nouveau" | "en_cours" | "traite" | "devis" | "today";

type StaffCreateDraft = {
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  siteAddress: string;
  formType: "devis" | "visite" | "contact" | "autre";
  source: string;
  campaign: string;
  subject: string;
  message: string;
  consent: boolean;
};

const EMPTY_DRAFT: StaffCreateDraft = {
  name: "",
  company: "",
  email: "",
  phone: "",
  city: "",
  siteAddress: "",
  formType: "devis",
  source: "saisie_interne",
  campaign: "",
  subject: "Demande travaux locaux",
  message: "",
  consent: false,
};

const SOURCE_OPTIONS = [
  { value: "saisie_interne", label: "Saisie interne" },
  { value: "telephone", label: "Appel téléphonique" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "visite_terrain", label: "Visite terrain" },
  { value: "email", label: "E-mail reçu" },
  { value: "partenaire", label: "Partenaire / recommandation" },
] as const;

const FORM_TYPE_OPTIONS = [
  { value: "devis", label: "Devis / travaux locaux" },
  { value: "visite", label: "Visite technique" },
  { value: "contact", label: "Contact" },
  { value: "autre", label: "Autre" },
] as const;

const STATUS_LABEL: Record<LeadStatus, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  traite: "Traité",
};

function leadKey(lead: SiteLead): string {
  return lead.id || `${lead.email}::${lead.at}`;
}

function leadStatus(lead: SiteLead): LeadStatus {
  return lead.status === "en_cours" || lead.status === "traite"
    ? lead.status
    : "nouveau";
}

function initials(lead: SiteLead): string {
  const base = (lead.company || lead.name || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase() || "?";
}

function isDevis(lead: SiteLead): boolean {
  return lead.formType === "devis" || /devis/i.test(lead.subject || "");
}

function isVisite(lead: SiteLead): boolean {
  return lead.formType === "visite" || /visite/i.test(lead.subject || "");
}

function isToday(iso: string): boolean {
  try {
    const d = new Date(iso);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l’instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} j`;
    return formatWhen(iso);
  } catch {
    return iso;
  }
}

function previewMessage(message: string): string {
  const clean = message.replace(/\s+/g, " ").trim();
  if (!clean) return "Sans message";
  return clean.length > 110 ? `${clean.slice(0, 110)}…` : clean;
}

function toneForLead(lead: SiteLead): string {
  const seed = (lead.email || lead.name || "a").charCodeAt(0);
  const tones = ["#1260a8", "#0a3a72", "#c45c26", "#0f766e", "#1d4ed8", "#b45309"];
  return tones[seed % tones.length] ?? "#1260a8";
}

function kindLabel(lead: SiteLead): string {
  if (lead.formType === "devis" || isDevis(lead)) return "Devis";
  if (lead.formType === "visite" || isVisite(lead)) return "Visite";
  if (lead.formType === "contact") return "Contact";
  if (isDevis(lead)) return "Devis";
  if (isVisite(lead)) return "Visite";
  return "Contact";
}

function kindClass(lead: SiteLead): string {
  if (isDevis(lead)) return "is-devis";
  if (isVisite(lead)) return "is-visite";
  return "is-contact";
}

function whatsappHref(phone: string, lead: SiteLead): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  let intl = digits;
  if (digits.startsWith("237")) intl = digits;
  else if (digits.startsWith("0")) intl = `237${digits.slice(1)}`;
  else if (digits.length === 9) intl = `237${digits}`;
  const text = encodeURIComponent(
    `Bonjour ${lead.name || ""}, NECS revient vers vous concernant : ${lead.subject || "votre demande"}.`,
  );
  return `https://wa.me/${intl}?text=${text}`;
}

export function LeadsWorkspace({ embedded = false }: { embedded?: boolean }) {
  const [leads, setLeads] = useState<SiteLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const busyLock = useRef(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LeadFilter>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<
    "contact" | "demande" | "revue"
  >("contact");
  const [composerShake, setComposerShake] = useState(false);
  const [draft, setDraft] = useState<StaffCreateDraft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);

  function closeComposer() {
    setComposerOpen(false);
    setComposerStep("contact");
    setDraft(EMPTY_DRAFT);
  }

  function openComposer() {
    setDraft(EMPTY_DRAFT);
    setComposerStep("contact");
    setComposerOpen(true);
  }

  const refresh = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch("/api/leads", { credentials: "same-origin" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Impossible de charger les demandes.");
      }
      const data = (await res.json()) as { leads: SiteLead[] };
      const next = Array.isArray(data.leads) ? data.leads : [];
      setLeads(next);
      setSelectedKey((prev) => {
        if (prev && next.some((l) => leadKey(l) === prev)) return prev;
        return next[0] ? leadKey(next[0]) : null;
      });
      setError(null);
    } catch (err) {
      if (!silent) {
        setLeads([]);
        setSelectedKey(null);
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger les demandes.",
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh(true);
    }, 45_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!composerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeComposer();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [composerOpen]);

  const stats = useMemo(() => {
    const nouveau = leads.filter((l) => leadStatus(l) === "nouveau").length;
    const enCours = leads.filter((l) => leadStatus(l) === "en_cours").length;
    const traite = leads.filter((l) => leadStatus(l) === "traite").length;
    const devis = leads.filter(isDevis).length;
    const today = leads.filter((l) => isToday(l.at)).length;
    return {
      total: leads.length,
      nouveau,
      enCours,
      traite,
      devis,
      today,
    };
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const status = leadStatus(lead);
      if (filter === "nouveau" && status !== "nouveau") return false;
      if (filter === "en_cours" && status !== "en_cours") return false;
      if (filter === "traite" && status !== "traite") return false;
      if (filter === "devis" && !isDevis(lead)) return false;
      if (filter === "today" && !isToday(lead.at)) return false;
      if (!q) return true;
      const hay = [
        lead.name,
        lead.company,
        lead.email,
        lead.phone,
        lead.subject,
        lead.message,
        lead.source,
        lead.campaign,
        lead.firstSource,
        lead.firstCampaign,
        lead.pagePath,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [leads, filter, query]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey || !filtered.some((l) => leadKey(l) === selectedKey)) {
      setSelectedKey(leadKey(filtered[0]!));
    }
  }, [filtered, selectedKey]);

  const selected =
    filtered.find((l) => leadKey(l) === selectedKey) ?? filtered[0] ?? null;

  async function setStatus(lead: SiteLead, status: LeadStatus) {
    const key = leadKey(lead);
    if (busyKey || busyLock.current) return;
    busyLock.current = true;
    setBusyKey(key);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lead.email, at: lead.at, status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error || "Mise à jour impossible.");
        return;
      }
      setLeads((prev) =>
        prev.map((l) => (leadKey(l) === key ? { ...l, status } : l)),
      );
      toast.success(`${lead.company || lead.name} · ${STATUS_LABEL[status]}`);
    } catch {
      toast.error("Mise à jour impossible.");
    } finally {
      busyLock.current = false;
      setBusyKey(null);
    }
  }

  async function dismiss(lead: SiteLead) {
    const key = leadKey(lead);
    if (busyKey || busyLock.current) return;
    busyLock.current = true;
    setBusyKey(key);
    try {
      const res = await fetch("/api/leads", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lead.email, at: lead.at }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error || "Suppression impossible.");
        return;
      }
      setLeads((prev) => prev.filter((l) => leadKey(l) !== key));
      toast.info(`${lead.company || lead.name} · retiré`);
    } catch {
      toast.error("Suppression impossible.");
    } finally {
      busyLock.current = false;
      setBusyKey(null);
    }
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Copie impossible.");
    }
  }

  function exportLeads() {
    const header = [
      "Date",
      "Statut",
      "Type",
      "Société",
      "Nom",
      "Email",
      "Téléphone",
      "Objet",
      "Source",
      "Campagne",
      "1re source",
      "1re campagne",
      "Consentement",
      "Contacts",
      "Page",
      "Message",
    ];
    const rows = [
      header,
      ...filtered.map((l) => [
        formatWhen(l.at),
        STATUS_LABEL[leadStatus(l)],
        kindLabel(l),
        l.company,
        l.name,
        l.email,
        l.phone,
        l.subject,
        l.source || "",
        l.campaign || "",
        l.firstSource || "",
        l.firstCampaign || "",
        l.consent ? "Oui" : "Non",
        String(l.touchCount ?? 1),
        l.pagePath || "",
        l.message.replace(/\s+/g, " ").trim(),
      ]),
    ];
    downloadCsv(
      rows,
      `necs-demandes-site-${new Date().toISOString().slice(0, 10)}`,
    );
    toast.success(
      `Export CSV · ${filtered.length} demande${filtered.length > 1 ? "s" : ""}`,
    );
  }

  async function createStaffLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft.consent) {
      toast.error("Confirmez le consentement client avant d’enregistrer.");
      return;
    }
    setCreating(true);
    try {
      const subject =
        draft.subject.trim() ||
        (draft.formType === "visite"
          ? "Demande de visite technique"
          : draft.formType === "contact"
            ? "Demande de contact"
            : "Demande travaux locaux");
      const res = await fetch("/api/leads", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viaStaff: true,
          name: draft.name.trim(),
          company: draft.company.trim(),
          email: draft.email.trim().toLowerCase(),
          phone: draft.phone.trim(),
          city: draft.city.trim(),
          siteAddress: draft.siteAddress.trim(),
          formType: draft.formType,
          source: draft.source,
          campaign: draft.campaign.trim(),
          subject,
          message: draft.message.trim(),
          consent: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        created?: boolean;
        deduped?: boolean;
      };
      if (!res.ok) {
        toast.error(data.error || "Création impossible.");
        return;
      }
      toast.success(
        data.deduped
          ? `${draft.company || draft.name} · prospect mis à jour`
          : `${draft.company || draft.name} · prospect créé`,
      );
      setDraft(EMPTY_DRAFT);
      setComposerStep("contact");
      setComposerOpen(false);
      await refresh(true);
      if (draft.email.trim()) {
        setQuery(draft.email.trim().toLowerCase());
      }
    } catch {
      toast.error("Création impossible.");
    } finally {
      setCreating(false);
    }
  }

  function onListKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    if (!filtered.length || !selected) return;
    const idx = filtered.findIndex((l) => leadKey(l) === leadKey(selected));
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = filtered[Math.min(filtered.length - 1, idx + 1)];
      if (next) setSelectedKey(leadKey(next));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = filtered[Math.max(0, idx - 1)];
      if (prev) setSelectedKey(leadKey(prev));
    }
  }

  const contactReady =
    Boolean(draft.name.trim()) &&
    Boolean(draft.email.trim()) &&
    draft.email.includes("@");
  const demandeReady =
    Boolean(draft.message.trim()) && draft.consent;
  const pulseComposerError = () => {
    setComposerShake(true);
    window.setTimeout(() => setComposerShake(false), 420);
  };
  const canEnterComposerStep = (id: string) => {
    if (id === "contact") return true;
    if (id === "demande") return contactReady;
    return contactReady && demandeReady;
  };

  const filters: Array<{ id: LeadFilter; label: string; count: number }> = [
    { id: "all", label: "Toutes", count: stats.total },
    { id: "nouveau", label: "Nouveaux", count: stats.nouveau },
    { id: "en_cours", label: "En cours", count: stats.enCours },
    { id: "traite", label: "Traités", count: stats.traite },
    { id: "devis", label: "Devis", count: stats.devis },
    { id: "today", label: "Aujourd’hui", count: stats.today },
  ];

  const wa =
    selected?.phone ? whatsappHref(selected.phone, selected) : null;

  return (
    <div className={embedded ? "leads-page leads-page--embedded" : "leads-page"}>
      {embedded ? (
        <div className="dig-feature__toolbar dig-feature__toolbar--inbox">
          <p className="dig-feature__eyebrow">Capture leads site</p>
          <div className="dig-hub__inline-actions">
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={openComposer}
            >
              Nouveau prospect
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={exportLeads}
              disabled={filtered.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>
      ) : (
      <ModuleHeader
        tone="#c45c26"
        badge="Inbox site"
        icon={<IconMail size={20} />}
        title="Demandes & prospects"
        meta={
          <>
            <span>
              <strong>{stats.nouveau}</strong> nouveaux
            </span>
            <span>
              <strong>{stats.enCours}</strong> en cours
            </span>
            <span>
              <strong>{stats.today}</strong> aujourd’hui
            </span>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={openComposer}
            >
              Nouveau prospect
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={exportLeads}
              disabled={filtered.length === 0}
            >
              Export CSV
            </button>
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
      />
      )}

      <section className="leads-kpis" aria-label="Indicateurs demandes">
        <article className="leads-kpi leads-kpi--accent">
          <p>Nouveaux</p>
          <strong>{stats.nouveau}</strong>
          <span>à qualifier</span>
        </article>
        <article className="leads-kpi">
          <p>En cours</p>
          <strong>{stats.enCours}</strong>
          <span>suivi commercial</span>
        </article>
        <article className="leads-kpi">
          <p>Devis</p>
          <strong>{stats.devis}</strong>
          <span>intentions d’achat</span>
        </article>
        <article className="leads-kpi">
          <p>File totale</p>
          <strong>{stats.total}</strong>
          <span>dont {stats.traite} traités</span>
        </article>
      </section>

      {error ? (
        <div className="leads-alert" role="alert">
          <strong>Chargement interrompu</strong>
          <p>{error}</p>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={() => void refresh()}
          >
            Réessayer
          </button>
        </div>
      ) : null}

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher nom, société, email, message…"
            aria-label="Rechercher une demande"
          />
        </label>
        <div className="leads-filters" role="tablist" aria-label="Filtres">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`leads-chip${filter === f.id ? " is-active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <em>{f.count}</em>
            </button>
          ))}
        </div>
      </div>

      {loading && leads.length === 0 ? (
        <div className="leads-shell" aria-busy="true" aria-label="Chargement">
          <div className="leads-inbox">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="leads-skel" />
            ))}
          </div>
          <div className="leads-detail leads-detail--skel">
            <div className="leads-skel leads-skel--lg" />
            <div className="leads-skel" />
            <div className="leads-skel" />
            <div className="leads-skel leads-skel--block" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="leads-empty">
          <div className="leads-empty__orb" aria-hidden />
          <p className="leads-empty__eyebrow">Inbox NECS</p>
          <h2>
            {leads.length === 0
              ? "Aucune demande pour le moment"
              : "Aucun résultat pour ce filtre"}
          </h2>
          <p>
            {leads.length === 0
              ? "Dès qu’un visiteur envoie un devis ou un contact depuis le site, la demande apparaît ici avec coordonnées et message."
              : "Essayez un autre filtre ou effacez la recherche."}
          </p>
          {query || filter !== "all" ? (
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
      ) : (
        <div className="leads-shell">
          <ul
            className="leads-inbox"
            aria-label="Liste des demandes"
            tabIndex={0}
            onKeyDown={onListKeyDown}
          >
            {filtered.map((lead, index) => {
              const key = leadKey(lead);
              const active = selected ? leadKey(selected) === key : false;
              const status = leadStatus(lead);
              return (
                <li key={key} style={{ ["--i" as string]: String(index) }}>
                  <button
                    type="button"
                    className={`leads-card${active ? " is-active" : ""}${status === "nouveau" ? " is-new" : ""}`}
                    onClick={() => setSelectedKey(key)}
                    aria-current={active ? "true" : undefined}
                  >
                    <span
                      className="leads-card__avatar"
                      style={{ ["--av" as string]: toneForLead(lead) }}
                    >
                      {initials(lead)}
                    </span>
                    <span className="leads-card__body">
                      <span className="leads-card__top">
                        <strong>{lead.company || lead.name}</strong>
                        <time dateTime={lead.at}>{formatRelative(lead.at)}</time>
                      </span>
                      <span className="leads-card__mid">
                        <span className={`leads-pill ${kindClass(lead)}`}>
                          {kindLabel(lead)}
                        </span>
                        <span className={`leads-status leads-status--${status}`}>
                          {STATUS_LABEL[status]}
                        </span>
                        <span className="leads-card__subject">
                          {lead.subject || "Demande de contact"}
                        </span>
                      </span>
                      <span className="leads-card__preview">
                        {previewMessage(lead.message)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <article className="leads-detail" aria-live="polite">
              <header className="leads-detail__head">
                <div className="leads-detail__identity">
                  <span
                    className="leads-detail__avatar"
                    style={{ ["--av" as string]: toneForLead(selected) }}
                  >
                    {initials(selected)}
                  </span>
                  <div>
                    <p className="leads-detail__eyebrow">
                      <span className={`leads-pill ${kindClass(selected)}`}>
                        {kindLabel(selected)}
                      </span>
                      <span
                        className={`leads-status leads-status--${leadStatus(selected)}`}
                      >
                        {STATUS_LABEL[leadStatus(selected)]}
                      </span>
                      <time dateTime={selected.at}>
                        {formatWhen(selected.at)}
                      </time>
                    </p>
                    <h2>{selected.company || selected.name}</h2>
                    <p className="leads-detail__sub">
                      {selected.subject || "Demande de contact"}
                      {selected.name && selected.company
                        ? ` · ${selected.name}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="leads-detail__actions">
                  {leadStatus(selected) === "nouveau" ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={busyKey === leadKey(selected)}
                      onClick={() => void setStatus(selected, "en_cours")}
                    >
                      Prendre en charge
                    </button>
                  ) : null}
                  {leadStatus(selected) !== "traite" ? (
                    <button
                      type="button"
                      className="btn-admin btn-admin--primary"
                      disabled={busyKey === leadKey(selected)}
                      onClick={() => void setStatus(selected, "traite")}
                    >
                      Marquer traité
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      disabled={busyKey === leadKey(selected)}
                      onClick={() => void setStatus(selected, "en_cours")}
                    >
                      Rouvrir
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={busyKey === leadKey(selected)}
                    onClick={() => void dismiss(selected)}
                  >
                    Supprimer
                  </button>
                </div>
              </header>

              <div className="leads-detail__quick">
                {selected.email ? (
                  <>
                    <a
                      className="leads-action"
                      href={`mailto:${selected.email}?subject=${encodeURIComponent(`NECS · ${selected.subject || "Votre demande"}`)}`}
                    >
                      Écrire un e-mail
                    </a>
                    <button
                      type="button"
                      className="leads-action leads-action--ghost"
                      onClick={() => void copyText("Email", selected.email)}
                    >
                      Copier l’e-mail
                    </button>
                  </>
                ) : null}
                {selected.phone ? (
                  <>
                    <a className="leads-action" href={`tel:${selected.phone}`}>
                      Appeler
                    </a>
                    {wa ? (
                      <a
                        className="leads-action leads-action--wa"
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="leads-action leads-action--ghost"
                      onClick={() => void copyText("Téléphone", selected.phone)}
                    >
                      Copier le tél.
                    </button>
                  </>
                ) : null}
              </div>

              <dl className="leads-detail__meta">
                <div>
                  <dt>Nom</dt>
                  <dd>{selected.name || "—"}</dd>
                </div>
                <div>
                  <dt>Société</dt>
                  <dd>{selected.company || "—"}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    {selected.email ? (
                      <a href={`mailto:${selected.email}`}>{selected.email}</a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Téléphone</dt>
                  <dd>
                    {selected.phone ? (
                      <a href={`tel:${selected.phone}`}>{selected.phone}</a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Source (dernier)</dt>
                  <dd>{selected.source || "site_web"}</dd>
                </div>
                <div>
                  <dt>Campagne (dernier)</dt>
                  <dd>{selected.campaign || "—"}</dd>
                </div>
                <div>
                  <dt>1re source / campagne</dt>
                  <dd>
                    {selected.firstSource || selected.source || "site_web"}
                    {" · "}
                    {selected.firstCampaign || selected.campaign || "—"}
                  </dd>
                </div>
                <div>
                  <dt>Consentement</dt>
                  <dd>
                    {selected.consent
                      ? `Oui${selected.consentAt ? ` · ${formatWhen(selected.consentAt)}` : ""}`
                      : "Non"}
                  </dd>
                </div>
                <div>
                  <dt>Contacts cumulés</dt>
                  <dd>{selected.touchCount ?? 1}</dd>
                </div>
                <div>
                  <dt>Page d’origine</dt>
                  <dd>{selected.pagePath || "—"}</dd>
                </div>
                {selected.facebookLeadId ? (
                  <div>
                    <dt>Facebook leadgen</dt>
                    <dd>
                      {selected.facebookLeadId}
                      {selected.facebookFormName
                        ? ` · ${selected.facebookFormName}`
                        : selected.facebookFormId
                          ? ` · form ${selected.facebookFormId}`
                          : ""}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="leads-detail__message">
                <div className="leads-detail__message-head">
                  <h3>Message</h3>
                  {selected.message.trim() ? (
                    <button
                      type="button"
                      className="leads-action leads-action--ghost leads-action--sm"
                      onClick={() =>
                        void copyText("Message", selected.message.trim())
                      }
                    >
                      Copier
                    </button>
                  ) : null}
                </div>
                <pre>{selected.message.trim() || "Aucun message saisi."}</pre>
              </div>
            </article>
          ) : null}
        </div>
      )}

      <AdminFormWizard
        open={composerOpen}
        portal
        onClose={closeComposer}
        titleId="leads-overlay-title"
        eyebrow="Inbox"
        title="Nouveau prospect"
        lead="Saisie équipe hors site web. Esc ou clic hors zone pour fermer."
        steps={[
          { id: "contact", label: "Contact", hint: "Identité & locaux" },
          { id: "demande", label: "Demande", hint: "Besoin & canal" },
          { id: "revue", label: "Revue", hint: "Contrôle avant création" },
        ]}
        stepId={composerStep}
        onStepChange={(id) =>
          setComposerStep(id as "contact" | "demande" | "revue")
        }
        canEnterStep={canEnterComposerStep}
        onStepBlocked={pulseComposerError}
        shake={composerShake}
        formId="necs-lead-form"
        onSubmit={(e) => void createStaffLead(e)}
        submitLabel="Enregistrer"
        busy={creating}
        canSubmit={contactReady && demandeReady}
      >
        {composerStep === "contact" ? (
          <FwPanel aria-label="Contact">
            <FwPanelHead
              title="Identité & locaux"
              description="Contact principal et coordonnées du site."
            />
            <FwGrid>
              <FwField label="Nom contact *">
                <input
                  required
                  autoFocus
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="Ex. Jean Paul Talla"
                />
              </FwField>
              <FwField label="Société / organisation">
                <input
                  value={draft.company}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, company: e.target.value }))
                  }
                  placeholder="Ex. Cabinet ABC"
                />
              </FwField>
              <FwField label="E-mail *">
                <input
                  required
                  type="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, email: e.target.value }))
                  }
                  placeholder="contact@entreprise.cm"
                />
              </FwField>
              <FwField label="Téléphone / WhatsApp">
                <input
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, phone: e.target.value }))
                  }
                  placeholder="+237 6…"
                />
              </FwField>
              <FwField label="Ville">
                <input
                  value={draft.city}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, city: e.target.value }))
                  }
                  placeholder="Douala, Yaoundé…"
                />
              </FwField>
              <FwField label="Adresse / locaux">
                <input
                  value={draft.siteAddress}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      siteAddress: e.target.value,
                    }))
                  }
                  placeholder="Quartier, immeuble, surface…"
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "demande" ? (
          <FwPanel aria-label="Demande">
            <FwPanelHead
              title="Demande de travaux"
              description="Type, canal et besoin exprimé."
            />
            <FwBlock>
              <FwPanelHead title="Type de demande" />
              <FwChips>
                {FORM_TYPE_OPTIONS.map((opt) => (
                  <FwChip
                    key={opt.value}
                    selected={draft.formType === opt.value}
                    title={opt.label}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        formType: opt.value,
                      }))
                    }
                  />
                ))}
              </FwChips>
            </FwBlock>
            <FwBlock>
              <FwPanelHead title="Canal / source" />
              <FwChips>
                {SOURCE_OPTIONS.map((opt) => (
                  <FwChip
                    key={opt.value}
                    selected={draft.source === opt.value}
                    title={opt.label}
                    onClick={() =>
                      setDraft((d) => ({ ...d, source: opt.value }))
                    }
                  />
                ))}
              </FwChips>
            </FwBlock>
            <FwGrid>
              <FwField label="Campagne (optionnel)">
                <input
                  value={draft.campaign}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, campaign: e.target.value }))
                  }
                  placeholder="Ex. Outbound Q1"
                />
              </FwField>
              <FwField label="Objet">
                <input
                  value={draft.subject}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, subject: e.target.value }))
                  }
                  placeholder="Demande travaux locaux"
                />
              </FwField>
              <FwField label="Besoin / travaux dans les locaux *" wide>
                <textarea
                  required
                  rows={3}
                  value={draft.message}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, message: e.target.value }))
                  }
                  placeholder="Surface, fréquence, contraintes d’accès, type de locaux…"
                />
              </FwField>
            </FwGrid>
            <FwBlock>
              <FwChips>
                <FwChip
                  selected={draft.consent}
                  title="Consentement obtenu *"
                  hint="Traitement commercial"
                  onClick={() =>
                    setDraft((d) => ({ ...d, consent: !d.consent }))
                  }
                />
              </FwChips>
              {!draft.consent ? (
                <FwWarn>
                  Le consentement client est obligatoire pour enregistrer la
                  demande.
                </FwWarn>
              ) : (
                <FwOk>Consentement confirmé pour le traitement commercial.</FwOk>
              )}
            </FwBlock>
          </FwPanel>
        ) : null}

        {composerStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue avant création"
              description="Vérifiez le dossier avant enregistrement dans l’inbox."
            />
            <FwReview>
              <FwReviewCard
                title="Contact"
                rows={[
                  { label: "Nom", value: draft.name || "—" },
                  { label: "Société", value: draft.company || "—" },
                  { label: "E-mail", value: draft.email || "—" },
                  { label: "Téléphone", value: draft.phone || "—" },
                  { label: "Ville", value: draft.city || "—" },
                  { label: "Adresse", value: draft.siteAddress || "—" },
                ]}
              />
              <FwReviewCard
                title="Demande"
                rows={[
                  {
                    label: "Type",
                    value:
                      FORM_TYPE_OPTIONS.find((o) => o.value === draft.formType)
                        ?.label || draft.formType,
                  },
                  {
                    label: "Canal",
                    value:
                      SOURCE_OPTIONS.find((o) => o.value === draft.source)
                        ?.label || draft.source,
                  },
                  { label: "Campagne", value: draft.campaign || "—" },
                  { label: "Objet", value: draft.subject || "—" },
                  {
                    label: "Consentement",
                    value: draft.consent ? "Oui" : "Non",
                  },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>
    </div>
  );
}
