import Link from "next/link";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { listWorkspacesForUser } from "@/lib/data";
import { WorkspaceCreateDialog } from "@/components/workspaces/workspace-create-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Espaços de trabalho — Petruz Tasks" };

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: { new?: string };
}) {
  const user = await requireUser();
  const workspaces = await listWorkspacesForUser(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Espaços de trabalho</h1>
          <p className="text-sm text-muted-foreground">
            Crie espaços para organizar as tarefas de cada equipe ou projeto.
          </p>
        </div>
        <WorkspaceCreateDialog defaultOpen={searchParams.new === "1"} />
      </div>

      {workspaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="font-medium">Você ainda não participa de nenhum espaço.</p>
            <p className="text-sm text-muted-foreground">
              Crie seu primeiro espaço de trabalho para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => {
            const progress =
              ws.TaskCount > 0
                ? Math.round((ws.DoneCount / ws.TaskCount) * 100)
                : 0;
            return (
              <Link key={ws.Id} href={`/workspaces/${ws.Id}`}>
                <Card className="h-full transition hover:border-primary/60 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: ws.Color }}
                      />
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {ws.MemberRole === "admin" ? "Admin" : "Membro"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{ws.Name}</CardTitle>
                    {ws.Description && (
                      <CardDescription className="line-clamp-2">
                        {ws.Description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        {ws.DoneCount}/{ws.TaskCount} tarefas concluídas
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
