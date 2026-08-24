import "server-only";
import { getPool, sql } from "./db";
import { DONE_ARCHIVE_DAYS } from "./constants";

export interface UserRecord {
  Id: number;
  Name: string;
  Email: string;
  PasswordHash: string;
  Role: string;
}

export interface Workspace {
  Id: number;
  Name: string;
  Description: string | null;
  Color: string;
  OwnerId: number;
  MemberRole: string;
  TaskCount: number;
  DoneCount: number;
}

export interface WorkspaceMember {
  UserId: number;
  Name: string;
  Email: string;
  Role: string;
  /** Autorizador do membro neste espaço (null = usa o dono como padrão). */
  ApproverId: number | null;
  ApproverName: string | null;
}

export interface Task {
  Id: number;
  WorkspaceId: number;
  WorkspaceName?: string;
  Title: string;
  Description: string | null;
  Entry?: number | null;
  Status: string;
  Priority: string;
  AssigneeId: number | null;
  AssigneeName: string | null;
  CreatedById: number;
  StartDate: Date | null;
  DueDate: Date | null;
  CompletedDate: Date | null;
  Progress: number;
  CreatedAt: Date;
  SubtaskCount: number;
  SubtaskDone: number;
  /** Meta de subtarefas em aberto (teto/piso); null = sem meta. */
  MetaType: string | null;
  MetaValue: number | null;
  /** Tempo-padrão por unidade em segundos (null = não mensurável). */
  StandardSeconds: number | null;
  /** Totais apontados (0 quando não há apontamentos). */
  ProdQty: number;
  ProdSeconds: number;
  /** Usuários vinculados além do responsável (compartilhamento). */
  Collaborators: { UserId: number; Name: string }[];
}

/** Converte a coluna CollaboratorsJson (FOR JSON) no array Collaborators. */
function mapTask(row: Record<string, unknown>): Task {
  const { CollaboratorsJson, ...rest } = row;
  return {
    ...(rest as unknown as Task),
    Collaborators:
      typeof CollaboratorsJson === "string" ? JSON.parse(CollaboratorsJson) : [],
  };
}

// ---------- Usuários ----------

export async function findUserByEmail(
  email: string
): Promise<UserRecord | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("email", sql.NVarChar(255), email.toLowerCase().trim())
    .query("SELECT * FROM dbo.Users WHERE Email = @email");
  return result.recordset[0] ?? null;
}

export async function createUser(
  name: string,
  email: string,
  passwordHash: string
): Promise<UserRecord> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("name", sql.NVarChar(120), name.trim())
    .input("email", sql.NVarChar(255), email.toLowerCase().trim())
    .input("hash", sql.NVarChar(255), passwordHash)
    .query(
      `INSERT INTO dbo.Users (Name, Email, PasswordHash)
       OUTPUT INSERTED.*
       VALUES (@name, @email, @hash)`
    );
  return result.recordset[0];
}

export interface UserSummary {
  Id: number;
  Name: string;
  Email: string;
  Role: string;
  CreatedAt: Date;
}

/** Papel global atual direto do banco (não confia no token da sessão). */
export async function getUserRole(userId: number): Promise<string | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.Int, userId)
    .query("SELECT Role FROM dbo.Users WHERE Id = @id");
  return result.recordset[0]?.Role ?? null;
}

export async function listAllUsers(query?: string): Promise<UserSummary[]> {
  const pool = await getPool();
  const request = pool.request();
  let where = "";
  if (query?.trim()) {
    request.input("q", sql.NVarChar(255), `%${query.trim()}%`);
    where = "WHERE Name LIKE @q OR Email LIKE @q";
  }
  const result = await request.query(
    `SELECT Id, Name, Email, Role, CreatedAt FROM dbo.Users ${where} ORDER BY Name`
  );
  return result.recordset;
}

export async function getUserById(id: number): Promise<UserRecord | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .query("SELECT * FROM dbo.Users WHERE Id = @id");
  return result.recordset[0] ?? null;
}

export async function updateUserPassword(
  userId: number,
  passwordHash: string
): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, userId)
    .input("hash", sql.NVarChar(255), passwordHash)
    .query("UPDATE dbo.Users SET PasswordHash = @hash WHERE Id = @id");
}

