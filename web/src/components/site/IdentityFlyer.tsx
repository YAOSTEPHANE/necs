import Link from "next/link";
import { IdentityQuoteButton } from "@/components/site/IdentityQuoteButton";

const PILLARS = [
  {
    title: "Expertise multi-secteurs",
    text: "Bureaux, industries, commerces, établissements de santé, résidences et espaces professionnels exigeants.",
    icon: "sectors",
  },
  {
    title: "Encadrement de proximité",
    text: "Superviseurs dédiés, checklists, contrôles qualité et actions correctives rapides.",
    icon: "clip",
  },
  {
    title: "Engagement durable",
    text: "Produits adaptés, formation continue, gestion responsable des ressources et respect des consignes sites.",
    icon: "leaf",
  },
  {
    title: "Solutions digitales",
    text: "Suivi en temps réel, rapports, checklists digitalisées, photos des interventions et indicateurs de performance.",
    icon: "screen",
  },
] as const;

const DOMAINS = [
  { title: "Bureaux", icon: "office" },
  { title: "Industries", icon: "industry" },
  { title: "Commerces", icon: "shop" },
  { title: "Établissements de santé", icon: "health" },
  { title: "Particuliers", icon: "home" },
  { title: "Hôtels & Résidences", icon: "hotel" },
  { title: "Écoles & Universités", icon: "school" },
  { title: "Salles & Espaces publics", icon: "public" },
] as const;

const DIGITAL_POINTS = [
  "Planification et suivi des interventions",
  "Checklists digitalisées",
  "Rapports avec photos",
  "Remontées d'anomalies et actions correctives",
  "Tableaux de bord et indicateurs de performance",
  "Communication simplifiée avec nos équipes",
] as const;

function Icon({ name }: { name: string }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
  };
  const stroke = {
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "sectors":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="2.4" {...stroke} />
          <circle cx="16" cy="8" r="2.4" {...stroke} />
          <path d="M4.5 19c.6-2.4 2.3-4 5.5-4s4.9 1.6 5.5 4" {...stroke} />
          <path d="M14 15.2c1.6-.4 3.3.2 4.5 1.6.6.7 1 1.5 1.2 2.2" {...stroke} />
        </svg>
      );
    case "clip":
      return (
        <svg {...common}>
          <path d="M8 4.5h8a1.5 1.5 0 0 1 1.5 1.5v14L12 17.5 6.5 20V6A1.5 1.5 0 0 1 8 4.5Z" {...stroke} />
          <path d="M9.5 9h5M9.5 12.5h5" {...stroke} />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common}>
          <path d="M5 16.5c6-1 10-5.2 12.5-12.5C10.5 5 6 9.2 5 16.5Z" {...stroke} />
          <path d="M8.5 13.5c1.8 1.8 3.8 2.6 6 3" {...stroke} />
        </svg>
      );
    case "screen":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="11.5" rx="1.6" {...stroke} />
          <path d="M8 19.5h8M12 16.5v3" {...stroke} />
        </svg>
      );
    case "office":
      return (
        <svg {...common}>
          <path d="M5 20V6.5A1.5 1.5 0 0 1 6.5 5H13v15" {...stroke} />
          <path d="M13 10h5.5A1.5 1.5 0 0 1 20 11.5V20" {...stroke} />
          <path d="M8 8.5h2M8 12h2M8 15.5h2M16 13.5h1.5M16 16.5h1.5" {...stroke} />
        </svg>
      );
    case "industry":
      return (
        <svg {...common}>
          <path d="M4 20V10l5 3V10l5 3V8h6v12H4Z" {...stroke} />
        </svg>
      );
    case "shop":
      return (
        <svg {...common}>
          <path d="M4.5 9.5 6 5h12l1.5 4.5v2A3 3 0 0 1 16 14.2V20H8v-5.8A3 3 0 0 1 4.5 11.5v-2Z" {...stroke} />
        </svg>
      );
    case "health":
      return (
        <svg {...common}>
          <path d="M9 4.5h6v4h4.5v7H15v4H9v-4H4.5V8.5H9V4.5Z" {...stroke} />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="M4 11.5 12 5l8 6.5V20H4v-8.5Z" {...stroke} />
          <path d="M10 20v-6h4v6" {...stroke} />
        </svg>
      );
    case "hotel":
      return (
        <svg {...common}>
          <path d="M4 20V8l8-4 8 4v12H4Z" {...stroke} />
          <path d="M10 20v-6h4v6" {...stroke} />
        </svg>
      );
    case "school":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 6l8 4.5v8.5H4v-8.5Z" {...stroke} />
          <path d="M12 6v14M8 14h.5M16 14h.5" {...stroke} />
        </svg>
      );
    case "public":
      return (
        <svg {...common}>
          <path d="M5 20V9h14v11" {...stroke} />
          <path d="M3 9h18M8 9V6.5h8V9" {...stroke} />
        </svg>
      );
    default:
      return null;
  }
}

