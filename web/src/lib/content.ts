export type NecsImages = {
  hero: string;
  about: string;
  achMain: string;
  objectif: string;
  actOffice: string;
  actIndustry: string;
  actCommerce: string;
  blog1: string;
  blog2: string;
};

export type NecsContent = {
  brandName: string;
  brandTagline: string;
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  whyTitle: string;
  whyLead: string;
  why1Title: string;
  why1Text: string;
  why2Title: string;
  why2Text: string;
  why3Title: string;
  why3Text: string;
  aboutTitle: string;
  aboutText: string;
  aboutF1Title: string;
  aboutF1Text: string;
  aboutF2Title: string;
  aboutF2Text: string;
  aboutF3Title: string;
  aboutF3Text: string;
  achTitle: string;
  achLead: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  stat4Value: string;
  stat4Label: string;
  objTitle: string;
  objText: string;
  actTitle: string;
  actLead: string;
  act1Title: string;
  act1Text: string;
  act2Title: string;
  act2Text: string;
  act3Title: string;
  act3Text: string;
  testTitle: string;
  testLead: string;
  t1Text: string;
  t1Name: string;
  t1Role: string;
  t2Text: string;
  t2Name: string;
  t2Role: string;
  t3Text: string;
  t3Name: string;
  t3Role: string;
  blogTitle: string;
  blogLead: string;
  b1Meta: string;
  b1Title: string;
  b1Text: string;
  b2Meta: string;
  b2Title: string;
  b2Text: string;
  b3Meta: string;
  b3Title: string;
  b3Text: string;
  contactTitle: string;
  contactLead: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  contactHours: string;
  footerAbout: string;
  images: NecsImages;
};

export const NECS_CONTENT_KEY = "necs_public_content_v1";
export const NECS_CONTENT_EVENT = "necs-content-updated";
export const NECS_LEADS_KEY = "necs_public_leads";

export const PUBLIC_IMAGE_SLOTS: Array<{
  key: keyof NecsImages;
  label: string;
  hint: string;
  maxSize: number;
}> = [
  {
    key: "hero",
    label: "Hero (bandeau d’accueil)",
    hint: "Image plein écran en haut de la page d’accueil",
    maxSize: 1400,
  },
  {
    key: "about",
    label: "À propos",
    hint: "Section À propos / page institutionnelle",
    maxSize: 1000,
  },
  {
    key: "achMain",
    label: "Réalisations",
    hint: "Visuel principal des réalisations",
    maxSize: 1000,
  },
  {
    key: "objectif",
    label: "Objectif",
    hint: "Section objectif / vision",
    maxSize: 1000,
  },
  {
    key: "actOffice",
    label: "Activité — Bureaux",
    hint: "Entretien de bureaux",
    maxSize: 900,
  },
  {
    key: "actIndustry",
    label: "Activité — Industrie",
    hint: "Nettoyage industriel",
    maxSize: 900,
  },
  {
    key: "actCommerce",
    label: "Activité — Commerces",
    hint: "Commerces & espaces publics",
    maxSize: 900,
  },
  {
    key: "blog1",
    label: "Blog — article 1",
    hint: "Vignette du premier article",
    maxSize: 800,
  },
  {
    key: "blog2",
    label: "Blog — article 2",
    hint: "Vignette du second article",
    maxSize: 800,
  },
];

