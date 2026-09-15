"use client";

import Image from "next/image";
import { useQuoteModal } from "@/components/site/SiteShell";
import type { NecsContent } from "@/lib/content";

type PillarIconKind = "ops" | "premium" | "digital";

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

function IconOpsChip({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" fill="#2F8F3A" />
      <path d="M7 9.5h10M7 12.5h7M7 15.5h5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="15.2" r="2.2" fill="#8FD14A" />
    </svg>
  );
}

function IconPremiumChip({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="#E67A18"
        d="M12 3.2 5.2 5.8v5.4c0 4.2 2.8 7.9 6.8 9.2 4-1.3 6.8-5 6.8-9.2V5.8L12 3.2z"
      />
      <path
        d="M8.6 12.1 11 14.5l4.6-5"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDigitalChip({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="4" y="5" width="16" height="11" rx="2" fill="#0A3A72" />
      <rect x="6" y="7" width="12" height="7" rx="1" fill="#1570B8" />
      <path d="M8 19h8l-1.2-2H9.2L8 19z" fill="#8FD14A" />
      <circle cx="16.5" cy="9.5" r="1.4" fill="#E67A18" />
    </svg>
  );
}

function IconOpsCircle({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <circle cx="32" cy="32" r="32" fill="#2F8F3A" />
      <rect x="16" y="18" width="32" height="24" rx="4" fill="#fff" />
      <rect x="19" y="21" width="26" height="14" rx="2" fill="#8FD14A" />
      <path d="M20 42h24l-2-4H22l-2 4z" fill="#C8F0B0" />
      <circle cx="42" cy="28" r="4" fill="#0A3A72" />
      <path
        d="M40.4 28.1 41.7 29.4l2.5-2.7"
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPremiumCircle({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <circle cx="32" cy="32" r="32" fill="#E67A18" />
      <path
        fill="#fff"
        d="M32 14 36.4 23l9.8 1-7.3 6.5 2.2 9.5L32 35.8 20.9 40l2.2-9.5-7.3-6.5 9.8-1L32 14z"
      />
      <circle cx="32" cy="30.5" r="5.5" fill="#E67A18" />
      <path
        d="M29 30.5 31.2 32.7l4.2-4.4"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDigitalCircle({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <circle cx="32" cy="32" r="32" fill="#0A3A72" />
      <rect x="15" y="18" width="34" height="22" rx="3" fill="#fff" />
      <rect x="18.5" y="21" width="27" height="15" rx="1.5" fill="#1570B8" />
      <path d="M12 44h40l-3-4.5H15L12 44z" fill="#8FD14A" />
      <circle cx="40" cy="28" r="3.2" fill="#E67A18" />
      <path d="M22 26h8M22 30h11" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChipIcon({ kind }: { kind: PillarIconKind }) {
  switch (kind) {
    case "ops":
      return <IconOpsChip />;
    case "premium":
      return <IconPremiumChip />;
    case "digital":
      return <IconDigitalChip />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function PillarIcon({ kind }: { kind: PillarIconKind }) {
  switch (kind) {
    case "ops":
      return <IconOpsCircle />;
    case "premium":
      return <IconPremiumCircle />;
    case "digital":
      return <IconDigitalCircle />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

const PILLARS: Array<{
  icon: PillarIconKind;
  titleKey: "why1Title" | "why2Title" | "why3Title";
  textKey: "why1Text" | "why2Text" | "why3Text";
  detail: string;
  chipShort: string;
}> = [
  {
    icon: "ops",
    titleKey: "why1Title",
    textKey: "why1Text",
    chipShort: "Rigueur terrain",
    detail:
      "Ordres de travail, pointages et supervision terrain pour garantir la ponctualité et la couverture des sites.",
  },
  {
    icon: "premium",
    titleKey: "why2Title",
    textKey: "why2Text",
    chipShort: "Standard premium",
    detail:
      "Protocoles documentés, EPI adaptés et contrôles qualité photo pour les sites sensibles et exigeants.",
  },
  {
    icon: "digital",
    titleKey: "why3Title",
    textKey: "why3Text",
    chipShort: "Digital bout en bout",
    detail:
      "Devis, contrats, missions, RH et facturation centralisés ; une seule source de vérité pour NECS et le client.",
  },
];

export function PourquoiExperience({ content }: { content: NecsContent }) {
  const { openQuoteModal } = useQuoteModal();

  return (
    <div className="pwf">
      <section className="sf-hero" aria-label="Pourquoi nous">
        <div className="sf-hero__media" aria-hidden>
          <Image
            src={content.images.hero}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 30%" }}
          />
          <div className="sf-hero__veil" />
        </div>
        <div className="container sf-hero__grid">
          <div className="sf-hero__copy">
            <p className="sf-kicker">Pourquoi nous</p>
            <h1>{content.whyTitle}</h1>
            <p className="sf-hero__lead">{content.whyLead}</p>
            <ul className="sf-hero__chips">
              {PILLARS.map((pillar) => (
                <li key={pillar.icon}>
                  <ChipIcon kind={pillar.icon} />
                  <span>{pillar.chipShort}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="sf-script sf-hero__script">
            Un partenaire qui élève
            <br />
            le standard de vos
            <br />
            espaces&nbsp;!
          </p>
        </div>
      </section>

      <section className="pwf-intro">
        <div className="container">
          <p className="pwf-intro__prose">
            Choisir NECS, c’est choisir un partenaire camerounais qui traite la
            propreté comme un levier d’image, de sécurité et de performance
            opérationnelle ; pas comme une simple prestation répétitive.
          </p>
        </div>
      </section>

      <section className="pwf-pillars">
        <div className="container pwf-pillars__grid">
          {PILLARS.map((pillar) => (
            <article key={pillar.icon} className="pwf-pillar">
              <div className="pwf-pillar__icon">
                <PillarIcon kind={pillar.icon} />
              </div>
              <h2>{content[pillar.titleKey]}</h2>
              <p>{content[pillar.textKey]}</p>
              <p className="pwf-pillar__detail">{pillar.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pwf-cta">
        <div className="container">
          <div className="sf-cta-band">
            <div>
              <h2>Prêt à élever le standard de vos sites&nbsp;?</h2>
              <p>
                Parlez-nous de vos locaux : nous préparons une proposition
                claire.
              </p>
            </div>
            <button
              type="button"
              className="sf-cta"
              onClick={() => openQuoteModal("Devis - Pourquoi nous")}
            >
              Demander un devis
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
