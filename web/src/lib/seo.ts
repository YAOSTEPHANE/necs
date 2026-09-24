import type { Metadata } from "next";

/** URL publique canonique (prod Vercel ou domaine custom). */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
  }
  return "https://servicesnecs.vercel.app";
}

export const SITE = {
  name: "NECS",
  legalName: "NECLEANING & SERVICES SARL",
  shortName: "NECS SARL",
  tagline: "Propreté, Rigueur, Confiance",
  description:
    "NECS (NECLEANING & SERVICES SARL) — nettoyage professionnel et facility services au Cameroun. Prestations mesurables pour entreprises, industries, commerces et particuliers à Yaoundé, Douala et environs.",
  locale: "fr_CM",
  language: "fr",
  email: "contact@necs-cm.com",
  phone: "+237641335553",
  phoneDisplay: "+237 641 33 55 53",
  areaServed: ["Yaoundé", "Douala", "Cameroun"] as const,
  sameAs: [] as string[],
  geo: {
    region: "CM",
    placename: "Yaoundé",
    /** Approx. centre Yaoundé — pour moteurs / cartes. */
    position: "3.8480;11.5021",
    icbm: "3.8480, 11.5021",
  },
  openingHours: ["Mo-Fr 08:00-17:30"] as const,
  priceRange: "$$",
} as const;

/** Intentions de recherche locales & métier (Google, Bing, Yahoo, DuckDuckGo…). */
export const SITE_KEYWORDS = [
  "NECS",
  "NECLEANING & SERVICES",
  "NECS SARL",
  "nettoyage professionnel Cameroun",
  "entreprise de nettoyage Yaoundé",
  "société de nettoyage Douala",
  "facility services Cameroun",
  "entretien de bureaux Yaoundé",
  "nettoyage industriel Cameroun",
  "nettoyage commerces Douala",
  "propreté entreprise Cameroun",
  "devis nettoyage professionnel",
  "contrôle qualité digital nettoyage",
  "hygiène établissements de santé Cameroun",
  "nettoyage hôtels Yaoundé",
  "nettoyage écoles Cameroun",
  "nettoyage particuliers Yaoundé",
  "prestataire facility management Cameroun",
] as const;

export const PUBLIC_ROUTES: Array<{
  path: string;
  title: string;
  description: string;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
}> = [
  {
    path: "/",
    title: "NECS SARL — Propreté, Rigueur, Confiance",
    description: SITE.description,
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/pourquoi",
    title: "Pourquoi NECS",
    description:
      "La différence NECS : équipes formées, encadrement de proximité et reporting digital pour une propreté mesurable au Cameroun.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/apropos",
    title: "À propos",
    description:
      "NECLEANING & SERVICES SARL accompagne entreprises, industries, commerces et particuliers avec des espaces propres et un service rigoureux.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/realisations",
    title: "Réalisations",
    description:
      "Sites, résultats et indicateurs qualité : découvrez les réalisations NECS en nettoyage professionnel au Cameroun.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/objectif",
    title: "Objectif",
    description:
      "Devenir la référence digitale du nettoyage et des facility services au Cameroun, avec des prestations transparentes et mesurables.",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/activites",
    title: "Activités & prestations",
    description:
      "Bureaux, industrie, commerces, santé, hôtels, écoles et particuliers : protocoles de nettoyage sur mesure par NECS.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/temoignages",
    title: "Ils nous font confiance",
    description:
      "Témoignages clients NECS : engagement qualité, reporting et confiance durable sur vos sites.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/blog",
    title: "Blog",
    description:
      "Conseils propreté, contrôle qualité digital et pilotage terrain — le blog NECS pour dirigeants et responsables de site.",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    path: "/contact",
    title: "Contact & devis",
    description:
      "Demandez un devis ou une visite technique. Un conseiller NECS vous répond sous 24 heures ouvrées.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/mentions-legales",
    title: "Mentions légales",
    description:
      "Mentions légales de NECLEANING & SERVICES SARL (NECS) — éditeur et hébergeur du site.",
    changeFrequency: "yearly",
    priority: 0.2,
  },
  {
    path: "/confidentialite",
    title: "Confidentialité",
    description:
      "Politique de confidentialité NECS : traitement des données des formulaires, cookies et droits des personnes.",
    changeFrequency: "yearly",
    priority: 0.2,
  },
];

