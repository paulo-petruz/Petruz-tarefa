"use client";

import { useEffect, useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { resetPasswordAction, type ActionState } from "@/lib/actions";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

function generatePassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Salvando..." : "Resetar senha"}
    </Button>
  );
}

const initialState: ActionState = {};

export function ResetPasswordDialog({
  userId,
  userName,
}: {
  userId: number;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [state, formAction] = useFormState(resetPasswordAction, initialState);

  useEffect(() => {
    if (open && state.success) {
      toast.success(`Senha de ${userName} alterada. Informe a nova senha ao usuário.`);
      setOpen(false);
      setPassword("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="mr-2 h-4 w-4" />
          Resetar senha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Resetar senha de {userName}</DialogTitle>
          <DialogDescription>
            Defina a nova senha e repasse ao usuário por um canal seguro.
            Recomende que ele a troque depois.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <input type="hidden" name="userId" value={userId} />
          <div className="space-y-2">
            <Label htmlFor={`new-password-${userId}`}>Nova senha</Label>
            <div className="flex gap-2">
              <Input
                id={`new-password-${userId}`}
                name="password"
                type="text"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                title="Gerar senha aleatória"
                onClick={() => setPassword(generatePassword())}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
