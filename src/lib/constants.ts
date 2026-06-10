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

export const WORKSPACE_COLORS = [
  "#7C3AED",
  "#9333EA",
  "#6D28D9",
  "#A855F7",
  "#C026D3",
  "#581C87",
] as const;
