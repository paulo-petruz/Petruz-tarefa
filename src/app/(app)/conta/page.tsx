import { KeyRound } from "lucide-react";
import { requireUser } from "@/lib/authz";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export const metadata = { title: "Minha conta — Petruz Tarefas" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minha conta</h1>
        <p className="text-sm text-muted-foreground">
          {user.name} · {user.email}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-primary" />
            Trocar minha senha
          </CardTitle>
          <CardDescription>
            Confirme sua senha atual e escolha uma nova. A troca vale apenas
            para a sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
