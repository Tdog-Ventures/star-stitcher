// Creator Growth Hub — turns performance data and bottlenecks into growth experiments.
import { formatFooter } from "./output-footer";

export type CurrentChannel =
  | "cold-email"
  | "content-organic"
  | "paid-ads"
  | "partnerships"
  | "community"
  | "seo";

export const CHANNEL_LABELS: Record<CurrentChannel, string> = {
  "cold-email": "Cold email",
  "content-organic": "Organic content / social",
  "paid-ads": "Paid ads",
  partnerships: "Partnerships",
  community: "Community",
  seo: "SEO",
};

export type Bottleneck =
  | "not-enough-traffic"
  | "low-conversion"
  | "weak-retention"
  | "high-cac"
  | "long-sales-cycle";

export const BOTTLENECK_LABELS: Record<Bottleneck, string> = {
  "not-enough-traffic": "Not enough traffic / leads",
  "low-conversion": "Traffic but low conversion",
  "weak-retention": "Customers don't stick",
  "high-cac": "Acquisition is too expensive",
  "long-sales-cycle": "Sales cycle is too long",
};

export type ExperimentDuration = "7-days" | "14-days" | "21-days" | "30-days" | "60-days";

export const EXPERIMENT_DURATION_LABELS: Record<ExperimentDuration, string> = {
  "7-days": "7 days",
  "14-days": "14 days",
  "21-days": "21 days",
  "30-days": "30 days",
  "60-days": "60 days",
};

export interface GrowthHubInput {
  growth_goal: string;
  current_channel: CurrentChannel;
  bottleneck: Bottleneck;
  current_metrics: string;
  target_metric: string;
  experiment_duration: ExperimentDuration;
  available_assets: string;
}

export interface GrowthExperiment {
  name: string;
  hypothesis: string;
  setup: string;
  metric: string;
  duration: string;
  ice: { impact: number; confidence: number; ease: number; score: number };
}

export interface TestVariant {
  variant: string;
  change: string;
}

export interface GrowthHubOutput {
  growth_diagnosis: string;
  hypothesis: string;
  experiment_plan: GrowthExperiment[];
  test_variants: TestVariant[];
  success_criteria: string;
  tracking_plan: string[];
  next_iteration_rules: string[];
  kill_condition: string;
  recommended_assets_to_create: string[];
  distribution_recommendation: string;
  success_metric: string;
}

const NORTH_STAR_BY_BOTTLENECK: Record<Bottleneck, string> = {
  "not-enough-traffic": "Qualified traffic / week (not vanity impressions)",
  "low-conversion": "Visit → activation %",
  "weak-retention": "Day-30 active retention %",
  "high-cac": "Blended CAC payback in months",
  "long-sales-cycle": "Median days from first touch → paid",
};

interface RawExperiment {
  name: string;
  hypothesis: string;
  setup: string;
  metric: string;
}