// ---------- Workspaces ----------

export async function listWorkspacesForUser(
  userId: number
): Promise<Workspace[]> {
  const pool = await getPool();
  const result = await pool.request().input("userId", sql.Int, userId).query(
    `SELECT w.Id, w.Name, w.Description, w.Color, w.OwnerId,
            wm.Role AS MemberRole,
            (SELECT COUNT(*) FROM dbo.Tasks t WHERE t.WorkspaceId = w.Id AND t.Entry IS NULL) AS TaskCount,
            (SELECT COUNT(*) FROM dbo.Tasks t WHERE t.WorkspaceId = w.Id AND t.Entry IS NULL AND t.Status = 'done') AS DoneCount
     FROM dbo.Workspaces w
     JOIN dbo.WorkspaceMembers wm ON wm.WorkspaceId = w.Id
     WHERE wm.UserId = @userId
     ORDER BY w.Name`
  );
  return result.recordset;
}

export async function getWorkspace(id: number): Promise<Workspace | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .query(
      `SELECT Id, Name, Description, Color, OwnerId, '' AS MemberRole, 0 AS TaskCount, 0 AS DoneCount
       FROM dbo.Workspaces WHERE Id = @id`
    );
  return result.recordset[0] ?? null;
}

export async function createWorkspace(
  name: string,
  description: string | null,
  color: string,
  ownerId: number
): Promise<number> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("name", sql.NVarChar(120), name.trim())
    .input("description", sql.NVarChar(500), description)
    .input("color", sql.NVarChar(20), color)
    .input("ownerId", sql.Int, ownerId)
    .query(
      `INSERT INTO dbo.Workspaces (Name, Description, Color, OwnerId)
       OUTPUT INSERTED.Id
       VALUES (@name, @description, @color, @ownerId);`
    );
  const workspaceId: number = result.recordset[0].Id;
  await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .input("userId", sql.Int, ownerId)
    .query(
      `INSERT INTO dbo.WorkspaceMembers (WorkspaceId, UserId, Role)
       VALUES (@workspaceId, @userId, 'admin')`
    );
  return workspaceId;
}

export async function deleteWorkspace(id: number): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, id)
    .query("DELETE FROM dbo.Workspaces WHERE Id = @id");
}

export async function listWorkspaceMembers(
  workspaceId: number
): Promise<WorkspaceMember[]> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .query(
      `SELECT u.Id AS UserId, u.Name, u.Email, wm.Role,
              wm.ApproverId, ap.Name AS ApproverName
       FROM dbo.WorkspaceMembers wm
       JOIN dbo.Users u ON u.Id = wm.UserId
       LEFT JOIN dbo.Users ap ON ap.Id = wm.ApproverId
       WHERE wm.WorkspaceId = @workspaceId
       ORDER BY u.Name`
    );
  return result.recordset;
}

export async function addWorkspaceMember(
  workspaceId: number,
  userId: number,
  role: string
): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .input("userId", sql.Int, userId)
    .input("role", sql.NVarChar(20), role)
    .query(
      `IF NOT EXISTS (SELECT 1 FROM dbo.WorkspaceMembers WHERE WorkspaceId = @workspaceId AND UserId = @userId)
       INSERT INTO dbo.WorkspaceMembers (WorkspaceId, UserId, Role)
       VALUES (@workspaceId, @userId, @role)`
    );
}

export async function removeWorkspaceMember(
  workspaceId: number,
  userId: number
): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .input("userId", sql.Int, userId)
    .query(
      `DELETE FROM dbo.WorkspaceMembers
       WHERE WorkspaceId = @workspaceId AND UserId = @userId`
    );
}

/** Define (ou limpa, com null) o autorizador de um membro no espaço. */
export async function setMemberApprover(
  workspaceId: number,
  userId: number,
  approverId: number | null
): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .input("userId", sql.Int, userId)
    .input("approverId", sql.Int, approverId)
    .query(
      `UPDATE dbo.WorkspaceMembers
       SET ApproverId = @approverId
       WHERE WorkspaceId = @workspaceId AND UserId = @userId`
    );
}

/**
 * Autorizador efetivo do membro: o configurado no espaço ou, na falta dele,
 * o dono do espaço (garante que a solicitação sempre tenha destinatário).
 * Retorna null quando o usuário não é membro do espaço.
 */