/** Prestations indexables (schema.org Service / OfferCatalog). */
export const SERVICE_OFFERINGS = [
  {
    name: "Entretien de bureaux",
    description:
      "Sols, postes, sanitaires et vitrerie intérieure pour sièges et espaces tertiaires.",
    path: "/activites",
  },
  {
    name: "Nettoyage industriel",
    description:
      "Zones techniques, entrepôts et flux opérationnels avec consignes sécurité renforcées.",
    path: "/activites",
  },
  {
    name: "Commerces & espaces publics",
    description:
      "Mall, retail et accueil client : propreté continue et expérience visiteur premium.",
    path: "/activites",
  },
  {
    name: "Nettoyage pour particuliers",
    description:
      "Entretien domicile avec équipes discrètes et protocoles adaptés à la vie de famille.",
    path: "/activites",
  },
  {
    name: "Établissements de santé",
    description:
      "Protocoles d’hygiène renforcés pour cliniques, cabinets et laboratoires.",
    path: "/activites",
  },
  {
    name: "Hôtels & résidences",
    description:
      "Chambres, parties communes et back-office pour une expérience client impeccable.",
    path: "/activites",
  },
  {
    name: "Écoles & universités",
    description:
      "Salles, sanitaires et espaces collectifs entretenus hors temps scolaire.",
    path: "/activites",
  },
  {
    name: "Salles & espaces publics",
    description:
      "Interventions planifiées selon les flux et les événements.",
    path: "/activites",
  },
] as const;

/** FAQ pour rich results (accueil / contact). */
export const FAQ_ITEMS = [
  {
    question: "Dans quelles villes NECS intervient-elle ?",
    answer:
      "NECS intervient principalement à Yaoundé, Douala et environs, pour entreprises, industries, commerces, établissements et particuliers.",
  },
  {
    question: "Comment obtenir un devis de nettoyage professionnel ?",
    answer:
      "Remplissez le formulaire sur la page Contact ou écrivez à contact@necs-cm.com. Un conseiller NECS vous répond sous 24 heures ouvrées.",
  },
  {
    question: "Quels types de sites NECS entretient-elle ?",
    answer:
      "Bureaux, sites industriels, commerces, établissements de santé, hôtels, écoles, salles publiques et domiciles particuliers, avec des protocoles adaptés à chaque environnement.",
  },
  {
    question: "Le reporting qualité est-il digital ?",
    answer:
      "Oui. NECS s’appuie sur le pointage, des checklists et un contrôle qualité digital pour rendre chaque prestation mesurable et traçable.",
  },
  {
    question: "Quels sont les horaires de contact ?",
    answer:
      "Du lundi au vendredi, de 08h00 à 17h30. Pour les urgences sites sous contrat, votre interlocuteur NECS reste joignable selon les modalités définies.",
  },
] as const;

type BuildOpts = {
  title: string;
  description: string;
  path?: string;
  /** Si true, n’applique pas le template `%s · NECS`. */
  absoluteTitle?: boolean;
  noIndex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  image?: string;
  keywords?: readonly string[];
};

export function buildPageMetadata(opts: BuildOpts): Metadata {
  const site = getSiteUrl();
  const path = opts.path ?? "/";
  const url = path === "/" ? site : `${site}${path.startsWith("/") ? path : `/${path}`}`;
  const image = opts.image ?? "/opengraph-image";
  const title = opts.absoluteTitle ? { absolute: opts.title } : opts.title;
  const ogTitle = opts.absoluteTitle ? opts.title : `${opts.title} · NECS`;
  const keywords = opts.keywords
    ? [...SITE_KEYWORDS, ...opts.keywords]
    : [...SITE_KEYWORDS];

  return {
    title,
    description: opts.description,
    keywords: [...new Set(keywords)],
    alternates: {
      canonical: url,
      languages: {
        "fr-CM": url,
        fr: url,
        "x-default": url,
      },
    },
    robots: opts.noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: opts.type ?? "website",
      locale: SITE.locale,
      alternateLocale: ["fr_FR"],
      url,
      siteName: SITE.name,
      title: ogTitle,
      description: opts.description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${SITE.shortName} — ${SITE.tagline}`,
          type: "image/png",
        },
      ],
      ...(opts.publishedTime ? { publishedTime: opts.publishedTime } : {}),
      ...(opts.modifiedTime ? { modifiedTime: opts.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: opts.description,
      images: [image],
    },
    other: {
      "geo.region": SITE.geo.region,
      "geo.placename": SITE.geo.placename,
      "geo.position": SITE.geo.position,
      ICBM: SITE.geo.icbm,
      "og:locale:alternate": "fr_FR",
    },
  };
}

/** Metas navigateur / moteur à fusionner dans le layout racine. */
export function browserEngineMeta(): NonNullable<Metadata["other"]> {
  return {
    "geo.region": SITE.geo.region,
    "geo.placename": SITE.geo.placename,
    "geo.position": SITE.geo.position,
    ICBM: SITE.geo.icbm,
    "msapplication-TileColor": "#0a3a72",
    "msapplication-config": "none",
    "apple-mobile-web-app-title": SITE.name,
    "mobile-web-app-capable": "yes",
    "format-detection": "telephone=no, address=no, email=no",
    rating: "general",
    distribution: "global",
    "revisit-after": "7 days",
  };
}

export function organizationJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness", "ProfessionalService"],
    "@id": `${site}/#organization`,
    name: SITE.legalName,
    alternateName: [SITE.name, SITE.shortName],
    legalName: SITE.legalName,
    url: site,
    logo: {
      "@type": "ImageObject",
      url: `${site}/icons/icon-512.png`,
      width: 512,
      height: 512,
    },
    image: `${site}/opengraph-image`,
    description: SITE.description,
    email: SITE.email,
    telephone: SITE.phoneDisplay,
    priceRange: SITE.priceRange,
    currenciesAccepted: "XAF",
    paymentAccepted: "Cash, Bank Transfer, Mobile Money",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "17:30",
      },
    ],
    areaServed: SITE.areaServed.map((name) => ({
      "@type": "Place",
      name,
    })),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Yaoundé",
      addressRegion: "Centre",
      addressCountry: "CM",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 3.848,
      longitude: 11.5021,
    },
    knowsAbout: [
      "Nettoyage professionnel",
      "Facility services",
      "Contrôle qualité digital",
      "Hygiène des établissements",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: SITE.phoneDisplay,
        email: SITE.email,
        contactType: "customer service",
        areaServed: "CM",
        availableLanguage: ["French", "fr"],
      },
      {
        "@type": "ContactPoint",
        telephone: SITE.phoneDisplay,
        email: SITE.email,
        contactType: "sales",
        areaServed: "CM",
        availableLanguage: ["French"],
      },
    ],
    ...(SITE.sameAs.length ? { sameAs: [...SITE.sameAs] } : {}),
  };
}

