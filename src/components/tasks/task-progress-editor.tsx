"use client";

import { useEffect, useState, useTransition } from "react";
import { ListChecks } from "lucide-react";
import { toast } from "sonner";
import { updateTaskProgressAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { taskPercent } from "./task-progress";

/**
 * Barra de progresso com edição manual do %.
 * Quando a tarefa tem subtarefas, o % vem do checklist e a digitação fica
 * desabilitada; sem subtarefas, o membro digita o % diretamente.
 */
export function TaskProgressEditor({
  taskId,
  status,
  subtaskCount,
  subtaskDone,
  manualProgress,
}: {
  taskId: number;
  status: string;
  subtaskCount: number;
  subtaskDone: number;
  manualProgress: number;
}) {
  const percent = taskPercent(status, subtaskCount, subtaskDone, manualProgress);
  const [value, setValue] = useState(String(percent));
  const [pending, startTransition] = useTransition();

  // Mantém o campo em dia quando o % muda por outra via (subtarefas, status).
  useEffect(() => {
    setValue(String(percent));
  }, [percent]);

  const manual = subtaskCount === 0 && status !== "done";

  function commit() {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      setValue(String(percent));
      toast.error("Informe um número entre 0 e 100.");
      return;
    }
    if (parsed === manualProgress) return;
    startTransition(async () => {
      const result = await updateTaskProgressAction(taskId, parsed);
      if (result.error) {
        setValue(String(percent));
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex min-w-[130px] items-center gap-2">
      <Progress value={percent} className="h-2 w-16" />
      {manual ? (
        <span className="flex items-center text-xs text-muted-foreground">
          <Input
            type="number"
            min={0}
            max={100}
            value={value}
            disabled={pending}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            className="h-7 w-14 px-1.5 text-center text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            title="Digite o % concluído"
          />
          <span className="ml-0.5">%</span>
        </span>
      ) : (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {percent}%
          {subtaskCount > 0 && (
            <span className="ml-1 inline-flex items-center gap-0.5">
              <ListChecks className="h-3 w-3" />
              {subtaskDone}/{subtaskCount}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
