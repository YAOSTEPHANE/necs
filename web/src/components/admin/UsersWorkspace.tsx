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
import { EmptyState, ModuleHeader, StatusBadge } from "@/components/admin/Ui";
import { toast } from "@/lib/toast";

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

  const refresh = async () => {
    const settings = loadSettings();
    setMinPassword(settings.security.passwordMinLength || 8);
    const session = loadSession();
    setIsAdmin(session?.role === "admin");
    const pointage = loadPointageStore();
    setEmployeeOptions(
      pointage.employees
        .filter((e) => e.active)
        .map((e) => ({ id: e.id, name: e.name })),
    );

    try {
      const res = await fetch("/api/users", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as { users: AdminUser[] };
        setUsers(data.users);
      } else if (res.status === 503) {
        setUsers(settings.users);
        toast.warning("MongoDB indisponible ; affichage local uniquement.");
      } else {
        setUsers([]);
      }
    } catch {
      setUsers(settings.users);
    }
    setReady(true);
  };

  useEffect(() => {
    void refresh();
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

  const persistUsersLocalMirror = (next: AdminUser[]) => {
    const settings = loadSettings();
    saveSettings({ ...settings, users: next });
    setUsers(next);
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

  const onSave = async (e: FormEvent) => {
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
    if (isNew && password.length < minPassword) {
      setError(`Mot de passe : au moins ${minPassword} caractères.`);
      return;
    }
    if (!isNew && password && password.length < minPassword) {
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

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: isNew ? undefined : draft.id,
          name,
          email,
          role: draft.role,
          phone: draft.phone.trim(),
          password: password || undefined,
          active: draft.active,
          employeeId:
            draft.role === "nettoyeur"
              ? draft.employeeId || undefined
              : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; user?: AdminUser };
      if (!res.ok || !data.user) {
        setError(data.error || "Enregistrement impossible.");
        toast.error(data.error || "Enregistrement impossible.");
        return;
      }
      const next = isNew
        ? [data.user, ...users.filter((u) => u.id !== data.user!.id)]
        : users.map((u) => (u.id === data.user!.id ? data.user! : u));
      persistUsersLocalMirror(next);
      toast.success(isNew ? "Compte créé." : "Compte mis à jour.");
      setOverlayOpen(false);
      setDraft(null);
    } catch {
      setError("Impossible de joindre le serveur.");
      toast.error("Impossible de joindre le serveur.");
    }
  };

  const toggleActive = async (id: string) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          active: !user.active,
          employeeId: user.employeeId,
        }),
      });
      const data = (await res.json()) as { error?: string; user?: AdminUser };
      if (!res.ok || !data.user) {
        toast.error(data.error || "Mise à jour impossible.");
        return;
      }
      persistUsersLocalMirror(
        users.map((u) => (u.id === data.user!.id ? data.user! : u)),
      );
      toast.success(data.user.active ? "Compte activé." : "Compte désactivé.");
    } catch {
      toast.error("Impossible de joindre le serveur.");
    }
  };

  const removeUser = async (id: string) => {
    if (id === "USR-001") {
      toast.warning(
        "Le compte administrateur principal ne peut pas être supprimé.",
      );
      return;
    }
    if (!confirm("Supprimer définitivement cet utilisateur ?")) return;
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Suppression impossible.");
        return;
      }
      persistUsersLocalMirror(users.filter((u) => u.id !== id));
      toast.success("Utilisateur supprimé.");
    } catch {
      toast.error("Impossible de joindre le serveur.");
    }
  };

  if (!ready) {
    return <p className="note">Chargement des utilisateurs…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="users-denied">
        <ModuleHeader
          tone="#1260a8"
          badge="Administration"
          icon={<IconUser size={22} />}
          title="Utilisateurs"
          description="Gestion des comptes et des rôles"
        />
        <div className="panel-card">
          <EmptyState
            title="Accès réservé"
            hint="Demandez à la Direction NECS d’attribuer le rôle Administrateur si vous devez gérer les comptes."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="doc-workspace users-page">
      <ModuleHeader
        tone="#1260a8"
        badge="Administration"
        icon={<IconUser size={22} />}
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
                <th className="cell-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="Aucun utilisateur"
                      hint="Créez un compte ou ajustez les filtres."
                      action={
                        <button
                          type="button"
                          className="btn-admin btn-admin--primary"
                          onClick={openCreate}
                        >
                          + Nouvel utilisateur
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong className="doc-ref">{u.id}</strong>
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
                    <td className="cell-actions">
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
                  <span>
                    {isNew
                      ? "Mot de passe *"
                      : "Mot de passe (laisser vide pour conserver)"}
                  </span>
                  <input
                    type="password"
                    required={isNew}
                    minLength={isNew ? minPassword : undefined}
                    value={draft.password}
                    onChange={(e) =>
                      setDraft({ ...draft, password: e.target.value })
                    }
                    placeholder={`Min. ${minPassword} caractères`}
                    autoComplete="new-password"
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
    </div>
  );
}

