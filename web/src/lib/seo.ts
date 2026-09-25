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

/** Villes & zones Cameroun — signaux locaux pour Google / Bing Maps. */
export const CAMEROON_CITIES = [
  {
    name: "Yaoundé",
    region: "Centre",
    latitude: 3.848,
    longitude: 11.5021,
  },
  {
    name: "Douala",
    region: "Littoral",
    latitude: 4.0511,
    longitude: 9.7679,
  },
] as const;

export const SITE = {
  name: "NECS",
  legalName: "NECLEANING & SERVICES SARL",
  shortName: "NECS SARL",
  tagline: "Propreté, Rigueur, Confiance",
  /** Accroche SEO principale — entreprise camerounaise. */
  description:
    "NECS (NECLEANING & SERVICES SARL) est une entreprise camerounaise de nettoyage professionnel et de facility services à Yaoundé et Douala. Prestations mesurables pour entreprises, industries, commerces, établissements et particuliers au Cameroun.",
  locale: "fr_CM",
  language: "fr-CM",
  email: "contact@necs-cm.com",
  phone: "+237641335553",
  phoneDisplay: "+237 641 33 55 53",
  country: "Cameroun",
  countryCode: "CM",
  currency: "XAF",
  timezone: "Africa/Douala",
  areaServed: [
    "Yaoundé",
    "Douala",
    "Région du Centre",
    "Région du Littoral",
    "Cameroun",
  ] as const,
  sameAs: [] as string[],
  geo: {
    /** ISO 3166-2 : Cameroun — Centre (siège Yaoundé). */
    region: "CM-CE",
    country: "CM",
    placename: "Yaoundé, Cameroun",
    position: "3.8480;11.5021",
    icbm: "3.8480, 11.5021",
  },
  geoDouala: {
    region: "CM-LT",
    placename: "Douala, Cameroun",
    position: "4.0511;9.7679",
    icbm: "4.0511, 9.7679",
  },
  openingHours: ["Mo-Fr 08:00-17:30"] as const,
  priceRange: "$$",
} as const;

/**
 * Intentions de recherche locales Cameroun (Google CM, Bing, Yahoo, DuckDuckGo).
 * Priorité : marque + ville + métier + longue traîne devis / secteur.
 */
