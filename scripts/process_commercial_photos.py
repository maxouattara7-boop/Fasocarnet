import os
from PIL import Image, ImageEnhance, ImageFilter

input_dir = r"C:\Users\Maxime OUATTARA\.gemini\antigravity\brain\66e4de5c-eedc-467f-8a3a-0ff2e9a32ed3\.user_uploaded"
output_dir = os.path.join(os.getcwd(), "docs", "photos_traitees")
os.makedirs(output_dir, exist_ok=True)

photos_config = {
    'NACOULMA_Judicaela': {
        'file': 'media_1791154854934.png',
        # Visage centré, exclure la bulle et le timestamp 22:23
        'crop': (5, 5, 214, 222),
        'desc': 'NACOULMA Judicaëla'
    },
    'SAVADOGO_Rimnomma_Cyprien': {
        'file': 'media_1791154925040.png',
        # Visage et costume, exclure fond bas
        'crop': (8, 6, 258, 275),
        'desc': 'SAVADOGO Rimnomma Cyprien'
    },
    'TENKODOGO_Aminata': {
        'file': 'media_1791154953082.png',
        # Portrait visage et voile fuchsia
        'crop': (12, 10, 222, 290),
        'desc': 'TENKODOGO Aminata'
    },
    'OUEDRAOGO_Stecie': {
        'file': 'media_1791155060088.png',
        # Portrait et sourire avec robe argentée
        'crop': (3, 3, 218, 250),
        'desc': 'OUEDRAOGO Stécie'
    },
    'ILY_Pouekomba_Hyppolite': {
        'file': 'media_1791154896707.png',
        # Cadrer le buste et le visage de ILY Pouékomba Hyppolite
        'crop': (15, 10, 215, 260),
        'desc': 'ILY Pouékomba Hyppolite'
    }
}

target_w = 630  # 300 DPI pour format 21 mm
target_h = 720  # 300 DPI pour format 24 mm
target_ratio = target_w / float(target_h)

for key, cfg in photos_config.items():
    src_path = os.path.join(input_dir, cfg['file'])
    im = Image.open(src_path).convert('RGB')
    
    # Étape 1 : Recadrage pour éliminer l'interface WhatsApp
    cropped = im.crop(cfg['crop'])
    cw, ch = cropped.size
    aspect = cw / float(ch)
    
    # Étape 2 : Recadrage ratio 21:24 portrait
    if aspect > target_ratio:
        new_w = int(ch * target_ratio)
        offset = (cw - new_w) // 2
        box = (offset, 0, offset + new_w, ch)
    else:
        new_h = int(cw / target_ratio)
        box = (0, 0, cw, min(ch, new_h))
    framed = cropped.crop(box)
    
    # Étape 3 : Suréchantillonnage haute résolution Lanczos
    upscaled = framed.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Étape 4 : Amélioration de la netteté et de l'éclat
    enh_sharp = ImageEnhance.Sharpness(upscaled).enhance(1.4)
    enh_contrast = ImageEnhance.Contrast(enh_sharp).enhance(1.08)
    enh_color = ImageEnhance.Color(enh_contrast).enhance(1.05)
    
    out_file = f"photo_{key}.png"
    out_path = os.path.join(output_dir, out_file)
    enh_color.save(out_path, format="PNG")
    print(f"[OK] Photo traitee et amelioree : {cfg['desc']} -> {out_file} ({target_w}x{target_h})")
