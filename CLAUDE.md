# CLAUDE.md — Projet Bièrothèque

## Vue d'ensemble du projet
Application web de carte interactive répertoriant les brasseries artisanales de France (projet perso "Bièrothèque"). Stack : Symfony (API) + Angular (SPA) + Leaflet (carte) + PostgreSQL.

## Structure du repo
```
bierotheque/
├── backend/                 # Symfony 7 + API Platform
│   ├── src/
│   │   ├── Entity/Brewery.php
│   │   ├── Repository/BreweryRepository.php
│   │   ├── Command/ImportBreweriesCommand.php   # import via Overpass API
│   │   ├── Service/OverpassClient.php
│   │   └── ApiResource/ (si DTO API Platform)
│   ├── migrations/
│   └── config/
├── frontend/                 # Angular
│   ├── src/app/
│   │   ├── map/map.component.ts        # Leaflet + clustering
│   │   ├── brewery-detail/brewery-detail.component.ts  # panneau/drawer
│   │   ├── services/brewery.service.ts
│   │   └── models/brewery.model.ts
│   └── src/styles/_bierotheque-theme.scss
└── docker-compose.yml         # postgres + php + node
```

## Conventions de code
- **PHP** : PSR-12, typage strict (`declare(strict_types=1)`), Symfony best practices, API Platform pour l'exposition REST (annotations/attributs `#[ApiResource]`).
- **Angular** : composants standalone, signals pour l'état local, RxJS pour les flux HTTP, SCSS modulaire par composant.
- **Nommage** : entités et services en anglais, commentaires et messages utilisateurs en français.
- **Git** : commits atomiques, préfixes `feat:`, `fix:`, `chore:`, `docs:`.

