import { ShieldCheck } from "lucide-react";
import { requireSuperAdmin, SUPER_ADMIN_ROLE } from "@/lib/authz";
import { listAllUsers } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";

export const metadata = { title: "Administração — Petruz Tasks" };

export default async function AdminPage() {
  const admin = await requireSuperAdmin();
  const users = await listAllUsers();

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
