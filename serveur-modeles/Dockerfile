# Moteur de modèles Capycom. Contexte de construction = racine du dépôt (le moteur réutilise src/ et modeles/).
FROM node:22-alpine
WORKDIR /app
COPY serveur-modeles/package.json serveur-modeles/package-lock.json serveur-modeles/
RUN cd serveur-modeles && npm ci --omit=dev
COPY package.json ./
COPY src/ src/
COPY modeles/ modeles/
COPY serveur-modeles/*.mjs serveur-modeles/
ENV NODE_ENV=production PORT=8787
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:8787/sante || exit 1
CMD ["node", "serveur-modeles/demarrer.mjs"]
