<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Table pivot existante dbmasterbacou : societe_utilisateur (user_id, societe_id).
 */
class SocieteUtilisateur extends Model
{
    protected $connection = 'master';
    protected $table = 'societe_utilisateur';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = ['user_id', 'societe_id'];

    public function societe()
    {
        return $this->belongsTo(Societe::class, 'societe_id', 'NUMAUTO');
    }

    public function utilisateur()
    {
        return $this->belongsTo(RhUser::class, 'user_id', 'Id');
    }
}
