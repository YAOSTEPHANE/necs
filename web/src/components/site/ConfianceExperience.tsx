"use client";

import Image from "next/image";
import Link from "next/link";
import { useBrandAssets } from "@/components/BrandAssets";
import { useQuoteModal } from "@/components/site/SiteShell";
import type { NecsContent } from "@/lib/content";

function digitsForTel(raw: string): string | null {
  const digits = raw.replace(/[Xx×]/g, "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits;
}

function useChannels(content: NecsContent) {
  const { email, phone } = useBrandAssets();
  const mail = (email || content.contactEmail).trim();
  const displayPhone = phone || content.contactPhone;
  const telDigits = digitsForTel(displayPhone);
  return {
    mail,
    mailHref: mail.includes("@") ? `mailto:${mail}` : null,
    displayPhone,
    telHref: telDigits ? `tel:+${telDigits}` : null,
  };
}

function IconUsers({ size = 22, tone = "white" }: { size?: number; tone?: "white" | "green" }) {
  const a = tone === "white" ? "#fff" : "#2F8F3A";
  const b = tone === "white" ? "rgba(255,255,255,0.75)" : "#8FD14A";
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="9" cy="8" r="3.1" fill={a} />
      <circle cx="16" cy="8.5" r="2.5" fill={b} />
      <path d="M3.8 19c.4-3.3 2.7-5 5.2-5s4.8 1.7 5.2 5" fill={a} />
      <path d="M12.8 19c.2-2 1.4-3.2 3.3-3.2 2 0 3.3 1.3 3.5 3.2" fill={b} />
    </svg>
  );
}