export const SITE_KEYWORDS = [
  // Marque
  "NECS",
  "NECS SARL",
  "NECLEANING & SERVICES",
  "NECLEANING & SERVICES SARL",
  "NECS Cameroun",
  "NECS Yaoundé",
  "NECS Douala",
  // Nation / marché
  "entreprise de nettoyage Cameroun",
  "société de nettoyage Cameroun",
  "nettoyage professionnel Cameroun",
  "facility services Cameroun",
  "facility management Cameroun",
  "prestataire nettoyage Cameroun",
  "propreté entreprise Cameroun",
  "hygiène professionnelle Cameroun",
  "entretien locaux Cameroun",
  "SARL nettoyage Cameroun",
  // Yaoundé
  "entreprise de nettoyage Yaoundé",
  "société de nettoyage Yaoundé",
  "nettoyage professionnel Yaoundé",
  "entretien de bureaux Yaoundé",
  "nettoyage bureaux Yaoundé",
  "nettoyage industriel Yaoundé",
  "nettoyage commerces Yaoundé",
  "nettoyage hôtels Yaoundé",
  "nettoyage particuliers Yaoundé",
  "devis nettoyage Yaoundé",
  "facility services Yaoundé",
  // Douala
  "entreprise de nettoyage Douala",
  "société de nettoyage Douala",
  "nettoyage professionnel Douala",
  "entretien de bureaux Douala",
  "nettoyage bureaux Douala",
  "nettoyage industriel Douala",
  "nettoyage commerces Douala",
  "nettoyage hôtels Douala",
  "nettoyage particuliers Douala",
  "devis nettoyage Douala",
  "facility services Douala",
  // Secteurs
  "nettoyage industriel Cameroun",
  "nettoyage commerces Cameroun",
  "hygiène établissements de santé Cameroun",
  "nettoyage cliniques Yaoundé",
  "nettoyage cliniques Douala",
  "nettoyage écoles Cameroun",
  "nettoyage universités Cameroun",
  "contrôles qualité digital nettoyage Cameroun",
  "pointage agents nettoyage Cameroun",
  // Conversion
  "devis nettoyage professionnel Cameroun",
  "devis facility services Cameroun",
  "visite technique nettoyage Yaoundé",
  "visite technique nettoyage Douala",
  "Mobile Money nettoyage Cameroun",
  "nettoyage Bastos Yaoundé",
  "nettoyage Nlongkak Yaoundé",
  "nettoyage Bonanjo Douala",
  "nettoyage Akwa Douala",
  "entreprise facility management Yaoundé",
  "entreprise facility management Douala",
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
    title: "NECS SARL — Nettoyage professionnel au Cameroun",
    description: SITE.description,
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/pourquoi",
    title: "Pourquoi NECS",
    description:
      "Pourquoi choisir NECS au Cameroun : équipes formées à Yaoundé et Douala, encadrement de proximité et reporting digital pour une propreté mesurable.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/apropos",
    title: "À propos",
    description:
      "NECLEANING & SERVICES SARL (NECS) — société camerounaise de nettoyage et facility services. Nous accompagnons entreprises, industries, commerces et particuliers à Yaoundé, Douala et au Cameroun.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/realisations",
    title: "Réalisations",
    description:
      "Réalisations NECS au Cameroun : sites à Yaoundé et Douala, indicateurs qualité et résultats de nettoyage professionnel mesurables.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/objectif",
    title: "Objectif",
    description:
      "Objectif NECS : devenir la référence digitale du nettoyage et des facility services au Cameroun, avec des prestations transparentes et mesurables.",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/activites",
    title: "Activités & prestations",
    description:
      "Prestations de nettoyage au Cameroun — bureaux, industrie, commerces, santé, hôtels, écoles et particuliers à Yaoundé, Douala et environs.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/temoignages",
    title: "Ils nous font confiance",
    description:
      "Témoignages clients NECS au Cameroun : engagement qualité, reporting et confiance durable sur vos sites à Yaoundé et Douala.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/blog",
    title: "Blog",
    description:
      "Blog NECS Cameroun : conseils propreté, contrôle qualité digital et pilotage terrain pour dirigeants et responsables de site à Yaoundé et Douala.",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    path: "/contact",
    title: "Contact & devis",
    description:
      "Devis nettoyage professionnel au Cameroun — contactez NECS à Yaoundé ou Douala. Réponse sous 24 heures ouvrées (fuseau Africa/Douala).",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/mentions-legales",
    title: "Mentions légales",
    description:
      "Mentions légales de NECLEANING & SERVICES SARL (NECS), entreprise basée au Cameroun — éditeur et hébergeur du site.",
    changeFrequency: "yearly",
    priority: 0.2,
  },
  {
    path: "/confidentialite",
    title: "Confidentialité",
    description:
      "Politique de confidentialité NECS (Cameroun) : traitement des données des formulaires, cookies et droits des personnes.",
    changeFrequency: "yearly",
    priority: 0.2,
  },
  {
    path: "/nettoyage-yaounde",
    title: "Nettoyage professionnel à Yaoundé",
    description:
      "Entreprise de nettoyage à Yaoundé : bureaux, industries, commerces et particuliers. Devis NECS sous 24 h ouvrées.",
    changeFrequency: "monthly",
    priority: 0.95,
  },
  {
    path: "/nettoyage-douala",
    title: "Nettoyage professionnel à Douala",
    description:
      "Entreprise de nettoyage à Douala : bureaux, industries, commerces et particuliers. Devis NECS sous 24 h ouvrées.",
    changeFrequency: "monthly",
    priority: 0.95,
  },
  {
    path: "/services/entretien-bureaux",
    title: "Entretien de bureaux",
    description:
      "Entretien de bureaux à Yaoundé et Douala — NECS Cameroun.",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/services/nettoyage-industriel",
    title: "Nettoyage industriel",
    description:
      "Nettoyage industriel à Yaoundé et Douala — NECS Cameroun.",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/services/nettoyage-commerces",
    title: "Nettoyage commerces",
    description:
      "Nettoyage de commerces et espaces publics à Yaoundé et Douala — NECS.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/services/hygiene-sante",
    title: "Hygiène santé",
    description:
      "Hygiène des établissements de santé à Yaoundé et Douala — NECS.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/services/hotels-residences",
    title: "Hôtels & résidences",
    description:
      "Nettoyage hôtels et résidences à Yaoundé et Douala — NECS.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/services/ecoles-universites",
    title: "Écoles & universités",
    description:
      "Nettoyage écoles et universités au Cameroun — NECS Yaoundé & Douala.",
    changeFrequency: "monthly",
    priority: 0.75,
  },
  {
    path: "/services/nettoyage-particuliers",
    title: "Nettoyage particuliers",
    description:
      "Nettoyage domicile à Yaoundé et Douala — NECS Cameroun.",
    changeFrequency: "monthly",
    priority: 0.75,
  },
];

