export type BrewerySource = 'osm' | 'manual' | 'data_gouv';

export interface Brewery {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  region: string | null;
  website: string | null;
  socialLinks: Record<string, string> | null;
  description: string | null;
  osmId: string;
  source: BrewerySource;
  createdAt: string;
  updatedAt: string;
}

export interface BboxParams {
  south: number;
  west: number;
  north: number;
  east: number;
}
