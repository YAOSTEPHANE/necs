/**
 * Guide commercial + flyer NECS
 *   → docs/Guide-commercial-NECS.pdf (A4, document interne)
 *   → docs/Flyer-NECS.pdf (A4 recto / verso, à remettre au client)
 * Usage (depuis web/) : node ../docs/guide-commercial/build.cjs [--png]
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require(path.join(__dirname, "..", "..", "web", "node_modules", "@playwright/test"));

const IMG = (name) => `../../web/public/images/${name}`;
const CAP = (name) => `../guide-utilisateurs/captures/${name}`;
const DATE = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const TEL = "+237 641 33 55 53";
const MAIL = "contact@necs-cm.com";
const SITE = "servicesnecs.vercel.app";

/* ---------- Icônes ---------- */
const ICONS = {
  check: "M20 6 9 17l-5-5",
  arrow: "M5 12h14M13 5l7 7-7 7",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM8.5 12l2.5 2.5 4.5-5",
  building: "M3 21h18M6 21V5l7-2v18M13 9h5v12M9 8h1M9 12h1M9 16h1",
  factory: "M2 20h20M4 20V10l6 4v-4l6 4V4h4v16",
  store: "M3 9l1.5-5h15L21 9M4 9v11h16V9M9 20v-6h6v6M3 9h18",
  home: "M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  bed: "M2 19V6M2 13h20v6M22 13v-1a4 4 0 0 0-4-4h-7v5M6.5 10.5h.01",
  school: "M22 9 12 4 2 9l10 5 10-5zM6 11v5c3 2.5 9 2.5 12 0v-5",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 7v5l3 2",
  pin: "M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  camera: "M4 8h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  chart: "M3 3v18h18M7 15l4-4 3 3 5-6",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  mail: "M3 5h18v14H3zM21 7l-9 6-9-6",
  calendar: "M3 5h18v16H3zM16 3v4M8 3v4M3 10h18",
  file: "M14 2H6v20h12V8zM14 2v6h6M9 13h6M9 17h6",
  chat: "M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  zap: "M13 2 3 14h9l-1 8 10-12h-9z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20",
  star: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z",
  drop: "M12 2.7l5.7 5.6a8 8 0 1 1-11.4 0z",
  target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  ear: "M6 8.5a6 6 0 1 1 12 0c0 6-6 6-6 11a3.5 3.5 0 0 1-7 0M15 8.5a3 3 0 0 0-6 0",
  briefcase: "M3 7h18v13H3zM8 7V4h8v3M3 13h18",
  x: "M18 6 6 18M6 6l12 12",
  leaf: "M11 20A7 7 0 0 1 4 13c0-6 7-10 16-10 0 9-4 17-9 17zM4 21c3-6 7-9 12-11",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
};
const icon = (n, s = 18, c = "currentColor", w = 1.8) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[n]}"/></svg>`;

/* ---------- Contenus partagés ---------- */
const STATS = [["120+", "sites accompagnés"], ["98 %", "taux de réalisation"], ["85+", "score qualité moyen"], ["24 h", "remplacement des absences"]];

const SECTORS = [
  { t: "Entretien de bureaux", s: "Bureaux", img: "necs-activite-bureaux.jpg", ic: "building", qui: "Sièges, agences, plateaux tertiaires, banques, administrations.", prest: ["Sols, postes de travail, salles de réunion", "Sanitaires désinfectés et réapprovisionnés", "Cuisines, espaces de pause, vitrerie intérieure", "Vidage des corbeilles et tri"], arg: "Un siège impeccable chaque matin, sans déranger les équipes : interventions tôt le matin ou en soirée.", dec: "Services généraux, office manager, DAF" },
  { t: "Nettoyage industriel", s: "Industrie", img: "necs-activite-industrie.jpg", ic: "factory", qui: "Usines, entrepôts, plateformes logistiques, zones portuaires.", prest: ["Zones de production et de stockage", "Quais, ateliers, zones techniques", "Vestiaires, réfectoires, sanitaires", "Consignes sécurité et EPI respectés"], arg: "Des équipes formées aux consignes HSE du site, avec le matériel et les machines adaptés.", dec: "Directeur de site, responsable HSE, achats" },
  { t: "Commerces & espaces publics", s: "Commerces", img: "necs-activite-commerce.jpg", ic: "store", qui: "Malls, supermarchés, boutiques, agences qui reçoivent du public.", prest: ["Propreté continue pendant l’ouverture", "Entrées, allées, caisses, vitrines", "Sanitaires publics à fort passage", "Remise en état après fermeture"], arg: "La propreté est la première chose que voit le client : une expérience visiteur soignée toute la journée.", dec: "Directeur de magasin, gestionnaire du centre" },
  { t: "Établissements de santé", s: "Santé", img: "necs-blog-2.jpg", ic: "pulse", qui: "Cliniques, cabinets médicaux, laboratoires, pharmacies.", prest: ["Protocoles d’hygiène renforcés par zone", "Zones sensibles, circuits propre / sale", "Traçabilité de chaque passage", "Équipes formées aux règles d’hygiène"], arg: "Hygiène renforcée et traçabilité : chaque passage est pointé, photographié et contrôlé.", dec: "Directeur, surveillant général, responsable hygiène" },
  { t: "Hôtels & résidences", s: "Hôtellerie", img: "necs-realisations.jpg", ic: "bed", qui: "Hôtels, résidences meublées, appart-hôtels.", prest: ["Chambres et parties communes", "Halls, couloirs, ascenseurs", "Back-office, cuisines, lingerie", "Renfort lors des pics d’occupation"], arg: "Une expérience client impeccable du check-in au départ, avec du renfort quand l’hôtel est plein.", dec: "Directeur d’hôtel, gouvernante générale" },
  { t: "Écoles & universités", s: "Éducation", img: "necs-blog-1.jpg", ic: "school", qui: "Écoles, lycées, universités, centres de formation.", prest: ["Salles de classe et amphithéâtres", "Sanitaires et espaces collectifs", "Interventions hors temps scolaire", "Grand nettoyage avant la rentrée"], arg: "Un cadre sain et accueillant pour les élèves, entretenu en dehors des heures de cours.", dec: "Directeur, intendant, économe" },
  { t: "Particuliers", s: "Particuliers", img: "necs-identity-nettoyage.png", ic: "home", qui: "Villas, appartements, familles, expatriés.", prest: ["Entretien régulier du domicile", "Cuisine, salle de bain, sols, vitres", "Grand nettoyage ponctuel", "Équipes discrètes et encadrées"], arg: "Une équipe de confiance, formée et encadrée : la maison propre, en toute sérénité.", dec: "Le particulier lui-même" },
  { t: "Copropriétés, salles & événements", s: "Copropriétés & salles", img: "necs-hero.jpg", ic: "users", qui: "Syndics, immeubles, salles polyvalentes, organisateurs d’événements.", prest: ["Parties communes, halls, escaliers", "Salles avant et après événement", "Passages planifiés selon les flux", "Renfort ponctuel le jour J"], arg: "Des interventions calées sur vos plannings et vos événements, avec une équipe dimensionnée.", dec: "Syndic, gestionnaire immobilier, organisateur" },
];

const phoneApp = () => `
<div class="phone"><div class="phone__screen"><div class="phone__status"><b>9:41</b><span class="phone__notch"></span><b>●●●</b></div>
  <div class="m-app">
    <p class="m-app__hi">Bonjour,<b>Votre entreprise</b></p>
    <div class="m-app__score"><span>Score qualité du mois</span><b>94<small>/100</small></b><svg viewBox="0 0 200 40" class="spark"><path d="M0 32 L25 28 L50 30 L75 20 L100 22 L125 14 L150 16 L175 8 L200 9" fill="none" stroke="#8FD14A" stroke-width="3"/></svg></div>
    <div class="m-app__row"><div><b>12/12</b><span>agents pointés</span></div><div><b>0</b><span>non-conformité</span></div></div>
    <p class="m-app__lbl">Dernières preuves</p>
    <div class="m-app__pics"><img src="${IMG("necs-realisations.jpg")}" alt=""/><img src="${IMG("necs-identity-nettoyage.png")}" alt=""/><img src="${IMG("necs-activite-bureaux.jpg")}" alt=""/></div>
    <div class="m-app__item">${icon("pin", 12, "#1F6B3A", 2.4)} Arrivée sur site · 06:58</div>
    <div class="m-app__item">${icon("camera", 12, "#1F6B3A", 2.4)} Photo départ · Hall · 17:31</div>
  </div>
</div></div>`;

/* ================= GUIDE COMMERCIAL ================= */
const chapters = [];
const chapter = (title, kicker, heading, lead, body, cls = "") => chapters.push({ title, kicker, heading, lead, body, cls });

// 1 — NECS en une minute
chapter("NECS en une minute", "Connaître l’entreprise", "NECS en <span class=\"serif\">une minute</span>",
  "Avant de vendre, il faut pouvoir raconter NECS simplement, avec les bons chiffres et sans hésiter.",
  `
  <div class="split">
    <div>
      <p class="body">NECLEANING & SERVICES SARL (NECS) est une société camerounaise de <b>nettoyage professionnel et de facility services</b>. Elle accompagne entreprises, industries, commerces, établissements de santé, hôtels, écoles et particuliers, avec des équipes formées, un encadrement de proximité et une plateforme digitale qui rend chaque prestation <b>mesurable, transparente et fiable</b>.</p>
      <div class="values">${[["Propreté", "drop"], ["Rigueur", "check"], ["Confiance", "shield"]].map(([t, i]) => `<span>${icon(i, 15, "#1F6B3A", 2.2)} ${t}</span>`).join("")}</div>
    </div>
    <figure class="photo photo--tall"><img src="${IMG("necs-about.jpg")}" alt=""/></figure>
  </div>
  <div class="statband">${STATS.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("")}</div>
  <div class="grid3">
    <div class="card"><h4>${icon("target", 17, "#1570B8")} Notre ambition</h4><p>Être le partenaire de référence en Afrique centrale pour des environnements sains, sûrs et agréables à vivre.</p></div>
    <div class="card"><h4>${icon("pin", 17, "#1570B8")} Où nous intervenons</h4><p>Yaoundé, Douala et environs. Bureaux ouverts du lundi au vendredi, 08h00 – 17h30.</p></div>
    <div class="card"><h4>${icon("briefcase", 17, "#1570B8")} Ce que nous vendons</h4><p>Des contrats d’entretien récurrents (quotidien à mensuel) et des interventions ponctuelles, sur devis gratuit.</p></div>
  </div>
  <h3 class="h3">Nos trois engagements</h3>
  <div class="grid3">${[
    ["building", "Expertise multi-secteurs", "Bureaux, industries, commerces, santé, résidences et espaces professionnels exigeants."],
    ["users", "Encadrement de proximité", "Superviseurs dédiés, checklists, contrôles qualité et actions correctives rapides."],
    ["leaf", "Engagement durable", "Produits adaptés, formation continue, gestion responsable des ressources, respect des consignes du site."],
  ].map(([i, t, d]) => `<div class="card card--line"><h4>${icon(i, 17, "#1F6B3A")} ${t}</h4><p>${d}</p></div>`).join("")}</div>
  <p class="note">${icon("eye", 14, "#5B6678")} Les chiffres clés sont ceux affichés sur le site public. Si la direction les met à jour, utilisez toujours la dernière version.</p>
`);

