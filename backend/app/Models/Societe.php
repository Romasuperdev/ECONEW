<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Table existante dbmasterbacou : US_SOCIETE (societes / etablissements).
 */
class Societe extends Model
{
    protected $connection = 'master';
    protected $table = 'US_SOCIETE';
    protected $primaryKey = 'NUMAUTO';
    public $incrementing = true;
    public $timestamps = false;

    protected $guarded = [];

    private const SUSP_TABLE = 'ECO_SOCIETE_SUSPENSION';

    /** Crée la table de suspension si absente (connexion master). */
    public static function ensureSuspTable(): void
    {
        try {
            if (! Schema::connection('master')->hasTable(self::SUSP_TABLE)) {
                Schema::connection('master')->create(self::SUSP_TABLE, function ($t) {
                    $t->string('CODESOCIETE', 50)->primary();
                    $t->boolean('SUSPENDU')->default(true);
                    $t->dateTime('DATE_SUSPENSION')->nullable();
                });
            }
        } catch (\Throwable $e) {}
    }

    /** Codes des sociétés actuellement suspendues. */
    public static function suspendedCodes(): array
    {
        static::ensureSuspTable();
        try {
            return DB::connection('master')->table(self::SUSP_TABLE)
                ->where('SUSPENDU', 1)->pluck('CODESOCIETE')->map(fn ($c) => (string) $c)->all();
        } catch (\Throwable $e) { return []; }
    }

    public static function estSuspendue(?string $code): bool
    {
        if (! $code) { return false; }
        return in_array((string) $code, static::suspendedCodes(), true);
    }

    /** Active/suspend une société par son code. */
    public static function setSuspendue(string $code, bool $suspendu): void
    {
        static::ensureSuspTable();
        try {
            DB::connection('master')->table(self::SUSP_TABLE)->updateOrInsert(
                ['CODESOCIETE' => $code],
                ['SUSPENDU' => $suspendu ? 1 : 0, 'DATE_SUSPENSION' => $suspendu ? now() : null]
            );
        } catch (\Throwable $e) {}
    }

    public function utilisateurs()
    {
        return $this->belongsToMany(RhUser::class, 'societe_utilisateur', 'societe_id', 'user_id', 'CODESOCIETE', 'Id');
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->NUMAUTO,
            'code' => $this->CODESOCIETE,
            'name' => $this->NOMSOCIETE,
            'ville' => $this->VILLESOCIETE,
            'pays' => $this->PAYSSOCIETE,
            'email' => $this->EMAILSOCIETE,
            'telephone' => $this->TELSOCIETE,
            'activite' => $this->ACTIVITESOCIETE,
            'base' => $this->NOMBASE,
            'logo' => $this->LOGO,
            'nb_etab' => $this->NB_ETAB,
            'nb_user' => $this->NB_USER,
            'representant' => $this->NOMPRENOMREPRESENTANT ?? $this->REPRESENTANT,
        ];
    }
}
