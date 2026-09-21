const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outputPath = path.resolve(__dirname, '..', 'Affiche_Recrutement_FasoCarnet.pdf');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 30, bottom: 30, left: 35, right: 35 },
  info: {
    Title: 'Avis de Recrutement • 10 Commerciales Terrain — FasoCarnet',
    Author: 'FasoCarnet',
    Subject: 'Campagne de Recrutement Force de Vente'
  }
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Palette
const COLOR_EMERALD_DARK = '#064e3b';
const COLOR_EMERALD = '#047857';
const COLOR_EMERALD_LIGHT = '#ecfdf5';
const COLOR_AMBER = '#d97706';
const COLOR_TEXT = '#0f172a';
const COLOR_WHITE = '#ffffff';

const pageWidth = doc.page.width;
const contentWidth = pageWidth - 70;

// 1. HEADER HERO BANNER
doc.rect(0, 0, pageWidth, 130).fill(COLOR_EMERALD_DARK);

// Badge Recrutement
doc.rect(pageWidth / 2 - 100, 18, 200, 22).fill(COLOR_AMBER);
doc.fillColor(COLOR_WHITE)
   .font('Helvetica-Bold')
   .fontSize(10)
   .text('OFFRE D\'EMPLOI • OUAGADOUGOU', 0, 24, { align: 'center', width: pageWidth });

doc.fillColor(COLOR_WHITE)
   .font('Helvetica-Bold')
   .fontSize(23)
   .text('RECRUTEMENT URGENT', 0, 48, { align: 'center', width: pageWidth });

doc.font('Helvetica-Bold')
   .fontSize(14)
   .fillColor('#a7f3d0')
   .text('10 COMMERCIALES / PROMOTRICES DE TERRAIN', 0, 78, { align: 'center', width: pageWidth });

doc.font('Helvetica')
   .fontSize(9.5)
   .fillColor('#e2e8f0')
   .text('FASOCARNET • L\'Application Digitale de Caisse & Carnet pour Commerçants', 0, 98, { align: 'center', width: pageWidth });

doc.y = 145;

// 2. CADRE INTRODUCTIF
doc.rect(35, 145, contentWidth, 38).fillAndStroke(COLOR_EMERALD_LIGHT, '#a7f3d0');
doc.fillColor(COLOR_EMERALD_DARK)
   .font('Helvetica-Bold')
   .fontSize(9.5)
   .text(
     'Rejoignez une équipe dynamique et passionnée ! FasoCarnet recrute 10 jeunes femmes motivées pour promouvoir une application innovante auprès des commerçants de la ville.',
     45,
     154,
     { width: contentWidth - 20, align: 'center' }
   );

doc.y = 195;

// Helpers pour section
function drawBox(title, items, yPos, height, borderColor = '#cbd5e1', bgColor = '#ffffff', titleColor = COLOR_EMERALD) {
  doc.rect(35, yPos, contentWidth, height).fillAndStroke(bgColor, borderColor);

  doc.rect(35, yPos, contentWidth, 24).fill(titleColor);
  doc.fillColor(COLOR_WHITE)
     .font('Helvetica-Bold')
     .fontSize(10)
     .text(title.toUpperCase(), 45, yPos + 7);

  doc.y = yPos + 32;
  items.forEach(it => {
    doc.fillColor(COLOR_TEXT)
       .font('Helvetica-Bold')
       .fontSize(8.8)
       .text(`✔  ${it.bold} : `, 45, doc.y, { continued: true })
       .font('Helvetica')
       .fillColor('#334155')
       .text(it.text, { width: contentWidth - 20 });
    doc.moveDown(0.35);
  });
}

