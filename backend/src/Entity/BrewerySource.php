<?php

declare(strict_types=1);

namespace App\Entity;

enum BrewerySource: string
{
    case Osm = 'osm';
    case Manual = 'manual';
    case DataGouv = 'data_gouv';
}
