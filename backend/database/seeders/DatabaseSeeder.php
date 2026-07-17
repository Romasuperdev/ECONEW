<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\FeeStructure;
use App\Models\FeeType;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\SubscriptionPlan;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ---- Super Administrateur de la plateforme ----
        User::create([
            'name' => 'Super Administrateur',
            'email' => 'super@economat.app',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'school_id' => null,
        ]);

        // ---- Formules d'abonnement ----
        $plans = [
            ['name' => 'Gratuit', 'slug' => 'gratuit', 'price' => 0, 'billing_period' => 'mensuel',
             'max_students' => 50, 'max_users' => 2, 'storage_mb' => 200,
             'features' => ['eleves', 'frais', 'paiements', 'factures']],
            ['name' => 'Standard', 'slug' => 'standard', 'price' => 25000, 'billing_period' => 'mensuel',
             'max_students' => 500, 'max_users' => 8, 'storage_mb' => 2000,
             'features' => ['eleves', 'frais', 'paiements', 'factures', 'depenses', 'fournisseurs', 'rapports']],
            ['name' => 'Premium', 'slug' => 'premium', 'price' => 60000, 'billing_period' => 'mensuel',
             'max_students' => 2000, 'max_users' => 25, 'storage_mb' => 10000,
             'features' => ['eleves', 'frais', 'paiements', 'factures', 'depenses', 'fournisseurs', 'rapports', 'tresorerie', 'salaires', 'notifications']],
            ['name' => 'Entreprise', 'slug' => 'entreprise', 'price' => 150000, 'billing_period' => 'mensuel',
             'max_students' => null, 'max_users' => null, 'storage_mb' => null,
             'features' => ['tout']],
        ];
        $planModels = [];
        foreach ($plans as $p) {
            $planModels[$p['slug']] = SubscriptionPlan::create($p);
        }

        $school = School::create([
            'name' => 'Groupe Scolaire Les Palmiers',
            'code' => 'GSP',
            'responsable_name' => 'M. Koffi Bernard',
            'address' => 'Cocody, Abidjan',
            'country' => "Cote d'Ivoire",
            'language' => 'fr',
            'status' => 'active',
            'phone' => '+225 07 00 00 00 00',
            'email' => 'contact@lespalmiers.ci',
            'currency' => 'XOF',
        ]);

        // Abonnement Premium actif pour l'école de démo
        $sub = Subscription::create([
            'school_id' => $school->id,
            'subscription_plan_id' => $planModels['premium']->id,
            'starts_at' => Carbon::now()->subMonth()->toDateString(),
            'ends_at' => Carbon::now()->addMonths(11)->toDateString(),
            'status' => 'active',
            'amount' => $planModels['premium']->price,
            'auto_renew' => true,
        ]);
        SubscriptionPayment::create([
            'subscription_id' => $sub->id,
            'school_id' => $school->id,
            'reference' => 'ABN-2025-0001',
            'amount' => $planModels['premium']->price,
            'paid_at' => Carbon::now()->subMonth()->toDateString(),
            'method' => 'mobile_money',
            'status' => 'paye',
        ]);

        // Utilisateurs
        User::create([
            'name' => 'Administrateur', 'email' => 'admin@econew.ci',
            'password' => Hash::make('password'), 'role' => 'admin',
            'school_id' => $school->id,
        ]);
        User::create([
            'name' => 'Comptable', 'email' => 'comptable@econew.ci',
            'password' => Hash::make('password'), 'role' => 'comptable',
            'school_id' => $school->id,
        ]);
        $caissier = User::create([
            'name' => 'Caissier', 'email' => 'caissier@econew.ci',
            'password' => Hash::make('password'), 'role' => 'caissier',
            'school_id' => $school->id,
        ]);

        // Année scolaire
        $year = AcademicYear::create([
            'school_id' => $school->id, 'label' => '2025-2026',
            'start_date' => '2025-09-01', 'end_date' => '2026-07-15', 'is_current' => true,
        ]);

        // Classes
        $classes = collect(['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'])->map(fn ($n) => SchoolClass::create([
            'school_id' => $school->id, 'name' => $n, 'capacity' => 40,
        ]));

        // Types de frais
        $feeTypes = [
            'Inscription' => ['is_recurring' => false, 'amount' => 50000],
            'Scolarité' => ['is_recurring' => true, 'amount' => 250000],
            'Cantine' => ['is_recurring' => true, 'amount' => 90000],
            'Transport' => ['is_recurring' => true, 'amount' => 60000],
            'Uniforme' => ['is_recurring' => false, 'amount' => 25000],
        ];
        $types = [];
        foreach ($feeTypes as $name => $cfg) {
            $types[$name] = FeeType::create([
                'school_id' => $school->id, 'name' => $name,
                'code' => strtoupper(substr($name, 0, 4)), 'is_recurring' => $cfg['is_recurring'],
            ]);
        }

        // Grille tarifaire (même montant pour toutes les classes ici)
        foreach ($classes as $class) {
            foreach ($feeTypes as $name => $cfg) {
                FeeStructure::create([
                    'school_id' => $school->id, 'academic_year_id' => $year->id,
                    'school_class_id' => $class->id, 'fee_type_id' => $types[$name]->id,
                    'amount' => $cfg['amount'],
                ]);
            }
        }

        // Catégories de dépenses & fournisseurs
        $categories = collect(['Salaires', 'Fournitures', 'Loyer', 'Électricité & Eau', 'Maintenance'])
            ->map(fn ($n) => ExpenseCategory::create(['school_id' => $school->id, 'name' => $n]));
        $suppliers = collect(['Librairie Centrale', 'CIE-SODECI', 'Entreprise Bâti+'])
            ->map(fn ($n) => Supplier::create(['school_id' => $school->id, 'name' => $n]));

        // Élèves + factures + paiements
        $prenoms = ['Awa', 'Koffi', 'Aya', 'Yao', 'Fatou', 'Kouassi', 'Mariam', 'Ibrahim', 'Adjoua', 'Sekou'];
        $noms = ['Traoré', 'Kouamé', 'Diallo', 'Konan', 'Bamba', 'Yao', 'Coulibaly', 'N\'Guessan'];
        $invSeq = 0; $recSeq = 0;

        foreach (range(1, 40) as $i) {
            $class = $classes->random();
            $student = Student::create([
                'school_id' => $school->id, 'school_class_id' => $class->id,
                'matricule' => sprintf('MAT25%04d', $i),
                'first_name' => $prenoms[array_rand($prenoms)],
                'last_name' => $noms[array_rand($noms)],
                'gender' => ['M', 'F'][rand(0, 1)],
                'birth_date' => Carbon::now()->subYears(rand(6, 12))->toDateString(),
                'guardian_name' => 'Parent '.$i,
                'guardian_phone' => '+225 0'.rand(1, 7).' '.rand(10, 99).' '.rand(10, 99).' '.rand(10, 99).' '.rand(10, 99),
                'status' => 'actif',
            ]);

            // Facture avec inscription + scolarité + (parfois) cantine
            $items = [
                ['type' => 'Inscription', 'amount' => 50000],
                ['type' => 'Scolarité', 'amount' => 250000],
            ];
            if (rand(0, 1)) $items[] = ['type' => 'Cantine', 'amount' => 90000];
            $total = collect($items)->sum('amount');

            $invSeq++;
            $invoice = Invoice::create([
                'school_id' => $school->id, 'academic_year_id' => $year->id,
                'student_id' => $student->id,
                'number' => sprintf('FACT-2025-%04d', $invSeq),
                'issue_date' => '2025-09-05', 'due_date' => '2025-12-31',
                'total_amount' => $total, 'paid_amount' => 0, 'status' => 'impayee',
            ]);
            foreach ($items as $it) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id, 'fee_type_id' => $types[$it['type']]->id,
                    'label' => $it['type'], 'amount' => $it['amount'],
                ]);
            }

            // Paiement aléatoire : rien / partiel / total
            $scenario = rand(0, 2);
            if ($scenario > 0) {
                $amount = $scenario === 2 ? $total : round($total * (rand(30, 70) / 100));
                $recSeq++;
                Payment::create([
                    'school_id' => $school->id, 'invoice_id' => $invoice->id,
                    'student_id' => $student->id, 'user_id' => $caissier->id,
                    'receipt_number' => sprintf('RECU-2025-%04d', $recSeq),
                    'amount' => $amount,
                    'paid_at' => Carbon::create(2025, rand(9, 12), rand(1, 28))->toDateString(),
                    'method' => ['especes', 'mobile_money', 'virement'][rand(0, 2)],
                ]);
                $invoice->refreshTotals();
            }
        }

        // Dépenses
        foreach (range(1, 20) as $i) {
            Expense::create([
                'school_id' => $school->id,
                'expense_category_id' => $categories->random()->id,
                'supplier_id' => $suppliers->random()->id,
                'user_id' => $caissier->id,
                'reference' => sprintf('DEP-2025-%04d', $i),
                'label' => 'Dépense '.$i,
                'amount' => rand(20000, 500000),
                'spent_at' => Carbon::create(2025, rand(9, 12), rand(1, 28))->toDateString(),
                'method' => ['especes', 'virement', 'cheque'][rand(0, 2)],
                'status' => 'validee',
            ]);
        }
    }
}
