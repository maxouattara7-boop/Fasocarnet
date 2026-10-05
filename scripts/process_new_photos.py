import os
from PIL import Image, ImageEnhance, ImageFilter

input_dir = r"C:\Users\Maxime OUATTARA\.gemini\antigravity\brain\66e4de5c-eedc-467f-8a3a-0ff2e9a32ed3\.user_uploaded"
output_dir = os.path.join(os.getcwd(), "docs", "photos_traitees")
os.makedirs(output_dir, exist_ok=True)

photos_config = {
    'COMPAORE_Nadiatou_Lethycia': {
        'file': 'media_1791155257946.png',
        # Cadrage visage et robe violette, exclure la bulle et le badge HD / 11:32
        'crop': (7, 7, 225, 290),
        'desc': 'COMPAORE Nadiatou Lethycia'
    },
    'YANOGO_W_Christiane': {
        'file': 'media_1791155281039.png',
        # Cadrage visage et foulard orange, exclure 'Transféré' en haut et barre Camon 30 en bas
        'crop': (5, 24, 222, 298),
        'desc': 'YANOGO W. Christiane'
    }
}

target_w = 630  # 300 DPI pour format 21 mm
target_h = 720  # 300 DPI pour format 24 mm
target_ratio = target_w / float(target_h)

for key, cfg in photos_config.items():
    src_path = os.path.join(input_dir, cfg['file'])
    im = Image.open(src_path).convert('RGB')
    
    # 1. Découpage du cadre
    cropped = im.crop(cfg['crop'])
    cw, ch = cropped.size
    aspect = cw / float(ch)
    
    # 2. Ratio 21:24 portrait centré
    if aspect > target_ratio:
        new_w = int(ch * target_ratio)
        offset = (cw - new_w) // 2
        box = (offset, 0, offset + new_w, ch)
    else:
        new_h = int(cw / target_ratio)
        box = (0, 0, cw, min(ch, new_h))
    framed = cropped.crop(box)
    
    # 3. Suréchantillonnage haute résolution Lanczos
    upscaled = framed.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # 4. Amélioration de la netteté et de l'éclat
    enh_sharp = ImageEnhance.Sharpness(upscaled).enhance(1.4)
    enh_contrast = ImageEnhance.Contrast(enh_sharp).enhance(1.08)
    enh_color = ImageEnhance.Color(enh_contrast).enhance(1.05)
    
    out_file = f"photo_{key}.png"
    out_path = os.path.join(output_dir, out_file)
    enh_color.save(out_path, format="PNG")
    print(f"[OK] Photo traitee et amelioree : {cfg['desc']} -> {out_file} ({target_w}x{target_h})")
