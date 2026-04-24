import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ListChecks, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { StatusBadge, type EngineStatus } from "@/components/engine/StatusBadge";
import { TASK_STATUSES, type TaskStatus } from "@/lib/distribution";
import { trackEvent } from "@/lib/analytics";

export interface TaskRecord {
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
  linked_offer_id: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_cents: number;
}

export interface TaskMetricsInput {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_cents: number;
}

const ALLOWED: TaskStatus[] = [...TASK_STATUSES];

export const isAllowedStatus = (s: string): s is TaskStatus =>
  (ALLOWED as string[]).includes(s);

export const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

export const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—";

export const TASK_SELECT =
  "id, task_title, channel, campaign_name, status, scheduled_at, sent_at, created_at, updated_at, notes, asset_id, linked_offer_id, impressions, clicks, conversions, revenue_cents";

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

/**
 * Shared hook for loading + mutating distribution tasks and checklist state.
 * Used by both the list view (/distribution) and the calendar (/distribution/calendar).
 */
export function useDistributionTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<Record<string, ChecklistState>>(() =>
    loadChecklists(),
  );

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("distribution_tasks")
      .select(TASK_SELECT)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (error) setError(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

  return {
    rows,
    loading,
    error,
    updating,
    reload: load,
    changeStatus,
    markReady,
    checklistFor,
    toggleChecklist,
    isChecklistComplete,
  };
}

/* ---------------------------------------------------------------------- */
/*   Reusable presentational pieces                                       */
/* ---------------------------------------------------------------------- */

interface SummaryCardProps {
  label: string;
  value: number;
  tone?: "default" | "destructive";
}

export const SummaryCard = ({ label, value, tone = "default" }: SummaryCardProps) => (
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

export interface TaskSummary {
  total: number;
  queued: number;
  completed: number;
  failed: number;
}

export const computeSummary = (rows: TaskRecord[]): TaskSummary => {
  const base: TaskSummary = { total: rows.length, queued: 0, completed: 0, failed: 0 };
  for (const r of rows) {
    if (r.status === "queued") base.queued += 1;
    else if (r.status === "completed") base.completed += 1;
    else if (r.status === "failed") base.failed += 1;
  }
  return base;
};

interface EmptyStateProps {
  title: string;
  body: React.ReactNode;
}

export const EmptyState = ({ title, body }: EmptyStateProps) => (
  <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    <p className="mt-2 text-sm text-muted-foreground">{body}</p>
  </div>
);

/* ---------------------------------------------------------------------- */
/*   Task detail drawer                                                   */
/* ---------------------------------------------------------------------- */

interface TaskDetailDrawerProps {
  task: TaskRecord | null;
  onClose: () => void;
  updating: string | null;
  checklistFor: (id: string) => ChecklistState;
  toggleChecklist: (id: string, key: ChecklistKey, value: boolean) => void;
  isChecklistComplete: (id: string) => boolean;
  markReady: (id: string) => void;
}

export const TaskDetailDrawer = ({
  task,
  onClose,
  updating,
  checklistFor,
  toggleChecklist,
  isChecklistComplete,
  markReady,
}: TaskDetailDrawerProps) => {
  return useMemo(
    () => (
      <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {task ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{task.task_title}</SheetTitle>
                <SheetDescription className="text-left">
                  Review the task, work the checklist, then mark it ready to publish.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section className="space-y-3">
                  <DetailRow label="Campaign" value={task.campaign_name ?? "—"} />
                  <DetailRow label="Channel" value={task.channel} />
                  <DetailRow label="Scheduled" value={formatDateTime(task.scheduled_at)} />
                  <DetailRow
                    label="Status"
                    value={
                      <StatusBadge
                        status={
                          (isAllowedStatus(task.status) ? task.status : "draft") as EngineStatus
                        }
                      />
                    }
                  />
                </section>

                <Separator />

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {task.notes?.trim() ? task.notes : "No notes added."}
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
                      const checked = checklistFor(task.id)[item.key];
                      return (
                        <label
                          key={item.key}
                          className="flex items-center gap-3 text-sm text-foreground cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              toggleChecklist(task.id, item.key, v === true)
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
                      <span className="text-foreground">{formatDateTime(task.created_at)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Last updated</span>
                      <span className="text-foreground">{formatDateTime(task.updated_at)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Sent</span>
                      <span className="text-foreground">{formatDateTime(task.sent_at)}</span>
                    </li>
                  </ul>
                </section>
              </div>

              <SheetFooter className="mt-6 flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
                  Close
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => markReady(task.id)}
                  disabled={updating === task.id || !isChecklistComplete(task.id)}
                >
                  {isChecklistComplete(task.id) ? (
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
    ),
    [task, onClose, updating, checklistFor, toggleChecklist, isChecklistComplete, markReady],
  );
};

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground text-right">{value}</span>
  </div>
);
