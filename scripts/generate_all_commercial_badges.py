import os
import sys
sys.path.insert(0, os.getcwd())
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
import pypdfium2
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from scripts.generate_commercial_badge import draw_badge_recto, draw_badge_verso

COMMERCIAUX = [
    {
        'name': 'COMPAORÉ Adama',
        'slug': 'COMPAORE_Adama',
        'code': 'COMPAORE226',
        'phone': '+226 61 97 45 21',
        'zone': 'Ouagadougou'
    },
    {
        'name': 'SARÉ Falilatou',
        'slug': 'SARE_Falilatou',
        'code': 'SARE226',
        'phone': '+226 55 49 01 99',
        'zone': 'Ouagadougou'
    },
    {
        'name': 'SARÉ Salamatou',
        'slug': 'SARE_Salamatou',
        'code': 'SARE7',
        'phone': '+226 75 17 01 08',
        'zone': 'Ouagadougou'
    },
    {
        'name': 'SOGLI Rebécca',
        'slug': 'SOGLI_Rebecca',
        'code': 'SOGLI226',
        'phone': '+226 56 56 95 68',
        'zone': 'Ouagadougou'
    }
]

def generate_individual_badge(commercial, output_dir, public_dir, artifact_dir):
    """Génère la planche A4 individuelle pour un commercial et ses PNGs haute définition"""
    slug = commercial['slug']
    pdf_filename = f"badge_commercial_{slug}.pdf"
    output_pdf = os.path.join(output_dir, pdf_filename)
    public_pdf = os.path.join(public_dir, pdf_filename)
    
    c = canvas.Canvas(output_pdf, pagesize=A4)
    page_w, page_h = A4
    
    badge_w = 54 * mm
    badge_h = 85.6 * mm
    gap = 14 * mm
    
    # En-tête de la page
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(colors.HexColor('#064e3b'))
    c.drawCentredString(page_w / 2, page_h - 22 * mm, "BADGE OFFICIEL COMMERCIAL TERRAIN")
    
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawCentredString(page_w / 2, page_h - 27 * mm, f"Agent : {commercial['name']} • Code : {commercial['code']} • Format CR80 (54 x 85.6 mm)")
    
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.75)
    c.line(20 * mm, page_h - 31 * mm, page_w - 20 * mm, page_h - 31 * mm)
    
    total_w = badge_w * 2 + gap
    start_x = (page_w - total_w) / 2
    badge_y = (page_h - badge_h) / 2 - 5 * mm
    
    recto_x = start_x
    verso_x = start_x + badge_w + gap
    
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor('#0f172a'))
    c.drawCentredString(recto_x + badge_w / 2, badge_y + badge_h + 4 * mm, "FACE AVANT (RECTO)")
    c.drawCentredString(verso_x + badge_w / 2, badge_y + badge_h + 4 * mm, "FACE ARRIÈRE (VERSO / QR CODE)")
    
    # Rendu des deux faces
    draw_badge_recto(c, recto_x, badge_y, badge_w, badge_h, commercial)
    draw_badge_verso(c, verso_x, badge_y, badge_w, badge_h, commercial)
    
    # Repères pointillés
    c.setStrokeColor(colors.HexColor('#94a3b8'))
    c.setLineWidth(0.5)
    c.setDash([3, 3], 0)
    mid_x = start_x + badge_w + gap / 2
    c.line(mid_x, badge_y - 8 * mm, mid_x, badge_y + badge_h + 8 * mm)
    
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawCentredString(mid_x, badge_y - 12 * mm, "Ligne de coupe / Pliage central")
    
    # Instructions
    instruct_box_y = 25 * mm
    instruct_box_h = 24 * mm
    instruct_box_w = page_w - 40 * mm
    instruct_box_x = 20 * mm
    
    c.setDash([], 0)
    c.setFillColor(colors.HexColor('#f8fafc'))
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.75)
    c.roundRect(instruct_box_x, instruct_box_y, instruct_box_w, instruct_box_h, 3 * mm, fill=1, stroke=1)
    
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(colors.HexColor('#064e3b'))
    c.drawString(instruct_box_x + 5 * mm, instruct_box_y + 17 * mm, "GUIDE D'IMPRESSION DU BADGE :")
    
    instructions = [
        "1. Imprimez cette page sur du papier bristol / cartonné blanc (180g à 250g) en taille réelle (échelle 100%).",
        "2. Découpez le Recto et le Verso le long des bordures extérieures (format carte bancaire 54 x 85.6 mm).",
        "3. Insérez le badge assemblé dans un porte-badge transparent standard CR80 avec cordon tour de cou."
    ]
    for i, line in enumerate(instructions):
        c.setFont("Helvetica", 7.5)
        c.setFillColor(colors.HexColor('#334155'))
        c.drawString(instruct_box_x + 5 * mm, instruct_box_y + 11.5 * mm - i * 4.5 * mm, line)
        
    c.showPage()
    c.save()
    
    # Copie vers public et artifact
    with open(output_pdf, 'rb') as f:
        pdf_bytes = f.read()
    with open(public_pdf, 'wb') as f:
        f.write(pdf_bytes)
    if os.path.exists(artifact_dir):
        with open(os.path.join(artifact_dir, pdf_filename), 'wb') as f:
            f.write(pdf_bytes)
            
    # Génération des images PNG 300 DPI
    scale = 300 / 72.0
    
    # Recto
    temp_r = os.path.join(output_dir, f"temp_r_{slug}.pdf")
    cr = canvas.Canvas(temp_r, pagesize=(badge_w, badge_h))
    draw_badge_recto(cr, 0, 0, badge_w, badge_h, commercial)
    cr.showPage()
    cr.save()
    
    pdf_r = pypdfium2.PdfDocument(temp_r)
    img_r = pdf_r[0].render(scale=scale).to_pil()
    recto_png = f"badge_recto_{slug}.png"
    img_r.save(os.path.join(output_dir, recto_png), format="PNG")
    img_r.save(os.path.join(public_dir, recto_png), format="PNG")
    if os.path.exists(artifact_dir):
        img_r.save(os.path.join(artifact_dir, recto_png), format="PNG")
    pdf_r.close()
    if os.path.exists(temp_r):
        os.remove(temp_r)
        
    # Verso
    temp_v = os.path.join(output_dir, f"temp_v_{slug}.pdf")
    cv = canvas.Canvas(temp_v, pagesize=(badge_w, badge_h))
    draw_badge_verso(cv, 0, 0, badge_w, badge_h, commercial)
    cv.showPage()
    cv.save()
    
    pdf_v = pypdfium2.PdfDocument(temp_v)
    img_v = pdf_v[0].render(scale=scale).to_pil()
    verso_png = f"badge_verso_{slug}.png"
    img_v.save(os.path.join(output_dir, verso_png), format="PNG")
    img_v.save(os.path.join(public_dir, verso_png), format="PNG")
    if os.path.exists(artifact_dir):
        img_v.save(os.path.join(artifact_dir, verso_png), format="PNG")
    pdf_v.close()
    if os.path.exists(temp_v):
        os.remove(temp_v)
        
    print(f"[OK] Badge genere pour {commercial['name']} ({commercial['code']})")


