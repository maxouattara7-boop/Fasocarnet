import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Gestionnaire de pagination dynamique en 2 passes.
    Permet d'afficher 'Page X sur Y' sans connaître le nombre total à l'avance.
    Pied de page épuré en noir et blanc strict.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        print(f"Total pages générées: {num_pages}")
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Filet de séparation noir fin au-dessus du pied de page
        self.setStrokeColor(colors.black)
        self.setLineWidth(0.5)
        self.line(40, 32, A4[0] - 40, 32)

        # Pied de page sobre en Times New Roman
        self.setFont("Times-Roman", 9)
        self.setFillColor(colors.black)
        
        # Mention gauche discrète
        self.drawString(40, 20, "FasoCarnet — Marketing stratégique")

        # Numérotation droite
        page_text = f"Page {self._pageNumber} sur {page_count}"
        self.drawRightString(A4[0] - 40, 20, page_text)

        self.restoreState()


def create_commercial_guide():
    output_pdf = os.path.join(os.getcwd(), "docs", "guide_commercial_fasocarnet.pdf")
    os.makedirs(os.path.dirname(output_pdf), exist_ok=True)

    # Marges généreuses et aérées
    margin = 40
    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=36,
        bottomMargin=46
    )

    page_width = A4[0] - 2 * margin

    styles = getSampleStyleSheet()

    # =========================================================================
    # STYLES TYPOGRAPHIQUES EN TIMES NEW ROMAN & NOIR / BLANC
    # =========================================================================

    # Titre principal en-tête
    header_title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=22,
        leading=26,
        alignment=TA_CENTER,
        textColor=colors.black,
        spaceAfter=4
    )

    # Sous-titre sobre
    header_subtitle_style = ParagraphStyle(
        'HeaderSubtitle',
        parent=styles['Normal'],
        fontName='Times-Italic',
        fontSize=12,
        leading=16,
        alignment=TA_CENTER,
        textColor=colors.black,
        spaceAfter=10
    )

    # Titre de section en bannière (Gras Noir / Blanc)
    banner_title_style = ParagraphStyle(
        'BannerTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.white,
        alignment=TA_LEFT
    )

    # Titres de sous-sections
    sub_title_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.black,
        spaceBefore=8,
        spaceAfter=4
    )

    # Corps de texte standard
    body_style = ParagraphStyle(
        'BodyTimes',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=11.5,
        leading=16,
        textColor=colors.black,
        alignment=TA_JUSTIFY,
        spaceAfter=5
    )

    # Dialogue style
    dialogue_style = ParagraphStyle(
        'DialogueTimes',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=11.5,
        leading=16,
        textColor=colors.black,
        spaceAfter=4
    )

    # Puces / Items commerçants cibles
    item_style = ParagraphStyle(
        'ItemTimes',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=11,
        leading=15.5,
        textColor=colors.black,
        spaceAfter=3
    )

    # Encadré texte
    box_text_style = ParagraphStyle(
        'BoxTextTimes',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=11,
        leading=15.5,
        textColor=colors.black
    )

    # Objections
    obj_title_style = ParagraphStyle(
        'ObjTitleTimes',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=11.5,
        leading=15.5,
        textColor=colors.black,
        spaceAfter=2
    )

    obj_text_style = ParagraphStyle(
        'ObjTextTimes',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=11,
        leading=15.5,
        textColor=colors.black
    )

    story = []

    def make_section_banner(num, title):
        banner_p = Paragraph(f"<b>{num}. {title}</b>", banner_title_style)
        tbl = Table([[banner_p]], colWidths=[page_width])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))
        return tbl

    def make_boxed_callout(html_content, padding=6):
        p = Paragraph(html_content, box_text_style)
        tbl = Table([[p]], colWidths=[page_width])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), padding),
            ('BOTTOMPADDING', (0, 0), (-1, -1), padding),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))
        return tbl

    # =========================================================================
    # EN-TÊTE ÉPURÉE & SOFT (PAGE 1)
    # =========================================================================
    story.append(Spacer(1, 4))
    story.append(Paragraph("Marketing stratégique", header_title_style))
    story.append(Paragraph("Guide d'action commerciale &amp; argumentaire terrain — FasoCarnet", header_subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black, spaceBefore=2, spaceAfter=14))

    # =========================================================================
    # SECTION I : INSTAURER LE CLIMAT DE CONFIANCE
    # =========================================================================
    story.append(make_section_banner("I", "INSTAURER IMMÉDIATEMENT UN CLIMAT DE CONFIANCE"))
    story.append(Spacer(1, 6))

    confiance_html = """
    • <b>Habillement :</b> Tenue soignée, badge ou polo officiel FasoCarnet visible.<br/>
    • <b>Attitude :</b> Sourire sincère, écoute attentive, salutations chaleureuses et respectueuses (<i>« Bonjour Chef », « Tantie », « Maman », « Grand »</i>).<br/>
    • <b>Posture mentale :</b> Ne venez pas pour forcer une vente. Venez pour <b>aider le commerçant à protéger son argent</b>, éliminer les erreurs de caisse et récupérer ses dettes impayées sans palabres.
    """
    story.append(make_boxed_callout(confiance_html, padding=6))
    story.append(Spacer(1, 12))

    # =========================================================================
    # SECTION II : LE DIALOGUE D'ACCROCHE & LA DÉMO EN 60 SECONDES
    # =========================================================================
    story.append(make_section_banner("II", "LE DIALOGUE D'ACCROCHE &amp; LA DÉMONSTRATION EN 60 SECONDES"))
    story.append(Spacer(1, 6))

    demo_p1 = Paragraph("<b>Commercial :</b> <i>(Sourire chaleureux)</i> « Bonjour Chef / Tantie ! Comment se passe le marché aujourd’hui ? »", dialogue_style)
    demo_p2 = Paragraph("<b>Commerçant :</b> « On rend grâce, ça va un peu. Oui mon fils, que puis-je pour toi ? »", dialogue_style)
    demo_p3 = Paragraph("""<b>Commercial :</b> « Je m'appelle [Votre Prénom], de l'équipe <b>FasoCarnet</b>. Je passe saluer les commerçants du quartier et vous montrer l'outil moderne que vos collègues utilisent désormais pour <b>remplacer leurs vieux cahiers de crédit et sécuriser leur caisse</b>.<br/>
    C'est une application pensée chez nous au Burkina pour nos réalités quotidiennes : <b>elle fonctionne à 100% sans internet</b> et sur n'importe quel téléphone Android, iPhone ou ordinateur. »""", dialogue_style)
    demo_p4 = Paragraph("<b>Commerçant :</b> « Ah bon ? Et ça fait quoi concrètement ? »", dialogue_style)

    demo_steps_html = """
    <b>Commercial :</b> <i>(S’approcher avec le sourire, sortir le téléphone et faire toucher l'écran) :</i><br/>
    « Regardez Chef, ça fait tout en 3 clics très simples :<br/>
    <b>1. La caisse express :</b> Vous tapez le montant ou choisissez l'article, vous validez. Ça sort un ticket de caisse thermique ou un reçu propre directement par WhatsApp avec le nom de votre boutique.<br/>
    <b>2. Le carnet de dettes intelligent :</b> Fini les cahiers déchirés ou les clients qui oublient ! Vous notez le client et l'échéance : l'application vous alerte et génère un message WhatsApp poli de relance en 1 clic.<br/>
    <b>3. Le bilan du soir :</b> Chaque soir, sans faire de calcul compliqué, vous connaissez vos ventes totales, vos dépenses et votre <b>vrai bénéfice net</b> du jour.<br/>
    <b>4. Zéro internet nécessaire :</b> Même s'il n'y a plus de crédit ou si le réseau est coupé, vous encaissez sans aucun problème toute la journée ! »
    """
    demo_steps_p = Paragraph(demo_steps_html, dialogue_style)

    story.append(demo_p1)
    story.append(demo_p2)
    story.append(demo_p3)
    story.append(demo_p4)
    story.append(demo_steps_p)
    story.append(Spacer(1, 4))

    action_html = """<b>Geste clé du commercial :</b> Aidez immédiatement le commerçant à installer l'application sur son téléphone (ou faites-lui taper une vente test sur le vôtre). <b>Faites-lui toucher l'écran pour dissiper toute hésitation !</b>"""
    story.append(make_boxed_callout(action_html, padding=6))

    # SAUT DE PAGE VERS SECTION III
    story.append(PageBreak())

    # =========================================================================
    # SECTION III : COMMERÇANTS CIBLES & LEURS ARGUMENTS CHOCS (PAGES 2-3)
    # =========================================================================
    story.append(make_section_banner("III", "NOS COMMERÇANTS CIBLES &amp; LEURS ARGUMENTS CHOCS SUR LE TERRAIN"))
    story.append(Spacer(1, 6))

    targets_intro = Paragraph(
        "<b>Ne prospectez pas au hasard.</b> Chaque catégorie de commerce rencontre une préoccupation spécifique. Utilisez l'<b>argument choc</b> adapté pour capter l'intérêt en 10 secondes :",
        body_style
    )
    story.append(targets_intro)
    story.append(Spacer(1, 4))

    targets_data = [
        ("1. QUINCAILLERIES &amp; MATÉRIAUX DE CONSTRUCTION", [
            ("Quincailleries générales &amp; Outillage", "« Vous avez plus de 300 articles ? Notre équipe vient saisir tout votre catalogue pour vous ! Vous suivez les crédits de chaque maçon et plombier sans jamais perdre un seul franc. »"),
            ("Dépôts de ciment, fer à béton &amp; tôles", "« Sécurisez les gros crédits de vos chantiers : chaque tonne livrée ou acompte versé est suivi au franc près jusqu'au règlement final. »"),
            ("Pièces détachées motos &amp; Garages", "« Maîtrisez votre stock de pièces et suivez précisément les dettes des mécaniciens qui prennent les pièces pour payer après dépannage. »")
        ]),
        ("2. COMMERCES DE DÉTAIL &amp; BOUTIQUES", [
            ("Alimentations générales &amp; Supérettes", "« Encaissez à la chaîne 100% sans internet, et connaissez chaque soir votre chiffre d'affaires et votre VRAI bénéfice net sans calculatrice ! »"),
            ("Boutiques de prêt-à-porter &amp; Chaussures", "« Fini les clients qui oublient de payer leurs habits à la fin du mois : l'application génère un rappel WhatsApp poli automatique qui récupère votre argent sans palabres ! »"),
            ("Librairies, Papeteries &amp; Fournitures", "« Émettez des reçus et factures professionnels pour les parents et entreprises, et encaissez à grande vitesse sans faire de file d'attente. »"),
            ("Cosmétiques, Mèches &amp; Parfumerie", "« Suivez les paiements échelonnés de vos clientes fidèles et sachez exactement ce qui vous reste en rayon sans recompter chaque soir. »"),
            ("Accessoires de téléphones &amp; Électronique", "« Délivrez un ticket de caisse professionnel avec reçu pour rassurer sur la garantie et empêcher toute fuite de caisse. »")
        ]),
        ("3. ARTISANS, ATELIERS &amp; SERVICES (Gestion des Acomptes)", [
            ("Salons &amp; Ateliers de couture / Stylisme", "« Fini les contestations sur les avances de tissu ! Notez l'acompte versé et envoyez un reçu WhatsApp officiel indiquant le solde dû à la livraison. »"),
            ("Menuisiers (Bois / Aluminium) &amp; Soudeurs", "« Établissez des devis clairs, enregistrez les avances versées pour l'achat du matériel et encaissez le solde garanti à la pose. »"),
            ("Boutiques &amp; Kiosques Orange / Moov / Wave", "« Clôturez votre journée en 30 secondes chrono : séparez vos liquidités de vos commissions et repérez instantanément toute erreur de caisse. »"),
            ("Caves, Dépôts de boissons &amp; Eau minérale", "« Le gérant contrôle à distance ses casiers et ses recettes en toute sécurité pendant que les employés encaissent en boutique. »"),
            ("Pressings &amp; Blanchisseries de quartier", "« Carnet de dépôt sécurisé : enregistrez le nombre d'habits déposés, l'acompte payé et envoyez le reçu WhatsApp au client. »")
        ])
    ]

    for idx, (cat_title, items) in enumerate(targets_data):
        story.append(Paragraph(f"<b>{cat_title}</b>", sub_title_style))
        story.append(Spacer(1, 2))

        rows = []
        for name, arg in items:
            p_content = f"• <b>{name} :</b> {arg}"
            rows.append([Paragraph(p_content, item_style)])

        cat_tbl = Table(rows, colWidths=[page_width])
        cat_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 7),
            ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ]))
        story.append(cat_tbl)
        story.append(Spacer(1, 8))

        # Saut de page propre après la catégorie 2 pour aérer la lecture
        if idx == 1:
            story.append(PageBreak())

    # =========================================================================
    # SECTION IV : LE LEVIER MARKETING CHOC (CATALOGUE CLÉ EN MAIN)
    # =========================================================================
    story.append(Spacer(1, 4))
    story.append(make_section_banner("IV", "LE LEVIER MARKETING CHOC : L'OFFRE « CATALOGUE CLÉ EN MAIN »"))
    story.append(Spacer(1, 6))

    choc_content1 = Paragraph("<b>L'ARGUMENT DÉCISIF QUI FAIT SIGNER EN 6 MOIS OU 1 AN :</b>", obj_title_style)
    choc_content2 = Paragraph("""
    <b>Commerçant :</b> <i>« C'est une très bonne application, mais moi j'ai trop d'articles dans ma boutique ! Je n'ai ni le temps ni l'envie de taper 200 ou 500 articles un par un dans le téléphone... »</i><br/><br/>
    <b>Commercial (Réponse irrésistible) :</b><br/>
    <b>« Chef / Tantie, nous avons déjà résolu ce problème pour vous !<br/>
    Dès que vous activez notre formule Sérénité de 6 mois (10 000 FCFA) ou d'un an (20 000 FCFA) :<br/>
    VOUS NE TOUCHEZ À RIEN ! NOTRE ÉQUIPE TECHNIQUE VIENT ELLE-MÊME S'ASSEOIR DANS VOTRE BOUTIQUE ET ENREGISTRE TOUT VOTRE CATALOGUE D'ARTICLES DANS L'APPLICATION À VOTRE PLACE !<br/>
    Vous commencez avec une boutique 100% prête, vos prix déjà paramétrés et votre caisse directement opérationnelle ! »</b>
    """, box_text_style)

    choc_tbl = Table([[choc_content1], [choc_content2]], colWidths=[page_width])
    choc_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ('BOX', (0, 0), (-1, -1), 1.25, colors.black),
        ('LINEBELOW', (0, 0), (-1, 0), 0.75, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(choc_tbl)

    # SAUT DE PAGE VERS SECTION V (OBJECTIONS) & SECTION VI
    story.append(PageBreak())

    # =========================================================================
    # SECTION V : COMMENT RÉPONDRE AUX 5 OBJECTIONS MAJEURES
    # =========================================================================
    story.append(make_section_banner("V", "COMMENT RÉPONDRE AUX 5 OBJECTIONS MAJEURES DU TERRAIN"))
    story.append(Spacer(1, 6))

    objections = [
        (
            "OBJECTION 1 : « C'est trop moderne pour moi, je ne connais rien aux smartphones. »",
            "« C'est tout à fait normal Chef ! C'est justement pour cela qu'on a conçu FasoCarnet avec de <b>gros boutons tactiles très simples</b>, comme le clavier d'appel téléphonique. Si vous savez composer un numéro ou envoyer une note vocale, vous maîtrisez l'application en 2 minutes. Tenez, appuyez vous-même sur ce bouton pour voir ! »"
        ),
        (
            "OBJECTION 2 : « Et si mon téléphone tombe en panne, est volé ou gâté ? »",
            "« C'est la grande force de notre système ! Vos données ne sont jamais perdues. Dès que vous avez un peu de réseau, tout se sauvegarde automatiquement sur votre compte sécurisé. Si vous changez d'appareil, vous reprenez n'importe quel autre téléphone ou ordinateur, vous entrez votre numéro et votre code PIN : <b>toutes vos ventes, vos dettes et vos stocks réapparaissent immédiatement à l'identique !</b> »"
        ),
        (
            "OBJECTION 3 : « Est-ce que je peux l'utiliser sur mon ordinateur ou mon iPhone ? »",
            "« <b>OUI, à 100% !</b> FasoCarnet fonctionne sur tous les supports : téléphones Android, iPhone, tablettes, PC portables ou ordinateurs fixes. Le patron peut même surveiller ses ventes en direct depuis chez lui pendant que son employé encaisse à la boutique. »"
        ),
        (
            "OBJECTION 4 : « Je veux d'abord tester avant de payer. »",
            "« C'est tout naturel ! On installe l'application maintenant sur votre téléphone, on crée votre espace en 1 minute, et vous commencez à faire vos encaissements et tests en direct dès aujourd'hui. »"
        ),
        (
            "OBJECTION 5 : « Je n'ai pas le temps de saisir tous mes articles aujourd'hui. »",
            "« Justement Chef ! Activez la formule 6 mois (10 000 FCFA), et c'est notre équipe qui se déplace pour faire tout ce travail de saisie à votre place. Vous n'avez qu'à vous concentrer sur vos ventes ! »"
        )
    ]

    for title, resp in objections:
        obj_content = f"<b>{title}</b><br/><b>Réponse du commercial :</b> {resp}"
        obj_tbl = Table([[Paragraph(obj_content, obj_text_style)]], colWidths=[page_width])
        obj_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 7),
            ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ]))
        story.append(obj_tbl)
        story.append(Spacer(1, 4))

    # SAUT DE PAGE VERS SECTION VI (TARIFS & CLÔTURE)
    story.append(PageBreak())

    # =========================================================================
    # SECTION VI : TARIFS OFFICIELS & PROTOCOLE DE CLÔTURE
    # =========================================================================
    story.append(make_section_banner("VI", "LES TARIFS OFFICIELS &amp; LE PROTOCOLE DE CLÔTURE"))
    story.append(Spacer(1, 8))

    tarifs_header_style = ParagraphStyle(
        'TarifsHeader',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.white,
        alignment=TA_CENTER
    )

    tarifs_cell_bold = ParagraphStyle(
        'TarifsCellBold',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.black,
        alignment=TA_CENTER
    )

    tarifs_cell_text = ParagraphStyle(
        'TarifsCellText',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=10.5,
        leading=14,
        textColor=colors.black
    )

    tarifs_data = [
        [
            Paragraph('FORMULE', tarifs_header_style),
            Paragraph('TARIF', tarifs_header_style),
            Paragraph('AVANTAGES &amp; LEVIERS COMMERCIAUX', tarifs_header_style)
        ],
        [
            Paragraph('<b>1 MOIS</b>', tarifs_cell_bold),
            Paragraph('<b>2 000 FCFA</b>', tarifs_cell_bold),
            Paragraph('Accès complet à la caisse tactile, carnet de dettes, bilans journaliers et fonctionnement 100% hors-ligne.', tarifs_cell_text)
        ],
        [
            Paragraph('<b>6 MOIS</b><br/><font size="9"><i>RECOMMANDÉ</i></font>', tarifs_cell_bold),
            Paragraph('<b>10 000 FCFA</b>', tarifs_cell_bold),
            Paragraph('<b>BONUS CLÉ EN MAIN :</b> Saisie complète de tout le catalogue d\'articles par notre équipe directement dans la boutique !', tarifs_cell_text)
        ],
        [
            Paragraph('<b>1 AN</b><br/><font size="9"><i>MAXI SÉRÉNITÉ</i></font>', tarifs_cell_bold),
            Paragraph('<b>20 000 FCFA</b>', tarifs_cell_bold),
            Paragraph('<b>2 MOIS OFFERTS</b> + Saisie intégrale du catalogue offerte + Assistance prioritaire WhatsApp 7j/7.', tarifs_cell_text)
        ]
    ]

    tarifs_tbl = Table(tarifs_data, colWidths=[page_width * 0.23, page_width * 0.22, page_width * 0.55])
    tarifs_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.black),
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(tarifs_tbl)
    story.append(Spacer(1, 14))

    cloture_html = """
    <b>LE PROTOCOLE DE DÉPART EN 5 ÉTAPES (OBLIGATOIRE SUR LE TERRAIN) :</b><br/>
    <b>1. Installer l'application :</b> Ajouter le raccourci / PWA FasoCarnet sur l'écran d'accueil du téléphone du commerçant.<br/>
    <b>2. Créer le compte :</b> Renseigner son numéro de téléphone, le nom de la boutique et l'aider à choisir son code PIN secret.<br/>
    <b>3. Démonstration active :</b> Effectuer 1 encaissement test et 1 enregistrement de dette test avec lui.<br/>
    <b>4. Proposition de valeur :</b> Proposer directement l'offre 6 mois ou 1 an avec saisie offerte du catalogue.<br/>
    <b>5. Toujours repartir avec son contact :</b> Remplir la fiche de prospection et convenir d'un rappel ou d'un passage dans 48h / 72h.
    """
    story.append(make_boxed_callout(cloture_html, padding=8))
    story.append(Spacer(1, 12))

    regles_html = """
    <b>LES 3 RÈGLES D'OR DU COMMERCIAL FASOCARNET :</b><br/>
    <b>1. Ne jamais contredire le commerçant :</b> S'il hésite ou exprime une crainte, validez d'abord sa remarque (<i>« Vous avez tout à fait raison Chef », « C'est compréhensible »</i>) avant d'apporter la solution.<br/>
    <b>2. Rester dans l'action physique :</b> Ne parlez pas dans le vide ! Mettez le téléphone dans sa main, faites-lui appuyer sur les boutons. C'est le toucher qui déclenche la confiance.<br/>
    <b>3. Suivi rigoureux :</b> Un prospect non relancé sous 72h est un client perdu. Faites remonter vos fiches chaque soir à votre chef d'équipe !
    """
    story.append(make_boxed_callout(regles_html, padding=8))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF généré avec succès : {output_pdf}")
    return output_pdf

if __name__ == '__main__':
    create_commercial_guide()
