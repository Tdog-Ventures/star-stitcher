import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EngineLayout } from "@/components/engine";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

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

interface Stats {
  offers: number;
  assets: number;
  scheduled: number;
  completed: number;
}

const DashboardOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ offers: 0, assets: 0, scheduled: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [offers, assets, scheduled, completed] = await Promise.all([
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("assets").select("id", { count: "exact", head: true }),
        supabase
          .from("distribution_tasks")
          .select("id", { count: "exact", head: true })
          .not("scheduled_at", "is", null),
        supabase
          .from("distribution_tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed"),
      ]);
      if (cancelled) return;
      setStats({
        offers: offers.count ?? 0,
        assets: assets.count ?? 0,
        scheduled: scheduled.count ?? 0,
        completed: completed.count ?? 0,
      });
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const cards = [
    { label: "Offers created", value: stats.offers, hint: "All-time", icon: FileText },
    { label: "Assets created", value: stats.assets, hint: "Across all engines", icon: Layers },
    { label: "Tasks scheduled", value: stats.scheduled, hint: "Have a date set", icon: Send },
    {
      label: "Completed distributions",
      value: stats.completed,
      hint: "Marked as sent",
      icon: CheckCircle2,
    },
  ];

  return (
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
        {cards.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {loading ? "—" : value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
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
            <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </Link>
        ))}
      </section>

      {!loading && stats.offers === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first offer to populate this dashboard.
          </p>
        </section>
      ) : null}
    </EngineLayout>
  );
};

export default DashboardOverview;
