"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateTaskStatusAction } from "@/lib/actions";
import { TASK_STATUSES } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  todo: "border-slate-400/50 text-slate-600 dark:text-slate-300",
  in_progress: "border-blue-500/50 text-blue-600 dark:text-blue-400",
  review: "border-purple-500/50 text-purple-600 dark:text-purple-400",
  done: "border-green-500/50 text-green-600 dark:text-green-400",
};

const STATUS_DOTS: Record<string, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  review: "bg-purple-500",
  done: "bg-green-500",
};

export function TaskStatusSelect({
  taskId,
  status,
}: {
  taskId: number;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await updateTaskStatusAction(taskId, value);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger
        className={cn("h-8 w-[160px] text-xs font-medium", STATUS_STYLES[status])}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TASK_STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            <span className="flex items-center gap-2">
              <span
                className={cn("h-2 w-2 rounded-full", STATUS_DOTS[s.value])}
              />
              {s.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
