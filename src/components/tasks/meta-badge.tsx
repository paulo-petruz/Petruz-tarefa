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

  return (
    <Badge
      title={info.label}
      className={cn(
        "gap-0.5 px-1.5 py-0 text-[10px] font-medium leading-4",
        styles[info.state],
        className
      )}
    >
      <Target className="h-2.5 w-2.5 shrink-0" />
      {info.shortLabel}
    </Badge>
  );
}
