import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, Circle, Line, Group, Polygon, String
from reportlab.graphics.barcode import qr
import pypdfium2

def draw_logo(d, x, y, size=24):
    """Dessine le logo FasoCarnet en vectoriel épuré"""
    scale = size / 40.0
    g = Group()
    g.translate(x, y)
    g.scale(scale, scale)
    
    # Fond émeraude subtil
    g.add(Rect(0, 0, 40, 40, rx=9, ry=9, fillColor=colors.HexColor('#047857'), strokeColor=None))
    # Reliure carnet
    g.add(Rect(5, 6, 5.5, 28, rx=2, ry=2, fillColor=colors.HexColor('#065f46'), strokeColor=None))
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
    """Dessine le QR code vectoriel"""
    widget = qr.QrCodeWidget(url)
    bounds = widget.getBounds()
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    d = Drawing(size_pt, size_pt, transform=[size_pt / w, 0, 0, size_pt / h, 0, 0])
    d.add(widget)
    d.drawOn(c, x, y)

def draw_compact_recto(c, x, y, w, h, commercial):
    """
    Format Réduit : 54 mm × 85.6 mm (Format Standard Carte Bancaire / CR80 Vertical)
    Style Épuré : Moins de vert, fond blanc / ardoise moderne, accents élégants.
    """
    c.saveState()
    
    # 1. Fond blanc pur avec bordure fine ardoise
    c.setFillColor(colors.white)
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, 4 * mm, fill=1, stroke=1)
    
    # 2. En-tête sobre (Blanc / Ardoise avec très fin liseré émeraude & or)
    # Liseré supérieur bicolore (2 mm au total)
    c.setFillColor(colors.HexColor('#047857'))
    c.roundRect(x + 0.5, y + h - 3 * mm, w - 1, 2.5 * mm, 3.5 * mm, fill=1, stroke=0)
    c.rect(x + 0.5, y + h - 3 * mm, w - 1, 1.5 * mm, fill=1, stroke=0) # aplatir le bas
    c.setFillColor(colors.HexColor('#d97706'))
    c.rect(x + 0.5, y + h - 3.8 * mm, w - 1, 0.8 * mm, fill=1, stroke=0)
    
    # Logo & Nom de la marque sur fond blanc
    logo_size = 18
    logo_d = Drawing(logo_size, logo_size)
    draw_logo(logo_d, 0, 0, size=logo_size)
    logo_d.drawOn(c, x + 3.5 * mm, y + h - 11.5 * mm)
    
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor('#0f172a')) # Noir/ardoise corporate au lieu du vert foncé
    c.drawString(x + 11.5 * mm, y + h - 8.5 * mm, "FasoCarnet")
    
    c.setFont("Helvetica-Bold", 5)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawString(x + 11.8 * mm, y + h - 11.2 * mm, "RÉSEAU COMMERCIAL AGREE")
    
    # Badge statut discret en haut à droite
    status_w = 17 * mm
    status_h = 4.2 * mm
    status_x = x + w - status_w - 3 * mm
    status_y = y + h - 11 * mm
    c.setFillColor(colors.HexColor('#f1f5f9'))
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.5)
    c.roundRect(status_x, status_y, status_w, status_h, 1.5 * mm, fill=1, stroke=1)
    c.setFont("Helvetica-Bold", 4.5)
    c.setFillColor(colors.HexColor('#047857'))
    c.drawCentredString(status_x + status_w / 2, status_y + 1.3 * mm, "● ACCRÉDITÉ")
    
    # Ligne fine de séparation
    c.setStrokeColor(colors.HexColor('#f1f5f9'))
    c.setLineWidth(0.6)
    c.line(x + 3 * mm, y + h - 13.5 * mm, x + w - 3 * mm, y + h - 13.5 * mm)
    
    # 3. Photo d'identité (20 mm × 23 mm)
    photo_w = 21 * mm
    photo_h = 24 * mm
    photo_x = x + (w - photo_w) / 2
    photo_y = y + 43 * mm
    
    c.setFillColor(colors.HexColor('#f8fafc'))
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.75)
    c.roundRect(photo_x, photo_y, photo_w, photo_h, 2.5 * mm, fill=1, stroke=1)
    
    # Silhouette stylisée
    c.setFillColor(colors.HexColor('#94a3b8'))
    c.circle(photo_x + photo_w / 2, photo_y + photo_h - 8 * mm, 4 * mm, fill=1, stroke=0)
    c.roundRect(photo_x + 2.5 * mm, photo_y + 1.5 * mm, photo_w - 5 * mm, 9 * mm, 3 * mm, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 4.5)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawCentredString(photo_x + photo_w / 2, photo_y + 2.2 * mm, "PHOTO AGENT")
    
    # 4. Nom du commercial & Fonction
    c.setFont("Helvetica-Bold", 9.5)
    c.setFillColor(colors.HexColor('#0f172a'))
    c.drawCentredString(x + w / 2, y + 38.5 * mm, commercial['name'].upper())
    
    c.setFont("Helvetica-Bold", 6)
    c.setFillColor(colors.HexColor('#047857'))
    c.drawCentredString(x + w / 2, y + 35 * mm, "CONSEILLER COMMERCIAL TERRAIN")
    
    # 5. Bloc d'Informations (Code, Contact, Zone) sur fond gris perle très doux
    info_x = x + 3 * mm
    info_w = w - 6 * mm
    info_y = y + 9.5 * mm
    info_h = 23 * mm
    
    c.setFillColor(colors.HexColor('#f8fafc'))
    c.setStrokeColor(colors.HexColor('#e2e8f0'))
    c.setLineWidth(0.6)
    c.roundRect(info_x, info_y, info_w, info_h, 2.5 * mm, fill=1, stroke=1)
    
    # Ligne 1 : Code Commercial (Mis en valeur)
    c.setFont("Helvetica", 5.5)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawString(info_x + 2.5 * mm, info_y + 16.5 * mm, "Code Parrain :")
    
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor('#0f172a'))
    c.drawRightString(info_x + info_w - 2.5 * mm, info_y + 16.5 * mm, commercial['code'])
    
    # Filet séparateur
    c.setStrokeColor(colors.HexColor('#edf2f7'))
    c.line(info_x + 2 * mm, info_y + 15 * mm, info_x + info_w - 2 * mm, info_y + 15 * mm)
    
    # Ligne 2 : Contact WhatsApp
    c.setFont("Helvetica", 5.5)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawString(info_x + 2.5 * mm, info_y + 9.8 * mm, "WhatsApp :")
    
    c.setFont("Helvetica-Bold", 7.2)
    c.setFillColor(colors.HexColor('#0f172a'))
    c.drawRightString(info_x + info_w - 2.5 * mm, info_y + 9.8 * mm, commercial['phone'])
    
    # Filet séparateur
    c.line(info_x + 2 * mm, info_y + 8.2 * mm, info_x + info_w - 2 * mm, info_y + 8.2 * mm)
    
    # Ligne 3 : Zone d'affectation
    c.setFont("Helvetica", 5.5)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawString(info_x + 2.5 * mm, info_y + 3 * mm, "Zone :")
    
    c.setFont("Helvetica-Bold", 7.2)
    c.setFillColor(colors.HexColor('#0f172a'))
    c.drawRightString(info_x + info_w - 2.5 * mm, info_y + 3 * mm, commercial['zone'])
    
    # 6. Pied de badge sobre (Ardoise)
    footer_h = 5.5 * mm
    c.setFillColor(colors.HexColor('#0f172a'))
    c.roundRect(x + 0.5, y + 0.5, w - 1, footer_h, 3.5 * mm, fill=1, stroke=0)
    c.rect(x + 0.5, y + 3 * mm, w - 1, footer_h - 2.5 * mm, fill=1, stroke=0)
    
    c.setFont("Helvetica-Bold", 4.8)
    c.setFillColor(colors.white)
    c.drawCentredString(x + w / 2, y + 2 * mm, "CARTE OFFICIELLE STRICTEMENT PERSONNELLE")
    
    c.restoreState()

