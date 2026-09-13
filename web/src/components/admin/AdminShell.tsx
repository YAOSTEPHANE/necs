"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ADMIN_DOC_NAV } from "@/lib/admin-nav";
import {
  type AdminSession,
  NECS_AUTH_EVENT,
  loadSession,
  logoutAdmin,
} from "@/lib/auth";
import {
  DocIcon,
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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof ADMIN_DOC_NAV>();
    for (const item of ADMIN_DOC_NAV) {
      const g = item.group ?? "CRM";
      const list = map.get(g) ?? [];
      list.push(item);
      map.set(g, list);
    }
    return map;
  }, []);

  useEffect(() => {
    const activeGroup =
      ADMIN_DOC_NAV.find((i) => i.href === pathname)?.group ?? null;
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const key of grouped.keys()) {
        if (next[key] === undefined) {
          next[key] = key === activeGroup || key === "CRM";
        }
      }
      if (activeGroup) next[activeGroup] = true;
      return next;
    });
  }, [pathname, grouped]);

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
                <em>Console admin</em>
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
          </div>

          <div className="dash-side__section">
            <p className="dash-side__section-label">Accueil</p>
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

            {(session.role === "admin" ||
              session.role === "ops" ||
              session.role === "qualite") && (
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
                  <small>Arrivée & départ</small>
                </span>
              </Link>
            )}

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
          </div>

          <div className="dash-side__nav">
            <p className="dash-side__section-label">Modules métier</p>
            {filteredGroups.map(({ group, items }) => {
              const open = Boolean(navQuery) || Boolean(openGroups[group]);
              return (
                <div
                  key={group}
                  className={`dash-side__group${open ? " is-open" : ""}`}
                >
                  <button
                    type="button"
                    className="dash-side__group-toggle"
                    onClick={() => toggleGroup(group)}
                    aria-expanded={open}
                  >
                    <span>{GROUP_LABEL[group] ?? group}</span>
                    <em>{items.length}</em>
                    <Chevron open={open} />
                  </button>
                  {open ? (
                    <div className="dash-side__group-items">
                      {items.map((item) => {
                        const active = pathname === item.href;
                        const slug = item.href.split("/").pop() ?? "";
                        const tone = docIconTone(slug);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`dash-side__link${active ? " is-active" : ""}`}
                            title={item.description}
                            style={{ ["--icon-c" as string]: tone }}
                          >
                            <span className="dash-side__icon">
                              <DocIcon slug={slug} size={15} />
                            </span>
                            <span className="dash-side__link-text">
                              <strong>{item.label}</strong>
                              <small>{item.code}</small>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {filteredGroups.length === 0 ? (
              <p className="dash-side__empty">Aucun module trouvé.</p>
            ) : null}
          </div>

          <div className="dash-side__foot">
            <div className="dash-side__session">
              <span className="dash-avatar sm" aria-hidden>
                {session.initials}
              </span>
              <div>
                <strong>{session.name}</strong>
                <span>{roleLabel}</span>
              </div>
            </div>
            <Link className="dash-side__site-link" href="/">
              Voir le site public
            </Link>
          </div>
        </aside>

        <div className="dash-workspace">
          <header className="dash-topbar">
            <div className="dash-topbar__intro">
              <p>Espace Direction</p>
              <strong>Console NECS</strong>
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
