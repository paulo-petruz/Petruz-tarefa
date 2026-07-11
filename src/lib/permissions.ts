/**
 * Política de edição de tarefas (compartilhada entre servidor e UI):
 * - admins do workspace podem editar/excluir qualquer tarefa;
 * - o responsável (assignee) edita as tarefas dele;
 * - colaboradores vinculados também podem editar/atualizar a tarefa;
 * - tarefas sem responsável podem ser editadas por quem as criou.
 */
export function canEditTask(
  task: {
    AssigneeId: number | null;
    CreatedById: number;
    Collaborators?: { UserId: number }[];
  },
  userId: number,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (task.AssigneeId === userId) return true;
  if (task.Collaborators?.some((c) => c.UserId === userId)) return true;
  return task.AssigneeId === null && task.CreatedById === userId;
}

/**
 * Exclusão é mais restrita que edição: colaboradores podem atualizar, mas não
 * excluir a tarefa compartilhada — só admin, responsável ou (sem responsável)
 * o criador.
 */
export function canDeleteTask(
  task: { AssigneeId: number | null; CreatedById: number },
  userId: number,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (task.AssigneeId === userId) return true;
  return task.AssigneeId === null && task.CreatedById === userId;
}
