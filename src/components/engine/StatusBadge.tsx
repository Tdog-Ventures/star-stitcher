import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type EngineStatus =
  | "draft"
  | "ready"
  | "planned"
  | "scheduled"
  | "sent"
  | "archived";

const STATUS_STYLES: Record<EngineStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-primary/10 text-primary border-primary/20",
  planned: "bg-secondary text-secondary-foreground",
  scheduled: "bg-accent text-accent-foreground",
  sent: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  archived: "bg-muted/40 text-muted-foreground line-through",
};

const STATUS_LABEL: Record<EngineStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  planned: "Planned",
  scheduled: "Scheduled",
  sent: "Sent",
  archived: "Archived",
};

interface StatusBadgeProps {
  status: EngineStatus;
  className?: string;
}

/**
 * Manual-first status indicator used across offers, assets, and distribution tasks.
 * Keeps a calm SaaS palette — no flashy colours.
 */
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
