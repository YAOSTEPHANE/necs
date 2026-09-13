# -*- coding: utf-8 -*-
"""Génère web/src/lib/documents-catalog.ts pour le module admin Templates."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "web" / "src" / "lib" / "documents-catalog.ts"

Field = dict


def f(name, label, kind="text", required=False, options=None, value="", full=False, hint=""):
    d: Field = {"name": name, "label": label, "kind": kind, "required": required, "full": full}
    if options:
        d["options"] = options
    if value:
        d["value"] = value
    if hint:
        d["hint"] = hint
    return d


def sec(title, fields):
    return {"title": title, "fields": fields}


DOCS = []

def add(id_, title, module, file_, doc_type, ref, subtitle, note, sections, domain, records, checks=None, lines=None, kpis=None):
    DOCS.append({
        "id": id_,
        "slug": id_.lower(),
        "title": title,
        "module": module,
        "file": file_,
        "docType": doc_type,
        "refPrefix": ref,
        "subtitle": subtitle,
        "note": note,
        "domain": domain,
        "sections": sections,
        "checks": checks or [],
        "lineHeaders": (lines or {}).get("headers", []),
        "lineRows": (lines or {}).get("rows", []),
        "kpis": kpis or [],
        "records": records,
        "htmlPath": f"/galerie/templates/{file_}",
    })


add("TMP-01", "Proposition de services", "CRM / Commercial", "TMP-01-proposition-services.html",
    "Offre commerciale", "NECS-OFF", "Offre générée depuis l’opportunité et le chiffrage.",
    "Préremplissage CRM (opportunité, sites, chiffrage).",
    [sec("Identification", [f("client","Client / Prospect","text",True), f("site","Site / Localisation","text",True), f("contact","Contact principal"), f("phone","Téléphone","tel"), f("email","Email","email"), f("opp_ref","Réf. opportunité")]),
     sec("Périmètre", [f("titre","Intitulé de l’offre","text",True,full=True), f("type_locaux","Type de locaux","select",True,["Bureaux","Industrie","Commerce","Résidentiel","Santé","Autre"]), f("surface","Surface (m²)","number",True), f("frequence","Fréquence","select",False,["Quotidienne","Hebdomadaire","Bi-hebdomadaire","Mensuelle","Ponctuelle"]), f("sla","Niveau de service","select",False,["Standard","Premium","Critique"]), f("validite","Validité (jours)","number",False,value="30"), f("debut","Démarrage indicatif","date"), f("methodo","Méthodologie & moyens","textarea",False,full=True), f("equipe","Équipe proposée","textarea",False,full=True)])],
    "CRM",
    [{"id":"OFF-0001","label":"Société Exemple SA — Bureaux","status":"Brouillon","owner":"A. Mbarga","updated":"10/09/2026","amount":"655 000 FCFA"},
     {"id":"OFF-0002","label":"Mall Riviera — Premium","status":"Envoyée","owner":"P. Ngo","updated":"08/09/2026","amount":"2,1 M FCFA"}],
    lines={"headers":["Prestation","Fréquence","Effectif","Unité","Prix HT"],"rows":[["Nettoyage bureaux","5j/sem","3","Forfait","450 000"],["Entretien sanitaires","5j/sem","1","Forfait","120 000"],["Vitrerie intérieure","Mensuel","2","Intervention","85 000"]]})

add("TMP-02", "Devis", "CRM / Finance", "TMP-02-devis.html", "Devis", "NECS-DEV",
    "Prestations, quantités, prix, périodicité, taxes et conditions.",
    "Versions et seuils de validation (CRM-04).",
    [sec("Identification", [f("client","Client","text",True), f("site","Site","text",True), f("contact","Contact"), f("phone","Téléphone","tel"), f("email","Email","email"), f("opp_ref","Réf. opportunité / offre")]),
     sec("Paramètres", [f("date_emis","Date d’émission","date",True), f("date_valid","Date de validité","date",True), f("devise","Devise","select",False,["FCFA (XAF)","EUR","USD"]), f("paiement","Conditions de paiement","select",False,["30 jours net","45 jours","Comptant","Échéancier"]), f("notes","Notes / conditions","textarea",False,full=True)])],
    "CRM",
    [{"id":"DEV-0142","label":"Société Exemple SA","status":"Envoyé","owner":"A. Mbarga","updated":"09/09/2026","amount":"625 000 FCFA"},
     {"id":"DEV-0145","label":"Groupe Atlas","status":"En validation","owner":"Finance","updated":"10/09/2026","amount":"1,45 M FCFA"}],
    lines={"headers":["Désignation","Qté","Unité","P.U. HT","Périodicité","Total HT"],"rows":[["Entretien quotidien locaux","22","Jour","25 000","Mensuel","550 000"],["Fourniture consommables","1","Lot","75 000","Mensuel","75 000"]]})

add("TMP-03", "Bon de commande", "Commercial / Opérations", "TMP-03-bon-commande.html", "Bon de commande", "NECS-BC",
    "Prestations commandées liées au devis accepté.", "Relié devis → contrat → opérations.",
    [sec("Commande", [f("client","Client","text",True), f("site","Site","text",True), f("devis_ref","N° devis lié","text",True), f("date_cmd","Date de commande","date",True), f("date_debut","Début souhaité","date"), f("priorite","Priorité","select",False,["Normale","Haute","Urgente"]), f("conditions","Conditions","textarea",False,full=True)])],
    "CRM",
    [{"id":"BC-0088","label":"Commande démarrage Horizon","status":"Validé","owner":"Ops","updated":"07/09/2026","amount":"—"}],
    lines={"headers":["Prestation","Qté","Date","Site","Statut"],"rows":[["Démarrage entretien bureaux","1","01/04/2026","Siège client","Validé"]]})

add("TMP-04", "Bon de livraison / réception", "Opérations / Logistique", "TMP-04-bon-livraison.html", "Livraison", "NECS-BL",
    "Consommables livrés, quantités, réception et réserves.", "Traçabilité stock OPS-06.",
    [sec("Livraison", [f("site","Site destinataire","text",True), f("datetime","Date / heure","datetime-local",True), f("livreur","Livreur / magasinier"), f("da_ref","Réf. demande d’achat"), f("reserves","Réserves / observations","textarea",False,full=True)])],
    "OPS",
    [{"id":"BL-0211","label":"Livraison Usine Bassa","status":"Écart partiel","owner":"Magasin","updated":"09/09/2026","amount":"—"}],
    lines={"headers":["Article","Unité","Qté prévue","Qté reçue","État"],"rows":[["Détergent multi-surfaces 5L","Bidon","12","12","Conforme"],["Sacs poubelle 100L","Rouleau","20","18","Écart"]]})

add("TMP-05", "Contrat de prestation", "CRM / Juridique / Direction", "TMP-05-contrat-prestation.html", "Contrat client", "NECS-CTR",
    "Parties, périmètre, SLA, prix, durée et signatures.", "Toute modification → avenant TMP-06.",
    [sec("Parties", [f("client","Client (raison sociale)","text",True), f("rccm","RCCM / Identifiant"), f("rep_client","Représentant client"), f("rep_necs","Représentant NECS",value="Direction Générale"), f("objet","Objet du contrat","textarea",True,full=True,value="Prestation de services de nettoyage et d’entretien des locaux désignés.")]),
     sec("Périmètre & SLA", [f("sites","Sites couverts","text",True), f("effectif","Effectif contractuel","number"), f("frequence","Fréquence"), f("sla","Niveau SLA","select",False,["Standard","Premium","Critique"]), f("duree","Durée (mois)","number",False,value="12"), f("renouvellement","Renouvellement","select",False,["Tacite","Express","Sans"]), f("effet","Date d’effet","date",True), f("fin","Date de fin","date"), f("clauses","Clauses clés","textarea",False,full=True), f("prix","Prix & facturation","textarea",False,full=True)])],
    "CRM",
    [{"id":"CTR-0034","label":"Société Exemple SA","status":"Actif","owner":"Direction","updated":"01/04/2026","amount":"847 000 / mois"},
     {"id":"CTR-0028","label":"Groupe Atlas","status":"Actif","owner":"Commercial","updated":"15/01/2026","amount":"1,32 M / mois"}])

add("TMP-06", "Avenant au contrat", "CRM / Direction", "TMP-06-avenant-contrat.html", "Avenant", "NECS-AVN",
    "Modification de périmètre, tarif, durée ou effectifs.", "Historique des versions conservé.",
    [sec("Références", [f("contrat_ref","Contrat initial","text",True,value="NECS-CTR-2026-0034"), f("avenant_no","N° d’avenant",value="01"), f("effet","Date d’effet","date",True), f("type_mod","Type de modification","select",True,["Périmètre","Tarif","Durée","Effectifs","Prestations","Mixte"]), f("description","Description","textarea",True,full=True), f("impact","Impact financier HT","number"), f("justif","Justification","textarea",False,full=True)])],
    "CRM",
    [{"id":"AVN-0007","label":"Avenant #01 — CTR-0034","status":"Brouillon","owner":"Direction","updated":"05/09/2026","amount":"+120 000"}])

add("TMP-07", "Contrat / document agent", "RH", "TMP-07-contrat-agent.html", "RH — Contrat", "NECS-RH-CTR",
    "Document contractuel collaborateur.", "Accès restreint RH.",
    [sec("Collaborateur", [f("nom","Nom & prénoms","text",True), f("matricule","Matricule"), f("poste","Poste",value="Agent d’entretien"), f("type","Type de contrat","select",False,["CDI","CDD","Intérim","Stage"]), f("embauche","Date d’embauche","date"), f("site","Site d’affectation"), f("horaires","Horaires"), f("remu","Rémunération / conditions","textarea",False,full=True), f("obligations","Obligations & confidentialité","textarea",False,full=True)])],
    "RH",
    [{"id":"RH-CTR-019","label":"Grace Embolo — Agent","status":"À signer","owner":"RH","updated":"09/09/2026","amount":"—"}])

add("TMP-08", "Fiche de poste agent", "RH", "TMP-08-fiche-poste.html", "Fiche de poste", "NECS-RH-FP",
    "Mission, responsabilités, compétences et performance.", "Modèle administrable.",
    [sec("Poste", [f("intitule","Intitulé","text",True,value="Agent d’entretien"), f("nplus1","Rattachement",value="Superviseur de site"), f("horaires","Horaires types"), f("lieu","Lieu d’exercice"), f("mission","Mission principale","textarea",True,full=True), f("resp","Responsabilités","textarea",False,full=True), f("competences","Compétences","textarea",False,full=True), f("securite","Sécurité / EPI","textarea",False,full=True), f("perf","Critères de performance","textarea",False,full=True)])],
    "RH",
    [{"id":"FP-AE-01","label":"Agent d’entretien","status":"Validée","owner":"RH","updated":"01/08/2026","amount":"—"},
     {"id":"FP-CE-01","label":"Chef d’équipe","status":"Validée","owner":"RH","updated":"01/08/2026","amount":"—"}])

add("TMP-09", "Dossier d’embauche", "RH", "TMP-09-dossier-embauche.html", "Checklist RH", "NECS-RH-DE",
    "Pièces obligatoires et statut du dossier.", "Pièces manquantes / expirées (RH-03).",
    [sec("Candidat", [f("nom","Nom & prénoms","text",True), f("poste","Poste visé"), f("debut","Démarrage prévu","date"), f("rh","Responsable RH"), f("statut","Statut dossier","select",False,["Incomplet","Complet","Validé","Bloqué"]), f("obs","Commentaires RH","textarea",False,full=True)])],
    "RH",
    [{"id":"DE-055","label":"Linda Fouda","status":"Complet","owner":"RH","updated":"08/09/2026","amount":"—"},
     {"id":"DE-056","label":"Boris Manga","status":"Incomplet","owner":"RH","updated":"10/09/2026","amount":"—"}],
    checks=["Pièce d’identité en cours de validité","CV actualisé","Certificat de travail / références","Photo d’identité","RIB / informations bancaires","Attestation de domicile","Certificat médical d’aptitude","Documents contractuels signés","Casier judiciaire (si requis)","Autorisation de travail (si applicable)"])

add("TMP-10", "Entretien / évaluation candidat", "RH", "TMP-10-entretien-candidat.html", "Évaluation", "NECS-RH-ENT",
    "Critères d’évaluation et décision recrutement.", "Parcours historisé RH-02.",
    [sec("Candidat", [f("nom","Nom & prénoms","text",True), f("poste","Poste",value="Agent d’entretien"), f("date","Date entretien","date",True), f("interviewer","Interviewer","text",True), f("source","Source","select",False,["Site web","Facebook","Cooptation","Agence","Spontané"])]),
     sec("Décision", [f("score","Score global /5","number"), f("apprec","Appréciation","textarea",False,full=True), f("decision","Décision","select",True,["Retenu","Liste d’attente","Refusé","À revoir"]), f("next","Prochaine étape","select",False,["Essai terrain","Contrat","Complément dossier","Clôture"])])],
    "RH",
    [{"id":"ENT-102","label":"Grace Embolo","status":"Retenu","owner":"RH","updated":"06/09/2026","amount":"4/5"},
     {"id":"ENT-103","label":"Boris Manga","status":"En cours","owner":"RH","updated":"09/09/2026","amount":"—"}])

add("TMP-11", "Checklist / onboarding", "RH / Opérations", "TMP-11-onboarding.html", "Intégration", "NECS-RH-ONB",
    "Intégration collaborateur jusqu’à validation.", "Fin d’intégration formalisée RH-05.",
    [sec("Collaborateur", [f("nom","Nom","text",True), f("site","Site d’affectation","text",True), f("date","Date d’intégration","date"), f("manager","Manager")])],
    "RH",
    [{"id":"ONB-033","label":"Intégration Immeuble Horizon","status":"En cours","owner":"RH","updated":"10/09/2026","amount":"7/10"}],
    checks=["Dossier RH complet et validé","Contrat / documents signés","Remise uniforme / EPI","Dotation matériel de base","Création accès application (pointage)","Formation consignes sécurité","Formation consignes site client","Présentation équipe / superviseur","Affectation planning confirmée","Validation fin d’intégration"])

add("TMP-12", "Ordre de travail", "Opérations", "TMP-12-ordre-travail.html", "Intervention", "NECS-OT",
    "Mission, agents, consignes, preuves d’exécution.", "Traçabilité OPS-03.",
    [sec("Mission", [f("site","Site","text",True), f("client","Client","text",True), f("date","Date","date",True), f("creneau","Créneau",value="06:00 – 14:00"), f("superviseur","Superviseur"), f("statut","Statut","select",False,["Planifié","En cours","Terminé","Anomalie"]), f("consignes","Consignes","textarea",False,full=True), f("materiel","Matériel requis","textarea",False,full=True)])],
    "OPS",
    [{"id":"OT-1440","label":"Immeuble Horizon — quotidien","status":"En cours","owner":"S. Ndjock","updated":"10/09/2026","amount":"4 agents"},
     {"id":"OT-1441","label":"Usine Bassa — atelier","status":"Planifié","owner":"S. Ndjock","updated":"10/09/2026","amount":"6 agents"}],
    lines={"headers":["Agent","Rôle","Arrivée","Départ","Preuve"],"rows":[["A. Kouam","Chef d’équipe","06:02","14:05","Photo"],["M. Ngo","Agent","06:18","—","Photo"]]})

add("TMP-13", "Fiche de contrôle qualité", "Qualité", "TMP-13-controle-qualite.html", "Qualité", "NECS-QA",
    "Notation, NC, actions correctives et photos.", "Contrôle mobile Q-01.",
    [sec("Contexte", [f("site","Site","text",True), f("prestation","Prestation contrôlée","text",True), f("datetime","Date / heure","datetime-local",True), f("controleur","Contrôleur","text",True), f("score","Score /100","number",False,value="0"), f("seuil","Seuil minimal","number",False,value="80")]),
     sec("Écarts", [f("ecarts","Écarts constatés","textarea",False,full=True), f("actions","Actions correctives","textarea",False,full=True), f("echeance","Échéance","date"), f("resp_action","Responsable action")])],
    "Q",
    [{"id":"QA-278","label":"Immeuble Horizon","status":"Conforme","owner":"Qualité","updated":"09/09/2026","amount":"92/100"},
     {"id":"QA-279","label":"Mall Riviera","status":"Non conforme","owner":"Qualité","updated":"09/09/2026","amount":"78/100"}])

add("TMP-14", "Rapport de prestation", "Opérations / Qualité", "TMP-14-rapport-prestation.html", "Rapport site", "NECS-RP",
    "Synthèse prestations, incidents et recommandations.", "Alimente BI opérations / qualité.",
    [sec("Période & site", [f("client","Client","text",True), f("site","Site","text",True), f("debut","Du","date",True), f("fin","Au","date",True)]),
     sec("Synthèse", [f("prestations","Prestations réalisées","textarea",False,full=True), f("incidents","Incidents / réclamations","textarea",False,full=True), f("controles","Contrôles","textarea",False,full=True), f("reco","Recommandations","textarea",False,full=True), f("actions","Actions à suivre","textarea",False,full=True)])],
    "OPS",
    [{"id":"RP-0061","label":"Rapport site Horizon — Août","status":"Publié","owner":"Ops","updated":"02/09/2026","amount":"91% qualité"}],
    kpis=[{"label":"Prestations","value":"22"},{"label":"Effectif moyen","value":"4"},{"label":"Score qualité","value":"91%"},{"label":"Incidents","value":"1"}])

add("TMP-15", "Demande d’achat", "Opérations / Achats", "TMP-15-demande-achat.html", "Achat interne", "NECS-DA",
    "Demande articles / consommables avec validation.", "Workflow SEC-02.",
    [sec("Demande", [f("demandeur","Demandeur","text",True), f("site","Site","text",True), f("date_besoin","Date besoin","date"), f("fournisseur","Fournisseur proposé"), f("justif","Justification","textarea",True,full=True)])],
    "OPS",
    [{"id":"DA-0199","label":"Consommables Horizon","status":"En validation","owner":"Ops","updated":"09/09/2026","amount":"73 000 FCFA"}],
    lines={"headers":["Article","Qté","Unité","Estimation","Urgence"],"rows":[["Serpillères microfibre","30","Pce","45 000","Normale"],["Gants nitrile","100","Paire","28 000","Haute"]]})

add("TMP-16", "Demande de congé", "RH", "TMP-16-demande-conge.html", "Absence", "NECS-RH-ABS",
    "Congé / absence et impact planning.", "Impact planning RH-06 / OPS-02.",
    [sec("Demande", [f("collab","Collaborateur","text",True), f("matricule","Matricule"), f("type","Type","select",True,["Congé payé","Permission","Maladie","Autre"]), f("debut","Du","date",True), f("fin","Au","date",True), f("jours","Nombre de jours","number"), f("motif","Motif","textarea",False,full=True), f("remplacant","Remplaçant proposé"), f("impact","Impact planning","text",False,value="À calculer automatiquement")])],
    "RH",
    [{"id":"ABS-411","label":"A. Kouam — Congé","status":"En validation","owner":"Manager","updated":"08/09/2026","amount":"3 j"}])

add("TMP-17", "Fiche de pointage", "Opérations / RH", "TMP-17-pointage.html", "Présence", "NECS-PTG",
    "Arrivée / départ, anomalies et validation.", "OPS-04 anti-double-pointage.",
    [sec("Contexte", [f("agent","Agent","text",True), f("site","Site","text",True), f("date","Date","date",True), f("planning","Planning prévu",value="06:00 – 14:00"), f("commentaire","Commentaire superviseur","textarea",False,full=True), f("statut","Statut validation","select",False,["À valider","Validé","Rejeté","Corrigé"])])],
    "OPS",
    [{"id":"PTG-9001","label":"A. Kouam — 10/09","status":"Validé","owner":"Superviseur","updated":"10/09/2026","amount":"08:03"},
     {"id":"PTG-9002","label":"M. Ngo — 10/09","status":"Anomalie retard","owner":"Superviseur","updated":"10/09/2026","amount":"—"}],
    lines={"headers":["Type","Heure","Mode","Géo","Anomalie"],"rows":[["Arrivée","06:02","Mobile","OK","Aucune"],["Départ","14:05","Mobile","OK","Aucune"]]})

add("TMP-18", "Préfacture", "Finance / Opérations", "TMP-18-prefacture.html", "Préfacturation", "NECS-PF",
    "État des prestations facturables avant facture.", "Rapprochement FIN-02.",
    [sec("Cadre", [f("client","Client","text",True), f("contrat","Contrat","text",True), f("debut","Période du","date",True), f("fin","au","date",True)])],
    "FIN",
    [{"id":"PF-0112","label":"CTR-0034 — Mars 2026","status":"Validée","owner":"Finance","updated":"02/04/2026","amount":"600 000 FCFA"},
     {"id":"PF-0113","label":"CTR-0028 — Mars 2026","status":"En contrôle","owner":"Ops","updated":"03/04/2026","amount":"1,32 M FCFA"}],
    lines={"headers":["Prestation","Prévu","Réalisé","Écart","Ajustement","Montant"],"rows":[["Entretien quotidien","22","21","-1","0","525 000"],["Consommables","1","1","0","0","75 000"]]})

add("TMP-19", "Facture", "Finance", "TMP-19-facture.html", "Facture", "NECS-FAC",
    "Facture client avec échéance et modalités.", "Numérotation et avoirs FIN-03.",
    [sec("Facturation", [f("client","Client","text",True), f("contrat","N° contrat"), f("periode","Période facturée"), f("date_fac","Date facture","date",True), f("echeance","Échéance","date",True), f("modalites","Modalités",value="Virement — 30 jours"), f("banque","Banque / compte","textarea",False,full=True), f("ref_paiement","Référence à rappeler")])],
    "FIN",
    [{"id":"FAC-0450","label":"Société Exemple SA — Mars","status":"Émise","owner":"Finance","updated":"05/04/2026","amount":"847 000 FCFA"},
     {"id":"FAC-0441","label":"Mall Riviera — Fév","status":"En recouvrement","owner":"Recouvrement","updated":"10/09/2026","amount":"2,05 M FCFA"}],
    lines={"headers":["Désignation","Qté","P.U. HT","Total HT"],"rows":[["Prestations de nettoyage — Mars 2026","1","600 000","600 000"]]})

add("TMP-20", "Avoir", "Finance", "TMP-20-avoir.html", "Avoir", "NECS-AVO",
    "Avoir lié à une facture initiale.", "Versionnement des documents validés.",
    [sec("Avoir", [f("facture_ref","Facture initiale","text",True,value="NECS-FAC-2026-0450"), f("date","Date avoir","date",True), f("motif","Motif","textarea",True,full=True), f("montant","Montant HT","number",True)])],
    "FIN",
    [{"id":"AVO-0015","label":"Ajustement FAC-0450","status":"Émis","owner":"Finance","updated":"08/04/2026","amount":"25 000 FCFA"}],
    lines={"headers":["Ligne","Qté","Montant"],"rows":[["Ajustement prestation J21 non réalisée","1","25 000"]]})

add("TMP-21", "Relevé de compte client", "Finance", "TMP-21-releve-compte.html", "Compte client", "NECS-RC",
    "Factures, avoirs, règlements et solde.", "Solde après rapprochement FIN-04.",
    [sec("Client", [f("client","Client","text",True), f("debut","Période du","date"), f("fin","au","date"), f("solde","Solde actuel",value="175 000 FCFA")])],
    "FIN",
    [{"id":"RC-008","label":"Relevé Société Exemple SA","status":"Émis","owner":"Finance","updated":"01/04/2026","amount":"175 000 FCFA"}],
    lines={"headers":["Date","Pièce","Libellé","Débit","Crédit","Solde"],"rows":[["01/03/2026","FAC-0450","Facture mars","600 000","—","600 000"],["05/03/2026","AVO-0015","Avoir","—","25 000","575 000"],["20/03/2026","ENC-330","Règlement","—","400 000","175 000"]]})

add("TMP-22", "Lettre / email de relance", "Finance / Recouvrement", "TMP-22-relance-client.html", "Relance", "NECS-REL",
    "Relance amiable à escalade direction.", "Scénarios FIN-05.",
    [sec("Relance", [f("client","Client","text",True), f("niveau","Niveau","select",True,["R1 — Amiable","R2 — Fermeté","R3 — Mise en demeure","R4 — Escalade direction"]), f("canal","Canal","select",False,["Email","Courrier","Appel + email"]), f("date","Date d’envoi","date"), f("objet","Objet","text",False,full=True,value="Relance de paiement — factures échues"), f("corps","Corps du message","textarea",True,full=True)])],
    "FIN",
    [{"id":"REL-0077","label":"Relance R2 — Mall Riviera","status":"Envoyée","owner":"Recouvrement","updated":"09/09/2026","amount":"2,05 M FCFA"}],
    lines={"headers":["Facture","Échéance","Montant dû","Jours de retard"],"rows":[["NECS-FAC-2026-0441","05/03/2026","2 050 000","189"]]})

add("TMP-23", "Accusé de réception", "CRM / Finance", "TMP-23-accuse-reception.html", "Preuve transmission", "NECS-AR",
    "Preuve d’envoi / réception de documents.", "Traçabilité des transmissions.",
    [sec("Transmission", [f("document","Document transmis","text",True), f("ref_doc","Référence document","text",True), f("destinataire","Destinataire","text",True), f("canal","Canal","select",False,["Email","Portail client","Remise en main propre","Courrier"]), f("datetime","Date / heure","datetime-local",True), f("statut","Statut","select",False,["Envoyé","Reçu","Ouvert","Échec"]), f("preuve","Preuve / ID technique","textarea",False,full=True)])],
    "CRM",
    [{"id":"AR-0502","label":"AR devis DEV-0142","status":"Ouvert","owner":"Commercial","updated":"09/09/2026","amount":"—"}])

add("TMP-24", "Rapport mensuel de performance", "Direction / Qualité / Ops", "TMP-24-rapport-mensuel.html", "Performance", "NECS-RM",
    "KPI mensuels client / sites.", "Pilotage direction + restitution client.",
    [sec("Périmètre", [f("client","Client","text",True), f("mois","Mois","month",True), f("sites","Sites inclus"), f("redacteur","Rédacteur")]),
     sec("Analyse", [f("prestations","Synthèse prestations","textarea",False,full=True), f("qualite","Qualité & contrôles","textarea",False,full=True), f("incidents","Incidents / réclamations","textarea",False,full=True), f("actions","Actions & recommandations","textarea",False,full=True)])],
    "BI",
    [{"id":"RM-2026-03","label":"Performance Mars — Exemple SA","status":"Publié","owner":"Direction","updated":"05/04/2026","amount":"92/100"}],
    kpis=[{"label":"Taux réalisation","value":"98%"},{"label":"Qualité moyenne","value":"92/100"},{"label":"Réclamations","value":"2"},{"label":"Actions closes","value":"5/6"}])

add("TMP-25", "Rapport audit / visite technique", "Commercial / Qualité", "TMP-25-visite-technique.html", "Visite technique", "NECS-VT",
    "Constats, mesures, risques et recommandations.", "Exploitable pour chiffrage CRM-03.",
    [sec("Visite", [f("client","Prospect / Client","text",True), f("site","Site visité","text",True), f("datetime","Date / heure","datetime-local",True), f("auditeur","Auditeur","text",True), f("surface","Surface (m²)","number"), f("type_locaux","Type de locaux","select",False,["Bureaux","Industrie","Commerce","Santé","Autre"])]),
     sec("Constats", [f("zones","Zones / contraintes","textarea",False,full=True), f("risques","Risques","textarea",False,full=True), f("besoins","Besoins exprimés","textarea",False,full=True), f("reco","Recommandations","textarea",False,full=True), f("actions","Prochaines étapes","textarea",False,full=True)])],
    "CRM",
    [{"id":"VT-0188","label":"Visite Groupe Atlas","status":"Validé","owner":"P. Ngo","updated":"04/09/2026","amount":"2 400 m²"}])

add("DIG-01", "Demande de devis (site web)", "Marketing digital", "DIG-01-demande-devis.html", "Lead web", "NECS-WEB-DEVIS",
    "Formulaire site → lead CRM automatique.", "DIG-01 déduplication + consentement.",
    [sec("Coordonnées", [f("nom","Nom complet","text",True), f("entreprise","Entreprise","text",True), f("email","Email","email",True), f("tel","Téléphone","tel",True), f("ville","Ville"), f("source","Source",value="Site web — formulaire devis")]),
     sec("Besoin", [f("type","Type de locaux","select",True,["Bureaux","Commerce","Industrie","Résidentiel","Autre"]), f("surface","Surface approx. (m²)","number"), f("frequence","Fréquence","select",False,["Quotidienne","Hebdomadaire","Mensuelle","Ponctuelle"]), f("delai","Délai","select",False,["Urgent (< 7j)","Sous 30 jours","À planifier"]), f("besoin","Description","textarea",True,full=True)]),
     sec("Consentement", [f("consent","Consentement contact","select",True,["Oui","Non"],full=True), f("prefs","Préférences","select",False,["Email","Téléphone","WhatsApp","Email + Téléphone"])])],
    "DIG",
    [{"id":"LEAD-2401","label":"Société Horizon SA","status":"Nouveau","owner":"Commercial","updated":"10/09/2026","amount":"SLA 2h"},
     {"id":"LEAD-2402","label":"Boutique Klaris","status":"Qualifié","owner":"Commercial","updated":"09/09/2026","amount":"OK"}])

add("DIG-02", "Contact (site web)", "Marketing digital", "DIG-02-contact.html", "Contact", "NECS-WEB-CONTACT",
    "Message digital → lead / tâche / ticket.", "DIG-05 affectation + SLA.",
    [sec("Message", [f("nom","Nom","text",True), f("email","Email","email",True), f("tel","Téléphone","tel"), f("sujet","Sujet","select",True,["Information","Devis","Réclamation","Partenariat","Autre"]), f("message","Message","textarea",True,full=True), f("consent","Consentement","select",True,["Oui","Non"])])],
    "DIG",
    [{"id":"LEAD-2403","label":"Clinique Les Palmiers","status":"À rappeler","owner":"Service client","updated":"09/09/2026","amount":"Retard SLA"}])

add("DIG-03", "Demande de visite technique", "Marketing / Commercial", "DIG-03-demande-visite.html", "Visite", "NECS-WEB-VISITE",
    "Planification visite technique depuis le web.", "Alimente CRM-03.",
    [sec("Coordonnées", [f("nom","Nom / Entreprise","text",True), f("tel","Téléphone","tel",True), f("email","Email","email",True), f("adresse","Adresse du site","text",True,full=True)]),
     sec("Planification", [f("date","Date souhaitée","date",True), f("creneau","Créneau","select",False,["Matin","Après-midi","Indifférent"]), f("type","Type de locaux","select",False,["Bureaux","Industrie","Commerce","Autre"]), f("infos","Informations utiles","textarea",False,full=True)])],
    "DIG",
    [{"id":"LEAD-2404","label":"LogiTrans Cameroun","status":"Visite planifiée","owner":"Commercial","updated":"08/09/2026","amount":"—"}])


def ts_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)

def emit_field(field: dict) -> str:
    parts = [
        f'name: {ts_str(field["name"])}',
        f'label: {ts_str(field["label"])}',
        f'kind: {ts_str(field["kind"])}',
    ]
    if field.get("required"):
        parts.append("required: true")
    if field.get("full"):
        parts.append("full: true")
    if field.get("options"):
        opts = ", ".join(ts_str(o) for o in field["options"])
        parts.append(f"options: [{opts}]")
    if field.get("value"):
        parts.append(f'defaultValue: {ts_str(field["value"])}')
    if field.get("hint"):
        parts.append(f'hint: {ts_str(field["hint"])}')
    return "{ " + ", ".join(parts) + " }"

lines_out = []
lines_out.append('/* Auto-généré — ne pas éditer à la main (relancer _gen_documents_catalog.py) */')
lines_out.append('export type FieldKind = "text" | "tel" | "email" | "number" | "date" | "datetime-local" | "month" | "select" | "textarea";')
lines_out.append('')
lines_out.append('export type DocField = {')
lines_out.append('  name: string;')
lines_out.append('  label: string;')
lines_out.append('  kind: FieldKind;')
lines_out.append('  required?: boolean;')
lines_out.append('  full?: boolean;')
lines_out.append('  options?: string[];')
lines_out.append('  defaultValue?: string;')
lines_out.append('  hint?: string;')
lines_out.append('};')
lines_out.append('')
lines_out.append('export type DocSection = { title: string; fields: DocField[] };')
lines_out.append('export type DocRecord = { id: string; label: string; status: string; owner: string; updated: string; amount: string };')
lines_out.append('export type DocKpi = { label: string; value: string };')
lines_out.append('')
lines_out.append('export type DocumentDef = {')
lines_out.append('  id: string;')
lines_out.append('  slug: string;')
lines_out.append('  title: string;')
lines_out.append('  module: string;')
lines_out.append('  file: string;')
lines_out.append('  docType: string;')
lines_out.append('  refPrefix: string;')
lines_out.append('  subtitle: string;')
lines_out.append('  note: string;')
lines_out.append('  domain: "DIG" | "CRM" | "OPS" | "Q" | "RH" | "FIN" | "BI";')
lines_out.append('  sections: DocSection[];')
lines_out.append('  checks: string[];')
lines_out.append('  lineHeaders: string[];')
lines_out.append('  lineRows: string[][];')
lines_out.append('  kpis: DocKpi[];')
lines_out.append('  records: DocRecord[];')
lines_out.append('  htmlPath: string;')
lines_out.append('};')
lines_out.append('')
lines_out.append('export const DOCUMENTS: DocumentDef[] = [')

for doc in DOCS:
    lines_out.append('  {')
    for key in ["id", "slug", "title", "module", "file", "docType", "refPrefix", "subtitle", "note", "domain", "htmlPath"]:
        lines_out.append(f'    {key}: {ts_str(doc[key])},')
    lines_out.append('    sections: [')
    for section in doc["sections"]:
        lines_out.append('      {')
        lines_out.append(f'        title: {ts_str(section["title"])},')
        lines_out.append('        fields: [')
        for field in section["fields"]:
            lines_out.append(f'          {emit_field(field)},')
        lines_out.append('        ],')
        lines_out.append('      },')
    lines_out.append('    ],')
    checks = ", ".join(ts_str(c) for c in doc["checks"])
    lines_out.append(f'    checks: [{checks}],')
    headers = ", ".join(ts_str(h) for h in doc["lineHeaders"])
    lines_out.append(f'    lineHeaders: [{headers}],')
    lines_out.append('    lineRows: [')
    for row in doc["lineRows"]:
        cells = ", ".join(ts_str(c) for c in row)
        lines_out.append(f'      [{cells}],')
    lines_out.append('    ],')
    lines_out.append('    kpis: [')
    for kpi in doc["kpis"]:
        lines_out.append(f'      {{ label: {ts_str(kpi["label"])}, value: {ts_str(kpi["value"])} }},')
    lines_out.append('    ],')
    lines_out.append('    records: [')
    for rec in doc["records"]:
        lines_out.append(
            "      { "
            + f'id: {ts_str(rec["id"])}, label: {ts_str(rec["label"])}, status: {ts_str(rec["status"])}, '
            + f'owner: {ts_str(rec["owner"])}, updated: {ts_str(rec["updated"])}, amount: {ts_str(rec["amount"])}'
            + " },"
        )
    lines_out.append('    ],')
    lines_out.append('  },')

lines_out.append('];')
lines_out.append('')
lines_out.append('export const DOCUMENT_DOMAINS = [')
lines_out.append('  { id: "all", label: "Tous" },')
lines_out.append('  { id: "DIG", label: "Digital" },')
lines_out.append('  { id: "CRM", label: "CRM" },')
lines_out.append('  { id: "OPS", label: "Opérations" },')
lines_out.append('  { id: "Q", label: "Qualité" },')
lines_out.append('  { id: "RH", label: "RH" },')
lines_out.append('  { id: "FIN", label: "Finance" },')
lines_out.append('  { id: "BI", label: "Pilotage" },')
lines_out.append('] as const;')
lines_out.append('')
lines_out.append('export function getDocumentBySlug(slug: string): DocumentDef | undefined {')
lines_out.append('  const key = slug.toLowerCase();')
lines_out.append('  return DOCUMENTS.find((d) => d.slug === key || d.id.toLowerCase() === key);')
lines_out.append('}')
lines_out.append('')

OUT.write_text("\n".join(lines_out) + "\n", encoding="utf-8")
print(f"Wrote {len(DOCS)} documents → {OUT}")
