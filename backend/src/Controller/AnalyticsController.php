<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\PageView;
use App\Repository\PageViewRepository;
use App\Service\GeoLocationResolver;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Mesure d'audience anonyme et agrégée (pas de cookie, pas d'IP stockée) —
 * cf. App\Entity\PageView et App\Service\GeoLocationResolver.
 */
final class AnalyticsController extends AbstractController
{
    #[Route('/api/analytics/pageview', name: 'analytics_pageview', methods: ['POST'])]
    public function recordPageView(
        Request $request,
        GeoLocationResolver $geoLocationResolver,
        EntityManagerInterface $entityManager,
    ): Response {
        $payload = json_decode($request->getContent(), true) ?? [];
        $path = is_string($payload['path'] ?? null) ? $payload['path'] : '/';

        $location = $geoLocationResolver->resolve($request->getClientIp());

        $pageView = new PageView();
        $pageView
            ->setPath($path)
            ->setCountry($location['country'])
            ->setCity($location['city']);

        $entityManager->persist($pageView);
        $entityManager->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/analytics/stats', name: 'analytics_stats', methods: ['GET'])]
    public function stats(PageViewRepository $pageViewRepository): JsonResponse
    {
        return $this->json([
            'total' => $pageViewRepository->countTotal(),
            'byCountry' => $pageViewRepository->countByCountry(),
            'byDay' => $pageViewRepository->countByDay(),
        ]);
    }
}
