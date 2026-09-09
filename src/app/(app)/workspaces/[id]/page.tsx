import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireUser, requireWorkspaceMember } from "@/lib/authz";
import {
  countArchivedTasks,
  getWorkspace,
  getWorkspaceSummary,
  listApprovalsToDecide,
  listMyApprovalRequests,
  listSubtasksByWorkspace,
  listTasksByWorkspace,
  listWorkspaceMembers,
  type Task,
} from "@/lib/data";
import { requiresDeleteApproval } from "@/lib/permissions";
import { DONE_ARCHIVE_DAYS, normalizeTaskFilter } from "@/lib/constants";
import { isoDaysAgo } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalsDialog } from "@/components/workspaces/approvals-dialog";
import { MembersDialog } from "@/components/workspaces/members-dialog";
import { WorkspaceDeleteButton } from "@/components/workspaces/workspace-delete-button";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskByPerson } from "@/components/tasks/task-by-person";
import { StatusSummary } from "@/components/tasks/status-summary";
import { ArchiveNotice } from "@/components/tasks/archive-notice";
import { WorkspaceDashboard } from "@/components/tasks/workspace-dashboard";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { arquivo?: string; aba?: string; status?: string };
}) {
  const workspaceId = Number(params.id);
  if (!Number.isInteger(workspaceId)) notFound();

  const user = await requireUser();
  const role = await requireWorkspaceMember(workspaceId, user);

  const workspace = await getWorkspace(workspaceId);
  if (!workspace) notFound();

  // ?arquivo=1 carrega todo o histórico; o padrão traz só as concluídas
  // recentes, evitando puxar tudo de uma vez.
  // Aba e filtro vêm da URL para o painel poder linkar direto ao resultado.
  const TABS = ["people", "list", "panel"];
  const activeTab = TABS.includes(searchParams.aba ?? "")
    ? (searchParams.aba as string)
    : "people";
  const statusFilter = normalizeTaskFilter(searchParams.status);

  const showingArchive = searchParams.arquivo === "1";
  const doneDays = showingArchive ? null : DONE_ARCHIVE_DAYS;

  const [
    tasks,
    members,
    subtasks,
    approvalsToDecide,
    myApprovals,
    archivedCount,
    summary,
  ] = await Promise.all([
    listTasksByWorkspace(workspaceId, doneDays),
    listWorkspaceMembers(workspaceId),
    listSubtasksByWorkspace(workspaceId, doneDays),
    listApprovalsToDecide(workspaceId, user.id),
    listMyApprovalRequests(workspaceId, user.id),
    countArchivedTasks(workspaceId, DONE_ARCHIVE_DAYS),
    // Agregado no banco: totais reais, fora da janela do arquivo.
    getWorkspaceSummary(workspaceId),
  ]);

  const subtasksByTask = subtasks.reduce<Record<number, Task[]>>(
    (acc, subtask) => {
      if (subtask.Entry != null) (acc[subtask.Entry] ??= []).push(subtask);
      return acc;
    },
    {}
  );

  const isAdmin = role === "admin";

  // Quem não é dono/admin precisa da autorização do aprovador para excluir.
  const needsDeleteApproval = requiresDeleteApproval(
    user.id,
    isAdmin,
    workspace.OwnerId
  );
  const approverName =
    members.find((m) => m.UserId === user.id)?.ApproverName ??
    members.find((m) => m.UserId === workspace.OwnerId)?.Name ??
    null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: workspace.Color }}
          />
          <div>
            <h1 className="text-2xl font-bold">{workspace.Name}</h1>
            {workspace.Description && (
              <p className="text-sm text-muted-foreground">
                {workspace.Description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ApprovalsDialog toDecide={approvalsToDecide} mine={myApprovals} />
          <MembersDialog
            workspaceId={workspaceId}
            ownerId={workspace.OwnerId}
            members={members}
            isAdmin={isAdmin}
          />
          {isAdmin && (
            <WorkspaceDeleteButton
              workspaceId={workspaceId}
              workspaceName={workspace.Name}
            />
          )}
          <TaskDialog
            workspaceId={workspaceId}
            members={members}
            currentUserId={user.id}
            isAdmin={isAdmin}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova tarefa
              </Button>
            }
          />
        </div>
      </div>

      <StatusSummary counts={summary.byStatus} />

      <ArchiveNotice
        hiddenCount={archivedCount}
        cutoffDate={isoDaysAgo(DONE_ARCHIVE_DAYS)}
        showingAll={showingArchive}
        baseHref={`/workspaces/${workspaceId}`}
      />

      <Tabs defaultValue={activeTab} key={`${activeTab}-${statusFilter}`}>
        <TabsList>
          <TabsTrigger value="people">Por pessoa</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="panel">Painel</TabsTrigger>
        </TabsList>
        <TabsContent value="people" className="mt-4">
          <TaskByPerson
            tasks={tasks}
            members={members}
            workspaceId={workspaceId}
            currentUserId={user.id}
            isAdmin={isAdmin}
          />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <TaskTable
            tasks={tasks}
            members={members}
            workspaceId={workspaceId}
            subtasksByTask={subtasksByTask}
            currentUserId={user.id}
            isAdmin={isAdmin}
            requiresDeleteApproval={needsDeleteApproval}
            approverName={approverName}
            initialStatusFilter={statusFilter}
          />
        </TabsContent>
        <TabsContent value="panel" className="mt-4">
          <WorkspaceDashboard
            summary={summary}
            listHref={`/workspaces/${workspaceId}?aba=list`}
            memberHrefBase={`/workspaces/${workspaceId}/membro`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
