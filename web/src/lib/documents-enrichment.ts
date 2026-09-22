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
      "Besoin client cadré (visite / diagnostic)",
      "Périmètre & surface confirmés",
      "Moyens humains et matériels validés",
      "Chiffrage HT cohérent avec le devis lié",
      "Offre relue Direction / Commercial",
      "Validité, conditions et niveaux de service indiqués",
      "Lien opportunité / visite technique renseigné",
      "Acceptation de principe prête à signature",
    ],
    kpis: moneyKpis(
      "Offres ouvertes|12",
      "Taux conversion|38 %",
      "Pipeline HT|18,4 M",
      "Délai moyen réponse|4 j",
    ),
    lineHeaders: [
      "Prestation",
      "Fréquence",
      "Effectif",
      "Montant HT / mois",
    ],
    lineRows: [
      ["Entretien quotidien bureaux & circulations", "5 j / sem", "3", "550 000"],
      ["Entretien & désinfection sanitaires", "5 j / sem", "1", "187 000"],
      ["Vitrerie intérieure", "Mensuel", "2", "85 000"],
      ["Consommables standards", "Mensuel", "—", "75 000"],
    ],
    extraSections: [
      {
        title: "Identification",
        fields: [
          {
            name: "statut_offre",
            label: "Statut de l’offre",
            kind: "select",
            options: [
              "Brouillon",
              "En revue",
              "Envoyée",
              "Négociation",
              "Acceptée",
              "Refusée",
              "Expirée",
            ],
            defaultValue: "Brouillon",
          },
          {
            name: "visite_ref",
            label: "Réf. visite technique",
            kind: "text",
            hint: "VIS-2026-…",
          },
          {
            name: "date_offre",
            label: "Date de l’offre",
            kind: "date",
          },
          {
            name: "confidentiel",
            label: "Mention",
            kind: "select",
            options: ["Confidentiel", "Usage interne", "Public client"],
            defaultValue: "Confidentiel",
          },
        ],
      },
      {
        title: "Périmètre",
        fields: [
          {
            name: "besoin",
            label: "Compréhension du besoin",
            kind: "textarea",
            full: true,
            defaultValue:
              "Locaux tertiaires à fréquentation élevée ; entretien quotidien fiable, hygiène sanitaires et reporting qualité transparent.",
          },
          {
            name: "zones",
            label: "Zones couvertes",
            kind: "textarea",
            full: true,
            defaultValue:
              "Bureaux, circulations, sanitaires, salles de réunion, accueil.",
          },
          {
            name: "contraintes",
            label: "Contraintes d’accès / horaires",
            kind: "textarea",
            full: true,
          },
        ],
      },
      {
        title: "Méthodologie NECS",
        fields: [
          {
            name: "methodo_etapes",
            label: "Parcours proposé",
            kind: "textarea",
            full: true,
            defaultValue:
              "1) Diagnostic & cadrage · 2) Organisation opérationnelle · 3) Exécution & preuves (pointage, OT, photos) · 4) Amélioration continue (écarts, rapport mensuel).",
          },
          {
            name: "arguments",
            label: "Pourquoi NECS (arguments)",
            kind: "textarea",
            full: true,
            defaultValue:
              "Qualité mesurable · Équipes formées · Digitalisation bout-en-bout · Interlocuteur unique et réactivité terrain.",
          },
          {
            name: "supervision",
            label: "Supervision",
            kind: "text",
            defaultValue: "Visites terrain + contrôles qualité périodiques",
          },
          {
            name: "pilotage",
            label: "Pilotage digital",
            kind: "text",
            defaultValue: "Plateforme NECS (pointage, OT, preuves)",
          },
        ],
      },
      {
        title: "Moyens & conditions",
        fields: [
          {
            name: "horaires",
            label: "Horaires types",
            kind: "text",
            defaultValue: "06h00 – 14h00 · Lun–Ven",
          },
          {
            name: "effectif",
            label: "Effectif proposé",
            kind: "text",
            defaultValue: "4 agents + 1 chef d’équipe",
          },
          {
            name: "materiel",
            label: "Matériel prévu",
            kind: "textarea",
            full: true,
            defaultValue: "Dotation professionnelle NECS (annexe technique).",
          },
          {
            name: "consommables",
            label: "Consommables",
            kind: "textarea",
            full: true,
            defaultValue: "Lot mensuel inclus (détail en annexe).",
          },
          {
            name: "demarrage_delai",
            label: "Délai de démarrage",
            kind: "text",
            defaultValue: "Sous 10 jours ouvrés après acceptation",
          },
          {
            name: "conditions",
            label: "Conditions particulières",
            kind: "textarea",
            full: true,
          },
        ],
      },
      {
        title: "Chiffrage & commercial",
        fields: [
          {
            name: "commercial",
            label: "Commercial responsable",
            kind: "text",
            required: true,
          },
          {
            name: "devis_ref",
            label: "Devis détaillé lié",
            kind: "text",
            hint: "NECS-DEV-2026-…",
          },
          {
            name: "mensuel_ht",
            label: "Investissement mensuel HT (FCFA)",
            kind: "text",
            defaultValue: "897 000",
          },
          {
            name: "tva",
            label: "TVA (%)",
            kind: "number",
            defaultValue: "19.25",
          },
          {
            name: "mensuel_ttc",
            label: "Investissement mensuel TTC (FCFA)",
            kind: "text",
          },
          {
            name: "total_ht",
            label: "Total HT période (si applicable)",
            kind: "text",
          },
          {
            name: "remise",
            label: "Remise commerciale (%)",
            kind: "number",
            defaultValue: "0",
          },
          {
            name: "paiement",
            label: "Conditions de paiement",
            kind: "text",
            defaultValue: "Mensuel · 30 jours",
          },
        ],
      },
      {
        title: "Acceptation & signatures",
        fields: [
          {
            name: "signataire_necs",
            label: "Signataire NECS",
            kind: "text",
            defaultValue: "Direction Commerciale",
          },
          {
            name: "date_signature_necs",
            label: "Date signature NECS",
            kind: "date",
          },
          {
            name: "signataire_client",
            label: "Signataire client (nom & qualité)",
            kind: "text",
          },
          {
            name: "date_acceptation",
            label: "Date acceptation de principe",
            kind: "date",
          },
          {
            name: "decision",
            label: "Décision client",
            kind: "select",
            options: [
              "En attente",
              "Acceptation de principe",
              "Demande de révision",
              "Refus",
            ],
            defaultValue: "En attente",
          },
          {
            name: "commentaire_client",
            label: "Commentaire / réserve client",
            kind: "textarea",
            full: true,
          },
        ],
      },
    ],
    extraRecords: [
      {
        id: "OFF-0003",
        label: "Clinique La Roseraie ; Standard",
        status: "Négociation",
        owner: "A. Mbarga",
        updated: "12/09/2026",
        amount: "890 000 FCFA / mois",
      },
      {
        id: "OFF-0004",
        label: "Usine Bassa ; Critique",
        status: "Acceptée",
        owner: "P. Ngo",
        updated: "05/09/2026",
        amount: "3,4 M FCFA / mois",
      },
      {
        id: "OFF-0005",
        label: "Résidence Les Palmiers ; Ponctuel",
        status: "Expirée",
        owner: "A. Mbarga",
        updated: "01/08/2026",
        amount: "420 000 FCFA",
      },
    ],
  },
  "TMP-02": {
    checks: [
      "Offre / opportunité liée renseignée",
      "Périmètre, surface et périodicité vérifiés",
      "Quantités et prix unitaires à jour",
      "Remise, TVA et totaux HT/TTC cohérents",
      "Conditions de paiement & validité indiquées",
      "Version du devis tracée",
      "Relu Commercial / Finance avant envoi",
      "Bon pour accord client prêt à signature",
    ],
    kpis: moneyKpis(
      "Devis du mois|24",
      "Montant émis|9,2 M",
      "Acceptés|11",
      "Taux acceptation|46 %",
    ),
    lineHeaders: [
      "Désignation",
      "Qté",
      "Unité",
      "P.U. HT",
      "Période",
      "Total HT",
    ],
    lineRows: [
      [
        "Entretien quotidien des bureaux (sols, postes, circulations)",
        "22",
        "Jour",
        "25 000",
        "Mensuel",
        "550 000",
      ],
      [
        "Entretien des sanitaires (désinfection, réassort)",
        "22",
        "Jour",
        "8 500",
        "Mensuel",
        "187 000",
      ],
      [
        "Vitrerie intérieure (cloisons & portes)",
        "1",
        "Interv.",
        "85 000",
        "Mensuel",
        "85 000",
      ],
      [
        "Fourniture consommables standards",
        "1",
        "Lot",
        "75 000",
        "Mensuel",
        "75 000",
      ],
    ],
    extraSections: [
      {
        title: "Identification",
        fields: [
          {
            name: "statut_devis",
            label: "Statut du devis",
            kind: "select",
            options: [
              "Brouillon",
              "En validation",
              "Envoyé",
              "Négociation",
              "Accepté",
              "Refusé",
              "Expiré",
              "Transformé en BC",
            ],
            defaultValue: "Brouillon",
          },
          {
            name: "offre_ref",
            label: "Réf. proposition de services",
            kind: "text",
            hint: "NECS-OFF-2026-…",
          },
          {
            name: "commercial",
            label: "Commercial / chiffrage",
            kind: "text",
            required: true,
          },
          {
            name: "qualite_contact",
            label: "Qualité du contact client",
            kind: "text",
            defaultValue: "Achats",
          },
        ],
      },
      {
        title: "Paramètres",
        fields: [
          {
            name: "version",
            label: "Version",
            kind: "text",
            defaultValue: "1.0",
          },
          {
            name: "jours_ouvres",
            label: "Jours ouvrés / mois",
            kind: "number",
            defaultValue: "22",
          },
          {
            name: "debut",
            label: "Démarrage indicatif",
            kind: "date",
          },
          {
            name: "mode_reglement",
            label: "Mode de règlement",
            kind: "select",
            options: [
              "Virement bancaire",
              "Chèque",
              "Espèces",
              "Mobile money",
            ],
            defaultValue: "Virement bancaire",
          },
        ],
      },
      {
        title: "Conditions commerciales",
        fields: [
          {
            name: "objet",
            label: "Objet",
            kind: "text",
            required: true,
            full: true,
            defaultValue: "Entretien courant des bureaux & sanitaires",
          },
          { name: "surface", label: "Surface estimée (m²)", kind: "number" },
          {
            name: "periodicite",
            label: "Périodicité",
            kind: "text",
            defaultValue: "5 jours / semaine · 22 jours ouvrés / mois",
          },
          {
            name: "niveau_service",
            label: "Niveau de service",
            kind: "select",
            options: ["Standard", "Premium", "Critique"],
            defaultValue: "Premium",
          },
          {
            name: "sla",
            label: "SLA qualité",
            kind: "text",
            defaultValue: "≥ 85/100",
          },
          {
            name: "remise",
            label: "Remise commerciale (%)",
            kind: "number",
            defaultValue: "0",
          },
          {
            name: "montant_remise",
            label: "Montant remise (FCFA)",
            kind: "text",
            defaultValue: "0",
          },
          {
            name: "tva",
            label: "TVA (%)",
            kind: "number",
            defaultValue: "19.25",
          },
          {
            name: "regime_fiscal",
            label: "Régime fiscal / taxes",
            kind: "text",
            defaultValue: "Selon régime fiscal applicable",
          },
          {
            name: "sous_total_ht",
            label: "Sous-total HT (FCFA)",
            kind: "text",
            defaultValue: "897 000",
          },
          {
            name: "total_ht",
            label: "Total HT après remise",
            kind: "text",
            defaultValue: "897 000",
          },
          {
            name: "total_tva",
            label: "Montant TVA",
            kind: "text",
          },
          {
            name: "total_ttc",
            label: "Total TTC",
            kind: "text",
          },
          {
            name: "net_mensuel",
            label: "Net mensuel estimatif HT",
            kind: "text",
            defaultValue: "897 000",
          },
        ],
      },
      {
        title: "Clauses & hors périmètre",
        fields: [
          {
            name: "clauses",
            label: "Conditions commerciales (texte)",
            kind: "textarea",
            full: true,
            defaultValue:
              "1) Validité 30 jours · 2) Acceptation = commande ferme sous réserve de contrat · 3) Prix révisables annuellement · 4) Hors périmètre (après travaux, événements) en devis séparé · 5) Engagement qualité, planning et traçabilité.",
          },
          {
            name: "hors_perimetre",
            label: "Hors périmètre explicite",
            kind: "textarea",
            full: true,
            defaultValue:
              "Nettoyage après travaux, événements, désinfection exceptionnelle, vitrerie extérieure.",
          },
          {
            name: "annexe",
            label: "Annexes jointes",
            kind: "text",
            defaultValue: "Annexe technique consommables · Planning démarrage",
          },
        ],
      },
      {
        title: "Validation & signatures",
        fields: [
          {
            name: "seuil_validation",
            label: "Seuil validation interne",
            kind: "select",
            options: [
              "Commercial seul (< 1 M)",
              "Direction commerciale",
              "Direction + Finance",
            ],
            defaultValue: "Commercial seul (< 1 M)",
          },
          {
            name: "valideur_interne",
            label: "Valideur interne",
            kind: "text",
          },
          {
            name: "date_validation_interne",
            label: "Date validation interne",
            kind: "date",
          },
          {
            name: "signataire_necs",
            label: "Signataire NECS",
            kind: "text",
            defaultValue: "Service Commercial",
          },
          {
            name: "date_emission_sign",
            label: "Date signature NECS",
            kind: "date",
          },
          {
            name: "signataire_client",
            label: "Bon pour accord — Client (nom & qualité)",
            kind: "text",
          },
          {
            name: "date_accord_client",
            label: "Date accord client",
            kind: "date",
          },
          {
            name: "decision",
            label: "Décision",
            kind: "select",
            options: [
              "En attente",
              "Bon pour accord",
              "Demande de révision",
              "Refus",
              "Transformé en commande",
            ],
            defaultValue: "En attente",
          },
          {
            name: "bc_ref",
            label: "BC généré (si accepté)",
            kind: "text",
            hint: "NECS-BC-…",
          },
          {
            name: "commentaire",
            label: "Commentaire / réserve",
            kind: "textarea",
            full: true,
          },
        ],
      },
    ],
    extraRecords: [
      {
        id: "DEV-0148",
        label: "Clinique La Roseraie ; Standard",
        status: "Accepté",
        owner: "A. Mbarga",
        updated: "11/09/2026",
        amount: "890 000 FCFA",
      },
      {
        id: "DEV-0150",
        label: "Usine Bassa ; Critique",
        status: "Négociation",
        owner: "Finance",
        updated: "12/09/2026",
        amount: "3,4 M FCFA",
      },
      {
        id: "DEV-0151",
        label: "Résidence Les Palmiers ; Ponctuel",
        status: "Expiré",
        owner: "A. Mbarga",
        updated: "20/08/2026",
        amount: "420 000 FCFA",
      },
    ],
  },
  "TMP-03": {
    checks: [
      "Devis accepté / offre liée renseignés",
      "Prestations et quantités exactes",
      "Dates de démarrage confirmées avec le client",
      "Site, accès et consignes OPS transmis",
      "Validation client / BC signé reçu",
      "Transmission OPS et planning démarrage",
      "Montant HT aligné sur le devis",
      "Contrat / avenant initié si besoin",
    ],
    kpis: moneyKpis(
      "BC ouverts|8",
      "À démarrer|5",
      "Montant engagé|4,6 M",
      "Démarrés mois|3",
    ),
    lineHeaders: [
      "Prestation",
      "Qté",
      "Unité",
      "Date début",
      "Site",
      "Statut",
    ],
    lineRows: [
      [
        "Entretien quotidien bureaux & circulations",
        "1",
        "Lot/mois",
        "01/04/2026",
        "Siège client",
        "Validé",
      ],
      [
        "Entretien sanitaires",
        "1",
        "Lot/mois",
        "01/04/2026",
        "Siège client",
        "Validé",
      ],
      [
        "Consommables standards",
        "1",
        "Lot/mois",
        "01/04/2026",
        "Siège client",
        "Planifié",
      ],
    ],
    extraSections: [
      {
        title: "Identification",
        fields: [
          {
            name: "statut_bc",
            label: "Statut commande",
            kind: "select",
            options: [
              "Brouillon",
              "Validé client",
              "Planifié",
              "En cours",
              "Suspendu",
              "Clôturé",
              "Annulé",
            ],
            defaultValue: "Validé client",
          },
          {
            name: "devis_ref",
            label: "N° devis lié",
            kind: "text",
            required: true,
            hint: "NECS-DEV-2026-…",
          },
          {
            name: "offre_ref",
            label: "Réf. offre / proposition",
            kind: "text",
            hint: "NECS-OFF-2026-…",
          },
          {
            name: "commercial",
            label: "Commercial",
            kind: "text",
            required: true,
          },
          {
            name: "priorite",
            label: "Priorité",
            kind: "select",
            options: [
              "Normale",
              "Haute",
              "Urgente",
            ],
            defaultValue: "Normale",
          },
          {
            name: "version",
            label: "Version BC",
            kind: "text",
            defaultValue: "1.0",
          },
        ],
      },
      {
        title: "Exécution & planning",
        fields: [
          {
            name: "date_debut",
            label: "Date de démarrage",
            kind: "date",
            required: true,
          },
          {
            name: "date_fin",
            label: "Fin prévue",
            kind: "date",
          },
          {
            name: "site",
            label: "Site d’exécution",
            kind: "text",
            required: true,
          },
          {
            name: "adresse_site",
            label: "Adresse / accès",
            kind: "text",
            full: true,
          },
          {
            name: "responsable_ops",
            label: "Responsable OPS",
            kind: "text",
          },
          {
            name: "chef_equipe",
            label: "Chef d’équipe prévu",
            kind: "text",
          },
          {
            name: "effectif",
            label: "Effectif commandé",
            kind: "number",
            defaultValue: "4",
          },
          {
            name: "horaires",
            label: "Horaires",
            kind: "text",
            defaultValue: "06h00 – 14h00 · Lun–Ven",
          },
          {
            name: "consignes_ops",
            label: "Consignes OPS",
            kind: "textarea",
            full: true,
            defaultValue: "Badge / accès · Point de rassemblement · Contacts site · Zones prioritaires.",
          },
        ],
      },
      {
        title: "Chiffrage & conditions",
        fields: [
          {
            name: "total_ht",
            label: "Montant HT (FCFA)",
            kind: "text",
            defaultValue: "897 000",
          },
          {
            name: "tva",
            label: "TVA (%)",
            kind: "number",
            defaultValue: "19.25",
          },
          {
            name: "total_ttc",
            label: "Montant TTC",
            kind: "text",
          },
          {
            name: "paiement",
            label: "Conditions de paiement",
            kind: "text",
            defaultValue: "Mensuel · 30 jours",
          },
          {
            name: "conditions",
            label: "Conditions particulières",
            kind: "textarea",
            full: true,
          },
        ],
      },
      {
        title: "Validation & signatures",
        fields: [
          {
            name: "signataire_client",
            label: "Signataire client",
            kind: "text",
            required: true,
          },
          {
            name: "qualite_client",
            label: "Qualité / fonction",
            kind: "text",
            defaultValue: "Achats",
          },
          {
            name: "date_validation_client",
            label: "Date validation client",
            kind: "date",
          },
          {
            name: "signataire_necs",
            label: "Signataire NECS",
            kind: "text",
            defaultValue: "Direction Commerciale",
          },
          {
            name: "date_signature_necs",
            label: "Date signature NECS",
            kind: "date",
          },
          {
            name: "transmission_ops",
            label: "Transmission OPS",
            kind: "select",
            options: [
              "À faire",
              "Faite",
              "Accusé reçu",
            ],
            defaultValue: "À faire",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "BC-0089",
        label: "Clinique La Roseraie ; démarrage",
        status: "Validé",
        owner: "A. Mbarga",
        updated: "09/09/2026",
        amount: "890 000 FCFA",
      },
      {
        id: "BC-0090",
        label: "Usine Bassa ; extension",
        status: "Planifié",
        owner: "P. Ngo",
        updated: "11/09/2026",
        amount: "3,4 M FCFA",
      },
      {
        id: "BC-0087",
        label: "Mall Riviera ; renouvellement",
        status: "En cours",
        owner: "Ops",
        updated: "01/09/2026",
        amount: "2,1 M FCFA",
      },
    ],
  },
  "TMP-04": {
    checks: [
      "Demande d’achat / BC magasin liés",
      "Articles et quantités conformes",
      "État des colis noté à l’arrivée",
      "Écarts signalés et justifiés",
      "Signature réceptionnaire obtenue",
      "Stock mis à jour si applicable",
      "Photos preuve si écart / casse",
    ],
    kpis: moneyKpis(
      "BL du mois|31",
      "Avec écart|3",
      "Taux conforme|90 %",
      "Délai moyen|1,2 j",
    ),
    lineHeaders: [
      "Article",
      "Unité",
      "Qté prévue",
      "Qté reçue",
      "État",
      "Lot",
    ],
    lineRows: [
      [
        "Détergent multi-surfaces 5L",
        "Bidon",
        "12",
        "12",
        "Conforme",
        "L-2603",
      ],
      [
        "Sacs poubelle 100L",
        "Rouleau",
        "20",
        "18",
        "Écart",
        "L-2598",
      ],
      [
        "Gants nitrile (boîte)",
        "Boîte",
        "10",
        "10",
        "Conforme",
        "L-2610",
      ],
      [
        "Serpillères microfibre",
        "U",
        "24",
        "24",
        "Conforme",
        "—",
      ],
    ],
    photoKinds: [
      { id: "colis", label: "Colis / livraison" },
      { id: "ecart", label: "Écart / casse" },
      { id: "signature", label: "Preuve signature" },
    ],
    extraSections: [
      {
        title: "Identification",
        fields: [
          {
            name: "statut_bl",
            label: "Statut BL",
            kind: "select",
            options: [
              "En préparation",
              "En transit",
              "Livré",
              "Écart partiel",
              "Refusé",
              "Clôturé",
            ],
            defaultValue: "Livré",
          },
          {
            name: "da_ref",
            label: "Réf. demande d’achat",
            kind: "text",
            hint: "NECS-DA-…",
          },
          {
            name: "bc_ref",
            label: "Réf. bon de commande",
            kind: "text",
            hint: "NECS-BC-…",
          },
          {
            name: "magasin",
            label: "Magasin / dépôt",
            kind: "text",
            defaultValue: "Dépôt Douala",
          },
          {
            name: "livreur",
            label: "Livreur / magasinier",
            kind: "text",
          },
          {
            name: "transporteur",
            label: "Transporteur",
            kind: "text",
            defaultValue: "Interne NECS",
          },
        ],
      },
      {
        title: "Réception",
        fields: [
          {
            name: "site",
            label: "Site destinataire",
            kind: "text",
            required: true,
          },
          {
            name: "receptionnaire",
            label: "Réceptionnaire",
            kind: "text",
            required: true,
          },
          {
            name: "heure_reception",
            label: "Heure réception",
            kind: "text",
            defaultValue: "10:30",
          },
          {
            name: "etat_global",
            label: "État global",
            kind: "select",
            options: [
              "Conforme",
              "Écart partiel",
              "Non conforme",
              "Refusé",
            ],
            defaultValue: "Conforme",
          },
          {
            name: "observations",
            label: "Observations / réserves",
            kind: "textarea",
            full: true,
          },
          {
            name: "stock_maj",
            label: "Mise à jour stock",
            kind: "select",
            options: [
              "Oui",
              "Non",
              "Partielle",
            ],
            defaultValue: "Oui",
          },
        ],
      },
      {
        title: "Validation",
        fields: [
          {
            name: "valide_ops",
            label: "Validé OPS",
            kind: "text",
            defaultValue: "Chef d’équipe",
          },
          {
            name: "date_validation",
            label: "Date validation",
            kind: "date",
          },
          {
            name: "suivi_ecart",
            label: "Suivi écart",
            kind: "textarea",
            full: true,
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "BL-0212",
        label: "Mall Riviera ; livrables EPI",
        status: "Conforme",
        owner: "S. Ndjock",
        updated: "07/09/2026",
        amount: "—",
      },
      {
        id: "BL-0213",
        label: "Usine Bassa ; consommables",
        status: "Écart partiel",
        owner: "Magasin",
        updated: "09/09/2026",
        amount: "2 manquants",
      },
      {
        id: "BL-0210",
        label: "Horizon ; réassort mensuel",
        status: "Conforme",
        owner: "Magasin",
        updated: "02/09/2026",
        amount: "—",
      },
    ],
  },
  "TMP-05": {
    checks: [
      "Parties et représentants identifiés",
      "Périmètre, sites et SLA définis",
      "Durée, reconduction et préavis clairs",
      "Tarifs, indexation et facturation validés",
      "Clauses résiliation / responsabilité relues",
      "Annexes techniques jointes",
      "BC / devis de référence liés",
      "Signatures et dates d’effet préparées",
    ],
    kpis: moneyKpis(
      "Contrats actifs|42",
      "À renouveler|6",
      "CA annuel|86 M",
      "SLA moyens|Premium",
    ),
    lineHeaders: [
      "Prestation",
      "Fréquence",
      "Effectif",
      "Montant HT / mois",
    ],
    lineRows: [
      [
        "Entretien courant bureaux",
        "5 j / sem",
        "3",
        "550 000",
      ],
      [
        "Sanitaires & hygiène",
        "5 j / sem",
        "1",
        "187 000",
      ],
      [
        "Vitrerie intérieure",
        "Mensuel",
        "2",
        "85 000",
      ],
      [
        "Consommables inclus",
        "Mensuel",
        "—",
        "75 000",
      ],
    ],
    extraSections: [
      {
        title: "Identification",
        fields: [
          {
            name: "statut_contrat",
            label: "Statut",
            kind: "select",
            options: [
              "Brouillon",
              "En revue juridique",
              "À signer",
              "Actif",
              "Suspendu",
              "Résilié",
              "Expiré",
            ],
            defaultValue: "Brouillon",
          },
          {
            name: "bc_ref",
            label: "BC / devis de référence",
            kind: "text",
            hint: "NECS-BC-… / NECS-DEV-…",
          },
          {
            name: "version",
            label: "Version contrat",
            kind: "text",
            defaultValue: "1.0",
          },
          {
            name: "lieu_signature",
            label: "Lieu de signature",
            kind: "text",
            defaultValue: "Douala",
          },
        ],
      },
      {
        title: "Conditions financières",
        fields: [
          {
            name: "prix_mensuel_ht",
            label: "Prix mensuel HT (FCFA)",
            kind: "text",
            defaultValue: "897 000",
          },
          {
            name: "tva",
            label: "TVA (%)",
            kind: "number",
            defaultValue: "19.25",
          },
          {
            name: "indexation",
            label: "Indexation annuelle",
            kind: "text",
            defaultValue: "Selon IPC / avenant",
          },
          {
            name: "facturation",
            label: "Modalités de facturation",
            kind: "text",
            defaultValue: "Mensuelle · fin de mois · 30 j",
          },
          {
            name: "depot_garantie",
            label: "Dépôt / caution",
            kind: "text",
            defaultValue: "Néant",
          },
          {
            name: "penalites",
            label: "Pénalités / bonus qualité",
            kind: "textarea",
            full: true,
            defaultValue:
              "Pénalités si score qualité < seuil SLA pendant 2 mois consécutifs (avenant tarifaire).",
          },
        ],
      },
      {
        title: "Clauses clés",
        fields: [
          {
            name: "confidentialite",
            label: "Confidentialité",
            kind: "textarea",
            full: true,
            defaultValue:
              "Les parties s’engagent à la confidentialité des informations commerciales et opérationnelles.",
          },
          {
            name: "resiliation",
            label: "Résiliation",
            kind: "textarea",
            full: true,
            defaultValue:
              "Préavis 60 jours · Motif grave sans préavis après mise en demeure restée sans effet.",
          },
          {
            name: "force_majeure",
            label: "Force majeure",
            kind: "textarea",
            full: true,
          },
          {
            name: "annexes",
            label: "Annexes",
            kind: "text",
            full: true,
            defaultValue: "Annexe 1 périmètre · Annexe 2 SLA · Annexe 3 tarifs · Annexe 4 planning",
          },
        ],
      },
      {
        title: "Signatures",
        fields: [
          {
            name: "signataire_necs",
            label: "Signataire NECS",
            kind: "text",
            defaultValue: "Direction Générale",
          },
          {
            name: "date_signature_necs",
            label: "Date signature NECS",
            kind: "date",
          },
          {
            name: "signataire_client",
            label: "Signataire client",
            kind: "text",
          },
          {
            name: "date_signature_client",
            label: "Date signature client",
            kind: "date",
          },
          {
            name: "date_effet_confirm",
            label: "Date d’effet confirmée",
            kind: "date",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "CTR-0034",
        label: "Société Exemple SA ; Premium",
        status: "Actif",
        owner: "Direction",
        updated: "01/04/2026",
        amount: "847 000 / mois",
      },
      {
        id: "CTR-0028",
        label: "Groupe Atlas ; Critique",
        status: "Actif",
        owner: "Commercial",
        updated: "15/01/2026",
        amount: "1,32 M / mois",
      },
      {
        id: "CTR-0041",
        label: "Clinique La Roseraie",
        status: "À signer",
        owner: "A. Mbarga",
        updated: "10/09/2026",
        amount: "890 000 / mois",
      },
    ],
  },
  "TMP-06": {
    checks: [
      "Contrat initial référencé et versionné",
      "Modification clairement décrite",
      "Impact tarifaire et effectifs chiffrés",
      "Avant / après documentés",
      "Accord des deux parties obtenu",
      "Avenant numéroté et archivé",
      "OPS / Finance informés de l’effet",
    ],
    kpis: moneyKpis(
      "Avenants 2026|9",
      "Impact moyen|+7 %",
      "En attente|2",
      "Signés mois|3",
    ),
    lineHeaders: [
      "Élément",
      "Avant",
      "Après",
      "Écart",
    ],
    lineRows: [
      [
        "Périmètre (m²)",
        "1 800",
        "2 100",
        "+300",
      ],
      [
        "Effectif",
        "4",
        "5",
        "+1",
      ],
      [
        "Tarif HT / mois",
        "897 000",
        "1 017 000",
        "+120 000",
      ],
      [
        "Horaires",
        "06–14",
        "06–16",
        "+2 h",
      ],
    ],
    extraSections: [
      {
        title: "Identification",
        fields: [
          {
            name: "statut_avenant",
            label: "Statut",
            kind: "select",
            options: [
              "Brouillon",
              "En revue",
              "À signer",
              "Signé",
              "Refusé",
              "Annulé",
            ],
            defaultValue: "Brouillon",
          },
          {
            name: "client",
            label: "Client",
            kind: "text",
            required: true,
          },
          {
            name: "commercial",
            label: "Commercial / juriste",
            kind: "text",
          },
          {
            name: "motif",
            label: "Motif synthétique",
            kind: "text",
            full: true,
            defaultValue: "Extension de périmètre suite visite technique",
          },
        ],
      },
      {
        title: "Avant / après",
        fields: [
          {
            name: "perimetre_avant",
            label: "Périmètre avant",
            kind: "textarea",
            required: true,
            full: true,
          },
          {
            name: "perimetre_apres",
            label: "Périmètre après",
            kind: "textarea",
            required: true,
            full: true,
          },
          {
            name: "tarif_avant",
            label: "Tarif HT avant",
            kind: "text",
            defaultValue: "897 000",
          },
          {
            name: "tarif_apres",
            label: "Tarif HT après",
            kind: "text",
            defaultValue: "1 017 000",
          },
          {
            name: "duree_avant",
            label: "Durée avant",
            kind: "text",
          },
          {
            name: "duree_apres",
            label: "Durée après",
            kind: "text",
          },
          {
            name: "effectifs_avant",
            label: "Effectifs avant",
            kind: "number",
            defaultValue: "4",
          },
          {
            name: "effectifs_apres",
            label: "Effectifs après",
            kind: "number",
            defaultValue: "5",
          },
        ],
      },
      {
        title: "Impact & diffusion",
        fields: [
          {
            name: "impact_ht",
            label: "Impact financier HT / mois",
            kind: "text",
            defaultValue: "+120 000",
          },
          {
            name: "impact_annuel",
            label: "Impact annuel HT",
            kind: "text",
          },
          {
            name: "notif_ops",
            label: "Notification OPS",
            kind: "select",
            options: [
              "À faire",
              "Faite",
              "Accusé",
            ],
            defaultValue: "À faire",
          },
          {
            name: "notif_finance",
            label: "Notification Finance",
            kind: "select",
            options: [
              "À faire",
              "Faite",
              "Accusé",
            ],
            defaultValue: "À faire",
          },
          {
            name: "clauses",
            label: "Clauses particulières",
            kind: "textarea",
            full: true,
          },
        ],
      },
      {
        title: "Signatures",
        fields: [
          {
            name: "signataire_necs",
            label: "Signataire NECS",
            kind: "text",
            required: true,
          },
          {
            name: "signataire_client",
            label: "Signataire client",
            kind: "text",
            required: true,
          },
          {
            name: "date_signature",
            label: "Date signature",
            kind: "date",
          },
          {
            name: "lieu_signature",
            label: "Lieu",
            kind: "text",
            defaultValue: "Douala",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "AV-0018",
        label: "Extension horaires ; Horizon",
        status: "Signé",
        owner: "Commercial",
        updated: "05/09/2026",
        amount: "+120 000",
      },
      {
        id: "AV-0019",
        label: "Ajout étage ; Atlas",
        status: "En revue",
        owner: "Direction",
        updated: "11/09/2026",
        amount: "+85 000",
      },
      {
        id: "AV-0017",
        label: "Réduction surface ; Palm",
        status: "Signé",
        owner: "Commercial",
        updated: "20/08/2026",
        amount: "-45 000",
      },
    ],
  },
  "TMP-07": {
    checks: [
      "Identité agent vérifiée (CNI valide)",
      "Poste, site et horaires d’affectation",
      "Rémunération, primes et avantages",
      "Période d’essai définie",
      "Dossier d’embauche lié (TMP-09)",
      "EPI et consignes de sécurité",
      "Contrat signé des deux côtés",
      "Accès pointage / badges ouverts",
    ],
    kpis: moneyKpis(
      "Contrats agents|128",
      "Nouveaux mois|6",
      "Fin d’essai|4",
      "À signer|3",
    ),
    extraSections: [
      {
        title: "Identification",
        fields: [
          {
            name: "statut_contrat_rh",
            label: "Statut",
            kind: "select",
            options: [
              "Brouillon",
              "À signer",
              "Actif",
              "Essai",
              "Suspendu",
              "Terminé",
            ],
            defaultValue: "À signer",
          },
          {
            name: "dossier_ref",
            label: "Réf. dossier embauche",
            kind: "text",
            hint: "NECS-RH-DE-…",
          },
          {
            name: "fiche_poste_ref",
            label: "Réf. fiche de poste",
            kind: "text",
            hint: "NECS-RH-FP-…",
          },
          {
            name: "rh_referent",
            label: "Référent RH",
            kind: "text",
            required: true,
          },
        ],
      },
      {
        title: "Conditions d’emploi",
        fields: [
          {
            name: "cni",
            label: "N° CNI / Passeport",
            kind: "text",
            required: true,
          },
          {
            name: "naissance",
            label: "Date de naissance",
            kind: "date",
          },
          {
            name: "telephone",
            label: "Téléphone",
            kind: "tel",
          },
          {
            name: "adresse",
            label: "Adresse",
            kind: "text",
            full: true,
          },
          {
            name: "essai_debut",
            label: "Début période d’essai",
            kind: "date",
          },
          {
            name: "essai_fin",
            label: "Fin période d’essai",
            kind: "date",
          },
          {
            name: "salaire",
            label: "Salaire de base (FCFA)",
            kind: "text",
            required: true,
          },
          {
            name: "primes",
            label: "Primes / avantages",
            kind: "textarea",
            full: true,
            defaultValue: "Transport · Panier repas",
            hint: "Transport, panier, logement…",
          },
          {
            name: "categorie",
            label: "Catégorie",
            kind: "select",
            options: [
              "Agent",
              "Chef d’équipe",
              "Superviseur",
              "Autre",
            ],
            defaultValue: "Agent",
          },
          {
            name: "convention",
            label: "Référence convention / grille",
            kind: "text",
            defaultValue: "Grille NECS agents",
          },
        ],
      },
      {
        title: "Clauses & signatures",
        fields: [
          {
            name: "epi",
            label: "EPI fournis",
            kind: "textarea",
            full: true,
            defaultValue: "Tenue · Chaussures · Gants · Masque",
          },
          {
            name: "confidentialite",
            label: "Confidentialité / non-concurrence",
            kind: "textarea",
            full: true,
          },
          {
            name: "signataire_rh",
            label: "Signataire RH",
            kind: "text",
          },
          {
            name: "signataire_agent",
            label: "Signataire agent",
            kind: "text",
          },
          {
            name: "date_signature",
            label: "Date signature",
            kind: "date",
          },
          {
            name: "lieu_signature",
            label: "Lieu",
            kind: "text",
            defaultValue: "Douala",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "CA-0342",
        label: "M. Ngo ; Agent sanitaires",
        status: "Actif",
        owner: "RH",
        updated: "01/09/2026",
        amount: "—",
      },
      {
        id: "CA-0345",
        label: "Grace Embolo ; Agent",
        status: "À signer",
        owner: "RH",
        updated: "09/09/2026",
        amount: "—",
      },
      {
        id: "CA-0338",
        label: "P. Ndjock ; Chef d’équipe",
        status: "Essai",
        owner: "RH",
        updated: "15/08/2026",
        amount: "—",
      },
    ],
  },
  "TMP-08": {
    checks: [
      "Mission principale claire",
      "Responsabilités et livrables listés",
      "Compétences et niveau requis",
      "Indicateurs de performance définis",
      "Hiérarchie / rattachement indiqué",
      "Sécurité / EPI précisés",
      "Validé RH + OPS",
    ],
    kpis: moneyKpis(
      "Fiches actives|18",
      "À mettre à jour|3",
      "Nouveaux postes|2",
      "Publiées|15",
    ),
    lineHeaders: [
      "Indicateur",
      "Cible",
      "Fréquence",
      "Responsable",
    ],
    lineRows: [
      [
        "Score qualité zones",
        "≥ 85/100",
        "Hebdo",
        "Superviseur",
      ],
      [
        "Respect planning",
        "100 %",
        "Quotidien",
        "Chef d’équipe",
      ],
      [
        "Pointage conforme",
        "≥ 98 %",
        "Mensuel",
        "RH / OPS",
      ],
      [
        "Incidents signalés < 24 h",
        "100 %",
        "Continu",
        "Agent",
      ],
    ],
    extraSections: [
      {
        title: "Identification",
        fields: [
          {
            name: "statut_fiche",
            label: "Statut",
            kind: "select",
            options: [
              "Brouillon",
              "En revue",
              "Validée",
              "Publiée",
              "Obsolète",
            ],
            defaultValue: "Validée",
          },
          {
            name: "code_poste",
            label: "Code poste",
            kind: "text",
            defaultValue: "AE-01",
          },
          {
            name: "famille",
            label: "Famille de métier",
            kind: "select",
            options: [
              "Terrain",
              "Encadrement",
              "Support",
              "Commercial",
            ],
            defaultValue: "Terrain",
          },
          {
            name: "version",
            label: "Version",
            kind: "text",
            defaultValue: "2026.1",
          },
        ],
      },
      {
        title: "Profil & moyens",
        fields: [
          {
            name: "niveau",
            label: "Niveau requis",
            kind: "select",
            options: [
              "Débutant",
              "Confirmé",
              "Expert",
              "Encadrement",
            ],
            defaultValue: "Confirmé",
          },
          {
            name: "experience",
            label: "Expérience min.",
            kind: "text",
            defaultValue: "1 an",
          },
          {
            name: "langues",
            label: "Langues",
            kind: "text",
            defaultValue: "Français",
          },
          {
            name: "outils",
            label: "Outils / machines",
            kind: "textarea",
            full: true,
            defaultValue: "Matériel d’entretien NECS · Application pointage",
          },
          {
            name: "conditions",
            label: "Conditions de travail",
            kind: "textarea",
            full: true,
          },
          {
            name: "kpi1",
            label: "Indicateur 1",
            kind: "text",
            defaultValue: "Score qualité ≥ 85",
            hint: "Ex. score qualité ≥ 85",
          },
          {
            name: "kpi2",
            label: "Indicateur 2",
            kind: "text",
            defaultValue: "Respect consignes site",
          },
          {
            name: "kpi3",
            label: "Indicateur 3",
            kind: "text",
            defaultValue: "Pointage conforme",
          },
        ],
      },
      {
        title: "Validation",
        fields: [
          {
            name: "valide_rh",
            label: "Validé RH",
            kind: "text",
          },
          {
            name: "valide_ops",
            label: "Validé OPS",
            kind: "text",
          },
          {
            name: "date_validite",
            label: "Date de validité",
            kind: "date",
          },
          {
            name: "prochaine_revue",
            label: "Prochaine revue",
            kind: "date",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "FP-AE-01",
        label: "Agent d’entretien",
        status: "Validée",
        owner: "RH",
        updated: "01/08/2026",
        amount: "—",
      },
      {
        id: "FP-CE-01",
        label: "Chef d’équipe",
        status: "Validée",
        owner: "RH",
        updated: "01/08/2026",
        amount: "—",
      },
      {
        id: "FP-0019",
        label: "Chef d’équipe multi-sites",
        status: "Publiée",
        owner: "RH",
        updated: "03/09/2026",
        amount: "—",
      },
    ],
  },
  "TMP-09": {
    checks: [
      "Identité et contact complets",
      "Pièce d’identité en cours de validité",
      "CV et références collectés",
      "RIB / infos bancaires",
      "Certificat médical d’aptitude",
      "Contrats / documents signés",
      "Casier judiciaire si requis",
      "Dossier validé RH avant démarrage",
    ],
    kpis: moneyKpis(
      "Dossiers ouverts|7",
      "Complets|4",
      "Délai moyen|5 j",
      "Bloqués|1",
    ),
    lineHeaders: [
      "Pièce",
      "Obligatoire",
      "Reçue",
      "Validité",
      "Statut",
    ],
    lineRows: [
      [
        "CNI / Passeport",
        "Oui",
        "Oui",
        "2028",
        "OK",
      ],
      [
        "CV",
        "Oui",
        "Oui",
        "—",
        "OK",
      ],
      [
        "RIB",
        "Oui",
        "Non",
        "—",
        "Manquant",
      ],
      [
        "Certificat médical",
        "Oui",
        "Oui",
        "2026-12",
        "OK",
      ],
      [
        "Casier judiciaire",
        "Si requis",
        "Non",
        "—",
        "N/A",
      ],
      [
        "Photo identité",
        "Oui",
        "Oui",
        "—",
        "OK",
      ],
    ],
    extraSections: [
      {
        title: "Identité & contact",
        fields: [
          {
            name: "cni",
            label: "N° CNI",
            kind: "text",
            required: true,
          },
          {
            name: "telephone",
            label: "Téléphone",
            kind: "tel",
            required: true,
          },
          {
            name: "email",
            label: "Email",
            kind: "email",
          },
          {
            name: "adresse",
            label: "Adresse",
            kind: "text",
            full: true,
          },
          {
            name: "urgence_nom",
            label: "Contact d’urgence",
            kind: "text",
          },
          {
            name: "urgence_tel",
            label: "Tél. urgence",
            kind: "tel",
          },
          {
            name: "poste_vise",
            label: "Poste visé",
            kind: "text",
            required: true,
            defaultValue: "Agent d’entretien",
          },
          {
            name: "date_entree",
            label: "Date d’entrée prévue",
            kind: "date",
          },
          {
            name: "statut_dossier",
            label: "Statut dossier",
            kind: "select",
            options: [
              "Incomplet",
              "En revue",
              "Complet",
              "Validé",
              "Bloqué",
              "Archivé",
            ],
            defaultValue: "Incomplet",
          },
          {
            name: "notes_rh",
            label: "Notes RH",
            kind: "textarea",
            full: true,
          },
        ],
      },
      {
        title: "Liens & validation",
        fields: [
          {
            name: "entretien_ref",
            label: "Réf. entretien",
            kind: "text",
            hint: "NECS-RH-ENT-…",
          },
          {
            name: "contrat_ref",
            label: "Réf. contrat agent",
            kind: "text",
            hint: "NECS-RH-CTR-…",
          },
          {
            name: "pieces_manquantes",
            label: "Pièces manquantes",
            kind: "textarea",
            full: true,
          },
          {
            name: "valide_par",
            label: "Validé par RH",
            kind: "text",
          },
          {
            name: "date_validation",
            label: "Date validation",
            kind: "date",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "DE-055",
        label: "Linda Fouda",
        status: "Complet",
        owner: "RH",
        updated: "08/09/2026",
        amount: "—",
      },
      {
        id: "DE-056",
        label: "Boris Manga",
        status: "Incomplet",
        owner: "RH",
        updated: "10/09/2026",
        amount: "RIB manquant",
      },
      {
        id: "DE-057",
        label: "Grace Embolo",
        status: "Validé",
        owner: "RH",
        updated: "09/09/2026",
        amount: "—",
      },
    ],
  },
  "TMP-10": {
    checks: [
      "CV et pièces reçus",
      "Grille d’évaluation renseignée",
      "Avis recruteur motivé",
      "Décision (retenu / refus / pool)",
      "Feedback candidat prévu",
      "Dossier embauche initié si retenu",
    ],
    kpis: moneyKpis(
      "Entretiens mois|14",
      "Retenus|5",
      "Taux retenus|36 %",
      "Pool|4",
    ),
    extraSections: [
      {
        title: "Contexte",
        fields: [
          {
            name: "statut_entretien",
            label: "Statut",
            kind: "select",
            options: [
              "Planifié",
              "Réalisé",
              "Reporté",
              "Annulé",
            ],
            defaultValue: "Réalisé",
          },
          {
            name: "duree",
            label: "Durée (min)",
            kind: "number",
            defaultValue: "30",
          },
          {
            name: "lieu",
            label: "Lieu / modalité",
            kind: "text",
            defaultValue: "Présentiel Douala",
          },
          {
            name: "poste_ref",
            label: "Réf. fiche de poste",
            kind: "text",
          },
        ],
      },
      {
        title: "Notation (1–5)",
        fields: [
          {
            name: "score_presentation",
            label: "Présentation",
            kind: "number",
            defaultValue: "3",
          },
          {
            name: "score_experience",
            label: "Expérience",
            kind: "number",
            defaultValue: "3",
          },
          {
            name: "score_motivation",
            label: "Motivation",
            kind: "number",
            defaultValue: "3",
          },
          {
            name: "score_technique",
            label: "Savoir-faire terrain",
            kind: "number",
            defaultValue: "3",
          },
          {
            name: "score_ponctualite",
            label: "Ponctualité / attitude",
            kind: "number",
            defaultValue: "3",
          },
          {
            name: "score_global",
            label: "Note globale /20",
            kind: "number",
          },
          {
            name: "avis",
            label: "Avis / décision motivée",
            kind: "textarea",
            full: true,
          },
          {
            name: "points_forts",
            label: "Points forts",
            kind: "textarea",
            full: true,
          },
          {
            name: "axes",
            label: "Axes d’amélioration",
            kind: "textarea",
            full: true,
          },
        ],
      },
      {
        title: "Suite recrutement",
        fields: [
          {
            name: "feedback_envoye",
            label: "Feedback candidat",
            kind: "select",
            options: [
              "À faire",
              "Envoyé",
              "Non requis",
            ],
            defaultValue: "À faire",
          },
          {
            name: "essai_terrain",
            label: "Essai terrain prévu",
            kind: "select",
            options: [
              "Non",
              "Oui",
              "Fait",
            ],
          },
          {
            name: "dossier_lie",
            label: "Dossier embauche lié",
            kind: "text",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "ENT-0091",
        label: "Candidat ; Agent polyvalent",
        status: "Retenu",
        owner: "RH",
        updated: "06/09/2026",
        amount: "16/20",
      },
      {
        id: "ENT-0092",
        label: "Candidat ; Chef d’équipe",
        status: "Pool",
        owner: "RH",
        updated: "08/09/2026",
        amount: "14/20",
      },
      {
        id: "ENT-0090",
        label: "Candidat ; Agent",
        status: "Refusé",
        owner: "RH",
        updated: "02/09/2026",
        amount: "9/20",
      },
    ],
  },
  "TMP-11": {
    checks: [
      "Accueil et présentation faits",
      "Équipements / EPI remis",
      "Formation sécurité réalisée",
      "Consignes site client transmises",
      "Accès systèmes / pointage ouverts",
      "Parrain / tuteur désigné",
      "Objectifs 30 jours fixés",
      "Validation fin d’intégration",
    ],
    kpis: moneyKpis(
      "En intégration|5",
      "Terminés mois|3",
      "Taux complétion|92 %",
      "Retards|1",
    ),
    lineHeaders: [
      "Étape",
      "Jour",
      "Fait",
      "Validé par",
    ],
    lineRows: [
      [
        "Accueil RH",
        "J1",
        "Oui",
        "RH",
      ],
      [
        "Remise EPI",
        "J1",
        "Oui",
        "Magasin",
      ],
      [
        "Formation sécurité",
        "J2",
        "Oui",
        "OPS",
      ],
      [
        "Présentation site client",
        "J3",
        "Non",
        "—",
      ],
      [
        "Accès pointage",
        "J1",
        "Oui",
        "IT / RH",
      ],
    ],
    extraSections: [
      {
        title: "Parcours d’intégration",
        fields: [
          {
            name: "tuteur",
            label: "Tuteur / parrain",
            kind: "text",
            required: true,
          },
          {
            name: "site",
            label: "Site d’affectation",
            kind: "text",
            required: true,
          },
          {
            name: "date_debut",
            label: "Début onboarding",
            kind: "date",
            required: true,
          },
          {
            name: "date_fin",
            label: "Fin prévue",
            kind: "date",
          },
          {
            name: "formation_secu",
            label: "Formation sécurité",
            kind: "select",
            options: [
              "À planifier",
              "Faite",
              "Reportée",
            ],
            defaultValue: "À planifier",
          },
          {
            name: "kit_remis",
            label: "Kit / EPI remis",
            kind: "select",
            options: [
              "Non",
              "Partiel",
              "Complet",
            ],
            defaultValue: "Non",
          },
          {
            name: "objectifs_30j",
            label: "Objectifs 30 jours",
            kind: "textarea",
            full: true,
          },
          {
            name: "bilan",
            label: "Bilan / points d’attention",
            kind: "textarea",
            full: true,
          },
          {
            name: "statut_onb",
            label: "Statut",
            kind: "select",
            options: [
              "En cours",
              "Terminé",
              "Suspendu",
            ],
            defaultValue: "En cours",
          },
          {
            name: "valide_par",
            label: "Validé par",
            kind: "text",
          },
          {
            name: "contrat_ref",
            label: "Contrat agent lié",
            kind: "text",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "ONB-0044",
        label: "Intégration ; site Bassa",
        status: "En cours",
        owner: "RH",
        updated: "09/09/2026",
        amount: "7/10",
      },
      {
        id: "ONB-0045",
        label: "Intégration ; Horizon",
        status: "Terminé",
        owner: "RH",
        updated: "01/09/2026",
        amount: "10/10",
      },
    ],
  },
  "TMP-12": {
    checks: [
      "Site et créneau confirmés",
      "Équipe affectée et pointée",
      "Matériel disponible",
      "Consignes lues par le chef d’équipe",
      "Photo arrivée prise",
      "Photo départ / après prise",
      "Anomalies signalées si besoin",
      "Clôture superviseur",
    ],
    kpis: moneyKpis(
      "OT du jour|18",
      "Terminés|11",
      "Anomalies|2",
      "Taux réalisation|89 %",
    ),
    photoKinds: [
      { id: "avant", label: "Avant / Arrivée" },
      { id: "pendant", label: "Pendant" },
      { id: "apres", label: "Après / Départ" },
      { id: "anomalie", label: "Anomalie" },
    ],
    lineHeaders: [
      "Agent",
      "Rôle",
      "Arrivée",
      "Départ",
      "Preuve",
    ],
    lineRows: [
      [
        "A. Kouam",
        "Chef d’équipe",
        "06:02",
        "14:05",
        "Photo",
      ],
      [
        "M. Ngo",
        "Agent",
        "06:05",
        "14:00",
        "Photo",
      ],
      [
        "G. Embolo",
        "Agent",
        "06:18",
        "14:02",
        "Photo",
      ],
      [
        "P. Ndjock",
        "Agent",
        "—",
        "—",
        "Absent",
      ],
    ],
    extraSections: [
      {
        title: "Pilotage",
        fields: [
          {
            name: "statut_ot",
            label: "Statut OT",
            kind: "select",
            options: [
              "Planifié",
              "En cours",
              "Terminé",
              "Anomalie",
              "Annulé",
            ],
            defaultValue: "Planifié",
          },
          {
            name: "contrat_ref",
            label: "Contrat / BC lié",
            kind: "text",
          },
          {
            name: "priorite",
            label: "Priorité",
            kind: "select",
            options: [
              "Normale",
              "Haute",
              "Urgente",
            ],
            defaultValue: "Normale",
          },
          {
            name: "zones",
            label: "Zones prioritaires",
            kind: "textarea",
            full: true,
          },
        ],
      },
      {
        title: "Clôture",
        fields: [
          {
            name: "heure_fin",
            label: "Heure de fin",
            kind: "text",
          },
          {
            name: "compte_rendu",
            label: "Compte rendu terrain",
            kind: "textarea",
            full: true,
          },
          {
            name: "signature_superviseur",
            label: "Superviseur",
            kind: "text",
          },
          {
            name: "client_informe",
            label: "Client informé si anomalie",
            kind: "select",
            options: [
              "N/A",
              "Oui",
              "Non",
            ],
          },
          {
            name: "score_auto",
            label: "Score indicatif /100",
            kind: "number",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "OT-1440",
        label: "Immeuble Horizon ; quotidien",
        status: "En cours",
        owner: "S. Ndjock",
        updated: "10/09/2026",
        amount: "4 agents",
      },
      {
        id: "OT-1441",
        label: "Usine Bassa ; atelier",
        status: "Planifié",
        owner: "S. Ndjock",
        updated: "10/09/2026",
        amount: "6 agents",
      },
      {
        id: "OT-1438",
        label: "Mall Riviera ; nuit",
        status: "Terminé",
        owner: "S. Ndjock",
        updated: "09/09/2026",
        amount: "3 agents",
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
      "Clôture après correction",
    ],
    kpis: moneyKpis(
      "Contrôles mois|22",
      "Score moyen|87",
      "NC ouvertes|4",
      "Délai correctif|2,5 j",
    ),
    photoKinds: [
      { id: "preuve", label: "Preuve qualité" },
      { id: "nc", label: "Non-conformité" },
      { id: "apres_correction", label: "Après correction" },
    ],
    lineHeaders: [
      "Zone",
      "Score /5",
      "NC",
      "Action",
      "Échéance",
    ],
    lineRows: [
      [
        "Sols / circulations",
        "4",
        "Non",
        "—",
        "—",
      ],
      [
        "Sanitaires",
        "3",
        "Oui",
        "Désinfection renforcée",
        "11/09",
      ],
      [
        "Surfaces / mobilier",
        "4",
        "Non",
        "—",
        "—",
      ],
      [
        "Vitrerie",
        "5",
        "Non",
        "—",
        "—",
      ],
      [
        "Odeurs / hygiène",
        "4",
        "Non",
        "—",
        "—",
      ],
    ],
    extraSections: [
      {
        title: "Notation zones (/5)",
        fields: [
          {
            name: "q_sols",
            label: "Sols / circulation",
            kind: "number",
            defaultValue: "4",
          },
          {
            name: "q_sanitaires",
            label: "Sanitaires",
            kind: "number",
            defaultValue: "4",
          },
          {
            name: "q_surfaces",
            label: "Surfaces / mobilier",
            kind: "number",
            defaultValue: "4",
          },
          {
            name: "q_vitrerie",
            label: "Vitrerie",
            kind: "number",
            defaultValue: "4",
          },
          {
            name: "q_odeurs",
            label: "Odeurs / hygiène",
            kind: "number",
            defaultValue: "4",
          },
          {
            name: "score_global",
            label: "Score global /100",
            kind: "number",
            defaultValue: "87",
          },
        ],
      },
      {
        title: "Non-conformités & actions",
        fields: [
          {
            name: "statut_qa",
            label: "Statut contrôle",
            kind: "select",
            options: [
              "Brouillon",
              "Ouvert",
              "Action en cours",
              "Clos",
              "Escaladé",
            ],
            defaultValue: "Ouvert",
          },
          {
            name: "nc_detail",
            label: "Détail NC",
            kind: "textarea",
            full: true,
          },
          {
            name: "action_corrective",
            label: "Action corrective",
            kind: "textarea",
            full: true,
          },
          {
            name: "responsable_action",
            label: "Responsable action",
            kind: "text",
          },
          {
            name: "echeance_action",
            label: "Échéance",
            kind: "date",
          },
          {
            name: "client_informe",
            label: "Client informé",
            kind: "select",
            options: [
              "Non requis",
              "Oui",
              "À faire",
            ],
          },
          {
            name: "controleur",
            label: "Contrôleur qualité",
            kind: "text",
            required: true,
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "QA-0312",
        label: "Horizon ; contrôle hebdo",
        status: "Clos",
        owner: "Qualité",
        updated: "08/09/2026",
        amount: "92/100",
      },
      {
        id: "QA-0315",
        label: "Bassa ; NC sanitaires",
        status: "Action en cours",
        owner: "Qualité",
        updated: "10/09/2026",
        amount: "78/100",
      },
    ],
  },
  "TMP-14": {
    checks: [
      "Période et site exacts",
      "Réalisé vs planifié renseigné",
      "Incidents documentés",
      "Photos / preuves associées",
      "Recommandations formulées",
      "Validé superviseur",
    ],
    kpis: moneyKpis(
      "Rapports mois|14",
      "Score moyen|90",
      "Incidents|3",
      "Validés|12",
    ),
    photoKinds: [
      { id: "realisations", label: "Réalisations" },
      { id: "incidents", label: "Incidents" },
    ],
    extraSections: [
      {
        title: "Indicateurs & clôture",
        fields: [
          {
            name: "planifie",
            label: "Prestations planifiées",
            kind: "number",
          },
          {
            name: "realise",
            label: "Prestations réalisées",
            kind: "number",
          },
          {
            name: "taux",
            label: "Taux de réalisation (%)",
            kind: "number",
          },
          {
            name: "score_qualite",
            label: "Score qualité",
            kind: "number",
          },
          {
            name: "incidents",
            label: "Incidents / écarts",
            kind: "textarea",
            full: true,
          },
          {
            name: "recommandations",
            label: "Recommandations",
            kind: "textarea",
            full: true,
          },
          {
            name: "client_satisfait",
            label: "Satisfaction client",
            kind: "select",
            options: [
              "Non mesurée",
              "Satisfait",
              "Mitigé",
              "Insatisfait",
            ],
          },
          {
            name: "statut_rapport",
            label: "Statut",
            kind: "select",
            options: [
              "Brouillon",
              "Soumis",
              "Validé",
              "Rejeté",
            ],
            defaultValue: "Brouillon",
          },
          {
            name: "valide_par",
            label: "Validé par",
            kind: "text",
          },
          {
            name: "date_validation",
            label: "Date validation",
            kind: "date",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "RP-0088",
        label: "Rapport ; Usine Bassa S36",
        status: "Validé",
        owner: "S. Ndjock",
        updated: "08/09/2026",
        amount: "98 %",
      },
      {
        id: "RP-0089",
        label: "Rapport ; Horizon S37",
        status: "Soumis",
        owner: "S. Ndjock",
        updated: "10/09/2026",
        amount: "94 %",
      },
    ],
  },
  "TMP-15": {
    checks: [
      "Besoin justifié et quantifié",
      "Budget et centre de coût ok",
      "Fournisseur proposé",
      "Validation N+1 obtenue",
      "Réception / BL prévue",
      "Lien stock / site renseigné",
    ],
    kpis: moneyKpis(
      "Demandes ouvertes|9",
      "Budget engagé|1,8 M",
      "Délai moyen|3 j",
      "Approuvées|6",
    ),
    lineHeaders: [
      "Article",
      "Qté",
      "Unité",
      "P.U. estimé",
      "Total",
    ],
    lineRows: [
      [
        "Détergent 5L",
        "12",
        "Bidon",
        "4 500",
        "54 000",
      ],
      [
        "Sacs 100L",
        "20",
        "Rouleau",
        "3 200",
        "64 000",
      ],
      [
        "Gants nitrile",
        "10",
        "Boîte",
        "8 500",
        "85 000",
      ],
    ],
    extraSections: [
      {
        title: "Budget & validation",
        fields: [
          {
            name: "urgence",
            label: "Urgence",
            kind: "select",
            required: true,
            options: [
              "Basse",
              "Normale",
              "Haute",
              "Critique",
            ],
            defaultValue: "Normale",
          },
          {
            name: "budget_estime",
            label: "Budget estimé (FCFA)",
            kind: "text",
            required: true,
          },
          {
            name: "centre_cout",
            label: "Centre de coût / site",
            kind: "text",
          },
          {
            name: "approbateur",
            label: "Approbateur N+1",
            kind: "text",
            required: true,
          },
          {
            name: "decision",
            label: "Décision",
            kind: "select",
            options: [
              "En attente",
              "Approuvé",
              "Refusé",
              "Reporté",
            ],
            defaultValue: "En attente",
          },
          {
            name: "date_decision",
            label: "Date décision",
            kind: "date",
          },
          {
            name: "fournisseur",
            label: "Fournisseur proposé",
            kind: "text",
          },
          {
            name: "fournisseur_alt",
            label: "Fournisseur alternatif",
            kind: "text",
          },
          {
            name: "livraison_prevue",
            label: "Livraison prévue",
            kind: "date",
          },
          {
            name: "commentaire",
            label: "Commentaire validation",
            kind: "textarea",
            full: true,
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "DA-0155",
        label: "Consommables ; Horizon",
        status: "Approuvé",
        owner: "OPS",
        updated: "07/09/2026",
        amount: "245 000",
      },
      {
        id: "DA-0158",
        label: "EPI ; Bassa",
        status: "En attente",
        owner: "OPS",
        updated: "11/09/2026",
        amount: "180 000",
      },
    ],
  },
  "TMP-16": {
    checks: [
      "Solde de congés vérifié",
      "Dates cohérentes",
      "Remplaçant identifié",
      "Impact planning noté",
      "Validation manager",
      "RH notifié",
    ],
    kpis: moneyKpis(
      "Demandes mois|11",
      "Approuvées|8",
      "En attente|3",
      "Jours moyens|4",
    ),
    extraSections: [
      {
        title: "Détail absence",
        fields: [
          {
            name: "type_conge",
            label: "Type",
            kind: "select",
            options: [
              "Congé payé",
              "Sans solde",
              "Maladie",
              "Événement familial",
              "Autre",
            ],
            defaultValue: "Congé payé",
          },
          {
            name: "nb_jours",
            label: "Nombre de jours",
            kind: "number",
            required: true,
          },
          {
            name: "solde_restant",
            label: "Solde restant après",
            kind: "text",
          },
          {
            name: "remplacant",
            label: "Remplaçant",
            kind: "text",
            required: true,
          },
          {
            name: "impact_planning",
            label: "Impact planning",
            kind: "textarea",
            full: true,
          },
        ],
      },
      {
        title: "Validation",
        fields: [
          {
            name: "manager",
            label: "Manager",
            kind: "text",
          },
          {
            name: "decision",
            label: "Décision",
            kind: "select",
            options: [
              "En attente",
              "Approuvé",
              "Refusé",
            ],
            defaultValue: "En attente",
          },
          {
            name: "date_decision",
            label: "Date décision",
            kind: "date",
          },
          {
            name: "commentaire_rh",
            label: "Commentaire RH",
            kind: "textarea",
            full: true,
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "CG-0072",
        label: "Congé ; A. Kouam",
        status: "Approuvé",
        owner: "RH",
        updated: "04/09/2026",
        amount: "5 j",
      },
      {
        id: "CG-0075",
        label: "Congé ; M. Ngo",
        status: "En attente",
        owner: "RH",
        updated: "11/09/2026",
        amount: "3 j",
      },
    ],
  },
  "TMP-17": {
    checks: [
      "Agents présents pointés",
      "Horaires cohérents",
      "Anomalies justifiées",
      "Géo / site vérifié si requis",
      "Clôturé par chef d’équipe",
      "Export paie / RH si besoin",
    ],
    kpis: moneyKpis(
      "Présents|86 %",
      "Retards|7",
      "Absences|4",
      "Sites clos|9",
    ),
    lineHeaders: [
      "Agent",
      "Arrivée",
      "Départ",
      "Statut",
      "Anomalie",
    ],
    lineRows: [
      [
        "Grace Embolo",
        "06:02",
        "14:05",
        "Présent",
        "—",
      ],
      [
        "Paul Ndjock",
        "06:18",
        "14:00",
        "Retard",
        "Trafic",
      ],
      [
        "Amina Moussa",
        "—",
        "—",
        "Absent",
        "Congé",
      ],
      [
        "Marc Ngo",
        "06:00",
        "14:02",
        "Présent",
        "—",
      ],
    ],
    extraSections: [
      {
        title: "Clôture journée",
        fields: [
          {
            name: "site",
            label: "Site",
            kind: "text",
            required: true,
          },
          {
            name: "date_pointage",
            label: "Date",
            kind: "date",
            required: true,
          },
          {
            name: "shift",
            label: "Shift",
            kind: "select",
            options: [
              "Matin",
              "Après-midi",
              "Nuit",
              "Journée",
            ],
            defaultValue: "Matin",
          },
          {
            name: "chef_equipe",
            label: "Chef d’équipe",
            kind: "text",
            required: true,
          },
          {
            name: "presents",
            label: "Présents",
            kind: "number",
          },
          {
            name: "absents",
            label: "Absents",
            kind: "number",
          },
          {
            name: "retards",
            label: "Retards",
            kind: "number",
          },
          {
            name: "anomalies",
            label: "Anomalies / justifications",
            kind: "textarea",
            full: true,
          },
          {
            name: "geo",
            label: "Contrôle géo",
            kind: "select",
            options: [
              "Non requis",
              "OK",
              "Écart signalé",
            ],
          },
          {
            name: "statut_pt",
            label: "Statut",
            kind: "select",
            options: [
              "Ouvert",
              "Clos",
              "À reprendre",
            ],
            defaultValue: "Ouvert",
          },
          {
            name: "cloture_par",
            label: "Clôturé par",
            kind: "text",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "PT-1209",
        label: "Pointage ; Horizon 10/09",
        status: "Clos",
        owner: "Chef équipe",
        updated: "10/09/2026",
        amount: "4/4",
      },
      {
        id: "PT-1210",
        label: "Pointage ; Bassa 10/09",
        status: "Clos",
        owner: "Chef équipe",
        updated: "10/09/2026",
        amount: "5/6",
      },
    ],
  },
  "TMP-18": {
    checks: [
      "Prestations de la période listées",
      "Montants HT contrôlés",
      "Contrat / BC liés",
      "Écarts OT / absences intégrés",
      "Prêt pour facturation",
      "Validé Finance",
    ],
    kpis: moneyKpis(
      "Préfactures|15",
      "Montant|6,4 M",
      "À facturer|9",
      "Écarts|2",
    ),
    lineHeaders: [
      "Prestation",
      "Qté",
      "P.U. HT",
      "Total HT",
      "Source",
    ],
    lineRows: [
      [
        "Entretien mensuel bureaux",
        "1",
        "550 000",
        "550 000",
        "CTR-0034",
      ],
      [
        "Sanitaires",
        "1",
        "187 000",
        "187 000",
        "CTR-0034",
      ],
      [
        "Consommables",
        "1",
        "75 000",
        "75 000",
        "CTR-0034",
      ],
      [
        "Prestation ponctuelle",
        "1",
        "35 000",
        "35 000",
        "DEV-0148",
      ],
    ],
    extraSections: [
      {
        title: "Totaux",
        fields: [
          {
            name: "periode",
            label: "Période",
            kind: "month",
            required: true,
          },
          {
            name: "contrat_ref",
            label: "Contrat / BC",
            kind: "text",
            required: true,
          },
          {
            name: "total_ht",
            label: "Total HT",
            kind: "text",
            required: true,
          },
          {
            name: "tva",
            label: "TVA (%)",
            kind: "number",
            defaultValue: "19.25",
          },
          {
            name: "total_ttc",
            label: "Total TTC",
            kind: "text",
          },
          {
            name: "statut_pf",
            label: "Statut",
            kind: "select",
            options: [
              "Brouillon",
              "En contrôle",
              "Validée",
              "Facturée",
              "Rejetée",
            ],
            defaultValue: "En contrôle",
          },
          {
            name: "ecarts",
            label: "Écarts période",
            kind: "textarea",
            full: true,
          },
          {
            name: "valide_finance",
            label: "Validé Finance par",
            kind: "text",
          },
          {
            name: "facture_liee",
            label: "Facture liée",
            kind: "text",
            hint: "NECS-FAC-…",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "PF-0199",
        label: "Préfacture ; Mall Riviera août",
        status: "Validée",
        owner: "Finance",
        updated: "02/09/2026",
        amount: "2,1 M",
      },
      {
        id: "PF-0201",
        label: "Préfacture ; Horizon sept.",
        status: "En contrôle",
        owner: "Finance",
        updated: "10/09/2026",
        amount: "847 000",
      },
    ],
  },
  "TMP-19": {
    checks: [
      "Client et NIU / RCCM",
      "Préfacture / contrat liés",
      "Lignes et totaux exacts",
      "TVA calculée (19,25 %)",
      "Acomptes déduits",
      "Coordonnées bancaires",
      "Numérotation conforme",
      "Échéance et envoi client",
    ],
    kpis: moneyKpis(
      "Factures mois|19",
      "Émis|7,8 M",
      "Encaissé|5,1 M",
      "Retard|2",
    ),
    lineHeaders: [
      "Désignation",
      "Qté",
      "P.U. HT",
      "TVA",
      "Total HT",
    ],
    lineRows: [
      [
        "Prestation entretien septembre",
        "1",
        "847 000",
        "19,25 %",
        "847 000",
      ],
      [
        "Consommables inclus",
        "1",
        "0",
        "—",
        "0",
      ],
    ],
    extraSections: [
      {
        title: "Facturation",
        fields: [
          {
            name: "statut_fac",
            label: "Statut",
            kind: "select",
            options: [
              "Brouillon",
              "Émise",
              "Envoyée",
              "Partiellement payée",
              "Payée",
              "En retard",
              "Annulée",
            ],
            defaultValue: "Brouillon",
          },
          {
            name: "prefac_ref",
            label: "Préfacture liée",
            kind: "text",
            hint: "NECS-PF-…",
          },
          {
            name: "contrat_ref",
            label: "Contrat",
            kind: "text",
          },
          {
            name: "site_facture",
            label: "Site facturé",
            kind: "text",
          },
          {
            name: "ref_client",
            label: "Réf. client / PO",
            kind: "text",
          },
          {
            name: "niu",
            label: "NIU / RCCM client",
            kind: "text",
          },
          {
            name: "total_ht",
            label: "Total HT",
            kind: "text",
            required: true,
          },
          {
            name: "tva_montant",
            label: "Montant TVA",
            kind: "text",
          },
          {
            name: "acomptes",
            label: "Acomptes",
            kind: "text",
            defaultValue: "0",
          },
          {
            name: "net_a_payer",
            label: "Net à payer",
            kind: "text",
            required: true,
          },
          {
            name: "banque",
            label: "Coordonnées bancaires",
            kind: "textarea",
            full: true,
            defaultValue: "Banque : Afriland · IBAN / compte NECS (à compléter)",
          },
          {
            name: "echeance",
            label: "Échéance",
            kind: "date",
          },
          {
            name: "mode_paiement",
            label: "Mode de paiement",
            kind: "select",
            options: [
              "Virement",
              "Chèque",
              "Espèces",
              "Mobile money",
            ],
            defaultValue: "Virement",
          },
        ],
      },
      {
        title: "Envoi & suivi",
        fields: [
          {
            name: "date_emission",
            label: "Date émission",
            kind: "date",
          },
          {
            name: "date_envoi",
            label: "Date envoi client",
            kind: "date",
          },
          {
            name: "email_envoi",
            label: "Email destinataire",
            kind: "email",
          },
          {
            name: "relance_liee",
            label: "Relance liée",
            kind: "text",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "FAC-0450",
        label: "Exemple SA ; sept. 2026",
        status: "Envoyée",
        owner: "Finance",
        updated: "05/09/2026",
        amount: "847 000",
      },
      {
        id: "FAC-0448",
        label: "Atlas ; août 2026",
        status: "Payée",
        owner: "Finance",
        updated: "28/08/2026",
        amount: "1,32 M",
      },
      {
        id: "FAC-0449",
        label: "Mall Riviera ; août",
        status: "En retard",
        owner: "Finance",
        updated: "02/09/2026",
        amount: "2,1 M",
      },
    ],
  },
  "TMP-20": {
    checks: [
      "Facture d’origine liée",
      "Motif d’avoir justifié",
      "Montant cohérent (≤ facture)",
      "Impact comptable noté",
      "Client informé",
      "Validé Finance",
    ],
    kpis: moneyKpis(
      "Avoirs mois|3",
      "Montant|420 k",
      "Délai traitement|2 j",
      "Validés|2",
    ),
    extraSections: [
      {
        title: "Détail avoir",
        fields: [
          {
            name: "statut_avoir",
            label: "Statut",
            kind: "select",
            options: [
              "Brouillon",
              "Validé",
              "Émis",
              "Appliqué",
              "Annulé",
            ],
            defaultValue: "Brouillon",
          },
          {
            name: "facture_ref",
            label: "Facture d’origine",
            kind: "text",
            required: true,
          },
          {
            name: "client",
            label: "Client",
            kind: "text",
            required: true,
          },
          {
            name: "motif",
            label: "Motif",
            kind: "select",
            required: true,
            options: [
              "Trop-perçu",
              "Annulation partielle",
              "Erreur tarif",
              "Retour prestation",
              "Geste commercial",
              "Autre",
            ],
          },
          {
            name: "montant_ht",
            label: "Montant HT",
            kind: "text",
            required: true,
          },
          {
            name: "tva",
            label: "TVA (%)",
            kind: "number",
            defaultValue: "19.25",
          },
          {
            name: "montant_ttc",
            label: "Montant TTC",
            kind: "text",
            required: true,
          },
          {
            name: "date_emission",
            label: "Date d’émission",
            kind: "date",
          },
          {
            name: "impact",
            label: "Impact comptable",
            kind: "textarea",
            full: true,
          },
          {
            name: "valide_par",
            label: "Validé Finance par",
            kind: "text",
          },
          {
            name: "client_informe",
            label: "Client informé",
            kind: "select",
            options: [
              "Oui",
              "Non",
              "À faire",
            ],
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "AVO-0031",
        label: "Avoir ; trop-perçu Horizon",
        status: "Émis",
        owner: "Finance",
        updated: "05/09/2026",
        amount: "85 000",
      },
      {
        id: "AVO-0032",
        label: "Avoir ; geste commercial Atlas",
        status: "Validé",
        owner: "Finance",
        updated: "09/09/2026",
        amount: "50 000",
      },
    ],
  },
  "TMP-21": {
    checks: [
      "Période exacte",
      "Factures et règlements listés",
      "Avoirs intégrés",
      "Solde cohérent",
      "Relances liées si solde dû",
      "Envoyé au client",
    ],
    kpis: moneyKpis(
      "Relevés envoyés|12",
      "Solde dû|3,2 M",
      "À jour|8",
      "Contentieux|1",
    ),
    lineHeaders: [
      "Date",
      "Pièce",
      "Libellé",
      "Débit",
      "Crédit",
    ],
    lineRows: [
      [
        "01/08",
        "FAC-0441",
        "Facture juillet",
        "847 000",
        "—",
      ],
      [
        "15/08",
        "REG-902",
        "Virement client",
        "—",
        "847 000",
      ],
      [
        "02/09",
        "FAC-0450",
        "Facture août",
        "847 000",
        "—",
      ],
      [
        "05/09",
        "AVO-0031",
        "Avoir trop-perçu",
        "—",
        "85 000",
      ],
    ],
    extraSections: [
      {
        title: "Synthèse financière",
        fields: [
          {
            name: "email_client",
            label: "Email destinataire",
            kind: "email",
          },
          {
            name: "periode_debut",
            label: "Début période",
            kind: "date",
          },
          {
            name: "periode_fin",
            label: "Fin période",
            kind: "date",
          },
          {
            name: "debit_total",
            label: "Total débits",
            kind: "text",
          },
          {
            name: "credit_total",
            label: "Total crédits",
            kind: "text",
          },
          {
            name: "solde_ouverture",
            label: "Solde d’ouverture",
            kind: "text",
          },
          {
            name: "solde_cloture",
            label: "Solde de clôture",
            kind: "text",
            required: true,
          },
          {
            name: "statut_compte",
            label: "Statut compte",
            kind: "select",
            options: [
              "À jour",
              "Retard léger",
              "Retard important",
              "Contentieux",
            ],
          },
          {
            name: "commentaire",
            label: "Commentaire",
            kind: "textarea",
            full: true,
          },
          {
            name: "date_envoi",
            label: "Date d’envoi",
            kind: "date",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "RC-0048",
        label: "Relevé ; Société Exemple",
        status: "Envoyé",
        owner: "Finance",
        updated: "01/09/2026",
        amount: "655 000 dû",
      },
      {
        id: "RC-0049",
        label: "Relevé ; Atlas",
        status: "À jour",
        owner: "Finance",
        updated: "01/09/2026",
        amount: "0",
      },
    ],
  },
  "TMP-22": {
    checks: [
      "Facture(s) en retard identifiée(s)",
      "Niveau de relance adapté",
      "Coordonnées destinataire ok",
      "Historique des relances à jour",
      "Promesse de paiement notée",
      "Escalade prévue si silence",
    ],
    kpis: moneyKpis(
      "Relances mois|16",
      "Récupéré|1,4 M",
      "Taux succès|62 %",
      "Escalades|2",
    ),
    extraSections: [
      {
        title: "Suivi recouvrement",
        fields: [
          {
            name: "niveau",
            label: "Niveau de relance",
            kind: "select",
            options: [
              "R1 amiable",
              "R2 ferme",
              "R3 mise en demeure",
              "Contentieux",
            ],
            defaultValue: "R1 amiable",
          },
          {
            name: "email",
            label: "Email destinataire",
            kind: "email",
            required: true,
          },
          {
            name: "tel",
            label: "Téléphone",
            kind: "tel",
          },
          {
            name: "factures",
            label: "Factures concernées",
            kind: "text",
            full: true,
            defaultValue: "FAC-0449",
          },
          {
            name: "montant_du",
            label: "Montant total dû",
            kind: "text",
            required: true,
          },
          {
            name: "echeance",
            label: "Plus ancienne échéance",
            kind: "date",
          },
          {
            name: "jours_retard",
            label: "Jours de retard",
            kind: "number",
          },
          {
            name: "historique",
            label: "Historique des relances",
            kind: "textarea",
            full: true,
          },
          {
            name: "promesse",
            label: "Promesse de paiement",
            kind: "textarea",
            full: true,
          },
          {
            name: "prochaine_action",
            label: "Prochaine action",
            kind: "select",
            options: [
              "Relance R+1",
              "Appel",
              "Mise en demeure",
              "Contentieux",
              "Clôturé",
            ],
          },
          {
            name: "responsable",
            label: "Responsable",
            kind: "text",
          },
          {
            name: "date_suivi",
            label: "Date de suivi",
            kind: "date",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "RL-0112",
        label: "Relance 2 ; Mall Riviera",
        status: "Envoyée",
        owner: "Finance",
        updated: "09/09/2026",
        amount: "2,1 M",
      },
      {
        id: "RL-0115",
        label: "Relance 1 ; Exemple SA",
        status: "Ouverte",
        owner: "Finance",
        updated: "11/09/2026",
        amount: "847 000",
      },
    ],
  },
  "TMP-23": {
    checks: [
      "Document / objet reçu identifié",
      "Date et heure notées",
      "Émetteur confirmé",
      "Preuve jointe",
      "Accusé transmis",
      "Copie interne diffusée si besoin",
    ],
    kpis: moneyKpis(
      "AR mois|28",
      "Sous 24h|25",
      "Taux|89 %",
      "En attente|3",
    ),
    photoKinds: [
      { id: "preuve", label: "Preuve de réception" },
      { id: "scan", label: "Scan / pièce jointe" },
    ],
    extraSections: [
      {
        title: "Traçabilité",
        fields: [
          {
            name: "statut_ar",
            label: "Statut",
            kind: "select",
            options: [
              "Reçu",
              "Accusé envoyé",
              "Archivé",
            ],
            defaultValue: "Reçu",
          },
          {
            name: "emetteur",
            label: "Émetteur",
            kind: "text",
            required: true,
          },
          {
            name: "objet",
            label: "Objet de la transmission",
            kind: "text",
            required: true,
            full: true,
          },
          {
            name: "nb_pieces",
            label: "Nombre de pièces",
            kind: "number",
            defaultValue: "1",
          },
          {
            name: "id_technique",
            label: "ID technique / tracking",
            kind: "text",
          },
          {
            name: "doc_lie",
            label: "Document métier lié",
            kind: "text",
            hint: "CTR / DEV / FAC…",
          },
          {
            name: "accuse_par",
            label: "Accusé par",
            kind: "text",
          },
          {
            name: "commentaire",
            label: "Commentaire",
            kind: "textarea",
            full: true,
          },
          {
            name: "copie_interne",
            label: "Copie interne",
            kind: "select",
            options: [
              "Non",
              "Commercial",
              "Finance",
              "Direction",
              "Tous",
            ],
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "AR-0201",
        label: "AR ; contrat signé Exemple SA",
        status: "Envoyé",
        owner: "Commercial",
        updated: "08/09/2026",
        amount: "—",
      },
      {
        id: "AR-0204",
        label: "AR ; BC Mall Riviera",
        status: "Archivé",
        owner: "Ops",
        updated: "10/09/2026",
        amount: "—",
      },
    ],
  },
  "TMP-24": {
    checks: [
      "Périmètre mois / sites défini",
      "Indicateurs renseignés",
      "Écarts commentés",
      "Actions du mois suivant",
      "Qualité et absences analysés",
      "Validé Direction",
    ],
    kpis: moneyKpis(
      "Sites couverts|12",
      "Score moyen|86",
      "Actions ouvertes|7",
      "CA mois|7,2 M",
    ),
    lineHeaders: [
      "Site",
      "Réalisation %",
      "Score Q",
      "Réclamations",
      "Absentéisme %",
    ],
    lineRows: [
      [
        "Horizon",
        "98",
        "92",
        "0",
        "2",
      ],
      [
        "Bassa",
        "94",
        "84",
        "1",
        "5",
      ],
      [
        "Mall Riviera",
        "91",
        "88",
        "1",
        "3",
      ],
      [
        "Atlas",
        "97",
        "90",
        "0",
        "1",
      ],
    ],
    extraSections: [
      {
        title: "KPI & actions",
        fields: [
          {
            name: "mois",
            label: "Mois",
            kind: "month",
            required: true,
          },
          {
            name: "ca_mois",
            label: "CA du mois (FCFA)",
            kind: "text",
          },
          {
            name: "taux_realisation",
            label: "Taux réalisation (%)",
            kind: "number",
          },
          {
            name: "score_qualite",
            label: "Score qualité moyen",
            kind: "number",
          },
          {
            name: "reclamations",
            label: "Réclamations",
            kind: "number",
            defaultValue: "0",
          },
          {
            name: "absenteisme",
            label: "Absentéisme (%)",
            kind: "number",
          },
          {
            name: "faits_marquants",
            label: "Faits marquants",
            kind: "textarea",
            full: true,
          },
          {
            name: "ecarts",
            label: "Écarts vs objectifs",
            kind: "textarea",
            full: true,
          },
          {
            name: "actions",
            label: "Actions mois suivant",
            kind: "textarea",
            required: true,
            full: true,
          },
          {
            name: "statut_rm",
            label: "Statut",
            kind: "select",
            options: [
              "Brouillon",
              "Soumis",
              "Validé",
            ],
            defaultValue: "Brouillon",
          },
          {
            name: "valide_direction",
            label: "Validé Direction",
            kind: "text",
          },
          {
            name: "date_validation",
            label: "Date validation",
            kind: "date",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "RM-2026-08",
        label: "Rapport mensuel août 2026",
        status: "Validé",
        owner: "Direction",
        updated: "02/09/2026",
        amount: "Score 86",
      },
      {
        id: "RM-2026-09",
        label: "Rapport mensuel sept. 2026",
        status: "Brouillon",
        owner: "Direction",
        updated: "12/09/2026",
        amount: "—",
      },
    ],
  },
  "TMP-25": {
    checks: [
      "Site visité et contacté",
      "Zones mesurées / photos",
      "Contraintes d’accès notées",
      "Risques et points critiques listés",
      "Recommandations rédigées",
      "Budget indicatif chiffré",
      "Transmission Commercial",
      "Offre / devis initiés si conversion",
    ],
    kpis: moneyKpis(
      "Visites mois|9",
      "Converties offre|5",
      "Délai rapport|1,5 j",
      "Pipeline|12",
    ),
    photoKinds: [
      { id: "exterieur", label: "Extérieur" },
      { id: "zones", label: "Zones à traiter" },
      { id: "contraintes", label: "Contraintes / accès" },
      { id: "sanitaires", label: "Sanitaires / points sensibles" },
    ],
    extraSections: [
      {
        title: "Diagnostic technique",
        fields: [
          {
            name: "statut_visite",
            label: "Statut",
            kind: "select",
            options: [
              "Planifiée",
              "Réalisée",
              "Rapport prêt",
              "Transmise commercial",
              "Sans suite",
            ],
            defaultValue: "Réalisée",
          },
          {
            name: "surface_totale",
            label: "Surface totale (m²)",
            kind: "number",
            required: true,
          },
          {
            name: "nb_etages",
            label: "Étages / zones",
            kind: "text",
          },
          {
            name: "frequence_proposee",
            label: "Fréquence proposée",
            kind: "select",
            options: [
              "Quotidienne",
              "5j/7",
              "3j/7",
              "Hebdo",
              "Ponctuelle",
            ],
            defaultValue: "5j/7",
          },
          {
            name: "effectif_estime",
            label: "Effectif estimé",
            kind: "number",
          },
          {
            name: "niveau_service",
            label: "Niveau proposé",
            kind: "select",
            options: [
              "Standard",
              "Premium",
              "Critique",
            ],
            defaultValue: "Premium",
          },
          {
            name: "contraintes",
            label: "Contraintes d’accès / horaires",
            kind: "textarea",
            full: true,
          },
          {
            name: "risques",
            label: "Risques / points critiques",
            kind: "textarea",
            full: true,
          },
          {
            name: "recommandations",
            label: "Recommandations",
            kind: "textarea",
            full: true,
            defaultValue:
              "Entretien quotidien bureaux + focus sanitaires ; supervision hebdo ; reporting photos.",
          },
          {
            name: "budget_indicatif",
            label: "Budget indicatif HT / mois",
            kind: "text",
          },
          {
            name: "commercial",
            label: "Commercial destinataire",
            kind: "text",
          },
          {
            name: "offre_liee",
            label: "Offre / devis lié",
            kind: "text",
            hint: "NECS-OFF / NECS-DEV",
          },
        ],
      }
    ],
    extraRecords: [
      {
        id: "VT-0067",
        label: "Visite ; Immeuble Akwa Center",
        status: "Rapport prêt",
        owner: "Commercial",
        updated: "07/09/2026",
        amount: "2 100 m²",
      },
      {
        id: "VT-0068",
        label: "Visite ; Clinique Roseraie",
        status: "Transmise commercial",
        owner: "A. Mbarga",
        updated: "09/09/2026",
        amount: "1 200 m²",
      },
      {
        id: "VT-0065",
        label: "Visite ; Entrepôt Bassa",
        status: "Sans suite",
        owner: "P. Ngo",
        updated: "20/08/2026",
        amount: "3 400 m²",
      },
    ],
  },
  "DIG-01": {
    checks: [
      "Lead qualifié (besoin + budget)",
      "Coordonnées complètes et vérifiées",
      "Type de locaux / surface notés",
      "Affecté à un commercial",
      "Réponse sous 24–48 h",
      "Visite ou devis initiés si qualifié",
      "Consentement RGPD / usage données",
    ],
    kpis: moneyKpis(
      "Demandes web|34",
      "Traitées|29",
      "Converties|8",
      "Délai médian|18 h",
    ),
    extraSections: [
      {
        title: "Qualification CRM",
        fields: [
          {
            name: "commercial",
            label: "Commercial affecté",
            kind: "text",
            required: true,
          },
          {
            name: "priorite",
            label: "Priorité",
            kind: "select",
            options: ["Basse", "Normale", "Haute", "Urgente"],
            defaultValue: "Normale",
          },
          {
            name: "statut_lead",
            label: "Statut lead",
            kind: "select",
            options: [
              "Nouveau",
              "Qualifié",
              "Visite planifiée",
              "Devis envoyé",
              "Gagné",
              "Perdu",
              "Sans suite",
            ],
            defaultValue: "Nouveau",
          },
          {
            name: "type_locaux",
            label: "Type de locaux",
            kind: "select",
            options: [
              "Bureaux",
              "Industrie",
              "Commerce",
              "Résidentiel",
              "Santé",
              "Autre",
            ],
          },
          { name: "surface", label: "Surface estimée (m²)", kind: "number" },
          { name: "budget_estime", label: "Budget estimé", kind: "text" },
          {
            name: "source",
            label: "Source",
            kind: "select",
            options: ["Site web", "Facebook", "WhatsApp", "Référencement", "Autre"],
            defaultValue: "Site web",
          },
          {
            name: "prochaine_action",
            label: "Prochaine action",
            kind: "text",
            full: true,
          },
          {
            name: "visite_ref",
            label: "Visite / offre liée",
            kind: "text",
            hint: "DIG-03 / TMP-25 / TMP-01",
          },
          {
            name: "notes_interne",
            label: "Notes internes",
            kind: "textarea",
            full: true,
          },
        ],
      },
    ],
    extraRecords: [
      {
        id: "LEAD-2410",
        label: "Demande devis ; Hôtel Palm",
        status: "Nouveau",
        owner: "Commercial",
        updated: "10/09/2026",
        amount: "—",
      },
      {
        id: "LEAD-2412",
        label: "Demande devis ; Cabinet médical",
        status: "Qualifié",
        owner: "A. Mbarga",
        updated: "11/09/2026",
        amount: "450 k estimé",
      },
      {
        id: "LEAD-2405",
        label: "Demande devis ; Entrepôt",
        status: "Devis envoyé",
        owner: "P. Ngo",
        updated: "05/09/2026",
        amount: "1,2 M",
      },
    ],
  },
  "DIG-02": {
    checks: [
      "Message lu sous SLA",
      "Type de demande classé",
      "Affectation correcte (métier)",
      "Réponse envoyée",
      "Suivi CRM / ticket créé si besoin",
      "Escalade Direction si critique",
    ],
    kpis: moneyKpis(
      "Messages|41",
      "Répondus|38",
      "Délai médian|6 h",
      "Escaladés|2",
    ),
    extraSections: [
      {
        title: "Traitement & affectation",
        fields: [
          { name: "entreprise", label: "Entreprise", kind: "text" },
          { name: "ville", label: "Ville", kind: "text", defaultValue: "Douala" },
          {
            name: "type_demande",
            label: "Type de demande",
            kind: "select",
            options: [
              "Information",
              "Réclamation",
              "Partenariat",
              "Commercial",
              "Facturation",
              "Autre",
            ],
            defaultValue: "Information",
          },
          {
            name: "priorite",
            label: "Priorité",
            kind: "select",
            options: ["Basse", "Normale", "Haute"],
            defaultValue: "Normale",
          },
          {
            name: "affectation",
            label: "Affecté à",
            kind: "select",
            options: [
              "Service client",
              "Commercial",
              "Direction",
              "Finance",
              "Ops",
            ],
            defaultValue: "Service client",
          },
          {
            name: "sla",
            label: "SLA réponse",
            kind: "select",
            options: ["2 h", "24 h", "48 h", "72 h"],
            defaultValue: "24 h",
          },
          {
            name: "statut_msg",
            label: "Statut",
            kind: "select",
            options: ["Nouveau", "En cours", "Répondu", "Escaladé", "Clos"],
            defaultValue: "Nouveau",
          },
          {
            name: "reponse",
            label: "Réponse envoyée",
            kind: "textarea",
            full: true,
          },
          {
            name: "lead_lie",
            label: "Lead / ticket lié",
            kind: "text",
          },
          {
            name: "notes",
            label: "Notes internes",
            kind: "textarea",
            full: true,
          },
        ],
      },
    ],
    extraRecords: [
      {
        id: "CT-0188",
        label: "Contact ; partenariats",
        status: "Répondu",
        owner: "Direction",
        updated: "09/09/2026",
        amount: "—",
      },
      {
        id: "CT-0191",
        label: "Réclamation ; qualité site",
        status: "Escaladé",
        owner: "Ops",
        updated: "11/09/2026",
        amount: "—",
      },
    ],
  },
  "DIG-03": {
    checks: [
      "Site et créneau proposés",
      "Visite planifiée et confirmée",
      "Technicien / commercial assigné",
      "Rappel J-1 envoyé",
      "Photos / mesures prises",
      "Compte rendu après visite",
      "Transmission offre / devis",
    ],
    kpis: moneyKpis(
      "Demandes visite|12",
      "Planifiées|9",
      "Honorées|8",
      "Converties|5",
    ),
    photoKinds: [
      { id: "site", label: "Photos site" },
      { id: "acces", label: "Accès / contraintes" },
    ],
    extraSections: [
      {
        title: "Organisation visite",
        fields: [
          {
            name: "commercial",
            label: "Commercial / technicien",
            kind: "text",
            required: true,
          },
          {
            name: "duree_estimee",
            label: "Durée estimée",
            kind: "text",
            defaultValue: "1 h",
          },
          {
            name: "surface_estimee",
            label: "Surface estimée (m²)",
            kind: "number",
          },
          {
            name: "statut_visite",
            label: "Statut",
            kind: "select",
            options: [
              "Demandée",
              "Confirmée",
              "Réalisée",
              "Reportée",
              "Annulée",
            ],
            defaultValue: "Demandée",
          },
          {
            name: "rappel_j1",
            label: "Rappel J-1",
            kind: "select",
            options: ["À faire", "Envoyé", "Non requis"],
            defaultValue: "À faire",
          },
          {
            name: "compte_rendu",
            label: "Compte rendu",
            kind: "textarea",
            full: true,
          },
          {
            name: "rapport_vt",
            label: "Rapport VT lié",
            kind: "text",
            hint: "TMP-25",
          },
          {
            name: "devis_lie",
            label: "Devis / offre liée",
            kind: "text",
            hint: "TMP-01 / TMP-02",
          },
        ],
      },
    ],
    extraRecords: [
      {
        id: "DV-0095",
        label: "Visite ; Commerce Bonapriso",
        status: "Planifiée",
        owner: "Commercial",
        updated: "10/09/2026",
        amount: "12/09 10h",
      },
      {
        id: "DV-0096",
        label: "Visite ; Bureaux Akwa",
        status: "Réalisée",
        owner: "A. Mbarga",
        updated: "08/09/2026",
        amount: "Convertie",
      },
    ],
  },
};

function mergeFields(
  base: DocField[],
  extra: DocField[],
  reserved?: Set<string>,
): DocField[] {
  const names = new Set([...base.map((f) => f.name), ...(reserved ?? [])]);
  return [...base, ...extra.filter((f) => !names.has(f.name))];
}

function collectFieldNames(sections: DocSection[]): Set<string> {
  return new Set(sections.flatMap((s) => s.fields.map((f) => f.name)));
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
      const reserved = collectFieldNames(sections);
      const existing = sections.find(
        (s) => s.title.toLowerCase() === extra.title.toLowerCase(),
      );
      if (existing) {
        existing.fields = mergeFields(existing.fields, extra.fields, reserved);
      } else {
        const fields = extra.fields.filter((f) => !reserved.has(f.name));
        if (fields.length) {
          sections = [...sections, { title: extra.title, fields }];
        }
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
