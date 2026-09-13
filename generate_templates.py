# -*- coding: utf-8 -*-
"""Génère les templates HTML premium NECS pour validation client."""
from pathlib import Path

ROOT = Path(r"C:\Users\UTILISATEUR\Desktop\erp cameroun")
TEMPLATES = ROOT / "templates"
TEMPLATES.mkdir(exist_ok=True)

HEADER = """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} — NECS SARL</title>
  <link rel="stylesheet" href="../css/necs-premium.css" />
</head>
<body>
  <div class="doc-page">
    <div class="doc-actions no-print">
      <a class="btn btn-ghost" href="../index.html">← Galerie des templates</a>
      <button class="btn btn-ghost" type="button" onclick="window.print()">Imprimer / PDF</button>
      <button class="btn btn-primary" type="button">Valider le modèle</button>
    </div>

    <article class="doc-sheet">
      <div class="doc-sheet__accent"></div>
      <header class="doc-header">
        <img class="doc-header__logo" src="../assets/logo-necs.jpg" alt="Logo NECS SARL" />
        <div class="doc-header__brand">
          <h1>NECS</h1>
          <p class="legal">NECLEANING &amp; SERVICES SARL</p>
          <p class="tagline">Propreté · Rigueur · Confiance</p>
        </div>
        <div class="doc-header__meta">
          <span class="doc-type">{doc_type}</span>
          <dl>
            <dt>Référence</dt>
            <dd>{ref}</dd>
            <dt>Version</dt>
            <dd>{version}</dd>
            <dt>Statut</dt>
            <dd><span class="status-pill {status_class}">{status}</span></dd>
          </dl>
        </div>
      </header>
      <div class="doc-body">
        <div class="doc-title-block">
          <h2>{heading}</h2>
          <p>{subtitle}</p>
        </div>
        <div class="alert-note">{note}</div>
        {body}
      </div>
      <footer class="doc-footer">
        <div>
          <strong>NECS / NECLEANING &amp; SERVICES SARL</strong><br />
          Document généré pour validation client — Identité visuelle officielle<br />
          ID : {ref} · Date : <span data-today></span> · Module : {module}
        </div>
        <div class="footer-mark">Digitalisation NECS</div>
      </footer>
    </article>
  </div>
  <script src="../js/necs-forms.js"></script>
</body>
</html>
"""

SIGNATURES = """
<div class="section">
  <div class="section-title">Signatures &amp; validation</div>
  <div class="signature-grid">
    <div class="signature-box">
      <h4>{sig1_title}</h4>
      <p>{sig1_role}</p>
      <div class="signature-line">Signature / Date</div>
    </div>
    <div class="signature-box">
      <h4>{sig2_title}</h4>
      <p>{sig2_role}</p>
      <div class="signature-line">Signature / Date</div>
    </div>
  </div>
</div>
"""


def field(label, name, kind="text", required=False, full=False, hint="", options=None, value=""):
    req = ' <span class="req">*</span>' if required else ""
    cls = 'field full' if full else 'field'
    if kind == "select":
        opts = "".join(f'<option>{o}</option>' for o in (options or ["— Sélectionner —"]))
        control = f'<select name="{name}"{" required" if required else ""}>{opts}</select>'
    elif kind == "textarea":
        control = f'<textarea name="{name}"{" required" if required else ""}>{value}</textarea>'
    elif kind == "readonly":
        control = f'<div class="readonly-box">{value or "—"}</div>'
    else:
        control = f'<input type="{kind}" name="{name}" value="{value}"{" required" if required else ""} />'
    hint_html = f'<span class="hint">{hint}</span>' if hint else ""
    return f'<div class="{cls}"><label>{label}{req}</label>{control}{hint_html}</div>'


def form_grid(fields_html, cols=""):
    cls = f'form-grid {cols}'.strip()
    return f'<div class="{cls}">{fields_html}</div>'


def section(title, content):
    return f'<div class="section"><div class="section-title">{title}</div>{content}</div>'


def table(headers, rows):
    th = "".join(f"<th>{h}</th>" for h in headers)
    body = ""
    for row in rows:
        tds = "".join(f"<td>{c}</td>" for c in row)
        body += f"<tr>{tds}</tr>"
    return f'<table class="data-table"><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table>'


def check_list(items):
    rows = ""
    for item in items:
        rows += f'''<label class="check-item">
          <input type="checkbox" />
          <span>{item}</span>
          <span class="status-pill draft">À contrôler</span>
        </label>'''
    return f'<div class="check-list">{rows}</div>'


def signatures(a="Émetteur NECS", ar="Responsable", b="Client / Destinataire", br="Validation"):
    return SIGNATURES.format(sig1_title=a, sig1_role=ar, sig2_title=b, sig2_role=br)


def party_block():
    return section("Identification", form_grid(
        field("Client / Prospect", "client", required=True) +
        field("Site / Localisation", "site", required=True) +
        field("Contact principal", "contact") +
        field("Téléphone", "phone", "tel") +
        field("Email", "email", "email") +
        field("Réf. contrat / opportunité", "opp_ref")
    ))


TEMPLATES_SPEC = []

# TMP-01
TEMPLATES_SPEC.append({
    "file": "TMP-01-proposition-services.html",
    "id": "TMP-01",
    "title": "Proposition de services",
    "module": "CRM / Commercial",
    "doc_type": "Offre commerciale",
    "ref": "NECS-OFF-2026-0001",
    "heading": "Proposition de services / Offre commerciale",
    "subtitle": "Générée depuis l’opportunité et le chiffrage — prestations, méthodologie, moyens et planning.",
    "note": "Maquette de validation. Les données seront préremplies depuis le CRM (opportunité, chiffrage, sites).",
    "body": party_block() + section("Périmètre de la proposition", form_grid(
        field("Intitulé de l’offre", "titre", required=True, full=True) +
        field("Type de locaux", "type_locaux", "select", True, options=["Bureaux", "Industrie", "Commerce", "Résidentiel", "Établissement de santé", "Autre"]) +
        field("Surface estimée (m²)", "surface", "number", True) +
        field("Fréquence souhaitée", "frequence", "select", options=["Quotidienne", "Hebdomadaire", "Bi-hebdomadaire", "Mensuelle", "Ponctuelle"]) +
        field("Niveau de service", "sla", "select", options=["Standard", "Premium", "Critique / Haute sensibilité"]) +
        field("Validité de l’offre (jours)", "validite", "number", value="30") +
        field("Date de démarrage indicatif", "debut", "date") +
        field("Méthodologie & moyens", "methodo", "textarea", full=True, value="Organisation des équipes, matériels, consommables, planning indicatif et modalités de contrôle qualité.") +
        field("Équipe proposée", "equipe", "textarea", full=True)
    )) + section("Prestations proposées", table(
        ["Prestation", "Fréquence", "Effectif", "Unité", "Prix HT"],
        [
            ['<input value="Nettoyage bureaux" />', '<input value="5j/sem" />', '<input value="3" />', '<input value="Forfait" />', '<input class="num" value="450 000" />'],
            ['<input value="Entretien sanitaires" />', '<input value="5j/sem" />', '<input value="1" />', '<input value="Forfait" />', '<input class="num" value="120 000" />'],
            ['<input value="Vitrerie intérieure" />', '<input value="Mensuel" />', '<input value="2" />', '<input value="Intervention" />', '<input class="num" value="85 000" />'],
        ]
    )) + '<div class="totals"><div class="totals-row"><span>Sous-total HT</span><strong>655 000 FCFA</strong></div><div class="totals-row"><span>TVA / taxes</span><strong>Selon régime applicable</strong></div><div class="totals-row grand"><span>Total estimatif</span><span>655 000 FCFA</span></div></div>' + signatures("Commercial NECS", "Émetteur de l’offre", "Client", "Acceptation"),
})

