import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, Circle, Line, Group, Polygon, String
from reportlab.graphics.barcode import qr

def draw_logo(d, x, y, size=32):
    """Dessine le logo officiel FasoCarnet en vectoriel"""
    scale = size / 40.0
    g = Group()
    g.translate(x, y)
    g.scale(scale, scale)
    
    # Fond émeraude
    g.add(Rect(0, 0, 40, 40, rx=9, ry=9, fillColor=colors.HexColor('#064e3b'), strokeColor=None))
    # Reliure carnet
    g.add(Rect(5, 6, 5.5, 28, rx=2, ry=2, fillColor=colors.HexColor('#047857'), strokeColor=None))
    # Page blanche
    g.add(Rect(12, 6, 23, 28, rx=3, ry=3, fillColor=colors.white, strokeColor=None))
    # Lignes
    g.add(Line(16, 25, 31, 25, strokeColor=colors.HexColor('#e2e8f0'), strokeWidth=2))
    g.add(Line(16, 19, 26, 19, strokeColor=colors.HexColor('#e2e8f0'), strokeWidth=2))
    # Pastille or
    g.add(Circle(25, 13, 5, fillColor=colors.HexColor('#d97706'), strokeColor=None))
    # Étoile rouge
    star_pts = [29, 30, 31, 28, 33, 28, 31.5, 26.5, 32.5, 24.5, 30.5, 26, 28.5, 24.5, 29.5, 26.5, 28, 28, 30, 28]
    g.add(Polygon(star_pts, fillColor=colors.HexColor('#ef4444'), strokeColor=None))
    
    d.add(g)

def draw_qr_code(c, url, x, y, size_pt):
    """Génère et dessine le QR Code vectoriel dynamique"""
    widget = qr.QrCodeWidget(url)
    bounds = widget.getBounds()
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    
    d = Drawing(size_pt, size_pt, transform=[size_pt / w, 0, 0, size_pt / h, 0, 0])
    d.add(widget)
    d.drawOn(c, x, y)

