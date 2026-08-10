#!/bin/sh
# Exécuté automatiquement par l'image nginx officielle avant le démarrage du
# serveur (tout script exécutable dans /docker-entrypoint.d/). Injecte l'URL
# de l'API dans env.js à partir de la variable d'environnement fournie par
# Dokploy — permet de réutiliser la même image sur plusieurs environnements
# sans rebuild (voir frontend/src/app/core/runtime-config.ts).
set -e

: "${API_BASE_URL:?API_BASE_URL doit être défini (ex: https://api.bierotheque.fr/api)}"

sed -i "s#__API_BASE_URL__#${API_BASE_URL}#g" /usr/share/nginx/html/env.js
