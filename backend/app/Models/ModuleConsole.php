<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Catalogue des sections (modules) activables pour le rôle admin_etablissement.
 * Tables sur la connexion `master` (même base que RH_USER) :
 *   - modules_console (cle, libelle, description)
 *   - utilisateur_module_permissions (user_id, module_cle, accorde)
 * Auto-provisionnées au besoin (pas de migration manuelle obligatoire).
 */
class ModuleConsole extends Model
{
    protected $connection = 'master';
    protected $table = 'modules_console';
    public $timestamps = true;
    protected $fillable = ['cle', 'libelle', 'description'];

    public const PIVOT = 'utilisateur_module_permissions';

    /** Crée les deux tables si absentes + seed les 4 modules par défaut. */
    public static function ensureTables(): void
    {
        try {
            if (! Schema::connection('master')->hasTable('modules_console')) {
                Schema::connection('master')->create('modules_console', function ($t) {
                    $t->increments('id');
                    $t->string('cle', 60)->unique();
                    $t->string('libelle', 150);
                    $t->string('description', 255)->nullable();
                    $t->timestamps();
                });
            }
            if (! Schema::connection('master')->hasTable(self::PIVOT)) {
                Schema::connection('master')->create(self::PIVOT, function ($t) {
                    $t->increments('id');
                    $t->string('user_id', 50);
                    $t->string('module_cle', 60);
                    $t->boolean('accorde')->default(true);
                    $t->timestamps();
                    $t->unique(['user_id', 'module_cle']);
                });
            }
            static::seedDefaults();
        } catch (\Throwable $e) {
            // best-effort
        }
    }

    /** Insère les modules définis dans config/permissions.php s'ils manquent. */
    public static function seedDefaults(): void
    {
        try {
            foreach ((array) config('permissions.modules_console', []) as $m) {
                if (empty($m['cle'])) { continue; }
                static::query()->firstOrCreate(
                    ['cle' => $m['cle']],
                    ['libelle' => $m['libelle'] ?? $m['cle'], 'description' => $m['description'] ?? null]
                );
            }
        } catch (\Throwable $e) {}
    }

    /** Liste normalisée des modules du catalogue. */
    public static function catalogue(): array
    {
        static::ensureTables();
        try {
            return static::query()->orderBy('id')->get()
                ->map(fn ($m) => ['cle' => $m->cle, 'libelle' => $m->libelle, 'description' => $m->description])
                ->all();
        } catch (\Throwable $e) {
            return (array) config('permissions.modules_console', []);
        }
    }

    /** Modules accordés (clés) pour un utilisateur donné. */
    public static function accordesPour($userId): array
    {
        static::ensureTables();
        try {
            return DB::connection('master')->table(self::PIVOT)
                ->where('user_id', (string) $userId)->where('accorde', 1)
                ->pluck('module_cle')->map(fn ($c) => (string) $c)->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** Définit (accorde/retire) les modules d'un utilisateur à partir d'une liste de clés. */
    public static function definirPour($userId, array $clesAccordees): void
    {
        static::ensureTables();
        $valides = array_map(fn ($m) => $m['cle'], static::catalogue());
        try {
            foreach ($valides as $cle) {
                $accorde = in_array($cle, $clesAccordees, true);
                DB::connection('master')->table(self::PIVOT)->updateOrInsert(
                    ['user_id' => (string) $userId, 'module_cle' => $cle],
                    ['accorde' => $accorde ? 1 : 0, 'updated_at' => now(), 'created_at' => now()]
                );
            }
        } catch (\Throwable $e) {}
    }
}
