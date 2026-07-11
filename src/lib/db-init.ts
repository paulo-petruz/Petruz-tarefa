import type { ConnectionPool } from "mssql";

/**
 * DDL idempotente: cria as tabelas do sistema caso ainda não existam.
 * Executado automaticamente na primeira conexão com o banco.
 */
const DDL_STATEMENTS: string[] = [
  `IF OBJECT_ID('dbo.Users', 'U') IS NULL
   CREATE TABLE dbo.Users (
     Id INT IDENTITY(1,1) PRIMARY KEY,
     Name NVARCHAR(120) NOT NULL,
     Email NVARCHAR(255) NOT NULL UNIQUE,
     PasswordHash NVARCHAR(255) NOT NULL,
     Role NVARCHAR(20) NOT NULL DEFAULT 'user',
     CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
   )`,

  `IF OBJECT_ID('dbo.Workspaces', 'U') IS NULL
   CREATE TABLE dbo.Workspaces (
     Id INT IDENTITY(1,1) PRIMARY KEY,
     Name NVARCHAR(120) NOT NULL,
     Description NVARCHAR(500) NULL,
     Color NVARCHAR(20) NOT NULL DEFAULT '#7C3AED',
     OwnerId INT NOT NULL REFERENCES dbo.Users(Id),
     CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
   )`,

  `IF OBJECT_ID('dbo.WorkspaceMembers', 'U') IS NULL
   CREATE TABLE dbo.WorkspaceMembers (
     WorkspaceId INT NOT NULL REFERENCES dbo.Workspaces(Id) ON DELETE CASCADE,
     UserId INT NOT NULL REFERENCES dbo.Users(Id),
     Role NVARCHAR(20) NOT NULL DEFAULT 'member',
     JoinedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
     CONSTRAINT PK_WorkspaceMembers PRIMARY KEY (WorkspaceId, UserId)
   )`,

  `IF OBJECT_ID('dbo.Tasks', 'U') IS NULL
   CREATE TABLE dbo.Tasks (
     Id INT IDENTITY(1,1) PRIMARY KEY,
     WorkspaceId INT NOT NULL REFERENCES dbo.Workspaces(Id) ON DELETE CASCADE,
     Title NVARCHAR(200) NOT NULL,
     Description NVARCHAR(2000) NULL,
     Status NVARCHAR(20) NOT NULL DEFAULT 'todo',
     Priority NVARCHAR(10) NOT NULL DEFAULT 'medium',
     Entry INT NULL,
     AssigneeId INT NULL REFERENCES dbo.Users(Id),
     CreatedById INT NOT NULL REFERENCES dbo.Users(Id),
     StartDate DATE NULL,
     DueDate DATE NULL,
     CompletedDate DATE NULL,
     Progress INT NOT NULL DEFAULT 0,
     MetaType NVARCHAR(10) NULL,
     MetaValue INT NULL,
     CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
     UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
   )`,

  // Migração para bancos criados antes da coluna de progresso manual
  `IF COL_LENGTH('dbo.Tasks', 'Progress') IS NULL
   ALTER TABLE dbo.Tasks ADD Progress INT NOT NULL DEFAULT 0`,

  // Data de conclusão (preenchida ao mudar o status para 'done')
  `IF COL_LENGTH('dbo.Tasks', 'CompletedDate') IS NULL
   ALTER TABLE dbo.Tasks ADD CompletedDate DATE NULL`,

  // Preenche a data de conclusão de tarefas já concluídas sem data
  `UPDATE dbo.Tasks
   SET CompletedDate = CAST(UpdatedAt AS DATE)
   WHERE Status = 'done' AND CompletedDate IS NULL`,

  // Meta de subtarefas em aberto para tarefas recorrentes (teto/piso)
  `IF COL_LENGTH('dbo.Tasks', 'MetaType') IS NULL
   ALTER TABLE dbo.Tasks ADD MetaType NVARCHAR(10) NULL`,

  `IF COL_LENGTH('dbo.Tasks', 'MetaValue') IS NULL
   ALTER TABLE dbo.Tasks ADD MetaValue INT NULL`,

  `IF OBJECT_ID('dbo.Subtasks', 'U') IS NULL
   CREATE TABLE dbo.Subtasks (
     Id INT IDENTITY(1,1) PRIMARY KEY,
     TaskId INT NOT NULL REFERENCES dbo.Tasks(Id) ON DELETE CASCADE,
     Title NVARCHAR(200) NOT NULL,
     IsDone BIT NOT NULL DEFAULT 0,
     CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
   )`,

  `IF COL_LENGTH('dbo.Tasks', 'Entry') IS NULL
   ALTER TABLE dbo.Tasks ADD Entry INT NULL`,

  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Tasks_Entry')
   CREATE INDEX IX_Tasks_Entry ON dbo.Tasks (Entry)`,

  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Subtasks_TaskId')
   CREATE INDEX IX_Subtasks_TaskId ON dbo.Subtasks (TaskId)`,

  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Tasks_WorkspaceId')
   CREATE INDEX IX_Tasks_WorkspaceId ON dbo.Tasks (WorkspaceId)`,

  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Tasks_AssigneeId')
   CREATE INDEX IX_Tasks_AssigneeId ON dbo.Tasks (AssigneeId)`,

  `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Tasks_DueDate')
   CREATE INDEX IX_Tasks_DueDate ON dbo.Tasks (DueDate)`,
];

export async function initDb(pool: ConnectionPool): Promise<void> {
  for (const statement of DDL_STATEMENTS) {
    await pool.request().batch(statement);
  }
}