def draw_compact_verso(c, x, y, w, h, commercial):
    """
    Face Arrière (Verso) : Format 54 mm × 85.6 mm
    Fond blanc épuré, QR code d'affiliation très lisible, moins de vert.
    """
    c.saveState()
    
    # 1. Fond blanc avec bordure ardoise
    c.setFillColor(colors.white)
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, 4 * mm, fill=1, stroke=1)
    
    # 2. Liseré haut
    c.setFillColor(colors.HexColor('#0f172a'))
    c.roundRect(x + 0.5, y + h - 3 * mm, w - 1, 2.5 * mm, 3.5 * mm, fill=1, stroke=0)
    c.rect(x + 0.5, y + h - 3 * mm, w - 1, 1.5 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#047857'))
    c.rect(x + 0.5, y + h - 3.8 * mm, w - 1, 0.8 * mm, fill=1, stroke=0)
    
    # 3. Titre du Verso
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor('#0f172a'))
    c.drawCentredString(x + w / 2, y + h - 9.5 * mm, "TESTER FASOCARNET")
    
    c.setFont("Helvetica", 5.2)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawCentredString(x + w / 2, y + h - 13 * mm, "Scannez avec la caméra de votre téléphone")
    
    # 4. Cadre QR Code
    qr_box_size = 28 * mm
    qr_box_x = x + (w - qr_box_size) / 2
    qr_box_y = y + 40 * mm
    
    c.setFillColor(colors.HexColor('#f8fafc'))
    c.setStrokeColor(colors.HexColor('#e2e8f0'))
    c.setLineWidth(0.8)
    c.roundRect(qr_box_x, qr_box_y, qr_box_size, qr_box_size, 3 * mm, fill=1, stroke=1)
    
    # Dessin du QR Code
    ref_url = f"https://fasocarnet.com/?ref={commercial['code']}&utm_source=badge"
    draw_qr_code(c, ref_url, qr_box_x + 1.5 * mm, qr_box_y + 1.5 * mm, (qr_box_size - 3 * mm))
    
    # Mention sous le QR Code
    c.setFont("Helvetica-Bold", 5.2)
    c.setFillColor(colors.HexColor('#047857'))
    c.drawCentredString(x + w / 2, qr_box_y - 3.2 * mm, f"CODE PARRAIN : {commercial['code']}")
    
    # 5. Étapes rapides
    step_y = y + 11.5 * mm
    step_w = w - 6 * mm
    step_x = x + 3 * mm
    step_h = 22 * mm
    
    c.setFillColor(colors.HexColor('#f8fafc'))
    c.setStrokeColor(colors.HexColor('#e2e8f0'))
    c.setLineWidth(0.6)
    c.roundRect(step_x, step_y, step_w, step_h, 2.5 * mm, fill=1, stroke=1)
    
    steps = [
        ("1", "Ouvrez l'appareil photo et visez ce QR Code."),
        ("2", "Touchez le lien web affiché à l'écran."),
        ("3", "Installez l'application : prête en 30 secondes !")
    ]
    
    for i, (num, txt) in enumerate(steps):
        row_y = step_y + step_h - (i + 1) * 6.5 * mm + 1.5 * mm
        # Puce ardoise sobre
        c.setFillColor(colors.HexColor('#0f172a'))
        c.circle(step_x + 3.2 * mm, row_y + 1.6 * mm, 1.8 * mm, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 4.5)
        c.setFillColor(colors.white)
        c.drawCentredString(step_x + 3.2 * mm, row_y + 0.7 * mm, num)
        
        # Texte étape
        c.setFont("Helvetica", 4.8)
        c.setFillColor(colors.HexColor('#334155'))
        c.drawString(step_x + 6.5 * mm, row_y + 0.7 * mm, txt)
        
    # 6. Bandeau inférieur Support
    footer_h = 6 * mm
    c.setFillColor(colors.HexColor('#0f172a'))
    c.roundRect(x + 0.5, y + 0.5, w - 1, footer_h, 3.5 * mm, fill=1, stroke=0)
    c.rect(x + 0.5, y + 3 * mm, w - 1, footer_h - 2.5 * mm, fill=1, stroke=0)
    
    c.setFont("Helvetica-Bold", 4.8)
    c.setFillColor(colors.white)
    c.drawCentredString(x + w / 2, y + 2.2 * mm, "Assistance WhatsApp : +226 72 99 03 10")
    
    c.restoreState()