export const DEFAULT_CONTENT: NecsContent = {
  brandName: "NECS",
  brandTagline: "NECLEANING & SERVICES SARL",
  heroEyebrow: "Propreté · Rigueur · Confiance",
  heroTitle: "L’excellence du nettoyage, élevée au rang d’art",
  heroLead:
    "NECS accompagne entreprises, industries et commerces avec des prestations premium, digitales et mesurables — de la prospection à l’exécution terrain.",
  whyTitle: "La différence NECS, visible dès le premier passage",
  whyLead:
    "Une organisation rigoureuse, des équipes formées et une plateforme digitale qui transforme chaque prestation en preuve de qualité.",
  why1Title: "Rigueur opérationnelle",
  why1Text:
    "Plannings, pointages et contrôles qualité pour une exécution fiable, jour après jour.",
  why2Title: "Standard premium",
  why2Text:
    "Protocoles, EPI, matériels professionnels et reporting transparent pour vos sites sensibles.",
  why3Title: "Digital de bout en bout",
  why3Text:
    "Du devis au contrat, de l’intervention à la facture : tout est centralisé et traçable.",
  aboutTitle: "NECLEANING & SERVICES SARL",
  aboutText:
    "NECS est une société camerounaise de nettoyage et de facility services, bâtie sur trois piliers : la propreté irréprochable, la rigueur d’exécution et la confiance durable avec nos clients.",
  aboutF1Title: "Expertise multi-sites",
  aboutF1Text: "Bureaux, industries, commerces et établissements exigeants.",
  aboutF2Title: "Encadrement de proximité",
  aboutF2Text: "Superviseurs dédiés, checklists et actions correctives rapides.",
  aboutF3Title: "Engagement durable",
  aboutF3Text:
    "Produits adaptés, formation continue et respect des consignes sites.",
  achTitle: "Des résultats qui se voient… et se mesurent",
  achLead:
    "Chaque site confié à NECS devient une vitrine de notre exigence : surfaces impeccables, équipes ponctuelles, indicateurs suivis.",
  stat1Value: "120+",
  stat1Label: "Sites accompagnés",
  stat2Value: "98%",
  stat2Label: "Taux de réalisation",
  stat3Value: "85+",
  stat3Label: "Score qualité moyen",
  stat4Value: "24h",
  stat4Label: "Réactivité absences",
  objTitle:
    "Devenir la référence digitale du nettoyage professionnel au Cameroun",
  objText:
    "Digitaliser le cycle complet — prospect, contrat, exécution, RH, qualité, facturation — pour offrir à chaque client une expérience premium, transparente et durable.",
  actTitle: "Des expertises adaptées à chaque environnement",
  actLead:
    "Du tertiaire à l’industrie, NECS déploie des protocoles sur mesure, avec les bons effectifs et le bon niveau de service.",
  act1Title: "Entretien de bureaux",
  act1Text:
    "Sols, postes, sanitaires, vitrerie intérieure — pour un siège qui reflète votre image.",
  act2Title: "Nettoyage industriel",
  act2Text:
    "Zones techniques, entrepôts et flux opérationnels avec consignes sécurité renforcées.",
  act3Title: "Commerces & espaces publics",
  act3Text:
    "Mall, retail et accueil client : propreté continue et expérience visiteur premium.",
  testTitle: "Ils nous font confiance",
  testLead:
    "La voix de nos clients — entreprises qui ont choisi la rigueur NECS au quotidien.",
  t1Text:
    "Depuis le démarrage avec NECS, nos locaux sont impeccables et le reporting qualité nous donne une vraie visibilité.",
  t1Name: "Jean Okala",
  t1Role: "DAF — Société Exemple SA",
  t2Text:
    "Ponctualité, réactivité sur les absences, et une équipe vraiment professionnelle. Exactement ce dont nous avions besoin.",
  t2Name: "Amina Moussa",
  t2Role: "Responsable Achats — Groupe Horizon",
  t3Text:
    "Le passage au digital a simplifié devis, validations et factures. NECS est devenu un partenaire, pas seulement un prestataire.",
  t3Name: "Paul Kouam",
  t3Role: "Directeur Ops — LogiTrans",
  blogTitle: "Conseils, qualité & innovation terrain",
  blogLead:
    "Nos articles pour élever vos standards d’hygiène et comprendre nos méthodes.",
  b1Meta: "Qualité · 5 min",
  b1Title: "5 indicateurs pour piloter la propreté de vos sites",
  b1Text:
    "Scores, non-conformités, SLA… comment transformer le nettoyage en pilotage.",
  b2Meta: "Opérations · 4 min",
  b2Title: "Pourquoi le contrôle qualité digital change tout",
  b2Text: "Photos, checklists mobiles et actions correctives en temps réel.",
  b3Meta: "Image de marque · 3 min",
  b3Title: "La propreté, premier signal de confiance client",
  b3Text:
    "Ce que vos visiteurs ressentent en 10 secondes à l’entrée de vos locaux.",
  contactTitle: "Contactez-nous",
  contactLead:
    "Expliquez-nous votre besoin : un conseiller NECS vous répond sous 24 heures ouvrées.",
  contactPhone: "[+237] XX XX XX XX",
  contactEmail: "commercial@necs.cm",
  contactAddress: "[Adresse siège — Cameroun]",
  contactHours: "Lun – Ven · 08h00 – 17h30",
  footerAbout:
    "Propreté, Rigueur, Confiance — le partenaire premium du nettoyage professionnel au Cameroun.",
  images: {
    hero: "/images/necs-hero.jpg",
    about: "/images/necs-about.jpg",
    achMain: "/images/necs-realisations.jpg",
    objectif: "/images/necs-objectif.jpg",
    actOffice: "/images/necs-activite-bureaux.jpg",
    actIndustry: "/images/necs-activite-industrie.jpg",
    actCommerce: "/images/necs-activite-commerce.jpg",
    blog1: "/images/necs-blog-1.jpg",
    blog2: "/images/necs-blog-2.jpg",
  },
};