const EXPERIMENT_BANK: Record<Bottleneck, Record<CurrentChannel, RawExperiment[]>> = {
  "not-enough-traffic": {
    "cold-email": [
      { name: "Niche-targeted sender expansion", hypothesis: "Adding 2 niche-segmented sender accounts will 2x reply volume without lowering deliverability.", setup: "Spin up 2 warmed inboxes per niche, split traffic 50/50.", metric: "Replies / week" },
      { name: "Hook-line A/B", hypothesis: "A specific-result first line beats a question-based first line.", setup: "Test 2 first lines across 200 sends each.", metric: "Reply rate %" },
    ],
    "content-organic": [
      { name: "Daily reply blocks", hypothesis: "60 min/day of strategic replies will lift impressions on own posts by 30%.", setup: "Reply to 10 in-niche accounts daily, log impressions weekly.", metric: "Impressions on own posts" },
      { name: "Hook bank", hypothesis: "Pre-written hook bank shifts post quality variance down and median impressions up.", setup: "Write 30 hooks in advance, ship one per day.", metric: "Median impressions / post" },
    ],
    "paid-ads": [
      { name: "Creative volume test", hypothesis: "Shipping 5 net-new creatives / week beats optimizing 1.", setup: "Same audience + budget, rotate creatives every 7 days.", metric: "CTR + CPL" },
    ],
    partnerships: [
      { name: "10 outbound partner DMs / week", hypothesis: "Direct partner outreach yields 1 active partnership per 10 attempts.", setup: "Build list of 40 ideal partners, send 10/week with personalized intro.", metric: "Active partnerships started" },
    ],
    community: [
      { name: "Cross-community AMA", hypothesis: "Hosting an AMA in 1 adjacent community drives 50+ qualified visitors.", setup: "Coordinate with 2 community owners for back-to-back AMAs.", metric: "Signups attributed to AMA" },
    ],
    seo: [
      { name: "Programmatic long-tail", hypothesis: "20 templated long-tail pages will rank for ≥ 5 within 60 days.", setup: "Build template + ship 20 pages with internal linking.", metric: "Indexed + ranked pages" },
    ],
  },
  "low-conversion": {
    "cold-email": [
      { name: "Single-CTA reply path", hypothesis: "Replacing call link with a one-question reply doubles reply rate.", setup: "Swap CTA on 200 sends, compare with control.", metric: "Reply rate %" },
    ],
    "content-organic": [
      { name: "Landing-page rewrite", hypothesis: "A specific-outcome headline lifts visit→signup by 30%.", setup: "Rewrite hero + first-fold copy; A/B with current.", metric: "Visit → signup %" },
    ],
    "paid-ads": [
      { name: "Lead-magnet swap", hypothesis: "Swapping ebook for a 5-min audit raises lead→sales-qualified rate 2x.", setup: "Same ad creative, change LP offer for 50% of traffic.", metric: "MQL → SQL %" },
    ],
    partnerships: [
      { name: "Partner-specific landing page", hypothesis: "Custom LP per partner lifts conversion by 40%.", setup: "Build 3 partner LPs with their wording + branding.", metric: "LP visit → trial %" },
    ],
    community: [
      { name: "Free workshop funnel", hypothesis: "Members who attend a workshop convert at 4x cold rate.", setup: "Run 1 workshop / week for 3 weeks, track attendees.", metric: "Attendee → paid %" },
    ],
    seo: [
      { name: "Top-page CTA rework", hypothesis: "Adding contextual in-line CTAs on top-3 ranked pages lifts signups 25%.", setup: "Add 3 in-line CTAs per page, no other changes.", metric: "Signups from organic" },
    ],
  },
  "weak-retention": {
    "cold-email": [
      { name: "Onboarding email series", hypothesis: "5-day welcome lifts week-1 active by 30%.", setup: "Build + send series to all new signups.", metric: "Day-7 active %" },
    ],
    "content-organic": [
      { name: "Customer-only content stream", hypothesis: "Closed-loop content for paying users lifts retention by 20%.", setup: "Ship 1 customer-only piece / week.", metric: "Month-1 retention %" },
    ],
    "paid-ads": [
      { name: "Retargeting active users", hypothesis: "Re-activation ads to lapsed users at 1/4 normal CAC.", setup: "Build audience of 30-day-inactive users.", metric: "Reactivations" },
    ],
    partnerships: [
      { name: "Partner-led onboarding", hypothesis: "Users referred by partners retain better with partner-co-branded onboarding.", setup: "Co-brand week-1 emails.", metric: "Day-30 active %" },
    ],
    community: [
      { name: "Member-only office hours", hypothesis: "Weekly live call lifts month-2 retention by 25%.", setup: "Run weekly 30-min call for 6 weeks.", metric: "Month-2 retention %" },
    ],
    seo: [
      { name: "How-to series for existing users", hypothesis: "Indexable docs reduce churn-from-confusion.", setup: "Ship 10 use-case docs.", metric: "Support tickets / 1k users" },
    ],
  },
  "high-cac": {
    "cold-email": [
      { name: "Tighter ICP", hypothesis: "Cutting list to top 30% by fit halves cost per reply.", setup: "Re-score list, send only to top tier.", metric: "Cost per reply" },
    ],
    "content-organic": [
      { name: "Repurpose into ads", hypothesis: "Top-3 organic posts as ads cut CAC by 25%.", setup: "Boost 3 winners; compare to net-new creatives.", metric: "CAC" },
    ],
    "paid-ads": [
      { name: "Channel reshuffle", hypothesis: "Reallocating 50% to highest-LTV channel drops blended CAC by 20%.", setup: "Cut bottom channel, double top.", metric: "Blended CAC" },
    ],
    partnerships: [
      { name: "Revshare-only deals", hypothesis: "Pure revshare partners deliver lower CAC than paid acquisition.", setup: "Sign 3 revshare partners, no upfront.", metric: "CAC vs paid" },
    ],
    community: [
      { name: "Member-get-member", hypothesis: "Referral incentive halves CAC for member-driven signups.", setup: "Add 1-month-free for both sides.", metric: "Referral signups" },
    ],
    seo: [
      { name: "BoFu page sprint", hypothesis: "5 bottom-of-funnel comparison pages lower paid spend dependence.", setup: "Ship 5 'X vs Y' pages.", metric: "Organic signups" },
    ],
  },
  "long-sales-cycle": {
    "cold-email": [
      { name: "Multi-threaded outreach", hypothesis: "Reaching 3 stakeholders cuts cycle by 30%.", setup: "Identify champion + 2 others per account.", metric: "Days-to-close" },
    ],
    "content-organic": [
      { name: "Bottom-funnel content", hypothesis: "Comparison + ROI posts shorten cycle by 20%.", setup: "Ship 1 comparison / 1 ROI post per week.", metric: "Days-to-close" },
    ],
    "paid-ads": [
      { name: "Retarget mid-funnel", hypothesis: "Case-study ads to engaged leads accelerate close.", setup: "Audience: visited pricing page in 30d.", metric: "Days-to-close" },
    ],
    partnerships: [
      { name: "Co-marketed case studies", hypothesis: "Partner case studies build buyer confidence faster.", setup: "Publish 2 joint case studies.", metric: "Days-to-close" },
    ],
    community: [
      { name: "Buyer-circle channels", hypothesis: "Private channel for active deals shortens cycle.", setup: "Open Slack channel per active deal.", metric: "Days-to-close" },
    ],
    seo: [
      { name: "Bottom-funnel guides", hypothesis: "ROI + implementation guides accelerate procurement.", setup: "Publish 3 ROI calculators.", metric: "Days-to-close" },
    ],
  },
};

