"use client";

import { Fragment, useState } from "react";
import { CheckCircle2, ChevronRight, Circle, Pencil } from "lucide-react";
import type { Subtask, Task, WorkspaceMember } from "@/lib/data";
import { TASK_STATUSES } from "@/lib/constants";
import { formatDate, getDueInfo } from "@/lib/dates";
import { AlertTriangle } from "lucide-react";
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

const COLUMN_COUNT = 7;

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
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const isOverdue = (t: Task) =>
    getDueInfo(t.DueDate, t.Status)?.state === "overdue";

  // Ordena por criação mais recente primeiro (ID decrescente), em todos os
  // estados — a tarefa adicionada por último aparece no topo.
  const sortTasks = (list: Task[]) => [...list].sort((a, b) => b.Id - a.Id);

  const filteredTasks = sortTasks(
    statusFilter === "all"
      ? tasks
      : statusFilter === "overdue"
        ? tasks.filter(isOverdue)
        : tasks.filter((t) => t.Status === statusFilter)
  );

  const overdueCount = tasks.filter(isOverdue).length;

  const filterOptions = [
    { value: "all", label: "Todas", count: tasks.length },
    ...TASK_STATUSES.map((s) => ({
      value: s.value,
      label: s.label,
      count: tasks.filter((t) => t.Status === s.value).length,
    })),
    { value: "overdue", label: "Vencidas", count: overdueCount },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((option) => {
          const isActive = statusFilter === option.value;
          const isOverdueFilter = option.value === "overdue";
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? isOverdueFilter
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : "border-primary bg-primary text-primary-foreground"
                  : isOverdueFilter && option.count > 0
                    ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {isOverdueFilter && <AlertTriangle className="h-3 w-3" />}
              {option.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px]",
                  isActive ? "bg-white/20" : "bg-black/5 dark:bg-white/10"
                )}
              >
                {option.count}
              </span>
            </button>
          );
        })}
      </div>

      <div>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="w-full text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tarefa
            </TableHead>
            <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Progresso
            </TableHead>
            <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Responsável
            </TableHead>
            <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Início
            </TableHead>
            <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Vencimento
            </TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.map((task) => {
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
                  <TableCell className="min-w-[260px] py-3 align-top">
                    <div className="flex items-start gap-1.5">
                      {hasSubtasks ? (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(task.Id)}
                          title={
                            isOpen
                              ? "Recolher subtarefas"
                              : "Expandir subtarefas"
                          }
                          className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
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
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium leading-snug">
                            {task.Title}
                          </span>
                          <PriorityBadge priority={task.Priority} />
                        </div>
                        {task.Description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {task.Description}
                          </p>
                        )}
                      </div>
                    </div>
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
                    <span className="text-sm text-muted-foreground">
                      {formatDate(task.StartDate)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
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
        {filteredTasks.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {statusFilter === "overdue"
              ? "Nenhuma tarefa vencida. 🎉"
              : "Nenhuma tarefa com este status."}
          </p>
        )}
      </div>
    </div>
  );
}