export async function getEffectiveApproverId(
  workspaceId: number,
  userId: number
): Promise<number | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .input("userId", sql.Int, userId)
    .query(
      `SELECT COALESCE(wm.ApproverId, w.OwnerId) AS ApproverId
       FROM dbo.WorkspaceMembers wm
       JOIN dbo.Workspaces w ON w.Id = wm.WorkspaceId
       WHERE wm.WorkspaceId = @workspaceId AND wm.UserId = @userId`
    );
  return result.recordset[0]?.ApproverId ?? null;
}

/** Limpa o vínculo de autorizador de quem apontava para o usuário removido. */
export async function clearApproverReferences(
  workspaceId: number,
  approverId: number
): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .input("approverId", sql.Int, approverId)
    .query(
      `UPDATE dbo.WorkspaceMembers
       SET ApproverId = NULL
       WHERE WorkspaceId = @workspaceId AND ApproverId = @approverId`
    );
}

// ---------- Solicitações de autorização ----------

export interface ApprovalRequest {
  Id: number;
  WorkspaceId: number;
  Type: string;
  TargetId: number | null;
  TargetLabel: string | null;
  RequesterId: number;
  RequesterName: string;
  ApproverId: number;
  ApproverName: string;
  Status: string;
  Reason: string | null;
  DecisionNote: string | null;
  CreatedAt: Date;
  DecidedAt: Date | null;
}

const APPROVAL_SELECT = `
  SELECT ar.Id, ar.WorkspaceId, ar.Type, ar.TargetId, ar.TargetLabel,
         ar.RequesterId, rq.Name AS RequesterName,
         ar.ApproverId, ap.Name AS ApproverName,
         ar.Status, ar.Reason, ar.DecisionNote, ar.CreatedAt, ar.DecidedAt
  FROM dbo.ApprovalRequests ar
  JOIN dbo.Users rq ON rq.Id = ar.RequesterId
  JOIN dbo.Users ap ON ap.Id = ar.ApproverId`;

export async function getApprovalRequest(
  id: number
): Promise<ApprovalRequest | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .query(`${APPROVAL_SELECT} WHERE ar.Id = @id`);
  return result.recordset[0] ?? null;
}

/** Solicitação pendente já existente para o mesmo alvo (evita duplicidade). */
export async function findPendingApproval(
  type: string,
  targetId: number
): Promise<ApprovalRequest | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("type", sql.NVarChar(30), type)
    .input("targetId", sql.Int, targetId)
    .query(
      `${APPROVAL_SELECT}
       WHERE ar.Type = @type AND ar.TargetId = @targetId AND ar.Status = 'pending'`
    );
  return result.recordset[0] ?? null;
}

export interface ApprovalRequestInput {
  workspaceId: number;
  type: string;
  targetId: number | null;
  targetLabel: string | null;
  requesterId: number;
  approverId: number;
  reason: string | null;
}

export async function createApprovalRequest(
  input: ApprovalRequestInput
): Promise<number> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("workspaceId", sql.Int, input.workspaceId)
    .input("type", sql.NVarChar(30), input.type)
    .input("targetId", sql.Int, input.targetId)
    .input("targetLabel", sql.NVarChar(200), input.targetLabel)
    .input("requesterId", sql.Int, input.requesterId)
    .input("approverId", sql.Int, input.approverId)
    .input("reason", sql.NVarChar(500), input.reason)
    .query(
      `INSERT INTO dbo.ApprovalRequests
         (WorkspaceId, Type, TargetId, TargetLabel, RequesterId, ApproverId, Reason)
       OUTPUT INSERTED.Id
       VALUES (@workspaceId, @type, @targetId, @targetLabel, @requesterId, @approverId, @reason)`
    );
  return result.recordset[0].Id;
}

/** Registra a decisão; só afeta solicitações ainda pendentes. */
export async function decideApprovalRequest(
  id: number,
  status: "approved" | "declined",
  decisionNote: string | null
): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, id)
    .input("status", sql.NVarChar(20), status)
    .input("note", sql.NVarChar(500), decisionNote)
    .query(
      `UPDATE dbo.ApprovalRequests
       SET Status = @status, DecisionNote = @note, DecidedAt = SYSUTCDATETIME()
       WHERE Id = @id AND Status = 'pending'`
    );
}

