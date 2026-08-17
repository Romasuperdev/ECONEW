<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::connection('master')->hasTable('utilisateur_module_permissions')) {
            return;
        }
        Schema::connection('master')->create('utilisateur_module_permissions', function (Blueprint $t) {
            $t->increments('id');
            $t->string('user_id', 50);          // RH_USER.Id
            $t->string('module_cle', 60);       // modules_console.cle
            $t->boolean('accorde')->default(true);
            $t->timestamps();
            $t->unique(['user_id', 'module_cle']);
            $t->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::connection('master')->dropIfExists('utilisateur_module_permissions');
    }
};