// 2 — Le pitch
chapter("Le pitch", "Se présenter", "Le pitch : <span class=\"serif\">30 secondes pour donner envie</span>",
  "Apprenez-le, puis dites-le avec vos mots. Le but n’est pas de tout dire, mais d’obtenir la suite : un rendez-vous ou une visite technique.",
  `
  <div class="pitch">
    <p class="pitch__lbl">Pitch « ascenseur » · 30 secondes</p>
    <blockquote>« Je suis <b>[Prénom]</b>, de NECS. Nous gérons le nettoyage professionnel des bureaux, commerces, sites industriels et établissements de santé à Douala et Yaoundé. Notre différence : des équipes formées et encadrées, et une application qui vous <b>prouve</b> chaque passage, avec le pointage des agents, des photos et des contrôles qualité notés. Est-ce que je peux venir voir vos locaux pour vous faire une proposition sur mesure ? La visite et le devis sont gratuits. »</blockquote>
  </div>
  <h3 class="h3">Pitch long · 2 minutes, en 5 temps</h3>
  <div class="steps5">${[
    ["Accroche", "Parler de son monde, pas du nôtre.", "« Vos visiteurs jugent votre entreprise dès l’entrée. »"],
    ["Problème", "Nommer ce qui l’agace aujourd’hui.", "« Absences non remplacées, qualité irrégulière, aucun suivi… »"],
    ["Solution", "Ce que NECS fait concrètement.", "« Une équipe dédiée, un superviseur, des passages planifiés. »"],
    ["Preuve", "Montrer, pas promettre.", "« Regardez : pointage, photos, score qualité, en temps réel. »"],
    ["Action", "Demander la suite, clairement.", "« Je passe mardi 10 h pour la visite technique ? »"],
  ].map(([t, d, e], i) => `<div class="s5"><span>${i + 1}</span><h4>${t}</h4><p>${d}</p><em>${e}</em></div>`).join("")}</div>
  <h3 class="h3">Adapter l’accroche au secteur</h3>
  <div class="hooks">${[
    ["building", "Bureaux", "« Vos équipes et vos visiteurs arrivent chaque matin dans des bureaux impeccables, sans que vous ayez à y penser. »"],
    ["factory", "Industrie", "« Des sols propres, ce sont des risques d’accident en moins et des audits qui se passent bien. »"],
    ["store", "Commerces", "« Votre client juge votre magasin dès l’entrée : faisons en sorte qu’il se sente bienvenu. »"],
    ["pulse", "Santé", "« Chez vous, l’hygiène n’est pas une option : nous la prouvons à chaque passage. »"],
    ["bed", "Hôtellerie", "« Une chambre impeccable, c’est un client qui revient et qui recommande. »"],
    ["school", "Éducation", "« Les parents jugent aussi l’école sur la propreté des classes et des sanitaires. »"],
  ].map(([i, s, h]) => `<div class="hook"><span>${icon(i, 15, "#1570B8")} ${s}</span><p>${h}</p></div>`).join("")}</div>
  <div class="promise"><p class="kicker">La promesse NECS en une phrase</p><p class="promise__txt serif">Des espaces propres. Un service rigoureux. Une confiance durable.</p></div>
`);

// 3 — Pourquoi NECS
chapter("Pourquoi NECS", "Arguments clés", "Six raisons de <span class=\"serif\">choisir NECS</span>",
  "Chaque argument va avec une preuve. Un argument sans preuve, le client l’a déjà entendu chez les concurrents.",
  `
  <div class="args">${[
    ["users", "Des équipes formées et encadrées", "Agents formés aux protocoles, aux produits et à la sécurité, suivis par un chef d’équipe ou un superviseur.", "Le plan de formation et le nom du superviseur dans la proposition."],
    ["calendar", "Une rigueur opérationnelle", "Plannings, ordres de travail et checklists par zone : chaque passage est organisé, rien n’est laissé au hasard.", "Un exemple de checklist par zone."],
    ["chart", "Une qualité mesurée", "Contrôles qualité notés, non-conformités suivies, actions correctives rapides.", "Le score qualité moyen (85+) et un rapport de contrôle type."],
    ["clock", "Une réactivité garantie", "Une absence ? L’agent est remplacé sous 24 h. Une demande ? Réponse sous 24 h ouvrées.", "Le taux de réalisation de 98 %."],
    ["eye", "Une transparence digitale", "Pointage géolocalisé, photos d’arrivée et de départ, devis, contrats et factures consultables en ligne.", "La démo de l’application (chapitre 6)."],
    ["shield", "Un interlocuteur unique", "Un seul contact NECS pour tout : planning, qualité, facturation. Pas de renvoi de service en service.", "Le nom et le numéro du référent dès la signature."],
  ].map(([i, t, d, p]) => `<div class="arg"><div class="arg__ic">${icon(i, 20, "#fff")}</div><div><h4>${t}</h4><p>${d}</p><p class="arg__proof"><b>Preuve à montrer :</b> ${p}</p></div></div>`).join("")}</div>
  <h3 class="h3">Parlez bénéfices, pas caractéristiques</h3>
  <div class="benef">
    <div class="benef__h"><span>Ce que NECS apporte</span><span>Ce que le client y gagne</span></div>
    ${[
      ["Un superviseur dédié", "Vous n’avez plus à contrôler vous-même."],
      ["Le remplacement des absences sous 24 h", "Vos locaux ne restent jamais sans entretien."],
      ["Le pointage et les photos", "Vous savez ce qui a été fait, sans vous déplacer."],
      ["Des contrôles qualité notés", "Vous pilotez la propreté avec des chiffres."],
      ["Un montant mensuel fixe", "Votre budget est prévisible, sans surprise."],
    ].map(([a, b]) => `<div class="benef__r"><span>${a}</span>${icon("arrow", 14, "#1F6B3A", 2.2)}<b>${b}</b></div>`).join("")}
  </div>
`);

// 4 — Services (2 pages)
const sectorCards = (list) => `<div class="sectors">${list.map((x) => `
  <article class="sector">
    <figure><img src="${IMG(x.img)}" alt=""/><span>${icon(x.ic, 16, "#fff")}</span></figure>
    <div class="sector__txt">
      <h4>${x.t}</h4>
      <p class="sector__qui"><b>Pour qui :</b> ${x.qui}</p>
      <ul>${x.prest.map((p) => `<li>${icon("check", 12, "#1F6B3A", 2.6)} ${p}</li>`).join("")}</ul>
      <p class="sector__arg">${x.arg}</p>
      <p class="sector__dec">${icon("briefcase", 12, "#1570B8")} À rencontrer : ${x.dec}</p>
    </div>
  </article>`).join("")}</div>`;
chapter("Nos services", "Offre par secteur", "Nos services, <span class=\"serif\">secteur par secteur</span> (1/2)",
  "Pour chaque secteur : à qui on s’adresse, ce qu’on fait, la phrase qui fait mouche et le bon interlocuteur.",
  sectorCards(SECTORS.slice(0, 4)));
chapter("Nos services", "Offre par secteur", "Nos services, <span class=\"serif\">secteur par secteur</span> (2/2)", "",
  sectorCards(SECTORS.slice(4)));

// 5 — Niveaux de service
chapter("Niveaux & fréquences", "Construire l’offre", "Quatre niveaux de service, <span class=\"serif\">une offre sur mesure</span>",
  "Ce sont les niveaux utilisés dans l’application NECS. Ils servent de repère pendant la discussion : le contenu exact est fixé lors de l’étude et écrit noir sur blanc dans la proposition.",
  `
  <div class="levels">${[
    ["Essentiel", "Petits espaces, budget maîtrisé", ["Passages planifiés sur les zones principales", "Checklist par zone", "Contrôle qualité périodique"], ""],
    ["Standard", "Bureaux et commerces courants", ["Toutes les zones du périmètre", "Superviseur référent", "Rapport mensuel"], ""],
    ["Renforcé", "Fort passage, exigences élevées", ["Passages supplémentaires", "Contrôles qualité plus fréquents", "Photos arrivée / départ"], ""],
    ["Premium", "Sièges, lieux d’accueil, sites sensibles", ["Superviseur dédié", "Remplacement prioritaire", "Revue mensuelle avec le client"], "on"],
  ].map(([n, q, f, on]) => `<div class="level ${on}">${on ? `<span class="level__tag">Haut de gamme</span>` : ""}<h4>${n}</h4><p class="level__q">${q}</p><ul>${f.map((x) => `<li>${icon("check", 12, on ? "#8FD14A" : "#1570B8", 2.6)} ${x}</li>`).join("")}</ul></div>`).join("")}</div>
  <p class="note">Chaque niveau reprend tout le contenu du niveau précédent.</p>
  <div class="split split--even">
    <div class="card">
      <h4>${icon("calendar", 17, "#1570B8")} Fréquences proposées</h4>
      <div class="chips">${["Quotidienne", "5 j / semaine", "3 j / semaine", "2 j / semaine", "Hebdomadaire", "Bi-mensuelle", "Mensuelle", "Ponctuelle"].map((f) => `<span class="chip">${f}</span>`).join("")}</div>
      <p class="small">Horaires adaptés au site : tôt le matin, en journée, en soirée, hors temps scolaire ou après fermeture.</p>
    </div>
    <div class="card">
      <h4>${icon("file", 17, "#1570B8")} Comment se construit le prix</h4>
      <ul class="dots"><li>Surface et type de locaux</li><li>Fréquence et horaires</li><li>Niveau de service et contraintes du site</li><li>Effectif nécessaire et encadrement</li></ul>
      <p class="small">Montants <b>HT mensuels en francs CFA</b>, toujours <b>sur devis</b> après visite technique. Paiement par virement, espèces ou Mobile Money selon le contrat.</p>
    </div>
  </div>
  <div class="split split--even">
    <div class="card card--line"><h4>${icon("zap", 17, "#1570B8")} Interventions ponctuelles</h4><ul class="dots"><li>Grand nettoyage ou remise en état</li><li>Nettoyage avant et après un événement</li><li>Renfort ponctuel (inauguration, audit, visite officielle)</li><li>Une bonne porte d’entrée vers un contrat récurrent</li></ul></div>
    <div class="card card--line"><h4>${icon("target", 17, "#1570B8")} Quel niveau proposer ?</h4><ul class="dots"><li>Combien de personnes passent chaque jour ?</li><li>L’image du lieu est-elle critique (accueil, clients VIP) ?</li><li>Y a-t-il des zones sensibles (santé, alimentaire) ?</li><li>Quel budget mensuel est envisagé ?</li></ul><p class="small">Proposez le niveau qui répond au besoin, puis une option au-dessus : le client choisit.</p></div>
  </div>
`);

