import { Pencil } from "lucide-react";
import type { Subtask, Task, WorkspaceMember } from "@/lib/data";
import { formatDate, toISODate } from "@/lib/dates";
import { canEditTask } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DueBadge } from "./due-badge";
import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { TaskDeleteButton } from "./task-delete-button";
import { TaskDialog, type TaskFormValues } from "./task-dialog";
import { TaskProgress } from "./task-progress";
import { TaskProgressEditor } from "./task-progress-editor";
import { TaskStatusSelect } from "./task-status-select";

export function toFormValues(task: Task): TaskFormValues {
  return {
    id: task.Id,
    title: task.Title,
    description: task.Description,
    status: task.Status,
    priority: task.Priority,
    assigneeId: task.AssigneeId,
    startDate: toISODate(task.StartDate),
    dueDate: toISODate(task.DueDate),
    progress: task.Progress,
  };
}

export function TaskTable({
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
  subtasksByTask: Record<number, Subtask[]>;
  currentUserId: number;
  isAdmin: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        Nenhuma tarefa aqui ainda.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarefa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progresso</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead className="w-[90px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const editable = canEditTask(task, currentUserId, isAdmin);
            return (
              <TableRow key={task.Id}>
                <TableCell className="max-w-[280px]">
                  <p className="truncate font-medium">{task.Title}</p>
                  {task.Description && (
                    <p className="truncate text-xs text-muted-foreground">
                      {task.Description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {editable ? (
                    <TaskStatusSelect taskId={task.Id} status={task.Status} />
                  ) : (
                    <StatusBadge status={task.Status} />
                  )}
                </TableCell>
                <TableCell>
                  {editable ? (
                    <TaskProgressEditor
                      taskId={task.Id}
                      status={task.Status}
                      subtaskCount={task.SubtaskCount}
                      subtaskDone={task.SubtaskDone}
                      manualProgress={task.Progress}
                    />
                  ) : (
                    <TaskProgress
                      status={task.Status}
                      subtaskCount={task.SubtaskCount}
                      subtaskDone={task.SubtaskDone}
                      manualProgress={task.Progress}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={task.Priority} />
                </TableCell>
                <TableCell className="text-sm">
                  {task.AssigneeName ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(task.StartDate)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">{formatDate(task.DueDate)}</span>
                    <DueBadge dueDate={task.DueDate} status={task.Status} />
                  </div>
                </TableCell>
                <TableCell>
                  {editable && (
                    <div className="flex items-center justify-end">
                      <TaskDialog
                        workspaceId={workspaceId}
                        members={members}
                        task={toFormValues(task)}
                        subtasks={subtasksByTask[task.Id] ?? []}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            title="Editar tarefa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <TaskDeleteButton taskId={task.Id} />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
