<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\ContactMessage;
use App\Repository\ContactMessageRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class ContactController extends AbstractController
{
    #[Route('/api/contact', name: 'contact_create', methods: ['POST'])]
    public function create(
        Request $request,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager,
    ): Response {
        $payload = json_decode($request->getContent(), true) ?? [];

        // Honeypot : un humain ne remplit jamais ce champ (caché en CSS côté
        // frontend). On répond succès sans rien persister pour ne pas
        // renseigner le bot sur l'échec.
        if (!empty($payload['website_url'])) {
            return new Response(status: Response::HTTP_NO_CONTENT);
        }

        $message = new ContactMessage();
        $message
            ->setName(is_string($payload['name'] ?? null) ? $payload['name'] : null)
            ->setEmail(is_string($payload['email'] ?? null) ? $payload['email'] : null)
            ->setMessage(is_string($payload['message'] ?? null) ? $payload['message'] : '');

        $violations = $validator->validate($message);
        if (count($violations) > 0) {
            $errors = [];
            foreach ($violations as $violation) {
                $errors[$violation->getPropertyPath()] = $violation->getMessage();
            }

            return $this->json(['errors' => $errors], Response::HTTP_BAD_REQUEST);
        }

        $entityManager->persist($message);
        $entityManager->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/contact/messages', name: 'contact_list', methods: ['GET'])]
    public function list(ContactMessageRepository $repository): JsonResponse
    {
        $messages = array_map(
            static fn (ContactMessage $m) => [
                'id' => $m->getId(),
                'name' => $m->getName(),
                'email' => $m->getEmail(),
                'message' => $m->getMessage(),
                'createdAt' => $m->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ],
            $repository->findAllOrderedByDate(),
        );

        return $this->json($messages);
    }
}
