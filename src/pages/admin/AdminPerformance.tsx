import { useEffect, useMemo, useState } from "react";
import { Award, BarChart3, Download, Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CHANNELS, TASK_STATUSES, type TaskStatus } from "@/lib/distribution";
import { StatusBadge, type EngineStatus } from "@/components/engine/StatusBadge";
import { RecommendationsPanel } from "@/components/engine/RecommendationsPanel";
import {
  buildRecommendations,
  computeTotals,
  downloadCsv,
  filterTasks,
  formatCents,
  formatPct,
  PERF_SORT_OPTIONS,
  type PerfSortKey,
  type PerfTask,
  rankByCampaign,
  rankByChannel,
  rankByOffer,
  sortTasks,
  tasksToCsv,
} from "@/lib/performance";

interface RawTask {
  id: string;
  task_title: string;
  campaign_name: string | null;
  channel: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_cents: number;
  linked_offer_id: string | null;
  user_id: string;
}

const isAllowedStatus = (s: string): s is TaskStatus =>
  (TASK_STATUSES as readonly string[]).includes(s);

const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

const AdminPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<RawTask[]>([]);
  const [offerTitles, setOfferTitles] = useState<Record<string, string>>({});

  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<PerfSortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("distribution_tasks")
        .select(
          "id, task_title, campaign_name, channel, status, scheduled_at, sent_at, impressions, clicks, conversions, revenue_cents, linked_offer_id, user_id",
        )
        .order("updated_at", { ascending: false })
        .limit(1000);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as RawTask[];
      setTasks(rows);

      const offerIds = Array.from(
        new Set(rows.map((r) => r.linked_offer_id).filter((v): v is string => !!v)),
      );
      if (offerIds.length > 0) {
        const { data: offers } = await supabase
          .from("offers")
          .select("id, title")
          .in("id", offerIds);
        if (!cancelled && offers) {
          const map: Record<string, string> = {};
          for (const o of offers as { id: string; title: string }[]) map[o.id] = o.title;
          setOfferTitles(map);
        }
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const perfTasks = useMemo<PerfTask[]>(
    () =>
      tasks.map((t) => ({
        id: t.id,
        channel: t.channel,
        status: t.status,
        impressions: t.impressions ?? 0,
        clicks: t.clicks ?? 0,
        conversions: t.conversions ?? 0,
        revenue_cents: t.revenue_cents ?? 0,
        campaign_name: t.campaign_name,
        task_title: t.task_title,
        scheduled_at: t.scheduled_at,
        sent_at: t.sent_at,
        linked_offer_id: t.linked_offer_id,
      })),
    [tasks],
  );

  const filtered = useMemo(() => {
    const base = filterTasks(perfTasks, {
      channel: channelFilter,
      status: statusFilter,
    });
    return sortTasks(base, sortKey, sortDir);
  }, [perfTasks, channelFilter, statusFilter, sortKey, sortDir]);

  const totals = useMemo(() => computeTotals(perfTasks), [perfTasks]);
  const channels = useMemo(() => rankByChannel(perfTasks), [perfTasks]);
  const offers = useMemo(() => rankByOffer(perfTasks), [perfTasks]);
  const campaigns = useMemo(() => rankByCampaign(perfTasks), [perfTasks]);
  const recs = useMemo(() => buildRecommendations(perfTasks), [perfTasks]);

  const handleExport = () => {
    const csv = tasksToCsv(filtered);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadCsv(`admin-performance-${stamp}.csv`, csv);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading performance data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load performance data: {error}
      </div>
    );
  }

  const userCount = new Set(tasks.map((t) => t.user_id)).size;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Performance Board
          </h1>
          <p className="text-sm text-muted-foreground">
            Cross-workspace performance across {tasks.length.toLocaleString()} task
            {tasks.length === 1 ? "" : "s"} from {userCount} workspace
            {userCount === 1 ? "" : "s"}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Revenue" value={formatCents(totals.revenue_cents)} icon={TrendingUp} />
        <KpiCard label="Impressions" value={totals.impressions.toLocaleString()} icon={BarChart3} />
        <KpiCard label="Overall CTR" value={formatPct(totals.ctr)} icon={BarChart3} />
        <KpiCard
          label="Conv. rate"
          value={formatPct(totals.conversionRate)}
          icon={Award}
        />
      </section>

      <RecommendationsPanel
        recommendations={recs}
        title="Platform-wide recommendations"
      />

      <section className="grid gap-3 lg:grid-cols-3">
        <ComparisonCard
          title="By channel"
          rows={channels.slice(0, 5).map((g) => ({
            key: g.key,
            label: g.key,
            tasks: g.totals.taskCount,
            revenue: g.totals.revenue_cents,
            ctr: g.totals.ctr,
            impressions: g.totals.impressions,
          }))}
        />
        <ComparisonCard
          title="By offer"
          rows={offers.slice(0, 5).map((g) => ({
            key: g.key,
            label: offerTitles[g.key] ?? "Unknown offer",
            tasks: g.totals.taskCount,
            revenue: g.totals.revenue_cents,
            ctr: g.totals.ctr,
            impressions: g.totals.impressions,
          }))}
        />
        <ComparisonCard
          title="By campaign"
          rows={campaigns.slice(0, 5).map((g) => ({
            key: g.key,
            label: g.key,
            tasks: g.totals.taskCount,
            revenue: g.totals.revenue_cents,
            ctr: g.totals.ctr,
            impressions: g.totals.impressions,
          }))}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Task drill-down</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as PerfSortKey)}>
              <SelectTrigger className="w-[170px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERF_SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    Sort by {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            >
              {sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No tasks match the current filters.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead className="hidden md:table-cell">Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Scheduled</TableHead>
                  <TableHead className="text-right">Impr.</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((t) => {
                  const status = isAllowedStatus(t.status) ? t.status : "draft";
                  const ctr = t.impressions > 0 ? t.clicks / t.impressions : 0;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-foreground truncate max-w-[200px]">
                        {t.task_title ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {t.campaign_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.channel}</TableCell>
                      <TableCell>
                        <StatusBadge status={status as EngineStatus} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {formatDateTime(t.scheduled_at ?? null)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {t.impressions > 0 ? t.impressions.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {t.impressions > 0 ? formatPct(ctr) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {t.revenue_cents > 0 ? formatCents(t.revenue_cents) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length > 100 ? (
              <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
                Showing first 100 of {filtered.length}. Export CSV for full data.
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
};

interface KpiProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

const KpiCard = ({ label, value, icon: Icon }: KpiProps) => (
  <Card>
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </CardContent>
  </Card>
);

interface ComparisonCardProps {
  title: string;
  rows: {
    key: string;
    label: string;
    tasks: number;
    revenue: number;
    ctr: number;
    impressions: number;
  }[];
}

const ComparisonCard = ({ title, rows }: ComparisonCardProps) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Tasks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Rev.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="font-medium text-foreground truncate max-w-[140px]">
                  {r.label}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{r.tasks}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {r.impressions > 0 ? formatPct(r.ctr) : "—"}
                </TableCell>
                <TableCell className="text-right text-foreground">
                  {formatCents(r.revenue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
);

export default AdminPerformance;
