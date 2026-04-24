import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, CalendarDays, Download, List as ListIcon, Plus, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  buildRecommendations,
  computeTotals,
  downloadCsv,
  filterTasks,
  formatCents,
  formatPct,
  hasPerformanceData,
  PERF_SORT_OPTIONS,
  type PerfSortKey,
  rankByChannel,
  rankByOffer,
  sortTasks,
  tasksToCsv,
} from "@/lib/performance";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EngineLayout } from "@/components/engine";
import { RecommendationsPanel } from "@/components/engine/RecommendationsPanel";
import { StatusBadge, type EngineStatus } from "@/components/engine/StatusBadge";
import { CHANNELS, TASK_STATUSES, type TaskStatus } from "@/lib/distribution";
import {
  EmptyState,
  SummaryCard,
  TaskDetailDrawer,
  computeSummary,
  formatDateTime,
  isAllowedStatus,
  useDistributionTasks,
} from "@/lib/distribution-tasks";
import { markCsvExported } from "@/lib/onboarding";
import { useAuth } from "@/providers/AuthProvider";

type FilterValue = "all" | TaskStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const Distribution = () => {
  const { user } = useAuth();
  const {
    rows,
    loading,
    error,
    updating,
    changeStatus,
    markReady,
    updateMetrics,
    checklistFor,
    toggleChecklist,
    isChecklistComplete,
  } = useDistributionTasks();

  const [filter, setFilter] = useState<FilterValue>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<PerfSortKey>("scheduled");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offerTitles, setOfferTitles] = useState<Record<string, string>>({});

  const summary = useMemo(() => computeSummary(rows), [rows]);

  const filteredRows = useMemo(() => {
    const base = filterTasks(rows, {
      status: filter,
      channel: channelFilter,
    });
    return sortTasks(base, sortKey, sortDir);
  }, [rows, filter, channelFilter, sortKey, sortDir]);

  const selectedTask = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  // Performance roll-ups (only across rows that already have data)
  const totals = useMemo(() => computeTotals(rows), [rows]);
  const channelLeader = useMemo(() => rankByChannel(rows)[0] ?? null, [rows]);
  const offerLeader = useMemo(() => rankByOffer(rows)[0] ?? null, [rows]);
  const showPerf = hasPerformanceData(rows);
  const recommendations = useMemo(() => buildRecommendations(rows), [rows]);

  // Resolve offer titles for the "best offer" card
  useEffect(() => {
    const id = offerLeader?.key;
    if (!id || offerTitles[id]) return;
    let cancelled = false;
    supabase
      .from("offers")
      .select("id, title")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setOfferTitles((prev) => ({ ...prev, [data.id]: data.title }));
      });
    return () => {
      cancelled = true;
    };
  }, [offerLeader?.key, offerTitles]);

  const handleExport = () => {
    const csv = tasksToCsv(filteredRows);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadCsv(`distribution-tasks-${stamp}.csv`, csv);
    markCsvExported(user?.id);
  };

  return (
    <EngineLayout
      title="Distribution"
      description="Plan when and where each asset goes out. Move tasks through the pipeline manually."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            <Button size="sm" variant="default" className="h-8">
              <ListIcon className="mr-1.5 h-4 w-4" />
              List
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8">
              <Link to="/distribution/calendar">
                <CalendarDays className="mr-1.5 h-4 w-4" />
                Calendar
              </Link>
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={filteredRows.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button asChild size="sm">
            <Link to="/assets">
              <Plus className="mr-2 h-4 w-4" />
              Plan from asset
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Total tasks" value={summary.total} />
          <SummaryCard label="Queued" value={summary.queued} />
          <SummaryCard label="Completed" value={summary.completed} />
          <SummaryCard label="Failed" value={summary.failed} tone="destructive" />
        </div>

        {showPerf ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Overall performance
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xl font-semibold text-foreground">
                  {formatCents(totals.revenue_cents)}
                </p>
                <p className="text-xs text-muted-foreground">
                  CTR {formatPct(totals.ctr)} · Conv {formatPct(totals.conversionRate)} ·{" "}
                  {formatCents(totals.revenuePerTask)}/task
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Best channel
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xl font-semibold text-foreground">
                  {channelLeader ? channelLeader.key : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {channelLeader
                    ? `${formatCents(channelLeader.totals.revenue_cents)} · CTR ${formatPct(channelLeader.totals.ctr)}`
                    : "Not enough data"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Best offer
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xl font-semibold text-foreground truncate">
                  {offerLeader ? offerTitles[offerLeader.key] ?? "Unknown offer" : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {offerLeader
                    ? `${formatCents(offerLeader.totals.revenue_cents)} across ${offerLeader.totals.taskCount} task${offerLeader.totals.taskCount === 1 ? "" : "s"}`
                    : "Link tasks to offers to compare"}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <RecommendationsPanel recommendations={recommendations} />

        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
            <TabsList className="flex-wrap">
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Channel" />
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
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as PerfSortKey)}>
              <SelectTrigger className="w-[170px] h-9">
                <SelectValue placeholder="Sort by" />
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
              aria-label="Toggle sort direction"
            >
              {sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            Failed to load tasks: {error}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No distribution tasks yet"
            body={
              <>
                Head over to{" "}
                <Link to="/assets" className="text-primary underline-offset-4 hover:underline">
                  Assets
                </Link>{" "}
                and click <strong>Distribute</strong> on a saved asset to plan its first task.
              </>
            }
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="No tasks match these filters"
            body={
              <>
                Nothing matches the current status + channel combo. Switch to <strong>All</strong>{" "}
                or pick a different channel.
              </>
            }
          />
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="hidden md:table-cell">Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="hidden lg:table-cell">Scheduled</TableHead>
                  <TableHead className="hidden xl:table-cell text-right">Revenue</TableHead>
                  <TableHead className="hidden xl:table-cell text-right">CTR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r) => {
                  const status = isAllowedStatus(r.status) ? r.status : "draft";
                  const ctr = r.impressions > 0 ? r.clicks / r.impressions : 0;
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(r.id)}
                    >
                      <TableCell className="font-medium text-foreground">{r.task_title}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {r.campaign_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.channel}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {formatDateTime(r.scheduled_at)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right text-muted-foreground">
                        {r.revenue_cents > 0 ? formatCents(r.revenue_cents) : "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right text-muted-foreground">
                        {r.impressions > 0 ? formatPct(ctr) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status as EngineStatus} />
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Select
                            value={status}
                            onValueChange={(v) => changeStatus(r.id, v as TaskStatus)}
                            disabled={updating === r.id}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TASK_STATUSES.map((s) => (
                                <SelectItem key={s} value={s} className="capitalize">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" onClick={() => setSelectedId(r.id)}>
                            Open
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedId(null)}
        updating={updating}
        checklistFor={checklistFor}
        toggleChecklist={toggleChecklist}
        isChecklistComplete={isChecklistComplete}
        markReady={markReady}
        updateMetrics={updateMetrics}
      />
    </EngineLayout>
  );
};

export default Distribution;
