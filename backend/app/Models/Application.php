<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Table existante dbmasterbacou : US_APPLICATIONS (PK CodeApp).
 */
class Application extends Model
{
    protected $connection = 'master';
    protected $table = 'US_APPLICATIONS';
    protected $primaryKey = 'CodeApp';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $guarded = [];

    public function toNormalized(): array
    {
        $pick = function (array $keys) {
            foreach ($keys as $k) {
                if (array_key_exists($k, $this->attributes) && $this->attributes[$k] !== null) {
                    return $this->attributes[$k];
                }
            }
            return null;
        };
        return [
            'id' => $this->CodeApp,
            'code' => $this->CodeApp,
            'name' => $pick(['Libelle', 'LibelleApp', 'NomApp', 'Nom', 'Designation', 'LIBELLE', 'Description', 'LibelleApplication']),
            'url' => $pick(['Url', 'URL', 'Lien', 'Adresse']),
            'actif' => $pick(['Actif', 'Active', 'ACTIF']),
        ];
    }
}
