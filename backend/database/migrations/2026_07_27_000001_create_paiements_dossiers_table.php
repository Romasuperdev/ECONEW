<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table du module « Réception des dossiers et frais annexes ».
 * Connexion economat (SQL Server). Créée aussi à la volée par le contrôleur
 * (pattern ECO_*), d'où la garde hasTable().
 */
return new class extends Migration
{
    private string $conn = 'economat';
    private string $table = 'paiements_dossiers';

    public function up(): void
    {
        if (Schema::connection($this->conn)->hasTable($this->table)) {
            return;
        }
        Schema::connection($this->conn)->create($this->table, function (Blueprint $t) {
            $t->increments('id');
            $t->string('code_societe', 50)->nullable()->index();
            $t->string('etablissement_id', 50)->nullable()->index();
            $t->string('matricule_eleve', 50)->index();
            $t->string('annee_scolaire_id', 50)->nullable();
            $t->string('grille_tarifaire_id', 50)->nullable();
            $t->decimal('montant_frais_dossier', 14, 2)->default(0);
            $t->decimal('montant_frais_annexes', 14, 2)->default(0);
            $t->decimal('montant_total', 14, 2)->default(0);
            $t->decimal('montant_paye', 14, 2)->default(0);
            $t->string('mode_paiement', 50)->nullable();
            $t->string('reference_paiement', 100)->nullable();
            $t->string('numero_recu', 60)->nullable()->unique();
            $t->string('statut', 20)->default('non_paye'); // paye / partiel / non_paye
            $t->string('user_id', 50)->nullable();          // agent encaisseur
            $t->string('created_by', 50)->nullable();
            $t->string('updated_by', 50)->nullable();
            $t->string('deleted_by', 50)->nullable();
            $t->string('motif_annulation', 255)->nullable();
            $t->timestamps();       // created_at (verrouillage) / updated_at
            $t->softDeletes();      // deleted_at
        });
    }

    public function down(): void
    {
        Schema::connection($this->conn)->dropIfExists($this->table);
    }
};