/** Solicitações que o usuário precisa decidir (é o autorizador). */
export async function listApprovalsToDecide(
  workspaceId: number,
  approverId: number
): Promise<ApprovalRequest[]> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .input("approverId", sql.Int, approverId)
    .query(
      `${APPROVAL_SELECT}
       WHERE ar.WorkspaceId = @workspaceId AND ar.ApproverId = @approverId
       ORDER BY CASE WHEN ar.Status = 'pending' THEN 0 ELSE 1 END, ar.Id DESC`
    );
  return result.recordset;
}

/** Solicitações abertas pelo próprio usuário (para acompanhar o status). */
export async function listMyApprovalRequests(
  workspaceId: number,
  requesterId: number
): Promise<ApprovalRequest[]> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .input("requesterId", sql.Int, requesterId)
    .query(
      `${APPROVAL_SELECT}
       WHERE ar.WorkspaceId = @workspaceId AND ar.RequesterId = @requesterId
       ORDER BY CASE WHEN ar.Status = 'pending' THEN 0 ELSE 1 END, ar.Id DESC`
    );
  return result.recordset;
}

// ---------- Tarefas ----------

const TASK_SELECT = `
  SELECT t.Id, t.WorkspaceId, t.Title, t.Description, t.Status, t.Priority,
    t.Entry,
         t.AssigneeId, a.Name AS AssigneeName, t.CreatedById,
         t.StartDate, t.DueDate, t.CompletedDate, t.Progress,
         t.MetaType, t.MetaValue, t.StandardSeconds, t.CreatedAt, w.Name AS WorkspaceName,
    (SELECT COUNT(*) FROM dbo.Tasks s WHERE s.Entry = t.Id) AS SubtaskCount,
    (SELECT COUNT(*) FROM dbo.Tasks s WHERE s.Entry = t.Id AND s.Status = 'done') AS SubtaskDone,
    COALESCE((SELECT SUM(pl.Quantity) FROM dbo.TaskProductionLog pl WHERE pl.TaskId = t.Id), 0) AS ProdQty,
    COALESCE((SELECT SUM(pl.DurationSeconds) FROM dbo.TaskProductionLog pl WHERE pl.TaskId = t.Id), 0) AS ProdSeconds,
    (SELECT u.Id AS UserId, u.Name
       FROM dbo.TaskCollaborators tc JOIN dbo.Users u ON u.Id = tc.UserId
       WHERE tc.TaskId = t.Id
       FOR JSON PATH) AS CollaboratorsJson
  FROM dbo.Tasks t
  LEFT JOIN dbo.Users a ON a.Id = t.AssigneeId
  JOIN dbo.Workspaces w ON w.Id = t.WorkspaceId`;

/**
 * Recorte do arquivo: mantém todas as tarefas em aberto e apenas as
 * concluídas dentro da janela de @days dias. CompletedDate pode ser nula em
 * registros antigos, por isso o COALESCE com UpdatedAt.
 */
const DONE_WINDOW_FILTER = `
  AND (t.Status <> 'done'
       OR COALESCE(t.CompletedDate, CAST(t.UpdatedAt AS DATE))
          >= DATEADD(day, -@days, CAST(GETDATE() AS DATE)))`;

/**
 * Tarefas-mãe do espaço. Por padrão traz só as concluídas recentes;
 * @param doneDays janela em dias, ou null para incluir todo o arquivo.
 */
export async function listTasksByWorkspace(
  workspaceId: number,
  doneDays: number | null = DONE_ARCHIVE_DAYS
): Promise<Task[]> {
  const pool = await getPool();
  const request = pool.request().input("workspaceId", sql.Int, workspaceId);
  let windowFilter = "";
  if (doneDays != null) {
    request.input("days", sql.Int, doneDays);
    windowFilter = DONE_WINDOW_FILTER;
  }
  const result = await request.query(
    `${TASK_SELECT}
     WHERE t.WorkspaceId = @workspaceId AND t.Entry IS NULL${windowFilter}
     ORDER BY CASE WHEN t.DueDate IS NULL THEN 1 ELSE 0 END, t.DueDate, t.Id DESC`
  );
  return result.recordset.map(mapTask);
}

