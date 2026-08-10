<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Brewery;
use App\Entity\BrewerySource;
use App\Repository\BreweryRepository;
use App\Service\FrenchRegionResolver;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Suggestions de brasseries par les visiteurs : créées non publiées
 * (Brewery::$published = false), invisibles sur la carte publique tant
 * qu'elles ne sont pas approuvées ici. Cf. App\Doctrine\BreweryPublishedExtension
 * pour le filtrage côté ressource API Platform publique.
 */
final class BrewerySuggestionController extends AbstractController
{
    #[Route('/api/breweries/suggest', name: 'brewery_suggest', methods: ['POST'])]
    public function suggest(
        Request $request,
        ValidatorInterface $validator,
        FrenchRegionResolver $regionResolver,
        EntityManagerInterface $entityManager,
    ): Response {
        $payload = json_decode($request->getContent(), true) ?? [];

        // Honeypot (champ "company", sans rapport avec un vrai champ du
        // formulaire) : un humain ne le remplit jamais.
        if (!empty($payload['company'])) {
            return new Response(status: Response::HTTP_NO_CONTENT);
        }

        $postalCode = is_string($payload['postalCode'] ?? null) ? $payload['postalCode'] : null;

        $socialLinks = array_filter([
            'facebook' => is_string($payload['facebook'] ?? null) ? $payload['facebook'] : null,
            'instagram' => is_string($payload['instagram'] ?? null) ? $payload['instagram'] : null,
            'twitter' => is_string($payload['twitter'] ?? null) ? $payload['twitter'] : null,
        ], static fn (?string $v) => null !== $v);

        $brewery = new Brewery();
        $brewery
            ->setName(is_string($payload['name'] ?? null) ? $payload['name'] : '')
            ->setAddress(is_string($payload['address'] ?? null) ? $payload['address'] : null)
            ->setPostalCode($postalCode)
            ->setCity(is_string($payload['city'] ?? null) ? $payload['city'] : null)
            ->setRegion($regionResolver->resolveFromPostalCode($postalCode))
            ->setWebsite(is_string($payload['website'] ?? null) ? $payload['website'] : null)
            ->setSocialLinks([] === $socialLinks ? null : $socialLinks)
            ->setDescription(is_string($payload['description'] ?? null) ? $payload['description'] : null)
            ->setLatitude(is_numeric($payload['latitude'] ?? null) ? (float) $payload['latitude'] : null)
            ->setLongitude(is_numeric($payload['longitude'] ?? null) ? (float) $payload['longitude'] : null)
            ->setSource(BrewerySource::Manual)
            ->setPublished(false);

        $violations = $validator->validate($brewery);
        if (count($violations) > 0) {
            $errors = [];
            foreach ($violations as $violation) {
                $errors[$violation->getPropertyPath()] = $violation->getMessage();
            }

            return $this->json(['errors' => $errors], Response::HTTP_BAD_REQUEST);
        }

        $entityManager->persist($brewery);
        $entityManager->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/breweries/pending', name: 'brewery_pending_list', methods: ['GET'])]
    public function pending(BreweryRepository $breweryRepository, SerializerInterface $serializer): JsonResponse
    {
        $pending = $breweryRepository->findBy(['published' => false], ['createdAt' => 'DESC']);

        $data = $serializer->normalize($pending, context: ['groups' => ['brewery:read']]);

        return $this->json($data);
    }

    #[Route('/api/breweries/pending/{id}/approve', name: 'brewery_pending_approve', methods: ['POST'])]
    public function approve(int $id, BreweryRepository $breweryRepository, EntityManagerInterface $entityManager): Response
    {
        $brewery = $this->findPendingOrFail($id, $breweryRepository);

        $brewery->setPublished(true);
        $entityManager->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/breweries/pending/{id}', name: 'brewery_pending_reject', methods: ['DELETE'])]
    public function reject(int $id, BreweryRepository $breweryRepository, EntityManagerInterface $entityManager): Response
    {
        $brewery = $this->findPendingOrFail($id, $breweryRepository);

        $entityManager->remove($brewery);
        $entityManager->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    /**
     * Ne cible délibérément que les brasseries non publiées : ces actions ne
     * doivent jamais pouvoir toucher une brasserie déjà publique via un id
     * deviné/quelconque.
     */
    private function findPendingOrFail(int $id, BreweryRepository $breweryRepository): Brewery
    {
        $brewery = $breweryRepository->findOneBy(['id' => $id, 'published' => false]);
        if (null === $brewery) {
            throw new NotFoundHttpException('Suggestion introuvable ou déjà traitée.');
        }

        return $brewery;
    }
}
