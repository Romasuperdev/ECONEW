<?php

return [
    // Code de l'etablissement courant dans les tables ECONOMAT (CODEETABLISSEMENT / CodeEtab)
    'code_etab' => env('ECONOMAT_CODE_ETAB'),
    // Annee scolaire courante (colonne ANNEE de T_NIVEAU / T_CLASSE)
    'annee' => env('ECONOMAT_ANNEE'),
    // Code societe (optionnel)
    'code_societe' => env('ECONOMAT_CODE_SOCIETE'),
    // Double authentification par code email (OTP). Desactivee par defaut.
    'two_factor' => filter_var(env('ECONOMAT_2FA', false), FILTER_VALIDATE_BOOLEAN),
];
