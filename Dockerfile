# --- Build : compile le TypeScript (serveur + client)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.server.json tsconfig.client.json ./
COPY src ./src
COPY public ./public
COPY views ./views
RUN npm run build

# --- Exécution : aucune dépendance npm à l'exécution
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
COPY package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/views ./views
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" || exit 1
CMD ["node", "dist/server/index.js"]
