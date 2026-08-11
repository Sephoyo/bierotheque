<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\BreweryEditSuggestion;
use App\Repository\BreweryEditSuggestionRepository;
use App\Repository\BreweryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Demandes de modification (site web / réseaux sociaux / description) sur
 * une brasserie déjà publiée, proposées par un visiteur depuis la fiche
 * détail. Restent en attente (BreweryEditSuggestion) jusqu'à approbation ici
 * — jamais appliquées directement à la Brewery ciblée.
 */
final class BreweryEditSuggestionController extends AbstractController
{
    #[Route('/api/breweries/{id}/suggest-edit', name: 'brewery_suggest_edit', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function suggest(
        int $id,
        Request $request,
        ValidatorInterface $validator,
        BreweryRepository $breweryRepository,
        EntityManagerInterface $entityManager,
    ): Response {
        $payload = json_decode($request->getContent(), true) ?? [];

        // Honeypot (champ "company", même convention que /api/breweries/suggest).
        if (!empty($payload['company'])) {
            return new Response(status: Response::HTTP_NO_CONTENT);
        }

        $brewery = $breweryRepository->findOneBy(['id' => $id, 'published' => true]);
        if (null === $brewery) {
            throw new NotFoundHttpException('Brasserie introuvable.');
        }

        $socialLinks = array_filter([
            'facebook' => is_string($payload['facebook'] ?? null) ? $payload['facebook'] : null,
            'instagram' => is_string($payload['instagram'] ?? null) ? $payload['instagram'] : null,
            'twitter' => is_string($payload['twitter'] ?? null) ? $payload['twitter'] : null,
        ], static fn (?string $v) => null !== $v);

        $website = is_string($payload['website'] ?? null) && '' !== $payload['website'] ? $payload['website'] : null;
        $description = is_string($payload['description'] ?? null) && '' !== $payload['description'] ? $payload['description'] : null;
        $message = is_string($payload['message'] ?? null) && '' !== $payload['message'] ? $payload['message'] : null;

        // Au moins un champ doit être renseigné, sinon la demande n'apporte rien.
        if (null === $website && [] === $socialLinks && null === $description && null === $message) {
            return $this->json(['errors' => ['_' => 'Merci de renseigner au moins un champ.']], Response::HTTP_BAD_REQUEST);
        }

        $suggestion = new BreweryEditSuggestion();
        $suggestion
            ->setBrewery($brewery)
            ->setProposedWebsite($website)
            ->setProposedSocialLinks([] === $socialLinks ? null : $socialLinks)
            ->setProposedDescription($description)
            ->setMessage($message);

        $violations = $validator->validate($suggestion);
        if (count($violations) > 0) {
            $errors = [];
            foreach ($violations as $violation) {
                $errors[$violation->getPropertyPath()] = $violation->getMessage();
            }

            return $this->json(['errors' => $errors], Response::HTTP_BAD_REQUEST);
        }

        $entityManager->persist($suggestion);
        $entityManager->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/breweries/edit-suggestions', name: 'brewery_edit_suggestion_list', methods: ['GET'])]
    public function list(BreweryEditSuggestionRepository $repository): JsonResponse
    {
        $data = array_map(
            static fn (BreweryEditSuggestion $s) => [
                'id' => $s->getId(),
                'breweryId' => $s->getBrewery()?->getId(),
                'breweryName' => $s->getBrewery()?->getName(),
                'current' => [
                    'website' => $s->getBrewery()?->getWebsite(),
                    'socialLinks' => $s->getBrewery()?->getSocialLinks(),
                    'description' => $s->getBrewery()?->getDescription(),
                ],
                'proposed' => [
                    'website' => $s->getProposedWebsite(),
                    'socialLinks' => $s->getProposedSocialLinks(),
                    'description' => $s->getProposedDescription(),
                ],
                'message' => $s->getMessage(),
                'createdAt' => $s->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ],
            $repository->findAllOrderedByDate(),
        );

        return $this->json($data);
    }

    #[Route('/api/breweries/edit-suggestions/{id}/approve', name: 'brewery_edit_suggestion_approve', methods: ['POST'])]
    public function approve(
        int $id,
        BreweryEditSuggestionRepository $repository,
        EntityManagerInterface $entityManager,
    ): Response {
        $suggestion = $this->findOrFail($id, $repository);
        $brewery = $suggestion->getBrewery();
        if (null === $brewery) {
            throw new NotFoundHttpException('Brasserie introuvable.');
        }

        // Seuls website/socialLinks sont écrasés par le prochain import
        // Overpass (cf. ImportBreweriesCommand) : on ne verrouille que ceux-ci.
        $lockedFields = [];
        if (null !== $suggestion->getProposedWebsite()) {
            $brewery->setWebsite($suggestion->getProposedWebsite());
            $lockedFields[] = 'website';
        }
        if (null !== $suggestion->getProposedSocialLinks()) {
            $brewery->setSocialLinks($suggestion->getProposedSocialLinks());
            $lockedFields[] = 'socialLinks';
        }
        if (null !== $suggestion->getProposedDescription()) {
            $brewery->setDescription($suggestion->getProposedDescription());
        }
        $brewery->lockFields($lockedFields);

        $entityManager->remove($suggestion);
        $entityManager->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/breweries/edit-suggestions/{id}', name: 'brewery_edit_suggestion_reject', methods: ['DELETE'])]
    public function reject(
        int $id,
        BreweryEditSuggestionRepository $repository,
        EntityManagerInterface $entityManager,
    ): Response {
        $suggestion = $this->findOrFail($id, $repository);

        $entityManager->remove($suggestion);
        $entityManager->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    private function findOrFail(int $id, BreweryEditSuggestionRepository $repository): BreweryEditSuggestion
    {
        $suggestion = $repository->find($id);
        if (null === $suggestion) {
            throw new NotFoundHttpException('Demande de modification introuvable ou déjà traitée.');
        }

        return $suggestion;
    }
}
