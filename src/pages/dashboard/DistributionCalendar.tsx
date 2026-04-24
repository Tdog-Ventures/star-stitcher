import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock, List as ListIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EngineLayout } from "@/components/engine";
import { StatusBadge, type EngineStatus } from "@/components/engine/StatusBadge";
import { CHANNELS, TASK_STATUSES, type Channel, type TaskStatus } from "@/lib/distribution";
import {
  EmptyState,
  SummaryCard,
  TaskDetailDrawer,
  computeSummary,
  formatTime,
  isAllowedStatus,
  useDistributionTasks,
  type TaskRecord,
} from "@/lib/distribution-tasks";

type RangeValue = "today" | "week" | "upcoming" | "all";

const RANGES: { value: RangeValue; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "All" },
];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const dayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDayLabel = (d: Date) => {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

const inRange = (iso: string | null, range: RangeValue): boolean => {
  if (!iso) return range === "all";
  const t = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  if (range === "all") return true;
  if (range === "today") return t.getTime() === today.getTime();
  if (range === "week") {
    const end = addDays(today, 7);
    return t.getTime() >= today.getTime() && t.getTime() < end.getTime();
  }
  // upcoming = today and beyond
  return t.getTime() >= today.getTime();
};

const DistributionCalendar = () => {
  const {
    rows,
    loading,
    error,
    updating,
    checklistFor,
    toggleChecklist,
    isChecklistComplete,
    markReady,
  } = useDistributionTasks();

  const [range, setRange] = useState<RangeValue>("upcoming");
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const summary = useMemo(() => computeSummary(rows), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!inRange(r.scheduled_at, range)) return false;
      if (channel !== "all" && r.channel !== channel) return false;
      if (status !== "all" && r.status !== status) return false;
      return true;
    });
  }, [rows, range, channel, status]);

  // Group by day key, then sort days ascending and tasks within each by time
  const grouped = useMemo(() => {
    const buckets = new Map<string, { date: Date; tasks: TaskRecord[] }>();
    const unscheduled: TaskRecord[] = [];
    for (const r of filtered) {
      if (!r.scheduled_at) {
        unscheduled.push(r);
        continue;
      }
      const d = startOfDay(new Date(r.scheduled_at));
      const key = dayKey(d);
      const bucket = buckets.get(key);
      if (bucket) bucket.tasks.push(r);
      else buckets.set(key, { date: d, tasks: [r] });
    }
    const sorted = Array.from(buckets.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    for (const g of sorted) {
      g.tasks.sort((a, b) => {
        const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
        const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
        return ta - tb;
      });
    }
    return { days: sorted, unscheduled };
  }, [filtered]);

  const selectedTask = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const showUnscheduled = range === "all" && grouped.unscheduled.length > 0;

  return (
    <EngineLayout
      title="Distribution Calendar"
      description="See every scheduled task grouped by day. Click any card to open its execution drawer."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            <Button asChild size="sm" variant="ghost" className="h-8">
              <Link to="/distribution">
                <ListIcon className="mr-1.5 h-4 w-4" />
                List
              </Link>
            </Button>
            <Button size="sm" variant="default" className="h-8">
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Calendar
            </Button>
          </div>
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

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={range} onValueChange={(v) => setRange(v as RangeValue)}>
            <TabsList className="flex-wrap">
              {RANGES.map((r) => (
                <TabsTrigger key={r.value} value={r.value}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel | "all")}>
              <SelectTrigger className="w-[160px]">
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
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus | "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
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
                and click <strong>Distribute</strong> on a saved asset to schedule its first task.
              </>
            }
          />
        ) : grouped.days.length === 0 && !showUnscheduled ? (
          <EmptyState
            title="Nothing scheduled in this view"
            body={
              <>
                No tasks match this range or filter combination. Try widening the range or
                switching to <strong>All</strong>.
              </>
            }
          />
        ) : (
          <div className="space-y-6">
            {grouped.days.map((g) => (
              <DaySection
                key={dayKey(g.date)}
                date={g.date}
                tasks={g.tasks}
                onSelect={setSelectedId}
              />
            ))}
            {showUnscheduled ? (
              <section className="space-y-3">
                <div className="flex items-baseline justify-between border-b border-border pb-2">
                  <h2 className="text-base font-semibold text-foreground">Unscheduled</h2>
                  <span className="text-xs text-muted-foreground">
                    {grouped.unscheduled.length} task
                    {grouped.unscheduled.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {grouped.unscheduled.map((t) => (
                    <TaskCard key={t.id} task={t} onSelect={setSelectedId} />
                  ))}
                </div>
              </section>
            ) : null}
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
      />
    </EngineLayout>
  );
};

interface DaySectionProps {
  date: Date;
  tasks: TaskRecord[];
  onSelect: (id: string) => void;
}

const DaySection = ({ date, tasks, onSelect }: DaySectionProps) => (
  <section className="space-y-3">
    <div className="flex items-baseline justify-between border-b border-border pb-2">
      <h2 className="text-base font-semibold text-foreground">{formatDayLabel(date)}</h2>
      <span className="text-xs text-muted-foreground">
        {tasks.length} task{tasks.length === 1 ? "" : "s"}
      </span>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} onSelect={onSelect} />
      ))}
    </div>
  </section>
);

interface TaskCardProps {
  task: TaskRecord;
  onSelect: (id: string) => void;
}

const TaskCard = ({ task, onSelect }: TaskCardProps) => {
  const status = isAllowedStatus(task.status) ? task.status : "draft";
  return (
    <button
      type="button"
      onClick={() => onSelect(task.id)}
      className="group flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {task.campaign_name ?? "No campaign"}
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold text-foreground group-hover:text-primary">
            {task.task_title}
          </h3>
        </div>
        <StatusBadge status={status as EngineStatus} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{task.channel}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {task.scheduled_at ? formatTime(task.scheduled_at) : "Unscheduled"}
        </span>
      </div>
    </button>
  );
};

export default DistributionCalendar;