def draw_badge_recto(c, x, y, w, h, commercial):
    """
    Dessine la face avant (Recto) du badge commercial
    Design 1er modèle adapté au format compact (54 mm x 85.6 mm / CR80)
    """
    c.saveState()
    
    # 1. Fond blanc du badge avec bordure émeraude
    c.setFillColor(colors.white)
    c.setStrokeColor(colors.HexColor('#064e3b'))
    c.setLineWidth(1.2)
    c.roundRect(x, y, w, h, 4.5 * mm, fill=1, stroke=1)
    
    # 2. Bandeau supérieur officiel (Émeraude profonde)
    header_h = 17.5 * mm
    c.setFillColor(colors.HexColor('#064e3b'))
    c.roundRect(x + 0.6, y + h - header_h - 0.6, w - 1.2, header_h, 4 * mm, fill=1, stroke=0)
    c.rect(x + 0.6, y + h - header_h - 0.6, w - 1.2, 6 * mm, fill=1, stroke=0) # aplatir le bas
    
    # Ligne d'accent or sous le bandeau
    c.setFillColor(colors.HexColor('#d97706'))
    c.rect(x + 0.6, y + h - header_h - 1.4 * mm, w - 1.2, 1.2 * mm, fill=1, stroke=0)
    
    # Logo & Titre FasoCarnet
    logo_size = 20
    logo_d = Drawing(logo_size, logo_size)
    draw_logo(logo_d, 0, 0, size=logo_size)
    logo_d.drawOn(c, x + 3.2 * mm, y + h - 14.5 * mm)
    
    c.setFont("Helvetica-Bold", 10.5)
    c.setFillColor(colors.white)
    c.drawString(x + 12.8 * mm, y + h - 8.5 * mm, "FasoCarnet")
    
    c.setFont("Helvetica-Bold", 5.2)
    c.setFillColor(colors.HexColor('#fef08a'))
    c.drawString(x + 12.8 * mm, y + h - 11.4 * mm, "CAISSE & CARNET DIGITAL")
    
    c.setFont("Helvetica", 4.8)
    c.setFillColor(colors.HexColor('#a7f3d0'))
    c.drawString(x + 12.8 * mm, y + h - 14 * mm, "RÉSEAU COMMERCIAL OFFICIEL")
    
    # 3. Mention de la carte
    c.setFont("Helvetica-Bold", 6.2)
    c.setFillColor(colors.HexColor('#064e3b'))
    card_type_text = "CARTE D'ACCRÉDITATION TERRAIN"
    c.drawCentredString(x + w / 2, y + 64 * mm, card_type_text)
    
    # 4. Cadre Photo d'identité (Photo réelle ou Silhouette stylisée)
    photo_w = 21 * mm
    photo_h = 24 * mm
    photo_x = x + (w - photo_w) / 2
    photo_y = y + 37.5 * mm
    
    photo_path = commercial.get('photo_path')
    if photo_path and os.path.exists(photo_path):
        # Affichage avec découpe aux coins arrondis (2.5 mm)
        c.saveState()
        clip_p = c.beginPath()
        clip_p.roundRect(photo_x, photo_y, photo_w, photo_h, 2.5 * mm)
        c.clipPath(clip_p, stroke=0, fill=0)
        c.drawImage(photo_path, photo_x, photo_y, photo_w, photo_h, preserveAspectRatio=False)
        c.restoreState()
        # Bordure soignée par dessus
        c.setStrokeColor(colors.HexColor('#cbd5e1'))
        c.setLineWidth(0.8)
        c.roundRect(photo_x, photo_y, photo_w, photo_h, 2.5 * mm, fill=0, stroke=1)
    else:
        # Silhouette par défaut
        c.setFillColor(colors.HexColor('#f8fafc'))
        c.setStrokeColor(colors.HexColor('#cbd5e1'))
        c.setLineWidth(0.8)
        c.roundRect(photo_x, photo_y, photo_w, photo_h, 2.5 * mm, fill=1, stroke=1)
        
        c.setFillColor(colors.HexColor('#94a3b8'))
        c.circle(photo_x + photo_w / 2, photo_y + photo_h - 8 * mm, 4 * mm, fill=1, stroke=0)
        c.roundRect(photo_x + 2.5 * mm, photo_y + 1.5 * mm, photo_w - 5 * mm, 9 * mm, 3 * mm, fill=1, stroke=0)
        
        c.setFont("Helvetica-Bold", 4.5)
        c.setFillColor(colors.HexColor('#64748b'))
        c.drawCentredString(photo_x + photo_w / 2, photo_y + 2.4 * mm, "PHOTO AGENT")
    
    # 5. Identité du commercial (très visible sous la photo)
    c.setFont("Helvetica-Bold", 9.5)
    c.setFillColor(colors.HexColor('#0f172a'))
    c.drawCentredString(x + w / 2, y + 33 * mm, commercial['name'].upper())
    
    c.setFont("Helvetica-Bold", 6)
    c.setFillColor(colors.HexColor('#047857'))
    c.drawCentredString(x + w / 2, y + 29.5 * mm, "CONSEILLER COMMERCIAL TERRAIN")
    
    # 6. Bloc d'Informations (Code, Téléphone, Zone)
    info_box_y = y + 8.8 * mm
    info_box_h = 18.5 * mm
    info_box_w = w - 6 * mm
    info_box_x = x + 3 * mm
    
    c.setFillColor(colors.HexColor('#f8fafc'))
    c.setStrokeColor(colors.HexColor('#e2e8f0'))
    c.setLineWidth(0.7)
    c.roundRect(info_box_x, info_box_y, info_box_w, info_box_h, 2.5 * mm, fill=1, stroke=1)
    
    # Lignes d'info
    # Code Commercial
    c.setFont("Helvetica-Bold", 5.2)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawString(info_box_x + 2.5 * mm, info_box_y + 12.8 * mm, "CODE COMMERCIAL :")
    
    c.setFont("Helvetica-Bold", 7.2)
    c.setFillColor(colors.HexColor('#064e3b'))
    c.drawRightString(info_box_x + info_box_w - 2.5 * mm, info_box_y + 12.8 * mm, commercial['code'])
    
    # Téléphone
    c.setFont("Helvetica-Bold", 5.2)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawString(info_box_x + 2.5 * mm, info_box_y + 7.5 * mm, "CONTACT WHATSAPP :")
    
    c.setFont("Helvetica-Bold", 6.8)
    c.setFillColor(colors.HexColor('#0f172a'))
    c.drawRightString(info_box_x + info_box_w - 2.5 * mm, info_box_y + 7.5 * mm, commercial['phone'])
    
    # Zone / Ville
    c.setFont("Helvetica-Bold", 5.2)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawString(info_box_x + 2.5 * mm, info_box_y + 2.2 * mm, "ZONE D'AFFECTATION :")
    
    c.setFont("Helvetica-Bold", 6.8)
    c.setFillColor(colors.HexColor('#0f172a'))
    c.drawRightString(info_box_x + info_box_w - 2.5 * mm, info_box_y + 2.2 * mm, commercial['zone'])
    
    # 7. Bandeau inférieur de sécurité (émeraude)
    footer_h = 6.8 * mm
    c.setFillColor(colors.HexColor('#064e3b'))
    c.roundRect(x + 0.6, y + 0.6, w - 1.2, footer_h, 3.5 * mm, fill=1, stroke=0)
    c.rect(x + 0.6, y + 3 * mm, w - 1.2, footer_h - 2.4 * mm, fill=1, stroke=0)
    
    c.setFont("Helvetica-Bold", 5.2)
    c.setFillColor(colors.white)
    c.drawCentredString(x + w / 2, y + 3.6 * mm, "CARTE OFFICIELLE FASOCARNET • 2026-2027")
    
    c.setFont("Helvetica", 4.2)
    c.setFillColor(colors.HexColor('#a7f3d0'))
    c.drawCentredString(x + w / 2, y + 1.6 * mm, "Validée par la Direction Commerciale & Support")
    
    c.restoreState()


