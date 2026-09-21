import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SVG_PATH = path.resolve('public/icon-512.svg');
const RES_DIR = path.resolve('android/app/src/main/res');

const densities = [
  { name: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
  { name: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
  { name: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
  { name: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
  { name: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const { name, iconSize, fgSize } of densities) {
    const dir = path.join(RES_DIR, name);
    fs.mkdirSync(dir, { recursive: true });

    // ic_launcher.png
    await sharp(svgBuffer)
      .resize(iconSize, iconSize)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // ic_launcher_round.png (with circular mask)
    const circleMask = Buffer.from(
      `<svg width="${iconSize}" height="${iconSize}"><circle cx="${iconSize/2}" cy="${iconSize/2}" r="${iconSize/2}" fill="#fff"/></svg>`
    );
    await sharp(svgBuffer)
      .resize(iconSize, iconSize)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png (safe zone: center 66% of fgSize)
    const innerSize = Math.round(fgSize * 0.68);
    const innerPadding = Math.round((fgSize - innerSize) / 2);

    const innerFg = await sharp(svgBuffer)
      .resize(innerSize, innerSize)
      .toBuffer();

    await sharp({
      create: {
        width: fgSize,
        height: fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: innerFg, top: innerPadding, left: innerPadding }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`✓ Generated icons for ${name}`);
  }

  // Update ic_launcher_background color
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#059669</color>\n</resources>\n`;
  fs.writeFileSync(path.join(RES_DIR, 'values/ic_launcher_background.xml'), bgXml);

  console.log('🎉 All Android app icons generated successfully from FasoCarnet logo!');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
