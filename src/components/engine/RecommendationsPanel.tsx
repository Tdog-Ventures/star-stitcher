import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Recommendation } from "@/lib/performance";

interface Props {
  recommendations: Recommendation[];
  title?: string;
}

const ICONS = {
  info: Info,
  warn: AlertTriangle,
  success: CheckCircle2,
};

const TONE = {
  info: "text-foreground",
  warn: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-600 dark:text-emerald-400",
};

export const RecommendationsPanel = ({
  recommendations,
  title = "Optimization recommendations",
}: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recommendations right now — everything looks healthy. Keep logging metrics on
            completed tasks to surface new insights.
          </p>
        ) : (
          <ul className="space-y-3">
            {recommendations.map((r) => {
              const Icon = ICONS[r.severity];
              return (
                <li
                  key={r.id}
                  className="flex gap-3 rounded-md border border-border bg-muted/30 p-3"
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE[r.severity]}`} />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
