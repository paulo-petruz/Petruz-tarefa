"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "./auth";
import {
  assertCanEditTask,
  assertSuperAdmin,
  assertWorkspaceAdmin,
  getWorkspaceRole,
  requireUser,
} from "./authz";
import * as data from "./data";
import { TASK_PRIORITIES, TASK_STATUSES } from "./constants";

export interface ActionState {
  error?: string;
  success?: boolean;
}

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

// ---------- Autenticação ----------

const registerSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
});

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const existing = await data.findUserByEmail(parsed.data.email);
    if (existing) return { error: "Este e-mail já está cadastrado." };

    const hash = await hashPassword(parsed.data.password);
    const user = await data.createUser(parsed.data.name, parsed.data.email, hash);
    await createSession({
      id: user.Id,
      name: user.Name,
      email: user.Email,
      role: user.Role,
    });
  } catch (err) {
    console.error("registerAction:", err);
    return { error: "Erro ao conectar ao banco de dados. Tente novamente." };
  }
  redirect("/dashboard");
}

const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const user = await data.findUserByEmail(parsed.data.email);
    if (!user || !(await verifyPassword(parsed.data.password, user.PasswordHash))) {
      return { error: "E-mail ou senha incorretos." };
    }
    await createSession({
      id: user.Id,
      name: user.Name,
      email: user.Email,
      role: user.Role,
    });
  } catch (err) {
    console.error("loginAction:", err);
    return { error: "Erro ao conectar ao banco de dados. Tente novamente." };
  }
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  destroySession();
  redirect("/login");
}

// ---------- Conta (troca da própria senha) ----------

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe sua senha atual."),
  newPassword: z
    .string()
    .min(8, "A nova senha deve ter no mínimo 8 caracteres."),
});

export async function changeOwnPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const record = await data.getUserById(user.id);
    if (
      !record ||
      !(await verifyPassword(parsed.data.currentPassword, record.PasswordHash))
    ) {
      return { error: "Senha atual incorreta." };
    }
    const hash = await hashPassword(parsed.data.newPassword);
    await data.updateUserPassword(user.id, hash);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao trocar a senha.",
    };
  }
  return { success: true };
}

// ---------- Administração (super admin) ----------

const resetPasswordSchema = z.object({
  userId: z.coerce.number().int().positive(),
  password: z.string().min(8, "A nova senha deve ter no mínimo 8 caracteres."),
});

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = resetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    await assertSuperAdmin(user);
    const hash = await hashPassword(parsed.data.password);
    await data.updateUserPassword(parsed.data.userId, hash);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao resetar a senha.",
    };
  }
  revalidatePath("/admin");
  return { success: true };
}

// ---------- Workspaces ----------

const workspaceSchema = z.object({
  name: z.string().min(2, "O nome do espaço deve ter pelo menos 2 caracteres."),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
});