# TMP-02
TEMPLATES_SPEC.append({
    "file": "TMP-02-devis.html",
    "id": "TMP-02",
    "title": "Devis",
    "module": "CRM / Finance",
    "doc_type": "Devis",
    "ref": "NECS-DEV-2026-0142",
    "heading": "Devis de prestations de nettoyage",
    "subtitle": "Numéro, client, site, prestations, quantités, prix unitaires, périodicité, taxes et conditions.",
    "note": "Template devis — versions et historique de validation prévus dans la plateforme.",
    "body": party_block() + section("Paramètres du devis", form_grid(
        field("Date d’émission", "date_emis", "date", True) +
        field("Date de validité", "date_valid", "date", True) +
        field("Devise", "devise", "select", options=["FCFA (XAF)", "EUR", "USD"]) +
        field("Conditions de paiement", "paiement", "select", options=["30 jours net", "45 jours", "Comptant", "Échéancier"]) +
        field("Notes / conditions particulières", "notes", "textarea", full=True)
    , "cols-3")) + section("Lignes de devis", table(
        ["Désignation", "Qté", "Unité", "P.U. HT", "Périodicité", "Total HT"],
        [
            ['<input value="Entretien quotidien locaux" />', '<input value="22" />', '<input value="Jour" />', '<input value="25 000" />', '<input value="Mensuel" />', '<input class="num" value="550 000" />'],
            ['<input value="Fourniture consommables" />', '<input value="1" />', '<input value="Lot" />', '<input value="75 000" />', '<input value="Mensuel" />', '<input class="num" value="75 000" />'],
        ]
    )) + '<div class="totals"><div class="totals-row"><span>Total HT</span><strong>625 000 FCFA</strong></div><div class="totals-row"><span>Taxes applicables</span><strong>À calculer</strong></div><div class="totals-row grand"><span>Net à payer</span><span>625 000 FCFA</span></div></div>' + signatures("Finance / Commercial", "Émission devis", "Direction", "Seuil de validation"),
})

# TMP-03
TEMPLATES_SPEC.append({
    "file": "TMP-03-bon-commande.html",
    "id": "TMP-03",
    "title": "Bon de commande",
    "module": "Commercial / Opérations",
    "doc_type": "Bon de commande",
    "ref": "NECS-BC-2026-0088",
    "heading": "Bon de commande client",
    "subtitle": "Référence client, prestations commandées, quantités, dates, site, conditions et validation.",
    "note": "Relié au devis accepté et au contrat. Traçabilité des validations obligatoire.",
    "body": party_block() + section("Commande", form_grid(
        field("N° devis lié", "devis_ref", required=True) +
        field("Date de commande", "date_cmd", "date", True) +
        field("Date de début souhaitée", "date_debut", "date") +
        field("Priorité", "priorite", "select", options=["Normale", "Haute", "Urgente"]) +
        field("Conditions", "conditions", "textarea", full=True)
    )) + section("Prestations commandées", table(
        ["Prestation", "Qté", "Date", "Site", "Statut"],
        [
            ['<input value="Démarrage entretien bureaux" />', '<input value="1" />', '<input type="date" />', '<input value="Siège client" />', '<select><option>En attente</option><option>Validé</option></select>'],
        ]
    )) + signatures("Commercial", "Émission", "Opérations", "Prise en charge"),
})

# TMP-04
TEMPLATES_SPEC.append({
    "file": "TMP-04-bon-livraison.html",
    "id": "TMP-04",
    "title": "Bon de livraison / réception",
    "module": "Opérations / Logistique",
    "doc_type": "Livraison",
    "ref": "NECS-BL-2026-0211",
    "heading": "Bon de livraison / réception",
    "subtitle": "Produits ou consommables livrés, quantités, site, date, réception, réserves et signatures.",
    "note": "Chaque mouvement de stock doit rester traçable (OPS-06).",
    "body": section("Livraison", form_grid(
        field("Site destinataire", "site", required=True) +
        field("Date / heure", "datetime", "datetime-local", True) +
        field("Livreur / magasinier", "livreur") +
        field("Réf. demande d’achat", "da_ref") +
        field("Réserves / observations", "reserves", "textarea", full=True)
    )) + section("Articles livrés", table(
        ["Article", "Unité", "Qté prévue", "Qté reçue", "État"],
        [
            ['<input value="Détergent multi-surfaces 5L" />', '<input value="Bidon" />', '<input value="12" />', '<input value="12" />', '<select><option>Conforme</option><option>Écart</option></select>'],
            ['<input value="Sacs poubelle 100L" />', '<input value="Rouleau" />', '<input value="20" />', '<input value="18" />', '<select><option>Écart</option><option>Conforme</option></select>'],
        ]
    )) + signatures("Magasin NECS", "Émetteur", "Réceptionnaire site", "Réception avec/sans réserve"),
})