function DeviceMockup() {
  return (
    <div className="id-devices" aria-hidden>
      <div className="id-laptop">
        <div className="id-laptop__screen">
          <div className="id-dash">
            <div className="id-dash__brand">
              <span>NECS</span>
              Vue d’ensemble
            </div>
            <div className="id-dash__kpis">
              <div>
                <strong>25</strong>
                Interventions
              </div>
              <div>
                <strong>23</strong>
                Terminées
              </div>
              <div>
                <strong>2</strong>
                En cours
              </div>
              <div>
                <strong>0</strong>
                Anomalie
              </div>
            </div>
            <div className="id-dash__chart">
              <p>Qualité des prestations</p>
              <svg viewBox="0 0 220 70" preserveAspectRatio="none">
                <path
                  d="M0 52 C20 50 30 48 45 40 C70 26 90 44 110 32 C140 16 160 28 180 18 C200 10 210 14 220 8"
                  fill="none"
                  stroke="#3ec8e8"
                  strokeWidth="3"
                />
              </svg>
              <div className="id-dash__rate">
                <strong>98%</strong>
                Taux de réalisation
              </div>
            </div>
          </div>
        </div>
        <div className="id-laptop__base" />
      </div>
      <div className="id-phone">
        <p>Checklist</p>
        <ul>
          {["Bureaux", "Salles de réunion", "Sanitaires", "Espaces communs", "Photos", "Validation client"].map(
            (item) => (
              <li key={item}>
                <span />
                {item}
              </li>
            ),
          )}
        </ul>
        <div className="id-phone__btn">Valider</div>
      </div>
    </div>
  );
}

export function IdentityFlyer() {

  return (
    <article className="identity-flyer">
      <section className="id-hero">
        <div className="container id-hero__grid">
          <div className="id-hero__copy">
            <p className="id-kicker">Notre identité</p>
            <h1>
              Des espaces propres.
              <br />
              <span>Un service rigoureux.</span>
              <br />
              Une confiance durable.
            </h1>
            <p className="id-lead">
              NECLEANING &amp; SERVICES SARL (NECS) est une société camerounaise
              de nettoyage et de facility services. Nous accompagnons les
              entreprises, industries, commerces, établissements et particuliers
              dans l’entretien et la propreté de leurs espaces, avec des équipes
              formées, un encadrement de proximité et des solutions digitales
              qui rendent chaque prestation mesurable, transparente et fiable.
            </p>
          </div>
          <figure className="id-hero__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/necs-identity-nettoyage.png"
              alt="Équipe de nettoyage NECS dans un espace professionnel"
            />
            <figcaption>
              Ensemble pour des espaces qui comptent !
              <strong>Des espaces sains pour des personnes qui comptent !</strong>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="id-pillars">
        <div className="container id-pillars__grid">
          {PILLARS.map((pillar) => (
            <article key={pillar.title}>
              <div className="id-icon">
                <Icon name={pillar.icon} />
              </div>
              <h2>{pillar.title}</h2>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="id-domains">
        <div className="container">
          <p className="id-kicker">Nos domaines d’intervention</p>
          <ul>
            {DOMAINS.map((domain) => (
              <li key={domain.title}>
                <div
                  className="id-icon id-icon--domain"
                  data-tone={domain.icon}
                >
                  <Icon name={domain.icon} />
                </div>
                <span>{domain.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="id-digital">
        <div className="container id-digital__grid">
          <div>
            <p className="id-kicker">Des solutions digitales pour une qualité visible</p>
            <h2>Notre plateforme digitale vous permet de suivre chaque prestation en toute transparence.</h2>
            <ul className="id-checks">
              {DIGITAL_POINTS.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <DeviceMockup />
        </div>
      </section>

      <section className="id-ambition">
        <div className="container id-ambition__row">
          <div>
            <p className="id-kicker">Notre ambition</p>
            <h2>
              Être le partenaire de référence en Afrique centrale pour des
              environnements sains, sûrs et agréables à vivre.
            </h2>
          </div>
          <div className="id-ambition__actions">
            <Link className="btn btn-ghost on-light" href="/objectif">
              Notre ambition
            </Link>
            <IdentityQuoteButton />
          </div>
        </div>
      </section>

      <section className="id-values">
        <div className="container id-values__row">
          <span>Propreté</span>
          <span>Rigueur</span>
          <span>Confiance</span>
          <em>Des solutions durables pour aujourd’hui et demain</em>
        </div>
      </section>
    </article>
  );
}
