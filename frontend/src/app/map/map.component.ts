import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, output, signal } from '@angular/core';
// Import par défaut (pas `import * as L`) : esbuild fige une copie des
// propriétés de leaflet au moment de l'import namespace, *avant* que
// 'leaflet.markercluster' ait pu lui ajouter markerClusterGroup — d'où
// "L.markerClusterGroup is not a function" en prod malgré un build qui
// passe. L'import par défaut référence l'objet mutable en direct (via
// l'interop CJS `.default`), qui lui reçoit bien la mutation.
import L from 'leaflet';
import 'leaflet.markercluster';
import { Brewery } from '../models/brewery.model';
import { FrenchRegion } from '../models/region.model';
import { BreweryService, GeoPoint } from '../services/brewery.service';

const BREWERY_ZOOM = 15;

const FRANCE_CENTER: L.LatLngExpression = [46.6, 2.5];
const FRANCE_DEFAULT_ZOOM = 6;

// Icône personnalisée en forme de chope (SVG inline) — on évite volontairement
// L.Icon.Default, dont les chemins d'images par défaut sont cassés par les bundlers.
function breweryDivIcon(): L.DivIcon {
  return L.divIcon({
    className: 'brewery-marker',
    html: `
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 8h11v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z" fill="#D9A441" stroke="#4A2E1A" stroke-width="1.5"/>
        <path d="M16 10h1.5a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H16" stroke="#4A2E1A" stroke-width="1.5"/>
        <path d="M5 8V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v2" stroke="#4A2E1A" stroke-width="1.5"/>
      </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) private mapContainerRef!: ElementRef<HTMLDivElement>;

  protected readonly breweryService = inject(BreweryService);

  /** Émis une fois, à la première interaction du visiteur avec la carte (glisser, zoomer, toucher). */
  readonly userInteracted = output<void>();
  private interacted = false;

  // --- « Autour de moi » ---
  protected readonly locating = signal(false);
  protected readonly locateError = signal<string | null>(null);
  private userLayer: L.LayerGroup | null = null;
  private locateErrorTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private map: L.Map | null = null;
  private markerClusterGroup: L.MarkerClusterGroup | null = null;
  // Évite qu'un fitBounds() programmatique (sélection de région) ne déclenche
  // un rechargement par bbox qui écraserait les données exactes déjà chargées
  // via BreweryService.loadByRegion() (filtre `region=` exact).
  private suppressNextMoveEnd = false;

  constructor() {
    effect(() => {
      const breweries = this.breweryService.breweries();
      this.renderMarkers(breweries);
    });

    // Point bleu de position : affiché tant que le mode « Autour de moi » est actif
    effect(() => {
      const origin = this.breweryService.nearbyOrigin();
      this.renderUserPosition(origin);
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainerRef.nativeElement).setView(FRANCE_CENTER, FRANCE_DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // Interactions réelles du visiteur uniquement (les flyTo/fitBounds programmatiques
    // ne déclenchent ni pointerdown ni wheel).
    const container = this.mapContainerRef.nativeElement;
    const onInteract = () => {
      container.removeEventListener('pointerdown', onInteract);
      container.removeEventListener('wheel', onInteract);
      this.markInteracted();
    };
    container.addEventListener('pointerdown', onInteract, { passive: true });
    container.addEventListener('wheel', onInteract, { passive: true });

    // La zone de la carte change de taille (footer qui se replie, rotation du
    // téléphone…) : Leaflet doit recalculer ses tuiles, sinon une bande grise
    // apparaît là où la carte s'est agrandie.
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(container);

    this.markerClusterGroup = L.markerClusterGroup();
    this.map.addLayer(this.markerClusterGroup);

    this.map.on('moveend', () => {
      if (this.suppressNextMoveEnd) {
        this.suppressNextMoveEnd = false;
        return;
      }
      this.loadVisibleBreweries();
    });
    this.loadVisibleBreweries();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.locateErrorTimer) {
      clearTimeout(this.locateErrorTimer);
    }
    this.map?.remove();
  }

  flyToRegion(region: FrenchRegion): void {
    if (!this.map) {
      return;
    }
    const { south, west, north, east } = region.bbox;
    this.suppressNextMoveEnd = true;
    this.map.fitBounds([
      [south, west],
      [north, east],
    ]);
  }

  private markInteracted(): void {
    if (this.interacted) return;
    this.interacted = true;
    this.userInteracted.emit();
  }

  /** Bouton « Autour de moi » : demande la position au navigateur puis cadre la carte. */
  protected locateMe(): void {
    if (this.locating()) {
      return;
    }
    this.markInteracted(); // explorer autour de soi = explorer la carte (replie le footer)
    if (!('geolocation' in navigator)) {
      this.showLocateError("Votre navigateur ne permet pas de vous localiser.");
      return;
    }
    this.locating.set(true);
    this.locateError.set(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin: GeoPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        this.breweryService.selectedBrewery.set(null);
        this.breweryService.loadNearby(origin).subscribe((nearby) => {
          this.locating.set(false);
          this.fitToNearby(origin, nearby.slice(0, 5).map((n) => n.brewery));
        });
      },
      (error) => {
        this.locating.set(false);
        this.showLocateError(
          error.code === error.PERMISSION_DENIED
            ? 'Localisation refusée : autorisez-la dans les réglages de votre navigateur pour voir les brasseries proches.'
            : error.code === error.TIMEOUT
              ? 'La localisation a pris trop de temps, réessayez.'
              : 'Impossible de déterminer votre position.',
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  /** Cadre la carte sur la position du visiteur et ses brasseries les plus proches. */
  private fitToNearby(origin: GeoPoint, closest: Brewery[]): void {
    if (!this.map) {
      return;
    }
    // Les données sont déjà chargées par loadNearby() : on évite que le
    // moveend du cadrage ne les remplace par la seule zone visible.
    this.suppressNextMoveEnd = true;
    if (closest.length === 0) {
      this.map.flyTo([origin.lat, origin.lng], 11);
      return;
    }
    const bounds = L.latLngBounds([[origin.lat, origin.lng], ...closest.map((b) => [b.latitude, b.longitude] as L.LatLngTuple)]);
    // Sur mobile, la liste « Autour de vous » occupe le bas de l'écran (45vh,
    // cf. region-list) : on garde les brasseries cadrées au-dessus d'elle.
    const container = this.map.getContainer();
    const sheet = window.matchMedia('(max-width: 768px)').matches
      ? Math.max(0, container.getBoundingClientRect().bottom - window.innerHeight * 0.55)
      : 0;
    this.map.flyToBounds(bounds, { paddingTopLeft: [48, 48], paddingBottomRight: [48, 48 + sheet], maxZoom: 14 });
  }

  private renderUserPosition(origin: GeoPoint | null): void {
    if (!this.map) {
      return;
    }
    this.userLayer?.remove();
    this.userLayer = null;
    if (!origin) {
      return;
    }
    const accuracy = L.circle([origin.lat, origin.lng], {
      radius: Math.min(origin.accuracy, 2000),
      color: '#2f7cf6',
      weight: 1,
      fillColor: '#2f7cf6',
      fillOpacity: 0.12,
      interactive: false,
    });
    const dot = L.circleMarker([origin.lat, origin.lng], {
      radius: 8,
      color: '#ffffff',
      weight: 3,
      fillColor: '#2f7cf6',
      fillOpacity: 1,
    }).bindTooltip('Vous êtes ici', { direction: 'top', offset: [0, -8] });
    this.userLayer = L.layerGroup([accuracy, dot]).addTo(this.map);
  }

  private showLocateError(message: string): void {
    this.locateError.set(message);
    if (this.locateErrorTimer) {
      clearTimeout(this.locateErrorTimer);
    }
    this.locateErrorTimer = setTimeout(() => this.locateError.set(null), 7000);
  }

  flyToBrewery(brewery: Brewery): void {
    if (!this.map) {
      return;
    }
    this.map.flyTo([brewery.latitude, brewery.longitude], BREWERY_ZOOM);
  }

  private loadVisibleBreweries(): void {
    if (!this.map) {
      return;
    }
    const bounds = this.map.getBounds();
    this.breweryService.loadByBbox({
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    });
  }

  private renderMarkers(breweries: Brewery[]): void {
    if (!this.markerClusterGroup) {
      return;
    }

    this.markerClusterGroup.clearLayers();

    for (const brewery of breweries) {
      const marker = L.marker([brewery.latitude, brewery.longitude], { icon: breweryDivIcon() });
      marker.on('click', () => this.breweryService.selectedBrewery.set(brewery));
      this.markerClusterGroup.addLayer(marker);
    }
  }
}
