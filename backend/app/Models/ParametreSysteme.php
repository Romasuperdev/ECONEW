<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * Paramètres système globaux de la plateforme (console Super Admin).
 * Table `parametres_systeme` (connexion par défaut), créée à la demande.
 * Stockage clé/valeur : SMS/mail par défaut, quotas, etc.
 */
class ParametreSysteme extends Model
{
    protected $table = 'parametres_systeme';
    public $timestamps = true;
    protected $fillable = ['cle', 'valeur', 'description'];

    /** Crée la table si absente (évite une migration manuelle). */
    public static function ensureTable(): void
    {
        try {
            if (! Schema::hasTable('parametres_systeme')) {
                Schema::create('parametres_systeme', function ($t) {
                    $t->increments('id');
                    $t->string('cle', 100)->unique();
                    $t->text('valeur')->nullable();
                    $t->string('description', 255)->nullable();
                    $t->timestamps();
                });
            }
        } catch (\Throwable $e) {
            // best-effort
        }
    }

    /** Lecture d'un paramètre (avec valeur par défaut). */
    public static function get(string $cle, $defaut = null)
    {
        static::ensureTable();
        try {
            $row = static::query()->where('cle', $cle)->first();
            return $row ? $row->valeur : $defaut;
        } catch (\Throwable $e) {
            return $defaut;
        }
    }

    /** Écriture (upsert) d'un paramètre. */
    public static function set(string $cle, $valeur, ?string $description = null): void
    {
        static::ensureTable();
        try {
            static::query()->updateOrCreate(
                ['cle' => $cle],
                array_filter(['valeur' => $valeur, 'description' => $description], fn ($v) => $v !== null) + ['valeur' => $valeur]
            );
        } catch (\Throwable $e) {
        }
    }
}
