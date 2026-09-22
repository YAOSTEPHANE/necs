"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  PUBLIC_IMAGE_SLOTS,
  DEFAULT_CONTENT,
  loadContent,
  resetAllPublicImages,
  resetPublicImage,
  saveContent,
  type NecsImages,
} from "@/lib/content";
import {
  type AdminSettings,
  type SocialLink,
  DEFAULT_LOGO,
  DEFAULT_SETTINGS,
  NECS_SETTINGS_EVENT,
  applySettingsImport,
  buildSettingsExport,
  fileToOptimizedDataUrl,
  loadSettings,
  resetSettings,
  saveSettings,
  settingsConfigSnapshot,
  settingsHubStats,
} from "@/lib/settings";
import { IconSettings, IconSearch } from "@/components/admin/Icons";
import { ModuleHeader } from "@/components/admin/Ui";
import { toast } from "@/lib/toast";
import { safeRouterReplace } from "@/lib/safe-navigate";
import { downloadImage, downloadText } from "@/lib/download";
import { persistOptimizedImage } from "@/lib/vercel-blob-client";

type TabId =
  | "entreprise"
  | "marque"
  | "images"
  | "utilisateurs"
  | "documents"
  | "notifications"
  | "site"
  | "securite";

type SiteContactState = {
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  contactHours: string;
  contactTitle: string;
  contactLead: string;
  footerAbout: string;
};

const TABS: Array<{ id: TabId; label: string; hint: string }> = [
  { id: "entreprise", label: "Entreprise", hint: "Identité légale & contact" },
  { id: "marque", label: "Marque", hint: "Logo, favicon & réseaux" },
  { id: "images", label: "Images site", hint: "Photos page publique" },
  { id: "utilisateurs", label: "Utilisateurs", hint: "Comptes & rôles" },
  { id: "documents", label: "Documents", hint: "Numérotation & PDF" },
  { id: "notifications", label: "Notifications", hint: "Préférences alertes" },
  { id: "site", label: "Site public", hint: "Coordonnées affichées" },
  { id: "securite", label: "Sécurité", hint: "Session & accès" },
];

const TAB_IDS = new Set<string>(TABS.map((t) => t.id));

function emptySiteContact(): SiteContactState {
  return {
    contactPhone: "",
    contactEmail: "",
    contactAddress: "",
    contactHours: "",
    contactTitle: "",
    contactLead: "",
    footerAbout: "",
  };
}

function contactFromContent(): SiteContactState {
  const c = loadContent();
  return {
    contactPhone: c.contactPhone,
    contactEmail: c.contactEmail,
    contactAddress: c.contactAddress,
    contactHours: c.contactHours,
    contactTitle: c.contactTitle,
    contactLead: c.contactLead,
    footerAbout: c.footerAbout,
  };
}

