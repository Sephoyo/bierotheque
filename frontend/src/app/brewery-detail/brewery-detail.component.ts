import { KeyValuePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BreweryService } from '../services/brewery.service';

@Component({
  selector: 'app-brewery-detail',
  standalone: true,
  imports: [KeyValuePipe, FormsModule],
  templateUrl: './brewery-detail.component.html',
  styleUrl: './brewery-detail.component.scss',
})
export class BreweryDetailComponent {
  private readonly breweryService = inject(BreweryService);

  protected readonly brewery = this.breweryService.selectedBrewery;

  // Formulaire "proposer une modification"
  protected readonly editFormOpen = signal(false);
  protected website = '';
  protected facebook = '';
  protected instagram = '';
  protected twitter = '';
  protected description = '';
  protected message = '';
  protected company = ''; // honeypot

  protected readonly submitting = signal(false);
  protected readonly success = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string> | null>(null);
  protected readonly generalError = signal<string | null>(null);

  constructor() {
    // Le composant reste monté en permanence (le drawer n'est qu'affiché/masqué
    // via @if dans son propre template) : sans ça, changer de brasserie
    // garderait le formulaire ouvert avec le message de succès précédent.
    effect(() => {
      this.brewery();
      this.editFormOpen.set(false);
      this.resetFeedback();
    });
  }

  protected close(): void {
    this.breweryService.selectedBrewery.set(null);
  }

  protected toggleEditForm(): void {
    this.editFormOpen.update((open) => !open);
    this.resetFeedback();
  }

  protected submitEdit(): void {
    const brewery = this.brewery();
    if (!brewery) {
      return;
    }

    this.submitting.set(true);
    this.resetFeedback();

    this.breweryService
      .suggestEdit(brewery.id, {
        website: this.website || undefined,
        facebook: this.facebook || undefined,
        instagram: this.instagram || undefined,
        twitter: this.twitter || undefined,
        description: this.description || undefined,
        message: this.message || undefined,
        company: this.company || undefined,
      })
      .subscribe({
        next: () => {
          this.success.set('Merci ! Ta proposition sera examinée par un admin.');
          this.website = '';
          this.facebook = '';
          this.instagram = '';
          this.twitter = '';
          this.description = '';
          this.message = '';
          this.submitting.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          if (400 === err.status && err.error?.errors) {
            this.fieldErrors.set(err.error.errors);
          } else {
            this.generalError.set('Une erreur est survenue, réessaie plus tard.');
          }
        },
      });
  }

  private resetFeedback(): void {
    this.success.set(null);
    this.fieldErrors.set(null);
    this.generalError.set(null);
  }
}
