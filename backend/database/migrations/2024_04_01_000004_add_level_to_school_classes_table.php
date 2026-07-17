<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('school_classes', function (Blueprint $table) {
            $table->foreignId('level_id')->nullable()->after('school_id')->constrained()->nullOnDelete();
            $table->string('section')->nullable()->after('name'); // A, B, C...
        });

        // Ancienne colonne texte 'level' remplacee par level_id -> levels
        if (Schema::hasColumn('school_classes', 'level')) {
            Schema::table('school_classes', function (Blueprint $table) {
                $table->dropColumn('level');
            });
        }
    }

    public function down(): void
    {
        Schema::table('school_classes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('level_id');
            $table->dropColumn('section');
            $table->string('level')->nullable();
        });
    }
};
