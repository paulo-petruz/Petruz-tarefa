import { Target } from "lucide-react";
import { getMetaInfo } from "@/lib/meta";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Indicador da meta de subtarefas em aberto na tarefa-mãe.
 * Verde = dentro da meta; vermelho = acima do teto; âmbar = abaixo do piso.
 */
export function MetaBadge({
  metaType,
  metaValue,
  subtaskCount,
  subtaskDone,
  className,
}: {
  metaType: string | null;
  metaValue: number | null;
  subtaskCount: number;
  subtaskDone: number;
  className?: string;
}) {
  const info = getMetaInfo(metaType, metaValue, subtaskCount, subtaskDone);
  if (!info) return null;

  const styles = {
    within: "bg-emerald-500 text-white hover:bg-emerald-500",
    exceeded: "bg-destructive text-destructive-foreground hover:bg-destructive",
    below: "bg-amber-500 text-white hover:bg-amber-500",
  } as const;

  const stateWord =
    info.state === "exceeded"
      ? "acima"
      : info.state === "below"
        ? "abaixo"
        : null;

  return (
    <Badge
      title={info.label}
      className={cn(
        "gap-1 px-2 py-0.5 text-xs font-semibold",
        styles[info.state],
        className
      )}
    >
      <Target className="h-3.5 w-3.5 shrink-0" />
      {info.shortLabel}
      {stateWord && (
        <span className="font-medium opacity-90">· {stateWord}</span>
      )}
    </Badge>
  );
}
