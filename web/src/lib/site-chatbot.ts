/** Chatbot site public NECS — réponses locales, sans API externe. */

import { FAQ_ITEMS, SERVICE_OFFERINGS, SITE } from "@/lib/seo";

export type ChatRole = "bot" | "user";

export type ChatQuickAction =
  | { type: "reply"; label: string; text: string }
  | { type: "link"; label: string; href: string }
  | { type: "quote"; label: string; subject?: string }
  | { type: "tel"; label: string; href: string }
  | { type: "email"; label: string; href: string };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  at: number;
  actions?: ChatQuickAction[];
};

type Intent = {
  id: string;
  patterns: RegExp[];
  answer: string;
  actions?: ChatQuickAction[];
  weight?: number;
};

const SERVICES_BLURB = SERVICE_OFFERINGS.slice(0, 6)
  .map((s) => `· ${s.name}`)
  .join("\n");

const FAQ_BLURB = FAQ_ITEMS.slice(0, 3)
  .map((f) => `· ${f.question}`)
  .join("\n");

export const CHAT_STARTER_ACTIONS: ChatQuickAction[] = [
  { type: "reply", label: "Demander un devis", text: "Je voudrais un devis" },
  {
    type: "reply",
    label: "Zones d’intervention",
    text: "Où intervenez-vous ?",
  },
  { type: "reply", label: "Nos prestations", text: "Quels sont vos services ?" },
  { type: "reply", label: "Contact", text: "Comment vous contacter ?" },
];

export const CHAT_TOPIC_RAIL: ChatQuickAction[] = [
  { type: "reply", label: "Devis", text: "Je voudrais un devis" },
  { type: "reply", label: "Yaoundé / Douala", text: "Où intervenez-vous ?" },
  { type: "reply", label: "Qualité digitale", text: "Quelle est votre qualité ?" },
  { type: "quote", label: "Parler à un conseiller", subject: "Conseil via chat" },
];

