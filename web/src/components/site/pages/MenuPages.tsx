"use client";

import Link from "next/link";
import {
  Media3D,
  PageHero,
  SiteShell,
  useNecsContent,
  useQuoteModal,
} from "@/components/site/SiteShell";
import { CountUpStat } from "@/components/site/CountUpStat";

function PourquoiInner() {
  const content = useNecsContent();
  const { openQuoteModal } = useQuoteModal();
  const pillars = [
    {
      num: "01",
      title: content.why1Title,
      text: content.why1Text,
      detail:
        "Ordres de travail, pointages et supervision terrain pour garantir la ponctualité et la couverture des sites.",
    },
    {
      num: "02",
      title: content.why2Title,
      text: content.why2Text,
      detail:
        "Protocoles documentés, EPI adaptés et contrôles qualité photo pour les sites sensibles et exigeants.",
    },
    {
      num: "03",
      title: content.why3Title,
      text: content.why3Text,
      detail:
        "Devis, contrats, missions, RH et facturation centralisés — une seule source de vérité pour NECS et le client.",
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Pourquoi nous"
        title={content.whyTitle}
        lead={content.whyLead}
        image={content.images.hero}
      />
      <section className="section">
        <div className="container">
          <div className="page-prose">
            <p>
              Choisir NECS, c’est choisir un partenaire camerounais qui traite
              la propreté comme un levier d’image, de sécurité et de performance
              opérationnelle — pas comme une simple prestation répétitive.
            </p>
          </div>
          <div className="why-grid page-why">
            {pillars.map((p) => (
              <article className="why-item" key={p.num}>
                <div className="num">{p.num}</div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
                <p className="page-muted">{p.detail}</p>
              </article>
            ))}
          </div>
          <div className="page-cta-band">
            <div>
              <h2>Prêt à élever le standard de vos sites ?</h2>
              <p>Parlez-nous de vos locaux : nous préparons une proposition claire.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openQuoteModal("Devis - Pourquoi nous")}
            >
              Demander un devis
            </button>
          </div>
        </div>
      </section>
    </>
  );
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
  const { openQuoteModal } = useQuoteModal();
  const cases = [
    {
      title: "Sièges & bureaux",
      text: "Entretien quotidien, vitrerie et zones VIP pour des sièges sociaux à Douala et Yaoundé.",
      img: content.images.actOffice,
    },
    {
      title: "Sites industriels",
      text: "Nettoyage d’ateliers et entrepôts avec consignes HSE et plannings adaptés aux shifts.",
      img: content.images.actIndustry,
    },
    {
      title: "Commerces & malls",
      text: "Propreté continue en horaires d’ouverture, focus sanitaires et parcours client.",
      img: content.images.actCommerce,
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Réalisations"
        title={content.achTitle}
        lead={content.achLead}
        image={content.images.achMain}
      />
      <section className="section">
        <div className="container">
          <div className="stats" style={{ marginTop: 0 }}>
            {[
              [content.stat1Value, content.stat1Label],
              [content.stat2Value, content.stat2Label],
              [content.stat3Value, content.stat3Label],
              [content.stat4Value, content.stat4Label],
            ].map(([v, l]) => (
              <CountUpStat key={l} value={v} label={l} />
            ))}
          </div>
          <div className="section-head" style={{ marginTop: "3rem" }}>
            <div className="eyebrow">Cas types</div>
            <h2>Des environnements exigeants, une même exigence</h2>
          </div>
          <div className="activities">
            {cases.map((c) => (
              <article className="activity" key={c.title}>
                <div style={{ position: "relative" }}>
                  <Media3D src={c.img} alt={c.title} />
                </div>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </article>
            ))}
          </div>
          <div className="page-cta-band" style={{ marginTop: "2.5rem" }}>
            <div>
              <h2>Un projet similaire sur votre site ?</h2>
              <p>Recevez une estimation personnalisée sous 24h.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openQuoteModal("Devis - Réalisations")}
            >
              Demander une étude
            </button>
          </div>
        </div>
      </section>
    </>
  );
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
  const content = useNecsContent();
  const { openQuoteModal } = useQuoteModal();
  const steps = [
    "Digitaliser le cycle prospect → devis → contrat",
    "Standardiser l’exécution terrain et le contrôle qualité",
    "Piloter RH, absences et compétences en temps réel",
    "Fiabiliser facturation, relances et reporting client",
  ];

  return (
    <>
      <PageHero
        eyebrow="Notre objectif"
        title={content.objTitle}
        lead={content.objText}
        image={content.images.objectif}
      />
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Feuille de route</div>
            <h2>Les chantiers prioritaires NECS</h2>
            <p>
              Une organisation où chaque mission laisse une trace claire : qui
              est intervenu, quoi a été fait, quel score qualité, quelle facture.
            </p>
          </div>
          <div className="page-steps">
            {steps.map((s, i) => (
              <article key={s}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <p>{s}</p>
              </article>
            ))}
          </div>
          <div className="page-cta-band">
            <div>
              <h2>Construisons cette ambition avec vous</h2>
              <p>Devenez un site pilote de l’excellence NECS.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openQuoteModal("Vision & partenariat")}
            >
              Parler à un conseiller
            </button>
          </div>
        </div>
      </section>
    </>
  );
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
  const { openQuoteModal } = useQuoteModal();
  const activities = [
    {
      img: content.images.actOffice,
      title: content.act1Title,
      text: content.act1Text,
      points: [
        "Entretien quotidien ou périodique",
        "Sanitaires & salles de réunion",
        "Vitrerie intérieure / zones VIP",
      ],
    },
    {
      img: content.images.actIndustry,
      title: content.act2Title,
      text: content.act2Text,
      points: [
        "Zones techniques & entrepôts",
        "Respect des consignes HSE",
        "Interventions hors production",
      ],
    },
    {
      img: content.images.actCommerce,
      title: content.act3Title,
      text: content.act3Text,
      points: [
        "Flux visiteurs & horaires magasin",
        "Propreté continue en journée",
        "Image de marque & accueil",
      ],
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Nos activités"
        title={content.actTitle}
        lead={content.actLead}
        image={content.images.actOffice}
      />
      <section className="section">
        <div className="container page-activities">
          {activities.map((a) => (
            <article className="page-activity" key={a.title}>
              <div style={{ position: "relative" }}>
                <Media3D src={a.img} alt={a.title} variant="wide" />
              </div>
              <div>
                <h2>{a.title}</h2>
                <p>{a.text}</p>
                <ul className="page-bullets">
                  {a.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => openQuoteModal(`Devis: ${a.title}`)}
                >
                  Demander un devis
                </button>
              </div>
            </article>
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
  const { openQuoteModal } = useQuoteModal();
  const items = [
    [content.t1Text, content.t1Name, content.t1Role, "JO"],
    [content.t2Text, content.t2Name, content.t2Role, "AM"],
    [content.t3Text, content.t3Name, content.t3Role, "PK"],
  ];

  return (
    <>
      <PageHero
        eyebrow="Témoignages"
        title={content.testTitle}
        lead={content.testLead}
        image={content.images.hero}
      />
      <section className="section">
        <div className="container">
          <div className="testimonials page-testimonials">
            {items.map(([text, name, role, av]) => (
              <article className="quote" key={name}>
                <p>{text}</p>
                <footer>
                  <div className="avatar">{av}</div>
                  <div>
                    <strong>{name}</strong>
                    <span>{role}</span>
                  </div>
                </footer>
              </article>
            ))}
          </div>
          <div className="page-cta-band">
            <div>
              <h2>Votre témoignage commence par une première mission</h2>
              <p>Discutons de votre site et de vos priorités qualité.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openQuoteModal("Premier contact - Témoignages")}
            >
              Contactez-nous
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export function TemoignagesPage() {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <TemoignagesInner />
    </SiteShell>
  );
}