# TMP-05
TEMPLATES_SPEC.append({
    "file": "TMP-05-contrat-prestation.html",
    "id": "TMP-05",
    "title": "Contrat de prestation",
    "module": "CRM / Juridique / Direction",
    "doc_type": "Contrat client",
    "ref": "NECS-CTR-2026-0034",
    "heading": "Contrat de prestation de services de nettoyage",
    "subtitle": "Parties, objet, périmètre, sites, prestations, effectifs, fréquences, SLA, prix, durée et signatures.",
    "note": "Document contractuel versionné. Toute modification validée crée un avenant (TMP-06).",
    "status": "Brouillon",
    "status_class": "draft",
    "body": section("Parties", form_grid(
        field("Client (raison sociale)", "client", required=True) +
        field("RCCM / Identifiant", "rccm") +
        field("Représentant client", "rep_client") +
        field("Représentant NECS", "rep_necs", value="Direction Générale") +
        field("Objet du contrat", "objet", "textarea", True, full=True, value="Prestation de services de nettoyage et d’entretien des locaux désignés.")
    )) + section("Périmètre & SLA", form_grid(
        field("Sites couverts", "sites", required=True) +
        field("Effectif contractuel", "effectif", "number") +
        field("Fréquence", "frequence") +
        field("Niveau SLA", "sla", "select", options=["Standard", "Premium", "Critique"]) +
        field("Durée (mois)", "duree", "number", value="12") +
        field("Renouvellement", "renouvellement", "select", options=["Tacite", "Express", "Sans"]) +
        field("Date d’effet", "effet", "date", True) +
        field("Date de fin", "fin", "date") +
        field("Obligations / clauses clés", "clauses", "textarea", full=True) +
        field("Prix & facturation", "prix", "textarea", full=True, value="Tarifs selon annexe devis. Facturation mensuelle. Échéance 30 jours.")
    )) + signatures("NECS SARL", "Direction", "Client", "Représentant légal"),
})

# TMP-06
TEMPLATES_SPEC.append({
    "file": "TMP-06-avenant-contrat.html",
    "id": "TMP-06",
    "title": "Avenant au contrat",
    "module": "CRM / Direction",
    "doc_type": "Avenant",
    "ref": "NECS-AVN-2026-0007",
    "heading": "Avenant au contrat client",
    "subtitle": "Modification de périmètre, tarif, durée, effectifs ou prestations — référence au contrat initial.",
    "note": "Conserve l’historique des versions du contrat initial.",
    "body": section("Références", form_grid(
        field("Contrat initial", "contrat_ref", required=True, value="NECS-CTR-2026-0034") +
        field("N° d’avenant", "avenant_no", value="01") +
        field("Date d’effet", "effet", "date", True) +
        field("Type de modification", "type_mod", "select", True, options=["Périmètre", "Tarif", "Durée", "Effectifs", "Prestations", "Mixte"]) +
        field("Description des modifications", "description", "textarea", True, full=True) +
        field("Impact financier HT", "impact", "number") +
        field("Justification", "justif", "textarea", full=True)
    )) + signatures("Direction NECS", "Validation", "Client", "Acceptation avenant"),
})

# TMP-07
TEMPLATES_SPEC.append({
    "file": "TMP-07-contrat-agent.html",
    "id": "TMP-07",
    "title": "Contrat / document agent",
    "module": "RH",
    "doc_type": "RH — Contrat",
    "ref": "NECS-RH-CTR-2026-019",
    "heading": "Document contractuel agent",
    "subtitle": "Informations collaborateur, poste, affectation, conditions, obligations, confidentialité et signatures.",
    "note": "Accès restreint RH. Signature électronique possible selon intégration retenue.",
    "body": section("Collaborateur", form_grid(
        field("Nom & prénoms", "nom", required=True) +
        field("Matricule", "matricule") +
        field("Poste", "poste", value="Agent d’entretien") +
        field("Type de contrat", "type", "select", options=["CDI", "CDD", "Intérim", "Stage"]) +
        field("Date d’embauche", "embauche", "date") +
        field("Site d’affectation", "site") +
        field("Horaires", "horaires") +
        field("Rémunération / conditions", "remu", "textarea", full=True) +
        field("Obligations & confidentialité", "obligations", "textarea", full=True, value="Respect des consignes site, EPI, confidentialité client, pointage et reporting.")
    )) + signatures("RH NECS", "Émetteur", "Collaborateur", "Signature"),
})

# TMP-08
TEMPLATES_SPEC.append({
    "file": "TMP-08-fiche-poste.html",
    "id": "TMP-08",
    "title": "Fiche de poste agent",
    "module": "RH",
    "doc_type": "Fiche de poste",
    "ref": "NECS-RH-FP-AE-01",
    "heading": "Fiche de poste — Agent d’entretien",
    "subtitle": "Mission, responsabilités, compétences, horaires, rattachement, sécurité et critères de performance.",
    "note": "Modèle administrable (clauses et champs) sans développement pour les éléments simples.",
    "body": section("Poste", form_grid(
        field("Intitulé", "intitule", value="Agent d’entretien", required=True) +
        field("Rattachement hiérarchique", "nplus1", value="Superviseur de site") +
        field("Horaires types", "horaires") +
        field("Lieu d’exercice", "lieu") +
        field("Mission principale", "mission", "textarea", True, full=True, value="Assurer la propreté et l’hygiène des locaux selon le cahier des charges site et les standards NECS.") +
        field("Responsabilités", "resp", "textarea", full=True) +
        field("Compétences requises", "competences", "textarea", full=True) +
        field("Exigences de sécurité / EPI", "securite", "textarea", full=True) +
        field("Critères de performance", "perf", "textarea", full=True, value="Respect planning, qualité perçue, pointage, incidents signalés, satisfaction superviseur.")
    )) + signatures("RH", "Validation fiche", "Manager", "Visa"),
})

# TMP-09
TEMPLATES_SPEC.append({
    "file": "TMP-09-dossier-embauche.html",
    "id": "TMP-09",
    "title": "Dossier d’embauche",
    "module": "RH",
    "doc_type": "Checklist RH",
    "ref": "NECS-RH-DE-2026-055",
    "heading": "Dossier d’embauche / checklist RH",
    "subtitle": "Pièces obligatoires, statut, date de réception, validité, observations et validation du dossier.",
    "note": "Pièces manquantes et expirées clairement identifiées (RH-03).",
    "body": section("Candidat / collaborateur", form_grid(
        field("Nom & prénoms", "nom", required=True) +
        field("Poste visé", "poste") +
        field("Date de démarrage prévue", "debut", "date") +
        field("Responsable RH", "rh")
    )) + section("Pièces obligatoires", check_list([
        "Pièce d’identité en cours de validité",
        "CV actualisé",
        "Certificat de travail / références",
        "Photo d’identité",
        "RIB / informations bancaires",
        "Attestation de domicile",
        "Certificat médical d’aptitude",
        "Documents contractuels signés",
        "Casier judiciaire (si requis)",
        "Autorisation de travail (si applicable)",
    ])) + section("Observations", form_grid(
        field("Commentaires RH", "obs", "textarea", full=True) +
        field("Statut dossier", "statut", "select", options=["Incomplet", "Complet", "Validé", "Bloqué"])
    )) + signatures("RH", "Contrôle dossier", "Direction", "Autorisation intégration"),
})

