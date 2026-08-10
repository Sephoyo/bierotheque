import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { BrewerySuggestionPayload, ContactMessagePayload } from '../models/contact.model';
import { API_BASE_URL } from '../core/runtime-config';

export type ContactFormMode = 'contact' | 'suggest';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  readonly isOpen = signal(false);
  readonly mode = signal<ContactFormMode>('contact');

  open(mode: ContactFormMode): void {
    this.mode.set(mode);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  submitContactMessage(payload: ContactMessagePayload): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/contact`, payload);
  }

  submitBrewerySuggestion(payload: BrewerySuggestionPayload): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/breweries/suggest`, payload);
  }
}
