<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Table ECONOMAT existante : T_SMS.
 * Colonnes : id, Date, Numero, Message, Heure, Users, Type.
 * Sert au paramétrage des SMS à envoyer (file d'attente lue par la passerelle).
 */
class Sms extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_SMS';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = ['Date', 'Numero', 'Message', 'Heure', 'Users', 'Type'];

    public function toNormalized(): array
    {
        return [
            'id' => $this->id,
            'date' => $this->Date instanceof \DateTimeInterface ? $this->Date->format('Y-m-d') : $this->Date,
            'heure' => $this->Heure,
            'numero' => $this->Numero,
            'message' => $this->Message,
            'type' => $this->Type,
            'users' => $this->Users,
        ];
    }
}
