"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatHeroTitle } from "@/lib/content";
import { ContactForm } from "@/components/site/ContactForm";
import { CountUpStat } from "@/components/site/CountUpStat";
import {
  SiteShell,
  useNecsContent,
  useQuoteModal,
} from "@/components/site/SiteShell";

function IconCheck({ tone = "green" }: { tone?: "green" | "orange" | "blue" }) {
  const fill =
    tone === "green" ? "#2F8F3A" : tone === "orange" ? "#E67A18" : "#0A3A72";
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
      <circle cx="12" cy="12" r="11" fill={fill} />
      <path
        d="M7.2 12.4 10.4 15.6 16.8 8.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconOps() {
  return (
    <svg viewBox="0 0 48 48" width={40} height={40} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#2F8F3A" />
      <rect x="12" y="14" width="24" height="18" rx="3" fill="#fff" />
      <path d="M15 20h18M15 24h12M15 28h9" stroke="#0A3A72" strokeWidth="2" strokeLinecap="round" />
      <circle cx="33" cy="29" r="4" fill="#E67A18" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 48 48" width={40} height={40} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#E67A18" />
      <path fill="#fff" d="M24 10.5 14 14.2v7.2c0 5.6 3.8 10.6 10 12.4 6.2-1.8 10-6.8 10-12.4v-7.2L24 10.5z" />
      <path d="M18.5 24.2 22.2 27.8l7.5-8" fill="none" stroke="#E67A18" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconDigital() {
  return (
    <svg viewBox="0 0 48 48" width={40} height={40} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#0A3A72" />
      <rect x="11" y="13" width="26" height="16" rx="2.5" fill="#fff" />
      <rect x="13.5" y="15.5" width="21" height="11" rx="1.5" fill="#1570B8" />
      <path d="M10 32h28l-2.5-3H12.5L10 32z" fill="#8FD14A" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
      <path
        d="M3 8h9M8.5 4.5 12.5 8 8.5 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeInner() {
  const content = useNecsContent();
  const { openQuoteModal } = useQuoteModal();
  const hero = formatHeroTitle(content.heroTitle);
  const [heroVideoReady, setHeroVideoReady] = useState(false);

  useEffect(() => {
    setHeroVideoReady(true);
  }, []);

  const whyItems = [
    { title: content.why1Title, text: content.why1Text, icon: "ops" as const },
    { title: content.why2Title, text: content.why2Text, icon: "shield" as const },
    { title: content.why3Title, text: content.why3Text, icon: "digital" as const },
  ];

  const aboutItems = [
    { title: content.aboutF1Title, text: content.aboutF1Text, tone: "green" as const },
    { title: content.aboutF2Title, text: content.aboutF2Text, tone: "orange" as const },
    { title: content.aboutF3Title, text: content.aboutF3Text, tone: "blue" as const },
  ];

  const activities = [
    { img: content.images.actOffice, title: content.act1Title, text: content.act1Text },
    { img: content.images.actIndustry, title: content.act2Title, text: content.act2Text },
    { img: content.images.actCommerce, title: content.act3Title, text: content.act3Text },
    { img: content.images.actHome, title: content.act4Title, text: content.act4Text },
  ];

  return (
    <div className="home-page home-premium">
      <section className="hero" aria-label="Accueil NECS">
        <div className="hero__media">
          {heroVideoReady ? (
            <video
              className="hero__video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={content.images.hero}
              aria-hidden
            >
              <source src="/videos/necs-hero.mp4" type="video/mp4" />
            </video>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.images.hero} alt="" />
          )}
        </div>
        <div className="hero__overlay" />
        <div className="hero__sweep" aria-hidden />
        <div className="container hero__content">
          <p className="sf-script hero__script">
            Propreté, Rigueur, Confiance
          </p>
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
              className="sf-cta"
              onClick={() => openQuoteModal("Premier contact")}
            >
              Demander un devis
              <span className="sf-cta__arrow" aria-hidden>
                <IconArrow />
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

      <section className="section section-alt hp-why" id="pourquoi">
        <div className="container">
          <div className="section-head reveal">
            <p className="sf-kicker">Pourquoi nous</p>
            <h2>{content.whyTitle}</h2>
            <p>{content.whyLead}</p>
          </div>
          <div className="hp-why__grid">
            {whyItems.map((item, i) => (
              <article
                className={`hp-why__card reveal reveal-delay-${i + 1}`}
                key={item.title}
              >
                <div className="hp-why__icon" aria-hidden>
                  {item.icon === "ops" ? (
                    <IconOps />
                  ) : item.icon === "shield" ? (
                    <IconShield />
                  ) : (
                    <IconDigital />
                  )}
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <div className="stats reveal" aria-label="Indicateurs clés">
            {[
              [content.stat2Value, content.stat2Label],
              [content.stat3Value, content.stat3Label],
              [content.stat4Value, content.stat4Label],
            ].map(([value, label]) => (
              <CountUpStat key={label} value={value} label={label} />
            ))}
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/pourquoi">
              En savoir plus <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      <section className="section hp-about" id="apropos">
        <div className="container hp-about__grid">
          <div className="hp-about__media reveal">
            <Image
              src={content.images.about}
              alt="À propos NECS"
              fill
              unoptimized
              sizes="(max-width:900px) 100vw, 46vw"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="reveal reveal-delay-1">
            <p className="sf-kicker">À propos de nous</p>
            <h2>{content.aboutTitle}</h2>
            <p className="hp-about__lead">{content.aboutText}</p>
            <ul className="hp-about__list">
              {aboutItems.map((item) => (
                <li key={item.title}>
                  <IconCheck tone={item.tone} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="page-inline-more">
              <Link className="more" href="/apropos">
                Découvrir notre organisation <IconArrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="realisations">
        <div className="container">
          <div className="section-head reveal">
            <p className="sf-kicker">Réalisations</p>
            <h2>{content.achTitle}</h2>
            <p>{content.achLead}</p>
          </div>
          <div className="hp-shot reveal">
            <Image
              src={content.images.achMain}
              alt="Chantier NECS"
              fill
              unoptimized
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
            <div className="hp-shot__caption">
              Des environnements exigeants, une même exigence
            </div>
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/realisations">
              Voir nos réalisations <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      <section className="section hp-objectif" id="objectif">
        <div className="container hp-objectif__grid">
          <div className="reveal">
            <p className="sf-kicker">Notre objectif</p>
            <h2>{content.objTitle}</h2>
            <p>{content.objText}</p>
            <p className="sf-script hp-objectif__script">
              Digitaliser pour mieux servir chaque client&nbsp;!
            </p>
            <div className="page-inline-more">
              <Link className="more" href="/objectif">
                Lire notre vision stratégique <IconArrow />
              </Link>
            </div>
          </div>
          <div className="hp-objectif__media reveal reveal-delay-1">
            <Image
              src={content.images.objectif}
              alt="Objectif NECS"
              fill
              unoptimized
              sizes="(max-width:900px) 100vw, 46vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
      </section>

      <section className="section section-alt" id="activites">
        <div className="container">
          <div className="section-head reveal">
            <p className="sf-kicker">Activités</p>
            <h2>{content.actTitle}</h2>
            <p>{content.actLead}</p>
          </div>
          <div className="hp-act__grid">
            {activities.map((item, i) => (
              <article
                className={`hp-act__card reveal reveal-delay-${(i % 3) + 1}`}
                key={item.title}
              >
                <div className="hp-act__media">
                  <Image
                    src={item.img}
                    alt={item.title}
                    fill
                    unoptimized
                    sizes="(max-width:900px) 100vw, 25vw"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/activites">
              Explorer tous nos services <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      <section className="section hp-trust" id="temoignages">
        <div className="container">
          <div className="section-head reveal">
            <p className="sf-kicker">Notre engagement</p>
            <h2>{content.testTitle}</h2>
            <p>{content.testLead}</p>
          </div>
          <div className="hp-trust__grid">
            {[
              [content.t1Text, content.t1Name, content.t1Role],
              [content.t2Text, content.t2Name, content.t2Role],
              [content.t3Text, content.t3Name, content.t3Role],
            ].map(([text, name, role], i) => (
              <blockquote
                className={`hp-trust__quote reveal reveal-delay-${i + 1}`}
                key={name}
              >
                <p>{text}</p>
                <footer>
                  <strong>{name}</strong>
                  <span>{role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
          <div className="page-inline-more reveal">
            <Link className="more" href="/temoignages">
              Voir notre engagement <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="blog">
        <div className="container">
          <div className="section-head reveal">
            <p className="sf-kicker">Blog</p>
            <h2>{content.blogTitle}</h2>
            <p>{content.blogLead}</p>
          </div>
          <div className="blg-grid">
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
              <article
                className={`blg-card reveal reveal-delay-${i + 1}`}
                key={title}
              >
                <Link href={href} className="blg-card__link">
                  <div className="blg-card__media">
                    <Image
                      src={img}
                      alt={title}
                      fill
                      unoptimized
                      sizes="(max-width:900px) 100vw, 33vw"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <p className="blg-card__meta">{meta}</p>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <span className="blg-card__more">
                    Lire la suite
                    <IconArrow />
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="hp-values" aria-label="Valeurs NECS">
        <div className="container hp-values__inner">
          <p>
            <span>Propreté</span>
            <span aria-hidden>·</span>
            <span>Rigueur</span>
            <span aria-hidden>·</span>
            <span>Confiance</span>
          </p>
          <button
            type="button"
            className="sf-cta"
            onClick={() => openQuoteModal("Devis page accueil")}
          >
            Contactez-nous dès maintenant
            <span className="sf-cta__arrow" aria-hidden>
              <IconArrow />
            </span>
          </button>
        </div>
      </section>

      <section className="section" id="contact">
        <ContactForm
          content={content}
          onOpenModal={() => openQuoteModal("Devis page accueil")}
        />
      </section>
    </div>
  );
}

export function HomePage() {
  return (
    <SiteShell>
      <HomeInner />
    </SiteShell>
  );
}
