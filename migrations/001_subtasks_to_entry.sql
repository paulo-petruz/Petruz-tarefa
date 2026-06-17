-- =============================================================================
-- Migração: subtarefas (dbo.Subtasks) -> tarefas-filhas em dbo.Tasks (coluna Entry)
-- =============================================================================
-- A estrutura antiga guardava subtarefas em dbo.Subtasks (Id, TaskId, Title,
-- IsDone). A nova trata subtarefa como uma tarefa em dbo.Tasks com Entry = Id
-- da tarefa-mãe.
--
-- IDEMPOTENTE: ao final renomeia dbo.Subtasks -> dbo.Subtasks_migrated (backup).
-- Rodar de novo não faz nada. A cópia + rename ficam numa transação atômica.
--
-- ATENÇÃO PROD: faça BACKUP do banco antes. Use um login com permissão de DDL
-- (sa ou db_owner) — ALTER TABLE / CREATE INDEX / sp_rename exigem isso.
-- Execute no banco TASK.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

-- 1) Garante a coluna Entry (idempotente)
IF COL_LENGTH('dbo.Tasks', 'Entry') IS NULL
    ALTER TABLE dbo.Tasks ADD Entry INT NULL;
GO

-- 2) Índice para consultas por tarefa-mãe (idempotente)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Tasks_Entry')
    CREATE INDEX IX_Tasks_Entry ON dbo.Tasks (Entry);
GO

-- 3) Copia as subtarefas antigas como tarefas-filhas e arquiva a tabela antiga.
--    (a coluna Entry já existe e está commitada pelos lotes acima)
IF OBJECT_ID('dbo.Subtasks', 'U') IS NOT NULL
BEGIN
    BEGIN TRANSACTION;

    INSERT INTO dbo.Tasks
        (WorkspaceId, Title, Description, Status, Priority, Entry,
         AssigneeId, CreatedById, StartDate, DueDate, Progress, CreatedAt, UpdatedAt)
    SELECT  t.WorkspaceId,
            s.Title,
            NULL,
            CASE WHEN s.IsDone = 1 THEN 'done' ELSE 'todo' END,
            'medium',
            s.TaskId,                              -- Entry = id da tarefa-mãe
            NULL,                                  -- responsável: defina depois se quiser
            t.CreatedById,                         -- herda o criador da mãe
            NULL, NULL,
            CASE WHEN s.IsDone = 1 THEN 100 ELSE 0 END,
            s.CreatedAt,
            SYSUTCDATETIME()
    FROM dbo.Subtasks s
    JOIN dbo.Tasks t ON t.Id = s.TaskId;          -- ignora subtarefas órfãs

    PRINT CONCAT('Subtarefas migradas: ', @@ROWCOUNT);

    EXEC sp_rename 'dbo.Subtasks', 'Subtasks_migrated';

    COMMIT TRANSACTION;
    PRINT 'Migração concluída. Tabela antiga arquivada como dbo.Subtasks_migrated.';
END
ELSE
    PRINT 'Nada a migrar: dbo.Subtasks não existe (já migrado).';
GO

-- Conferência (opcional):
-- SELECT Entry AS TarefaMae, COUNT(*) AS Subtarefas
-- FROM dbo.Tasks WHERE Entry IS NOT NULL GROUP BY Entry;
