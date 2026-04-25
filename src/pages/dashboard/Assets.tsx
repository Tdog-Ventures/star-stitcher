import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { trackEvent } from "@/lib/analytics";
import {
  CHANNELS,
  distributeFormSchema,
  type Channel,
} from "@/lib/distribution";
import { EngineLayout, AssetTable, AssetPreviewRenderer, type AssetRow } from "@/components/engine";
import type { EngineStatus } from "@/components/engine/StatusBadge";

interface AssetRecord {
  id: string;
  title: string;
  engine_key: string;
  channel: string | null;
  status: string;
  source_record_id: string | null;
  created_at: string;
  updated_at: string;
}

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Assets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AssetRecord | null>(null);
  const [channel, setChannel] = useState<Channel | "">("");
  const [campaignName, setCampaignName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<AssetRecord | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("assets")
      .select("id, title, engine_key, channel, status, source_record_id, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const defaultScheduled = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return toLocalInput(d);
  }, []);

  const openDistribute = (row: AssetRow) => {
    const rec = rows.find((r) => r.id === row.id) ?? null;
    if (!rec) return;
    setSelected(rec);
    setChannel("");
    setCampaignName("");
    setScheduledAt(defaultScheduled);
    setNotes("");
    setErrors({});
    setOpen(true);
  };

  const openPreview = async (row: AssetRow) => {
    const rec = rows.find((r) => r.id === row.id) ?? null;
    if (!rec) return;
    setPreviewAsset(rec);
    setPreviewContent(null);
    setPreviewError(null);
    setPreviewOpen(true);
    setPreviewLoading(true);
    const { data, error } = await supabase
      .from("assets")
      .select("content")
      .eq("id", rec.id)
      .maybeSingle();
    setPreviewLoading(false);
    if (error) {
      setPreviewError(error.message);
      return;
    }
    setPreviewContent(data?.content ?? "");
  };

  const submit = async () => {
    if (!user || !selected) return;
    const parsed = distributeFormSchema.safeParse({
      channel,
      campaignName,
      scheduledAt,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[issue.path.join(".")] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { data: task, error } = await supabase
      .from("distribution_tasks")
      .insert({
        user_id: user.id,
        asset_id: selected.id,
        linked_offer_id: selected.source_record_id ?? null,
        channel: parsed.data.channel,
        campaign_name: parsed.data.campaignName,
        task_title: selected.title,
        task_content: null,
        scheduled_at: new Date(parsed.data.scheduledAt).toISOString(),
        notes: parsed.data.notes ?? null,
        status: "queued",
      })
      .select()
      .single();
    setSubmitting(false);
    if (error || !task) {
      toast({ title: "Could not create task", description: error?.message, variant: "destructive" });
      return;
    }
    await trackEvent("distribution_task_created", {
      asset_id: selected.id,
      channel: parsed.data.channel,
      campaign_name: parsed.data.campaignName,
      scheduled_at: parsed.data.scheduledAt,
    });
    toast({ title: "Queued for distribution", description: `${parsed.data.channel} · ${parsed.data.campaignName}` });
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
      description="Everything you've created across engines lives here. Click Distribute to plan a post."
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
          rowActions={(row) => (
            <Button size="sm" variant="outline" onClick={() => openDistribute(row)}>
              <Send className="mr-2 h-3.5 w-3.5" />
              Distribute
            </Button>
          )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Distribute asset</DialogTitle>
            <DialogDescription>
              Plan when and where "{selected?.title}" goes out. Nothing is posted automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                <SelectTrigger id="channel">
                  <SelectValue placeholder="Pick a channel" />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.channel && <p className="text-xs text-destructive">{errors.channel}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign name</Label>
              <Input
                id="campaignName"
                maxLength={120}
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Audit launch · April"
              />
              {errors.campaignName && <p className="text-xs text-destructive">{errors.campaignName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Scheduled at</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              {errors.scheduledAt && <p className="text-xs text-destructive">{errors.scheduledAt}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hooks, hashtags, links to assets, etc."
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Queueing…" : "Queue task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EngineLayout>
  );
};

export default Assets;
