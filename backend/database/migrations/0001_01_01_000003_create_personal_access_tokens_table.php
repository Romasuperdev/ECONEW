<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Les jetons Sanctum sont lus/écrits sur la connexion 'master' (dbmasterbacou),
        // là où se trouve RH_USER — sinon Sanctum écrit et relit sur deux bases
        // différentes (App\Models\PersonalAccessToken force $connection = 'master').
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
        Schema::connection('master')->dropIfExists('personal_access_tokens');
    }
};
