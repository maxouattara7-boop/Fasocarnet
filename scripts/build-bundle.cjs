const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const distDir = path.resolve(__dirname, '..', 'dist');
const distZip = path.resolve(__dirname, '..', 'dist.zip');
const publicDistZip = path.resolve(distDir, 'dist.zip');

if (fs.existsSync(distDir)) {
  const zip = new AdmZip();
  zip.addLocalFolder(distDir);
  zip.writeZip(distZip);
  // Copier aussi dans dist/dist.zip pour être servi directement sur https://fasocarnet.onrender.com/dist.zip
  fs.copyFileSync(distZip, publicDistZip);
  console.log(`[build-bundle] dist.zip créé avec succès (${(fs.statSync(distZip).size / 1024 / 1024).toFixed(2)} MB)`);
} else {
  console.error('[build-bundle] Le dossier dist/ est introuvable.');
}
