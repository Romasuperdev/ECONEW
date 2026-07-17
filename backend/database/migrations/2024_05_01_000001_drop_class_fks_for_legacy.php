<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Les classes proviennent desormais de la table existante T_CLASSE (ECONOMAT).
 * On retire les cles etrangeres vers l'ancienne table 'school_classes' pour
 * que students.school_class_id et fee_structures.school_class_id puissent
 * referencer T_CLASSE.num.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('students', 'school_class_id')) {
            Schema::table('students', function (Blueprint $table) {
                try { $table->dropForeign(['school_class_id']); } catch (\Throwable $e) {}
            });
        }
        if (Schema::hasColumn('fee_structures', 'school_class_id')) {
            Schema::table('fee_structures', function (Blueprint $table) {
                try { $table->dropForeign(['school_class_id']); } catch (\Throwable $e) {}
            });
        }
    }

    public function down(): void
    {
        // Pas de restauration automatique des FK (structure legacy).
    }
};