export function websiteJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site}/#website`,
    url: site,
    name: SITE.shortName,
    alternateName: SITE.legalName,
    description: SITE.description,
    publisher: { "@id": `${site}/#organization` },
    inLanguage: SITE.language,
    copyrightHolder: { "@id": `${site}/#organization` },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
) {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.path === "/" ? site : `${site}${item.path}`,
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
}) {
  const site = getSiteUrl();
  const url = `${site}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    image: [`${site}${input.image ?? "/opengraph-image"}`],
    author: {
      "@type": "Organization",
      name: SITE.legalName,
      url: site,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.legalName,
      logo: {
        "@type": "ImageObject",
        url: `${site}/icons/icon-512.png`,
      },
    },
    inLanguage: SITE.language,
    isAccessibleForFree: true,
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified
      ? { dateModified: input.dateModified }
      : input.datePublished
        ? { dateModified: input.datePublished }
        : {}),
  };
}

export function faqJsonLd(items: typeof FAQ_ITEMS = FAQ_ITEMS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function servicesJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${site}/#services`,
    name: "Prestations NECS",
    description:
      "Catalogue des prestations de nettoyage professionnel et facility services NECS au Cameroun.",
    itemListElement: SERVICE_OFFERINGS.map((svc, i) => ({
      "@type": "Offer",
      position: i + 1,
      itemOffered: {
        "@type": "Service",
        name: svc.name,
        description: svc.description,
        provider: { "@id": `${site}/#organization` },
        areaServed: SITE.areaServed.map((name) => ({
          "@type": "Place",
          name,
        })),
        url: `${site}${svc.path}`,
      },
    })),
  };
}

export function contactPageJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${site}/contact#webpage`,
    url: `${site}/contact`,
    name: "Contact & devis — NECS",
    description:
      "Demandez un devis ou une visite technique. Un conseiller NECS vous répond sous 24 heures ouvrées.",
    isPartOf: { "@id": `${site}/#website` },
    about: { "@id": `${site}/#organization` },
    inLanguage: SITE.language,
    mainEntity: {
      "@type": "Organization",
      "@id": `${site}/#organization`,
    },
  };
}

export function webPageJsonLd(input: {
  path: string;
  name: string;
  description: string;
}) {
  const site = getSiteUrl();
  const url =
    input.path === "/" ? site : `${site}${input.path.startsWith("/") ? input.path : `/${input.path}`}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    isPartOf: { "@id": `${site}/#website` },
    about: { "@id": `${site}/#organization` },
    inLanguage: SITE.language,
  };
}

/** Graph JSON-LD global (toutes pages publiques). */
export function siteGraphJsonLd() {
  return [organizationJsonLd(), websiteJsonLd(), servicesJsonLd()];
}
