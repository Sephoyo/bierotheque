# Prompt de génération — Bièrothèque Interactive (Symfony + Angular + Leaflet)

## Contexte
Je suis développeur full-stack (PHP/Symfony backend, Angular frontend). Je veux créer une application web appelée **"Bièrothèque"** : une carte interactive de France recensant les brasseries artisanales locales. L'utilisateur clique sur un point de la carte et une fiche s'affiche avec les infos de la brasserie (nom, adresse, site web, réseaux sociaux, description, types de bières produites si dispo).

## Stack technique imposée
- **Backend** : Symfony 7 (API Platform pour exposer une API REST), Doctrine ORM, base de données PostgreSQL (ou MySQL en local, migration Doctrine).
- **Frontend** : Angular (dernière version stable), Leaflet.js (via ngx-leaflet ou intégration directe), TailwindCSS ou SCSS custom pour un style "bièrothèque" (ambiance artisanale : tons ambrés, houblon, typographie type brasserie/pub).
- **Import de données** : Symfony Command (bin/console app:import-breweries) qui va chercher les brasseries françaises via l'API Overpass (OpenStreetMap, tag craft=brewery / building=brewery / microbrewery=yes en France) et les insère en base (nom, lat/lng, adresse, site web si dispo, source OSM id).
- **Enrichissement optionnel** : possibilité de scraper/compléter manuellement certains champs (logo, réseaux sociaux, description) via une entité Brewery éditable depuis un back-office simple.

## Fonctionnalités attendues
1. Carte Leaflet plein écran centrée sur la France avec clustering des marqueurs (leaflet.markercluster) pour éviter la surcharge visuelle.
2. Icônes de marqueur personnalisées en forme de houblon/chope de bière.
3. Au clic sur un marqueur : popup ou panneau latéral (drawer) affichant nom, adresse, ville, site web (lien cliquable), réseaux sociaux, description courte, éventuellement une photo.
4. Barre de recherche/filtre (par région, département ou nom de brasserie).
5. Design "bièrothèque" : palette ambrée/marron/doré, police type serif ou artisanale pour les titres, icônes houblon/chope, effet carte façon vieux parchemin ou étiquette de bière pour les fiches.
6. API REST Symfony exposant GET /api/breweries (liste + filtres géographiques bbox) et GET /api/breweries/{id}.
7. Import initial des données via Overpass API (pas de clé requise, données OpenStreetMap sous licence ODbL) avec un fallback/complément possible via le fichier data.gouv.fr des entreprises APE 11.05Z (fabrication de bière) pour enrichir avec les SIRET/adresses officielles.

## Livrables attendus
- Architecture de projet (arborescence dossiers backend/frontend).
- Entité Doctrine Brewery + migration.
- Commande Symfony d'import Overpass.
- Endpoint API Platform.
- Composant Angular MapComponent (Leaflet) + BreweryDetailComponent (drawer/panel).
- Service Angular BreweryService (appel API).
- Feuille de style SCSS "bièrothèque".
- Un CLAUDE.md documentant conventions, structure et commandes du projet (fourni séparément).

Génère-moi le code complet, en respectant les meilleures pratiques Symfony (API Platform, DTO si besoin) et Angular (standalone components, signals si Angular 17+, RxJS pour les appels HTTP). Commence par l'entité Brewery, la commande d'import Overpass, puis l'API, puis le frontend Angular avec Leaflet.