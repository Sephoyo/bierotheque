export interface ContactMessagePayload {
  name?: string;
  email?: string;
  message: string;
  /** Honeypot anti-spam : doit rester vide, jamais affiché à un humain. */
  website_url?: string;
}

export interface BrewerySuggestionPayload {
  name: string;
  address?: string;
  postalCode?: string;
  city?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  /** Honeypot anti-spam : doit rester vide, jamais affiché à un humain. */
  company?: string;
}
