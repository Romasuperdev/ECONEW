/* ============================================================
   Economat - Attribution des roles aux utilisateurs
   A executer dans SSMS sur la base ECONOMAT.
   Chaque ligne relie un compte RH_USER (USER_ID) a un ROLE,
   dans une societe / un etablissement donnes.
   ============================================================ */

USE [Economat];
GO

IF OBJECT_ID('dbo.ECO_USER_ROLE', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ECO_USER_ROLE (
        ID                INT IDENTITY(1,1) NOT NULL,
        USER_ID           INT           NOT NULL,   -- RH_USER.Id
        ROLE              VARCHAR(30)   NOT NULL,   -- directeur, comptable, caissier, econome, secretaire, auditeur
        CODESOCIETE       VARCHAR(50)   NULL,
        CODEETABLISSEMENT NVARCHAR(50)  NULL,
        CREATED_AT        DATETIME      NULL CONSTRAINT DF_ECO_USER_ROLE_CREATED DEFAULT (GETDATE()),
        CONSTRAINT PK_ECO_USER_ROLE PRIMARY KEY CLUSTERED (ID)
    );
    CREATE INDEX IX_ECO_USER_ROLE_USER ON dbo.ECO_USER_ROLE (USER_ID);
    CREATE INDEX IX_ECO_USER_ROLE_TENANT ON dbo.ECO_USER_ROLE (CODESOCIETE, CODEETABLISSEMENT);
END
GO
