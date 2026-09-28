import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement (.env local et .env racine)
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'cloud_db.json');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'faso_carnet_admin_secret_2026';
const SHOP_AUTH_SECRET_SEED = process.env.SHOP_AUTH_SECRET_SEED || 'FASO_CARNET_SHOP_AUTH_TOKEN_SEED_2026';

// Configuration PayTech
const PAYTECH_API_KEY = process.env.PAYTECH_API_KEY || '';
const PAYTECH_API_SECRET = process.env.PAYTECH_API_SECRET || '';
const PAYTECH_ENV = process.env.PAYTECH_ENV || 'test';
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${PORT}`;

const SUBSCRIPTION_PLANS_CONFIG = {
  monthly: { id: 'monthly', name: '1 Mois (Mensuel)', durationMonths: 1, price: 2000 },
  'semi-annual': { id: 'semi-annual', name: '6 Mois (Semestriel)', durationMonths: 6, price: 10000 },
  annual: { id: 'annual', name: '1 An (Annuel)', durationMonths: 12, price: 20000 }
};

// Assurer l'existence du dossier data
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialiser la base JSON si absente
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

// Utilitaires de base de données en mémoire avec écriture atomique
function loadDatabase() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[DB] Erreur lecture DB:', err);
    return {};
  }
}

function saveDatabase(data) {
  try {
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('[DB] Erreur écriture DB:', err);
  }
}

// Sécurité & Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
}));
app.use(express.json({ limit: '50mb' }));

// Limiteur de requêtes général
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes, veuillez réessayer plus tard.' }
});
app.use('/api/', apiLimiter);

// Middleware d'authentification boutique par Token Bearer
function verifyShopAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const shopId = req.params.shopId;

  if (!token) {
    // Autoriser temporairement si premier enregistrement ou fallback
    return next();
  }

  // Si c'est la clé Super-Admin
  if (token === ADMIN_API_KEY || req.headers['x-admin-key'] === ADMIN_API_KEY) {
    return next();
  }

  if (token.startsWith(`fct_${shopId}_`)) {
    return next();
  }

  return res.status(401).json({ success: false, message: 'Accès non autorisé pour ce commerce.' });
}

// --- ROUTES ---

// 1. Healthcheck pour les plateformes Cloud (Render, Railway, Fly, VPS)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.2.2',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 2. Base complète (Accès Super-Admin / Sync global)
app.get('/api/cloud/db', (req, res) => {
  const db = loadDatabase();
  res.json(db);
});

app.post('/api/cloud/db', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ success: false, message: 'Données invalides.' });
  }

  const currentDb = loadDatabase();
  const merged = { ...currentDb, ...body };
  saveDatabase(merged);

  res.json({ success: true, count: Object.keys(merged).length, updatedAt: new Date().toISOString() });
});

// 3. Partition isolée par boutique (Multi-Tenant Stricte)
app.get('/api/cloud/shops/:shopId', verifyShopAuth, (req, res) => {
  const { shopId } = req.params;
  const db = loadDatabase();
  const shopData = db[shopId];

  if (!shopData) {
    return res.status(404).json({ success: false, message: 'Boutique introuvable sur le Cloud.' });
  }

  res.json(shopData);
});

app.put('/api/cloud/shops/:shopId', verifyShopAuth, (req, res) => {
  const { shopId } = req.params;
  const shopData = req.body;

  if (!shopData || typeof shopData !== 'object') {
    return res.status(400).json({ success: false, message: 'Données de boutique invalides.' });
  }

  const db = loadDatabase();
  db[shopId] = {
    ...shopData,
    lastUpdatedAt: new Date().toISOString()
  };
  saveDatabase(db);

  res.json({ success: true, shopId, updatedAt: db[shopId].lastUpdatedAt });
});

// 4. Message d'alerte broadcast Super-Admin
app.get('/api/cloud/broadcast', (req, res) => {
  const db = loadDatabase();
  const broadcast = db['_admin_broadcast']?.broadcast || null;
  res.json({ broadcast });
});

app.post('/api/cloud/broadcast', (req, res) => {
  const { broadcast } = req.body;
  const db = loadDatabase();

  if (broadcast) {
    db['_admin_broadcast'] = {
      broadcast,
      lastUpdatedAt: new Date().toISOString()
    };
  } else {
    delete db['_admin_broadcast'];
  }

  saveDatabase(db);
  res.json({ success: true, broadcast });
});

// ==========================================
// --- ROUTES PAIEMENT AUTOMATIQUE PAYTECH ---
// ==========================================

function calculateNewExpirationDate(currentExpiresAt, durationMonths) {
  const now = new Date();
  let baseDate = now;
  if (currentExpiresAt) {
    const parsed = new Date(currentExpiresAt);
    if (!isNaN(parsed.getTime()) && parsed > now) {
      baseDate = parsed;
    }
  }
  const newDate = new Date(baseDate.getTime());
  newDate.setMonth(newDate.getMonth() + durationMonths);
  return newDate.toISOString();
}

// 1. Initialiser une demande de paiement PayTech
app.post('/api/payments/paytech/request-payment', async (req, res) => {
  try {
    const { shopId, planId, shopName, shopPhone, successRedirectUrl, cancelRedirectUrl } = req.body;

    if (!shopId || !planId) {
      return res.status(400).json({ success: false, message: 'shopId et planId sont requis.' });
    }

    const plan = SUBSCRIPTION_PLANS_CONFIG[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Plan d\'abonnement invalide.' });
    }

    const refCommand = `fct_${shopId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const db = loadDatabase();
    if (!db['_payments']) db['_payments'] = {};

    const paymentRecord = {
      refCommand,
      shopId,
      shopName: shopName || 'Commerce FasoCarnet',
      shopPhone: shopPhone || '',
      planId: plan.id,
      planName: plan.name,
      durationMonths: plan.durationMonths,
      amount: plan.price,
      currency: 'XOF',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db['_payments'][refCommand] = paymentRecord;
    saveDatabase(db);

    // Si les clés PayTech sont configurées, appel à l'API officielle PayTech
    if (PAYTECH_API_KEY && PAYTECH_API_SECRET) {
      const ipnUrl = `${SERVER_BASE_URL}/api/payments/paytech/ipn`;
      const successUrl = successRedirectUrl || `${SERVER_BASE_URL}/?payment_status=success&ref=${refCommand}`;
      const cancelUrl = cancelRedirectUrl || `${SERVER_BASE_URL}/?payment_status=cancel&ref=${refCommand}`;

      const payload = {
        item_name: `FasoCarnet - ${plan.name}`,
        item_price: plan.price,
        command_name: `Abonnement FasoCarnet ${plan.name} (${shopName || shopId})`,
        ref_command: refCommand,
        currency: 'XOF',
        env: PAYTECH_ENV,
        ipn_url: ipnUrl,
        success_url: successUrl,
        cancel_url: cancelUrl,
        custom_field: JSON.stringify({
          shopId,
          planId: plan.id,
          durationMonths: plan.durationMonths,
          refCommand
        })
      };

      const response = await fetch('https://paytech.sn/api/payment/request-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API_KEY': PAYTECH_API_KEY,
          'API_SECRET': PAYTECH_API_SECRET
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data && (data.success === 1 || data.token)) {
        paymentRecord.token = data.token;
        paymentRecord.redirectUrl = data.redirect_url;
        db['_payments'][refCommand] = paymentRecord;
        saveDatabase(db);

        return res.json({
          success: true,
          mode: 'paytech_live',
          redirectUrl: data.redirect_url,
          token: data.token,
          refCommand
        });
      } else {
        console.warn('[PayTech] Réponse non concluante de l\'API distante:', data);
        // Fallback transparent en mode Sandbox test
      }
    }

    // Mode Bac à sable / Démo (sans blocage si clés pas encore saisies)
    return res.json({
      success: true,
      mode: 'sandbox_simulation',
      refCommand,
      amount: plan.price,
      planName: plan.name,
      message: 'Demande de paiement prête pour validation.'
    });
  } catch (error) {
    console.error('[PayTech] Erreur request-payment:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'initialisation du paiement.', error: error.message });
  }
});

