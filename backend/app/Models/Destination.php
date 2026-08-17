<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Destinations / circuits de transport (table auxiliaire ECO_DESTINATION).
 */
class Destination extends Model
{
    protected $connection = 'economat';
    protected $table = 'ECO_DESTINATION';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = ['CODE', 'LIBELLE', 'CODESOCIETE', 'CODEETABLISSEMENT'];

    public function toNormalized(): array
    {
        return ['id' => $this->id, 'code' => $this->CODE, 'libelle' => $this->LIBELLE];
    }
}