## Modèle de données — entité Brewery
Champs clés : `id`, `name`, `latitude`, `longitude`, `address`, `postalCode`, `city`, `region`, `website` (nullable), `socialLinks` (json, nullable), `description` (text, nullable), `osmId` (unique, pour éviter les doublons à l'import), `source` (enum: `osm`, `manual`, `data_gouv`), `createdAt`, `updatedAt`.

## Source des données
1. **OpenStreetMap / Overpass API** (source principale, gratuite, licence ODbL) : requête Overpass sur les tags `craft=brewery`, `building=brewery`, `microbrewery=yes`, filtrée par la zone administrative réelle de la France (`area["ISO3166-1"="FR"]["admin_level"="2"]`), combinée à `[bbox:...]` (France métropolitaine + Corse, `OVERPASS_BBOX`) pour exclure les DOM-TOM. Pas de clé API nécessaire. Endpoint public : `https://overpass-api.de/api/interpreter`.
2. **data.gouv.fr / Annuaire des Entreprises** (code APE 11.05Z — Fabrication de bière) : source complémentaire pour enrichir avec SIRET et adresses officielles, utile pour valider/compléter les données OSM.
3. Les données manuelles (site web, réseaux sociaux, description, logo) peuvent être ajoutées via un back-office simple ou directement en base.

## Commandes utiles
```bash
# Backend
cd backend
composer install
php bin/console doctrine:migrations:migrate
php bin/console app:import-breweries          # lance l'import Overpass
symfony server:start                          # ou docker compose up

# Frontend
cd frontend
npm install
ng serve

# Docker (stack complète)
docker compose up -d
```

## Statut du scaffolding (2026-07-28)
- Backend : PHP 8.5 / Composer ont été installés (Homebrew) pour vérifier réellement le squelette écrit à la main. `composer install`/`composer validate` passent. Deux bugs réels ont été trouvés et corrigés à cette occasion : `framework.serializer.enable_annotations` n'existe plus (option retirée, remplacée par `enabled: true`), et `config/routes.yaml` faisait doublon avec `config/routes/api_platform.yaml` généré par la recette Symfony Flex d'API Platform (celle-ci ajoute le préfixe `/api` — `config/routes.yaml` a été supprimé). Versions finalement retenues après vérification des avis de sécurité Packagist : Symfony **7.4.x** (7.1.x a des CVE non patchées) et **api-platform/core ^4.3** (toute la branche 3.4.x est bloquée par advisories ; les namespaces `ApiPlatform\Metadata\*`/`ApiPlatform\Doctrine\Orm\Extension\*` restent identiques en 4.x). Vérifié en conditions réelles : `php bin/console list`, `lint:container`, `debug:container`, `debug:serializer`, `api:openapi:export` (routes `/api/breweries` et `/api/breweries/{id}` confirmées, filtres `region`/`city`/`name` exposés). PostgreSQL 16 installé via Homebrew (`brew install postgresql@16`, rôle `app`/base `bierotheque` créés pour matcher `DATABASE_URL`) : `doctrine:migrations:migrate` exécuté avec succès dans les deux sens (up/down/up). La migration initiale écrite à la main ne matchait pas exactement les métadonnées de l'entité (`doctrine:schema:validate` échouait : index `region`/`latitude,longitude` absents des attributs `#[ORM\Index]`, nom de contrainte unique différent, commentaire `DC2Type` manquant sur les colonnes `datetime_immutable`) — corrigé en ajoutant les attributs `#[ORM\Index]` sur `Brewery` et en régénérant la migration via `doctrine:migrations:diff` ; `doctrine:schema:validate` est désormais OK (mapping + DB en phase). Un test de persistance manuel (insert/fetch/delete via l'`EntityManager`, colonnes enum `source` et JSON `socialLinks`, lookup par `osmId`) a été exécuté avec succès contre la base réelle.
- Import réel exécuté deux fois contre l'API Overpass en production : un premier run avec un simple rectangle bbox a remonté 3229 éléments, dont des faux positifs hors de France (ex. Cornouailles au Royaume-Uni, brasseries suisses) puisqu'un rectangle ne suit pas les frontières réelles ; il a aussi révélé que `postal_code VARCHAR(10)` était trop court pour certains codes postaux OSM (migration corrective générée par `doctrine:migrations:diff`, colonne passée à `VARCHAR(32)`). La requête Overpass a été corrigée pour filtrer par la zone administrative réelle (`area["ISO3166-1"="FR"]["admin_level"="2"]`), combinée au `[bbox:...]` existant pour rester sur la France métropolitaine + Corse (exclut les DOM-TOM, rattachés à la même entité OSM). Comparaison vérifiée en direct sur l'API Overpass : 2076 résultats `craft=brewery` avec le rectangle seul contre 1100 avec le filtre par zone — près de la moitié de faux positifs éliminés. Le run final donne 1731 brasseries en base, sans plus aucune entrée hors de France. Cette requête par zone étant plus coûteuse côté serveur Overpass, le timeout du client HTTP a dû être relevé (`timeout: 200`, `max_duration: 220`) pour laisser le budget `[timeout:180]` de la requête s'exécuter sans que le client ne coupe la connexion en premier.
- Champ `region` : désormais renseigné à l'import. Vérification faite sur un échantillon de brasseries que OSM ne tague jamais `addr:region`/`is_in:region`/`addr:state` en France (seulement `addr:city`/`addr:postcode`/`addr:street`/`addr:housenumber`) — la région est donc déduite du code postal via `App\Service\FrenchRegionResolver` (2 premiers chiffres = département, table de correspondance vers les 13 régions métropolitaines + Corse + DOM). Sur les 1731 brasseries importées, 634 ont un code postal exploitable et se voient toutes attribuer une région (0 échec de résolution) ; les ~1097 restantes (pas de `addr:postcode` dans OSM) ont `region = NULL`, à enrichir manuellement ou via data.gouv.fr.
- Frontend : généré avec `@angular/cli@22` (`--file-name-style-guide=2016` pour conserver le nommage `*.component.ts` documenté ci-dessus), avec `leaflet@1.9.4` + `leaflet.markercluster@1.5.3` en intégration directe (pas de wrapper `ngx-leaflet`, non maintenu). `npm install`, `npx ng build` et `npx ng test --watch=false` exécutés avec succès.
- `docker-compose.yml`/`backend/Dockerfile` (racine) ont été écrits mais **non testés** (pas de Docker disponible). Notez aussi que la recette Symfony Flex de `doctrine/doctrine-bundle` a généré `backend/compose.yaml`/`compose.override.yaml` (service Postgres seul, pratique pour lancer juste la base en local) — distinct du `docker-compose.yml` racine qui containerise toute la stack.
- Déploiement Dokploy réel (2026-08-10) : le terminal web de Dokploy exécute `docker exec <conteneur> bash`, qui échouait sur `php` et `frontend` avec `exec: "bash": executable file not found in $PATH` — leurs images de base (`php:8.3-cli-alpine`, `nginx:1.27-alpine`) n'embarquent que `/bin/sh`, pas bash (contrairement à `postgres:16-alpine` qui l'inclut déjà). Corrigé en ajoutant `apk add --no-cache bash` dans `backend/Dockerfile` et `frontend/Dockerfile` ; les scripts `docker-entrypoint.sh` du projet restent volontairement en `#!/bin/sh` et n'en dépendent pas. Le conteneur `scheduler` (`mcuadros/ofelia:latest`) n'a pas de shell du tout (image quasi-scratch) et n'est pas corrigible de la même façon — pas grave, ce n'est pas un conteneur dans lequel on a besoin d'ouvrir un terminal.
- Bad Gateway sur les domaines Dokploy (2026-08-10) : le champ **"Container Port"** de chaque domaine (dashboard Dokploy → service → Domains) est resté sur la valeur par défaut `3000` proposée par le formulaire, qui ne correspond au port réel d'aucun des deux services web. Traefik routait donc vers un port où rien n'écoute. Ce réglage n'est **pas versionné** (il vit uniquement côté dashboard Dokploy, `docker-compose.yml` ne fait qu'en documenter la valeur attendue en commentaire) : il ne se corrige donc pas par un redeploy, il faut l'éditer manuellement dans Dokploy. Valeurs correctes constatées : `frontend` → **80** (nginx, cf. `EXPOSE 80` dans `frontend/Dockerfile`) ; `php` → **8000** (`exec php -S 0.0.0.0:8000 -t public` dans `backend/docker-entrypoint.sh`, cf. `EXPOSE 8000`).
- 404 Traefik persistant sur `apibierotheque.josephbaert.fr` malgré domaine/DNS/port corrects (2026-08-10) : diagnostiqué en SSH sur le VPS (`docker inspect <conteneur> --format '{{json .Config.Labels}}'`) — le conteneur `php` n'avait **aucun label `traefik.*`** (seulement les labels `ofelia.*` du repo), contrairement à `frontend` qui les avait tous. Cause : `providers.docker.exposedByDefault: false` dans la config statique de Traefik (`/etc/dokploy/traefik/traefik.yml`) — sans `traefik.enable=true` explicite, Traefik ignore totalement le conteneur (pas de routeur, donc pas de tentative de cert Let's Encrypt non plus, cohérent avec son absence dans `acme.json`). Dokploy est censé injecter ces labels dans le `docker-compose.yml` généré côté serveur (`/etc/dokploy/compose/<projet>/code/docker-compose.yml`) à partir de la config de domaine définie dans son UI, mais l'injection a échoué pour `php` (bug/glitch Dokploy ponctuel, cause non identifiée — reproductible potentiellement à un futur redeploy de `php`). Débloqué en ajoutant les labels `traefik.*` à la main dans ce fichier compose côté serveur (mêmes clés que celles générées pour `frontend`, adaptées au port 8000 et au domaine `apibierotheque.josephbaert.fr`) puis `docker compose up -d --force-recreate php`. **Ce correctif ne vit que sur le serveur, pas dans le repo** : un redeploy de `php` depuis Dokploy régénère ce fichier et peut faire disparaître les labels ajoutés à la main si le même bug se reproduit — si `apibierotheque.josephbaert.fr` se remet à 404 après un redeploy, revérifier `docker inspect` sur le conteneur `php` en premier réflexe.
- `TypeError: L.markerClusterGroup is not a function` en prod uniquement, alors que `npx ng build`/`ng test` passent (2026-08-10) : bug d'interop CJS→ESM d'esbuild avec `import * as L from 'leaflet'` + `import 'leaflet.markercluster'` (pattern pourtant recommandé par la doc de `leaflet.markercluster`). esbuild fige une **copie** des propriétés de l'objet `leaflet` au moment de l'import namespace (`__toESM`), *avant* que le side-effect import de `leaflet.markercluster` n'ait eu l'occasion de muter cet objet pour y ajouter `markerClusterGroup`/`MarkerClusterGroup` — confirmé en désassemblant le bundle prod (`main-*.js`) : la copie figée (`zn.markerClusterGroup`) n'a jamais la méthode, alors que la référence live sous-jacente (`zn.default.markerClusterGroup`, exposée via l'interop CJS) l'a bien. Corrigé dans `frontend/src/app/map/map.component.ts` en remplaçant l'import namespace par un import par défaut (`import L from 'leaflet'`), qui référence l'objet mutable en direct au lieu d'une copie — nécessite `"esModuleInterop": true` dans `frontend/tsconfig.json` (absent jusqu'ici) pour que TypeScript accepte cet import par défaut sur un module ambient qui ne déclare qu'`export as namespace L` (pas de vrai `export default`). Vérifié en réinspectant le bundle généré : les appels référencent bien `.default.marker`/`.default.markerClusterGroup` après le fix. `npx ng build --configuration production` et `npx ng test --watch=false` repassent avec succès.
- Feature "proposer une modification" (2026-08-11) : depuis la fiche détail (`brewery-detail.component`), un visiteur peut proposer un site web/réseaux sociaux/description/message libre sur une brasserie déjà publiée (`POST /api/breweries/{id}/suggest-edit`, honeypot `company`) — stocké dans une nouvelle entité `BreweryEditSuggestion`, jamais appliqué directement. Nouvelle section admin "Demandes de modification" (diff actuel/proposé) pour approuver/rejeter. **Point identifié en amont** : `ImportBreweriesCommand` réécrivait inconditionnellement `website`/`socialLinks` à chaque ré-import Overpass mensuel, y compris sur les brasseries déjà enrichies manuellement (seules les brasseries `source=manual` sans `osmId` y échappaient) — une modif approuvée aurait donc été silencieusement écrasée au prochain import. Corrigé en ajoutant `Brewery::$manuallyEditedFields` (json, verrouillé sur `website`/`socialLinks` à l'approbation via `Brewery::lockFields()`) que l'import vérifie désormais avant d'écraser ces deux champs (seuls concernés — `description` n'est jamais touché par l'import). Testé en conditions réelles contre la base Postgres locale (script ad hoc bootant le kernel Symfony, hors PHPUnit — aucune suite de tests n'existe encore sur ce repo) : création/approbation/rejet via les routes HTTP réelles (avec un hash admin temporaire, restauré ensuite), écrasement du champ verrouillé simulé et vérifié bloqué, `doctrine:migrations:diff`/up/down/up et `doctrine:schema:validate` OK. `npx ng build`/`--configuration production`/`ng test --watch=false` passent.
- 404 Traefik sur `apibierotheque.josephbaert.fr`, 2ème occurrence (2026-08-11) : même symptôme et même cause que le 2026-08-10 (conteneur `php` sans aucun label `traefik.*`, `frontend` intact) — redéclenché par un redeploy de `php` (fait pour appliquer un nouveau `ADMIN_PASSWORD_HASH`), confirmant que le bug d'injection Dokploy pour ce service n'est pas un incident isolé. Débloqué à nouveau à la main en SSH (mêmes labels que `frontend`, adaptés port 8000/domaine API), mais cette fois le correctif a été rendu **permanent** : les labels `traefik.*` du service `php` sont désormais codés en dur dans `docker-compose.yml` (versionné, donc re-tiré de git à chaque déploiement) au lieu de dépendre entièrement de l'injection dynamique de l'onglet "Domains" Dokploy — routeurs nommés `bierotheque-api-web`/`bierotheque-api-websecure` (fixes, indépendants du slug de projet Dokploy qui apparaît dans les noms auto-générés), domaine paramétré via la nouvelle variable requise `API_DOMAIN` (cf. `.env.example`). Garder aussi le domaine configuré côté UI Dokploy ne pose pas de problème (labels redondants au pire, pas de conflit).
- Connexion admin impossible après changement de mot de passe, toujours 401 malgré des identifiants corrects (2026-08-11) : la valeur collée dans la variable Dokploy `ADMIN_PASSWORD_HASH` avait un `$` en trop au tout début (`$$2y$13$...` au lieu de `$2y$13$...`), ajouté en pensant qu'il fallait échapper les signes dollar du hash bcrypt (piège classique avec Traefik/htpasswd dans des `docker-compose.yml`, mais **pas applicable ici** : la valeur vient de l'onglet Environment de Dokploy, consommée telle quelle par `${ADMIN_PASSWORD_HASH:?...}` dans `docker-compose.yml` — un seul passage d'interpolation, donc aucun échappement de `$` n'est nécessaire). Résultat : hash bcrypt invalide, `password_verify()` échoue systématiquement quel que soit le mot de passe. Confirmé en testant en direct avec `curl -u` contre l'API de prod (le mot de passe en clair correspondant au hash voulu donnait quand même 401). Corrigé en recollant le hash tel que généré par `security:hash-password`, sans aucun doublon de `$`.