def draw_badge_verso(c, x, y, w, h, commercial):
    """
    Dessine la face arrière (Verso) du badge avec le QR Code haute résolution
    Design 1er modèle adapté au format compact (54 mm x 85.6 mm / CR80)
    """
    c.saveState()
    
    # 1. Fond du badge avec bordure émeraude
    c.setFillColor(colors.white)
    c.setStrokeColor(colors.HexColor('#064e3b'))
    c.setLineWidth(1.2)
    c.roundRect(x, y, w, h, 4.5 * mm, fill=1, stroke=1)
    
    # 2. Bandeau supérieur Verso
    header_h = 14 * mm
    c.setFillColor(colors.HexColor('#064e3b'))
    c.roundRect(x + 0.6, y + h - header_h - 0.6, w - 1.2, header_h, 4 * mm, fill=1, stroke=0)
    c.rect(x + 0.6, y + h - header_h - 0.6, w - 1.2, 5.5 * mm, fill=1, stroke=0)
    
    # Ligne d'accent or
    c.setFillColor(colors.HexColor('#d97706'))
    c.rect(x + 0.6, y + h - header_h - 1.4 * mm, w - 1.2, 1.2 * mm, fill=1, stroke=0)
    
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.white)
    c.drawCentredString(x + w / 2, y + h - 6.5 * mm, "SCANNEZ POUR INSTALLER")
    
    c.setFont("Helvetica-Bold", 5.8)
    c.setFillColor(colors.HexColor('#fef08a'))
    c.drawCentredString(x + w / 2, y + h - 10.5 * mm, "L'APPLICATION FASOCARNET (PWA)")
    
    # 3. Zone QR Code
    qr_box_size = 29 * mm
    qr_box_x = x + (w - qr_box_size) / 2
    qr_box_y = y + 38 * mm
    
    # Cadre blanc
    c.setFillColor(colors.white)
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.8)
    c.roundRect(qr_box_x, qr_box_y, qr_box_size, qr_box_size, 2.5 * mm, fill=1, stroke=1)
    
    # QR Code avec le lien dynamique d'affiliation
    qr_size = 26 * mm
    qr_x = x + (w - qr_size) / 2
    qr_y = qr_box_y + 1.5 * mm
    qr_url = f"https://fasocarnet.onrender.com/?ref={commercial['code']}"
    draw_qr_code(c, qr_url, qr_x, qr_y, qr_size)
    
    # 4. Code Commercial sous le QR Code
    badge_ref_y = y + 31.5 * mm
    badge_ref_h = 5.2 * mm
    c.setFillColor(colors.HexColor('#ecfdf5'))
    c.setStrokeColor(colors.HexColor('#047857'))
    c.setLineWidth(0.8)
    c.roundRect(x + 3 * mm, badge_ref_y, w - 6 * mm, badge_ref_h, 1.8 * mm, fill=1, stroke=1)
    
    c.setFont("Helvetica-Bold", 5.8)
    c.setFillColor(colors.HexColor('#064e3b'))
    c.drawCentredString(x + w / 2, badge_ref_y + 1.4 * mm, f"CODE PARRAIN COMMERCIAL : {commercial['code']}")
    
    # 5. Les 3 étapes ultra simples
    step_box_y = y + 12.5 * mm
    step_box_h = 17.5 * mm
    step_box_w = w - 6 * mm
    step_box_x = x + 3 * mm
    
    c.setFillColor(colors.HexColor('#f8fafc'))
    c.setStrokeColor(colors.HexColor('#e2e8f0'))
    c.setLineWidth(0.7)
    c.roundRect(step_box_x, step_box_y, step_box_w, step_box_h, 2.5 * mm, fill=1, stroke=1)
    
    steps = [
        ("1", "Ouvrez l'appareil photo et pointez ce code."),
        ("2", "Touchez le lien web pour ouvrir la boutique."),
        ("3", "Appuyez sur « Installer » : l'icône apparaît !")
    ]
    
    for i, (num, txt) in enumerate(steps):
        row_y = step_box_y + step_box_h - (i + 1) * 5.2 * mm + 1.1 * mm
        # Puce numéro
        c.setFillColor(colors.HexColor('#047857'))
        c.circle(step_box_x + 3 * mm, row_y + 1.5 * mm, 1.8 * mm, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 4.6)
        c.setFillColor(colors.white)
        c.drawCentredString(step_box_x + 3 * mm, row_y + 0.6 * mm, num)
        
        # Texte étape
        c.setFont("Helvetica", 4.8)
        c.setFillColor(colors.HexColor('#334155'))
        c.drawString(step_box_x + 6.5 * mm, row_y + 0.4 * mm, txt)
        
    # 6. Puces de réassurance
    c.setFont("Helvetica-Bold", 4.8)
    c.setFillColor(colors.HexColor('#047857'))
    c.drawCentredString(x + w / 2, y + 8.8 * mm, "100% SANS INTERNET  •  MOINS DE 5 MO  •  SÉCURISÉ")
    
    # 7. Bandeau inférieur Support
    footer_h = 6.4 * mm
    c.setFillColor(colors.HexColor('#0f172a'))
    c.roundRect(x + 0.6, y + 0.6, w - 1.2, footer_h, 3.5 * mm, fill=1, stroke=0)
    c.rect(x + 0.6, y + 3 * mm, w - 1.2, footer_h - 2.4 * mm, fill=1, stroke=0)
    
    c.setFont("Helvetica-Bold", 4.8)
    c.setFillColor(colors.white)
    c.drawCentredString(x + w / 2, y + 2.4 * mm, "Assistance Commerciale & Technique : +226 72 99 03 10")
    
    c.restoreState()