// 6 — La preuve digitale
chapter("La preuve digitale", "Notre arme différenciante", "La preuve digitale : <span class=\"serif\">montrez, ne promettez pas</span>",
  "Aucun concurrent ne peut montrer ce que NECS montre. Sortez votre téléphone dans chaque rendez-vous.",
  `
  <div class="proof">
    <div class="proof__phone">${phoneApp()}<p class="caption">Aperçu illustratif du suivi client</p></div>
    <div class="proof__list">
      ${[
        ["pin", "Pointage géolocalisé", "L’agent pointe son arrivée et son départ depuis le site. Sans position GPS, le pointage est bloqué."],
        ["camera", "Photos arrivée et départ", "Une photo à l’arrivée, une photo après le nettoyage : la preuve du travail fait."],
        ["shield", "Contrôles qualité notés", "Le superviseur note chaque zone. Les non-conformités déclenchent une action corrective."],
        ["file", "Documents en ligne", "Devis, contrats, factures et rapports sont consultables par le client dans son espace."],
      ].map(([i, t, d]) => `<div class="pf"><span>${icon(i, 18, "#1570B8")}</span><div><h4>${t}</h4><p>${d}</p></div></div>`).join("")}
      <figure class="shot"><img src="${CAP("espace-client.png")}" alt=""/><figcaption>L’espace client réel : devis, contrats, factures, rapports.</figcaption></figure>
    </div>
  </div>
  <div class="demo"><p class="kicker">La démo en 3 minutes</p><ol>${["Montrez le pointage : « Vous savez à quelle heure l’équipe est arrivée. »", "Montrez les photos : « Vous voyez le résultat, même sans vous déplacer. »", "Montrez le score qualité : « Vous pilotez la propreté avec des chiffres. »", "Concluez : « C’est ce que vous aurez dès le premier mois. »"].map((t) => `<li>${t}</li>`).join("")}</ol></div>
`);

// 7 — Cibles
chapter("Les bons interlocuteurs", "Cibler", "Parler à la bonne personne, <span class=\"serif\">avec les bons mots</span>",
  "Chaque décideur a ses propres priorités. Adaptez votre discours à la personne en face de vous.",
  `
  <table class="tbl">
    <thead><tr><th>Interlocuteur</th><th>Ce qui compte pour lui</th><th>Votre angle</th></tr></thead>
    <tbody>${[
      ["DAF / Direction financière", "Coût maîtrisé, facturation claire, pas de surprise", "Offre détaillée ligne par ligne, montant mensuel fixe, factures en ligne"],
      ["Services généraux / Office manager", "Fiabilité au quotidien, réactivité, un seul contact", "Remplacement sous 24 h, interlocuteur unique, planning respecté"],
      ["Responsable achats", "Offres comparables, conditions, garanties", "Proposition structurée, périmètre précis, conditions standard claires"],
      ["Direction d’établissement (santé, hôtel, école)", "Hygiène, image, sécurité des usagers", "Protocoles renforcés, traçabilité, contrôles qualité notés"],
      ["Responsable HSE / directeur de site", "Respect des consignes, sécurité des équipes", "Équipes formées, EPI, consignes du site intégrées au planning"],
      ["Syndic / gestionnaire immobilier", "Parties communes propres, copropriétaires satisfaits", "Passages planifiés, preuves photo partageables avec le conseil syndical"],
      ["Particulier", "Confiance, discrétion, régularité", "Équipe stable et encadrée, référent joignable"],
    ].map((r) => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="b"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
  <div class="split split--even">
    <div class="card"><h4>${icon("pin", 17, "#1570B8")} Où prospecter</h4><ul class="dots"><li><b>Douala :</b> Akwa, Bonanjo, Bonapriso, zones industrielles et portuaires</li><li><b>Yaoundé :</b> centre administratif, Bastos, quartiers d’affaires</li><li>Nouveaux immeubles, centres commerciaux, cliniques et écoles privées</li></ul></div>
    <div class="card"><h4>${icon("zap", 17, "#1570B8")} Signaux d’achat à repérer</h4><ul class="dots"><li>Déménagement, ouverture ou extension de locaux</li><li>Plainte sur le prestataire actuel, fin de contrat proche</li><li>Visite d’un client important, audit, certification</li><li>Demande arrivée par le site web (« Demandes digitales »)</li></ul></div>
  </div>
`);

// 8 — Cycle de vente
chapter("Le cycle de vente", "Méthode", "Le cycle de vente, <span class=\"serif\">étape par étape</span>",
  "Les étapes et probabilités sont celles du pipeline de l’application NECS. Mettez à jour l’étape après chaque échange.",
  `
  <div class="cycle">${[
    ["Prospection", "", "Obtenir un premier rendez-vous.", "Créer le prospect dans le CRM, ou traiter la demande arrivée par le site."],
    ["Qualification du besoin", "20 %", "Comprendre le site, le besoin et le décideur.", "Remplir la fiche besoin : sans champs obligatoires complets, l’étude reste bloquée."],
    ["Visite technique", "", "Voir les lieux, mesurer, photographier, noter les contraintes.", "Saisir le rapport de visite technique (constats, mesures, risques)."],
    ["Étude & chiffrage", "35 %", "Dimensionner l’équipe, la fréquence et le niveau de service.", "Préparer le devis : lignes, quantités, prix unitaires, TVA."],
    ["Proposition", "50 %", "Remettre une offre claire et la présenter de vive voix.", "Générer la proposition de services et le devis, puis planifier une relance."],
    ["Négociation", "70 %", "Ajuster le périmètre ou la fréquence, jamais la qualité.", "Noter chaque relance (appel, visite, WhatsApp, e-mail) et la prochaine action."],
    ["Gagnée", "100 %", "Signature du bon de commande ou du contrat.", "Passer l’opportunité en « Gagnée » : le contrat est transmis aux opérations."],
    ["Démarrage & suivi", "", "Cadrage S+0, démarrage S+1, contrôles J+7 et J+30, revue mensuelle.", "Rester présent : un client bien suivi renouvelle et recommande."],
  ].map(([t, p, o, a], i) => `<div class="cy"><span class="cy__n">${i + 1}</span><div class="cy__body"><h4>${t}${p ? ` <em>${p}</em>` : ""}</h4><p><b>Objectif :</b> ${o}</p><p class="cy__app">${icon("phone", 11, "#1570B8")} ${a}</p></div></div>`).join("")}</div>
  <p class="note">${icon("x", 13, "#B42318", 2.4)} Opportunité perdue ? Le motif est obligatoire : prix, concurrent retenu, budget reporté, besoin non confirmé, pas de réponse, hors zone… Il sert à améliorer nos offres.</p>
`);

// 9 — Découverte & visite technique
chapter("Découverte & visite", "Écouter", "Poser les bonnes questions, <span class=\"serif\">puis visiter</span>",
  "Écoutez 70 % du temps. Le client vous donne lui-même les arguments qui le convaincront.",
  `
  <div class="split split--even">
    <div class="card card--q">
      <h4>${icon("ear", 17, "#1570B8")} Questions de découverte</h4>
      ${[
        ["Situation", ["Comment est organisé l’entretien de vos locaux aujourd’hui ?", "Combien de personnes et de visiteurs chaque jour ?"]],
        ["Problèmes", ["Qu’est-ce qui vous agace le plus aujourd’hui ?", "Que se passe-t-il quand un agent est absent ?"]],
        ["Impact", ["Qu’est-ce que cela vous coûte : temps, image, plaintes ?", "Qui s’en plaint en interne ?"]],
        ["Attentes", ["À quoi ressemblerait un prestataire idéal pour vous ?", "Qui décide, et pour quand ?"]],
      ].map(([t, qs]) => `<p class="qgrp">${t}</p>${qs.map((q) => `<p class="q">« ${q} »</p>`).join("")}`).join("")}
    </div>
    <div class="card">
      <h4>${icon("check", 17, "#1570B8")} Fiche visite technique</h4>
      <p class="small">Les champs de la fiche besoin dans l’application. Tout doit être renseigné avant le chiffrage.</p>
      <ul class="checks">${["Type de prestation (bureaux, commerce, industriel, médical…)", "Surface en m² et type de locaux", "Fréquence souhaitée et horaires d’intervention", "Niveau de service attendu", "Zones à couvrir (et zones exclues)", "Contraintes : sécurité, badges, produits interdits", "Accès et consignes du site", "Effectif estimé", "Nombre de sanitaires, types de sols, vitrerie", "Point d’eau et local pour le matériel", "Photos des zones clés", "Nom, fonction et contact du décideur"].map((c) => `<li><i></i>${c}</li>`).join("")}</ul>
    </div>
  </div>
  <h3 class="h3">Déroulé d’une visite technique (30 à 45 minutes)</h3>
  <div class="flow">${[
    ["Accueil", "Remercier, rappeler l’objectif de la visite et la durée prévue."],
    ["Tour du site", "Parcourir toutes les zones avec le décideur ou son représentant."],
    ["Mesures & photos", "Surfaces, sols, sanitaires, vitrerie ; photos avec accord."],
    ["Contraintes", "Horaires, accès, sécurité, zones sensibles, produits interdits."],
    ["Conclusion", "Reformuler le besoin et fixer la date de remise de l’offre."],
  ].map(([t, d], i) => `<div class="flow__s"><span>${i + 1}</span><h4>${t}</h4><p>${d}</p></div>`).join("")}</div>
  <div class="tips">${[
    ["Le jour même", "Saisir la fiche besoin et la visite dans l’application, puis envoyer un message de remerciement au client."],
    ["Sous 48 à 72 h", "Remettre la proposition de services à la date annoncée pendant la visite, et proposer de la parcourir ensemble."],
  ].map(([t, d]) => `<div class="tip">${icon("clock", 15, "#1570B8")}<div><b>${t}</b><p>${d}</p></div></div>`).join("")}</div>
`);

