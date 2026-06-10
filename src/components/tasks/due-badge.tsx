import { AlarmClock, AlertTriangle, CalendarClock } from "lucide-react";
import { getDueInfo } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DueBadge({
  dueDate,
  status,
}: {
  dueDate: Date | string | null;
  status: string;
}) {
  const info = getDueInfo(dueDate, status);
  if (!info || info.state === "ok") return null;

  const styles = {
    overdue: "bg-destructive text-destructive-foreground hover:bg-destructive",
    today: "bg-orange-500 text-white hover:bg-orange-500",
    soon: "bg-amber-400 text-black hover:bg-amber-400",
  } as const;

  const Icon =
    info.state === "overdue"
      ? AlertTriangle
      : info.state === "today"
        ? AlarmClock
        : CalendarClock;

  return (
    <Badge className={cn("gap-1", styles[info.state])}>
      <Icon className="h-3 w-3" />
      {info.label}
    </Badge>
  );
}
