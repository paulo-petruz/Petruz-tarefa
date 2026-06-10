import { priorityLabel } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground hover:bg-muted",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300 hover:bg-orange-500/15",
  urgent: "bg-red-500/15 text-red-700 dark:text-red-300 hover:bg-red-500/15",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge className={cn("font-normal", PRIORITY_STYLES[priority])}>
      {priorityLabel(priority)}
    </Badge>
  );
}
