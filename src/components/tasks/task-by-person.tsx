"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search, UserRound } from "lucide-react";
import type { Task, WorkspaceMember } from "@/lib/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TaskDialog } from "./task-dialog";
import { taskPercent } from "./task-progress";
import { initials, STATUS_CHIPS } from "./task-utils";

export { STATUS_CHIPS };

interface PersonGroup {
  key: string;
  name: string | null;
  userId: number | null;
  tasks: Task[];
}

/**
 * Lista de pastas por membro: busca por nome no topo e linhas compactas
 * (mais pessoas visíveis de uma vez). Clicar na linha abre a página da
 * pessoa com apenas as tarefas dela.
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
}) {
  const [search, setSearch] = useState("");

  const groups: PersonGroup[] = useMemo(() => {
    const list: PersonGroup[] = members.map((member) => ({
      key: String(member.UserId),
      name: member.Name,
      userId: member.UserId,
      tasks: tasks.filter((t) => t.AssigneeId === member.UserId),
    }));
    const unassigned = tasks.filter((t) => t.AssigneeId === null);
    if (unassigned.length > 0) {
      list.push({
        key: "unassigned",
        name: null,
        userId: null,
        tasks: unassigned,
      });
    }
    return list;
  }, [members, tasks]);

  const term = search.trim().toLowerCase();
  const visibleGroups = term
    ? groups.filter((g) => (g.name ?? "sem responsável").toLowerCase().includes(term))
    : groups;

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pessoa..."
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {visibleGroups.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma pessoa encontrada para “{search}”.
          </p>
        ) : (
          <ul className="divide-y">
            {visibleGroups.map((group) => {
              const total = group.tasks.length;
              const done = group.tasks.filter((t) => t.Status === "done").length;
              // Média do % das tarefas: reflete progresso parcial.
              const percent =
                total > 0
                  ? Math.round(
                      group.tasks.reduce(
                        (sum, t) =>
                          sum +
                          taskPercent(
                            t.Status,
                            t.SubtaskCount,
                            t.SubtaskDone,
                            t.Progress
                          ),
                        0
                      ) / total
                    )
                  : 0;
              const isOwn = group.userId === currentUserId;
              const canQuickCreate =
                group.userId !== null && (isAdmin || isOwn);

              return (
                <li key={group.key} className="group relative">
                  <Link
                    href={`/workspaces/${workspaceId}/membro/${group.userId ?? 0}`}
                    className="flex items-center gap-3 py-3 pl-4 pr-24 transition-colors hover:bg-muted/40"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback
                        className={
                          group.name
                            ? "bg-primary text-primary-foreground text-xs font-semibold"
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
                      <p className="truncate text-sm font-medium">
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
                          : `${done}/${total} concluída${total > 1 ? "s" : ""}`}
                      </p>
                    </div>

                    {/* Contadores por status — escondem em telas estreitas */}
                    <div className="hidden items-center gap-3 lg:flex">
                      {STATUS_CHIPS.map((chip) => {
                        const count = group.tasks.filter(
                          (t) => t.Status === chip.value
                        ).length;
                        const Icon = chip.icon;
                        return (
                          <span
                            key={chip.value}
                            title={chip.label}
                            className={cn(
                              "flex w-9 items-center justify-center gap-1 text-xs tabular-nums",
                              count > 0 ? chip.className : "text-muted-foreground/30"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {count}
                          </span>
                        );
                      })}
                    </div>

                    {/* Progresso */}
                    <div className="hidden w-40 items-center gap-2 sm:flex">
                      <Progress value={percent} className="h-1.5" />
                      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                        {percent}%
                      </span>
                    </div>
                  </Link>

                  {/* Ações à direita, fora do Link para HTML válido */}
                  <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {canQuickCreate && (
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
                            title={`Nova tarefa para ${group.name ?? "ninguém"}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        }
                      />
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
