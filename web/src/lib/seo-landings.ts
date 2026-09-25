/** Contenu SEO landing — villes & prestations (Cameroun). */

export type SeoFaq = { question: string; answer: string };

export type SeoLanding = {
  slug: string;
  path: string;
  /** H1 */
  title: string;
  /** Meta title (sans suffixe template si absolute) */
  metaTitle: string;
  description: string;
  keywords: readonly string[];
  kicker: string;
  lead: string;
  sections: Array<{ heading: string; body: string }>;
  bullets: readonly string[];
  faqs: readonly SeoFaq[];
  ctaLabel: string;
  related: Array<{ href: string; label: string }>;
  /** Schema.org Service / LocalBusiness */
  schema:
    | {
        kind: "city";
        city: "Yaoundé" | "Douala";
        region: "Centre" | "Littoral";
        latitude: number;
        longitude: number;
      }
    | {
        kind: "service";
        serviceName: string;
        serviceType: string;
      };
};

export const CITY_LANDINGS: SeoLanding[] = [
  {
    slug: "nettoyage-yaounde",
    path: "/nettoyage-yaounde",
    title: "Entreprise de nettoyage à Yaoundé",
    metaTitle:
      "Nettoyage professionnel à Yaoundé | Entreprise NECS Cameroun",
    description:
      "NECS, entreprise de nettoyage professionnel à Yaoundé (Cameroun) : bureaux, industries, commerces, santé, hôtels et particuliers. Devis gratuit, équipes locales, reporting digital.",
    keywords: [
      "entreprise de nettoyage Yaoundé",
      "société de nettoyage Yaoundé",
      "nettoyage professionnel Yaoundé",
      "devis nettoyage Yaoundé",
      "entretien bureaux Yaoundé",
      "nettoyage industriel Yaoundé",
      "facility services Yaoundé",
      "nettoyage Bastos Yaoundé",
      "nettoyage Nlongkak Yaoundé",
    ],
    kicker: "Yaoundé · Région du Centre",
    lead:
      "NECLEANING & SERVICES SARL (NECS) accompagne les entreprises, administrations, commerces et particuliers à Yaoundé avec des prestations de propreté mesurables, encadrées et digitales.",
    sections: [
      {
        heading: "Pourquoi confier vos locaux Yaoundé à NECS ?",
        body:
          "À Yaoundé, la qualité perçue de vos espaces conditionne la confiance de vos visiteurs, collaborateurs et partenaires. NECS déploie des équipes formées, des checklists adaptées aux sites de la capitale et un suivi terrain avec preuves photo. Nous intervenons sur les axes tertiaires, les zones administratives et les sites sensibles où la discrétion et la ponctualité sont essentielles.",
      },
      {
        heading: "Prestations adaptées à la capitale",
        body:
          "Entretien de bureaux, nettoyage après travaux, hygiène des sanitaires, vitrerie intérieure, interventions périodiques pour commerces et hôtels, protocoles renforcés pour cliniques et cabinets. Chaque contrat à Yaoundé est cadré par un cahier des charges clair, un planning et des indicateurs de réalisation.",
      },
      {
        heading: "Devis et visite technique à Yaoundé",
        body:
          "Demandez un devis sous 24 heures ouvrées. Une visite technique peut être planifiée sur site pour évaluer surfaces, contraintes d’accès, horaires et niveaux de service. Facturation en francs CFA (XAF) ; Mobile Money et virement selon contrat.",
      },
    ],
    bullets: [
      "Équipes basées et supervisées pour Yaoundé",
      "Reporting digital : pointage, contrôles, photos",
      "Contrats adaptés PME, sièges et établissements",
      "Réponse devis sous 24 h ouvrées (Africa/Douala)",
    ],
    faqs: [
      {
        question: "NECS intervient-elle partout à Yaoundé ?",
        answer:
          "Oui. NECS couvre Yaoundé et environs (Centre) pour bureaux, commerces, industries légères, établissements et particuliers, selon disponibilité des créneaux et accès site.",
      },
      {
        question: "Comment obtenir un devis nettoyage à Yaoundé ?",
        answer:
          "Utilisez le formulaire de contact NECS, WhatsApp ou l’e-mail contact@necs-cm.com. Indiquez ville (Yaoundé), surface approximative et fréquence souhaitée.",
      },
    ],
    ctaLabel: "Demander un devis Yaoundé",
    related: [
      { href: "/nettoyage-douala", label: "Nettoyage à Douala" },
      { href: "/activites", label: "Toutes les prestations" },
      { href: "/contact", label: "Contact & devis" },
      { href: "/services/entretien-bureaux", label: "Entretien de bureaux" },
    ],
    schema: {
      kind: "city",
      city: "Yaoundé",
      region: "Centre",
      latitude: 3.848,
      longitude: 11.5021,
    },
  },
  {
    slug: "nettoyage-douala",
    path: "/nettoyage-douala",
    title: "Entreprise de nettoyage à Douala",
    metaTitle:
      "Nettoyage professionnel à Douala | Entreprise NECS Cameroun",
    description:
      "NECS, entreprise de nettoyage professionnel à Douala (Cameroun) : bureaux, industries, commerces, ports et particuliers. Devis gratuit, équipes locales Littoral, reporting digital.",
    keywords: [
      "entreprise de nettoyage Douala",
      "société de nettoyage Douala",
      "nettoyage professionnel Douala",
      "devis nettoyage Douala",
      "entretien bureaux Douala",
      "nettoyage industriel Douala",
      "facility services Douala",
      "nettoyage Bonanjo Douala",
      "nettoyage Akwa Douala",
    ],
    kicker: "Douala · Région du Littoral",
    lead:
      "À Douala, capitale économique du Cameroun, NECS assure propreté, rigueur et traçabilité pour vos sites tertiaires, industriels et commerciaux — avec des équipes locales et un encadrement de proximité.",
    sections: [
      {
        heading: "Nettoyage professionnel pour le pouls économique du Cameroun",
        body:
          "Douala concentre sièges, entrepôts, malls et flux intensifs. NECS structure des plannings adaptés aux horaires d’ouverture, aux consignes sécurité et aux zones à fort passage. Nos superviseurs suivent la réalisation des missions et les actions correctives en temps utile.",
      },
      {
        heading: "Industrie, commerce et bureaux à Douala",
        body:
          "Du nettoyage industriel (zones techniques, entrepôts) à l’entretien de bureaux (Akwa, Bonanjo et environs) et aux commerces, nous calibrons fréquences, produits et effectifs. Objectif : une image soignée sans perturber vos opérations.",
      },
      {
        heading: "Devis rapide pour Douala",
        body:
          "Un conseiller NECS vous répond sous 24 heures ouvrées. Visite technique possible sur site à Douala pour chiffrer précisément surfaces, contraintes et niveaux de service. Paiement en XAF (virement, cash, Mobile Money selon modalités).",
      },
    ],
    bullets: [
      "Couverture Douala et environs (Littoral)",
      "Protocoles industrie & commerce à fort flux",
      "Preuves qualité : checklists et photos",
      "Devis gratuit, sans engagement",
    ],
    faqs: [
      {
        question: "NECS nettoie-t-elle des sites industriels à Douala ?",
        answer:
          "Oui. NECS intervient sur sites industriels et entrepôts à Douala avec consignes sécurité, EPI et plannings adaptés aux flux opérationnels.",
      },
      {
        question: "Puis-je réserver une visite technique à Douala ?",
        answer:
          "Oui. Via le formulaire contact ou WhatsApp, indiquez votre adresse à Douala et vos disponibilités ; un créneau de visite ou de rappel peut être proposé.",
      },
    ],
    ctaLabel: "Demander un devis Douala",
    related: [
      { href: "/nettoyage-yaounde", label: "Nettoyage à Yaoundé" },
      { href: "/activites", label: "Toutes les prestations" },
      { href: "/contact", label: "Contact & devis" },
      { href: "/services/nettoyage-industriel", label: "Nettoyage industriel" },
    ],
    schema: {
      kind: "city",
      city: "Douala",
      region: "Littoral",
      latitude: 4.0511,
      longitude: 9.7679,
    },
  },
];

