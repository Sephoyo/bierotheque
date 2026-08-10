# --- Étape 1 : build Angular ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration production

# --- Étape 2 : image de service (nginx) ---
FROM nginx:1.27-alpine

# bash : absent de l'image nginx-alpine par défaut (seul /bin/sh est
# présent). Nécessaire pour le terminal web de Dokploy (docker exec ...
# bash) — sans ça, ouvrir un terminal sur ce conteneur échoue avec
# "exec: bash: no such file or directory". docker-entrypoint.sh reste en
# #!/bin/sh et n'en dépend pas.
RUN apk add --no-cache bash

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nom préfixé "30-" pour s'exécuter après les scripts d'init par défaut de
# l'image nginx (10-*, 15-*, 20-*) — voir docker-entrypoint.sh.
COPY docker-entrypoint.sh /docker-entrypoint.d/30-inject-env.sh
RUN chmod +x /docker-entrypoint.d/30-inject-env.sh

EXPOSE 80
