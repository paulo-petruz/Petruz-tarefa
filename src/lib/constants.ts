export const TASK_STATUSES = [
  { value: "todo", label: "A Fazer" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "review", label: "Em Revisão" },
  { value: "done", label: "Concluída" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];

export const TASK_PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number]["value"];

export function statusLabel(status: string): string {
  return TASK_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function priorityLabel(priority: string): string {
  return TASK_PRIORITIES.find((p) => p.value === priority)?.label ?? priority;
}

/**
 * Tipos de solicitação de autorização. O fluxo de aprovação é genérico:
 * novos tipos (ex.: alteração de prazo) só precisam ser adicionados aqui e
 * tratados no executor da action.
 */
export const APPROVAL_TYPES = [
  { value: "task_delete", label: "Exclusão de tarefa" },
] as const;

export type ApprovalType = (typeof APPROVAL_TYPES)[number]["value"];

export const APPROVAL_STATUSES = [
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovada" },
  { value: "declined", label: "Recusada" },
] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]["value"];

export function approvalTypeLabel(type: string): string {
  return APPROVAL_TYPES.find((t) => t.value === type)?.label ?? type;
}

export const WORKSPACE_COLORS = [
  "#7C3AED",
  "#9333EA",
  "#6D28D9",
  "#A855F7",
  "#C026D3",
  "#581C87",
] as const;
