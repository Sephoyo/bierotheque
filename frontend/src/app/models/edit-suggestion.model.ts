export interface BreweryEditSuggestionPayload {
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  description?: string;
  /** Champ libre pour tout ce qui n'est pas couvert par les champs ci-dessus. */
  message?: string;
  /** Honeypot anti-spam : doit rester vide, jamais affiché à un humain. */
  company?: string;
}

export interface BreweryFieldSnapshot {
  website: string | null;
  socialLinks: Record<string, string> | null;
  description: string | null;
}

export interface BreweryEditSuggestionRecord {
  id: number;
  breweryId: number;
  breweryName: string;
  current: BreweryFieldSnapshot;
  proposed: BreweryFieldSnapshot;
  message: string | null;
  createdAt: string;
}
