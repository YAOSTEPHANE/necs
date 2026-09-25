"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AdminNavItem,
  type NavIconId,
  ADMIN_DOC_NAV,
  ADMIN_HOME_APPS,
  GROUP_LABEL,
  homeAppsForRole,
  isNavItemActive,
  matchesNavQuery,
  navDisplayLabel,
  navItemTone,
  searchDocNav,
} from "@/lib/admin-nav";
import {
  type AdminSession,
  NECS_AUTH_EVENT,
  hasRoleSpace,
  homeForRole,
  isAgentAllowedPath,
  isClient,
  isClientAllowedPath,
  isNettoyeur,
  loadSession,
  logoutAdmin,
  refreshSessionFromServer,
} from "@/lib/auth";
import { NECS_LEADS_CHANGED } from "@/lib/leads-events";
import { safeRouterReplace } from "@/lib/safe-navigate";
import { getRoleSpace } from "@/lib/role-spaces";
import {
  DocIcon,
  IconAlert,
  IconApps,
  IconBriefcase,
  IconCalendar,
  IconCamera,
  IconCart,
  IconChart,
  IconChecklist,
  IconClipboard,
  IconClock,
  IconClose,
  IconContact,
  IconContract,
  IconFile,
  IconFolder,
  IconHome,
  IconInterview,
  IconInvoice,
  IconMail,
  IconMenu,
  IconPackage,
  IconPen,
  IconQuality,
  IconQuote,
  IconOffer,
  IconReport,
  IconSearch,
  IconSettings,
  IconUser,
  IconUsers,
  IconVisit,
  docIconTone,
} from "@/components/admin/Icons";
import { BrandLogo } from "@/components/BrandAssets";
import { ProfileMenu } from "@/components/admin/ProfileMenu";
import { OfflineSyncBar, OfflineSyncHost } from "@/components/admin/OfflineSyncHost";