function scoreExperiment(exp: RawExperiment, durationLabel: string): GrowthExperiment["ice"] {
  const hyp = exp.hypothesis.toLowerCase();
  const impact = /2x|double|halve|50%|40%|30%/.test(hyp) ? 8 : /20%|25%/.test(hyp) ? 6 : 5;
  const confidence = durationLabel.includes("60") ? 5 : durationLabel.includes("30") ? 6 : 7;
  const ease = exp.setup.length < 80 ? 8 : exp.setup.length < 140 ? 6 : 5;
  const score = Math.round(((impact + confidence + ease) / 30) * 100);
  return { impact, confidence, ease, score };
}

export function generateGrowthHub(input: GrowthHubInput): GrowthHubOutput {
  const channelExperiments = EXPERIMENT_BANK[input.bottleneck][input.current_channel] ?? [];
  const durationLabel = EXPERIMENT_DURATION_LABELS[input.experiment_duration];

  const experiments: GrowthExperiment[] = channelExperiments
    .map((e) => ({
      name: e.name,
      hypothesis: e.hypothesis,
      setup: e.setup,
      metric: e.metric,
      duration: durationLabel,
      ice: scoreExperiment(e, durationLabel),
    }))
    .sort((a, b) => b.ice.score - a.ice.score)
    .slice(0, 3);

  const top = experiments[0];

  return {
    growth_diagnosis: `Goal: "${input.growth_goal || "lift the metric that matters"}". Bottleneck (${BOTTLENECK_LABELS[input.bottleneck]}) sits inside ${CHANNEL_LABELS[input.current_channel]}. Current metric snapshot: ${input.current_metrics || "not provided — set baseline today"}. Don't try to fix the channel — fix the specific bottleneck inside it.`,
    hypothesis: top?.hypothesis || `If we change one specific lever inside ${CHANNEL_LABELS[input.current_channel]}, we will move "${input.target_metric || NORTH_STAR_BY_BOTTLENECK[input.bottleneck]}" within ${durationLabel}.`,
    experiment_plan: experiments,
    test_variants: top
      ? [
          { variant: "Control", change: "Current behaviour, untouched. Baseline." },
          { variant: "Variant A", change: top.setup },
          { variant: "Variant B", change: `Same as A but inverted on the second-most-likely lever.` },
        ]
      : [],
    success_criteria: `Variant beats control by ≥ 20% on ${top?.metric || input.target_metric || "the target metric"} over ${durationLabel}, with sample size ≥ 100 per arm where applicable.`,
    tracking_plan: [
      `Baseline ${top?.metric || input.target_metric || "the metric"} today; record it where you can't lose it (single sheet, single cell).`,
      `Daily 5-min log of metric movement during the experiment. No analysis until end-date.`,
      `Single Loom + 1-page summary at end of ${durationLabel} — not a deck.`,
    ],
    next_iteration_rules: [
      `If winning variant > 30% lift: scale to 100% and design the next variant on the same lever.`,
      `If 10–30% lift: keep the variant, but next experiment changes a different lever.`,
      `If < 10% lift: revert and pick the #2 ICE-ranked experiment from the plan.`,
    ],
    kill_condition: `If the variant has not beaten control by the end of ${durationLabel}, kill it. Don't extend. Don't rationalize. Move to the next ICE-ranked bet.`,
    recommended_assets_to_create: [
      `One landing page or copy variant aligned with ${top?.name || "the chosen experiment"}.`,
      `One short-form video explaining the change (for internal alignment + external proof).`,
      input.available_assets ? `Repurpose "${input.available_assets}" into the test variant where possible.` : `Inventory existing assets you could reuse before building anything new.`,
    ],
    distribution_recommendation: `Run experiments inside ${CHANNEL_LABELS[input.current_channel]} only. Communicate results internally via a single Loom + 1-page summary — not a deck. Publish public learnings only after the kill/scale decision.`,
    success_metric: input.target_metric || NORTH_STAR_BY_BOTTLENECK[input.bottleneck],
  };
}

