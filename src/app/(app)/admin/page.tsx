import { Search, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { requireSuperAdmin, SUPER_ADMIN_ROLE } from "@/lib/authz";
import { listAllUsers } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";

export const metadata = { title: "Administração — Petruz Tarefas" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const admin = await requireSuperAdmin();
  const query = searchParams.q?.trim() ?? "";
  const users = await listAllUsers(query);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Administração de usuários
        </h1>
        <p className="text-sm text-muted-foreground">
          Área restrita a super admins. Resete a senha de qualquer usuário do
          sistema.
        </p>
      </div>

      <form method="GET" className="flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
        {query && (
          <Button variant="ghost" size="icon" asChild title="Limpar busca">
            <Link href="/admin">
              <X className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </form>

      {users.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Nenhum usuário encontrado para “{query}”.
        </div>
      ) : (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="w-[160px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.Id}>
                <TableCell className="font-medium">
                  {user.Name}
                  {user.Id === admin.id && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (você)
                    </span>
                  )}
                </TableCell>
                <TableCell>{user.Email}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      user.Role === SUPER_ADMIN_ROLE ? "default" : "secondary"
                    }
                  >
                    {user.Role === SUPER_ADMIN_ROLE
                      ? "Super admin"
                      : "Usuário"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(user.CreatedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <ResetPasswordDialog userId={user.Id} userName={user.Name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      <p className="text-xs text-muted-foreground">
        Para promover alguém a super admin, execute no banco de dados:{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">
          UPDATE dbo.Users SET Role = &apos;superadmin&apos; WHERE Email =
          &apos;email@exemplo.com&apos;
        </code>
      </p>
    </div>
  );
}
