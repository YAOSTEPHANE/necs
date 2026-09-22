"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { getRoleSpace } from "@/lib/role-spaces";
import { loadPointageStore } from "@/lib/pointage";
import { downloadCsv } from "@/lib/download";
import { IconSearch, IconUser } from "@/components/admin/Icons";
import { EmptyState, ModuleHeader } from "@/components/admin/Ui";
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
import { toast } from "@/lib/toast";

type StatusFilter = "all" | "active" | "inactive" | "never";

function roleTone(role: UserRole): string {
  switch (role) {
    case "admin":
      return "#1260a8";
    case "commercial":
      return "#0ea5e9";
    case "marketing":
      return "#c45c26";
    case "ops":
      return "#4faf2a";
    case "rh":
      return "#7c3aed";
    case "manager":
      return "#6d28d9";
    case "finance":
      return "#2563eb";
    case "qualite":
      return "#d97706";
    case "nettoyeur":
      return "#64748b";
    case "client":
      return "#0d9488";
    default: {
      const _exhaustive: never = role;
      void _exhaustive;
      return "#64748b";
    }
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return (parts[0] ?? "?").slice(0, 2).toUpperCase();
}

function neverLoggedIn(lastLogin: string): boolean {
  const v = (lastLogin || "").trim().toLowerCase();
  return !v || v === "jamais" || v === "never" || v === "—";
}

const emptyDraft = (id: string, role: UserRole = "commercial"): AdminUser => ({
  id,
  name: "",
  email: "",
  role,
  phone: "",
  password: "",
  active: true,
  lastLogin: "Jamais",
});

export function UsersWorkspace() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [minPassword, setMinPassword] = useState(8);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [draft, setDraft] = useState<AdminUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyLock = useRef(false);
  const [userStep, setUserStep] = useState<"identite" | "role" | "revue">(
    "identite",
  );
  const [userShake, setUserShake] = useState(false);

  const refresh = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
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
        const next = Array.isArray(data.users) ? data.users : [];
        setUsers(next);
        setSelectedId((prev) => {
          if (prev && next.some((u) => u.id === prev)) return prev;
          return next[0]?.id ?? null;
        });
        persistLocalMirror(next, false);
        setLoadError(null);
      } else if (res.status === 503) {
        setUsers(settings.users);
        setLoadError("MongoDB indisponible ; affichage local uniquement.");
        if (!silent) toast.warning("MongoDB indisponible ; affichage local.");
      } else if (res.status === 403 || res.status === 401) {
        setUsers([]);
        setIsAdmin(false);
      } else {
        setUsers([]);
        setLoadError("Impossible de charger les utilisateurs.");
      }
    } catch {
      setUsers(settings.users);
      setLoadError("Connexion serveur impossible ; données locales.");
    } finally {
      setReady(true);
      if (!silent) setLoading(false);
    }
  };

  const persistLocalMirror = (next: AdminUser[], updateState = true) => {
    const settings = loadSettings();
    saveSettings({ ...settings, users: next });
    if (updateState) setUsers(next);
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

  const stats = useMemo(() => {
    const active = users.filter((u) => u.active).length;
    const inactive = users.length - active;
    const never = users.filter((u) => neverLoggedIn(u.lastLogin)).length;
    const agents = users.filter((u) => u.role === "nettoyeur").length;
    const clients = users.filter((u) => u.role === "client").length;
    return { total: users.length, active, inactive, never, agents, clients };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active" && !u.active) return false;
      if (statusFilter === "inactive" && u.active) return false;
      if (statusFilter === "never" && !neverLoggedIn(u.lastLogin)) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        ROLE_LABELS[u.role].toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((u) => u.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const selected =
    filtered.find((u) => u.id === selectedId) ?? filtered[0] ?? null;

  const selectedSpace = selected ? getRoleSpace(selected.role) : null;

  const openCreate = (role: UserRole = "commercial") => {
    setIsNew(true);
    setError(null);
    setUserStep("identite");
    setDraft(emptyDraft(nextUserId(users), role));
    setOverlayOpen(true);
  };

  const openCreateClient = () => openCreate("client");
  const openCreateAgent = () => openCreate("nettoyeur");

  const openEdit = (user: AdminUser) => {
    setIsNew(false);
    setError(null);
    setUserStep("identite");
    setDraft({ ...user, password: "" });
    setOverlayOpen(true);
  };

  function pulseUserError() {
    setUserShake(true);
    window.setTimeout(() => setUserShake(false), 420);
  }

  const identityReady = Boolean(
    draft &&
      draft.name.trim() &&
      draft.email.trim() &&
      draft.email.includes("@"),
  );

  const passwordReady = Boolean(
    draft &&
      (!isNew || draft.password.trim().length >= minPassword) &&
      (!draft.password.trim() ||
        draft.password.trim().length >= minPassword),
  );

  const canEnterUserStep = (id: string) => {
    if (id === "identite") return true;
    if (!identityReady) return false;
    if (id === "revue") return passwordReady;
    return true;
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    const name = draft.name.trim();
    const email = draft.email.trim().toLowerCase();
    const password = draft.password.trim();

    if (!name || !email) {
      setError("Nom et email sont obligatoires.");
      setUserStep("identite");
      pulseUserError();
      return;
    }
    if (!email.includes("@")) {
      setError("Email invalide.");
      setUserStep("identite");
      pulseUserError();
      return;
    }
    if (isNew && password.length < minPassword) {
      setError(`Mot de passe : au moins ${minPassword} caractères.`);
      setUserStep("identite");
      pulseUserError();
      return;
    }
    if (!isNew && password && password.length < minPassword) {
      setError(`Mot de passe : au moins ${minPassword} caractères.`);
      setUserStep("identite");
      pulseUserError();
      return;
    }

    const emailTaken = users.some(
      (u) =>
        u.email.trim().toLowerCase() === email &&
        (isNew || u.id !== draft.id),
    );
    if (emailTaken) {
      setError("Un compte utilise déjà cet email.");
      setUserStep("identite");
      pulseUserError();
      return;
    }

    if (busyId || busyLock.current) return;
    busyLock.current = true;
    setBusyId(draft.id);
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
        pulseUserError();
        return;
      }
      const next = isNew
        ? [data.user, ...users.filter((u) => u.id !== data.user!.id)]
        : users.map((u) => (u.id === data.user!.id ? data.user! : u));
      persistLocalMirror(next);
      setSelectedId(data.user.id);
      toast.success(isNew ? "Compte créé." : "Compte mis à jour.");
      setOverlayOpen(false);
      setDraft(null);
    } catch {
      setError("Impossible de joindre le serveur.");
      toast.error("Impossible de joindre le serveur.");
      pulseUserError();
    } finally {
      busyLock.current = false;
      setBusyId(null);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    if (busyId || busyLock.current) return;
    busyLock.current = true;
    setBusyId(user.id);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, active: !user.active }),
      });
      const data = (await res.json()) as { error?: string; user?: AdminUser };
      if (!res.ok || !data.user) {
        toast.error(data.error || "Mise à jour impossible.");
        return;
      }
      persistLocalMirror(
        users.map((u) => (u.id === data.user!.id ? data.user! : u)),
      );
      toast.success(data.user.active ? "Compte activé." : "Compte désactivé.");
    } catch {
      toast.error("Impossible de joindre le serveur.");
    } finally {
      busyLock.current = false;
      setBusyId(null);
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
    if (busyId || busyLock.current) return;
    busyLock.current = true;
    setBusyId(id);
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
      persistLocalMirror(users.filter((u) => u.id !== id));
      toast.success("Utilisateur supprimé.");
    } catch {
      toast.error("Impossible de joindre le serveur.");
    } finally {
      busyLock.current = false;
      setBusyId(null);
    }
  };

  const exportUsers = () => {
    const rows = [
      [
        "ID",
        "Nom",
        "Email",
        "Téléphone",
        "Rôle",
        "Statut",
        "Dernière connexion",
        "Employé lié",
      ],
      ...filtered.map((u) => [
        u.id,
        u.name,
        u.email,
        u.phone,
        ROLE_LABELS[u.role],
        u.active ? "Actif" : "Inactif",
        u.lastLogin,
        u.employeeId || "",
      ]),
    ];
    downloadCsv(
      rows,
      `necs-utilisateurs-${new Date().toISOString().slice(0, 10)}`,
    );
    toast.success(
      `Export CSV · ${filtered.length} compte${filtered.length > 1 ? "s" : ""}`,
    );
  };

  if (!ready) {
    return (
      <div className="users-page" aria-busy="true">
        <div className="users-skel users-skel--lg" />
        <div className="users-kpis">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="users-skel" />
          ))}
        </div>
        <div className="users-shell">
          <div className="users-skel users-skel--list" />
          <div className="users-skel users-skel--block" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="users-page users-denied">
        <ModuleHeader
          tone="#1260a8"
          badge="Administration"
          icon={<IconUser size={22} />}
          title="Utilisateurs"
          description="Gestion des comptes et des rôles"
        />
        <div className="users-empty">
          <div className="users-empty__orb" aria-hidden />
          <p className="users-empty__eyebrow">Accès restreint</p>
          <h2>Réservé à la Direction</h2>
          <p>
            Demandez à un administrateur NECS d’attribuer le rôle Administrateur
            si vous devez gérer les comptes.
          </p>
        </div>
      </div>
    );
  }

  const statusChips: Array<{ id: StatusFilter; label: string; count: number }> =
    [
      { id: "all", label: "Tous", count: stats.total },
      { id: "active", label: "Actifs", count: stats.active },
      { id: "inactive", label: "Inactifs", count: stats.inactive },
      { id: "never", label: "Jamais connectés", count: stats.never },
    ];

  return (
    <div className="leads-page users-page">
      <ModuleHeader
        tone="#0a3a72"
        badge="Pilotage · Utilisateurs"
        icon={<IconUser size={22} />}
        title="Utilisateurs & rôles"
        description="Comptes d’accès NECS : équipe interne, agents terrain et portail clients."
        meta={
          <>
            <span>
              <strong>{stats.total}</strong> comptes
            </span>
            <span>
              <strong>{stats.clients}</strong> clients
            </span>
            <span>
              <strong>{stats.agents}</strong> agents
            </span>
          </>
        }
        note="Les agents terrain sont créés ici par l’admin. Les clients peuvent aussi s’inscrire seuls via /admin/inscription."
        actions={
          <>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={exportUsers}
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
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={openCreateClient}
            >
              + Compte client
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={openCreateAgent}
            >
              + Agent terrain
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={() => openCreate()}
            >
              + Nouvel utilisateur
            </button>
          </>
        }
      />

      <section className="users-kpis" aria-label="Indicateurs utilisateurs">
        <article className="users-kpi users-kpi--accent">
          <p>Comptes</p>
          <strong>{stats.total}</strong>
          <span>tous rôles confondus</span>
        </article>
        <article className="users-kpi">
          <p>Clients</p>
          <strong>{stats.clients}</strong>
          <span>portail client</span>
        </article>
        <article className="users-kpi">
          <p>Actifs</p>
          <strong>{stats.active}</strong>
          <span>peuvent se connecter</span>
        </article>
        <article className="users-kpi">
          <p>Agents</p>
          <strong>{stats.agents}</strong>
          <span>terrain</span>
        </article>
      </section>

      {loadError ? (
        <div className="users-alert" role="alert">
          <strong>Attention</strong>
          <p>{loadError}</p>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={() => void refresh()}
          >
            Réessayer
          </button>
        </div>
      ) : null}

      <div className="users-role-grid" aria-label="Filtrer par rôle">
        {USER_ROLES.map((role) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <button
              key={role}
              type="button"
              className={`users-role-card${roleFilter === role ? " is-active" : ""}`}
              style={{ ["--role-c" as string]: roleTone(role) }}
              onClick={() =>
                setRoleFilter((r) => (r === role ? "all" : role))
              }
            >
              <span className="users-role-card__badge">{ROLE_LABELS[role]}</span>
              <p>{ROLE_DESCRIPTIONS[role]}</p>
              <strong>
                {count} compte{count > 1 ? "s" : ""}
              </strong>
            </button>
          );
        })}
      </div>

      <div className="users-toolbar">
        <label className="users-search">
          <IconSearch size={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, email, téléphone, rôle…"
            aria-label="Rechercher un utilisateur"
          />
        </label>
        <div className="users-filters" role="tablist" aria-label="Statut">
          {statusChips.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === f.id}
              className={`users-chip${statusFilter === f.id ? " is-active" : ""}`}
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
              <em>{f.count}</em>
            </button>
          ))}
        </div>
      </div>

      {loading && users.length === 0 ? (
        <div className="users-shell" aria-busy="true">
          <div className="users-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="users-skel" />
            ))}
          </div>
          <div className="users-detail">
            <div className="users-skel users-skel--lg" />
            <div className="users-skel" />
            <div className="users-skel users-skel--block" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="users-empty">
          <div className="users-empty__orb" aria-hidden />
          <p className="users-empty__eyebrow">Annuaire NECS</p>
          <h2>
            {users.length === 0
              ? "Aucun utilisateur"
              : "Aucun résultat pour ce filtre"}
          </h2>
          <p>
            {users.length === 0
              ? "Créez le premier compte pour ouvrir l’accès à l’administration."
              : "Essayez un autre rôle, statut ou effacez la recherche."}
          </p>
          {users.length === 0 ? (
            <>
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={openCreateClient}
              >
                + Compte client
              </button>
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={openCreateAgent}
              >
                + Agent terrain
              </button>
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => openCreate()}
              >
                + Nouvel utilisateur
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="users-shell">
          <ul className="users-list" aria-label="Liste des utilisateurs">
            {filtered.map((u, index) => {
              const active = selected?.id === u.id;
              return (
                <li key={u.id} style={{ ["--i" as string]: String(index) }}>
                  <button
                    type="button"
                    className={`users-card${active ? " is-active" : ""}${!u.active ? " is-inactive" : ""}`}
                    onClick={() => setSelectedId(u.id)}
                    aria-current={active ? "true" : undefined}
                  >
                    <span
                      className="users-card__avatar"
                      style={{ ["--av" as string]: roleTone(u.role) }}
                    >
                      {initials(u.name)}
                    </span>
                    <span className="users-card__body">
                      <span className="users-card__top">
                        <strong>{u.name}</strong>
                        <span
                          className={`users-status ${u.active ? "is-on" : "is-off"}`}
                        >
                          {u.active ? "Actif" : "Inactif"}
                        </span>
                      </span>
                      <span className="users-card__mid">
                        <span
                          className="users-role-pill"
                          style={{ ["--role-c" as string]: roleTone(u.role) }}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                        <span className="users-card__email">{u.email}</span>
                      </span>
                      <span className="users-card__meta">
                        {u.id}
                        {" · "}
                        {neverLoggedIn(u.lastLogin)
                          ? "Jamais connecté"
                          : u.lastLogin}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <article className="users-detail" aria-live="polite">
              <header className="users-detail__head">
                <div className="users-detail__identity">
                  <span
                    className="users-detail__avatar"
                    style={{ ["--av" as string]: roleTone(selected.role) }}
                  >
                    {initials(selected.name)}
                  </span>
                  <div>
                    <p className="users-detail__eyebrow">
                      <span
                        className="users-role-pill"
                        style={{
                          ["--role-c" as string]: roleTone(selected.role),
                        }}
                      >
                        {ROLE_LABELS[selected.role]}
                      </span>
                      <span
                        className={`users-status ${selected.active ? "is-on" : "is-off"}`}
                      >
                        {selected.active ? "Actif" : "Inactif"}
                      </span>
                    </p>
                    <h2>{selected.name}</h2>
                    <p className="users-detail__sub">
                      {selected.id} · {selected.email}
                    </p>
                  </div>
                </div>
                <div className="users-detail__actions">
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={busyId === selected.id}
                    onClick={() => openEdit(selected)}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin--ghost"
                    disabled={busyId === selected.id}
                    onClick={() => void toggleActive(selected)}
                  >
                    {selected.active ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busyId === selected.id}
                    onClick={() => openEdit(selected)}
                  >
                    Mot de passe
                  </button>
                </div>
              </header>

              <dl className="users-detail__meta">
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
                  <dt>Dernière connexion</dt>
                  <dd>
                    {neverLoggedIn(selected.lastLogin)
                      ? "Jamais"
                      : selected.lastLogin}
                  </dd>
                </div>
                <div>
                  <dt>Employé pointage</dt>
                  <dd>
                    {selected.role === "nettoyeur"
                      ? selected.employeeId || "Non lié"
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Espace métier</dt>
                  <dd>
                    {selected.role === "admin"
                      ? "Direction · accès complet"
                      : selectedSpace?.title || ROLE_LABELS[selected.role]}
                  </dd>
                </div>
              </dl>

              <div className="users-detail__about">
                <h3>Périmètre du rôle</h3>
                <p>{ROLE_DESCRIPTIONS[selected.role]}</p>
                {selectedSpace ? (
                  <ul>
                    {selectedSpace.tools.map((t) => (
                      <li key={t.href}>
                        <strong>{t.label}</strong>
                        <span>{t.hint}</span>
                      </li>
                    ))}
                  </ul>
                ) : selected.role === "admin" ? (
                  <p className="users-detail__hint">
                    Accès à tous les modules, paramètres, utilisateurs et
                    demandes site.
                  </p>
                ) : selected.role === "client" ? (
                  <p className="users-detail__hint">
                    Portail client : devis, contrats et factures (espace Mon
                    espace).
                  </p>
                ) : (
                  <p className="users-detail__hint">
                    Accès agent : pointage et photos terrain (espace Mon espace).
                  </p>
                )}
              </div>

              <div className="users-detail__danger">
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost"
                  disabled={
                    busyId === selected.id || selected.id === "USR-001"
                  }
                  onClick={() => void removeUser(selected.id)}
                >
                  Supprimer le compte
                </button>
              </div>
            </article>
          ) : (
            <EmptyState
              title="Sélectionnez un compte"
              hint="Choisissez un utilisateur dans la liste pour voir le détail."
            />
          )}
        </div>
      )}

      {overlayOpen && draft ? (
        <AdminFormWizard
          open={overlayOpen}
          onClose={() => setOverlayOpen(false)}
          titleId="user-form-title"
          eyebrow="Comptes"
          title={
            isNew
              ? draft.role === "client"
                ? "Nouveau compte client"
                : "Nouvel utilisateur"
              : "Modifier l’utilisateur"
          }
          lead={
            draft.role === "client"
              ? `Portail client · ${draft.id}`
              : `Compte · ${draft.id}`
          }
          avatar={initials(draft.name || "U")}
          steps={[
            { id: "identite", label: "Identité", hint: "Nom & accès" },
            { id: "role", label: "Rôle", hint: "Périmètre & statut" },
            { id: "revue", label: "Revue", hint: "Contrôle avant enregistrement" },
          ]}
          stepId={userStep}
          onStepChange={(id) =>
            setUserStep(id as "identite" | "role" | "revue")
          }
          canEnterStep={canEnterUserStep}
          onStepBlocked={pulseUserError}
          shake={userShake}
          formId="necs-user-form"
          onSubmit={(e) => void onSave(e)}
          submitLabel={
            isNew
              ? draft.role === "client"
                ? "Créer le compte client"
                : "Créer le compte"
              : "Enregistrer"
          }
          busy={busyId === draft.id}
          canSubmit={Boolean(identityReady && passwordReady)}
        >
          {userStep === "identite" ? (
            <FwPanel aria-label="Identité">
              <FwPanelHead
                title="Identité & accès"
                description="Coordonnées de connexion. L’e-mail doit être unique."
              />
              {error ? <FwWarn>{error}</FwWarn> : null}
              <FwGrid>
                <FwField label="Nom complet *">
                  <input
                    required
                    autoFocus
                    value={draft.name}
                    onChange={(e) => {
                      setError(null);
                      setDraft({ ...draft, name: e.target.value });
                    }}
                    placeholder="Ex. Amina Moussa"
                  />
                </FwField>
                <FwField label="Email de connexion *">
                  <input
                    type="email"
                    required
                    value={draft.email}
                    onChange={(e) => {
                      setError(null);
                      setDraft({ ...draft, email: e.target.value });
                    }}
                    placeholder={
                      draft.role === "client"
                        ? "contact@entreprise.cm"
                        : "prenom@necs.cm"
                    }
                  />
                </FwField>
                <FwField label="Téléphone">
                  <input
                    value={draft.phone}
                    onChange={(e) =>
                      setDraft({ ...draft, phone: e.target.value })
                    }
                    placeholder="+237 6XX XX XX XX"
                  />
                </FwField>
                <FwField
                  label={
                    isNew
                      ? "Mot de passe *"
                      : "Nouveau mot de passe (optionnel)"
                  }
                >
                  <input
                    type="password"
                    required={isNew}
                    minLength={isNew ? minPassword : undefined}
                    value={draft.password}
                    onChange={(e) => {
                      setError(null);
                      setDraft({ ...draft, password: e.target.value });
                    }}
                    placeholder={`Min. ${minPassword} caractères`}
                    autoComplete="new-password"
                  />
                </FwField>
              </FwGrid>
            </FwPanel>
          ) : null}

          {userStep === "role" ? (
            <FwPanel aria-label="Rôle">
              <FwPanelHead
                title="Rôle & statut"
                description={ROLE_DESCRIPTIONS[draft.role]}
              />
              <FwBlock>
                <FwChips>
                  {USER_ROLES.map((r) => (
                    <FwChip
                      key={r}
                      selected={draft.role === r}
                      title={ROLE_LABELS[r]}
                      hint={ROLE_DESCRIPTIONS[r].slice(0, 42)}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          role: r,
                          employeeId:
                            r === "nettoyeur" ? draft.employeeId : undefined,
                        })
                      }
                    />
                  ))}
                </FwChips>
              </FwBlock>
              {draft.role === "nettoyeur" ? (
                <FwGrid>
                  <FwField label="Employé pointage lié" wide>
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
                      {employeeOptions.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.id})
                        </option>
                      ))}
                    </select>
                  </FwField>
                </FwGrid>
              ) : null}
              <FwBlock>
                <FwChips>
                  <FwChip
                    selected={draft.active}
                    title="Compte actif"
                    hint={
                      draft.role === "client"
                        ? "Portail client NECS"
                        : "Administration NECS"
                    }
                    onClick={() =>
                      setDraft({ ...draft, active: !draft.active })
                    }
                  />
                </FwChips>
                {draft.active ? (
                  <FwOk>
                    {draft.role === "client"
                      ? "Peut se connecter au portail client NECS."
                      : "Peut se connecter à l’administration NECS."}
                  </FwOk>
                ) : (
                  <FwWarn>Compte désactivé — connexion refusée.</FwWarn>
                )}
              </FwBlock>
            </FwPanel>
          ) : null}

          {userStep === "revue" ? (
            <FwPanel aria-label="Revue">
              <FwPanelHead
                title="Revue avant enregistrement"
                description="Vérifiez le compte avant création ou mise à jour."
              />
              {error ? <FwWarn>{error}</FwWarn> : null}
              <FwReview>
                <FwReviewCard
                  title="Identité"
                  rows={[
                    { label: "Nom", value: draft.name || "—" },
                    { label: "E-mail", value: draft.email || "—" },
                    { label: "Téléphone", value: draft.phone || "—" },
                    {
                      label: "Mot de passe",
                      value: isNew
                        ? draft.password
                          ? "Défini"
                          : "Manquant"
                        : draft.password
                          ? "Modification"
                          : "Inchangé",
                    },
                  ]}
                />
                <FwReviewCard
                  title="Rôle"
                  rows={[
                    { label: "Rôle", value: ROLE_LABELS[draft.role] },
                    {
                      label: "Statut",
                      value: draft.active ? "Actif" : "Inactif",
                    },
                    {
                      label: "Employé pointage",
                      value:
                        draft.role === "nettoyeur"
                          ? draft.employeeId || "Non lié"
                          : "—",
                    },
                  ]}
                />
              </FwReview>
            </FwPanel>
          ) : null}
        </AdminFormWizard>
      ) : null}
    </div>
  );
}
