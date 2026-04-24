/**
 * Pure helpers for computing performance KPIs from distribution_tasks.
 * Kept in /lib (no React) so it's easy to share + unit-test.
 */

export interface PerfTask {
  id: string;
  channel: string;
  status: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_cents: number;
  campaign_name?: string | null;
  task_title?: string;
  linked_offer_id?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
}

export interface PerfTotals {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_cents: number;
  ctr: number; // 0..1
  conversionRate: number; // 0..1
  revenuePerTask: number; // cents
  taskCount: number;
}

export const safeRatio = (num: number, den: number): number =>
  den > 0 ? num / den : 0;

export const formatPct = (v: number, fractionDigits = 1): string =>
  `${(v * 100).toFixed(fractionDigits)}%`;

export const formatCents = (cents: number): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

export function computeTotals(tasks: PerfTask[]): PerfTotals {
  const t = tasks.reduce(
    (acc, task) => {
      acc.impressions += task.impressions;
      acc.clicks += task.clicks;
      acc.conversions += task.conversions;
      acc.revenue_cents += task.revenue_cents;
      return acc;
    },
    { impressions: 0, clicks: 0, conversions: 0, revenue_cents: 0 },
  );
  return {
    ...t,
    ctr: safeRatio(t.clicks, t.impressions),
    conversionRate: safeRatio(t.conversions, t.clicks),
    revenuePerTask: tasks.length > 0 ? Math.round(t.revenue_cents / tasks.length) : 0,
    taskCount: tasks.length,
  };
}

export interface RankedGroup {
  key: string;
  totals: PerfTotals;
}

function rankBy<T extends PerfTask>(
  tasks: T[],
  keyFn: (t: T) => string | null | undefined,
): RankedGroup[] {
  const buckets = new Map<string, T[]>();
  for (const task of tasks) {
    const k = keyFn(task);
    if (!k) continue;
    const bucket = buckets.get(k);
    if (bucket) bucket.push(task);
    else buckets.set(k, [task]);
  }
  return Array.from(buckets.entries())
    .map(([key, items]) => ({ key, totals: computeTotals(items) }))
    .sort((a, b) => b.totals.revenue_cents - a.totals.revenue_cents);
}

export const rankByChannel = (tasks: PerfTask[]) =>
  rankBy(tasks, (t) => t.channel);

export const rankByOffer = (tasks: PerfTask[]) =>
  rankBy(tasks, (t) => t.linked_offer_id ?? null);

export const rankByCampaign = (tasks: PerfTask[]) =>
  rankBy(tasks, (t) => t.campaign_name ?? null);

/** True when *any* engagement signal exists across the set. */
export const hasPerformanceData = (tasks: PerfTask[]): boolean =>
  tasks.some(
    (t) =>
      t.impressions > 0 || t.clicks > 0 || t.conversions > 0 || t.revenue_cents > 0,
  );

/* ---------------------------------------------------------------------- */
/*   Sorting + filtering                                                  */
/* ---------------------------------------------------------------------- */

export type PerfSortKey =
  | "revenue"
  | "impressions"
  | "clicks"
  | "conversions"
  | "ctr"
  | "conversionRate"
  | "scheduled";

export const PERF_SORT_OPTIONS: { value: PerfSortKey; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "impressions", label: "Impressions" },
  { value: "clicks", label: "Clicks" },
  { value: "conversions", label: "Conversions" },
  { value: "ctr", label: "CTR" },
  { value: "conversionRate", label: "Conversion rate" },
  { value: "scheduled", label: "Scheduled date" },
];

const taskCtr = (t: PerfTask) => safeRatio(t.clicks, t.impressions);
const taskConv = (t: PerfTask) => safeRatio(t.conversions, t.clicks);

