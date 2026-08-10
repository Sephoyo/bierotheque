<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\PageView;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PageView>
 */
class PageViewRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PageView::class);
    }

    public function countTotal(): int
    {
        return (int) $this->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @return list<array{country: string, count: int}>
     */
    public function countByCountry(int $limit = 10): array
    {
        $rows = $this->createQueryBuilder('p')
            ->select('p.country AS country, COUNT(p.id) AS count')
            ->where('p.country IS NOT NULL')
            ->groupBy('p.country')
            ->orderBy('count', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getArrayResult();

        return array_map(
            static fn (array $row) => ['country' => $row['country'], 'count' => (int) $row['count']],
            $rows,
        );
    }

    /**
     * @return list<array{day: string, count: int}>
     */
    public function countByDay(int $days = 30): array
    {
        $sql = <<<'SQL'
            SELECT viewed_at::date AS day, COUNT(*) AS count
            FROM page_view
            WHERE viewed_at >= (CURRENT_DATE - make_interval(days => :days))
            GROUP BY day
            ORDER BY day ASC
            SQL;

        $rows = $this->getEntityManager()->getConnection()
            ->executeQuery($sql, ['days' => $days])
            ->fetchAllAssociative();

        return array_map(
            static fn (array $row) => ['day' => $row['day'], 'count' => (int) $row['count']],
            $rows,
        );
    }
}
