<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\BreweryEditSuggestion;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<BreweryEditSuggestion>
 */
class BreweryEditSuggestionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BreweryEditSuggestion::class);
    }

    /**
     * @return BreweryEditSuggestion[]
     */
    public function findAllOrderedByDate(): array
    {
        return $this->createQueryBuilder('s')
            ->addOrderBy('s.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
