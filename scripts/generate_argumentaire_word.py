import os
import sys
import shutil
import docx
from docx.shared import Mm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Padding interne en dxa"""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin_name, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{margin_name}')
        node.set(qn('w:w'), str(int(val)))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_background(cell, color_hex):
    """Couleur d'arrière-plan de cellule"""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), color_hex)
    tcPr.append(shd)

def set_cell_border_left_accent(cell, color_hex="047857", sz="24"):
    """Bordure gauche colorée façon encadré callout"""
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    
    # Left border accent
    left = OxmlElement('w:left')
    left.set(qn('w:val'), 'single')
    left.set(qn('w:sz'), sz) # 3pt
    left.set(qn('w:space'), '0')
    left.set(qn('w:color'), color_hex)
    tcBorders.append(left)
    
    # Other borders none
    for b_name in ['top', 'bottom', 'right']:
        b = OxmlElement(f'w:{b_name}')
        b.set(qn('w:val'), 'none')
        tcBorders.append(b)
        
    tcPr.append(tcBorders)

def create_guide_docx(output_path, desktop_path):
    doc = docx.Document()
    
    # Marges standard A4
    section = doc.sections[0]
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    section.left_margin = Mm(20)
    section.right_margin = Mm(20)
    section.top_margin = Mm(18)
    section.bottom_margin = Mm(18)
    
    COLOR_PRIMARY = RGBColor(6, 78, 59)      # Vert émeraude sombre (#064E3B)
    COLOR_ACCENT = RGBColor(4, 120, 87)      # Vert émeraude vif (#047857)
    COLOR_GOLD = RGBColor(180, 83, 9)        # Ambre / Or (#B45309)
    COLOR_DARK = RGBColor(15, 23, 42)        # Texte foncé (#0F172A)
    COLOR_MUTED = RGBColor(100, 116, 139)    # Gris secondaire (#64748B)
    
    # -------------------------------------------------------------
    # EN-TÊTE OFFICIEL DU DOCUMENT
    # -------------------------------------------------------------
    p_top = doc.add_paragraph()
    p_top.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_top.paragraph_format.space_before = Pt(0)
    p_top.paragraph_format.space_after = Pt(2)
    r_top = p_top.add_run("RÉSEAU COMMERCIAL OFFICIEL FASOCARNET • GUIDE & PITCH TERRAIN")
    r_top.font.size = Pt(8.5)
    r_top.font.bold = True
    r_top.font.color.rgb = COLOR_ACCENT
    
    # Titre Principal
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("GUIDE D'ARGUMENTATION COMMERCIALE EN 5 POINTS")
    r_title.font.size = Pt(16)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_PRIMARY
    
    # Sous-titre
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(14)
    r_sub = p_sub.add_run("Trame de négociation et script de présentation face aux commerçants et boutiquiers")
    r_sub.font.size = Pt(9.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = COLOR_MUTED
    
    # -------------------------------------------------------------
    # TABLEAU ENCADRÉ D'INTRODUCTION : AVANT DE COMMENCER
    # -------------------------------------------------------------
    tbl_intro = doc.add_table(rows=1, cols=1)
    tbl_intro.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_intro = tbl_intro.rows[0].cells[0]
    c_intro.width = Mm(170)
    set_cell_background(c_intro, "F0FDF4") # Vert très pâle
    set_cell_border_left_accent(c_intro, "047857", "30")
    set_cell_margins(c_intro, top=140, bottom=140, left=180, right=180)
    
    p_in_tit = c_intro.paragraphs[0]
    p_in_tit.paragraph_format.space_before = Pt(0)
    p_in_tit.paragraph_format.space_after = Pt(3)
    r_in_tit = p_in_tit.add_run("RAPPEL DES RÈGLES DE BIENSÉANCE & PREMIER CONTACT :")
    r_in_tit.font.bold = True
    r_in_tit.font.size = Pt(9.5)
    r_in_tit.font.color.rgb = COLOR_PRIMARY
    
    p_in_txt = c_intro.add_paragraph()
    p_in_txt.paragraph_format.space_before = Pt(0)
    p_in_txt.paragraph_format.space_after = Pt(0)
    r_in_txt = p_in_txt.add_run(
        "Toujours commencer par les salutations chaleureuses d'usage dans la langue appropriée (Français, Mooré, Dioula...), "
        "respecter le temps du commerçant s'il sert un client, et arborer fièrement son badge officiel FasoCarnet visible autour du cou."
    )
    r_in_txt.font.size = Pt(8.5)
    r_in_txt.font.color.rgb = COLOR_DARK
    
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    
    # -------------------------------------------------------------
    # LES 5 POINTS DÉTAILLÉS
    # -------------------------------------------------------------
    points = [
        {
            "num": "POINT 1",
            "titre": "L’Accroche & Le Motif de la Visite : La Simplification du Commerce",
            "objectif": "Capter l'intérêt immédiat sans blabla technique, en se positionnant comme un porteur de solution pour son argent et son stock.",
            "paroles": (
                "« Bonjour Chef / Maman ! Nous sommes l'équipe officielle FasoCarnet. "
                "Nous ne venons pas vous faire perdre votre temps, nous venons vous présenter une solution moderne, simple et rapide, "
                "conçue spécialement pour vous soulager dans la gestion quotidienne de votre argent, de vos comptes et de vos marchandises. »"
            ),
            "conseil": "Parlez avec assurance, sourire et calme. Ne parlez pas encore de technologie complexe, parlez d'« argent », de « comptes clairs » et de « soulagement ».",
            "variantes": [
                "Variante Mooré / Locale : « Yaa laafi baaba / maaba ! Tõnd waame n na n sõng-y tɩ y yel-sombre wã zĩnd nyɛlem, n kogl y ligd la y teedo. »",
                "Variante Boutique Moderne : « Bonjour Monsieur/Madame, nous venons équiper les commerces du quartier d'un carnet de caisse électronique ultra-léger. »"
            ]
        },
        {
            "num": "POINT 2",
            "titre": "Toucher ses Vraies Douleurs (Le Calvaire du Carnet Papier & Les Pertes)",
            "objectif": "Créer un miroir émotionnel immédiat. Le commerçant doit hocher la tête et reconnaître ses propres souffrances quotidiennes.",
            "paroles": (
                "« Vous-même vous savez combien le carnet en papier est fatiguant et risqué aujourd'hui :\n"
                "• Les pages qui se déchirent ou se mouillent avec l'eau ;\n"
                "• Les clients qui contestent ou nient le montant de leurs dettes quand vous réclamez ;\n"
                "• Les longs calculs de bénéfice qu'on est obligé de faire le soir quand on est déjà épuisé ;\n"
                "• Et les marchandises qui finissent en rayon sans qu'on s'en rende compte, sans parler des oublis de monnaie. »"
            ),
            "conseil": "Posez la question : « Est-ce que cela ne vous arrive pas souvent ? ». Laissez-le s'exprimer. Dès qu'il valide, la vente est déjà à moitié gagnée !",
            "variantes": [
                "Appuyer sur les dettes : « Combien d'argent dort dehors chez vos clients parce qu'un papier s'est égaré ? »",
                "Appuyer sur les calculs : « Le soir, vous dormez tranquille ou bien vous passez 1 heure à recompter les feuilles avec la calculatrice ? »"
            ]
        },
        {
            "num": "POINT 3",
            "titre": "La Solution FasoCarnet : Tout Maîtriser en 2 Secondes sur son Propre Téléphone",
            "objectif": "Positionner FasoCarnet comme le carnet magique, clair et infalsifiable qui remplace le papier sans changer ses habitudes.",
            "paroles": (
                "« C'est exactement pour en finir avec toutes ces pertes que nous avons créé FasoCarnet !\n"
                "Directement sur votre propre téléphone :\n"
                "1. Vous notez chaque vente au comptoir en 2 secondes chrono ;\n"
                "2. Vous suivez chaque dette client avec son nom : l'application génère même un reçu WhatsApp propre à lui envoyer ;\n"
                "3. Chaque soir à la fermeture, vous appuyez sur un bouton et vous voyez votre vrai bénéfice de la journée, sans calculatrice ! »"
            ),
            "conseil": "Faites une démonstration visuelle immédiate de 15 secondes sur votre propre téléphone ou sur le sien. Montrez l'écran de vente qui calcule tout seul.",
            "variantes": [
                "Mettre en avant le reçu WhatsApp : « Le client reçoit son ticket de dette directement sur son WhatsApp, il ne peut plus jamais nier ! »",
                "Mettre en avant la discrétion : « Personne d'autre que vous ne peut voir vos bénéfices, tout est protégé par votre code secret. »"
            ]
        },
        {
            "num": "POINT 4",
            "titre": "L’Argument Massue : 100% Hors-Ligne (Zéro Connexion Internet Requise)",
            "objectif": "Détruire instantanément la première objection des commerçants : « Je n'ai pas de mégas », « La connexion est mauvaise ici ».",
            "paroles": (
                "« Et voici le plus grand avantage pour vous : VOUS N'AVEZ BESOIN D'AUCUNE CONNEXION INTERNET !\n"
                "• Zéro méga à acheter, zéro forfait gaspillé ;\n"
                "• Même si le réseau est totalement coupé au marché ou que vous êtes au sous-sol, ça marche instantanément ;\n"
                "• L'application pèse moins de 5 Mo (elle prend moins de place qu'une seule photo sur votre téléphone) et vos données restent bien gardées chez vous. »"
            ),
            "conseil": "Mettez votre téléphone en « Mode Avion » devant ses yeux et enregistrez une vente pour prouver que tout tourne à la perfection sans internet !",
            "variantes": [
                "Rassurer sur la batterie : « Ça ne consomme pas votre batterie car il n'y a pas d'internet qui tourne en arrière-plan. »",
                "Rassurer sur la sécurité : « En cas de perte de téléphone, vos données peuvent être synchronisées et récupérées. »"
            ]
        },
        {
            "num": "POINT 5",
            "titre": "L'Offre Clé en Main & L'Assistance Immédiate : On Enregistre ses Articles avec Lui",
            "objectif": "Éliminer la peur de l'effort et la barrière technologique. Lui offrir une prise en charge complète sur place.",
            "paroles": (
                "« Ne vous inquiétez pas pour l'installation, nous ne vous donnons pas l'application pour vous laisser seul !\n"
                "Là tout de suite, si vous le permettez :\n"
                "• Nous nous asseyons avec vous pendant 10 minutes ;\n"
                "• Nous installons l'application sur votre téléphone ;\n"
                "• Nous enregistrons ensemble vos premiers articles avec leurs prix de vente ;\n"
                "• Nous vous montrons comment faire une vente et un crédit. Vous repartez immédiatement opérationnel, aujourd'hui même ! »"
            ),
            "conseil": "Passez directement à l'action bienveillante : « Prenez votre téléphone, on le fait ensemble maintenant, vous allez voir comme c'est facile ! ».",
            "variantes": [
                "Pour les grands stocks : « Même si vous avez 200 articles, on enregistre d'abord vos 10 articles les plus vendus, et vous continuerez à votre rythme très facilement. »",
                "Rappel de l'assistance : « Notre numéro d'assistance officiel est écrit sur notre badge. En cas de besoin, on est là pour vous accompagner. »"
            ]
        }
    ]
    
    for pt in points:
        # Bloc Titre du Point
        tbl_pt = doc.add_table(rows=1, cols=1)
        tbl_pt.alignment = WD_TABLE_ALIGNMENT.CENTER
        c_pt = tbl_pt.rows[0].cells[0]
        c_pt.width = Mm(170)
        set_cell_background(c_pt, "064E3B") # Fond vert émeraude foncé
        set_cell_margins(c_pt, top=80, bottom=80, left=140, right=140)
        
        p_num = c_pt.paragraphs[0]
        p_num.paragraph_format.space_before = Pt(0)
        p_num.paragraph_format.space_after = Pt(1)
        r_num = p_num.add_run(f"{pt['num']} : {pt['titre'].upper()}")
        r_num.font.bold = True
        r_num.font.size = Pt(10)
        r_num.font.color.rgb = RGBColor(255, 255, 255)
        
        # Corps du point
        p_obj = doc.add_paragraph()
        p_obj.paragraph_format.space_before = Pt(6)
        p_obj.paragraph_format.space_after = Pt(4)
        r_obj_lbl = p_obj.add_run("Objectif stratégique : ")
        r_obj_lbl.font.bold = True
        r_obj_lbl.font.size = Pt(9.5)
        r_obj_lbl.font.color.rgb = COLOR_ACCENT
        r_obj_val = p_obj.add_run(pt['objectif'])
        r_obj_val.font.size = Pt(9.5)
        r_obj_val.font.color.rgb = COLOR_DARK
        
        # Script exact à prononcer (encadré)
        tbl_paroles = doc.add_table(rows=1, cols=1)
        tbl_paroles.alignment = WD_TABLE_ALIGNMENT.CENTER
        c_par = tbl_paroles.rows[0].cells[0]
        c_par.width = Mm(170)
        set_cell_background(c_par, "F8FAFC")
        set_cell_border_left_accent(c_par, "D97706", "24") # Liseré ambre/or
        set_cell_margins(c_par, top=100, bottom=100, left=160, right=160)
        
        p_spk_lbl = c_par.paragraphs[0]
        p_spk_lbl.paragraph_format.space_before = Pt(0)
        p_spk_lbl.paragraph_format.space_after = Pt(3)
        r_spk_lbl = p_spk_lbl.add_run("CE QU'IL FAUT DIRE AU COMMERÇANT (SCRIPT RECOMMANDÉ) :")
        r_spk_lbl.font.bold = True
        r_spk_lbl.font.size = Pt(8.5)
        r_spk_lbl.font.color.rgb = COLOR_GOLD
        
        p_spk = c_par.add_paragraph()
        p_spk.paragraph_format.space_before = Pt(0)
        p_spk.paragraph_format.space_after = Pt(0)
        r_spk = p_spk.add_run(pt['paroles'])
        r_spk.font.size = Pt(9.5)
        r_spk.font.italic = True
        r_spk.font.color.rgb = COLOR_DARK
        
        # Astuce & variantes
        p_tip = doc.add_paragraph()
        p_tip.paragraph_format.space_before = Pt(4)
        p_tip.paragraph_format.space_after = Pt(2)
        r_tip_lbl = p_tip.add_run("Conseil pratique terrain : ")
        r_tip_lbl.font.bold = True
        r_tip_lbl.font.size = Pt(9)
        r_tip_lbl.font.color.rgb = COLOR_ACCENT
        r_tip_val = p_tip.add_run(pt['conseil'])
        r_tip_val.font.size = Pt(9)
        
        # Variantes
        for var in pt['variantes']:
            p_var = doc.add_paragraph()
            p_var.paragraph_format.space_before = Pt(1)
            p_var.paragraph_format.space_after = Pt(1)
            p_var.paragraph_format.left_indent = Mm(5)
            r_v = p_var.add_run(f"→ {var}")
            r_v.font.size = Pt(8.5)
            r_v.font.color.rgb = COLOR_MUTED
            
        doc.add_paragraph().paragraph_format.space_after = Pt(6)
        
    # -------------------------------------------------------------
    # SECTION BONUS : TRAITEMENT DES 3 OBJECTIONS CLASSIQUES
    # -------------------------------------------------------------
    doc.add_page_break()
    
    p_obj_h = doc.add_paragraph()
    p_obj_h.paragraph_format.space_before = Pt(0)
    p_obj_h.paragraph_format.space_after = Pt(8)
    r_obj_h = p_obj_h.add_run("GUIDE COMPLÉMENTAIRE : RÉPONDRE AUX OBJECTIONS FRÉQUENTES")
    r_obj_h.font.bold = True
    r_obj_h.font.size = Pt(13)
    r_obj_h.font.color.rgb = COLOR_PRIMARY
    
    objections = [
        (
            "Objection 1 : « Je n'ai pas le temps maintenant, repassez un autre jour. »",
            "Réponse recommandée : « Je comprends parfaitement Chef, votre commerce tourne et c'est une bénédiction ! "
            "Je vous demande seulement 2 minutes chrono : je vous installe l'application sur votre téléphone sans toucher à votre caisse. "
            "Ce soir quand vous serez calme, vous l'ouvrez et vous testez. Si ça ne vous plaît pas, vous la supprimez en 1 clic. On fait ça vite ? »"
        ),
        (
            "Objection 2 : « Je ne sais pas lire ou écrire le français. »",
            "Réponse recommandée : « C'est justement la force de FasoCarnet ! Chaque produit peut avoir sa photo, et vous touchez juste l'écran. "
            "Pour les chiffres, c'est comme faire un numéro de téléphone pour Orange Money. Vos enfants ou vos apprentis peuvent aussi s'en servir en 2 minutes. "
            "Venez, je vous montre tout de suite avec une seule vente d'exemple. »"
        ),
        (
            "Objection 3 : « Est-ce que mes données ne vont pas aller chez les impôts ou être volées ? »",
            "Réponse recommandée : « Jamais de la vie ! Comme l'application fonctionne à 100% sans internet, tout reste enfermé dans votre propre téléphone. "
            "Personne à l'extérieur, ni l'État, ni nous-mêmes, ne peut accéder à vos chiffres. Vous êtes le seul et unique maître de votre boutique. »"
        )
    ]
    
    for tit, rep in objections:
        tbl_o = doc.add_table(rows=1, cols=1)
        tbl_o.alignment = WD_TABLE_ALIGNMENT.CENTER
        c_o = tbl_o.rows[0].cells[0]
        c_o.width = Mm(170)
        set_cell_background(c_o, "F1F5F9") # Gris très clair
        set_cell_border_left_accent(c_o, "0F172A", "20")
        set_cell_margins(c_o, top=80, bottom=80, left=140, right=140)
        
        p_otit = c_o.paragraphs[0]
        p_otit.paragraph_format.space_before = Pt(0)
        p_otit.paragraph_format.space_after = Pt(3)
        r_otit = p_otit.add_run(tit)
        r_otit.font.bold = True
        r_otit.font.size = Pt(9.5)
        r_otit.font.color.rgb = COLOR_DARK
        
        p_orep = c_o.add_paragraph()
        p_orep.paragraph_format.space_before = Pt(0)
        p_orep.paragraph_format.space_after = Pt(0)
        r_orep = p_orep.add_run(rep)
        r_orep.font.size = Pt(9)
        r_orep.font.italic = True
        r_orep.font.color.rgb = COLOR_PRIMARY
        
        doc.add_paragraph().paragraph_format.space_after = Pt(6)
        
    # Conclusion / Pied de document
    p_fin = doc.add_paragraph()
    p_fin.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_fin.paragraph_format.space_before = Pt(14)
    r_fin = p_fin.add_run("FASOCARNET • LA CAISSE DIGITALE SIMPLE ET INDISPENSABLE DU BURKINA FASO\nSupport Commercial Officiel : +226 72 99 03 10")
    r_fin.font.size = Pt(8.5)
    r_fin.font.bold = True
    r_fin.font.color.rgb = COLOR_MUTED
    
    doc.save(output_path)
    print(f"[OK] Document genere : {output_path}")
    
    try:
        shutil.copyfile(output_path, desktop_path)
        print(f"[OK] Document copie sur le Bureau : {desktop_path}")
    except Exception as e:
        print(f"[NOTE] Copie Bureau : {e}")

if __name__ == '__main__':
    docs_file = os.path.join(os.getcwd(), "docs", "argumentaire_commercial_5_points.docx")
    desktop_file = r"C:\Users\Maxime OUATTARA\Desktop\argumentaire_commercial_5_points.docx"
    public_file = os.path.join(os.getcwd(), "public", "argumentaire_commercial_5_points.docx")
    
    create_guide_docx(docs_file, desktop_file)
    shutil.copyfile(docs_file, public_file)
    print(f"[OK] Document copie dans public : {public_file}")
