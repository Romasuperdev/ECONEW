<?php

/*
 | Matrice des permissions fines par role (espace etablissement).
 | Les lectures de base restent ouvertes ; les actions/pages sensibles
 | sont gouvernees par les "abilities" ci-dessous.
 |
 | Abilities :
 |  - config.manage     : structure academique, annees, types/grille de frais
 |  - students.manage   : eleves / inscriptions (ecriture)
 |  - invoices.manage   : factures (emission, modification)
 |  - versements.create : encaisser un versement (scolarite, cantine, pension, transport)
 |  - versements.cancel : annuler un versement (sans limite de date)
 |  - services.manage   : grilles & logistique cantine / pension / transport
 |  - expenses.manage   : depenses, categories, fournisseurs
 |  - treasury.view     : consultation tresorerie (lecture seule)
 |  - treasury.manage   : creation/modification/suppression comptes & mouvements de tresorerie
 |  - reports.view      : rapports et exports
 |  - users.manage      : comptes de l'etablissement, salaires, parametres etablissement
 */

return [

    'abilities' => [
        'config.manage',
        'students.manage',
        'invoices.manage',
        'versements.create',
        'versements.cancel',
        'services.manage',
        'expenses.manage',
        'treasury.view',
        'treasury.manage',
        'reports.view',
        'users.manage',
        'dossiers.manage',
        'departs.manage',
        'tarifs.manage',
        'import.manage',
    ],

    // Libelles lisibles (frontend / selecteur de role)
    'labels' => [
        'super_admin' => 'Super Administrateur',
        'admin_etablissement' => "Admin d'établissement",
        'directeur' => 'Directeur / Admin établissement',
        'comptable' => 'Comptable',
        'caissier' => 'Caissier',
        'econome' => 'Économe',
        'secretaire' => 'Secrétaire',
        'auditeur' => 'Auditeur',
    ],

    'roles' => [
        'super_admin' => ['*'],
        'directeur' => ['*'],
        // Admin d'établissement : accès gouverné par les permissions de modules
        // (voir modules_console). Abilities de base minimales ; le middleware
        // check.module contrôle réellement les 4 sections de sa console.
        'admin_etablissement' => ['reports.view'],
        'comptable' => [
            'versements.create', 'versements.cancel', 'invoices.manage',
            'expenses.manage', 'treasury.view', 'treasury.manage', 'reports.view', 'dossiers.manage',
        ],
        'caissier' => [
            'versements.create', 'dossiers.manage',
        ],
        'econome' => [
            'versements.create', 'services.manage', 'expenses.manage', 'treasury.view', 'treasury.manage', 'dossiers.manage', 'tarifs.manage',
        ],
        'secretaire' => [
            'students.manage', 'invoices.manage', 'dossiers.manage', 'departs.manage',
        ],
        'auditeur' => [
            'reports.view', 'treasury.view',
        ],
    ],

    // Roles selectionnables par le Super Admin lorsqu'il se connecte a l'application
    'assignable' => ['admin_etablissement', 'directeur', 'comptable', 'caissier', 'econome', 'secretaire', 'auditeur'],

    // Catalogue des sections (modules) activables pour un admin_etablissement.
    'modules_console' => [
        ['cle' => 'gestion_utilisateurs', 'libelle' => "Gestion des utilisateurs", 'description' => "Créer, modifier les rôles, désactiver les comptes de l'établissement"],
        ['cle' => 'parametres_etablissement', 'libelle' => "Paramètres de l'établissement", 'description' => "Configuration SMS/e-mail, informations générales, logo"],
        ['cle' => 'rapports_transversaux', 'libelle' => "Rapports transversaux", 'description' => "Vue en lecture seule sur tous les modules de l'établissement"],
        ['cle' => 'abonnement_facturation', 'libelle' => "Abonnement / facturation", 'description' => "Consulter l'abonnement de l'établissement"],
    ],
];