/** Quantas concluídas ficaram fora da janela (estão no arquivo). */
export async function countArchivedTasks(
  workspaceId: number,
  doneDays: number
): Promise<number> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .input("days", sql.Int, doneDays)
    .query(
      `SELECT COUNT(*) AS Total
       FROM dbo.Tasks
       WHERE WorkspaceId = @workspaceId AND Entry IS NULL AND Status = 'done'
         AND COALESCE(CompletedDate, CAST(UpdatedAt AS DATE))
             < DATEADD(day, -@days, CAST(GETDATE() AS DATE))`
    );
  return result.recordset[0]?.Total ?? 0;
}

export async function getTask(id: number): Promise<Task | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .query(`${TASK_SELECT} WHERE t.Id = @id`);
  const row = result.recordset[0];
  return row ? mapTask(row) : null;
}

export interface TaskInput {
  workspaceId: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: number | null;
  startDate: string | null;
  dueDate: string | null;
  progress: number;
  entry?: number | null;
  metaType?: string | null;
  metaValue?: number | null;
  standardSeconds?: number | null;
}
export async function createTask(
  input: TaskInput,
  createdById: number
): Promise<number> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("workspaceId", sql.Int, input.workspaceId)
    .input("title", sql.NVarChar(200), input.title.trim())
    .input("description", sql.NVarChar(2000), input.description)
    .input("status", sql.NVarChar(20), input.status)
    .input("priority", sql.NVarChar(10), input.priority)
    .input("assigneeId", sql.Int, input.assigneeId)
    .input("entry", sql.Int, input.entry)
    .input("startDate", sql.Date, input.startDate)
    .input("dueDate", sql.Date, input.dueDate)
    .input("progress", sql.Int, input.progress)
    .input("metaType", sql.NVarChar(10), input.metaType ?? null)
    .input("metaValue", sql.Int, input.metaValue ?? null)
    .input("standardSeconds", sql.Int, input.standardSeconds ?? null)
    .input("createdById", sql.Int, createdById)
    .query(
      `INSERT INTO dbo.Tasks (WorkspaceId, Title, Description, Status, Priority, Entry, AssigneeId, StartDate, DueDate, CompletedDate, Progress, MetaType, MetaValue, StandardSeconds, CreatedById)
       OUTPUT INSERTED.Id
       VALUES (@workspaceId, @title, @description, @status, @priority, @entry, @assigneeId, @startDate, @dueDate,
               CASE WHEN @status = 'done' THEN CAST(GETDATE() AS DATE) ELSE NULL END,
               @progress, @metaType, @metaValue, @standardSeconds, @createdById)`
    );
  return result.recordset[0].Id;
}

/** Substitui a lista de colaboradores (usuários vinculados) de uma tarefa. */
export async function setTaskCollaborators(
  taskId: number,
  userIds: number[]
): Promise<void> {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await tx
      .request()
      .input("taskId", sql.Int, taskId)
      .query("DELETE FROM dbo.TaskCollaborators WHERE TaskId = @taskId");
    for (const userId of userIds) {
      await tx
        .request()
        .input("taskId", sql.Int, taskId)
        .input("userId", sql.Int, userId)
        .query(
          "INSERT INTO dbo.TaskCollaborators (TaskId, UserId) VALUES (@taskId, @userId)"
        );
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

// ---------- Apontamentos de produção (tarefa mensurável) ----------

export interface ProductionLogEntry {
  Id: number;
  TaskId: number;
  UserId: number;
  UserName: string;
  Quantity: number;
  DurationSeconds: number;
  Note: string | null;
  LoggedAt: Date;
}

/** Lançamentos de produção de uma tarefa, do mais recente ao mais antigo. */
export async function listProductionLog(
  taskId: number
): Promise<ProductionLogEntry[]> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("taskId", sql.Int, taskId)
    .query(
      `SELECT pl.Id, pl.TaskId, pl.UserId, u.Name AS UserName,
              pl.Quantity, pl.DurationSeconds, pl.Note, pl.LoggedAt
       FROM dbo.TaskProductionLog pl
       JOIN dbo.Users u ON u.Id = pl.UserId
       WHERE pl.TaskId = @taskId
       ORDER BY pl.Id DESC`
    );
  return result.recordset;
}

/** Registra um lote produzido (quantidade + tempo gasto). */
export async function addProductionLog(
  taskId: number,
  userId: number,
  quantity: number,
  durationSeconds: number,
  note: string | null
): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("taskId", sql.Int, taskId)
    .input("userId", sql.Int, userId)
    .input("quantity", sql.Int, quantity)
    .input("durationSeconds", sql.Int, durationSeconds)
    .input("note", sql.NVarChar(200), note)
    .query(
      `INSERT INTO dbo.TaskProductionLog (TaskId, UserId, Quantity, DurationSeconds, Note)
       VALUES (@taskId, @userId, @quantity, @durationSeconds, @note)`
    );
}

