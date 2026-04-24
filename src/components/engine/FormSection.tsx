import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Right-aligned action slot (e.g. helper button, AI assist trigger). */
  action?: ReactNode;
}

/**
 * Grouped block of form fields with a clear title + optional helper text.
 * Reused across every engine form so manual entry feels consistent.
 */
export function FormSection({
  title,
  description,
  children,
  className,
  action,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
