#!/bin/sh
set -e

php bin/console doctrine:migrations:migrate --no-interaction

# Import initial uniquement si la table est vide (fraîche base de prod) : on
# évite de retaper l'API Overpass à chaque redémarrage/déploiement, tout en
# garantissant qu'un premier démarrage sur une base neuve se peuple tout seul,
# sans manip manuelle après le merge.
NEEDS_IMPORT=$(php -r '
$url = parse_url(getenv("DATABASE_URL"));
$dsn = sprintf("pgsql:host=%s;port=%s;dbname=%s", $url["host"], $url["port"] ?? 5432, ltrim($url["path"], "/"));
$pdo = new PDO($dsn, $url["user"] ?? null, $url["pass"] ?? null);
$count = (int) $pdo->query("SELECT COUNT(*) FROM brewery")->fetchColumn();
echo 0 === $count ? "1" : "0";
')

if [ "$NEEDS_IMPORT" = "1" ]; then
    echo "Table brewery vide : import initial depuis Overpass API..."
    php bin/console app:import-breweries
else
    echo "Table brewery déjà peuplée, pas de ré-import automatique (relance manuelle : bin/console app:import-breweries)."
fi

exec php -S 0.0.0.0:8000 -t public
