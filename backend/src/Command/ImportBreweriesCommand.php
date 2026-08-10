<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Brewery;
use App\Entity\BrewerySource;
use App\Repository\BreweryRepository;
use App\Service\OverpassClient;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:import-breweries',
    description: 'Importe les brasseries françaises depuis Overpass API (OpenStreetMap)',
)]
final class ImportBreweriesCommand extends Command
{
    private const FLUSH_BATCH_SIZE = 50;

    public function __construct(
        private readonly OverpassClient $overpassClient,
        private readonly EntityManagerInterface $entityManager,
        private readonly BreweryRepository $breweryRepository,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Import des brasseries depuis Overpass API');

        $io->section('Requête Overpass en cours (peut prendre jusqu\'à quelques minutes)...');
        $elements = $this->overpassClient->fetchFranceBreweries();
        $io->success(sprintf('%d élément(s) reçu(s) depuis Overpass.', count($elements)));

        $created = 0;
        $updated = 0;

        $progressBar = $io->createProgressBar(count($elements));
        $progressBar->start();

        $processed = 0;
        foreach ($elements as $element) {
            $brewery = $this->breweryRepository->findOneByOsmId($element['osmId']);

            if (null === $brewery) {
                $brewery = new Brewery();
                $brewery->setOsmId($element['osmId']);
                $brewery->setSource(BrewerySource::Osm);
                ++$created;
            } else {
                ++$updated;
            }

            $brewery
                ->setName($element['name'])
                ->setLatitude($element['lat'])
                ->setLongitude($element['lon'])
                ->setAddress($element['address'])
                ->setPostalCode($element['postalCode'])
                ->setCity($element['city'])
                ->setRegion($element['region'])
                ->setWebsite($element['website'])
                ->setSocialLinks($element['socialLinks']);

            $this->entityManager->persist($brewery);

            ++$processed;
            if (0 === $processed % self::FLUSH_BATCH_SIZE) {
                $this->entityManager->flush();
            }

            $progressBar->advance();
        }

        $this->entityManager->flush();
        $progressBar->finish();
        $io->newLine(2);

        $io->table(
            ['Créées', 'Mises à jour'],
            [[$created, $updated]],
        );

        return Command::SUCCESS;
    }
}
