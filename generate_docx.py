# -*- coding: utf-8 -*-
"""Génère les templates NECS en documents Word (.docx) pour validation client."""
from pathlib import Path
from copy import deepcopy

from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches, Twips
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn, nsmap
from docx.oxml import OxmlElement

ROOT = Path(r"C:\Users\UTILISATEUR\Desktop\erp cameroun")
OUT = ROOT / "documents"
OUT.mkdir(exist_ok=True)
LOGO = ROOT / "assets" / "logo-necs.jpg"

BLUE = RGBColor(0x0A, 0x3D, 0x7A)
GREEN = RGBColor(0x2D, 0x8A, 0x2E)
GRAY = RGBColor(0x3D, 0x4A, 0x5C)
GRAY_LIGHT = RGBColor(0x6B, 0x7A, 0x8D)
BLACK = RGBColor(0x0F, 0x17, 0x20)


def set_run_font(run, size=11, bold=False, color=BLACK, name="Calibri"):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = color


def add_para(doc, text="", size=11, bold=False, color=BLACK, align="left", space_after=6, space_before=0):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    if align == "center":
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif align == "right":
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    elif align == "justify":
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    if text:
        run = p.add_run(text)
        set_run_font(run, size=size, bold=bold, color=color)
    return p


def shade_cell(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    shd.set(qn("w:val"), "clear")
    tcPr.append(shd)


def set_cell_text(cell, text, bold=False, size=10, color=BLACK, align="left"):
    cell.text = ""
    p = cell.paragraphs[0]
    if align == "center":
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif align == "right":
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold, color=color)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER


def add_horizontal_line(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(8)
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "18")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "0A3D7A")
    pBdr.append(bottom)
    pPr.append(pBdr)


def setup_doc():
    doc = Document()
    for section in doc.sections:
        section.top_margin = Cm(1.4)
        section.bottom_margin = Cm(1.4)
        section.left_margin = Cm(1.6)
        section.right_margin = Cm(1.6)
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
    return doc


def add_header_block(doc, doc_label, ref, meta_lines):
    table = doc.add_table(rows=1, cols=3)
    table.autofit = True
    row = table.rows[0]

    # Logo
    if LOGO.exists():
        p = row.cells[0].paragraphs[0]
        run = p.add_run()
        run.add_picture(str(LOGO), width=Cm(2.4))
    else:
        set_cell_text(row.cells[0], "NECS", bold=True, size=14, color=BLUE)

    # Brand
    c1 = row.cells[1]
    c1.text = ""
    p = c1.paragraphs[0]
    r = p.add_run("NECS")
    set_run_font(r, size=18, bold=True, color=BLUE)
    p2 = c1.add_paragraph()
    r2 = p2.add_run("NECLEANING & SERVICES SARL")
    set_run_font(r2, size=10, bold=True, color=BLACK)
    p3 = c1.add_paragraph()
    r3 = p3.add_run("Propreté · Rigueur · Confiance")
    set_run_font(r3, size=9, color=GRAY_LIGHT)
    p4 = c1.add_paragraph()
    r4 = p4.add_run("Siège : [Adresse — Cameroun]  |  Tél. : [+237 …]  |  Email : contact@necs.cm")
    set_run_font(r4, size=8, color=GRAY)

    # Doc meta
    c2 = row.cells[2]
    c2.text = ""
    p = c2.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run(doc_label.upper())
    set_run_font(r, size=12, bold=True, color=GREEN)
    p2 = c2.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r2 = p2.add_run(ref)
    set_run_font(r2, size=10, bold=True, color=BLUE)
    for line in meta_lines:
        p3 = c2.add_paragraph()
        p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r3 = p3.add_run(line)
        set_run_font(r3, size=9, color=GRAY)

    add_horizontal_line(doc)
    add_para(doc, "SPÉCIMEN — DOCUMENT DE VALIDATION CLIENT", size=9, bold=True, color=GREEN, align="center", space_after=10)


def add_two_parties(doc, left_title, left_lines, right_title, right_lines):
    table = doc.add_table(rows=1, cols=2)
    table.style = "Table Grid"
    for i, (title, lines) in enumerate([(left_title, left_lines), (right_title, right_lines)]):
        cell = table.rows[0].cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        r = p.add_run(title)
        set_run_font(r, size=9, bold=True, color=BLUE)
        for line in lines:
            p2 = cell.add_paragraph()
            r2 = p2.add_run(line)
            set_run_font(r2, size=10, bold=(line == lines[0]), color=BLACK)
        shade_cell(cell, "F7FAFC")
    doc.add_paragraph()


