"use client";

import type { ReactNode } from "react";
import {
  SiteShell,
  useNecsContent,
} from "@/components/site/SiteShell";

function LegalLayout({
  kicker,
  title,
  lead,
  children,
}: {
  kicker: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="legal">
      <section className="sf-hero legal-hero" aria-label={title}>
        <div className="container sf-hero__grid">
          <div className="sf-hero__copy">
            <p className="sf-kicker">{kicker}</p>
            <h1>{title}</h1>
            <p className="sf-hero__lead">{lead}</p>
          </div>
        </div>
      </section>
      <section className="legal-body">
        <div className="container legal-body__wrap">{children}</div>
      </section>
    </div>
  );
}

function MentionsInner() {
  return (
    <LegalLayout
      kicker="Informations légales"
      title="Mentions légales"
      lead="Éditeur du site, hébergement et contact de NECLEANING & SERVICES SARL (NECS)."
    >
      <h2>Éditeur du site</h2>
      <p>
        Le site <strong>necs-cm.com</strong> est édité par{" "}
        <strong>NECLEANING & SERVICES SARL</strong>, exerçant sous la marque{" "}
        <strong>NECS</strong>, société au capital social dont le siège et les
        interventions commerciales couvrent principalement Yaoundé, Douala et
        leurs environs (Cameroun).
      </p>
      <p>
        Contact&nbsp;:{" "}
        <a href="mailto:contact@necs-cm.com">contact@necs-cm.com</a>
        <br />
        Téléphone&nbsp;:{" "}
        <a href="tel:+237641335553">+237 641 33 55 53</a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>
        Le directeur de la publication est le représentant légal de NECLEANING
        &amp; SERVICES SARL, joignable aux coordonnées ci-dessus.
      </p>

      <h2>Hébergeur</h2>
      <p>
        Le site est hébergé par <strong>Vercel Inc.</strong>, 440 Terry Avenue
        North, Seattle, WA 98109, États-Unis. Site&nbsp;:{" "}
        <a
          href="https://vercel.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          vercel.com
        </a>
        .
      </p>

      <h2>Activité</h2>
      <p>
        NECS propose des prestations de nettoyage et de facility services pour
        entreprises, commerces, particuliers, établissements de santé et
        scolaires, avec contrôle qualité et reporting digital.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Textes, visuels, logos et éléments graphiques du site sont la propriété
        de NECLEANING &amp; SERVICES SARL ou de ses partenaires, sauf mention
        contraire. Toute reproduction non autorisée est interdite.
      </p>

      <h2>Responsabilité</h2>
      <p>
        Les informations publiées le sont à titre indicatif. NECS s’efforce
        d’en assurer l’exactitude, sans garantie d’exhaustivité. L’utilisation
        du site se fait sous la responsabilité de l’utilisateur.
      </p>
    </LegalLayout>
  );
}

function ConfidentialiteInner() {
  return (
    <LegalLayout
      kicker="Protection des données"
      title="Politique de confidentialité"
      lead="Comment NECS collecte et utilise vos données via le site et les formulaires de devis."
    >
      <h2>Responsable du traitement</h2>
      <p>
        <strong>NECLEANING &amp; SERVICES SARL (NECS)</strong> traite les
        données collectées via le site à des fins de relation commerciale et de
        réponse aux demandes. Contact&nbsp;:{" "}
        <a href="mailto:contact@necs-cm.com">contact@necs-cm.com</a> ·{" "}
        <a href="tel:+237641335553">+237 641 33 55 53</a>.
      </p>

      <h2>Données collectées</h2>
      <p>
        Via le formulaire de devis ou de contact, nous pouvons collecter&nbsp;:
        nom, prénom, entreprise, e-mail, téléphone, objet et description du
        besoin, ainsi que toute information volontairement fournie pour établir
        une proposition.
      </p>

      <h2>Finalités</h2>
      <p>
        Ces données servent uniquement à&nbsp;: traiter votre demande, établir
        un devis, organiser une visite technique éventuelle, et assurer le suivi
        commercial lié à votre projet (Yaoundé, Douala et environs).
      </p>

      <h2>Base et durée</h2>
      <p>
        Le traitement repose sur votre demande (mesures précontractuelles) et,
        le cas échéant, sur notre intérêt légitime à suivre la relation
        commerciale. Les données sont conservées le temps nécessaire au
        traitement de la demande, puis archivées selon les obligations légales
        applicables, avant suppression ou anonymisation.
      </p>

      <h2>Destinataires</h2>
      <p>
        Accès limité aux équipes NECS habilitées. Pas de vente de données à des
        tiers. Des prestataires techniques (hébergement Vercel, messagerie)
        peuvent traiter des données pour le fonctionnement du site, dans le
        cadre de leurs obligations contractuelles.
      </p>

      <h2>Cookies</h2>
      <p>
        Le site utilise des cookies et technologies similaires, organisés en
        catégories&nbsp;:
      </p>
      <ul>
        <li>
          <strong>Nécessaires</strong> — sécurité, fonctionnement et
          mémorisation de vos choix cookies (toujours actifs).
        </li>
        <li>
          <strong>Mesure &amp; attribution</strong> — source / campagne de
          visite pour le suivi des demandes de devis (uniquement avec votre
          accord).
        </li>
        <li>
          <strong>Préférences</strong> — choix d’affichage éventuels pour
          faciliter vos prochaines visites (uniquement avec votre accord).
        </li>
      </ul>
      <p>
        Aucun cookie publicitaire tiers n’est déployé à des fins de ciblage
        commercial sans information préalable. Vous pouvez accepter, refuser
        ou personnaliser ces choix via le bandeau cookies, ou à tout moment
        depuis le lien «&nbsp;Gérer les cookies&nbsp;» en pied de page.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l’accès, la rectification ou la suppression des
        données vous concernant, dans les limites prévues par la réglementation
        applicable, en écrivant à{" "}
        <a href="mailto:contact@necs-cm.com">contact@necs-cm.com</a>.
      </p>

      <h2>Mise à jour</h2>
      <p>
        La présente politique peut être mise à jour pour refléter l’évolution du
        site ou de la réglementation. La version en ligne fait foi.
      </p>
    </LegalLayout>
  );
}

export function MentionsLegalesPage() {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <MentionsInner />
    </SiteShell>
  );
}

export function ConfidentialitePage() {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <ConfidentialiteInner />
    </SiteShell>
  );
}
