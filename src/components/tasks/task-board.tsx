import { CalendarClock, CalendarPlus, Pencil } from "lucide-react";
import { TASK_STATUSES } from "@/lib/constants";
import type { Task, WorkspaceMember } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { canEditTask } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DueBadge } from "./due-badge";
import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { TaskDeleteButton } from "./task-delete-button";
import { TaskDialog } from "./task-dialog";
import { taskPercent } from "./task-progress";
import { TaskStatusSelect } from "./task-status-select";
import { toFormValues } from "./task-utils";

export function TaskBoard({
  tasks,
  members,
  workspaceId,
  subtasksByTask,
  currentUserId,
  isAdmin,
}: {
  tasks: Task[];
  members: WorkspaceMember[];
  workspaceId: number;
  subtasksByTask: Record<number, Task[]>;
  currentUserId: number;
  isAdmin: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((t) => t.Status === status.value);
        return (
          <div key={status.value} className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
              <span className="text-sm font-semibold">{status.label}</span>
              <span className="text-xs text-muted-foreground">
                {columnTasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {columnTasks.map((task) => {
                const editable = canEditTask(task, currentUserId, isAdmin);
                const percent = taskPercent(
                  task.Status,
                  task.SubtaskCount,
                  task.SubtaskDone,
                  task.Progress
                );
                return (
                  <Card key={task.Id}>
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-1">
                        <p className="flex-1 text-sm font-medium">
                          {task.Title}
                        </p>
                        {editable && (
                          <div className="flex shrink-0 items-center">
                            <TaskDialog
                              workspaceId={workspaceId}
                              members={members}
                              task={toFormValues(task)}
                              hasSubtasks={(subtasksByTask[task.Id] ?? []).length > 0}
                              currentUserId={currentUserId}
                              isAdmin={isAdmin}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground"
                                  title="Editar tarefa"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              }
                            />
                            <TaskDeleteButton
                              taskId={task.Id}
                              taskTitle={task.Title}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PriorityBadge priority={task.Priority} />
                        <DueBadge dueDate={task.DueDate} status={task.Status} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={percent} className="h-1.5" />
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {percent}%
                          {task.SubtaskCount > 0 &&
                            ` (${task.SubtaskDone}/${task.SubtaskCount})`}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>{task.AssigneeName ?? "Sem responsável"}</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {task.StartDate && (
                            <span
                              className="flex items-center gap-1"
                              title="Início"
                            >
                              <CalendarPlus className="h-3 w-3" />
                              {formatDate(task.StartDate)}
                            </span>
                          )}
                          {task.DueDate && (
                            <span
                              className="flex items-center gap-1"
                              title="Vencimento"
                            >
                              <CalendarClock className="h-3 w-3" />
                              {formatDate(task.DueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      {editable ? (
                        <TaskStatusSelect
                          taskId={task.Id}
                          status={task.Status}
                        />
                      ) : (
                        <StatusBadge status={task.Status} />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {columnTasks.length === 0 && (
                <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Sem tarefas
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
