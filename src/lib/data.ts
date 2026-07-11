import "server-only";
import { getPool, sql } from "./db";

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
  MetaType: string | null;
  MetaValue: number | null;
  CreatedAt: Date;
  SubtaskCount: number;
  SubtaskDone: number;
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
      `SELECT u.Id AS UserId, u.Name, u.Email, wm.Role
       FROM dbo.WorkspaceMembers wm
       JOIN dbo.Users u ON u.Id = wm.UserId
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

// ---------- Tarefas ----------

const TASK_SELECT = `
  SELECT t.Id, t.WorkspaceId, t.Title, t.Description, t.Status, t.Priority,
    t.Entry,
         t.AssigneeId, a.Name AS AssigneeName, t.CreatedById,
         t.StartDate, t.DueDate, t.CompletedDate, t.Progress, t.MetaType, t.MetaValue, t.CreatedAt, w.Name AS WorkspaceName,
    (SELECT COUNT(*) FROM dbo.Tasks s WHERE s.Entry = t.Id) AS SubtaskCount,
    (SELECT COUNT(*) FROM dbo.Tasks s WHERE s.Entry = t.Id AND s.Status = 'done') AS SubtaskDone
  FROM dbo.Tasks t
  LEFT JOIN dbo.Users a ON a.Id = t.AssigneeId
  JOIN dbo.Workspaces w ON w.Id = t.WorkspaceId`;

export async function listTasksByWorkspace(
  workspaceId: number
): Promise<Task[]> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .query(
      `${TASK_SELECT}
       WHERE t.WorkspaceId = @workspaceId AND t.Entry IS NULL
       ORDER BY CASE WHEN t.DueDate IS NULL THEN 1 ELSE 0 END, t.DueDate, t.Id DESC`
    );
  return result.recordset;
}

export async function getTask(id: number): Promise<Task | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .query(`${TASK_SELECT} WHERE t.Id = @id`);
  return result.recordset[0] ?? null;
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
}
export async function createTask(
  input: TaskInput,
  createdById: number
): Promise<void> {
  const pool = await getPool();
  await pool
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
    .input("createdById", sql.Int, createdById)
    .query(
      `INSERT INTO dbo.Tasks (WorkspaceId, Title, Description, Status, Priority, Entry, AssigneeId, StartDate, DueDate, CompletedDate, Progress, MetaType, MetaValue, CreatedById)
       VALUES (@workspaceId, @title, @description, @status, @priority, @entry, @assigneeId, @startDate, @dueDate,
               CASE WHEN @status = 'done' THEN CAST(GETDATE() AS DATE) ELSE NULL END,
               @progress, @metaType, @metaValue, @createdById)`
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
    .query(
      `UPDATE dbo.Tasks
       SET Title = @title, Description = @description, Status = @status,
           Priority = @priority, AssigneeId = @assigneeId, Progress = @progress,
           MetaType = @metaType, MetaValue = @metaValue,
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

/** Lista as subtarefas (tarefas-filhas) do workspace, com todos os atributos. */
export async function listSubtasksByWorkspace(
  workspaceId: number
): Promise<Task[]> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .query(
      `${TASK_SELECT}
       WHERE t.WorkspaceId = @workspaceId AND t.Entry IS NOT NULL
       ORDER BY t.Id`
    );
  return result.recordset;
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
  return result.recordset;
}
