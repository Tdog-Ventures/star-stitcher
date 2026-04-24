import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, Download, FileText, Layers, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
import {
  downloadCsv,
  formatCents,
  formatPct,
  hasPerformanceData,
  rankByCampaign,
  rankByOffer,
  type PerfTask,
} from "@/lib/performance";
import { markCsvExported } from "@/lib/onboarding";

interface OfferRow {
  id: string;
  title: string;
  product_name: string | null;
  description: string | null;
  target_audience: string | null;
  desired_outcome: string | null;
  cta: string | null;
  pricing: string | null;
  status: string;
  created_at: string;
}

interface AssetLite {
  id: string;
  title: string;
  status: string;
  source_record_id: string | null;
}

interface TaskLite {
  id: string;
  task_title: string;
  channel: string;
  status: string;
  scheduled_at: string | null;
  asset_id: string | null;
  campaign_name: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_cents: number;
  linked_offer_id: string | null;
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

const OfferHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [assets, setAssets] = useState<AssetLite[]>([]);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [offersRes, assetsRes, tasksRes] = await Promise.all([
        supabase
          .from("offers")
          .select(
            "id, title, product_name, description, target_audience, desired_outcome, cta, pricing, status, created_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("assets")
          .select("id, title, status, source_record_id")
          .eq("engine_key", "offer"),
        supabase
          .from("distribution_tasks")
          .select(
            "id, task_title, channel, status, scheduled_at, asset_id, campaign_name, impressions, clicks, conversions, revenue_cents, linked_offer_id",
          ),
      ]);
      if (cancelled) return;
      const firstError =
        offersRes.error?.message ||
        assetsRes.error?.message ||
        tasksRes.error?.message;
      if (firstError) {
        toast({ title: "Load failed", description: firstError, variant: "destructive" });
      }
      setOffers((offersRes.data ?? []) as OfferRow[]);
      setAssets((assetsRes.data ?? []) as AssetLite[]);
      setTasks((tasksRes.data ?? []) as TaskLite[]);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, toast]);

  // Build lookups: assets by source_record_id (offer.id), tasks by asset_id
  const assetsByOffer = useMemo(() => {
    const m = new Map<string, AssetLite[]>();
    for (const a of assets) {
      if (!a.source_record_id) continue;
      const list = m.get(a.source_record_id);
      if (list) list.push(a);
      else m.set(a.source_record_id, [a]);
    }
    return m;
  }, [assets]);

  const tasksByAsset = useMemo(() => {
    const m = new Map<string, TaskLite[]>();
    for (const t of tasks) {
      if (!t.asset_id) continue;
      const list = m.get(t.asset_id);
      if (list) list.push(t);
      else m.set(t.asset_id, [t]);
    }
    return m;
  }, [tasks]);

  const tasksForOffer = (offerId: string): TaskLite[] => {
    const linkedAssets = assetsByOffer.get(offerId) ?? [];
    return linkedAssets.flatMap((a) => tasksByAsset.get(a.id) ?? []);
  };

  const selected = offers.find((o) => o.id === selectedId) ?? null;
  const selectedAssets = selected ? assetsByOffer.get(selected.id) ?? [] : [];
  const selectedTasks = selected ? tasksForOffer(selected.id) : [];

  // Build PerfTask list with linked_offer_id resolved through asset → offer
  const perfTasks = useMemo<PerfTask[]>(() => {
    const assetToOffer = new Map<string, string>();
    for (const a of assets) {
      if (a.source_record_id) assetToOffer.set(a.id, a.source_record_id);
    }
    return tasks.map((t) => ({
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
      linked_offer_id:
        t.linked_offer_id ?? (t.asset_id ? assetToOffer.get(t.asset_id) ?? null : null),
    }));
  }, [tasks, assets]);

  const offerTitleFor = (id: string) =>
    offers.find((o) => o.id === id)?.title ?? "Unknown offer";

  const offerComparison = useMemo(
    () => rankByOffer(perfTasks).slice(0, 5),
    [perfTasks],
  );
  const campaignComparison = useMemo(
    () => rankByCampaign(perfTasks).slice(0, 5),
    [perfTasks],
  );
  const showComparison = hasPerformanceData(perfTasks);

  const handleExport = () => {
    const headers = [
      "offer_id",
      "offer_title",
      "asset_count",
      "task_count",
      "impressions",
      "clicks",
      "conversions",
      "revenue_cents",
    ];
    const lines = [headers.join(",")];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    for (const o of offers) {
      const linkedTasks = tasksForOffer(o.id);
      const totals = linkedTasks.reduce(
        (acc, t) => ({
          impressions: acc.impressions + (t.impressions ?? 0),
          clicks: acc.clicks + (t.clicks ?? 0),
          conversions: acc.conversions + (t.conversions ?? 0),
          revenue_cents: acc.revenue_cents + (t.revenue_cents ?? 0),
        }),
        { impressions: 0, clicks: 0, conversions: 0, revenue_cents: 0 },
      );
      lines.push(
        [
          o.id,
          o.title,
          (assetsByOffer.get(o.id) ?? []).length,
          linkedTasks.length,
          totals.impressions,
          totals.clicks,
          totals.conversions,
          totals.revenue_cents,
        ]
          .map(esc)
          .join(","),
      );
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadCsv(`offer-history-${stamp}.csv`, lines.join("\n"));
    markCsvExported(user?.id);
  };

  return (
    <EngineLayout
      title="Offer History"
      description="Every offer you've saved, with the assets and distribution tasks they fed into."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={offers.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/engines/offer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to engine
            </Link>
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No offers saved yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Build your first offer in the{" "}
            <Link to="/engines/offer" className="text-primary underline-offset-4 hover:underline">
              Offer Engine
            </Link>{" "}
            and it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {showComparison ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Top offers by revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {offerComparison.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No offer-linked tasks yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Offer</TableHead>
                          <TableHead className="text-right">Tasks</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {offerComparison.map((g) => (
                          <TableRow
                            key={g.key}
                            className="cursor-pointer"
                            onClick={() => setSelectedId(g.key)}
                          >
                            <TableCell className="font-medium text-foreground truncate max-w-[200px]">
                              {offerTitleFor(g.key)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {g.totals.taskCount}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {g.totals.impressions > 0 ? formatPct(g.totals.ctr) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-foreground">
                              {formatCents(g.totals.revenue_cents)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Top campaigns by revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {campaignComparison.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No campaigns logged yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead className="text-right">Tasks</TableHead>
                          <TableHead className="text-right">Conv. rate</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaignComparison.map((g) => (
                          <TableRow key={g.key}>
                            <TableCell className="font-medium text-foreground truncate max-w-[200px]">
                              {g.key}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {g.totals.taskCount}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {g.totals.clicks > 0 ? formatPct(g.totals.conversionRate) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-foreground">
                              {formatCents(g.totals.revenue_cents)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {offers.map((o) => {
              const linkedAssets = assetsByOffer.get(o.id) ?? [];
              const linkedTasks = tasksForOffer(o.id);
              const status = (o.status || "draft") as EngineStatus;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedId(o.id)}
                  className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {o.product_name ?? "—"}
                      </p>
                      <h3 className="mt-1 truncate text-sm font-semibold text-foreground group-hover:text-primary">
                        {o.title}
                      </h3>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                  {o.desired_outcome ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {o.desired_outcome}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {linkedAssets.length} asset{linkedAssets.length === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      {linkedTasks.length} task{linkedTasks.length === 1 ? "" : "s"}
                    </span>
                    <span className="ml-auto">{formatDate(o.created_at)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{selected.title}</SheetTitle>
                <SheetDescription className="text-left">
                  {selected.product_name ?? "Offer detail"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section className="space-y-2 text-sm">
                  <Detail label="Status" value={<StatusBadge status={selected.status as EngineStatus} />} />
                  <Detail label="Created" value={formatDate(selected.created_at)} />
                  <Detail label="Audience" value={selected.target_audience ?? "—"} />
                  <Detail label="Outcome" value={selected.desired_outcome ?? "—"} />
                  <Detail label="Pricing" value={selected.pricing ?? "—"} />
                  <Detail label="CTA" value={selected.cta ?? "—"} />
                </section>

                <Separator />

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Linked assets ({selectedAssets.length})
                  </h3>
                  {selectedAssets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assets linked yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedAssets.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3 text-sm"
                        >
                          <span className="truncate text-foreground">{a.title}</span>
                          <StatusBadge status={a.status as EngineStatus} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <Separator />

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Distribution tasks ({selectedTasks.length})
                  </h3>
                  {selectedTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tasks have been planned for these assets yet.{" "}
                      <Link
                        to="/assets"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Plan distribution
                      </Link>
                      .
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedTasks.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-foreground">{t.task_title}</p>
                            <p className="text-xs text-muted-foreground">
                              {t.channel} · {formatDate(t.scheduled_at)}
                            </p>
                          </div>
                          <StatusBadge status={t.status as EngineStatus} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </EngineLayout>
  );
};

const Detail = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground text-right">{value}</span>
  </div>
);

export default OfferHistory;
