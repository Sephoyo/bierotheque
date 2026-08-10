import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { AnalyticsStats, ContactMessageRecord } from '../models/admin.model';
import { Brewery } from '../models/brewery.model';
import { API_BASE_URL } from '../core/runtime-config';

const STORAGE_KEY = 'bierotheque_admin_token';

/**
 * Session admin en HTTP Basic. Le jeton (base64 "user:pass") vit en
 * sessionStorage (effacé à la fermeture de l'onglet, contrairement à
 * localStorage) — suffisant pour un unique compte perso, cf. plan.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  readonly isAuthenticated = signal(this.hasStoredToken());

  private hasStoredToken(): boolean {
    return null !== sessionStorage.getItem(STORAGE_KEY);
  }

  private authHeaders(): HttpHeaders {
    const token = sessionStorage.getItem(STORAGE_KEY) ?? '';
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }

  /**
   * Vérifie les identifiants pour de vrai en tentant un appel réel — pas de
   * validation "à l'aveugle" côté client.
   */
  login(username: string, password: string): Observable<boolean> {
    const token = btoa(`${username}:${password}`);
    const headers = new HttpHeaders({ Authorization: `Basic ${token}` });

    return this.http.get(`${API_BASE_URL}/breweries/pending`, { headers }).pipe(
      map(() => {
        sessionStorage.setItem(STORAGE_KEY, token);
        this.isAuthenticated.set(true);
        return true;
      }),
      catchError(() => of(false)),
    );
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.isAuthenticated.set(false);
  }

  getPending(): Observable<Brewery[]> {
    return this.authorized(() => this.http.get<Brewery[]>(`${API_BASE_URL}/breweries/pending`, { headers: this.authHeaders() }));
  }

  approve(id: number): Observable<void> {
    return this.authorized(() => this.http.post<void>(`${API_BASE_URL}/breweries/pending/${id}/approve`, null, { headers: this.authHeaders() }));
  }

  reject(id: number): Observable<void> {
    return this.authorized(() => this.http.delete<void>(`${API_BASE_URL}/breweries/pending/${id}`, { headers: this.authHeaders() }));
  }

  getMessages(): Observable<ContactMessageRecord[]> {
    return this.authorized(() => this.http.get<ContactMessageRecord[]>(`${API_BASE_URL}/contact/messages`, { headers: this.authHeaders() }));
  }

  getStats(): Observable<AnalyticsStats> {
    return this.authorized(() => this.http.get<AnalyticsStats>(`${API_BASE_URL}/analytics/stats`, { headers: this.authHeaders() }));
  }

  /**
   * Si le jeton stocké n'est plus valide (ex. identifiants changés côté
   * serveur), une 401 nous fait revenir proprement à l'écran de connexion.
   */
  private authorized<T>(request: () => Observable<T>): Observable<T> {
    return request().pipe(
      catchError((err: HttpErrorResponse) => {
        if (401 === err.status) {
          this.logout();
        }
        return throwError(() => err);
      }),
    );
  }
}
