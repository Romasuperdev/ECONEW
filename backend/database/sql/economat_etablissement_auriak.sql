/* ============================================================
   Economat - Creer l'etablissement de la societe AURIAK
   + rattacher les donnees AURIAK deja saisies (etablissement vide)
   A executer dans SSMS sur la base ECONOMAT.

   >>> Ajuste CODE et RAISONSOCIALE ci-dessous selon ton etablissement.
   ============================================================ */

USE [Economat];
GO

DECLARE @CODE       VARCHAR(50)   = 'AUR01';                 -- code de l'etablissement
DECLARE @NOM        NVARCHAR(255) = N'AURIAK - Etablissement principal';
DECLARE @SOCIETE    VARCHAR(50)   = 'AURIAK';

/* 1) Creation de l'etablissement (si absent).
      Num est suppose IDENTITY : on ne l'insere pas.
      Si SQL Server reclame une colonne NOT NULL supplementaire,
      ajoute-la dans la liste avec une valeur. */
IF NOT EXISTS (SELECT 1 FROM dbo.T_ETABLISSEMENT WHERE CODE = @CODE)
BEGIN
    INSERT INTO dbo.T_ETABLISSEMENT (CODE, RAISONSOCIALE, TYPE, CODESOCIETE)
    VALUES (@CODE, @NOM, 'Scolaire', @SOCIETE);
END
GO

/* 2) Rattacher les donnees AURIAK deja creees dont l'etablissement est vide.
      (colonne CODEETABLISSEMENT pour la plupart ; 'Site' pour les eleves) */
DECLARE @CODE VARCHAR(50) = 'AUR01';
DECLARE @SOCIETE VARCHAR(50) = 'AURIAK';

UPDATE dbo.T_NIVEAU  SET CODEETABLISSEMENT = @CODE WHERE CODESOCIETE = @SOCIETE AND (CODEETABLISSEMENT IS NULL OR CODEETABLISSEMENT = '');
UPDATE dbo.T_CLASSE  SET CODEETABLISSEMENT = @CODE WHERE CODESOCIETE = @SOCIETE AND (CODEETABLISSEMENT IS NULL OR CODEETABLISSEMENT = '');
UPDATE dbo.T_CANTINE SET CODEETABLISSEMENT = @CODE WHERE CODESOCIETE = @SOCIETE AND (CODEETABLISSEMENT IS NULL OR CODEETABLISSEMENT = '');
UPDATE dbo.T_TRANSPORT SET CODEETABLISSEMENT = @CODE WHERE CODESOCIETE = @SOCIETE AND (CODEETABLISSEMENT IS NULL OR CODEETABLISSEMENT = '');

-- Eleves : la colonne d'etablissement est 'Site'
UPDATE dbo.T_ETUDIANT SET Site = @CODE WHERE CODESOCIETE = @SOCIETE AND (Site IS NULL OR Site = '');

-- Factures dediees (si la table existe deja)
IF OBJECT_ID('dbo.ECO_FACTURE', 'U') IS NOT NULL
    UPDATE dbo.ECO_FACTURE SET CODEETABLISSEMENT = @CODE WHERE CODESOCIETE = @SOCIETE AND (CODEETABLISSEMENT IS NULL OR CODEETABLISSEMENT = '');
GO
