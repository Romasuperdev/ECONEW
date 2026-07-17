<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('expense_category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('user_id')->nullable(); // RH_USER.Id
            $table->string('reference')->unique(); // DEP-2025-0001
            $table->string('label');
            $table->decimal('amount', 12, 2);
            $table->date('spent_at');
            $table->enum('method', ['especes', 'mobile_money', 'virement', 'cheque', 'carte'])->default('especes');
            $table->enum('status', ['en_attente', 'validee', 'rejetee'])->default('validee');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
