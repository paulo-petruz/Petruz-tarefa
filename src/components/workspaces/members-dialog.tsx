"use client";

import { useState } from "react";
import { ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  addMemberAction,
  removeMemberAction,
  setMemberApproverAction,
  type ActionState,
} from "@/lib/actions";
import type { WorkspaceMember } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <UserPlus className="mr-2 h-4 w-4" />
      {pending ? "Adicionando..." : "Adicionar"}
    </Button>
  );
}

const initialState: ActionState = {};

/** Valor do Select que representa "sem autorizador definido" (usa o dono). */
const OWNER_DEFAULT = "owner";

export function MembersDialog({
  workspaceId,
  ownerId,
  members,
  isAdmin,
}: {
  workspaceId: number;
  ownerId: number;
  members: WorkspaceMember[];
  isAdmin: boolean;
}) {
  const [state, formAction] = useFormState(addMemberAction, initialState);
  const [removing, setRemoving] = useState<number | null>(null);
  const [savingApprover, setSavingApprover] = useState<number | null>(null);

  async function handleApprover(userId: number, value: string) {
    setSavingApprover(userId);
    const approverId = value === OWNER_DEFAULT ? null : Number(value);
    const result = await setMemberApproverAction(
      workspaceId,
      userId,
      approverId
    );
    setSavingApprover(null);
    if (result.error) toast.error(result.error);
    else toast.success("Autorizador atualizado.");
  }

  async function handleRemove(userId: number) {
    setRemoving(userId);
    const result = await removeMemberAction(workspaceId, userId);
    setRemoving(null);
    if (result.error) toast.error(result.error);
    else toast.success("Membro removido.");
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          Membros ({members.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Membros do espaço</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Adicione pessoas pelo e-mail cadastrado no sistema."
              : "Pessoas com acesso a este espaço."}
          </DialogDescription>
        </DialogHeader>

        {isAdmin && (
          <form action={formAction} className="space-y-3">
            {state.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <div className="space-y-2">
              <Label htmlFor="member-email">E-mail do usuário</Label>
              <Input
                id="member-email"
                name="email"
                type="email"
                placeholder="colega@petruz.com"
                required
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label>Papel</Label>
                <Select name="role" defaultValue="member">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SubmitButton />
            </div>
          </form>
        )}

        <Separator />

        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {members.map((member) => (
            <li
              key={member.UserId}
              className="space-y-2 rounded-md border p-2"
            >
              <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.Name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.Email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={member.Role === "admin" ? "default" : "secondary"}
                >
                  {member.UserId === ownerId
                    ? "Dono"
                    : member.Role === "admin"
                      ? "Admin"
                      : "Membro"}
                </Badge>
                {isAdmin && member.UserId !== ownerId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    disabled={removing === member.UserId}
                    onClick={() => handleRemove(member.UserId)}
                    title="Remover membro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              </div>
              {isAdmin && member.Role !== "admin" && (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <Label className="shrink-0 text-xs font-normal text-muted-foreground">
                    Autorizador
                  </Label>
                  <Select
                    value={
                      member.ApproverId != null
                        ? String(member.ApproverId)
                        : OWNER_DEFAULT
                    }
                    disabled={savingApprover === member.UserId}
                    onValueChange={(value) =>
                      handleApprover(member.UserId, value)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OWNER_DEFAULT}>
                        Dono do espaço (padrão)
                      </SelectItem>
                      {members
                        .filter((m) => m.UserId !== member.UserId)
                        .map((m) => (
                          <SelectItem key={m.UserId} value={String(m.UserId)}>
                            {m.Name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
