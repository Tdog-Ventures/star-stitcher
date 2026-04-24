import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { EngineLayout } from "@/components/engine";
import { StatusBadge, type EngineStatus } from "@/components/engine/StatusBadge";
import { TASK_STATUSES, type TaskStatus } from "@/lib/distribution";

interface TaskRecord {
  id: string;
  task_title: string;
  channel: string;
  campaign_name: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  updated_at: string;
}

const ALLOWED: TaskStatus[] = [...TASK_STATUSES];

const isAllowed = (s: string): s is TaskStatus =>
  (ALLOWED as string[]).includes(s);

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const Distribution = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("distribution_tasks")
      .select("id, task_title, channel, campaign_name, status, scheduled_at, sent_at, updated_at")
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (error) setError(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const changeStatus = async (id: string, next: TaskStatus) => {
    setUpdating(id);
    const patch: Record<string, unknown> = { status: next };
    if (next === "completed") patch.sent_at = new Date().toISOString();
    if (next !== "completed") patch.sent_at = null;

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
      {loading ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load tasks: {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No tasks planned. Pick an asset from the{" "}
          <Link to="/assets" className="text-primary underline-offset-4 hover:underline">
            Assets
          </Link>{" "}
          list and click <strong>Distribute</strong>.
        </div>
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
                <TableHead className="text-right">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const status = isAllowed(r.status) ? r.status : "draft";
                return (
                  <TableRow key={r.id}>
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
                    <TableCell className="text-right">
                      <Select
                        value={status}
                        onValueChange={(v) => changeStatus(r.id, v as TaskStatus)}
                        disabled={updating === r.id}
                      >
                        <SelectTrigger className="w-[140px] ml-auto">
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </EngineLayout>
  );
};

export default Distribution;
