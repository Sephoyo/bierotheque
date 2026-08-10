<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Client pour l'API Overpass (OpenStreetMap) : construit la requête Overpass QL
 * ciblant les brasseries françaises et normalise les résultats bruts.
 */
final class OverpassClient
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly FrenchRegionResolver $regionResolver,
        private readonly string $endpoint,
        private readonly string $bbox,
    ) {
    }

    public function buildQuery(): string
    {
        $bbox = $this->bbox;

        // Filtre par polygone administratif réel de la France (area) plutôt que par
        // simple rectangle : un bbox seul capture aussi des brasseries hors de France
        // (ex. Cornouailles au Royaume-Uni, Suisse, Belgique...) dès lors qu'elles
        // tombent dans le rectangle. Le [bbox:...] global reste en complément pour
        // borner la zone à la France métropolitaine + Corse (et exclure les DOM-TOM,
        // rattachés à la même entité administrative "France" dans OSM).
        return <<<OVERPASS_QL
            [out:json][timeout:180][bbox:{$bbox}];
            area["ISO3166-1"="FR"]["admin_level"="2"]->.france;
            (
              node["craft"="brewery"](area.france);
              way["craft"="brewery"](area.france);
              relation["craft"="brewery"](area.france);
              node["building"="brewery"](area.france);
              way["building"="brewery"](area.france);
              node["microbrewery"="yes"](area.france);
              way["microbrewery"="yes"](area.france);
            );
            out center tags;
            OVERPASS_QL;
    }

    /**
     * Interroge Overpass et retourne les éléments normalisés (dédoublonnage
     * par osmId délégué à l'appelant, cf. ImportBreweriesCommand).
     *
     * @return list<array{
     *     osmId: string,
     *     name: string,
     *     lat: float,
     *     lon: float,
     *     address: string|null,
     *     postalCode: string|null,
     *     city: string|null,
     *     region: string|null,
     *     website: string|null,
     *     socialLinks: array<string, string>|null,
     * }>
     */
    public function fetchFranceBreweries(): array
    {
        // Le corps de la requête Overpass QL fixe [timeout:180] côté serveur ; le
        // client HTTP doit tolérer une attente au moins aussi longue (la requête par
        // zone administrative réelle est plus coûteuse qu'un simple bbox rectangulaire).
        $response = $this->httpClient->request('POST', $this->endpoint, [
            'body' => ['data' => $this->buildQuery()],
            'timeout' => 200,
            'max_duration' => 220,
        ]);

        $elements = $response->toArray()['elements'] ?? [];

        $breweries = [];
        foreach ($elements as $element) {
            $normalized = $this->normalizeElement($element);
            if (null !== $normalized) {
                $breweries[] = $normalized;
            }
        }

        return $breweries;
    }

    /**
     * @param array<string, mixed> $element
     *
     * @return array{
     *     osmId: string,
     *     name: string,
     *     lat: float,
     *     lon: float,
     *     address: string|null,
     *     postalCode: string|null,
     *     city: string|null,
     *     region: string|null,
     *     website: string|null,
     *     socialLinks: array<string, string>|null,
     * }|null
     */
    private function normalizeElement(array $element): ?array
    {
        $type = $element['type'] ?? null;
        $id = $element['id'] ?? null;

        if (null === $type || null === $id) {
            return null;
        }

        $lat = $element['lat'] ?? $element['center']['lat'] ?? null;
        $lon = $element['lon'] ?? $element['center']['lon'] ?? null;

        if (null === $lat || null === $lon) {
            return null;
        }

        /** @var array<string, string> $tags */
        $tags = $element['tags'] ?? [];

        $name = $tags['name'] ?? 'Brasserie sans nom';

        $address = $this->buildAddress($tags);

        $website = $tags['website'] ?? $tags['contact:website'] ?? null;

        $socialLinks = $this->extractSocialLinks($tags);
        $postalCode = $tags['addr:postcode'] ?? null;

        return [
            'osmId' => "{$type}/{$id}",
            'name' => $name,
            'lat' => (float) $lat,
            'lon' => (float) $lon,
            'address' => $address,
            'postalCode' => $postalCode,
            'city' => $tags['addr:city'] ?? null,
            'region' => $this->regionResolver->resolveFromPostalCode($postalCode),
            'website' => $website,
            'socialLinks' => [] === $socialLinks ? null : $socialLinks,
        ];
    }

    /**
     * @param array<string, string> $tags
     */
    private function buildAddress(array $tags): ?string
    {
        $parts = array_filter([
            $tags['addr:housenumber'] ?? null,
            $tags['addr:street'] ?? null,
        ]);

        return [] === $parts ? null : implode(' ', $parts);
    }

    /**
     * @param array<string, string> $tags
     *
     * @return array<string, string>
     */
    private function extractSocialLinks(array $tags): array
    {
        $map = [
            'facebook' => $tags['contact:facebook'] ?? null,
            'instagram' => $tags['contact:instagram'] ?? null,
            'twitter' => $tags['contact:twitter'] ?? null,
        ];

        return array_filter($map, static fn (?string $value) => null !== $value);
    }
}