/** Remove um lançamento (restrito à tarefa informada, validada na action). */
export async function deleteProductionLog(
  id: number,
  taskId: number
): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, id)
    .input("taskId", sql.Int, taskId)
    .query(
      "DELETE FROM dbo.TaskProductionLog WHERE Id = @id AND TaskId = @taskId"
    );
}

export async function updateTask(id: number, input: TaskInput): Promise<void> {
  const pool = await getPool();
  // Início e vencimento são imutáveis após a criação: não entram no UPDATE.
  // CompletedDate é gerenciada pelo status (preenche ao concluir, limpa ao reabrir).
  await pool
    .request()
    .input("id", sql.Int, id)
    .input("title", sql.NVarChar(200), input.title.trim())
    .input("description", sql.NVarChar(2000), input.description)
    .input("status", sql.NVarChar(20), input.status)
    .input("priority", sql.NVarChar(10), input.priority)
    .input("assigneeId", sql.Int, input.assigneeId)
    .input("progress", sql.Int, input.progress)
    .input("metaType", sql.NVarChar(10), input.metaType ?? null)
    .input("metaValue", sql.Int, input.metaValue ?? null)
    .input("standardSeconds", sql.Int, input.standardSeconds ?? null)
    .query(
      `UPDATE dbo.Tasks
       SET Title = @title, Description = @description, Status = @status,
           Priority = @priority, AssigneeId = @assigneeId, Progress = @progress,
           MetaType = @metaType, MetaValue = @metaValue,
           StandardSeconds = @standardSeconds,
           CompletedDate = CASE WHEN @status = 'done'
                                THEN COALESCE(CompletedDate, CAST(GETDATE() AS DATE))
                                ELSE NULL END,
           UpdatedAt = SYSUTCDATETIME()
       WHERE Id = @id`
    );
}

export async function updateTaskStatus(
  id: number,
  status: string
): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, id)
    .input("status", sql.NVarChar(20), status)
    .query(
      `UPDATE dbo.Tasks
       SET Status = @status,
           CompletedDate = CASE WHEN @status = 'done'
                                THEN COALESCE(CompletedDate, CAST(GETDATE() AS DATE))
                                ELSE NULL END,
           UpdatedAt = SYSUTCDATETIME()
       WHERE Id = @id`
    );
}

export async function updateTaskProgress(
  id: number,
  progress: number
): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, id)
    .input("progress", sql.Int, progress)
    .query(
      `UPDATE dbo.Tasks SET Progress = @progress, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id`
    );
}

export async function deleteTask(id: number): Promise<void> {
  const pool = await getPool();
  // Apaga a tarefa e suas subtarefas (filhas com Entry = id).
  await pool
    .request()
    .input("id", sql.Int, id)
    .query("DELETE FROM dbo.Tasks WHERE Id = @id OR Entry = @id");
}

// ---------- Subtarefas (tarefas-filhas: Entry = Id da tarefa-mãe) ----------

/**
 * Subtarefas (tarefas-filhas) do workspace. Carrega apenas as subtarefas
 * cujas mães estão visíveis na mesma janela, para não trazer todo o
 * histórico junto.
 */
