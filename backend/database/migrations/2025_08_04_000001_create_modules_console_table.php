<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::connection('master')->hasTable('modules_console')) {
            return;
        }
        Schema::connection('master')->create('modules_console', function (Blueprint $t) {
            $t->increments('id');
            $t->string('cle', 60)->unique();
            $t->string('libelle', 150);
            $t->string('description', 255)->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('master')->dropIfExists('modules_console');
    }
};
