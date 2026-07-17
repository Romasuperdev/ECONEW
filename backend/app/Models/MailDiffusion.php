<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MailDiffusion extends Model
{
    protected $table = 'T_MAIL_DIFFUSION';
    protected $primaryKey = 'ID_MAIL_DIF';
    public $timestamps = false;

    protected $fillable = [
        'ADRESS_MAIL',
        'MOT_PASS',
        'SERVEUR_SMTP',
        'code_etab',
        'PORT_SMTP',
        'CODESOCIETE',
    ];

    protected $hidden = [
        'MOT_PASS',
    ];
}