<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\BreweryEditSuggestionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Demande de modification d'une brasserie déjà publiée, proposée par un
 * visiteur depuis la fiche détail (site web, réseaux sociaux, description).
 * Reste en attente jusqu'à traitement par un admin (cf. BreweryEditSuggestionController)
 * — n'est jamais appliquée directement à la Brewery ciblée.
 */
#[ORM\Entity(repositoryClass: BreweryEditSuggestionRepository::class)]
#[ORM\Table(name: 'brewery_edit_suggestion')]
class BreweryEditSuggestion
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /**
     * Suppression en cascade : une suggestion n'a plus de sens si la
     * brasserie ciblée disparaît (rejet de la brasserie elle-même, etc.).
     */
    #[ORM\ManyToOne(targetEntity: Brewery::class)]
    #[ORM\JoinColumn(name: 'brewery_id', nullable: false, onDelete: 'CASCADE')]
    private ?Brewery $brewery = null;

    #[ORM\Column(name: 'proposed_website', length: 255, nullable: true)]
    #[Assert\Url]
    private ?string $proposedWebsite = null;

    /**
     * @var array<string, string>|null
     */
    #[ORM\Column(name: 'proposed_social_links', type: Types::JSON, nullable: true)]
    private ?array $proposedSocialLinks = null;

    #[ORM\Column(name: 'proposed_description', type: Types::TEXT, nullable: true)]
    private ?string $proposedDescription = null;

    /**
     * Message libre pour tout ce qui n'est pas couvert par les champs
     * ci-dessus (ex: "l'adresse a changé", "la brasserie a fermé") — affiché
     * à l'admin mais jamais appliqué automatiquement.
     */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $message = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getBrewery(): ?Brewery
    {
        return $this->brewery;
    }

    public function setBrewery(?Brewery $brewery): static
    {
        $this->brewery = $brewery;

        return $this;
    }

    public function getProposedWebsite(): ?string
    {
        return $this->proposedWebsite;
    }

    public function setProposedWebsite(?string $proposedWebsite): static
    {
        $this->proposedWebsite = $proposedWebsite;

        return $this;
    }

    /**
     * @return array<string, string>|null
     */
    public function getProposedSocialLinks(): ?array
    {
        return $this->proposedSocialLinks;
    }

    /**
     * @param array<string, string>|null $proposedSocialLinks
     */
    public function setProposedSocialLinks(?array $proposedSocialLinks): static
    {
        $this->proposedSocialLinks = $proposedSocialLinks;

        return $this;
    }

    public function getProposedDescription(): ?string
    {
        return $this->proposedDescription;
    }

    public function setProposedDescription(?string $proposedDescription): static
    {
        $this->proposedDescription = $proposedDescription;

        return $this;
    }

    public function getMessage(): ?string
    {
        return $this->message;
    }

    public function setMessage(?string $message): static
    {
        $this->message = $message;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