// 10 — Objections
chapter("Les objections", "Convaincre", "Répondre aux objections <span class=\"serif\">sans se braquer</span>",
  "Une objection n’est pas un refus : c’est une question que le client se pose. Elle montre qu’il s’intéresse à l’offre.",
  `
  <div class="flow flow--4">${[
    ["Écouter", "Laisser le client aller au bout, sans l’interrompre.", "« Je vous écoute. »"],
    ["Reformuler", "Montrer qu’on a compris, et faire préciser.", "« Si je comprends bien, c’est le budget qui vous inquiète ? »"],
    ["Répondre", "Une réponse courte, appuyée sur une preuve.", "« Regardez ce que voit un client chaque matin. »"],
    ["Vérifier", "S’assurer que le point est réglé avant d’avancer.", "« Est-ce que cela répond à votre question ? »"],
  ].map(([t, d, e], i) => `<div class="flow__s"><span>${i + 1}</span><h4>${t}</h4><p>${d}</p><em>${e}</em></div>`).join("")}</div>
  <div class="objs">${[
    ["« C’est trop cher. »", "Comparons à périmètre égal : nombre d’agents, heures, encadrement, produits, remplacement des absences. Si le budget est serré, on ajuste la fréquence ou le niveau de service, jamais la qualité du travail.", "Le devis détaillé ligne par ligne."],
    ["« On a déjà un prestataire. »", "Très bien. Qu’est-ce qui vous satisferait encore plus ? Je vous propose une visite gratuite pour comparer, sans engagement. Si besoin, on démarre à la fin de votre préavis.", "La démo de l’espace client."],
    ["« On le fait en interne. »", "Avez-vous chiffré les coûts cachés : absences, matériel, produits, encadrement, gestion RH ? Avec NECS, tout est inclus dans un montant mensuel, et une absence est remplacée sous 24 h.", "Le taux de réalisation de 98 %."],
    ["« Pas de budget pour le moment. »", "Je comprends. Quand se prépare votre prochain budget ? On peut démarrer avec un niveau Essentiel ou une intervention ponctuelle. Je note une relance à la bonne date.", "Une relance datée dans le pipeline."],
    ["« J’ai peur pour la sécurité (vols, accès). »", "Nos agents sont encadrés par un superviseur, pointent leur arrivée et leur départ sur site, et respectent vos consignes d’accès. Vous avez un interlocuteur unique en cas de souci.", "Le pointage géolocalisé."],
    ["« Les autres promettent la même chose. »", "C’est vrai, tout le monde promet. La différence, c’est que nous le prouvons : chaque passage est pointé, photographié et noté. Vous le voyez vous-même.", "Les photos et le score qualité."],
  ].map(([o, r, p]) => `<div class="obj"><h4>${o}</h4><p>${r}</p><p class="obj__proof">${icon("eye", 12, "#1F6B3A", 2.2)} ${p}</p></div>`).join("")}</div>
`);

// 11 — Scripts
chapter("Scripts prêts à l’emploi", "Prospecter", "Des scripts <span class=\"serif\">prêts à l’emploi</span>",
  "Remplacez les crochets et adaptez le ton. Gardez toujours une question ou une proposition de date à la fin.",
  `
  <div class="scripts">
    <div class="script"><h4>${icon("phone", 16, "#1570B8")} Appel de prospection</h4><p>« Bonjour <b>[Madame / Monsieur X]</b>, <b>[Prénom]</b> de NECS, société de nettoyage professionnel à <b>[Ville]</b>. Nous accompagnons des <b>[secteur]</b> comme le vôtre. Avez-vous deux minutes ?</p><p>Qui s’occupe aujourd’hui de l’entretien de vos locaux ? Qu’est-ce qui fonctionne bien, qu’est-ce qui pourrait être mieux ?</p><p>Je vous propose une visite technique gratuite de 30 minutes pour vous faire une offre sur mesure : plutôt <b>mardi matin</b> ou <b>jeudi après-midi</b> ? »</p></div>
    <div class="script"><h4>${icon("chat", 16, "#1F6B3A")} Message WhatsApp</h4><p>Bonjour <b>[Prénom]</b>, c’est <b>[Prénom]</b> de NECS, suite à notre échange. Comme promis, voici notre présentation (flyer joint).</p><p>Nous pouvons passer voir vos locaux gratuitement pour vous proposer une offre adaptée. Quel jour vous arrange cette semaine ?</p><p>Bonne journée,<br/><b>[Prénom]</b> · NECS · ${TEL}</p></div>
    <div class="script"><h4>${icon("mail", 16, "#1570B8")} E-mail après la visite</h4><p><b>Objet :</b> Votre proposition NECS · <b>[Société]</b></p><p>Bonjour <b>[Prénom]</b>, merci pour votre accueil ce <b>[jour]</b>. Vous trouverez ci-joint notre proposition pour <b>[périmètre]</b> : <b>[fréquence]</b>, niveau <b>[niveau]</b>, démarrage possible le <b>[date]</b>.</p><p>Je vous propose un court échange <b>[date / heure]</b> pour la parcourir ensemble.</p></div>
    <div class="script"><h4>${icon("clock", 16, "#E8A33D")} Relance de la proposition</h4><p><b>J+3 :</b> « Avez-vous pu parcourir la proposition ? Avez-vous des questions sur le périmètre ou le planning ? »</p><p><b>J+7 :</b> « Je reviens vers vous : souhaitez-vous ajuster la fréquence ou le niveau de service avant décision ? »</p><p><b>J+15 :</b> « Je ne veux pas vous relancer pour rien : le projet est-il toujours d’actualité ? »</p></div>
    <div class="script"><h4>${icon("phone", 16, "#5B6678")} Message sur répondeur</h4><p>« Bonjour <b>[Prénom]</b>, <b>[Prénom]</b> de NECS. Je vous appelle au sujet de l’entretien de vos locaux. Je vous envoie un court message WhatsApp avec notre présentation.</p><p>Vous pouvez me rappeler au <b>[numéro]</b>. Bonne journée. »</p><p class="small">20 secondes maximum, puis envoyer le WhatsApp dans la foulée.</p></div>
    <div class="script"><h4>${icon("leaf", 16, "#1F6B3A")} Après un refus</h4><p>« Merci pour votre réponse, je la respecte. Pour progresser, puis-je vous demander ce qui a fait la différence ? »</p><p>« Si la situation change, je reste disponible. Puis-je vous recontacter dans quelques mois ? »</p><p class="small">Saisir le motif de perte et une relance datée dans l’application.</p></div>
  </div>
  <div class="tips">${[
    ["Bons usages WhatsApp", "Se présenter dès le premier message, rester court, joindre le flyer en PDF, écrire aux heures de bureau, ne jamais envoyer de vocal de plus de 30 secondes."],
    ["Le meilleur moment pour appeler", "Entre 9 h et 11 h, ou après 15 h. Éviter le lundi matin et le vendredi après-midi."],
  ].map(([t, d]) => `<div class="tip">${icon("star", 15, "#E8A33D")}<div><b>${t}</b><p>${d}</p></div></div>`).join("")}</div>
`);

// 12 — Proposition & conclusion
chapter("Proposer & conclure", "Signer", "Une proposition claire, <span class=\"serif\">une conclusion assumée</span>",
  "La proposition de services de l’application reprend automatiquement cette structure. Vérifiez chaque bloc avant l’envoi.",
  `
  <div class="offer">${[
    ["Besoin", "Le périmètre, les surfaces, la fréquence et le niveau retenus."],
    ["Méthodologie", "1) Diagnostic et cadrage · 2) Organisation opérationnelle · 3) Exécution et preuves · 4) Amélioration continue."],
    ["Moyens", "Matériel professionnel adapté, consommables, EPI, machines selon les zones."],
    ["Équipe", "Équipe dédiée dimensionnée au périmètre, chef d’équipe ou supervision, formation continue."],
    ["Planning", "S+0 : cadrage et accès · S+1 : démarrage · J+7 et J+30 : contrôles qualité · revue mensuelle."],
    ["Supervision & digital", "Visites terrain, contrôles qualité, pointage digital, photos preuves, reporting."],
    ["Conditions", "Montants HT mensuels · révision annuelle possible · préavis 30 jours · paiement à 30 jours fin de mois · durée de validité indiquée."],
  ].map(([t, d]) => `<div class="of"><b>${t}</b><p>${d}</p></div>`).join("")}</div>
  <div class="split split--even">
    <div class="card"><h4>${icon("check", 17, "#1F6B3A")} Pour conclure</h4><ul class="dots"><li>Résumez les 3 bénéfices qui comptent pour <b>ce</b> client</li><li>Posez la question directement : « On démarre le [date] ? »</li><li>Proposez une date de démarrage concrète</li><li>Envoyez le bon de commande ou le contrat le jour même</li></ul></div>
    <div class="card card--warn"><h4>${icon("x", 17, "#B42318", 2.2)} À ne jamais faire</h4><ul class="dots"><li>Annoncer un prix au téléphone, sans visite</li><li>Accorder une remise sans validation de la direction</li><li>Promettre un délai ou un effectif hors de nos capacités</li><li>Dénigrer un concurrent ou le prestataire actuel</li></ul></div>
  </div>
  <div class="signals">
    <p class="kicker">Les signaux que le client est prêt</p>
    <div class="signals__l">${["Il demande une date de démarrage possible", "Il demande le contrat ou les conditions de paiement", "Il parle de « nous » et de « vos agents »", "Il négocie un détail, pas le principe", "Il présente le projet à un collègue ou à sa direction", "Il demande des références ou une visite d’un site client"].map((s) => `<span>${icon("check", 13, "#1F6B3A", 2.4)} ${s}</span>`).join("")}</div>
  </div>
`);

// 13 — L'espace commercial
chapter("Votre outil", "L’application NECS", "Votre outil : <span class=\"serif\">l’espace commercial</span>",
  "Tout ce qui n’est pas dans l’application n’existe pas. Saisissez vos actions le jour même, depuis votre téléphone si besoin.",
  `
  <figure class="shot shot--wide"><img src="${CAP("espace-commercial.png")}" alt=""/></figure>
  <div class="grid3">${[
    ["chat", "Demandes digitales", "Les demandes de devis et de visite envoyées depuis le site arrivent ici. Rappelez sous 24 h ouvrées."],
    ["briefcase", "CRM", "Prospect, puis besoin, visite, chiffrage, offre et bon de commande : tout le dossier client au même endroit."],
    ["chart", "Pipeline & relances", "Valeur, probabilité, prochaine action et échéance de chaque opportunité. Rien ne tombe dans l’oubli."],
    ["file", "Bibliothèque commerciale", "Proposition de services, devis, bon de commande, contrat, avenant, lettre de relance."],
    ["shield", "Contrats & qualité", "Suivez vos clients signés : sites, niveaux de service, contrôles qualité."],
    ["target", "Vos indicateurs", "Rendez-vous, visites, propositions, taux de transformation : objectifs fixés avec la direction."],
  ].map(([i, t, d]) => `<div class="card card--sm"><h4>${icon(i, 16, "#1570B8")} ${t}</h4><p>${d}</p></div>`).join("")}</div>
  <h3 class="h3">Votre routine</h3>
  <div class="grid3">${[
    ["Chaque jour", ["Traiter les demandes digitales du site", "Saisir rendez-vous, visites et appels", "Mettre à jour l’étape des opportunités"]],
    ["Chaque semaine", ["Revoir le pipeline et les échéances", "Planifier les visites techniques", "Relancer les propositions de plus de 7 jours"]],
    ["Chaque mois", ["Faire le bilan avec la direction", "Analyser les motifs de perte", "Rendre visite aux clients signés"]],
  ].map(([t, l]) => `<div class="card card--line"><h4>${icon("calendar", 16, "#1570B8")} ${t}</h4><ul class="dots">${l.map((x) => `<li>${x}</li>`).join("")}</ul></div>`).join("")}</div>
  <p class="note">${icon("eye", 14, "#5B6678")} Le guide d’utilisation de l’application (Guide-utilisateurs-NECS.pdf, chapitre Commercial) détaille chaque écran.</p>
`);

