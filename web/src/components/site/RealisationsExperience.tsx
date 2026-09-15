"use client";

import Image from "next/image";
import { CountUpStat } from "@/components/site/CountUpStat";
import { useQuoteModal } from "@/components/site/SiteShell";
import type { NecsContent } from "@/lib/content";

type CaseKind = "bureaux" | "industrie" | "commerces";

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

function CaseCaption({ kind }: { kind: CaseKind }) {
  switch (kind) {
    case "bureaux":
      return "Sièges & bureaux premium";
    case "industrie":
      return "Sites industriels & HSE";
    case "commerces":
      return "Commerces & parcours client";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function RealisationsExperience({ content }: { content: NecsContent }) {
  const { openQuoteModal } = useQuoteModal();

  const cases: Array<{
    kind: CaseKind;
    title: string;
    text: string;
    img: string;
  }> = [
    {
      kind: "bureaux",
      title: "Sièges & bureaux",
      text: "Entretien quotidien, vitrerie et zones VIP pour des sièges sociaux à Douala et Yaoundé.",
      img: content.images.actOffice,
    },
    {
      kind: "industrie",
      title: "Sites industriels",
      text: "Nettoyage d’ateliers et entrepôts avec consignes HSE et plannings adaptés aux shifts.",
      img: content.images.actIndustry,
    },
    {
      kind: "commerces",
      title: "Commerces & malls",
      text: "Propreté continue en horaires d’ouverture, focus sanitaires et parcours client.",
      img: content.images.actCommerce,
    },
  ];

  return (
    <div className="rlf">
      <section className="sf-hero" aria-label="Réalisations">
        <div className="sf-hero__media" aria-hidden>
          <Image
            src={content.images.achMain}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 35%" }}
          />
          <div className="sf-hero__veil" />
        </div>
        <div className="container sf-hero__grid">
          <div className="sf-hero__copy">
            <p className="sf-kicker">Réalisations</p>
            <h1>{content.achTitle}</h1>
            <p className="sf-hero__lead">{content.achLead}</p>
          </div>
          <p className="sf-script sf-hero__script">
            Des résultats visibles,
            <br />
            mesurables et durables
            <br />
            sur chaque site&nbsp;!
          </p>
        </div>
      </section>

      <section className="rlf-stats" aria-label="Indicateurs clés">
        <div className="container">
          <div className="rlf-stats__band">
            <CountUpStat value={content.stat2Value} label={content.stat2Label} />
            <CountUpStat value={content.stat3Value} label={content.stat3Label} />
            <CountUpStat value={content.stat4Value} label={content.stat4Label} />
          </div>
        </div>
      </section>

      <section className="rlf-cases">
        <div className="container">
          <header className="rlf-cases__head">
            <p className="sf-kicker">Cas types</p>
            <h2>Des environnements exigeants, une même exigence</h2>
          </header>
          <div className="rlf-cases__grid">
            {cases.map((c) => (
              <article key={c.kind} className="rlf-case">
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                <figure className="rlf-case__photo">
                  <Image
                    src={c.img}
                    alt={c.title}
                    fill
                    unoptimized
                    sizes="(max-width:900px) 100vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                  <figcaption>
                    <CaseCaption kind={c.kind} />
                  </figcaption>
                </figure>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rlf-cta">
        <div className="container">
          <div className="sf-cta-band">
            <div>
              <h2>Un projet similaire sur votre site&nbsp;?</h2>
              <p>Recevez une estimation personnalisée sous 24h.</p>
            </div>
            <button
              type="button"
              className="sf-cta"
              onClick={() => openQuoteModal("Devis - Réalisations")}
            >
              Demander une étude
              <span className="sf-cta__arrow" aria-hidden>
                <IconArrow />
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
