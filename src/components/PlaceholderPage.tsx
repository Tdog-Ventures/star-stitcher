import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlaceholderPageProps {
  title: string;
  phase: string;
  description: string;
  children?: ReactNode;
}

/**
 * Phase 1 scaffolding page. Each route shows what will live here in later phases.
 */
export function PlaceholderPage({ title, phase, description, children }: PlaceholderPageProps) {
  return (
    <div className="container py-10">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <Badge variant="secondary">{phase}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground">
            Coming in {phase}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{description}</p>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
