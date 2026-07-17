<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Gratuit, Standard, Premium, Entreprise
            $table->string('slug')->unique();
            $table->decimal('price', 12, 2)->default(0);
            $table->string('billing_period')->default('mensuel'); // mensuel | annuel
            $table->unsignedInteger('max_students')->nullable(); // null = illimité
            $table->unsignedInteger('max_users')->nullable();
            $table->unsignedInteger('storage_mb')->nullable();
            $table->json('features')->nullable(); // liste des modules
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
