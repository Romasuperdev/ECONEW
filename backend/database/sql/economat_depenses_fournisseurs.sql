/* ============================================================
   Economat - Tables dediees Depenses & Fournisseurs
   A executer dans la base ECONOMAT (SQL Server / SSMS).
   Ces tables sont prefixees ECO_ pour ne pas heurter les
   tables existantes T_*. Elles sont multi-tenant :
   isolation par CODESOCIETE (et ANNEE pour les depenses).
   ============================================================ */

USE [Economat];
GO

/* ---------- Categories de depenses ---------- */
IF OBJECT_ID('dbo.ECO_CATEGORIE_DEPENSE', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ECO_CATEGORIE_DEPENSE (
        ID          INT IDENTITY(1,1) NOT NULL,
        CODESOCIETE VARCHAR(50)   NOT NULL,
        LIBELLE     NVARCHAR(255) NOT NULL,
        CREATED_AT  DATETIME      NULL CONSTRAINT DF_ECO_CAT_CREATED DEFAULT (GETDATE()),
        CONSTRAINT PK_ECO_CATEGORIE_DEPENSE PRIMARY KEY CLUSTERED (ID)
    );
    CREATE INDEX IX_ECO_CAT_SOCIETE ON dbo.ECO_CATEGORIE_DEPENSE (CODESOCIETE);
END
GO

/* ---------- Fournisseurs ---------- */
IF OBJECT_ID('dbo.ECO_FOURNISSEUR', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ECO_FOURNISSEUR (
        ID          INT IDENTITY(1,1) NOT NULL,
        CODESOCIETE VARCHAR(50)   NOT NULL,
        NOM         NVARCHAR(255) NOT NULL,
        CONTACT     NVARCHAR(255) NULL,
        TELEPHONE   VARCHAR(50)   NULL,
        EMAIL       VARCHAR(255)  NULL,
        ADRESSE     NVARCHAR(500) NULL,
        CREATED_AT  DATETIME      NULL CONSTRAINT DF_ECO_FOURN_CREATED DEFAULT (GETDATE()),
        CONSTRAINT PK_ECO_FOURNISSEUR PRIMARY KEY CLUSTERED (ID)
    );
    CREATE INDEX IX_ECO_FOURN_SOCIETE ON dbo.ECO_FOURNISSEUR (CODESOCIETE);
END
GO

/* ---------- Depenses ---------- */
IF OBJECT_ID('dbo.ECO_DEPENSE', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ECO_DEPENSE (
        ID             INT IDENTITY(1,1) NOT NULL,
        CODESOCIETE    VARCHAR(50)    NOT NULL,
        ANNEE          VARCHAR(20)    NULL,        -- exercice (ex : 2025-2026)
        CATEGORIE_ID   INT            NULL,        -- -> ECO_CATEGORIE_DEPENSE.ID
        FOURNISSEUR_ID INT            NULL,        -- -> ECO_FOURNISSEUR.ID
        REFERENCE      VARCHAR(50)    NULL,        -- ex : DEP-2026-0001
        LIBELLE        NVARCHAR(255)  NOT NULL,
        MONTANT        DECIMAL(18,2)  NOT NULL CONSTRAINT DF_ECO_DEP_MONTANT DEFAULT (0),
        DATE_DEPENSE   DATE           NOT NULL,
        MODE_PAIEMENT  VARCHAR(30)    NULL,        -- especes / mobile_money / virement / cheque / carte
        CODECAISSE     VARCHAR(50)    NULL,        -- caisse impactee (T_CAISSES.CODECAISSE)
        STATUT         VARCHAR(20)    NULL CONSTRAINT DF_ECO_DEP_STATUT DEFAULT ('validee'), -- en_attente / validee / rejetee
        NOTES          NVARCHAR(1000) NULL,
        CREATED_AT     DATETIME       NULL CONSTRAINT DF_ECO_DEP_CREATED DEFAULT (GETDATE()),
        CONSTRAINT PK_ECO_DEPENSE PRIMARY KEY CLUSTERED (ID),
        CONSTRAINT FK_ECO_DEP_CAT   FOREIGN KEY (CATEGORIE_ID)   REFERENCES dbo.ECO_CATEGORIE_DEPENSE (ID),
        CONSTRAINT FK_ECO_DEP_FOURN FOREIGN KEY (FOURNISSEUR_ID) REFERENCES dbo.ECO_FOURNISSEUR (ID)
    );
    CREATE INDEX IX_ECO_DEP_SOCIETE_ANNEE ON dbo.ECO_DEPENSE (CODESOCIETE, ANNEE);
    CREATE INDEX IX_ECO_DEP_DATE          ON dbo.ECO_DEPENSE (DATE_DEPENSE);
END
GO
