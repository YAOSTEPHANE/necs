"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ADMIN_DOC_NAV } from "@/lib/admin-nav";
import {
  type AdminSession,
  NECS_AUTH_EVENT,
  hasRoleSpace,
  homeForRole,
  isAgentAllowedPath,
  isNettoyeur,
  loadSession,
  logoutAdmin,
} from "@/lib/auth";
import { filterNavByRole, getRoleSpace } from "@/lib/role-spaces";
import {
  DocIcon,
  IconClock,
  IconClose,
  IconHome,
  IconMenu,
  IconSearch,
  IconSettings,
  IconUser,
  IconVisit,
  docIconTone,
} from "@/components/admin/Icons";
import { BrandLogo } from "@/components/BrandAssets";
import { ProfileMenu } from "@/components/admin/ProfileMenu";
import { ROLE_LABELS } from "@/lib/settings";

const GROUP_LABEL: Record<string, string> = {
  DIG: "Digital",
  CRM: "Commercial",
  OPS: "Opérations",
  Q: "Qualité",
  RH: "RH",
  FIN: "Finance",
  BI: "Pilotage",
};

const GROUP_TONE: Record<string, string> = {
  CRM: "#3ec8e8",
  OPS: "#8fd14a",
  Q: "#fbbf24",
  RH: "#a78bfa",
  FIN: "#60a5fa",
  DIG: "#34d399",
  BI: "#94a3b8",
};