## Style visuel "bièrothèque"
- Palette : ambré (#C68A2E), marron houblon (#4A2E1A), crème/parchemin (#F5E9D3), accent doré (#D9A441).
- Typographie : police serif/artisanale pour les titres (ex: "Fraunces" ou "Playfair Display"), sans-serif lisible pour le texte.
- Marqueurs Leaflet custom en forme de chope/houblon, clustering via `leaflet.markercluster`.
- Fiche détail façon étiquette de bière ou vieux parchemin (bordures, ombres douces, coins arrondis).

## API endpoints
- `GET /api/breweries?bbox=lat1,lng1,lat2,lng2` — liste filtrée par zone visible sur la carte.
- `GET /api/breweries/{id}` — détail d'une brasserie (id numérique uniquement, `requirements: ['id' => '\d+']`).
- `GET /api/breweries?region=Hauts-de-France` — filtre par région.
- `GET /api/breweries?name=`/`?city=` — recherche partielle (utilisée par la barre de recherche).
- `POST /api/breweries/suggest` — suggestion publique d'une brasserie (honeypot `company`, crée en `published=false`).
- `POST /api/breweries/{id}/suggest-edit` — proposition publique de modification d'une brasserie déjà publiée (site web, réseaux sociaux, description, message libre ; honeypot `company`). Crée une `BreweryEditSuggestion` en attente, n'écrit jamais directement sur la `Brewery` ciblée.
- `POST /api/contact` — message de contact public (honeypot `website_url`).
- `POST /api/analytics/pageview` — mesure d'audience anonyme (aucune IP stockée, cf. `GeoLocationResolver`).
- **Protégés par Basic Auth (`ROLE_ADMIN`)** : `GET /api/breweries/pending`, `POST /api/breweries/pending/{id}/approve`, `DELETE /api/breweries/pending/{id}`, `GET /api/breweries/edit-suggestions`, `POST /api/breweries/edit-suggestions/{id}/approve`, `DELETE /api/breweries/edit-suggestions/{id}`, `GET /api/contact/messages`, `GET /api/analytics/stats`.

## Espace admin
- Accessible sur le frontend via `/admin` (pas de lien visible depuis le site public — on y accède en tapant l'URL). Formulaire de connexion puis 4 sections : suggestions en attente (approuver/rejeter), demandes de modification (approuver/rejeter, avec diff actuel/proposé), messages de contact, stats de visite.
- Auth : un seul compte en mémoire (`config/packages/security.yaml`), identifiants dans `backend/.env` (`ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH`, ce dernier généré via `php bin/console security:hash-password`). HTTP Basic — ne chiffre rien par lui-même, la protection réelle vient du HTTPS une fois déployé.
- Le token (base64 `user:pass`) est stocké côté frontend en `sessionStorage` (effacé à la fermeture de l'onglet), pas en cookie.

## Points d'attention
- Dédupliquer les brasseries lors de l'import (clé `osmId`).
- Gérer le cas où `website`/`socialLinks` sont absents dans les données OSM (afficher un message "Site web non disponible").
- Prévoir la pagination ou le filtrage par bbox pour ne pas charger toutes les brasseries de France en une seule requête (perf carte).
- Respecter la limite de taux d'Overpass API (éviter les imports trop fréquents, mettre en cache/cron mensuel).
