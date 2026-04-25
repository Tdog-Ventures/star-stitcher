// Growth Hub — turns growth goal + current channel + bottleneck
// into a structured growth experiment plan (ICE-scored).

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

interface Experiment {
  name: string;
  hypothesis: string;
  setup: string;
  metric: string;
  duration: string;
  ice: { impact: number; confidence: number; ease: number; score: number };
}

interface GrowthPlan {
  diagnosis: string;
  northStar: string;
  experiments: Experiment[];
  killCriteria: string;
  weeklyRitual: string;
}

const EXPERIMENT_BANK: Record<
  Bottleneck,
  Record<CurrentChannel, Omit<Experiment, "ice">[]>
> = {
  "not-enough-traffic": {
    "cold-email": [
      {
        name: "Niche-targeted sender expansion",
        hypothesis: "Adding 2 niche-segmented sender accounts will 2x reply volume without lowering deliverability.",
        setup: "Spin up 2 warmed inboxes per niche, split traffic 50/50.",
        metric: "Replies / week",
        duration: "14 days",
      },
      {
        name: "Hook-line A/B",
        hypothesis: "A specific-result first line beats a question-based first line.",
        setup: "Test 2 first lines across 200 sends each.",
        metric: "Reply rate %",
        duration: "10 days",
      },
    ],
    "content-organic": [
      {
        name: "Daily reply blocks",
        hypothesis: "60 min/day of strategic replies will lift impressions on own posts by 30%.",
        setup: "Reply to 10 in-niche accounts daily, log impressions weekly.",
        metric: "Impressions on own posts",
        duration: "21 days",
      },
      {
        name: "Hook bank",
        hypothesis: "Pre-written hook bank shifts post quality variance down and median impressions up.",
        setup: "Write 30 hooks in advance, ship one per day.",
        metric: "Median impressions / post",
        duration: "30 days",
      },
    ],
    "paid-ads": [
      {
        name: "Creative volume test",
        hypothesis: "Shipping 5 net-new creatives / week beats optimizing 1.",
        setup: "Same audience + budget, rotate creatives every 7 days.",
        metric: "CTR + CPL",
        duration: "21 days",
      },
    ],
    partnerships: [
      {
        name: "10 outbound partner DMs / week",
        hypothesis: "Direct partner outreach yields 1 active partnership per 10 attempts.",
        setup: "Build list of 40 ideal partners, send 10/week with personalized intro.",
        metric: "Active partnerships started",
        duration: "30 days",
      },
    ],
    community: [
      {
        name: "Cross-community AMA",
        hypothesis: "Hosting an AMA in 1 adjacent community drives 50+ qualified visitors.",
        setup: "Coordinate with 2 community owners for back-to-back AMAs.",
        metric: "Signups attributed to AMA",
        duration: "14 days",
      },
    ],
    seo: [
      {
        name: "Programmatic long-tail",
        hypothesis: "20 templated long-tail pages will rank for ≥ 5 within 60 days.",
        setup: "Build template + ship 20 pages with internal linking.",
        metric: "Indexed + ranked pages",
        duration: "60 days",
      },
    ],
  },
  "low-conversion": {
    "cold-email": [
      {
        name: "Single-CTA reply path",
        hypothesis: "Replacing call link with a one-question reply doubles reply rate.",
        setup: "Swap CTA on 200 sends, compare with control.",
        metric: "Reply rate %",
        duration: "10 days",
      },
    ],
    "content-organic": [
      {
        name: "Landing-page rewrite",
        hypothesis: "A specific-outcome headline lifts visit→signup by 30%.",
        setup: "Rewrite hero + first-fold copy; A/B with current.",
        metric: "Visit → signup %",
        duration: "21 days",
      },
    ],
    "paid-ads": [
      {
        name: "Lead-magnet swap",
        hypothesis: "Swapping ebook for a 5-min audit raises lead→sales-qualified rate 2x.",
        setup: "Same ad creative, change LP offer for 50% of traffic.",
        metric: "MQL → SQL %",
        duration: "21 days",
      },
    ],
    partnerships: [
      {
        name: "Partner-specific landing page",
        hypothesis: "Custom LP per partner lifts conversion by 40%.",
        setup: "Build 3 partner LPs with their wording + branding.",
        metric: "LP visit → trial %",
        duration: "30 days",
      },
    ],
    community: [
      {
        name: "Free workshop funnel",
        hypothesis: "Members who attend a workshop convert at 4x cold rate.",
        setup: "Run 1 workshop / week for 3 weeks, track attendees.",
        metric: "Attendee → paid %",
        duration: "21 days",
      },
    ],
    seo: [
      {
        name: "Top-page CTA rework",
        hypothesis: "Adding contextual in-line CTAs on top-3 ranked pages lifts signups 25%.",
        setup: "Add 3 in-line CTAs per page, no other changes.",
        metric: "Signups from organic",
        duration: "30 days",
      },
    ],
  },
  "weak-retention": {
    "cold-email": [
      { name: "Onboarding email series", hypothesis: "5-day welcome lifts week-1 active by 30%.", setup: "Build + send series to all new signups.", metric: "Day-7 active %", duration: "30 days" },
    ],
    "content-organic": [
      { name: "Customer-only content stream", hypothesis: "Closed-loop content for paying users lifts retention by 20%.", setup: "Ship 1 customer-only piece / week.", metric: "Month-1 retention %", duration: "30 days" },
    ],
    "paid-ads": [
      { name: "Retargeting active users", hypothesis: "Re-activation ads to lapsed users at 1/4 normal CAC.", setup: "Build audience of 30-day-inactive users.", metric: "Reactivations", duration: "21 days" },
    ],
    partnerships: [
      { name: "Partner-led onboarding", hypothesis: "Users referred by partners retain better with partner-co-branded onboarding.", setup: "Co-brand week-1 emails.", metric: "Day-30 active %", duration: "30 days" },
    ],
    community: [
      { name: "Member-only office hours", hypothesis: "Weekly live call lifts month-2 retention by 25%.", setup: "Run weekly 30-min call for 6 weeks.", metric: "Month-2 retention %", duration: "45 days" },
    ],
    seo: [
      { name: "How-to series for existing users", hypothesis: "Indexable docs reduce churn-from-confusion.", setup: "Ship 10 use-case docs.", metric: "Support tickets / 1k users", duration: "60 days" },
    ],
  },
  "high-cac": {
    "cold-email": [
      { name: "Tighter ICP", hypothesis: "Cutting list to top 30% by fit halves cost per reply.", setup: "Re-score list, send only to top tier.", metric: "Cost per reply", duration: "14 days" },
    ],
    "content-organic": [
      { name: "Repurpose into ads", hypothesis: "Top-3 organic posts as ads cut CAC by 25%.", setup: "Boost 3 winners; compare to net-new creatives.", metric: "CAC", duration: "21 days" },
    ],
    "paid-ads": [
      { name: "Channel reshuffle", hypothesis: "Reallocating 50% to highest-LTV channel drops blended CAC by 20%.", setup: "Cut bottom channel, double top.", metric: "Blended CAC", duration: "30 days" },
    ],
    partnerships: [
      { name: "Revshare-only deals", hypothesis: "Pure revshare partners deliver lower CAC than paid acquisition.", setup: "Sign 3 revshare partners, no upfront.", metric: "CAC vs paid", duration: "45 days" },
    ],
    community: [
      { name: "Member-get-member", hypothesis: "Referral incentive halves CAC for member-driven signups.", setup: "Add 1-month-free for both sides.", metric: "Referral signups", duration: "30 days" },
    ],
    seo: [
      { name: "BoFu page sprint", hypothesis: "5 bottom-of-funnel comparison pages lower paid spend dependence.", setup: "Ship 5 'X vs Y' pages.", metric: "Organic signups", duration: "60 days" },
    ],
  },
  "long-sales-cycle": {
    "cold-email": [
      { name: "Multi-threaded outreach", hypothesis: "Reaching 3 stakeholders cuts cycle by 30%.", setup: "Identify champion + 2 others per account.", metric: "Days-to-close", duration: "45 days" },
    ],
    "content-organic": [
      { name: "Bottom-funnel content", hypothesis: "Comparison + ROI posts shorten cycle by 20%.", setup: "Ship 1 comparison / 1 ROI post per week.", metric: "Days-to-close", duration: "45 days" },
    ],
    "paid-ads": [
      { name: "Retarget mid-funnel", hypothesis: "Case-study ads to engaged leads accelerate close.", setup: "Audience: visited pricing page in 30d.", metric: "Days-to-close", duration: "30 days" },
    ],
    partnerships: [
      { name: "Co-marketed case studies", hypothesis: "Partner case studies build buyer confidence faster.", setup: "Publish 2 joint case studies.", metric: "Days-to-close", duration: "45 days" },
    ],
    community: [
      { name: "Buyer-circle channels", hypothesis: "Private channel for active deals shortens cycle.", setup: "Open Slack channel per active deal.", metric: "Days-to-close", duration: "30 days" },
    ],
    seo: [
      { name: "Bottom-funnel guides", hypothesis: "ROI + implementation guides accelerate procurement.", setup: "Publish 3 ROI calculators.", metric: "Days-to-close", duration: "60 days" },
    ],
  },
};

