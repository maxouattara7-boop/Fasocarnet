const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outputPath = path.resolve(__dirname, '..', 'Plan_Strategique_Marketing_FasoCarnet.pdf');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 40, bottom: 40, left: 45, right: 45 },
  info: {
    Title: 'Plan Stratégique Marketing & Commercial — FasoCarnet',
    Author: 'FasoCarnet',
    Subject: 'Guide Opérationnel & Stratégie Force de Vente'
  }
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Palette de couleurs
const COLOR_PRIMARY = '#065f46'; // Émeraude sombre
const COLOR_SECONDARY = '#047857';
const COLOR_ACCENT = '#d97706'; // Ambre
const COLOR_TEXT = '#1e293b'; // Slate 800
const COLOR_MUTED = '#64748b';
const COLOR_BG_LIGHT = '#f8fafc';
const COLOR_CARD_BORDER = '#e2e8f0';

// Helpers de mise en page
function drawHeader() {
  // Bandeau supérieur
  doc.rect(0, 0, doc.page.width, 100).fill(COLOR_PRIMARY);

  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(20)
     .text('FASOCARNET', 45, 25, { tracking: 2 });

  doc.font('Helvetica')
     .fontSize(11)
     .fillColor('#a7f3d0')
     .text('PLAN STRATÉGIQUE MARKETING & DÉPLOIEMENT TERRAIN', 45, 50);

  doc.fontSize(9)
     .fillColor('#ffffff')
     .text('Guide Opérationnel • Force de Vente • Cibles • Formation', 45, 68);

  doc.y = 115;
}

function drawSectionTitle(numberStr, titleStr) {
  const currentY = doc.y;
  if (currentY > 680) {
    doc.addPage();
  }

  doc.moveDown(0.8);
  const y = doc.y;

  // Pastille numéro
  doc.rect(45, y, 22, 22).fill(COLOR_SECONDARY);
  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(11)
     .text(numberStr, 45, y + 5, { width: 22, align: 'center' });

  // Titre
  doc.fillColor(COLOR_PRIMARY)
     .font('Helvetica-Bold')
     .fontSize(13)
     .text(titleStr.toUpperCase(), 75, y + 4);

  // Ligne de soulignement
  doc.strokeColor(COLOR_SECONDARY)
     .lineWidth(1)
     .moveTo(45, y + 27)
     .lineTo(doc.page.width - 45, y + 27)
     .stroke();

  doc.moveDown(0.8);
}

function drawItem(title, text) {
  doc.font('Helvetica-Bold')
     .fontSize(10)
     .fillColor(COLOR_TEXT)
     .text(`• ${title} : `, { continued: true })
     .font('Helvetica')
     .fillColor('#334155')
     .text(text);
  doc.moveDown(0.4);
}

function drawCard(title, description, iconText = '✔') {
  const y = doc.y;
  const cardWidth = doc.page.width - 90;
  const textHeight = 44;

  if (y + textHeight + 15 > 740) {
    doc.addPage();
  }

  const startY = doc.y;
  doc.rect(45, startY, cardWidth, textHeight)
     .fillAndStroke(COLOR_BG_LIGHT, COLOR_CARD_BORDER);

  doc.fillColor(COLOR_PRIMARY)
     .font('Helvetica-Bold')
     .fontSize(10)
     .text(`${iconText} ${title}`, 55, startY + 8);

  doc.fillColor('#475569')
     .font('Helvetica')
     .fontSize(8.5)
     .text(description, 55, startY + 22, { width: cardWidth - 20 });

  doc.y = startY + textHeight + 6;
}

// ==================== PAGE 1 ====================
drawHeader();

// SECTION 1
drawSectionTitle('1', 'Proposition de Valeur Unique (Pourquoi FasoCarnet ?)');

drawCard(
  'Zéro Perte sur les Dettes & Crédits (Carnet Digital)',
  'Remplace définitivement les cahiers papier mouillés, déchirés ou perdus. Permet une relance WhatsApp automatique, polie et instantanée en 1 clic avec le détail exact du reste à payer.'
);

drawCard(
  'Création de Reçus Professionnels Imprimables Directement',
  'Génération instantanée de tickets de caisse personnalisés. Impression directe sur imprimantes thermiques Bluetooth (58mm / 80mm) et partage immédiat sur WhatsApp.'
);

