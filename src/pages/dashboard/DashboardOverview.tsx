import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Layers,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EngineLayout, StatusBadge, type EngineStatus } from "@/components/engine";
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

const QUICK_ACTIONS = [
  {
    to: "/engines/offer",
    title: "Create offer",
    description: "Open the Offer Engine and structure a new offer.",
    icon: Plus,
  },
  {
    to: "/assets",
    title: "View assets",
    description: "Browse everything you've saved across engines.",
    icon: Layers,
  },
  {
    to: "/distribution",
    title: "Schedule distribution",
    description: "Plan when and where assets go out.",
    icon: Send,
  },
  {
    to: "/engines/offer/history",
    title: "View performance",
    description: "Compare offers, channels, and revenue.",
    icon: BarChart3,
  },
];

interface RecentOffer {
  id: string;
  title: string;
  status: string;
  created_at: string;
}
interface RecentAsset {
  id: string;
  title: string;
  engine_key: string;
  status: string;
  created_at: string;
}
interface RecentTask {
  id: string;
  task_title: string;
  channel: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}


interface Stats {
  offers: number;
  assets: number;
  scheduled: number;
  completed: number;
}

const DashboardOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ offers: 0, assets: 0, scheduled: 0, completed: 0 });
  const [recentOffers, setRecentOffers] = useState<RecentOffer[]>([]);
  const [recentAssets, setRecentAssets] = useState<RecentAsset[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
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
      const [offers, assets, scheduled, completed, tasksAll, recentOffersRes, recentAssetsRes, recentTasksRes] = await Promise.all([
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
        supabase
          .from("offers")
          .select("id, title, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("assets")
          .select("id, title, engine_key, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("distribution_tasks")
          .select("id, task_title, channel, status, scheduled_at, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
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
      setRecentOffers((recentOffersRes.data ?? []) as RecentOffer[]);
      setRecentAssets((recentAssetsRes.data ?? []) as RecentAsset[]);
      setRecentTasks((recentTasksRes.data ?? []) as RecentTask[]);
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

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ to, title, description, icon: Icon }) => (
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
        </div>
      </section>

      {!isFreshAccount ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent activity
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <RecentList
              title="Latest offers"
              icon={FileText}
              emptyTo="/engines/offer"
              emptyLabel="Create an offer"
              items={recentOffers.map((o) => ({
                id: o.id,
                primary: o.title,
                secondary: new Date(o.created_at).toLocaleDateString(),
                status: o.status as EngineStatus,
              }))}
              viewAllTo="/engines/offer/history"
            />
            <RecentList
              title="Latest assets"
              icon={Layers}
              emptyTo="/engines/offer"
              emptyLabel="Save your first asset"
              items={recentAssets.map((a) => ({
                id: a.id,
                primary: a.title,
                secondary: `${a.engine_key} · ${new Date(a.created_at).toLocaleDateString()}`,
                status: a.status as EngineStatus,
              }))}
              viewAllTo="/assets"
            />
            <RecentList
              title="Latest distribution tasks"
              icon={Send}
              emptyTo="/assets"
              emptyLabel="Schedule a task"
              items={recentTasks.map((t) => ({
                id: t.id,
                primary: t.task_title,
                secondary: `${t.channel}${t.scheduled_at ? ` · ${new Date(t.scheduled_at).toLocaleString()}` : ""}`,
                status: t.status as EngineStatus,
              }))}
              viewAllTo="/distribution"
            />
          </div>
        </section>
      ) : null}


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

interface RecentItem {
  id: string;
  primary: string;
  secondary: string;
  status?: EngineStatus;
}

interface RecentListProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: RecentItem[];
  emptyTo: string;
  emptyLabel: string;
  viewAllTo: string;
}

const RecentList = ({ title, icon: Icon, items, emptyTo, emptyLabel, viewAllTo }: RecentListProps) => (
  <Card>
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </CardTitle>
      {items.length > 0 ? (
        <Link
          to={viewAllTo}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          View all
        </Link>
      ) : null}
    </CardHeader>
    <CardContent>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center">
          <p className="text-xs text-muted-foreground">Nothing here yet.</p>
          <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
            <Link to={emptyTo}>
              {emptyLabel}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{it.primary}</p>
                <p className="truncate text-xs text-muted-foreground">{it.secondary}</p>
              </div>
              {it.status ? <StatusBadge status={it.status} /> : null}
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

export default DashboardOverview;