export function sortTasks<T extends PerfTask>(
  tasks: T[],
  key: PerfSortKey,
  direction: "asc" | "desc" = "desc",
): T[] {
  const dir = direction === "asc" ? 1 : -1;
  const get = (t: T): number => {
    switch (key) {
      case "revenue": return t.revenue_cents;
      case "impressions": return t.impressions;
      case "clicks": return t.clicks;
      case "conversions": return t.conversions;
      case "ctr": return taskCtr(t);
      case "conversionRate": return taskConv(t);
      case "scheduled": return t.scheduled_at ? new Date(t.scheduled_at).getTime() : 0;
    }
  };
  return [...tasks].sort((a, b) => (get(a) - get(b)) * dir);
}

export interface TaskFilters {
  channel?: string | "all";
  status?: string | "all";
  hasMetrics?: boolean;
}

export function filterTasks<T extends PerfTask>(tasks: T[], filters: TaskFilters): T[] {
  return tasks.filter((t) => {
    if (filters.channel && filters.channel !== "all" && t.channel !== filters.channel) return false;
    if (filters.status && filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.hasMetrics) {
      if (!(t.impressions || t.clicks || t.conversions || t.revenue_cents)) return false;
    }
    return true;
  });
}

/* ---------------------------------------------------------------------- */
/*   Deterministic recommendations (rule-based, no AI)                    */
/* ---------------------------------------------------------------------- */

export type RecommendationSeverity = "info" | "warn" | "success";

export interface Recommendation {
  id: string;
  severity: RecommendationSeverity;
  title: string;
  body: string;
}

export interface RecommendationContext {
  /** Minimum impressions before CTR-based rules apply. */
  ctrMinImpressions?: number;
  /** Minimum clicks before conversion-rate rules apply. */
  convMinClicks?: number;
  /** CTR below this is flagged as low. */
  lowCtr?: number;
  /** CTR above this is celebrated. */
  highCtr?: number;
  /** Conversion rate below this is flagged. */
  lowConvRate?: number;
}

const DEFAULT_CTX: Required<RecommendationContext> = {
  ctrMinImpressions: 200,
  convMinClicks: 25,
  lowCtr: 0.01,
  highCtr: 0.05,
  lowConvRate: 0.02,
};

