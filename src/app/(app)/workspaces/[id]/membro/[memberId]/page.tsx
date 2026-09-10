import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderOpen, Plus, UserRound } from "lucide-react";
import { requireUser, requireWorkspaceMember } from "@/lib/authz";
import {
  countArchivedTasksForMember,
  getWorkspace,
  getWorkspaceSummary,
  listSupervisedTasks,
  listSubtasksByWorkspace,
  listTasksByWorkspace,
  listWorkspaceMembers,
  type Task,
} from "@/lib/data";
import { requiresDeleteApproval } from "@/lib/permissions";
import { DONE_ARCHIVE_DAYS, normalizeTaskFilter } from "@/lib/constants";
import { isoDaysAgo } from "@/lib/dates";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusSummary } from "@/components/tasks/status-summary";
import { ArchiveNotice } from "@/components/tasks/archive-notice";
import { WorkspaceDashboard } from "@/components/tasks/workspace-dashboard";
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
  searchParams,
}: {
  params: { id: string; memberId: string };
  searchParams: { arquivo?: string; status?: string; aba?: string };
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

  // Mesma janela de concluídas da página do espaço.
  // Aba na URL, como na página do espaço: mantém os links do painel válidos.
  const TABS = ["list", "supervised", "panel"];
  const activeTab = TABS.includes(searchParams.aba ?? "")
    ? (searchParams.aba as string)
    : "list";
  const statusFilter = normalizeTaskFilter(searchParams.status);
  const showingArchive = searchParams.arquivo === "1";
  const doneDays = showingArchive ? null : DONE_ARCHIVE_DAYS;

  const [allTasks, members, allSubtasks, archivedCount, summary, supervised] =
    await Promise.all([
      listTasksByWorkspace(workspaceId, doneDays),
      listWorkspaceMembers(workspaceId),
      listSubtasksByWorkspace(workspaceId, doneDays),
      countArchivedTasksForMember(workspaceId, DONE_ARCHIVE_DAYS, memberId),
      // Mesmo recorte da pasta (responsável ou colaborador), totais reais.
      getWorkspaceSummary(workspaceId, memberId),
      // Supervisionadas ficam à parte: não entram na lista nem no resumo.
      memberId === 0
        ? Promise.resolve([])
        : listSupervisedTasks(workspaceId, memberId, doneDays),
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
  // A aba "Supervisionadas" só existe quando há o que supervisionar; um link
  // antigo para ela cairia numa aba sem gatilho.
  const effectiveTab =
    activeTab === "supervised" && supervised.length === 0 ? "list" : activeTab;

  const supervisedIds = new Set(supervised.map((t) => t.Id));
  const supervisedSubtasks = allSubtasks
    .filter((s) => s.Entry != null && supervisedIds.has(s.Entry))
    .reduce<Record<number, Task[]>>((acc, subtask) => {
      (acc[subtask.Entry as number] ??= []).push(subtask);
      return acc;
    }, {});

  const taskIds = new Set(tasks.map((t) => t.Id));
  const subtasksByTask = allSubtasks
    .filter((s) => s.Entry != null && taskIds.has(s.Entry))
    .reduce<Record<number, Task[]>>((acc, subtask) => {
      (acc[subtask.Entry as number] ??= []).push(subtask);
      return acc;
    }, {});

  // Mesma regra de autorização da página do espaço.
  const needsDeleteApproval = requiresDeleteApproval(
    user.id,
    role === "admin",
    workspace.OwnerId
  );
  const approverName =
    members.find((m) => m.UserId === user.id)?.ApproverName ??
    members.find((m) => m.UserId === workspace.OwnerId)?.Name ??
    null;

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

      <StatusSummary counts={summary.byStatus} />

      <Tabs defaultValue={effectiveTab} key={`${effectiveTab}-${statusFilter}`}>
        <TabsList>
          <TabsTrigger value="list">Tarefas</TabsTrigger>
          {supervised.length > 0 && (
            <TabsTrigger value="supervised">
              Supervisionadas ({supervised.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="panel">Painel</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4 space-y-4">
          <ArchiveNotice
            hiddenCount={archivedCount}
            cutoffDate={isoDaysAgo(DONE_ARCHIVE_DAYS)}
            showingAll={showingArchive}
            baseHref={`/workspaces/${workspaceId}/membro/${memberId}`}
          />
          <TaskTable
            tasks={tasks}
            members={members}
            workspaceId={workspaceId}
            subtasksByTask={subtasksByTask}
            currentUserId={user.id}
            isAdmin={role === "admin"}
            requiresDeleteApproval={needsDeleteApproval}
            approverName={approverName}
            initialStatusFilter={statusFilter}
          />
        </TabsContent>
        <TabsContent value="supervised" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Tarefas que {isOwnFolder ? "você acompanha" : `${folderName} acompanha`} como
            supervisor. Não entram na lista de tarefas nem nos números da pasta.
          </p>
          <TaskTable
            tasks={supervised}
            members={members}
            workspaceId={workspaceId}
            subtasksByTask={supervisedSubtasks}
            currentUserId={user.id}
            isAdmin={role === "admin"}
            requiresDeleteApproval={needsDeleteApproval}
            approverName={approverName}
          />
        </TabsContent>
        <TabsContent value="panel" className="mt-4">
          <WorkspaceDashboard
            summary={summary}
            scopeLabel={folderName}
            listHref={`/workspaces/${workspaceId}/membro/${memberId}?aba=list`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
