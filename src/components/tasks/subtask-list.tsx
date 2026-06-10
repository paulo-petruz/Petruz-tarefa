"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createSubtaskAction,
  deleteSubtaskAction,
  toggleSubtaskAction,
} from "@/lib/actions";
import type { Subtask } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function SubtaskList({
  taskId,
  subtasks,
}: {
  taskId: number;
  subtasks: Subtask[];
}) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const total = subtasks.length;
  const done = subtasks.filter((s) => s.IsDone).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  function handleAdd() {
    const value = title.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await createSubtaskAction(taskId, value);
      if (result.error) toast.error(result.error);
      else setTitle("");
    });
  }

  function handleToggle(subtaskId: number, isDone: boolean) {
    startTransition(async () => {
      const result = await toggleSubtaskAction(subtaskId, isDone);
      if (result.error) toast.error(result.error);
    });
  }

  function handleDelete(subtaskId: number) {
    startTransition(async () => {
      const result = await deleteSubtaskAction(subtaskId);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Subtarefas</Label>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {done}/{total} · {percent}% concluído
          </span>
        )}
      </div>
      {total > 0 && <Progress value={percent} />}

      <ul className="max-h-44 space-y-1.5 overflow-y-auto">
        {subtasks.map((subtask) => (
          <li
            key={subtask.Id}
            className="group flex items-center gap-2 rounded-md border px-2 py-1.5"
          >
            <Checkbox
              checked={subtask.IsDone}
              disabled={pending}
              onCheckedChange={(checked) =>
                handleToggle(subtask.Id, checked === true)
              }
            />
            <span
              className={cn(
                "flex-1 truncate text-sm",
                subtask.IsDone && "text-muted-foreground line-through"
              )}
            >
              {subtask.Title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              disabled={pending}
              onClick={() => handleDelete(subtask.Id)}
              title="Excluir subtarefa"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nova subtarefa..."
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending || !title.trim()}
          onClick={handleAdd}
        >
          <Plus className="mr-1 h-4 w-4" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}
