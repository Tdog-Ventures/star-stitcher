import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ListChecks, Plus, Send } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { EngineLayout } from "@/components/engine";
import { StatusBadge, type EngineStatus } from "@/components/engine/StatusBadge";
import { TASK_STATUSES, type TaskStatus } from "@/lib/distribution";
import { trackEvent } from "@/lib/analytics";

interface TaskRecord {
  id: string;
  task_title: string;
  channel: string;
  campaign_name: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  asset_id: string | null;
}

const ALLOWED: TaskStatus[] = [...TASK_STATUSES];

const isAllowed = (s: string): s is TaskStatus =>
  (ALLOWED as string[]).includes(s);

const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

type FilterValue = "all" | TaskStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const CHECKLIST_ITEMS = [
  { key: "copy", label: "Copy prepared" },
  { key: "asset", label: "Asset reviewed" },
  { key: "channel", label: "Channel selected" },
  { key: "schedule", label: "Scheduled time confirmed" },
  { key: "publish", label: "Ready to publish" },
] as const;

type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];
type ChecklistState = Record<ChecklistKey, boolean>;

const EMPTY_CHECKLIST: ChecklistState = {
  copy: false,
  asset: false,
  channel: false,
  schedule: false,
  publish: false,
};

const CHECKLIST_STORAGE_KEY = "distribution.checklist.v1";

const loadChecklists = (): Record<string, ChecklistState> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ChecklistState>) : {};
  } catch {
    return {};
  }
};

const saveChecklists = (state: Record<string, ChecklistState>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

const Distribution = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<Record<string, ChecklistState>>(() => loadChecklists());

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("distribution_tasks")
      .select(
        "id, task_title, channel, campaign_name, status, scheduled_at, sent_at, created_at, updated_at, notes, asset_id",
      )
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (error) setError(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const summary = useMemo(() => {
    const base = { total: rows.length, queued: 0, completed: 0, failed: 0 };
    for (const r of rows) {
      if (r.status === "queued") base.queued += 1;
      else if (r.status === "completed") base.completed += 1;
      else if (r.status === "failed") base.failed += 1;
    }
    return base;
  }, [rows]);

  const filteredRows = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  const selectedTask = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const checklistFor = (id: string): ChecklistState => checklists[id] ?? EMPTY_CHECKLIST;

  const toggleChecklist = (id: string, key: ChecklistKey, value: boolean) => {
    setChecklists((prev) => {
      const next = {
        ...prev,
        [id]: { ...(prev[id] ?? EMPTY_CHECKLIST), [key]: value },
      };
      saveChecklists(next);
      return next;
    });
  };

  const isChecklistComplete = (id: string) => {
    const c = checklistFor(id);
    return CHECKLIST_ITEMS.every((item) => c[item.key]);
  };

  const changeStatus = async (id: string, next: TaskStatus) => {
    setUpdating(id);
    const patch = {
      status: next,
      sent_at: next === "completed" ? new Date().toISOString() : null,
    };
    const { error } = await supabase
      .from("distribution_tasks")
      .update(patch)
      .eq("id", id);
    setUpdating(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status updated", description: next });
    load();
  };

  const markReady = async (id: string) => {
    if (!isChecklistComplete(id)) {
      toast({
        title: "Checklist incomplete",
        description: "Complete every checklist item before marking ready.",
        variant: "destructive",
      });
      return;
    }
    setUpdating(id);
    const { error } = await supabase
      .from("distribution_tasks")
      .update({ status: "queued" })
      .eq("id", id);
    setUpdating(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    void trackEvent("distribution_task_ready", { task_id: id });
    toast({ title: "Marked ready", description: "Task moved to queued." });
    load();
  };

  return (
    <EngineLayout
      title="Distribution"
      description="Plan when and where each asset goes out. Move tasks through the pipeline manually."
      actions={
        <Button asChild size="sm">
          <Link to="/assets">
            <Plus className="mr-2 h-4 w-4" />
            Plan from asset
          </Link>
        </Button>
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
                  const status = isAllowed(r.status) ? r.status : "draft";
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedId(r.id)}
                          >
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

      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTask ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{selectedTask.task_title}</SheetTitle>
                <SheetDescription className="text-left">
                  Review the task, work the checklist, then mark it ready to publish.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section className="space-y-3">
                  <DetailRow label="Campaign" value={selectedTask.campaign_name ?? "—"} />
                  <DetailRow label="Channel" value={selectedTask.channel} />
                  <DetailRow label="Scheduled" value={formatDateTime(selectedTask.scheduled_at)} />
                  <DetailRow
                    label="Status"
                    value={
                      <StatusBadge
                        status={
                          (isAllowed(selectedTask.status)
                            ? selectedTask.status
                            : "draft") as EngineStatus
                        }
                      />
                    }
                  />
                </section>

                <Separator />

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTask.notes?.trim() ? selectedTask.notes : "No notes added."}
                  </p>
                </section>

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Execution checklist
                  </h3>
                  <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                    {CHECKLIST_ITEMS.map((item) => {
                      const checked = checklistFor(selectedTask.id)[item.key];
                      return (
                        <label
                          key={item.key}
                          className="flex items-center gap-3 text-sm text-foreground cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              toggleChecklist(selectedTask.id, item.key, v === true)
                            }
                          />
                          <span className={checked ? "line-through text-muted-foreground" : ""}>
                            {item.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Status history</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex justify-between">
                      <span>Created</span>
                      <span className="text-foreground">{formatDateTime(selectedTask.created_at)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Last updated</span>
                      <span className="text-foreground">{formatDateTime(selectedTask.updated_at)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Sent</span>
                      <span className="text-foreground">{formatDateTime(selectedTask.sent_at)}</span>
                    </li>
                  </ul>
                </section>
              </div>

              <SheetFooter className="mt-6 flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setSelectedId(null)}
                >
                  Close
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => markReady(selectedTask.id)}
                  disabled={
                    updating === selectedTask.id || !isChecklistComplete(selectedTask.id)
                  }
                >
                  {isChecklistComplete(selectedTask.id) ? (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Mark Ready
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Complete checklist to mark ready
                    </>
                  )}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </EngineLayout>
  );
};

interface SummaryCardProps {
  label: string;
  value: number;
  tone?: "default" | "destructive";
}

const SummaryCard = ({ label, value, tone = "default" }: SummaryCardProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p
        className={
          tone === "destructive"
            ? "text-2xl font-semibold text-destructive"
            : "text-2xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </CardContent>
  </Card>
);

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground text-right">{value}</span>
  </div>
);

interface EmptyStateProps {
  title: string;
  body: React.ReactNode;
}

const EmptyState = ({ title, body }: EmptyStateProps) => (
  <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    <p className="mt-2 text-sm text-muted-foreground">{body}</p>
  </div>
);

export default Distribution;