def generate_badge_pdf():
    output_pdf = os.path.join(os.getcwd(), "docs", "badge_commercial_COMPAORE_Adama.pdf")
    public_pdf = os.path.join(os.getcwd(), "public", "badge_commercial_COMPAORE_Adama.pdf")
    artifact_dir = r"C:\Users\Maxime OUATTARA\.gemini\antigravity\brain\23e09812-2870-45e7-9025-1667cd904de7"
    
    os.makedirs(os.path.dirname(output_pdf), exist_ok=True)
    os.makedirs(os.path.dirname(public_pdf), exist_ok=True)
    
    c = canvas.Canvas(output_pdf, pagesize=A4)
    page_w, page_h = A4
    
    commercial = {
        'name': 'COMPAORE Adama',
        'code': 'COMPAORE226',
        'phone': '+226 61 97 45 21',
        'zone': 'Ouagadougou',
        'photo_path': os.path.join(os.getcwd(), "docs", "photos_traitees", "photo_COMPAORE_Adama.png")
    }
    
    # =========================================================================
    # PAGE 1 : PLANCHE PRÊTE À IMPRIMER (RECTO & VERSO CÔTE À CÔTE POUR PLIAGE)
    # =========================================================================
    
    # Titre de la planche technique
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(colors.HexColor('#064e3b'))
    c.drawCentredString(page_w / 2, page_h - 22 * mm, "BADGE OFFICIEL COMMERCIAL TERRAIN")
    
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawCentredString(page_w / 2, page_h - 27 * mm, "Planche d'impression haute définition • Format réduit standard (54 x 85.6 mm / CR80)")
    
    # Ligne de séparation
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.75)
    c.line(20 * mm, page_h - 31 * mm, page_w - 20 * mm, page_h - 31 * mm)
    
    badge_w = 54 * mm
    badge_h = 85.6 * mm
    gap = 14 * mm
    
    # Centrage horizontal des deux faces
    total_w = badge_w * 2 + gap
    start_x = (page_w - total_w) / 2
    badge_y = (page_h - badge_h) / 2 - 5 * mm
    
    recto_x = start_x
    verso_x = start_x + badge_w + gap
    
    # Titres des faces
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor('#0f172a'))
    c.drawCentredString(recto_x + badge_w / 2, badge_y + badge_h + 4 * mm, "FACE AVANT (RECTO)")
    c.drawCentredString(verso_x + badge_w / 2, badge_y + badge_h + 4 * mm, "FACE ARRIÈRE (VERSO / QR CODE)")
    
    # Dessin des deux badges
    draw_badge_recto(c, recto_x, badge_y, badge_w, badge_h, commercial)
    draw_badge_verso(c, verso_x, badge_y, badge_w, badge_h, commercial)
    
    # Repères de découpe et de pliage
    c.setStrokeColor(colors.HexColor('#94a3b8'))
    c.setLineWidth(0.5)
    c.setDash([3, 3], 0)
    
    # Ligne de séparation / repère central
    mid_x = start_x + badge_w + gap / 2
    c.line(mid_x, badge_y - 8 * mm, mid_x, badge_y + badge_h + 8 * mm)
    
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawCentredString(mid_x, badge_y - 12 * mm, "Ligne de coupe / Pliage central")
    
    # Instructions pour l'impression
    instruct_box_y = 25 * mm
    instruct_box_h = 24 * mm
    instruct_box_w = page_w - 40 * mm
    instruct_box_x = 20 * mm
    
    c.setDash([], 0) # reset pointillés
    c.setFillColor(colors.HexColor('#f8fafc'))
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.75)
    c.roundRect(instruct_box_x, instruct_box_y, instruct_box_w, instruct_box_h, 3 * mm, fill=1, stroke=1)
    
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(colors.HexColor('#064e3b'))
    c.drawString(instruct_box_x + 5 * mm, instruct_box_y + 17 * mm, "GUIDE DE FABRICATION DU BADGE COMPACT PLASTIFIÉ :")
    
    instructions = [
        "1. Imprimez cette page sur du papier bristol / cartonné blanc (180g à 250g) en taille réelle (100%).",
        "2. Découpez le Recto et le Verso le long des bordures extérieures (format carte 54 x 85.6 mm).",
        "3. Collez-les dos-à-dos ou pliez au centre, puis insérez dans un porte-badge transparent standard CR80 ou plastifiez."
    ]
    for i, line in enumerate(instructions):
        c.setFont("Helvetica", 7.5)
        c.setFillColor(colors.HexColor('#334155'))
        c.drawString(instruct_box_x + 5 * mm, instruct_box_y + 11.5 * mm - i * 4.5 * mm, line)
        
    c.showPage()
    c.save()
    
    # Copie vers public et artifact
    with open(output_pdf, 'rb') as f:
        data = f.read()
    with open(public_pdf, 'wb') as f:
        f.write(data)
    if os.path.exists(artifact_dir):
        with open(os.path.join(artifact_dir, "badge_commercial_COMPAORE_Adama.pdf"), 'wb') as f:
            f.write(data)
            
    print(f"PDF généré avec succès : {output_pdf}")

if __name__ == '__main__':
    generate_badge_pdf()
