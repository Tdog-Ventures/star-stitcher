import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  FileText,
  Layers,
  ListChecks,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, type EngineStatus } from "@/components/engine/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { TASK_STATUSES, type TaskStatus } from "@/lib/distribution";

interface OfferRow {
  id: string;
}
interface AssetRow {
  id: string;
}
interface TaskRow {
  id: string;
  status: string;
  channel: string;
  campaign_name: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  updated_at: string;
}
interface AnalyticsRow {
  id: string;
  event_name: string;
  properties: Record<string, unknown> | null;
  created_at: string;
}

type ModuleEvent =
  | "offer_saved"
  | "asset_created"
  | "distribution_task_created"
  | "distribution_task_ready";

const MODULE_EVENTS: { key: ModuleEvent; label: string }[] = [
  { key: "offer_saved", label: "Offers saved" },
  { key: "asset_created", label: "Assets created" },
  { key: "distribution_task_created", label: "Tasks created" },
  { key: "distribution_task_ready", label: "Tasks marked ready" },
];

const isAllowedStatus = (s: string): s is TaskStatus =>
  (TASK_STATUSES as readonly string[]).includes(s);

const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

const propString = (props: Record<string, unknown> | null, key: string): string => {
  if (!props) return "";
  const v = props[key];
  return typeof v === "string" ? v : "";
};

const inferEventType = (eventName: string): string => {
  if (eventName.startsWith("offer_")) return "offer";
  if (eventName.startsWith("asset_")) return "asset";
  if (eventName.startsWith("distribution_")) return "distribution";
  return "other";
};

const CommandBoard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offerCount, setOfferCount] = useState(0);
  const [assetCount, setAssetCount] = useState(0);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [events, setEvents] = useState<AnalyticsRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const [offersRes, assetsRes, tasksRes, eventsRes] = await Promise.all([
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("assets").select("id", { count: "exact", head: true }),
        supabase
          .from("distribution_tasks")
          .select(
            "id, status, channel, campaign_name, scheduled_at, sent_at, updated_at",
          )
          .order("updated_at", { ascending: false })
          .limit(500),
        supabase
          .from("analytics_events")
          .select("id, event_name, properties, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (cancelled) return;

      const firstError =
        offersRes.error?.message ||
        assetsRes.error?.message ||
        tasksRes.error?.message ||
        eventsRes.error?.message;
      if (firstError) {
        setError(firstError);
        setLoading(false);
        return;
      }

      setOfferCount(offersRes.count ?? 0);
      setAssetCount(assetsRes.count ?? 0);
      setTasks((tasksRes.data ?? []) as TaskRow[]);
      setEvents((eventsRes.data ?? []) as AnalyticsRow[]);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const taskStats = useMemo(() => {
    const base = { total: tasks.length, queued: 0, completed: 0, failed: 0 };
    for (const t of tasks) {
      if (t.status === "queued") base.queued += 1;
      else if (t.status === "completed") base.completed += 1;
      else if (t.status === "failed") base.failed += 1;
    }
    return base;
  }, [tasks]);

  const moduleUsage = useMemo(() => {
    const counts: Record<ModuleEvent, number> = {
      offer_saved: 0,
      asset_created: 0,
      distribution_task_created: 0,
      distribution_task_ready: 0,
    };
    for (const e of events) {
      if ((e.event_name as ModuleEvent) in counts) {
        counts[e.event_name as ModuleEvent] += 1;
      }
    }
    return counts;
  }, [events]);

  const recentTasks = useMemo(() => tasks.slice(0, 8), [tasks]);
  const recentEvents = useMemo(() => events.slice(0, 12), [events]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading command center…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load admin data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Command Board
        </h1>
        <p className="text-sm text-muted-foreground">
          Cross-workspace visibility into the Offer + Distribution Engine.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total offers" value={offerCount} icon={FileText} />
        <Stat label="Total assets" value={assetCount} icon={Layers} />
        <Stat label="Total tasks" value={taskStats.total} icon={ListChecks} />
        <Stat label="Queued" value={taskStats.queued} icon={Send} tone="primary" />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Completed" value={taskStats.completed} icon={CheckCircle2} tone="success" />
        <Stat label="Failed" value={taskStats.failed} icon={XCircle} tone="destructive" />
        <Stat
          label="Recent events"
          value={events.length}
          icon={Activity}
          hint="last 200"
        />
        <Stat
          label="Active modules"
          value={MODULE_EVENTS.filter((m) => moduleUsage[m.key] > 0).length}
          icon={Layers}
          hint={`of ${MODULE_EVENTS.length}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Module usage</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {MODULE_EVENTS.map((m) => (
            <Card key={m.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {m.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">
                  {moduleUsage[m.key]}
                </p>
                <p className="mt-1 text-xs text-muted-foreground font-mono">{m.key}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
        {recentEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No analytics events recorded yet.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Page</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.map((e) => {
                  const path =
                    propString(e.properties, "path") ||
                    propString(e.properties, "page_path");
                  const type =
                    propString(e.properties, "type") || inferEventType(e.event_name);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-foreground font-mono text-xs">
                        {e.event_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {type}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground font-mono text-xs">
                        {path || "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDateTime(e.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Task health</h2>
        {recentTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No distribution tasks have been planned yet.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Scheduled</TableHead>
                  <TableHead className="hidden lg:table-cell">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTasks.map((t) => {
                  const status = isAllowedStatus(t.status) ? t.status : "draft";
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-foreground">
                        {t.campaign_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.channel}</TableCell>
                      <TableCell>
                        <StatusBadge status={status as EngineStatus} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatDateTime(t.scheduled_at)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {formatDateTime(t.sent_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
};

interface StatProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "primary" | "success" | "destructive";
  hint?: string;
}

const Stat = ({ label, value, icon: Icon, tone = "default", hint }: StatProps) => {
  const valueClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${valueClass}`}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
};

export default CommandBoard;
