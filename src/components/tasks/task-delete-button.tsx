"use client";

import { useState, useTransition } from "react";
import { ShieldQuestion, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTaskAction, requestTaskDeletionAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Exclui a tarefa (dono/admin do espaço) ou abre uma solicitação de exclusão
 * para o autorizador do usuário (demais membros).
 */
export function TaskDeleteButton({
  taskId,
  taskTitle,
  requiresApproval = false,
  approverName,
}: {
  taskId: number;
  taskTitle?: string;
  /** True quando o usuário precisa de autorização para excluir. */
  requiresApproval?: boolean;
  /** Nome do autorizador, exibido na confirmação. */
  approverName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTaskAction(taskId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Tarefa excluída.");
        setOpen(false);
      }
    });
  }

  function handleRequest() {
    startTransition(async () => {
      const result = await requestTaskDeletionAction(taskId, reason);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Solicitação enviada para o autorizador.");
        setReason("");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          title={requiresApproval ? "Solicitar exclusão" : "Excluir tarefa"}
        >
          {requiresApproval ? (
            <ShieldQuestion className="h-4 w-4" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {requiresApproval ? "Solicitar exclusão" : "Excluir"}{" "}
            {taskTitle ? `“${taskTitle}”` : "tarefa"}?
          </DialogTitle>
          <DialogDescription>
            {requiresApproval
              ? `A exclusão precisa ser autorizada${
                  approverName ? ` por ${approverName}` : ""
                }. A tarefa só será excluída após a aprovação.`
              : "A tarefa e suas subtarefas serão excluídas permanentemente."}
          </DialogDescription>
        </DialogHeader>

        {requiresApproval && (
          <div className="space-y-2">
            <Label htmlFor={`reason-${taskId}`}>Motivo (opcional)</Label>
            <Textarea
              id={`reason-${taskId}`}
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique por que a tarefa deve ser excluída."
            />
          </div>
        )}

        <DialogFooter>
          {requiresApproval ? (
            <Button
              onClick={handleRequest}
              disabled={pending}
              className="w-full"
            >
              {pending ? "Enviando..." : "Enviar solicitação"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
              className="w-full"
            >
              {pending ? "Excluindo..." : "Excluir tarefa"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
