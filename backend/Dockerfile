FROM php:8.3-cli-alpine

# bash : absent de l'image php-alpine par défaut (seul /bin/sh est présent).
# Nécessaire pour le terminal web de Dokploy (docker exec ... bash) — sans
# ça, ouvrir un terminal sur ce conteneur échoue avec "exec: bash: no such
# file or directory". Les scripts du projet (docker-entrypoint.sh) restent
# en #!/bin/sh et n'en dépendent pas.
RUN apk add --no-cache bash postgresql-dev icu-dev \
    && docker-php-ext-install pdo_pgsql intl opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist --optimize-autoloader

COPY . .
RUN chmod +x docker-entrypoint.sh

# .env est exclu par .dockerignore (contient les vrais secrets locaux, jamais
# commité) mais SymfonyRuntime/Dotenv::bootEnv() exige que le fichier existe
# physiquement, même vide, sinon il lève une PathException fatale au boot —
# peu importe que APP_ENV/DATABASE_URL/etc. soient déjà fournis en variables
# d'environnement par Dokploy. On crée donc un .env vide dans l'image ; les
# vraies valeurs continuent de venir exclusivement des variables
# d'environnement (elles priment de toute façon sur le contenu de .env).
RUN touch .env

EXPOSE 8000

# Lance les migrations puis, seulement si la table brewery est vide (première
# fois sur une base de prod neuve), l'import Overpass — avant de démarrer le
# serveur. Voir docker-entrypoint.sh pour le détail.
ENTRYPOINT ["./docker-entrypoint.sh"]