export async function listSubtasksByWorkspace(
  workspaceId: number,
  doneDays: number | null = DONE_ARCHIVE_DAYS
): Promise<Task[]> {
  const pool = await getPool();
  const request = pool.request().input("workspaceId", sql.Int, workspaceId);
  let windowFilter = "";
  if (doneDays != null) {
    request.input("days", sql.Int, doneDays);
    windowFilter = `
      AND EXISTS (
        SELECT 1 FROM dbo.Tasks p
        WHERE p.Id = t.Entry
          AND (p.Status <> 'done'
               OR COALESCE(p.CompletedDate, CAST(p.UpdatedAt AS DATE))
                  >= DATEADD(day, -@days, CAST(GETDATE() AS DATE))))`;
  }
  const result = await request.query(
    `${TASK_SELECT}
     WHERE t.WorkspaceId = @workspaceId AND t.Entry IS NOT NULL${windowFilter}
     ORDER BY t.Id DESC`
  );
  return result.recordset.map(mapTask);
}

// ---------- Painel (dashboard) ----------

export interface StatusCount {
  WorkspaceId: number;
  WorkspaceName: string;
  Color: string;
  Status: string;
  Count: number;
}

export async function getStatusCountsForUser(
  userId: number
): Promise<StatusCount[]> {
  const pool = await getPool();
  const result = await pool.request().input("userId", sql.Int, userId).query(
    `SELECT w.Id AS WorkspaceId, w.Name AS WorkspaceName, w.Color, t.Status, COUNT(*) AS Count
     FROM dbo.Tasks t
     JOIN dbo.Workspaces w ON w.Id = t.WorkspaceId
     JOIN dbo.WorkspaceMembers wm ON wm.WorkspaceId = w.Id AND wm.UserId = @userId
     WHERE t.Entry IS NULL
     GROUP BY w.Id, w.Name, w.Color, t.Status`
  );
  return result.recordset;
}

/** Tarefas não concluídas vencidas ou que vencem nos próximos @days dias. */
export async function getDueAlertsForUser(
  userId: number,
  days = 3
): Promise<Task[]> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("days", sql.Int, days)
    .query(
      `${TASK_SELECT}
       JOIN dbo.WorkspaceMembers wm ON wm.WorkspaceId = t.WorkspaceId AND wm.UserId = @userId
       WHERE t.Entry IS NULL
         AND t.Status <> 'done'
         AND t.DueDate IS NOT NULL
         AND t.DueDate <= DATEADD(day, @days, CAST(GETDATE() AS DATE))
       ORDER BY t.DueDate`
    );
  return result.recordset.map(mapTask);
}

export interface DueNotificationRow {
  UserId: number;
  Name: string;
  Email: string;
  TaskId: number;
  Title: string;
  DueDate: Date;
  Status: string;
  WorkspaceName: string;
}

/**
 * Para envio de e-mails: cada linha é um par (usuário vinculado, tarefa) cuja
 * previsão está vencida ou vence nos próximos @days dias. Usuário vinculado =
 * responsável OU colaborador da tarefa.
 */
export async function getDueTaskNotifications(
  days: number
): Promise<DueNotificationRow[]> {
  const pool = await getPool();
  const result = await pool.request().input("days", sql.Int, days).query(
    `SELECT u.Id AS UserId, u.Name, u.Email, t.Id AS TaskId, t.Title,
            t.DueDate, t.Status, w.Name AS WorkspaceName
     FROM dbo.Tasks t
     JOIN dbo.Workspaces w ON w.Id = t.WorkspaceId
     JOIN dbo.Users u ON u.Id = t.AssigneeId
     WHERE t.Entry IS NULL AND t.Status <> 'done'
       AND t.DueDate IS NOT NULL
       AND t.DueDate <= DATEADD(day, @days, CAST(GETDATE() AS DATE))
     UNION
     SELECT u.Id, u.Name, u.Email, t.Id, t.Title,
            t.DueDate, t.Status, w.Name
     FROM dbo.Tasks t
     JOIN dbo.Workspaces w ON w.Id = t.WorkspaceId
     JOIN dbo.TaskCollaborators tc ON tc.TaskId = t.Id
     JOIN dbo.Users u ON u.Id = tc.UserId
     WHERE t.Entry IS NULL AND t.Status <> 'done'
       AND t.DueDate IS NOT NULL
       AND t.DueDate <= DATEADD(day, @days, CAST(GETDATE() AS DATE))
     ORDER BY UserId, DueDate`
  );
  return result.recordset;
}
