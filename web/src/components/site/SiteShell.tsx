"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_CONTENT,
  NECS_CONTENT_EVENT,
  loadContent,
  type NecsContent,
} from "@/lib/content";
import {
  loadTrackingParams,
  persistLeadAttributionFromUrl,
} from "@/lib/lead-attribution";
import { ContactModal } from "@/components/site/ContactForm";
import { BrandLogo, SocialLinks } from "@/components/BrandAssets";

export const SITE_NAV = [
  { href: "/pourquoi", label: "Pourquoi nous", primary: true, primaryLabel: "Pourquoi" },
  { href: "/apropos", label: "À propos", primary: true },
  { href: "/realisations", label: "Réalisations", primary: true },
  { href: "/objectif", label: "Objectif", primary: false },
  { href: "/activites", label: "Activités", primary: true },
  { href: "/temoignages", label: "Confiance", primary: false },
  { href: "/blog", label: "Blog", primary: true },
  { href: "/contact", label: "Contact", primary: true },
] as const;

const SITE_NAV_PRIMARY = SITE_NAV.filter((item) => item.primary);
const SITE_NAV_MORE = SITE_NAV.filter((item) => !item.primary);

interface QuoteModalContextType {
  openQuoteModal: (initialSubject?: string) => void;
  closeQuoteModal: () => void;
  isQuoteModalOpen: boolean;
}

const QuoteModalContext = createContext<QuoteModalContextType>({
  openQuoteModal: () => {},
  closeQuoteModal: () => {},
  isQuoteModalOpen: false,
});

export function useQuoteModal() {
  return useContext(QuoteModalContext);
}

function NavToggleIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        className="nav-toggle__icon nav-toggle__icon--close"
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M6 6l12 12M18 6 6 18"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      className="nav-toggle__icon nav-toggle__icon--menu"
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect
        x="4"
        y="5.5"
        width="16"
        height="2.2"
        rx="1.1"
        fill="currentColor"
      />
      <rect
        x="4"
        y="10.9"
        width="16"
        height="2.2"
        rx="1.1"
        fill="currentColor"
      />
      <rect
        x="4"
        y="16.3"
        width="11"
        height="2.2"
        rx="1.1"
        fill="currentColor"
      />
    </svg>
  );
}

