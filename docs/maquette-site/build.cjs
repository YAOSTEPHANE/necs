/**
 * Maquette UI/UX du site public NECS → docs/Maquette-site-public-NECS.pdf
 * Usage (depuis web/) : node ../docs/maquette-site/build.cjs
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require(path.join(__dirname, "..", "..", "web", "node_modules", "@playwright/test"));

const OUT_HTML = path.join(__dirname, "maquette.html");
const OUT_PDF = path.join(__dirname, "..", "Maquette-site-public-NECS.pdf");
const IMG = (name) => `../../web/public/images/${name}`;
const DATE = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

/* ---------- Icônes (traits 24×24) ---------- */
const ICONS = {
  check: "M20 6 9 17l-5-5",
  arrow: "M5 12h14M13 5l7 7-7 7",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM8.5 12l2.5 2.5 4.5-5",
  spark: "M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z",
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
  menu: "M4 7h16M4 12h16M4 17h10",
  calendar: "M3 5h18v16H3zM16 3v4M8 3v4M3 10h18",
  file: "M14 2H6v20h12V8zM14 2v6h6M9 13h6M9 17h6",
  leaf: "M11 20A7 7 0 0 1 4 13c0-6 7-10 16-10 0 9-4 17-9 17zM4 21c3-6 7-9 12-11",
  chat: "M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z",
  play: "M7 4l13 8-13 8z",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  drop: "M12 2.7l5.7 5.6a8 8 0 1 1-11.4 0z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  zap: "M13 2 3 14h9l-1 8 10-12h-9z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  star: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z",
  hand: "M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-3a2 2 0 0 0-4 0",
};
const icon = (n, s = 20, c = "currentColor", w = 1.8) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[n]}"/></svg>`;
const star = (s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="#E8A33D"><path d="${ICONS.star}"/></svg>`;

const pin = (n, x, y) => `<span class="pin" style="left:${x}px;top:${y}px">${n}</span>`;
const browser = (url, inner, h) =>
  `<div class="browser"><div class="browser__bar"><i></i><i></i><i></i><span>${icon("lock", 11)} ${url}</span></div><div class="browser__view" style="height:${h}px">${inner}</div></div>`;
const phone = (inner, cls = "") =>
  `<div class="phone ${cls}"><div class="phone__screen"><div class="phone__status"><b>9:41</b><span class="phone__notch"></span><b>●●● ▮</b></div>${inner}</div></div>`;
const head = (num, kicker, title, lead = "") =>
  `<div class="deck-head"><div class="deck-meta"><span><img src="${IMG("logo-necs.png")}" alt=""/>Maquette site public</span><span>${num} / 13</span></div><p class="deck-kicker">${kicker}</p><h2 class="deck-title">${title}</h2>${lead ? `<p class="deck-lead">${lead}</p>` : ""}</div>`;
const notes = (items) =>
  `<ol class="notes">${items.map(([t, d], i) => `<li><span>${i + 1}</span><div><b>${t}</b><p>${d}</p></div></li>`).join("")}</ol>`;

/* ---------- Blocs du site ---------- */
const nav = (dark = true) => `
<nav class="s-nav ${dark ? "s-nav--dark" : ""}">
  <div class="s-logo"><img src="${IMG("logo-necs.png")}" alt="NECS"/></div>
  <ul><li class="on">Accueil</li><li>Services</li><li>Secteurs</li><li>Réalisations</li><li>Pourquoi NECS</li><li>Blog</li></ul>
  <div class="s-nav__right"><span class="s-nav__tel">${icon("phone", 15)} +237 641 33 55 53</span><span class="btn btn--leaf btn--sm">Devis gratuit ${icon("arrow", 15)}</span></div>
</nav>`;

const hero = () => `
<section class="s-hero">
  <img class="s-hero__bg" src="${IMG("necs-hero.jpg")}" alt=""/>
  <div class="s-hero__shade"></div>
  ${nav(true)}
  <div class="s-hero__body">
    <span class="s-pill"><i class="dot"></i>Douala · Yaoundé — réponse sous 24 h ouvrées</span>
    <h1>L’excellence du nettoyage,<br/><span class="serif grad">élevée au rang d’art.</span></h1>
    <p>Entreprises, industries, commerces et établissements de santé : des équipes formées, un encadrement de proximité et un suivi digital qui rend chaque prestation <b>mesurable</b>.</p>
    <div class="s-hero__cta"><span class="btn btn--leaf">Obtenir mon devis en 2 min ${icon("arrow", 18)}</span><span class="btn btn--glass">${icon("play", 14)} Voir NECS en action</span></div>
    <div class="s-hero__trust"><div class="avatars"><i style="background-image:url(${IMG("necs-blog-2.jpg")})"></i><i style="background-image:url(${IMG("necs-about.jpg")})"></i><i style="background-image:url(${IMG("necs-hero.jpg")})"></i></div><span><b>120+ sites</b> accompagnés au Cameroun</span></div>
  </div>
  <div class="s-float s-float--qc">
    <div class="s-float__head">${icon("shield", 16, "#1F6B3A")}<span>Contrôle qualité</span><em>Aujourd’hui 10:42</em></div>
    <div class="s-score"><b>92</b><span>/100</span><i>Conforme</i></div>
    <div class="s-bars"><p>Sols <span style="--w:96%"></span></p><p>Sanitaires <span style="--w:90%"></span></p><p>Vitrerie <span style="--w:88%"></span></p></div>
  </div>
  <div class="s-float s-float--team"><span class="s-ava" style="background-image:url(${IMG("necs-blog-2.jpg")})"></span><div><b>Équipe arrivée sur site</b><p>${icon("pin", 12)} Siège Akwa · pointage 07:58</p></div><i class="ok">${icon("check", 14, "#fff", 2.6)}</i></div>
  <div class="s-float s-float--photo"><div class="ba"><img src="${IMG("necs-realisations.jpg")}" alt=""/><span>Après</span></div><div><b>Preuve photo validée</b><p>Hall d’accueil · 17:31</p></div></div>
  <div class="s-hero__stats">
    <div><b>120+</b><span>Sites accompagnés</span></div><div><b>98 %</b><span>Taux de réalisation</span></div><div><b>85+</b><span>Score qualité moyen</span></div><div><b>24 h</b><span>Remplacement des absences</span></div>
  </div>
</section>`;

const sectors = [
  ["Entretien de bureaux", "Sols, postes, sanitaires et vitrerie : un siège à votre image.", "building", "necs-activite-bureaux.jpg"],
  ["Nettoyage industriel", "Entrepôts et zones techniques, consignes sécurité renforcées.", "factory", "necs-activite-industrie.jpg"],
  ["Commerces & malls", "Propreté continue et expérience visiteur premium.", "store", "necs-activite-commerce.jpg"],
  ["Santé", "Protocoles d’hygiène renforcés et traçabilité.", "pulse"],
  ["Hôtels & résidences", "Chambres, parties communes, back-office.", "bed"],
  ["Écoles", "Entretien hors temps scolaire.", "school"],
  ["Particuliers", "Équipes discrètes et formées.", "home"],
];

/* ---------- Pages ---------- */
const pages = [];

// 1 — Couverture
pages.push(`
<section class="page cover">
  <img class="cover__bg" src="${IMG("necs-realisations.jpg")}" alt=""/>
  <div class="cover__shade"></div>
  <div class="cover__left">
    <div class="cover__logo"><img src="${IMG("logo-necs.png")}" alt="NECS"/></div>
    <p class="cover__kicker">Maquette UI / UX · Site public</p>
    <h1>Le site NECS,<br/><span class="serif grad">réinventé.</span></h1>
    <p class="cover__lead">Une expérience web ultra-premium pensée pour convertir : direction artistique, design system, pages clés desktop et mobile, parcours utilisateur.</p>
    <div class="cover__meta"><span>${icon("calendar", 15)} ${DATE}</span><span>${icon("globe", 15)} servicesnecs.vercel.app</span><span>${icon("file", 15)} 13 planches</span></div>
  </div>
  <div class="cover__shot">${browser("servicesnecs.vercel.app", `<div class="scale" style="--k:.56">${hero()}</div>`, 412)}</div>
  <div class="cover__phone">${phone(`<div class="m-hero"><img src="${IMG("necs-hero.jpg")}" alt=""/><div class="m-hero__shade"></div><div class="m-top"><img src="${IMG("logo-necs.png")}" alt=""/><i>${icon("menu", 18, "#fff")}</i></div><div class="m-hero__body"><h3>L’excellence du nettoyage, <span class="serif grad">élevée au rang d’art.</span></h3><span class="btn btn--leaf btn--sm">Devis en 2 min ${icon("arrow", 13)}</span></div></div>`)}</div>
</section>`);

// 2 — Vision
pages.push(`
<section class="page">
  ${head("02", "Intention", "Un site qui inspire confiance <span class=\"serif\">au premier regard</span>, et transforme la visite en demande de devis.", "Le nettoyage professionnel se choisit sur la confiance. La maquette met en scène ce que NECS fait déjà mieux que les autres : la rigueur prouvée par le digital.")}
  <div class="principles">
    ${[
      ["01", "Clarté immédiate", "En 5 secondes, le visiteur sait qui est NECS, où elle intervient et comment obtenir un devis. Une seule action principale par écran.", "eye"],
      ["02", "Preuve, pas promesse", "Pointage géolocalisé, photos avant / après, scores qualité : les fonctions de l’application deviennent l’argument commercial.", "shield"],
      ["03", "Conversion sans friction", "Devis express en 4 étapes, WhatsApp et appel en un geste, créneau de visite technique réservable en ligne.", "zap"],
      ["04", "Premium et local", "Codes visuels haut de gamme (sérif éditoriale, verre, photos lumineuses) ancrés dans Douala, Yaoundé et le français du Cameroun.", "spark"],
    ].map(([n, t, d, i]) => `<article class="principle"><div class="principle__top"><span>${n}</span>${icon(i, 26, "#1570B8")}</div><h3>${t}</h3><p>${d}</p></article>`).join("")}
  </div>
  <div class="kpis">
    <div class="kpis__title"><p class="deck-kicker">Objectifs visés après mise en ligne</p><p class="kpis__note">Cibles de conception, à mesurer après lancement.</p></div>
    ${[["× 2", "demandes de devis par visite"], ["< 2 min", "pour envoyer une demande"], ["< 2,0 s", "affichage du contenu principal (LCP) sur 4G"], ["AA", "niveau d’accessibilité WCAG 2.2"], ["Top 3", "Google sur « nettoyage Douala / Yaoundé »"]].map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("")}
  </div>
</section>`);

// 3 — Design system
pages.push(`
<section class="page">
  ${head("03", "Design system", "Une identité <span class=\"serif\">raffinée</span>, fidèle au logo NECS.")}
  <div class="ds">
    <div class="ds-card ds-colors">
      <h4>Couleurs</h4>
      <div class="swatches">
        ${[["Minuit", "#06152E", 1], ["Marine NECS", "#0A3A72", 1], ["Azur", "#1570B8", 1], ["Lagon", "#3EC8E8", 0], ["Feuille", "#8FD14A", 0], ["Forêt", "#1F6B3A", 1], ["Ambre", "#E8A33D", 0], ["Ivoire", "#F6F4EF", 0]].map(([n, h, d]) => `<div class="sw"><i style="background:${h}"></i><b>${n}</b><span>${h}</span></div>`).join("")}
      </div>
      <p class="ds-note">Minuit et Marine portent le sérieux, Feuille et Ambre (issus du logo) signalent l’action et la qualité, l’Ivoire remplace le blanc pur pour une sensation haut de gamme.</p>
    </div>
    <div class="ds-card ds-type">
      <h4>Typographie</h4>
      <div class="type-row"><span class="type-tag">Titres</span><p class="t-disp">Outfit — Propreté, rigueur</p></div>
      <div class="type-row"><span class="type-tag">Accent</span><p class="t-serif serif">Instrument Serif — confiance.</p></div>
      <div class="type-row"><span class="type-tag">Texte</span><p class="t-body">Inter — lisible sur tous les écrans, du 320 px au 4K. Corps 17 px, interligne 1,6.</p></div>
      <div class="scale-row">${[["H1", "64"], ["H2", "44"], ["H3", "24"], ["Texte", "17"], ["Légende", "13"]].map(([a, b]) => `<span><b>${a}</b>${b} px</span>`).join("")}</div>
    </div>
    <div class="ds-card ds-comp">
      <h4>Composants</h4>
      <div class="comp-row"><span class="btn btn--leaf">Demander un devis ${icon("arrow", 16)}</span><span class="btn btn--navy">Nos services</span><span class="btn btn--line">${icon("chat", 16)} WhatsApp</span></div>
      <div class="comp-row"><span class="chip on">${icon("check", 13, "#fff", 2.4)} Quotidien</span><span class="chip">Hebdomadaire</span><span class="chip">Ponctuel</span><span class="badge">${icon("shield", 13)} Conforme</span><span class="badge badge--amber">${star(12)} Premium</span></div>
      <div class="comp-row"><label class="field"><span>Surface à entretenir</span><b>850 m²</b><i class="slider"><em style="width:46%"></em></i></label><label class="field"><span>Ville</span><b>Douala ▾</b></label></div>
      <div class="comp-row icons">${["building", "factory", "store", "pulse", "bed", "school", "home", "shield", "camera", "pin", "chart", "leaf"].map((n) => `<i>${icon(n, 20, "#0A3A72")}</i>`).join("")}</div>
    </div>
    <div class="ds-card ds-tokens">
      <h4>Formes & profondeur</h4>
      <div class="tokens">
        <div class="tok"><i style="border-radius:8px"></i><span>Rayon 8</span></div>
        <div class="tok"><i style="border-radius:16px"></i><span>Rayon 16</span></div>
        <div class="tok"><i style="border-radius:28px"></i><span>Rayon 28</span></div>
        <div class="tok"><i class="sh1"></i><span>Ombre douce</span></div>
        <div class="tok"><i class="sh2"></i><span>Ombre flottante</span></div>
        <div class="tok"><i class="glass"></i><span>Verre</span></div>
      </div>
      <p class="ds-note">Grille 12 colonnes, marges 56 px (desktop) / 20 px (mobile), espacements multiples de 8.</p>
    </div>
  </div>
</section>`);

// 4 — Hero
pages.push(`
<section class="page">
  ${head("04", "Accueil · Première impression", "Un hero immersif qui <span class=\"serif\">prouve</span> avant de promettre.")}
  <div class="board">
    <div class="board__shot">${browser("servicesnecs.vercel.app", hero(), 742)}${pin(1, -15, 60)}${pin(2, -15, 258)}${pin(3, -15, 574)}${pin(4, 1135, 196)}${pin(5, -15, 694)}</div>
    ${notes([
      ["Navigation claire et sticky", "6 entrées maximum, téléphone visible, bouton « Devis gratuit » toujours accessible. Devient blanche et compacte au défilement."],
      ["Promesse + accent sérif", "Le titre reprend la signature NECS. L’accent en italique sérif crée l’effet éditorial premium."],
      ["Deux actions, une priorité", "« Obtenir mon devis en 2 min » ouvre le devis express ; « Voir NECS en action » lance une vidéo de 40 s."],
      ["Preuves vivantes", "Cartes flottantes animées : score qualité, pointage géolocalisé, photo validée. Ce sont les vraies fonctions de l’application NECS."],
      ["Chiffres clés", "Compteurs animés à l’apparition. Arrière-plan : vidéo légère (moins de 2 Mo) avec image de repli."],
    ])}
  </div>
</section>`);

// 5 — Expertises (bento)
pages.push(`
<section class="page">
  ${head("05", "Accueil · Expertises", "Les secteurs en <span class=\"serif\">bento</span> : on trouve son cas en un coup d’œil.")}
  <div class="board">
    <div class="board__shot">${browser("servicesnecs.vercel.app/#expertises", `
      <section class="s-sec s-ivory">
        <div class="s-head"><div><p class="s-kicker">Expertises</p><h2>Des protocoles sur mesure,<br/><span class="serif">pour chaque environnement.</span></h2></div><p class="s-head__lead">Du tertiaire à la santé, des hôtels aux écoles : les bons effectifs, le bon niveau de service, les bons produits.</p></div>
        <div class="bento">
          ${sectors.slice(0, 3).map(([t, d, i, img], k) => `<article class="bento__img b${k}"><img src="${IMG(img)}" alt=""/><div class="bento__shade"></div><div class="bento__txt"><span class="bento__ic">${icon(i, 18, "#fff")}</span><h3>${t}</h3><p>${d}</p><span class="bento__go">${icon("arrow", 16, "#06152E")}</span></div></article>`).join("")}
          ${sectors.slice(3, 6).map(([t, d, i]) => `<article class="bento__card"><span class="bento__ic2">${icon(i, 20, "#1570B8")}</span><h3>${t}</h3><p>${d}</p><span class="bento__more">Découvrir ${icon("arrow", 13)}</span></article>`).join("")}
        </div>
        <div class="logos"><span>Ils nous confient leurs espaces</span><b>Groupe Horizon</b><b>LogiTrans</b><b>Société Exemple SA</b><b>Clinique du Littoral</b><b>Hôtel Akwa</b></div>
      </section>`, 742)}${pin(1, -15, 110)}${pin(2, -15, 415)}${pin(3, 1135, 524)}${pin(4, -15, 680)}</div>
    ${notes([
      ["Titre en deux temps", "Énoncé fort en sans-serif, suite en italique sérif : la signature de la maquette."],
      ["Grandes cartes photo", "Les 3 secteurs qui rapportent le plus sont mis en avant. Au survol : zoom lent de la photo, flèche qui glisse."],
      ["Cartes secondaires", "Icône, promesse en une ligne, lien « Découvrir ». Chaque carte ouvre une page secteur optimisée pour le référencement."],
      ["Bande de confiance", "Logos clients en niveaux de gris, défilement continu. Noms ici illustratifs, à remplacer par de vrais clients avec leur accord."],
    ])}
  </div>
</section>`);

// 6 — NECS Live
pages.push(`
<section class="page">
  ${head("06", "Accueil · Le différenciateur", "« NECS Live » : la transparence <span class=\"serif\">en temps réel</span>.")}
  <div class="board">
    <div class="board__shot">${browser("servicesnecs.vercel.app/#necs-live", `
      <section class="s-live">
        <div class="s-live__glow"></div>
        <div class="s-live__txt">
          <p class="s-kicker s-kicker--light">NECS Live</p>
          <h2>Vous ne le voyez pas faire.<br/><span class="serif grad">Vous le voyez fait.</span></h2>
          <p>Chaque intervention laisse une trace vérifiable, consultable depuis votre portail client.</p>
          <ul>${[["pin", "Pointage géolocalisé", "Arrivée et départ des équipes, à la minute près."], ["camera", "Photos avant / après", "Horodatées, prises sur site, archivées."], ["shield", "Contrôles qualité notés", "Critères, score, actions correctives."], ["file", "Rapports et factures en ligne", "Rapport mensuel, devis, contrats, factures."]].map(([i, t, d]) => `<li><span>${icon(i, 18, "#3EC8E8")}</span><div><b>${t}</b><p>${d}</p></div></li>`).join("")}</ul>
        </div>
        <div class="s-live__phone">${phone(`<div class="m-app"><p class="m-app__hi">Bonjour, <b>Groupe Horizon</b></p><div class="m-app__score"><span>Score qualité · septembre</span><b>94<small>/100</small></b><svg viewBox="0 0 200 50" class="spark"><path d="M0 40 L25 34 L50 36 L75 26 L100 28 L125 18 L150 20 L175 10 L200 12" fill="none" stroke="#8FD14A" stroke-width="3"/></svg></div><div class="m-app__row"><div><b>12/12</b><span>agents présents</span></div><div><b>0</b><span>non-conformité</span></div></div><p class="m-app__lbl">Dernières preuves</p><div class="m-app__pics"><img src="${IMG("necs-realisations.jpg")}" alt=""/><img src="${IMG("necs-identity-nettoyage.png")}" alt=""/><img src="${IMG("necs-activite-bureaux.jpg")}" alt=""/></div><div class="m-app__item">${icon("check", 14, "#1F6B3A", 2.6)} Hall d’accueil · 17:31</div><div class="m-app__item">${icon("check", 14, "#1F6B3A", 2.6)} Sanitaires R+2 · 16:05</div></div>`)}</div>
        <div class="s-live__dash">
          <div class="dash-card"><div class="dash-card__h">${icon("chart", 16, "#3EC8E8")} Évolution du score qualité</div><svg viewBox="0 0 300 110" class="chart"><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3EC8E8" stop-opacity=".45"/><stop offset="1" stop-color="#3EC8E8" stop-opacity="0"/></linearGradient></defs><path d="M0 80 L37 74 L75 76 L112 60 L150 62 L187 44 L225 46 L262 30 L300 24 L300 110 L0 110Z" fill="url(#g1)"/><path d="M0 80 L37 74 L75 76 L112 60 L150 62 L187 44 L225 46 L262 30 L300 24" fill="none" stroke="#3EC8E8" stroke-width="3"/></svg><div class="dash-card__x"><span>Avr</span><span>Mai</span><span>Juin</span><span>Juil</span><span>Août</span><span>Sept</span></div></div>
          <div class="dash-mini"><div><b>98 %</b><span>prestations réalisées</span></div><div><b>24 h</b><span>remplacement absences</span></div></div>
        </div>
        <div class="steps">${["Devis express", "Visite technique", "Contrat & planning", "Exécution suivie", "Reporting mensuel"].map((s, i) => `<div class="step"><span>${i + 1}</span><b>${s}</b></div>`).join(`<i class="step__line"></i>`)}</div>
      </section>`, 742)}${pin(1, -15, 136)}${pin(2, -15, 300)}${pin(3, 522, 52)}${pin(4, 1135, 110)}${pin(5, -15, 697)}</div>
    ${notes([
      ["Section sombre « signature »", "Rupture visuelle au milieu de la page : c’est l’argument que les concurrents n’ont pas."],
      ["Quatre preuves concrètes", "Chaque ligne correspond à une fonction réelle de l’application NECS (pointage, photos, qualité, documents)."],
      ["Aperçu du portail client", "Téléphone animé : le score monte, les photos défilent. Données d’exemple."],
      ["Tableau de bord", "Courbe qui se dessine au défilement, chiffres repris du site actuel."],
      ["Méthode en 5 étapes", "Rassure sur le déroulé, du devis au reporting. Chaque étape est cliquable."],
    ])}
  </div>
</section>`);

// 7 — Témoignages, CTA, footer
pages.push(`
<section class="page">
  ${head("07", "Accueil · Réassurance & contact", "Les clients parlent, puis on passe <span class=\"serif\">à l’action</span>.")}
  <div class="board">
    <div class="board__shot">${browser("servicesnecs.vercel.app/#temoignages", `
      <section class="s-sec s-white s-sec--tight">
        <div class="s-head"><div><p class="s-kicker">Ils nous font confiance</p><h2>La rigueur, <span class="serif">racontée par nos clients.</span></h2></div><div class="s-arrows"><i>${icon("arrow", 16)}</i><i class="on">${icon("arrow", 16, "#fff")}</i></div></div>
        <div class="quotes">
          <figure class="quote quote--big"><img src="${IMG("necs-about.jpg")}" alt=""/><div><p class="quote__mark serif">“</p><blockquote>Depuis le démarrage avec NECS, nos locaux sont impeccables et le reporting qualité nous donne une vraie visibilité.</blockquote><figcaption><b>Jean Okala</b><span>DAF · Société Exemple SA</span></figcaption><div class="stars">${star()}${star()}${star()}${star()}${star()}</div></div></figure>
          <figure class="quote"><p class="quote__mark serif">“</p><blockquote>Ponctualité, réactivité sur les absences, et une équipe vraiment professionnelle.</blockquote><figcaption><b>Amina Moussa</b><span>Responsable Achats · Groupe Horizon</span></figcaption></figure>
          <figure class="quote"><p class="quote__mark serif">“</p><blockquote>Le passage au digital a simplifié devis, validations et factures. Un partenaire, pas un prestataire.</blockquote><figcaption><b>Paul Kouam</b><span>Directeur Ops · LogiTrans</span></figcaption></figure>
        </div>
      </section>
      <section class="s-cta"><div class="s-cta__txt"><h2>Votre site mérite <span class="serif">le standard NECS.</span></h2><p>Visite technique gratuite, devis détaillé sous 24 h ouvrées, sans engagement.</p></div><div class="s-cta__btns"><span class="btn btn--leaf">Demander mon devis ${icon("arrow", 17)}</span><span class="btn btn--glass">${icon("chat", 16)} WhatsApp</span></div></section>
      <footer class="s-foot">
        <div class="s-foot__brand"><div class="s-logo s-logo--sm"><img src="${IMG("logo-necs.png")}" alt=""/></div><p>Propreté, Rigueur, Confiance : le partenaire premium du nettoyage professionnel au Cameroun.</p></div>
        <div><h5>Services</h5><p>Bureaux</p><p>Industrie</p><p>Commerces</p><p>Santé</p></div>
        <div><h5>NECS</h5><p>À propos</p><p>Réalisations</p><p>Blog</p><p>Espace client</p></div>
        <div><h5>Contact</h5><p>${icon("phone", 13)} +237 641 33 55 53</p><p>${icon("mail", 13)} contact@necs-cm.com</p><p>${icon("pin", 13)} Yaoundé, Douala</p><p>${icon("clock", 13)} Lun – Ven · 8h – 17h30</p></div>
      </footer>`, 742)}${pin(1, -15, 290)}${pin(2, 1135, 115)}${pin(3, -15, 520)}${pin(4, 1135, 520)}${pin(5, -15, 660)}</div>
    ${notes([
      ["Témoignage vedette", "Photo, citation en grand, note et fonction : la preuve sociale la plus lisible."],
      ["Carrousel discret", "Flèches et glissement au doigt sur mobile, défilement automatique désactivé (accessibilité)."],
      ["Bandeau d’appel à l’action", "Dégradé Marine → Azur, promesse concrète : visite gratuite, réponse sous 24 h, sans engagement."],
      ["WhatsApp en un geste", "Canal préféré au Cameroun : message pré-rempli avec la page d’origine."],
      ["Pied de page utile", "Coordonnées complètes, horaires, accès à l’espace client et au référencement local."],
    ])}
  </div>
</section>`);

// 8 — Page service
pages.push(`
<section class="page">
  ${head("08", "Page service · Entretien de bureaux", "Une page par service, construite pour <span class=\"serif\">rassurer et convertir</span>.")}
  <div class="board">
    <div class="board__shot">${browser("servicesnecs.vercel.app/services/bureaux", `
      ${nav(false)}
      <section class="sv-hero">
        <div class="sv-hero__txt">
          <p class="crumb">Accueil / Services / <b>Entretien de bureaux</b></p>
          <h1>Des bureaux impeccables,<br/><span class="serif">chaque matin.</span></h1>
          <p>Sols, postes de travail, sanitaires, cuisines et vitrerie intérieure, avant l’arrivée de vos équipes ou en soirée.</p>
          <div class="sv-hero__cta"><span class="btn btn--leaf">Devis bureaux ${icon("arrow", 16)}</span><span class="btn btn--line">${icon("calendar", 16)} Réserver une visite</span></div>
          <div class="sv-facts"><span>${icon("clock", 15, "#1570B8")} Tôt le matin ou le soir</span><span>${icon("users", 15, "#1570B8")} Équipe dédiée</span><span>${icon("leaf", 15, "#1570B8")} Produits adaptés</span></div>
        </div>
        <div class="sv-hero__img"><img src="${IMG("necs-activite-bureaux.jpg")}" alt=""/><div class="sv-badge">${icon("shield", 18, "#1F6B3A")}<div><b>Contrôle qualité mensuel</b><span>inclus dans chaque contrat</span></div></div></div>
      </section>
      <section class="sv-inc"><h3>Ce qui est inclus</h3><div class="sv-inc__grid">${["Dépoussiérage des postes et surfaces", "Aspiration et lavage des sols", "Sanitaires désinfectés et réapprovisionnés", "Cuisines et espaces de pause", "Vitrerie intérieure et cloisons", "Vidage des corbeilles et tri"].map((t) => `<p>${icon("check", 15, "#1F6B3A", 2.6)} ${t}</p>`).join("")}</div></section>
      <section class="sv-plans">
        ${[["Standard", "Pour les espaces de bureaux courants", ["Passage planifié", "Checklist par zone", "Rapport mensuel"], ""], ["Premium", "Pour les sièges et lieux d’accueil", ["Tout Standard", "Superviseur dédié", "Photos avant / après", "Remplacement sous 24 h"], "on"], ["Critique", "Pour les zones sensibles", ["Tout Premium", "Protocoles renforcés", "Astreinte et traçabilité"], ""]].map(([n, d, f, on]) => `<article class="plan ${on}">${on ? `<span class="plan__tag">Le plus choisi</span>` : ""}<h4>${n}</h4><p>${d}</p><ul>${f.map((x) => `<li>${icon("check", 13, on ? "#8FD14A" : "#1570B8", 2.6)} ${x}</li>`).join("")}</ul><span class="plan__price">Sur devis</span></article>`).join("")}
      </section>`, 742)}${pin(1, -15, 163)}${pin(2, -15, 410)}${pin(3, 1135, 391)}${pin(4, -15, 532)}${pin(5, -15, 657)}</div>
    ${notes([
      ["Fil d’Ariane et titre précis", "Bon pour le référencement (« entretien de bureaux Douala ») et pour s’orienter."],
      ["Double action", "Devis direct, ou réservation d’un créneau de visite technique (calendrier déjà présent dans l’application)."],
      ["Badge de réassurance", "Le contrôle qualité inclus est rappelé sur la photo, là où le regard se pose."],
      ["Inclusions explicites", "6 lignes cochées : le visiteur sait exactement ce qu’il achète."],
      ["Niveaux de service", "Standard, Premium, Critique : les niveaux déjà utilisés dans les contrats NECS. Tarif « Sur devis » : pas de prix affiché."],
    ])}
  </div>
</section>`);

// 9 — Devis express
pages.push(`
<section class="page">
  ${head("09", "Devis express · Étape 3 sur 4", "Un formulaire qui ressemble à <span class=\"serif\">une conversation</span>.")}
  <div class="board">
    <div class="board__shot">${browser("servicesnecs.vercel.app/devis", `
      <section class="qz">
        <aside class="qz-steps">
          <div class="s-logo s-logo--sm"><img src="${IMG("logo-necs.png")}" alt=""/></div>
          ${[["Votre besoin", "Entretien de bureaux", "done"], ["Votre site", "Douala · Akwa · 850 m²", "done"], ["Fréquence & horaires", "En cours", "on"], ["Vos coordonnées", "1 minute", ""]].map(([t, s, c], i) => `<div class="qz-step ${c}"><span>${c === "done" ? icon("check", 14, "#fff", 2.8) : i + 1}</span><div><b>${t}</b><p>${s}</p></div></div>`).join("")}
          <div class="qz-help">${icon("chat", 16, "#1570B8")}<div><b>Besoin d’aide ?</b><p>Un conseiller sur WhatsApp</p></div></div>
        </aside>
        <div class="qz-main">
          <div class="qz-prog"><i style="width:68%"></i></div><p class="qz-count">Étape 3 sur 4</p>
          <h2>À quelle fréquence souhaitez-vous <span class="serif">notre passage ?</span></h2>
          <div class="qz-opts">${[["Quotidien", "du lundi au vendredi", "on"], ["Plusieurs fois / semaine", "2 à 3 passages", ""], ["Hebdomadaire", "1 passage", ""], ["Ponctuel", "remise en état, événement", ""]].map(([t, s, c]) => `<div class="qz-opt ${c}"><i>${c ? icon("check", 14, "#fff", 2.8) : ""}</i><b>${t}</b><span>${s}</span></div>`).join("")}</div>
          <p class="qz-lbl">Créneau d’intervention</p>
          <div class="qz-chips"><span class="chip on">Tôt le matin · 5h – 8h</span><span class="chip">En journée</span><span class="chip">En soirée · 18h – 21h</span></div>
          <p class="qz-lbl">Options</p>
          <div class="qz-toggles">${[["Vitrerie extérieure", 1], ["Désinfection renforcée", 0], ["Fourniture des consommables", 1]].map(([t, on]) => `<div class="tg ${on ? "on" : ""}"><i></i>${t}</div>`).join("")}</div>
          <div class="qz-nav"><span class="btn btn--line">Retour</span><span class="btn btn--navy">Continuer ${icon("arrow", 16, "#fff")}</span></div>
        </div>
        <aside class="qz-sum">
          <h4>Votre demande</h4>
          <dl><dt>Service</dt><dd>Entretien de bureaux</dd><dt>Site</dt><dd>Douala · Akwa</dd><dt>Surface</dt><dd>850 m²</dd><dt>Fréquence</dt><dd>Quotidien · tôt le matin</dd><dt>Options</dt><dd>Vitrerie ext., consommables</dd></dl>
          <div class="qz-visit"><p>${icon("calendar", 15, "#1570B8")} Visite technique gratuite</p><div class="qz-slots"><span>Mar 6<br/><b>09:00</b></span><span class="on">Mer 7<br/><b>10:30</b></span><span>Jeu 8<br/><b>14:00</b></span></div></div>
          <div class="qz-guar">${icon("clock", 16, "#1F6B3A")}<span>Réponse garantie sous <b>24 h ouvrées</b></span></div>
          <p class="qz-safe">${icon("lock", 12)} Sans engagement · données protégées</p>
        </aside>
      </section>`, 742)}${pin(1, -15, 150)}${pin(2, 815, 52)}${pin(3, 266, 222)}${pin(4, 266, 505)}${pin(5, 1135, 352)}</div>
    ${notes([
      ["Progression visible", "4 étapes nommées, les réponses déjà données restent lisibles et modifiables."],
      ["Barre et compteur", "Le visiteur sait combien il reste : moins d’abandons."],
      ["Choix en grandes cartes", "Une question par écran, réponses en un clic, pas de saisie au clavier avant la dernière étape."],
      ["Options en interrupteurs", "Ajout de services sans complexité ; le récapitulatif se met à jour en direct."],
      ["Récapitulatif et créneau", "Réservation immédiate de la visite technique, engagement de délai, mention de confidentialité."],
    ])}
  </div>
</section>`);

// 10 — Réalisations
pages.push(`
<section class="page">
  ${head("10", "Réalisations · Avant / après", "La preuve par l’image, <span class=\"serif\">au glissé du curseur</span>.")}
  <div class="board">
    <div class="board__shot">${browser("servicesnecs.vercel.app/realisations", `
      ${nav(false)}
      <section class="rz">
        <div class="rz-head"><div><p class="s-kicker">Réalisations</p><h2>Des résultats qui se voient… <span class="serif">et se mesurent.</span></h2></div><div class="rz-filters"><span class="chip on">Tous</span><span class="chip">Bureaux</span><span class="chip">Industrie</span><span class="chip">Commerces</span><span class="chip">Santé</span></div></div>
        <div class="rz-grid">
          <div class="rz-ba"><img class="rz-ba__img" src="${IMG("necs-realisations.jpg")}" alt=""/><div class="rz-ba__before"><img src="${IMG("necs-realisations.jpg")}" alt=""/></div><span class="rz-ba__l">Avant</span><span class="rz-ba__r">Après</span><i class="rz-ba__handle"><b>${icon("arrow", 14, "#06152E", 2.4)}</b></i></div>
          <div class="rz-case">
            <span class="badge">${icon("building", 13)} Siège social · Douala</span>
            <h3>Remise en état et entretien quotidien d’un hall de 1 200 m²</h3>
            <p>Marbre ternis, traces de chantier, flux de 600 visiteurs par jour. Remise en état en 3 nuits, puis entretien quotidien avant 7 h.</p>
            <div class="rz-kpi"><div><b>3</b><span>nuits de remise en état</span></div><div><b>96</b><span>score qualité moyen</span></div><div><b>0</b><span>réclamation en 6 mois</span></div></div>
            <span class="btn btn--navy btn--sm">Lire l’étude de cas ${icon("arrow", 14, "#fff")}</span>
          </div>
        </div>
        <div class="rz-cards">${[["necs-activite-commerce.jpg", "Commerces", "Centre commercial · Yaoundé"], ["necs-activite-industrie.jpg", "Industrie", "Entrepôt logistique · Douala"], ["necs-identity-nettoyage.png", "Bureaux", "Plateau tertiaire · Bonapriso"]].map(([img, t, d]) => `<article><img src="${IMG(img)}" alt=""/><div><span>${t}</span><b>${d}</b></div></article>`).join("")}</div>
      </section>`, 742)}${pin(1, 1135, 237)}${pin(2, -15, 420)}${pin(3, 1135, 368)}${pin(4, -15, 630)}</div>
    ${notes([
      ["Filtres par secteur", "Le visiteur ne voit que les cas qui lui ressemblent."],
      ["Curseur avant / après", "Glisser pour comparer : l’interaction la plus mémorable du site. Photos réelles à fournir par les équipes."],
      ["Étude de cas chiffrée", "Contexte, intervention, résultats en 3 chiffres. Exemple illustratif à remplacer par un cas réel."],
      ["Galerie", "Cartes avec secteur et lieu ; chaque carte ouvre son étude de cas."],
    ])}
  </div>
</section>`);

// 11 — Mobile
const mHero = `<div class="m-hero"><img src="${IMG("necs-hero.jpg")}" alt=""/><div class="m-hero__shade"></div><div class="m-top"><img src="${IMG("logo-necs.png")}" alt=""/><i>${icon("menu", 18, "#fff")}</i></div><div class="m-hero__body"><span class="s-pill s-pill--sm"><i class="dot"></i>Réponse sous 24 h</span><h3>L’excellence du nettoyage, <span class="serif grad">élevée au rang d’art.</span></h3><p>Équipes formées, suivi digital, qualité mesurée.</p><span class="btn btn--leaf btn--sm btn--full">Devis en 2 min ${icon("arrow", 13)}</span></div><div class="m-stats"><div><b>120+</b><span>sites</span></div><div><b>98 %</b><span>réalisation</span></div><div><b>24 h</b><span>absences</span></div></div></div>`;
const mServices = `<div class="m-page"><div class="m-bar">${icon("menu", 18, "#0A3A72")}<img src="${IMG("logo-necs.png")}" alt=""/>${icon("search", 18, "#0A3A72")}</div><p class="s-kicker">Expertises</p><h4>Pour chaque <span class="serif">environnement</span></h4><div class="m-chips"><span class="chip on">Tous</span><span class="chip">Entreprises</span><span class="chip">Santé</span></div>${sectors.slice(0, 2).map(([t, d, , img]) => `<div class="m-card"><img src="${IMG(img)}" alt=""/><div><b>${t}</b><p>${d}</p></div></div>`).join("")}${sectors.slice(3, 6).map(([t, , i]) => `<div class="m-row"><span>${icon(i, 18, "#1570B8")}</span><b>${t}</b>${icon("arrow", 15, "#5B6678")}</div>`).join("")}</div>`;
const mQuiz = `<div class="m-page"><div class="m-bar">${icon("arrow", 18, "#0A3A72")}<span class="m-step">Étape 3 / 4</span><span></span></div><div class="qz-prog"><i style="width:68%"></i></div><h4>À quelle fréquence <span class="serif">passons-nous ?</span></h4>${[["Quotidien", "du lundi au vendredi", 1], ["Plusieurs fois / semaine", "2 à 3 passages", 0], ["Hebdomadaire", "1 passage", 0], ["Ponctuel", "remise en état", 0]].map(([t, s, on]) => `<div class="qz-opt qz-opt--m ${on ? "on" : ""}"><i>${on ? icon("check", 12, "#fff", 2.8) : ""}</i><b>${t}</b><span>${s}</span></div>`).join("")}<span class="btn btn--navy btn--full m-next">Continuer ${icon("arrow", 15, "#fff")}</span></div>`;
const mContact = `<div class="m-page m-page--contact"><div class="m-bar">${icon("menu", 18, "#0A3A72")}<img src="${IMG("logo-necs.png")}" alt=""/><span></span></div><p class="s-kicker">Contact</p><h4>Parlons de <span class="serif">votre site.</span></h4><div class="m-contact">${[["phone", "Appeler", "+237 641 33 55 53"], ["chat", "WhatsApp", "Réponse rapide"], ["mail", "E-mail", "contact@necs-cm.com"], ["pin", "Zones", "Douala · Yaoundé"]].map(([i, t, d]) => `<div><span>${icon(i, 18, "#1570B8")}</span><b>${t}</b><p>${d}</p></div>`).join("")}</div><div class="m-form"><label>Nom complet</label><i></i><label>Téléphone</label><i></i><label>Votre besoin</label><i class="tall"></i></div><div class="m-dock"><span>${icon("phone", 16, "#0A3A72")}<b>Appeler</b></span><span class="wa">${icon("chat", 16, "#fff")}<b>WhatsApp</b></span><span class="dv"><b>Devis</b></span></div></div>`;
pages.push(`
<section class="page">
  ${head("11", "Mobile first", "70 % des visites viennent du téléphone : <span class=\"serif\">tout se joue au pouce</span>.")}
  <div class="phones4">
    ${[[mHero, "Accueil", "Hero plein écran, action principale à portée du pouce, chiffres clés en dessous."], [mServices, "Expertises", "Filtres en pastilles, grandes cartes photo, liste compacte pour le reste."], [mQuiz, "Devis express", "Une question par écran, gros boutons, barre de progression."], [mContact, "Contact", "Barre d’action fixe : appeler, WhatsApp, devis. Formulaire de 3 champs."]].map(([s, t, d]) => `<div class="ph-col">${phone(s)}<h4>${t}</h4><p>${d}</p></div>`).join("")}
  </div>
</section>`);

// 12 — UX
pages.push(`
<section class="page">
  ${head("12", "Expérience utilisateur", "Un parcours pensé <span class=\"serif\">de la découverte au suivi</span>.")}
  <div class="journey">
    ${[["Découvrir", "Google, réseaux, bouche-à-oreille", "Pages ville et service, partage WhatsApp soigné", "search"], ["Comprendre", "« Est-ce pour mon type de site ? »", "Bento des secteurs, pages service détaillées", "eye"], ["Se rassurer", "« Puis-je leur faire confiance ? »", "NECS Live, avant / après, témoignages, chiffres", "shield"], ["Demander", "« Combien et quand ? »", "Devis express 4 étapes, créneau de visite, WhatsApp", "zap"], ["Être suivi", "Après la signature", "Espace client : rapports, photos, factures", "chart"]].map(([t, q, r, i], k) => `<div class="jr"><div class="jr__ic">${icon(i, 22, "#fff")}</div><span class="jr__n">0${k + 1}</span><h4>${t}</h4><p class="jr__q">${q}</p><p class="jr__r">${r}</p></div>`).join("")}
  </div>
  <div class="ux-grid">
    <div class="ux-card"><h4>${icon("spark", 18, "#1570B8")} Micro-interactions</h4><ul><li>Apparition douce des sections au défilement (désactivée si l’utilisateur limite les animations)</li><li>Compteurs qui s’animent, courbe qui se dessine</li><li>Boutons magnétiques, flèches qui glissent au survol</li><li>Retour immédiat à chaque choix du devis</li></ul></div>
    <div class="ux-card"><h4>${icon("hand", 18, "#1570B8")} Accessibilité</h4><ul><li>Contrastes AA vérifiés sur toutes les couleurs</li><li>Zones tactiles de 44 px minimum</li><li>Navigation complète au clavier, focus visible</li><li>Textes alternatifs, titres hiérarchisés</li></ul></div>
    <div class="ux-card"><h4>${icon("zap", 18, "#1570B8")} Performance</h4><ul><li>Images AVIF / WebP redimensionnées, chargement différé</li><li>Vidéo du hero compressée, image de repli sur réseau lent</li><li>Polices limitées à 3 familles, préchargées</li><li>Objectif Lighthouse 90+ sur mobile</li></ul></div>
    <div class="ux-card"><h4>${icon("globe", 18, "#1570B8")} Référencement local</h4><ul><li>Pages « nettoyage Douala » et « nettoyage Yaoundé » enrichies</li><li>Données structurées LocalBusiness et avis</li><li>Fiche Google Business reliée au site</li><li>Blog conseils : un article par mois</li></ul></div>
  </div>
  <div class="delta">
    <div class="delta__title"><p class="deck-kicker">Ce qui change</p><h4>Du site actuel <span class="serif">au nouveau site</span></h4></div>
    ${[["Hero photo statique", "Hero vivant avec preuves animées"], ["Formulaire de contact unique", "Devis express en 4 étapes + créneau de visite"], ["Services présentés en liste", "Bento des secteurs + une page par service"], ["Promesses de qualité", "Preuves issues de l’application NECS"]].map(([a, b]) => `<div class="delta__item"><p class="delta__from">${a}</p><p class="delta__to">${icon("arrow", 16, "#1F6B3A", 2.2)} ${b}</p></div>`).join("")}
  </div>
</section>`);

// 13 — Suite
pages.push(`
<section class="page closing">
  <img class="closing__bg" src="${IMG("necs-objectif.jpg")}" alt=""/>
  <div class="closing__shade"></div>
  <div class="closing__in">
    <div class="deck-meta deck-meta--light"><span><img src="${IMG("logo-necs.png")}" alt=""/>Maquette site public</span><span>13 / 13</span></div>
    <p class="deck-kicker deck-kicker--light">Prochaines étapes</p>
    <h2 class="closing__title">De la maquette <span class="serif grad">au site en ligne.</span></h2>
    <p class="closing__lead">Six semaines pour passer d’un site vitrine à un outil commercial qui prouve, chaque jour, la rigueur des équipes NECS.</p>
    <div class="closing__values">${[["Propreté", "drop"], ["Rigueur", "check"], ["Confiance", "shield"]].map(([t, i]) => `<span>${icon(i, 18, "#8FD14A", 2.2)} ${t}</span>`).join("")}</div>
    <div class="closing__contact"><span>${icon("phone", 16)} +237 641 33 55 53</span><span>${icon("mail", 16)} contact@necs-cm.com</span><span>${icon("globe", 16)} servicesnecs.vercel.app</span></div>
    <div class="road">${[["Validation", "Retours sur la maquette, choix des photos réelles et des clients à citer", "Semaine 1"], ["Contenus", "Textes définitifs, études de cas, vidéo du hero", "Semaines 2 – 3"], ["Intégration", "Développement Next.js sur le site actuel, devis express relié au CRM NECS", "Semaines 3 – 5"], ["Recette & lancement", "Tests mobile, accessibilité, vitesse, puis mise en ligne et suivi des conversions", "Semaine 6"]].map(([t, d, w], i) => `<div class="road__item"><span class="road__n">0${i + 1}</span><em>${w}</em><h4>${t}</h4><p>${d}</p></div>`).join("")}</div>
    <p class="closing__note">Planning indicatif. Les demandes envoyées depuis le nouveau devis express arriveront directement dans « Demandes digitales » de la console NECS.</p>
  </div>
</section>`);

/* ---------- Styles ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
@page{size:1600px 1000px;margin:0}
:root{--mid:#06152E;--navy:#0A3A72;--azur:#1570B8;--lagoon:#3EC8E8;--leaf:#8FD14A;--forest:#1F6B3A;--amber:#E8A33D;--ivory:#F6F4EF;--mist:#EEF3F8;--ink:#0B1324;--slate:#5B6678;--line:#E3E8EF}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Inter,sans-serif;color:var(--ink);background:#ddd}
img{display:block}
.serif{font-family:'Instrument Serif',serif;font-style:italic;font-weight:400;letter-spacing:0}
.grad{background:linear-gradient(90deg,#3EC8E8,#8FD14A);-webkit-background-clip:text;background-clip:text;color:transparent}
ul{list-style:none}

/* Planches */
.page{width:1600px;height:1000px;position:relative;overflow:hidden;break-after:page;background:var(--ivory);padding:40px 56px}
.page::before{content:"";position:absolute;inset:0;background:radial-gradient(900px 500px at 100% 0%,rgba(62,200,232,.10),transparent 60%),radial-gradient(700px 500px at 0% 100%,rgba(143,209,74,.08),transparent 60%);pointer-events:none}
.deck-head{position:relative;margin-bottom:22px}
.deck-meta{display:flex;justify-content:space-between;align-items:center;font:500 12px Inter;color:var(--slate);letter-spacing:.08em;text-transform:uppercase;margin-bottom:22px}
.deck-meta span:first-child{display:flex;align-items:center;gap:10px}
.deck-meta img{height:22px}
.deck-meta--light{color:rgba(255,255,255,.7)}
.deck-meta--light img{background:#fff;border-radius:6px;padding:2px 6px;height:24px}
.deck-kicker{font:600 13px Inter;letter-spacing:.18em;text-transform:uppercase;color:var(--azur);margin-bottom:8px}
.deck-kicker--light{color:var(--lagoon)}
.deck-title{font:600 38px/1.12 Outfit;color:var(--mid);letter-spacing:-.02em;max-width:1200px}
.deck-title .serif{font-size:44px;color:var(--azur)}
.deck-lead{font-size:17px;line-height:1.6;color:var(--slate);max-width:900px;margin-top:12px}
.board{display:grid;grid-template-columns:1150px 1fr;gap:34px;position:relative}
.board__shot{position:relative}
.notes{display:flex;flex-direction:column;gap:14px;padding-top:4px}
.notes li{display:flex;gap:12px}
.notes li>span{flex:0 0 28px;height:28px;border-radius:50%;background:var(--mid);color:#fff;font:600 13px Outfit;display:flex;align-items:center;justify-content:center}
.notes b{font:600 15px Outfit;color:var(--mid);display:block;margin-bottom:3px}
.notes p{font-size:13px;line-height:1.5;color:var(--slate)}
.pin{position:absolute;width:30px;height:30px;border-radius:50%;background:var(--mid);color:#fff;font:600 14px Outfit;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px rgba(62,200,232,.55),0 6px 14px rgba(0,0,0,.3);z-index:20}

/* Cadres */
.browser{border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 50px 90px -40px rgba(6,21,46,.55),0 0 0 1px rgba(6,21,46,.08)}
.browser__bar{height:36px;background:#EEF1F5;display:flex;align-items:center;gap:7px;padding:0 14px;border-bottom:1px solid #E1E6ED;position:relative}
.browser__bar i{width:11px;height:11px;border-radius:50%;background:#FF5F57}
.browser__bar i:nth-child(2){background:#FEBC2E}.browser__bar i:nth-child(3){background:#28C840}
.browser__bar span{position:absolute;left:50%;transform:translateX(-50%);background:#fff;border-radius:8px;padding:4px 16px;font:500 12px Inter;color:var(--slate);display:flex;gap:6px;align-items:center;min-width:340px;justify-content:center}
.browser__view{position:relative;overflow:hidden;background:#fff}
.scale{transform:scale(var(--k));transform-origin:0 0;width:calc(100% / var(--k))}
.phone{width:300px;height:620px;border-radius:46px;background:#0B1324;padding:11px;box-shadow:0 40px 70px -30px rgba(6,21,46,.6),inset 0 0 0 2px #2A3345}
.phone__screen{width:100%;height:100%;border-radius:36px;overflow:hidden;position:relative;background:var(--ivory)}
.phone__status{position:absolute;top:0;left:0;right:0;height:38px;display:flex;justify-content:space-between;align-items:center;padding:0 24px;font:600 12px Inter;color:#fff;z-index:10}
.phone__notch{width:92px;height:26px;border-radius:20px;background:#0B1324}
.phone__screen:has(.m-page) .phone__status,.phone__screen:has(.m-app) .phone__status{color:var(--ink)}

/* Boutons & UI */
.btn{display:inline-flex;align-items:center;gap:10px;height:52px;padding:0 26px;border-radius:999px;font:600 15px Inter;white-space:nowrap}
.btn--sm{height:40px;padding:0 18px;font-size:13.5px}
.btn--full{width:100%;justify-content:center}
.btn--leaf{background:linear-gradient(135deg,#A6E36A,#5FBF45);color:#06200F;box-shadow:0 14px 30px -12px rgba(95,191,69,.8)}
.btn--glass{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.32);color:#fff}
.btn--navy{background:var(--navy);color:#fff;box-shadow:0 14px 30px -14px rgba(10,58,114,.8)}
.btn--line{background:#fff;border:1px solid var(--line);color:var(--ink)}
.chip{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 16px;border-radius:999px;border:1px solid var(--line);background:#fff;font:500 13.5px Inter;color:var(--ink)}
.chip.on{background:var(--mid);border-color:var(--mid);color:#fff}
.badge{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;background:#E7F5E2;color:var(--forest);font:600 12.5px Inter}
.badge--amber{background:#FDF1DC;color:#9A6212}
.s-pill{display:inline-flex;align-items:center;gap:10px;height:36px;padding:0 16px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);color:#fff;font:500 13.5px Inter}
.s-pill--sm{height:28px;font-size:11px;padding:0 12px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--leaf);box-shadow:0 0 0 4px rgba(143,209,74,.25)}

/* Site : navigation */
.s-nav{position:relative;z-index:5;display:flex;align-items:center;gap:36px;height:84px;padding:0 48px;background:#fff;border-bottom:1px solid var(--line)}
.s-nav--dark{background:transparent;border-bottom:1px solid rgba(255,255,255,.14)}
.s-logo{background:#fff;border-radius:14px;padding:6px 12px;box-shadow:0 6px 16px rgba(0,0,0,.08)}
.s-logo img{height:38px}
.s-logo--sm img{height:30px}
.s-nav ul{display:flex;gap:30px;font:500 15px Inter;color:var(--ink)}
.s-nav--dark ul{color:rgba(255,255,255,.82)}
.s-nav li.on{color:var(--azur);font-weight:600}
.s-nav--dark li.on{color:#fff;position:relative}
.s-nav--dark li.on::after{content:"";position:absolute;left:0;right:0;bottom:-10px;height:2px;background:var(--leaf);border-radius:2px}
.s-nav__right{margin-left:auto;display:flex;align-items:center;gap:20px}
.s-nav__tel{display:flex;gap:8px;align-items:center;font:600 14px Inter;color:var(--navy)}
.s-nav--dark .s-nav__tel{color:#fff}

/* Site : hero */
.s-hero{position:relative;height:742px;color:#fff;overflow:hidden;background:var(--mid)}
.s-hero__bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:60% center}
.s-hero__shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,14,34,.96) 0%,rgba(4,14,34,.82) 36%,rgba(4,14,34,.25) 70%,rgba(4,14,34,.35) 100%),linear-gradient(0deg,rgba(4,14,34,.9) 0%,transparent 35%)}
.s-hero__body{position:relative;z-index:3;padding:58px 48px 0;max-width:640px}
.s-hero h1{font:600 60px/1.04 Outfit;letter-spacing:-.03em;margin:24px 0 20px}
.s-hero h1 .serif{font-size:70px;line-height:1}
.s-hero__body>p{font-size:17px;line-height:1.6;color:rgba(255,255,255,.78);max-width:540px}
.s-hero__body>p b{color:#fff}
.s-hero__cta{display:flex;gap:14px;margin-top:30px}
.s-hero__trust{display:flex;align-items:center;gap:14px;margin-top:28px;font-size:14px;color:rgba(255,255,255,.75)}
.s-hero__trust b{color:#fff}
.avatars{display:flex}
.avatars i{width:36px;height:36px;border-radius:50%;border:2px solid #06152E;background-size:cover;background-position:center;margin-left:-10px}
.avatars i:first-child{margin-left:0}
.s-float{position:absolute;z-index:4;background:rgba(255,255,255,.95);color:var(--ink);border-radius:20px;box-shadow:0 30px 60px -20px rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.6)}
.s-float--qc{right:56px;top:150px;width:270px;padding:18px 20px}
.s-float__head{display:flex;align-items:center;gap:8px;font:600 13px Inter}
.s-float__head em{margin-left:auto;font-style:normal;font-weight:500;font-size:11px;color:var(--slate)}
.s-score{display:flex;align-items:baseline;gap:4px;margin:10px 0 8px}
.s-score b{font:600 48px/1 Outfit;color:var(--mid)}
.s-score span{font:500 16px Outfit;color:var(--slate)}
.s-score i{margin-left:auto;font-style:normal;background:#E7F5E2;color:var(--forest);font:600 12px Inter;padding:5px 10px;border-radius:999px}
.s-bars p{display:grid;grid-template-columns:80px 1fr;align-items:center;font-size:12px;color:var(--slate);margin-top:7px}
.s-bars span{height:6px;border-radius:6px;background:#EDF1F6;position:relative;overflow:hidden}
.s-bars span::after{content:"";position:absolute;inset:0;width:var(--w);background:linear-gradient(90deg,#3EC8E8,#8FD14A);border-radius:6px}
.s-float--team{right:240px;top:396px;display:flex;align-items:center;gap:12px;padding:12px 16px 12px 12px;width:300px}
.s-ava{width:44px;height:44px;border-radius:14px;background-size:cover;background-position:center top;flex:0 0 44px}
.s-float--team b,.s-float--photo b{font:600 14px Outfit;display:block}
.s-float--team p,.s-float--photo p{font-size:12px;color:var(--slate);display:flex;gap:4px;align-items:center;margin-top:2px}
.ok{margin-left:auto;width:28px;height:28px;border-radius:50%;background:var(--forest);display:flex;align-items:center;justify-content:center}
.s-float--photo{right:56px;top:500px;display:flex;align-items:center;gap:12px;padding:10px 16px 10px 10px}
.ba{position:relative;width:70px;height:54px;border-radius:12px;overflow:hidden}
.ba img{width:100%;height:100%;object-fit:cover}
.ba span{position:absolute;left:4px;bottom:4px;background:var(--leaf);color:#06200F;font:700 9px Inter;padding:2px 6px;border-radius:6px}
.s-hero__stats{position:absolute;z-index:3;left:48px;right:48px;bottom:28px;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,.16);padding-top:20px}
.s-hero__stats div{padding-right:20px}
.s-hero__stats b{font:600 34px/1 Outfit;display:block}
.s-hero__stats span{font-size:13px;color:rgba(255,255,255,.65);margin-top:6px;display:block}

/* Site : sections */
.s-sec{padding:44px 48px 36px}
.s-sec--tight{padding-top:32px;padding-bottom:22px}
.s-sec--tight .s-head{margin-bottom:20px}
.s-sec--tight .quote--big blockquote{font-size:16.5px}
.s-ivory{background:var(--ivory)}
.s-white{background:#fff}
.s-head{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-bottom:26px}
.s-kicker{font:600 12.5px Inter;letter-spacing:.18em;text-transform:uppercase;color:var(--azur);margin-bottom:10px}
.s-kicker--light{color:var(--lagoon)}
.s-head h2,.rz-head h2{font:600 40px/1.08 Outfit;letter-spacing:-.025em;color:var(--mid)}
.s-head h2 .serif,.rz-head h2 .serif{font-size:46px;color:var(--azur)}
.s-head__lead{max-width:380px;font-size:15px;line-height:1.6;color:var(--slate)}
.bento{display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr;grid-template-rows:200px 200px;gap:16px}
.bento__img{position:relative;border-radius:24px;overflow:hidden}
.bento__img.b0{grid-row:span 2}
.bento__img.b1{grid-column:span 2}
.bento__img img{width:100%;height:100%;object-fit:cover}
.bento__shade{position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,21,46,.88) 0%,rgba(6,21,46,.1) 65%)}
.bento__txt{position:absolute;left:22px;right:22px;bottom:20px;color:#fff;padding-right:52px}
.bento__ic{width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.bento__txt h3{font:600 22px Outfit}
.bento__txt p{font-size:13.5px;color:rgba(255,255,255,.78);margin-top:4px;max-width:300px}
.bento__go{position:absolute;right:0;bottom:2px;width:40px;height:40px;border-radius:50%;background:var(--leaf);display:flex;align-items:center;justify-content:center}
.bento__card{background:#fff;border-radius:24px;padding:20px;border:1px solid var(--line);display:flex;flex-direction:column}
.bento__ic2{width:42px;height:42px;border-radius:14px;background:var(--mist);display:flex;align-items:center;justify-content:center;margin-bottom:auto}
.bento__card h3{font:600 18px Outfit;color:var(--mid);margin-top:14px}
.bento__card p{font-size:13px;color:var(--slate);margin-top:4px;line-height:1.45}
.bento__more{font:600 12.5px Inter;color:var(--azur);display:flex;gap:6px;align-items:center;margin-top:10px}
.logos{display:flex;align-items:center;gap:44px;margin-top:26px;padding-top:22px;border-top:1px solid var(--line)}
.logos span{font:600 12px Inter;letter-spacing:.14em;text-transform:uppercase;color:var(--slate);max-width:150px}
.logos b{font:700 19px Outfit;color:#9AA4B2;letter-spacing:-.01em}

/* NECS Live */
.s-live{position:relative;height:742px;background:radial-gradient(800px 500px at 70% 30%,#123F7A 0%,#06152E 60%);color:#fff;padding:46px 48px;overflow:hidden}
.s-live__glow{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(62,200,232,.35),transparent 70%);right:120px;top:40px}
.s-live__txt{position:relative;width:440px}
.s-live__txt h2{font:600 40px/1.08 Outfit;letter-spacing:-.025em;margin-bottom:14px}
.s-live__txt h2 .serif{font-size:46px}
.s-live__txt>p{font-size:15px;line-height:1.6;color:rgba(255,255,255,.7);margin-bottom:22px}
.s-live__txt li{display:flex;gap:14px;margin-bottom:14px}
.s-live__txt li>span{flex:0 0 40px;height:40px;border-radius:12px;background:rgba(62,200,232,.12);border:1px solid rgba(62,200,232,.3);display:flex;align-items:center;justify-content:center}
.s-live__txt li b{font:600 15.5px Outfit}
.s-live__txt li p{font-size:13px;color:rgba(255,255,255,.62);margin-top:2px}
.s-live__phone{position:absolute;left:540px;top:30px;transform:scale(.88);transform-origin:top left}
.s-live__dash{position:absolute;right:48px;top:60px;width:300px}
.dash-card{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:18px}
.dash-card__h{display:flex;gap:8px;align-items:center;font:600 13px Inter;margin-bottom:12px}
.chart{width:100%;height:110px}
.dash-card__x{display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.5);margin-top:6px}
.dash-mini{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
.dash-mini div{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:16px}
.dash-mini b{font:600 28px Outfit;display:block}
.dash-mini span{font-size:12px;color:rgba(255,255,255,.6)}
.steps{position:absolute;left:48px;right:48px;bottom:34px;display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:16px 22px}
.step{display:flex;align-items:center;gap:10px;white-space:nowrap}
.step span{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#3EC8E8,#8FD14A);color:#06152E;font:700 13px Outfit;display:flex;align-items:center;justify-content:center}
.step b{font:600 14px Outfit}
.step__line{flex:1;height:1px;background:linear-gradient(90deg,rgba(62,200,232,.6),rgba(143,209,74,.6))}

/* Écrans mobiles */
.m-hero{position:absolute;inset:0;color:#fff}
.m-hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:35% center}
.m-hero__shade{position:absolute;inset:0;background:linear-gradient(0deg,rgba(4,14,34,.97) 0%,rgba(4,14,34,.75) 50%,rgba(4,14,34,.35) 100%)}
.m-top{position:absolute;top:46px;left:18px;right:18px;display:flex;justify-content:space-between;align-items:center;z-index:3}
.m-top img{height:30px;background:#fff;border-radius:10px;padding:4px 8px}
.m-top i{width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center}
.m-hero__body{position:absolute;left:20px;right:20px;bottom:120px;z-index:3}
.m-hero__body h3{font:600 30px/1.06 Outfit;letter-spacing:-.02em;margin:12px 0 10px}
.m-hero__body h3 .serif{font-size:33px}
.m-hero__body p{font-size:13px;color:rgba(255,255,255,.75);margin-bottom:16px}
.m-stats{position:absolute;left:20px;right:20px;bottom:30px;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid rgba(255,255,255,.18);padding-top:14px;z-index:3}
.m-stats b{font:600 22px Outfit;display:block}
.m-stats span{font-size:11px;color:rgba(255,255,255,.6)}
.m-page{position:absolute;inset:0;padding:48px 18px 18px;background:var(--ivory)}
.m-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.m-bar img{height:28px}
.m-step{font:600 13px Inter;color:var(--slate)}
.m-page h4{font:600 26px/1.1 Outfit;color:var(--mid);letter-spacing:-.02em;margin-bottom:14px}
.m-page h4 .serif{color:var(--azur);font-size:29px}
.m-chips{display:flex;gap:6px;margin-bottom:14px}
.m-chips .chip{height:30px;font-size:12px;padding:0 12px}
.m-card{position:relative;height:132px;border-radius:20px;overflow:hidden;margin-bottom:10px}
.m-card img{width:100%;height:100%;object-fit:cover}
.m-card div{position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,21,46,.9),rgba(6,21,46,0) 75%);padding:14px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff}
.m-card b{font:600 17px Outfit}
.m-card p{font-size:11.5px;color:rgba(255,255,255,.75)}
.m-row{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:10px 12px;margin-bottom:8px}
.m-row span{width:34px;height:34px;border-radius:10px;background:var(--mist);display:flex;align-items:center;justify-content:center}
.m-row b{font:600 14px Outfit;color:var(--mid);flex:1}
.m-next{position:absolute;left:18px;right:18px;bottom:24px;width:auto}
.m-contact{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.m-contact div{background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px}
.m-contact span{width:32px;height:32px;border-radius:10px;background:var(--mist);display:flex;align-items:center;justify-content:center;margin-bottom:8px}
.m-contact b{font:600 14px Outfit;color:var(--mid);display:block}
.m-contact p{font-size:11px;color:var(--slate)}
.m-form label{display:block;font:600 11.5px Inter;color:var(--slate);margin:8px 0 5px}
.m-form i{display:block;height:40px;border-radius:12px;background:#fff;border:1px solid var(--line)}
.m-form i.tall{height:62px}
.m-dock{position:absolute;left:12px;right:12px;bottom:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;background:#fff;border-radius:22px;padding:7px;box-shadow:0 16px 30px -12px rgba(6,21,46,.4);border:1px solid var(--line)}
.m-dock span{height:48px;border-radius:16px;display:flex;align-items:center;justify-content:center;gap:6px;font:600 12.5px Inter;color:var(--navy);background:var(--mist)}
.m-dock .wa{background:#25D366;color:#fff}
.m-dock .dv{background:linear-gradient(135deg,#A6E36A,#5FBF45);color:#06200F}
.m-app{position:absolute;inset:0;padding:50px 16px 16px;background:linear-gradient(180deg,#F6F4EF,#fff)}
.m-app__hi{font-size:13px;color:var(--slate);margin-bottom:12px}
.m-app__hi b{color:var(--mid);font-family:Outfit;font-size:17px;display:block}
.m-app__score{background:var(--mid);color:#fff;border-radius:20px;padding:14px 16px}
.m-app__score span{font-size:11.5px;color:rgba(255,255,255,.65)}
.m-app__score b{font:600 38px/1.1 Outfit;display:block}
.m-app__score small{font-size:15px;color:rgba(255,255,255,.6)}
.spark{width:100%;height:40px;margin-top:4px}
.m-app__row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.m-app__row div{background:#fff;border:1px solid var(--line);border-radius:16px;padding:10px 12px}
.m-app__row b{font:600 20px Outfit;color:var(--mid);display:block}
.m-app__row span{font-size:11px;color:var(--slate)}
.m-app__lbl{font:600 11px Inter;letter-spacing:.12em;text-transform:uppercase;color:var(--slate);margin:4px 0 8px}
.m-app__pics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
.m-app__pics img{width:100%;height:62px;object-fit:cover;border-radius:10px}
.m-app__item{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin-bottom:6px}

/* Témoignages, CTA, footer */
.s-arrows{display:flex;gap:10px}
.s-arrows i{width:46px;height:46px;border-radius:50%;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;transform:scaleX(-1)}
.s-arrows i.on{background:var(--mid);border-color:var(--mid);transform:none}
.quotes{display:grid;grid-template-columns:1.7fr 1fr 1fr;gap:16px}
.quote{background:var(--ivory);border-radius:24px;padding:22px;position:relative}
.quote--big{display:grid;grid-template-columns:170px 1fr;gap:20px;background:var(--mid);color:#fff}
.quote--big img{width:170px;height:100%;object-fit:cover;border-radius:16px}
.quote__mark{font-size:64px;line-height:.6;color:var(--leaf);height:28px}
.quote blockquote{font:400 15.5px/1.55 Inter;color:var(--ink)}
.quote--big blockquote{font:500 18px/1.45 Outfit;color:#fff}
.quote figcaption{margin-top:14px}
.quote figcaption b{font:600 14.5px Outfit;display:block;color:var(--mid)}
.quote--big figcaption b{color:#fff}
.quote figcaption span{font-size:12.5px;color:var(--slate)}
.quote--big figcaption span{color:rgba(255,255,255,.6)}
.stars{display:flex;gap:2px;margin-top:8px}
.s-cta{margin:0 48px;border-radius:28px;background:linear-gradient(120deg,#0A3A72,#1570B8 60%,#1E8FC4);color:#fff;padding:30px 36px;display:flex;align-items:center;justify-content:space-between;position:relative;overflow:hidden}
.s-cta::after{content:"";position:absolute;right:-60px;top:-80px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(143,209,74,.35),transparent 70%)}
.s-cta h2{font:600 32px Outfit;letter-spacing:-.02em}
.s-cta h2 .serif{font-size:37px}
.s-cta p{font-size:14.5px;color:rgba(255,255,255,.78);margin-top:6px}
.s-cta__btns{display:flex;gap:12px;position:relative;z-index:2}
.s-foot{display:grid;grid-template-columns:1.6fr 1fr 1fr 1.3fr;gap:30px;padding:22px 48px 0;margin-top:18px;border-top:1px solid var(--line)}
.s-foot__brand p{font-size:13px;line-height:1.6;color:var(--slate);margin-top:12px;max-width:300px}
.s-foot h5{font:600 13px Inter;letter-spacing:.12em;text-transform:uppercase;color:var(--mid);margin-bottom:10px}
.s-foot p{font-size:13.5px;color:var(--slate);margin-bottom:7px;display:flex;gap:7px;align-items:center}
.s-foot .s-logo{display:inline-block;box-shadow:none;border:1px solid var(--line)}

/* Page service */
.sv-hero{display:grid;grid-template-columns:1fr 470px;gap:40px;padding:34px 48px 0}
.crumb{font-size:12.5px;color:var(--slate);margin-bottom:14px}
.crumb b{color:var(--mid)}
.sv-hero h1{font:600 44px/1.06 Outfit;letter-spacing:-.025em;color:var(--mid)}
.sv-hero h1 .serif{color:var(--azur);font-size:50px}
.sv-hero__txt>p{font-size:15.5px;line-height:1.6;color:var(--slate);margin:14px 0 22px;max-width:520px}
.sv-hero__cta{display:flex;gap:12px}
.sv-facts{display:flex;gap:20px;margin-top:22px;font-size:13px;color:var(--ink)}
.sv-facts span{display:flex;gap:7px;align-items:center}
.sv-hero__img{position:relative;height:300px;border-radius:26px;overflow:hidden}
.sv-hero__img img{width:100%;height:100%;object-fit:cover}
.sv-badge{position:absolute;left:16px;bottom:16px;background:#fff;border-radius:16px;padding:12px 16px;display:flex;gap:10px;align-items:center;box-shadow:0 16px 30px -10px rgba(0,0,0,.35)}
.sv-badge b{font:600 14px Outfit;display:block;color:var(--mid)}
.sv-badge span{font-size:12px;color:var(--slate)}
.sv-inc{margin:26px 48px 0;background:var(--ivory);border-radius:22px;padding:18px 24px}
.sv-inc h3{font:600 18px Outfit;color:var(--mid);margin-bottom:10px}
.sv-inc__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 20px}
.sv-inc__grid p{display:flex;gap:8px;align-items:center;font-size:13.5px}
.sv-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:18px 48px 0}
.plan{border:1px solid var(--line);border-radius:22px;padding:18px 20px;position:relative;background:#fff}
.plan.on{background:var(--mid);color:#fff;border-color:var(--mid);box-shadow:0 24px 40px -20px rgba(6,21,46,.7)}
.plan__tag{position:absolute;right:16px;top:16px;background:var(--leaf);color:#06200F;font:700 11px Inter;padding:4px 10px;border-radius:999px}
.plan h4{font:600 20px Outfit}
.plan>p{font-size:12.5px;color:var(--slate);margin:2px 0 10px}
.plan.on>p{color:rgba(255,255,255,.65)}
.plan li{display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:5px}
.plan__price{display:block;margin-top:10px;font:600 15px Outfit;color:var(--azur)}
.plan.on .plan__price{color:var(--leaf)}

/* Devis express */
.qz{display:grid;grid-template-columns:260px 1fr 300px;height:742px;background:var(--ivory)}
.qz-steps{background:#fff;border-right:1px solid var(--line);padding:26px 22px;display:flex;flex-direction:column;gap:18px}
.qz-steps .s-logo{align-self:flex-start;box-shadow:none;border:1px solid var(--line);margin-bottom:8px}
.qz-step{display:flex;gap:12px;align-items:flex-start;opacity:.55}
.qz-step.done,.qz-step.on{opacity:1}
.qz-step>span{flex:0 0 30px;height:30px;border-radius:50%;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;font:600 13px Outfit;color:var(--slate)}
.qz-step.done>span{background:var(--forest);border-color:var(--forest)}
.qz-step.on>span{background:var(--mid);border-color:var(--mid);color:#fff;box-shadow:0 0 0 5px rgba(62,200,232,.25)}
.qz-step b{font:600 14.5px Outfit;color:var(--mid);display:block}
.qz-step p{font-size:12px;color:var(--slate);margin-top:2px}
.qz-help{margin-top:auto;display:flex;gap:10px;align-items:center;background:var(--mist);border-radius:16px;padding:12px}
.qz-help b{font:600 13px Outfit;color:var(--mid);display:block}
.qz-help p{font-size:11.5px;color:var(--slate)}
.qz-main{padding:32px 40px;position:relative}
.qz-prog{height:6px;border-radius:6px;background:#E3E8EF;overflow:hidden}
.qz-prog i{display:block;height:100%;background:linear-gradient(90deg,#3EC8E8,#8FD14A);border-radius:6px}
.qz-count{font:600 12px Inter;color:var(--slate);margin:10px 0 14px;letter-spacing:.06em;text-transform:uppercase}
.qz-main h2{font:600 32px/1.12 Outfit;letter-spacing:-.02em;color:var(--mid);margin-bottom:20px}
.qz-main h2 .serif{color:var(--azur);font-size:37px}
.qz-opts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.qz-opt{position:relative;background:#fff;border:1.5px solid var(--line);border-radius:18px;padding:16px 18px 16px 52px}
.qz-opt i{position:absolute;left:18px;top:18px;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center}
.qz-opt b{font:600 15.5px Outfit;color:var(--mid);display:block}
.qz-opt span{font-size:12.5px;color:var(--slate)}
.qz-opt.on{border-color:var(--azur);box-shadow:0 0 0 4px rgba(21,112,184,.12);background:#F7FBFF}
.qz-opt.on i{background:var(--azur);border-color:var(--azur)}
.qz-opt--m{padding:12px 14px 12px 46px;margin-bottom:8px;border-radius:16px}
.qz-opt--m i{left:14px;top:14px;width:20px;height:20px}
.qz-lbl{font:600 13px Inter;color:var(--mid);margin:20px 0 10px}
.qz-chips{display:flex;gap:8px}
.qz-toggles{display:flex;gap:10px;flex-wrap:wrap}
.tg{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 14px;font-size:13.5px}
.tg i{width:36px;height:20px;border-radius:20px;background:#D6DDE6;position:relative}
.tg i::after{content:"";position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#fff}
.tg.on i{background:var(--forest)}
.tg.on i::after{left:18px}
.qz-nav{position:absolute;left:40px;right:40px;bottom:30px;display:flex;justify-content:space-between}
.qz-sum{background:#fff;border-left:1px solid var(--line);padding:26px 22px}
.qz-sum h4{font:600 18px Outfit;color:var(--mid);margin-bottom:14px}
.qz-sum dl{display:grid;grid-template-columns:auto 1fr;gap:8px 12px;font-size:13px;padding-bottom:16px;border-bottom:1px solid var(--line)}
.qz-sum dt{color:var(--slate)}
.qz-sum dd{color:var(--ink);font-weight:600;text-align:right}
.qz-visit{margin:16px 0}
.qz-visit p{display:flex;gap:8px;align-items:center;font:600 13.5px Outfit;color:var(--mid);margin-bottom:10px}
.qz-slots{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.qz-slots span{border:1px solid var(--line);border-radius:14px;padding:8px;text-align:center;font-size:11.5px;color:var(--slate);line-height:1.4}
.qz-slots b{font:600 14px Outfit;color:var(--mid)}
.qz-slots .on{background:var(--mid);border-color:var(--mid);color:rgba(255,255,255,.7)}
.qz-slots .on b{color:#fff}
.qz-guar{display:flex;gap:10px;align-items:center;background:#E7F5E2;border-radius:14px;padding:12px;font-size:13px;color:var(--forest)}
.qz-safe{font-size:11.5px;color:var(--slate);display:flex;gap:6px;align-items:center;margin-top:12px}

/* Réalisations */
.rz{padding:26px 48px 0}
.rz-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px}
.rz-filters{display:flex;gap:8px}
.rz-grid{display:grid;grid-template-columns:1fr 400px;gap:24px}
.rz-ba{position:relative;height:300px;border-radius:24px;overflow:hidden}
.rz-ba__img{width:100%;height:100%;object-fit:cover}
.rz-ba__before{position:absolute;left:0;top:0;bottom:0;width:50%;overflow:hidden;border-right:3px solid #fff}
.rz-ba__before img{width:676px;height:100%;object-fit:cover;filter:saturate(.35) brightness(.72) contrast(.85) sepia(.35)}
.rz-ba__l,.rz-ba__r{position:absolute;top:16px;background:rgba(6,21,46,.75);color:#fff;font:600 12px Inter;padding:6px 12px;border-radius:999px}
.rz-ba__l{left:16px}
.rz-ba__r{right:16px;background:var(--leaf);color:#06200F}
.rz-ba__handle{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}
.rz-ba__handle b{width:48px;height:48px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(0,0,0,.35)}
.rz-case{background:var(--ivory);border-radius:24px;padding:18px 22px}
.rz-case .rz-kpi{margin:12px 0}
.rz-case h3{font:600 21px/1.2 Outfit;color:var(--mid);margin:12px 0 8px}
.rz-case>p{font-size:13.5px;line-height:1.55;color:var(--slate)}
.rz-kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0}
.rz-kpi div{background:#fff;border-radius:14px;padding:10px}
.rz-kpi b{font:600 26px Outfit;color:var(--mid);display:block}
.rz-kpi span{font-size:11px;color:var(--slate);line-height:1.3;display:block}
.rz-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:18px}
.rz-cards article{position:relative;height:120px;border-radius:20px;overflow:hidden}
.rz-cards img{width:100%;height:100%;object-fit:cover}
.rz-cards div{position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,21,46,.85),transparent 65%);display:flex;flex-direction:column;justify-content:flex-end;padding:14px 16px;color:#fff}
.rz-cards span{font:600 11px Inter;letter-spacing:.12em;text-transform:uppercase;color:var(--leaf)}
.rz-cards b{font:600 16px Outfit}

/* Couverture */
.cover{background:var(--mid);color:#fff;padding:0}
.cover::before{display:none}
.cover__bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
.cover__shade{position:absolute;inset:0;background:linear-gradient(100deg,#06152E 0%,rgba(6,21,46,.92) 42%,rgba(6,21,46,.55) 100%)}
.cover__left{position:absolute;left:90px;top:90px;width:620px}
.cover__logo{display:inline-block;background:#fff;border-radius:20px;padding:12px 20px}
.cover__logo img{height:64px}
.cover__kicker{margin-top:110px;font:600 15px Inter;letter-spacing:.24em;text-transform:uppercase;color:var(--lagoon)}
.cover__left h1{font:600 100px/.98 Outfit;letter-spacing:-.04em;margin:18px 0 24px}
.cover__left h1 .serif{font-size:116px}
.cover__lead{font-size:19px;line-height:1.6;color:rgba(255,255,255,.78)}
.cover__meta{display:flex;gap:28px;margin-top:60px;font-size:14px;color:rgba(255,255,255,.7)}
.cover__meta span{display:flex;gap:8px;align-items:center}
.cover__shot{position:absolute;left:770px;top:200px;width:700px;transform:perspective(1800px) rotateY(-8deg) rotateX(2deg);transform-origin:left center}
.cover__phone{position:absolute;right:70px;top:360px;transform:scale(.88) rotate(4deg);transform-origin:top right}

/* Vision */
.principles{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:48px;position:relative}
.principle{background:#fff;border-radius:26px;padding:32px 30px;border:1px solid var(--line);box-shadow:0 30px 50px -40px rgba(6,21,46,.5);min-height:380px}
.principle__top{display:flex;justify-content:space-between;align-items:center;margin-bottom:120px}
.principle__top span{font:400 52px/1 'Instrument Serif';font-style:italic;color:var(--lagoon)}
.principle h3{font:600 22px Outfit;color:var(--mid);margin-bottom:10px}
.principle p{font-size:14.5px;line-height:1.6;color:var(--slate)}
.kpis{position:relative;margin-top:40px;background:var(--mid);border-radius:28px;padding:40px 36px;display:grid;grid-template-columns:1.3fr repeat(5,1fr);gap:20px;align-items:center;color:#fff}
.kpis .deck-kicker{color:var(--lagoon)}
.kpis__note{font-size:13px;color:rgba(255,255,255,.55)}
.kpi{border-left:1px solid rgba(255,255,255,.16);padding-left:20px}
.kpi b{font:600 36px Outfit;display:block;background:linear-gradient(90deg,#3EC8E8,#8FD14A);-webkit-background-clip:text;background-clip:text;color:transparent}
.kpi span{font-size:13px;color:rgba(255,255,255,.7);line-height:1.4;display:block;margin-top:4px}

/* Design system */
.ds{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto auto;gap:20px;position:relative}
.ds-card{background:#fff;border-radius:26px;padding:24px 28px;border:1px solid var(--line)}
.ds-card h4{font:600 13px Inter;letter-spacing:.16em;text-transform:uppercase;color:var(--slate);margin-bottom:16px}
.swatches{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.sw i{display:block;height:70px;border-radius:16px;border:1px solid rgba(0,0,0,.06);margin-bottom:8px}
.sw b{font:600 14px Outfit;color:var(--mid);display:block}
.sw span{font:500 12px Inter;color:var(--slate)}
.ds-note{font-size:13px;line-height:1.55;color:var(--slate);margin-top:14px}
.type-row{display:grid;grid-template-columns:80px 1fr;align-items:baseline;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}
.type-tag{font:600 11px Inter;letter-spacing:.12em;text-transform:uppercase;color:var(--azur)}
.t-disp{font:600 38px Outfit;color:var(--mid);letter-spacing:-.02em}
.t-serif{font-size:44px;color:var(--azur)}
.t-body{font-size:15px;color:var(--ink);line-height:1.5}
.scale-row{display:flex;gap:22px;margin-top:14px;font-size:12.5px;color:var(--slate)}
.scale-row b{color:var(--mid);font-family:Outfit;margin-right:5px}
.comp-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.field{flex:1;background:var(--ivory);border-radius:16px;padding:12px 16px;display:block}
.field span{font-size:11.5px;color:var(--slate);display:block}
.field b{font:600 17px Outfit;color:var(--mid)}
.slider{display:block;height:5px;border-radius:5px;background:#DCE3EC;margin-top:8px;position:relative}
.slider em{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#3EC8E8,#8FD14A);border-radius:5px}
.slider em::after{content:"";position:absolute;right:-8px;top:-6px;width:17px;height:17px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3)}
.icons i{width:44px;height:44px;border-radius:14px;background:var(--mist);display:flex;align-items:center;justify-content:center}
.tokens{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
.tok i{display:block;height:80px;background:var(--mist);border:1px solid var(--line);margin-bottom:8px}
.tok span{font-size:12px;color:var(--slate)}
.tok .sh1{border-radius:16px;background:#fff;box-shadow:0 12px 24px -12px rgba(6,21,46,.35)}
.tok .sh2{border-radius:16px;background:#fff;box-shadow:0 30px 50px -18px rgba(6,21,46,.55)}
.tok .glass{border-radius:16px;background:linear-gradient(135deg,rgba(10,58,114,.9),rgba(21,112,184,.85));position:relative}
.tok .glass::after{content:"";position:absolute;inset:14px;border-radius:12px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4)}

/* Mobile */
.phones4{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;position:relative;margin-top:10px}
.ph-col{display:flex;flex-direction:column;align-items:center;text-align:center}
.ph-col h4{font:600 19px Outfit;color:var(--mid);margin-top:20px}
.ph-col p{font-size:13.5px;line-height:1.5;color:var(--slate);max-width:300px;margin-top:4px}
/* UX */
.journey{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;position:relative;margin-top:10px}
.jr{background:#fff;border:1px solid var(--line);border-radius:24px;padding:28px 24px;position:relative}
.jr__ic{width:48px;height:48px;border-radius:16px;background:linear-gradient(135deg,#0A3A72,#1570B8);display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.jr__n{position:absolute;right:20px;top:18px;font:400 40px/1 'Instrument Serif';font-style:italic;color:#C8D3E0}
.jr h4{font:600 20px Outfit;color:var(--mid)}
.jr__q{font-size:13px;color:var(--slate);font-style:italic;margin:6px 0 12px}
.jr__r{font-size:13.5px;line-height:1.5;color:var(--ink);padding-top:12px;border-top:1px solid var(--line)}
.ux-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:26px;position:relative}
.ux-card{background:var(--mid);color:#fff;border-radius:24px;padding:26px 24px}
.ux-card h4{font:600 17px Outfit;display:flex;gap:10px;align-items:center;margin-bottom:12px}
.ux-card h4 svg{stroke:var(--lagoon)}
.ux-card li{font-size:13px;line-height:1.5;color:rgba(255,255,255,.78);padding-left:16px;position:relative;margin-bottom:8px}
.ux-card li::before{content:"";position:absolute;left:0;top:7px;width:6px;height:6px;border-radius:50%;background:var(--leaf)}

/* Fin */
.closing{background:var(--mid);color:#fff}
.closing::before{display:none}
.closing__bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5}
.closing__shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,21,46,.94) 0%,rgba(6,21,46,.75) 60%,rgba(6,21,46,.95) 100%)}
.closing__in{position:relative;height:100%;display:flex;flex-direction:column}
.closing__title{font:600 64px/1.02 Outfit;letter-spacing:-.03em;margin-top:6px;max-width:1000px}
.closing__title .serif{font-size:74px}
.road{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:auto;margin-bottom:26px}
.road__item{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);border-radius:24px;padding:24px}
.road__n{font:400 46px/1 'Instrument Serif';font-style:italic;color:var(--lagoon)}
.road__item em{float:right;font-style:normal;font:600 12px Inter;color:#06200F;background:var(--leaf);padding:5px 10px;border-radius:999px}
.road__item h4{font:600 21px Outfit;margin:16px 0 8px}
.road__item p{font-size:14px;line-height:1.55;color:rgba(255,255,255,.72)}
.closing__note{font-size:13px;color:rgba(255,255,255,.55);margin-bottom:10px}
.closing__lead{font-size:20px;line-height:1.6;color:rgba(255,255,255,.78);max-width:760px;margin-top:22px}
.closing__values{display:flex;gap:14px;margin-top:34px}
.closing__values span{display:flex;align-items:center;gap:10px;height:48px;padding:0 22px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);font:600 17px Outfit}
.closing__contact{display:flex;gap:30px;margin-top:26px;font-size:15px;color:rgba(255,255,255,.75)}
.closing__contact span{display:flex;gap:8px;align-items:center}
.delta{position:relative;margin-top:26px;background:#fff;border:1px solid var(--line);border-radius:24px;padding:34px 30px;display:grid;grid-template-columns:1.1fr repeat(4,1fr);gap:22px;align-items:center}
.delta__title h4{font:600 24px/1.15 Outfit;color:var(--mid);letter-spacing:-.02em}
.delta__title h4 .serif{color:var(--azur);font-size:28px}
.delta__item{border-left:1px solid var(--line);padding-left:20px}
.delta__from{font-size:13px;color:#98A2B3;text-decoration:line-through;margin-bottom:8px}
.delta__to{font:600 15px/1.35 Outfit;color:var(--mid);display:flex;gap:8px;align-items:flex-start}
.delta__to svg{flex:0 0 16px;margin-top:2px}
`;

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>Maquette site public NECS</title><style>${CSS}</style></head><body>${pages.join("\n")}</body></html>`;
fs.writeFileSync(OUT_HTML, html);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(pathToFileURL(OUT_HTML).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (process.argv.includes("--png")) {
    const n = await page.locator(".page").count();
    for (let i = 0; i < n; i++) {
      await page.locator(".page").nth(i).screenshot({ path: path.join(require("os").tmpdir(), `maq-${String(i + 1).padStart(2, "0")}.png`) });
    }
  }
  await page.pdf({ path: OUT_PDF, width: "1600px", height: "1000px", printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log(`PDF généré : ${OUT_PDF} (${Math.round(fs.statSync(OUT_PDF).size / 1024)} Ko)`);
})();
