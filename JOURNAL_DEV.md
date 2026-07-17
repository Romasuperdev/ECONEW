# Journal de développement — Economat

Récapitulatif des modules et fonctionnalités construits. (Le code correspondant est
enregistré dans `backend/` et `frontend/`. Pour une sauvegarde durable : voir `SAUVEGARDE.md`.)

## Authentification & accès
- Connexion sur les bases existantes (RH_USER / dbmasterbacou ; données métier ECONOMAT).
- Page de connexion **double panneau glissant** : Application / Console, avec décor animé.
- 2FA (code e-mail), rôles fins (directeur, comptable, caissier, économe, secrétaire, auditeur, super admin).
- Multi-tenant : société / établissement / année, isolation des données.

## Configuration
- Années scolaires (ouverture / clôture partielle / définitive).
- Niveaux (code saisi, cycle fixe, examen), Classes (code saisi + UID interne).
- Caisses (code saisi, caisse principale), Affectation caisse ↔ utilisateurs.
- SMS (configuration passerelle), Mail.

## Fichier de base
- Cars de transport, Chauffeurs (matricule, type de permis ivoirien, photo).
- Destinations.
- Grilles (sous-menu) : Scolarité (Inscription/Scolarité/Frais annexes, nb de modalités,
  statut affecté), Transport (par destination, montant mois/année), Cantine, Pension —
  toutes avec **échéancier manuel** (montant + date par versement).

## Traitement
- Inscription : fiche élève complète (identité + photo, niveau scolaire, parents,
  dossiers & frais annexes, remises, paiements) + **fiche imprimable A4**.
- Remise (liée aux grilles selon le type/rubrique).
- Transport : affectation, chauffeur/car, réinscription, changement de destination,
  historique paiements, élèves par destination / par car.
- Cantine & Pension : inscription et réinscription groupée.
- Paiement : Ouverture de caisse → Nouveau paiement (bloqué sans caisse ouverte,
  contrôle serveur) → Fermeture → Point de caisse.
- États : paiements, périodiques détaillés, cumulés.

## Autres
- Trésorerie, Dépenses, Fournisseurs, Salaires, Rapports (+ exports).
- UID interne automatique sur les enregistrements (registre ECO_UID).
- Journalisation automatique des écritures → `JOURNAL_ACTIVITES.md`.
- UI : formulaires larges 2 colonnes, libellés en gras, tables espacées, thèmes clair/sombre/ensoleillé.

## Tables auxiliaires créées automatiquement (base ECONOMAT)
ECO_USER_ROLE, ECO_USER_CAISSE, ECO_AUDIT, ECO_MODE_PAIEMENT, ECO_UID,
ECO_CAISSE_PRINCIPALE, ECO_SMS_CONFIG, ECO_DESTINATION, ECO_GRILLE_TRANSPORT,
ECO_GRILLE_CANTINE, ECO_GRILLE_SCO_EXTRA, ECO_ECHEANCIER, ECO_CHAUFFEUR_EXTRA,
ECO_DOSSIER_ELEVE, ECO_ELEVE_PHOTO, ECO_CAISSE_SESSION, ECO_REMISE (ou T_REMISE_ACCORDEE).

---
*Mettre à jour ce fichier au fil des évolutions. Sauvegarde réelle = Git + sauvegarde des bases (voir SAUVEGARDE.md).*
