"use client";

import { useQuoteModal } from "@/components/site/SiteShell";

const STEPS = [
  {
    title: "Digitaliser le cycle prospect → devis → contrat",
    text: "Centraliser les leads, devis et contrats dans un parcours unique, sans perte d’information.",
    icon: "contract" as const,
    points: ["Leads & opportunités centralisés", "Devis et contrats traçables"],
  },
  {
    title: "Standardiser l’exécution terrain et le contrôle qualité",
    text: "Checklists digitales, contrôles et preuves photo sur chaque intervention.",
    icon: "clipboard" as const,
    points: ["Checklists terrain unifiées", "Scores qualité mesurables"],
  },
  {
    title: "Piloter RH, absences et compétences en temps réel",
    text: "Planning agents, absences et compétences visibles pour mieux affecter les équipes.",
    icon: "people" as const,
    points: ["Planning agents à jour", "Compétences & absences visibles"],
  },
  {
    title: "Fiabiliser facturation, relances et reporting client",
    text: "Factures, relances et reporting client alignés sur le terrain réellement exécuté.",
    icon: "chart" as const,
    points: ["Facturation sans fuite", "Reporting client clair"],
  },
] as const;

export function ObjectifRoadmap() {
  const { openQuoteModal } = useQuoteModal();

  return (
    <section className="flyer" aria-label="Feuille de route NECS">
      <div className="container flyer__wrap">
        <header className="flyer__top">
          <p className="flyer__script">
            Des chantiers mieux pilotés pour des résultats concrets&nbsp;!
          </p>
          <div className="flyer__blob">
            Des solutions digitales au service de votre performance
          </div>
        </header>

        <div className="flyer__intro">
          <div className="flyer__copy">
            <p className="flyer__kicker">Feuille de route</p>
            <h2>
              Les chantiers prioritaires <em>NECS</em>
            </h2>
            <p>
              Une organisation digitalisée où chaque mission laisse une trace
              claire&nbsp;: qui est intervenu, quoi a été fait, quel score
              qualité, quelle facture.
            </p>
            <p className="flyer__goal">
              Notre objectif&nbsp;:{" "}
              <span className="is-blue">gagner en maîtrise</span>,{" "}
              <span className="is-green">réduire les pertes</span> et offrir une
              expérience premium à chaque client.
            </p>
          </div>

          <figure className="flyer__media" aria-label="Aperçu du back-office NECS">
            <div className="flyer-laptop">
              <div className="flyer-laptop__lid">
                <div className="flyer-laptop__screen">
                  <FlyerDashboardPreview />
                </div>
              </div>
              <div className="flyer-laptop__base" aria-hidden />
            </div>
          </figure>
        </div>

        <div className="flyer__steps">
          {STEPS.map((step, i) => (
            <div className="flyer-step" key={step.title}>
              <article>
                <header>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                </header>
                <div className="flyer-step__body">
                  <span className="flyer-step__icon" aria-hidden>
                    <StepIcon name={step.icon} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <ul>
                    {step.points.map((point) => (
                      <li key={point}>
                        <span aria-hidden>✓</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
              {i < STEPS.length - 1 ? (
                <span className="flyer-step__arrow" aria-hidden>
                  ›
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flyer__cta">
          <div className="flyer__cta-copy">
            <span className="flyer__cta-target" aria-hidden>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="4.6" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <path
                  d="M12 2.8v2.2M12 19v2.2M2.8 12h2.2M19 12h2.2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <strong>Construisons cette ambition avec vous.</strong>
              <span>Devenez un site pilote de l’excellence NECS.</span>
            </div>
          </div>
          <button
            type="button"
            className="flyer__cta-btn"
            onClick={() => openQuoteModal("Vision & partenariat")}
          >
            Parler à un conseiller
            <i aria-hidden>›</i>
          </button>
        </div>

        <footer className="flyer__foot">
          <div className="flyer__values">
            <div>
              <ValueIcon name="spark" />
              <strong>Propreté</strong>
            </div>
            <div>
              <ValueIcon name="gear" />
              <strong>Rigueur</strong>
            </div>
            <div>
              <ValueIcon name="trust" />
              <strong>Confiance</strong>
            </div>
          </div>
          <p className="flyer__foot-script">
            Ensemble pour des espaces qui comptent&nbsp;!
          </p>
        </footer>
      </div>
    </section>
  );
}

function FlyerDashboardPreview() {
  return (
    <div className="flyer-dash" aria-hidden>
      <aside className="flyer-dash__nav">
        <div className="flyer-dash__brand">NECS</div>
        {["Tableau", "Missions", "Qualité", "Équipes", "Clients"].map(
          (label, i) => (
            <span key={label} className={i === 0 ? "is-active" : undefined}>
              {label}
            </span>
          ),
        )}
      </aside>
      <div className="flyer-dash__main">
        <header className="flyer-dash__head">
          <div>
            <p>Pilot</p>
            <strong>Pilotage terrain</strong>
          </div>
          <em>Temps réel</em>
        </header>
        <div className="flyer-dash__kpis">
          <article style={{ ["--c" as string]: "#1260a8" }}>
            <small>Sites actifs</small>
            <strong>25</strong>
            <b className="up">+3</b>
          </article>
          <article style={{ ["--c" as string]: "#1f8a3c" }}>
            <small>Interventions</small>
            <strong>48</strong>
            <b className="up">+6</b>
          </article>
          <article style={{ ["--c" as string]: "#c47a12" }}>
            <small>Anomalies</small>
            <strong>06</strong>
            <b className="down">-2</b>
          </article>
          <article style={{ ["--c" as string]: "#0a2f5c" }}>
            <small>Satisfaction</small>
            <strong>91%</strong>
            <b className="up">+1%</b>
          </article>
        </div>
        <div className="flyer-dash__panels">
          <div className="flyer-dash__chart">
            <header>
              <strong>Suivi qualité</strong>
              <span>30 j</span>
            </header>
            <svg viewBox="0 0 240 90" preserveAspectRatio="none">
              <defs>
                <linearGradient id="flyerFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1260a8" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#1260a8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 70 C30 62 50 30 80 42 S130 78 160 48 S200 20 240 34 L240 90 L0 90 Z"
                fill="url(#flyerFill)"
              />
              <path
                d="M0 70 C30 62 50 30 80 42 S130 78 160 48 S200 20 240 34"
                fill="none"
                stroke="#1260a8"
                strokeWidth="3"
              />
              <path
                d="M0 78 C40 70 70 55 100 60 S160 50 200 58 240 52"
                fill="none"
                stroke="#2db85a"
                strokeWidth="2.5"
              />
            </svg>
          </div>
          <div className="flyer-dash__gauge">
            <header>
              <strong>Conformité</strong>
            </header>
            <div className="flyer-dash__ring">
              <strong>96%</strong>
            </div>
            <small>Taux de conformité</small>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIcon({
  name,
}: {
  name: "contract" | "clipboard" | "people" | "chart";
}) {
  const props = {
    viewBox: "0 0 24 24",
    width: 34,
    height: 34,
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
    case "contract":
      return (
        <svg {...props}>
          <rect x="3.5" y="5" width="17" height="12" rx="1.6" {...s} />
          <path d="M8 20h8M12 17v3" {...s} />
          <path d="M7 9h6M7 12h4" {...s} />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...props}>
          <path
            d="M8 4.5h8a1.5 1.5 0 0 1 1.5 1.5v14L12 17.5 6.5 20V6A1.5 1.5 0 0 1 8 4.5Z"
            {...s}
          />
          <path d="M9.5 9h5M9.5 12.5h5" {...s} />
        </svg>
      );
    case "people":
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="2.4" {...s} />
          <circle cx="16" cy="9" r="2" {...s} />
          <path d="M4.5 19c.6-2.4 2.3-4 5.5-4s4.9 1.6 5.5 4" {...s} />
          <path d="M14.5 15.5c1.5-.3 3 .3 4 1.6.5.6.8 1.3 1 1.9" {...s} />
        </svg>
      );
    case "chart":
      return (
        <svg {...props}>
          <path d="M4 19h16" {...s} />
          <path d="M7 16V11M12 16V8M17 16V5.5" {...s} />
        </svg>
      );
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}

function ValueIcon({ name }: { name: "spark" | "gear" | "trust" }) {
  const props = {
    viewBox: "0 0 24 24",
    width: 20,
    height: 20,
    fill: "none",
    "aria-hidden": true as const,
  };
  if (name === "spark") {
    return (
      <svg {...props}>
        <path
          d="M12 3l1.1 3.4L16.5 8l-3.4 1.1L12 12.5l-1.1-3.4L7.5 8l3.4-1.6L12 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "gear") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 4v2.1M12 17.9V20M4 12h2.1M17.9 12H20M6.3 6.3l1.5 1.5M16.2 16.2l1.5 1.5M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path
        d="M8.2 13.2l-1.8-1.8a1.5 1.5 0 0 1 2.1-2.1l1.5 1.5 4.8-4.8a1.6 1.6 0 1 1 2.3 2.3l-5.9 5.9a1.9 1.9 0 0 1-2.7 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
