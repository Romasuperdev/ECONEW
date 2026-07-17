<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Grille tarifaire : montant d'un type de frais pour une classe et une année
        Schema::create('fee_structures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('academic_year_id')->constrained();
            $table->foreignId('school_class_id')->constrained();
            $table->foreignId('fee_type_id')->constrained();
            $table->decimal('amount', 12, 2);
            $table->timestamps();
            $table->unique(['academic_year_id', 'school_class_id', 'fee_type_id'], 'fee_structure_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_structures');
    }
};
