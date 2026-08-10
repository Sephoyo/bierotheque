// Config runtime, lue par frontend/src/app/core/runtime-config.ts.
// En prod (image Docker), ce fichier est réécrit au démarrage du conteneur
// par docker-entrypoint.sh, qui remplace le placeholder ci-dessous par la
// variable d'environnement API_BASE_URL fournie sur Dokploy.
// En dev (`ng serve`), le placeholder reste tel quel et runtime-config.ts
// retombe alors sur http://localhost:8000/api.
window.__env = {
  apiBaseUrl: '__API_BASE_URL__',
};