// 14 — Kit & règles d'or
chapter("Le kit du commercial", "Sur le terrain", "Le kit du commercial <span class=\"serif\">et les règles d’or</span>", "",
  `
  <div class="split split--even">
    <div class="card"><h4>${icon("briefcase", 17, "#1570B8")} Dans votre sac</h4><ul class="checks">${["Flyers NECS (recto / verso)", "Cartes de visite", "Téléphone chargé : espace commercial et démo prêts", "Fiche visite technique imprimée (chapitre 9)", "Mètre ou télémètre laser", "Carnet et stylo", "EPI si visite de site industriel"].map((c) => `<li><i></i>${c}</li>`).join("")}</ul></div>
    <div class="card"><h4>${icon("star", 17, "#E8A33D")} Attitude</h4><ul class="dots"><li>Arriver 10 minutes en avance, tenue soignée</li><li>Écouter plus que parler, reformuler avant de proposer</li><li>Prendre des photos seulement avec l’accord du client</li><li>Envoyer un compte rendu le jour même</li><li>Tenir chaque promesse, même petite : rappeler à l’heure dite</li></ul></div>
  </div>
  <div class="gold">
    <p class="kicker kicker--light">Les 5 règles d’or</p>
    <ol>${["Écouter avant de proposer.", "Ne jamais annoncer de prix sans visite technique.", "Toujours montrer la preuve digitale.", "Toujours finir par une date : rendez-vous, visite ou démarrage.", "Tout saisir dans l’application, le jour même."].map((t) => `<li>${t}</li>`).join("")}</ol>
  </div>
  <div class="contactbox">
    <img src="${IMG("logo-necs.png")}" alt="NECS"/>
    <div><p class="kicker">Contacts NECS</p><p class="contactbox__l">${icon("phone", 14)} ${TEL} &nbsp;·&nbsp; ${icon("mail", 14)} ${MAIL} &nbsp;·&nbsp; ${icon("globe", 14)} ${SITE}</p><p class="small">Yaoundé, Douala et environs · Lun – Ven · 08h00 – 17h30</p></div>
  </div>
  <figure class="quote">
    <img src="${IMG("necs-activite-bureaux.jpg")}" alt=""/>
    <figcaption><p class="serif">« La propreté est le premier signal de confiance qu’un lieu envoie. »</p><span>Notre conviction, à porter à chaque rendez-vous</span></figcaption>
  </figure>
`);

let chapterNum = 0;
const toc = chapters.map((c, i) => {
  if (i === 0 || c.title !== chapters[i - 1].title) chapterNum += 1;
  return { ...c, num: chapterNum, page: i + 3 };
});
const tocUnique = toc.filter((c, i) => i === 0 || c.title !== toc[i - 1].title);

const guidePages = [];
guidePages.push(`
<section class="page g-cover">
  <img class="g-cover__bg" src="${IMG("necs-hero.jpg")}" alt=""/>
  <div class="g-cover__shade"></div>
  <div class="g-cover__top"><div class="logo-card"><img src="${IMG("logo-necs.png")}" alt="NECS"/></div><span class="tag">Document interne</span></div>
  <div class="g-cover__body">
    <p class="kicker kicker--light">Guide commercial · ${DATE}</p>
    <h1>Présenter NECS.<br/><span class="serif grad">Convaincre. Signer.</span></h1>
    <p>Le kit de l’équipe commerciale : pitch, offre par secteur, arguments, preuve digitale, objections, scripts et cycle de vente.</p>
    <div class="g-cover__chips">${[["Propreté", "drop"], ["Rigueur", "check"], ["Confiance", "shield"]].map(([t, i]) => `<span>${icon(i, 14, "#8FD14A", 2.2)} ${t}</span>`).join("")}</div>
  </div>
</section>`);

guidePages.push(page(2, "Sommaire", `
  <div class="ch"><div><p class="kicker">Sommaire</p><h2>Tout ce qu’il faut pour <span class="serif">vendre NECS</span></h2></div></div>
  <div class="toc-wrap">
    <ol class="toc">${tocUnique.map((c) => `<li><span class="toc__n">${String(c.num).padStart(2, "0")}</span><span class="toc__t">${c.title}</span><i></i><span class="toc__p">${c.page}</span></li>`).join("")}</ol>
    <aside class="toc-side">
      <div class="card card--dark"><h4>${icon("star", 17, "#8FD14A")} Comment utiliser ce guide</h4><p>Lisez-le une fois en entier. Ensuite, gardez-le sur votre téléphone : avant chaque rendez-vous, relisez le chapitre du secteur visé, les objections et le script dont vous avez besoin.</p></div>
      <div class="card"><h4>${icon("file", 17, "#1570B8")} À remettre au client</h4><p>Ce guide est <b>interne</b>. Au client, remettez le <b>flyer NECS</b> (Flyer-NECS.pdf), imprimé recto verso ou envoyé par WhatsApp.</p></div>
      <figure class="photo"><img src="${IMG("necs-blog-2.jpg")}" alt=""/></figure>
    </aside>
  </div>
  <div class="journey">
    <p class="kicker kicker--light">Le parcours d’une vente</p>
    <div class="journey__l">${[
      ["search", "Prospecter", "Interlocuteurs · Scripts"],
      ["ear", "Découvrir", "Questions de découverte"],
      ["pin", "Visiter", "Fiche visite technique"],
      ["file", "Proposer", "Proposition de services"],
      ["check", "Conclure", "Signaux et closing"],
      ["star", "Fidéliser", "Qualité et preuves"],
    ].map(([i, t, d], k) => `<div class="journey__s">${k ? `<i>${icon("arrow", 14, "#3EC8E8", 2.2)}</i>` : ""}<span>${icon(i, 18, "#fff")}</span><b>${t}</b><small>${d}</small></div>`).join("")}</div>
  </div>
`));

toc.forEach((c) => {
  guidePages.push(page(c.page, c.title, `
    <div class="ch"><span class="ch__n">${String(c.num).padStart(2, "0")}</span><div><p class="kicker">${c.kicker}</p><h2>${c.heading}</h2>${c.lead ? `<p class="lead">${c.lead}</p>` : ""}</div></div>
    ${c.body}`, c.cls));
});

function page(n, title, body, cls = "") {
  return `<section class="page ${cls}"><header class="rh"><span><img src="${IMG("logo-necs.png")}" alt=""/>Guide commercial</span><span>${title}</span></header><div class="fit">${body}</div><footer class="rf"><span>NECS · Document interne, ne pas remettre au client</span><b>${String(n).padStart(2, "0")}</b></footer></section>`;
}

/* ================= FLYER ================= */
const flyerPages = [`
<section class="page fl fl-recto">
  <div class="fl-hero">
    <img src="${IMG("necs-hero.jpg")}" alt=""/>
    <div class="fl-hero__shade"></div>
    <div class="fl-hero__top"><div class="logo-card"><img src="${IMG("logo-necs.png")}" alt="NECS"/></div><span class="pill">${icon("pin", 13, "#8FD14A", 2.2)} Douala · Yaoundé</span></div>
    <div class="fl-hero__body">
      <p class="kicker kicker--light">Nettoyage professionnel · Facility services</p>
      <h1>L’excellence du nettoyage,<br/><span class="serif grad">élevée au rang d’art.</span></h1>
      <p>Des équipes formées, un encadrement de proximité et un suivi digital qui rend chaque prestation mesurable.</p>
      <div class="fl-badges"><span>${icon("check", 14, "#06200F", 2.6)} Devis gratuit, sans engagement</span><span class="ghost">${icon("clock", 14, "#fff", 2)} Réponse sous 24 h ouvrées</span></div>
    </div>
  </div>
  <div class="fl-stats">${STATS.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("")}</div>
  <div class="fl-why">
    <h2>La différence <span class="serif">NECS</span></h2>
    <div class="fl-why__grid">${[
      ["users", "Équipes formées & encadrées", "Agents formés, chef d’équipe ou superviseur sur chaque site."],
      ["chart", "Qualité mesurée", "Contrôles qualité notés, actions correctives rapides."],
      ["eye", "Suivi digital transparent", "Pointage, photos avant / après, rapports et factures en ligne."],
      ["clock", "Réactivité", "Absence remplacée sous 24 h, interlocuteur unique."],
    ].map(([i, t, d]) => `<div class="fw"><span>${icon(i, 20, "#fff")}</span><div><h4>${t}</h4><p>${d}</p></div></div>`).join("")}</div>
  </div>
  <div class="fl-sect">${SECTORS.map((s) => `<span>${icon(s.ic, 15, "#1570B8")} ${s.s}</span>`).join("")}</div>
  <div class="fl-eng">${[
    ["calendar", "Horaires adaptés", "Tôt le matin, en soirée ou le week-end"],
    ["briefcase", "Matériel professionnel", "Produits, machines et EPI fournis"],
    ["shield", "Paiement simple", "En francs CFA : virement ou Mobile Money"],
  ].map(([i, t, d]) => `<div><span>${icon(i, 17, "#1F6B3A", 2)}</span><p><b>${t}</b>${d}</p></div>`).join("")}</div>
  <div class="fl-contact">
    <div><p>Demandez votre visite technique gratuite</p><b>${icon("phone", 20, "#8FD14A", 2)} ${TEL}</b></div>
    <div class="fl-contact__r"><span>${icon("chat", 14, "#8FD14A")} WhatsApp ${TEL}</span><span>${icon("mail", 14, "#8FD14A")} ${MAIL}</span><span>${icon("globe", 14, "#8FD14A")} ${SITE}</span></div>
  </div>
</section>`, `
<section class="page fl fl-verso">
  <div class="fl-v__head"><div><p class="kicker">Nos expertises</p><h2>Un savoir-faire pour <span class="serif">chaque environnement</span></h2></div><img src="${IMG("logo-necs.png")}" alt="NECS"/></div>
  <div class="fl-tiles">${SECTORS.map((s) => `<article><img src="${IMG(s.img)}" alt=""/><div><span>${icon(s.ic, 14, "#fff")}</span><b>${s.t}</b></div></article>`).join("")}</div>
  <div class="fl-how">
    <h3>Comment ça marche</h3>
    <div class="fl-how__steps">${[
      ["Échange & visite", "Un conseiller visite vos locaux gratuitement."],
      ["Offre sur mesure", "Fréquence, horaires et niveau de service adaptés."],
      ["Démarrage planifié", "Équipe dédiée, consignes de votre site intégrées."],
      ["Suivi qualité", "Contrôles, rapports et un interlocuteur unique."],
    ].map(([t, d], i) => `<div class="hs"><span>${i + 1}</span><h4>${t}</h4><p>${d}</p></div>`).join("")}</div>
  </div>
  <div class="fl-proof">
    <div class="fl-proof__phone">${phoneApp()}</div>
    <div class="fl-proof__txt">
      <p class="kicker kicker--light">La preuve à chaque passage</p>
      <h3>Vous ne le voyez pas faire.<br/><span class="serif grad">Vous le voyez fait.</span></h3>
      <ul>${["Pointage des équipes sur site, à la minute près", "Photos à l’arrivée et après le nettoyage", "Contrôles qualité notés et suivis", "Devis, contrats, rapports et factures en ligne"].map((t) => `<li>${icon("check", 14, "#8FD14A", 2.6)} ${t}</li>`).join("")}</ul>
      <p class="caption caption--light">Aperçu illustratif de l’espace client NECS</p>
    </div>
  </div>
  <div class="fl-cta">
    <div class="fl-cta__l"><h3>Parlons de <span class="serif">vos locaux.</span></h3><p>${icon("phone", 14, "#1570B8")} ${TEL} &nbsp; ${icon("mail", 14, "#1570B8")} ${MAIL}<br/>${icon("globe", 14, "#1570B8")} ${SITE} &nbsp; ${icon("clock", 14, "#1570B8")} Lun – Ven · 08h00 – 17h30</p></div>
    <div class="fl-cta__r"><p>Votre conseiller NECS</p><i></i><p>Téléphone</p><i></i></div>
  </div>
</section>`];