const NORTH_STAR_BY_BOTTLENECK: Record<Bottleneck, string> = {
  "not-enough-traffic": "Qualified traffic / week (not vanity impressions)",
  "low-conversion": "Visit → activation %",
  "weak-retention": "Day-30 active retention %",
  "high-cac": "Blended CAC payback in months",
  "long-sales-cycle": "Median days from first touch → paid",
};

export interface GrowthInput {
  goal: string;
  channel: CurrentChannel;
  bottleneck: Bottleneck;
}

function scoreExperiment(exp: Omit<Experiment, "ice">): Experiment["ice"] {
  // Deterministic ICE scoring based on simple heuristics in the text.
  const hyp = exp.hypothesis.toLowerCase();
  const impact = /2x|double|halve|50%|40%|30%/.test(hyp) ? 8 : /20%|25%/.test(hyp) ? 6 : 5;
  const confidence = exp.duration.includes("60") ? 5 : exp.duration.includes("45") ? 6 : 7;
  const ease = exp.setup.length < 80 ? 8 : exp.setup.length < 140 ? 6 : 5;
  const score = Math.round(((impact + confidence + ease) / 30) * 100);
  return { impact, confidence, ease, score };
}

export function generateGrowthPlan(input: GrowthInput): GrowthPlan {
  const channelExperiments = EXPERIMENT_BANK[input.bottleneck][input.channel] ?? [];
  const experiments: Experiment[] = channelExperiments
    .map((e) => ({ ...e, ice: scoreExperiment(e) }))
    .sort((a, b) => b.ice.score - a.ice.score)
    .slice(0, 3);

  return {
    diagnosis: `Your stated goal is "${input.goal}". The bottleneck (${BOTTLENECK_LABELS[input.bottleneck]}) sits inside ${CHANNEL_LABELS[input.channel]}. Don't try to fix the channel — fix the specific bottleneck inside it.`,
    northStar: NORTH_STAR_BY_BOTTLENECK[input.bottleneck],
    experiments,
    killCriteria:
      "If an experiment hasn't beaten control by its end-date metric, kill it. Don't extend. Move on to the next ICE-ranked bet.",
    weeklyRitual:
      "Every Monday: pick 1 active experiment, log last-week metric, decide continue / kill / scale. 15 minutes max.",
  };
}

export function formatGrowthPlan(input: GrowthInput, plan: GrowthPlan): string {
  return [
    `GROWTH GOAL: ${input.goal}`,
    `CURRENT CHANNEL: ${CHANNEL_LABELS[input.channel]}`,
    `BOTTLENECK: ${BOTTLENECK_LABELS[input.bottleneck]}`,
    "",
    "DIAGNOSIS",
    plan.diagnosis,
    "",
    `NORTH STAR: ${plan.northStar}`,
    "",
    "EXPERIMENTS (ICE-ranked)",
    ...plan.experiments.flatMap((e) => [
      `--- ${e.name} · ICE ${e.ice.score}/100 (I${e.ice.impact}/C${e.ice.confidence}/E${e.ice.ease}) ---`,
      `Hypothesis: ${e.hypothesis}`,
      `Setup:      ${e.setup}`,
      `Metric:     ${e.metric}`,
      `Duration:   ${e.duration}`,
      "",
    ]),
    `KILL CRITERIA: ${plan.killCriteria}`,
    `WEEKLY RITUAL: ${plan.weeklyRitual}`,
  ].join("\n");
}
