import { BboxParams } from './brewery.model';

export interface FrenchRegion {
  name: string;
  bbox: BboxParams;
}

// Bboxes approximatives (suffisantes pour un zoom carte) — les noms doivent
// correspondre exactement aux valeurs produites par
// backend/src/Service/FrenchRegionResolver.php.
export const FRENCH_REGIONS: FrenchRegion[] = [
  { name: 'Auvergne-Rhône-Alpes', bbox: { south: 44.6, west: 2.05, north: 46.5, east: 7.2 } },
  { name: 'Bourgogne-Franche-Comté', bbox: { south: 46.15, west: 2.85, north: 48.4, east: 7.15 } },
  { name: 'Bretagne', bbox: { south: 47.2, west: -5.15, north: 48.9, east: -1.0 } },
  { name: 'Centre-Val de Loire', bbox: { south: 46.35, west: 0.05, north: 48.9, east: 3.15 } },
  { name: 'Corse', bbox: { south: 41.35, west: 8.5, north: 43.05, east: 9.6 } },
  { name: 'Grand Est', bbox: { south: 47.4, west: 3.35, north: 49.7, east: 8.25 } },
  { name: 'Hauts-de-France', bbox: { south: 48.8, west: 1.4, north: 51.1, east: 4.25 } },
  { name: 'Île-de-France', bbox: { south: 48.1, west: 1.4, north: 49.25, east: 3.6 } },
  { name: 'Normandie', bbox: { south: 48.15, west: -1.85, north: 50.1, east: 1.8 } },
  { name: 'Nouvelle-Aquitaine', bbox: { south: 42.75, west: -1.8, north: 46.9, east: 2.6 } },
  { name: 'Occitanie', bbox: { south: 42.3, west: -0.35, north: 45.05, east: 4.85 } },
  { name: 'Pays de la Loire', bbox: { south: 46.25, west: -2.6, north: 48.6, east: 0.9 } },
  { name: "Provence-Alpes-Côte d'Azur", bbox: { south: 42.95, west: 4.15, north: 45.2, east: 7.7 } },
];
