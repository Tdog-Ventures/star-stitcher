import { Link } from "react-router-dom";
import { ArrowRight, FileText, Layers, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EngineLayout } from "@/components/engine";

const QUICK_STATS = [
  { label: "Active offers", value: "0", hint: "Drafted this month" },
  { label: "Saved assets", value: "0", hint: "Across all channels" },
  { label: "Tasks planned", value: "0", hint: "Waiting to send" },
  { label: "Sent this week", value: "0", hint: "Manually marked" },
];

const SHORTCUTS = [
  {
    to: "/engines",
    title: "Open an engine",
    description: "Turn a rough idea into a structured offer.",
    icon: Sparkles,
  },
  {
    to: "/assets",
    title: "Browse assets",
    description: "Reuse anything you've already written.",
    icon: Layers,
  },
  {
    to: "/distribution",
    title: "Plan distribution",
    description: "Map saved assets to channels and dates.",
    icon: Send,
  },
];

const DashboardOverview = () => (
  <EngineLayout
    title="Dashboard"
    description="One source of truth for your offers, assets, and distribution. Manual-first — AI just speeds you up."
    actions={
      <Button asChild>
        <Link to="/engines">
          New offer
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    }
  >
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {QUICK_STATS.map((s) => (
        <Card key={s.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
          </CardContent>
        </Card>
      ))}
    </section>

    <section className="grid gap-4 md:grid-cols-3">
      {SHORTCUTS.map(({ to, title, description, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="group rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </Link>
      ))}
    </section>

    <section className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium text-foreground">
        Nothing here yet
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Create your first offer to populate this dashboard.
      </p>
    </section>
  </EngineLayout>
);

export default DashboardOverview;
