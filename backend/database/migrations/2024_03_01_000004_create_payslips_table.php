<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('number')->unique(); // BUL-2025-0001
            $table->string('period'); // 2025-09 (mois)
            $table->decimal('base_salary', 14, 2)->default(0);
            $table->decimal('total_primes', 14, 2)->default(0);
            $table->decimal('total_retenues', 14, 2)->default(0);
            $table->decimal('total_avances', 14, 2)->default(0);
            $table->decimal('net_amount', 14, 2)->default(0);
            $table->string('status')->default('brouillon'); // brouillon | valide | paye
            $table->date('paid_at')->nullable();
            $table->unsignedBigInteger('cash_account_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payslips');
    }
};
