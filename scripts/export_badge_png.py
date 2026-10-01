import os
import sys
sys.path.insert(0, os.getcwd())
import pypdfium2
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from scripts.generate_commercial_badge import draw_badge_recto, draw_badge_verso

def export_badge_images():
    commercial = {
        'name': 'COMPAORE Adama',
        'code': 'COMPAORE226',
        'phone': '+226 61 97 45 21',
        'zone': 'Ouagadougou'
    }

    badge_w = 70 * mm
    badge_h = 105 * mm

    output_dir = os.path.join(os.getcwd(), "docs")
    public_dir = os.path.join(os.getcwd(), "public")
    artifact_dir = r"C:\Users\Maxime OUATTARA\.gemini\antigravity\brain\23e09812-2870-45e7-9025-1667cd904de7"

    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)

    # 1. Générer le PDF Recto seul
    recto_pdf = os.path.join(output_dir, "temp_recto.pdf")
    c_recto = canvas.Canvas(recto_pdf, pagesize=(badge_w, badge_h))
    draw_badge_recto(c_recto, 0, 0, badge_w, badge_h, commercial)
    c_recto.showPage()
    c_recto.save()

    # 2. Générer le PDF Verso seul
    verso_pdf = os.path.join(output_dir, "temp_verso.pdf")
    c_verso = canvas.Canvas(verso_pdf, pagesize=(badge_w, badge_h))
    draw_badge_verso(c_verso, 0, 0, badge_w, badge_h, commercial)
    c_verso.showPage()
    c_verso.save()

    # 3. Rendu haute résolution PNG via pypdfium2 (300 DPI -> scale = 300/72 ≈ 4.166)
    scale = 300 / 72.0

    # Rendu Recto
    pdf_r = pypdfium2.PdfDocument(recto_pdf)
    page_r = pdf_r[0]
    img_r = page_r.render(scale=scale).to_pil()
    recto_png_docs = os.path.join(output_dir, "badge_recto_COMPAORE_Adama.png")
    img_r.save(recto_png_docs, format="PNG")
    img_r.save(os.path.join(public_dir, "badge_recto_COMPAORE_Adama.png"), format="PNG")
    if os.path.exists(artifact_dir):
        img_r.save(os.path.join(artifact_dir, "badge_recto_COMPAORE_Adama.png"), format="PNG")
    pdf_r.close()

    # Rendu Verso
    pdf_v = pypdfium2.PdfDocument(verso_pdf)
    page_v = pdf_v[0]
    img_v = page_v.render(scale=scale).to_pil()
    verso_png_docs = os.path.join(output_dir, "badge_verso_COMPAORE_Adama.png")
    img_v.save(verso_png_docs, format="PNG")
    img_v.save(os.path.join(public_dir, "badge_verso_COMPAORE_Adama.png"), format="PNG")
    if os.path.exists(artifact_dir):
        img_v.save(os.path.join(artifact_dir, "badge_verso_COMPAORE_Adama.png"), format="PNG")
    pdf_v.close()

    # Nettoyage des PDF temporaires
    if os.path.exists(recto_pdf):
        os.remove(recto_pdf)
    if os.path.exists(verso_pdf):
        os.remove(verso_pdf)

    print(f"Recto exporté : {recto_png_docs} ({img_r.width}x{img_r.height} px)")
    print(f"Verso exporté : {verso_png_docs} ({img_v.width}x{img_v.height} px)")

if __name__ == '__main__':
    export_badge_images()
