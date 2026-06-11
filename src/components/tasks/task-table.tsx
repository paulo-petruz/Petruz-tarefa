"use client";

import { Fragment, useState } from "react";
import { CheckCircle2, ChevronRight, Circle, Pencil } from "lucide-react";
import type { Subtask, Task, WorkspaceMember } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { canEditTask } from "@/lib/permissions";
import { initials, toFormValues } from "./task-utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DueBadge } from "./due-badge";
import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { SubtaskList } from "./subtask-list";
import { TaskDeleteButton } from "./task-delete-button";
import { TaskDialog } from "./task-dialog";
import { TaskProgress } from "./task-progress";
import { TaskProgressEditor } from "./task-progress-editor";
import { TaskStatusSelect } from "./task-status-select";

const COLUMN_COUNT = 6;

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
  const [expanded, setExpanded] = useState<number[]>([]);

  function toggleExpanded(taskId: number) {
    setExpanded((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        Nenhuma tarefa aqui ainda.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tarefa
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Progresso
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Responsável
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Vencimento
            </TableHead>
            <TableHead className="w-[90px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const editable = canEditTask(task, currentUserId, isAdmin);
            const subtasks = subtasksByTask[task.Id] ?? [];
            const hasSubtasks = subtasks.length > 0;
            const isOpen = expanded.includes(task.Id);
            return (
              <Fragment key={task.Id}>
                <TableRow
                  className={cn(
                    "group border-b transition-colors hover:bg-muted/30",
                    isOpen ? "border-0 bg-muted/20" : "last:border-0"
                  )}
                >
                  <TableCell className="max-w-[300px] py-3">
                    <div className="flex items-center gap-1.5">
                      {hasSubtasks ? (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(task.Id)}
                          title={
                            isOpen
                              ? "Recolher subtarefas"
                              : "Expandir subtarefas"
                          }
                          className="flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isOpen && "rotate-90"
                            )}
                          />
                          {subtasks.filter((s) => s.IsDone).length}/
                          {subtasks.length}
                        </button>
                      ) : (
                        <span className="w-5 shrink-0" />
                      )}
                      <p className="truncate font-medium">{task.Title}</p>
                      <PriorityBadge priority={task.Priority} />
                    </div>
                    {task.Description && (
                      <p className="ml-6 mt-0.5 truncate text-xs text-muted-foreground">
                        {task.Description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    {editable ? (
                      <TaskStatusSelect taskId={task.Id} status={task.Status} />
                    ) : (
                      <StatusBadge status={task.Status} />
                    )}
                  </TableCell>
                  <TableCell className="py-3">
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
                  <TableCell className="py-3">
                    {task.AssigneeName ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                            {initials(task.AssigneeName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden text-sm lg:inline">
                          {task.AssigneeName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm text-muted-foreground"
                        title={
                          task.StartDate
                            ? `Início: ${formatDate(task.StartDate)}`
                            : undefined
                        }
                      >
                        {formatDate(task.DueDate)}
                      </span>
                      <DueBadge dueDate={task.DueDate} status={task.Status} />
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    {editable && (
                      <div className="flex items-center justify-end transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <TaskDialog
                          workspaceId={workspaceId}
                          members={members}
                          task={toFormValues(task)}
                          subtasks={subtasks}
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
                        <TaskDeleteButton
                          taskId={task.Id}
                          taskTitle={task.Title}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="border-b bg-muted/20 hover:bg-muted/20 last:border-0">
                    <TableCell colSpan={COLUMN_COUNT} className="py-3 pl-12">
                      <div className="max-w-md">
                        {editable ? (
                          <SubtaskList taskId={task.Id} subtasks={subtasks} />
                        ) : (
                          <ul className="space-y-1.5">
                            {subtasks.map((subtask) => (
                              <li
                                key={subtask.Id}
                                className="flex items-center gap-2 text-sm"
                              >
                                {subtask.IsDone ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                                ) : (
                                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                                <span
                                  className={cn(
                                    subtask.IsDone &&
                                      "text-muted-foreground line-through"
                                  )}
                                >
                                  {subtask.Title}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
