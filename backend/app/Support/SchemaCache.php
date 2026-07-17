<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Détection des colonnes des tables héritées, mise en cache sur disque (store "file")
 * pour éviter d'interroger INFORMATION_SCHEMA à chaque requête HTTP.
 */
class SchemaCache
{
    /** @var array<string,array<int,string>> cache mémoire par requête */
    protected static array $mem = [];

    public static function columns(string $table, string $connection = 'economat'): array
    {
        $key = $connection.':'.$table;
        if (isset(static::$mem[$key])) {
            return static::$mem[$key];
        }

        $resolve = function () use ($table, $connection) {
            try {
                return Schema::connection($connection)->getColumnListing($table);
            } catch (\Throwable $e) {
                return [];
            }
        };

        $cols = [];
        try {
            // Cache disque persistant entre les requêtes (24h).
            $cols = Cache::store('file')->remember('schemacols:'.$key, 60 * 60 * 24, $resolve);
        } catch (\Throwable $e) {
            $cols = $resolve();
        }
        if (! is_array($cols)) {
            $cols = [];
        }

        static::$mem[$key] = $cols;
        return $cols;
    }
}
