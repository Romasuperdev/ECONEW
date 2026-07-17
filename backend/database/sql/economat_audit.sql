/* ============================================================
   Economat - Journal d'activite / tracabilite
   A executer dans SSMS sur la base ECONOMAT.
   ============================================================ */
USE [Economat];
GO

IF OBJECT_ID('dbo.ECO_AUDIT', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ECO_AUDIT (
        ID                INT IDENTITY(1,1) NOT NULL,
        USER_ID           INT           NULL,
        USER_LOGIN        VARCHAR(100)  NULL,
        ACTION            VARCHAR(30)   NULL,     -- login, logout, create, update, delete, cancel...
        DESCRIPTION       NVARCHAR(500) NULL,
        CODESOCIETE       VARCHAR(50)   NULL,
        CODEETABLISSEMENT NVARCHAR(50)  NULL,
        IP                VARCHAR(64)   NULL,
        CREATED_AT        DATETIME      NULL CONSTRAINT DF_ECO_AUDIT_CREATED DEFAULT (GETDATE()),
        CONSTRAINT PK_ECO_AUDIT PRIMARY KEY CLUSTERED (ID)
    );
    CREATE INDEX IX_ECO_AUDIT_USER ON dbo.ECO_AUDIT (USER_ID);
    CREATE INDEX IX_ECO_AUDIT_TENANT ON dbo.ECO_AUDIT (CODESOCIETE, CODEETABLISSEMENT);
END
GO
