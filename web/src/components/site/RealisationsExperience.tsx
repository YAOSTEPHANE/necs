"use client";

import Image from "next/image";
import { CountUpStat } from "@/components/site/CountUpStat";
import { useQuoteModal } from "@/components/site/SiteShell";
import type { NecsContent } from "@/lib/content";

type CaseKind =
  | "bureaux"
  | "industrie"
  | "commerces"
  | "particuliers"
  | "sante"
  | "education";

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

function IconListen({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#2F8F3A" />
      <path
        d="M27.5 12.5c-5.2 0-9 3.6-9 9.2 0 3.2 1.2 5.2 1.2 7.6 0 2.4-1.4 3.5-1.4 5.6 0 2.4 2 4.1 4.6 4.1 3.4 0 5.5-2.4 5.5-5.6v-2.2c2.8-1.4 4.6-4.2 4.6-7.4 0-5.2-2.8-11.3-5.5-11.3z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M24 20.5v5.5" stroke="#8FD14A" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconIntervene({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#1570B8" />
      <path d="M18 12h12l-1.5 8H19.5L18 12z" fill="#fff" />
      <rect x="21.5" y="20" width="5" height="14" rx="1.5" fill="#8FD14A" />
      <path d="M17 36h14l-2 3H19l-2-3z" fill="#fff" />
    </svg>
  );
}

function IconControl({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#1F6B2C" />
      <circle cx="21" cy="21" r="7.5" fill="none" stroke="#fff" strokeWidth="2.6" />
      <path d="M26.5 26.5 33 33" stroke="#8FD14A" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function IconReport({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#E67A18" />
      <rect x="14" y="12" width="20" height="24" rx="2.5" fill="#fff" />
      <path d="M18 20h12M18 24.5h12M18 29h8" stroke="#0A3A72" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="31" r="4.5" fill="#2F8F3A" />
      <path
        d="M28.5 31.1 29.8 32.4 32 29.8"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
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
    case "particuliers":
      return "Domiciles & résidences";
    case "sante":
      return "Cliniques & établissements de santé";
    case "education":
      return "Écoles & campus";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

const METHOD_STEPS = [
  {
    title: "Écouter",
    text: "Besoins, contraintes d’accès et standards qualité de votre site.",
    icon: "listen" as const,
  },
  {
    title: "Intervenir",
    text: "Équipes formées, planning adapté et protocoles sur mesure.",
    icon: "intervene" as const,
  },
  {
    title: "Contrôler",
    text: "Checklists digitales et corrections immédiates sur le terrain.",
    icon: "control" as const,
  },
  {
    title: "Reporter",
    text: "Preuves photo, scores et bilans clairs pour vos décideurs.",
    icon: "report" as const,
  },
] as const;

function MethodIcon({ kind }: { kind: (typeof METHOD_STEPS)[number]["icon"] }) {
  switch (kind) {
    case "listen":
      return <IconListen />;
    case "intervene":
      return <IconIntervene />;
    case "control":
      return <IconControl />;
    case "report":
      return <IconReport />;
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
    {
      kind: "particuliers",
      title: "Particuliers",
      text: "Entretien de domiciles et résidences avec des équipes discrètes et des protocoles adaptés à la vie de famille.",
      img: content.images.actHome,
    },
    {
      kind: "sante",
      title: "Établissements de santé",
      text: "Hygiène renforcée pour cliniques et centres médicaux : zones sensibles, fréquences élevées, traçabilité.",
      img: content.images.about,
    },
    {
      kind: "education",
      title: "Écoles & campus",
      text: "Propreté des salles, cours et sanitaires scolaires pour un environnement d’apprentissage sain et sûr.",
      img: content.images.blog1,
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
            {cases.map((c, i) => (
              <article key={c.kind} className="rlf-case">
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                <figure
                  className={`rlf-case__photo reveal reveal-media public-img-wrap reveal-delay-${(i % 3) + 1}`}
                >
                  <Image
                    src={c.img}
                    alt={c.title}
                    fill
                    unoptimized
                    sizes="(max-width:640px) 100vw, (max-width:1100px) 50vw, 33vw"
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

      <section className="rlf-method" aria-label="Notre méthode terrain">
        <div className="container">
          <header className="rlf-method__head">
            <p className="sf-kicker">Méthode</p>
            <h2>Notre méthode terrain</h2>
            <p>Quatre étapes simples pour une qualité constante sur chaque site.</p>
          </header>
          <ol className="rlf-method__grid">
            {METHOD_STEPS.map((step) => (
              <li key={step.title} className="rlf-method__step">
                <MethodIcon kind={step.icon} />
                <strong>{step.title}</strong>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
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
