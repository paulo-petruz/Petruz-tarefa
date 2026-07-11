import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderOpen, Plus, UserRound } from "lucide-react";
import { requireUser, requireWorkspaceMember } from "@/lib/authz";
import {
  getWorkspace,
  listSubtasksByWorkspace,
  listTasksByWorkspace,
  listWorkspaceMembers,
  type Task,
} from "@/lib/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusSummary } from "@/components/tasks/status-summary";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskTable } from "@/components/tasks/task-table";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function MemberFolderPage({
  params,
}: {
  params: { id: string; memberId: string };
}) {
  const workspaceId = Number(params.id);
  const memberId = Number(params.memberId);
  if (!Number.isInteger(workspaceId) || !Number.isInteger(memberId)) {
    notFound();
  }

  const user = await requireUser();
  const role = await requireWorkspaceMember(workspaceId, user);

  const workspace = await getWorkspace(workspaceId);
  if (!workspace) notFound();

  const [allTasks, members, allSubtasks] = await Promise.all([
    listTasksByWorkspace(workspaceId),
    listWorkspaceMembers(workspaceId),
    listSubtasksByWorkspace(workspaceId),
  ]);

  // memberId 0 = pasta "Sem responsável"
  const member =
    memberId === 0 ? null : members.find((m) => m.UserId === memberId);
  if (memberId !== 0 && !member) notFound();

  const tasks = allTasks.filter((t) =>
    member
      ? t.AssigneeId === member.UserId ||
        t.Collaborators.some((c) => c.UserId === member.UserId)
      : t.AssigneeId === null
  );
  const taskIds = new Set(tasks.map((t) => t.Id));
  const subtasksByTask = allSubtasks
    .filter((s) => s.Entry != null && taskIds.has(s.Entry))
    .reduce<Record<number, Task[]>>((acc, subtask) => {
      (acc[subtask.Entry as number] ??= []).push(subtask);
      return acc;
    }, {});

  const folderName = member?.Name ?? "Sem responsável";
  const isOwnFolder = member?.UserId === user.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild title="Voltar ao espaço">
            <Link href={`/workspaces/${workspaceId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <FolderOpen className="h-6 w-6 text-primary" />
          <Avatar className="h-10 w-10">
            <AvatarFallback
              className={
                member
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }
            >
              {member ? (
                initials(member.Name)
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {isOwnFolder ? "Minha pasta" : `Pasta de ${folderName}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {workspace.Name} ·{" "}
              {tasks.length === 0
                ? "nenhuma tarefa"
                : `${tasks.length} tarefa${tasks.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {(role === "admin" || !member || member.UserId === user.id) && (
          <TaskDialog
            workspaceId={workspaceId}
            members={members}
            defaultAssigneeId={member?.UserId}
            currentUserId={user.id}
            isAdmin={role === "admin"}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova tarefa
              </Button>
            }
          />
        )}
      </div>

      <StatusSummary tasks={tasks} />

      <TaskTable
        tasks={tasks}
        members={members}
        workspaceId={workspaceId}
        subtasksByTask={subtasksByTask}
        currentUserId={user.id}
        isAdmin={role === "admin"}
      />
    </div>
  );
}
