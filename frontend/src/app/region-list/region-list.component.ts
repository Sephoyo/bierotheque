import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Brewery } from '../models/brewery.model';
import { BreweryService } from '../services/brewery.service';

@Component({
  selector: 'app-region-list',
  standalone: true,
  templateUrl: './region-list.component.html',
  styleUrl: './region-list.component.scss',
})
export class RegionListComponent {
  protected readonly breweryService = inject(BreweryService);

  @Output() brewerySelected = new EventEmitter<Brewery>();

  protected onSelect(brewery: Brewery): void {
    this.brewerySelected.emit(brewery);
  }

  /** Ferme la liste, qu'elle affiche une région ou les brasseries « autour de moi ». */
  protected close(): void {
    this.breweryService.selectedRegion.set(null);
    this.breweryService.clearNearby();
  }

  /** 650 m, 2,4 km, 18 km */
  protected formatDistance(km: number): string {
    if (km < 1) {
      return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
    }
    return km < 10 ? `${km.toFixed(1).replace('.', ',')} km` : `${Math.round(km)} km`;
  }
}
