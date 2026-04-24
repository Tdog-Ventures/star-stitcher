import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { EngineLayout, AssetTable, type AssetRow } from "@/components/engine";
import type { EngineStatus } from "@/components/engine/StatusBadge";

interface TaskRecord {
  id: string;
  task_title: string;
  channel: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  updated_at: string;
}

const ALLOWED: EngineStatus[] = ["draft", "queued", "running", "completed", "failed"];

const normalizeStatus = (s: string): EngineStatus =>
  (ALLOWED as string[]).includes(s) ? (s as EngineStatus) : "draft";

const Distribution = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("distribution_tasks")
      .select("id, task_title, channel, status, scheduled_at, sent_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markSent = async (id: string) => {
    const { error } = await supabase
      .from("distribution_tasks")
      .update({ status: "completed", sent_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Marked as sent" });
    load();
  };

  const tableRows: AssetRow[] = rows.map((r) => ({
    id: r.id,
    title: r.task_title,
    channel: r.channel,
    status: normalizeStatus(r.status),
    updatedAt: new Date(r.updated_at).toLocaleDateString(),
  }));

  return (
    <EngineLayout
      title="Distribution"
      description="Plan when and where each asset goes out. Click a task to mark it as sent."
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
      ) : (
        <AssetTable
          rows={tableRows}
          onRowClick={(row) => {
            if (row.status !== "completed" && confirm(`Mark "${row.title}" as sent?`)) {
              markSent(row.id);
            }
          }}
          emptyState={
            <span>
              No tasks planned. Pick an asset from the{" "}
              <Link to="/assets" className="text-primary underline-offset-4 hover:underline">
                Assets
              </Link>{" "}
              list and schedule it across channels.
            </span>
          }
        />
      )}
    </EngineLayout>
  );
};

export default Distribution;
