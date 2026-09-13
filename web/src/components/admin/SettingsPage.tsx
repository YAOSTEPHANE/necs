"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  PUBLIC_IMAGE_SLOTS,
  loadContent,
  resetAllPublicImages,
  resetPublicImage,
  saveContent,
  type NecsImages,
} from "@/lib/content";
import {
  type AdminSettings,
  type AdminUser,
  type SocialLink,
  type UserRole,
  DEFAULT_LOGO,
  DEFAULT_SETTINGS,
  ROLE_LABELS,
  fileToOptimizedDataUrl,
  loadSettings,
  nextUserId,
  resetSettings,
  saveSettings,
} from "@/lib/settings";
import { IconSettings } from "@/components/admin/Icons";
import { StatusBadge } from "@/components/admin/Ui";
import { downloadImage } from "@/lib/download";
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

const TABS: Array<{ id: TabId; label: string; hint: string }> = [
  { id: "entreprise", label: "Entreprise", hint: "Identité légale & contact" },
  { id: "marque", label: "Marque", hint: "Logo, favicon & réseaux" },
  { id: "images", label: "Images site", hint: "Photos page publique" },
  { id: "utilisateurs", label: "Utilisateurs", hint: "Comptes & rôles" },
  { id: "documents", label: "Documents", hint: "Numérotation & PDF" },
  { id: "notifications", label: "Notifications", hint: "Alertes e-mail" },
  { id: "site", label: "Site public", hint: "Coordonnées affichées" },
  { id: "securite", label: "Sécurité", hint: "Session & accès" },
];

function roleTone(role: UserRole): "ok" | "info" | "warn" | "neutral" {
  switch (role) {
    case "admin":
      return "ok";
    case "commercial":
    case "ops":
      return "info";
    case "finance":
    case "qualite":
      return "warn";
    default:
      return "neutral";
  }
}

