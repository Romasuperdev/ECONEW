<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->string('responsable_name')->nullable()->after('name');
            $table->string('country')->nullable()->after('address');
            $table->string('language', 8)->default('fr')->after('country');
            // active | suspended | inactive
            $table->string('status')->default('active')->after('language');
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn(['responsable_name', 'country', 'language', 'status']);
        });
    }
};
