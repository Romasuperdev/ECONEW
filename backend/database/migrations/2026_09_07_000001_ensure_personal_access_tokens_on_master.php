<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Corrige les installations où personal_access_tokens a été créée sur la
 * connexion par défaut (economat) alors que Sanctum lit/écrit les jetons sur
 * la connexion 'master' (dbmasterbacou). Crée la table sur 'master' si absente.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::connection('master')->hasTable('personal_access_tokens')) {
            return;
        }

        Schema::connection('master')->create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // On ne supprime pas la table ici : elle est requise par l'authentification.
    }
};
