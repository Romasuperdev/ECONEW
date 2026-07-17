<?php

namespace App\Models;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Mappe sur la table existante ECONOMAT : T_ETUDIANT.
 */
class Student extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_ETUDIANT';
    protected $primaryKey = 'Matricule';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'Matricule', 'Nom', 'Prenom', 'Sexe', 'DateNaiss', 'LieuNaiss', 'PaysNaiss',
        'Adresse', 'Email', 'Telephone', 'Nationalite', 'CodeCycle', 'CodeFiliere',
        'CodeClasse', 'CodeNiveau', 'CodeCategorie', 'AnneeAcad', 'Ville', 'Commune',
        'Quartier', 'Region', 'Religion', 'Ethnie', 'SituationFamiliale',
        'TypeEleve', 'Redoublant', 'Regime', 'NiveauOrigine', 'EtabOrigine', 'ActNaissance',
        'NomPereTuteur', 'PrenomPereTuteur', 'ProfessionPereTuteur', 'TelephonePereTuteur', 'EmailPereTuteur',
        'NomMere', 'PrenomMere', 'ProfessionMere', 'TelephoneMere', 'EmailMere',
        'DateInscription', 'Statut', 'Etat', 'Site', 'CODESOCIETE',
        'Scolarite', 'TotalPaye', 'Remise', 'PC', 'OrganismePC', 'TypePC',
    ];

    public function classe()
    {
        return $this->belongsTo(SchoolClass::class, 'CodeClasse', 'CodeClasse');
    }

    public function scopeForTenant(Builder $q): Builder
    {
        $annee = AnneeContext::current();
        $societe = SocieteContext::current();
        return $q->when($annee, fn ($x) => $x->where('AnneeAcad', $annee))
                 ->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe));
    }

    public function getFullNameAttribute(): string
    {
        return trim(($this->Prenom ?? '').' '.($this->Nom ?? ''));
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->Matricule,
            'matricule' => $this->Matricule,
            'first_name' => $this->Prenom,
            'last_name' => $this->Nom,
            'full_name' => $this->full_name,
            'gender' => $this->Sexe,
            'birth_date' => $this->DateNaiss,
            'birth_place' => $this->LieuNaiss,
            'nationality' => $this->Nationalite,
            'phone' => $this->Telephone,
            'email' => $this->Email,
            'address' => $this->Adresse,
            'ville' => $this->Ville,
            'commune' => $this->Commune,
            'quartier' => $this->Quartier,
            'school_class_id' => $this->CodeClasse,
            'school_class' => $this->classe ? ['id' => $this->classe->CodeClasse, 'name' => $this->classe->LibelleClasse] : null,
            'code_niveau' => $this->CodeNiveau,
            'type_eleve' => $this->TypeEleve,
            'redoublant' => (bool) $this->Redoublant,
            'regime' => $this->Regime,
            'niveau_origine' => $this->NiveauOrigine,
            'etab_origine' => $this->EtabOrigine,
            'act_naissance' => (bool) $this->ActNaissance,
            // Parents / tuteurs
            'father_name' => $this->NomPereTuteur,
            'father_first_name' => $this->PrenomPereTuteur,
            'father_profession' => $this->ProfessionPereTuteur,
            'father_phone' => $this->TelephonePereTuteur,
            'father_email' => $this->EmailPereTuteur,
            'mother_name' => $this->NomMere,
            'mother_first_name' => $this->PrenomMere,
            'mother_profession' => $this->ProfessionMere,
            'mother_phone' => $this->TelephoneMere,
            'mother_email' => $this->EmailMere,
            // Compat liste
            'guardian_name' => trim(($this->NomPereTuteur ?? '').' '.($this->PrenomPereTuteur ?? '')),
            'guardian_phone' => $this->TelephonePereTuteur,
            'status' => $this->Statut ?? $this->Etat,
            'scolarite' => $this->Scolarite,
            'total_paye' => $this->TotalPaye,
'affecte' => (bool) ($this->Oriente ?? 0),
            'boursier' => (bool) ($this->Aide ?? 0),
                        'remise' => $this->Remise,
        ];
    }
}
