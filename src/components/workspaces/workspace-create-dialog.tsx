"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { createWorkspaceAction, type ActionState } from "@/lib/actions";
import { WORKSPACE_COLORS } from "@/lib/constants";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Criando..." : "Criar espaço"}
    </Button>
  );
}

const initialState: ActionState = {};

export function WorkspaceCreateDialog({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [color, setColor] = useState<string>(WORKSPACE_COLORS[0]);
  const [state, formAction] = useFormState(createWorkspaceAction, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo espaço
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo espaço de trabalho</DialogTitle>
          <DialogDescription>
            Organize as tarefas da sua equipe em um espaço dedicado.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="ws-name">Nome</Label>
            <Input
              id="ws-name"
              name="name"
              placeholder="Ex.: Marketing, Produção..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-description">Descrição (opcional)</Label>
            <Textarea
              id="ws-description"
              name="description"
              rows={3}
              placeholder="Para que serve este espaço?"
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <input type="hidden" name="color" value={color} />
            <div className="flex gap-2">
              {WORKSPACE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition",
                    color === c
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