def add_kv_grid(doc, pairs):
    cols = 2
    rows = (len(pairs) + 1) // 2
    table = doc.add_table(rows=rows, cols=cols)
    table.style = "Table Grid"
    for idx, (label, value) in enumerate(pairs):
        r, c = divmod(idx, cols)
        cell = table.rows[r].cells[c]
        cell.text = ""
        p = cell.paragraphs[0]
        r1 = p.add_run(label.upper() + "\n")
        set_run_font(r1, size=8, bold=True, color=GRAY_LIGHT)
        r2 = p.add_run(value)
        set_run_font(r2, size=10, bold=True, color=BLACK)
    doc.add_paragraph()


def add_table(doc, headers, rows, col_widths=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        set_cell_text(cell, h, bold=True, size=9, color=RGBColor(0xFF, 0xFF, 0xFF), align="center")
        shade_cell(cell, "0A3D7A")
    for r_idx, row in enumerate(rows):
        for c_idx, val in enumerate(row):
            align = "right" if c_idx == len(row) - 1 and any(ch.isdigit() for ch in str(val)) else "left"
            if c_idx in (1, 2) and len(headers) > 4:
                align = "center"
            set_cell_text(table.rows[r_idx + 1].cells[c_idx], str(val), size=9, align=align)
            if r_idx % 2 == 1:
                shade_cell(table.rows[r_idx + 1].cells[c_idx], "F3F6FA")
    doc.add_paragraph()
    return table


def add_amounts(doc, lines, total_label, total_value):
    table = doc.add_table(rows=len(lines) + 1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.RIGHT
    for i, (label, value) in enumerate(lines):
        set_cell_text(table.rows[i].cells[0], label, size=10, color=GRAY)
        set_cell_text(table.rows[i].cells[1], value, size=10, bold=True, align="right")
    set_cell_text(table.rows[-1].cells[0], total_label, bold=True, size=11, color=RGBColor(0xFF, 0xFF, 0xFF))
    set_cell_text(table.rows[-1].cells[1], total_value, bold=True, size=11, color=RGBColor(0xFF, 0xFF, 0xFF), align="right")
    shade_cell(table.rows[-1].cells[0], "0A3D7A")
    shade_cell(table.rows[-1].cells[1], "2D8A2E")
    doc.add_paragraph()


def add_section_title(doc, text):
    add_para(doc, text, size=12, bold=True, color=BLUE, space_before=8, space_after=6)


def add_bullets(doc, items):
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.clear()
        run = p.add_run(item)
        set_run_font(run, size=10, color=GRAY)
        p.paragraph_format.space_after = Pt(3)


def add_numbered(doc, items):
    for item in items:
        p = doc.add_paragraph(style="List Number")
        p.clear()
        run = p.add_run(item)
        set_run_font(run, size=10, color=GRAY)
        p.paragraph_format.space_after = Pt(3)


def add_signatures(doc, left_title, left_sub, right_title, right_sub):
    add_para(doc, "", space_after=4)
    table = doc.add_table(rows=1, cols=2)
    table.style = "Table Grid"
    for i, (title, sub) in enumerate([(left_title, left_sub), (right_title, right_sub)]):
        cell = table.rows[0].cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        r = p.add_run(title)
        set_run_font(r, size=10, bold=True, color=BLUE)
        p2 = cell.add_paragraph()
        r2 = p2.add_run(sub)
        set_run_font(r2, size=9, color=GRAY_LIGHT)
        for _ in range(4):
            cell.add_paragraph()
        p3 = cell.add_paragraph()
        r3 = p3.add_run("Nom, signature & cachet · Date")
        set_run_font(r3, size=8, color=GRAY_LIGHT)
    doc.add_paragraph()


def add_footer_note(doc, text):
    add_horizontal_line(doc)
    add_para(doc, text, size=8, color=GRAY_LIGHT, align="center")


def save(doc, filename):
    path = OUT / filename
    doc.save(path)
    return path


# ===================== DOCUMENTS PREMIUM =====================

def build_offre():
    doc = setup_doc()
    add_header_block(doc, "Offre commerciale", "NECS-OFF-2026-0001", [
        "Date : 10 mars 2026",
        "Validité : 30 jours",
        "Confidentiel",
    ])
    add_para(doc, "Proposition de services de nettoyage professionnel", size=14, bold=True, color=BLUE, align="center")
    add_para(
        doc,
        "Suite à nos échanges et à la visite technique réalisée sur votre site, NECS a le plaisir de vous présenter "
        "une proposition complète : méthodologie, moyens humains et matériels, organisation, planning indicatif et conditions. "
        "Cette offre est conçue pour garantir un environnement propre, maîtrisé et mesurable.",
        size=10, color=GRAY, align="justify", space_after=10,
    )
    add_two_parties(
        doc,
        "PRÉPARÉ POUR",
        ["SOCIÉTÉ EXEMPLE SA", "Immeuble Horizon — Douala", "Contact : M. Jean OKALA"],
        "PRÉPARÉ PAR",
        ["NECS SARL — Direction Commerciale", "Commercial : Mme A. MBARGA", "Réf. opportunité : OPP-2026-0087"],
    )
    add_section_title(doc, "1. Compréhension de votre besoin")
    add_para(
        doc,
        "Locaux tertiaires d’environ 1 850 m², fréquentation élevée, exigences d’image premium. "
        "Besoin d’un entretien quotidien fiable, d’une hygiène irréprochable des sanitaires, et d’un reporting qualité transparent.",
        size=10, align="justify",
    )
    add_section_title(doc, "2. Notre méthodologie")
    add_numbered(doc, [
        "Diagnostic & cadrage — cartographie des zones, contraintes, horaires et indicateurs qualité.",
        "Organisation opérationnelle — équipe dédiée, chef d’équipe, planning et consignes site.",
        "Exécution & preuves — pointage digital, ordres de travail, photos et contrôles qualité.",
        "Amélioration continue — traitement des écarts, actions correctives, rapport mensuel.",
    ])
    add_section_title(doc, "3. Moyens proposés")
    add_kv_grid(doc, [
        ("Équipe", "4 agents + 1 chef d’équipe"),
        ("Horaires types", "06h00 – 14h00 · Lun–Ven"),
        ("Matériel", "Dotation professionnelle NECS"),
        ("Consommables", "Lot mensuel inclus (annexe)"),
        ("Supervision", "Visites + contrôles qualité"),
        ("Pilotage", "Plateforme digitale NECS"),
    ])
    add_section_title(doc, "4. Prestations & investissement")
    add_table(doc,
        ["Prestation", "Fréquence", "Montant HT / mois"],
        [
            ["Entretien quotidien bureaux & circulations", "5 j / sem", "550 000"],
            ["Entretien & désinfection sanitaires", "5 j / sem", "187 000"],
            ["Vitrerie intérieure", "Mensuel", "85 000"],
            ["Consommables standards", "Mensuel", "75 000"],
        ],
    )
    add_amounts(doc, [], "Investissement mensuel estimatif", "897 000 FCFA HT")
    add_para(doc, "Le détail unitaire figure au devis NECS-DEV-2026-0142. Démarrage possible sous 10 jours ouvrés après acceptation.", size=9, color=GRAY)
    add_section_title(doc, "5. Pourquoi NECS")
    add_bullets(doc, [
        "Engagement qualité mesurable et traçable.",
        "Équipes formées, encadrées et équipées.",
        "Digitalisation du parcours : du devis à la facturation.",
        "Interlocuteur unique et réactivité terrain.",
    ])
    add_signatures(doc, "NECS — Direction Commerciale", "Proposition établie pour validation", "Client — Acceptation de principe", "Sous réserve de contrat formalisé")
    add_footer_note(doc, "NECS / NECLEANING & SERVICES SARL — NECS-OFF-2026-0001 — Document de validation client")
    return save(doc, "TMP-01-Proposition-de-services.docx")


def build_devis():
    doc = setup_doc()
    add_header_block(doc, "Devis", "NECS-DEV-2026-0142", [
        "Date : 10 mars 2026",
        "Validité : 30 jours",
        "Version : 1.0",
    ])
    add_para(doc, "Proposition tarifaire de prestations de nettoyage", size=14, bold=True, color=BLUE, align="center")
    add_para(
        doc,
        "Nous avons le plaisir de vous adresser le présent devis, établi sur la base de votre besoin et de nos standards "
        "de qualité NECS. Les montants sont exprimés en FCFA (XAF), hors taxes applicables.",
        size=10, align="justify",
    )
    add_two_parties(
        doc,
        "ÉMETTEUR",
        ["NECS / NECLEANING & SERVICES SARL", "Service Commercial & Chiffrage", "Réf. opportunité : OPP-2026-0087", "Commercial : Mme A. MBARGA"],
        "DESTINATAIRE / CLIENT",
        ["SOCIÉTÉ EXEMPLE SA", "À l’attention de : M. Jean OKALA — Achats", "Immeuble Horizon, Douala", "achats@exemple.cm"],
    )
    add_kv_grid(doc, [
        ("Objet", "Entretien courant bureaux & sanitaires"),
        ("Périodicité", "5 j/sem · 22 jours ouvrés / mois"),
        ("Surface estimée", "1 850 m²"),
        ("Niveau de service", "Premium · SLA ≥ 85/100"),
        ("Démarrage indicatif", "01 avril 2026"),
        ("Conditions de règlement", "30 jours net · Virement"),
    ])
    add_table(doc,
        ["Désignation", "Qté", "Unité", "P.U. HT", "Période", "Total HT"],
        [
            ["Entretien quotidien des bureaux", "22", "Jour", "25 000", "Mensuel", "550 000"],
            ["Entretien des sanitaires", "22", "Jour", "8 500", "Mensuel", "187 000"],
            ["Vitrerie intérieure", "1", "Interv.", "85 000", "Mensuel", "85 000"],
            ["Fourniture consommables standards", "1", "Lot", "75 000", "Mensuel", "75 000"],
        ],
    )
    add_amounts(doc, [
        ("Sous-total HT", "897 000 FCFA"),
        ("Remise commerciale (0%)", "0 FCFA"),
        ("Taxes applicables", "Selon régime fiscal"),
    ], "Net mensuel estimatif", "897 000 FCFA")
    add_section_title(doc, "Conditions commerciales")
    add_numbered(doc, [
        "Le présent devis est valable trente (30) jours à compter de sa date d’émission.",
        "Toute acceptation vaut commande ferme sous réserve de signature du contrat de prestation.",
        "Les prix sont révisables annuellement selon les modalités prévues au contrat.",
        "Les prestations hors périmètre font l’objet d’un devis séparé.",
        "NECS s’engage sur la qualité de service, le respect des plannings et la traçabilité des interventions.",
    ])
    add_signatures(doc, "Pour NECS SARL", "Service Commercial — Émission du devis", "Bon pour accord — Client", "« Lu et approuvé »")
    add_footer_note(doc, "NECS / NECLEANING & SERVICES SARL — NECS-DEV-2026-0142 — Document commercial confidentiel")
    return save(doc, "TMP-02-Devis.docx")


def build_contrat():
    doc = setup_doc()
    add_header_block(doc, "Contrat de prestation", "NECS-CTR-2026-0034", [
        "Date d’effet : 01/04/2026",
        "Durée : 12 mois",
        "Version : 1.0",
    ])
    add_para(doc, "Contrat de prestation de services de nettoyage", size=14, bold=True, color=BLUE, align="center")
    add_para(
        doc,
        "Entre les soussignés, il a été convenu ce qui suit. Le présent contrat formalise le périmètre, les obligations, "
        "les niveaux de service (SLA), les conditions financières et les modalités de résiliation applicables aux prestations NECS.",
        size=10, align="justify",
    )
    add_two_parties(
        doc,
        "LE PRESTATAIRE",
        ["NECS / NECLEANING & SERVICES SARL", "Ci-après « le Prestataire »", "Représentée par : [Nom du DG]", "Qualité : Directeur Général"],
        "LE CLIENT",
        ["SOCIÉTÉ EXEMPLE SA", "Ci-après « le Client »", "Représentée par : M. Jean OKALA", "Qualité : Directeur Administratif & Financier"],
    )
    articles = [
        ("Article 1 — Objet",
         "Le Prestataire s’engage à fournir au Client des prestations de nettoyage et d’entretien des locaux désignés à l’article 2, "
         "conformément aux standards de qualité NECS, au planning convenu et aux annexes techniques jointes (devis, cahier des charges site, SLA)."),
        ("Article 2 — Périmètre & sites",
         "Site principal : Immeuble Horizon — Douala. Surface contractuelle : 1 850 m². Effectif : 4 agents + 1 chef d’équipe. "
         "Fréquence : 5 jours / semaine, 06h00 – 14h00. Prestations incluses : bureaux, circulations, sanitaires, vitrerie intérieure mensuelle, "
         "consommables standards. Prestations exclues : après sinistre, après travaux, espaces non listés, sauf avenant."),
        ("Article 3 — Niveau de service (SLA)",
         "Score qualité minimal : 85/100. Délai de traitement d’une réclamation : 48 heures ouvrées. "
         "Remplacement d’un agent absent : sous 24 heures lorsque techniquement possible. "
         "Preuves d’exécution et pointages disponibles dans la plateforme NECS."),
        ("Article 4 — Prix & facturation",
         "Le prix mensuel de référence est fixé à 897 000 FCFA HT, selon le devis NECS-DEV-2026-0142. "
         "Facturation mensuelle à terme échu, sur prestations réalisées et validées. Règlement à 30 jours par virement. "
         "Toute modification de périmètre, d’effectif ou de tarif fait l’objet d’un avenant."),
        ("Article 5 — Durée, renouvellement & résiliation",
         "Durée de douze (12) mois à compter du 1er avril 2026, renouvelable par tacite reconduction, "
         "sauf dénonciation avec préavis de soixante (60) jours. Résiliation pour manquement grave possible après mise en demeure "
         "restée infructueuse pendant quinze (15) jours."),
        ("Article 6 — Obligations des parties",
         "Prestataire : moyens adaptés, respect des consignes, confidentialité, assurance RC professionnelle. "
         "Client : accès aux locaux, interlocuteur dédié, informations nécessaires, paiement dans les délais."),
        ("Article 7 — Documents constitutifs",
         "Font partie intégrante du présent contrat : le devis accepté, les annexes techniques, le planning type, "
         "la fiche SLA, et tout avenant ultérieur dûment signé."),
    ]
    for title, body in articles:
        add_section_title(doc, title)
        add_para(doc, body, size=10, align="justify")
    add_para(doc, "Fait à Douala, en deux (2) exemplaires originaux, le ________________", size=10, space_before=8)
    add_signatures(doc, "Pour le Prestataire — NECS SARL", "« Lu et approuvé »", "Pour le Client", "« Lu et approuvé »")
    add_footer_note(doc, "Contrat NECS-CTR-2026-0034 — Document juridique versionné — Toute modification crée un avenant")
    return save(doc, "TMP-05-Contrat-de-prestation.docx")


def build_facture():
    doc = setup_doc()
    add_header_block(doc, "Facture", "NECS-FAC-2026-0450", [
        "Date : 31 mars 2026",
        "Échéance : 30 avril 2026",
        "Statut : Émise",
    ])
    add_para(doc, "Facture de prestations de nettoyage — Mars 2026", size=14, bold=True, color=BLUE, align="center")
    add_para(
        doc,
        "Facturation établie conformément au contrat NECS-CTR-2026-0034 et à l’état des prestations validé "
        "(préfacture NECS-PF-2026-0112).",
        size=10, align="justify",
    )
    add_two_parties(
        doc,
        "FOURNISSEUR",
        ["NECS / NECLEANING & SERVICES SARL", "Service Finance & Facturation", "finance@necs.cm"],
        "CLIENT FACTURÉ",
        ["SOCIÉTÉ EXEMPLE SA", "Comptabilité Fournisseurs", "Site : Immeuble Horizon — Douala", "Réf. client : FOURN-NECS-014"],
    )
    add_kv_grid(doc, [
        ("Contrat", "NECS-CTR-2026-0034"),
        ("Période facturée", "01 au 31 mars 2026"),
        ("Mode de paiement", "Virement — 30 jours"),
        ("Référence à rappeler", "NECS-FAC-2026-0450"),
    ])
    add_table(doc,
        ["Désignation", "Qté", "P.U. HT", "Total HT"],
        [
            ["Prestations d’entretien courant (21 j réalisés)", "21", "25 000", "525 000"],
            ["Entretien sanitaires — forfait mensuel", "1", "187 000", "187 000"],
            ["Vitrerie intérieure — passage mensuel", "1", "85 000", "85 000"],
            ["Consommables standards — lot mensuel", "1", "75 000", "75 000"],
            ["Ajustement — jour non réalisé (21/03)", "1", "-25 000", "-25 000"],
        ],
    )
    add_amounts(doc, [
        ("Total HT", "847 000 FCFA"),
        ("Taxes / TVA", "Selon régime applicable"),
        ("Acomptes déjà perçus", "0 FCFA"),
    ], "Net à payer", "847 000 FCFA")
    add_section_title(doc, "Coordonnées de paiement")
    add_para(doc, "Banque : [Nom de la banque]", size=10)
    add_para(doc, "Titulaire : NECLEANING & SERVICES SARL", size=10)
    add_para(doc, "N° compte / IBAN : [À compléter]", size=10)
    add_para(doc, "Libellé obligatoire : NECS-FAC-2026-0450 — SOCIÉTÉ EXEMPLE SA", size=10, bold=True)
    add_section_title(doc, "Mentions")
    add_bullets(doc, [
        "En cas de retard de paiement, des pénalités pourront être appliquées conformément au contrat.",
        "Toute réclamation relative à la présente facture doit être notifiée sous huit (8) jours ouvrés.",
        "Un avoir éventuel portera la référence de cette facture.",
    ])
    add_signatures(doc, "Service Finance — NECS", "Émission & certification", "Client — Accusé de réception", "Optionnel")
    add_footer_note(doc, "NECS-FAC-2026-0450 — Facture originale — Conservez ce document pour votre comptabilité")
    return save(doc, "TMP-19-Facture.docx")


# ===================== TEMPLATES GÉNÉRIQUES =====================

GENERIC = [
    ("TMP-03-Bon-de-commande.docx", "Bon de commande", "NECS-BC-2026-0088", "Commercial / Opérations",
     "Référence client, prestations commandées, quantités, dates, site, conditions et validation.",
     ["Réf. devis lié", "Date de commande", "Date de début souhaitée", "Priorité", "Site", "Prestations commandées", "Quantités", "Conditions", "Validation"]),
    ("TMP-04-Bon-de-livraison.docx", "Bon de livraison / réception", "NECS-BL-2026-0211", "Opérations / Logistique",
     "Produits ou consommables livrés, quantités, site, date, réception, réserves et signatures.",
     ["Site destinataire", "Date / heure", "Livreur", "Réf. demande d’achat", "Articles", "Qté prévue / reçue", "Réserves", "Signatures"]),
    ("TMP-06-Avenant-contrat.docx", "Avenant au contrat client", "NECS-AVN-2026-0007", "CRM / Direction",
     "Modification de périmètre, tarif, durée, effectifs ou prestations — référence au contrat initial.",
     ["Contrat initial", "N° d’avenant", "Date d’effet", "Type de modification", "Description", "Impact financier", "Justification"]),
    ("TMP-07-Contrat-agent.docx", "Document contractuel agent", "NECS-RH-CTR-2026-019", "RH",
     "Informations collaborateur, poste, affectation, conditions, obligations, confidentialité et signatures.",
     ["Nom & prénoms", "Matricule", "Poste", "Type de contrat", "Date d’embauche", "Site d’affectation", "Horaires", "Conditions", "Obligations"]),
    ("TMP-08-Fiche-de-poste.docx", "Fiche de poste — Agent d’entretien", "NECS-RH-FP-AE-01", "RH",
     "Mission, responsabilités, compétences, horaires, rattachement, sécurité et critères de performance.",
     ["Intitulé", "Rattachement", "Horaires", "Lieu", "Mission", "Responsabilités", "Compétences", "Sécurité / EPI", "Critères de performance"]),
    ("TMP-09-Dossier-embauche.docx", "Dossier d’embauche / checklist RH", "NECS-RH-DE-2026-055", "RH",
     "Pièces obligatoires, statut, date de réception, validité, observations et validation du dossier.",
     ["Nom collaborateur", "Poste", "Date démarrage", "Pièce d’identité", "CV", "RIB", "Certificat médical", "Contrat signé", "Statut dossier"]),
    ("TMP-10-Entretien-candidat.docx", "Formulaire d’entretien / évaluation candidat", "NECS-RH-ENT-2026-102", "RH",
     "Critères d’évaluation, appréciations, décision et signatures.",
     ["Nom candidat", "Poste", "Date entretien", "Interviewer", "Notes d’évaluation", "Score", "Décision", "Prochaine étape"]),
    ("TMP-11-Onboarding.docx", "Checklist d’intégration / onboarding", "NECS-RH-ONB-2026-033", "RH / Opérations",
     "Documents, uniforme/EPI, matériel, formation, affectation, accès et validation d’intégration.",
     ["Collaborateur", "Site", "Date intégration", "Dossier RH", "EPI / uniforme", "Matériel", "Formation", "Accès app", "Validation"]),
    ("TMP-12-Ordre-de-travail.docx", "Ordre de travail / fiche d’intervention", "NECS-OT-2026-1440", "Opérations",
     "Site, mission, date, horaires, agents, consignes, matériel, statut et preuve d’exécution.",
     ["Site", "Client", "Date", "Créneau", "Agents", "Consignes", "Matériel", "Statut", "Preuves"]),
    ("TMP-13-Controle-qualite.docx", "Fiche de contrôle qualité", "NECS-QA-2026-0278", "Qualité",
     "Critères, notation, observations, photos, non-conformités, actions correctives et validation.",
     ["Site", "Prestation", "Date", "Contrôleur", "Score /100", "Écarts", "Actions correctives", "Échéance", "Photos"]),
    ("TMP-14-Rapport-prestation.docx", "Rapport de prestation / rapport de site", "NECS-RP-2026-0061", "Opérations / Qualité",
     "Synthèse prestations, effectifs, incidents, contrôles, observations et recommandations.",
     ["Client", "Site", "Période", "Prestations réalisées", "Effectifs", "Incidents", "Contrôles", "Recommandations"]),
    ("TMP-15-Demande-achat.docx", "Demande d’achat / commande interne", "NECS-DA-2026-0199", "Opérations / Achats",
     "Demandeur, site, articles, quantités, justification, validation et fournisseur.",
     ["Demandeur", "Site", "Date besoin", "Articles", "Quantités", "Estimation", "Justification", "Fournisseur", "Validation"]),
    ("TMP-16-Demande-conge.docx", "Demande de congé / absence", "NECS-RH-ABS-2026-411", "RH",
     "Collaborateur, période, motif, validation et impact planning.",
     ["Collaborateur", "Matricule", "Type", "Du", "Au", "Nb jours", "Motif", "Remplaçant", "Décision"]),
    ("TMP-17-Pointage.docx", "Fiche de pointage / relevé de présence", "NECS-PTG-2026-9001", "Opérations / RH",
     "Agent, site, date, arrivée, départ, anomalies, validation et export.",
     ["Agent", "Site", "Date", "Arrivée", "Départ", "Mode", "Anomalie", "Validation superviseur"]),
    ("TMP-18-Prefacture.docx", "Préfacture / état des prestations facturables", "NECS-PF-2026-0112", "Finance / Opérations",
     "Période, contrat, prestations réalisées, quantités, écarts, ajustements et validation.",
     ["Client", "Contrat", "Période", "Prestations", "Prévu", "Réalisé", "Écarts", "Montant", "Validation"]),
    ("TMP-20-Avoir.docx", "Avoir", "NECS-AVO-2026-0015", "Finance",
     "Référence facture initiale, motif, lignes concernées, montant, validation et traçabilité.",
     ["Facture initiale", "Date avoir", "Motif", "Lignes", "Montant HT", "Validation"]),
    ("TMP-21-Releve-compte.docx", "Relevé de compte client", "NECS-RC-2026-008", "Finance",
     "Factures, avoirs, règlements, soldes, échéances et créances.",
     ["Client", "Période", "Factures", "Avoirs", "Règlements", "Solde", "Échéances"]),
    ("TMP-22-Relance-client.docx", "Lettre / email de relance client", "NECS-REL-2026-0077", "Finance / Recouvrement",
     "Références factures, montants dus, échéances, historique et niveau de relance.",
     ["Client", "Niveau de relance", "Canal", "Factures dues", "Montant", "Objet", "Message"]),
    ("TMP-23-Accuse-reception.docx", "Accusé de réception / preuve de transmission", "NECS-AR-2026-0502", "CRM / Finance",
     "Document transmis, destinataire, canal, date/heure et statut.",
     ["Document transmis", "Référence", "Destinataire", "Canal", "Date/heure", "Statut", "Preuve"]),
    ("TMP-24-Rapport-mensuel.docx", "Rapport mensuel de performance client", "NECS-RM-2026-03", "Direction / Qualité / Opérations",
     "KPI, prestations, qualité, incidents, réclamations, actions et recommandations.",
     ["Client", "Mois", "Sites", "Taux réalisation", "Qualité", "Réclamations", "Actions", "Recommandations"]),
    ("TMP-25-Visite-technique.docx", "Rapport d’audit / visite technique", "NECS-VT-2026-0188", "Commercial / Qualité",
     "Constats, photos, mesures, risques, besoins, recommandations et actions.",
     ["Prospect/Client", "Site", "Date", "Auditeur", "Surface", "Constats", "Risques", "Recommandations", "Actions"]),
    ("DIG-01-Demande-devis-web.docx", "Demande de devis (site web)", "NECS-WEB-DEVIS", "Marketing digital",
     "Formulaire site web — création automatique du prospect dans le CRM.",
     ["Nom", "Entreprise", "Email", "Téléphone", "Ville", "Type de locaux", "Surface", "Fréquence", "Besoin", "Consentement"]),
    ("DIG-02-Contact-web.docx", "Formulaire de contact (site web)", "NECS-WEB-CONTACT", "Marketing digital",
     "Message digital transformé en lead, tâche ou ticket.",
     ["Nom", "Email", "Téléphone", "Sujet", "Message", "Consentement"]),
    ("DIG-03-Demande-visite.docx", "Demande de visite technique", "NECS-WEB-VISITE", "Marketing / Commercial",
     "Planification d’une visite pour collecter surfaces, zones, contraintes et observations.",
     ["Nom / Entreprise", "Téléphone", "Email", "Adresse du site", "Date souhaitée", "Créneau", "Type de locaux", "Informations"]),
]


def build_generic(filename, title, ref, module, subtitle, fields):
    doc = setup_doc()
    add_header_block(doc, title, ref, [f"Module : {module}", "Statut : Maquette", "Version : 1.0"])
    add_para(doc, title, size=14, bold=True, color=BLUE, align="center")
    add_para(doc, subtitle, size=10, color=GRAY, align="justify", space_after=10)

    # Champ form table
    add_section_title(doc, "Champs du document")
    table = doc.add_table(rows=len(fields), cols=2)
    table.style = "Table Grid"
    for i, field in enumerate(fields):
        set_cell_text(table.rows[i].cells[0], field, bold=True, size=9, color=BLUE)
        shade_cell(table.rows[i].cells[0], "F3F6FA")
        set_cell_text(table.rows[i].cells[1], "…………………………………………………………", size=9, color=GRAY_LIGHT)
    doc.add_paragraph()

    add_section_title(doc, "Observations / commentaires")
    for _ in range(4):
        add_para(doc, "_" * 95, size=10, color=GRAY_LIGHT, space_after=8)

    add_signatures(doc, "Émetteur NECS", "Responsable", "Destinataire / Validation", "Signature & date")
    add_footer_note(doc, f"NECS / NECLEANING & SERVICES SARL — {ref} — Template métier pour validation client — Module {module}")
    return save(doc, filename)


def main():
    generated = []
    generated.append(build_offre())
    generated.append(build_devis())
    generated.append(build_contrat())
    generated.append(build_facture())
    for item in GENERIC:
        generated.append(build_generic(*item))

    # Index text file
    index_lines = [
        "NECS / NECLEANING & SERVICES SARL",
        "Bibliothèque de documents Word — Validation client",
        "=" * 60,
        "",
        "Documents premium (contenu complet avec exemples) :",
        "  - TMP-01-Proposition-de-services.docx",
        "  - TMP-02-Devis.docx",
        "  - TMP-05-Contrat-de-prestation.docx",
        "  - TMP-19-Facture.docx",
        "",
        "Autres templates métier (TMP-03 à TMP-25 + DIG) :",
    ]
    for item in GENERIC:
        index_lines.append(f"  - {item[0]}")
    index_lines += [
        "",
        f"Total : {len(generated)} documents",
        "",
        "Instructions :",
        "1. Ouvrir les fichiers .docx avec Microsoft Word ou LibreOffice",
        "2. Remplacer les mentions entre [crochets] par les infos réelles NECS",
        "3. Exporter en PDF depuis Word si besoin (Fichier > Enregistrer sous > PDF)",
        "4. Présenter au client pour validation avant développement de la plateforme",
    ]
    (OUT / "00-INDEX-DOCUMENTS.txt").write_text("\n".join(index_lines), encoding="utf-8")
    print(f"OK — {len(generated)} documents Word générés dans : {OUT}")


if __name__ == "__main__":
    main()
