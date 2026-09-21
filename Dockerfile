FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY server/package.json ./

# Installer les dépendances de production
RUN npm install --omit=dev

# Copier le code du serveur
COPY server/index.js ./

# Créer le répertoire de données
RUN mkdir -p /app/data

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

EXPOSE 3000

CMD ["node", "index.js"]