def export_compact_badge():
    commercial = {
        'name': 'COMPAORE Adama',
        'code': 'COMPAORE226',
        'phone': '+226 61 97 45 21',
        'zone': 'Ouagadougou'
    }

    # Format Standard Carte Bancaire (ISO 7810 ID-1 : 54 mm × 85.6 mm)
    badge_w = 54.0 * mm
    badge_h = 85.6 * mm

    output_dir = os.path.join(os.getcwd(), "docs")
    public_dir = os.path.join(os.getcwd(), "public")
    artifact_dir = r"C:\Users\Maxime OUATTARA\.gemini\antigravity\brain\23e09812-2870-45e7-9025-1667cd904de7"

    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)

    # 1. Planche A4 PDF
    pdf_path = os.path.join(output_dir, "badge_commercial_compact_COMPAORE_Adama.pdf")
    c_page = canvas.Canvas(pdf_path, pagesize=A4)
    page_w, page_h = A4

    # En-tête de la planche A4
    c_page.setFont("Helvetica-Bold", 15)
    c_page.setFillColor(colors.HexColor('#0f172a'))
    c_page.drawCentredString(page_w / 2, page_h - 25 * mm, "BADGE COMMERCIAL FORMAT COMPACT (CR80)")
    c_page.setFont("Helvetica", 8.5)
    c_page.setFillColor(colors.HexColor('#64748b'))
    c_page.drawCentredString(page_w / 2, page_h - 30 * mm, "Dimensions standard carte bancaire (54 x 85.6 mm) • Moins de vert • Fond épuré & Sobre")
    c_page.setStrokeColor(colors.HexColor('#cbd5e1'))
    c_page.setLineWidth(0.75)
    c_page.line(25 * mm, page_h - 34 * mm, page_w - 25 * mm, page_h - 34 * mm)

    gap = 14 * mm
    total_w = badge_w * 2 + gap
    start_x = (page_w - total_w) / 2
    badge_y = (page_h - badge_h) / 2

    recto_x = start_x
    verso_x = start_x + badge_w + gap

    c_page.setFont("Helvetica-Bold", 9)
    c_page.setFillColor(colors.HexColor('#0f172a'))
    c_page.drawCentredString(recto_x + badge_w / 2, badge_y + badge_h + 3.5 * mm, "FACE AVANT (RECTO)")
    c_page.drawCentredString(verso_x + badge_w / 2, badge_y + badge_h + 3.5 * mm, "FACE ARRIÈRE (VERSO / QR CODE)")

    draw_compact_recto(c_page, recto_x, badge_y, badge_w, badge_h, commercial)
    draw_compact_verso(c_page, verso_x, badge_y, badge_w, badge_h, commercial)

    # Ligne pointillée de découpe centrale
    c_page.setStrokeColor(colors.HexColor('#94a3b8'))
    c_page.setLineWidth(0.5)
    c_page.setDash([3, 3], 0)
    mid_x = start_x + badge_w + gap / 2
    c_page.line(mid_x, badge_y - 10 * mm, mid_x, badge_y + badge_h + 10 * mm)

    c_page.showPage()
    c_page.save()

    # Copie vers public et artifact
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()
    with open(os.path.join(public_dir, "badge_commercial_compact_COMPAORE_Adama.pdf"), 'wb') as f:
        f.write(pdf_bytes)
    if os.path.exists(artifact_dir):
        with open(os.path.join(artifact_dir, "badge_commercial_compact_COMPAORE_Adama.pdf"), 'wb') as f:
            f.write(pdf_bytes)

    # 2. Rendu PNG Recto & Verso en 300 DPI
    scale = 300 / 72.0

    recto_tmp = os.path.join(output_dir, "tmp_compact_recto.pdf")
    c_r = canvas.Canvas(recto_tmp, pagesize=(badge_w, badge_h))
    draw_compact_recto(c_r, 0, 0, badge_w, badge_h, commercial)
    c_r.showPage()
    c_r.save()

    verso_tmp = os.path.join(output_dir, "tmp_compact_verso.pdf")
    c_v = canvas.Canvas(verso_tmp, pagesize=(badge_w, badge_h))
    draw_compact_verso(c_v, 0, 0, badge_w, badge_h, commercial)
    c_v.showPage()
    c_v.save()

    doc_r = pypdfium2.PdfDocument(recto_tmp)
    img_r = doc_r[0].render(scale=scale).to_pil()
    recto_png = os.path.join(output_dir, "badge_compact_recto_COMPAORE_Adama.png")
    img_r.save(recto_png, format="PNG")
    img_r.save(os.path.join(public_dir, "badge_compact_recto_COMPAORE_Adama.png"), format="PNG")
    if os.path.exists(artifact_dir):
        img_r.save(os.path.join(artifact_dir, "badge_compact_recto_COMPAORE_Adama.png"), format="PNG")
    doc_r.close()

    doc_v = pypdfium2.PdfDocument(verso_tmp)
    img_v = doc_v[0].render(scale=scale).to_pil()
    verso_png = os.path.join(output_dir, "badge_compact_verso_COMPAORE_Adama.png")
    img_v.save(verso_png, format="PNG")
    img_v.save(os.path.join(public_dir, "badge_compact_verso_COMPAORE_Adama.png"), format="PNG")
    if os.path.exists(artifact_dir):
        img_v.save(os.path.join(artifact_dir, "badge_compact_verso_COMPAORE_Adama.png"), format="PNG")
    doc_v.close()

    os.remove(recto_tmp)
    os.remove(verso_tmp)

    print("Badge compact généré avec succès !")
    print(f"PDF : {pdf_path}")
    print(f"Recto PNG : {recto_png} ({img_r.width}x{img_r.height} px)")
    print(f"Verso PNG : {verso_png} ({img_v.width}x{img_v.height} px)")

if __name__ == '__main__':
    export_compact_badge()
