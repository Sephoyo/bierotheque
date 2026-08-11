<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\BreweryRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: BreweryRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Table(name: 'brewery')]
#[ORM\Index(name: 'idx_brewery_region', columns: ['region'])]
#[ORM\Index(name: 'idx_brewery_lat_lng', columns: ['latitude', 'longitude'])]
#[ApiResource(
    operations: [
        new GetCollection(),
        // `requirements` force un id numérique : sans ça, cette route générique
        // /api/breweries/{id} intercepte aussi /api/breweries/pending|suggest
        // (routes custom de BrewerySuggestionController) avant qu'elles ne soient
        // essayées, puisque les routes API Platform sont chargées en premier.
        new Get(requirements: ['id' => '\d+']),
    ],
    normalizationContext: ['groups' => ['brewery:read']],
    paginationItemsPerPage: 30,
)]
#[ApiFilter(SearchFilter::class, properties: [
    'region' => 'exact',
    'city' => 'partial',
    'name' => 'partial',
])]
class Brewery
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['brewery:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Groups(['brewery:read'])]
    private string $name = '';

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    #[Assert\Range(min: -90, max: 90)]
    #[Groups(['brewery:read'])]
    private ?float $latitude = null;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    #[Assert\Range(min: -180, max: 180)]
    #[Groups(['brewery:read'])]
    private ?float $longitude = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['brewery:read'])]
    private ?string $address = null;

    #[ORM\Column(name: 'postal_code', length: 32, nullable: true)]
    #[Groups(['brewery:read'])]
    private ?string $postalCode = null;

    #[ORM\Column(length: 120, nullable: true)]
    #[Groups(['brewery:read'])]
    private ?string $city = null;

    #[ORM\Column(length: 120, nullable: true)]
    #[Groups(['brewery:read'])]
    private ?string $region = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Url]
    #[Groups(['brewery:read'])]
    private ?string $website = null;

    /**
     * @var array<string, string>|null
     */
    #[ORM\Column(name: 'social_links', type: Types::JSON, nullable: true)]
    #[Groups(['brewery:read'])]
    private ?array $socialLinks = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['brewery:read'])]
    private ?string $description = null;

    #[ORM\Column(name: 'osm_id', length: 50, unique: true, nullable: true)]
    #[Groups(['brewery:read'])]
    private ?string $osmId = null;

    /**
     * Noms des champs ("website", "socialLinks") verrouillés suite à
     * l'approbation d'une BreweryEditSuggestion : App\Command\ImportBreweriesCommand
     * doit les ignorer lors du prochain import Overpass pour ne pas écraser
     * une modification humaine avec les données (souvent vides) d'OSM.
     *
     * @var list<string>|null
     */
    #[ORM\Column(name: 'manually_edited_fields', type: Types::JSON, nullable: true)]
    private ?array $manuallyEditedFields = null;

    #[ORM\Column(length: 20, enumType: BrewerySource::class)]
    #[Groups(['brewery:read'])]
    private BrewerySource $source = BrewerySource::Osm;

    /**
     * Contrôle la visibilité sur la carte publique. Les brasseries importées
     * d'OSM sont publiées d'office ; les suggestions manuelles restent en
     * attente de modération jusqu'à validation (cf. BreweryPublishedExtension).
     */
    #[ORM\Column]
    #[Groups(['brewery:read'])]
    private bool $published = true;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['brewery:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['brewery:read'])]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getLatitude(): ?float
    {
        return $this->latitude;
    }

    public function setLatitude(?float $latitude): static
    {
        $this->latitude = $latitude;

        return $this;
    }

    public function getLongitude(): ?float
    {
        return $this->longitude;
    }

    public function setLongitude(?float $longitude): static
    {
        $this->longitude = $longitude;

        return $this;
    }

    public function getAddress(): ?string
    {
        return $this->address;
    }

    public function setAddress(?string $address): static
    {
        $this->address = $address;

        return $this;
    }

    public function getPostalCode(): ?string
    {
        return $this->postalCode;
    }

    public function setPostalCode(?string $postalCode): static
    {
        $this->postalCode = $postalCode;

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

    public function getRegion(): ?string
    {
        return $this->region;
    }

    public function setRegion(?string $region): static
    {
        $this->region = $region;

        return $this;
    }

    public function getWebsite(): ?string
    {
        return $this->website;
    }

    public function setWebsite(?string $website): static
    {
        $this->website = $website;

        return $this;
    }

    /**
     * @return array<string, string>|null
     */
    public function getSocialLinks(): ?array
    {
        return $this->socialLinks;
    }

    /**
     * @param array<string, string>|null $socialLinks
     */
    public function setSocialLinks(?array $socialLinks): static
    {
        $this->socialLinks = $socialLinks;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getOsmId(): ?string
    {
        return $this->osmId;
    }

    public function setOsmId(?string $osmId): static
    {
        $this->osmId = $osmId;

        return $this;
    }

    /**
     * @return list<string>
     */
    public function getManuallyEditedFields(): array
    {
        return $this->manuallyEditedFields ?? [];
    }

    /**
     * Ajoute des noms de champs à la liste verrouillée, sans dupliquer.
     *
     * @param list<string> $fields
     */
    public function lockFields(array $fields): static
    {
        $this->manuallyEditedFields = array_values(array_unique([...$this->getManuallyEditedFields(), ...$fields]));

        return $this;
    }

    public function getSource(): BrewerySource
    {
        return $this->source;
    }

    public function setSource(BrewerySource $source): static
    {
        $this->source = $source;

        return $this;
    }

    public function isPublished(): bool
    {
        return $this->published;
    }

    public function setPublished(bool $published): static
    {
        $this->published = $published;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