const GROUP_ORDER = ["CRM", "OPS", "Q", "RH", "FIN", "DIG", "BI"];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`dash-side__chevron${open ? " is-open" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function pageTitle(
  pathname: string,
  agent = false,
): { eyebrow: string; title: string } {
  if (pathname.startsWith("/admin/espace")) {
    return { eyebrow: "Espace métier", title: "Mon espace" };
  }
  if (pathname.startsWith("/admin/mon-espace")) {
    return { eyebrow: "Espace agent", title: "Mon espace" };
  }
  if (pathname === "/admin") {
    return { eyebrow: "Espace Direction", title: "Tableau de bord" };
  }
  if (pathname === "/admin/utilisateurs") {
    return { eyebrow: "Administration", title: "Utilisateurs & rôles" };
  }
  if (pathname === "/admin/terrain") {
    return {
      eyebrow: agent ? "Espace agent" : "Opérations",
      title: agent ? "Photos après nettoyage" : "Photos terrain",
    };
  }
  if (pathname === "/admin/pointage") {
    return {
      eyebrow: agent ? "Espace agent" : "Opérations · RH",
      title: agent ? "Mon pointage" : "Pointage des employés",
    };
  }
  if (pathname === "/admin/parametres") {
    return { eyebrow: "Configuration", title: "Paramètres" };
  }
  if (pathname === "/admin/templates") {
    return { eyebrow: "Bibliothèque", title: "Documents & modules" };
  }
  const doc = ADMIN_DOC_NAV.find((i) => i.href === pathname);
  if (doc) {
    return {
      eyebrow: GROUP_LABEL[doc.group ?? ""] ?? "Module métier",
      title: doc.label,
    };
  }
  return { eyebrow: "Espace Direction", title: "Console NECS" };
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [navOpen, setNavOpen] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const sync = () => {
      setSession(loadSession());
      setAuthReady(true);
    };
    sync();
    window.addEventListener(NECS_AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(NECS_AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!authReady || isLoginPage || !session) return;
    if (isNettoyeur(session)) {
      if (!isAgentAllowedPath(pathname)) {
        router.replace(homeForRole("nettoyeur"));
      }
      return;
    }
    if (pathname.startsWith("/admin/mon-espace")) {
      router.replace(homeForRole(session.role));
      return;
    }
    // Rôles métier : dashboard direction → leur espace
    if (
      session.role !== "admin" &&
      hasRoleSpace(session.role) &&
      (pathname === "/admin" || pathname === "/admin/")
    ) {
      router.replace(homeForRole(session.role));
      return;
    }
    if (
      session.role !== "admin" &&
      (pathname.startsWith("/admin/utilisateurs") ||
        pathname.startsWith("/admin/parametres"))
    ) {
      router.replace(homeForRole(session.role));
    }
  }, [authReady, isLoginPage, session, pathname, router]);

  useEffect(() => {
    if (!authReady || isLoginPage) return;
    if (!session) {
      const next = encodeURIComponent(pathname || "/admin");
      router.replace(`/admin/login?next=${next}`);
    }
  }, [authReady, isLoginPage, session, pathname, router]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  const roleNavItems = useMemo(() => {
    if (!session) return ADMIN_DOC_NAV;
    return filterNavByRole(ADMIN_DOC_NAV, session.role);
  }, [session]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof ADMIN_DOC_NAV>();
    for (const item of roleNavItems) {
      const g = item.group ?? "CRM";
      const list = map.get(g) ?? [];
      list.push(item);
      map.set(g, list);
    }
    return map;
  }, [roleNavItems]);

  useEffect(() => {
    const activeGroup =
      roleNavItems.find((i) => i.href === pathname)?.group ?? null;
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const key of grouped.keys()) {
        if (next[key] === undefined) {
          next[key] = key === activeGroup || true;
        }
      }
      if (activeGroup) next[activeGroup] = true;
      return next;
    });
  }, [pathname, grouped, roleNavItems]);

  const filteredGroups = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    const keys = [
      ...GROUP_ORDER.filter((k) => grouped.has(k)),
      ...[...grouped.keys()].filter((k) => !GROUP_ORDER.includes(k)),
    ];
    return keys
      .map((group) => {
        const items = (grouped.get(group) ?? []).filter((item) => {
          if (!q) return true;
          return (
            item.label.toLowerCase().includes(q) ||
            item.code.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            (GROUP_LABEL[group] ?? group).toLowerCase().includes(q)
          );
        });
        return { group, items };
      })
      .filter((g) => g.items.length > 0);
  }, [grouped, navQuery]);

  const moduleCount = useMemo(() => {
    const docs = filteredGroups.reduce((n, g) => n + g.items.length, 0);
    if (!session) return docs;
    let extra = 0;
    if (
      session.role === "admin" ||
      session.role === "ops" ||
      session.role === "rh"
    ) {
      extra += 1; // pointage
    }
    if (
      session.role === "admin" ||
      session.role === "ops" ||
      session.role === "qualite"
    ) {
      extra += 1; // terrain
    }
    return docs + extra;
  }, [filteredGroups, session]);

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const onLogout = () => {
    logoutAdmin();
    setSession(null);
    router.replace("/admin/login");
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!authReady || !session) {
    return (
      <div className="login-page">
        <div className="login-card login-card--checking">
          Vérification de la session…
        </div>
      </div>
    );
  }

  const roleLabel = session.roleLabel || ROLE_LABELS[session.role] || session.role;
  const agentMode = isNettoyeur(session);
  const roleSpace = getRoleSpace(session.role);
  const heading = (() => {
    const base = pageTitle(pathname, agentMode);
    if (pathname.startsWith("/admin/espace") && roleSpace) {
      return { eyebrow: roleSpace.eyebrow, title: roleSpace.title };
    }
    return base;
  })();

  const showPointage =
    session.role === "admin" ||
    session.role === "ops" ||
    session.role === "rh";
  const showTerrain =
    session.role === "admin" ||
    session.role === "ops" ||
    session.role === "qualite";

  return (
    <div className={`dash-app${navOpen ? " is-nav-open" : ""}`}>
      <header className="dash-mobilebar">
        <button
          type="button"
          className="dash-mobilebar__btn"
          aria-label="Ouvrir le menu"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
        >
          <IconMenu size={20} />
        </button>
        <Link className="dash-brand" href="/admin" aria-label="NECS Admin">
          <BrandLogo alt="NECS" width={36} height={36} />
        </Link>
        <div className="dash-mobilebar__profile">
          <ProfileMenu session={session} onLogout={onLogout} compact />
        </div>
      </header>

      <button
        type="button"
        className="dash-backdrop"
        aria-label="Fermer le menu"
        tabIndex={navOpen ? 0 : -1}
        onClick={() => setNavOpen(false)}
      />

      <div className="dash-body has-side">
        <aside className="dash-side" id="dash-side-nav">
          <div className="dash-side__glow" aria-hidden />
          <div className="dash-side__mesh" aria-hidden />

          <div className="dash-side__brand-row">
            <Link
              className="dash-brand dash-side__brand"
              href="/admin"
              aria-label="NECS Admin"
            >
              <span className="dash-side__logo-wrap">
                <BrandLogo alt="NECS" width={40} height={40} />
              </span>
              <span className="dash-side__brand-text">
                <strong>NECS</strong>
                <em>
                  <i className="dash-side__live" aria-hidden />
                  Console admin
                </em>
              </span>
            </Link>
            <button
              type="button"
              className="dash-side__close"
              aria-label="Fermer le menu"
              onClick={() => setNavOpen(false)}
            >
              <IconClose size={18} />
            </button>
          </div>

          {agentMode ? null : (
            <div className="dash-side__search-wrap">
              <IconSearch size={15} />
              <input
                type="search"
                className="dash-side__search"
                placeholder="Rechercher un module…"
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                aria-label="Rechercher dans le menu"
              />
              {navQuery ? (
                <button
                  type="button"
                  className="dash-side__search-clear"
                  aria-label="Effacer la recherche"
                  onClick={() => setNavQuery("")}
                >
                  <IconClose size={12} />
                </button>
              ) : null}
            </div>
          )}

          <div className="dash-side__nav">
            {agentMode ? (
              <>
                <p className="dash-side__section-label">Mon espace</p>
                <div className="dash-side__quick">
                  <Link
                    href="/admin/mon-espace"
                    className={`dash-side__link${pathname.startsWith("/admin/mon-espace") ? " is-active" : ""}`}
                    style={{ ["--icon-c" as string]: "#3ec8e8" }}
                  >
                    <span className="dash-side__icon">
                      <IconHome size={16} />
                    </span>
                    <span className="dash-side__link-text">
                      <strong>Accueil agent</strong>
                      <small>Ma journée</small>
                    </span>
                  </Link>
                  <Link
                    href="/admin/pointage"
                    className={`dash-side__link${pathname === "/admin/pointage" ? " is-active" : ""}`}
                    style={{ ["--icon-c" as string]: "#3ec8e8" }}
                  >
                    <span className="dash-side__icon">
                      <IconClock size={16} />
                    </span>
                    <span className="dash-side__link-text">
                      <strong>Mon pointage</strong>
                      <small>Arrivée & départ</small>
                    </span>
                  </Link>
                  <Link
                    href="/admin/terrain"
                    className={`dash-side__link${pathname === "/admin/terrain" ? " is-active" : ""}`}
                    style={{ ["--icon-c" as string]: "#8fd14a" }}
                  >
                    <span className="dash-side__icon">
                      <IconVisit size={16} />
                    </span>
                    <span className="dash-side__link-text">
                      <strong>Après nettoyage</strong>
                      <small>Photos de preuve</small>
                    </span>
                  </Link>
                </div>
              </>
            ) : (
              <>
            <div className="dash-side__section-head">
              <p className="dash-side__section-label">Accueil</p>
              <span className="dash-side__count">{moduleCount}</span>
            </div>

            <div className="dash-side__quick">
              {session.role === "admin" ? (
                <Link
                  href="/admin"
                  className={`dash-side__link${pathname === "/admin" ? " is-active" : ""}`}
                  style={{ ["--icon-c" as string]: "#3ec8e8" }}
                >
                  <span className="dash-side__icon">
                    <IconHome size={16} />
                  </span>
                  <span className="dash-side__link-text">
                    <strong>Tableau de bord</strong>
                    <small>Pilotage & synthèse</small>
                  </span>
                </Link>
              ) : null}

              {roleSpace ? (
                <Link
                  href="/admin/espace"
                  className={`dash-side__link${pathname.startsWith("/admin/espace") ? " is-active" : ""}`}
                  style={{ ["--icon-c" as string]: roleSpace.accent }}
                >
                  <span className="dash-side__icon">
                    <IconHome size={16} />
                  </span>
                  <span className="dash-side__link-text">
                    <strong>Mon espace</strong>
                    <small>{roleSpace.title}</small>
                  </span>
                </Link>
              ) : null}

              {session.role === "admin" ? (
                <Link
                  href="/admin/utilisateurs"
                  className={`dash-side__link${pathname === "/admin/utilisateurs" ? " is-active" : ""}`}
                  style={{ ["--icon-c" as string]: "#7dd3fc" }}
                >
                  <span className="dash-side__icon">
                    <IconUser size={16} />
                  </span>
                  <span className="dash-side__link-text">
                    <strong>Utilisateurs</strong>
                    <small>Comptes & rôles</small>
                  </span>
                </Link>
              ) : null}

              {showTerrain ? (
                <Link
                  href="/admin/terrain"
                  className={`dash-side__link${pathname === "/admin/terrain" ? " is-active" : ""}`}
                  style={{ ["--icon-c" as string]: "#8fd14a" }}
                >
                  <span className="dash-side__icon">
                    <IconVisit size={16} />
                  </span>
                  <span className="dash-side__link-text">
                    <strong>Photos terrain</strong>
                    <small>Preuves après nettoyage</small>
                  </span>
                </Link>
              ) : null}

              {showPointage ? (
                <Link
                  href="/admin/pointage"
                  className={`dash-side__link${pathname === "/admin/pointage" ? " is-active" : ""}`}
                  style={{ ["--icon-c" as string]: "#3ec8e8" }}
                >
                  <span className="dash-side__icon">
                    <IconClock size={16} />
                  </span>
                  <span className="dash-side__link-text">
                    <strong>Pointage</strong>
                    <small>Présences employés</small>
                  </span>
                </Link>
              ) : null}

              {session.role === "admin" ? (
                <Link
                  href="/admin/parametres"
                  className={`dash-side__link${pathname === "/admin/parametres" ? " is-active" : ""}`}
                  style={{ ["--icon-c" as string]: "#94a3b8" }}
                >
                  <span className="dash-side__icon">
                    <IconSettings size={16} />
                  </span>
                  <span className="dash-side__link-text">
                    <strong>Paramètres</strong>
                    <small>Entreprise & marque</small>
                  </span>
                </Link>
              ) : null}
            </div>

            {filteredGroups.map(({ group, items }) => {
              const open = Boolean(navQuery) || Boolean(openGroups[group]);
              const tone = GROUP_TONE[group] ?? "#3ec8e8";
              return (
                <div
                  key={group}
                  className={`dash-side__group${open ? " is-open" : ""}`}
                  style={{ ["--group-c" as string]: tone }}
                >
                  <button
                    type="button"
                    className="dash-side__group-toggle"
                    onClick={() => toggleGroup(group)}
                    aria-expanded={open}
                  >
                    <i className="dash-side__group-dot" aria-hidden />
                    <span>{GROUP_LABEL[group] ?? group}</span>
                    <em>{items.length}</em>
                    <Chevron open={open} />
                  </button>
                  {open ? (
                    <div className="dash-side__group-items">
                      {items.map((item) => {
                        const active = pathname === item.href;
                        const slug = item.href.split("/").pop() ?? "";
                        const itemTone = docIconTone(slug);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`dash-side__link dash-side__link--mod${active ? " is-active" : ""}`}
                            title={item.description}
                            style={{ ["--icon-c" as string]: itemTone }}
                          >
                            <span className="dash-side__icon">
                              <DocIcon slug={slug} size={14} />
                            </span>
                            <span className="dash-side__link-text">
                              <strong>{item.label}</strong>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {filteredGroups.length === 0 && navQuery ? (
              <p className="dash-side__empty">Aucun module trouvé.</p>
            ) : null}
              </>
            )}
          </div>

          <div className="dash-side__foot">
            <div className="dash-side__session">
              <span className="dash-avatar sm" aria-hidden>
                {session.initials}
              </span>
              <div className="dash-side__session-meta">
                <strong>{session.name}</strong>
                <span>{roleLabel}</span>
              </div>
            </div>
            <Link className="dash-side__site-link" href="/">
              <span>Voir le site public</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M7 17 17 7M9 7h8v8"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </aside>

        <div className="dash-workspace">
          <header className="dash-topbar">
            <div className="dash-topbar__intro">
              <p>{heading.eyebrow}</p>
              <strong>{heading.title}</strong>
            </div>
            <div className="dash-topbar__right">
              <span className="dash-topbar__pill">{roleLabel}</span>
              <ProfileMenu session={session} onLogout={onLogout} />
            </div>
          </header>
          <main className="dash-main">{children}</main>
        </div>
      </div>
    </div>
  );
}
