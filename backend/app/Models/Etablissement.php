<?php

namespace App\Models;

use App\Support\SchemaCache;

use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * Etablissements (table ECONOMAT : T_ETABLISSEMENT).
 * NB : le code d'etablissement est la colonne CODE (pas CODEETABLISSEMENT) ;
 * c'est cette valeur CODE que les autres tables stockent dans CODEETABLISSEMENT.
 */
class Etablissement extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_ETABLISSEMENT';
    protected $primaryKey = 'Num';
    public $timestamps = false;

    protected static array $cols = [];

    public static function columns(): array
    {
        return static::$cols = static::$cols ?: SchemaCache::columns('T_ETABLISSEMENT');
    }

    public static function col(array $candidates): ?string
    {
        foreach ($candidates as $c) {
            if (in_array($c, static::columns(), true)) {
                return $c;
            }
        }
        return null;
    }

    /** Colonne portant le code d'etablissement (celui stocke ailleurs dans CODEETABLISSEMENT). */
    public static function codeColumn(): ?string
    {
        return static::col(['CODE', 'Code', 'CODEETABLISSEMENT', 'CodeEtablissement', 'CODEETAB', 'CodeEtab']);
    }

    /** Nom lisible de l'etablissement courant (en-tete des documents). */
    public static function currentName(): ?string
    {
        $code = \App\Support\EtablissementContext::current();
        $col = static::codeColumn();
        try {
            $row = static::query()->when($code && $col, fn ($q) => $q->where($col, $code))->first();
            return $row ? ($row->toNormalized()['name'] ?? $code) : $code;
        } catch (\Throwable $e) {
            return $code;
        }
    }

    /**
     * Etablissements visibles par l'utilisateur courant.
     * - Utilisateur normal : STRICTEMENT ceux de sa société (plus de repli global),
     *   restreints à ses établissements affectés (ECO_USER_ETAB) s'il en a.
     * - Super administrateur (console) : ceux de la société sélectionnée via
     *   l'en-tête X-Societe, sinon toutes les sociétés (vue plateforme légitime).
     */
    public static function available()
    {
        try {
            $u = auth()->user();
            $isSuper = $u && method_exists($u, 'isSuperAdmin') && $u->isSuperAdmin();
            if ($isSuper) {
                $header = request()?->header('X-Societe');
                return ($header !== null && $header !== '')
                    ? static::forSociete()->get()
                    : static::query()->get();
            }
            $rows = static::forSociete()->get();
            // Utilisateur affecté à des établissements précis : uniquement ceux-là.
            $affectes = $u ? \App\Support\UserEtablissements::codesFor($u->getAuthIdentifier()) : [];
            if (! empty($affectes)) {
                $col = static::codeColumn();
                $rows = $rows->filter(fn ($e) => in_array((string) $e->{$col}, $affectes, true))->values();
            }
            return $rows;
        } catch (\Throwable $e) {
            return collect();
        }
    }

    public function scopeForSociete(Builder $q): Builder
    {
        $societe = SocieteContext::current();
        $cSoc = static::col(['CODESOCIETE', 'CodeSociete']);
        return $q->when($societe && $cSoc, fn ($x) => $x->where($cSoc, $societe));
    }

    protected function pick(array $keys)
    {
        foreach ($keys as $k) {
            if (array_key_exists($k, $this->attributes) && $this->attributes[$k] !== null) {
                return $this->attributes[$k];
            }
        }
        return null;
    }

    public function toNormalized(): array
    {
        $code = $this->pick(['CODE', 'Code', 'CODEETABLISSEMENT', 'CodeEtablissement', 'CODEETAB', 'CodeEtab']);
        return [
            'id' => $code,
            'code' => $code,
            'name' => $this->pick(['RAISONSOCIALE', 'RaisonSociale', 'NOMETABLISSEMENT', 'NomEtablissement', 'LIBELLE', 'Libelle', 'NOM', 'Nom']) ?? $code,
            'ville' => $this->pick(['SOUS_PREFECTURE', 'VILLE', 'Ville']),
            'type' => $this->pick(['TYPE', 'Type']),
            // Coordonnées (en-tête des reçus / documents)
            'adresse' => $this->pick(['ADRESSE', 'Adresse']),
            'telephone' => $this->pick(['TELEPHONE', 'Telephone']),
            'email' => $this->pick(['EMAIL', 'Email']),
            'site_web' => $this->pick(['SITEWEB', 'SiteWeb']),
        ];
    }

    /**
     * Toutes les colonnes réelles de T_ETABLISSEMENT (tolérant aux absences).
     * Utilisé par la console pour afficher la fiche complète d'un établissement.
     */
    public function toFull(): array
    {
        $g = fn (string $c) => $this->pick([$c]);
        return [
            'num' => $g('Num'),
            'code' => $g('CODE'),
            'raison_sociale' => $g('RAISONSOCIALE'),
            'adresse' => $g('ADRESSE'),
            'telephone' => $g('TELEPHONE'),
            'fax' => $g('FAX'),
            'email' => $g('EMAIL'),
            'site_web' => $g('SITEWEB'),
            'type' => $g('TYPE'),
            'nbre_eleves' => $g('NBREELEVES'),
            'nom_resp' => $g('NOMRESP'),
            'prenom_resp' => $g('PRENOMRESP'),
            'adresse_resp' => $g('ADRESSERESP'),
            'contact_resp' => $g('CONTACTRESP'),
            'occupation_resp' => $g('OCCUPATIONRESP'),
            'statut' => $g('STATUT'),
            'sexe' => $g('SEXE'),
            'sous_prefecture' => $g('SOUS_PREFECTURE'),
            'circonscription' => $g('CIRCONSCRIPTION'),
            'code_iep' => $g('CODEIEP'),
            'code_dren' => $g('CODEDREN'),
            'intitule_dren' => $g('INTITULEDREN'),
            'intitule_iep' => $g('INTITULEIEP'),
            'email_directeur' => $g('EMAILDIRECTEUR'),
            'nom_source' => $g('NOMSOURCE'),
            'direction_dep' => $g('DIRECTIONDEP'),
            'id_compta' => $g('IDCOMPTA'),
            'nom_base_sage' => $g('NOMBASESAGE'),
            'nom_base_bacou' => $g('NOMBASEBACOU'),
            'compte_treso' => $g('COMPTE_TRESO'),
            'code_jrnal' => $g('CODE_JRNAL'),
            'compte_tiers' => $g('COMPTE_TIERS'),
            'type_base' => $g('TYPEBASE'),
            'compte_sco' => $g('COMPTE_SCO'),
            'compte_tp' => $g('COMPTE_TP'),
            'compte_cant' => $g('COMPTE_CANT'),
            'compte_pens' => $g('COMPTE_PENS'),
            'bool_pdt' => $g('BOOL_PDT'),
            'liaison_caisse' => $g('LIAISONCAISSE'),
            'base_caisse' => $g('BASECAISSE'),
            'nom_caisse' => $g('NOMCAISSE'),
            'rub_regroup' => $g('RUBREGROUP'),
            'num_compte' => $g('NUMCOMPTE'),
            'mt_1cycle' => $g('MT_1CYCLE'),
            'mt_2cycle' => $g('MT_2CYCLE'),
            'niv1' => $g('NIV1'),
            'niv2' => $g('NIV2'),
            'niv3' => $g('NIV3'),
            'niv4' => $g('NIV4'),
            'niv5' => $g('NIV5'),
            'niv6' => $g('NIV6'),
            'niv7' => $g('NIV7'),
            'code_societe' => $g('CODESOCIETE'),
        ];
    }
}
