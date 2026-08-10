<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260728171832 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute contact_message + Brewery.published (modération) et rend osm_id/latitude/longitude nullable';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE SEQUENCE contact_message_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE TABLE contact_message (id INT NOT NULL, name VARCHAR(120) DEFAULT NULL, email VARCHAR(255) DEFAULT NULL, message TEXT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('COMMENT ON COLUMN contact_message.created_at IS \'(DC2Type:datetime_immutable)\'');
        // DEFAULT true nécessaire le temps de l'ALTER (Postgres refuse un ADD
        // COLUMN NOT NULL sans défaut sur une table non vide, ~1700 lignes déjà
        // en base), puis retiré pour matcher le mapping (comme "source", qui n'a
        // pas de défaut niveau DB — le défaut PHP `= true` suffit pour les futurs inserts).
        $this->addSql('ALTER TABLE brewery ADD published BOOLEAN NOT NULL DEFAULT true');
        $this->addSql('ALTER TABLE brewery ALTER published DROP DEFAULT');
        $this->addSql('ALTER TABLE brewery ALTER latitude DROP NOT NULL');
        $this->addSql('ALTER TABLE brewery ALTER longitude DROP NOT NULL');
        $this->addSql('ALTER TABLE brewery ALTER osm_id DROP NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE contact_message');
        $this->addSql('DROP SEQUENCE contact_message_id_seq CASCADE');
        $this->addSql('ALTER TABLE brewery DROP published');
        $this->addSql('ALTER TABLE brewery ALTER latitude SET NOT NULL');
        $this->addSql('ALTER TABLE brewery ALTER longitude SET NOT NULL');
        $this->addSql('ALTER TABLE brewery ALTER osm_id SET NOT NULL');
    }
}