/** Prestations indexables — ancrage Cameroun / Yaoundé / Douala. */
export const SERVICE_OFFERINGS = [
  {
    name: "Entretien de bureaux au Cameroun",
    description:
      "Sols, postes, sanitaires et vitrerie pour sièges et espaces tertiaires à Yaoundé, Douala et environs.",
    path: "/services/entretien-bureaux",
  },
  {
    name: "Nettoyage industriel au Cameroun",
    description:
      "Zones techniques, entrepôts et flux opérationnels avec consignes sécurité renforcées sur sites industriels camerounais.",
    path: "/services/nettoyage-industriel",
  },
  {
    name: "Commerces & espaces publics",
    description:
      "Mall, retail et accueil client à Douala et Yaoundé : propreté continue et expérience visiteur premium.",
    path: "/services/nettoyage-commerces",
  },
  {
    name: "Nettoyage pour particuliers",
    description:
      "Entretien domicile à Yaoundé et Douala avec équipes discrètes et protocoles adaptés à la vie de famille.",
    path: "/services/nettoyage-particuliers",
  },
  {
    name: "Établissements de santé",
    description:
      "Protocoles d’hygiène renforcés pour cliniques, cabinets et laboratoires au Cameroun.",
    path: "/services/hygiene-sante",
  },
  {
    name: "Hôtels & résidences",
    description:
      "Chambres, parties communes et back-office pour hôtels et résidences à Yaoundé et Douala.",
    path: "/services/hotels-residences",
  },
  {
    name: "Écoles & universités",
    description:
      "Salles, sanitaires et espaces collectifs entretenus hors temps scolaire dans les établissements camerounais.",
    path: "/services/ecoles-universites",
  },
  {
    name: "Salles & espaces publics",
    description:
      "Interventions planifiées selon les flux et événements à Yaoundé, Douala et au Cameroun.",
    path: "/activites",
  },
] as const;

/** FAQ rich results — contexte Cameroun. */
export const FAQ_ITEMS = [
  {
    question: "NECS est-elle une entreprise camerounaise ?",
    answer:
      "Oui. NECLEANING & SERVICES SARL (NECS) est une société de nettoyage professionnel et de facility services basée au Cameroun, avec interventions principalement à Yaoundé, Douala et environs.",
  },
  {
    question: "Dans quelles villes du Cameroun NECS intervient-elle ?",
    answer:
      "NECS intervient principalement à Yaoundé (Région du Centre) et Douala (Région du Littoral), ainsi que dans les environs, pour entreprises, industries, commerces, établissements et particuliers.",
  },
  {
    question: "Comment obtenir un devis de nettoyage à Yaoundé ou Douala ?",
    answer:
      "Remplissez le formulaire sur la page Contact, appelez le +237 641 33 55 53 ou écrivez à contact@necs-cm.com. Un conseiller NECS vous répond sous 24 heures ouvrées (fuseau Africa/Douala).",
  },
  {
    question: "Quels types de sites NECS entretient-elle au Cameroun ?",
    answer:
      "Bureaux, sites industriels, commerces, établissements de santé, hôtels, écoles, salles publiques et domiciles particuliers, avec des protocoles adaptés à chaque environnement camerounais.",
  },
  {
    question: "Quels moyens de paiement accepte NECS ?",
    answer:
      "NECS facture en francs CFA (XAF) et accepte notamment le virement bancaire, le cash et le Mobile Money, selon les modalités du contrat.",
  },
  {
    question: "Le reporting qualité est-il digital ?",
    answer:
      "Oui. NECS s’appuie sur le pointage, des checklists et un contrôle qualité digital pour rendre chaque prestation mesurable et traçable sur vos sites au Cameroun.",
  },
  {
    question: "Quelle est la différence entre NECS Yaoundé et NECS Douala ?",
    answer:
      "Il s’agit de la même société camerounaise (NECLEANING & SERVICES SARL). Les équipes et plannings sont organisés pour couvrir Yaoundé (Centre) et Douala (Littoral) avec le même standard de qualité et de reporting.",
  },
  {
    question: "Proposez-vous l’entretien de bureaux et le nettoyage industriel ?",
    answer:
      "Oui. NECS couvre l’entretien de bureaux, le nettoyage industriel, les commerces, la santé, l’hôtellerie, les écoles et les particuliers. Voir les pages Services et Activités pour le détail.",
  },
] as const;

