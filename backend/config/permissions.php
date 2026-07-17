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
 |  - treasury.view     : consultation tresorerie
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
        'reports.view',
        'users.manage',
    ],

    // Libelles lisibles (frontend / selecteur de role)
    'labels' => [
        'super_admin' => 'Super Administrateur',
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
        'comptable' => [
            'versements.create', 'versements.cancel', 'invoices.manage',
            'expenses.manage', 'treasury.view', 'reports.view',
        ],
        'caissier' => [
            'versements.create',
        ],
        'econome' => [
            'versements.create', 'services.manage', 'expenses.manage', 'treasury.view',
        ],
        'secretaire' => [
            'students.manage', 'invoices.manage',
        ],
        'auditeur' => [
            'reports.view', 'treasury.view',
        ],
    ],

    // Roles selectionnables par le Super Admin lorsqu'il se connecte a l'application
    'assignable' => ['directeur', 'comptable', 'caissier', 'econome', 'secretaire', 'auditeur'],
];
