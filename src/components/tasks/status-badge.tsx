import { statusLabel } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_BADGE_STYLES: Record<string, string> = {
  todo: "bg-slate-500/15 text-slate-700 dark:text-slate-300 hover:bg-slate-500/15",
  in_progress:
    "bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15",
  review:
    "bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15",
  done: "bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/15",
};

/** Versão somente leitura do status (para quem não pode editar a tarefa). */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("font-normal", STATUS_BADGE_STYLES[status])}>
      {statusLabel(status)}
    </Badge>
  );
}
