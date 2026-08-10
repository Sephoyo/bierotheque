<?php

declare(strict_types=1);

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Extension\QueryItemExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Brewery;
use Doctrine\ORM\QueryBuilder;

/**
 * Masque systématiquement les brasseries non publiées (suggestions en attente
 * de modération, cf. Brewery::$published) sur la ressource API Platform
 * publique — que ce soit via la collection (?bbox=/?region=...) ou un accès
 * direct par id, pour qu'une suggestion non validée ne fuite jamais.
 */
final class BreweryPublishedExtension implements QueryCollectionExtensionInterface, QueryItemExtensionInterface
{
    public function applyToCollection(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = [],
    ): void {
        $this->addPublishedFilter($queryBuilder, $resourceClass);
    }

    public function applyToItem(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        array $identifiers,
        ?Operation $operation = null,
        array $context = [],
    ): void {
        $this->addPublishedFilter($queryBuilder, $resourceClass);
    }

    private function addPublishedFilter(QueryBuilder $queryBuilder, string $resourceClass): void
    {
        if (Brewery::class !== $resourceClass) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $queryBuilder->andWhere("{$alias}.published = true");
    }
}
