import { CheckCircle2, Circle, Eye, LoaderCircle } from "lucide-react";
import { TASK_STATUSES } from "@/lib/constants";
import type { Task } from "@/lib/data";
import { cn } from "@/lib/utils";

const STATUS_VISUALS: Record<
  string,
  { icon: typeof Circle; text: string; iconBg: string }
> = {
  todo: {
    icon: Circle,
    text: "text-slate-600 dark:text-slate-300",
    iconBg: "bg-slate-500/10 text-slate-500",
  },
  in_progress: {
    icon: LoaderCircle,
    text: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10 text-blue-500",
  },
  review: {
    icon: Eye,
    text: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-500/10 text-purple-500",
  },
  done: {
    icon: CheckCircle2,
    text: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-500/10 text-green-500",
  },
};

/** Cartões de acompanhamento por status do espaço. */
export function StatusSummary({ tasks }: { tasks: Task[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TASK_STATUSES.map((status) => {
        const visual = STATUS_VISUALS[status.value];
        const count = tasks.filter((t) => t.Status === status.value).length;
        const Icon = visual.icon;
        return (
          <div
            key={status.value}
            className="flex items-center gap-3 rounded-xl border bg-card p-4"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                visual.iconBg
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none">{count}</p>
              <p
                className={cn(
                  "mt-1 truncate text-xs font-medium",
                  visual.text
                )}
              >
                {status.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
