import os
import sys
import shutil
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable, Table, TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfgen import canvas
import pypdfium2

class NumberedCanvas(canvas.Canvas):
    """
    Gestionnaire de pagination dynamique en 2 passes.
    Affiche 'Page X sur Y' et un en-tête / pied de page sobre en Times New Roman.
    """
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
        self.saveState()
        page_w, page_h = A4
        
        # En-tête discret (pages 2 et suivantes)
        if self._pageNumber > 1:
            self.setFont("Times-Italic", 9.5)
            self.setFillColor(colors.HexColor('#334155'))
            self.drawString(38, page_h - 26, "FasoCarnet • Fiche Stratégique des Points de Douleur par Commerce")
            self.setStrokeColor(colors.HexColor('#cbd5e1'))
            self.setLineWidth(0.5)
            self.line(38, page_h - 30, page_w - 38, page_h - 30)

        # Filet de séparation au-dessus du pied de page
        self.setStrokeColor(colors.HexColor('#94a3b8'))
        self.setLineWidth(0.5)
        self.line(38, 32, page_w - 38, 32)

        # Pied de page
        self.setFont("Times-Roman", 9.5)
        self.setFillColor(colors.HexColor('#1e293b'))
        self.drawString(38, 20, "Guide Commercial Officiel — Réseau Terrain FasoCarnet")
        page_text = f"Page {self._pageNumber} sur {page_count}"
        self.drawRightString(page_w - 38, 20, page_text)

        self.restoreState()