# TMP-10
TEMPLATES_SPEC.append({
    "file": "TMP-10-entretien-candidat.html",
    "id": "TMP-10",
    "title": "Entretien / évaluation candidat",
    "module": "RH",
    "doc_type": "Évaluation",
    "ref": "NECS-RH-ENT-2026-102",
    "heading": "Formulaire d’entretien / évaluation candidat",
    "subtitle": "Critères d’évaluation, appréciations, décision et signatures.",
    "note": "Parcours recrutement historisé (RH-02). Accès restreints.",
    "body": section("Candidat", form_grid(
        field("Nom & prénoms", "nom", required=True) +
        field("Poste", "poste", value="Agent d’entretien") +
        field("Date entretien", "date", "date", True) +
        field("Interviewer", "interviewer", required=True) +
        field("Source candidature", "source", "select", options=["Site web", "Facebook", "Cooptation", "Agence", "Spontané"])
    )) + section("Évaluation", '''
    <div class="score-row"><strong>Critère</strong><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
    ''' + "".join(
        f'<div class="score-row"><span>{c}</span>' + "".join(
            f'<label><input type="radio" name="c{i}" value="{n}" /></label>' for n in range(1, 6)
        ) + "</div>"
        for i, c in enumerate([
            "Présentation & ponctualité",
            "Expérience nettoyage",
            "Compréhension consignes",
            "Motivation",
            "Disponibilité horaires",
            "Travail en équipe",
        ], 1)
    )) + section("Décision", form_grid(
        field("Appréciation globale", "apprec", "textarea", full=True) +
        field("Décision", "decision", "select", True, options=["Retenu", "Liste d’attente", "Refusé", "À revoir"]) +
        field("Prochaine étape", "next", "select", options=["Essai terrain", "Contrat", "Complément dossier", "Clôture"])
    )) + signatures("RH / Manager", "Évaluateur", "Direction RH", "Validation décision"),
})

# TMP-11
TEMPLATES_SPEC.append({
    "file": "TMP-11-onboarding.html",
    "id": "TMP-11",
    "title": "Checklist onboarding",
    "module": "RH / Opérations",
    "doc_type": "Intégration",
    "ref": "NECS-RH-ONB-2026-033",
    "heading": "Checklist d’intégration / onboarding",
    "subtitle": "Documents, uniforme/EPI, matériel, formation, affectation, accès et validation d’intégration.",
    "note": "Fin d’intégration validée formalisée (RH-05).",
    "body": section("Collaborateur", form_grid(
        field("Nom", "nom", required=True) +
        field("Site d’affectation", "site", required=True) +
        field("Date d’intégration", "date", "date") +
        field("Manager", "manager")
    )) + section("Checklist", check_list([
        "Dossier RH complet et validé",
        "Contrat / documents signés",
        "Remise uniforme / EPI",
        "Dotation matériel de base",
        "Création accès application (pointage)",
        "Formation consignes sécurité",
        "Formation consignes site client",
        "Présentation équipe / superviseur",
        "Affectation planning confirmée",
        "Validation fin d’intégration",
    ])) + signatures("RH", "Suivi onboarding", "Manager site", "Validation intégration"),
})

# TMP-12
TEMPLATES_SPEC.append({
    "file": "TMP-12-ordre-travail.html",
    "id": "TMP-12",
    "title": "Ordre de travail",
    "module": "Opérations",
    "doc_type": "Intervention",
    "ref": "NECS-OT-2026-1440",
    "heading": "Ordre de travail / fiche d’intervention",
    "subtitle": "Site, mission, date, horaires, agents, consignes, matériel, statut et preuve d’exécution.",
    "note": "Mission traçable jusqu’à clôture (OPS-03). Preuves obligatoires selon mission.",
    "body": section("Mission", form_grid(
        field("Site", "site", required=True) +
        field("Client", "client", required=True) +
        field("Date", "date", "date", True) +
        field("Créneau", "creneau", value="06:00 – 14:00") +
        field("Superviseur", "superviseur") +
        field("Statut", "statut", "select", options=["Planifié", "En cours", "Terminé", "Anomalie"]) +
        field("Consignes spécifiques", "consignes", "textarea", full=True) +
        field("Matériel requis", "materiel", "textarea", full=True)
    )) + section("Agents affectés", table(
        ["Agent", "Rôle", "Arrivée", "Départ", "Preuve"],
        [
            ['<input value="A. Kouam" />', '<input value="Chef d’équipe" />', '<input type="time" />', '<input type="time" />', '<select><option>Photo</option><option>Signature</option></select>'],
            ['<input value="M. Ngo" />', '<input value="Agent" />', '<input type="time" />', '<input type="time" />', '<select><option>Photo</option><option>Signature</option></select>'],
        ]
    )) + section("Preuves d’exécution", '<div class="photo-slots"><div class="photo-slot">Avant</div><div class="photo-slot">Pendant</div><div class="photo-slot">Après</div><div class="photo-slot">Anomalie</div></div>') + signatures("Superviseur", "Clôture mission", "Client site", "Visa (si requis)"),
})