drawCard(
  'Caisse Tactile Express & Scanner Code-Barres Intégré',
  'Calculatrice et clavier rapide évitant les erreurs de calcul mental. Scanner caméra et douchette laser pour ajouter les articles au panier en une fraction de seconde.'
);

drawCard(
  '100% Fonctionnel Hors-Ligne (Sans Connexion Internet)',
  'Conçue sur-mesure pour les réalités africaines : aucune coupure de réseau ne bloque les encaissements quotidiens.'
);

drawCard(
  'Tarif Accessible avec 10 Jours d\'Essai Gratuits',
  'Seulement 2 000 FCFA / mois (moins de 70 FCFA par jour) avec 10 jours de test 100% gratuits sans aucun engagement pour convaincre immédiatement le commerçant.'
);

doc.moveDown(0.5);

// SECTION 2
drawSectionTitle('2', 'Segmentation de la Cible (Le Cœur de Cible)');

const targets = [
  {
    name: 'Boutiques de Quartier & Alimentations Générales',
    desc: 'Boutiques d\'angle, supérettes. Priorité : élimination des pertes sur les dettes et rapidité de calcul.'
  },
  {
    name: 'Boutiques Télécoms & Kiosques Mobile Money',
    desc: 'Points Orange/Moov/Wave, accessoires, téléphones. Priorité : reçus clients professionnels et suivi des ventes.'
  },
  {
    name: 'Salons de Coiffure & Instituts d\'Esthétique',
    desc: 'Salons dames/hommes, ongleries, cosmétiques. Priorité : suivi des prestations et encaissements journaliers.'
  },
  {
    name: 'Librairies, Papeteries & Fournitures Scolaires',
    desc: 'Vente de livres, cahiers, photocopies. Priorité : catalogue d\'articles, scanner code-barres et facturettes.'
  },
  {
    name: 'Quincailleries & Dépôts de Matériaux',
    desc: 'Outillage, peinture, électricité, plomberie. Priorité : paniers multiples d\'articles et reçus imprimables.'
  },
  {
    name: 'Prêt-à-porter, Chaussures & Maroquinerie',
    desc: 'Boutiques de marchés (Rood-Woko, 10-Yaar) et artères. Priorité : reçus WhatsApp valorisants et gestion des crédits.'
  }
];

targets.forEach(t => {
  drawItem(t.name, t.desc);
});

// ==================== PAGE 2 ====================
doc.addPage();

// SECTION 3
drawSectionTitle('3', 'Organisation & Gestion de la Force de Vente (10 Commerciales)');

doc.font('Helvetica-Bold')
   .fontSize(10.5)
   .fillColor(COLOR_PRIMARY)
   .text('A. Découpage Territorial en 5 Binômes Stratégiques :');
doc.moveDown(0.4);

drawItem('Binôme 1 (Zone Centre / Grand Marché)', 'Rood-Woko, Sankariaré, Koulouba, Zone Commerciale.');
drawItem('Binôme 2 (Zone Est)', '1200 Logements, Wayalghin, Dassasgho, Karpala.');
drawItem('Binôme 3 (Zone Ouest)', 'Gounghin, Pissy, Cissin, Kamsaoghin.');
drawItem('Binôme 4 (Zone Sud)', 'Patte d\'Oie, Ouaga 2000, Kalgondin, Balkuy.');
drawItem('Binôme 5 (Zone Nord)', 'Tampouy, Kilwin, Tanghin, Somgandé.');

doc.moveDown(0.5);

doc.font('Helvetica-Bold')
   .fontSize(10.5)
   .fillColor(COLOR_PRIMARY)
   .text('B. Routine Quotidienne Type d\'une Commerciale (09h00 - 17h00) :');
doc.moveDown(0.4);

drawItem('08h30 - 09h00', 'Briefing matinal WhatsApp / Vocal (Rappel de l\'objectif du jour et motivation).');
drawItem('09h00 - 13h00', 'Session Terrain 1 : Prospection intensive porte-à-porte, démos en 60s et installation gratuite des 10 jours d\'essai.');
drawItem('13h00 - 14h00', 'Pause déjeuner.');
drawItem('14h00 - 16h30', 'Session Terrain 2 : Relances des commerçants de la veille et encaissement des abonnements de 2 000 FCFA.');
drawItem('16h30 - 17h00', 'Pointage journalier et enregistrement des licences activées.');

