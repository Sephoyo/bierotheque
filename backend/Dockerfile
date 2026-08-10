FROM php:8.3-cli-alpine

RUN apk add --no-cache postgresql-dev icu-dev \
    && docker-php-ext-install pdo_pgsql intl opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist --optimize-autoloader

COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

# Lance les migrations puis, seulement si la table brewery est vide (première
# fois sur une base de prod neuve), l'import Overpass — avant de démarrer le
# serveur. Voir docker-entrypoint.sh pour le détail.
ENTRYPOINT ["./docker-entrypoint.sh"]
