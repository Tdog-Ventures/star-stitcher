import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type EngineStatus =
  | "draft"
  | "ready"
  | "planned"
  | "scheduled"
  | "queued"
  | "running"
  | "sent"
  | "completed"
  | "failed"
  | "archived";

const STATUS_STYLES: Record<EngineStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-primary/10 text-primary border-primary/20",
  planned: "bg-secondary text-secondary-foreground",
  scheduled: "bg-accent text-accent-foreground",
  queued: "bg-secondary text-secondary-foreground",
  running: "bg-primary/10 text-primary border-primary/20",
  sent: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  archived: "bg-muted/40 text-muted-foreground line-through",
};

const STATUS_LABEL: Record<EngineStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  planned: "Planned",
  scheduled: "Scheduled",
  queued: "Queued",
  running: "Running",
  sent: "Sent",
  completed: "Completed",
  failed: "Failed",
  archived: "Archived",
};

interface StatusBadgeProps {
  status: EngineStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border", STATUS_STYLES[status], className)}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}
