"use client";

import { useQuoteModal } from "@/components/site/SiteShell";

export type ActivityService = {
  id: string;
  kicker?: string;
  titleLead: string;
  titleAccent: string;
  text: string;
  script?: string;
  badge?: string;
  heroImage: string;
  features: Array<{ icon: "calendar" | "room" | "glass" | "home" | "kitchen" | "bath"; label: string }>;
  gallery: Array<{ src: string; label: string }>;
  benefits: Array<{ icon: "people" | "gear" | "shield" | "chart" | "time" | "heart" | "spark" | "home"; label: string }>;
};

export function ActivityServiceFlyer({ service }: { service: ActivityService }) {
  const { openQuoteModal } = useQuoteModal();
  const fullTitle = `${service.titleLead} ${service.titleAccent}`.trim();

  return (
    <article className="svc" id={service.id}>
      <div className="svc__top">
        <p className="svc__script">
          {service.script ??
            "Des espaces plus propres, plus agréables au quotidien !"}
        </p>
        <div className="svc__badge">
          {service.badge ?? "Votre partenaire en propreté professionnelle"}
        </div>
      </div>

      <div className="svc__hero">
        <div className="svc__copy">
          <p className="svc__kicker">{service.kicker ?? "Nos services"}</p>
          <h2>
            {service.titleLead} <em>{service.titleAccent}</em>
          </h2>
          <p className="svc__lead">{service.text}</p>
          <ul className="svc__features">
            {service.features.map((f) => (
              <li key={f.label}>
                <span className="svc__feature-icon" aria-hidden>
                  <FeatIcon name={f.icon} />
                </span>
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <figure className="svc__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={service.heroImage} alt={fullTitle} />
        </figure>
      </div>

      <div className="svc__gallery" aria-label={`Galerie ${fullTitle}`}>
        {service.gallery.map((g) => (
          <figure key={g.label}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.src} alt={g.label} />
            <figcaption>{g.label}</figcaption>
          </figure>
        ))}
      </div>

      <div className="svc__benefits" aria-label="Bénéfices">
        {service.benefits.map((b) => (
          <div key={b.label}>
            <span className="svc__benefit-icon" aria-hidden>
              <BenefitIcon name={b.icon} />
            </span>
            <p>{b.label}</p>
          </div>
        ))}
      </div>

      <div className="svc__cta">
        <button
          type="button"
          className="svc__cta-btn"
          onClick={() => openQuoteModal(`Devis: ${fullTitle}`)}
        >
          Demander un devis
          <i aria-hidden>›</i>
        </button>
        <p className="svc__cta-note">
          <HeadsetIcon />
          <span>Une équipe à votre écoute pour des solutions sur mesure.</span>
        </p>
      </div>

      <footer className="svc__foot">
        <div className="svc__values">
          <div>
            <BenefitIcon name="spark" />
            <strong>Propreté</strong>
          </div>
          <div>
            <BenefitIcon name="gear" />
            <strong>Rigueur</strong>
          </div>
          <div>
            <BenefitIcon name="people" />
            <strong>Confiance</strong>
          </div>
        </div>
        <p className="svc__foot-script">
          Ensemble pour des espaces qui comptent&nbsp;!
        </p>
      </footer>
    </article>
  );
}

function FeatIcon({
  name,
}: {
  name: ActivityService["features"][number]["icon"];
}) {
  const p = {
    viewBox: "0 0 24 24",
    width: 22,
    height: 22,
    fill: "none",
    "aria-hidden": true as const,
  };
  const s = {
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "calendar":
      return (
        <svg {...p}>
          <rect x="4" y="5" width="16" height="15" rx="2" {...s} />
          <path d="M8 3.5v3M16 3.5v3M4 10h16" {...s} />
        </svg>
      );
    case "room":
      return (
        <svg {...p}>
          <path d="M5 20V8.5L12 4l7 4.5V20" {...s} />
          <path d="M10 20v-6h4v6" {...s} />
        </svg>
      );
    case "glass":
      return (
        <svg {...p}>
          <rect x="4" y="4" width="16" height="16" rx="1.5" {...s} />
          <path d="M4 12h16M12 4v16" {...s} />
        </svg>
      );
    case "home":
      return (
        <svg {...p}>
          <path d="M4 11.5 12 5l8 6.5V20H4v-8.5Z" {...s} />
          <path d="M10 20v-6h4v6" {...s} />
        </svg>
      );
    case "kitchen":
      return (
        <svg {...p}>
          <path d="M6 4v7a3 3 0 0 0 6 0V4M9 4v16" {...s} />
          <path d="M16 4v16M16 8h3a2 2 0 0 1 0 4h-3" {...s} />
        </svg>
      );
    case "bath":
      return (
        <svg {...p}>
          <path d="M6 12h13v3a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-3Z" {...s} />
          <path d="M6 12V8.5A2.5 2.5 0 0 1 8.5 6H11" {...s} />
        </svg>
      );
    default: {
      const _e: never = name;
      return _e;
    }
  }
}

function BenefitIcon({
  name,
}: {
  name: ActivityService["benefits"][number]["icon"];
}) {
  const p = {
    viewBox: "0 0 24 24",
    width: 28,
    height: 28,
    fill: "none",
    "aria-hidden": true as const,
  };
  const s = {
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "people":
      return (
        <svg {...p}>
          <circle cx="9" cy="8" r="2.3" {...s} />
          <circle cx="16" cy="9" r="2" {...s} />
          <path d="M4.5 19c.6-2.3 2.2-3.8 5.2-3.8s4.6 1.5 5.2 3.8" {...s} />
          <path d="M14.5 15.6c1.4-.3 2.9.2 3.9 1.5.5.6.8 1.2 1 1.9" {...s} />
        </svg>
      );
    case "gear":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" {...s} />
          <path
            d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4"
            {...s}
          />
        </svg>
      );
    case "shield":
      return (
        <svg {...p}>
          <path d="M12 3.5 19 7v5.2c0 4.2-2.9 7.4-7 8.8-4.1-1.4-7-4.6-7-8.8V7l7-3.5Z" {...s} />
          <path d="M9.5 12.2 11.2 14l3.5-4" {...s} />
        </svg>
      );
    case "chart":
      return (
        <svg {...p}>
          <path d="M4 19h16M7 16V11M12 16V8M17 16V5.5" {...s} />
        </svg>
      );
    case "time":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" {...s} />
          <path d="M12 8v4.5l3 2" {...s} />
        </svg>
      );
    case "heart":
      return (
        <svg {...p}>
          <path
            d="M12 19s-6.5-4.1-8.2-7.2C2.4 9.4 3.5 6.8 6.2 6.2c1.7-.4 3.3.4 4.3 1.7 1-1.3 2.6-2.1 4.3-1.7 2.7.6 3.8 3.2 2.4 5.6C18.5 14.9 12 19 12 19Z"
            {...s}
          />
        </svg>
      );
    case "spark":
      return (
        <svg {...p}>
          <path
            d="M12 3.5 13.2 7 17 8.2 13.2 9.4 12 13l-1.2-3.6L7 8.2 10.8 7 12 3.5Z"
            {...s}
          />
        </svg>
      );
    case "home":
      return (
        <svg {...p}>
          <path d="M4 11.5 12 5l8 6.5V20H4v-8.5Z" {...s} />
          <path d="M10 20v-6h4v6" {...s} />
        </svg>
      );
    default: {
      const _e: never = name;
      return _e;
    }
  }
}

function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden>
      <path
        d="M4.5 13v-1.5a7.5 7.5 0 0 1 15 0V13"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M4.5 13.5A2.5 2.5 0 0 0 7 16h.5v-5H7a2.5 2.5 0 0 0-2.5 2.5ZM19.5 13.5A2.5 2.5 0 0 1 17 16h-.5v-5H17a2.5 2.5 0 0 1 2.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M17 16.5v1a2.5 2.5 0 0 1-2.5 2.5H12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
