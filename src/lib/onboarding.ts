/**
 * First-user onboarding — pure helpers + localStorage persistence.
 *
 * The checklist auto-completes from real data fetched on the dashboard.
 * Dismissed state is persisted per-user in localStorage. RLS is unchanged
 * because we never write to a server table here.
 */

export type OnboardingStepKey =
  | "create_offer"
  | "save_asset"
  | "schedule_task"
  | "review_performance"
  | "export_csv";

export interface OnboardingStep {
  key: OnboardingStepKey;
  title: string;
  description: string;
  to: string;
  cta: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: "create_offer",
    title: "Create your first offer",
    description: "Turn a rough idea into a structured offer in the Offer Engine.",
    to: "/engines/offer",
    cta: "Open Offer Engine",
  },
  {
    key: "save_asset",
    title: "Save your first asset",
    description: "Saving an offer also creates a reusable asset you can distribute.",
    to: "/assets",
    cta: "View Assets",
  },
  {
    key: "schedule_task",
    title: "Schedule a distribution task",
    description: "Pick a channel, date, and campaign for a saved asset.",
    to: "/assets",
    cta: "Plan distribution",
  },
  {
    key: "review_performance",
    title: "Review performance",
    description: "Mark a task complete and log impressions, clicks, or revenue.",
    to: "/distribution",
    cta: "Open Distribution",
  },
  {
    key: "export_csv",
    title: "Export a CSV",
    description: "Download distribution or offer history for outside reporting.",
    to: "/distribution",
    cta: "Try export",
  },
];

export interface OnboardingSignals {
  offers: number;
  assets: number;
  tasks: number;
  /** A completed task that has at least one performance metric > 0 */
  hasCompletedWithPerformance: boolean;
  /** Any performance metric > 0 across tasks */
  hasAnyPerformance: boolean;
  /** User has clicked CSV export at least once (local) */
  csvExported: boolean;
}

export type OnboardingState = Record<OnboardingStepKey, boolean>;

export function computeOnboardingState(s: OnboardingSignals): OnboardingState {
  return {
    create_offer: s.offers > 0,
    save_asset: s.assets > 0,
    schedule_task: s.tasks > 0,
    review_performance: s.hasCompletedWithPerformance,
    export_csv: s.csvExported || s.hasAnyPerformance,
  };
}

export function onboardingProgress(state: OnboardingState) {
  const total = ONBOARDING_STEPS.length;
  const done = ONBOARDING_STEPS.reduce((n, step) => n + (state[step.key] ? 1 : 0), 0);
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// ----- localStorage state (per user) -----

const DISMISSED_KEY = "ethinx.onboarding.dismissed.v1";
const CSV_FLAG_KEY = "ethinx.onboarding.csv_exported.v1";

const safeStorage = (): Storage | null => {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

const readSet = (key: string): Set<string> => {
  const s = safeStorage();
  if (!s) return new Set();
  try {
    const raw = s.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((v) => typeof v === "string")) : new Set();
  } catch {
    return new Set();
  }
};

const writeSet = (key: string, set: Set<string>) => {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore quota errors */
  }
};

export function isOnboardingDismissed(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return readSet(DISMISSED_KEY).has(userId);
}

export function dismissOnboarding(userId: string | null | undefined): void {
  if (!userId) return;
  const set = readSet(DISMISSED_KEY);
  set.add(userId);
  writeSet(DISMISSED_KEY, set);
}

export function restoreOnboarding(userId: string | null | undefined): void {
  if (!userId) return;
  const set = readSet(DISMISSED_KEY);
  set.delete(userId);
  writeSet(DISMISSED_KEY, set);
}

export function hasExportedCsv(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return readSet(CSV_FLAG_KEY).has(userId);
}

export function markCsvExported(userId: string | null | undefined): void {
  if (!userId) return;
  const set = readSet(CSV_FLAG_KEY);
  set.add(userId);
  writeSet(CSV_FLAG_KEY, set);
}
