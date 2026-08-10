import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, inject, signal } from '@angular/core';
import { AnalyticsStats, ContactMessageRecord } from '../models/admin.model';
import { Brewery } from '../models/brewery.model';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
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
  protected readonly messages = signal<ContactMessageRecord[]>([]);
  protected readonly stats = signal<AnalyticsStats | null>(null);

  constructor() {
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

  private loadAll(): void {
    this.adminService.getPending().subscribe((pending) => this.pending.set(pending));
    this.adminService.getMessages().subscribe((messages) => this.messages.set(messages));
    this.adminService.getStats().subscribe((stats) => this.stats.set(stats));
  }
}
