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

/** True when *any* engagement signal exists across the set. */
export const hasPerformanceData = (tasks: PerfTask[]): boolean =>
  tasks.some(
    (t) =>
      t.impressions > 0 || t.clicks > 0 || t.conversions > 0 || t.revenue_cents > 0,
  );
