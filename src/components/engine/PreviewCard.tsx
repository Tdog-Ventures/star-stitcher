import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatusBadge, EngineStatus } from "./StatusBadge";

interface PreviewCardProps {
  title: string;
  status?: EngineStatus;
  meta?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

/**
 * Right-rail preview of any generated/edited record before it is saved.
 * Manual edits in the form should reflect here in real time.
 */
export function PreviewCard({
  title,
  status,
  meta,
  children,
  className,
  footer,
}: PreviewCardProps) {
  return (
    <Card className={cn("sticky top-20", className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {status && <StatusBadge status={status} />}
        </div>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed text-foreground">
        {children}
      </CardContent>
      {footer && (
        <div className="border-t border-border px-6 py-4">{footer}</div>
      )}
    </Card>
  );
}