export function buildRecommendations(
  tasks: PerfTask[],
  ctx: RecommendationContext = {},
): Recommendation[] {
  const c = { ...DEFAULT_CTX, ...ctx };
  const recs: Recommendation[] = [];

  if (tasks.length === 0) {
    recs.push({
      id: "no-tasks",
      severity: "info",
      title: "No distribution tasks yet",
      body: "Plan distribution from a saved asset to start gathering performance data.",
    });
    return recs;
  }

  const completed = tasks.filter((t) => t.status === "completed");
  const measured = completed.filter(
    (t) => t.impressions || t.clicks || t.conversions || t.revenue_cents,
  );

  if (completed.length > 0 && measured.length === 0) {
    recs.push({
      id: "missing-metrics",
      severity: "warn",
      title: "Add metrics to completed tasks",
      body: `${completed.length} task${completed.length === 1 ? "" : "s"} marked completed but no performance numbers entered. Open a task drawer to log impressions, clicks, conversions and revenue.`,
    });
  }

  if (measured.length === 0) return recs;

  const totals = computeTotals(measured);

  // CTR signals
  if (totals.impressions >= c.ctrMinImpressions) {
    if (totals.ctr < c.lowCtr) {
      recs.push({
        id: "low-ctr",
        severity: "warn",
        title: `Low overall CTR (${formatPct(totals.ctr)})`,
        body: `Across ${totals.impressions.toLocaleString()} impressions you're below ${formatPct(c.lowCtr, 0)}. Try sharper hooks, stronger thumbnails, or test a new headline angle.`,
      });
    } else if (totals.ctr >= c.highCtr) {
      recs.push({
        id: "high-ctr",
        severity: "success",
        title: `Strong CTR (${formatPct(totals.ctr)})`,
        body: "Your hooks are landing. Double down on the offer + headline patterns that produced this rate.",
      });
    }
  }

  // Conversion signals
  if (totals.clicks >= c.convMinClicks && totals.conversionRate < c.lowConvRate) {
    recs.push({
      id: "low-conv",
      severity: "warn",
      title: `Conversion rate is low (${formatPct(totals.conversionRate)})`,
      body: "Clicks are coming through but they're not converting. Tighten the landing page, simplify the CTA, or restate the guarantee.",
    });
  }

  // Channel concentration
  const channels = rankByChannel(measured);
  if (channels.length >= 2) {
    const top = channels[0];
    const second = channels[1];
    if (top.totals.revenue_cents > 0 && top.totals.revenue_cents >= second.totals.revenue_cents * 3) {
      recs.push({
        id: "channel-leader",
        severity: "info",
        title: `${top.key} is your strongest channel`,
        body: `${top.key} produced ${formatCents(top.totals.revenue_cents)} — over 3× the next channel. Schedule more cadence here before exploring new channels.`,
      });
    }
    const weak = channels.filter(
      (g) => g.totals.taskCount >= 2 && g.totals.revenue_cents === 0,
    );
    if (weak.length > 0) {
      recs.push({
        id: "channel-weak",
        severity: "warn",
        title: `No revenue from ${weak.map((w) => w.key).join(", ")}`,
        body: "These channels have multiple completed tasks but zero revenue logged. Either pause or experiment with a different asset format.",
      });
    }
  }

  // Failed task signal
  const failed = tasks.filter((t) => t.status === "failed").length;
  if (failed >= 3) {
    recs.push({
      id: "failed-tasks",
      severity: "warn",
      title: `${failed} tasks marked failed`,
      body: "Open the task drawers, capture what blocked them in notes, and decide whether to retry or archive.",
    });
  }

  // Top performer offer
  const offers = rankByOffer(measured);
  if (offers.length >= 2 && offers[0].totals.revenue_cents > 0) {
    recs.push({
      id: "offer-leader",
      severity: "success",
      title: "Top-performing offer identified",
      body: `One offer is producing ${formatCents(offers[0].totals.revenue_cents)} across ${offers[0].totals.taskCount} task${offers[0].totals.taskCount === 1 ? "" : "s"}. Build more assets from it before launching a new offer.`,
    });
  }

  return recs;
}

/* ---------------------------------------------------------------------- */
/*   Comparison helpers                                                   */
/* ---------------------------------------------------------------------- */

export interface ComparisonRow {
  key: string;
  label: string;
  totals: PerfTotals;
}

export function compareGroups(
  groups: RankedGroup[],
  labelFor: (key: string) => string = (k) => k,
): ComparisonRow[] {
  return groups.map((g) => ({ key: g.key, label: labelFor(g.key), totals: g.totals }));
}

/* ---------------------------------------------------------------------- */
/*   CSV export                                                           */
/* ---------------------------------------------------------------------- */

const csvEscape = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function tasksToCsv(tasks: PerfTask[]): string {
  const headers = [
    "id",
    "task_title",
    "campaign_name",
    "channel",
    "status",
    "scheduled_at",
    "sent_at",
    "impressions",
    "clicks",
    "conversions",
    "revenue_cents",
    "ctr",
    "conversion_rate",
  ];
  const lines = [headers.join(",")];
  for (const t of tasks) {
    const ctr = safeRatio(t.clicks, t.impressions);
    const conv = safeRatio(t.conversions, t.clicks);
    lines.push(
      [
        t.id,
        t.task_title ?? "",
        t.campaign_name ?? "",
        t.channel,
        t.status,
        t.scheduled_at ?? "",
        t.sent_at ?? "",
        t.impressions,
        t.clicks,
        t.conversions,
        t.revenue_cents,
        ctr.toFixed(4),
        conv.toFixed(4),
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
