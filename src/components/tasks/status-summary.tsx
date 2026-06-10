import {
  CheckCircle2,
  Circle,
  Eye,
  LoaderCircle,
} from "lucide-react";
import { TASK_STATUSES } from "@/lib/constants";
import type { Task } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STATUS_VISUALS: Record<
  string,
  { icon: typeof Circle; text: string; bar: string }
> = {
  todo: {
    icon: Circle,
    text: "text-slate-500 dark:text-slate-400",
    bar: "bg-slate-400",
  },
  in_progress: {
    icon: LoaderCircle,
    text: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
  },
  review: {
    icon: Eye,
    text: "text-purple-600 dark:text-purple-400",
    bar: "bg-purple-500",
  },
  done: {
    icon: CheckCircle2,
    text: "text-green-600 dark:text-green-400",
    bar: "bg-green-500",
  },
};

/** Cartões de acompanhamento por status + barra geral do espaço. */
export function StatusSummary({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.Status === "done").length;
  const overallPercent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const visual = STATUS_VISUALS[status.value];
          const count = tasks.filter((t) => t.Status === status.value).length;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          const Icon = visual.icon;
          return (
            <Card key={status.value}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium",
                      visual.text
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {status.label}
                  </span>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", visual.bar)}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {percent}% das tarefas
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {total > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <span className="whitespace-nowrap text-sm font-medium">
            Andamento geral
          </span>
          <Progress value={overallPercent} className="h-2.5" />
          <span className="whitespace-nowrap text-sm font-semibold text-primary">
            {overallPercent}%
          </span>
        </div>
      )}
    </div>
  );
}