# TMP-13
TEMPLATES_SPEC.append({
    "file": "TMP-13-controle-qualite.html",
    "id": "TMP-13",
    "title": "Fiche contrôle qualité",
    "module": "Qualité",
    "doc_type": "Qualité",
    "ref": "NECS-QA-2026-0278",
    "heading": "Fiche de contrôle qualité",
    "subtitle": "Critères, notation, observations, photos, non-conformités, actions correctives et validation.",
    "note": "Contrôle réalisable sur mobile (Q-01). Scores, seuils, photos et périodicité.",
    "body": section("Contexte", form_grid(
        field("Site", "site", required=True) +
        field("Prestation contrôlée", "prestation", required=True) +
        field("Date / heure", "datetime", "datetime-local", True) +
        field("Contrôleur", "controleur", required=True) +
        field("Score global /100", "score", "number", value="0") +
        field("Seuil minimal", "seuil", "number", value="80")
    )) + section("Grille de notation", '''
    <div class="score-row"><strong>Zone / critère</strong><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
    ''' + "".join(
        f'<div class="score-row"><span>{c}</span>' + "".join(
            f'<label><input type="radio" name="q{i}" value="{n}" /></label>' for n in range(1, 6)
        ) + "</div>"
        for i, c in enumerate(["Sols & circulation", "Sanitaires", "Bureaux / postes", "Vitrerie", "Odeurs / hygiène", "Finitions"], 1)
    )) + section("Non-conformités & actions", form_grid(
        field("Écarts constatés", "ecarts", "textarea", full=True) +
        field("Actions correctives", "actions", "textarea", full=True) +
        field("Échéance corrective", "echeance", "date") +
        field("Responsable action", "resp_action")
    )) + section("Preuves photos", '<div class="photo-slots"><div class="photo-slot">Photo 1</div><div class="photo-slot">Photo 2</div><div class="photo-slot">Photo 3</div><div class="photo-slot">Photo 4</div></div>') + signatures("Qualité / Superviseur", "Contrôle", "Opérations", "Traitement écarts"),
})

# TMP-14
TEMPLATES_SPEC.append({
    "file": "TMP-14-rapport-prestation.html",
    "id": "TMP-14",
    "title": "Rapport de prestation",
    "module": "Opérations / Qualité",
    "doc_type": "Rapport site",
    "ref": "NECS-RP-2026-0061",
    "heading": "Rapport de prestation / rapport de site",
    "subtitle": "Synthèse prestations, effectifs, incidents, contrôles, observations et recommandations.",
    "note": "Alimente les tableaux de bord opérations et qualité.",
    "body": section("Période & site", form_grid(
        field("Client", "client", required=True) +
        field("Site", "site", required=True) +
        field("Période du", "debut", "date", True) +
        field("au", "fin", "date", True)
    )) + '<div class="kpi-strip"><div class="kpi"><span>Prestations</span><strong>22</strong></div><div class="kpi"><span>Effectif moyen</span><strong>4</strong></div><div class="kpi"><span>Score qualité</span><strong>91%</strong></div><div class="kpi"><span>Incidents</span><strong>1</strong></div></div>' + section("Synthèse", form_grid(
        field("Prestations réalisées", "prestations", "textarea", full=True) +
        field("Incidents / réclamations", "incidents", "textarea", full=True) +
        field("Contrôles effectués", "controles", "textarea", full=True) +
        field("Recommandations", "reco", "textarea", full=True) +
        field("Actions à suivre", "actions", "textarea", full=True)
    )) + signatures("Opérations", "Rédacteur", "Qualité / Client", "Visa"),
})

# TMP-15
TEMPLATES_SPEC.append({
    "file": "TMP-15-demande-achat.html",
    "id": "TMP-15",
    "title": "Demande d’achat",
    "module": "Opérations / Achats",
    "doc_type": "Achat interne",
    "ref": "NECS-DA-2026-0199",
    "heading": "Bon de commande interne / demande d’achat",
    "subtitle": "Demandeur, site, articles, quantités, justification, validation et fournisseur.",
    "note": "Circuit de validation configurable (SEC-02).",
    "status": "En validation",
    "status_class": "pending",
    "body": section("Demande", form_grid(
        field("Demandeur", "demandeur", required=True) +
        field("Site", "site", required=True) +
        field("Date besoin", "date_besoin", "date") +
        field("Fournisseur proposé", "fournisseur") +
        field("Justification", "justif", "textarea", True, full=True)
    )) + section("Articles", table(
        ["Article", "Qté", "Unité", "Estimation", "Urgence"],
        [
            ['<input value="Serpillères microfibre" />', '<input value="30" />', '<input value="Pce" />', '<input value="45 000" />', '<select><option>Normale</option><option>Haute</option></select>'],
            ['<input value="Gants nitrile" />', '<input value="100" />', '<input value="Paire" />', '<input value="28 000" />', '<select><option>Haute</option><option>Normale</option></select>'],
        ]
    )) + signatures("Demandeur", "Émission", "Approbateur", "Validation budgétaire"),
})

# TMP-16
TEMPLATES_SPEC.append({
    "file": "TMP-16-demande-conge.html",
    "id": "TMP-16",
    "title": "Demande de congé",
    "module": "RH",
    "doc_type": "Absence",
    "ref": "NECS-RH-ABS-2026-411",
    "heading": "Demande de congé / absence",
    "subtitle": "Collaborateur, période, motif, validation et impact planning.",
    "note": "Impact planning détecté et historisé (RH-06 / OPS-02).",
    "body": section("Demande", form_grid(
        field("Collaborateur", "collab", required=True) +
        field("Matricule", "matricule") +
        field("Type", "type", "select", True, options=["Congé payé", "Permission", "Maladie", "Autre"]) +
        field("Du", "debut", "date", True) +
        field("Au", "fin", "date", True) +
        field("Nombre de jours", "jours", "number") +
        field("Motif", "motif", "textarea", full=True) +
        field("Remplaçant proposé", "remplacant") +
        field("Impact planning", "impact", "readonly", value="À calculer automatiquement")
    )) + signatures("Collaborateur", "Demande", "Manager / RH", "Décision"),
})

# TMP-17
TEMPLATES_SPEC.append({
    "file": "TMP-17-pointage.html",
    "id": "TMP-17",
    "title": "Fiche de pointage",
    "module": "Opérations / RH",
    "doc_type": "Présence",
    "ref": "NECS-PTG-2026-9001",
    "heading": "Fiche de pointage / relevé de présence",
    "subtitle": "Agent, site, date, arrivée, départ, anomalies, validation et export.",
    "note": "Anti-double-pointage et rapprochement planning (OPS-04). Offline possible selon étude.",
    "body": section("Contexte", form_grid(
        field("Agent", "agent", required=True) +
        field("Site", "site", required=True) +
        field("Date", "date", "date", True) +
        field("Planning prévu", "planning", value="06:00 – 14:00")
    )) + section("Pointages", table(
        ["Type", "Heure", "Mode", "Géo (si activée)", "Anomalie"],
        [
            ["Arrivée", '<input type="time" value="06:02" />', '<select><option>Mobile</option><option>Terminal</option></select>', '<input value="OK" />', '<select><option>Aucune</option><option>Retard</option></select>'],
            ["Départ", '<input type="time" value="14:05" />', '<select><option>Mobile</option><option>Terminal</option></select>', '<input value="OK" />', '<select><option>Aucune</option><option>Départ anticipé</option></select>'],
        ]
    )) + section("Validation", form_grid(
        field("Commentaire superviseur", "commentaire", "textarea", full=True) +
        field("Statut validation", "statut", "select", options=["À valider", "Validé", "Rejeté", "Corrigé"])
    )) + signatures("Agent", "Confirmation", "Superviseur / RH", "Validation relevé"),
})