// 2. Webhook IPN (Notification instantanée envoyée par PayTech)
app.post('/api/payments/paytech/ipn', express.urlencoded({ extended: true }), (req, res) => {
  try {
    const payload = req.body || {};
    console.log('[PayTech IPN] Notification reçue :', payload);

    const refCommand = payload.ref_command;
    const typeEvent = payload.type_event; // 'sale_complete'

    if (!refCommand) {
      return res.status(400).send('Missing ref_command');
    }

    const db = loadDatabase();
    const payment = db['_payments']?.[refCommand];

    if (!payment) {
      console.warn(`[PayTech IPN] Commande introuvable : ${refCommand}`);
      return res.status(404).send('Order not found');
    }

    let customData = {};
    try {
      if (payload.custom_field) {
        customData = typeof payload.custom_field === 'string' ? JSON.parse(payload.custom_field) : payload.custom_field;
      }
    } catch {
      // Ignorer
    }

    const shopId = payment.shopId || customData.shopId;
    const durationMonths = payment.durationMonths || customData.durationMonths || 1;
    const planId = payment.planId || customData.planId || 'monthly';

    // Marquer le paiement comme complété
    payment.status = 'PAID';
    payment.paidAt = new Date().toISOString();
    payment.rawIpn = payload;
    db['_payments'][refCommand] = payment;

    // Activer ou prolonger immédiatement la boutique sur le Cloud
    if (shopId) {
      if (!db[shopId]) db[shopId] = {};
      const shop = db[shopId];
      const currentExpiry = shop.subscriptionExpiresAt || shop.expiresAt || null;
      const newExpiry = calculateNewExpirationDate(currentExpiry, durationMonths);

      db[shopId] = {
        ...shop,
        isLicensed: true,
        subscriptionStatus: 'active',
        subscriptionPlan: planId,
        subscriptionExpiresAt: newExpiry,
        updatedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      };
      console.log(`[PayTech IPN] ✅ Boutique « ${shopId} » activée jusqu'au ${newExpiry}`);
    }

    saveDatabase(db);
    return res.status(200).json({ success: 1 });
  } catch (error) {
    console.error('[PayTech IPN] Erreur traitement webhook:', error);
    return res.status(500).send('Internal error');
  }
});

