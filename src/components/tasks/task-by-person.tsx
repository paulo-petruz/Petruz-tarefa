import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Eye,
  Folder,
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
  { value: "todo", label: "A Fazer", icon: Circle, className: "text-slate-500 dark:text-slate-400" },
  { value: "in_progress", label: "Em Andamento", icon: LoaderCircle, className: "text-blue-600 dark:text-blue-400" },
  { value: "review", label: "Em Revisão", icon: Eye, className: "text-purple-600 dark:text-purple-400" },
  { value: "done", label: "Concluídas", icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
] as const;

interface PersonGroup {
  key: string;
  name: string | null;
  userId: number | null;
  tasks: Task[];
}

/**
 * Pastas por membro: clicar na pasta abre a página da pessoa
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
    <div className="space-y-3">
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
        const href = `/workspaces/${workspaceId}/membro/${group.userId ?? 0}`;

        return (
          <div
            key={group.key}
            className="flex items-center gap-2 rounded-lg border bg-card pr-2 transition hover:border-primary/60 hover:shadow-sm"
          >
            <Link
              href={href}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-3 px-4 py-3"
            >
              <Folder className="h-5 w-5 shrink-0 text-primary" />
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className={
                    group.name
                      ? "bg-primary text-primary-foreground text-xs"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {group.name ? (
                    initials(group.name)
                  ) : (
                    <UserRound className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium leading-tight">
                  {group.name ?? "Sem responsável"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {total === 0
                    ? "Nenhuma tarefa atribuída"
                    : `${total} tarefa${total > 1 ? "s" : ""} — clique para abrir a pasta`}
                </p>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                {STATUS_CHIPS.map((chip) => {
                  const count = group.tasks.filter(
                    (t) => t.Status === chip.value
                  ).length;
                  const Icon = chip.icon;
                  return (
                    <span
                      key={chip.value}
                      className={cn(
                        "flex items-center gap-1 text-xs",
                        count > 0 ? chip.className : "text-muted-foreground/40"
                      )}
                      title={chip.label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {count}
                    </span>
                  );
                })}
              </div>

              <div className="flex w-36 items-center gap-2">
                <Progress value={percent} className="h-2" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {percent}%
                </span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>

            {group.userId !== null &&
              (isAdmin || group.userId === currentUserId) && (
              <TaskDialog
                workspaceId={workspaceId}
                members={members}
                defaultAssigneeId={group.userId}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    title={`Nova tarefa para ${group.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
