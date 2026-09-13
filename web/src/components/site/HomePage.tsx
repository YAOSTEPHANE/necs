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
      <section className="hero" aria-label="Accueil NECS">
        <div className="hero__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.images.hero} alt="" />
        </div>
        <div className="hero__overlay" />
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
              Demander un devis
              <span aria-hidden className="btn__chev">
                →
              </span>
            </button>
            <Link className="btn btn-ghost" href="/apropos">
              Découvrir NECS
            </Link>
          </div>
        </div>
        <a
          className="hero__scroll"
          href="#pourquoi"
          aria-label="Défiler vers la suite"
        >
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
          <div className="stats reveal" aria-label="Indicateurs clés">
            {[
              [content.stat1Value, content.stat1Label],
              [content.stat2Value, content.stat2Label],
              [content.stat3Value, content.stat3Label],
              [content.stat4Value, content.stat4Label],
            ].map(([value, label]) => (
              <div className="stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/pourquoi">
              En savoir plus
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="apropos">
        <div className="container split">
          <div className="split__media reveal">
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
                  <span className="ico" aria-hidden>
                    ✓
                  </span>
                  <div>
                    <strong>{t}</strong>
                    <span>{d}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="page-inline-more">
              <Link className="more" href="/apropos">
                Découvrir notre organisation
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
          <div className="ach-feature reveal">
            <Media3D
              src={content.images.achMain}
              alt="Chantier NECS"
              variant="wide"
            />
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/realisations">
              Voir tous nos chantiers
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="objectif">
        <div className="container split split--reverse">
          <div className="split__media reveal">
            <Media3D
              src={content.images.objectif}
              alt="Objectif NECS"
              variant="tall"
            />
          </div>
          <div className="reveal reveal-delay-1">
            <div className="eyebrow">Notre objectif</div>
            <h2>{content.objTitle}</h2>
            <p>{content.objText}</p>
            <div className="page-inline-more">
              <Link className="more" href="/objectif">
                Lire notre vision stratégique
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
                className={`act-item reveal reveal-delay-${i + 1}`}
                key={t}
              >
                <Media3D src={img} alt={t} />
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/activites">
              Explorer tous nos services
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
              <blockquote
                className={`quote reveal reveal-delay-${i + 1}`}
                key={name}
              >
                <p>{text}</p>
                <footer>
                  <div className="avatar" aria-hidden>
                    {av}
                  </div>
                  <div>
                    <strong>{name}</strong>
                    <span>{role}</span>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/temoignages">
              Lire les témoignages
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
              [
                "/blog/indicateurs-proprete",
                content.images.blog1,
                content.b1Meta,
                content.b1Title,
                content.b1Text,
              ],
              [
                "/blog/controle-qualite-digital",
                content.images.blog2,
                content.b2Meta,
                content.b2Title,
                content.b2Text,
              ],
              [
                "/blog/proprete-confiance-client",
                content.images.achMain,
                content.b3Meta,
                content.b3Title,
                content.b3Text,
              ],
            ].map(([href, img, meta, title, text], i) => (
              <Link
                className={`blog-card reveal reveal-delay-${i + 1}`}
                href={href}
                key={title}
              >
                <div className="blog-card__media">
                  <Media3D src={img} alt="" />
                </div>
                <div className="meta">{meta}</div>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="more">Lire la suite</span>
              </Link>
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
  return (
    <SiteShell>
      <HomeInner />
    </SiteShell>
  );
}
