import { DatePipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, inject, signal } from '@angular/core';
import { AnalyticsStats, ContactMessageRecord } from '../models/admin.model';
import { Brewery } from '../models/brewery.model';
import { BreweryEditSuggestionRecord } from '../models/edit-suggestion.model';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [FormsModule, DatePipe, KeyValuePipe],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {
  protected readonly adminService = inject(AdminService);

  protected username = '';
  protected password = '';
  protected readonly loggingIn = signal(false);
  protected readonly loginError = signal<string | null>(null);

  protected readonly pending = signal<Brewery[]>([]);
  protected readonly editSuggestions = signal<BreweryEditSuggestionRecord[]>([]);
  protected readonly messages = signal<ContactMessageRecord[]>([]);
  protected readonly stats = signal<AnalyticsStats | null>(null);

  constructor() {
    // Lien de connexion directe : /admin#auth=<base64 "user:pass">. Le fragment
    // (#…) n'est jamais envoyé au serveur ; on l'efface aussitôt de la barre
    // d'adresse et de l'historique avant même de vérifier le jeton.
    const match = window.location.hash.match(/^#auth=([A-Za-z0-9+/=_-]+)$/);
    if (match) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      const token = match[1].replace(/-/g, '+').replace(/_/g, '/');
      this.loggingIn.set(true);
      this.adminService.loginWithToken(token).subscribe((success) => {
        this.loggingIn.set(false);
        if (success) {
          this.loadAll();
        } else {
          this.loginError.set('Lien de connexion invalide.');
        }
      });
      return;
    }

    if (this.adminService.isAuthenticated()) {
      this.loadAll();
    }
  }

  protected login(): void {
    this.loggingIn.set(true);
    this.loginError.set(null);

    this.adminService.login(this.username, this.password).subscribe((success) => {
      this.loggingIn.set(false);
      if (success) {
        this.password = '';
        this.loadAll();
      } else {
        this.loginError.set('Identifiants invalides.');
      }
    });
  }

  protected logout(): void {
    this.adminService.logout();
  }

  protected approve(brewery: Brewery): void {
    this.adminService.approve(brewery.id).subscribe(() => {
      this.pending.update((list) => list.filter((b) => b.id !== brewery.id));
    });
  }

  protected reject(brewery: Brewery): void {
    this.adminService.reject(brewery.id).subscribe(() => {
      this.pending.update((list) => list.filter((b) => b.id !== brewery.id));
    });
  }

  protected approveEditSuggestion(suggestion: BreweryEditSuggestionRecord): void {
    this.adminService.approveEditSuggestion(suggestion.id).subscribe(() => {
      this.editSuggestions.update((list) => list.filter((s) => s.id !== suggestion.id));
    });
  }

  protected rejectEditSuggestion(suggestion: BreweryEditSuggestionRecord): void {
    this.adminService.rejectEditSuggestion(suggestion.id).subscribe(() => {
      this.editSuggestions.update((list) => list.filter((s) => s.id !== suggestion.id));
    });
  }

  private loadAll(): void {
    this.adminService.getPending().subscribe((pending) => this.pending.set(pending));
    this.adminService.getEditSuggestions().subscribe((suggestions) => this.editSuggestions.set(suggestions));
    this.adminService.getMessages().subscribe((messages) => this.messages.set(messages));
    this.adminService.getStats().subscribe((stats) => this.stats.set(stats));
  }
}
