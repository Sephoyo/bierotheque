import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from '../core/runtime-config';

/**
 * Mesure d'audience anonyme et agrégée (pas de cookie, aucun identifiant
 * persistant côté client) — cf. backend/src/Controller/AnalyticsController.php.
 * Échec silencieux : ne doit jamais perturber l'app si l'endpoint est indisponible.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);

  recordPageView(): void {
    this.http
      .post(`${API_BASE_URL}/analytics/pageview`, { path: location.pathname })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }
}
