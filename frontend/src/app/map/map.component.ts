import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, output } from '@angular/core';
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
import { BreweryService } from '../services/brewery.service';

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
      if (this.interacted) return;
      this.interacted = true;
      container.removeEventListener('pointerdown', onInteract);
      container.removeEventListener('wheel', onInteract);
      this.userInteracted.emit();
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
