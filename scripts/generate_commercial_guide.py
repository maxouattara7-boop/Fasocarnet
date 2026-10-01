import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, Circle, Line, Group, Polygon

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
        self.saveState()
        
        # Pied de page soigné
        self.setStrokeColor(colors.HexColor('#cbd5e1'))
        self.setLineWidth(0.75)
        self.line(34, 26, A4[0] - 34, 26)

        self.setFont("Helvetica-Bold", 8.5)
        self.setFillColor(colors.HexColor('#047857'))
        self.drawString(34, 15, "FASOCARNET MOBILE & DESKTOP")

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor('#64748b'))
        self.drawString(185, 15, "• Guide Pratique du Commercial Terrain • 100% Hors-Ligne • Multi-Supports")

        page_text = f"Page {self._pageNumber} sur {page_count}"
        self.drawRightString(A4[0] - 34, 15, page_text)

        self.restoreState()


def create_commercial_guide():
    output_pdf = os.path.join(os.getcwd(), "docs", "guide_commercial_fasocarnet.pdf")
    os.makedirs(os.path.dirname(output_pdf), exist_ok=True)

    margin = 32
    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=20,
        bottomMargin=34
    )

    page_width = A4[0] - 2 * margin

    styles = getSampleStyleSheet()

    # Couleurs du thème FasoCarnet
    EMERALD_DARK = colors.HexColor('#064e3b')
    EMERALD_MAIN = colors.HexColor('#047857')
    EMERALD_LIGHT = colors.HexColor('#ecfdf5')
    EMERALD_BORDER = colors.HexColor('#a7f3d0')

    GOLD_MAIN = colors.HexColor('#d97706')
    GOLD_LIGHT = colors.HexColor('#fffbeb')
    GOLD_BORDER = colors.HexColor('#fde68a')

    SLATE_900 = colors.HexColor('#0f172a')
    SLATE_700 = colors.HexColor('#334155')

    # Styles typographiques - Police 14/15 pour lisibilité terrain
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=21,
        alignment=TA_CENTER,
        textColor=EMERALD_DARK,
        spaceAfter=2
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        alignment=TA_CENTER,
        textColor=GOLD_MAIN,
        spaceAfter=7
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=16,
        textColor=colors.white
    )

    body_style = ParagraphStyle(
        'Body14',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=17.5,
        textColor=SLATE_900,
        spaceAfter=3
    )

    body_bold = ParagraphStyle(
        'Body14Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    dialogue_style = ParagraphStyle(
        'DialogueStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12.5,
        leading=17,
        textColor=SLATE_900,
        spaceAfter=3.5
    )

    action_style = ParagraphStyle(
        'ActionStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=11.5,
        leading=15.5,
        textColor=SLATE_700
    )

    box_text_style = ParagraphStyle(
        'BoxText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12.5,
        leading=17,
        textColor=SLATE_900
    )

    target_item_style = ParagraphStyle(
        'TargetItem',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11.5,
        leading=15.5,
        textColor=SLATE_900
    )

    obj_text_style = ParagraphStyle(
        'ObjText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=SLATE_900
    )

    box_title_style = ParagraphStyle(
        'BoxTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=16,
        textColor=EMERALD_DARK
    )

    choc_header_style = ParagraphStyle(
        'ChocHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13.5,
        leading=17,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#9a3412')
    )

    story = []

    def make_section_banner(num, title):
        banner_p = Paragraph(f"<b>{num}. {title}</b>", h1_style)
        tbl = Table([[banner_p]], colWidths=[page_width])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), EMERALD_DARK),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))
        return tbl

    # =========================================================================
    # PAGE 1 : EN-TÊTE + CONFIANCE + DIALOGUE DE DÉMONSTRATION EN 60 SECONDES
    # =========================================================================

    logo_drawing = Drawing(40, 40)
    logo_drawing.add(Rect(0, 0, 40, 40, rx=9, ry=9, fillColor=EMERALD_DARK, strokeColor=None))
    logo_drawing.add(Rect(5, 6, 5.5, 28, rx=2, ry=2, fillColor=colors.HexColor('#047857'), strokeColor=None))
    logo_drawing.add(Rect(12, 6, 23, 28, rx=3, ry=3, fillColor=colors.white, strokeColor=None))
    logo_drawing.add(Line(16, 25, 31, 25, strokeColor=colors.HexColor('#e2e8f0'), strokeWidth=2))
    logo_drawing.add(Line(16, 19, 26, 19, strokeColor=colors.HexColor('#e2e8f0'), strokeWidth=2))
    logo_drawing.add(Circle(25, 13, 6, fillColor=GOLD_MAIN, strokeColor=None))
    logo_drawing.add(Polygon([29, 30, 31, 28, 33, 28, 31.5, 26.5, 32.5, 24.5, 30.5, 26, 28.5, 24.5, 29.5, 26.5, 28, 28, 30, 28], fillColor=colors.HexColor('#ef4444'), strokeColor=None))

    brand_html = """
    <font size="17" color="#064e3b"><b>Faso</b></font><font size="17" color="#d97706"><b>Carnet</b></font><br/>
    <font size="8.5" color="#047857"><b>CAISSE &amp; DETTES • 100% HORS-LIGNE</b></font><br/>
    <font size="7.5" color="#64748b">Votre caisse, vos crédits clients et vos bilans en poche</font>
    """
    brand_p = Paragraph(brand_html, styles['Normal'])

    wa_html = """
    <div align="right">
      <font size="8" color="#047857"><b>CONTACT COMMERCIAL &amp; DEMO</b></font><br/>
      <font size="12" color="#047857"><b>WhatsApp : +226 72 99 03 10</b></font><br/>
      <font size="7.5" color="#64748b">Android • iPhone • PC/Mac • Tablette</font>
    </div>
    """
    wa_p = Paragraph(wa_html, styles['Normal'])

    header_table = Table(
        [[logo_drawing, brand_p, wa_p]],
        colWidths=[44, page_width - 44 - 185, 185]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 2))

    badge1 = Paragraph('<font size="8" color="#064e3b"><b>CAISSE TACTILE EXPRESS</b></font>', ParagraphStyle('B1', alignment=TA_CENTER))
    badge2 = Paragraph('<font size="8" color="#064e3b"><b>CARNET DE DETTES AVEC RELANCE</b></font>', ParagraphStyle('B2', alignment=TA_CENTER))
    badge3 = Paragraph('<font size="8" color="#064e3b"><b>100% SANS INTERNET</b></font>', ParagraphStyle('B3', alignment=TA_CENTER))
    badge4 = Paragraph('<font size="8" color="#064e3b"><b>MULTI-SUPPORTS (PC/TEL)</b></font>', ParagraphStyle('B4', alignment=TA_CENTER))

    badges_table = Table(
        [[badge1, badge2, badge3, badge4]],
        colWidths=[page_width * 0.26, page_width * 0.33, page_width * 0.20, page_width * 0.21]
    )
    badges_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), EMERALD_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.75, EMERALD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, EMERALD_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(badges_table)
    story.append(Spacer(1, 5))

    story.append(Paragraph("GUIDE PRATIQUE DU COMMERCIAL TERRAIN", title_style))
    story.append(Paragraph("DÉMONSTRATION EN 60s • OFFRE CHOC • GESTION DES OBJECTIONS", subtitle_style))

    # SECTION I : CONFIANCE
    story.append(make_section_banner("I", "INSTAUREZ IMMÉDIATEMENT UN CLIMAT DE CONFIANCE"))
    story.append(Spacer(1, 3))

    confiance_html = """
    • <b>Habillement :</b> Tenue propre et soignée, badge ou polo officiel FasoCarnet visible.<br/>
    • <b>Attitude :</b> Sourire franc, écoute attentive, salutations chaleureuses et respectueuses (<i>« Bonjour Chef », « Tantie », « Maman », « Grand »</i>).<br/>
    • <b>Posture mentale :</b> Ne venez pas pour forcer une vente. Venez pour <b>aider le commerçant à protéger son argent</b>, éliminer les pertes de caisse et récupérer toutes ses dettes impayées.
    """
    confiance_tbl = Table([[Paragraph(confiance_html, box_text_style)]], colWidths=[page_width])
    confiance_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(confiance_tbl)
    story.append(Spacer(1, 5))

    # SECTION II : DIALOGUE & DEMO 60s
    story.append(make_section_banner("II", "LE DIALOGUE D'ACCROCHE & LA DÉMONSTRATION EN 60 SECONDES"))
    story.append(Spacer(1, 3))

    demo_p1 = Paragraph("<b><font color='#047857'>Commercial :</font></b> <i>(Sourire chaleureux)</i> « Bonjour Chef / Tantie ! Comment se passe le marché aujourd’hui ? »", dialogue_style)
    demo_p2 = Paragraph("<b><font color='#b45309'>Commerçant :</font></b> « On rend grâce, ça va un peu. Oui mon fils, que puis-je pour toi ? »", dialogue_style)
    demo_p3 = Paragraph("""<b><font color='#047857'>Commercial :</font></b> « Je m'appelle [Votre Prénom], de l'équipe <b>FasoCarnet</b>. Je passe saluer les commerçants du quartier et vous montrer l'outil que vos collègues utilisent désormais pour <b>remplacer leurs vieux cahiers de crédit et sécuriser leur caisse</b>.<br/>
    C'est une application pensée chez nous au Burkina pour nos réalités : <b>elle fonctionne à 100% sans internet</b> et sur n'importe quel téléphone Android, iPhone ou ordinateur. »""", dialogue_style)
    demo_p4 = Paragraph("<b><font color='#b45309'>Commerçant :</font></b> « Ah bon ? Et ça fait quoi concrètement ? »", dialogue_style)

    demo_steps_html = """
    <b><font color='#047857'>Commercial :</font></b> <i>(S’approcher avec le sourire, sortir votre téléphone et faire toucher l'écran) :</i><br/>
    « Regardez Chef, ça fait tout en 3 clics très simples :<br/>
    <b>1. LA CAISSE EXPRESS :</b> Vous tapez le montant ou choisissez l'article, vous validez. Ça sort un ticket de caisse thermique ou un reçu propre directement par WhatsApp avec le nom de votre boutique.<br/>
    <b>2. LE CARNET DE DETTES INTELLIGENT :</b> Fini les cahiers déchirés ou les clients qui oublient ! Vous notez le client et l'échéance : l'application vous alerte et génère un message WhatsApp poli de relance en 1 clic.<br/>
    <b>3. LE BILAN DU SOIR :</b> Chaque soir, sans faire de calcul compliqué, vous connaissez vos ventes totales, vos dépenses et votre <b>vrai bénéfice net</b> du jour.<br/>
    <b>4. ZÉRO INTERNET NÉCESSAIRE :</b> Même s'il n'y a plus de mégas ou si le réseau est coupé, vous encaissez sans aucun problème toute la journée ! »
    """
    demo_steps_p = Paragraph(demo_steps_html, dialogue_style)

    story.append(demo_p1)
    story.append(demo_p2)
    story.append(demo_p3)
    story.append(demo_p4)
    story.append(demo_steps_p)
    story.append(Spacer(1, 3))

    action_html = """<b>Geste clé du commercial :</b> Aidez immédiatement le commerçant à installer l'application sur son téléphone (ou faites-lui taper une vente test sur le vôtre). <b>Faites-lui toucher l'écran pour casser toute peur !</b>"""
    action_tbl = Table([[Paragraph(action_html, action_style)]], colWidths=[page_width])
    action_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), EMERALD_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, EMERALD_MAIN),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(action_tbl)

    # FIN PAGE 1 -> SAUT VERS PAGE 2
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2 : SECTION III (NOS COMMERÇANTS CIBLES & LEURS ARGUMENTS CHOCS)
    # =========================================================================
    story.append(make_section_banner("III", "NOS COMMERÇANTS CIBLES & LEURS ARGUMENTS CHOCS SUR LE TERRAIN"))
    story.append(Spacer(1, 4))

    targets_intro = Paragraph(
        "<b>Ne prospectez pas au hasard !</b> Chaque type de commerce a une douleur précise. Utilisez l'<b>argument choc</b> correspondant pour capter son attention en 10 secondes :",
        box_text_style
    )
    story.append(targets_intro)
    story.append(Spacer(1, 4))

    targets_data = [
        # Catégorie 1
        ("1. QUINCAILLERIES & MATÉRIAUX DE CONSTRUCTION", [
            ("Quincailleries générales & Outillage", "« Vous avez plus de 300 articles ? Notre équipe vient saisir tout votre catalogue gratuitement pour vous ! Vous suivez les crédits de chaque maçon/plombier sans jamais perdre 1 seul franc. »"),
            ("Dépôts de ciment, fer à béton & tôles", "« Sécurisez les gros crédits de vos chantiers : chaque tonne livrée ou acompte versé est suivi au franc près jusqu'au règlement final. »"),
            ("Pièces détachées motos & Garages", "« Maîtrisez votre stock de pièces Sanili/motos et suivez précisément les dettes des mécaniciens qui prennent les pièces pour payer après dépannage ! »")
        ]),
        # Catégorie 2
        ("2. COMMERCES DE DÉTAIL & BOUTIQUES", [
            ("Alimentations générales & Supérettes", "« Encaissez à la chaîne 100% sans internet, et connaissez chaque soir votre chiffre d'affaires et votre VRAI bénéfice net sans calculatrice ! »"),
            ("Boutiques de prêt-à-porter (Hommes & Dames) / Chaussures", "« Fini les clients qui oublient de payer leurs habits à la fin du mois : l'application génère un rappel WhatsApp poli automatique qui récupère votre argent sans palabres ! »"),
            ("Librairies, Papeteries & Fournitures", "« Émettez des reçus et factures officiels pour les parents et entreprises, et encaissez à grande vitesse sans faire de file d'attente ! »"),
            ("Cosmétiques, Mèches, Perruques & Parfumerie", "« Suivez les paiements par tranches de vos clientes fidèles et sachez exactement ce qui vous reste en rayon sans recompter chaque soir ! »"),
            ("Accessoires de téléphones & Électronique", "« Délivrez un ticket de caisse professionnel avec reçu pour rassurer sur la garantie et empêcher les fuites de caisse par les employés ! »")
        ]),
        # Catégorie 3
        ("3. ARTISANS, ATELIERS & SERVICES (Gestion des Acomptes)", [
            ("Salons & Ateliers de couture / Stylisme", "« Fini les disputes sur les avances de tissu ! Notez l'acompte versé et envoyez un reçu WhatsApp officiel indiquant le reste dû à la livraison ! »"),
            ("Menuisiers (Bois / Aluminium) & Soudeurs métalliques", "« Établissez des devis clairs, enregistrez les avances versées pour l'achat du matériel et encaissez le solde garanti à la pose de la commande ! »"),
            ("Boutiques & Kiosques Orange Money / Moov / Wave", "« Clôturez votre journée en 30 secondes chrono : séparez vos liquidités de vos commissions et repérez instantanément toute erreur de caisse ! »"),
            ("Caves, Dépôts de boissons & Eau minérale", "« Le patron contrôle à distance ses casiers et ses recettes depuis son salon pendant que les employés encaissent en boutique ! »"),
            ("Pressings & Blanchisseries de quartier", "« Carnet de dépôt infalsifiable : enregistrez le nombre d'habits déposés, l'acompte payé et envoyez le reçu WhatsApp au client ! »")
        ])
    ]

    for cat_title, items in targets_data:
        cat_p = Paragraph(f"<b><font color='#064e3b'>{cat_title}</font></b>", box_title_style)
        story.append(cat_p)
        story.append(Spacer(1, 2))

        rows = []
        for name, arg in items:
            p_content = f"• <b><font color='#047857'>{name} :</font></b> {arg}"
            rows.append([Paragraph(p_content, target_item_style)])

        cat_tbl = Table(rows, colWidths=[page_width])
        cat_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 7),
            ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ]))
        story.append(cat_tbl)
        story.append(Spacer(1, 4))

    # FIN PAGE 2 -> SAUT VERS PAGE 3
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3 : SECTION IV (OFFRE CHOC CATALOGUE) + SECTION V (5 OBJECTIONS)
    # =========================================================================
    story.append(make_section_banner("IV", "LE LEVIER MARKETING CHOC : L'OFFRE « CATALOGUE CLÉ EN MAIN »"))
    story.append(Spacer(1, 4))

    choc_content1 = Paragraph("<b>💥 L'ARGUMENT DÉCISIF QUI FAIT SIGNER EN 6 MOIS OU 1 AN :</b>", choc_header_style)
    choc_content2 = Paragraph("""
    <b><font color='#b45309'>Commerçant :</font></b> <i>« C'est une très bonne application, mais moi j'ai trop d'articles dans ma boutique ! Je n'ai ni le temps ni l'envie de taper 200 ou 500 articles un par un dans le téléphone... »</i><br/><br/>
    <b><font color='#047857'>Commercial (Réponse irrésistible) :</font></b><br/>
    <b>« Chef / Tantie, nous avons déjà résolu ce problème pour vous !<br/>
    Dès que vous prenez notre formule Sérénité de 6 mois (10 000 FCFA) ou d'un an (20 000 FCFA) :<br/>
    VOUS NE TOUCHEZ À RIEN ! NOTRE ÉQUIPE TECHNIQUE VIENT ELLE-MÊME S'ASSEOIR DANS VOTRE BOUTIQUE ET ENREGISTRE TOUT VOTRE CATALOGUE D'ARTICLES DANS L'APPLICATION À VOTRE PLACE !<br/>
    Vous commencez avec une boutique 100% prête, vos prix déjà paramétrés et votre caisse directement opérationnelle ! »</b>
    """, box_text_style)

    choc_tbl = Table([[choc_content1], [choc_content2]], colWidths=[page_width])
    choc_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GOLD_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1.5, GOLD_MAIN),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('RIGHTPADDING', (0, 0), (-1, -1), 9),
    ]))
    story.append(choc_tbl)
    story.append(Spacer(1, 8))

    # SECTION V : OBJECTIONS
    story.append(make_section_banner("V", "COMMENT RÉPONDRE AUX 5 OBJECTIONS MAJEURES DU TERRAIN"))
    story.append(Spacer(1, 4))

    objections = [
        (
            "OBJECTION 1 : « C'est trop moderne pour moi, je ne connais rien aux smartphones. »",
            "« C'est tout à fait normal Chef ! C'est justement pour cela qu'on a conçu FasoCarnet avec de <b>gros boutons tactiles très simples</b>, comme le clavier d'appel. Si vous savez composer un numéro ou envoyer un message vocal, vous maîtrisez l'application en 2 minutes. Tenez, appuyez vous-même sur ce gros bouton vert pour voir ! »"
        ),
        (
            "OBJECTION 2 : « Et si mon téléphone tombe en panne, est volé ou gâté ? »",
            "« C'est la grande force de notre système ! Vos données ne sont jamais perdues. Dès que vous avez un peu de connexion, tout est sauvegardé sur votre compte sécurisé. Si vous perdez votre téléphone, vous prenez n'importe quel autre téléphone ou PC, vous entrez votre numéro et votre code PIN : <b>toutes vos ventes, vos dettes et vos stocks réapparaissent immédiatement à l'identique !</b> »"
        ),
        (
            "OBJECTION 3 : « Est-ce que je peux l'utiliser sur mon ordinateur ou mon iPhone ? »",
            "« <b>OUI, à 100% !</b> FasoCarnet fonctionne sur tous les appareils : téléphone Android, iPhone, tablette, PC portable ou ordinateur de bureau. Le patron peut même surveiller ses ventes en direct depuis sa maison pendant que son employé encaisse à la boutique. »"
        ),
        (
            "OBJECTION 4 : « Je veux d'abord tester avant de donner mon argent. »",
            "« C'est tout naturel ! C'est exactement pour cela que vous bénéficiez de <b>10 JOURS D'ESSAI 100% GRATUITS</b> et sans aucun engagement. On installe l'application maintenant sur votre téléphone, on crée votre compte en 1 minute, et vous commencez à faire vos encaissements dès aujourd'hui. »"
        ),
        (
            "OBJECTION 5 : « Je n'ai pas le temps de saisir tous mes articles aujourd'hui. »",
            "« Justement Chef ! Activez les 6 mois (10 000 F), et c'est notre équipe qui se déplace pour faire tout ce travail lourd à votre place. Vous n'avez qu'à vous concentrer sur vos ventes ! »"
        )
    ]

    for title, resp in objections:
        obj_content = f"<b><font color='#b45309'>{title}</font></b><br/><b>Réponse du commercial :</b> {resp}"
        obj_tbl = Table([[Paragraph(obj_content, obj_text_style)]], colWidths=[page_width])
        obj_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(obj_tbl)
        story.append(Spacer(1, 3))

    # FIN PAGE 3 -> SAUT VERS PAGE 4
    story.append(PageBreak())

    # =========================================================================
    # PAGE 4 : TARIFS OFFICIELS + PROTOCOLE DE CLÔTURE + RÈGLES D'OR
    # =========================================================================
    story.append(make_section_banner("VI", "LES TARIFS OFFICIELS & LE PROTOCOLE DE CLÔTURE"))
    story.append(Spacer(1, 6))

    tarifs_data = [
        [
            Paragraph('<para align="center"><b>FORMULE</b></para>', box_title_style),
            Paragraph('<para align="center"><b>TARIF</b></para>', box_title_style),
            Paragraph('<b>AVANTAGES &amp; LEVIERS COMMERCIAUX</b>', box_title_style)
        ],
        [
            Paragraph('<b>1 MOIS</b>', body_bold),
            Paragraph('<para align="center"><font color="#047857"><b>2 000 FCFA</b></font></para>', body_bold),
            Paragraph('Accès complet à la caisse tactile, carnet de dettes, bilans journaliers et fonctionnement 100% hors-ligne.', body_style)
        ],
        [
            Paragraph('<b>6 MOIS<br/><font color="#d97706" size="9.5">RECOMMANDÉ</font></b>', body_bold),
            Paragraph('<para align="center"><font color="#047857"><b>10 000 FCFA</b></font></para>', body_bold),
            Paragraph('<b>💥 BONUS CLÉ EN MAIN : SAISIE GRATUITE DE TOUT LE CATALOGUE PAR NOTRE ÉQUIPE DIRECTEMENT DANS SA BOUTIQUE !</b>', body_style)
        ],
        [
            Paragraph('<b>1 AN<br/><font color="#047857" size="9.5">MAXI SÉRÉNITÉ</font></b>', body_bold),
            Paragraph('<para align="center"><font color="#047857"><b>20 000 FCFA</b></font></para>', body_bold),
            Paragraph('<b>2 MOIS OFFERTS + Saisie intégrale du catalogue + Assistance prioritaire WhatsApp 7j/7 !</b>', body_style)
        ]
    ]

    tarifs_tbl = Table(tarifs_data, colWidths=[page_width * 0.24, page_width * 0.22, page_width * 0.54])
    tarifs_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0, 2), (-1, 2), GOLD_LIGHT),
        ('BACKGROUND', (0, 3), (-1, 3), EMERALD_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#94a3b8')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(tarifs_tbl)
    story.append(Spacer(1, 10))

    cloture_html = """
    <b>LE PROTOCOLE DE DÉPART EN 5 ÉTAPES (OBLIGATOIRE SUR LE TERRAIN) :</b><br/>
    <b>1. Installer l'application :</b> Ajouter le raccourci / PWA FasoCarnet sur l'écran d'accueil du téléphone du commerçant.<br/>
    <b>2. Créer le compte :</b> Renseigner son numéro de téléphone, le nom de la boutique et l'aider à choisir son code PIN secret.<br/>
    <b>3. Démonstration active :</b> Effectuer 1 encaissement test et 1 enregistrement de dette test avec lui.<br/>
    <b>4. Proposition de valeur :</b> Proposer directement l'offre 6 mois ou 1 an avec saisie de catalogue. S'il hésite, valider les <b>10 jours d'essai gratuit</b>.<br/>
    <b>5. Toujours repartir avec son contact :</b> Remplir la fiche de prospection et convenir d'un rappel ou d'un passage dans 48h / 72h.
    """
    cloture_tbl = Table([[Paragraph(cloture_html, box_text_style)]], colWidths=[page_width])
    cloture_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#64748b')),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(cloture_tbl)
    story.append(Spacer(1, 10))

    regles_html = """
    <b>LES 3 RÈGLES D'OR DU COMMERCIAL FASOCARNET :</b><br/>
    <b>1. Ne jamais contredire le commerçant :</b> S'il hésite ou a une crainte, validez d'abord sa remarque (<i>« Vous avez tout à fait raison Chef », « C'est compréhensible »</i>) avant d'apporter la solution.<br/>
    <b>2. Rester dans l'action physique :</b> Ne parlez pas dans le vide ! Mettez le téléphone dans sa main, faites-lui appuyer sur les boutons. C'est le toucher qui déclenche la confiance.<br/>
    <b>3. Suivi rigoureux :</b> Un prospect non relancé sous 72h est un client perdu. Faites remonter vos fiches chaque soir à votre chef d'équipe !
    """
    regles_tbl = Table([[Paragraph(regles_html, box_text_style)]], colWidths=[page_width])
    regles_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), EMERALD_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, EMERALD_MAIN),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(regles_tbl)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF généré avec succès : {output_pdf}")
    return output_pdf

if __name__ == '__main__':
    create_commercial_guide()
