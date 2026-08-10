import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../services/contact.service';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent {
  protected readonly contactService = inject(ContactService);

  // Formulaire "me contacter"
  protected name = '';
  protected email = '';
  protected message = '';
  protected websiteUrl = ''; // honeypot

  // Formulaire "proposer une brasserie"
  protected breweryName = '';
  protected address = '';
  protected postalCode = '';
  protected city = '';
  protected website = '';
  protected facebook = '';
  protected instagram = '';
  protected twitter = '';
  protected description = '';
  protected latitude: number | null = null;
  protected longitude: number | null = null;
  protected company = ''; // honeypot

  protected readonly submitting = signal(false);
  protected readonly success = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string> | null>(null);
  protected readonly generalError = signal<string | null>(null);

  protected switchMode(mode: 'contact' | 'suggest'): void {
    this.contactService.mode.set(mode);
    this.resetFeedback();
  }

  protected close(): void {
    this.contactService.close();
  }

  protected submitContact(): void {
    this.submitting.set(true);
    this.resetFeedback();

    this.contactService
      .submitContactMessage({
        name: this.name || undefined,
        email: this.email || undefined,
        message: this.message,
        website_url: this.websiteUrl || undefined,
      })
      .subscribe({
        next: () => {
          this.success.set('Message envoyé, merci !');
          this.name = '';
          this.email = '';
          this.message = '';
          this.submitting.set(false);
        },
        error: (err: HttpErrorResponse) => this.handleError(err),
      });
  }

  protected submitSuggestion(): void {
    this.submitting.set(true);
    this.resetFeedback();

    this.contactService
      .submitBrewerySuggestion({
        name: this.breweryName,
        address: this.address || undefined,
        postalCode: this.postalCode || undefined,
        city: this.city || undefined,
        website: this.website || undefined,
        facebook: this.facebook || undefined,
        instagram: this.instagram || undefined,
        twitter: this.twitter || undefined,
        description: this.description || undefined,
        latitude: this.latitude,
        longitude: this.longitude,
        company: this.company || undefined,
      })
      .subscribe({
        next: () => {
          this.success.set('Merci ! Ta suggestion sera publiée après vérification.');
          this.breweryName = '';
          this.address = '';
          this.postalCode = '';
          this.city = '';
          this.website = '';
          this.facebook = '';
          this.instagram = '';
          this.twitter = '';
          this.description = '';
          this.latitude = null;
          this.longitude = null;
          this.submitting.set(false);
        },
        error: (err: HttpErrorResponse) => this.handleError(err),
      });
  }

  private handleError(err: HttpErrorResponse): void {
    this.submitting.set(false);
    if (400 === err.status && err.error?.errors) {
      this.fieldErrors.set(err.error.errors);
    } else {
      this.generalError.set('Une erreur est survenue, réessaie plus tard.');
    }
  }

  private resetFeedback(): void {
    this.success.set(null);
    this.fieldErrors.set(null);
    this.generalError.set(null);
  }
}
