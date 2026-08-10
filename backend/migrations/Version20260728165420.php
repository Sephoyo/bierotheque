<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260728165420 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Création de la table page_view (mesure d\'audience anonyme)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE SEQUENCE page_view_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE TABLE page_view (id INT NOT NULL, path VARCHAR(255) NOT NULL, country VARCHAR(120) DEFAULT NULL, city VARCHAR(120) DEFAULT NULL, viewed_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_page_view_viewed_at ON page_view (viewed_at)');
        $this->addSql('COMMENT ON COLUMN page_view.viewed_at IS \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE page_view');
        $this->addSql('DROP SEQUENCE page_view_id_seq CASCADE');
    }
}
