import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EngineLayout } from "@/components/engine";
import { OnboardingChecklist } from "@/components/engine/OnboardingChecklist";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  computeOnboardingState,
  dismissOnboarding,
  hasExportedCsv,
  isOnboardingDismissed,
  onboardingProgress,
  restoreOnboarding,
  type OnboardingSignals,
} from "@/lib/onboarding";

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
  const [signals, setSignals] = useState<OnboardingSignals>({
    offers: 0,
    assets: 0,
    tasks: 0,
    hasCompletedWithPerformance: false,
    hasAnyPerformance: false,
    csvExported: false,
  });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(isOnboardingDismissed(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [offers, assets, scheduled, completed, tasksAll] = await Promise.all([
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
        supabase
          .from("distribution_tasks")
          .select("status, impressions, clicks, conversions, revenue_cents"),
      ]);
      if (cancelled) return;

      const taskRows = (tasksAll.data ?? []) as Array<{
        status: string;
        impressions: number | null;
        clicks: number | null;
        conversions: number | null;
        revenue_cents: number | null;
      }>;
      const hasPerf = (t: (typeof taskRows)[number]) =>
        (t.impressions ?? 0) > 0 ||
        (t.clicks ?? 0) > 0 ||
        (t.conversions ?? 0) > 0 ||
        (t.revenue_cents ?? 0) > 0;

      setStats({
        offers: offers.count ?? 0,
        assets: assets.count ?? 0,
        scheduled: scheduled.count ?? 0,
        completed: completed.count ?? 0,
      });
      setSignals({
        offers: offers.count ?? 0,
        assets: assets.count ?? 0,
        tasks: taskRows.length,
        hasCompletedWithPerformance: taskRows.some(
          (t) => t.status === "completed" && hasPerf(t),
        ),
        hasAnyPerformance: taskRows.some(hasPerf),
        csvExported: hasExportedCsv(user.id),
      });
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const onboardingState = computeOnboardingState(signals);
  const { done, total } = onboardingProgress(onboardingState);
  const showChecklist = !dismissed && !loading;
  const isFreshAccount = !loading && stats.offers === 0;

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
        <div className="flex flex-wrap items-center gap-2">
          {dismissed ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                restoreOnboarding(user?.id);
                setDismissed(false);
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Show onboarding
            </Button>
          ) : null}
          {isFreshAccount ? (
            <Button asChild>
              <Link to="/engines/offer">
                Start here
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/engines">
                New offer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      }
    >
      {showChecklist ? (
        <OnboardingChecklist
          state={onboardingState}
          onDismiss={() => {
            dismissOnboarding(user?.id);
            setDismissed(true);
          }}
        />
      ) : null}

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

      {isFreshAccount ? (
        <section className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first offer to populate this dashboard.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/engines/offer">
              Start here
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      ) : null}

      {!showChecklist && !loading && done < total ? (
        <p className="text-xs text-muted-foreground">
          Onboarding hidden ·{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => {
              restoreOnboarding(user?.id);
              setDismissed(false);
            }}
          >
            show again
          </button>
        </p>
      ) : null}
    </EngineLayout>
  );
};

export default DashboardOverview;
