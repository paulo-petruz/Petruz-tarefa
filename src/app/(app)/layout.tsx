import { requireUser } from "@/lib/authz";
import { listWorkspacesForUser } from "@/lib/data";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  let workspaces: Awaited<ReturnType<typeof listWorkspacesForUser>> = [];
  try {
    workspaces = await listWorkspacesForUser(user.id);
  } catch (err) {
    console.error("Falha ao carregar workspaces:", err);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaces={workspaces} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
