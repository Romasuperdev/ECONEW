<?php

namespace App\Providers;

use App\Models\PersonalAccessToken;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Jetons Sanctum sur la base des comptes (dbmasterbacou)
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);
    }
}
