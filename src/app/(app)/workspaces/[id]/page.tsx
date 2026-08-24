import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireUser, requireWorkspaceMember } from "@/lib/authz";
import {
  getWorkspace,
  listApprovalsToDecide,
  listMyApprovalRequests,
  listSubtasksByWorkspace,
  listTasksByWorkspace,
  listWorkspaceMembers,
  type Task,
} from "@/lib/data";
import { requiresDeleteApproval } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalsDialog } from "@/components/workspaces/approvals-dialog";
import { MembersDialog } from "@/components/workspaces/members-dialog";
import { WorkspaceDeleteButton } from "@/components/workspaces/workspace-delete-button";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskByPerson } from "@/components/tasks/task-by-person";
import { StatusSummary } from "@/components/tasks/status-summary";

export default async function WorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const workspaceId = Number(params.id);
  if (!Number.isInteger(workspaceId)) notFound();

  const user = await requireUser();
  const role = await requireWorkspaceMember(workspaceId, user);

  const workspace = await getWorkspace(workspaceId);
  if (!workspace) notFound();

  const [tasks, members, subtasks, approvalsToDecide, myApprovals] =
    await Promise.all([
      listTasksByWorkspace(workspaceId),
      listWorkspaceMembers(workspaceId),
      listSubtasksByWorkspace(workspaceId),
      listApprovalsToDecide(workspaceId, user.id),
      listMyApprovalRequests(workspaceId, user.id),
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

      <StatusSummary tasks={tasks} />

      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people">Por pessoa</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="board">Quadro</TabsTrigger>
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
          />
        </TabsContent>
        <TabsContent value="board" className="mt-4">
          <TaskBoard
            tasks={tasks}
            members={members}
            workspaceId={workspaceId}
            subtasksByTask={subtasksByTask}
            currentUserId={user.id}
            isAdmin={isAdmin}
            requiresDeleteApproval={needsDeleteApproval}
            approverName={approverName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
