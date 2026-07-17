<?php

use App\Http\Controllers\Api\AcademicYearController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\CantineController;
use App\Http\Controllers\Api\CashAccountController;
use App\Http\Controllers\Api\CashTransactionController;
use App\Http\Controllers\Api\CycleController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\EstablishmentUserController;
use App\Http\Controllers\Api\EtablissementController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FeeStructureController;
use App\Http\Controllers\Api\FeeTypeController;
use App\Http\Controllers\Api\GrilleScolariteController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\LevelController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentModeController;
use App\Http\Controllers\Api\SmsController;
use App\Http\Controllers\Api\SmsConfigController;
use App\Http\Controllers\Api\DestinationController;
use App\Http\Controllers\Api\TransportTarifController;
use App\Http\Controllers\Api\CantineTarifController;
use App\Http\Controllers\Api\TransportEleveController;
use App\Http\Controllers\Api\RemiseController;
use App\Http\Controllers\Api\StudentDossierController;
use App\Http\Controllers\Api\CaisseSessionController;
use App\Http\Controllers\Api\EcheancierController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PayslipController;
use App\Http\Controllers\Api\PensionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SchoolClassController;
use App\Http\Controllers\Api\SchoolController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\TransportController;
use App\Http\Controllers\Api\TransportLogisticsController;
use App\Http\Controllers\Api\TreasuryOverviewController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VersementController;
use App\Http\Controllers\Api\SuperAdmin\AffectationController;
use App\Http\Controllers\Api\SuperAdmin\ApplicationController;
use App\Http\Controllers\Api\SuperAdmin\AuditLogController;
use App\Http\Controllers\Api\SuperAdmin\DashboardController as SuperDashboardController;
use App\Http\Controllers\Api\SuperAdmin\RhUserController;
use App\Http\Controllers\Api\SuperAdmin\SchoolController as SuperSchoolController;
use App\Http\Controllers\Api\SuperAdmin\SchoolUserController;
use App\Http\Controllers\Api\SuperAdmin\SocieteController;
use App\Http\Controllers\Api\SuperAdmin\SubscriptionController;
use App\Http\Controllers\Api\SuperAdmin\SubscriptionPlanController;
use App\Models\Subscription;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MailDiffusionController;

