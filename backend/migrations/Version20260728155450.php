<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260728155450 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Création de la table brewery';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE SEQUENCE brewery_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE TABLE brewery (id INT NOT NULL, name VARCHAR(255) NOT NULL, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, address VARCHAR(255) DEFAULT NULL, postal_code VARCHAR(10) DEFAULT NULL, city VARCHAR(120) DEFAULT NULL, region VARCHAR(120) DEFAULT NULL, website VARCHAR(255) DEFAULT NULL, social_links JSON DEFAULT NULL, description TEXT DEFAULT NULL, osm_id VARCHAR(50) NOT NULL, source VARCHAR(20) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_1A599547A65EB5CF ON brewery (osm_id)');
        $this->addSql('CREATE INDEX idx_brewery_region ON brewery (region)');
        $this->addSql('CREATE INDEX idx_brewery_lat_lng ON brewery (latitude, longitude)');
        $this->addSql('COMMENT ON COLUMN brewery.created_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN brewery.updated_at IS \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE brewery');
        $this->addSql('DROP SEQUENCE brewery_id_seq CASCADE');
    }
}