type BuildOpts = {
  title: string;
  description: string;
  path?: string;
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
  const ogTitle = opts.absoluteTitle ? opts.title : `${opts.title} · NECS Cameroun`;
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
      siteName: `${SITE.name} · Cameroun`,
      title: ogTitle,
      description: opts.description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${SITE.shortName} — Nettoyage professionnel au Cameroun (Yaoundé · Douala)`,
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
      "geo.country": SITE.countryCode,
      "og:locale:alternate": "fr_FR",
      "og:country-name": SITE.country,
      "content-language": SITE.language,
    },
  };
}

/** Metas navigateur / moteur — ciblage Cameroun. */
export function browserEngineMeta(): NonNullable<Metadata["other"]> {
  return {
    "geo.region": SITE.geo.region,
    "geo.placename": SITE.geo.placename,
    "geo.position": SITE.geo.position,
    ICBM: SITE.geo.icbm,
    "geo.country": SITE.countryCode,
    "og:country-name": SITE.country,
    "content-language": SITE.language,
    "msapplication-TileColor": "#0a3a72",
    "msapplication-config": "none",
    "apple-mobile-web-app-title": `${SITE.name} Cameroun`,
    "mobile-web-app-capable": "yes",
    "format-detection": "telephone=no, address=no, email=no",
    rating: "general",
    distribution: "global",
    coverage: "Cameroun",
    target: "Cameroun",
    audience: "Cameroun, Yaoundé, Douala",
    "revisit-after": "3 days",
  };
}

function areaServedSchema() {
  return [
    {
      "@type": "Country",
      name: "Cameroun",
      alternateName: "Cameroon",
      sameAs: "https://www.wikidata.org/wiki/Q1009",
    },
    ...CAMEROON_CITIES.map((city) => ({
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: city.region,
        containedInPlace: {
          "@type": "Country",
          name: "Cameroun",
        },
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: city.latitude,
        longitude: city.longitude,
      },
    })),
    {
      "@type": "AdministrativeArea",
      name: "Région du Centre",
      containedInPlace: { "@type": "Country", name: "Cameroun" },
    },
    {
      "@type": "AdministrativeArea",
      name: "Région du Littoral",
      containedInPlace: { "@type": "Country", name: "Cameroun" },
    },
  ];
}

export function organizationJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness", "ProfessionalService", "HomeAndConstructionBusiness"],
    "@id": `${site}/#organization`,
    name: SITE.legalName,
    alternateName: [SITE.name, SITE.shortName, "NECS Cameroun"],
    legalName: SITE.legalName,
    slogan: SITE.tagline,
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
    currenciesAccepted: SITE.currency,
    paymentAccepted: "Cash, Bank Transfer, Mobile Money, Orange Money, MTN MoMo",
    foundingLocation: {
      "@type": "Place",
      name: "Cameroun",
      address: {
        "@type": "PostalAddress",
        addressCountry: "CM",
      },
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "Yaoundé",
      addressLocality: "Yaoundé",
      addressRegion: "Centre",
      addressCountry: "CM",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: CAMEROON_CITIES[0].latitude,
      longitude: CAMEROON_CITIES[0].longitude,
    },
    hasMap: "https://www.google.com/maps/search/?api=1&query=Yaound%C3%A9%2C+Cameroun",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "17:30",
        timeZone: SITE.timezone,
      },
    ],
    areaServed: areaServedSchema(),
    serviceArea: areaServedSchema(),
    knowsAbout: [
      "Nettoyage professionnel au Cameroun",
      "Facility services Yaoundé",
      "Facility services Douala",
      "Contrôle qualité digital",
      "Hygiène des établissements",
      "Entretien de bureaux",
      "Nettoyage industriel",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: SITE.phoneDisplay,
        email: SITE.email,
        contactType: "customer service",
        areaServed: "CM",
        availableLanguage: ["French", "fr", "fr-CM"],
      },
      {
        "@type": "ContactPoint",
        telephone: SITE.phoneDisplay,
        email: SITE.email,
        contactType: "sales",
        areaServed: ["CM", "Yaoundé", "Douala"],
        availableLanguage: ["French", "fr-CM"],
      },
    ],
    ...(SITE.sameAs.length ? { sameAs: [...SITE.sameAs] } : {}),
  };
}

