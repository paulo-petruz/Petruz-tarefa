// Utilitários compartilhados entre componentes de servidor e de cliente —
// este módulo não pode ter "use client" nem importar módulos cliente.
import type { Task } from "@/lib/data";
import { toISODate } from "@/lib/dates";
import type { TaskFormValues } from "./task-dialog";

export function toFormValues(task: Task): TaskFormValues {
  return {
    id: task.Id,
    title: task.Title,
    description: task.Description,
    status: task.Status,
    priority: task.Priority,
    assigneeId: task.AssigneeId,
    startDate: toISODate(task.StartDate),
    dueDate: toISODate(task.DueDate),
    progress: task.Progress,
  };
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
