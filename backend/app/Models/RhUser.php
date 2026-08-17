<?php

namespace App\Models;

use App\Support\RoleContext;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\HasApiTokens;

/**
 * Authentification sur la table existante RH_USER (base dbmasterbacou).
 * Roles etendus stockes dans ECO_USER_ROLE (si presente), sinon derives des
 * indicateurs SuperAdmin / Validateur / Superviseur.
 */
class RhUser extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $connection = 'master';
    protected $table = 'RH_USER';
    protected $primaryKey = 'Id';
    public $timestamps = false;

    protected $hidden = ['MotDePasse'];

    protected $casts = [
        'SuperAdmin' => 'boolean',
        'Superviseur' => 'boolean',
        'Validateur' => 'boolean',
        'Supprimer' => 'boolean',
    ];

    public function getAuthPassword()
    {
        return $this->MotDePasse;
    }

    public function societes()
    {
        return $this->belongsToMany(Societe::class, 'societe_utilisateur', 'user_id', 'societe_id', 'Id', 'NUMAUTO');
    }

    public function allowedSocieteCodes(): array
    {
        $codes = [];
        if (! empty($this->attributes['CODESOCIETE'] ?? null)) {
            $codes[] = (string) $this->attributes['CODESOCIETE'];
        }
        try {
            if (Schema::connection('master')->hasTable('societe_utilisateur')) {
                $ids = DB::connection('master')->table('societe_utilisateur')
                    ->where('user_id', $this->Id)->pluck('societe_id')->all();
                if (! empty($ids)) {
                    try {
                        $c = DB::connection('master')->table('US_SOCIETE')
                            ->whereIn('NUMAUTO', $ids)->pluck('CODESOCIETE')->all();
                        $codes = array_merge($codes, $c);
                    } catch (\Throwable $e) {
                    }
                    $codes = array_merge($codes, array_map('strval', $ids));
                }
            }
        } catch (\Throwable $e) {
        }
        return array_values(array_unique(array_filter(array_map('strval', $codes), fn ($v) => $v !== '')));
    }

    public function societesResolved()
    {
        $codes = $this->allowedSocieteCodes();
        if (empty($codes)) {
            return collect();
        }
        try {
            return Societe::whereIn('CODESOCIETE', $codes)->get();
        } catch (\Throwable $e) {
            return collect();
        }
    }

    public function isSuperAdmin(): bool
    {
        return (bool) $this->SuperAdmin;
    }

    public function isAdmin(): bool
    {
        return (bool) ($this->SuperAdmin || $this->Superviseur || $this->Validateur);
    }

    /** Role "reel" derive : indicateurs RH_USER, puis table ECO_USER_ROLE si presente. */
    public function getRoleAttribute(): string
    {
        if ($this->SuperAdmin) return 'super_admin';

        // Role etendu depuis ECO_USER_ROLE (economat), si la table existe
        try {
            if (Schema::connection('economat')->hasTable('ECO_USER_ROLE')) {
                $r = DB::connection('economat')->table('ECO_USER_ROLE')
                    ->where('USER_ID', $this->Id)->value('ROLE');
                if ($r) {
                    return (string) $r;
                }
            }
        } catch (\Throwable $e) {
        }

        if ($this->Validateur) return 'directeur';
        if ($this->Superviseur) return 'comptable';
        return 'caissier';
    }

    /** Role effectif (tient compte de l'impersonation Super Admin via X-Role). */
    public function effectiveRole(): string
    {
        $override = RoleContext::override();
        return $override ?: $this->role;
    }

    /** Permissions du role effectif. */
    public function abilities(): array
    {
        $role = $this->effectiveRole();
        $map = (array) config('permissions.roles', []);
        $granted = $map[$role] ?? [];
        if (in_array('*', $granted, true)) {
            return (array) config('permissions.abilities', []);
        }
        return array_values($granted);
    }

    public function hasAbility(string $ability): bool
    {
        // Super admin NON impersonateur : tout permis. Sinon, permissions du role effectif.
        if ($this->SuperAdmin && ! RoleContext::override()) {
            return true;
        }
        return in_array($ability, $this->abilities(), true);
    }

    public function getSchoolIdAttribute()
    {
        return $this->attributes['school_id'] ?? null;
    }

    public function getSchoolAttribute()
    {
        return null;
    }

    public function getNameAttribute(): string
    {
        return trim(($this->Prenom ?? '').' '.($this->Nom ?? '')) ?: ($this->Login ?? 'Utilisateur');
    }

    /** Clés des modules console accordés (rôle admin_etablissement). */
    public function modulesAutorises(): array
    {
        try {
            return \App\Models\ModuleConsole::accordesPour($this->Id);
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** L'utilisateur a-t-il accès au module console donné ? */
    public function hasModuleAccess(string $cle): bool
    {
        return in_array($cle, $this->modulesAutorises(), true);
    }

    public function toAuthPayload(): array
    {
        $role = $this->effectiveRole();
        return [
            'id' => $this->Id,
            'name' => $this->name,
            'login' => $this->Login,
            'email' => $this->Email,
            'role' => $role,
            'real_role' => $this->role,
            'is_super' => (bool) $this->SuperAdmin,
            'abilities' => $this->abilities(),
            'assignable_roles' => (bool) $this->SuperAdmin ? (array) config('permissions.assignable', []) : [],
            // Modules console accordés (utilisé par la sidebar de l'admin d'établissement).
            'modules_autorises' => $role === 'admin_etablissement' ? $this->modulesAutorises() : [],
            'school_id' => null,
            'school' => null,
        ];
    }
}
