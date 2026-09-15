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
