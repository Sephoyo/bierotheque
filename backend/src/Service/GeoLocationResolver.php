<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Résout pays/ville à partir d'une IP via un service tiers gratuit
 * (ip-api.com), sans jamais stocker l'IP elle-même. Échec silencieux : une
 * panne/lenteur du tiers ne doit jamais empêcher l'enregistrement d'une vue.
 */
final class GeoLocationResolver
{
    private const ENDPOINT = 'http://ip-api.com/json/%s?fields=status,country,city';
    private const TIMEOUT_SECONDS = 3.0;
    private const LOCAL_IPS = ['127.0.0.1', '::1'];

    public function __construct(
        private readonly HttpClientInterface $httpClient,
    ) {
    }

    /**
     * @return array{country: string|null, city: string|null}
     */
    public function resolve(?string $ip): array
    {
        $unknown = ['country' => null, 'city' => null];

        if (null === $ip || in_array($ip, self::LOCAL_IPS, true)) {
            return $unknown;
        }

        try {
            $response = $this->httpClient->request('GET', sprintf(self::ENDPOINT, $ip), [
                'timeout' => self::TIMEOUT_SECONDS,
                'max_duration' => self::TIMEOUT_SECONDS,
            ]);

            $data = $response->toArray(false);

            if ('success' !== ($data['status'] ?? null)) {
                return $unknown;
            }

            return [
                'country' => $data['country'] ?? null,
                'city' => $data['city'] ?? null,
            ];
        } catch (ExceptionInterface) {
            return $unknown;
        }
    }
}