def generate_collective_sheet(commerciaux, output_dir, public_dir, artifact_dir):
    """
    Génère une planche A4 collective optimisée pour imprimerie :
    Page 1 : Les 4 Rectos (2 x 2)
    Page 2 : Les 4 Versos (2 x 2) en miroir pour impression recto-verso parfaite !
    """
    pdf_filename = "planche_badges_commerciaux_tous.pdf"
    output_pdf = os.path.join(output_dir, pdf_filename)
    public_pdf = os.path.join(public_dir, pdf_filename)
    
    c = canvas.Canvas(output_pdf, pagesize=A4)
    page_w, page_h = A4
    
    badge_w = 54 * mm
    badge_h = 85.6 * mm
    
    # Grille 2 colonnes x 2 lignes centrée sur la page A4
    gap_x = 18 * mm
    gap_y = 16 * mm
    grid_total_w = 2 * badge_w + gap_x
    grid_total_h = 2 * badge_h + gap_y
    
    grid_start_x = (page_w - grid_total_w) / 2
    grid_start_y = (page_h - grid_total_h) / 2 - 5 * mm
    
    # Positions des 4 emplacements (0: haut-gauche, 1: haut-droite, 2: bas-gauche, 3: bas-droite)
    pos_coords = [
        (grid_start_x, grid_start_y + badge_h + gap_y),                         # Ligne 1, Col 1
        (grid_start_x + badge_w + gap_x, grid_start_y + badge_h + gap_y),       # Ligne 1, Col 2
        (grid_start_x, grid_start_y),                                           # Ligne 2, Col 1
        (grid_start_x + badge_w + gap_x, grid_start_y)                          # Ligne 2, Col 2
    ]
    
    # -------------------------------------------------------------
    # PAGE 1 : LES 4 RECTOS
    # -------------------------------------------------------------
    c.setFont("Helvetica-Bold", 15)
    c.setFillColor(colors.HexColor('#064e3b'))
    c.drawCentredString(page_w / 2, page_h - 18 * mm, "FASOCARNET • PLANCHE D'IMPRESSION DES BADGES COMMERCIAUX")
    
    c.setFont("Helvetica", 8.5)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawCentredString(page_w / 2, page_h - 23 * mm, "PAGE 1 : FACES AVANT (RECTO) • 4 COMMERCIAUX TERRAIN ACCRÉDITÉS")
    
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.75)
    c.line(20 * mm, page_h - 26 * mm, page_w - 20 * mm, page_h - 26 * mm)
    
    for i, comm in enumerate(commerciaux):
        bx, by = pos_coords[i]
        draw_badge_recto(c, bx, by, badge_w, badge_h, comm)
        # Petit label au-dessus
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(colors.HexColor('#64748b'))
        c.drawCentredString(bx + badge_w / 2, by + badge_h + 2 * mm, f"Recto • {comm['name']} ({comm['code']})")
        
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(colors.HexColor('#94a3b8'))
    c.drawCentredString(page_w / 2, 12 * mm, "Imprimer à l'échelle 100% (sans redimensionnement) sur papier couché ou cartonné blanc")
    c.showPage()
    
    # -------------------------------------------------------------
    # PAGE 2 : LES 4 VERSOS (en miroir horizontal pour recto-verso direct)
    # L'emplacement haut-gauche au recto correspond à haut-droite au verso pour l'impression retournée !
    # -------------------------------------------------------------
    c.setFont("Helvetica-Bold", 15)
    c.setFillColor(colors.HexColor('#064e3b'))
    c.drawCentredString(page_w / 2, page_h - 18 * mm, "FASOCARNET • PLANCHE D'IMPRESSION DES BADGES COMMERCIAUX")
    
    c.setFont("Helvetica", 8.5)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawCentredString(page_w / 2, page_h - 23 * mm, "PAGE 2 : FACES ARRIÈRE (VERSO / QR CODES) • ALIGNÉES POUR RECTO-VERSO")
    
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.setLineWidth(0.75)
    c.line(20 * mm, page_h - 26 * mm, page_w - 20 * mm, page_h - 26 * mm)
    
    # Ordre inversé sur l'axe X pour le dos : col 1 <-> col 2
    verso_coords = [
        (grid_start_x + badge_w + gap_x, grid_start_y + badge_h + gap_y),       # correspond à Recto 0
        (grid_start_x, grid_start_y + badge_h + gap_y),                         # correspond à Recto 1
        (grid_start_x + badge_w + gap_x, grid_start_y),                          # correspond à Recto 2
        (grid_start_x, grid_start_y)                                            # correspond à Recto 3
    ]
    
    for i, comm in enumerate(commerciaux):
        bx, by = verso_coords[i]
        draw_badge_verso(c, bx, by, badge_w, badge_h, comm)
        # Petit label au-dessus
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(colors.HexColor('#64748b'))
        c.drawCentredString(bx + badge_w / 2, by + badge_h + 2 * mm, f"Verso QR • {comm['name']} ({comm['code']})")
        
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(colors.HexColor('#94a3b8'))
    c.drawCentredString(page_w / 2, 12 * mm, "Retourner la page sur le bord long (Flip on long edge) pour impression recto-verso")
    c.showPage()
    
    c.save()
    
    with open(output_pdf, 'rb') as f:
        pdf_bytes = f.read()
    with open(public_pdf, 'wb') as f:
        f.write(pdf_bytes)
    if os.path.exists(artifact_dir):
        with open(os.path.join(artifact_dir, pdf_filename), 'wb') as f:
            f.write(pdf_bytes)
            
    print(f"[OK] Planche collective 4 badges generée : {output_pdf}")


def main():
    output_dir = os.path.join(os.getcwd(), "docs")
    public_dir = os.path.join(os.getcwd(), "public")
    artifact_dir = r"C:\Users\Maxime OUATTARA\.gemini\antigravity\brain\23e09812-2870-45e7-9025-1667cd904de7"
    
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)
    
    print(f"Génération des badges pour {len(COMMERCIAUX)} commerciaux...")
    for comm in COMMERCIAUX:
        generate_individual_badge(comm, output_dir, public_dir, artifact_dir)
        
    generate_collective_sheet(COMMERCIAUX, output_dir, public_dir, artifact_dir)
    print("\nTous les badges et planches ont été générés avec succès !")

if __name__ == '__main__':
    main()