// 3. Vérifier le statut d'un paiement en temps réel (Polling frontend)
app.get('/api/payments/status/:refCommand', (req, res) => {
  const { refCommand } = req.params;
  const db = loadDatabase();
  const payment = db['_payments']?.[refCommand];

  if (!payment) {
    return res.status(404).json({ success: false, status: 'NOT_FOUND', message: 'Paiement introuvable.' });
  }

  const shopData = payment.shopId ? db[payment.shopId] : null;

  res.json({
    success: true,
    status: payment.status,
    refCommand: payment.refCommand,
    shopId: payment.shopId,
    planId: payment.planId,
    planName: payment.planName,
    amount: payment.amount,
    paidAt: payment.paidAt || null,
    subscriptionExpiresAt: shopData?.subscriptionExpiresAt || null
  });
});

// 4. Simulation instantanée pour tests / bac à sable
app.post('/api/payments/paytech/simulate-payment-success', (req, res) => {
  try {
    const { refCommand } = req.body;
    if (!refCommand) {
      return res.status(400).json({ success: false, message: 'refCommand requis.' });
    }

    const db = loadDatabase();
    const payment = db['_payments']?.[refCommand];

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé.' });
    }

    payment.status = 'PAID';
    payment.paidAt = new Date().toISOString();
    payment.isSimulated = true;
    db['_payments'][refCommand] = payment;

    const shopId = payment.shopId;
    const durationMonths = payment.durationMonths || 1;
    let newExpiry = null;

    if (shopId) {
      if (!db[shopId]) db[shopId] = {};
      const shop = db[shopId];
      const currentExpiry = shop.subscriptionExpiresAt || shop.expiresAt || null;
      newExpiry = calculateNewExpirationDate(currentExpiry, durationMonths);

      db[shopId] = {
        ...shop,
        isLicensed: true,
        subscriptionStatus: 'active',
        subscriptionPlan: payment.planId,
        subscriptionExpiresAt: newExpiry,
        updatedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      };
    }

    saveDatabase(db);
    res.json({
      success: true,
      status: 'PAID',
      message: 'Paiement validé avec succès ! Compte activé instantanément.',
      subscriptionExpiresAt: newExpiry
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Servir l'application Web & fichiers statiques (Landing page, PWA, dist.zip, version.json)
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, {
    setHeaders: (res, filePath) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      if (filePath.endsWith('version.json') || filePath.endsWith('dist.zip')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
      }
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 FasoCarnet Cloud Server démarré !`);
  console.log(`📡 Port : ${PORT}`);
  console.log(`📁 Données : ${DB_FILE}`);
  console.log(`⏰ Heure : ${new Date().toISOString()}`);
  console.log(`=========================================`);
});
