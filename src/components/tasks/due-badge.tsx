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
    <Badge
      title={info.label}
      className={cn(
        "gap-0.5 px-1.5 py-0 text-[10px] font-medium leading-4",
        styles[info.state]
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {info.shortLabel}
    </Badge>
  );
}
