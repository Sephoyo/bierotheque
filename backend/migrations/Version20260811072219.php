<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260811072219 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute brewery_edit_suggestion (demandes de modif publiques) et Brewery.manually_edited_fields (verrouillage anti-écrasement par le prochain import Overpass)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE SEQUENCE brewery_edit_suggestion_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE TABLE brewery_edit_suggestion (id INT NOT NULL, brewery_id INT NOT NULL, proposed_website VARCHAR(255) DEFAULT NULL, proposed_social_links JSON DEFAULT NULL, proposed_description TEXT DEFAULT NULL, message TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_D846EC32D15C960 ON brewery_edit_suggestion (brewery_id)');
        $this->addSql('COMMENT ON COLUMN brewery_edit_suggestion.created_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('ALTER TABLE brewery_edit_suggestion ADD CONSTRAINT FK_D846EC32D15C960 FOREIGN KEY (brewery_id) REFERENCES brewery (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE brewery ADD manually_edited_fields JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE brewery_edit_suggestion DROP CONSTRAINT FK_D846EC32D15C960');
        $this->addSql('DROP TABLE brewery_edit_suggestion');
        $this->addSql('DROP SEQUENCE brewery_edit_suggestion_id_seq CASCADE');
        $this->addSql('ALTER TABLE brewery DROP manually_edited_fields');
    }
}