function greetingByHour(): string {
  // Africa/Douala ≈ UTC+1 — approximation locale pour le ton
  const hour = (new Date().getUTCHours() + 1) % 24;
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

const INTENTS: Intent[] = [
  {
    id: "greeting",
    weight: 2,
    patterns: [
      /^(bonjour|bonsoir|salut|hello|hi|hey|coucou)\b/i,
      /\b(bonjour|bonsoir)\b/i,
    ],
    answer: `${greetingByHour()} — je suis l’assistant NECS.\n\nNettoyage professionnel et facility services au Cameroun (Yaoundé & Douala).\n\nComment puis-je vous orienter ?`,
    actions: CHAT_STARTER_ACTIONS,
  },
  {
    id: "devis",
    weight: 5,
    patterns: [
      /\b(devis|tarif|prix|co[uû]t|combien|estimation|proposition commerciale)\b/i,
      /\b(demander|obtenir|faire|recevoir).{0,24}\bdevis\b/i,
    ],
    answer: `Pour un devis précis, précisez :\n· Ville (Yaoundé ou Douala)\n· Type de site (bureaux, industrie, commerce…)\n· Surface approximative\n\nUn conseiller NECS répond sous 24 h ouvrées (Africa/Douala).`,
    actions: [
      {
        type: "quote",
        label: "Ouvrir le formulaire devis",
        subject: "Devis via chatbot",
      },
      { type: "link", label: "Page contact", href: "/contact" },
      {
        type: "reply",
        label: "Voir les prestations",
        text: "Quels sont vos services ?",
      },
    ],
  },
  {
    id: "urgence",
    weight: 6,
    patterns: [
      /\b(urgent|urgence|imm[eé]diat|aujourd'?hui|asap|d[eé]sinfection urgente)\b/i,
    ],
    answer: `Pour une urgence de nettoyage à Yaoundé ou Douala, appelez directement NECS — un coordinateur évalue la disponibilité des équipes.\n\nTél. / WhatsApp : ${SITE.phoneDisplay}`,
    actions: [
      { type: "tel", label: "Appeler maintenant", href: `tel:${SITE.phone}` },
      {
        type: "quote",
        label: "Demande urgente",
        subject: "Urgence nettoyage",
      },
    ],
  },
  {
    id: "zones",
    weight: 4,
    patterns: [
      /\b(o[uù]|ville|zone|intervenir|intervention|couverture|douala|yaound[eé]|cameroun)\b/i,
      /\b(r[eé]gion|littoral|centre)\b/i,
    ],
    answer: `NECS intervient principalement à :\n· Yaoundé — Région du Centre\n· Douala — Région du Littoral\n\nEntreprises, industries, commerces, établissements et particuliers.`,
    actions: [
      {
        type: "quote",
        label: "Demander une visite",
        subject: "Visite technique",
      },
      { type: "reply", label: "Horaires", text: "Quels sont vos horaires ?" },
    ],
  },
  {
    id: "services",
    weight: 4,
    patterns: [
      /\b(service|prestation|activit[eé]|offre|nettoyage|entretien|facility)\b/i,
      /\b(bureau|industrie|h[oô]tel|clinique|sant[eé]|[eé]cole|particulier|commerce)\b/i,
    ],
    answer: `Prestations NECS au Cameroun :\n${SERVICES_BLURB}\n· Protocoles sur mesure selon votre site.\n\nSouhaitez-vous un devis pour un type de site précis ?`,
    actions: [
      { type: "link", label: "Toutes les activités", href: "/activites" },
      {
        type: "quote",
        label: "Devis personnalisé",
        subject: "Devis prestations",
      },
    ],
  },
  {
    id: "contact",
    weight: 4,
    patterns: [
      /\b(contact|joindre|appeler|t[eé]l[eé]phone|whatsapp|e-?mail|mail|adresse)\b/i,
      /\b(num[eé]ro|coordonn[eé]es)\b/i,
    ],
    answer: `Contact NECS\n· Tél. / WhatsApp : ${SITE.phoneDisplay}\n· E-mail : ${SITE.email}\n· Zones : Yaoundé · Douala\n· Horaires : lun–ven, 08h00–17h30`,
    actions: [
      { type: "tel", label: "Appeler", href: `tel:${SITE.phone}` },
      {
        type: "email",
        label: "Écrire un e-mail",
        href: `mailto:${SITE.email}`,
      },
      {
        type: "quote",
        label: "Formulaire devis",
        subject: "Contact chatbot",
      },
      { type: "link", label: "Page contact", href: "/contact" },
    ],
  },
  {
    id: "horaires",
    weight: 3,
    patterns: [/\b(horaire|ouvert|fermeture|disponib|quand|jours?)\b/i],
    answer: `Équipes commerciales : lundi–vendredi, 08h00–17h30 (Africa/Douala).\n\nSur sites sous contrat, l’interlocuteur NECS reste joignable selon les modalités prévues.`,
    actions: [
      { type: "tel", label: "Appeler NECS", href: `tel:${SITE.phone}` },
      {
        type: "quote",
        label: "Laisser une demande",
        subject: "Demande hors horaires",
      },
    ],
  },
  {
    id: "qualite",
    weight: 4,
    patterns: [
      /\b(qualit[eé]|contr[oô]le|digital|pointage|reporting|checklist|sla|indicateur)\b/i,
      /\b(pourquoi|diff[eé]rence|avantage)\b.*\bnecs\b/i,
      /\b(pourquoi necs|votre qualit)\b/i,
    ],
    answer: `La différence NECS : équipes formées, encadrement de proximité et reporting digital — pointage, checklists, contrôles photo — pour une propreté mesurable sur vos sites.`,
    actions: [
      { type: "link", label: "Pourquoi NECS", href: "/pourquoi" },
      { type: "link", label: "Réalisations", href: "/realisations" },
      {
        type: "quote",
        label: "Demander une démo",
        subject: "Démo qualité digitale",
      },
    ],
  },
  {
    id: "contrat",
    weight: 4,
    patterns: [
      /\b(contrat|abonnement|mensuel|annuel|engagement|renouvellement|sla)\b/i,
      /\b(prestataire|sous.?traitance)\b/i,
    ],
    answer: `NECS propose des contrats d’entretien adaptés (ponctuel, hebdomadaire, mensuel).\n\nCadre clair : périmètre, fréquence, contrôles et reporting. Demandez une proposition sur mesure.`,
    actions: [
      {
        type: "quote",
        label: "Proposition contractuelle",
        subject: "Contrat entretien",
      },
      { type: "link", label: "Pourquoi NECS", href: "/pourquoi" },
    ],
  },
  {
    id: "entreprise",
    weight: 3,
    patterns: [
      /\b(qui [eê]tes|qui est|entreprise|soci[eé]t[eé]|pr[eé]sentation|apropos|à propos)\b/i,
      /\bnecleaning\b/i,
      /\bnecs\b/i,
    ],
    answer: `${SITE.legalName} (${SITE.shortName}) — société camerounaise de nettoyage professionnel et facility services.\n\nDevise : ${SITE.tagline}.`,
    actions: [
      { type: "link", label: "À propos", href: "/apropos" },
      { type: "link", label: "Objectif", href: "/objectif" },
    ],
  },
  {
    id: "paiement",
    weight: 3,
    patterns: [
      /\b(paiement|payer|mobile money|orange money|momo|virement|xaf|franc|cfa)\b/i,
    ],
    answer: `Facturation en francs CFA (XAF).\n\nSelon le contrat : virement bancaire, espèces ou Mobile Money (Orange Money / MTN MoMo).`,
    actions: [
      {
        type: "quote",
        label: "Demander un devis",
        subject: "Devis & modalités",
      },
    ],
  },
  {
    id: "recrutement",
    weight: 3,
    patterns: [
      /\b(recrut|emploi|job|candidat|cv|embauch|offre d['']emploi)\b/i,
    ],
    answer: `Pour les candidatures, écrivez à ${SITE.email} avec votre CV et la ville (Yaoundé ou Douala).\n\nLes recrutements terrain se font selon les besoins des sites sous contrat.`,
    actions: [
      {
        type: "email",
        label: "Envoyer un CV",
        href: `mailto:${SITE.email}?subject=Candidature%20NECS`,
      },
      { type: "link", label: "Contact", href: "/contact" },
    ],
  },
  {
    id: "cookies",
    weight: 2,
    patterns: [
      /\b(cookie|confidentialit[eé]|donn[eé]es|rgpd|vie priv[eé]e)\b/i,
    ],
    answer: `Gérez les cookies (nécessaires, mesure, préférences) via le bandeau ou « Gérer les cookies » en pied de page. Détails dans la politique de confidentialité.`,
    actions: [
      { type: "link", label: "Confidentialité", href: "/confidentialite" },
      { type: "reply", label: "Autre question", text: "Bonjour" },
    ],
  },
  {
    id: "faq",
    weight: 2,
    patterns: [/\b(faq|questions? fr[eé]quentes?|aide)\b/i],
    answer: `Questions fréquentes :\n${FAQ_BLURB}\n\nPosez votre question en une phrase, ou choisissez une suggestion.`,
    actions: CHAT_STARTER_ACTIONS,
  },
  {
    id: "thanks",
    weight: 2,
    patterns: [/\b(merci|thanks|nickel|parfait|super|ok d['']accord)\b/i],
    answer: `Avec plaisir. Je reste disponible pour un devis ou toute information sur NECS.`,
    actions: [
      {
        type: "quote",
        label: "Demander un devis",
        subject: "Devis suite chatbot",
      },
      { type: "link", label: "Accueil", href: "/" },
    ],
  },
];

function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .slice(0, 400);
}

export function createBotMessage(
  text: string,
  actions?: ChatQuickAction[],
  id = "bot",
): ChatMessage {
  return {
    id,
    role: "bot",
    text,
    at: 0,
    actions,
  };
}

export function createUserMessage(text: string): ChatMessage {
  return {
    id: `u-${Date.now()}`,
    role: "user",
    text: text.trim().slice(0, 400),
    at: Date.now(),
  };
}

export function welcomeMessage(): ChatMessage {
  return createBotMessage(
    `${greetingByHour()}. Je suis l’assistant NECS — nettoyage professionnel au Cameroun (Yaoundé & Douala).\n\n${SITE.tagline}.\n\nChoisissez une suggestion ou posez votre question :`,
    CHAT_STARTER_ACTIONS,
    "welcome",
  );
}

export function replyDelayMs(text: string): number {
  const len = text.trim().length;
  return Math.min(900, Math.max(420, 280 + len * 4));
}

export function formatChatTime(at: number): string {
  if (!at) return "";
  try {
    return new Intl.DateTimeFormat("fr-CM", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: SITE.timezone || "Africa/Douala",
    }).format(new Date(at));
  } catch {
    return "";
  }
}

