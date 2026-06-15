import Link from "next/link";
import { AlertTriangle, ArrowRight, FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { getDueAlertsForUser, listWorkspacesForUser } from "@/lib/data";
import { getStatusCountsForUser } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DueBadge } from "@/components/tasks/due-badge";
import { STATUS_CHIPS } from "@/components/tasks/task-utils";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata = { title: "Painel — Petruz Tasks" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [workspaces, statusCounts, dueAlerts] = await Promise.all([
    listWorkspacesForUser(user.id),
    getStatusCountsForUser(user.id),
    getDueAlertsForUser(user.id, 3),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="text-sm text-muted-foreground">
          Andamento de cada espaço de trabalho.
        </p>
      </div>

      {workspaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="font-medium">
              Você ainda não participa de nenhum espaço.
            </p>
            <Button asChild variant="link">
              <Link href="/workspaces">Criar meu primeiro espaço</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {workspaces.map((ws) => {
            const wsCounts = statusCounts.filter(
              (c) => c.WorkspaceId === ws.Id
            );
            const total = wsCounts.reduce((sum, c) => sum + c.Count, 0);
            const done = wsCounts.find((c) => c.Status === "done")?.Count ?? 0;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            const wsAlerts = dueAlerts.filter(
              (t) => t.WorkspaceId === ws.Id
            );

            return (
              <Card key={ws.Id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: ws.Color }}
                      />
                      {ws.Name}
                    </CardTitle>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/workspaces/${ws.Id}`}>
                        Abrir
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  {ws.Description && (
                    <CardDescription className="line-clamp-1">
                      {ws.Description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {total === 0 ? (
                    <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                      <FolderKanban className="h-4 w-4" />
                      Nenhuma tarefa neste espaço ainda.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {STATUS_CHIPS.map((chip) => {
                          const count =
                            wsCounts.find((c) => c.Status === chip.value)
                              ?.Count ?? 0;
                          const Icon = chip.icon;
                          return (
                            <div
                              key={chip.value}
                              className="rounded-md border p-2 text-center"
                            >
                              <span
                                className={cn(
                                  "flex items-center justify-center gap-1 text-xs font-medium",
                                  chip.className
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {chip.label}
                              </span>
                              <p className="mt-1 text-xl font-bold">{count}</p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="whitespace-nowrap text-sm font-medium">
                          Andamento
                        </span>
                        <Progress value={percent} className="h-2.5" />
                        <span className="whitespace-nowrap text-sm font-semibold text-primary">
                          {percent}%
                        </span>
                      </div>

                      {wsAlerts.length > 0 && (
                        <div className="space-y-2">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            Alertas de vencimento
                          </p>
                          <ul className="space-y-1.5">
                            {wsAlerts.slice(0, 5).map((task) => (
                              <li key={task.Id}>
                                <Link
                                  href={`/workspaces/${ws.Id}`}
                                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition hover:border-primary/60"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                      {task.Title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {task.AssigneeName ?? "Sem responsável"} ·{" "}
                                      {formatDate(task.DueDate)}
                                    </p>
                                  </div>
                                  <DueBadge
                                    dueDate={task.DueDate}
                                    status={task.Status}
                                  />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
