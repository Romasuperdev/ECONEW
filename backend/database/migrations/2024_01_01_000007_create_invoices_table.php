<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('academic_year_id')->constrained();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('number')->unique(); // FACT-2025-0001
            $table->date('issue_date');
            $table->date('due_date')->nullable();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            // impayee | partielle | payee | annulee
            $table->enum('status', ['impayee', 'partielle', 'payee', 'annulee'])->default('impayee');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
