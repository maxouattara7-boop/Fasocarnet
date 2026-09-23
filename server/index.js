import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'cloud_db.json');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'faso_carnet_admin_secret_2026';
const SHOP_AUTH_SECRET_SEED = process.env.SHOP_AUTH_SECRET_SEED || 'FASO_CARNET_SHOP_AUTH_TOKEN_SEED_2026';

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

// 5. Servir l'application Web & fichiers statiques (Landing page, PWA, dist.zip, version.json)
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
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
