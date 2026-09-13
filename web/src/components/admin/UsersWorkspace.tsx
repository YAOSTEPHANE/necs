"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  type AdminUser,
  type UserRole,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  USER_ROLES,
  loadSettings,
  nextUserId,
  saveSettings,
} from "@/lib/settings";
import { loadSession } from "@/lib/auth";
import { loadPointageStore } from "@/lib/pointage";
import { IconUser } from "@/components/admin/Icons";
import { PageHeader, StatusBadge } from "@/components/admin/Ui";

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
    case "rh":
    case "nettoyeur":
      return "neutral";
    default: {
      const _exhaustive: never = role;
      void _exhaustive;
      return "neutral";
    }
  }
}

const emptyDraft = (id: string): AdminUser => ({
  id,
  name: "",
  email: "",
  role: "commercial",
  phone: "",
  password: "",
  active: true,
  lastLogin: "Jamais",
});

export function UsersWorkspace() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [minPassword, setMinPassword] = useState(8);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [draft, setDraft] = useState<AdminUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const refresh = () => {
    const settings = loadSettings();
    setUsers(settings.users);
    setMinPassword(settings.security.passwordMinLength || 8);
    const session = loadSession();
    setIsAdmin(session?.role === "admin");
    const pointage = loadPointageStore();
    setEmployeeOptions(
      pointage.employees
        .filter((e) => e.active)
        .map((e) => ({ id: e.id, name: e.name })),
    );
    setReady(true);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!overlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverlayOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [overlayOpen]);

  const persistUsers = (next: AdminUser[]) => {
    const settings = loadSettings();
    saveSettings({ ...settings, users: next });
    setUsers(next);
    setSavedAt(
      new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        ROLE_LABELS[u.role].toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const openCreate = () => {
    setIsNew(true);
    setError(null);
    setDraft(emptyDraft(nextUserId(users)));
    setOverlayOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setIsNew(false);
    setError(null);
    setDraft({ ...user });
    setOverlayOpen(true);
  };

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    const name = draft.name.trim();
    const email = draft.email.trim().toLowerCase();
    const password = draft.password.trim();

    if (!name || !email) {
      setError("Nom et email sont obligatoires.");
      return;
    }
    if (!email.includes("@")) {
      setError("Email invalide.");
      return;
    }
    if (password.length < minPassword) {
      setError(`Mot de passe : au moins ${minPassword} caractères.`);
      return;
    }

    const emailTaken = users.some(
      (u) =>
        u.email.trim().toLowerCase() === email &&
        (isNew || u.id !== draft.id),
    );
    if (emailTaken) {
      setError("Un compte utilise déjà cet email.");
      return;
    }

    const saved: AdminUser = {
      ...draft,
      name,
      email,
      password,
      phone: draft.phone.trim(),
      employeeId:
        draft.role === "nettoyeur" ? draft.employeeId || undefined : undefined,
    };

    const next = isNew
      ? [saved, ...users]
      : users.map((u) => (u.id === saved.id ? saved : u));

    persistUsers(next);
    setOverlayOpen(false);
    setDraft(null);
  };

  const toggleActive = (id: string) => {
    persistUsers(
      users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)),
    );
  };

  const removeUser = (id: string) => {
    if (id === "USR-001") {
      alert("Le compte administrateur principal ne peut pas être supprimé.");
      return;
    }
    if (!confirm("Supprimer définitivement cet utilisateur ?")) return;
    persistUsers(users.filter((u) => u.id !== id));
  };

  if (!ready) {
    return <p className="note">Chargement des utilisateurs…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="users-denied">
        <PageHeader
          code="USR"
          title="Utilisateurs"
          description="Gestion des comptes et des rôles"
        />
        <div className="panel-card">
          <p className="note" style={{ margin: 0 }}>
            Accès réservé aux administrateurs. Demandez à la Direction NECS
            d’attribuer le rôle Administrateur si vous devez gérer les comptes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        code={
          <span className="page-header__icon">
            <span
              className="page-header__glyph"
              style={{ ["--icon-c" as string]: "#1260a8" }}
            >
              <IconUser size={18} />
            </span>
            USR
          </span>
        }
        title="Utilisateurs & rôles"
        description="Créez des comptes admin et attribuez un rôle métier."
        actions={
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={openCreate}
          >
            + Nouvel utilisateur
          </button>
        }
      />

      {savedAt ? (
        <p className="note">Dernier enregistrement à {savedAt}</p>
      ) : null}

      <div className="users-role-grid">
        {USER_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            className={`users-role-card${roleFilter === role ? " is-active" : ""}`}
            onClick={() =>
              setRoleFilter((r) => (r === role ? "all" : role))
            }
          >
            <StatusBadge tone={roleTone(role)}>{ROLE_LABELS[role]}</StatusBadge>
            <p>{ROLE_DESCRIPTIONS[role]}</p>
            <strong>
              {users.filter((u) => u.role === role).length} compte
              {users.filter((u) => u.role === role).length > 1 ? "s" : ""}
            </strong>
          </button>
        ))}
      </div>

      <section className="panel-card">
        <div className="panel-card__head">
          <h3>Comptes ({filtered.length})</h3>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={openCreate}
          >
            + Créer
          </button>
        </div>

        <div className="doc-records-toolbar">
          <input
            type="search"
            className="doc-records-search"
            placeholder="Rechercher nom, email, rôle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="doc-records-chips">
            <button
              type="button"
              className={`doc-chip${roleFilter === "all" ? " is-active" : ""}`}
              onClick={() => setRoleFilter("all")}
            >
              Tous ({users.length})
            </button>
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: "0.85rem" }}>
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
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "var(--a-muted)",
                    }}
                  >
                    Aucun utilisateur.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
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
                          onClick={() => openEdit(u)}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          onClick={() => toggleActive(u.id)}
                        >
                          {u.active ? "Désactiver" : "Activer"}
                        </button>
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          onClick={() => removeUser(u.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {overlayOpen && draft ? (
        <div
          className="doc-overlay-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-form-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOverlayOpen(false);
          }}
        >
          <div className="settings-user-dialog">
            <div className="doc-overlay-header">
              <div>
                <h2 id="user-form-title">
                  {isNew ? "Nouvel utilisateur" : "Modifier l’utilisateur"}
                </h2>
                <p className="doc-overlay-header__sub">Compte · {draft.id}</p>
              </div>
              <button
                type="button"
                className="doc-overlay-close-btn"
                aria-label="Fermer"
                onClick={() => setOverlayOpen(false)}
              >
                ✕
              </button>
            </div>

            <form className="settings-user-form" onSubmit={onSave}>
              {error ? <p className="users-form-error">{error}</p> : null}

              <div className="settings-grid">
                <label className="settings-field">
                  <span>Nom complet *</span>
                  <input
                    required
                    autoFocus
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                    placeholder="Ex. Amina Moussa"
                  />
                </label>
                <label className="settings-field">
                  <span>Email de connexion *</span>
                  <input
                    type="email"
                    required
                    value={draft.email}
                    onChange={(e) =>
                      setDraft({ ...draft, email: e.target.value })
                    }
                    placeholder="prenom@necs.cm"
                  />
                </label>
                <label className="settings-field">
                  <span>Téléphone</span>
                  <input
                    value={draft.phone}
                    onChange={(e) =>
                      setDraft({ ...draft, phone: e.target.value })
                    }
                    placeholder="+237 6XX XX XX XX"
                  />
                </label>
                <label className="settings-field">
                  <span>Mot de passe *</span>
                  <input
                    type="text"
                    required
                    minLength={minPassword}
                    value={draft.password}
                    onChange={(e) =>
                      setDraft({ ...draft, password: e.target.value })
                    }
                    placeholder={`Min. ${minPassword} caractères`}
                  />
                </label>
                <label className="settings-field is-full">
                  <span>Rôle *</span>
                  <select
                    value={draft.role}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        role: e.target.value as UserRole,
                      })
                    }
                  >
                    {USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <em className="users-role-hint">
                    {ROLE_DESCRIPTIONS[draft.role]}
                  </em>
                </label>
                {draft.role === "nettoyeur" ? (
                  <label className="settings-field is-full">
                    <span>Employé pointage lié</span>
                    <select
                      value={draft.employeeId ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          employeeId: e.target.value || undefined,
                        })
                      }
                    >
                      <option value="">— Sélectionner —</option>
                      {employeeOptions.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.id})
                        </option>
                      ))}
                    </select>
                    <em className="users-role-hint">
                      Relie ce compte à une fiche du module Pointage.
                    </em>
                  </label>
                ) : null}
                <label className="settings-toggle is-full">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) =>
                      setDraft({ ...draft, active: e.target.checked })
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
                  onClick={() => setOverlayOpen(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-admin btn-admin--primary">
                  {isNew ? "Créer le compte" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
