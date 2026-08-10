import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { BboxParams, Brewery } from '../models/brewery.model';
import { API_BASE_URL } from '../core/runtime-config';

// Le clustering Leaflet absorbe l'affichage de nombreux marqueurs : on demande
// donc une page large plutôt que de tronquer silencieusement à la pagination
// par défaut de l'API (30), qui viderait la carte en vue dézoomée sur la France.
const MAX_ITEMS_PER_PAGE = 2000;

@Injectable({ providedIn: 'root' })
export class BreweryService {
  private readonly http = inject(HttpClient);

  readonly breweries = signal<Brewery[]>([]);
  readonly selectedBrewery = signal<Brewery | null>(null);
  readonly selectedRegion = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  loadByBbox({ south, west, north, east }: BboxParams): void {
    const bbox = `${south},${west},${north},${east}`;
    this.loading.set(true);
    this.error.set(null);

    this.http
      .get<Brewery[]>(`${API_BASE_URL}/breweries`, { params: { bbox, itemsPerPage: MAX_ITEMS_PER_PAGE } })
      .pipe(
        tap((breweries) => this.breweries.set(breweries)),
        catchError(() => {
          this.error.set("Impossible de charger les brasseries pour cette zone.");
          return of([]);
        }),
      )
      .subscribe(() => this.loading.set(false));
  }

  loadByRegion(region: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.http
      .get<Brewery[]>(`${API_BASE_URL}/breweries`, { params: { region, itemsPerPage: MAX_ITEMS_PER_PAGE } })
      .pipe(
        tap((breweries) => this.breweries.set(breweries)),
        catchError(() => {
          this.error.set('Impossible de charger les brasseries pour cette région.');
          return of([]);
        }),
      )
      .subscribe(() => this.loading.set(false));
  }

  getById(id: number): Observable<Brewery> {
    return this.http.get<Brewery>(`${API_BASE_URL}/breweries/${id}`);
  }

  /**
   * Recherche par nom OU ville : l'API ne supporte pas un OR sur un seul
   * paramètre, donc deux appels en parallèle (filtres `name`/`city` déjà
   * existants), fusionnés et dédupliqués par id.
   */
  search(query: string): Observable<Brewery[]> {
    const byName = this.http.get<Brewery[]>(`${API_BASE_URL}/breweries`, {
      params: { name: query, itemsPerPage: MAX_ITEMS_PER_PAGE },
    });
    const byCity = this.http.get<Brewery[]>(`${API_BASE_URL}/breweries`, {
      params: { city: query, itemsPerPage: MAX_ITEMS_PER_PAGE },
    });

    return forkJoin([byName, byCity]).pipe(
      map(([resultsByName, resultsByCity]) => {
        const merged = new Map<number, Brewery>();
        for (const brewery of [...resultsByName, ...resultsByCity]) {
          merged.set(brewery.id, brewery);
        }
        return Array.from(merged.values());
      }),
      catchError(() => of([])),
    );
  }
}
