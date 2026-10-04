import os
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import numpy as np

OUTPUT_DIR = os.path.join(os.getcwd(), "docs", "photos_traitees")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def enhance_portrait(im_crop, brightness=1.05, contrast=1.12, sharpness=1.4, color=1.05, unsharp_radius=1.5, unsharp_percent=130):
    """
    Restaure et sublime un portrait :
    1. Agrandissement haute qualité Lanczos x2 pour lissage des artefacts et netteté
    2. Débouchage des ombres subtil via courbe de transfert
    3. Amélioration des contrastes, luminosité et couleurs
    4. Masque flou (UnsharpMask) haute précision pour des détails ultra-nets (yeux, lèvres, textures)
    """
    # 1. Redimensionnement haute résolution (hauteur 600 px pour le badge)
    target_h = 600
    target_w = int(target_h * (21.0 / 24.0)) # 525 px, ratio exact 21x24 mm
    im_resized = im_crop.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # 2. Correction colorimétrique fine avec NumPy
    arr = np.array(im_resized, dtype=np.float32) / 255.0
    
    # Légère correction gamma / courbe en S douce pour contraster sans brûler les tons chairs
    # Shadow lift (débouchage ombres légères)
    arr = np.where(arr < 0.5, arr * 1.04, arr)
    arr = np.clip(arr, 0.0, 1.0)
    arr = (arr * 255.0).astype(np.uint8)
    enhanced = Image.fromarray(arr)
    
    # 3. Luminosité & Contraste
    if brightness != 1.0:
        enhanced = ImageEnhance.Brightness(enhanced).enhance(brightness)
    if contrast != 1.0:
        enhanced = ImageEnhance.Contrast(enhanced).enhance(contrast)
    if color != 1.0:
        enhanced = ImageEnhance.Color(enhanced).enhance(color)
        
    # 4. Amélioration du piqué et de la netteté (Unsharp Masking photo pro)
    enhanced = enhanced.filter(ImageFilter.UnsharpMask(radius=unsharp_radius, percent=unsharp_percent, threshold=2))
    if sharpness != 1.0:
        enhanced = ImageEnhance.Sharpness(enhanced).enhance(sharpness)
        
    return enhanced

# -------------------------------------------------------------
# 1. COMPAORE ADAMA
# -------------------------------------------------------------
path_adama = r"C:\Users\Maxime OUATTARA\.gemini\antigravity\brain\23e09812-2870-45e7-9025-1667cd904de7\.user_uploaded\media_1791116435013.png"
im_adama = Image.open(path_adama).convert('RGB')
# Crop de la photo : exclure la bordure blanche whatsapp du bas (y > 308) et les bords whatsapp
# Dimensions photo utile : x: 10 à 245, y: 8 à 306
# Ratio 21/24 = 0.875. Avec hauteur 298 px -> largeur cible = 298 * 0.875 = 260.
# Comme largeur dispo = 235 px -> hauteur cible = 235 / 0.875 = 268 px.
# Centrage sur le visage (x centre ≈ 128, y de 12 à 280)
crop_adama = im_adama.crop((9, 14, 245, 284))
proc_adama = enhance_portrait(crop_adama, brightness=1.06, contrast=1.10, sharpness=1.35, color=1.08, unsharp_radius=1.4, unsharp_percent=125)
proc_adama.save(os.path.join(OUTPUT_DIR, "photo_COMPAORE_Adama.png"))
print("[OK] Traitement photo Adama termine")

# -------------------------------------------------------------
# 2. FALILATOU SARE
# -------------------------------------------------------------
path_falilatou = r"C:\Users\Maxime OUATTARA\.gemini\antigravity\brain\23e09812-2870-45e7-9025-1667cd904de7\.user_uploaded\media_1791116395843.png"
im_falilatou = Image.open(path_falilatou).convert('RGB')
# Photo utile : y de 8 à 254 (hauteur = 246 px).
# Pour ratio 0.875 -> largeur = 246 * 0.875 = 215 px.
# Largeur totale dispo = 346 px. Le visage est centré vers x ≈ 173.
# x de (173 - 108) = 65 à (173 + 107) = 280.
crop_falilatou = im_falilatou.crop((65, 8, 280, 254))
proc_falilatou = enhance_portrait(crop_falilatou, brightness=1.05, contrast=1.14, sharpness=1.45, color=1.10, unsharp_radius=1.5, unsharp_percent=140)
proc_falilatou.save(os.path.join(OUTPUT_DIR, "photo_SARE_Falilatou.png"))
print("[OK] Traitement photo Falilatou termine")

# -------------------------------------------------------------
# 3. SALAMATOU SARE
# -------------------------------------------------------------
path_salamatou = r"C:\Users\Maxime OUATTARA\.gemini\antigravity\brain\23e09812-2870-45e7-9025-1667cd904de7\.user_uploaded\media_1791116415112.png"
im_salamatou = Image.open(path_salamatou).convert('RGB')
arr_s = np.array(im_salamatou)
# Nettoyage du petit chevron blanc WhatsApp en haut à droite (x: 215 à 245, y: 10 à 35)
# Remplissage par la couleur du mur voisin à gauche (x: 180 à 210, y: 10 à 35)
wall_patch = arr_s[10:35, 175:205]
arr_s[10:35, 215:245] = wall_patch
im_clean_s = Image.fromarray(arr_s)

# Photo utile : y de 10 à 310 (hauteur = 300 px).
# Largeur dispo = 240 px (de 6 à 244).
# Ratio 0.875 : largeur 236 px -> hauteur = 236 / 0.875 = 270 px.
# Centrons verticalement sur le visage et le hijab : y de 25 à 295
crop_salamatou = im_clean_s.crop((7, 26, 243, 296))
proc_salamatou = enhance_portrait(crop_salamatou, brightness=1.08, contrast=1.15, sharpness=1.45, color=1.12, unsharp_radius=1.5, unsharp_percent=135)
proc_salamatou.save(os.path.join(OUTPUT_DIR, "photo_SARE_Salamatou.png"))
print("[OK] Traitement photo Salamatou termine")