export async function createWorkspaceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    color: formData.get("color"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  let workspaceId: number;
  try {
    workspaceId = await data.createWorkspace(
      parsed.data.name,
      parsed.data.description ?? null,
      parsed.data.color,
      user.id
    );
  } catch (err) {
    console.error("createWorkspaceAction:", err);
    return { error: "Erro ao criar o espaço de trabalho." };
  }
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}`);
}

export async function deleteWorkspaceAction(
  workspaceId: number
): Promise<ActionState> {
  const user = await requireUser();
  try {
    await assertWorkspaceAdmin(workspaceId, user);
    await data.deleteWorkspace(workspaceId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao excluir." };
  }
  revalidatePath("/workspaces");
  redirect("/workspaces");
}

const addMemberSchema = z.object({
  workspaceId: z.coerce.number().int().positive(),
  email: z.string().email("E-mail inválido."),
  role: z.enum(["admin", "member"]),
});

export async function addMemberAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = addMemberSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    await assertWorkspaceAdmin(parsed.data.workspaceId, user);
    const member = await data.findUserByEmail(parsed.data.email);
    if (!member) {
      return { error: "Nenhum usuário cadastrado com este e-mail." };
    }
    await data.addWorkspaceMember(
      parsed.data.workspaceId,
      member.Id,
      parsed.data.role
    );
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao adicionar membro.",
    };
  }
  revalidatePath(`/workspaces/${parsed.data.workspaceId}`);
  return { success: true };
}

export async function removeMemberAction(
  workspaceId: number,
  userId: number
): Promise<ActionState> {
  const user = await requireUser();
  try {
    await assertWorkspaceAdmin(workspaceId, user);
    const workspace = await data.getWorkspace(workspaceId);
    if (workspace?.OwnerId === userId) {
      return { error: "O dono do espaço não pode ser removido." };
    }
    await data.removeWorkspaceMember(workspaceId, userId);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao remover membro.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  return { success: true };
}

// ---------- Tarefas ----------

const statusValues = TASK_STATUSES.map((s) => s.value) as [string, ...string[]];
const priorityValues = TASK_PRIORITIES.map((p) => p.value) as [
  string,
  ...string[],
];

const taskSchema = z
  .object({
    workspaceId: z.coerce.number().int().positive(),
    title: z.string().min(2, "O título deve ter pelo menos 2 caracteres."),
    description: z.string().max(2000).optional(),
    status: z.enum(statusValues),
    priority: z.enum(priorityValues),
    assigneeId: z.coerce.number().int().positive().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    progress: z.coerce
      .number()
      .int()
      .min(0, "O progresso deve ser entre 0 e 100.")
      .max(100, "O progresso deve ser entre 0 e 100.")
      .optional(),
  })
  .refine(
    (t) => !t.startDate || !t.dueDate || t.startDate <= t.dueDate,
    { message: "A data de início não pode ser depois do vencimento." }
  );

function parseTaskForm(formData: FormData) {
  return taskSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority"),
    assigneeId: formData.get("assigneeId") || undefined,
    startDate: formData.get("startDate") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    progress: formData.get("progress") || undefined,
  });
}

export async function createTaskAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseTaskForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const role = await getWorkspaceRole(parsed.data.workspaceId, user.id);
    if (!role) {
      return { error: "Você não tem acesso a este espaço de trabalho." };
    }
    // Membros comuns só criam tarefas para si mesmos (ou sem responsável).
    if (
      role !== "admin" &&
      parsed.data.assigneeId !== undefined &&
      parsed.data.assigneeId !== user.id
    ) {
      return {
        error: "Apenas admins podem criar tarefas para outra pessoa.",
      };
    }
    await data.createTask(
      {
        workspaceId: parsed.data.workspaceId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assigneeId: parsed.data.assigneeId ?? null,
        startDate: parsed.data.startDate ?? null,
        dueDate: parsed.data.dueDate ?? null,
        progress: parsed.data.progress ?? 0,
      },
      user.id
    );
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao criar a tarefa.",
    };
  }
  revalidatePath(`/workspaces/${parsed.data.workspaceId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateTaskAction(
  taskId: number,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseTaskForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const task = await data.getTask(taskId);
    if (!task) return { error: "Tarefa não encontrada." };
    await assertCanEditTask(task, user);
    // Membros comuns não podem transferir a tarefa para outra pessoa.
    const role = await getWorkspaceRole(task.WorkspaceId, user.id);
    if (
      role !== "admin" &&
      parsed.data.assigneeId !== undefined &&
      parsed.data.assigneeId !== user.id &&
      parsed.data.assigneeId !== task.AssigneeId
    ) {
      return {
        error: "Apenas admins podem atribuir tarefas a outra pessoa.",
      };
    }
    await data.updateTask(taskId, {
      workspaceId: task.WorkspaceId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assigneeId: parsed.data.assigneeId ?? null,
      startDate: parsed.data.startDate ?? null,
      dueDate: parsed.data.dueDate ?? null,
      progress: parsed.data.progress ?? task.Progress,
    });
    revalidatePath(`/workspaces/${task.WorkspaceId}`);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao salvar a tarefa.",
    };
  }
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateTaskStatusAction(
  taskId: number,
  status: string
): Promise<ActionState> {
  const user = await requireUser();
  if (!statusValues.includes(status)) return { error: "Status inválido." };
  try {
    const task = await data.getTask(taskId);
    if (!task) return { error: "Tarefa não encontrada." };
    await assertCanEditTask(task, user);
    await data.updateTaskStatus(taskId, status);
    revalidatePath(`/workspaces/${task.WorkspaceId}`);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao atualizar status.",
    };
  }
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateTaskProgressAction(
  taskId: number,
  progress: number
): Promise<ActionState> {
  const user = await requireUser();
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    return { error: "O progresso deve ser um número entre 0 e 100." };
  }
  try {
    const task = await data.getTask(taskId);
    if (!task) return { error: "Tarefa não encontrada." };
    await assertCanEditTask(task, user);
    await data.updateTaskProgress(taskId, progress);
    revalidatePath(`/workspaces/${task.WorkspaceId}`);
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Erro ao atualizar o progresso.",
    };
  }
  revalidatePath("/dashboard");
  return { success: true };
}

// ---------- Subtarefas ----------

const subtaskTitleSchema = z
  .string()
  .min(1, "Informe o título da subtarefa.")
  .max(200, "Título muito longo.");

export async function createSubtaskAction(
  taskId: number,
  title: string
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = subtaskTitleSchema.safeParse(title?.trim());
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const task = await data.getTask(taskId);
    if (!task) return { error: "Tarefa não encontrada." };
    await assertCanEditTask(task, user);
    await data.createSubtask(taskId, parsed.data);
    revalidatePath(`/workspaces/${task.WorkspaceId}`);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao criar a subtarefa.",
    };
  }
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleSubtaskAction(
  subtaskId: number,
  isDone: boolean
): Promise<ActionState> {
  const user = await requireUser();
  try {
    const subtask = await data.getSubtaskWithWorkspace(subtaskId);
    if (!subtask) return { error: "Subtarefa não encontrada." };
    await assertCanEditTask(subtask, user);
    await data.setSubtaskDone(subtaskId, isDone);
    revalidatePath(`/workspaces/${subtask.WorkspaceId}`);
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Erro ao atualizar a subtarefa.",
    };
  }
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteSubtaskAction(
  subtaskId: number
): Promise<ActionState> {
  const user = await requireUser();
  try {
    const subtask = await data.getSubtaskWithWorkspace(subtaskId);
    if (!subtask) return { error: "Subtarefa não encontrada." };
    await assertCanEditTask(subtask, user);
    await data.deleteSubtask(subtaskId);
    revalidatePath(`/workspaces/${subtask.WorkspaceId}`);
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Erro ao excluir a subtarefa.",
    };
  }
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTaskAction(taskId: number): Promise<ActionState> {
  const user = await requireUser();
  try {
    const task = await data.getTask(taskId);
    if (!task) return { error: "Tarefa não encontrada." };
    await assertCanEditTask(task, user);
    await data.deleteTask(taskId);
    revalidatePath(`/workspaces/${task.WorkspaceId}`);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao excluir a tarefa.",
    };
  }
  revalidatePath("/dashboard");
  return { success: true };
}