function NavIcon({ id, size = 16 }: { id?: NavIconId; size?: number }) {
  switch (id) {
    case "mail":
      return <IconMail size={size} />;
    case "contact":
      return <IconContact size={size} />;
    case "user":
      return <IconUser size={size} />;
    case "users":
      return <IconUsers size={size} />;
    case "visit":
      return <IconVisit size={size} />;
    case "quote":
      return <IconQuote size={size} />;
    case "offer":
      return <IconOffer size={size} />;
    case "chart":
      return <IconChart size={size} />;
    case "contract":
      return <IconContract size={size} />; case "folder":
      return <IconFolder size={size} />;
    case "calendar":
      return <IconCalendar size={size} />;
    case "clipboard":
      return <IconClipboard size={size} />;
    case "package":
      return <IconPackage size={size} />;
    case "cart":
      return <IconCart size={size} />;
    case "checklist":
      return <IconChecklist size={size} />;
    case "quality":
      return <IconQuality size={size} />;
    case "alert":
      return <IconAlert size={size} />;
    case "briefcase":
      return <IconBriefcase size={size} />;
    case "clock":
      return <IconClock size={size} />;
    case "interview":
      return <IconInterview size={size} />;
    case "pen":
      return <IconPen size={size} />;
    case "camera":
      return <IconCamera size={size} />;
    case "report":
      return <IconReport size={size} />;
    case "invoice":
      return <IconInvoice size={size} />;
    case "library":
      return <IconFile size={size} />;
    case "settings":
      return <IconSettings size={size} />;
    case "space":
      return <IconApps size={size} />;
    case "home":
    default:
      return <IconHome size={size} />;
  }
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
  if (pathname === "/admin" || pathname === "/admin/") {
    return { eyebrow: "Espace Direction", title: "Tableau de bord" };
  }
  if (pathname.startsWith("/admin/demandes")) {
    return { eyebrow: "Digital", title: "Demandes digitales" };
  }
  if (pathname.startsWith("/admin/logistique")) {
    return { eyebrow: "Opérations / Logistique", title: "Logistique" };
  }
  if (pathname.startsWith("/admin/achat")) {
    return { eyebrow: "Achats", title: "Achats" };
  }
  if (pathname.startsWith("/admin/qualite")) {
    return { eyebrow: "Qualité", title: "Qualité" };
  }
  if (pathname.startsWith("/admin/direction")) {
    return { eyebrow: "Direction", title: "Direction" };
  }
  if (pathname.startsWith("/admin/juridique")) {
    return { eyebrow: "Juridique", title: "Juridique" };
  }
  if (pathname.startsWith("/admin/operations")) {
    return {
      eyebrow: agent ? "Espace agent" : "Opérations",
      title: agent ? "Mon terrain" : "Opérations",
    };
  }
  if (pathname.startsWith("/admin/documents-signatures")) {
    return {
      eyebrow: agent ? "Espace agent" : "RH",
      title: agent ? "Mes documents" : "Documents & signatures",
    };
  }
  if (pathname.startsWith("/admin/rh")) {
    return {
      eyebrow: agent ? "Espace agent" : "RH",
      title: agent ? "Mes documents" : "Ressources humaines",
    };
  }
  if (pathname.startsWith("/admin/finance")) {
    return { eyebrow: "Finance", title: "Finance" };
  }
  if (pathname.startsWith("/admin/commercial") || pathname.startsWith("/admin/crm")) {
    return {
      eyebrow: "CRM / Commercial",
      title: "CRM",
    };
  }
  if (pathname.startsWith("/admin/clients/nouveau")) {
    return { eyebrow: "Commercial", title: "Nouveau client" };
  }
  if (pathname.startsWith("/admin/clients")) {
    return { eyebrow: "Commercial", title: "Clients" };
  }
  if (pathname.startsWith("/admin/utilisateurs")) {
    return { eyebrow: "Administration", title: "Utilisateurs & rôles" };
  }
  if (pathname.startsWith("/admin/terrain")) {
    return {
      eyebrow: agent ? "Espace agent" : "Opérations",
      title: agent ? "Photos après nettoyage" : "Photos terrain",
    };
  }
  if (pathname.startsWith("/admin/pointage")) {
    return {
      eyebrow: agent ? "Espace agent" : "Opérations",
      title: agent ? "Mon pointage" : "Pointage des employés",
    };
  }
  if (pathname.startsWith("/admin/parametres")) {
    return { eyebrow: "Configuration", title: "Paramètres" };
  }
  if (pathname === "/admin/templates") {
    return { eyebrow: "Bibliothèque", title: "Documents & modules" };
  }
  const app = ADMIN_HOME_APPS.find((item) => {
    if (item.href === "/admin") return false;
    return isNavItemActive(item, pathname);
  });
  if (app) {
    return {
      eyebrow: "Module",
      title: app.label,
    };
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

function SideLink({
  item,
  pathname,
  search,
  badge,
  onNavigate,
  compact,
}: {
  item: AdminNavItem;
  pathname: string;
  search?: string;
  badge?: number;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const active = isNavItemActive(item, pathname, search);
  const tone = navItemTone(item);
  const label = navDisplayLabel(item, compact);
  return (
    <Link
      href={item.href}
      className={`dash-side__link${active ? " is-active" : ""}`}
      style={{ ["--icon-c" as string]: tone }}
      title={item.description ? `${item.label} — ${item.description}` : item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      <span className="dash-side__icon">
        <NavIcon id={item.icon} size={16} />
      </span>
      <span className="dash-side__link-text">
        <strong>{label}</strong>
      </span>
      {badge && badge > 0 ? (
        <em className="dash-side__badge is-dot" aria-label="Nouveaux éléments" />
      ) : null}
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const router = useRouter();
  /** Pages login / inscription / reset : shell sans sidebar ni redirections métier. */
  const isAuthPage =
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/inscription") ||
    pathname.startsWith("/admin/mot-de-passe-oublie") ||
    pathname.startsWith("/admin/reinitialiser-mot-de-passe");
  // Alias HMR : d’anciens chunks Turbopack référencent encore isLoginPage.
  const isLoginPage = isAuthPage;
  const searchRef = useRef<HTMLInputElement>(null);
  const sideNavRef = useRef<HTMLElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [leadsOpenCount, setLeadsOpenCount] = useState(0);
  const [navQuery, setNavQuery] = useState("");

  useEffect(() => {
    try {
      setSideCollapsed(
        localStorage.getItem("necs-admin-side-collapsed") === "1",
      );
    } catch {
      /* ignore */
    }
  }, []);

  const canSeeLeads =
    session?.role === "admin" ||
    session?.role === "commercial" ||
    session?.role === "marketing" ||
    session?.role === "qualite";

  useEffect(() => {
    if (!canSeeLeads) {
      setLeadsOpenCount(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/leads?meta=1", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { open?: number; nouveau?: number };
        if (!cancelled) {
          setLeadsOpenCount(Number(data.open ?? data.nouveau ?? 0) || 0);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    window.addEventListener(NECS_LEADS_CHANGED, load);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener(NECS_LEADS_CHANGED, load);
    };
  }, [canSeeLeads, pathname]);

  const toggleSideCollapsed = () => {
    setSideCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("necs-admin-side-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      // Sur login / inscription : pas de sonde serveur (évite appels inutiles).
      if (isAuthPage) {
        if (!cancelled) {
          setSession(null);
          setAuthReady(true);
        }
        return;
      }
      const fromServer = await refreshSessionFromServer();
      if (cancelled) return;
      setSession(fromServer);
      setAuthReady(true);
    };
    void sync();
    const onAuth = () => setSession(loadSession());
    window.addEventListener(NECS_AUTH_EVENT, onAuth);
    window.addEventListener("storage", onAuth);
    return () => {
      cancelled = true;
      window.removeEventListener(NECS_AUTH_EVENT, onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, [isAuthPage]);

  useEffect(() => {
    if (!authReady || isAuthPage || isLoginPage || !session) return;
    if (isNettoyeur(session)) {
      if (!isAgentAllowedPath(pathname)) {
        safeRouterReplace(router, homeForRole("nettoyeur"));
      }
      return;
    }
    if (isClient(session)) {
      if (!isClientAllowedPath(pathname)) {
        safeRouterReplace(router, homeForRole("client"));
      }
      return;
    }
    if (pathname.startsWith("/admin/mon-espace")) {
      safeRouterReplace(router, homeForRole(session.role));
      return;
    }
    if (
      session.role !== "admin" &&
      hasRoleSpace(session.role) &&
      (pathname === "/admin" || pathname === "/admin/")
    ) {
      safeRouterReplace(router, homeForRole(session.role));
      return;
    }
    if (
      session.role !== "admin" &&
      (pathname.startsWith("/admin/utilisateurs") ||
        pathname.startsWith("/admin/parametres"))
    ) {
      safeRouterReplace(router, homeForRole(session.role));
    }
  }, [authReady, isAuthPage, isLoginPage, session, pathname, router]);

  useEffect(() => {
    if (!authReady) return;
    // Garde explicite sur le pathname (évite un bounce login ↔ inscription).
    if (
      pathname.startsWith("/admin/login") ||
      pathname.startsWith("/admin/inscription") ||
      pathname.startsWith("/admin/mot-de-passe-oublie") ||
      pathname.startsWith("/admin/reinitialiser-mot-de-passe") ||
      isLoginPage
    ) {
      return;
    }
    if (!session) {
      const next = encodeURIComponent(pathname || "/admin");
      safeRouterReplace(router, `/admin/login?next=${next}`);
    }
  }, [authReady, isLoginPage, session, pathname, router]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const root = sideNavRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>(".dash-side__link.is-active");
    if (!active) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => {
      active.scrollIntoView({
        block: "nearest",
        behavior: reduce ? "auto" : "smooth",
      });
    });
  }, [pathname, search, sideCollapsed, navQuery]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const root = sideNavRef.current;
    const focusables = root?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled])',
    );
    const first = focusables?.[0];
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (sideCollapsed) {
          setSideCollapsed(false);
          try {
            localStorage.setItem("necs-admin-side-collapsed", "0");
          } catch {
            /* ignore */
          }
        }
        setNavOpen(true);
        window.setTimeout(() => searchRef.current?.focus(), 40);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sideCollapsed]);

  const homeLinks = useMemo(() => {
    if (!session) return [];
    return homeAppsForRole(session.role);
  }, [session]);

  const filteredHome = useMemo(() => {
    if (!navQuery.trim()) return homeLinks;
    return homeLinks.filter((item) => matchesNavQuery(item, navQuery));
  }, [homeLinks, navQuery]);

  const docHits = useMemo(() => {
    if (!navQuery.trim() || !session || isNettoyeur(session)) return [];
    return searchDocNav(navQuery);
  }, [navQuery, session]);

  const searchEmpty =
    Boolean(navQuery.trim()) &&
    filteredHome.length === 0 &&
    docHits.length === 0;

  const onLogout = () => {
    void logoutAdmin().then(() => {
      setSession(null);
      safeRouterReplace(router, "/admin/login");
    });
  };

  if (isAuthPage) {
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

  const agentMode = isNettoyeur(session);
  const roleSpace = getRoleSpace(session.role);
  const heading = (() => {
    const base = pageTitle(pathname, agentMode);
    if (pathname.startsWith("/admin/espace") && roleSpace) {
      return { eyebrow: roleSpace.eyebrow, title: roleSpace.title };
    }
    return base;
  })();

  return (
    <OfflineSyncHost>
    <div
      className={`dash-app${navOpen ? " is-nav-open" : ""}${sideCollapsed ? " is-side-collapsed" : ""}`}
    >
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
        <div className="dash-mobilebar__actions">
          <OfflineSyncBar />
          <Link
            className="dash-mobilebar__site"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Voir le site public"
          >
            Site
          </Link>
          <div className="dash-mobilebar__profile">
            <ProfileMenu session={session} onLogout={onLogout} compact />
          </div>
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
        <aside
          className="dash-side"
          id="dash-side-nav"
          ref={sideNavRef}
          aria-label="Navigation admin"
        >
          <div className="dash-side__glow" aria-hidden />
          <div className="dash-side__mesh" aria-hidden />
          <div className="dash-side__scene">
          <div className="dash-side__brand-row">
            <Link
              className="dash-brand dash-side__brand"
              href={homeForRole(session.role)}
              aria-label="NECS Admin"
              title="NECS Admin"
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
              className="dash-side__collapse"
              aria-label={sideCollapsed ? "Élargir le menu" : "Réduire le menu"}
              title={sideCollapsed ? "Élargir le menu" : "Réduire le menu"}
              aria-pressed={sideCollapsed}
              onClick={toggleSideCollapsed}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {sideCollapsed ? (
                  <path d="M9 6 15 12 9 18" />
                ) : (
                  <path d="M15 6 9 12 15 18" />
                )}
              </svg>
            </button>
            <button
              type="button"
              className="dash-side__close"
              aria-label="Fermer le menu"
              onClick={() => setNavOpen(false)}
            >
              <IconClose size={18} />
            </button>
          </div>

          {!agentMode ? (
            <label className="dash-side__search-wrap">
              <IconSearch size={15} />
              <input
                ref={searchRef}
                type="search"
                className="dash-side__search"
                placeholder="Rechercher… (Ctrl+K)"
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
                  ×
                </button>
              ) : null}
            </label>
          ) : null}

          <nav className="dash-side__nav">
            <div className="dash-side__quick">
              {filteredHome.map((item) => (
                <SideLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  search={search}
                  compact={sideCollapsed}
                  badge={
                    item.badgeKey === "leads" ? leadsOpenCount : undefined
                  }
                  onNavigate={() => setNavOpen(false)}
                />
              ))}
            </div>

            {docHits.length > 0 ? (
              <div className="dash-side__section dash-side__section--docs">
                <p className="dash-side__section-label">Documents</p>
                <div className="dash-side__section-list">
                  {docHits.map((item) => {
                    const slug = item.href.split("/").pop() ?? "";
                    const itemTone = docIconTone(slug);
                    const active = isNavItemActive(item, pathname, search);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`dash-side__link dash-side__link--doc${active ? " is-active" : ""}`}
                        title={item.label}
                        aria-label={item.label}
                        style={{ ["--icon-c" as string]: itemTone }}
                        onClick={() => setNavOpen(false)}
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
                <Link
                  href="/admin/templates"
                  className="dash-side__docs-more"
                  onClick={() => setNavOpen(false)}
                >
                  Voir la bibliothèque
                </Link>
              </div>
            ) : null}

            {searchEmpty ? (
              <p className="dash-side__empty">
                Aucun résultat pour « {navQuery} ».
              </p>
            ) : null}
          </nav>
          </div>
        </aside>

        <div className="dash-workspace">
          <header className="dash-topbar dash-topbar--compact">
            <div className="dash-topbar__intro">
              <p>{heading.eyebrow}</p>
              <strong className="dash-topbar__crumb">{heading.title}</strong>
            </div>
            <div className="dash-topbar__right">
              <OfflineSyncBar />
              <Link
                className="dash-topbar__site"
                href="/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Voir le site public</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M7 17 17 7M9 7h8v8"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <ProfileMenu session={session} onLogout={onLogout} />
            </div>
          </header>
          <main className="dash-main dash-main--has-hero">{children}</main>
        </div>
      </div>
    </div>
    </OfflineSyncHost>
  );
}
