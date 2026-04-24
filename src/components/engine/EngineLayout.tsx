import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EngineLayoutProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Main column (form / list). */
  children: ReactNode;
  /** Optional right rail (preview, helper). */
  aside?: ReactNode;
  className?: string;
}

/**
 * Page-level layout for every engine surface (Offers, Distribution, etc.).
 * Provides a consistent header, primary action slot, and optional preview rail.
 */
export function EngineLayout({
  title,
  description,
  actions,
  children,
  aside,
  className,
}: EngineLayoutProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl space-y-6", className)}>
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>

      {aside ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">{children}</div>
          <aside className="min-w-0">{aside}</aside>
        </div>
      ) : (
        <div className="space-y-6">{children}</div>
      )}
    </div>
  );
}