doc.moveDown(0.8);

// SECTION 4
drawSectionTitle('4', 'Programme de Formation des Commerciales (Bootcamp 2 Jours)');

doc.font('Helvetica-Bold')
   .fontSize(10.5)
   .fillColor(COLOR_PRIMARY)
   .text('Module 1 : Maîtrise Technique & Démonstration Pratique');
doc.moveDown(0.3);
doc.font('Helvetica')
   .fontSize(9)
   .fillColor('#334155')
   .text('Chaque commerciale doit savoir installer l\'application en 30 secondes, réaliser une vente tactile, scanner un code-barres, imprimer un ticket sur imprimante Bluetooth et enregistrer un crédit client avec rappel WhatsApp.')
   .moveDown(0.6);

doc.font('Helvetica-Bold')
   .fontSize(10.5)
   .fillColor(COLOR_PRIMARY)
   .text('Module 2 : Le Pitch d\'Accroche Terrain « 60 Secondes Chrono »');
doc.moveDown(0.4);

// Boîte de pitch stylisée
const pitchBoxY = doc.y;
const pitchBoxHeight = 100;
doc.rect(45, pitchBoxY, doc.page.width - 90, pitchBoxHeight)
   .fillAndStroke('#ecfdf5', '#a7f3d0');

doc.font('Helvetica-Oblique')
   .fontSize(8.8)
   .fillColor('#064e3b')
   .text(
     '« Bonjour patron / tantie ! Je viens vous faire gagner du temps et sécuriser vos encaissements.\n' +
     'FasoCarnet remplace définitivement les cahiers de dettes qui se déchirent ou se perdent, et vous permet d\'imprimer directement de vrais tickets de caisse pour vos clients ou de les envoyer sur WhatsApp.\n' +
     'Regardez sur mon téléphone : en 5 secondes la vente est tapée, l\'article scanné et le reçu sort ! L\'application fonctionne à 100 % sans internet.\n' +
     'Je vous l\'installe tout de suite avec 10 jours d\'essai offerts sans payer 1 seul franc. On commence ? »',
     55,
     pitchBoxY + 10,
     { width: doc.page.width - 110, lineGap: 2 }
   );

doc.y = pitchBoxY + pitchBoxHeight + 12;

doc.font('Helvetica-Bold')
   .fontSize(10.5)
   .fillColor(COLOR_PRIMARY)
   .text('Module 3 : Guide de Traitement des Objections Terrain');
doc.moveDown(0.4);

drawItem('« Je n\'ai pas internet »', '« FasoCarnet fonctionne à 100% hors-ligne sans connexion internet. »');
drawItem('« Mon cahier papier me suffit »', '« Le cahier peut se perdre ou être mouillé. Vos données FasoCarnet sont sécurisées à vie. »');
drawItem('« Pourquoi donner un reçu ? »', '« Donner un reçu imprimé valorise votre commerce, élimine les litiges et fidélise vos clients. »');
drawItem('« C\'est trop cher (2 000 F) »', '« Moins de 70 francs par jour (le prix d\'un sachet d\'eau) pour éviter des milliers de pertes sur les dettes. »');

doc.moveDown(0.8);

// SECTION 5
drawSectionTitle('5', 'Outils de Motivation & Pilotage');

drawItem('Kit Terrain Professionnel', 'Polo/T-Shirt FasoCarnet, Badge officiel avec photo d\'identité, Flyers A5 avec QR Code.');
drawItem('Tableau de Bord Administrateur', 'Suivi en temps réel des activations de licences pour chaque commerciale.');
drawItem('Challenge Hebdomadaire', 'Prime de 10 000 FCFA chaque vendredi soir pour la meilleure vendeuse de la semaine.');

// Pied de page sur toutes les pages
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  doc.font('Helvetica')
     .fontSize(8)
     .fillColor(COLOR_MUTED)
     .text(
       `FasoCarnet • Document Stratégique Confidentiel • Page ${i + 1} sur ${range.count}`,
       45,
       doc.page.height - 25,
       { align: 'center', width: doc.page.width - 90 }
     );
}

doc.end();

writeStream.on('finish', () => {
  console.log('PDF generated successfully at:', outputPath);
});
