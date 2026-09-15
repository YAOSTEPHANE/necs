/* Auto-généré ; ne pas éditer à la main (relancer _gen_documents_catalog.py) */
import { applyDocEnrichment } from "@/lib/documents-enrichment";

export type FieldKind = "text" | "tel" | "email" | "number" | "date" | "datetime-local" | "month" | "select" | "textarea";

export type DocField = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  full?: boolean;
  options?: string[];
  defaultValue?: string;
  hint?: string;
};

export type DocSection = { title: string; fields: DocField[] };
export type DocRecord = { id: string; label: string; status: string; owner: string; updated: string; amount: string };
export type DocKpi = { label: string; value: string };

export type DocumentDef = {
  id: string;
  slug: string;
  title: string;
  module: string;
  file: string;
  docType: string;
  refPrefix: string;
  subtitle: string;
  note: string;
  domain: "DIG" | "CRM" | "OPS" | "Q" | "RH" | "FIN" | "BI";
  sections: DocSection[];
  checks: string[];
  lineHeaders: string[];
  lineRows: string[][];
  kpis: DocKpi[];
  records: DocRecord[];
  htmlPath: string;
  photoKinds?: { id: string; label: string }[];
};

export const DOCUMENTS: DocumentDef[] = [
  {
    id: "TMP-01",
    slug: "tmp-01",
    title: "Proposition de services",
    module: "CRM / Commercial",
    file: "TMP-01-proposition-services.html",
    docType: "Offre commerciale",
    refPrefix: "NECS-OFF",
    subtitle: "Offre générée depuis l’opportunité et le chiffrage.",
    note: "Préremplissage CRM (opportunité, sites, chiffrage).",
    domain: "CRM",
    htmlPath: "/galerie/templates/TMP-01-proposition-services.html",
    sections: [
      {
        title: "Identification",
        fields: [
          { name: "client", label: "Client / Prospect", kind: "text", required: true },
          { name: "site", label: "Site / Localisation", kind: "text", required: true },
          { name: "contact", label: "Contact principal", kind: "text" },
          { name: "phone", label: "Téléphone", kind: "tel" },
          { name: "email", label: "Email", kind: "email" },
          { name: "opp_ref", label: "Réf. opportunité", kind: "text" },
        ],
      },
      {
        title: "Périmètre",
        fields: [
          { name: "titre", label: "Intitulé de l’offre", kind: "text", required: true, full: true },
          { name: "type_locaux", label: "Type de locaux", kind: "select", required: true, options: ["Bureaux", "Industrie", "Commerce", "Résidentiel", "Santé", "Autre"] },
          { name: "surface", label: "Surface (m²)", kind: "number", required: true },
          { name: "frequence", label: "Fréquence", kind: "select", options: ["Quotidienne", "Hebdomadaire", "Bi-hebdomadaire", "Mensuelle", "Ponctuelle"] },
          { name: "sla", label: "Niveau de service", kind: "select", options: ["Standard", "Premium", "Critique"] },
          { name: "validite", label: "Validité (jours)", kind: "number", defaultValue: "30" },
          { name: "debut", label: "Démarrage indicatif", kind: "date" },
          { name: "methodo", label: "Méthodologie & moyens", kind: "textarea", full: true },
          { name: "equipe", label: "Équipe proposée", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Prestation", "Fréquence", "Effectif", "Unité", "Prix HT"],
    lineRows: [
      ["Nettoyage bureaux", "5j/sem", "3", "Forfait", "450 000"],
      ["Entretien sanitaires", "5j/sem", "1", "Forfait", "120 000"],
      ["Vitrerie intérieure", "Mensuel", "2", "Intervention", "85 000"],
    ],
    kpis: [
    ],
    records: [
      { id: "OFF-0001", label: "Société Exemple SA ; Bureaux", status: "Brouillon", owner: "A. Mbarga", updated: "10/09/2026", amount: "655 000 FCFA" },
      { id: "OFF-0002", label: "Mall Riviera ; Premium", status: "Envoyée", owner: "P. Ngo", updated: "08/09/2026", amount: "2,1 M FCFA" },
    ],
  },
  {
    id: "TMP-02",
    slug: "tmp-02",
    title: "Devis",
    module: "CRM / Finance",
    file: "TMP-02-devis.html",
    docType: "Devis",
    refPrefix: "NECS-DEV",
    subtitle: "Prestations, quantités, prix, périodicité, taxes et conditions.",
    note: "Versions et seuils de validation commerciale.",
    domain: "CRM",
    htmlPath: "/galerie/templates/TMP-02-devis.html",
    sections: [
      {
        title: "Identification",
        fields: [
          { name: "client", label: "Client", kind: "text", required: true },
          { name: "site", label: "Site", kind: "text", required: true },
          { name: "contact", label: "Contact", kind: "text" },
          { name: "phone", label: "Téléphone", kind: "tel" },
          { name: "email", label: "Email", kind: "email" },
          { name: "opp_ref", label: "Réf. opportunité / offre", kind: "text" },
        ],
      },
      {
        title: "Paramètres",
        fields: [
          { name: "date_emis", label: "Date d’émission", kind: "date", required: true },
          { name: "date_valid", label: "Date de validité", kind: "date", required: true },
          { name: "devise", label: "Devise", kind: "select", options: ["FCFA (XAF)", "EUR", "USD"] },
          { name: "paiement", label: "Conditions de paiement", kind: "select", options: ["30 jours net", "45 jours", "Comptant", "Échéancier"] },
          { name: "notes", label: "Notes / conditions", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Désignation", "Qté", "Unité", "P.U. HT", "Périodicité", "Total HT"],
    lineRows: [
      ["Entretien quotidien locaux", "22", "Jour", "25 000", "Mensuel", "550 000"],
      ["Fourniture consommables", "1", "Lot", "75 000", "Mensuel", "75 000"],
    ],
    kpis: [
    ],
    records: [
      { id: "DEV-0142", label: "Société Exemple SA", status: "Envoyé", owner: "A. Mbarga", updated: "09/09/2026", amount: "625 000 FCFA" },
      { id: "DEV-0145", label: "Groupe Atlas", status: "En validation", owner: "Finance", updated: "10/09/2026", amount: "1,45 M FCFA" },
    ],
  },
  {
    id: "TMP-03",
    slug: "tmp-03",
    title: "Bon de commande",
    module: "Commercial / Opérations",
    file: "TMP-03-bon-commande.html",
    docType: "Bon de commande",
    refPrefix: "NECS-BC",
    subtitle: "Prestations commandées liées au devis accepté.",
    note: "Relié devis → contrat → opérations.",
    domain: "CRM",
    htmlPath: "/galerie/templates/TMP-03-bon-commande.html",
    sections: [
      {
        title: "Commande",
        fields: [
          { name: "client", label: "Client", kind: "text", required: true },
          { name: "site", label: "Site", kind: "text", required: true },
          { name: "devis_ref", label: "N° devis lié", kind: "text", required: true },
          { name: "date_cmd", label: "Date de commande", kind: "date", required: true },
          { name: "date_debut", label: "Début souhaité", kind: "date" },
          { name: "priorite", label: "Priorité", kind: "select", options: ["Normale", "Haute", "Urgente"] },
          { name: "conditions", label: "Conditions", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Prestation", "Qté", "Date", "Site", "Statut"],
    lineRows: [
      ["Démarrage entretien bureaux", "1", "01/04/2026", "Siège client", "Validé"],
    ],
    kpis: [
    ],
    records: [
      { id: "BC-0088", label: "Commande démarrage Horizon", status: "Validé", owner: "Ops", updated: "07/09/2026", amount: "—" },
    ],
  },
  {
    id: "TMP-04",
    slug: "tmp-04",
    title: "Bon de livraison / réception",
    module: "Opérations / Logistique",
    file: "TMP-04-bon-livraison.html",
    docType: "Livraison",
    refPrefix: "NECS-BL",
    subtitle: "Consommables livrés, quantités, réception et réserves.",
    note: "Traçabilité stock et réceptions.",
    domain: "OPS",
    htmlPath: "/galerie/templates/TMP-04-bon-livraison.html",
    sections: [
      {
        title: "Livraison",
        fields: [
          { name: "site", label: "Site destinataire", kind: "text", required: true },
          { name: "datetime", label: "Date / heure", kind: "datetime-local", required: true },
          { name: "livreur", label: "Livreur / magasinier", kind: "text" },
          { name: "da_ref", label: "Réf. demande d’achat", kind: "text" },
          { name: "reserves", label: "Réserves / observations", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Article", "Unité", "Qté prévue", "Qté reçue", "État"],
    lineRows: [
      ["Détergent multi-surfaces 5L", "Bidon", "12", "12", "Conforme"],
      ["Sacs poubelle 100L", "Rouleau", "20", "18", "Écart"],
    ],
    kpis: [
    ],
    records: [
      { id: "BL-0211", label: "Livraison Usine Bassa", status: "Écart partiel", owner: "Magasin", updated: "09/09/2026", amount: "—" },
    ],
  },
  {
    id: "TMP-05",
    slug: "tmp-05",
    title: "Contrat de prestation",
    module: "CRM / Juridique / Direction",
    file: "TMP-05-contrat-prestation.html",
    docType: "Contrat client",
    refPrefix: "NECS-CTR",
    subtitle: "Parties, périmètre, SLA, prix, durée et signatures.",
    note: "Toute modification doit passer par un avenant.",
    domain: "CRM",
    htmlPath: "/galerie/templates/TMP-05-contrat-prestation.html",
    sections: [
      {
        title: "Parties",
        fields: [
          { name: "client", label: "Client (raison sociale)", kind: "text", required: true },
          { name: "rccm", label: "RCCM / Identifiant", kind: "text" },
          { name: "rep_client", label: "Représentant client", kind: "text" },
          { name: "rep_necs", label: "Représentant NECS", kind: "text", defaultValue: "Direction Générale" },
          { name: "objet", label: "Objet du contrat", kind: "textarea", required: true, full: true, defaultValue: "Prestation de services de nettoyage et d’entretien des locaux désignés." },
        ],
      },
      {
        title: "Périmètre & SLA",
        fields: [
          { name: "sites", label: "Sites couverts", kind: "text", required: true },
          { name: "effectif", label: "Effectif contractuel", kind: "number" },
          { name: "frequence", label: "Fréquence", kind: "text" },
          { name: "sla", label: "Niveau SLA", kind: "select", options: ["Standard", "Premium", "Critique"] },
          { name: "duree", label: "Durée (mois)", kind: "number", defaultValue: "12" },
          { name: "renouvellement", label: "Renouvellement", kind: "select", options: ["Tacite", "Express", "Sans"] },
          { name: "effet", label: "Date d’effet", kind: "date", required: true },
          { name: "fin", label: "Date de fin", kind: "date" },
          { name: "clauses", label: "Clauses clés", kind: "textarea", full: true },
          { name: "prix", label: "Prix & facturation", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "CTR-0034", label: "Société Exemple SA", status: "Actif", owner: "Direction", updated: "01/04/2026", amount: "847 000 / mois" },
      { id: "CTR-0028", label: "Groupe Atlas", status: "Actif", owner: "Commercial", updated: "15/01/2026", amount: "1,32 M / mois" },
    ],
  },
  {
    id: "TMP-06",
    slug: "tmp-06",
    title: "Avenant au contrat",
    module: "CRM / Direction",
    file: "TMP-06-avenant-contrat.html",
    docType: "Avenant",
    refPrefix: "NECS-AVN",
    subtitle: "Modification de périmètre, tarif, durée ou effectifs.",
    note: "Historique des versions conservé.",
    domain: "CRM",
    htmlPath: "/galerie/templates/TMP-06-avenant-contrat.html",
    sections: [
      {
        title: "Références",
        fields: [
          { name: "contrat_ref", label: "Contrat initial", kind: "text", required: true, defaultValue: "NECS-CTR-2026-0034" },
          { name: "avenant_no", label: "N° d’avenant", kind: "text", defaultValue: "01" },
          { name: "effet", label: "Date d’effet", kind: "date", required: true },
          { name: "type_mod", label: "Type de modification", kind: "select", required: true, options: ["Périmètre", "Tarif", "Durée", "Effectifs", "Prestations", "Mixte"] },
          { name: "description", label: "Description", kind: "textarea", required: true, full: true },
          { name: "impact", label: "Impact financier HT", kind: "number" },
          { name: "justif", label: "Justification", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "AVN-0007", label: "Avenant #01 ; CTR-0034", status: "Brouillon", owner: "Direction", updated: "05/09/2026", amount: "+120 000" },
    ],
  },
  {
    id: "TMP-07",
    slug: "tmp-07",
    title: "Contrat / document agent",
    module: "RH",
    file: "TMP-07-contrat-agent.html",
    docType: "RH ; Contrat",
    refPrefix: "NECS-RH-CTR",
    subtitle: "Document contractuel collaborateur.",
    note: "Accès restreint RH.",
    domain: "RH",
    htmlPath: "/galerie/templates/TMP-07-contrat-agent.html",
    sections: [
      {
        title: "Collaborateur",
        fields: [
          { name: "nom", label: "Nom & prénoms", kind: "text", required: true },
          { name: "matricule", label: "Matricule", kind: "text" },
          { name: "poste", label: "Poste", kind: "text", defaultValue: "Agent d’entretien" },
          { name: "type", label: "Type de contrat", kind: "select", options: ["CDI", "CDD", "Intérim", "Stage"] },
          { name: "embauche", label: "Date d’embauche", kind: "date" },
          { name: "site", label: "Site d’affectation", kind: "text" },
          { name: "horaires", label: "Horaires", kind: "text" },
          { name: "remu", label: "Rémunération / conditions", kind: "textarea", full: true },
          { name: "obligations", label: "Obligations & confidentialité", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "RH-CTR-019", label: "Grace Embolo ; Agent", status: "À signer", owner: "RH", updated: "09/09/2026", amount: "—" },
    ],
  },
  {
    id: "TMP-08",
    slug: "tmp-08",
    title: "Fiche de poste agent",
    module: "RH",
    file: "TMP-08-fiche-poste.html",
    docType: "Fiche de poste",
    refPrefix: "NECS-RH-FP",
    subtitle: "Mission, responsabilités, compétences et performance.",
    note: "Modèle administrable.",
    domain: "RH",
    htmlPath: "/galerie/templates/TMP-08-fiche-poste.html",
    sections: [
      {
        title: "Poste",
        fields: [
          { name: "intitule", label: "Intitulé", kind: "text", required: true, defaultValue: "Agent d’entretien" },
          { name: "nplus1", label: "Rattachement", kind: "text", defaultValue: "Superviseur de site" },
          { name: "horaires", label: "Horaires types", kind: "text" },
          { name: "lieu", label: "Lieu d’exercice", kind: "text" },
          { name: "mission", label: "Mission principale", kind: "textarea", required: true, full: true },
          { name: "resp", label: "Responsabilités", kind: "textarea", full: true },
          { name: "competences", label: "Compétences", kind: "textarea", full: true },
          { name: "securite", label: "Sécurité / EPI", kind: "textarea", full: true },
          { name: "perf", label: "Critères de performance", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "FP-AE-01", label: "Agent d’entretien", status: "Validée", owner: "RH", updated: "01/08/2026", amount: "—" },
      { id: "FP-CE-01", label: "Chef d’équipe", status: "Validée", owner: "RH", updated: "01/08/2026", amount: "—" },
    ],
  },
  {
    id: "TMP-09",
    slug: "tmp-09",
    title: "Dossier d’embauche",
    module: "RH",
    file: "TMP-09-dossier-embauche.html",
    docType: "Checklist RH",
    refPrefix: "NECS-RH-DE",
    subtitle: "Pièces obligatoires et statut du dossier.",
    note: "Suivi des pièces manquantes ou expirées.",
    domain: "RH",
    htmlPath: "/galerie/templates/TMP-09-dossier-embauche.html",
    sections: [
      {
        title: "Candidat",
        fields: [
          { name: "nom", label: "Nom & prénoms", kind: "text", required: true },
          { name: "poste", label: "Poste visé", kind: "text" },
          { name: "debut", label: "Démarrage prévu", kind: "date" },
          { name: "rh", label: "Responsable RH", kind: "text" },
          { name: "statut", label: "Statut dossier", kind: "select", options: ["Incomplet", "Complet", "Validé", "Bloqué"] },
          { name: "obs", label: "Commentaires RH", kind: "textarea", full: true },
        ],
      },
    ],
    checks: ["Pièce d’identité en cours de validité", "CV actualisé", "Certificat de travail / références", "Photo d’identité", "RIB / informations bancaires", "Attestation de domicile", "Certificat médical d’aptitude", "Documents contractuels signés", "Casier judiciaire (si requis)", "Autorisation de travail (si applicable)"],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "DE-055", label: "Linda Fouda", status: "Complet", owner: "RH", updated: "08/09/2026", amount: "—" },
      { id: "DE-056", label: "Boris Manga", status: "Incomplet", owner: "RH", updated: "10/09/2026", amount: "—" },
    ],
  },
  {
    id: "TMP-10",
    slug: "tmp-10",
    title: "Entretien / évaluation candidat",
    module: "RH",
    file: "TMP-10-entretien-candidat.html",
    docType: "Évaluation",
    refPrefix: "NECS-RH-ENT",
    subtitle: "Critères d’évaluation et décision recrutement.",
    note: "Parcours candidat historisé.",
    domain: "RH",
    htmlPath: "/galerie/templates/TMP-10-entretien-candidat.html",
    sections: [
      {
        title: "Candidat",
        fields: [
          { name: "nom", label: "Nom & prénoms", kind: "text", required: true },
          { name: "poste", label: "Poste", kind: "text", defaultValue: "Agent d’entretien" },
          { name: "date", label: "Date entretien", kind: "date", required: true },
          { name: "interviewer", label: "Interviewer", kind: "text", required: true },
          { name: "source", label: "Source", kind: "select", options: ["Site web", "Facebook", "Cooptation", "Agence", "Spontané"] },
        ],
      },
      {
        title: "Décision",
        fields: [
          { name: "score", label: "Score global /5", kind: "number" },
          { name: "apprec", label: "Appréciation", kind: "textarea", full: true },
          { name: "decision", label: "Décision", kind: "select", required: true, options: ["Retenu", "Liste d’attente", "Refusé", "À revoir"] },
          { name: "next", label: "Prochaine étape", kind: "select", options: ["Essai terrain", "Contrat", "Complément dossier", "Clôture"] },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "ENT-102", label: "Grace Embolo", status: "Retenu", owner: "RH", updated: "06/09/2026", amount: "4/5" },
      { id: "ENT-103", label: "Boris Manga", status: "En cours", owner: "RH", updated: "09/09/2026", amount: "—" },
    ],
  },
  {
    id: "TMP-11",
    slug: "tmp-11",
    title: "Checklist / onboarding",
    module: "RH / Opérations",
    file: "TMP-11-onboarding.html",
    docType: "Intégration",
    refPrefix: "NECS-RH-ONB",
    subtitle: "Intégration collaborateur jusqu’à validation.",
    note: "Fin d’intégration formalisée.",
    domain: "RH",
    htmlPath: "/galerie/templates/TMP-11-onboarding.html",
    sections: [
      {
        title: "Collaborateur",
        fields: [
          { name: "nom", label: "Nom", kind: "text", required: true },
          { name: "site", label: "Site d’affectation", kind: "text", required: true },
          { name: "date", label: "Date d’intégration", kind: "date" },
          { name: "manager", label: "Manager", kind: "text" },
        ],
      },
    ],
    checks: ["Dossier RH complet et validé", "Contrat / documents signés", "Remise uniforme / EPI", "Dotation matériel de base", "Création accès application (pointage)", "Formation consignes sécurité", "Formation consignes site client", "Présentation équipe / superviseur", "Affectation planning confirmée", "Validation fin d’intégration"],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "ONB-033", label: "Intégration Immeuble Horizon", status: "En cours", owner: "RH", updated: "10/09/2026", amount: "7/10" },
    ],
  },
  {
    id: "TMP-12",
    slug: "tmp-12",
    title: "Ordre de travail",
    module: "Opérations",
    file: "TMP-12-ordre-travail.html",
    docType: "Intervention",
    refPrefix: "NECS-OT",
    subtitle: "Mission, agents, consignes, preuves d’exécution.",
    note: "Traçabilité des ordres de travail.",
    domain: "OPS",
    htmlPath: "/galerie/templates/TMP-12-ordre-travail.html",
    sections: [
      {
        title: "Mission",
        fields: [
          { name: "site", label: "Site", kind: "text", required: true },
          { name: "client", label: "Client", kind: "text", required: true },
          { name: "date", label: "Date", kind: "date", required: true },
          { name: "creneau", label: "Créneau", kind: "text", defaultValue: "06:00 – 14:00" },
          { name: "superviseur", label: "Superviseur", kind: "text" },
          { name: "statut", label: "Statut", kind: "select", options: ["Planifié", "En cours", "Terminé", "Anomalie"] },
          { name: "consignes", label: "Consignes", kind: "textarea", full: true },
          { name: "materiel", label: "Matériel requis", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Agent", "Rôle", "Arrivée", "Départ", "Preuve"],
    lineRows: [
      ["A. Kouam", "Chef d’équipe", "06:02", "14:05", "Photo"],
      ["M. Ngo", "Agent", "06:18", "—", "Photo"],
    ],
    kpis: [
    ],
    records: [
      { id: "OT-1440", label: "Immeuble Horizon ; quotidien", status: "En cours", owner: "S. Ndjock", updated: "10/09/2026", amount: "4 agents" },
      { id: "OT-1441", label: "Usine Bassa ; atelier", status: "Planifié", owner: "S. Ndjock", updated: "10/09/2026", amount: "6 agents" },
    ],
  },
  {
    id: "TMP-13",
    slug: "tmp-13",
    title: "Fiche de contrôle qualité",
    module: "Qualité",
    file: "TMP-13-controle-qualite.html",
    docType: "Qualité",
    refPrefix: "NECS-QA",
    subtitle: "Notation, NC, actions correctives et photos.",
    note: "Contrôle qualité terrain (mobile).",
    domain: "Q",
    htmlPath: "/galerie/templates/TMP-13-controle-qualite.html",
    sections: [
      {
        title: "Contexte",
        fields: [
          { name: "site", label: "Site", kind: "text", required: true },
          { name: "prestation", label: "Prestation contrôlée", kind: "text", required: true },
          { name: "datetime", label: "Date / heure", kind: "datetime-local", required: true },
          { name: "controleur", label: "Contrôleur", kind: "text", required: true },
          { name: "score", label: "Score /100", kind: "number", defaultValue: "0" },
          { name: "seuil", label: "Seuil minimal", kind: "number", defaultValue: "80" },
        ],
      },
      {
        title: "Écarts",
        fields: [
          { name: "ecarts", label: "Écarts constatés", kind: "textarea", full: true },
          { name: "actions", label: "Actions correctives", kind: "textarea", full: true },
          { name: "echeance", label: "Échéance", kind: "date" },
          { name: "resp_action", label: "Responsable action", kind: "text" },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "QA-278", label: "Immeuble Horizon", status: "Conforme", owner: "Qualité", updated: "09/09/2026", amount: "92/100" },
      { id: "QA-279", label: "Mall Riviera", status: "Non conforme", owner: "Qualité", updated: "09/09/2026", amount: "78/100" },
    ],
  },
  {
    id: "TMP-14",
    slug: "tmp-14",
    title: "Rapport de prestation",
    module: "Opérations / Qualité",
    file: "TMP-14-rapport-prestation.html",
    docType: "Rapport site",
    refPrefix: "NECS-RP",
    subtitle: "Synthèse prestations, incidents et recommandations.",
    note: "Alimente BI opérations / qualité.",
    domain: "OPS",
    htmlPath: "/galerie/templates/TMP-14-rapport-prestation.html",
    sections: [
      {
        title: "Période & site",
        fields: [
          { name: "client", label: "Client", kind: "text", required: true },
          { name: "site", label: "Site", kind: "text", required: true },
          { name: "debut", label: "Du", kind: "date", required: true },
          { name: "fin", label: "Au", kind: "date", required: true },
        ],
      },
      {
        title: "Synthèse",
        fields: [
          { name: "prestations", label: "Prestations réalisées", kind: "textarea", full: true },
          { name: "incidents", label: "Incidents / réclamations", kind: "textarea", full: true },
          { name: "controles", label: "Contrôles", kind: "textarea", full: true },
          { name: "reco", label: "Recommandations", kind: "textarea", full: true },
          { name: "actions", label: "Actions à suivre", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
      { label: "Prestations", value: "22" },
      { label: "Effectif moyen", value: "4" },
      { label: "Score qualité", value: "91%" },
      { label: "Incidents", value: "1" },
    ],
    records: [
      { id: "RP-0061", label: "Rapport site Horizon ; Août", status: "Publié", owner: "Ops", updated: "02/09/2026", amount: "91% qualité" },
    ],
  },
  {
    id: "TMP-15",
    slug: "tmp-15",
    title: "Demande d’achat",
    module: "Opérations / Achats",
    file: "TMP-15-demande-achat.html",
    docType: "Achat interne",
    refPrefix: "NECS-DA",
    subtitle: "Demande articles / consommables avec validation.",
    note: "Workflow d’approbation des achats.",
    domain: "OPS",
    htmlPath: "/galerie/templates/TMP-15-demande-achat.html",
    sections: [
      {
        title: "Demande",
        fields: [
          { name: "demandeur", label: "Demandeur", kind: "text", required: true },
          { name: "site", label: "Site", kind: "text", required: true },
          { name: "date_besoin", label: "Date besoin", kind: "date" },
          { name: "fournisseur", label: "Fournisseur proposé", kind: "text" },
          { name: "justif", label: "Justification", kind: "textarea", required: true, full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Article", "Qté", "Unité", "Estimation", "Urgence"],
    lineRows: [
      ["Serpillères microfibre", "30", "Pce", "45 000", "Normale"],
      ["Gants nitrile", "100", "Paire", "28 000", "Haute"],
    ],
    kpis: [
    ],
    records: [
      { id: "DA-0199", label: "Consommables Horizon", status: "En validation", owner: "Ops", updated: "09/09/2026", amount: "73 000 FCFA" },
    ],
  },
  {
    id: "TMP-16",
    slug: "tmp-16",
    title: "Demande de congé",
    module: "RH",
    file: "TMP-16-demande-conge.html",
    docType: "Absence",
    refPrefix: "NECS-RH-ABS",
    subtitle: "Congé / absence et impact planning.",
    note: "Impact sur le planning RH et opérations.",
    domain: "RH",
    htmlPath: "/galerie/templates/TMP-16-demande-conge.html",
    sections: [
      {
        title: "Demande",
        fields: [
          { name: "collab", label: "Collaborateur", kind: "text", required: true },
          { name: "matricule", label: "Matricule", kind: "text" },
          { name: "type", label: "Type", kind: "select", required: true, options: ["Congé payé", "Permission", "Maladie", "Autre"] },
          { name: "debut", label: "Du", kind: "date", required: true },
          { name: "fin", label: "Au", kind: "date", required: true },
          { name: "jours", label: "Nombre de jours", kind: "number" },
          { name: "motif", label: "Motif", kind: "textarea", full: true },
          { name: "remplacant", label: "Remplaçant proposé", kind: "text" },
          { name: "impact", label: "Impact planning", kind: "text", defaultValue: "À calculer automatiquement" },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "ABS-411", label: "A. Kouam ; Congé", status: "En validation", owner: "Manager", updated: "08/09/2026", amount: "3 j" },
    ],
  },
  {
    id: "TMP-17",
    slug: "tmp-17",
    title: "Fiche de pointage",
    module: "Opérations / RH",
    file: "TMP-17-pointage.html",
    docType: "Présence",
    refPrefix: "NECS-PTG",
    subtitle: "Arrivée / départ, anomalies et validation.",
    note: "Contrôle anti-double-pointage.",
    domain: "OPS",
    htmlPath: "/galerie/templates/TMP-17-pointage.html",
    sections: [
      {
        title: "Contexte",
        fields: [
          { name: "agent", label: "Agent", kind: "text", required: true },
          { name: "site", label: "Site", kind: "text", required: true },
          { name: "date", label: "Date", kind: "date", required: true },
          { name: "planning", label: "Planning prévu", kind: "text", defaultValue: "06:00 – 14:00" },
          { name: "commentaire", label: "Commentaire superviseur", kind: "textarea", full: true },
          { name: "statut", label: "Statut validation", kind: "select", options: ["À valider", "Validé", "Rejeté", "Corrigé"] },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Type", "Heure", "Mode", "Géo", "Anomalie"],
    lineRows: [
      ["Arrivée", "06:02", "Mobile", "OK", "Aucune"],
      ["Départ", "14:05", "Mobile", "OK", "Aucune"],
    ],
    kpis: [
    ],
    records: [
      { id: "PTG-9001", label: "A. Kouam ; 10/09", status: "Validé", owner: "Superviseur", updated: "10/09/2026", amount: "08:03" },
      { id: "PTG-9002", label: "M. Ngo ; 10/09", status: "Anomalie retard", owner: "Superviseur", updated: "10/09/2026", amount: "—" },
    ],
  },
  {
    id: "TMP-18",
    slug: "tmp-18",
    title: "Préfacture",
    module: "Finance / Opérations",
    file: "TMP-18-prefacture.html",
    docType: "Préfacturation",
    refPrefix: "NECS-PF",
    subtitle: "État des prestations facturables avant facture.",
    note: "Rapprochement préfacture / facture.",
    domain: "FIN",
    htmlPath: "/galerie/templates/TMP-18-prefacture.html",
    sections: [
      {
        title: "Cadre",
        fields: [
          { name: "client", label: "Client", kind: "text", required: true },
          { name: "contrat", label: "Contrat", kind: "text", required: true },
          { name: "debut", label: "Période du", kind: "date", required: true },
          { name: "fin", label: "au", kind: "date", required: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Prestation", "Prévu", "Réalisé", "Écart", "Ajustement", "Montant"],
    lineRows: [
      ["Entretien quotidien", "22", "21", "-1", "0", "525 000"],
      ["Consommables", "1", "1", "0", "0", "75 000"],
    ],
    kpis: [
    ],
    records: [
      { id: "PF-0112", label: "CTR-0034 ; Mars 2026", status: "Validée", owner: "Finance", updated: "02/04/2026", amount: "600 000 FCFA" },
      { id: "PF-0113", label: "CTR-0028 ; Mars 2026", status: "En contrôle", owner: "Ops", updated: "03/04/2026", amount: "1,32 M FCFA" },
    ],
  },
  {
    id: "TMP-19",
    slug: "tmp-19",
    title: "Facture",
    module: "Finance",
    file: "TMP-19-facture.html",
    docType: "Facture",
    refPrefix: "NECS-FAC",
    subtitle: "Facture client avec échéance et modalités.",
    note: "Numérotation et gestion des avoirs.",
    domain: "FIN",
    htmlPath: "/galerie/templates/TMP-19-facture.html",
    sections: [
      {
        title: "Facturation",
        fields: [
          { name: "client", label: "Client", kind: "text", required: true },
          { name: "contrat", label: "N° contrat", kind: "text" },
          { name: "periode", label: "Période facturée", kind: "text" },
          { name: "date_fac", label: "Date facture", kind: "date", required: true },
          { name: "echeance", label: "Échéance", kind: "date", required: true },
          { name: "modalites", label: "Modalités", kind: "text", defaultValue: "Virement ; 30 jours" },
          { name: "banque", label: "Banque / compte", kind: "textarea", full: true },
          { name: "ref_paiement", label: "Référence à rappeler", kind: "text" },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Désignation", "Qté", "P.U. HT", "Total HT"],
    lineRows: [
      ["Prestations de nettoyage ; Mars 2026", "1", "600 000", "600 000"],
    ],
    kpis: [
    ],
    records: [
      { id: "FAC-0450", label: "Société Exemple SA ; Mars", status: "Émise", owner: "Finance", updated: "05/04/2026", amount: "847 000 FCFA" },
      { id: "FAC-0441", label: "Mall Riviera ; Fév", status: "En recouvrement", owner: "Recouvrement", updated: "10/09/2026", amount: "2,05 M FCFA" },
    ],
  },
  {
    id: "TMP-20",
    slug: "tmp-20",
    title: "Avoir",
    module: "Finance",
    file: "TMP-20-avoir.html",
    docType: "Avoir",
    refPrefix: "NECS-AVO",
    subtitle: "Avoir lié à une facture initiale.",
    note: "Versionnement des documents validés.",
    domain: "FIN",
    htmlPath: "/galerie/templates/TMP-20-avoir.html",
    sections: [
      {
        title: "Avoir",
        fields: [
          { name: "facture_ref", label: "Facture initiale", kind: "text", required: true, defaultValue: "NECS-FAC-2026-0450" },
          { name: "date", label: "Date avoir", kind: "date", required: true },
          { name: "motif", label: "Motif", kind: "textarea", required: true, full: true },
          { name: "montant", label: "Montant HT", kind: "number", required: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Ligne", "Qté", "Montant"],
    lineRows: [
      ["Ajustement prestation J21 non réalisée", "1", "25 000"],
    ],
    kpis: [
    ],
    records: [
      { id: "AVO-0015", label: "Ajustement FAC-0450", status: "Émis", owner: "Finance", updated: "08/04/2026", amount: "25 000 FCFA" },
    ],
  },
  {
    id: "TMP-21",
    slug: "tmp-21",
    title: "Relevé de compte client",
    module: "Finance",
    file: "TMP-21-releve-compte.html",
    docType: "Compte client",
    refPrefix: "NECS-RC",
    subtitle: "Factures, avoirs, règlements et solde.",
    note: "Solde après rapprochement.",
    domain: "FIN",
    htmlPath: "/galerie/templates/TMP-21-releve-compte.html",
    sections: [
      {
        title: "Client",
        fields: [
          { name: "client", label: "Client", kind: "text", required: true },
          { name: "debut", label: "Période du", kind: "date" },
          { name: "fin", label: "au", kind: "date" },
          { name: "solde", label: "Solde actuel", kind: "text", defaultValue: "175 000 FCFA" },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Date", "Pièce", "Libellé", "Débit", "Crédit", "Solde"],
    lineRows: [
      ["01/03/2026", "FAC-0450", "Facture mars", "600 000", "—", "600 000"],
      ["05/03/2026", "AVO-0015", "Avoir", "—", "25 000", "575 000"],
      ["20/03/2026", "ENC-330", "Règlement", "—", "400 000", "175 000"],
    ],
    kpis: [
    ],
    records: [
      { id: "RC-008", label: "Relevé Société Exemple SA", status: "Émis", owner: "Finance", updated: "01/04/2026", amount: "175 000 FCFA" },
    ],
  },
  {
    id: "TMP-22",
    slug: "tmp-22",
    title: "Lettre / email de relance",
    module: "Finance / Recouvrement",
    file: "TMP-22-relance-client.html",
    docType: "Relance",
    refPrefix: "NECS-REL",
    subtitle: "Relance amiable à escalade direction.",
    note: "Scénarios de relance client.",
    domain: "FIN",
    htmlPath: "/galerie/templates/TMP-22-relance-client.html",
    sections: [
      {
        title: "Relance",
        fields: [
          { name: "client", label: "Client", kind: "text", required: true },
          { name: "niveau", label: "Niveau", kind: "select", required: true, options: ["R1 ; Amiable", "R2 ; Fermeté", "R3 ; Mise en demeure", "R4 ; Escalade direction"] },
          { name: "canal", label: "Canal", kind: "select", options: ["Email", "Courrier", "Appel + email"] },
          { name: "date", label: "Date d’envoi", kind: "date" },
          { name: "objet", label: "Objet", kind: "text", full: true, defaultValue: "Relance de paiement ; factures échues" },
          { name: "corps", label: "Corps du message", kind: "textarea", required: true, full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: ["Facture", "Échéance", "Montant dû", "Jours de retard"],
    lineRows: [
      ["NECS-FAC-2026-0441", "05/03/2026", "2 050 000", "189"],
    ],
    kpis: [
    ],
    records: [
      { id: "REL-0077", label: "Relance R2 ; Mall Riviera", status: "Envoyée", owner: "Recouvrement", updated: "09/09/2026", amount: "2,05 M FCFA" },
    ],
  },
  {
    id: "TMP-23",
    slug: "tmp-23",
    title: "Accusé de réception",
    module: "CRM / Finance",
    file: "TMP-23-accuse-reception.html",
    docType: "Preuve transmission",
    refPrefix: "NECS-AR",
    subtitle: "Preuve d’envoi / réception de documents.",
    note: "Traçabilité des transmissions.",
    domain: "CRM",
    htmlPath: "/galerie/templates/TMP-23-accuse-reception.html",
    sections: [
      {
        title: "Transmission",
        fields: [
          { name: "document", label: "Document transmis", kind: "text", required: true },
          { name: "ref_doc", label: "Référence document", kind: "text", required: true },
          { name: "destinataire", label: "Destinataire", kind: "text", required: true },
          { name: "canal", label: "Canal", kind: "select", options: ["Email", "Portail client", "Remise en main propre", "Courrier"] },
          { name: "datetime", label: "Date / heure", kind: "datetime-local", required: true },
          { name: "statut", label: "Statut", kind: "select", options: ["Envoyé", "Reçu", "Ouvert", "Échec"] },
          { name: "preuve", label: "Preuve / ID technique", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "AR-0502", label: "AR devis DEV-0142", status: "Ouvert", owner: "Commercial", updated: "09/09/2026", amount: "—" },
    ],
  },
  {
    id: "TMP-24",
    slug: "tmp-24",
    title: "Rapport mensuel de performance",
    module: "Direction / Qualité / Ops",
    file: "TMP-24-rapport-mensuel.html",
    docType: "Performance",
    refPrefix: "NECS-RM",
    subtitle: "KPI mensuels client / sites.",
    note: "Pilotage direction + restitution client.",
    domain: "BI",
    htmlPath: "/galerie/templates/TMP-24-rapport-mensuel.html",
    sections: [
      {
        title: "Périmètre",
        fields: [
          { name: "client", label: "Client", kind: "text", required: true },
          { name: "mois", label: "Mois", kind: "month", required: true },
          { name: "sites", label: "Sites inclus", kind: "text" },
          { name: "redacteur", label: "Rédacteur", kind: "text" },
        ],
      },
      {
        title: "Analyse",
        fields: [
          { name: "prestations", label: "Synthèse prestations", kind: "textarea", full: true },
          { name: "qualite", label: "Qualité & contrôles", kind: "textarea", full: true },
          { name: "incidents", label: "Incidents / réclamations", kind: "textarea", full: true },
          { name: "actions", label: "Actions & recommandations", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
      { label: "Taux réalisation", value: "98%" },
      { label: "Qualité moyenne", value: "92/100" },
      { label: "Réclamations", value: "2" },
      { label: "Actions closes", value: "5/6" },
    ],
    records: [
      { id: "RM-2026-03", label: "Performance Mars ; Exemple SA", status: "Publié", owner: "Direction", updated: "05/04/2026", amount: "92/100" },
    ],
  },
  {
    id: "TMP-25",
    slug: "tmp-25",
    title: "Rapport audit / visite technique",
    module: "Commercial / Qualité",
    file: "TMP-25-visite-technique.html",
    docType: "Visite technique",
    refPrefix: "NECS-VT",
    subtitle: "Constats, mesures, risques et recommandations.",
    note: "Exploitable pour le chiffrage commercial.",
    domain: "CRM",
    htmlPath: "/galerie/templates/TMP-25-visite-technique.html",
    sections: [
      {
        title: "Visite",
        fields: [
          { name: "client", label: "Prospect / Client", kind: "text", required: true },
          { name: "site", label: "Site visité", kind: "text", required: true },
          { name: "datetime", label: "Date / heure", kind: "datetime-local", required: true },
          { name: "auditeur", label: "Auditeur", kind: "text", required: true },
          { name: "surface", label: "Surface (m²)", kind: "number" },
          { name: "type_locaux", label: "Type de locaux", kind: "select", options: ["Bureaux", "Industrie", "Commerce", "Santé", "Autre"] },
        ],
      },
      {
        title: "Constats",
        fields: [
          { name: "zones", label: "Zones / contraintes", kind: "textarea", full: true },
          { name: "risques", label: "Risques", kind: "textarea", full: true },
          { name: "besoins", label: "Besoins exprimés", kind: "textarea", full: true },
          { name: "reco", label: "Recommandations", kind: "textarea", full: true },
          { name: "actions", label: "Prochaines étapes", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "VT-0188", label: "Visite Groupe Atlas", status: "Validé", owner: "P. Ngo", updated: "04/09/2026", amount: "2 400 m²" },
    ],
  },
  {
    id: "DIG-01",
    slug: "dig-01",
    title: "Demande de devis (site web)",
    module: "Marketing digital",
    file: "DIG-01-demande-devis.html",
    docType: "Lead web",
    refPrefix: "NECS-WEB-DEVIS",
    subtitle: "Formulaire site → lead CRM automatique.",
    note: "Déduplication des leads et gestion du consentement.",
    domain: "DIG",
    htmlPath: "/galerie/templates/DIG-01-demande-devis.html",
    sections: [
      {
        title: "Coordonnées",
        fields: [
          { name: "nom", label: "Nom complet", kind: "text", required: true },
          { name: "entreprise", label: "Entreprise", kind: "text", required: true },
          { name: "email", label: "Email", kind: "email", required: true },
          { name: "tel", label: "Téléphone", kind: "tel", required: true },
          { name: "ville", label: "Ville", kind: "text" },
          { name: "source", label: "Source", kind: "text", defaultValue: "Site web ; formulaire devis" },
        ],
      },
      {
        title: "Besoin",
        fields: [
          { name: "type", label: "Type de locaux", kind: "select", required: true, options: ["Bureaux", "Commerce", "Industrie", "Résidentiel", "Autre"] },
          { name: "surface", label: "Surface approx. (m²)", kind: "number" },
          { name: "frequence", label: "Fréquence", kind: "select", options: ["Quotidienne", "Hebdomadaire", "Mensuelle", "Ponctuelle"] },
          { name: "delai", label: "Délai", kind: "select", options: ["Urgent (< 7j)", "Sous 30 jours", "À planifier"] },
          { name: "besoin", label: "Description", kind: "textarea", required: true, full: true },
        ],
      },
      {
        title: "Consentement",
        fields: [
          { name: "consent", label: "Consentement contact", kind: "select", required: true, full: true, options: ["Oui", "Non"] },
          { name: "prefs", label: "Préférences", kind: "select", options: ["Email", "Téléphone", "WhatsApp", "Email + Téléphone"] },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "LEAD-2401", label: "Société Horizon SA", status: "Nouveau", owner: "Commercial", updated: "10/09/2026", amount: "SLA 2h" },
      { id: "LEAD-2402", label: "Boutique Klaris", status: "Qualifié", owner: "Commercial", updated: "09/09/2026", amount: "OK" },
    ],
  },
  {
    id: "DIG-02",
    slug: "dig-02",
    title: "Contact (site web)",
    module: "Marketing digital",
    file: "DIG-02-contact.html",
    docType: "Contact",
    refPrefix: "NECS-WEB-CONTACT",
    subtitle: "Message digital → lead / tâche / ticket.",
    note: "Affectation commerciale et suivi des SLA.",
    domain: "DIG",
    htmlPath: "/galerie/templates/DIG-02-contact.html",
    sections: [
      {
        title: "Message",
        fields: [
          { name: "nom", label: "Nom", kind: "text", required: true },
          { name: "email", label: "Email", kind: "email", required: true },
          { name: "tel", label: "Téléphone", kind: "tel" },
          { name: "sujet", label: "Sujet", kind: "select", required: true, options: ["Information", "Devis", "Réclamation", "Partenariat", "Autre"] },
          { name: "message", label: "Message", kind: "textarea", required: true, full: true },
          { name: "consent", label: "Consentement", kind: "select", required: true, options: ["Oui", "Non"] },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "LEAD-2403", label: "Clinique Les Palmiers", status: "À rappeler", owner: "Service client", updated: "09/09/2026", amount: "Retard SLA" },
    ],
  },
  {
    id: "DIG-03",
    slug: "dig-03",
    title: "Demande de visite technique",
    module: "Marketing / Commercial",
    file: "DIG-03-demande-visite.html",
    docType: "Visite",
    refPrefix: "NECS-WEB-VISITE",
    subtitle: "Planification visite technique depuis le web.",
    note: "Alimente le chiffrage commercial.",
    domain: "DIG",
    htmlPath: "/galerie/templates/DIG-03-demande-visite.html",
    sections: [
      {
        title: "Coordonnées",
        fields: [
          { name: "nom", label: "Nom / Entreprise", kind: "text", required: true },
          { name: "tel", label: "Téléphone", kind: "tel", required: true },
          { name: "email", label: "Email", kind: "email", required: true },
          { name: "adresse", label: "Adresse du site", kind: "text", required: true, full: true },
        ],
      },
      {
        title: "Planification",
        fields: [
          { name: "date", label: "Date souhaitée", kind: "date", required: true },
          { name: "creneau", label: "Créneau", kind: "select", options: ["Matin", "Après-midi", "Indifférent"] },
          { name: "type", label: "Type de locaux", kind: "select", options: ["Bureaux", "Industrie", "Commerce", "Autre"] },
          { name: "infos", label: "Informations utiles", kind: "textarea", full: true },
        ],
      },
    ],
    checks: [],
    lineHeaders: [],
    lineRows: [
    ],
    kpis: [
    ],
    records: [
      { id: "LEAD-2404", label: "LogiTrans Cameroun", status: "Visite planifiée", owner: "Commercial", updated: "08/09/2026", amount: "—" },
    ],
  },
];

export const DOCUMENT_DOMAINS = [
  { id: "all", label: "Tous" },
  { id: "DIG", label: "Digital" },
  { id: "CRM", label: "CRM" },
  { id: "OPS", label: "Opérations" },
  { id: "Q", label: "Qualité" },
  { id: "RH", label: "RH" },
  { id: "FIN", label: "Finance" },
  { id: "BI", label: "Pilotage" },
] as const;

export function getDocumentBySlug(slug: string): DocumentDef | undefined {
  const key = slug.toLowerCase();
  const doc = DOCUMENTS.find((d) => d.slug === key || d.id.toLowerCase() === key);
  if (!doc) return undefined;
  return applyDocEnrichment(doc);
}

