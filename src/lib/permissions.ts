/**
 * Política de edição de tarefas (compartilhada entre servidor e UI):
 * - admins do workspace podem editar/excluir qualquer tarefa;
 * - o responsável (assignee) edita as tarefas dele;
 * - tarefas sem responsável podem ser editadas por quem as criou.
 */
export function canEditTask(
  task: { AssigneeId: number | null; CreatedById: number },
  userId: number,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (task.AssigneeId === userId) return true;
  return task.AssigneeId === null && task.CreatedById === userId;
}
