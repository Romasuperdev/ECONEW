<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * Les jetons d'API sont stockes et lus dans la meme base que RH_USER
 * (connexion 'master' = dbmasterbacou), sinon Sanctum ecrit et relit
 * sur deux bases differentes -> 401 apres connexion.
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    protected $connection = 'master';
}