# TMP-18
TEMPLATES_SPEC.append({
    "file": "TMP-18-prefacture.html",
    "id": "TMP-18",
    "title": "Préfacture",
    "module": "Finance / Opérations",
    "doc_type": "Préfacturation",
    "ref": "NECS-PF-2026-0112",
    "heading": "Préfacture / état des prestations facturables",
    "subtitle": "Période, contrat, prestations réalisées, quantités, écarts, ajustements et validation.",
    "note": "Rapprochement prestations / contrat avant facturation (FIN-02).",
    "status": "En validation",
    "status_class": "pending",
    "body": section("Cadre", form_grid(
        field("Client", "client", required=True) +
        field("Contrat", "contrat", required=True) +
        field("Période du", "debut", "date", True) +
        field("au", "fin", "date", True)
    )) + section("Prestations facturables", table(
        ["Prestation", "Prévu", "Réalisé", "Écart", "Ajustement", "Montant"],
        [
            ['<input value="Entretien quotidien" />', '<input value="22" />', '<input value="21" />', '<input value="-1" />', '<input value="0" />', '<input class="num" value="525 000" />'],
            ['<input value="Consommables" />', '<input value="1" />', '<input value="1" />', '<input value="0" />', '<input value="0" />', '<input class="num" value="75 000" />'],
        ]
    )) + '<div class="totals"><div class="totals-row grand"><span>Total préfacturé HT</span><span>600 000 FCFA</span></div></div>' + signatures("Opérations", "Contrôle réalisations", "Finance", "Validation préfacture"),
})

# TMP-19
TEMPLATES_SPEC.append({
    "file": "TMP-19-facture.html",
    "id": "TMP-19",
    "title": "Facture",
    "module": "Finance",
    "doc_type": "Facture",
    "ref": "NECS-FAC-2026-0450",
    "heading": "Facture",
    "subtitle": "Identité NECS, client, contrat, période, prestations, montants, taxes, échéance et modalités.",
    "note": "Numérotation, avoirs et statuts gérés (FIN-03). Export PDF pour diffusion.",
    "status": "Émise",
    "status_class": "validated",
    "body": section("Facturation", form_grid(
        field("Client", "client", required=True) +
        field("N° contrat", "contrat") +
        field("Période facturée", "periode") +
        field("Date facture", "date_fac", "date", True) +
        field("Échéance", "echeance", "date", True) +
        field("Modalités de paiement", "modalites", value="Virement — 30 jours")
    , "cols-3")) + section("Lignes", table(
        ["Désignation", "Qté", "P.U. HT", "Total HT"],
        [
            ['<input value="Prestations de nettoyage — Mars 2026" />', '<input value="1" />', '<input value="600 000" />', '<input class="num" value="600 000" />'],
        ]
    )) + '<div class="totals"><div class="totals-row"><span>Total HT</span><strong>600 000 FCFA</strong></div><div class="totals-row"><span>Taxes</span><strong>Selon régime</strong></div><div class="totals-row grand"><span>Net à payer</span><span>600 000 FCFA</span></div></div>' + section("Références de paiement", form_grid(
        field("Banque / compte", "banque", "textarea", full=True, value="Coordonnées bancaires NECS (à compléter)") +
        field("Référence à rappeler", "ref_paiement", value="NECS-FAC-2026-0450")
    )) + signatures("Finance NECS", "Émission", "Client", "Accusé (optionnel)"),
})

# TMP-20
TEMPLATES_SPEC.append({
    "file": "TMP-20-avoir.html",
    "id": "TMP-20",
    "title": "Avoir",
    "module": "Finance",
    "doc_type": "Avoir",
    "ref": "NECS-AVO-2026-0015",
    "heading": "Avoir",
    "subtitle": "Référence facture initiale, motif, lignes concernées, montant, validation et traçabilité.",
    "note": "Toute modification d’un document validé crée une nouvelle version.",
    "body": section("Avoir", form_grid(
        field("Facture initiale", "facture_ref", required=True, value="NECS-FAC-2026-0450") +
        field("Date avoir", "date", "date", True) +
        field("Motif", "motif", "textarea", True, full=True) +
        field("Montant HT", "montant", "number", required=True)
    )) + section("Lignes concernées", table(
        ["Ligne", "Qté", "Montant"],
        [['<input value="Ajustement prestation J21 non réalisée" />', '<input value="1" />', '<input class="num" value="25 000" />']]
    )) + signatures("Finance", "Émission avoir", "Direction", "Validation"),
})

# TMP-21
TEMPLATES_SPEC.append({
    "file": "TMP-21-releve-compte.html",
    "id": "TMP-21",
    "title": "Relevé de compte client",
    "module": "Finance",
    "doc_type": "Compte client",
    "ref": "NECS-RC-2026-008",
    "heading": "Relevé de compte client",
    "subtitle": "Factures, avoirs, règlements, soldes, échéances et créances.",
    "note": "Solde client à jour après rapprochement (FIN-04).",
    "body": section("Client", form_grid(
        field("Client", "client", required=True) +
        field("Période du", "debut", "date") +
        field("au", "fin", "date") +
        field("Solde actuel", "solde", "readonly", value="175 000 FCFA")
    , "cols-3")) + section("Mouvements", table(
        ["Date", "Pièce", "Libellé", "Débit", "Crédit", "Solde"],
        [
            ["01/03/2026", "FAC-0450", "Facture mars", "600 000", "—", "600 000"],
            ["05/03/2026", "AVO-0015", "Avoir ajustement", "—", "25 000", "575 000"],
            ["20/03/2026", "ENC-330", "Règlement partiel", "—", "400 000", "175 000"],
        ]
    )) + signatures("Finance", "Émission relevé", "Client", "Pour accord"),
})

