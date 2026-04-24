import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { trackEvent } from "@/lib/analytics";
import { EngineLayout, AssetTable, type AssetRow } from "@/components/engine";
import type { EngineStatus } from "@/components/engine/StatusBadge";

interface AssetRecord {
  id: string;
  title: string;
  engine_key: string;
  channel: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const Assets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AssetRecord | null>(null);
  const [channel, setChannel] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskContent, setTaskContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("assets")
      .select("id, title, engine_key, channel, status, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openTaskDialog = (row: AssetRow) => {
    const rec = rows.find((r) => r.id === row.id) ?? null;
    if (!rec) return;
    setSelected(rec);
    setChannel(rec.channel ?? "");
    setTaskTitle(rec.title);
    setTaskContent("");
    setOpen(true);
  };

  const createTask = async () => {
    if (!user || !selected) return;
    setSubmitting(true);
    const { error } = await supabase.from("distribution_tasks").insert({
      user_id: user.id,
      asset_id: selected.id,
      channel: channel || "general",
      task_title: taskTitle,
      task_content: taskContent || null,
      status: "draft",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not create task", description: error.message, variant: "destructive" });
      return;
    }
    await trackEvent("distribution_task_created", { asset_id: selected.id, channel });
    toast({ title: "Task created", description: "See it in Distribution." });
    setOpen(false);
  };

  const tableRows: AssetRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    engine: r.engine_key,
    channel: r.channel ?? undefined,
    status: (r.status as EngineStatus) ?? "draft",
    updatedAt: new Date(r.updated_at).toLocaleDateString(),
  }));

  return (
    <EngineLayout
      title="Assets"
      description="Everything you've created across engines lives here. Click a row to plan distribution."
      actions={
        <Button asChild size="sm">
          <Link to="/engines">
            <Plus className="mr-2 h-4 w-4" />
            New from engine
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
          Failed to load assets: {error}
        </div>
      ) : (
        <AssetTable
          rows={tableRows}
          onRowClick={openTaskDialog}
          emptyState={
            <span>
              No saved assets yet. Open the{" "}
              <Link to="/engines/offer" className="text-primary underline-offset-4 hover:underline">
                Offer Engine
              </Link>{" "}
              to create your first one.
            </span>
          }
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan distribution</DialogTitle>
            <DialogDescription>
              Create a manual distribution task from "{selected?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Input id="channel" value={channel} onChange={(e) => setChannel(e.target.value)}
                placeholder="e.g. LinkedIn, X, Email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Task title</Label>
              <Input id="taskTitle" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskContent">Content (optional)</Label>
              <Textarea id="taskContent" rows={4} value={taskContent}
                onChange={(e) => setTaskContent(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createTask} disabled={submitting || !taskTitle.trim()}>
              {submitting ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EngineLayout>
  );
};

export default Assets;
