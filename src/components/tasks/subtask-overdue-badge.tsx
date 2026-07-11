import { AlertTriangle } from "lucide-react";
import type { Task } from "@/lib/data";
import { getDueInfo } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Nº de subtarefas vencidas (não concluídas com previsão de término no passado). */
export function countOverdueSubtasks(subtasks: Task[]): number {
  return subtasks.filter(
    (s) => getDueInfo(s.DueDate, s.Status)?.state === "overdue"
  ).length;
}

/**
 * Sinaliza na tarefa-mãe que ela possui subtarefas vencidas.
 * `compact` mostra só o ícone + contagem (texto completo fica no tooltip).
 */
export function SubtaskOverdueBadge({
  subtasks,
  compact = false,
  className,
}: {
  subtasks: Task[];
  compact?: boolean;
  className?: string;
}) {
  const count = countOverdueSubtasks(subtasks);
  if (count === 0) return null;

  const label =
    count === 1 ? "1 subtarefa vencida" : `${count} subtarefas vencidas`;

  return (
    <Badge
      title={label}
      className={cn(
        "gap-0.5 border-transparent bg-destructive px-1.5 py-0 text-[10px] font-medium leading-4 text-destructive-foreground hover:bg-destructive",
        className
      )}
    >
      <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
      {compact ? count : label}
    </Badge>
  );
}