# TMP-22
TEMPLATES_SPEC.append({
    "file": "TMP-22-relance-client.html",
    "id": "TMP-22",
    "title": "Lettre / email de relance",
    "module": "Finance / Recouvrement",
    "doc_type": "Relance",
    "ref": "NECS-REL-2026-0077",
    "heading": "Lettre / email de relance client",
    "subtitle": "Références factures, montants dus, échéances, historique et niveau de relance.",
    "note": "Scénarios de relance et escalade (FIN-05).",
    "body": section("Relance", form_grid(
        field("Client", "client", required=True) +
        field("Niveau de relance", "niveau", "select", True, options=["R1 — Amiable", "R2 — Fermeté", "R3 — Mise en demeure", "R4 — Escalade direction"]) +
        field("Canal", "canal", "select", options=["Email", "Courrier", "Appel + email"]) +
        field("Date d’envoi", "date", "date") +
        field("Objet", "objet", value="Relance de paiement — factures échues", full=True) +
        field("Corps du message", "corps", "textarea", True, full=True, value="Madame, Monsieur,\n\nSauf erreur de notre part, les factures ci-dessous restent dues. Nous vous remercions de procéder au règlement ou de nous indiquer la date de paiement prévue.\n\nCordialement,\nService Recouvrement — NECS SARL")
    )) + section("Factures concernées", table(
        ["Facture", "Échéance", "Montant dû", "Jours de retard"],
        [['<input value="NECS-FAC-2026-0450" />', '<input type="date" />', '<input value="175 000" />', '<input value="12" />']]
    )) + signatures("Recouvrement", "Émetteur", "Direction", "Visa si escalade"),
})

# TMP-23
TEMPLATES_SPEC.append({
    "file": "TMP-23-accuse-reception.html",
    "id": "TMP-23",
    "title": "Accusé de réception",
    "module": "CRM / Finance",
    "doc_type": "Preuve transmission",
    "ref": "NECS-AR-2026-0502",
    "heading": "Accusé de réception / preuve de transmission",
    "subtitle": "Document transmis, destinataire, canal, date/heure et statut.",
    "note": "Traçabilité des envois (offres, contrats, factures).",
    "body": section("Transmission", form_grid(
        field("Document transmis", "document", required=True) +
        field("Référence document", "ref_doc", required=True) +
        field("Destinataire", "destinataire", required=True) +
        field("Canal", "canal", "select", options=["Email", "Portail client", "Remise en main propre", "Courrier"]) +
        field("Date / heure", "datetime", "datetime-local", True) +
        field("Statut", "statut", "select", options=["Envoyé", "Reçu", "Ouvert", "Échec"]) +
        field("Preuve / identifiant technique", "preuve", "textarea", full=True)
    )) + signatures("Émetteur NECS", "Transmission", "Destinataire", "Accusé"),
})

# TMP-24
TEMPLATES_SPEC.append({
    "file": "TMP-24-rapport-mensuel.html",
    "id": "TMP-24",
    "title": "Rapport mensuel performance",
    "module": "Direction / Qualité / Opérations",
    "doc_type": "Performance",
    "ref": "NECS-RM-2026-03",
    "heading": "Rapport mensuel de performance client",
    "subtitle": "KPI, prestations, qualité, incidents, réclamations, actions et recommandations.",
    "note": "Consolide les indicateurs pour pilotage direction et restitution client.",
    "body": section("Périmètre", form_grid(
        field("Client", "client", required=True) +
        field("Mois", "mois", "month", True) +
        field("Sites inclus", "sites") +
        field("Rédacteur", "redacteur")
    )) + '<div class="kpi-strip"><div class="kpi"><span>Taux réalisation</span><strong>98%</strong></div><div class="kpi"><span>Qualité moyenne</span><strong>92/100</strong></div><div class="kpi"><span>Réclamations</span><strong>2</strong></div><div class="kpi"><span>Actions closes</span><strong>5/6</strong></div></div>' + section("Analyse", form_grid(
        field("Synthèse prestations", "prestations", "textarea", full=True) +
        field("Qualité & contrôles", "qualite", "textarea", full=True) +
        field("Incidents / réclamations", "incidents", "textarea", full=True) +
        field("Actions & recommandations", "actions", "textarea", full=True)
    )) + signatures("Direction opérations", "Rédaction", "Client", "Revue mensuelle"),
})

# TMP-25
TEMPLATES_SPEC.append({
    "file": "TMP-25-visite-technique.html",
    "id": "TMP-25",
    "title": "Rapport audit / visite technique",
    "module": "Commercial / Qualité",
    "doc_type": "Visite technique",
    "ref": "NECS-VT-2026-0188",
    "heading": "Rapport d’audit / visite technique",
    "subtitle": "Constats, photos, mesures, risques, besoins, recommandations et actions.",
    "note": "Rapport horodaté exploitable pour le chiffrage (CRM-03).",
    "body": section("Visite", form_grid(
        field("Prospect / Client", "client", required=True) +
        field("Site visité", "site", required=True) +
        field("Date / heure", "datetime", "datetime-local", True) +
        field("Commercial / auditeur", "auditeur", required=True) +
        field("Surface mesurée (m²)", "surface", "number") +
        field("Type de locaux", "type_locaux", "select", options=["Bureaux", "Industrie", "Commerce", "Santé", "Autre"])
    )) + section("Constats", form_grid(
        field("Zones / contraintes", "zones", "textarea", full=True) +
        field("Risques identifiés", "risques", "textarea", full=True) +
        field("Besoins exprimés", "besoins", "textarea", full=True) +
        field("Recommandations NECS", "reco", "textarea", full=True) +
        field("Actions / prochaines étapes", "actions", "textarea", full=True, value="Chiffrage, offre, planning de démarrage.")
    )) + section("Preuves photos", '<div class="photo-slots"><div class="photo-slot">Zone A</div><div class="photo-slot">Zone B</div><div class="photo-slot">Contrainte</div><div class="photo-slot">Accès</div></div>') + signatures("Commercial / Qualité", "Auteur du rapport", "Client / Prospect", "Visa visite"),
})

