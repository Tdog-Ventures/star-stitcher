// Creator Blueprint — turns niche + audience + monetisation goal
// into a structured creator strategy blueprint.
import { formatFooter } from "./output-footer";

export type MonetisationGoal =
  | "audience"
  | "digital-product"
  | "services"
  | "sponsorships"
  | "community";

export const MONETISATION_LABELS: Record<MonetisationGoal, string> = {
  audience: "Build audience first",
  "digital-product": "Sell digital product",
  services: "Book services / consulting",
  sponsorships: "Land sponsorships",
  community: "Grow paid community",
};

export interface BlueprintInput {
  niche: string;
  audience: string;
  monetisation: MonetisationGoal;
}

interface BlueprintPlan {
  positioning: string;
  pillars: string[];
  cadence: { format: string; perWeek: number; purpose: string }[];
  funnel: string[];
  northStar: string;
  ninetyDay: string[];
}

const PILLAR_BANK: Record<MonetisationGoal, string[]> = {
  audience: ["Insight", "Story", "Hot take", "Recap"],
  "digital-product": ["Problem", "Method", "Proof", "Offer"],
  services: ["Diagnostic", "Case study", "Process", "Result"],
  sponsorships: ["Trend", "Deep-dive", "Personality", "Recommendation"],
  community: ["Question", "Member spotlight", "Lesson", "Behind-the-scenes"],
};

const FUNNEL_BANK: Record<MonetisationGoal, string[]> = {
  audience: [
    "Top: short-form discovery posts",
    "Middle: weekly newsletter",
    "Action: follow + reply",
  ],
  "digital-product": [
    "Top: educational short-form",
    "Middle: long-form proof + case studies",
    "Action: landing page + checkout",
  ],
  services: [
    "Top: niche pain-point posts",
    "Middle: free audit / diagnostic",
    "Action: discovery call booking",
  ],
  sponsorships: [
    "Top: trending hot takes",
    "Middle: branded deep-dives",
    "Action: media kit + inbound page",
  ],
  community: [
    "Top: question-led posts",
    "Middle: free workshops",
    "Action: paid community signup",
  ],
};

const NORTH_STAR: Record<MonetisationGoal, string> = {
  audience: "Followers / week (with reply rate floor)",
  "digital-product": "Email signups → trial → paid (week 4 cohort)",
  services: "Qualified discovery calls booked / week",
  sponsorships: "Inbound brand inquiries / month",
  community: "Paid members / month + monthly retention",
};

export function generateBlueprint(input: BlueprintInput): BlueprintPlan {
  const { niche, audience, monetisation } = input;
  const audienceLabel = audience || "your audience";
  const nicheLabel = niche || "your niche";

  const positioning = `For ${audienceLabel} working on ${nicheLabel}, you are the operator who shows the work — not the guru who sells it.`;

  const pillars = PILLAR_BANK[monetisation].map(
    (theme) => `${theme} — applied to ${nicheLabel}`,
  );

  const cadence = [
    { format: "Short-form video", perWeek: 3, purpose: "discovery / top-of-funnel" },
    { format: "Long-form post / newsletter", perWeek: 1, purpose: "depth + trust" },
    { format: "Reply / engagement block", perWeek: 5, purpose: "distribution + signal" },
    {
      format: monetisation === "services" ? "Free audit slot" : "Direct CTA post",
      perWeek: 1,
      purpose: "conversion",
    },
  ];

  const funnel = FUNNEL_BANK[monetisation];

  const ninetyDay = [
    `Days 1–30: lock positioning, ship 30 short-form posts in pillar rotation, build email capture for ${audienceLabel}.`,
    `Days 31–60: double down on the 2 best-performing pillars, launch first lead magnet aligned with ${MONETISATION_LABELS[monetisation].toLowerCase()}.`,
    `Days 61–90: open the conversion path (${funnel[2]}), measure against north-star, prune what isn't compounding.`,
  ];

  return {
    positioning,
    pillars,
    cadence,
    funnel,
    northStar: NORTH_STAR[monetisation],
    ninetyDay,
  };
}

export function formatBlueprint(input: BlueprintInput, plan: BlueprintPlan): string {
  return [
    `NICHE: ${input.niche}`,
    `AUDIENCE: ${input.audience}`,
    `MONETISATION GOAL: ${MONETISATION_LABELS[input.monetisation]}`,
    "",
    "POSITIONING",
    plan.positioning,
    "",
    "CONTENT PILLARS",
    ...plan.pillars.map((p, i) => `${i + 1}. ${p}`),
    "",
    "WEEKLY CADENCE",
    ...plan.cadence.map(
      (c) => `- ${c.format} × ${c.perWeek}/wk — ${c.purpose}`,
    ),
    "",
    "FUNNEL",
    ...plan.funnel.map((f, i) => `${i + 1}. ${f}`),
    "",
    `NORTH STAR METRIC: ${plan.northStar}`,
    "",
    "90-DAY ROADMAP",
    ...plan.ninetyDay.map((d, i) => `${i + 1}. ${d}`),
  ].join("\n");
}
