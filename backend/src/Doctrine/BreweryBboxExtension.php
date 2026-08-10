<?php

declare(strict_types=1);

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Brewery;
use App\Repository\BreweryRepository;
use Doctrine\ORM\QueryBuilder;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Gère le filtre `?bbox=south,west,north,east` sur la collection de brasseries.
 * Ce n'est pas un filtre API Platform standard (paramètre multi-valeurs
 * non mappable un-à-un sur une propriété), d'où cette extension de requête dédiée.
 */
final class BreweryBboxExtension implements QueryCollectionExtensionInterface
{
    public function __construct(
        private readonly BreweryRepository $breweryRepository,
    ) {
    }

    public function applyToCollection(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = [],
    ): void {
        if (Brewery::class !== $resourceClass) {
            return;
        }

        $bbox = $context['filters']['bbox'] ?? null;

        if (null === $bbox || '' === $bbox) {
            return;
        }

        $coordinates = array_map('trim', explode(',', (string) $bbox));

        if (4 !== count($coordinates) || array_filter($coordinates, static fn (string $c) => !is_numeric($c)) !== []) {
            throw new BadRequestHttpException('Le paramètre "bbox" doit contenir 4 nombres séparés par des virgules : sud,ouest,nord,est.');
        }

        [$south, $west, $north, $east] = array_map('floatval', $coordinates);

        $this->breweryRepository->withinBbox($queryBuilder, $south, $west, $north, $east);
    }
}
