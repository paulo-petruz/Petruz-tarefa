import { ListChecks } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/**
 * % de conclusão da tarefa:
 * - tarefa com status "Concluída" => 100%;
 * - com subtarefas => proporção do checklist;
 * - sem subtarefas => progresso digitado manualmente.
 */
export function taskPercent(
  status: string,
  subtaskCount: number,
  subtaskDone: number,
  manualProgress: number
): number {
  if (status === "done") return 100;
  if (subtaskCount > 0) return Math.round((subtaskDone / subtaskCount) * 100);
  return manualProgress;
}

export function TaskProgress({
  status,
  subtaskCount,
  subtaskDone,
  manualProgress,
}: {
  status: string;
  subtaskCount: number;
  subtaskDone: number;
  manualProgress: number;
}) {
  const percent = taskPercent(status, subtaskCount, subtaskDone, manualProgress);
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <Progress value={percent} className="h-2 w-16" />
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {percent}%
        {subtaskCount > 0 && (
          <span className="ml-1 inline-flex items-center gap-0.5">
            <ListChecks className="h-3 w-3" />
            {subtaskDone}/{subtaskCount}
          </span>
        )}
      </span>
    </div>
  );
}
