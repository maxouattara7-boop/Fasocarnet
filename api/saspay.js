// Vercel Serverless Function pour relayer les requêtes SasPay sans blocage CORS
// Supporte la création de session et la vérification de statut en contournant tout blocage navigateur.

export default async function handler(req, res) {
  // En-têtes CORS universels
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const authHeader = req.headers['authorization'] || '';
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim() || process.env.VITE_SASPAY_API_KEY || 'sk_live_vdGAFS2yW-eHEJc-mM8tuvdByunepYKBr-7vIjvmo1s';

  try {
    if (req.method === 'POST') {
      // Création de session de checkout SasPay (obligatoire avec trailing slash '/')
      const response = await fetch('https://api.saspay.me/api/v1/checkout-sessions/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      const data = await response.json().catch(() => null);
      return res.status(response.status).json(data || { success: false, message: 'Réponse SasPay invalide' });
    }

    if (req.method === 'GET') {
      // Vérification du statut de la session
      const sessionId = req.query.sessionId || req.query.id;
      if (!sessionId) {
        return res.status(400).json({ success: false, message: 'Le paramètre sessionId est requis.' });
      }

      const response = await fetch(`https://api.saspay.me/api/v1/checkout-sessions/${sessionId}/status/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json().catch(() => null);
      return res.status(response.status).json(data || { success: false, message: 'Réponse statut SasPay invalide' });
    }

    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  } catch (error) {
    console.error('[API SasPay Proxy Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Erreur interne proxy SasPay' });
  }
}
