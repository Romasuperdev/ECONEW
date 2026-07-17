<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'application' => 'Plateforme de Gestion Financière des Établissements Scolaires',
    'api' => url('/api'),
    'status' => 'ok',
]));
