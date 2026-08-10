import { Component, inject } from '@angular/core';
import { BreweryDetailComponent } from '../brewery-detail/brewery-detail.component';
import { ContactFormComponent } from '../contact-form/contact-form.component';
import { FooterComponent } from '../footer/footer.component';
import { MapComponent } from '../map/map.component';
import { Brewery } from '../models/brewery.model';
import { FrenchRegion } from '../models/region.model';
import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { RegionListComponent } from '../region-list/region-list.component';
import { AnalyticsService } from '../services/analytics.service';
import { BreweryService } from '../services/brewery.service';

@Component({
  selector: 'app-map-page',
  standalone: true,
  imports: [
    MapComponent,
    BreweryDetailComponent,
    NavBarComponent,
    RegionListComponent,
    FooterComponent,
    ContactFormComponent,
  ],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
})
export class MapPageComponent {
  private readonly breweryService = inject(BreweryService);
  private readonly analyticsService = inject(AnalyticsService);

  constructor() {
    // Uniquement ici (pas dans le shell racine) : une visite de /admin ne
    // doit pas compter comme une vue de la carte publique.
    this.analyticsService.recordPageView();
  }

  protected onRegionSelected(region: FrenchRegion, map: MapComponent): void {
    this.breweryService.selectedRegion.set(region.name);
    this.breweryService.loadByRegion(region.name);
    map.flyToRegion(region);
  }

  protected onBrewerySelected(brewery: Brewery, map: MapComponent): void {
    this.breweryService.selectedBrewery.set(brewery);
    map.flyToBrewery(brewery);
  }
}
