import "server-only";
import { redirect } from "next/navigation";
import { getPool, sql } from "./db";
import { getSession, type SessionUser } from "./auth";
import { canEditTask } from "./permissions";

/**
 * Políticas de autorização:
 * - Toda rota do app exige sessão válida (middleware + requireUser).
 * - Workspaces só são visíveis para seus membros.
 * - Gestão do workspace (membros, exclusão, edição) exige papel 'admin'
 *   no workspace — o criador entra como admin automaticamente.
 * - Tarefas podem ser criadas/editadas por qualquer membro do workspace.
 */

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export const SUPER_ADMIN_ROLE = "superadmin";

/** Papel global lido do banco — promoções via SQL valem na hora. */
export async function isSuperAdmin(userId: number): Promise<boolean> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.Int, userId)
    .query("SELECT Role FROM dbo.Users WHERE Id = @id");
  return result.recordset[0]?.Role === SUPER_ADMIN_ROLE;
}

/** Para páginas: redireciona quem não é super admin. */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!(await isSuperAdmin(user.id))) redirect("/dashboard");
  return user;
}

/** Para actions: lança erro se não for super admin. */
export async function assertSuperAdmin(user: SessionUser): Promise<void> {
  if (!(await isSuperAdmin(user.id))) {
    throw new Error("Apenas super admins podem executar esta ação.");
  }
}

export type WorkspaceRole = "admin" | "member";

export async function getWorkspaceRole(
  workspaceId: number,
  userId: number
): Promise<WorkspaceRole | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("workspaceId", sql.Int, workspaceId)
    .input("userId", sql.Int, userId)
    .query(
      "SELECT Role FROM dbo.WorkspaceMembers WHERE WorkspaceId = @workspaceId AND UserId = @userId"
    );
  const role = result.recordset[0]?.Role;
  return role === "admin" || role === "member" ? role : null;
}

/** Garante que o usuário é membro do workspace; senão, redireciona. */
export async function requireWorkspaceMember(
  workspaceId: number,
  user: SessionUser
): Promise<WorkspaceRole> {
  const role = await getWorkspaceRole(workspaceId, user.id);
  if (!role) redirect("/workspaces");
  return role;
}

/** Garante papel de admin no workspace (ou lança erro para actions). */
export async function assertWorkspaceAdmin(
  workspaceId: number,
  user: SessionUser
): Promise<void> {
  const role = await getWorkspaceRole(workspaceId, user.id);
  if (role !== "admin") {
    throw new Error("Você não tem permissão para gerenciar este espaço.");
  }
}

/** Garante que é membro (ou lança erro para actions). */
export async function assertWorkspaceMember(
  workspaceId: number,
  user: SessionUser
): Promise<void> {
  const role = await getWorkspaceRole(workspaceId, user.id);
  if (!role) {
    throw new Error("Você não tem acesso a este espaço de trabalho.");
  }
}

/**
 * Garante que o usuário pode editar/excluir a tarefa: precisa ser membro do
 * workspace e (admin do espaço, responsável pela tarefa, ou criador quando
 * a tarefa não tem responsável).
 */
export async function assertCanEditTask(
  task: { WorkspaceId: number; AssigneeId: number | null; CreatedById: number },
  user: SessionUser
): Promise<void> {
  const role = await getWorkspaceRole(task.WorkspaceId, user.id);
  if (!role) {
    throw new Error("Você não tem acesso a este espaço de trabalho.");
  }
  if (!canEditTask(task, user.id, role === "admin")) {
    throw new Error("Apenas o responsável pela tarefa pode alterá-la.");
  }
}
