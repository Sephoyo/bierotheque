import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { Brewery } from '../models/brewery.model';
import { FRENCH_REGIONS, FrenchRegion } from '../models/region.model';
import { BreweryService } from '../services/brewery.service';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.scss',
})
export class NavBarComponent {
  private readonly breweryService = inject(BreweryService);
  private readonly searchInput$ = new Subject<string>();

  @Output() regionSelected = new EventEmitter<FrenchRegion>();
  @Output() brewerySelected = new EventEmitter<Brewery>();

  protected readonly regions = FRENCH_REGIONS;
  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<Brewery[]>([]);
  protected readonly searching = signal(false);

  constructor() {
    this.searchInput$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.trim().length < MIN_QUERY_LENGTH) {
            this.searching.set(false);
            return of<Brewery[]>([]);
          }
          this.searching.set(true);
          return this.breweryService.search(query.trim());
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.searchResults.set(results);
        this.searching.set(false);
      });
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  protected onSelectBrewery(brewery: Brewery): void {
    this.brewerySelected.emit(brewery);
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  protected onSelectRegion(regionName: string): void {
    const region = this.regions.find((r) => r.name === regionName);
    if (region) {
      this.regionSelected.emit(region);
    }
  }
}