# DIG forms
DIG = [
    {
        "file": "DIG-01-demande-devis.html",
        "id": "DIG-01",
        "title": "Demande de devis (site web)",
        "module": "Marketing digital",
        "doc_type": "Lead web",
        "ref": "NECS-WEB-DEVIS",
        "heading": "Demande de devis en ligne",
        "subtitle": "Formulaire site web — création automatique du prospect dans le CRM (DIG-01).",
        "note": "Déduplication, source/campagne conservée, notification commercial, consentement géré.",
        "body": section("Vos coordonnées", form_grid(
            field("Nom complet", "nom", required=True) +
            field("Entreprise", "entreprise", required=True) +
            field("Email", "email", "email", True) +
            field("Téléphone", "tel", "tel", True) +
            field("Ville", "ville") +
            field("Source", "source", "readonly", value="Site web — formulaire devis")
        )) + section("Votre besoin", form_grid(
            field("Type de locaux", "type", "select", True, options=["Bureaux", "Commerce", "Industrie", "Résidentiel", "Autre"]) +
            field("Surface approx. (m²)", "surface", "number") +
            field("Fréquence souhaitée", "frequence", "select", options=["Quotidienne", "Hebdomadaire", "Mensuelle", "Ponctuelle"]) +
            field("Délai souhaité", "delai", "select", options=["Urgent (< 7j)", "Sous 30 jours", "À planifier"]) +
            field("Description du besoin", "besoin", "textarea", True, full=True)
        )) + section("Consentement", form_grid(
            field("J’accepte d’être contacté(e) par NECS au sujet de ma demande", "consent", "select", True, options=["Oui", "Non"], full=True) +
            field("Préférences communication", "prefs", "select", options=["Email", "Téléphone", "WhatsApp", "Email + Téléphone"])
        )) + '<div style="margin-top:1.5rem"><button class="btn btn-primary" type="button">Envoyer ma demande</button></div>',
    },
    {
        "file": "DIG-02-contact.html",
        "id": "DIG-02",
        "title": "Contact (site web)",
        "module": "Marketing digital",
        "doc_type": "Contact",
        "ref": "NECS-WEB-CONTACT",
        "heading": "Nous contacter",
        "subtitle": "Message digital transformé en lead, tâche ou ticket (DIG-05).",
        "note": "Affectation, SLA et historique conservés dans la plateforme.",
        "body": section("Message", form_grid(
            field("Nom", "nom", required=True) +
            field("Email", "email", "email", True) +
            field("Téléphone", "tel", "tel") +
            field("Sujet", "sujet", "select", True, options=["Information", "Devis", "Réclamation", "Partenariat", "Autre"]) +
            field("Message", "message", "textarea", True, full=True) +
            field("Consentement contact", "consent", "select", True, options=["Oui", "Non"])
        )) + '<div style="margin-top:1.5rem"><button class="btn btn-primary" type="button">Envoyer</button></div>',
    },
    {
        "file": "DIG-03-demande-visite.html",
        "id": "DIG-03",
        "title": "Demande de visite technique",
        "module": "Marketing / Commercial",
        "doc_type": "Visite",
        "ref": "NECS-WEB-VISITE",
        "heading": "Demande de visite technique",
        "subtitle": "Planification d’une visite pour collecter surfaces, zones, contraintes et observations.",
        "note": "Alimente CRM-03 — checklist et rapport validable.",
        "body": section("Coordonnées", form_grid(
            field("Nom / Entreprise", "nom", required=True) +
            field("Téléphone", "tel", "tel", True) +
            field("Email", "email", "email", True) +
            field("Adresse du site", "adresse", required=True, full=True)
        )) + section("Planification", form_grid(
            field("Date souhaitée", "date", "date", True) +
            field("Créneau", "creneau", "select", options=["Matin", "Après-midi", "Indifférent"]) +
            field("Type de locaux", "type", "select", options=["Bureaux", "Industrie", "Commerce", "Autre"]) +
            field("Informations utiles", "infos", "textarea", full=True)
        )) + '<div style="margin-top:1.5rem"><button class="btn btn-primary" type="button">Demander une visite</button></div>',
    },
]


def render(spec):
    html = HEADER.format(
        title=spec["title"],
        doc_type=spec["doc_type"],
        ref=spec["ref"],
        version=spec.get("version", "1.0"),
        status=spec.get("status", "Maquette"),
        status_class=spec.get("status_class", "draft"),
        heading=spec["heading"],
        subtitle=spec["subtitle"],
        note=spec["note"],
        body=spec["body"],
        module=spec["module"],
    )
    (TEMPLATES / spec["file"]).write_text(html, encoding="utf-8")


for spec in TEMPLATES_SPEC + DIG:
    render(spec)

# Index
cards = []
modules = []
for spec in TEMPLATES_SPEC + DIG:
    modules.append(spec["module"].split("/")[0].strip())
    cards.append(f'''
    <a class="template-card" href="templates/{spec["file"]}" data-module="{spec["module"]}" data-title="{spec["title"]}">
      <div class="template-card__id">{spec["id"]}</div>
      <h3 class="template-card__title">{spec["title"]}</h3>
      <p class="template-card__meta">{spec["subtitle"][:110]}…</p>
      <span class="template-card__module">{spec["module"]}</span>
    </a>''')

unique_modules = []
for m in modules:
    if m not in unique_modules:
        unique_modules.append(m)

filters = ['<button class="filter-chip is-active" type="button" data-filter="all">Tous</button>']
for m in unique_modules:
    filters.append(f'<button class="filter-chip" type="button" data-filter="{m}">{m}</button>')

index_html = f'''<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Galerie templates — NECS SARL</title>
  <link rel="stylesheet" href="css/necs-premium.css" />
</head>
<body>
  <div class="app-shell">
    <header class="brand-bar">
      <div class="brand-bar__identity">
        <img class="brand-bar__logo" src="assets/logo-necs.jpg" alt="Logo NECS SARL" />
        <div class="brand-bar__text">
          <h1>NECS · Templates métier</h1>
          <p>NECLEANING &amp; SERVICES SARL — Maquettes HTML pour validation client</p>
        </div>
      </div>
      <span class="brand-bar__badge">V6 · Ultra-premium</span>
    </header>

    <section class="hero-intro">
      <h2>Bibliothèque documentaire &amp; formulaires</h2>
      <p>
        25 templates métier (TMP-01 à TMP-25) issus du cahier des charges, plus 3 formulaires digitaux web.
        Identité visuelle officielle NECS, prêts à présenter au client pour validation avant développement.
      </p>
    </section>

    <div class="toolbar">
      <div class="search-field">
        <input id="searchTemplates" type="search" placeholder="Rechercher un template (devis, RH, qualité…)" />
      </div>
      {''.join(filters)}
    </div>

    <div class="template-grid" id="templateGrid">
      {''.join(cards)}
    </div>
  </div>
  <script src="js/necs-forms.js"></script>
</body>
</html>
'''

(ROOT / "index.html").write_text(index_html, encoding="utf-8")
print(f"Generated {len(TEMPLATES_SPEC)} TMP + {len(DIG)} DIG + index")
