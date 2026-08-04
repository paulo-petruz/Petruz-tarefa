"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronRight, Gauge, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteProductionLogAction,
  listProductionLogAction,
  registerProductionAction,
} from "@/lib/actions";
import type { ProductionLogEntry } from "@/lib/data";
import { formatDuration, formatPace, getProductionInfo } from "@/lib/production";
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
import { cn } from "@/lib/utils";

/**
 * Pílula de produção da tarefa mensurável: mostra a quantidade e o ritmo ao
 * vivo e, para quem pode editar, abre o registro de lotes (quantidade + tempo)
 * com histórico.
 */
export function TaskProductionButton({
  taskId,
  standardSeconds,
  prodQty,
  prodSeconds,
  editable,
}: {
  taskId: number;
  standardSeconds: number | null;
  prodQty: number;
  prodSeconds: number;
  editable: boolean;
}) {
  const info = getProductionInfo(standardSeconds, prodQty, prodSeconds);
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ProductionLogEntry[] | null>(null);
  const [qty, setQty] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let active = true;
    setEntries(null);
    listProductionLogAction(taskId).then((res) => {
      if (active) setEntries(res.entries ?? []);
    });
    return () => {
      active = false;
    };
  }, [open, taskId]);

  if (!info) return null;

  const toneClass =
    info.withinMeta == null
      ? "border-border bg-muted text-foreground hover:bg-muted/70"
      : info.withinMeta
        ? "border-emerald-600 bg-emerald-500 text-white hover:bg-emerald-600"
        : "border-amber-600 bg-amber-500 text-white hover:bg-amber-600";

  const summary =
    info.perUnitSeconds != null
      ? `${info.totalQty} · ${formatPace(info.perUnitSeconds)}/un`
      : `${info.totalQty}`;

  const tooltip =
    `${info.totalQty} · ${formatDuration(info.totalSeconds)}` +
    (info.perUnitSeconds != null
      ? ` · ${formatPace(info.perUnitSeconds)}/un (padrão ${formatPace(info.standardSeconds)}/un) — ${info.withinMeta ? "na meta" : "acima da meta"}`
      : ` · padrão ${formatPace(info.standardSeconds)}/un`);

  const pillClass = cn(
    "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold shadow-sm transition-colors",
    toneClass
  );

  if (!editable) {
    return (
      <span className={pillClass} title={tooltip}>
        <Gauge className="h-3.5 w-3.5 shrink-0" />
        {summary}
      </span>
    );
  }

  function handleRegister() {
    const q = Number(qty);
    const m = Number(minutes);
    if (!Number.isInteger(q) || q <= 0) {
      toast.error("Quantidade deve ser um inteiro maior que zero.");
      return;
    }
    if (!(m > 0)) {
      toast.error("Informe o tempo do lote em minutos.");
      return;
    }
    startTransition(async () => {
      const res = await registerProductionAction(taskId, q, m, note);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Produção registrada.");
      setQty("");
      setMinutes("");
      setNote("");
      const list = await listProductionLogAction(taskId);
      setEntries(list.entries ?? []);
    });
  }

  function handleDelete(logId: number) {
    startTransition(async () => {
      const res = await deleteProductionLogAction(logId, taskId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const list = await listProductionLogAction(taskId);
      setEntries(list.entries ?? []);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={pillClass}
          title={`${tooltip} — clique para registrar`}
        >
          <Gauge className="h-3.5 w-3.5 shrink-0" />
          {summary}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Produção</DialogTitle>
          <DialogDescription>
            Registre a produção por lote — quantidade e tempo gasto.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{info.totalQty}</span>
            <span className="text-muted-foreground">
              {formatDuration(info.totalSeconds)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Padrão: {formatPace(info.standardSeconds)}/un
            </span>
            {info.perUnitSeconds != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-medium",
                  info.withinMeta
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                )}
              >
                {formatPace(info.perUnitSeconds)}/un —{" "}
                {info.withinMeta ? "na meta" : "acima"}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prod-qty">Quantidade</Label>
              <Input
                id="prod-qty"
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Ex.: 12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prod-min">Tempo (min)</Label>
              <Input
                id="prod-min"
                type="number"
                min={0}
                step="any"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Ex.: 50"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prod-note">Observação (opcional)</Label>
            <Input
              id="prod-note"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button onClick={handleRegister} disabled={pending} className="w-full">
            <Plus className="mr-1.5 h-4 w-4" />
            {pending ? "Salvando..." : "Registrar lote"}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Lançamentos
          </p>
          {entries == null ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum lançamento ainda.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {entries.map((e) => (
                <li
                  key={e.Id}
                  className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{e.Quantity}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {formatDuration(e.DurationSeconds)}
                      {" · "}
                      {formatPace(e.DurationSeconds / e.Quantity)}/un
                    </span>
                    {e.Note && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {e.Note}
                      </span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {e.UserName} ·{" "}
                      {new Date(e.LoggedAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    title="Excluir lançamento"
                    disabled={pending}
                    onClick={() => handleDelete(e.Id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
