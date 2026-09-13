import type {
  DocField,
  DocKpi,
  DocRecord,
  DocSection,
  DocumentDef,
} from "@/lib/documents-catalog";

export type DocEnrichment = {
  checks?: string[];
  kpis?: DocKpi[];
  extraSections?: DocSection[];
  photoKinds?: { id: string; label: string }[];
  extraRecords?: DocRecord[];
  lineHeaders?: string[];
  lineRows?: string[][];
};

const moneyKpis = (
  a: string,
  b: string,
  c?: string,
  d?: string,
): DocKpi[] => {
  const items: DocKpi[] = [
    { label: a.split("|")[0]!, value: a.split("|")[1]! },
    { label: b.split("|")[0]!, value: b.split("|")[1]! },
  ];
  if (c) items.push({ label: c.split("|")[0]!, value: c.split("|")[1]! });
  if (d) items.push({ label: d.split("|")[0]!, value: d.split("|")[1]! });
  return items;
};

export const DOC_ENRICHMENTS: Record<string, DocEnrichment> = {
  "TMP-01": {
    checks: [
      "Besoin client cadré",
      "Visite / diagnostic réalisé",
      "Moyens humains validés",
      "Chiffrage cohérent",
      "Offre relue Direction / Commercial",
      "Validité et conditions indiquées",
    ],
    kpis: moneyKpis(
      "Offres ouvertes|12",
      "Taux conversion|38 %",
      "Montant pipeline|18,4 M",
      "Délai moyen|4 j",
    ),
    extraSections: [
      {
        title: "Moyens & conditions",
        fields: [
          { name: "horaires", label: "Horaires types", kind: "text", defaultValue: "06h00 – 14h00" },
          { name: "materiel", label: "Matériel prévu", kind: "textarea", full: true },
          { name: "consommables", label: "Consommables", kind: "textarea", full: true },
          { name: "commercial", label: "Commercial responsable", kind: "text" },
          { name: "devis_ref", label: "Devis lié", kind: "text" },
          { name: "total_ht", label: "Total HT estimé (FCFA)", kind: "text" },
        ],
      },
    ],
  },
  "TMP-02": {
    checks: [
      "Périmètre et quantités vérifiés",
      "Prix unitaires à jour",
      "TVA / taxes applicables",
      "Conditions de paiement renseignées",
      "Validité du devis indiquée",
      "Relu avant envoi client",
    ],
    kpis: moneyKpis(
      "Devis du mois|24",
      "Montant émis|9,2 M",
      "Acceptés|11",
      "Taux acceptation|46 %",
    ),
    extraSections: [
      {
        title: "Conditions commerciales",
        fields: [
          { name: "objet", label: "Objet", kind: "text", required: true, full: true },
          { name: "surface", label: "Surface (m²)", kind: "number" },
          { name: "periodicite", label: "Périodicité", kind: "text", defaultValue: "5 j / sem" },
          { name: "niveau_service", label: "Niveau de service", kind: "select", options: ["Standard", "Premium", "Critique"] },
          { name: "remise", label: "Remise (%)", kind: "number", defaultValue: "0" },
          { name: "tva", label: "TVA (%)", kind: "number", defaultValue: "19.25" },
          { name: "total_ht", label: "Total HT", kind: "text" },
          { name: "total_ttc", label: "Total TTC", kind: "text" },
          { name: "version", label: "Version", kind: "text", defaultValue: "1.0" },
        ],
      },
    ],
  },
  "TMP-03": {
    checks: [
      "Devis accepté lié",
      "Prestations et quantités exactes",
      "Dates de démarrage confirmées",
      "Validation client reçue",
      "Transmission OPS planifiée",
    ],
    kpis: moneyKpis("BC ouverts|8", "À démarrer|5", "Montant engagé|4,6 M"),
    extraRecords: [
      { id: "BC-0089", label: "Clinique La Roseraie — démarrage", status: "Validé", owner: "A. Mbarga", updated: "09/09/2026", amount: "890 000 FCFA" },
    ],
  },
  "TMP-04": {
    checks: [
      "Articles / prestations conformes",
      "Quantités vérifiées",
      "État des lieux noté",
      "Signature réceptionnaire",
      "Écarts signalés si besoin",
    ],
    kpis: moneyKpis("BL du mois|31", "Avec écart|3", "Taux conforme|90 %"),
    extraSections: [
      {
        title: "Réception",
        fields: [
          { name: "receptionnaire", label: "Réceptionnaire", kind: "text", required: true },
          { name: "heure_reception", label: "Heure réception", kind: "text" },
          { name: "observations", label: "Observations", kind: "textarea", full: true },
        ],
      },
    ],
    extraRecords: [
      { id: "BL-0212", label: "Mall Riviera — livrables EPI", status: "Conforme", owner: "S. Ndjock", updated: "07/09/2026", amount: "—" },
    ],
  },
  "TMP-05": {
    checks: [
      "Parties identifiées",
      "Périmètre et SLA définis",
      "Durée et reconduction claires",
      "Tarifs et indexation validés",
      "Clauses résiliation relues",
      "Signatures préparées",
    ],
    kpis: moneyKpis("Contrats actifs|42", "À renouveler|6", "CA annuel|86 M"),
    extraSections: [
      {
        title: "Signatures",
        fields: [
          { name: "signataire_necs", label: "Signataire NECS", kind: "text" },
          { name: "signataire_client", label: "Signataire client", kind: "text" },
          { name: "date_signature", label: "Date signature", kind: "date" },
        ],
      },
    ],
  },
  "TMP-06": {
    checks: [
      "Contrat initial référencé",
      "Modification clairement décrite",
      "Impact tarifaire chiffré",
      "Accord parties obtenu",
      "Avenant numéroté et archivé",
    ],
    kpis: moneyKpis("Avenants 2026|9", "Impact moyen|+7 %", "En attente|2"),
    extraRecords: [
      { id: "AV-0018", label: "Extension horaires — Horizon", status: "Signé", owner: "Commercial", updated: "05/09/2026", amount: "+120 000" },
    ],
  },
  "TMP-07": {
    checks: [
      "Identité agent vérifiée",
      "Poste et site d’affectation",
      "Rémunération et avantages",
      "Période d’essai définie",
      "Documents RH joints",
      "Contrat signé des deux côtés",
    ],
    kpis: moneyKpis("Contrats agents|128", "Nouveaux mois|6", "Fin d’essai|4"),
    extraRecords: [
      { id: "CA-0342", label: "M. Ngo — Agent sanitaires", status: "Actif", owner: "RH", updated: "01/09/2026", amount: "—" },
    ],
  },
  "TMP-08": {
    checks: [
      "Mission principale claire",
      "Compétences requises listées",
      "Indicateurs de performance",
      "Hiérarchie / rattachement",
      "Validé RH + OPS",
    ],
    kpis: moneyKpis("Fiches actives|18", "À mettre à jour|3", "Nouveaux postes|2"),
    extraRecords: [
      { id: "FP-0019", label: "Chef d’équipe multi-sites", status: "Publié", owner: "RH", updated: "03/09/2026", amount: "—" },
    ],
  },
  "TMP-09": {
    kpis: moneyKpis("Dossiers ouverts|7", "Complets|4", "Délai moyen|5 j"),
  },
  "TMP-10": {
    checks: [
      "CV et pièces reçus",
      "Grille d’évaluation renseignée",
      "Avis recruteur motivé",
      "Décision (retenu / refus / pool)",
      "Feedback candidat prévu",
    ],
    kpis: moneyKpis("Entretiens mois|14", "Retenus|5", "Taux retenus|36 %"),
    extraSections: [
      {
        title: "Notation (1–5)",
        fields: [
          { name: "score_presentation", label: "Présentation", kind: "number", defaultValue: "3" },
          { name: "score_experience", label: "Expérience", kind: "number", defaultValue: "3" },
          { name: "score_motivation", label: "Motivation", kind: "number", defaultValue: "3" },
          { name: "score_technique", label: "Savoir-faire terrain", kind: "number", defaultValue: "3" },
          { name: "score_global", label: "Note globale /20", kind: "number" },
          { name: "avis", label: "Avis / décision", kind: "textarea", full: true },
        ],
      },
    ],
    extraRecords: [
      { id: "ENT-0091", label: "Candidat — Agent polyvalent", status: "Retenu", owner: "RH", updated: "06/09/2026", amount: "16/20" },
    ],
  },
  "TMP-11": {
    kpis: moneyKpis("En intégration|5", "Terminés mois|3", "Taux complétion|92 %"),
    extraRecords: [
      { id: "ONB-0044", label: "Intégration — site Bassa", status: "En cours", owner: "RH", updated: "09/09/2026", amount: "7/10" },
    ],
  },
  "TMP-12": {
    checks: [
      "Site et créneau confirmés",
      "Équipe affectée",
      "Matériel disponible",
      "Consignes lues par le chef d’équipe",
      "Photo arrivée prise",
      "Photo départ prise",
      "Pointage agents complet",
    ],
    kpis: moneyKpis("OT du jour|18", "Terminés|11", "Anomalies|2", "Taux réalisation|89 %"),
    photoKinds: [
      { id: "avant", label: "Avant / Arrivée" },
      { id: "pendant", label: "Pendant" },
      { id: "apres", label: "Après / Départ" },
      { id: "anomalie", label: "Anomalie" },
    ],
    extraSections: [
      {
        title: "Clôture",
        fields: [
          { name: "heure_fin", label: "Heure de fin", kind: "text" },
          { name: "compte_rendu", label: "Compte rendu terrain", kind: "textarea", full: true },
          { name: "signature_superviseur", label: "Superviseur", kind: "text" },
        ],
      },
    ],
  },
  "TMP-13": {
    checks: [
      "Zones contrôlées listées",
      "Scores renseignés",
      "Photos d’écarts jointes si NC",
      "Actions correctives définies",
      "Échéance et responsable fixés",
      "Client informé si seuil non atteint",
    ],
    kpis: moneyKpis("Contrôles mois|22", "Score moyen|87", "NC ouvertes|4", "Délai correctif|2,5 j"),
    photoKinds: [
      { id: "preuve", label: "Preuve qualité" },
      { id: "nc", label: "Non-conformité" },
      { id: "apres_correction", label: "Après correction" },
    ],
    extraSections: [
      {
        title: "Notation zones (/5)",
        fields: [
          { name: "q_sols", label: "Sols / circulation", kind: "number", defaultValue: "4" },
          { name: "q_sanitaires", label: "Sanitaires", kind: "number", defaultValue: "4" },
          { name: "q_surfaces", label: "Surfaces / mobilier", kind: "number", defaultValue: "4" },
          { name: "q_vitrerie", label: "Vitrerie", kind: "number", defaultValue: "4" },
          { name: "q_odeurs", label: "Odeurs / hygiène", kind: "number", defaultValue: "4" },
        ],
      },
    ],
  },
  "TMP-14": {
    checks: [
      "Période et site exacts",
      "Réalisé vs planifié renseigné",
      "Incidents documentés",
      "Photos / preuves associées",
      "Validé superviseur",
    ],
    extraRecords: [
      { id: "RP-0088", label: "Rapport — Usine Bassa S36", status: "Validé", owner: "S. Ndjock", updated: "08/09/2026", amount: "98 %" },
    ],
  },
  "TMP-15": {
    checks: [
      "Besoin justifié",
      "Quantités et budget ok",
      "Fournisseur proposé",
      "Validation N+1",
      "Réception prévue",
    ],
    kpis: moneyKpis("Demandes ouvertes|9", "Budget engagé|1,8 M", "Délai moyen|3 j"),
    extraRecords: [
      { id: "DA-0155", label: "Consommables — Horizon", status: "Approuvé", owner: "OPS", updated: "07/09/2026", amount: "245 000" },
    ],
  },
  "TMP-16": {
    checks: [
      "Solde de congés vérifié",
      "Dates cohérentes",
      "Remplaçant identifié",
      "Validation manager",
      "RH notifié",
    ],
    kpis: moneyKpis("Demandes mois|11", "Approuvées|8", "En attente|3"),
    extraSections: [
      {
        title: "Validation",
        fields: [
          { name: "manager", label: "Manager", kind: "text" },
          { name: "decision", label: "Décision", kind: "select", options: ["En attente", "Approuvé", "Refusé"] },
          { name: "commentaire_rh", label: "Commentaire RH", kind: "textarea", full: true },
        ],
      },
    ],
    extraRecords: [
      { id: "CG-0072", label: "Congé — A. Kouam", status: "Approuvé", owner: "RH", updated: "04/09/2026", amount: "5 j" },
    ],
  },
  "TMP-17": {
    checks: [
      "Agents présents pointés",
      "Horaires cohérents",
      "Anomalies justifiées",
      "Géo / site vérifié si requis",
      "Clôturé par chef d’équipe",
    ],
    kpis: moneyKpis("Présents|86 %", "Retards|7", "Absences|4"),
    extraRecords: [
      { id: "PT-1209", label: "Pointage — Horizon 10/09", status: "Clos", owner: "Chef équipe", updated: "10/09/2026", amount: "4/4" },
    ],
  },
  "TMP-18": {
    checks: [
      "Prestations de la période listées",
      "Montants HT contrôlés",
      "Contrat / BC liés",
      "Prêt pour facturation",
      "Validé Finance",
    ],
    kpis: moneyKpis("Préfactures|15", "Montant|6,4 M", "À facturer|9"),
    extraSections: [
      {
        title: "Totaux",
        fields: [
          { name: "periode", label: "Période", kind: "month", required: true },
          { name: "total_ht", label: "Total HT", kind: "text", required: true },
          { name: "tva", label: "TVA (%)", kind: "number", defaultValue: "19.25" },
          { name: "total_ttc", label: "Total TTC", kind: "text" },
        ],
      },
    ],
    extraRecords: [
      { id: "PF-0199", label: "Préfacture — Mall Riviera août", status: "Validé", owner: "Finance", updated: "02/09/2026", amount: "2,1 M" },
    ],
  },
  "TMP-19": {
    checks: [
      "Client et NIU / RCCM",
      "Lignes et totaux exacts",
      "TVA calculée",
      "Acomptes déduits",
      "Coordonnées bancaires",
      "Numérotation conforme",
    ],
    kpis: moneyKpis("Factures mois|19", "Émis|7,8 M", "Encaissé|5,1 M", "Retard|2"),
    extraSections: [
      {
        title: "Facturation",
        fields: [
          { name: "site_facture", label: "Site facturé", kind: "text" },
          { name: "ref_client", label: "Réf. client", kind: "text" },
          { name: "total_ht", label: "Total HT", kind: "text", required: true },
          { name: "tva_montant", label: "Montant TVA", kind: "text" },
          { name: "acomptes", label: "Acomptes", kind: "text", defaultValue: "0" },
          { name: "net_a_payer", label: "Net à payer", kind: "text", required: true },
          { name: "banque", label: "Coordonnées bancaires", kind: "textarea", full: true },
          { name: "echeance", label: "Échéance", kind: "date" },
        ],
      },
    ],
  },
  "TMP-20": {
    checks: [
      "Facture d’origine liée",
      "Motif d’avoir justifié",
      "Montant cohérent",
      "Impact comptable noté",
      "Client informé",
    ],
    kpis: moneyKpis("Avoirs mois|3", "Montant|420 k", "Délai traitement|2 j"),
    extraRecords: [
      { id: "AVO-0031", label: "Avoir — trop-perçu Horizon", status: "Émis", owner: "Finance", updated: "05/09/2026", amount: "85 000" },
    ],
  },
  "TMP-21": {
    checks: [
      "Période exacte",
      "Factures et règlements listés",
      "Solde cohérent",
      "Relances liées si solde dû",
      "Envoyé au client",
    ],
    kpis: moneyKpis("Relevés envoyés|12", "Solde dû|3,2 M", "À jour|8"),
    extraRecords: [
      { id: "RC-0048", label: "Relevé — Société Exemple", status: "Envoyé", owner: "Finance", updated: "01/09/2026", amount: "655 000 dû" },
    ],
  },
  "TMP-22": {
    checks: [
      "Facture(s) en retard identifiée(s)",
      "Niveau de relance adapté",
      "Coordonnées destinataire ok",
      "Historique des relances",
      "Escalade prévue si silence",
    ],
    kpis: moneyKpis("Relances mois|16", "Récupéré|1,4 M", "Taux succès|62 %"),
    extraRecords: [
      { id: "RL-0112", label: "Relance 2 — Mall Riviera", status: "Envoyée", owner: "Finance", updated: "09/09/2026", amount: "2,1 M" },
    ],
  },
  "TMP-23": {
    checks: [
      "Document / objet reçu identifié",
      "Date et heure notées",
      "Émetteur confirmé",
      "Preuve jointe",
      "Accusé transmis",
    ],
    kpis: moneyKpis("AR mois|28", "Sous 24h|25", "Taux|89 %"),
    photoKinds: [
      { id: "preuve", label: "Preuve de réception" },
    ],
    extraRecords: [
      { id: "AR-0201", label: "AR — contrat signé Exemple SA", status: "Envoyé", owner: "Commercial", updated: "08/09/2026", amount: "—" },
    ],
  },
  "TMP-24": {
    checks: [
      "Périmètre mois / sites",
      "Indicateurs renseignés",
      "Écarts commentés",
      "Actions du mois suivant",
      "Validé Direction",
    ],
    extraRecords: [
      { id: "RM-2026-08", label: "Rapport mensuel août 2026", status: "Validé", owner: "Direction", updated: "02/09/2026", amount: "Score 86" },
    ],
  },
  "TMP-25": {
    checks: [
      "Site visité et contacté",
      "Zones mesurées / photos",
      "Contraintes d’accès notées",
      "Recommandations rédigées",
      "Transmission Commercial",
    ],
    kpis: moneyKpis("Visites mois|9", "Converties offre|5", "Délai rapport|1,5 j"),
    photoKinds: [
      { id: "exterieur", label: "Extérieur" },
      { id: "zones", label: "Zones à traiter" },
      { id: "contraintes", label: "Contraintes / accès" },
    ],
    extraRecords: [
      { id: "VT-0067", label: "Visite — Immeuble Akwa Center", status: "Rapport prêt", owner: "Commercial", updated: "07/09/2026", amount: "2 100 m²" },
    ],
  },
  "DIG-01": {
    checks: [
      "Lead qualifié",
      "Coordonnées complètes",
      "Besoin résumé",
      "Affecté à un commercial",
      "Réponse sous 24–48 h",
    ],
    kpis: moneyKpis("Demandes web|34", "Traitées|29", "Converties|8"),
    extraRecords: [
      { id: "LEAD-2410", label: "Demande devis — Hôtel Palm", status: "Nouveau", owner: "Commercial", updated: "10/09/2026", amount: "—" },
    ],
  },
  "DIG-02": {
    checks: [
      "Message lu",
      "Type de demande classé",
      "Réponse envoyée",
      "Suivi CRM créé si besoin",
    ],
    kpis: moneyKpis("Messages|41", "Répondus|38", "Délai médian|6 h"),
    extraRecords: [
      { id: "CT-0188", label: "Contact — partenariats", status: "Répondu", owner: "Direction", updated: "09/09/2026", amount: "—" },
    ],
  },
  "DIG-03": {
    checks: [
      "Site et créneau proposés",
      "Visite planifiée",
      "Technicien / commercial assigné",
      "Rappel J-1 envoyé",
      "Compte rendu après visite",
    ],
    kpis: moneyKpis("Demandes visite|12", "Planifiées|9", "Honorées|8"),
    extraRecords: [
      { id: "DV-0095", label: "Visite — Commerce Bonapriso", status: "Planifiée", owner: "Commercial", updated: "10/09/2026", amount: "12/09 10h" },
    ],
  },
};

