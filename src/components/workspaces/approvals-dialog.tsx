"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, X } from "lucide-react";
import { toast } from "sonner";
import { decideApprovalRequestAction } from "@/lib/actions";
import type { ApprovalRequest } from "@/lib/data";
import { approvalTypeLabel } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500 text-white hover:bg-amber-500",
    approved: "bg-emerald-500 text-white hover:bg-emerald-500",
    declined: "bg-destructive text-destructive-foreground hover:bg-destructive",
  };
  const labels: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovada",
    declined: "Recusada",
  };
  return (
    <Badge className={cn("shrink-0", styles[status])}>
      {labels[status] ?? status}
    </Badge>
  );
}

function RequestCard({
  request,
  children,
}: {
  request: ApprovalRequest;
  children?: React.ReactNode;
}) {
  return (
    <li className="space-y-2 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {request.TargetLabel ?? `#${request.TargetId}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {approvalTypeLabel(request.Type)} · {request.RequesterName} ·{" "}
            {formatDate(request.CreatedAt)}
          </p>
        </div>
        <StatusBadge status={request.Status} />
      </div>
      {request.Reason && (
        <p className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
          “{request.Reason}”
        </p>
      )}
      {request.DecisionNote && (
        <p className="text-xs text-muted-foreground">
          Resposta: {request.DecisionNote}
        </p>
      )}
      {children}
    </li>
  );
}

/**
 * Central de solicitações do espaço: o autorizador aprova/recusa os pedidos
 * dirigidos a ele e o solicitante acompanha o status dos seus.
 */
export function ApprovalsDialog({
  toDecide,
  mine,
}: {
  toDecide: ApprovalRequest[];
  mine: ApprovalRequest[];
}) {
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [deciding, setDeciding] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const pendingToDecide = toDecide.filter((r) => r.Status === "pending");
  const pendingCount = pendingToDecide.length;

  function handleDecide(id: number, decision: "approved" | "declined") {
    setDeciding(id);
    startTransition(async () => {
      const result = await decideApprovalRequestAction(
        id,
        decision,
        notes[id] ?? ""
      );
      setDeciding(null);
      if (result.error) toast.error(result.error);
      else {
        toast.success(
          decision === "approved" ? "Solicitação aprovada." : "Solicitação recusada."
        );
        setNotes((prev) => ({ ...prev, [id]: "" }));
      }
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <BellRing className="mr-2 h-4 w-4" />
          Solicitações
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
              {pendingCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitações</DialogTitle>
          <DialogDescription>
            Autorize ou recuse pedidos dirigidos a você e acompanhe os seus.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Para aprovar ({pendingCount})
          </p>
          {toDecide.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma solicitação dirigida a você.
            </p>
          ) : (
            <ul className="space-y-2">
              {toDecide.map((request) => (
                <RequestCard key={request.Id} request={request}>
                  {request.Status === "pending" && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Observação (opcional)"
                        maxLength={500}
                        value={notes[request.Id] ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [request.Id]: e.target.value,
                          }))
                        }
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={deciding === request.Id}
                          onClick={() => handleDecide(request.Id, "approved")}
                        >
                          <Check className="mr-1.5 h-4 w-4" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          disabled={deciding === request.Id}
                          onClick={() => handleDecide(request.Id, "declined")}
                        >
                          <X className="mr-1.5 h-4 w-4" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  )}
                </RequestCard>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Minhas solicitações
          </p>
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Você ainda não enviou solicitações.
            </p>
          ) : (
            <ul className="space-y-2">
              {mine.map((request) => (
                <RequestCard key={request.Id} request={request}>
                  <p className="text-xs text-muted-foreground">
                    Autorizador: {request.ApproverName}
                  </p>
                </RequestCard>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