function snapshotBundle(
  settings: AdminSettings,
  siteContact: SiteContactState,
  siteImages: NecsImages,
): string {
  return JSON.stringify({
    settings: settingsConfigSnapshot(settings),
    siteContact,
    siteImages,
  });
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function SettingsWorkspace() {
  const hydrated = useHydrated();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const importRef = useRef<HTMLInputElement>(null);

  const initialTab = (() => {
    const q = searchParams.get("tab");
    return q && TAB_IDS.has(q) ? (q as TabId) : "entreprise";
  })();

  const [tab, setTab] = useState<TabId>(initialTab);
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [siteContact, setSiteContact] =
    useState<SiteContactState>(emptySiteContact);
  const [siteImages, setSiteImages] = useState<NecsImages>(() =>
    structuredClone(DEFAULT_CONTENT.images),
  );
  const [baseline, setBaseline] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [usersActive, setUsersActive] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [tabQuery, setTabQuery] = useState("");

  const captureBaseline = (
    nextSettings: AdminSettings,
    nextContact: SiteContactState,
    nextImages: NecsImages,
  ) => {
    setBaseline(snapshotBundle(nextSettings, nextContact, nextImages));
  };

  const hydrate = () => {
    const s = loadSettings();
    const contact = contactFromContent();
    const images = structuredClone(loadContent().images);
    setSettings(s);
    setSiteContact(contact);
    setSiteImages(images);
    captureBaseline(s, contact, images);
  };

  useEffect(() => {
    hydrate();
    const onSync = () => hydrate();
    window.addEventListener(NECS_SETTINGS_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(NECS_SETTINGS_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  useEffect(() => {
    const q = searchParams.get("tab");
    if (q && TAB_IDS.has(q) && q !== tab) {
      setTab(q as TabId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    void fetch("/api/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { users?: Array<{ active?: boolean }> } | null) => {
        if (!data?.users) return;
        setUsersActive(data.users.filter((u) => u.active !== false).length);
      })
      .catch(() => {
        /* offline / unauthorized */
      });
  }, []);

  const dirty = useMemo(() => {
    if (!baseline) return false;
    return snapshotBundle(settings, siteContact, siteImages) !== baseline;
  }, [baseline, settings, siteContact, siteImages]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const selectTab = (id: TabId) => {
    setTab(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    safeRouterReplace(router, `${pathname}?${params.toString()}`);
  };

  const customImages = useMemo(() => {
    return PUBLIC_IMAGE_SLOTS.filter(
      (slot) => siteImages[slot.key] !== DEFAULT_CONTENT.images[slot.key],
    ).length;
  }, [siteImages]);

  const hub = useMemo(
    () =>
      settingsHubStats(settings, {
        customImages,
        totalImages: PUBLIC_IMAGE_SLOTS.length,
        usersActive: usersActive ?? undefined,
      }),
    [settings, customImages, usersActive],
  );

  const filteredTabs = useMemo(() => {
    const q = tabQuery.trim().toLowerCase();
    if (!q) return TABS;
    return TABS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.hint.toLowerCase().includes(q) ||
        t.id.includes(q),
    );
  }, [tabQuery]);

  const onUploadBrand = async (
    kind: "logoUrl" | "faviconUrl",
    file: File | null,
  ) => {
    if (!file) return;
    setUploadError(null);
    try {
      const { url } = await persistOptimizedImage({
        file,
        folder: "branding",
        maxSize: kind === "faviconUrl" ? 96 : 320,
        optimize: fileToOptimizedDataUrl,
      });
      setSettings((s) => ({
        ...s,
        branding: { ...s.branding, [kind]: url },
      }));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Échec du chargement de l’image",
      );
    }
  };

  const markSaved = () => {
    const stamp = new Date().toLocaleTimeString("fr-FR");
    setLastSavedAt(stamp);
    toast.success(`Enregistré à ${stamp}`);
  };

  const persist = (next: AdminSettings) => {
    setSettings(next);
    saveSettings(next);
    captureBaseline(next, siteContact, siteImages);
    markSaved();
  };

  const discardChanges = () => {
    hydrate();
    setUploadError(null);
    toast.info("Modifications annulées.");
  };

  const saveBranding = (e: FormEvent) => {
    e.preventDefault();
    persist(settings);
  };

  const patchSocial = (
    id: SocialLink["id"],
    patch: Partial<Pick<SocialLink, "url" | "enabled">>,
  ) => {
    setSettings((s) => ({
      ...s,
      social: s.social.map((link) =>
        link.id === id ? { ...link, ...patch } : link,
      ),
    }));
  };

  const resetBrandAsset = (kind: "logoUrl" | "faviconUrl") => {
    setSettings((s) => ({
      ...s,
      branding: { ...s.branding, [kind]: DEFAULT_LOGO },
    }));
  };

  const onUploadSiteImage = async (
    key: keyof NecsImages,
    file: File | null,
    maxSize: number,
  ) => {
    if (!file) return;
    setUploadError(null);
    try {
      const { url } = await persistOptimizedImage({
        file,
        folder: "site",
        maxSize,
        forceJpeg: true,
        quality: 0.82,
        optimize: fileToOptimizedDataUrl,
      });
      setSiteImages((imgs) => ({ ...imgs, [key]: url }));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Échec du chargement de l’image",
      );
    }
  };

  const saveSiteImages = (e: FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    try {
      const content = loadContent();
      saveContent({ ...content, images: siteImages });
      captureBaseline(settings, siteContact, siteImages);
      markSaved();
    } catch {
      setUploadError(
        "Stockage saturé. Réduisez la taille des images ou réinitialisez-en quelques-unes.",
      );
    }
  };

  const onResetSiteImage = (key: keyof NecsImages) => {
    setSiteImages((imgs) => resetPublicImage(imgs, key));
  };

  const onResetAllSiteImages = () => {
    setSiteImages(resetAllPublicImages());
  };

  const saveCompany = (e: FormEvent) => {
    e.preventDefault();
    // Propage email / téléphone / horaires / adresse vers le site public (formulaires).
    const synced: SiteContactState = {
      ...siteContact,
      contactEmail: settings.company.email.trim() || siteContact.contactEmail,
      contactPhone: settings.company.phone.trim() || siteContact.contactPhone,
      contactHours: settings.company.hours.trim() || siteContact.contactHours,
      contactAddress:
        settings.company.address.trim() || siteContact.contactAddress,
    };
    const content = loadContent();
    saveContent({ ...content, ...synced });
    setSiteContact(synced);
    setSettings(settings);
    saveSettings(settings);
    captureBaseline(settings, synced, siteImages);
    markSaved();
  };

  const saveDocuments = (e: FormEvent) => {
    e.preventDefault();
    persist(settings);
  };

  const saveNotifications = (e: FormEvent) => {
    e.preventDefault();
    persist(settings);
  };

  const saveSecurity = (e: FormEvent) => {
    e.preventDefault();
    persist(settings);
  };

  const saveSite = (e: FormEvent) => {
    e.preventDefault();
    const content = loadContent();
    saveContent({
      ...content,
      ...siteContact,
    });
    const next = {
      ...settings,
      company: {
        ...settings.company,
        phone: siteContact.contactPhone || settings.company.phone,
        email: siteContact.contactEmail || settings.company.email,
        hours: siteContact.contactHours || settings.company.hours,
        address: siteContact.contactAddress || settings.company.address,
      },
    };
    setSettings(next);
    saveSettings(next);
    captureBaseline(next, siteContact, siteImages);
    markSaved();
  };

  const saveCurrentTab = () => {
    if (tab === "images") {
      const content = loadContent();
      saveContent({ ...content, images: siteImages });
      captureBaseline(settings, siteContact, siteImages);
      markSaved();
      return;
    }
    if (tab === "site") {
      const content = loadContent();
      saveContent({ ...content, ...siteContact });
      const next = {
        ...settings,
        company: {
          ...settings.company,
          phone: siteContact.contactPhone || settings.company.phone,
          email: siteContact.contactEmail || settings.company.email,
          hours: siteContact.contactHours || settings.company.hours,
          address: siteContact.contactAddress || settings.company.address,
        },
      };
      setSettings(next);
      saveSettings(next);
      captureBaseline(next, siteContact, siteImages);
      markSaved();
      return;
    }
    if (tab === "entreprise") {
      const synced: SiteContactState = {
        ...siteContact,
        contactEmail: settings.company.email.trim() || siteContact.contactEmail,
        contactPhone: settings.company.phone.trim() || siteContact.contactPhone,
        contactHours: settings.company.hours.trim() || siteContact.contactHours,
        contactAddress:
          settings.company.address.trim() || siteContact.contactAddress,
      };
      const content = loadContent();
      saveContent({ ...content, ...synced });
      setSiteContact(synced);
      setSettings(settings);
      saveSettings(settings);
      captureBaseline(settings, synced, siteImages);
      markSaved();
      return;
    }
    if (tab === "utilisateurs") return;
    persist(settings);
  };

  const onReset = () => {
    if (
      !confirm(
        "Réinitialiser tous les paramètres aux valeurs par défaut NECS ?",
      )
    ) {
      return;
    }
    resetSettings();
    const fresh = loadSettings();
    const contact = contactFromContent();
    const images = structuredClone(loadContent().images);
    setSettings(fresh);
    setSiteContact(contact);
    setSiteImages(images);
    captureBaseline(fresh, contact, images);
    toast.info("Paramètres réinitialisés aux valeurs NECS.");
  };

  const exportJson = () => {
    const bundle = buildSettingsExport(settings, siteContact);
    downloadText(
      JSON.stringify(bundle, null, 2),
      `necs-parametres-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json;charset=utf-8",
    );
    toast.success("Export JSON téléchargé.");
  };

  const onImportFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const { settings: next, siteContact: importedContact } =
        applySettingsImport(settings, parsed);
      setSettings(next);
      if (importedContact) {
        setSiteContact((c) => ({ ...c, ...importedContact }));
      }
      toast.success("Import chargé — enregistrez pour appliquer.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Import JSON impossible.",
      );
    }
  };

  const patchCompany = <K extends keyof AdminSettings["company"]>(
    key: K,
    value: AdminSettings["company"][K],
  ) => {
    setSettings((s) => ({
      ...s,
      company: { ...s.company, [key]: value },
    }));
  };

  const patchDocs = <K extends keyof AdminSettings["documents"]>(
    key: K,
    value: AdminSettings["documents"][K],
  ) => {
    setSettings((s) => ({
      ...s,
      documents: { ...s.documents, [key]: value },
    }));
  };

  const patchNotif = <K extends keyof AdminSettings["notifications"]>(
    key: K,
    value: AdminSettings["notifications"][K],
  ) => {
    setSettings((s) => ({
      ...s,
      notifications: { ...s.notifications, [key]: value },
    }));
  };

  const patchSec = <K extends keyof AdminSettings["security"]>(
    key: K,
    value: AdminSettings["security"][K],
  ) => {
    setSettings((s) => ({
      ...s,
      security: { ...s.security, [key]: value },
    }));
  };

  if (!hydrated) {
    return (
      <div className="settings-page" aria-busy="true">
        <div className="settings-skel settings-skel--lg" />
        <div className="settings-kpis">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="settings-skel" />
          ))}
        </div>
        <div className="settings-skel settings-skel--tabs" />
      </div>
    );
  }

  return (
    <div className={`leads-page settings-page doc-workspace${dirty ? " is-dirty" : ""}`}>
      <ModuleHeader
        tone="#475569"
        badge="Pilotage · Paramètres"
        icon={<IconSettings size={22} />}
        title="Paramètres"
        description="Hub de configuration : entreprise, marque, documents, notifications et site public."
        meta={
          <>
            <span>
              <strong>{hub.tradeName}</strong>
            </span>
            <span>
              <strong>{hub.currency}</strong>
            </span>
            <span>
              <strong>{hub.usersActive}</strong> comptes actifs
            </span>
            {lastSavedAt ? (
              <span>
                Sauvé <strong>{lastSavedAt}</strong>
              </span>
            ) : null}
            {dirty ? (
              <span className="settings-dirty-pill">Modifications en cours</span>
            ) : null}
          </>
        }
        note="Les utilisateurs sont gérés dans l’annuaire MongoDB. Export JSON sans mots de passe."
        actions={
          <>
            <a
              className="btn-admin btn-admin--ghost"
              href="/"
              target="_blank"
              rel="noreferrer"
            >
              Voir le site
            </a>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={exportJson}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => importRef.current?.click()}
            >
              Import JSON
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                void onImportFile(e.target.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={onReset}
            >
              Réinitialiser
            </button>
          </>
        }
      />

      <section className="settings-kpis" aria-label="État de la configuration">
        <article className="settings-kpi settings-kpi--accent">
          <p>Réseaux actifs</p>
          <strong>
            {hub.socialOn}/{hub.socialTotal}
          </strong>
          <span>pied de page site</span>
        </article>
        <article className="settings-kpi">
          <p>Images personnalisées</p>
          <strong>
            {hub.customImages}/{hub.totalImages}
          </strong>
          <span>slots site public</span>
        </article>
        <article className="settings-kpi">
          <p>Notifications ON</p>
          <strong>
            {hub.notifOn}/{hub.notifTotal}
          </strong>
          <span>préférences enregistrées</span>
        </article>
        <article className="settings-kpi">
          <p>Score sécurité</p>
          <strong>
            {hub.securityScore}/{hub.securityMax}
          </strong>
          <span>session · MDP · audit · 2FA · IP</span>
        </article>
      </section>

      <div className="settings-toolbar">
        <label className="settings-search">
          <IconSearch size={16} />
          <input
            type="search"
            value={tabQuery}
            onChange={(e) => setTabQuery(e.target.value)}
            placeholder="Filtrer les sections…"
            aria-label="Filtrer les sections paramètres"
          />
        </label>
        <a className="btn-admin btn-admin--ghost" href="/admin/utilisateurs">
          Utilisateurs →
        </a>
      </div>

      <nav className="settings-tabs" aria-label="Sections paramètres">
        {filteredTabs.length === 0 ? (
          <p className="settings-tabs-empty">Aucune section pour « {tabQuery} ».</p>
        ) : (
          filteredTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`settings-tab${tab === t.id ? " is-active" : ""}`}
              onClick={() => selectTab(t.id)}
            >
              <strong>{t.label}</strong>
              <span>{t.hint}</span>
            </button>
          ))
        )}
      </nav>

      <div className="settings-panel">
        {tab === "entreprise" ? (
          <form className="settings-form" onSubmit={saveCompany}>
            <div className="settings-section-head">
              <h2>Identité de l’entreprise</h2>
              <p>Informations légales affichées sur devis, contrats et factures.</p>
            </div>
            <div className="settings-grid">
              <label className="settings-field">
                <span>Raison sociale *</span>
                <input
                  required
                  value={settings.company.legalName}
                  onChange={(e) => patchCompany("legalName", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>Nom commercial</span>
                <input
                  value={settings.company.tradeName}
                  onChange={(e) => patchCompany("tradeName", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>RCCM</span>
                <input
                  value={settings.company.rccm}
                  onChange={(e) => patchCompany("rccm", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>NIF</span>
                <input
                  value={settings.company.nif}
                  onChange={(e) => patchCompany("nif", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>Téléphone</span>
                <input
                  value={settings.company.phone}
                  onChange={(e) => patchCompany("phone", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>WhatsApp</span>
                <input
                  value={settings.company.whatsapp}
                  onChange={(e) => patchCompany("whatsapp", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>Email formulaires & documents</span>
                <input
                  type="email"
                  value={settings.company.email}
                  onChange={(e) => patchCompany("email", e.target.value)}
                  placeholder="contact@necs-cm.com"
                />
                <em className="settings-field-hint">
                  Affiché sur les formulaires publics (accueil, contact) et les
                  documents.
                </em>
              </label>
              <label className="settings-field">
                <span>Horaires</span>
                <input
                  value={settings.company.hours}
                  onChange={(e) => patchCompany("hours", e.target.value)}
                />
              </label>
              <label className="settings-field is-full">
                <span>Adresse du siège</span>
                <input
                  value={settings.company.address}
                  onChange={(e) => patchCompany("address", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>Ville</span>
                <input
                  value={settings.company.city}
                  onChange={(e) => patchCompany("city", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>Pays</span>
                <input
                  value={settings.company.country}
                  onChange={(e) => patchCompany("country", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>Devise</span>
                <select
                  value={settings.company.currency}
                  onChange={(e) => patchCompany("currency", e.target.value)}
                >
                  <option>XAF (FCFA)</option>
                  <option>EUR (€)</option>
                  <option>USD ($)</option>
                </select>
              </label>
              <label className="settings-field">
                <span>Fuseau horaire</span>
                <select
                  value={settings.company.timezone}
                  onChange={(e) => patchCompany("timezone", e.target.value)}
                >
                  <option>Africa/Douala (GMT+1)</option>
                  <option>Africa/Yaounde (GMT+1)</option>
                  <option>UTC</option>
                </select>
              </label>
            </div>
            <div className="settings-actions">
              <button type="submit" className="btn-admin btn-admin--primary">
                Enregistrer l’entreprise
              </button>
            </div>
          </form>
        ) : null}

        {tab === "marque" ? (
          <form className="settings-form" onSubmit={saveBranding}>
            <div className="settings-section-head">
              <h2>Identité visuelle</h2>
              <p>
                Changez le logo (site + admin) et le favicon de l’onglet
                navigateur. Formats JPG, PNG ou WEBP · max 4 Mo.
              </p>
            </div>

            {uploadError ? (
              <p className="settings-upload-error">{uploadError}</p>
            ) : null}

            <div className="settings-brand-grid">
              <article className="settings-brand-card">
                <h3>Logo principal</h3>
                <p>Affiché dans l’en-tête, le pied de page et l’admin.</p>
                <div className="settings-brand-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.branding.logoUrl || DEFAULT_LOGO}
                    alt="Aperçu logo"
                  />
                </div>
                <div className="settings-brand-actions">
                  <label className="btn-admin btn-admin--primary settings-file-btn">
                    Changer le logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      hidden
                      onChange={(e) => {
                        void onUploadBrand(
                          "logoUrl",
                          e.target.files?.[0] ?? null,
                        );
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() => {
                      void downloadImage(
                        settings.branding.logoUrl || DEFAULT_LOGO,
                        "necs-logo",
                      ).catch(() => {
                        toast.error("Téléchargement du logo impossible.");
                      });
                    }}
                  >
                    Télécharger
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() => resetBrandAsset("logoUrl")}
                  >
                    Logo par défaut
                  </button>
                </div>
              </article>

              <article className="settings-brand-card">
                <h3>Logo de l’onglet (favicon)</h3>
                <p>Icône affichée dans l’onglet du navigateur.</p>
                <div className="settings-brand-preview settings-brand-preview--favicon">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.branding.faviconUrl || DEFAULT_LOGO}
                    alt="Aperçu favicon"
                  />
                </div>
                <div className="settings-brand-actions">
                  <label className="btn-admin btn-admin--primary settings-file-btn">
                    Changer le favicon
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                      hidden
                      onChange={(e) => {
                        void onUploadBrand(
                          "faviconUrl",
                          e.target.files?.[0] ?? null,
                        );
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() => {
                      void downloadImage(
                        settings.branding.faviconUrl || DEFAULT_LOGO,
                        "necs-favicon",
                      ).catch(() => {
                        toast.error("Téléchargement du favicon impossible.");
                      });
                    }}
                  >
                    Télécharger
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    onClick={() => resetBrandAsset("faviconUrl")}
                  >
                    Favicon par défaut
                  </button>
                </div>
              </article>
            </div>

            <div className="settings-section-head" style={{ marginTop: "1.5rem" }}>
              <h2>Réseaux sociaux</h2>
              <p>
                Activez les réseaux et collez les liens. Ils apparaissent dans le
                pied de page du site public.
              </p>
            </div>

            <div className="settings-social-list">
              {settings.social.map((link) => (
                <div key={link.id} className="settings-social-row">
                  <label className="settings-social-enable">
                    <input
                      type="checkbox"
                      checked={link.enabled}
                      onChange={(e) =>
                        patchSocial(link.id, { enabled: e.target.checked })
                      }
                    />
                    <strong>{link.label}</strong>
                  </label>
                  <input
                    type="url"
                    className="settings-social-url"
                    placeholder={`https://… (${link.label})`}
                    value={link.url}
                    disabled={!link.enabled}
                    onChange={(e) =>
                      patchSocial(link.id, { url: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="settings-actions">
              <button type="submit" className="btn-admin btn-admin--primary">
                Enregistrer la marque & les réseaux
              </button>
            </div>
          </form>
        ) : null}

        {tab === "images" ? (
          <form className="settings-form" onSubmit={saveSiteImages}>
            <div className="settings-section-head settings-section-head--row">
              <div>
                <h2>Images du site public</h2>
                <p>
                  Remplacez les photos affichées sur l’accueil et les pages
                  publiques. JPG / PNG / WEBP · max 4 Mo · optimisées
                  automatiquement.
                </p>
              </div>
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={onResetAllSiteImages}
              >
                Tout réinitialiser
              </button>
            </div>

            {uploadError ? (
              <p className="settings-upload-error">{uploadError}</p>
            ) : null}

            <div className="settings-images-grid">
              {PUBLIC_IMAGE_SLOTS.map((slot) => (
                <article key={slot.key} className="settings-image-card">
                  <h3>{slot.label}</h3>
                  <p>{slot.hint}</p>
                  <div className="settings-image-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={siteImages[slot.key]} alt={slot.label} />
                  </div>
                  <div className="settings-brand-actions">
                    <label className="btn-admin btn-admin--primary settings-file-btn">
                      Changer
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        onChange={(e) => {
                          void onUploadSiteImage(
                            slot.key,
                            e.target.files?.[0] ?? null,
                            slot.maxSize,
                          );
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() => {
                        void downloadImage(
                          siteImages[slot.key],
                          `necs-${slot.key}`,
                        ).catch(() => {
                          toast.error("Téléchargement de l’image impossible.");
                        });
                      }}
                    >
                      Télécharger
                    </button>
                    <button
                      type="button"
                      className="btn-admin btn-admin--ghost"
                      onClick={() => onResetSiteImage(slot.key)}
                    >
                      Défaut
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="settings-actions">
              <button type="submit" className="btn-admin btn-admin--primary">
                Publier les images
              </button>
              <a className="btn-admin btn-admin--ghost" href="/" target="_blank" rel="noreferrer">
                Voir le site
              </a>
            </div>
          </form>
        ) : null}

        {tab === "utilisateurs" ? (
          <div className="settings-users-redirect">
            <div className="settings-section-head">
              <h2>Utilisateurs & rôles</h2>
              <p>
                La gestion des comptes est centralisée sur la page dédiée
                (MongoDB). Créez, activez et attribuez les rôles depuis
                l’annuaire admin.
              </p>
            </div>
            <div className="settings-users-card">
              <div>
                <p className="settings-users-card__eyebrow">Annuaire NECS</p>
                <strong>Page Utilisateurs</strong>
                <p>
                  Inbox comptes, filtres par rôle, activation, lien agent
                  pointage et export CSV.
                </p>
              </div>
              <a
                href="/admin/utilisateurs"
                className="btn-admin btn-admin--primary"
              >
                Ouvrir Utilisateurs →
              </a>
            </div>
          </div>
        ) : null}

        {tab === "documents" ? (
          <form className="settings-form" onSubmit={saveDocuments}>
            <div className="settings-section-head">
              <h2>Documents métier</h2>
              <p>Préfixes de numérotation, TVA et pied de page PDF.</p>
            </div>
            <div className="settings-grid">
              <label className="settings-field">
                <span>Préfixe devis</span>
                <input
                  value={settings.documents.quotePrefix}
                  onChange={(e) => patchDocs("quotePrefix", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>Préfixe facture</span>
                <input
                  value={settings.documents.invoicePrefix}
                  onChange={(e) => patchDocs("invoicePrefix", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>Préfixe contrat</span>
                <input
                  value={settings.documents.contractPrefix}
                  onChange={(e) => patchDocs("contractPrefix", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>Préfixe mission</span>
                <input
                  value={settings.documents.missionPrefix}
                  onChange={(e) => patchDocs("missionPrefix", e.target.value)}
                />
              </label>
              <label className="settings-field">
                <span>Validité devis (jours)</span>
                <input
                  type="number"
                  min={1}
                  value={settings.documents.defaultValidityDays}
                  onChange={(e) =>
                    patchDocs("defaultValidityDays", Number(e.target.value) || 30)
                  }
                />
              </label>
              <label className="settings-field">
                <span>TVA (%) ; Cameroun</span>
                <input
                  type="number"
                  step="0.01"
                  value={settings.documents.vatRate}
                  onChange={(e) =>
                    patchDocs("vatRate", Number(e.target.value) || 0)
                  }
                />
              </label>
              <label className="settings-field is-full">
                <span>Conditions de paiement par défaut</span>
                <input
                  value={settings.documents.defaultPaymentTerms}
                  onChange={(e) =>
                    patchDocs("defaultPaymentTerms", e.target.value)
                  }
                />
              </label>
              <label className="settings-field is-full">
                <span>Pied de page PDF</span>
                <textarea
                  rows={2}
                  value={settings.documents.pdfFooter}
                  onChange={(e) => patchDocs("pdfFooter", e.target.value)}
                />
              </label>
              <label className="settings-toggle is-full">
                <input
                  type="checkbox"
                  checked={settings.documents.autoNumbering}
                  onChange={(e) => patchDocs("autoNumbering", e.target.checked)}
                />
                <div>
                  <strong>Numérotation automatique</strong>
                  <span>
                    Génère les références DEV-2026-001, FAC-2026-001… à la
                    création.
                  </span>
                </div>
              </label>
            </div>
            <div className="settings-actions">
              <button type="submit" className="btn-admin btn-admin--primary">
                Enregistrer les documents
              </button>
            </div>
          </form>
        ) : null}

        {tab === "notifications" ? (
          <form className="settings-form" onSubmit={saveNotifications}>
            <div className="settings-section-head">
              <h2>Notifications</h2>
              <p>
                Préférences d’alertes enregistrées localement. L’envoi e-mail
                automatique sera branché sur le serveur de messagerie NECS.
              </p>
            </div>
            <p className="settings-hint-banner">
              Statut : préférences prêtes · livraison e-mail en déploiement
              progressif.
            </p>
            <div className="settings-toggles">
              {(
                [
                  ["emailNewLead", "Nouvelle demande de devis (site web)"],
                  ["emailMissionAlert", "Alerte mission / planning"],
                  ["emailQualityNc", "Non-conformité qualité"],
                  ["emailInvoiceDue", "Facture échue / relance"],
                  ["emailAbsence", "Absence agent non remplacée"],
                  ["digestDaily", "Digest quotidien Direction"],
                  ["digestWeekly", "Digest hebdomadaire"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={settings.notifications[key]}
                    onChange={(e) => patchNotif(key, e.target.checked)}
                  />
                  <div>
                    <strong>{label}</strong>
                    <span>Notification e-mail automatique</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="settings-actions">
              <button type="submit" className="btn-admin btn-admin--primary">
                Enregistrer les notifications
              </button>
            </div>
          </form>
        ) : null}

        {tab === "site" ? (
          <form className="settings-form" onSubmit={saveSite}>
            <div className="settings-section-head">
              <h2>Site public</h2>
              <p>
                Coordonnées et textes affichés sur le formulaire de contact /
                devis.
              </p>
            </div>
            <div className="settings-grid">
              <label className="settings-field">
                <span>Titre contact</span>
                <input
                  value={siteContact.contactTitle}
                  onChange={(e) =>
                    setSiteContact((c) => ({
                      ...c,
                      contactTitle: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="settings-field">
                <span>Téléphone affiché</span>
                <input
                  value={siteContact.contactPhone}
                  onChange={(e) =>
                    setSiteContact((c) => ({
                      ...c,
                      contactPhone: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="settings-field is-full">
                <span>Accroche contact</span>
                <textarea
                  rows={2}
                  value={siteContact.contactLead}
                  onChange={(e) =>
                    setSiteContact((c) => ({
                      ...c,
                      contactLead: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="settings-field">
                <span>Email formulaires</span>
                <input
                  type="email"
                  value={siteContact.contactEmail}
                  onChange={(e) =>
                    setSiteContact((c) => ({
                      ...c,
                      contactEmail: e.target.value,
                    }))
                  }
                  placeholder="contact@necs-cm.com"
                />
                <em className="settings-field-hint">
                  Même valeur que « Email formulaires & documents » (Entreprise).
                </em>
              </label>
              <label className="settings-field">
                <span>Horaires</span>
                <input
                  value={siteContact.contactHours}
                  onChange={(e) =>
                    setSiteContact((c) => ({
                      ...c,
                      contactHours: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="settings-field is-full">
                <span>Adresse affichée</span>
                <input
                  value={siteContact.contactAddress}
                  onChange={(e) =>
                    setSiteContact((c) => ({
                      ...c,
                      contactAddress: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="settings-field is-full">
                <span>Texte pied de page</span>
                <textarea
                  rows={2}
                  value={siteContact.footerAbout}
                  onChange={(e) =>
                    setSiteContact((c) => ({
                      ...c,
                      footerAbout: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="settings-actions">
              <button type="submit" className="btn-admin btn-admin--primary">
                Publier sur le site
              </button>
            </div>
          </form>
        ) : null}

        {tab === "securite" ? (
          <form className="settings-form" onSubmit={saveSecurity}>
            <div className="settings-section-head">
              <h2>Sécurité & accès</h2>
              <p>
                Politique de session et mots de passe. La longueur minimale est
                appliquée à la création de comptes. 2FA / IP : options
                préparées.
              </p>
            </div>
            <p className="settings-hint-banner">
              Score actuel : {hub.securityScore}/{hub.securityMax} — activez 2FA
              et restriction IP pour renforcer.
            </p>
            <div className="settings-grid">
              <label className="settings-field">
                <span>Durée de session (minutes)</span>
                <input
                  type="number"
                  min={30}
                  max={1440}
                  value={settings.security.sessionMinutes}
                  onChange={(e) =>
                    patchSec("sessionMinutes", Number(e.target.value) || 480)
                  }
                />
              </label>
              <label className="settings-field">
                <span>Longueur min. mot de passe</span>
                <input
                  type="number"
                  min={6}
                  max={32}
                  value={settings.security.passwordMinLength}
                  onChange={(e) =>
                    patchSec("passwordMinLength", Number(e.target.value) || 8)
                  }
                />
              </label>
            </div>
            <div className="settings-toggles" style={{ marginTop: "1rem" }}>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.security.require2fa}
                  onChange={(e) => patchSec("require2fa", e.target.checked)}
                />
                <div>
                  <strong>Authentification à deux facteurs (2FA)</strong>
                  <span>Recommandé pour les comptes Administrateur & Finance.</span>
                </div>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.security.auditLog}
                  onChange={(e) => patchSec("auditLog", e.target.checked)}
                />
                <div>
                  <strong>Journal d’audit</strong>
                  <span>Trace les créations, validations et suppressions de dossiers.</span>
                </div>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.security.ipRestriction}
                  onChange={(e) => patchSec("ipRestriction", e.target.checked)}
                />
                <div>
                  <strong>Restriction IP (siège)</strong>
                  <span>Limite l’accès admin aux réseaux autorisés NECS.</span>
                </div>
              </label>
            </div>
            <div className="settings-actions">
              <button type="submit" className="btn-admin btn-admin--primary">
                Enregistrer la sécurité
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {dirty ? (
        <div className="settings-dirty-bar" role="status">
          <div>
            <strong>Modifications non enregistrées</strong>
            <span>Section « {TABS.find((t) => t.id === tab)?.label} »</span>
          </div>
          <div className="settings-dirty-bar__actions">
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={discardChanges}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={saveCurrentTab}
              disabled={tab === "utilisateurs"}
            >
              Enregistrer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