function mergeFields(base: DocField[], extra: DocField[]): DocField[] {
  const names = new Set(base.map((f) => f.name));
  return [...base, ...extra.filter((f) => !names.has(f.name))];
}

export function applyDocEnrichment(doc: DocumentDef): DocumentDef {
  const e = DOC_ENRICHMENTS[doc.id];
  if (!e) return doc;

  let sections = doc.sections.map((s) => ({
    ...s,
    fields: [...s.fields],
  }));

  if (e.extraSections?.length) {
    for (const extra of e.extraSections) {
      const existing = sections.find(
        (s) => s.title.toLowerCase() === extra.title.toLowerCase(),
      );
      if (existing) {
        existing.fields = mergeFields(existing.fields, extra.fields);
      } else {
        sections = [...sections, extra];
      }
    }
  }

  const recordIds = new Set(doc.records.map((r) => r.id));
  const records = [
    ...doc.records,
    ...(e.extraRecords ?? []).filter((r) => !recordIds.has(r.id)),
  ];

  return {
    ...doc,
    sections,
    checks: e.checks?.length ? e.checks : doc.checks,
    kpis: e.kpis?.length ? e.kpis : doc.kpis,
    photoKinds: e.photoKinds ?? doc.photoKinds,
    lineHeaders: e.lineHeaders?.length ? e.lineHeaders : doc.lineHeaders,
    lineRows: e.lineRows?.length ? e.lineRows : doc.lineRows,
    records,
  };
}
