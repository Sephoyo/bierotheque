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

  protected close(): void {
    this.breweryService.selectedRegion.set(null);
  }
}
