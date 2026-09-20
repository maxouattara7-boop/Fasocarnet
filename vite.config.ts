import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function cloudSyncPlugin(): Plugin {
  const dbDir = path.resolve(process.cwd(), 'data');
  const dbFile = path.resolve(dbDir, 'cloud_database.json');

  const ensureDbFile = () => {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(dbFile)) {
      fs.writeFileSync(dbFile, JSON.stringify({}, null, 2), 'utf-8');
    }
  };

  return {
    name: 'cloud-sync-server',
    configureServer(server) {
      ensureDbFile();

      server.middlewares.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.url === '/api/cloud/db' && req.method === 'GET') {
          try {
            ensureDbFile();
            const data = fs.readFileSync(dbFile, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(data || '{}');
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (req.url === '/api/cloud/db' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              ensureDbFile();
              const parsed = JSON.parse(body || '{}');
              fs.writeFileSync(dbFile, JSON.stringify(parsed, null, 2), 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cloudSyncPlugin()],
  server: {
    port: 3000,
    host: true
  }
});
