"use client";

import { Fragment, useState } from "react";
import { AlertTriangle, ChevronRight, Pencil, Plus, Target } from "lucide-react";
import type { Task, WorkspaceMember } from "@/lib/data";
import { TASK_STATUSES } from "@/lib/constants";
import { formatDateShort, getDueInfo } from "@/lib/dates";
import { getMetaInfo } from "@/lib/meta";
import { canDeleteTask, canEditTask } from "@/lib/permissions";
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
import { MetaBadge } from "./meta-badge";
import { PriorityBadge } from "./priority-badge";
import { SubtaskOverdueBadge } from "./subtask-overdue-badge";
import { StatusBadge } from "./status-badge";
import { TaskDeleteButton } from "./task-delete-button";
import { TaskDialog } from "./task-dialog";
import { TaskProgress } from "./task-progress";
import { TaskProgressEditor } from "./task-progress-editor";
import { TaskStatusSelect } from "./task-status-select";

const COLUMN_COUNT = 8;

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
  subtasksByTask: Record<number, Task[]>;
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

  const isMetaOffTarget = (t: Task) => {
    const info = getMetaInfo(
      t.MetaType,
      t.MetaValue,
      t.SubtaskCount,
      t.SubtaskDone
    );
    return info != null && !info.ok;
  };

  // Ordena por criação mais recente primeiro (ID decrescente), em todos os
  // estados — a tarefa adicionada por último aparece no topo.
  const sortTasks = (list: Task[]) => [...list].sort((a, b) => b.Id - a.Id);

  const filteredTasks = sortTasks(
    statusFilter === "all"
      ? tasks
      : statusFilter === "overdue"
        ? tasks.filter(isOverdue)
        : statusFilter === "off_target"
          ? tasks.filter(isMetaOffTarget)
          : tasks.filter((t) => t.Status === statusFilter)
  );

  const overdueCount = tasks.filter(isOverdue).length;
  const offTargetCount = tasks.filter(isMetaOffTarget).length;

  const filterOptions: {
    value: string;
    label: string;
    count: number;
    tone?: "danger" | "warning";
  }[] = [
    { value: "all", label: "Todas", count: tasks.length },
    ...TASK_STATUSES.map((s) => ({
      value: s.value,
      label: s.label,
      count: tasks.filter((t) => t.Status === s.value).length,
    })),
    { value: "overdue", label: "Vencidas", count: overdueCount, tone: "danger" },
    {
      value: "off_target",
      label: "Fora da meta",
      count: offTargetCount,
      tone: "warning",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((option) => {
          const isActive = statusFilter === option.value;
          const Icon =
            option.tone === "danger"
              ? AlertTriangle
              : option.tone === "warning"
                ? Target
                : null;
          const activeClass =
            option.tone === "danger"
              ? "border-destructive bg-destructive text-destructive-foreground"
              : option.tone === "warning"
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-primary bg-primary text-primary-foreground";
          const idleClass =
            option.tone === "danger" && option.count > 0
              ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
              : option.tone === "warning" && option.count > 0
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                : "border-border bg-card text-muted-foreground hover:bg-muted";
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isActive ? activeClass : idleClass
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
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
              Previsão
            </TableHead>
            <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Conclusão
            </TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.map((task) => {
            const editable = canEditTask(task, currentUserId, isAdmin);
            const deletable = canDeleteTask(task, currentUserId, isAdmin);
            const subtasks = subtasksByTask[task.Id] ?? [];
            const hasSubtasks = subtasks.length > 0;
            const isOpen = expanded.includes(task.Id);
            return (
              <Fragment key={task.Id}>
                <TableRow
                  className={cn(
                    "group border-b transition-colors hover:bg-muted/30 [&>td]:align-top",
                    isOpen ? "border-0 bg-muted/20" : "last:border-0"
                  )}
                >
                  <TableCell className="min-w-[260px] py-3 align-top">
                    <div className="flex items-start gap-1.5">
                      {hasSubtasks || editable ? (
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
                          {hasSubtasks && (
                            <span className="tabular-nums">
                              {subtasks.filter((s) => s.Status === "done").length}/
                              {subtasks.length}
                            </span>
                          )}
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
                          <MetaBadge
                            metaType={task.MetaType}
                            metaValue={task.MetaValue}
                            subtaskCount={task.SubtaskCount}
                            subtaskDone={task.SubtaskDone}
                          />
                          <SubtaskOverdueBadge subtasks={subtasks} />
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
                    {task.AssigneeName || task.Collaborators.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {task.AssigneeName && (
                            <Avatar
                              className="h-7 w-7 ring-2 ring-background"
                              title={`${task.AssigneeName} (responsável)`}
                            >
                              <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                                {initials(task.AssigneeName)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {task.Collaborators.slice(0, 3).map((c) => (
                            <Avatar
                              key={c.UserId}
                              className="h-7 w-7 ring-2 ring-background"
                              title={`${c.Name} (compartilhada)`}
                            >
                              <AvatarFallback className="bg-muted text-[10px] font-semibold text-foreground">
                                {initials(c.Name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {task.Collaborators.length > 3 && (
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-background"
                              title={task.Collaborators
                                .map((c) => c.Name)
                                .join(", ")}
                            >
                              +{task.Collaborators.length - 3}
                            </span>
                          )}
                        </div>
                        {task.AssigneeName && (
                          <span className="hidden text-sm lg:inline">
                            {task.AssigneeName}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <span className="block whitespace-nowrap text-sm leading-6 text-muted-foreground">
                      {formatDateShort(task.StartDate)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="block whitespace-nowrap text-sm leading-6 text-muted-foreground">
                        {formatDateShort(task.DueDate)}
                      </span>
                      <DueBadge dueDate={task.DueDate} status={task.Status} />
                    </div>
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <span className="block whitespace-nowrap text-sm leading-6 text-muted-foreground">
                      {task.CompletedDate ? (
                        <span className="text-green-600 dark:text-green-400">
                          {formatDateShort(task.CompletedDate)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    {editable && (
                      <div className="flex items-center justify-end transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <TaskDialog
                          workspaceId={workspaceId}
                          members={members}
                          task={toFormValues(task)}
                          hasSubtasks={hasSubtasks}
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
                        {deletable && (
                          <TaskDeleteButton
                            taskId={task.Id}
                            taskTitle={task.Title}
                          />
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="border-b bg-muted/20 hover:bg-muted/20 last:border-0">
                    <TableCell colSpan={COLUMN_COUNT} className="py-3 pl-12 pr-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Subtarefas
                        </p>
                        {subtasks.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma subtarefa ainda.
                          </p>
                        )}
                        {subtasks.map((sub) => {
                          const subEditable = canEditTask(
                            sub,
                            currentUserId,
                            isAdmin
                          );
                          return (
                            <div
                              key={sub.Id}
                              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2"
                            >
                              <div className="min-w-[180px] flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-sm font-medium">
                                    {sub.Title}
                                  </span>
                                  <PriorityBadge priority={sub.Priority} />
                                </div>
                                {sub.Description && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {sub.Description}
                                  </p>
                                )}
                              </div>
                              {subEditable ? (
                                <TaskStatusSelect
                                  taskId={sub.Id}
                                  status={sub.Status}
                                />
                              ) : (
                                <StatusBadge status={sub.Status} />
                              )}
                              {subEditable ? (
                                <TaskProgressEditor
                                  taskId={sub.Id}
                                  status={sub.Status}
                                  subtaskCount={sub.SubtaskCount}
                                  subtaskDone={sub.SubtaskDone}
                                  manualProgress={sub.Progress}
                                />
                              ) : (
                                <TaskProgress
                                  status={sub.Status}
                                  subtaskCount={sub.SubtaskCount}
                                  subtaskDone={sub.SubtaskDone}
                                  manualProgress={sub.Progress}
                                />
                              )}
                              {sub.AssigneeName ? (
                                <div
                                  className="flex items-center gap-1.5"
                                  title={sub.AssigneeName}
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                                      {initials(sub.AssigneeName)}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Sem responsável
                                </span>
                              )}
                              <div className="flex flex-col items-start gap-0.5">
                                <span className="whitespace-nowrap text-xs text-muted-foreground">
                                  {sub.CompletedDate
                                    ? `✓ ${formatDateShort(sub.CompletedDate)}`
                                    : formatDateShort(sub.DueDate)}
                                </span>
                                <DueBadge
                                  dueDate={sub.DueDate}
                                  status={sub.Status}
                                />
                              </div>
                              {subEditable && (
                                <div className="flex items-center">
                                  <TaskDialog
                                    workspaceId={workspaceId}
                                    members={members}
                                    task={toFormValues(sub)}
                                    currentUserId={currentUserId}
                                    isAdmin={isAdmin}
                                    trigger={
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground"
                                        title="Editar subtarefa"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    }
                                  />
                                  <TaskDeleteButton
                                    taskId={sub.Id}
                                    taskTitle={sub.Title}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {editable && (
                          <TaskDialog
                            workspaceId={workspaceId}
                            members={members}
                            entryId={task.Id}
                            defaultAssigneeId={task.AssigneeId ?? undefined}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-1"
                              >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Adicionar subtarefa
                              </Button>
                            }
                          />
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