export function loadContent(): NecsContent {
  if (typeof window === "undefined") return structuredClone(DEFAULT_CONTENT);
  try {
    const raw = localStorage.getItem(NECS_CONTENT_KEY);
    if (!raw) return structuredClone(DEFAULT_CONTENT);
    const parsed = JSON.parse(raw) as Partial<NecsContent>;
    return {
      ...structuredClone(DEFAULT_CONTENT),
      ...parsed,
      images: {
        ...DEFAULT_CONTENT.images,
        ...(parsed.images ?? {}),
      },
    };
  } catch {
    return structuredClone(DEFAULT_CONTENT);
  }
}

export function saveContent(data: NecsContent): void {
  localStorage.setItem(NECS_CONTENT_KEY, JSON.stringify(data));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NECS_CONTENT_EVENT));
  }
}

export function resetContent(): void {
  localStorage.removeItem(NECS_CONTENT_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NECS_CONTENT_EVENT));
  }
}

export function resetPublicImage(
  images: NecsImages,
  key: keyof NecsImages,
): NecsImages {
  return {
    ...images,
    [key]: DEFAULT_CONTENT.images[key],
  };
}

export function resetAllPublicImages(): NecsImages {
  return structuredClone(DEFAULT_CONTENT.images);
}

export type Lead = {
  name: string;
  company: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  at: string;
};

export function loadLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(NECS_LEADS_KEY) || "[]") as Lead[];
  } catch {
    return [];
  }
}

export function saveLead(lead: Omit<Lead, "at">): void {
  const leads = loadLeads();
  leads.unshift({ ...lead, at: new Date().toISOString() });
  localStorage.setItem(NECS_LEADS_KEY, JSON.stringify(leads.slice(0, 100)));
}

export function leadKey(lead: Pick<Lead, "email" | "at">): string {
  return `${lead.email}::${lead.at}`;
}

/** Retire un lead de la file (accepter ou refuser). */
export function removeLead(email: string, at: string): Lead | null {
  if (typeof window === "undefined") return null;
  const leads = loadLeads();
  const idx = leads.findIndex((l) => l.email === email && l.at === at);
  if (idx === -1) return null;
  const [removed] = leads.splice(idx, 1);
  localStorage.setItem(NECS_LEADS_KEY, JSON.stringify(leads));
  return removed ?? null;
}

export function formatHeroTitle(title: string): { before: string; accent: string } {
  const idx = title.indexOf(",");
  if (idx === -1) return { before: title, accent: "" };
  return {
    before: title.slice(0, idx),
    accent: title.slice(idx + 1).trim(),
  };
}
