"use client";

import Image from "next/image";
import {
  SiteShell,
  useNecsContent,
} from "@/components/site/SiteShell";
import { ObjectifRoadmap } from "@/components/site/ObjectifRoadmap";
import { ConfianceExperience } from "@/components/site/ConfianceExperience";
import { PourquoiExperience } from "@/components/site/PourquoiExperience";
import { RealisationsExperience } from "@/components/site/RealisationsExperience";
import {
  ActivityServiceFlyer,
  type ActivityService,
} from "@/components/site/ActivityServiceFlyer";

function PourquoiInner() {
  const content = useNecsContent();
  return <PourquoiExperience content={content} />;
}

export function PourquoiPage() {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <PourquoiInner />
    </SiteShell>
  );
}

function RealisationsInner() {
  const content = useNecsContent();
  return <RealisationsExperience content={content} />;
}

export function RealisationsPage() {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <RealisationsInner />
    </SiteShell>
  );
}

function ObjectifInner() {
  return <ObjectifRoadmap />;
}

export function ObjectifPage() {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <ObjectifInner />
    </SiteShell>
  );
}

function ActivitesInner() {
  const content = useNecsContent();
  const services: ActivityService[] = [
    {
      id: "bureaux",
      script: "Des espaces de travail plus propres, plus performants !",
      badge: "Votre partenaire en propreté professionnelle",
      titleLead: "Entretien",
      titleAccent: "des bureaux",
      text: content.act1Text,
      heroImage: content.images.actOffice,
      features: [
        { icon: "calendar", label: "Entretien quotidien, hebdomadaire ou périodique" },
        { icon: "room", label: "Nettoyage des sanitaires et salles de réunion" },
        { icon: "glass", label: "Vitrerie intérieure et espaces à exigences particulières" },
      ],
      gallery: [
        { src: content.images.actOffice, label: "Postes de travail" },
        { src: content.images.about, label: "Salles de réunion" },
        { src: content.images.blog1, label: "Sanitaires" },
        { src: content.images.achMain, label: "Vitrerie intérieure" },
      ],
      benefits: [
        { icon: "people", label: "Espaces agréables et accueillants" },
        { icon: "gear", label: "Image professionnelle renforcée" },
        { icon: "shield", label: "Santé et bien-être de vos collaborateurs" },
        { icon: "chart", label: "Productivité améliorée" },
      ],
    },
    {
      id: "industrie",
      script: "Des sites industriels maîtrisés, en toute sécurité !",
      badge: "Protocoles HSE & exécution terrain",
      titleLead: "Nettoyage",
      titleAccent: "industriel",
      text: content.act2Text,
      heroImage: content.images.actIndustry,
      features: [
        { icon: "calendar", label: "Interventions planifiées hors production" },
        { icon: "room", label: "Zones techniques, ateliers et entrepôts" },
        { icon: "glass", label: "Respect strict des consignes HSE" },
      ],
      gallery: [
        { src: content.images.actIndustry, label: "Ateliers" },
        { src: content.images.objectif, label: "Zones techniques" },
        { src: content.images.achMain, label: "Entrepôts" },
        { src: content.images.blog2, label: "Contrôle qualité" },
      ],
      benefits: [
        { icon: "shield", label: "Sécurité renforcée sur site" },
        { icon: "gear", label: "Standards opérationnels stables" },
        { icon: "spark", label: "Espaces propres et productifs" },
        { icon: "chart", label: "Moins d’interruptions" },
      ],
    },
    {
      id: "commerces",
      script: "Une image de marque impeccable, à chaque visite !",
      badge: "Retail, malls & espaces publics",
      titleLead: "Commerces",
      titleAccent: "& espaces publics",
      text: content.act3Text,
      heroImage: content.images.actCommerce,
      features: [
        { icon: "calendar", label: "Propreté continue selon les flux clients" },
        { icon: "room", label: "Zones d’accueil, allées et sanitaires" },
        { icon: "glass", label: "Vitrerie et mise en valeur de l’espace" },
      ],
      gallery: [
        { src: content.images.actCommerce, label: "Accueil client" },
        { src: content.images.blog1, label: "Allées & circulations" },
        { src: content.images.about, label: "Sanitaires public" },
        { src: content.images.hero, label: "Vitrerie magasin" },
      ],
      benefits: [
        { icon: "people", label: "Expérience visiteur premium" },
        { icon: "spark", label: "Image de marque renforcée" },
        { icon: "time", label: "Réactivité en journée" },
        { icon: "heart", label: "Confort des équipes magasin" },
      ],
    },
    {
      id: "particuliers",
      script: "Un foyer plus propre, plus serein, pour toute la famille !",
      badge: "Nettoyage à domicile sur mesure",
      titleLead: "Nettoyage",
      titleAccent: "pour les particuliers",
      text: content.act4Text,
      heroImage: content.images.actHome,
      features: [
        { icon: "home", label: "Entretien régulier ou ponctuel de votre domicile" },
        { icon: "kitchen", label: "Cuisine, surfaces et espaces de vie" },
        { icon: "bath", label: "Sanitaires, chambres et finitions soignées" },
      ],
      gallery: [
        { src: content.images.about, label: "Salon & séjour" },
        { src: content.images.achMain, label: "Cuisine" },
        { src: content.images.blog2, label: "Chambres" },
        { src: content.images.blog1, label: "Sanitaires" },
      ],
      benefits: [
        { icon: "time", label: "Plus de temps pour votre famille" },
        { icon: "home", label: "Confort au quotidien" },
        { icon: "spark", label: "Hygiène domestique maîtrisée" },
        { icon: "heart", label: "Sérénité à la maison" },
      ],
    },
    {
      id: "sante",
      script: "Hygiène hospitalière maîtrisée, patients en confiance !",
      badge: "Protocoles santé & traçabilité",
      titleLead: "Établissements",
      titleAccent: "de santé",
      text: content.act5Text,
      heroImage: content.images.about,
      features: [
        { icon: "calendar", label: "Planning adapté aux flux patients" },
        { icon: "room", label: "Zones d’attente, cabinets et circulations" },
        { icon: "glass", label: "Désinfection ciblée des surfaces critiques" },
      ],
      gallery: [
        { src: content.images.about, label: "Accueil patients" },
        { src: content.images.blog1, label: "Sanitaires médicaux" },
        { src: content.images.achMain, label: "Circulations" },
        { src: content.images.blog2, label: "Contrôle hygiène" },
      ],
      benefits: [
        { icon: "shield", label: "Hygiène renforcée" },
        { icon: "gear", label: "Protocoles documentés" },
        { icon: "spark", label: "Image soignée de l’établissement" },
        { icon: "heart", label: "Confort patients & soignants" },
      ],
    },
    {
      id: "hotels",
      script: "Une expérience hôtelier premium, chambre après chambre !",
      badge: "Hôtellerie & résidences",
      titleLead: "Hôtels",
      titleAccent: "& résidences",
      text: content.act6Text,
      heroImage: content.images.actHome,
      features: [
        { icon: "home", label: "Remise en état des chambres et suites" },
        { icon: "room", label: "Parties communes et halls d’accueil" },
        { icon: "kitchen", label: "Zones techniques et back-office" },
      ],
      gallery: [
        { src: content.images.actHome, label: "Chambres" },
        { src: content.images.about, label: "Lobby" },
        { src: content.images.achMain, label: "Espaces communs" },
        { src: content.images.blog1, label: "Sanitaires" },
      ],
      benefits: [
        { icon: "spark", label: "Standards hôteliers visibles" },
        { icon: "time", label: "Turnover chambres fluide" },
        { icon: "people", label: "Satisfaction clients" },
        { icon: "heart", label: "Confort des résidents" },
      ],
    },
    {
      id: "ecoles",
      script: "Un campus propre, pour apprendre en toute sérénité !",
      badge: "Éducation & campus",
      titleLead: "Écoles",
      titleAccent: "& universités",
      text: content.act7Text,
      heroImage: content.images.objectif,
      features: [
        { icon: "calendar", label: "Interventions hors temps scolaire" },
        { icon: "room", label: "Salles de classe et amphithéâtres" },
        { icon: "bath", label: "Sanitaires et espaces collectifs" },
      ],
      gallery: [
        { src: content.images.objectif, label: "Salles de classe" },
        { src: content.images.blog2, label: "Couloirs" },
        { src: content.images.about, label: "Bibliothèque" },
        { src: content.images.blog1, label: "Sanitaires" },
      ],
      benefits: [
        { icon: "shield", label: "Cadre sain pour les élèves" },
        { icon: "people", label: "Image de l’établissement" },
        { icon: "gear", label: "Organisation adaptée au calendrier" },
        { icon: "spark", label: "Espaces collectifs accueillants" },
      ],
    },
    {
      id: "espaces-publics",
      script: "Des lieux publics impeccables, à chaque événement !",
      badge: "Salles & lieux de passage",
      titleLead: "Salles",
      titleAccent: "& espaces publics",
      text: content.act8Text,
      heroImage: content.images.actCommerce,
      features: [
        { icon: "calendar", label: "Avant / pendant / après événements" },
        { icon: "room", label: "Halls, salles polyvalentes et circulations" },
        { icon: "glass", label: "Vitrerie et mise en valeur des espaces" },
      ],
      gallery: [
        { src: content.images.actCommerce, label: "Hall d’accueil" },
        { src: content.images.hero, label: "Salle polyvalente" },
        { src: content.images.achMain, label: "Circulations" },
        { src: content.images.blog1, label: "Sanitaires public" },
      ],
      benefits: [
        { icon: "people", label: "Expérience visiteur maîtrisée" },
        { icon: "time", label: "Réactivité événementielle" },
        { icon: "spark", label: "Image institutionnelle soignée" },
        { icon: "chart", label: "Flux mieux absorbés" },
      ],
    },
  ];

  return (
    <>
      <section className="sf-hero act-hero" aria-label="Nos activités">
        <div className="sf-hero__media" aria-hidden>
          <Image
            src={content.images.actOffice}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 30%" }}
          />
          <div className="sf-hero__veil" />
        </div>
        <div className="container sf-hero__grid">
          <div className="sf-hero__copy">
            <p className="sf-kicker">Nos activités</p>
            <h1>{content.actTitle}</h1>
            <p className="sf-hero__lead">{content.actLead}</p>
          </div>
          <p className="sf-script sf-hero__script">
            Des expertises adaptées
            <br />
            à chaque environnement
            <br />
            professionnel&nbsp;!
          </p>
        </div>
      </section>
      <section className="section section--svc">
        <div className="container svc-list">
          {services.map((service) => (
            <ActivityServiceFlyer key={service.id} service={service} />
          ))}
        </div>
      </section>
    </>
  );
}

export function ActivitesPage() {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <ActivitesInner />
    </SiteShell>
  );
}

function TemoignagesInner() {
  const content = useNecsContent();
  return <ConfianceExperience content={content} />;
}

export function TemoignagesPage() {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <TemoignagesInner />
    </SiteShell>
  );
}
