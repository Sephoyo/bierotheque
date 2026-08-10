import { KeyValuePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BreweryService } from '../services/brewery.service';

@Component({
  selector: 'app-brewery-detail',
  standalone: true,
  imports: [KeyValuePipe],
  templateUrl: './brewery-detail.component.html',
  styleUrl: './brewery-detail.component.scss',
})
export class BreweryDetailComponent {
  private readonly breweryService = inject(BreweryService);

  protected readonly brewery = this.breweryService.selectedBrewery;

  protected close(): void {
    this.breweryService.selectedBrewery.set(null);
  }
}