export function matchChatIntent(raw: string): ChatMessage {
  const text = normalize(raw);
  if (!text) {
    return createBotMessage(
      "Écrivez votre question, ou choisissez une suggestion ci-dessous.",
      CHAT_STARTER_ACTIONS,
    );
  }

  let best: { intent: Intent; score: number } | null = null;
  for (const intent of INTENTS) {
    let hits = 0;
    for (const re of intent.patterns) {
      if (re.test(text)) hits += 1;
    }
    if (hits === 0) continue;
    const score = hits * (intent.weight ?? 1);
    if (!best || score > best.score) best = { intent, score };
  }

  if (best) {
    const { intent } = best;
    const answer =
      intent.id === "greeting"
        ? `${greetingByHour()} — je suis l’assistant NECS.\n\nNettoyage professionnel et facility services au Cameroun (Yaoundé & Douala).\n\nComment puis-je vous orienter ?`
        : intent.answer;
    return createBotMessage(answer, intent.actions);
  }

  return createBotMessage(
    `Je n’ai pas bien saisi. Je peux vous aider sur : devis, zones (Yaoundé / Douala), prestations, contact, qualité digitale, contrats.\n\nOu laissez vos coordonnées — un conseiller NECS vous rappelle.`,
    [
      {
        type: "quote",
        label: "Parler à un conseiller",
        subject: "Demande via chatbot",
      },
      { type: "reply", label: "Devis", text: "Je voudrais un devis" },
      { type: "reply", label: "Services", text: "Quels sont vos services ?" },
      { type: "tel", label: "Appeler", href: `tel:${SITE.phone}` },
    ],
  );
}