export function SettingsWorkspace() {
  const [tab, setTab] = useState<TabId>("entreprise");
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [userOverlay, setUserOverlay] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [siteContact, setSiteContact] = useState({
    contactPhone: "",
    contactEmail: "",
    contactAddress: "",
    contactHours: "",
    contactTitle: "",
    contactLead: "",
    footerAbout: "",
  });
  const [siteImages, setSiteImages] = useState<NecsImages>(() =>
    structuredClone(loadContent().images),
  );

  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    const c = loadContent();
    setSiteContact({
      contactPhone: c.contactPhone,
      contactEmail: c.contactEmail,
      contactAddress: c.contactAddress,
      contactHours: c.contactHours,
      contactTitle: c.contactTitle,
      contactLead: c.contactLead,
      footerAbout: c.footerAbout,
    });
    setSiteImages(structuredClone(c.images));
  }, []);

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

  useEffect(() => {
    if (!userOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserOverlay(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [userOverlay]);

  const markSaved = () => {
    setSavedAt(new Date().toLocaleTimeString("fr-FR"));
  };

  const persist = (next: AdminSettings) => {
    setSettings(next);
    saveSettings(next);
    markSaved();
  };

  const saveCompany = (e: FormEvent) => {
    e.preventDefault();
    persist(settings);
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
    // Aligner aussi le téléphone / email entreprise si utiles
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
    persist(next);
  };

  const openNewUser = () => {
    setEditingUser({
      id: nextUserId(settings.users),
      name: "",
      email: "",
      role: "commercial",
      phone: "",
      password: "",
      active: true,
      lastLogin: "Jamais",
    });
    setUserOverlay(true);
  };

  const openEditUser = (user: AdminUser) => {
    setEditingUser({ ...user });
    setUserOverlay(true);
  };

  const saveUser = (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name.trim() || !editingUser.email.trim()) {
      return;
    }
    const email = editingUser.email.trim().toLowerCase();
    const password = editingUser.password.trim();
    if (password.length < (settings.security.passwordMinLength || 8)) {
      alert(
        `Mot de passe : au moins ${settings.security.passwordMinLength || 8} caractères.`,
      );
      return;
    }
    const emailTaken = settings.users.some(
      (u) =>
        u.email.trim().toLowerCase() === email && u.id !== editingUser.id,
    );
    if (emailTaken) {
      alert("Un compte utilise déjà cet email.");
      return;
    }
    const saved: AdminUser = {
      ...editingUser,
      name: editingUser.name.trim(),
      email,
      password,
      phone: editingUser.phone.trim(),
    };
    const exists = settings.users.some((u) => u.id === saved.id);
    const users = exists
      ? settings.users.map((u) => (u.id === saved.id ? saved : u))
      : [saved, ...settings.users];
    persist({ ...settings, users });
    setUserOverlay(false);
    setEditingUser(null);
  };

  const toggleUserActive = (id: string) => {
    persist({
      ...settings,
      users: settings.users.map((u) =>
        u.id === id ? { ...u, active: !u.active } : u,
      ),
    });
  };

  const deleteUser = (id: string) => {
    if (id === "USR-001") {
      alert("Le compte administrateur principal ne peut pas être supprimé.");
      return;
    }
    if (!confirm("Supprimer définitivement cet utilisateur ?")) return;
    persist({
      ...settings,
      users: settings.users.filter((u) => u.id !== id),
    });
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
    setSettings(fresh);
    markSaved();
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

  return (
    <div className="settings-page">
      <header className="settings-hero">
        <div className="settings-hero__left">
          <span className="settings-hero__icon" aria-hidden>
            <IconSettings size={22} />
          </span>
          <div>
            <p className="settings-hero__eyebrow">Administration NECS</p>
            <h1>Paramètres</h1>
            <p className="settings-hero__sub">
              Configurez l’entreprise, les utilisateurs, la numérotation des
              documents, les notifications et le site public.
            </p>
          </div>
        </div>
        <div className="settings-hero__right">
          {savedAt ? (
            <span className="settings-saved">✓ Enregistré à {savedAt}</span>
          ) : null}
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            onClick={onReset}
          >
            Réinitialiser
          </button>
        </div>
      </header>

      <nav className="settings-tabs" aria-label="Sections paramètres">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`settings-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <strong>{t.label}</strong>
            <span>{t.hint}</span>
          </button>
        ))}
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
                <span>Email principal</span>
                <input
                  type="email"
                  value={settings.company.email}
                  onChange={(e) => patchCompany("email", e.target.value)}
                />
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
                        window.alert("Téléchargement du logo impossible.");
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
                        window.alert("Téléchargement du favicon impossible.");
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
                          window.alert(
                            "Téléchargement de l’image impossible.",
                          );
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
          <div>
            <div className="settings-section-head settings-section-head--row">
              <div>
                <h2>Utilisateurs & rôles</h2>
                <p>
                  {settings.users.length} comptes · accès par module (CRM, OPS,
                  RH, Finance…).{" "}
                  <a href="/admin/utilisateurs">Ouvrir la page dédiée →</a>
                </p>
              </div>
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={openNewUser}
              >
                + Nouvel utilisateur
              </button>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Identifiant</th>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Dernière connexion</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong style={{ color: "var(--a-blue)" }}>{u.id}</strong>
                      </td>
                      <td>
                        <div className="settings-user-cell">
                          <span className="dash-avatar sm">
                            {u.name.slice(0, 1) || "?"}
                          </span>
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <StatusBadge tone={roleTone(u.role)}>
                          {ROLE_LABELS[u.role]}
                        </StatusBadge>
                      </td>
                      <td>
                        <StatusBadge tone={u.active ? "ok" : "neutral"}>
                          {u.active ? "Actif" : "Inactif"}
                        </StatusBadge>
                      </td>
                      <td>{u.lastLogin}</td>
                      <td style={{ textAlign: "right" }}>
                        <div className="settings-row-actions">
                          <button
                            type="button"
                            className="btn-admin btn-admin--ghost"
                            onClick={() => openEditUser(u)}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="btn-admin btn-admin--ghost"
                            onClick={() => toggleUserActive(u.id)}
                          >
                            {u.active ? "Désactiver" : "Activer"}
                          </button>
                          <button
                            type="button"
                            className="btn-admin btn-admin--ghost"
                            onClick={() => deleteUser(u.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <span>TVA (%) — Cameroun</span>
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
              <p>Choisissez les alertes envoyées aux équipes NECS.</p>
            </div>
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
                <span>Email affiché</span>
                <input
                  type="email"
                  value={siteContact.contactEmail}
                  onChange={(e) =>
                    setSiteContact((c) => ({
                      ...c,
                      contactEmail: e.target.value,
                    }))
                  }
                />
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
              <p>Politique de session, mots de passe et journal d’audit.</p>
            </div>
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

      {/* Overlay utilisateur */}
      {userOverlay && editingUser ? (
        <div
          className="doc-overlay-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-overlay-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setUserOverlay(false);
          }}
        >
          <div className="settings-user-dialog">
            <div className="doc-overlay-header">
              <div>
                <h2 id="user-overlay-title">
                  {settings.users.some((u) => u.id === editingUser.id)
                    ? "Modifier l’utilisateur"
                    : "Nouvel utilisateur"}
                </h2>
                <p className="doc-overlay-header__sub">
                  Compte · {editingUser.id}
                </p>
              </div>
              <button
                type="button"
                className="doc-overlay-close-btn"
                aria-label="Fermer"
                onClick={() => setUserOverlay(false)}
              >
                ✕
              </button>
            </div>
            <form className="settings-user-form" onSubmit={saveUser}>
              <div className="settings-grid">
                <label className="settings-field">
                  <span>Nom complet *</span>
                  <input
                    required
                    autoFocus
                    value={editingUser.name}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, name: e.target.value })
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>Email *</span>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, email: e.target.value })
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>Téléphone</span>
                  <input
                    value={editingUser.phone}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, phone: e.target.value })
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>Mot de passe *</span>
                  <input
                    type="text"
                    required
                    minLength={settings.security.passwordMinLength}
                    value={editingUser.password}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        password: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>Rôle *</span>
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        role: e.target.value as UserRole,
                        employeeId:
                          e.target.value === "nettoyeur"
                            ? editingUser.employeeId
                            : undefined,
                      })
                    }
                  >
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </label>
                {editingUser.role === "nettoyeur" ? (
                  <label className="settings-field">
                    <span>ID employé pointage</span>
                    <input
                      value={editingUser.employeeId ?? ""}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          employeeId: e.target.value.trim() || undefined,
                        })
                      }
                      placeholder="EMP-001"
                    />
                  </label>
                ) : null}
                <label className="settings-toggle is-full">
                  <input
                    type="checkbox"
                    checked={editingUser.active}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        active: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <strong>Compte actif</strong>
                    <span>Peut se connecter à l’administration NECS.</span>
                  </div>
                </label>
              </div>
              <div className="settings-actions">
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  onClick={() => setUserOverlay(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-admin btn-admin--primary">
                  Enregistrer l’utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
