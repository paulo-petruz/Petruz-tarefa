// Utilitários compartilhados entre componentes de servidor e de cliente —
// este módulo não pode ter "use client" nem importar módulos cliente.
import { CheckCircle2, Circle, Eye, LoaderCircle } from "lucide-react";
import type { Task } from "@/lib/data";
import { toISODate } from "@/lib/dates";
import type { TaskFormValues } from "./task-dialog";

export const STATUS_CHIPS = [
  { value: "todo", label: "A Fazer", icon: Circle, className: "text-slate-600 dark:text-slate-300", chipBg: "bg-slate-500/10" },
  { value: "in_progress", label: "Em Andamento", icon: LoaderCircle, className: "text-blue-600 dark:text-blue-400", chipBg: "bg-blue-500/10" },
  { value: "review", label: "Em Revisão", icon: Eye, className: "text-purple-600 dark:text-purple-400", chipBg: "bg-purple-500/10" },
  { value: "done", label: "Concluídas", icon: CheckCircle2, className: "text-green-600 dark:text-green-400", chipBg: "bg-green-500/10" },
] as const;

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
    completedDate: toISODate(task.CompletedDate),
    progress: task.Progress,
    entry: task.Entry ?? null,
    metaType: task.MetaType,
    metaValue: task.MetaValue,
    collaboratorIds: task.Collaborators.map((c) => c.UserId),
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