export function formatGrowthHub(input: GrowthHubInput, plan: GrowthHubOutput): string {
  return [
    `GROWTH GOAL: ${input.growth_goal}`,
    `CURRENT CHANNEL: ${CHANNEL_LABELS[input.current_channel]} · BOTTLENECK: ${BOTTLENECK_LABELS[input.bottleneck]}`,
    `CURRENT METRICS: ${input.current_metrics || "—"}`,
    `TARGET METRIC: ${input.target_metric || "—"} · DURATION: ${EXPERIMENT_DURATION_LABELS[input.experiment_duration]}`,
    `AVAILABLE ASSETS: ${input.available_assets || "—"}`,
    "",
    "DIAGNOSIS",
    plan.growth_diagnosis,
    "",
    `HYPOTHESIS: ${plan.hypothesis}`,
    "",
    "EXPERIMENT PLAN (ICE-ranked)",
    ...plan.experiment_plan.flatMap((e) => [
      `--- ${e.name} · ICE ${e.ice.score}/100 (I${e.ice.impact}/C${e.ice.confidence}/E${e.ice.ease}) ---`,
      `Hypothesis: ${e.hypothesis}`,
      `Setup:      ${e.setup}`,
      `Metric:     ${e.metric}`,
      `Duration:   ${e.duration}`,
      "",
    ]),
    "TEST VARIANTS",
    ...plan.test_variants.map((v) => `- ${v.variant}: ${v.change}`),
    "",
    `SUCCESS CRITERIA: ${plan.success_criteria}`,
    "",
    "TRACKING PLAN",
    ...plan.tracking_plan.map((t, i) => `${i + 1}. ${t}`),
    "",
    "NEXT-ITERATION RULES",
    ...plan.next_iteration_rules.map((n, i) => `${i + 1}. ${n}`),
    "",
    `KILL CONDITION: ${plan.kill_condition}`,
    "",
    "RECOMMENDED ASSETS TO CREATE",
    ...plan.recommended_assets_to_create.map((a, i) => `${i + 1}. ${a}`),
    formatFooter({
      nextSteps: [
        `Pick the #1 ICE-ranked experiment and write its hypothesis at the top of a doc.`,
        `Set a baseline reading of "${plan.success_metric}" today — you can't measure lift without it.`,
        `Block the experiment's duration on calendar with the kill date marked.`,
        `Schedule the Monday weekly ritual (15 min) for the full duration.`,
      ],
      distribution: plan.distribution_recommendation,
      successMetric: plan.success_metric,
    }),
  ].join("\n");
}