export const SERVICE_LANDINGS: SeoLanding[] = [
  {
    slug: "entretien-bureaux",
    path: "/services/entretien-bureaux",
    title: "Entretien de bureaux au Cameroun",
    metaTitle:
      "Entretien de bureaux Yaoundé & Douala | NECS Cameroun",
    description:
      "Entretien de bureaux au Cameroun par NECS : sols, postes, sanitaires, salles de réunion et vitrerie à Yaoundé et Douala. Contrats quotidiens ou périodiques, reporting digital.",
    keywords: [
      "entretien de bureaux Cameroun",
      "entretien bureaux Yaoundé",
      "entretien bureaux Douala",
      "nettoyage bureaux Yaoundé",
      "nettoyage bureaux Douala",
      "propreté sièges sociaux Cameroun",
    ],
    kicker: "Facility services · Tertiaire",
    lead:
      "Des espaces de travail impeccables à Yaoundé et Douala : NECS assure l’entretien régulier de vos bureaux avec des protocoles clairs et un contrôle qualité digital.",
    sections: [
      {
        heading: "Ce que comprend l’entretien de bureaux NECS",
        body:
          "Nettoyage des sols et postes, sanitaires, salles de réunion, zones d’accueil et vitrerie intérieure. Fréquences quotidiennes, hebdomadaires ou périodiques selon votre cahier des charges. Interventions discrètes hors ou pendant horaires d’ouverture.",
      },
      {
        heading: "Pilotage et preuves",
        body:
          "Pointage des agents, checklists par zone, photos sur écarts et reporting pour vos responsables de site. Idéal pour sièges, cabinets, open spaces et centres d’affaires à Yaoundé comme à Douala.",
      },
    ],
    bullets: [
      "Plannings adaptés à votre occupation",
      "Zones vitrines (accueil, sanitaires) renforcées",
      "Équipes formées et supervisées",
      "Devis sur surface et fréquence",
    ],
    faqs: [
      {
        question: "Proposez-vous un entretien quotidien de bureaux ?",
        answer:
          "Oui. NECS construit des contrats 5j/7 ou selon vos besoins, avec effectifs calibrés pour Yaoundé et Douala.",
      },
    ],
    ctaLabel: "Devis entretien de bureaux",
    related: [
      { href: "/nettoyage-yaounde", label: "Yaoundé" },
      { href: "/nettoyage-douala", label: "Douala" },
      { href: "/services/nettoyage-industriel", label: "Nettoyage industriel" },
      { href: "/contact", label: "Contact" },
    ],
    schema: {
      kind: "service",
      serviceName: "Entretien de bureaux",
      serviceType: "Entretien de bureaux",
    },
  },
  {
    slug: "nettoyage-industriel",
    path: "/services/nettoyage-industriel",
    title: "Nettoyage industriel au Cameroun",
    metaTitle:
      "Nettoyage industriel Yaoundé & Douala | NECS Cameroun",
    description:
      "Nettoyage industriel au Cameroun : entrepôts, zones techniques et flux opérationnels à Douala et Yaoundé. Consignes sécurité, EPI, planning NECS.",
    keywords: [
      "nettoyage industriel Cameroun",
      "nettoyage industriel Douala",
      "nettoyage industriel Yaoundé",
      "nettoyage entrepôts Cameroun",
      "propreté zones techniques Cameroun",
    ],
    kicker: "Industrie · Entrepôts",
    lead:
      "NECS sécurise la propreté de vos sites industriels et logistiques au Cameroun avec des protocoles robustes et un encadrement terrain exigeant.",
    sections: [
      {
        heading: "Environnements techniques exigeants",
        body:
          "Zones de production, entrepôts, quais et circulations : nous respectons vos consignes HSE, les accès restreints et les créneaux de production. Matériel et produits adaptés aux surfaces industrielles.",
      },
      {
        heading: "Douala et Yaoundé",
        body:
          "Forte demande industrielle à Douala ; sites et annexes à Yaoundé. NECS dimensionne équipes et fréquences pour absorber les pics d’activité sans compromettre la sécurité.",
      },
    ],
    bullets: [
      "Consignes sécurité et EPI",
      "Plannings hors pics de production",
      "Traçabilité des interventions",
      "Visite technique avant devis",
    ],
    faqs: [
      {
        question: "Intervenez-vous de nuit sur sites industriels ?",
        answer:
          "Oui, lorsque le cahier des charges et l’accès site le permettent. Les horaires sont définis contractuellement avec votre responsable HSE ou maintenance.",
      },
    ],
    ctaLabel: "Devis nettoyage industriel",
    related: [
      { href: "/nettoyage-douala", label: "Nettoyage Douala" },
      { href: "/services/entretien-bureaux", label: "Entretien de bureaux" },
      { href: "/activites", label: "Autres activités" },
      { href: "/contact", label: "Contact" },
    ],
    schema: {
      kind: "service",
      serviceName: "Nettoyage industriel",
      serviceType: "Nettoyage industriel",
    },
  },
  {
    slug: "nettoyage-commerces",
    path: "/services/nettoyage-commerces",
    title: "Nettoyage de commerces & espaces publics",
    metaTitle:
      "Nettoyage commerces Yaoundé & Douala | NECS Cameroun",
    description:
      "Nettoyage de commerces, malls et espaces publics à Yaoundé et Douala. Propreté continue, image client premium, équipes NECS formées.",
    keywords: [
      "nettoyage commerces Cameroun",
      "nettoyage mall Douala",
      "nettoyage magasin Yaoundé",
      "propreté retail Cameroun",
      "nettoyage espaces publics Cameroun",
    ],
    kicker: "Retail · Accueil client",
    lead:
      "Vos clients jugent votre enseigne dès l’entrée. NECS maintient halls, circulations, sanitaires publics et surfaces de vente impeccables à Yaoundé et Douala.",
    sections: [
      {
        heading: "Propreté continue en retail",
        body:
          "Passages planifiés selon les flux, renforts aux heures de pointe, interventions avant/pendant/après événements. Objectif : une expérience visiteur fluide et une image premium durable.",
      },
    ],
    bullets: [
      "Focus zones d’accueil et sanitaires",
      "Réactivité événementielle",
      "Reporting photo sur demande",
      "Contrats mall, retail et halls",
    ],
    faqs: [
      {
        question: "Couvrez-vous les centres commerciaux à Douala ?",
        answer:
          "Oui. NECS peut structurer des prestations multi-zones pour commerces et espaces à fort trafic à Douala et Yaoundé, après visite technique.",
      },
    ],
    ctaLabel: "Devis commerces",
    related: [
      { href: "/services/hotels-residences", label: "Hôtels & résidences" },
      { href: "/nettoyage-yaounde", label: "Yaoundé" },
      { href: "/nettoyage-douala", label: "Douala" },
      { href: "/contact", label: "Contact" },
    ],
    schema: {
      kind: "service",
      serviceName: "Nettoyage commerces et espaces publics",
      serviceType: "Nettoyage commercial",
    },
  },
  {
    slug: "hygiene-sante",
    path: "/services/hygiene-sante",
    title: "Hygiène des établissements de santé",
    metaTitle:
      "Nettoyage cliniques Yaoundé & Douala | NECS Cameroun",
    description:
      "Protocoles d’hygiène renforcés pour cliniques, cabinets et laboratoires à Yaoundé et Douala. Équipes NECS formées, traçabilité et zones sensibles.",
    keywords: [
      "nettoyage cliniques Yaoundé",
      "nettoyage cliniques Douala",
      "hygiène établissements de santé Cameroun",
      "nettoyage cabinets médicaux Cameroun",
      "propreté laboratoires Cameroun",
    ],
    kicker: "Santé · Protocoles renforcés",
    lead:
      "Dans les établissements de santé camerounais, la propreté n’est pas cosmétique : elle protège patients, soignants et réputation. NECS applique des protocoles dédiés et une traçabilité stricte.",
    sections: [
      {
        heading: "Zones sensibles et traçabilité",
        body:
          "Salles d’attente, circulations, sanitaires, zones techniques selon accès autorisé. Checklists spécifiques, produits adaptés et reporting pour vos audits internes.",
      },
    ],
    bullets: [
      "Équipes briefées sur consignes site",
      "Checklists santé dédiées",
      "Preuves horodatées",
      "Visite technique préalable",
    ],
    faqs: [
      {
        question: "Intervenez-vous dans les blocs opératoires ?",
        answer:
          "Les interventions en zones ultra-restreintes dépendent de vos autorisations et protocoles internes. Nous cadrons le périmètre avec votre direction médicale ou hygiène.",
      },
    ],
    ctaLabel: "Devis hygiène santé",
    related: [
      { href: "/services/ecoles-universites", label: "Écoles & universités" },
      { href: "/activites", label: "Activités" },
      { href: "/contact", label: "Contact" },
    ],
    schema: {
      kind: "service",
      serviceName: "Hygiène établissements de santé",
      serviceType: "Nettoyage établissements de santé",
    },
  },
  {
    slug: "hotels-residences",
    path: "/services/hotels-residences",
    title: "Nettoyage hôtels & résidences",
    metaTitle:
      "Nettoyage hôtels Yaoundé & Douala | NECS Cameroun",
    description:
      "Entretien hôtels et résidences à Yaoundé et Douala : chambres, parties communes, back-office. Expérience client premium avec NECS.",
    keywords: [
      "nettoyage hôtels Yaoundé",
      "nettoyage hôtels Douala",
      "entretien résidences Cameroun",
      "housekeeping Cameroun",
      "propreté hôtelière Cameroun",
    ],
    kicker: "Hôtellerie · Résidentiel",
    lead:
      "Du check-in au départ, la propreté porte votre note d’expérience. NECS structure housekeeping et parties communes pour hôtels et résidences au Cameroun.",
    sections: [
      {
        heading: "Standards hôteliers",
        body:
          "Chambres, linges selon organisation, halls, restaurants et back-office. Fréquences calées sur taux d’occupation et standards de votre enseigne.",
      },
    ],
    bullets: [
      "Standards chambres et parties communes",
      "Discrétion auprès des clients",
      "Reporting qualité",
      "Renforts saisonniers possibles",
    ],
    faqs: [
      {
        question: "Proposez-vous du renfort en haute saison ?",
        answer:
          "Oui. NECS peut renforcer les effectifs sur période de forte occupation, sous réserve de planification anticipée.",
      },
    ],
    ctaLabel: "Devis hôtels & résidences",
    related: [
      { href: "/services/nettoyage-commerces", label: "Commerces" },
      { href: "/nettoyage-yaounde", label: "Yaoundé" },
      { href: "/nettoyage-douala", label: "Douala" },
      { href: "/contact", label: "Contact" },
    ],
    schema: {
      kind: "service",
      serviceName: "Nettoyage hôtels et résidences",
      serviceType: "Housekeeping hôtelier",
    },
  },
  {
    slug: "ecoles-universites",
    path: "/services/ecoles-universites",
    title: "Nettoyage écoles & universités",
    metaTitle:
      "Nettoyage écoles Yaoundé & Douala | NECS Cameroun",
    description:
      "Entretien d’écoles et universités au Cameroun : salles, sanitaires, espaces collectifs hors temps scolaire. NECS à Yaoundé et Douala.",
    keywords: [
      "nettoyage écoles Cameroun",
      "nettoyage universités Cameroun",
      "entretien établissements scolaires Yaoundé",
      "nettoyage campus Douala",
      "propreté écoles Yaoundé",
    ],
    kicker: "Éducation · Collectivités",
    lead:
      "Un cadre propre soutient l’apprentissage et la sécurité. NECS entretient salles de classe, sanitaires et espaces collectifs hors temps scolaire à Yaoundé et Douala.",
    sections: [
      {
        heading: "Interventions hors pics pédagogiques",
        body:
          "Plannings calés sur les emplois du temps, vacances et événements. Produits adaptés aux espaces fréquentés par les élèves et étudiants.",
      },
    ],
    bullets: [
      "Hors temps de cours prioritaire",
      "Sanitaires et coursives renforcés",
      "Encadrement de proximité",
      "Contrats établissements publics et privés",
    ],
    faqs: [
      {
        question: "Travaillez-vous avec des établissements privés ?",
        answer:
          "Oui. NECS accompagne écoles, collèges, lycées et campus privés comme publics, après cadrage du périmètre et des accès.",
      },
    ],
    ctaLabel: "Devis écoles & universités",
    related: [
      { href: "/services/hygiene-sante", label: "Hygiène santé" },
      { href: "/activites", label: "Activités" },
      { href: "/contact", label: "Contact" },
    ],
    schema: {
      kind: "service",
      serviceName: "Nettoyage écoles et universités",
      serviceType: "Entretien établissements scolaires",
    },
  },
  {
    slug: "nettoyage-particuliers",
    path: "/services/nettoyage-particuliers",
    title: "Nettoyage pour particuliers au Cameroun",
    metaTitle:
      "Nettoyage domicile Yaoundé & Douala | NECS Cameroun",
    description:
      "Nettoyage pour particuliers à Yaoundé et Douala : domicile, appartements, villas. Équipes NECS discrètes, devis clair, interventions planifiées.",
    keywords: [
      "nettoyage particuliers Yaoundé",
      "nettoyage particuliers Douala",
      "femme de ménage Yaoundé entreprise",
      "nettoyage domicile Douala",
      "entretien maison Cameroun",
    ],
    kicker: "Particuliers · Domicile",
    lead:
      "NECS prend soin de votre domicile à Yaoundé ou Douala avec des équipes discrètes, des protocoles adaptés à la vie de famille et un devis transparent.",
    sections: [
      {
        heading: "Un service professionnel à domicile",
        body:
          "Salon, cuisine, chambres, sanitaires : interventions ponctuelles ou récurrentes. Nous respectons vos horaires, vos accès et la confidentialité de votre foyer.",
      },
    ],
    bullets: [
      "Ponctuel ou abonnement",
      "Équipes formées et encadrées",
      "Devis avant intervention",
      "Paiement XAF / Mobile Money selon modalités",
    ],
    faqs: [
      {
        question: "Proposez-vous un ménage ponctuel avant un événement ?",
        answer:
          "Oui. Indiquez la date, l’adresse (Yaoundé ou Douala) et le type de bien : nous vous proposons un créneau et un devis.",
      },
    ],
    ctaLabel: "Devis particuliers",
    related: [
      { href: "/nettoyage-yaounde", label: "Yaoundé" },
      { href: "/nettoyage-douala", label: "Douala" },
      { href: "/contact", label: "Contact" },
    ],
    schema: {
      kind: "service",
      serviceName: "Nettoyage pour particuliers",
      serviceType: "Nettoyage domicile",
    },
  },
];

export function getCityLanding(slug: string) {
  return CITY_LANDINGS.find((l) => l.slug === slug);
}

export function getServiceLanding(slug: string) {
  return SERVICE_LANDINGS.find((l) => l.slug === slug);
}

export function allSeoLandings() {
  return [...CITY_LANDINGS, ...SERVICE_LANDINGS];
}