/** Entité séparée Douala — renforce le local pack multi-villes. */
export function doualaBranchJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${site}/#location-douala`,
    name: `${SITE.shortName} — Douala`,
    parentOrganization: { "@id": `${site}/#organization` },
    url: `${site}/contact`,
    telephone: SITE.phoneDisplay,
    email: SITE.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Douala",
      addressRegion: "Littoral",
      addressCountry: "CM",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: CAMEROON_CITIES[1].latitude,
      longitude: CAMEROON_CITIES[1].longitude,
    },
    areaServed: {
      "@type": "City",
      name: "Douala",
    },
    currenciesAccepted: SITE.currency,
    priceRange: SITE.priceRange,
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
    alternateName: [`${SITE.legalName}`, "NECS Cameroun"],
    description: SITE.description,
    publisher: { "@id": `${site}/#organization` },
    inLanguage: SITE.language,
    copyrightHolder: { "@id": `${site}/#organization` },
    about: {
      "@type": "Thing",
      name: "Nettoyage professionnel et facility services au Cameroun",
    },
    potentialAction: {
      "@type": "CommunicateAction",
      name: "Demander un devis",
      target: `${site}/contact`,
    },
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
    contentLocation: {
      "@type": "Country",
      name: "Cameroun",
    },
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified
      ? { dateModified: input.dateModified }
      : input.datePublished
        ? { dateModified: input.datePublished }
        : {}),
  };
}

export function faqJsonLd(
  items: readonly { question: string; answer: string }[] = FAQ_ITEMS,
) {
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
    name: "Prestations NECS au Cameroun",
    description:
      "Catalogue des prestations de nettoyage professionnel et facility services NECS à Yaoundé, Douala et au Cameroun.",
    itemListElement: SERVICE_OFFERINGS.map((svc, i) => ({
      "@type": "Offer",
      position: i + 1,
      priceCurrency: SITE.currency,
      availability: "https://schema.org/InStock",
      areaServed: areaServedSchema(),
      itemOffered: {
        "@type": "Service",
        name: svc.name,
        description: svc.description,
        provider: { "@id": `${site}/#organization` },
        areaServed: areaServedSchema(),
        serviceType: "Nettoyage professionnel",
        category: "Facility services",
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
    name: "Contact & devis — NECS Cameroun",
    description:
      "Demandez un devis de nettoyage professionnel à Yaoundé ou Douala. Un conseiller NECS vous répond sous 24 heures ouvrées.",
    isPartOf: { "@id": `${site}/#website` },
    about: { "@id": `${site}/#organization` },
    inLanguage: SITE.language,
    contentLocation: {
      "@type": "Country",
      name: "Cameroun",
    },
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
    input.path === "/"
      ? site
      : `${site}${input.path.startsWith("/") ? input.path : `/${input.path}`}`;
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
    contentLocation: {
      "@type": "Country",
      name: "Cameroun",
    },
  };
}

/** Graph JSON-LD global — ancrage Cameroun multi-villes. */
export function siteGraphJsonLd() {
  return [
    organizationJsonLd(),
    doualaBranchJsonLd(),
    websiteJsonLd(),
    servicesJsonLd(),
  ];
}

/** LocalBusiness ciblé ville — pages /nettoyage-yaounde|douala. */
export function cityLandingJsonLd(input: {
  path: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  description: string;
}) {
  const site = getSiteUrl();
  const url = `${site}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ProfessionalService"],
    "@id": `${url}#localbusiness`,
    name: `${SITE.shortName} — ${input.city}`,
    legalName: SITE.legalName,
    url,
    description: input.description,
    telephone: SITE.phoneDisplay,
    email: SITE.email,
    image: `${site}/opengraph-image`,
    priceRange: SITE.priceRange,
    currenciesAccepted: SITE.currency,
    parentOrganization: { "@id": `${site}/#organization` },
    address: {
      "@type": "PostalAddress",
      addressLocality: input.city,
      addressRegion: input.region,
      addressCountry: "CM",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: input.latitude,
      longitude: input.longitude,
    },
    areaServed: {
      "@type": "City",
      name: input.city,
      containedInPlace: {
        "@type": "Country",
        name: "Cameroun",
      },
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "17:30",
      },
    ],
  };
}

/** Service detail — pages /services/[slug]. */
export function serviceLandingJsonLd(input: {
  path: string;
  name: string;
  description: string;
  serviceType: string;
}) {
  const site = getSiteUrl();
  const url = `${site}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: input.name,
    description: input.description,
    serviceType: input.serviceType,
    provider: { "@id": `${site}/#organization` },
    url,
    areaServed: areaServedSchema(),
    offers: {
      "@type": "Offer",
      priceCurrency: SITE.currency,
      availability: "https://schema.org/InStock",
      url: `${site}/contact`,
      description: `Devis ${input.name} — Yaoundé & Douala`,
    },
  };
}
