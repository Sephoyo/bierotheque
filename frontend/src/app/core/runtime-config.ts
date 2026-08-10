/**
 * URL de base de l'API, injectée au démarrage du conteneur plutôt que figée à
 * la compilation (voir public/env.js + frontend/docker-entrypoint.sh) : cela
 * permet de réutiliser la même image Docker en dev/staging/prod sans rebuild,
 * juste en changeant la variable d'environnement API_BASE_URL sur Dokploy.
 *
 * En développement (`ng serve`), public/env.js garde son placeholder tel
 * quel : on retombe alors sur DEFAULT_API_BASE_URL ci-dessous.
 */

declare global {
  interface Window {
    __env?: { apiBaseUrl?: string };
  }
}

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';
const UNSET_PLACEHOLDER = '__API_BASE_URL__';

function resolveApiBaseUrl(): string {
  const injected = window.__env?.apiBaseUrl?.trim();
  if (!injected || injected === UNSET_PLACEHOLDER) {
    return DEFAULT_API_BASE_URL;
  }
  return injected;
}

export const API_BASE_URL = resolveApiBaseUrl();
