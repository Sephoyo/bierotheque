import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { BboxParams, Brewery } from '../models/brewery.model';
import { BreweryEditSuggestionPayload } from '../models/edit-suggestion.model';
import { API_BASE_URL } from '../core/runtime-config';

// Le clustering Leaflet absorbe l'affichage de nombreux marqueurs : on demande
// donc une page large plutôt que de tronquer silencieusement à la pagination
// par défaut de l'API (30), qui viderait la carte en vue dézoomée sur la France.
const MAX_ITEMS_PER_PAGE = 2000;

/** Rayons de recherche « Autour de moi » (km) : on élargit une fois si rien n'est trouvé. */
export const NEARBY_RADIUS_KM = 50;
const NEARBY_FALLBACK_RADIUS_KM = 150;
const NEARBY_MAX_RESULTS = 50;

export interface GeoPoint {
  lat: number;
  lng: number;
  /** Précision de la position en mètres (fournie par le navigateur). */
  accuracy: number;
}

export interface NearbyBrewery {
  brewery: Brewery;
  distanceKm: number;
}

/** Distance à vol d'oiseau (formule de haversine), en km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Boîte englobante d'un cercle de `radiusKm` autour d'un point. */
function bboxAround({ lat, lng }: GeoPoint, radiusKm: number): BboxParams {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return { south: lat - dLat, north: lat + dLat, west: lng - dLng, east: lng + dLng };
}

@Injectable({ providedIn: 'root' })
export class BreweryService {
  private readonly http = inject(HttpClient);

  readonly breweries = signal<Brewery[]>([]);
  readonly selectedBrewery = signal<Brewery | null>(null);
  readonly selectedRegion = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // --- « Autour de moi » ---
  /** Position du visiteur (null tant que le mode « Autour de moi » n'est pas actif). */
  readonly nearbyOrigin = signal<GeoPoint | null>(null);
  readonly nearbyLoading = signal(false);
  readonly nearbyRadiusKm = signal(NEARBY_RADIUS_KM);
  /**
   * Résultats gardés à part de `breweries` : la carte recharge `breweries` à
   * chaque déplacement (bbox visible), la liste « Autour de vous » ne doit pas
   * rétrécir quand on zoome sur l'une des brasseries.
   */
  private readonly nearbyResults = signal<Brewery[]>([]);

  readonly nearbyBreweries = computed<NearbyBrewery[]>(() => {
    const origin = this.nearbyOrigin();
    if (!origin) {
      return [];
    }
    const radius = this.nearbyRadiusKm();
    return this.nearbyResults()
      .map((brewery) => ({ brewery, distanceKm: distanceKm(origin, { lat: brewery.latitude, lng: brewery.longitude }) }))
      .filter((item) => item.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, NEARBY_MAX_RESULTS);
  });

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

  /**
   * Charge les brasseries autour d'une position (rayon de 50 km, élargi à
   * 150 km si aucune n'est trouvée). Renvoie la liste triée une fois chargée.
   */
  loadNearby(origin: GeoPoint): Observable<NearbyBrewery[]> {
    this.selectedRegion.set(null);
    this.nearbyOrigin.set(origin);
    this.nearbyRadiusKm.set(NEARBY_RADIUS_KM);
    this.nearbyResults.set([]);
    this.nearbyLoading.set(true);
    this.error.set(null);

    const fetchWithin = (radiusKm: number) => {
      const { south, west, north, east } = bboxAround(origin, radiusKm);
      return this.http.get<Brewery[]>(`${API_BASE_URL}/breweries`, {
        params: { bbox: `${south},${west},${north},${east}`, itemsPerPage: MAX_ITEMS_PER_PAGE },
      });
    };
    const within = (list: Brewery[], radiusKm: number) =>
      list.filter((b) => distanceKm(origin, { lat: b.latitude, lng: b.longitude }) <= radiusKm);

    return fetchWithin(NEARBY_RADIUS_KM).pipe(
      switchMap((list) =>
        within(list, NEARBY_RADIUS_KM).length > 0
          ? of(list)
          : fetchWithin(NEARBY_FALLBACK_RADIUS_KM).pipe(tap(() => this.nearbyRadiusKm.set(NEARBY_FALLBACK_RADIUS_KM))),
      ),
      tap((list) => {
        this.nearbyResults.set(list);
        this.breweries.set(list);
      }),
      map(() => this.nearbyBreweries()),
      catchError(() => {
        this.error.set('Impossible de charger les brasseries autour de vous.');
        return of([]);
      }),
      finalize(() => this.nearbyLoading.set(false)),
    );
  }

  clearNearby(): void {
    this.nearbyOrigin.set(null);
    this.nearbyResults.set([]);
  }

  getById(id: number): Observable<Brewery> {
    return this.http.get<Brewery>(`${API_BASE_URL}/breweries/${id}`);
  }

  /**
   * Propose une modification (site web/réseaux sociaux/description) sur une
   * brasserie déjà publiée. Reste en attente de validation admin, cf.
   * BreweryEditSuggestionController côté backend — n'écrit jamais en direct.
   */
  suggestEdit(id: number, payload: BreweryEditSuggestionPayload): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/breweries/${id}/suggest-edit`, payload);
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
