# -*- coding: utf-8 -*-
import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Pas de header/footer sur la page de couverture
            return
        
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header
        self.drawString(40, 810, "FASOCARNET MOBILE — PLAN MARKETING STRATÉGIQUE & DÉPLOIEMENT COMMERCIAL")
        self.drawRightString(555, 810, "CONFIDENTIEL • 2026-2027")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 802, 555, 802)
        
        # Footer
        self.line(40, 45, 555, 45)
        self.drawString(40, 32, "© FasoCarnet Technologies Burkina Faso • Support : +226 65 61 61 34")
        self.drawRightString(555, 32, f"Page {self._pageNumber} sur {page_count}")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#065f46")   # Emerald 800
    secondary_color = colors.HexColor("#047857") # Emerald 700
    accent_color = colors.HexColor("#b45309")    # Amber 700
    dark_slate = colors.HexColor("#0f172a")      # Slate 900
    text_color = colors.HexColor("#334155")      # Slate 700
    
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=colors.HexColor("#064e3b"),
        alignment=1
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#047857"),
        alignment=1
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=accent_color,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=text_color,
        spaceAfter=5
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=dark_slate
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=body_style,
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#064e3b")
    )

    story = []

    # =========================================================================
    # PAGE 1 : COUVERTURE OFFICIELLE
    # =========================================================================
    story.append(Spacer(1, 40))
    
    # Badge Haut
    badge_data = [[
        Paragraph("<para align=center><b>★ ÉDITION OFFICIELLE BURKINA FASO • 2026-2027 ★</b></para>", ParagraphStyle('B', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor("#047857")))
    ]]
    badge_table = Table(badge_data, colWidths=[515])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#a7f3d0")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 35))

    story.append(Paragraph("FASOCARNET MOBILE", title_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("PLAN MARKETING STRATÉGIQUE & PLAN D'ACTION COMMERCIAL", subtitle_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<i>Déploiement Terrain (Promotrices) & Campagnes Digitales (Facebook • TikTok)</i>", ParagraphStyle('SubSub', parent=subtitle_style, fontSize=10.5, textColor=colors.HexColor("#64748b"))))
    
    story.append(Spacer(1, 25))
    story.append(HRFlowable(width="80%", thickness=2, color=colors.HexColor("#059669"), spaceAfter=25, spaceBefore=10))

    # Boîte de synthèse de couverture
    summary_box = [
        [Paragraph("<b>Objet du Dossier :</b>", body_bold), Paragraph("Stratégie complète de pénétration de marché, recrutement et animation de la force de vente terrain, acquisition digitale et prévisions financières sur 12 mois.", body_style)],
        [Paragraph("<b>Cibles Géographiques :</b>", body_bold), Paragraph("Ouagadougou (Grand Marché, 10 Yaar, Sankariaré, Pissy, Tampouy), Bobo-Dioulasso et Villes Secondaires.", body_style)],
        [Paragraph("<b>Objectif 6 Mois :</b>", body_bold), Paragraph("<b>1 500 boutiques clientes actives</b> • Chiffre d'Affaires : <b>11,8 Millions FCFA</b>", body_style)],
        [Paragraph("<b>Objectif 12 Mois :</b>", body_bold), Paragraph("<b>3 500 boutiques clientes actives</b> • Chiffre d'Affaires : <b>38,0 Millions FCFA</b>", body_style)],
        [Paragraph("<b>Rentabilité Prévue :</b>", body_bold), Paragraph("<b>~78% de Marge Nette</b> (Bénéfice net estimé : ~29,9 Millions FCFA à 1 an)", body_style)],
        [Paragraph("<b>Modèle Économique :</b>", body_bold), Paragraph("Licence SaaS Mobile (Essai 10j gratuit • 2 000 F/mois • 10 000 F/6 mois • 20 000 F/an)", body_style)]
    ]
    summary_table = Table(summary_box, colWidths=[140, 360])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 7),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(summary_table)

    story.append(Spacer(1, 35))
    
    meta_data = [
        [Paragraph("<b>Auteur & Direction :</b> Direction Générale FasoCarnet", body_style), Paragraph("<b>Contact Support :</b> +226 65 61 61 34", body_style)],
        [Paragraph("<b>Version du Document :</b> 1.0 — Déploiement 2026-2027", body_style), Paragraph("<b>Système d'Exploitation :</b> Android 7.0+", body_style)]
    ]
    meta_table = Table(meta_data, colWidths=[255, 255])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 1 : CADRAGE DU MARCHÉ & OFFRE
    # =========================================================================
    story.append(Paragraph("1. DIAGNOSTIC DU MARCHÉ & PROPOSITION DE VALEUR", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))
    
    story.append(Paragraph("<b>1.1. Le Contexte Commercial au Burkina Faso</b>", h2_style))
    story.append(Paragraph(
        "Le secteur du commerce de détail au Burkina Faso représente plus de <b>250 000 points de vente</b> "
        "(alimentations générales, quincailleries, boutiques de prêt-à-porter, cosmétiques, accessoires électroniques, pièces détachées et kiosques). "
        "La grande majorité gère encore ses opérations avec des <b>cahiers papier</b>, ce qui engendre d'importantes pertes financières.",
        body_style
    ))

    story.append(Paragraph("<b>1.2. Les Trois (3) Douleurs Majeures Résolues par FasoCarnet</b>", h2_style))
    story.append(Paragraph("• <b>1. Les Dettes Oubliées & Impayées :</b> Le carnet de crédit papier se déchire, se perd ou devient illisible. Le commerçant oublie à qui il a prêté de l'argent et perd en moyenne 15% à 20% de sa marge.", bullet_style))
    story.append(Paragraph("• <b>2. La Peur des Vols & Trous de Caisse :</b> Les gérants et apprentis commettent des erreurs ou dissimulent des encaissements. Les patrons n'ont aucune preuve écrite en fin de journée.", bullet_style))
    story.append(Paragraph("• <b>3. L'Absence de Reçus Professionnels :</b> Les clients apprécient les reçus pour preuve d'achat, mais les blocs-tickets papier sont coûteux et peu pratiques.", bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>1.3. La Grille Tarifaire & l'Offre Commerciale</b>", h2_style))
    
    pricing_data = [
        [Paragraph("<b>Formule</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=colors.white)),
         Paragraph("<b>Tarif (FCFA)</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=colors.white)),
         Paragraph("<b>Cible Idéale</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=colors.white)),
         Paragraph("<b>Argument Clé de Vente</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9, textColor=colors.white))],
        [Paragraph("<b>Période d'Essai</b>", body_bold), Paragraph("<b>GRATUIT (10 jours)</b>", body_style), Paragraph("Tous nouveaux commerces", body_style), Paragraph("Sans engagement, installation en 2 min.", body_style)],
        [Paragraph("<b>Licence 1 Mois</b>", body_bold), Paragraph("<b>2 000 FCFA</b>", body_style), Paragraph("Petites boutiques, kiosques", body_style), Paragraph("Moins cher qu'un paquet de cahiers", body_style)],
        [Paragraph("<b>Licence 6 Mois</b>", body_bold), Paragraph("<b>10 000 FCFA</b> <i>(2 000 F d'économie)</i>", body_style), Paragraph("Alimentations, cosmétiques", body_style), Paragraph("Sérénité sur 6 mois + 1 mois offert", body_style)],
        [Paragraph("<b>Licence 1 An</b>", body_bold), Paragraph("<b>20 000 FCFA</b> <i>(4 000 F d'économie)</i>", body_style), Paragraph("Quincailleries, grossistes, prêt-à-porter", body_style), Paragraph("Moins de 55 FCFA par jour, rentabilité garantie", body_style)],
    ]
    pricing_table = Table(pricing_data, colWidths=[95, 110, 135, 175])
    pricing_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(pricing_table)

    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 2 : FORCE DE VENTE TERRAIN (5 À 10 PROMOTRICES)
    # =========================================================================
    story.append(Paragraph("2. GESTION & PILOTAGE DE LA FORCE DE VENTE TERRAIN", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))

    story.append(Paragraph("<b>2.1. Profil & Recrutement des Promotrices (5 à 10 Filles)</b>", h2_style))
    story.append(Paragraph(
        "Le recrutement d'animatrices commerciales dynamiques et courtoises est le moteur n°1 de conversion. "
        "Les critères indispensables : excellente élocution (Français + Mooré / Dioula), smartphone Android personnel, sens du relationnel commerçant et ponctualité.",
        body_style
    ))

    story.append(Paragraph("<b>2.2. Le Kit Commercial de Terrain</b>", h2_style))
    story.append(Paragraph("• <b>Tenue Professionnelle :</b> 2 T-shirts ou polos FasoCarnet vert émeraude + Badge nominatif avec photo et QR Code.", bullet_style))
    story.append(Paragraph("• <b>Supports Papier :</b> 100 dépliants explicatifs illustrés + 50 autocollants vitrines <i>« Ici nous utilisons FasoCarnet »</i>.", bullet_style))
    story.append(Paragraph("• <b>Outil de Partage Rapide :</b> Fichier APK sur téléphone pour envoi instantané via Bluetooth / Xender / WhatsApp sans consommer les mégas du client.", bullet_style))

    story.append(Paragraph("<b>2.3. Script de Vente Terrain en 3 Minutes (Pitch Efficace)</b>", h2_style))
    
    pitch_data = [[
        Paragraph(
            "<b>Étape 1 — Accroche (30s) :</b> <i>« Bonjour Patron/Mme ! Je suis [Prénom] de FasoCarnet. Est-ce que ça vous arrive d'oublier des crédits clients ou d'avoir des doutes sur les comptes du soir ? »</i><br/>"
            "<b>Étape 2 — Démo Flash (60s) :</b> <i>« Regardez sur mon téléphone : je tape 3 500 F, j'appuie sur Vente, et hop ! Le ticket WhatsApp est déjà prêt avec votre nom et le carillon de caisse sonne ! »</i><br/>"
            "<b>Étape 3 — Installation Gratuite (60s) :</b> <i>« Je vous l'installe gratuitement tout de suite. Vous avez 10 jours d'essai sans payer un rond pour tester dans votre boutique ! »</i><br/>"
            "<b>Étape 4 — Clôture (30s) :</b> Définition du code PIN à 4 chiffres, ajout du 1er article ou dette test, remise du sticker vitrine.",
            callout_style
        )
    ]]
    pitch_table = Table(pitch_data, colWidths=[515])
    pitch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#6ee7b7")),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(pitch_table)

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>2.4. Modèle de Rémunération Incitative (Fixe + Commissions)</b>", h2_style))
    story.append(Paragraph(
        "Pour maximiser la motivation sans alourdir les charges fixes de l'entreprise, nous mettons en place une grille de rémunération hybride :",
        body_style
    ))

    remun_data = [
        [Paragraph("<b>Composante</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
         Paragraph("<b>Montant</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
         Paragraph("<b>Condition d'Attribution</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white))],
        [Paragraph("<b>Fixe Mensuel de Base</b>", body_bold), Paragraph("<b>35 000 à 45 000 FCFA</b>", body_style), Paragraph("Présence + minimum 60 boutiques visitées par semaine", body_style)],
        [Paragraph("<b>Commission Licence 1 Mois</b>", body_bold), Paragraph("<b>500 FCFA / licence</b>", body_style), Paragraph("Payée à chaque abonnement mensuel (2 000 F) activé", body_style)],
        [Paragraph("<b>Commission Licence 6 Mois</b>", body_bold), Paragraph("<b>1 500 FCFA / licence</b>", body_style), Paragraph("Payée à chaque abonnement semestriel (10 000 F) activé", body_style)],
        [Paragraph("<b>Commission Licence 1 An</b>", body_bold), Paragraph("<b>3 000 FCFA / licence</b>", body_style), Paragraph("Payée à chaque abonnement annuel (20 000 F) activé", body_style)],
        [Paragraph("<b>Prime Top Vendeuse du Mois</b>", body_bold), Paragraph("<b>15 000 FCFA</b>", body_style), Paragraph("Attribuée à la promotrice ayant le plus grand volume d'abonnés", body_style)],
    ]
    remun_table = Table(remun_data, colWidths=[135, 120, 260])
    remun_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(remun_table)

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>2.5. Découpage Géographique & Rituel Hebdomadaire</b>", h2_style))
    story.append(Paragraph("• <b>Organisation par Zones :</b> Chaque promotrice reçoit une zone exclusive (Zone 1 : Rood Woko / Centre-ville, Zone 2 : 10 Yaar / Dassasgho, Zone 3 : Sankariaré / Tanghin, Zone 4 : Pissy / Gounghin, Zone 5 : Tampouy / Kilwin, Zone 6 : Ouaga 2000 / Patte d'Oie).", bullet_style))
    story.append(Paragraph("• <b>Réunion Hebdomadaire du Samedi Matin :</b> Collecte des fiches de suivi, analyse des taux de conversion, versement des commissions, attribution des zones de la semaine suivante.", bullet_style))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 3 : STRATÉGIE MARKETING DIGITAL (FACEBOOK & TIKTOK)
    # =========================================================================
    story.append(Paragraph("3. STRATÉGIE MARKETING DIGITAL (FACEBOOK & TIKTOK)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))

    story.append(Paragraph("<b>3.1. Stratégie TikTok (Viralité & Démonstrations Concrètes)</b>", h2_style))
    story.append(Paragraph(
        "TikTok est le réseau social le plus puissant au Burkina Faso pour toucher les jeunes gérants, apprentis et commerçants. "
        "La ligne éditoriale doit être <b>humoristique, authentique et ancrée dans le quotidien burkinabè</b>.",
        body_style
    ))

    tiktok_data = [
        [Paragraph("<b>Format Vidéo</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
         Paragraph("<b>Concept & Accroche</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
         Paragraph("<b>Appel à l'Action (CTA)</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white))],
        [Paragraph("<b>Sketch 'Dette Oubliée'</b>", body_bold), Paragraph("Un client vient nier sa dette. Le commerçant sort FasoCarnet et lui montre la date exacte et le reçu WhatsApp. Le client est obligé de payer.", body_style), Paragraph("<i>« Télécharge gratuitement sur WhatsApp au 65616134 »</i>", body_style)],
        [Paragraph("<b>Défi '3 Secondes'</b>", body_bold), Paragraph("Chronomètre en main : la promotrice encaisse un client en 3 secondes chrono et envoie le reçu WhatsApp.", body_style), Paragraph("<i>« Essai gratuit 10 jours sans payer ! »</i>", body_style)],
        [Paragraph("<b>Témoignage Commerçant</b>", body_bold), Paragraph("Interview face caméra d'un commerçant du marché qui explique comment il a stoppé les trous de caisse.", body_style), Paragraph("<i>« Clique sur le lien en bio pour tester »</i>", body_style)],
    ]
    tiktok_table = Table(tiktok_data, colWidths=[115, 230, 170])
    tiktok_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(tiktok_table)

    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>3.2. Stratégie Facebook & WhatsApp Ads</b>", h2_style))
    story.append(Paragraph("• <b>Publicité Ciblée Facebook Ads :</b> Ciblage géographique (Ouagadougou, Bobo-Dioulasso, Koudougou) sur les centres d'intérêt 'Entrepreneuriat, Commerce de détail, PME, Orange Money, Wave'.", bullet_style))
    story.append(Paragraph("• <b>Format 'Click-to-WhatsApp' :</b> La publicité renvoie directement sur le compte WhatsApp Business officiel (+226 65 61 61 34) avec un message pré-rempli <i>« Bonjour, je veux installer FasoCarnet dans ma boutique »</i>.", bullet_style))
    story.append(Paragraph("• <b>Budget Digital Recommandé :</b> 50 000 à 75 000 FCFA/mois (soit ~1 500 à 2 500 FCFA/jour), permettant de toucher entre 40 000 et 80 000 personnes qualifiées chaque mois.", bullet_style))

    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 4 : TUNNEL DE CONVERSION & RÉTENTION POST-ESSAI
    # =========================================================================
    story.append(Paragraph("4. TUNNEL DE CONVERSION & AUTOMATISATION DES RELANCES", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))

    story.append(Paragraph(
        "La force de notre plateforme réside dans l'onglet <b>« Relances WhatsApp »</b> intégré au Super-Admin, "
        "qui permet de convertir automatiquement les boutiques en fin d'essai grâce au calendrier suivant :",
        body_style
    ))

    tunnel_data = [
        [Paragraph("<b>Moment</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
         Paragraph("<b>Canal</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
         Paragraph("<b>Action Déclenchée</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
         Paragraph("<b>Objectif</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white))],
        [Paragraph("<b>Jour 1</b>", body_bold), Paragraph("Terrain", body_style), Paragraph("Installation de l'application + Démo 2 min", body_style), Paragraph("Démarrage de l'essai 10j", body_style)],
        [Paragraph("<b>Jour 7 (J-3)</b>", body_bold), Paragraph("Bannière App", body_style), Paragraph("Bandeau défilant automatique : <i>« Expire dans 3 jours »</i>", body_style), Paragraph("Préparation psychologique", body_style)],
        [Paragraph("<b>Jour 9 (J-1)</b>", body_bold), Paragraph("WhatsApp", body_style), Paragraph("Message personnalisé de relance envoyé en 1 clic par l'Admin", body_style), Paragraph("Paiement anticipé", body_style)],
        [Paragraph("<b>Jour 10 (Fin)</b>", body_bold), Paragraph("WhatsApp + Terrain", body_style), Paragraph("Relance finale WhatsApp + passage de la promotrice si nécessaire", body_style), Paragraph("Encaissement Orange / Wave", body_style)],
        [Paragraph("<b>Jour 12 (J+2)</b>", body_bold), Paragraph("WhatsApp", body_style), Paragraph("Offre promotionnelle spéciale : <i>« Activez pour 6 mois et économisez 2 000 F »</i>", body_style), Paragraph("Récupération des indécis", body_style)],
    ]
    tunnel_table = Table(tunnel_data, colWidths=[75, 80, 220, 140])
    tunnel_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(tunnel_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 5 : BILAN FINANCIER PRÉVISIONNEL SUR 12 MOIS
    # =========================================================================
    story.append(Paragraph("5. BILAN FINANCIER PRÉVISIONNEL SUR 12 MOIS (SCÉNARIO RÉALISTE)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))

    story.append(Paragraph(
        "Ce prévisionnel repose sur une équipe de <b>7 promotrices actives</b> sur le terrain, "
        "complétée par les campagnes digitales TikTok & Facebook Ads :",
        body_style
    ))

    fin_data = [
        [Paragraph("<b>Mois</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)),
         Paragraph("<b>Installations</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)),
         Paragraph("<b>Boutiques Payantes</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)),
         Paragraph("<b>CA Mensuel (FCFA)</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)),
         Paragraph("<b>Charges (FCFA)</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)),
         Paragraph("<b>Bénéfice Net (FCFA)</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white))],
        [Paragraph("<b>Mois 1</b>", body_style), Paragraph("550", body_style), Paragraph("150", body_style), Paragraph("1 005 000", body_style), Paragraph("480 000", body_style), Paragraph("<b>+525 000</b>", body_style)],
        [Paragraph("<b>Mois 2</b>", body_style), Paragraph("650", body_style), Paragraph("330", body_style), Paragraph("1 850 000", body_style), Paragraph("540 000", body_style), Paragraph("<b>+1 310 000</b>", body_style)],
        [Paragraph("<b>Mois 3</b>", body_style), Paragraph("750", body_style), Paragraph("560", body_style), Paragraph("2 650 000", body_style), Paragraph("610 000", body_style), Paragraph("<b>+2 040 000</b>", body_style)],
        [Paragraph("<b>Mois 4</b>", body_style), Paragraph("800", body_style), Paragraph("820", body_style), Paragraph("3 400 000", body_style), Paragraph("670 000", body_style), Paragraph("<b>+2 730 000</b>", body_style)],
        [Paragraph("<b>Mois 5</b>", body_style), Paragraph("850", body_style), Paragraph("1 120", body_style), Paragraph("4 150 000", body_style), Paragraph("730 000", body_style), Paragraph("<b>+3 420 000</b>", body_style)],
        [Paragraph("<b>Mois 6</b>", body_style), Paragraph("900", body_style), Paragraph("1 450", body_style), Paragraph("4 850 000", body_style), Paragraph("790 000", body_style), Paragraph("<b>+4 060 000</b>", body_style)],
        [Paragraph("<b>Total S1 (6 Mois)</b>", body_bold), Paragraph("<b>4 500</b>", body_bold), Paragraph("<b>1 450 actives</b>", body_bold), Paragraph("<b>17 905 000</b>", body_bold), Paragraph("<b>3 820 000</b>", body_bold), Paragraph("<b>+14 085 000</b>", body_bold)],
        [Paragraph("<b>Mois 7 à 12</b>", body_style), Paragraph("5 800", body_style), Paragraph("3 500 actives", body_style), Paragraph("20 100 000", body_style), Paragraph("4 280 000", body_style), Paragraph("<b>+15 820 000</b>", body_style)],
        [Paragraph("<b>TOTAL 12 MOIS</b>", ParagraphStyle('TH2', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.HexColor("#064e3b"))),
         Paragraph("<b>10 300</b>", body_bold),
         Paragraph("<b>3 500 actives</b>", body_bold),
         Paragraph("<b>38 005 000 FCFA</b>", body_bold),
         Paragraph("<b>8 100 000 FCFA</b>", body_bold),
         Paragraph("<b>+29 905 000 FCFA</b>", ParagraphStyle('TNB', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor("#047857")))],
    ]
    fin_table = Table(fin_data, colWidths=[85, 75, 85, 95, 85, 90])
    fin_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-3), [colors.white, colors.HexColor("#f8fafc")]),
        ('BACKGROUND', (0,-2), (-1,-2), colors.HexColor("#e2e8f0")),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#dcfce7")),
    ]))
    story.append(fin_table)

    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 6 : FEUILLE DE ROUTE OPÉRATIONNELLE (J1 À J90)
    # =========================================================================
    story.append(Paragraph("6. FEUILLE DE ROUTE D'EXÉCUTION (PLAN D'ACTION 90 JOURS)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceAfter=8))

    roadmap_data = [
        [Paragraph("<b>Phase & Période</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
         Paragraph("<b>Actions Prioritaires</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
         Paragraph("<b>Livrables / Résultats Attendus</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white))],
        [Paragraph("<b>Phase 1 : Préparation<br/>(J1 à J15)</b>", body_bold),
         Paragraph("• Recrutement et formation de 7 promotrices (pitch + démo).<br/>• Impression des T-shirts, badges et stickers vitrines.<br/>• Tournage des 5 premières vidéos TikTok/Facebook.", body_style),
         Paragraph("• Équipe formée et équipée.<br/>• Campagnes digitales prêtes à diffuser.", body_style)],
        [Paragraph("<b>Phase 2 : Lancement<br/>(J16 à J45)</b>", body_bold),
         Paragraph("• Déploiement terrain dans les zones 1, 2 et 3 à Ouagadougou.<br/>• Activation des annonces Facebook & TikTok Ads.<br/>• Première vague de 500 installations gratuites.", body_style),
         Paragraph("• 500 boutiques installées.<br/>• Premiers 150 abonnements payants encaissés.", body_style)],
        [Paragraph("<b>Phase 3 : Accélération<br/>(J46 à J90)</b>", body_bold),
         Paragraph("• Relances WhatsApp systématiques via le portail Super-Admin.<br/>• Extension sur les zones 4, 5 et ouverture de Bobo-Dioulasso.<br/>• Lancement des packs 6 mois et 1 an auprès des grossistes.", body_style),
         Paragraph("• 1 500 boutiques installées.<br/>• Chiffre d'affaires mensuel > 2,5 Millions FCFA.", body_style)],
    ]
    roadmap_table = Table(roadmap_data, colWidths=[110, 245, 160])
    roadmap_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(roadmap_table)

    story.append(Spacer(1, 10))

    # Conclusion
    story.append(Paragraph("<b>Conclusion & Recommandation Stratégique :</b>", body_bold))
    story.append(Paragraph(
        "FasoCarnet Mobile réunit tous les atouts d'un produit technologique à forte rentabilité : "
        "une réponse directe aux pertes financières des commerçants, une utilisation 100% hors-ligne sans contrainte, "
        "un tarif démocratique et des outils d'administration automatisés. Avec l'exécution rigoureuse de ce plan marketing, "
        "l'entreprise est idéalement positionnée pour dominer le marché burkinabè et dégager près de <b>30 Millions FCFA de bénéfice net dès l'an 1</b>.",
        body_style
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated: {filename}")

if __name__ == '__main__':
    output_pdf = "PLAN_MARKETING_STRATEGIQUE_FASOCARNET_MOBILE.pdf"
    build_pdf(output_pdf)