def build_pdf():
    output_pdf = os.path.join(os.getcwd(), "docs", "fiche_points_de_douleur_commerces.pdf")
    os.makedirs(os.path.dirname(output_pdf), exist_ok=True)

    # Marges optimisées pour maximiser la surface utile
    margin_x = 38
    margin_top = 28
    margin_bottom = 32

    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=margin_x,
        rightMargin=margin_x,
        topMargin=margin_top,
        bottomMargin=margin_bottom
    )

    page_w, page_h = A4
    content_w = page_w - 2 * margin_x

    styles = getSampleStyleSheet()

    # =========================================================================
    # STYLES TYPOGRAPHIQUES CONFORMES AUX EXIGENCES :
    # Times New Roman, Taille 14, Interligne 1.5 (21pt), Gras pour les grands titres
    # =========================================================================

    # 1. Grand Titre du Document (Page 1)
    doc_title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=18,
        leading=23,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#064e3b'),
        spaceAfter=3
    )

    # 2. Sous-Titre du Document (Page 1)
    doc_subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Times-Italic',
        fontSize=12,
        leading=16,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    # 3. Grand Titre de Commerce (Gras, Times-Bold, 16.5pt, interligne 21pt)
    sector_title_style = ParagraphStyle(
        'SectorTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=16.5,
        leading=21,
        alignment=TA_LEFT,
        textColor=colors.HexColor('#064e3b'),
        spaceBefore=0,
        spaceAfter=3,
        keepWithNext=True
    )

    # 4. Sous-titre de section interne (Gras, Times-Bold, 14pt, interligne 21pt)
    subhead_style = ParagraphStyle(
        'SubHead',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=14,
        leading=21,
        alignment=TA_LEFT,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=3,
        spaceAfter=1,
        keepWithNext=True
    )

    # 5. Corps de texte standard : Times-Roman, 14pt, Interligne 1.5 (21pt)
    body_style = ParagraphStyle(
        'Body14',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=14,
        leading=21,
        alignment=TA_JUSTIFY,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )

    # 6. Puce de Point de Douleur (Times-Roman, 14pt, Interligne 1.5 (21pt))
    pain_point_style = ParagraphStyle(
        'PainPoint14',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=14,
        leading=21,
        alignment=TA_JUSTIFY,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )

    # 7. Script Commercial (Pitch) : Times-Italic, 13.5pt, Interligne 1.5 (20.5pt)
    script_style = ParagraphStyle(
        'Script14',
        parent=styles['Normal'],
        fontName='Times-Italic',
        fontSize=13.5,
        leading=20.5,
        alignment=TA_JUSTIFY,
        textColor=colors.HexColor('#064e3b'),
        spaceAfter=4
    )

    story = []

    # =========================================================================
    # PAGE 1 : INTRODUCTION STRATÉGIQUE & MÉTHODOLOGIE DE VENTE TERRAIN
    # =========================================================================
    story.append(Paragraph("FASOCARNET — GUIDE STRATÉGIQUE DES POINTS DE DOULEUR", doc_title_style))
    story.append(Paragraph("Argumentaire de Vente Terrain & Traitement des Objections par Commerce Cible", doc_subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#047857'), spaceAfter=6, spaceBefore=0))

    story.append(Paragraph("<b>1. La Règle Fondamentale de la Vente Terrain</b>", subhead_style))
    story.append(Paragraph(
        "Un commerçant n'achète jamais une « application » ni de la « technologie ». Il achète la <b>suppression immédiate d'une douleur financière quotidienne</b> : "
        "arrêter de perdre de l'argent dans un cahier de dettes déchiré, éliminer les litiges avec ses clients, sécuriser sa caisse contre le vol du gérant, "
        "et pouvoir éditer des devis professionnels pour remporter de gros marchés.",
        body_style
    ))
    story.append(Spacer(1, 2))

    story.append(Paragraph("<b>2. Pourquoi ce Guide Surligne les Points de Douleur en Jaune ?</b>", subhead_style))
    story.append(Paragraph(
        "Dans ce guide, chaque point de douleur est <font backColor=\"#fef08a\"><b>surligné en jaune</b></font>. "
        "Ce sont vos armes d'accroche au comptoir. Posez au commerçant la question qui réveille précisément cette douleur : "
        "dès qu'il ressent sa perte financière, il devient immédiatement attentif et demandeur de votre solution.",
        body_style
    ))
    story.append(Spacer(1, 2))

    story.append(Paragraph("<b>3. La Structure d'une Vente Réussie en 4 Étapes Chrono</b>", subhead_style))
    story.append(Paragraph(
        "• <b>Étape 1 (Attaque) :</b> Poser la question directe sur ses pertes d'argent réelles.<br/>"
        "• <b>Étape 2 (Démo Choc) :</b> Montrer sur votre écran que FasoCarnet résout le problème en 2 clics.<br/>"
        "• <b>Étape 3 (Prix Dérisoire) :</b> 1 500 F par mois, c'est moins cher qu'un seul oubli de dette.<br/>"
        "• <b>Étape 4 (Action Immédiate) :</b> Faire scanner le QR Code de votre badge pour installer l'application.",
        body_style
    ))
    story.append(Spacer(1, 2))

    story.append(Paragraph("<b>4. Sommaire des 6 Commerces Stratégiques Ciblés</b>", subhead_style))
    story.append(Paragraph(
        "1. <b>Librairies & Papeteries :</b> Rentrée scolaire, acomptes manuels, devis en toutes lettres.<br/>"
        "2. <b>Quincailleries & Matériaux :</b> Crédits maçons, registres poussiéreux, livraisons de chantier.<br/>"
        "3. <b>Alimentations & Supérettes :</b> Coulage de caisse gérant, 100% hors-ligne, clôture du soir.<br/>"
        "4. <b>Boutiquiers de Quartier :</b> Cahier de dettes délabré, relance de crédit WhatsApp sans gêne.<br/>"
        "5. <b>Kiosques Mobile Money :</b> Écarts Cash/UV, erreurs sous pression, traçabilité des dépôts.<br/>"
        "6. <b>Téléphones & High-Tech :</b> Ventes à tempérament, acomptes dégressifs, garanties.",
        body_style
    ))

    # =========================================================================
    # PAGES 2 À 7 : LES 6 FICHES DÉTAILLÉES PAR COMMERCE
    # =========================================================================
    commerces = [
        {
            "num": "1",
            "name": "LES LIBRAIRIES & PAPETERIES",
            "context": "Commerces confrontés à des centaines de micro-références (cahiers, stylos, manuels scolaires, rames de papier). Très forte tension lors de la rentrée scolaire et commandes institutionnelles régulières.",
            "pain_points": [
                "L'enfer de la rentrée scolaire et des files d'attente : calculs manuels lents à la calculatrice, erreurs d'addition fréquentes et clients impatients qui partent chez le concurrent.",
                "Les avances et acomptes scolaires perdus sur des bouts de papier : les parents versent des acomptes pour réserver des livres ; les papiers s'égarent, entraînant des litiges houleux.",
                "La perte de marchés institutionnels faute de documents officiels : écoles, ONG et entreprises exigent des devis ou factures proforma avec montants obligatoirement transcrits en toutes lettres.",
                "Les invendus et l'absence de traçabilité des stocks de manuels : impossibilité de savoir précisément quels livres ont été vendus et ce qu'il reste en réserve sans fermer boutique."
            ],
            "solution": "FasoCarnet accélère l'encaissement avec sa calculatrice intégrée en 2 clics, sécurise les acomptes avec reçu immédiat et génère des devis et factures proforma conformes avec montants automatiquement transcrits en toutes lettres.",
            "pitch": "« Grand patron, à la rentrée scolaire, quand 15 parents se bousculent devant votre comptoir, combien de temps perdez-vous sur votre calculatrice ? Et quand une école vous demande un devis formel pour 50 rames de papier, vous devez fermer votre boutique pour chercher un ordinateur ? Avec FasoCarnet, vous encaissez en 5 secondes et vous sortez un devis officiel en toutes lettres directement sur votre téléphone. »",
            "demo": "Ouvrir l'onglet Devis / Factures, taper '50 rames de papier' à 3 500 F, puis générer le reçu proforma en montrant la mention automatique : 'Arrêté à la somme de cent soixante-quinze mille Francs CFA TTC'."
        },
        {
            "num": "2",
            "name": "LES QUINCAILLERIES & DÉPÔTS DE MATÉRIAUX",
            "context": "Commerces à très fort panier moyen où le crédit est structurel : les maçons, plombiers, peintres et entrepreneurs du bâtiment s'approvisionnent à crédit et règlent après coulage ou fin de chantier.",
            "pain_points": [
                "Des sommes colossales immobilisées dans la nature : un quincaillier moyen a entre 500 000 F et plusieurs millions de FCFA de créances accordées à des artisans du BTP sans contrat écrit.",
                "Le cahier de crédit détruit par la poussière de ciment et l'eau : les pages du registre se salissent et s'arrachent. Les maçons contestent les quantités livrées (« Je n'ai pris que 10 sacs et pas 15 »).",
                "Les enlèvements fractionnés sur les chantiers : le chef de chantier commande 50 fers de 10, mais fait récupérer le matériel par tranches par des apprentis. Les oublis créent des trous de stock inexpliqués.",
                "L'incapacité d'exiger le remboursement sans preuve datée : difficulté d'obtenir son règlement auprès d'un entrepreneur sans pouvoir lui opposer un relevé chronologique précis des livraisons."
            ],
            "solution": "FasoCarnet offre un carnet de dettes numérique infalsifiable. Chaque enlèvement de marchandise génère un reçu électronique horodaté partagé immédiatement sur le WhatsApp de l'entrepreneur ou du maçon.",
            "pitch": "« Chef, vos maçons vous doivent combien d'argent dehors actuellement ? Vous devez feuilleter 20 pages de cahier poussiéreux pour trouver le solde ? Si un maçon conteste 5 sacs de ciment à la fin du coulage, vous perdez 25 000 F net de votre bénéfice. Avec FasoCarnet, chaque fois qu'une brouette quitte votre cour, le maçon reçoit son reçu avec la date, l'heure et son solde restant. Fini les disputes ! »",
            "demo": "Enregistrer un crédit client au nom de 'Moussa Entrepreneur' pour 200 000 F, puis enregistrer un acompte de 75 000 F. Montrer le bouton qui expédie instantanément le récapitulatif avec le solde exact de 125 000 F par WhatsApp."
        },
        {
            "num": "3",
            "name": "LES ALIMENTATIONS GÉNÉRALES & SUPÉRETTES",
            "context": "Points de vente avec flux continu de clients, paniers composés de produits de grande consommation et gestion courante confiée à des gérants ou vendeurs salariés.",
            "pain_points": [
                "La hantise du vol interne et du coulage de caisse : le propriétaire ne peut pas surveiller la boutique 24h/24. Les ventes non enregistrées par les employés et les encaissements sous-déclarés rongent la marge.",
                "La dépendance paralysante à la connexion Internet : les logiciels de caisse traditionnels se bloquent en cas de coupure de réseau ou de délestage, paralysant la vente au détail.",
                "Le calvaire du comptage et de la clôture de caisse du soir : le commerçant passe jusqu'à une heure chaque soir à recompter les pièces, billets et tickets avec un risque élevé d'erreurs de caisse.",
                "La confusion entre chiffre d'affaires et bénéfice net : le boutiquier voit passer beaucoup d'espèces mais n'a aucune visibilité sur sa marge réelle après paiement des fournisseurs et des charges."
            ],
            "solution": "FasoCarnet fonctionne à 100% hors-ligne (sans 4G ni Wi-Fi). Il permet la clôture de caisse automatique du soir en 1 clic et synchronise les données sur le Cloud pour que le propriétaire consulte ses ventes à distance sur son propre smartphone.",
            "pitch": "« Patron, quand vous voyagez ou quand vous quittez l'alimentation, comment savez-vous exactement ce que votre gérant a vendu aujourd'hui ? Avec FasoCarnet, même sans forfait internet dans la boutique, la caisse tourne. Dès que le téléphone capte, vous voyez toutes les ventes depuis votre salon. Et le soir, la clôture est calculée sans calculatrice en 1 clic. »",
            "demo": "Désactiver la connexion Internet du téléphone, enregistrer 3 ventes en mode caisse, puis réactiver le réseau et afficher l'écran 'Rapport Journalier' montrant la ventilation des espèces et le bénéfice généré."
        },
        {
            "num": "4",
            "name": "LES BOUTIQUIERS DE QUARTIER (ÉPICERIES)",
            "context": "Commerces de survie et de proximité au cœur des concessions familiales, dont la rentabilité repose presque entièrement sur la fidélité et les petits crédits accordés aux riverains.",
            "pain_points": [
                "Le cahier de crédit délabré, taché d'huile et illisible : les crédits de 250 F, 500 F et 1 000 F s'empilent sans classement. Les enfants arrachent des feuilles et le commerçant oublie qui lui doit quoi.",
                "La honte et la gêne sociale de réclamer son argent : le boutiquier n'ose pas interpeller un grand frère ou un voisin de cour pour lui réclamer sa dette, de peur de créer des tensions familiales.",
                "L'érosion et la faillite silencieuse du fonds de roulement : le boutiquier mélange sa poche personnelle et le tiroir de la boutique. Il pense être rentable alors qu'il consomme son capital commercial.",
                "Les oublis d'inscription aux heures d'affluence : le matin ou le soir, quand 5 personnes attendent du pain et du sucre, le boutiquier donne à crédit de mémoire et oublie de le noter une fois le client parti."
            ],
            "solution": "FasoCarnet transforme le smartphone en carnet digital instantané. Il permet d'envoyer des rappels de dettes WhatsApp polis et neutres rédigés par l'application, évitant tout conflit direct avec les voisins.",
            "pitch": "« Mon frère, combien d'argent dort dehors chez les voisins en ce moment ? Souvent, tu as honte d'aller réclamer 3 500 F à un voisin. Avec FasoCarnet, ce n'est pas toi qui parles : c'est l'application qui lui envoie un message automatique très respectueux avec le détail de ses achats. Tu récupères ton argent sans dispute et ta boutique ne fait pas faillite. »",
            "demo": "Rechercher un client fictif 'Voisin Ousmane' dans le carnet de dettes et cliquer sur l'icône WhatsApp pour afficher le modèle de message courtois prêt à l'envoi."
        },
        {
            "num": "5",
            "name": "LES KIOSQUES TRANSACTION MOBILE MONEY",
            "context": "Points de services financiers à rotation ultra-rapide manipulant simultanément des espèces liquides et de la monnaie électronique (UV) sous une forte pression opérationnelle.",
            "pain_points": [
                "Les écarts de caisse traumatisants entre Cash physique et UV électronique : en fin de journée, le caissier constate un trou inexpliqué de 10 000 F ou 25 000 F qui est prélevé directement sur son salaire.",
                "Les erreurs de saisie sous la pression de la file d'attente : noter les numéros et les montants sur des registres papier raturés génère des confusions et des contestations de clients.",
                "La difficulté d'isoler les commissions réelles : le gérant mélange le capital de transfert avec les commissions perçues, rendant la visibilité sur la rentabilité quotidienne opaque.",
                "Les litiges et contestations sur les dépôts non reçus : quand le réseau opérateur tarde, le client s'emporte sans que le caissier puisse fournir un reçu clair avec la référence exacte de la transaction."
            ],
            "solution": "FasoCarnet sépare précisément les encaissements en Espèces, Orange Money, Moov Money et Wave, tout en enregistrant la référence de transaction pour un pointage rigoureux à la fermeture.",
            "pitch": "« Ma sœur, à 19h quand tu fermes le kiosque, combien de temps mets-tu pour vérifier ton Cash liquide et ton compte UV ? S'il manque 15 000 F, qui paye ? C'est toi ! FasoCarnet sépare automatiquement ce qui est entré en liquide et ce qui est entré par Mobile Money avec les numéros de référence. Tu sais exactement où se trouve chaque Franc. »",
            "demo": "Enregistrer un paiement en cochant 'Orange Money' et en saisissant un numéro de transaction fictif, puis ouvrir le rapport du jour pour montrer la séparation nette entre Cash et Mobile Money."
        },
        {
            "num": "6",
            "name": "LES VENDEURS DE TÉLÉPHONES & HIGH-TECH",
            "context": "Commerce d'appareils électroniques à forte valeur unitaire, où la confiance client, le paiement échelonné et la gestion de la garantie sont des facteurs décisifs.",
            "pain_points": [
                "Le danger des ventes à crédit sans garantie : vendre un smartphone à 150 000 F avec une simple promesse verbale ou un papier volant expose le commerçant à des disparitions de clients ou des retards.",
                "Les litiges chroniques de garantie et de pièces détachées : un client revient 3 mois plus tard prétendant que l'appareil est sous garantie ou contestant l'état initial des accessoires fournis.",
                "L'absence d'historique des paiements partiels : le client effectue des versements échelonnés de 25 000 F sur plusieurs semaines. Faute de traçabilité, les désaccords sur le solde restant sont permanents.",
                "La perte de clients d'entreprises : les sociétés privées et bureaux refusent d'acheter des ordinateurs ou accessoires sans facture d'achat formelle avec les mentions légales."
            ],
            "solution": "FasoCarnet délivre des reçus thermiques ou WhatsApp horodatés mentionnant la description précise de l'appareil et son statut d'acompte, tout en fournissant des factures conformes pour les clients professionnels.",
            "pitch": "« Patron, quand vous vendez un ordinateur portable ou un téléphone de 200 000 F à crédit en plusieurs tranches, comment prouvez-vous ce que le client a déjà versé ? Un simple papier peut être falsifié ou perdu. Avec FasoCarnet, chaque acompte génère un reçu officiel avec la date, l'heure et le solde restant. Votre stock est sécurisé et vos clients professionnels reçoivent une facture irréprochable. »",
            "demo": "Enregistrer une vente de 180 000 F avec un premier versement de 100 000 F, puis montrer le reçu de caisse indiquant immédiatement 'Acompte : 100 000 F • Reste à payer : 80 000 F'."
        }
    ]

    for c in commerces:
        story.append(PageBreak())
        
        # Grand Titre du commerce (Times-Bold)
        story.append(Paragraph(f"<b>{c['num']}. {c['name']}</b>", sector_title_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#064e3b'), spaceAfter=4, spaceBefore=0))

        # Contexte
        story.append(Paragraph(f"<b>Réalité du terrain :</b> {c['context']}", body_style))

        # Sous-titre Points de douleur
        story.append(Paragraph("<b>Points de douleur majeurs identifiés :</b>", subhead_style))
        
        # Points de douleur surlignés en jaune
        for pp in c['pain_points']:
            bullet_html = f"• <font backColor=\"#fef08a\"><b>{pp}</b></font>"
            story.append(Paragraph(bullet_html, pain_point_style))

        # Solution FasoCarnet
        story.append(Paragraph("<b>La Réponse Concrète FasoCarnet :</b>", subhead_style))
        story.append(Paragraph(c['solution'], body_style))

        # Pitch Commercial mot à mot
        story.append(Paragraph("<b>Le Pitch d'Attaque du Commercial (Mot à mot) :</b>", subhead_style))
        story.append(Paragraph(c['pitch'], script_style))

        # Démo choc
        story.append(Paragraph("<b>La Démonstration Choc (30 secondes chrono) :</b>", subhead_style))
        story.append(Paragraph(c['demo'], body_style))

    # =========================================================================
    # PAGE 8 : TABLEAU STRATÉGIQUE RÉCAPITULATIF & TRAITEMENT DES OBJECTIONS
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("<b>SYNTHÈSE STRATÉGIQUE & TRAITEMENT DES OBJECTIONS</b>", sector_title_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#064e3b'), spaceAfter=8, spaceBefore=0))

    # Tableau récapitulatif
    table_data = [
        [
            Paragraph("<b>Commerce Cible</b>", ParagraphStyle('Th', fontName='Times-Bold', fontSize=12, leading=16, textColor=colors.white, alignment=TA_CENTER)),
            Paragraph("<b>Point de Douleur Principal</b>", ParagraphStyle('Th', fontName='Times-Bold', fontSize=12, leading=16, textColor=colors.white, alignment=TA_CENTER)),
            Paragraph("<b>Argument de Vente Massue</b>", ParagraphStyle('Th', fontName='Times-Bold', fontSize=12, leading=16, textColor=colors.white, alignment=TA_CENTER))
        ],
        [
            Paragraph("<b>1. Librairies</b>", ParagraphStyle('Tb', fontName='Times-Bold', fontSize=11, leading=15)),
            Paragraph("<font backColor=\"#fef08a\">Lenteur des calculs à la rentrée & Perte des devis d'écoles.</font>", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15)),
            Paragraph("Devis et factures proforma en toutes lettres en 15 secondes chrono.", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15))
        ],
        [
            Paragraph("<b>2. Quincailleries</b>", ParagraphStyle('Tb', fontName='Times-Bold', fontSize=11, leading=15)),
            Paragraph("<font backColor=\"#fef08a\">Cahier de dettes abîmé & Contestations sur ciment et fer.</font>", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15)),
            Paragraph("Reçu WhatsApp horodaté dès que la marchandise quitte la cour.", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15))
        ],
        [
            Paragraph("<b>3. Alimentations</b>", ParagraphStyle('Tb', fontName='Times-Bold', fontSize=11, leading=15)),
            Paragraph("<font backColor=\"#fef08a\">Coulage de caisse du gérant & Blocage sans Internet.</font>", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15)),
            Paragraph("100% hors-ligne + Contrôle des ventes à distance pour le patron.", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15))
        ],
        [
            Paragraph("<b>4. Boutiquiers</b>", ParagraphStyle('Tb', fontName='Times-Bold', fontSize=11, leading=15)),
            Paragraph("<font backColor=\"#fef08a\">Gêne de réclamer les dettes aux voisins du quartier.</font>", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15)),
            Paragraph("Rappels WhatsApp polis et respectueux envoyés sans dispute.", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15))
        ],
        [
            Paragraph("<b>5. Mobile Money</b>", ParagraphStyle('Tb', fontName='Times-Bold', fontSize=11, leading=15)),
            Paragraph("<font backColor=\"#fef08a\">Écarts de caisse entre Cash physique et monnaie UV.</font>", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15)),
            Paragraph("Pointage séparé Espèces vs OM/Moov avec référence de transaction.", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15))
        ],
        [
            Paragraph("<b>6. High-Tech / PC</b>", ParagraphStyle('Tb', fontName='Times-Bold', fontSize=11, leading=15)),
            Paragraph("<font backColor=\"#fef08a\">Litiges de garantie & Acomptes échelonnés contestés.</font>", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15)),
            Paragraph("Reçus d'acomptes dégressifs et traçabilité formelle de l'appareil.", ParagraphStyle('Tb', fontName='Times-Roman', fontSize=11, leading=15))
        ]
    ]

    col_widths = [115, 210, 194]
    summary_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#064e3b')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
    ]))

    story.append(summary_table)
    story.append(Spacer(1, 6))

    # Les 3 objections universelles
    story.append(Paragraph("<b>Traitement des 3 Objections Universelles au Comptoir</b>", subhead_style))
    story.append(Paragraph(
        "• <b>Objection 1 : « J'ai déjà mon vieux cahier, il ne me coûte rien. »</b><br/>"
        "<i>Réponse :</i> « Patron, votre cahier vous coûte très cher sans que vous ne le voyiez : une seule dette oubliée ou contestée de 5 000 F par mois vous coûte plus cher que l'abonnement FasoCarnet de toute l'année ! »",
        body_style
    ))
    story.append(Paragraph(
        "• <b>Objection 2 : « Et si mon téléphone tombe en panne ou s'éteint ? »</b><br/>"
        "<i>Réponse :</i> « Vos données sont sauvegardées dans votre coffre Cloud sécurisé. Dès que vous allumez un autre téléphone avec votre numéro et votre code PIN, vous retrouvez l'intégralité de vos ventes et de vos dettes en 5 secondes. »",
        body_style
    ))
    story.append(Paragraph(
        "• <b>Objection 3 : « C'est trop compliqué pour moi, je ne suis pas allé loin à l'école. »</b><br/>"
        "<i>Réponse :</i> « Si vous savez envoyer un message vocal ou un dépôt Orange Money, vous savez utiliser FasoCarnet. Regardez mon écran : 2 touches suffisent pour faire une vente. »",
        body_style
    ))

    # Génération avec NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)

    print(f"Document PDF généré avec succès : {output_pdf}")
    print(f"Taille du fichier : {os.path.getsize(output_pdf)} octets")

    # Copie dans artifacts
    artifact_dir = r"C:\Users\Maxime OUATTARA\.gemini\antigravity\brain\23e09812-2870-45e7-9025-1667cd904de7"
    if os.path.exists(artifact_dir):
        dest = os.path.join(artifact_dir, "fiche_points_de_douleur_commerces.pdf")
        shutil.copy2(output_pdf, dest)
        print(f"Copié dans artifacts : {dest}")

if __name__ == '__main__':
    build_pdf()
