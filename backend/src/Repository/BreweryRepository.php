<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Brewery;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Brewery>
 */
class BreweryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Brewery::class);
    }

    /**
     * Restreint le QueryBuilder aux brasseries dont les coordonnées
     * tombent dans la bounding box donnée (sud, ouest, nord, est).
     */
    public function withinBbox(
        QueryBuilder $qb,
        float $south,
        float $west,
        float $north,
        float $east,
    ): QueryBuilder {
        $alias = $qb->getRootAliases()[0];

        return $qb
            ->andWhere("{$alias}.latitude BETWEEN :bboxSouth AND :bboxNorth")
            ->andWhere("{$alias}.longitude BETWEEN :bboxWest AND :bboxEast")
            ->setParameter('bboxSouth', $south)
            ->setParameter('bboxNorth', $north)
            ->setParameter('bboxWest', $west)
            ->setParameter('bboxEast', $east);
    }

    public function findOneByOsmId(string $osmId): ?Brewery
    {
        return $this->findOneBy(['osmId' => $osmId]);
    }
}
