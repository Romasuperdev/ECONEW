<?php

namespace App\Models;

use App\Support\AnneeContext;
use App\Support\EtablissementContext;
use App\Support\SchemaCache;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Mappe sur la table SQL Server existante ECONOMAT : T_PREREQUIS
 * (frais de dossier + frais annexes exigés à l'inscription).
 *
 * La structure réelle des colonnes n'étant pas figée, le modèle détecte
 * dynamiquement les noms de colonnes (pattern SchemaCache/col()) et s'y adapte.
 * Chaque ligne = un frais (libellé + montant) rattaché à un niveau/classe/année.
 */
class Prerequis extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_PREREQUIS';
    public $timestamps = false;
    protected $guarded = [];

    /* ------- Détection tolérante des colonnes ------- */

    public static function columns(): array
    {
        try {
            return SchemaCache::columns('T_PREREQUIS', 'economat');
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** Premier nom de colonne existant parmi des candidats. */
    public static function col(array $cands): ?string
    {
        $cols = static::columns();
        foreach ($cands as $c) {
            if (in_array($c, $cols, true)) {
                return $c;
            }
        }
        return null;
    }

    /** Dictionnaire logique -> colonne réelle détectée. */
    public static function mapping(): array
    {
        return [
            'pk' => static::col(['ID_PREREQUIS', 'IDPREREQUIS', 'ID_Prerequis', 'IdPrerequis', 'ID', 'Id', 'NUM', 'Num', 'CODE', 'Code']),
            'libelle' => static::col(['LIBELLE', 'Libelle', 'LIBELLE_PREREQUIS', 'LibellePrerequis', 'DESIGNATION', 'Designation', 'NOM', 'Nom', 'INTITULE', 'Intitule']),
            'montant' => static::col(['MONTANT', 'Montant', 'MONTANT_PREREQUIS', 'MontantPrerequis', 'PRIX', 'Prix', 'VALEUR', 'Valeur']),
            'niveau' => static::col(['CODENIVEAU', 'CodeNiveau', 'NIVEAU', 'Niveau', 'CodN', 'CODE_NIVEAU']),
            'classe' => static::col(['CODECLASSE', 'CodeClasse', 'CLASSE', 'Classe']),
            'annee' => static::col(['ANNEE', 'Annee', 'AnneeAcad', 'CODEANNEE', 'CodeAnnee']),
            'type' => static::col(['TYPE', 'Type', 'TYPEPREREQUIS', 'TypePrerequis', 'CATEGORIE', 'Categorie', 'NATURE', 'Nature']),
            'societe' => static::col(['CODESOCIETE', 'CodeSociete']),
            'etab' => static::col(['CODEETABLISSEMENT', 'CodeEtablissement']),
        ];
    }

    public function getKeyName()
    {
        return static::mapping()['pk'] ?? 'ID_PREREQUIS';
    }

    public function getIncrementing()
    {
        // On suppose une identité entière si le nom de PK ressemble à un ID/NUM.
        $pk = strtolower((string) $this->getKeyName());
        return str_contains($pk, 'id') || str_contains($pk, 'num');
    }

    /* ------- Filtrage multi-tenant tolérant ------- */

    public function scopeForTenant(Builder $q): Builder
    {
        $m = static::mapping();
        return $q
            ->when($m['societe'] && SocieteContext::current(), fn ($x) => $x->where($m['societe'], SocieteContext::current()))
            ->when($m['etab'] && EtablissementContext::current(), fn ($x) => $x->where($m['etab'], EtablissementContext::current()))
            ->when($m['annee'] && AnneeContext::current(), fn ($x) => $x->where($m['annee'], AnneeContext::current()));
    }

    public static function available()
    {
        try {
            $rows = static::forTenant()->get();
            if ($rows->isEmpty()) {
                $m = static::mapping();
                $soc = SocieteContext::current();
                $rows = static::query()->when($m['societe'] && $soc, fn ($q) => $q->where($m['societe'], $soc))->get();
            }
            return $rows;
        } catch (\Throwable $e) {
            try { return static::query()->get(); } catch (\Throwable $e2) { return collect(); }
        }
    }

    public function val(string $logical)
    {
        $m = static::mapping();
        $col = $m[$logical] ?? null;
        return $col ? ($this->attributes[$col] ?? null) : null;
    }

    public function toNormalized(): array
    {
        $type = (string) $this->val('type');
        return [
            'id' => $this->getKey(),
            'libelle' => $this->val('libelle'),
            'montant' => (float) ($this->val('montant') ?? 0),
            'niveau_code' => $this->val('niveau'),
            'classe_code' => $this->val('classe'),
            'annee' => $this->val('annee'),
            'type' => $type,
            'est_dossier' => static::estDossier($type, (string) $this->val('libelle')),
            'est_annexe' => static::estAnnexe($type, (string) $this->val('libelle')),
        ];
    }

    /** Une ligne est-elle un « frais de dossier / inscription » ? */
    public static function estDossier(?string $type, ?string $libelle): bool
    {
        $s = strtolower(trim(($type ?? '').' '.($libelle ?? '')));
        foreach (['dossier', 'inscription', 'inscri'] as $kw) {
            if (str_contains($s, $kw)) {
                return true;
            }
        }
        return false;
    }

    /** Une ligne est-elle un « frais annexe » ? (les autres rubriques comme
     *  Scolarité / Pension / Transport / Cantine ne comptent PAS pour le dossier). */
    public static function estAnnexe(?string $type, ?string $libelle): bool
    {
        $s = strtolower(trim(($type ?? '').' '.($libelle ?? '')));
        return str_contains($s, 'annexe');
    }

    /**
     * Résout les tarifs pour un niveau/classe/année :
     * frais_dossier (somme des lignes "dossier/inscription") + frais_annexes (le reste).
     * Source unique de vérité pour le module « Réception des dossiers ».
     */
    public static function tarifsForNiveau(?string $niveauCode, ?string $classeCode = null, ?string $annee = null): array
    {
        $m = static::mapping();
        $lignes = [];
        $dossier = 0.0;
        $annexes = 0.0;
        try {
            $q = static::query();
            if ($m['societe'] && SocieteContext::current()) { $q->where($m['societe'], SocieteContext::current()); }
            if ($m['etab'] && EtablissementContext::current()) { $q->where($m['etab'], EtablissementContext::current()); }
            $an = $annee ?: AnneeContext::current();
            if ($m['annee'] && $an) { $q->where($m['annee'], $an); }
            if ($m['niveau'] && $niveauCode) { $q->where($m['niveau'], $niveauCode); }
            if ($m['classe'] && $classeCode) {
                $q->where(fn ($x) => $x->where($m['classe'], $classeCode)->orWhereNull($m['classe']));
            }
            foreach ($q->get() as $row) {
                $n = $row->toNormalized();
                $lignes[] = $n;
                if ($n['est_dossier']) { $dossier += $n['montant']; }
                elseif ($n['est_annexe']) { $annexes += $n['montant']; }
                // Scolarité / Pension / Transport / Cantine : ignorées ici (rubriques dédiées).
            }
        } catch (\Throwable $e) {}

        return [
            'frais_dossier' => $dossier,
            'frais_annexes' => $annexes,
            'total' => $dossier + $annexes,
            'lignes' => $lignes,
            'trouvee' => ! empty($lignes),
        ];
    }
}
