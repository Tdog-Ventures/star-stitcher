import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, List as ListIcon, Plus } from "lucide-react";
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
import { StatusBadge, type EngineStatus } from "@/components/engine/StatusBadge";
import { TASK_STATUSES, type TaskStatus } from "@/lib/distribution";
import {
  EmptyState,
  SummaryCard,
  TaskDetailDrawer,
  computeSummary,
  formatDateTime,
  isAllowedStatus,
  useDistributionTasks,
} from "@/lib/distribution-tasks";

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
  const {
    rows,
    loading,
    error,
    updating,
    changeStatus,
    markReady,
    checklistFor,
    toggleChecklist,
    isChecklistComplete,
  } = useDistributionTasks();

  const [filter, setFilter] = useState<FilterValue>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const summary = useMemo(() => computeSummary(rows), [rows]);
  const filteredRows = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );
  const selectedTask = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

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

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
          <TabsList className="flex-wrap">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

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
            title={`No ${filter} tasks`}
            body={
              <>
                Nothing matches this filter right now. Switch to <strong>All</strong> to see every
                task or try a different status.
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r) => {
                  const status = isAllowedStatus(r.status) ? r.status : "draft";
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
      />
    </EngineLayout>
  );
};

export default Distribution;