function IconShieldCheck({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="#2F8F3A"
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

function IconHandshake({ size = 22, tone = "white" }: { size?: number; tone?: "white" | "color" }) {
  if (tone === "white") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <path fill="#fff" d="M3.5 11.2 8 7.2l3.2 2.4 1.2-.8 3.1-2.4 4.5 4-1.4 1.3c-1.5 1.4-3.1 2.5-4.8 2.5-1.8 0-3.5-1-5.2-2.5L8.2 9.8z" />
        <rect x="7.2" y="15" width="9.6" height="2.4" rx="1" fill="rgba(255,255,255,0.7)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M3.5 11.2 8 7.2l3.2 2.4" fill="#2F8F3A" />
      <path d="M20.5 11.2 16 7.2l-3 2.2" fill="#0A3A72" />
      <path
        d="M8.2 9.8c1.4 1.2 2.7 2.1 3.8 2.1 1.2 0 2.2-.7 3.4-1.8l1.4 1.3c-1.5 1.4-3.1 2.5-4.8 2.5-1.8 0-3.5-1-5.2-2.5L8.2 9.8z"
        fill="#8FD14A"
      />
      <rect x="7.2" y="14.8" width="9.6" height="2.6" rx="1.1" fill="#E67A18" />
    </svg>
  );
}

function IconPeopleCircle({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#2F8F3A" />
      <circle cx="18.5" cy="18" r="5" fill="#fff" />
      <circle cx="30.5" cy="19" r="4" fill="#C8F0B0" />
      <path d="M9.5 36c.7-5.2 4.2-8 9-8s8.3 2.8 9 8" fill="#fff" />
      <path d="M26 36c.4-3.2 2.3-5.1 5.3-5.1S36.5 32.8 37 36" fill="#C8F0B0" />
    </svg>
  );
}

function IconQualityBadge({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#E67A18" />
      <path
        fill="#fff"
        d="M24 10.5 27.3 17l7.2.7-5.4 4.8 1.6 7-6.7-3.8-6.7 3.8 1.6-7-5.4-4.8 7.2-.7L24 10.5z"
      />
      <circle cx="24" cy="23.2" r="4.2" fill="#E67A18" />
      <path
        d="M21.6 23.1 23.4 24.9l3.4-3.6"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLaptop({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#0A3A72" />
      <rect x="12" y="14" width="24" height="16" rx="2" fill="#fff" />
      <rect x="14.5" y="16" width="19" height="11" rx="1" fill="#1570B8" />
      <path d="M9 33h30l-2.2-3H11.2L9 33z" fill="#8FD14A" />
      <rect x="21" y="34" width="6" height="1.5" rx="0.5" fill="#fff" />
    </svg>
  );
}

function IconBuilding({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#1F6B2C" />
      <rect x="14" y="13" width="20" height="22" rx="1.5" fill="#fff" />
      <rect x="17" y="16" width="4" height="4" fill="#8FD14A" />
      <rect x="22.5" y="16" width="4" height="4" fill="#0A3A72" />
      <rect x="28" y="16" width="4" height="4" fill="#8FD14A" />
      <rect x="17" y="22" width="4" height="4" fill="#0A3A72" />
      <rect x="22.5" y="22" width="4" height="4" fill="#E67A18" />
      <rect x="28" y="22" width="4" height="4" fill="#0A3A72" />
      <rect x="21" y="28" width="6" height="7" fill="#0A3A72" />
    </svg>
  );
}

function IconEar({ size = 36 }: { size?: number }) {
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

function IconClipboard({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#E67A18" />
      <rect x="15" y="13" width="18" height="23" rx="2.5" fill="#fff" />
      <rect x="19" y="10.5" width="10" height="5" rx="1.5" fill="#0A3A72" />
      <path d="M19 22h10M19 26.5h10M19 31h7" stroke="#2F8F3A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconClean({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#1570B8" />
      <path d="M18 12h12l-1.5 8H19.5L18 12z" fill="#fff" />
      <rect x="21.5" y="20" width="5" height="14" rx="1.5" fill="#8FD14A" />
      <path d="M17 36h14l-2 3H19l-2-3z" fill="#fff" />
    </svg>
  );
}

function IconSearch({ size = 36 }: { size?: number }) {
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
      <path d="M28.5 31.1 29.8 32.4 32 29.8" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconImprove({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#0A3A72" />
      <path d="M14 30V22M20 30V18M26 30v-7M32 30V15" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M13 16.5 20 20l6-5 8 4" fill="none" stroke="#8FD14A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBolt({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path fill="#fff" d="M13.2 2.5 5.8 13.2h5.2l-1.4 8.3 8.2-12.2h-5.1L13.2 2.5z" />
    </svg>
  );
}

function IconGears({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="10" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.8" />
      <path
        fill="#fff"
        d="M10 4.2l.5 1.6 1.6-.3.9 1.4-1.3 1 .8 1.4-1.6.5v1.6l1.6.5-.8 1.4 1.3 1-.9 1.4-1.6-.3L10 19.8l-.5-1.6-1.6.3-.9-1.4 1.3-1-.8-1.4 1.6-.5V12l-1.6-.5.8-1.4-1.3-1 .9-1.4 1.6.3L10 4.2z"
        opacity="0.35"
      />
      <circle cx="16.5" cy="8.5" r="2.2" fill="none" stroke="#8FD14A" strokeWidth="1.6" />
    </svg>
  );
}

function IconChartMini({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M5 18V11M10 18V7M15 18v-5M20 18V9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconArrow({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M5 12h12M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStepArrow() {
  return (
    <svg className="ncf-step__arrow" viewBox="0 0 24 12" width="28" height="14" aria-hidden>
      <path d="M0 6h18M14 1l6 5-6 5" fill="none" stroke="#0A3A72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPhone({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#1570B8" />
      <path
        fill="#fff"
        d="M8.1 4.8c.45-.45 1.2-.55 1.75-.25l2 1.2c.55.35.75 1 .55 1.6l-.65 1.7c-.1.3 0 .7.3.95l2.2 1.65c.25.2.65.2.95.05l1.7-.65c.6-.25 1.25 0 1.6.55l1.2 2c.3.55.2 1.3-.25 1.75l-1 1c-.55.55-1.35.8-2.15.55-1.9-.5-4.1-1.95-6.25-4.1S5.9 10.3 5.4 8.4c-.25-.8 0-1.6.55-2.15l1.15-1.45z"
      />
    </svg>
  );
}

function IconMail({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#2F8F3A" />
      <rect x="5" y="7.5" width="14" height="9.5" rx="1.8" fill="#fff" />
      <path d="M5.6 8.5 12 12.8l6.4-4.3" fill="none" stroke="#0A3A72" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconPin({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#1F6B2C" />
      <path
        fill="#fff"
        d="M12 4.2a5.2 5.2 0 0 0-5.2 5.2c0 3.9 5.2 9.6 5.2 9.6s5.2-5.7 5.2-9.6A5.2 5.2 0 0 0 12 4.2z"
      />
      <circle cx="12" cy="9.3" r="2" fill="#1F6B2C" />
    </svg>
  );
}

function IconLeaf({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="#8FD14A"
        d="M19.5 4.5C12.8 5 6.5 9.2 5.2 16.5c3.2.8 6.4-.2 8.7-2.2 2.6-2.2 4.2-5.4 5.6-9.8z"
      />
      <path d="M6 18c3.5-3.2 7-5.2 12.5-6.5" fill="none" stroke="#1F6B2C" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const PILLARS = [
  {
    title: "Des équipes encadrées",
    text: "Agents formés, équipés et supervisés pour garantir une exécution fiable.",
    caption: "Un personnel qualifié et de confiance",
    icon: "people" as const,
    imageKey: "about" as const,
  },
  {
    title: "Une qualité contrôlée",
    text: "Audits réguliers, checklists et actions correctives sur chaque site.",
    caption: "Des standards élevés à chaque intervention",
    icon: "quality" as const,
    imageKey: "achMain" as const,
  },
  {
    title: "Un service traçable",
    text: "Planning digital, photos et reporting pour une transparence totale.",
    caption: "Plus de transparence pour votre tranquillité",
    icon: "laptop" as const,
    imageKey: "objectif" as const,
  },
  {
    title: "Des solutions adaptées",
    text: "Bureaux, industrie, commerces et particuliers : une offre sur mesure.",
    caption: "Des espaces qui reflètent votre image",
    icon: "building" as const,
    imageKey: "actOffice" as const,
  },
] as const;

const STEPS = [
  { title: "Écouter", text: "Vos besoins", icon: "ear" as const },
  { title: "Planifier", text: "Nos interventions", icon: "clipboard" as const },
  { title: "Intervenir", text: "Avec rigueur", icon: "clean" as const },
  { title: "Contrôler", text: "La qualité", icon: "search" as const },
  { title: "Reporter", text: "Nos résultats", icon: "report" as const },
  { title: "Améliorer", text: "En continu", icon: "improve" as const },
] as const;

const WHY = [
  { label: "Réactivité", icon: "bolt" as const },
  { label: "Personnel encadré", icon: "users" as const },
  { label: "Prestations sur mesure", icon: "gears" as const },
  { label: "Contrôle qualité", icon: "shield" as const },
  { label: "Suivi digitalisé", icon: "chart" as const },
  { label: "Transparence", icon: "hand" as const },
] as const;

function PillarIcon({ kind }: { kind: (typeof PILLARS)[number]["icon"] }) {
  switch (kind) {
    case "people":
      return <IconPeopleCircle />;
    case "quality":
      return <IconQualityBadge />;
    case "laptop":
      return <IconLaptop />;
    case "building":
      return <IconBuilding />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function StepIcon({ kind }: { kind: (typeof STEPS)[number]["icon"] }) {
  switch (kind) {
    case "ear":
      return <IconEar />;
    case "clipboard":
      return <IconClipboard />;
    case "clean":
      return <IconClean />;
    case "search":
      return <IconSearch />;
    case "report":
      return <IconReport />;
    case "improve":
      return <IconImprove />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function WhyIcon({ kind }: { kind: (typeof WHY)[number]["icon"] }) {
  switch (kind) {
    case "bolt":
      return <IconBolt />;
    case "users":
      return <IconUsers size={22} tone="white" />;
    case "gears":
      return <IconGears />;
    case "shield":
      return <IconShieldCheck size={22} />;
    case "chart":
      return <IconChartMini />;
    case "hand":
      return <IconHandshake size={22} tone="white" />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function ConfianceExperience({ content }: { content: NecsContent }) {
  const channels = useChannels(content);
  const { openQuoteModal } = useQuoteModal();

  return (
    <div className="ncf">
      <section className="ncf-hero" aria-label="Notre engagement">
        <div className="ncf-hero__media" aria-hidden>
          <Image
            src={content.images.hero}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 30%" }}
          />
          <div className="ncf-hero__veil" />
        </div>
        <div className="container ncf-hero__grid">
          <div className="ncf-hero__copy">
            <p className="ncf-kicker">Notre engagement</p>
            <h1>{content.testTitle}</h1>
            <p className="ncf-hero__lead">
              La rigueur de nos équipes et la qualité de nos prestations font la
              différence au quotidien.
            </p>
            <ul className="ncf-hero__chips">
              <li>
                <IconUsers size={20} tone="white" />
                <span>Des clients satisfaits</span>
              </li>
              <li>
                <IconShieldCheck size={20} />
                <span>Des espaces plus sains</span>
              </li>
              <li>
                <IconHandshake size={20} tone="white" />
                <span>Une relation durable</span>
              </li>
            </ul>
          </div>
          <p className="ncf-script ncf-hero__script">
            Des équipes engagées
            <br />
            pour des espaces qui
            <br />
            inspirent confiance&nbsp;!
          </p>
        </div>
      </section>

      <section className="ncf-pillars">
        <div className="container ncf-pillars__grid">
          {PILLARS.map((pillar, i) => (
            <article key={pillar.title} className="ncf-pillar">
              <div className="ncf-pillar__icon">
                <PillarIcon kind={pillar.icon} />
              </div>
              <h2>{pillar.title}</h2>
              <p>{pillar.text}</p>
              <figure
                className={`ncf-pillar__photo reveal reveal-media public-img-wrap reveal-delay-${(i % 4) + 1}`}
              >
                <Image
                  src={content.images[pillar.imageKey]}
                  alt={pillar.caption}
                  fill
                  unoptimized
                  sizes="(max-width:900px) 100vw, 25vw"
                  style={{ objectFit: "cover" }}
                />
                <figcaption>{pillar.caption}</figcaption>
              </figure>
            </article>
          ))}
        </div>
      </section>

      <section className="ncf-process">
        <div className="container">
          <header className="ncf-process__head">
            <h2>Notre démarche au quotidien</h2>
            <p>Une méthodologie claire pour des résultats durables</p>
          </header>
          <ol className="ncf-steps">
            {STEPS.map((step, i) => (
              <li key={step.title} className="ncf-step">
                <StepIcon kind={step.icon} />
                <strong>{step.title}</strong>
                <span>{step.text}</span>
                {i < STEPS.length - 1 ? <IconStepArrow /> : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ncf-why">
        <div className="container">
          <p className="ncf-why__goal">
            Notre objectif&nbsp;: vous garantir des espaces propres, un service
            rigoureux et une relation de confiance durable.
          </p>
          <div className="ncf-why__row">
            <div className="ncf-why__grid">
              {WHY.map((item) => (
                <div key={item.label} className="ncf-why__item">
                  <span className="ncf-why__icon" aria-hidden>
                    <WhyIcon kind={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="ncf-cta"
              onClick={() => openQuoteModal("Devis - Ils nous font confiance")}
            >
              Demander un devis
              <span className="ncf-cta__arrow" aria-hidden>
                <IconArrow />
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="ncf-quotes" aria-label="Témoignages">
        <div className="container">
          <header className="ncf-quotes__head">
            <p className="ncf-kicker">Témoignages</p>
            <h2>Ce que disent nos clients</h2>
          </header>
          <div className="ncf-quotes__grid">
            {[
              [content.t1Text, content.t1Name, content.t1Role],
              [content.t2Text, content.t2Name, content.t2Role],
              [content.t3Text, content.t3Name, content.t3Role],
            ].map(([text, name, role]) => (
              <blockquote className="ncf-quote" key={name}>
                <p>{text}</p>
                <footer>
                  <strong>{name}</strong>
                  <span>{role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="ncf-contact">
        <div className="container ncf-contact__grid">
          {channels.telHref ? (
            <a className="ncf-contact__item" href={channels.telHref}>
              <IconPhone />
              <div>
                <strong>{channels.displayPhone}</strong>
                <span>Notre équipe vous répond rapidement&nbsp;!</span>
              </div>
            </a>
          ) : (
            <div className="ncf-contact__item">
              <IconPhone />
              <div>
                <strong>{channels.displayPhone}</strong>
                <span>Notre équipe vous répond rapidement&nbsp;!</span>
              </div>
            </div>
          )}

          {channels.mailHref ? (
            <a className="ncf-contact__item" href={channels.mailHref}>
              <IconMail />
              <div>
                <strong>{channels.mail}</strong>
                <span>Écrivez-nous</span>
              </div>
            </a>
          ) : (
            <div className="ncf-contact__item">
              <IconMail />
              <div>
                <strong>{channels.mail}</strong>
                <span>Écrivez-nous</span>
              </div>
            </div>
          )}

          <div className="ncf-contact__item">
            <IconPin />
            <div>
              <strong>Yaoundé, Douala et environs</strong>
              <span>Interventions sur demande</span>
            </div>
          </div>

          <div className="ncf-contact__values">
            <IconLeaf />
            <p>
              <span>Propreté</span>
              <span>Rigueur</span>
              <span>Confiance</span>
            </p>
          </div>
        </div>
        <div className="container ncf-contact__more">
          <Link href="/contact">Page contact complète</Link>
        </div>
      </section>
    </div>
  );
}
