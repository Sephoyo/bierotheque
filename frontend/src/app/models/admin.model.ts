export interface ContactMessageRecord {
  id: number;
  name: string | null;
  email: string | null;
  message: string;
  createdAt: string;
}

export interface AnalyticsStats {
  total: number;
  byCountry: { country: string; count: number }[];
  byDay: { day: string; count: number }[];
}
