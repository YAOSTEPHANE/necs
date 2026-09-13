export const BLOG_POSTS = [
  {
    slug: "indicateurs-proprete",
    meta: "Qualité · 5 min",
    title: "5 indicateurs pour piloter la propreté de vos sites",
    excerpt:
      "Scores, non-conformités, SLA… comment transformer le nettoyage en pilotage.",
    imageKey: "blog1" as const,
    body: [
      "Piloter un contrat de nettoyage sans indicateurs, c’est naviguer à vue. Chez NECS, chaque site dispose d’un tableau de bord qualité simple et actionnable.",
      "Nous suivons notamment le taux de réalisation des missions, le score moyen des contrôles, le délai de correction des anomalies, la ponctualité des équipes et la satisfaction client.",
      "Ces cinq signaux permettent à la direction et aux chefs de site d’anticiper les écarts, d’ajuster les effectifs et de démontrer la valeur de la prestation.",
    ],
  },
  {
    slug: "controle-qualite-digital",
    meta: "Opérations · 4 min",
    title: "Pourquoi le contrôle qualité digital change tout",
    excerpt: "Photos, checklists mobiles et actions correctives en temps réel.",
    imageKey: "blog2" as const,
    body: [
      "Le contrôle papier arrive trop tard. Avec le digital, le superviseur valide les zones critiques sur le terrain, photographie les écarts et déclenche immédiatement une action corrective.",
      "Les checklists NECS sont adaptées à chaque environnement — bureaux, industrie, commerce — et restent traçables pour vos audits internes.",
      "Résultat : moins d’oublis, plus de transparence, et une preuve objective de la qualité livrée à chaque vacation.",
    ],
  },
  {
    slug: "proprete-confiance-client",
    meta: "Image de marque · 3 min",
    title: "La propreté, premier signal de confiance client",
    excerpt:
      "Ce que vos visiteurs ressentent en 10 secondes à l’entrée de vos locaux.",
    imageKey: "achMain" as const,
    body: [
      "Avant même de parler à votre équipe, un visiteur juge votre organisation à l’odeur, à l’état des sols et à la netteté des sanitaires.",
      "NECS traite ces zones d’accueil comme des vitrines : fréquences adaptées, protocoles renforcés aux heures de pointe, reporting photo sur demande.",
      "Une propreté constante renforce votre image employeur, votre relation client et la sérénité de vos collaborateurs.",
    ],
  },
] as const;

export type BlogSlug = (typeof BLOG_POSTS)[number]["slug"];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
