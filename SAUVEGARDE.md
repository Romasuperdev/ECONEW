# Guide de sauvegarde — Projet Economat

Ce document explique comment **sauvegarder** et **restaurer** l'ensemble du projet Economat : le code (backend Laravel + frontend React), la **configuration** et les **bases de données SQL Server**.

> À faire idéalement **chaque jour de travail** (au minimum le code via Git) et **avant toute mise à jour importante**.

---

## 1. Ce qu'il faut sauvegarder

| Élément | Emplacement | Fréquence conseillée |
|---|---|---|
| Code backend (Laravel) | `backend/` | À chaque changement (Git) |
| Code frontend (React) | `frontend/` | À chaque changement (Git) |
| Fichier de config `.env` | `backend/.env` | À chaque changement (**hors Git**) |
| Base métier | SQL Server : `ECONOMAT` | Quotidienne |
| Base des comptes | SQL Server : `dbmasterbacou` | Quotidienne |
| Documents générés | `*.docx`, `*.pdf`, `*.png` à la racine | Selon besoin |

> ⚠️ Ne jamais versionner dans Git : `backend/.env`, `backend/vendor/`, `frontend/node_modules/`, `backend/storage/`. Ces dossiers se régénèrent ou contiennent des secrets.

---

## 2. Sauvegarde du code avec Git (recommandé)

### 2.1 Première fois (initialisation)

```bash
cd C:\ROMARIC\ECONEW\ECONEW
git init
git add .
git commit -m "Sauvegarde initiale du projet Economat"
```

### 2.2 Sauvegardes suivantes (au quotidien)

```bash
cd C:\ROMARIC\ECONEW\ECONEW
git add .
git commit -m "Sauvegarde du <date> — <ce qui a changé>"
```

### 2.3 Copie distante (GitHub / GitLab / disque réseau)

Pour se protéger d'une panne du PC, envoyer une copie ailleurs :

```bash
git remote add origin <URL_de_votre_depot>
git push -u origin master
```

Ensuite, chaque jour : `git push`.

### 2.4 Fichier `.gitignore` conseillé

Créer un fichier `.gitignore` à la racine avec :

```
# Dépendances
/backend/vendor/
/frontend/node_modules/

# Secrets & environnement
/backend/.env
/backend/.env.backup

# Fichiers temporaires Laravel
/backend/storage/*.key
/backend/storage/framework/cache/*
/backend/storage/framework/sessions/*
/backend/storage/logs/*

# Build frontend
/frontend/dist/
```

---

## 3. Sauvegarde de la configuration (`.env`)

Le fichier `backend/.env` contient les identifiants de connexion (SQL Server, SMTP…). Il **n'est pas** dans Git : le copier manuellement dans un endroit sûr.

```bash
copy C:\ROMARIC\ECONEW\ECONEW\backend\.env  C:\Sauvegardes\Economat\env_<date>.txt
```

---

## 4. Sauvegarde des bases de données SQL Server

Deux bases sont utilisées : **ECONOMAT** (données métier) et **dbmasterbacou** (comptes utilisateurs).

### 4.1 Méthode simple — SQL Server Management Studio (SSMS)

1. Ouvrir **SSMS** et se connecter au serveur.
2. Clic droit sur la base **ECONOMAT** → **Tasks / Tâches** → **Back Up… / Sauvegarder…**
3. Type de sauvegarde : **Full / Complète**.
4. Destination : choisir un dossier, ex. `C:\Sauvegardes\Economat\ECONOMAT_<date>.bak`.
5. Cliquer **OK**.
6. **Répéter les étapes 2 à 5 pour la base `dbmasterbacou`.**

### 4.2 Méthode en ligne de commande (sqlcmd)

Adapter le serveur, l'utilisateur et le mot de passe (mêmes valeurs que dans `backend/.env`).

```bat
sqlcmd -S 127.0.0.1 -U sa3 -P <MOT_DE_PASSE> -Q "BACKUP DATABASE [ECONOMAT] TO DISK='C:\Sauvegardes\Economat\ECONOMAT.bak' WITH INIT, COMPRESSION"

sqlcmd -S 127.0.0.1 -U sa3 -P <MOT_DE_PASSE> -Q "BACKUP DATABASE [dbmasterbacou] TO DISK='C:\Sauvegardes\Economat\dbmasterbacou.bak' WITH INIT, COMPRESSION"
```

> 💡 Créer d'abord le dossier `C:\Sauvegardes\Economat\`.

### 4.3 Automatiser (facultatif)

Enregistrer les deux commandes ci-dessus dans un fichier `sauvegarde_bd.bat`, puis programmer une exécution quotidienne via le **Planificateur de tâches Windows**.

---

## 5. Sauvegarde complète « tout-en-un » (archive datée)

Pour une copie hors-ligne complète (à mettre sur un disque externe / cloud) :

1. Faire les sauvegardes `.bak` des deux bases (section 4).
2. Copier le dossier du projet **sans** `vendor/` ni `node_modules/`.
3. Copier `backend/.env`.
4. Regrouper le tout dans un dossier daté, ex. `Economat_Sauvegarde_2026-07-16\`, puis le compresser en `.zip`.

Contenu type de l'archive :

```
Economat_Sauvegarde_2026-07-16.zip
├── code/                      (le projet sans vendor/ ni node_modules/)
├── env.txt                    (copie de backend/.env)
├── ECONOMAT.bak
└── dbmasterbacou.bak
```

---

## 6. Restauration (remettre le projet en marche)

### 6.1 Restaurer le code

```bash
# Depuis Git
git clone <URL_de_votre_depot> C:\ROMARIC\ECONEW\ECONEW
# ou décompresser l'archive .zip
```

### 6.2 Restaurer la configuration

Replacer le fichier `.env` sauvegardé dans `backend/.env`.

### 6.3 Réinstaller les dépendances

```bash
cd backend
composer install
php artisan key:generate   # uniquement si la clé est absente

cd ../frontend
npm install
```

### 6.4 Restaurer les bases de données

Dans SSMS : clic droit sur **Databases** → **Restore Database…** → **Device** → sélectionner le `.bak` → **OK**. Répéter pour les deux bases.

Ou en ligne de commande :

```bat
sqlcmd -S 127.0.0.1 -U sa3 -P <MOT_DE_PASSE> -Q "RESTORE DATABASE [ECONOMAT] FROM DISK='C:\Sauvegardes\Economat\ECONOMAT.bak' WITH REPLACE"
```

### 6.5 Relancer l'application

```bash
# Backend
cd backend
php artisan cache:clear
php artisan serve

# Frontend (dans un autre terminal)
cd frontend
npm run dev
```

---

## 7. Bonnes pratiques

- **Règle du 3-2-1** : 3 copies, sur 2 supports différents, dont 1 hors site (cloud ou disque externe).
- **Tester une restauration** de temps en temps : une sauvegarde jamais testée n'est pas une sauvegarde fiable.
- **Nommer les sauvegardes avec la date** (`ECONOMAT_2026-07-16.bak`) pour pouvoir revenir en arrière.
- **Conserver plusieurs jours** d'historique (ne pas écraser toujours le même fichier).
- Sauvegarder **avant** chaque mise à jour du code ou changement de structure de base.

---

*Document généré pour le projet Economat — à conserver à la racine du projet.*
