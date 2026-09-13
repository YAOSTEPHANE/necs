"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_CONTENT,
  NECS_CONTENT_EVENT,
  loadContent,
  type NecsContent,
} from "@/lib/content";
import { ContactModal } from "@/components/site/ContactForm";
import { BrandLogo, SocialLinks } from "@/components/BrandAssets";

export const SITE_NAV = [
  { href: "/pourquoi", label: "Pourquoi nous" },
  { href: "/apropos", label: "À propos" },
  { href: "/realisations", label: "Réalisations" },
  { href: "/objectif", label: "Objectif" },
  { href: "/activites", label: "Activités" },
  { href: "/temoignages", label: "Témoignages" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
] as const;

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
      <div className="bevel-glow" />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
  image,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  image?: string;
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
        <p className="page-hero__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-hero__lead">{lead}</p>
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
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteSubject, setQuoteSubject] = useState("Demande de devis");

  const openQuoteModal = (initialSubject?: string) => {
    if (initialSubject) {
      setQuoteSubject(initialSubject);
    }
    setIsQuoteModalOpen(true);
  };

  const closeQuoteModal = () => {
    setIsQuoteModalOpen(false);
  };

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <QuoteModalContext.Provider
      value={{
        openQuoteModal,
        closeQuoteModal,
        isQuoteModalOpen,
      }}
    >
      <header className="site-header" id="top">
        <div className={`container nav${navOpen ? " is-open" : ""}`}>
          <Link className="brand" href="/" aria-label="NECS — Accueil">
            <BrandLogo alt="NECS" width={88} height={88} />
          </Link>
          <button
            className="nav-toggle"
            type="button"
            aria-label="Menu"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          <ul className="nav-links">
            {SITE_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={pathname === item.href ? "is-active" : undefined}
                  onClick={() => setNavOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="nav-cta"
            onClick={() => openQuoteModal("Demande de devis")}
          >
            Demander un devis
          </button>
        </div>
      </header>

      <main>{children}</main>

      {/* Bouton d'action flottant pour ouvrir le formulaire de devis en overlay depuis n'importe quelle page */}
      <button
        type="button"
        className="floating-quote-btn"
        onClick={() => openQuoteModal("Demande de devis express")}
        aria-label="Ouvrir le formulaire de devis"
      >
        <span className="floating-quote-btn__icon">✦</span>
        <span className="floating-quote-btn__text">Demander un devis</span>
      </button>

      {/* Modale d'overlay globale de devis et contact */}
      <ContactModal
        isOpen={isQuoteModalOpen}
        onClose={closeQuoteModal}
        content={content}
        initialSubject={quoteSubject}
      />

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand">
                <BrandLogo alt="NECS" width={56} height={56} />
              </div>
              <p>{content.footerAbout}</p>
              <SocialLinks title="Réseaux sociaux" />
            </div>
            <div>
              <h4>Navigation</h4>
              <ul>
                {SITE_NAV.slice(0, 4).map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Services</h4>
              <ul>
                <li>
                  <Link href="/activites">Bureaux</Link>
                </li>
                <li>
                  <Link href="/activites">Industrie</Link>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-btn-link"
                    onClick={() => openQuoteModal("Demande de devis")}
                  >
                    Devis rapide
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4>Back-office</h4>
              <ul>
                <li>
                  <Link href="/admin">Tableau de bord</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span suppressHydrationWarning>© {new Date().getFullYear()} NECS / NECLEANING & SERVICES SARL</span>
            <span>Cameroun</span>
          </div>
        </div>
      </footer>
    </QuoteModalContext.Provider>
  );
}