// Authentification
Route::post('/login', [AuthController::class, 'login']);
Route::post('/lookup', [AuthController::class, 'lookup']);
Route::post('/login/verify-otp', [AuthController::class, 'verifyOtp']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    /* ---------------- Console Super Administrateur ---------------- */
    Route::prefix('super')->middleware('super_admin')->group(function () {
        Route::get('/dashboard', [SuperDashboardController::class, 'index']);
        Route::apiResource('schools', SuperSchoolController::class);
        Route::patch('schools/{school}/status', [SuperSchoolController::class, 'setStatus']);
        Route::apiResource('plans', SubscriptionPlanController::class);
        Route::apiResource('subscriptions', SubscriptionController::class)->except(['update']);
        Route::get('users', [SchoolUserController::class, 'index']);
        Route::post('users', [SchoolUserController::class, 'store']);
        Route::post('users/{user}/reset-password', [SchoolUserController::class, 'resetPassword']);
        Route::patch('users/{user}/active', [SchoolUserController::class, 'setActive']);
        Route::delete('users/{user}', [SchoolUserController::class, 'destroy']);
        Route::apiResource('societes', SocieteController::class);
        Route::get('rh-users', [RhUserController::class, 'index']);
        Route::post('rh-users', [RhUserController::class, 'store']);
        Route::put('rh-users/{rhUser}', [RhUserController::class, 'update']);
        Route::delete('rh-users/{rhUser}', [RhUserController::class, 'destroy']);
        Route::post('rh-users/{rhUser}/reset-password', [RhUserController::class, 'resetPassword']);
        Route::get('affectations', [AffectationController::class, 'index']);
        Route::post('affectations', [AffectationController::class, 'store']);
        Route::delete('affectations/{affectation}', [AffectationController::class, 'destroy']);
        Route::get('applications', [AffectationController::class, 'applications']);
        Route::post('applications', [ApplicationController::class, 'store']);
        Route::put('applications/{application}', [ApplicationController::class, 'update']);
        Route::delete('applications/{application}', [ApplicationController::class, 'destroy']);
        Route::get('societe-applications', [AffectationController::class, 'societeApplications']);
        Route::post('societe-applications', [AffectationController::class, 'assignApp']);
        Route::delete('societe-applications', [AffectationController::class, 'unassignApp']);
        Route::get('audit-logs', [AuditLogController::class, 'index']);
    });

    /* ---------------- Espace Etablissement (multi-tenant) ---------------- */
    Route::middleware('active_subscription')->group(function () {
        Route::get('/my-subscription', function () {
            $user = request()->user();
            $sub = Subscription::with('plan')->where('school_id', $user->school_id)->latest('ends_at')->first();
            return response()->json(['school' => $user->school, 'subscription' => $sub]);
        });

        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('etablissements', [EtablissementController::class, 'index']);
        Route::get('my-activity', [ActivityController::class, 'mine']);

        /* --- Lectures ouvertes --- */
        Route::get('students', [StudentController::class, 'index']);
        Route::get('students/{student}', [StudentController::class, 'show']);
        Route::get('school-classes', [SchoolClassController::class, 'index']);
        Route::get('school-classes/{school_class}', [SchoolClassController::class, 'show']);
        Route::get('academic-years', [AcademicYearController::class, 'index']);
        Route::get('academic-years/{academic_year}', [AcademicYearController::class, 'show']);
        Route::get('grille-scolarite', [GrilleScolariteController::class, 'index']);
        Route::get('cycles', [CycleController::class, 'index']);
        Route::get('levels', [LevelController::class, 'index']);
        Route::get('fee-types', [FeeTypeController::class, 'index']);
        Route::get('payment-modes', [PaymentModeController::class, 'index']);
        Route::get('sms', [SmsController::class, 'index']);
        Route::get('destinations', [DestinationController::class, 'index']);
        Route::get('transport-tarifs', [TransportTarifController::class, 'index']);
        Route::get('cantine-tarifs', [CantineTarifController::class, 'index']);
        Route::get('remises', [RemiseController::class, 'index']);
        Route::get('student-dossiers', [StudentDossierController::class, 'index']);
        Route::get('caisse-session/current', [CaisseSessionController::class, 'current']);
        Route::get('echeancier', [EcheancierController::class, 'index']);
        Route::get('student-photo/{matricule}', [StudentDossierController::class, 'showPhoto']);
        Route::get('transport-eleves', [TransportEleveController::class, 'index']);
        Route::get('cantine/grille', [CantineController::class, 'grilleIndex']);
        Route::get('cantine', [CantineController::class, 'index']);
        Route::get('pension/grille', [PensionController::class, 'grilleIndex']);
        Route::get('pension', [PensionController::class, 'index']);
        Route::get('transport/grille', [TransportController::class, 'grilleIndex']);
        Route::get('transport/buses', [TransportLogisticsController::class, 'busIndex']);
        Route::get('transport/chauffeurs', [TransportLogisticsController::class, 'chauffeurIndex']);
        Route::get('transport/affectations', [TransportLogisticsController::class, 'affectationIndex']);
        Route::get('transport', [TransportController::class, 'index']);
        Route::get('invoices', [InvoiceController::class, 'index']);
        Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::apiResource('payments', PaymentController::class)->only(['index', 'show']);
        Route::get('versements', [VersementController::class, 'index']);
        Route::get('versements/{versement}', [VersementController::class, 'show']);
        Route::get('versements/{versement}/pdf', [DocumentController::class, 'versementPdf']);
        Route::get('invoices/{invoice}/pdf', [DocumentController::class, 'invoicePdf']);
        Route::get('payments/{payment}/pdf', [DocumentController::class, 'receiptPdf']);

        /* --- Configuration academique & frais : config.manage --- */
        Route::middleware(['ability:config.manage', 'exercice'])->group(function () {
            Route::post('students', [StudentController::class, 'store']);
            Route::put('students/{student}', [StudentController::class, 'update']);
            Route::patch('students/{student}', [StudentController::class, 'update']);
            Route::delete('students/{student}', [StudentController::class, 'destroy']);
            Route::post('school-classes', [SchoolClassController::class, 'store']);
            Route::put('school-classes/{school_class}', [SchoolClassController::class, 'update']);
            Route::delete('school-classes/{school_class}', [SchoolClassController::class, 'destroy']);
            Route::post('academic-years', [AcademicYearController::class, 'store']);
            Route::put('academic-years/{academic_year}', [AcademicYearController::class, 'update']);
            Route::delete('academic-years/{academic_year}', [AcademicYearController::class, 'destroy']);
            Route::post('academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate']);
            Route::post('academic-years/{academicYear}/close-partial', [AcademicYearController::class, 'closePartial']);
            Route::post('academic-years/{academicYear}/close-definitive', [AcademicYearController::class, 'closeDefinitive']);
            Route::apiResource('cycles', CycleController::class)->only(['store', 'update', 'destroy']);
            Route::apiResource('levels', LevelController::class)->only(['store', 'update', 'destroy']);
            Route::apiResource('fee-types', FeeTypeController::class)->except(['index']);
            Route::apiResource('fee-structures', FeeStructureController::class);
            Route::post('grille-scolarite', [GrilleScolariteController::class, 'store']);
            Route::put('grille-scolarite/{grille}', [GrilleScolariteController::class, 'update']);
            Route::delete('grille-scolarite/{grille}', [GrilleScolariteController::class, 'destroy']);
            Route::post('cantine/grille', [CantineController::class, 'grilleStore']);
            Route::put('cantine/grille/{grille}', [CantineController::class, 'grilleUpdate']);
            Route::delete('cantine/grille/{grille}', [CantineController::class, 'grilleDestroy']);
            Route::post('pension/grille', [PensionController::class, 'grilleStore']);
            Route::put('pension/grille/{grille}', [PensionController::class, 'grilleUpdate']);
            Route::delete('pension/grille/{grille}', [PensionController::class, 'grilleDestroy']);
        });

        /* --- Échéancier des grilles (config.manage ou services.manage) --- */
        Route::middleware('ability:config.manage,services.manage')->group(function () {
            Route::post('echeancier', [EcheancierController::class, 'store']);
        });

        /* --- SMS : paramétrage (config.manage) --- */
        Route::middleware('ability:config.manage')->group(function () {
            Route::post('sms', [SmsController::class, 'store']);
            Route::put('sms/{sms}', [SmsController::class, 'update']);
            Route::delete('sms/{sms}', [SmsController::class, 'destroy']);
            Route::get('sms-config', [SmsConfigController::class, 'show']);
            Route::put('sms-config', [SmsConfigController::class, 'update']);
        });

        /* --- Services (grilles & logistique) : services.manage --- */
        Route::middleware('ability:services.manage')->group(function () {
            Route::post('transport/grille', [TransportController::class, 'grilleStore']);
            Route::put('transport/grille/{grille}', [TransportController::class, 'grilleUpdate']);
            Route::delete('transport/grille/{grille}', [TransportController::class, 'grilleDestroy']);
            Route::post('transport/buses', [TransportLogisticsController::class, 'busStore']);
            Route::put('transport/buses/{bus}', [TransportLogisticsController::class, 'busUpdate']);
            Route::delete('transport/buses/{bus}', [TransportLogisticsController::class, 'busDestroy']);
            Route::post('transport/chauffeurs', [TransportLogisticsController::class, 'chauffeurStore']);
            Route::put('transport/chauffeurs/{chauffeur}', [TransportLogisticsController::class, 'chauffeurUpdate']);
            Route::delete('transport/chauffeurs/{chauffeur}', [TransportLogisticsController::class, 'chauffeurDestroy']);
            Route::post('destinations', [DestinationController::class, 'store']);
            Route::put('destinations/{destination}', [DestinationController::class, 'update']);
            Route::delete('destinations/{destination}', [DestinationController::class, 'destroy']);
            Route::post('transport-tarifs', [TransportTarifController::class, 'store']);
            Route::put('transport-tarifs/{tarif}', [TransportTarifController::class, 'update']);
            Route::delete('transport-tarifs/{tarif}', [TransportTarifController::class, 'destroy']);
            Route::post('cantine-tarifs', [CantineTarifController::class, 'store']);
            Route::put('cantine-tarifs/{tarif}', [CantineTarifController::class, 'update']);
            Route::delete('cantine-tarifs/{tarif}', [CantineTarifController::class, 'destroy']);
            Route::post('remises', [RemiseController::class, 'store']);
            Route::put('remises/{remise}', [RemiseController::class, 'update']);
            Route::delete('remises/{remise}', [RemiseController::class, 'destroy']);
            Route::post('student-dossiers', [StudentDossierController::class, 'store']);
            Route::delete('student-dossiers/{dossier}', [StudentDossierController::class, 'destroy']);
            Route::post('student-photo', [StudentDossierController::class, 'storePhoto']);
            Route::post('transport-eleves', [TransportEleveController::class, 'store']);
            Route::put('transport-eleves/{aff}', [TransportEleveController::class, 'update']);
            Route::delete('transport-eleves/{aff}', [TransportEleveController::class, 'destroy']);
            Route::post('transport/affectations', [TransportLogisticsController::class, 'affectationStore']);
            Route::delete('transport/affectations/{affectation}', [TransportLogisticsController::class, 'affectationDestroy']);
            Route::apiResource('mail-diffusion', MailDiffusionController::class)->except(['show']);
        });

        /* --- Encaissement : versements.create --- */
        Route::middleware('ability:versements.create')->group(function () {
            Route::post('versements', [VersementController::class, 'store']);
            Route::post('caisse-session/open', [CaisseSessionController::class, 'open']);
            Route::post('caisse-session/close', [CaisseSessionController::class, 'close']);
            Route::delete('versements/{versement}', [VersementController::class, 'destroy']);
            Route::post('versements/{versement}/email', [NotificationController::class, 'emailReceipt']);
            Route::post('cantine', [CantineController::class, 'store'])->middleware('exercice');
            Route::post('cantine/{cantine}/encaisser', [CantineController::class, 'encaisser']);
            Route::post('pension', [PensionController::class, 'store'])->middleware('exercice');
            Route::post('pension/{pension}/encaisser', [PensionController::class, 'encaisser']);
            Route::post('transport', [TransportController::class, 'store'])->middleware('exercice');
            Route::post('transport/{transport}/encaisser', [TransportController::class, 'encaisser']);
            Route::post('transport/{transport}/bus', [TransportController::class, 'affecterBus']);
            Route::post('notifications/reminder', [NotificationController::class, 'sendReminder']);
        });

        /* --- Factures : invoices.manage --- */
        Route::middleware('ability:invoices.manage')->group(function () {
            Route::post('invoices', [InvoiceController::class, 'store'])->middleware('exercice');
            Route::put('invoices/{invoice}', [InvoiceController::class, 'update']);
            Route::delete('invoices/{invoice}', [InvoiceController::class, 'destroy']);
        });

        /* --- Depenses / fournisseurs : expenses.manage --- */
        Route::middleware('ability:expenses.manage')->group(function () {
            Route::get('suppliers', [SupplierController::class, 'index']);
            Route::post('suppliers', [SupplierController::class, 'store']);
            Route::get('suppliers/{item}', [SupplierController::class, 'show']);
            Route::put('suppliers/{item}', [SupplierController::class, 'update']);
            Route::delete('suppliers/{item}', [SupplierController::class, 'destroy']);
            Route::get('expense-categories', [ExpenseCategoryController::class, 'index']);
            Route::post('expense-categories', [ExpenseCategoryController::class, 'store']);
            Route::get('expense-categories/{item}', [ExpenseCategoryController::class, 'show']);
            Route::put('expense-categories/{item}', [ExpenseCategoryController::class, 'update']);
            Route::delete('expense-categories/{item}', [ExpenseCategoryController::class, 'destroy']);
            Route::get('expenses', [ExpenseController::class, 'index']);
            Route::post('expenses', [ExpenseController::class, 'store'])->middleware('exercice');
            Route::get('expenses/{expense}', [ExpenseController::class, 'show']);
            Route::put('expenses/{expense}', [ExpenseController::class, 'update']);
            Route::delete('expenses/{expense}', [ExpenseController::class, 'destroy']);
        });

        /* --- Tresorerie : treasury.view --- */
        Route::middleware('ability:treasury.view')->group(function () {
            Route::get('treasury-overview', [TreasuryOverviewController::class, 'index']);
            Route::get('cash-accounts', [CashAccountController::class, 'index']);
            Route::get('cash-accounts/{cashAccount}', [CashAccountController::class, 'show']);
            Route::post('cash-accounts', [CashAccountController::class, 'store']);
            Route::put('cash-accounts/{cashAccount}', [CashAccountController::class, 'update']);
            Route::delete('cash-accounts/{cashAccount}', [CashAccountController::class, 'destroy']);
            Route::get('cash-transactions', [CashTransactionController::class, 'index']);
            Route::post('cash-transactions', [CashTransactionController::class, 'store']);
            Route::post('cash-transfers', [CashTransactionController::class, 'transfer']);
            Route::delete('cash-transactions/{cashTransaction}', [CashTransactionController::class, 'destroy']);
        });

        /* --- Rapports : reports.view --- */
        Route::middleware('ability:reports.view')->group(function () {
            Route::get('reports/summary', [ReportController::class, 'summary']);
            Route::get('reports/debtors', [ReportController::class, 'debtors']);
            Route::get('reports/treasury', [ReportController::class, 'treasury']);
            Route::get('reports/export/payments', [ReportController::class, 'exportPaymentsCsv']);
            Route::get('reports/export/expenses', [ReportController::class, 'exportExpensesCsv']);
            Route::get('reports/export/summary-xlsx', [ReportController::class, 'exportSummaryXlsx']);
            Route::get('reports/export/summary-pdf', [ReportController::class, 'exportSummaryPdf']);
        });

        /* --- Administration etablissement : users.manage --- */
        Route::middleware('ability:users.manage')->group(function () {
            Route::apiResource('employees', EmployeeController::class);
            Route::apiResource('payslips', PayslipController::class);
            Route::post('payslips/{payslip}/pay', [PayslipController::class, 'pay']);
            Route::apiResource('users', UserController::class);
            Route::get('school', [SchoolController::class, 'mine']);
            Route::put('school', [SchoolController::class, 'updateMine']);
            Route::get('establishment-users', [EstablishmentUserController::class, 'index']);
            Route::post('establishment-users', [EstablishmentUserController::class, 'store']);
            Route::put('establishment-users/{user}', [EstablishmentUserController::class, 'update']);
            Route::delete('establishment-users/{user}', [EstablishmentUserController::class, 'destroy']);
            Route::post('establishment-users/{user}/reset-password', [EstablishmentUserController::class, 'resetPassword']);
            Route::put('establishment-users/{user}/caisse', [EstablishmentUserController::class, 'assignCaisse']);
            Route::get('activity', [ActivityController::class, 'index']);
            Route::post('payment-modes', [PaymentModeController::class, 'store']);
            Route::delete('payment-modes/{mode}', [PaymentModeController::class, 'destroy']);
        });
    });
});