export function useNecsContent() {
  const [content, setContent] = useState<NecsContent>(DEFAULT_CONTENT);
  useEffect(() => {
    const sync = () => setContent(loadContent());
    sync();
    window.addEventListener(NECS_CONTENT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(NECS_CONTENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return content;
}

export function Media3D({
  src,
  alt,
  variant = "card",
}: {
  src: string;
  alt: string;
  variant?: "card" | "tall" | "wide";
}) {
  const isData = src.startsWith("data:") || src.startsWith("blob:");
  return (
    <div className={`media-3d media-3d--${variant}`}>
      <div className="media-3d__inner">
        {isData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            style={{
              objectFit: "cover",
              width: "100%",
              height: "100%",
              position: "absolute",
              inset: 0,
            }}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width:900px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        )}
      </div>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
  image,
  script,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  image?: string;
  script?: string;
}) {
  return (
    <section className="page-hero">
      {image ? (
        <div className="page-hero__media" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" />
        </div>
      ) : null}
      <div className="page-hero__veil" />
      <div className="container page-hero__content">
        <div className="page-hero__copy">
          <p className="page-hero__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-hero__lead">{lead}</p>
        </div>
        {script ? (
          <p className="page-hero__script">{script}</p>
        ) : null}
      </div>
    </section>
  );
}

export function SiteShell({
  children,
  content: contentProp,
}: {
  children: React.ReactNode;
  content?: NecsContent;
}) {
  const pathname = usePathname();
  const loaded = useNecsContent();
  const content = contentProp ?? loaded;
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteSubject, setQuoteSubject] = useState("Demande de devis");
  /** null = pas encore hydraté → toujours « Connexion » (évite mismatch SSR/client). */
  const [authed, setAuthed] = useState<boolean | null>(null);
  const moreRef = useRef<HTMLLIElement>(null);

  const moreActive = SITE_NAV_MORE.some((item) => item.href === pathname);
  const showEspacePro = authed === true;
  const accountHref = showEspacePro ? "/admin" : "/admin/login";
  const accountLabel = showEspacePro ? "Espace pro" : "Connexion";

  const openQuoteModal = (initialSubject?: string) => {
    if (initialSubject) {
      setQuoteSubject(initialSubject);
    }
    setIsQuoteModalOpen(true);
    setNavOpen(false);
    setMoreOpen(false);
  };

  const closeQuoteModal = () => {
    setIsQuoteModalOpen(false);
  };

  useEffect(() => {
    let cancelled = false;
    const syncAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        const data = (await res.json()) as { authenticated?: boolean };
        if (!cancelled) setAuthed(Boolean(data.authenticated));
      } catch {
        if (!cancelled) setAuthed(false);
      }
    };
    void syncAuth();
    const onFocus = () => {
      void syncAuth();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  /** DIG-04 : figer source / campagne / medium dès la landing (first-touch). */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const params = await loadTrackingParams();
      if (cancelled) return;
      persistLeadAttributionFromUrl(params);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setNavOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Next.js App Router peut conserver la position de scroll entre pages
    // (ex. logo → accueil qui s'ouvre en bas / pied de page).
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!navOpen && !moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNavOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen, moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [moreOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  useEffect(() => {
    const els = document.querySelectorAll(
      ".reveal:not(.is-visible), .reveal-media:not(.is-visible)",
    );
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    // Contenu déjà dans le viewport au chargement
    requestAnimationFrame(() => {
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          el.classList.add("is-visible");
          io.unobserve(el);
        }
      });
    });
    return () => io.disconnect();
  }, [pathname, content]);

  return (
    <QuoteModalContext.Provider
      value={{
        openQuoteModal,
        closeQuoteModal,
        isQuoteModalOpen,
      }}
    >
      <header
        className={[
          "site-header",
          scrolled ? "is-scrolled" : "",
          pathname === "/" ? "is-transparent" : "",
          navOpen ? "is-nav-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        id="top"
      >
        <div className={`container nav${navOpen ? " is-open" : ""}`}>
          <Link
            className="brand"
            href="/"
            aria-label="NECS ; Accueil"
            scroll
            onClick={() => {
              setNavOpen(false);
              setMoreOpen(false);
              if (pathname === "/") {
                window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
              }
            }}
          >
            <BrandLogo alt="NECS" width={56} height={56} />
          </Link>

          <nav
            className="nav-panel"
            id="site-nav"
            aria-label="Navigation principale"
          >
            <ul className="nav-links nav-links--desktop">
              {SITE_NAV_PRIMARY.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={pathname === item.href ? "is-active" : undefined}
                    onClick={() => setNavOpen(false)}
                  >
                    {"primaryLabel" in item && item.primaryLabel
                      ? item.primaryLabel
                      : item.label}
                  </Link>
                </li>
              ))}
              {SITE_NAV_MORE.length > 0 ? (
                <li
                  className={`nav-more${moreOpen ? " is-open" : ""}${moreActive ? " is-active" : ""}`}
                  ref={moreRef}
                >
                  <button
                    type="button"
                    className="nav-more__btn"
                    aria-expanded={moreOpen}
                    aria-haspopup="true"
                    onClick={() => setMoreOpen((v) => !v)}
                  >
                    Plus
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="m6 9 6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {moreOpen ? (
                    <ul className="nav-more__menu" role="menu">
                      {SITE_NAV_MORE.map((item) => (
                        <li key={item.href} role="none">
                          <Link
                            href={item.href}
                            role="menuitem"
                            className={
                              pathname === item.href ? "is-active" : undefined
                            }
                            onClick={() => {
                              setMoreOpen(false);
                              setNavOpen(false);
                            }}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ) : null}
            </ul>

            <div className="nav-drawer">
              <p className="nav-drawer__label">Parcourir</p>
              <ul className="nav-links nav-links--mobile">
                {SITE_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={
                        pathname === item.href ? "is-active" : undefined
                      }
                      onClick={() => setNavOpen(false)}
                    >
                      <span>{item.label}</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M9 6l6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="nav-drawer__actions">
                <button
                  type="button"
                  className="nav-cta"
                  onClick={() => openQuoteModal("Demande de devis")}
                >
                  Demander un devis
                </button>
                <Link
                  className={
                    showEspacePro ? "nav-drawer__admin" : "nav-drawer__login"
                  }
                  href={accountHref}
                  onClick={() => setNavOpen(false)}
                >
                  {accountLabel}
                </Link>
              </div>
            </div>

            <div className="nav-actions nav-actions--desktop">
              <Link
                className="nav-login"
                href={accountHref}
                onClick={() => {
                  setNavOpen(false);
                  setMoreOpen(false);
                }}
              >
                {accountLabel}
              </Link>
              <button
                type="button"
                className="nav-cta"
                onClick={() => openQuoteModal("Demande de devis")}
              >
                Demander un devis
              </button>
            </div>
          </nav>

          <button
            className={`nav-toggle${navOpen ? " is-open" : ""}`}
            type="button"
            aria-label={navOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={navOpen}
            aria-controls="site-nav"
            onClick={() => setNavOpen((v) => !v)}
          >
            <NavToggleIcon open={navOpen} />
          </button>
        </div>
      </header>

      {navOpen ? (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <main id="contenu">{children}</main>

      <ContactModal
        isOpen={isQuoteModalOpen}
        onClose={closeQuoteModal}
        content={content}
        initialSubject={quoteSubject}
      />

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col footer-col--brand">
              <div className="footer-brand">
                <BrandLogo
                  alt="NECS"
                  width={64}
                  height={64}
                  className="footer-brand__logo"
                />
              </div>
              <p>{content.footerAbout}</p>
              <SocialLinks title="Réseaux sociaux" />
            </div>
            <div className="footer-col">
              <h4>Navigation</h4>
              <ul>
                {SITE_NAV.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="footer-col">
              <h4>Services</h4>
              <ul>
                <li>
                  <Link href="/activites#bureaux">Bureaux</Link>
                </li>
                <li>
                  <Link href="/activites#industrie">Industrie</Link>
                </li>
                <li>
                  <Link href="/activites#sante">Santé</Link>
                </li>
                <li>
                  <Link href="/activites#hotels">Hôtels</Link>
                </li>
                <li>
                  <Link href="/activites#ecoles">Écoles</Link>
                </li>
                <li>
                  <Link href="/contact">Nous contacter</Link>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Informations</h4>
              <ul>
                <li>
                  <Link href="/mentions-legales">Mentions légales</Link>
                </li>
                <li>
                  <Link href="/confidentialite">Confidentialité</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span suppressHydrationWarning>
              © {new Date().getFullYear()} NECS / NECLEANING & SERVICES SARL
            </span>
            <span>
              <Link href="/mentions-legales">Mentions légales</Link>
              {" · "}
              <Link href="/confidentialite">Confidentialité</Link>
            </span>
          </div>
        </div>
      </footer>
    </QuoteModalContext.Provider>
  );
}