// 3. MISSIONS DU POSTE
drawBox(
  'Vos Missions Principales',
  [
    { bold: 'Prospection Terrain', text: 'Aller à la rencontre des commerçants de votre zone (boutiques de quartier, alimentations, kiosques télécoms, salons de coiffure, librairies, quincailleries).' },
    { bold: 'Démonstration Simple', text: 'Présenter l\'application sur smartphone en 60 secondes et installer la version d\'essai gratuite (10 jours offerts).' },
    { bold: 'Activation & Vente', text: 'Accompagner les commerçants convaincus et activer leur abonnement mensuel.' },
    { bold: 'Fidélisation & Suivi', text: 'Construire une relation de confiance et suivre vos commerçants au quotidien.' }
  ],
  195,
  125,
  '#cbd5e1',
  '#ffffff',
  COLOR_EMERALD
);

// 4. PROFIL RECHERCHÉ
drawBox(
  'Profil Recherché',
  [
    { bold: 'Profil', text: 'Jeune femme dynamique, souriante, ponctuelle et très motivée.' },
    { bold: 'Communication', text: 'Excellente aisance relationnelle en Français et en Mooré (le Dioula est un atout).' },
    { bold: 'Goût du Contact', text: 'Tempérament commercial, persuasive, à l\'aise sur le terrain et autonome.' },
    { bold: 'Smartphone', text: 'À l\'aise avec l\'utilisation des smartphones et de WhatsApp.' },
    { bold: 'Disponibilité', text: 'Disponibilité immédiate à Ouagadougou (plein temps ou temps partiel structuré).' }
  ],
  330,
  135,
  '#cbd5e1',
  '#ffffff',
  '#0f766e' // Teal
);

// 5. RÉMUNÉRATION & AVANTAGES
drawBox(
  'Rémunération & Avantages Très Attractifs',
  [
    { bold: 'Salaire Fixe Garanti', text: '35 000 FCFA / mois assurés.' },
    { bold: 'Commissions Directes', text: '500 FCFA sur chaque abonnement vendu (Gains réels de 85 000 F à 150 000+ FCFA / mois selon vos performances).' },
    { bold: 'Primes Spéciales', text: 'Bonus chaque vendredi soir pour la meilleure vendeuse de la semaine.' },
    { bold: 'Formation Complète Offerte', text: 'Bootcamp pratique de 2 jours sur l\'application et les techniques de vente.' },
    { bold: 'Kit Professionnel Fourni', text: 'Polo/T-shirt officiel FasoCarnet, badge professionnel et supports marketing.' }
  ],
  475,
  145,
  '#fde68a',
  '#fffbeb',
  COLOR_AMBER
);

// 6. CONTACT & CANDIDATURE
const contactY = 630;
doc.rect(35, contactY, contentWidth, 120).fillAndStroke(COLOR_EMERALD_DARK, COLOR_EMERALD);

doc.fillColor(COLOR_WHITE)
   .font('Helvetica-Bold')
   .fontSize(12)
   .text('COMMENT POSTULER ?', 0, contactY + 12, { align: 'center', width: pageWidth });

doc.font('Helvetica')
   .fontSize(9.5)
   .fillColor('#a7f3d0')
   .text('Les candidatures sont ouvertes immédiatement. Places limitées (10 postes disponibles).', 0, contactY + 30, { align: 'center', width: pageWidth });

// Boîte contact
doc.rect(pageWidth / 2 - 170, contactY + 50, 340, 42).fill(COLOR_WHITE);

doc.fillColor(COLOR_EMERALD_DARK)
   .font('Helvetica-Bold')
   .fontSize(11)
   .text('Envoyez « CANDIDATURE FASOCARNET »', pageWidth / 2 - 160, contactY + 58, { align: 'center', width: 320 });

doc.fillColor(COLOR_AMBER)
   .font('Helvetica-Bold')
   .fontSize(13)
   .text('WhatsApp / Tél : (+226) 65 61 61 34', pageWidth / 2 - 160, contactY + 74, { align: 'center', width: 320 });

doc.font('Helvetica')
   .fontSize(8)
   .fillColor('#94a3b8')
   .text('Ouagadougou, Burkina Faso • www.fasocarnet.com', 0, contactY + 102, { align: 'center', width: pageWidth });

doc.end();

writeStream.on('finish', () => {
  console.log('Affiche de recrutement PDF generated successfully at:', outputPath);
});
