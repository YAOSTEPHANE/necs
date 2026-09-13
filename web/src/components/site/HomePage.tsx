"use client";

import Link from "next/link";
import { useEffect } from "react";
import { formatHeroTitle } from "@/lib/content";
import { ContactForm } from "@/components/site/ContactForm";
import {
  Media3D,
  SiteShell,
  useNecsContent,
  useQuoteModal,
} from "@/components/site/SiteShell";

function HomeInner() {
  const content = useNecsContent();
  const { openQuoteModal } = useQuoteModal();
  const hero = formatHeroTitle(content.heroTitle);

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [content]);

  return (
    <>
      <section className="hero">
        <div className="hero__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.images.hero} alt="Équipe NECS" />
        </div>
        <div className="hero__overlay" />
        <div className="hero__grid" aria-hidden />
        <div className="hero__sweep" aria-hidden />
        <div className="container hero__content">
          <h1>
            {hero.before}
            {hero.accent ? (
              <>
                , <em>{hero.accent}</em>
              </>
            ) : null}
          </h1>
          <p className="lead">{content.heroLead}</p>
          <div className="hero__actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openQuoteModal("Premier contact")}
            >
              Contactez-nous
            </button>
            <Link className="btn btn-ghost" href="/apropos">
              Découvrir NECS
            </Link>
          </div>
        </div>
        <a className="hero__scroll" href="#pourquoi" aria-label="Défiler">
          <span>Scroll</span>
          <span className="hero__scroll-line" />
        </a>
      </section>

      <section className="section section-alt" id="pourquoi">
        <div className="container">
          <div className="section-head reveal">
            <div className="eyebrow">Pourquoi nous</div>
            <h2>{content.whyTitle}</h2>
            <p>{content.whyLead}</p>
          </div>
          <div className="why-grid">
            {[
              ["01", content.why1Title, content.why1Text],
              ["02", content.why2Title, content.why2Text],
              ["03", content.why3Title, content.why3Text],
            ].map(([num, title, text], i) => (
              <article
                className={`why-item reveal reveal-delay-${i + 1}`}
                key={num}
              >
                <div className="num">{num}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/pourquoi">
              En savoir plus →
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="apropos">
        <div className="container split">
          <div className="split__media reveal" style={{ position: "relative" }}>
            <Media3D src={content.images.about} alt="À propos NECS" variant="tall" />
          </div>
          <div className="reveal reveal-delay-1">
            <div className="eyebrow">À propos de nous</div>
            <h2>{content.aboutTitle}</h2>
            <p>{content.aboutText}</p>
            <ul className="feature-list">
              {[
                [content.aboutF1Title, content.aboutF1Text],
                [content.aboutF2Title, content.aboutF2Text],
                [content.aboutF3Title, content.aboutF3Text],
              ].map(([t, d]) => (
                <li key={t}>
                  <span className="ico">✓</span>
                  <div>
                    <strong>{t}</strong>
                    <span>{d}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="page-inline-more" style={{ marginTop: "1rem" }}>
              <Link className="more" href="/apropos">
                Découvrir notre organisation →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="realisations">
        <div className="container">
          <div className="section-head reveal">
            <div className="eyebrow">Réalisations</div>
            <h2>{content.achTitle}</h2>
            <p>{content.achLead}</p>
          </div>
          <div className="ach-grid">
            <div className="ach-col reveal" style={{ position: "relative" }}>
              <Media3D src={content.images.actOffice} alt="Bureaux corporate" />
            </div>
            <div className="ach-main reveal reveal-delay-1" style={{ position: "relative" }}>
              <Media3D src={content.images.achMain} alt="Site industriel" variant="wide" />
            </div>
            <div className="ach-col reveal reveal-delay-2" style={{ position: "relative" }}>
              <Media3D src={content.images.actCommerce} alt="Locaux commerciaux" />
            </div>
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/realisations">
              Voir tous nos chantiers →
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="objectif">
        <div className="container split split--reverse">
          <div className="split__media reveal" style={{ position: "relative" }}>
            <Media3D src={content.images.objectif} alt="Objectif NECS" variant="tall" />
          </div>
          <div className="reveal reveal-delay-1">
            <div className="eyebrow">Notre objectif</div>
            <h2>{content.objTitle}</h2>
            <p>{content.objText}</p>
            <div className="pillar-cards">
              {[
                ["Rigueur opérationnelle", content.why1Text],
                ["Qualité mesurable", content.why2Text],
                ["Plateforme intégrée", content.why3Text],
              ].map(([t, d]) => (
                <article className="pillar-card" key={t}>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </article>
              ))}
            </div>
            <div className="page-inline-more" style={{ marginTop: "1rem" }}>
              <Link className="more" href="/objectif">
                Lire notre vision stratégique →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="activites">
        <div className="container">
          <div className="section-head reveal">
            <div className="eyebrow">Activités</div>
            <h2>{content.actTitle}</h2>
            <p>{content.actLead}</p>
          </div>
          <div className="act-grid">
            {[
              [content.images.actOffice, content.act1Title, content.act1Text],
              [content.images.actIndustry, content.act2Title, content.act2Text],
              [content.images.actCommerce, content.act3Title, content.act3Text],
            ].map(([img, t, d], i) => (
              <article
                className={`act-card reveal reveal-delay-${i + 1}`}
                key={t}
              >
                <div style={{ position: "relative" }}>
                  <Media3D src={img} alt={t} />
                </div>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/activites">
              Explorer tous nos services →
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="temoignages">
        <div className="container">
          <div className="section-head reveal">
            <div className="eyebrow">Témoignages</div>
            <h2>{content.testTitle}</h2>
            <p>{content.testLead}</p>
          </div>
          <div className="testimonials">
            {[
              [content.t1Text, content.t1Name, content.t1Role, "JO"],
              [content.t2Text, content.t2Name, content.t2Role, "AM"],
              [content.t3Text, content.t3Name, content.t3Role, "PK"],
            ].map(([text, name, role, av], i) => (
              <article
                className={`quote reveal reveal-delay-${i + 1}`}
                key={name}
              >
                <p>{text}</p>
                <footer>
                  <div className="avatar">{av}</div>
                  <div>
                    <strong>{name}</strong>
                    <span>{role}</span>
                  </div>
                </footer>
              </article>
            ))}
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/temoignages">
              Lire les témoignages →
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="blog">
        <div className="container">
          <div className="section-head reveal">
            <div className="eyebrow">Blog</div>
            <h2>{content.blogTitle}</h2>
            <p>{content.blogLead}</p>
          </div>
          <div className="blog-grid">
            {[
              ["/blog/indicateurs-proprete", content.images.blog1, content.b1Meta, content.b1Title, content.b1Text],
              ["/blog/controle-qualite-digital", content.images.blog2, content.b2Meta, content.b2Title, content.b2Text],
              ["/blog/proprete-confiance-client", content.images.achMain, content.b3Meta, content.b3Title, content.b3Text],
            ].map(([href, img, meta, title, text], i) => (
              <article
                className={`blog-card reveal reveal-delay-${i + 1}`}
                key={title}
              >
                <div style={{ position: "relative" }}>
                  <Media3D src={img} alt={title} />
                </div>
                <div className="meta">{meta}</div>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link className="more" href={href}>
                  Lire la suite →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="contact">
        <ContactForm
          content={content}
          onOpenModal={() => openQuoteModal("Devis page accueil")}
        />
      </section>
    </>
  );
}

export function HomePage() {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <HomeInner />
    </SiteShell>
  );
}
