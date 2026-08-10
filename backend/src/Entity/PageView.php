<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\PageViewRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Vue de page anonyme et agrégée à des fins de mesure d'audience.
 * Aucune adresse IP n'est jamais stockée ici (résolue et jetée en amont,
 * cf. App\Service\GeoLocationResolver).
 */
#[ORM\Entity(repositoryClass: PageViewRepository::class)]
#[ORM\Table(name: 'page_view')]
#[ORM\Index(name: 'idx_page_view_viewed_at', columns: ['viewed_at'])]
class PageView
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $path = '/';

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $country = null;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $city = null;

    #[ORM\Column(name: 'viewed_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $viewedAt;

    public function __construct()
    {
        $this->viewedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function setPath(string $path): static
    {
        $this->path = $path;

        return $this;
    }

    public function getCountry(): ?string
    {
        return $this->country;
    }

    public function setCountry(?string $country): static
    {
        $this->country = $country;

        return $this;
    }

    public function getCity(): ?string
    {
        return $this->city;
    }

    public function setCity(?string $city): static
    {
        $this->city = $city;

        return $this;
    }

    public function getViewedAt(): \DateTimeImmutable
    {
        return $this->viewedAt;
    }
}
