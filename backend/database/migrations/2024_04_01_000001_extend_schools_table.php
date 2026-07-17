<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->string('sigle')->nullable()->after('name');
            $table->string('city')->nullable()->after('address');
            $table->string('website')->nullable()->after('email');
            $table->string('timezone')->default('Africa/Abidjan')->after('website');
            $table->string('rccm')->nullable()->after('timezone');
            $table->string('tax_number')->nullable()->after('rccm');
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn(['sigle', 'city', 'website', 'timezone', 'rccm', 'tax_number']);
        });
    }
};