/* ---------- Styles ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
@page{size:A4;margin:0}
:root{--mid:#06152E;--navy:#0A3A72;--azur:#1570B8;--lagoon:#3EC8E8;--leaf:#8FD14A;--forest:#1F6B3A;--amber:#E8A33D;--ivory:#F6F4EF;--mist:#EEF3F8;--ink:#0B1324;--slate:#5B6678;--line:#E3E8EF}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Inter,sans-serif;color:var(--ink);font-size:11px;line-height:1.5}
img{display:block}
ul,ol{list-style:none}
.serif{font-family:'Instrument Serif',serif;font-style:italic;font-weight:400;letter-spacing:0}
.grad{background:linear-gradient(90deg,#3EC8E8,#8FD14A);-webkit-background-clip:text;background-clip:text;color:transparent}
.page{width:793px;height:1122px;position:relative;overflow:hidden;break-after:page;background:#fff;padding:38px 46px 50px}
.kicker{font:600 9.5px Inter;letter-spacing:.18em;text-transform:uppercase;color:var(--azur);margin-bottom:6px}
.kicker--light{color:var(--lagoon)}
.note{display:flex;gap:7px;align-items:flex-start;font-size:10px;color:var(--slate);margin-top:12px;line-height:1.45}
.note svg{flex:0 0 auto;margin-top:1px}
.small{font-size:10px;color:var(--slate);margin-top:8px;line-height:1.5}
.caption{font-size:9px;color:var(--slate);text-align:center;margin-top:8px}
.caption--light{color:rgba(255,255,255,.5);text-align:left}

/* En-tête / pied */
.rh{display:flex;justify-content:space-between;align-items:center;font:500 9px Inter;letter-spacing:.1em;text-transform:uppercase;color:var(--slate);padding-bottom:12px;border-bottom:1px solid var(--line);margin-bottom:22px}
.rh span:first-child{display:flex;align-items:center;gap:8px}
.rh img{height:18px}
.rf{position:absolute;left:46px;right:46px;bottom:20px;display:flex;justify-content:space-between;align-items:center;font-size:8.5px;color:#98A2B3}
.rf b{font:600 11px Outfit;color:var(--mid)}
.ch{display:flex;gap:16px;align-items:flex-start;margin-bottom:18px}
.ch__n{font:400 46px/1 'Instrument Serif';font-style:italic;color:var(--lagoon);min-width:52px}
.ch h2{font:600 25px/1.15 Outfit;color:var(--mid);letter-spacing:-.02em}
.ch h2 .serif{font-size:29px;color:var(--azur)}
.lead{font-size:11.5px;color:var(--slate);margin-top:7px;max-width:600px;line-height:1.55}
.h3{font:600 15px Outfit;color:var(--mid);margin:20px 0 10px}
.body{font-size:11.5px;line-height:1.65;color:var(--ink)}

/* Blocs */
.split{display:grid;grid-template-columns:1.25fr 1fr;gap:20px;margin-top:6px}
.split--even{grid-template-columns:1fr 1fr;margin-top:16px}
.card{background:var(--ivory);border-radius:16px;padding:16px 18px}
.card h4{display:flex;gap:8px;align-items:center;font:600 13px Outfit;color:var(--mid);margin-bottom:7px}
.card p{font-size:10.5px;color:var(--slate);line-height:1.55}
.card--sm{padding:13px 15px}
.card--sm h4{font-size:12px}
.card--dark{background:var(--mid)}
.card--dark h4{color:#fff}
.card--dark p{color:rgba(255,255,255,.75)}
.card--warn{background:#FEF3F2}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
.photo{border-radius:16px;overflow:hidden}
.photo img{width:100%;height:150px;object-fit:cover}
.photo--tall img{height:200px}
.values{display:flex;gap:8px;margin-top:16px}
.values span{display:flex;gap:6px;align-items:center;height:30px;padding:0 13px;border-radius:999px;background:#E7F5E2;color:var(--forest);font:600 11.5px Outfit}
.statband{display:grid;grid-template-columns:repeat(4,1fr);background:var(--mid);border-radius:18px;padding:20px 22px;margin-top:20px;color:#fff}
.statband div{border-left:1px solid rgba(255,255,255,.15);padding-left:16px}
.statband div:first-child{border-left:0;padding-left:0}
.statband b{font:600 30px/1 Outfit;display:block;background:linear-gradient(90deg,#3EC8E8,#8FD14A);-webkit-background-clip:text;background-clip:text;color:transparent}
.statband span{font-size:10px;color:rgba(255,255,255,.7);margin-top:5px;display:block}
.dots li{position:relative;padding-left:13px;font-size:10.5px;color:var(--ink);margin-bottom:5px;line-height:1.45}
.dots li::before{content:"";position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:var(--leaf)}
.checks li{display:flex;gap:9px;align-items:flex-start;font-size:10.5px;margin-bottom:6px;line-height:1.4}
.checks i{flex:0 0 13px;height:13px;border:1.5px solid #9AA4B2;border-radius:4px;margin-top:1px;background:#fff}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.chip{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;background:#fff;border:1px solid var(--line);font:500 10px Inter}

/* Pitch */
.pitch{background:var(--mid);color:#fff;border-radius:20px;padding:24px 26px;position:relative;overflow:hidden}
.pitch::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(62,200,232,.35),transparent 70%)}
.pitch__lbl{font:600 9.5px Inter;letter-spacing:.18em;text-transform:uppercase;color:var(--lagoon);margin-bottom:10px}
.pitch blockquote{font:400 14px/1.6 Outfit;color:rgba(255,255,255,.9);position:relative;z-index:1}
.pitch blockquote b{color:var(--leaf);font-weight:600}
.steps5{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.s5{background:var(--ivory);border-radius:14px;padding:14px 12px;position:relative}
.s5 span{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#3EC8E8,#8FD14A);color:var(--mid);font:700 11px Outfit;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
.s5 h4{font:600 13px Outfit;color:var(--mid)}
.s5 p{font-size:10px;color:var(--slate);margin:3px 0 8px;line-height:1.4}
.s5 em{display:block;font:400 12.5px/1.35 'Instrument Serif';font-style:italic;color:var(--azur)}
.promise{margin-top:22px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:20px 0;text-align:center}
.promise__txt{font-size:28px;color:var(--mid);line-height:1.2}

/* Arguments */
.args{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.arg{display:flex;gap:14px;background:var(--ivory);border-radius:16px;padding:18px}
.arg__ic{flex:0 0 42px;height:42px;border-radius:13px;background:linear-gradient(135deg,#0A3A72,#1570B8);display:flex;align-items:center;justify-content:center}
.arg h4{font:600 14px Outfit;color:var(--mid);margin-bottom:5px}
.arg p{font-size:10.5px;color:var(--slate);line-height:1.55}
.arg__proof{margin-top:8px;padding-top:8px;border-top:1px dashed #CBD3DD;color:var(--forest)!important}
.arg__proof b{color:var(--forest)}

/* Secteurs */
.sectors{display:flex;flex-direction:column;gap:12px}
.sector{display:grid;grid-template-columns:210px 1fr;gap:16px;background:var(--ivory);border-radius:18px;overflow:hidden}
.sector figure{position:relative}
.sector figure img{width:100%;height:100%;min-height:196px;object-fit:cover}
.sector figure span{position:absolute;left:12px;top:12px;width:32px;height:32px;border-radius:10px;background:rgba(6,21,46,.65);border:1px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center}
.sector__txt{padding:14px 18px 14px 0}
.sector h4{font:600 16px Outfit;color:var(--mid);margin-bottom:4px}
.sector__qui{font-size:10.5px;color:var(--slate);margin-bottom:7px}
.sector__qui b{color:var(--ink)}
.sector ul{display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;margin-bottom:8px}
.sector li{display:flex;gap:6px;align-items:flex-start;font-size:10px;line-height:1.35}
.sector li svg{flex:0 0 auto;margin-top:1px}
.sector__arg{font:400 13px/1.35 'Instrument Serif';font-style:italic;color:var(--azur);margin-bottom:7px}
.sector__dec{display:flex;gap:6px;align-items:center;font:600 9.5px Inter;color:var(--navy);background:#fff;border-radius:999px;padding:4px 10px;width:fit-content}

/* Niveaux */
.levels{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.level{background:var(--ivory);border-radius:16px;padding:16px 14px;position:relative}
.level.on{background:var(--mid);color:#fff}
.level__tag{position:absolute;right:10px;top:-9px;background:var(--leaf);color:#06200F;font:700 8.5px Inter;padding:3px 8px;border-radius:999px}
.level h4{font:600 17px Outfit;color:var(--mid)}
.level.on h4{color:#fff}
.level__q{font-size:9.5px;color:var(--slate);margin:2px 0 10px;min-height:28px}
.level.on .level__q{color:rgba(255,255,255,.65)}
.level li{display:flex;gap:6px;align-items:flex-start;font-size:10px;margin-bottom:5px;line-height:1.35}
.level li svg{flex:0 0 auto;margin-top:1px}

/* Preuve digitale */
.proof{display:grid;grid-template-columns:250px 1fr;gap:24px;align-items:start}
.proof__phone{display:flex;flex-direction:column;align-items:center}
.pf{display:flex;gap:12px;margin-bottom:12px}
.pf>span{flex:0 0 36px;height:36px;border-radius:11px;background:var(--mist);display:flex;align-items:center;justify-content:center}
.pf h4{font:600 13px Outfit;color:var(--mid)}
.pf p{font-size:10.5px;color:var(--slate);line-height:1.5}
.shot{border-radius:12px;overflow:hidden;border:1px solid var(--line);box-shadow:0 18px 30px -20px rgba(6,21,46,.45)}
.shot img{width:100%}
.shot figcaption{font-size:9px;color:var(--slate);padding:6px 10px;background:var(--ivory)}
.shot--wide img{height:300px;object-fit:cover;object-position:top}
.demo{margin-top:16px;background:var(--mid);border-radius:16px;padding:16px 20px;color:#fff}
.demo .kicker{color:var(--lagoon)}
.demo ol{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;counter-reset:d}
.demo li{counter-increment:d;font-size:10.5px;color:rgba(255,255,255,.85);padding-left:22px;position:relative;line-height:1.45}
.demo li::before{content:counter(d);position:absolute;left:0;top:0;width:16px;height:16px;border-radius:50%;background:var(--leaf);color:#06200F;font:700 9px Outfit;display:flex;align-items:center;justify-content:center}

/* Téléphone */
.phone{width:226px;height:462px;border-radius:36px;background:#0B1324;padding:8px;box-shadow:0 30px 50px -24px rgba(6,21,46,.6),inset 0 0 0 2px #2A3345}
.phone__screen{width:100%;height:100%;border-radius:29px;overflow:hidden;position:relative;background:var(--ivory)}
.phone__status{position:absolute;top:0;left:0;right:0;height:30px;display:flex;justify-content:space-between;align-items:center;padding:0 18px;font:600 9.5px Inter;color:var(--ink);z-index:3}
.phone__notch{width:70px;height:20px;border-radius:14px;background:#0B1324}
.m-app{position:absolute;inset:0;padding:38px 12px 12px;background:linear-gradient(180deg,#F6F4EF,#fff)}
.m-app__hi{font-size:10px;color:var(--slate);margin-bottom:9px}
.m-app__hi b{display:block;font:600 14px Outfit;color:var(--mid)}
.m-app__score{background:var(--mid);color:#fff;border-radius:16px;padding:11px 13px}
.m-app__score span{font-size:9px;color:rgba(255,255,255,.65)}
.m-app__score b{font:600 30px/1.1 Outfit;display:block}
.m-app__score small{font-size:12px;color:rgba(255,255,255,.6)}
.spark{width:100%;height:30px}
.m-app__row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}
.m-app__row div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 10px}
.m-app__row b{font:600 16px Outfit;color:var(--mid);display:block}
.m-app__row span{font-size:8.5px;color:var(--slate)}
.m-app__lbl{font:600 8.5px Inter;letter-spacing:.12em;text-transform:uppercase;color:var(--slate);margin:2px 0 6px}
.m-app__pics{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:8px}
.m-app__pics img{width:100%;height:50px;object-fit:cover;border-radius:8px}
.m-app__item{display:flex;align-items:center;gap:6px;font-size:9.5px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:6px 8px;margin-bottom:5px}

/* Tableau */
.tbl{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:10.5px}
.tbl th{background:var(--mid);color:#fff;text-align:left;font:600 10.5px Outfit;padding:9px 12px}
.tbl td{padding:9px 12px;border-top:1px solid var(--line);vertical-align:top;color:var(--slate);line-height:1.45}
.tbl td.b{color:var(--mid);font-weight:600;width:170px}
.tbl tr:nth-child(even) td{background:#FAFAF8}

/* Cycle */
.cycle{position:relative;display:flex;flex-direction:column;gap:9px}
.cycle::before{content:"";position:absolute;left:15px;top:14px;bottom:14px;width:2px;background:linear-gradient(180deg,#3EC8E8,#8FD14A)}
.cy{display:flex;gap:16px;position:relative}
.cy__n{flex:0 0 32px;height:32px;border-radius:50%;background:var(--mid);color:#fff;font:600 13px Outfit;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px #fff}
.cy__body{flex:1;background:var(--ivory);border-radius:14px;padding:10px 14px}
.cy h4{font:600 13px Outfit;color:var(--mid);margin-bottom:2px}
.cy h4 em{font-style:normal;font:600 9.5px Inter;background:#E7F5E2;color:var(--forest);padding:2px 8px;border-radius:999px;margin-left:6px}
.cy p{font-size:10.3px;color:var(--ink);line-height:1.45}
.cy__app{display:flex;gap:6px;align-items:flex-start;color:var(--slate)!important;margin-top:2px}
.cy__app svg{flex:0 0 auto;margin-top:2px}

/* Découverte */
.card--q .qgrp{font:600 9.5px Inter;letter-spacing:.14em;text-transform:uppercase;color:var(--azur);margin:12px 0 4px}
.card--q .qgrp:first-of-type{margin-top:4px}
.card--q .q{font:400 13px/1.4 'Instrument Serif';font-style:italic;color:var(--mid);margin-bottom:4px}

/* Objections */
.objs{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.obj{background:var(--ivory);border-radius:16px;padding:16px 18px;border-left:4px solid var(--azur)}
.obj h4{font:400 18px/1.2 'Instrument Serif';font-style:italic;color:var(--mid);margin-bottom:7px}
.obj p{font-size:10.5px;line-height:1.55;color:var(--ink)}
.obj__proof{display:flex;gap:6px;align-items:center;margin-top:8px;font:600 9.5px Inter!important;color:var(--forest)!important}

/* Scripts */
.scripts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.script{background:var(--ivory);border-radius:16px;padding:16px 18px}
.script h4{display:flex;gap:8px;align-items:center;font:600 13px Outfit;color:var(--mid);margin-bottom:9px}
.script p{font-size:10.5px;line-height:1.6;margin-bottom:7px;color:var(--ink)}
.script b{color:var(--azur)}

/* Offre */
.offer{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.of{background:var(--ivory);border-radius:12px;padding:11px 14px;border-left:3px solid var(--leaf)}
.of:last-child{grid-column:span 2}
.of b{font:600 12px Outfit;color:var(--mid);display:block;margin-bottom:2px}
.of p{font-size:10.3px;color:var(--slate);line-height:1.45}

/* Kit */
.gold{background:var(--mid);border-radius:18px;padding:20px 24px;margin-top:16px;color:#fff}
.gold ol{counter-reset:g;display:grid;gap:8px}
.gold li{counter-increment:g;font:500 14px Outfit;padding-left:34px;position:relative;line-height:1.4}
.gold li::before{content:counter(g);position:absolute;left:0;top:-1px;width:23px;height:23px;border-radius:50%;background:linear-gradient(135deg,#3EC8E8,#8FD14A);color:var(--mid);font:700 11px Outfit;display:flex;align-items:center;justify-content:center}
.contactbox{display:flex;gap:18px;align-items:center;margin-top:16px;border:1px solid var(--line);border-radius:16px;padding:16px 20px}
.contactbox img{height:52px}
.contactbox__l{display:flex;align-items:center;gap:5px;font:600 11.5px Inter;color:var(--mid);flex-wrap:wrap}

/* Sommaire */
.toc-wrap{display:grid;grid-template-columns:1fr 250px;gap:26px}
.toc li{display:flex;align-items:baseline;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)}
.toc__n{font:400 22px/1 'Instrument Serif';font-style:italic;color:var(--lagoon);width:30px}
.toc__t{font:600 14px Outfit;color:var(--mid)}
.toc i{flex:1}
.toc__p{font:600 12px Outfit;color:var(--slate)}
.toc-side{display:flex;flex-direction:column;gap:12px}
.toc-side .photo img{height:170px}

/* Couverture du guide */
.g-cover{padding:0;background:var(--mid);color:#fff}
.g-cover__bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:62% center}
.g-cover__shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,21,46,.55) 0%,rgba(6,21,46,.35) 35%,rgba(6,21,46,.94) 68%,#06152E 100%)}
.g-cover__top{position:absolute;left:52px;right:52px;top:48px;display:flex;justify-content:space-between;align-items:center}
.logo-card{background:#fff;border-radius:16px;padding:9px 15px;display:inline-block}
.logo-card img{height:46px}
.tag{font:600 10px Inter;letter-spacing:.14em;text-transform:uppercase;border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:7px 14px;background:rgba(6,21,46,.4)}
.g-cover__body{position:absolute;left:52px;right:52px;bottom:70px}
.g-cover h1{font:600 58px/1.02 Outfit;letter-spacing:-.035em;margin:10px 0 18px}
.g-cover h1 .serif{font-size:66px}
.g-cover__body>p{font-size:15px;line-height:1.6;color:rgba(255,255,255,.8);max-width:560px}
.g-cover__chips{display:flex;gap:10px;margin-top:26px}
.g-cover__chips span{display:flex;gap:7px;align-items:center;height:34px;padding:0 15px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);font:600 12px Outfit}

/* Flyer */
.fl{padding:0;background:#fff}
.fl-hero{position:relative;height:520px;color:#fff;overflow:hidden}
.fl-hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:65% center}
.fl-hero__shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,14,34,.95) 0%,rgba(4,14,34,.78) 48%,rgba(4,14,34,.15) 100%),linear-gradient(0deg,rgba(4,14,34,.75),transparent 40%)}
.fl-hero__top{position:absolute;left:44px;right:44px;top:36px;display:flex;justify-content:space-between;align-items:center}
.pill{display:flex;gap:6px;align-items:center;font:600 11px Inter;border:1px solid rgba(255,255,255,.35);background:rgba(6,21,46,.45);border-radius:999px;padding:7px 14px}
.fl-hero__body{position:absolute;left:44px;bottom:84px;width:470px}
.fl-hero h1{font:600 42px/1.04 Outfit;letter-spacing:-.03em;margin:8px 0 14px}
.fl-hero h1 .serif{font-size:48px}
.fl-hero__body>p{font-size:13px;line-height:1.55;color:rgba(255,255,255,.8)}
.fl-badges{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap}
.fl-badges span{display:flex;gap:6px;align-items:center;height:32px;padding:0 14px;border-radius:999px;background:linear-gradient(135deg,#A6E36A,#5FBF45);color:#06200F;font:600 11.5px Inter}
.fl-badges .ghost{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);color:#fff}
.fl-stats{position:relative;z-index:2;margin:-52px 44px 0;background:#fff;border-radius:20px;box-shadow:0 24px 40px -20px rgba(6,21,46,.45);display:grid;grid-template-columns:repeat(4,1fr);padding:18px 20px}
.fl-stats div{border-left:1px solid var(--line);padding-left:14px}
.fl-stats div:first-child{border-left:0;padding-left:0}
.fl-stats b{font:600 28px/1 Outfit;color:var(--mid);display:block}
.fl-stats span{font-size:10px;color:var(--slate);margin-top:4px;display:block}
.fl-why{padding:26px 44px 0}
.fl-why h2{font:600 24px Outfit;color:var(--mid);letter-spacing:-.02em;margin-bottom:14px}
.fl-why h2 .serif{font-size:28px;color:var(--azur)}
.fl-why__grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fw{display:flex;gap:12px;background:var(--ivory);border-radius:16px;padding:14px 16px}
.fw>span{flex:0 0 40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#0A3A72,#1570B8);display:flex;align-items:center;justify-content:center}
.fw h4{font:600 13.5px Outfit;color:var(--mid)}
.fw p{font-size:10.5px;color:var(--slate);line-height:1.45;margin-top:2px}
.fl-sect{display:flex;flex-wrap:wrap;gap:7px;padding:18px 44px 0}
.fl-sect span{display:flex;gap:6px;align-items:center;height:28px;padding:0 12px;border-radius:999px;border:1px solid var(--line);font:600 10.5px Inter;color:var(--mid)}
.fl-contact{position:absolute;left:0;right:0;bottom:0;height:118px;background:var(--mid);color:#fff;display:flex;justify-content:space-between;align-items:center;padding:0 44px}
.fl-contact p{font:500 12px Inter;color:rgba(255,255,255,.7);margin-bottom:4px}
.fl-contact b{display:flex;gap:10px;align-items:center;font:600 28px Outfit;letter-spacing:-.01em}
.fl-contact__r{display:flex;flex-direction:column;gap:6px;font-size:11.5px;color:rgba(255,255,255,.85)}
.fl-contact__r span{display:flex;gap:7px;align-items:center}
.fl-verso{padding:36px 44px 0}
.fl-v__head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px}
.fl-v__head h2{font:600 26px/1.1 Outfit;color:var(--mid);letter-spacing:-.02em}
.fl-v__head h2 .serif{font-size:30px;color:var(--azur)}
.fl-v__head img{height:44px}
.fl-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
.fl-tiles article{position:relative;height:160px;border-radius:14px;overflow:hidden}
.fl-tiles img{width:100%;height:100%;object-fit:cover}
.fl-tiles div{position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,21,46,.9),rgba(6,21,46,0) 70%);display:flex;flex-direction:column;justify-content:flex-end;padding:10px 11px;color:#fff}
.fl-tiles div span{width:24px;height:24px;border-radius:8px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;margin-bottom:5px}
.fl-tiles b{font:600 12px/1.2 Outfit}
.fl-how{margin-top:20px}
.fl-how h3{font:600 17px Outfit;color:var(--mid);margin-bottom:10px}
.fl-how__steps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.hs{background:var(--ivory);border-radius:14px;padding:13px 13px}
.hs span{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#3EC8E8,#8FD14A);color:var(--mid);font:700 11px Outfit;display:flex;align-items:center;justify-content:center;margin-bottom:7px}
.hs h4{font:600 12.5px Outfit;color:var(--mid)}
.hs p{font-size:10px;color:var(--slate);line-height:1.4;margin-top:2px}
.fl-proof{margin-top:18px;background:radial-gradient(500px 300px at 20% 30%,#123F7A,#06152E 70%);border-radius:22px;display:grid;grid-template-columns:200px 1fr;gap:24px;align-items:center;padding:0 28px;height:316px;overflow:hidden;color:#fff}
.fl-proof__phone{position:relative;height:100%}
.fl-proof__phone .phone{position:absolute;left:4px;top:30px;transform:scale(.8);transform-origin:top left}
.fl-proof h3{font:600 22px/1.12 Outfit;letter-spacing:-.02em;margin-bottom:12px}
.fl-proof h3 .serif{font-size:26px}
.fl-proof li{display:flex;gap:8px;align-items:center;font-size:11.5px;color:rgba(255,255,255,.85);margin-bottom:7px}
.fl-cta{display:grid;grid-template-columns:1.3fr 1fr;gap:20px;margin-top:20px;border:1px solid var(--line);border-radius:18px;padding:20px 22px;align-items:center}
.fl-cta h3{font:600 20px Outfit;color:var(--mid);margin-bottom:6px}
.fl-cta h3 .serif{color:var(--azur);font-size:24px}
.fl-cta__l p{font-size:11px;line-height:1.9;color:var(--ink)}
.fl-cta__l svg{vertical-align:-2px}
.fl-cta__r p{font:600 9.5px Inter;letter-spacing:.12em;text-transform:uppercase;color:var(--slate)}
.fl-cta__r i{display:block;height:22px;border-bottom:1.5px dashed #B8C1CC;margin-bottom:10px}
.fl-eng{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 44px 0;border-top:1px solid var(--line);padding-top:16px}
.fl-eng div{display:flex;gap:10px;align-items:center}
.fl-eng span{flex:0 0 36px;height:36px;border-radius:11px;background:#E7F5E2;display:flex;align-items:center;justify-content:center}
.fl-eng p{font-size:10px;color:var(--slate);line-height:1.35}
.fl-eng b{display:block;font:600 12.5px Outfit;color:var(--mid)}

/* Blocs ajoutés au guide */
.card--line{background:#fff;border:1px solid var(--line)}
.hooks{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hook{background:var(--ivory);border-radius:12px;padding:10px 14px}
.hook span{display:flex;gap:6px;align-items:center;font:600 11.5px Outfit;color:var(--mid);margin-bottom:3px}
.hook p{font:400 12.5px/1.35 'Instrument Serif';font-style:italic;color:var(--azur)}
.benef{border:1px solid var(--line);border-radius:14px;overflow:hidden}
.benef__h{display:grid;grid-template-columns:1fr 1fr;background:var(--mid);color:#fff;font:600 10.5px Outfit;padding:9px 14px}
.benef__r{display:grid;grid-template-columns:1fr 22px 1fr;align-items:center;padding:8px 14px;border-top:1px solid var(--line);font-size:10.5px}
.benef__r:nth-child(odd){background:#FAFAF8}
.benef__r span{color:var(--slate)}
.benef__r b{color:var(--forest);font-weight:600}
.flow{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.flow--4{grid-template-columns:repeat(4,1fr);margin-bottom:14px}
.flow__s{background:var(--mist);border-radius:14px;padding:12px;position:relative}
.flow__s span{width:22px;height:22px;border-radius:50%;background:var(--mid);color:#fff;font:700 10px Outfit;display:flex;align-items:center;justify-content:center;margin-bottom:6px}
.flow__s h4{font:600 12.5px Outfit;color:var(--mid)}
.flow__s p{font-size:9.8px;color:var(--slate);line-height:1.4;margin-top:2px}
.flow__s em{display:block;margin-top:6px;font:400 12px/1.3 'Instrument Serif';font-style:italic;color:var(--azur)}
.tips{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
.tip{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.tip svg{flex:0 0 auto;margin-top:2px}
.tip b{font:600 12px Outfit;color:var(--mid)}
.tip p{font-size:10px;color:var(--slate);line-height:1.45;margin-top:2px}
.signals{margin-top:16px;background:#E7F5E2;border-radius:16px;padding:14px 18px}
.signals .kicker{color:var(--forest)}
.signals__l{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px}
.signals__l span{display:flex;gap:7px;align-items:center;font-size:10.5px;color:var(--ink)}
.journey{margin-top:22px;background:var(--mid);border-radius:18px;padding:16px 20px}
.journey__l{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.journey__s{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;color:#fff}
.journey__s>i{position:absolute;left:-12px;top:11px}
.journey__s>span{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#1570B8,#3EC8E8);display:flex;align-items:center;justify-content:center;margin-bottom:6px}
.journey__s b{font:600 12px Outfit}
.journey__s small{font-size:9px;color:rgba(255,255,255,.6);line-height:1.3;margin-top:2px}
.quote{position:relative;margin-top:16px;border-radius:18px;overflow:hidden;height:150px}
.quote img{width:100%;height:100%;object-fit:cover}
.quote figcaption{position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,21,46,.92),rgba(6,21,46,.45));display:flex;flex-direction:column;justify-content:center;padding:0 28px;color:#fff}
.quote p{font-size:24px;line-height:1.2;max-width:520px}
.quote span{font:600 9.5px Inter;letter-spacing:.14em;text-transform:uppercase;color:var(--lagoon);margin-top:10px}
`;

const doc = (title, pages) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>${title}</title><style>${CSS}</style></head><body>${pages.join("\n")}</body></html>`;

(async () => {
  const targets = [
    { html: path.join(__dirname, "guide.html"), pdf: path.join(__dirname, "..", "Guide-commercial-NECS.pdf"), title: "Guide commercial NECS", pages: guidePages, png: "gc" },
    { html: path.join(__dirname, "flyer.html"), pdf: path.join(__dirname, "..", "Flyer-NECS.pdf"), title: "Flyer NECS", pages: flyerPages, png: "fl" },
  ];
  const browser = await chromium.launch();
  for (const t of targets) {
    fs.writeFileSync(t.html, doc(t.title, t.pages));
    const page = await browser.newPage({ viewport: { width: 793, height: 1122 } });
    await page.goto(pathToFileURL(t.html).href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      for (const fit of document.querySelectorAll(".page .fit")) {
        const pg = fit.closest(".page");
        const available = pg.clientHeight - fit.offsetTop - 62;
        const natural = fit.scrollHeight;
        let zoom = Math.floor(Math.min(1.25, Math.max(0.86, available / natural)) * 100) / 100;
        fit.style.zoom = String(zoom);
        const limit = pg.getBoundingClientRect().bottom - 62;
        const lastBottom = () => Math.max(...[...fit.querySelectorAll("*")].map((el) => el.getBoundingClientRect().bottom));
        while (zoom > 0.86 && lastBottom() > limit) {
          zoom = Math.round((zoom - 0.01) * 100) / 100;
          fit.style.zoom = String(zoom);
        }
      }
      return [...document.querySelectorAll(".page .fit")].map((f) => f.style.zoom).join(" ");
    }).then((z) => console.log(`zoom : ${z}`));
    if (process.argv.includes("--png")) {
      const n = await page.locator(".page").count();
      for (let i = 0; i < n; i++) {
        await page.locator(".page").nth(i).screenshot({ path: path.join(os.tmpdir(), `${t.png}-${String(i + 1).padStart(2, "0")}.png`) });
      }
    }
    await page.pdf({ path: t.pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
    await page.close();
    console.log(`${path.basename(t.pdf)} : ${t.pages.length} pages, ${Math.round(fs.statSync(t.pdf).size / 1024)} Ko`);
  }
  await browser.close();
})();
