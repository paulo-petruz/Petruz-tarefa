import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Eye,
  LoaderCircle,
  Plus,
  UserRound,
} from "lucide-react";
import type { Subtask, Task, WorkspaceMember } from "@/lib/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TaskDialog } from "./task-dialog";
import { taskPercent } from "./task-progress";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export const STATUS_CHIPS = [
  { value: "todo", label: "A Fazer", icon: Circle, className: "text-slate-600 dark:text-slate-300", chipBg: "bg-slate-500/10" },
  { value: "in_progress", label: "Em Andamento", icon: LoaderCircle, className: "text-blue-600 dark:text-blue-400", chipBg: "bg-blue-500/10" },
  { value: "review", label: "Em Revisão", icon: Eye, className: "text-purple-600 dark:text-purple-400", chipBg: "bg-purple-500/10" },
  { value: "done", label: "Concluídas", icon: CheckCircle2, className: "text-green-600 dark:text-green-400", chipBg: "bg-green-500/10" },
] as const;

interface PersonGroup {
  key: string;
  name: string | null;
  userId: number | null;
  tasks: Task[];
}

/**
 * Pastas por membro em grade: clicar no card abre a página da pessoa
 * com apenas as tarefas dela.
 */
export function TaskByPerson({
  tasks,
  members,
  workspaceId,
  currentUserId,
  isAdmin,
}: {
  tasks: Task[];
  members: WorkspaceMember[];
  workspaceId: number;
  currentUserId: number;
  isAdmin: boolean;
  subtasksByTask?: Record<number, Subtask[]>;
}) {
  const groups: PersonGroup[] = members.map((member) => ({
    key: String(member.UserId),
    name: member.Name,
    userId: member.UserId,
    tasks: tasks.filter((t) => t.AssigneeId === member.UserId),
  }));
  const unassigned = tasks.filter((t) => t.AssigneeId === null);
  if (unassigned.length > 0) {
    groups.push({
      key: "unassigned",
      name: null,
      userId: null,
      tasks: unassigned,
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => {
        const total = group.tasks.length;
        // Média do % das tarefas: reflete progresso parcial, não só concluídas.
        const percent =
          total > 0
            ? Math.round(
                group.tasks.reduce(
                  (sum, t) =>
                    sum +
                    taskPercent(t.Status, t.SubtaskCount, t.SubtaskDone, t.Progress),
                  0
                ) / total
              )
            : 0;
        const isOwn = group.userId === currentUserId;
        const canQuickCreate =
          group.userId !== null && (isAdmin || isOwn);

        return (
          <div
            key={group.key}
            className="group relative rounded-xl border bg-card transition hover:border-primary/50 hover:shadow-md"
          >
            <Link
              href={`/workspaces/${workspaceId}/membro/${group.userId ?? 0}`}
              className="block space-y-4 p-5"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-primary/15">
                  <AvatarFallback
                    className={
                      group.name
                        ? "bg-primary text-primary-foreground text-sm font-semibold"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {group.name ? (
                      initials(group.name)
                    ) : (
                      <UserRound className="h-5 w-5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold leading-tight">
                    {group.name ?? "Sem responsável"}
                    {isOwn && (
                      <span className="ml-1.5 text-xs font-normal text-primary">
                        (você)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {total === 0
                      ? "Nenhuma tarefa"
                      : `${total} tarefa${total > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {STATUS_CHIPS.map((chip) => {
                  const count = group.tasks.filter(
                    (t) => t.Status === chip.value
                  ).length;
                  if (count === 0) return null;
                  const Icon = chip.icon;
                  return (
                    <span
                      key={chip.value}
                      title={chip.label}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        chip.chipBg,
                        chip.className
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {count}
                    </span>
                  );
                })}
                {total === 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Pasta vazia
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Progress value={percent} className="h-1.5" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {percent}%
                </span>
              </div>
            </Link>

            {canQuickCreate && (
              <div className="absolute right-3 top-3">
                <TaskDialog
                  workspaceId={workspaceId}
                  members={members}
                  defaultAssigneeId={group.userId ?? undefined}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground transition-opacity md:opacity-0 md:group-hover:opacity-100"
                      title={`Nova tarefa para ${group.name}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
