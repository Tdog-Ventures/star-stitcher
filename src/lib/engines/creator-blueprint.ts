// Creator Blueprint — turns niche, audience, monetisation goal,
// content style, current assets, primary platform, timeframe into a
// structured creator strategy + monetisation blueprint.
import { formatFooter } from "./output-footer";

export type MonetisationGoal =
  | "audience"
  | "digital-product"
  | "services"
  | "sponsorships"
  | "community";

export type ContentStyle =
  | "educational"
  | "entertainment"
  | "deep-dive"
  | "behind-the-scenes"
  | "hot-take";

export type BlueprintPlatform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "linkedin"
  | "x"
  | "newsletter";

export type BlueprintTimeframe = "30-days" | "60-days" | "90-days";

export const MONETISATION_LABELS: Record<MonetisationGoal, string> = {
  audience: "Build audience first",
  "digital-product": "Sell digital product",
  services: "Book services / consulting",
  sponsorships: "Land sponsorships",
  community: "Grow paid community",
};

export const CONTENT_STYLE_LABELS: Record<ContentStyle, string> = {
  educational: "Educational",
  entertainment: "Entertainment",
  "deep-dive": "Deep-dive",
  "behind-the-scenes": "Behind-the-scenes",
  "hot-take": "Hot take",
};

export const BLUEPRINT_PLATFORM_LABELS: Record<BlueprintPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
  newsletter: "Newsletter",
};

export const BLUEPRINT_TIMEFRAME_LABELS: Record<BlueprintTimeframe, string> = {
  "30-days": "30 days",
  "60-days": "60 days",
  "90-days": "90 days",
};

export interface CreatorBlueprintInput {
  niche: string;
  target_audience: string;
  monetisation_goal: MonetisationGoal;
  content_style: ContentStyle;
  current_assets: string;
  primary_platform: BlueprintPlatform;
  timeframe: BlueprintTimeframe;
}

export interface CreatorBlueprintOutput {
  positioning_statement: string;
  audience_profile: string;
  creator_angle: string;
  authority_topics: string[];
  content_pillars: string[];
  offer_ladder: { tier: string; offer: string; price: string }[];
  lead_magnet_ideas: string[];
  thirty_day_content_plan: { week: number; theme: string; posts: string[] }[];
  monetisation_path: string[];
  risks: string[];
  distribution_recommendation: string;
  success_metric: string;
}

const PILLAR_BANK: Record<MonetisationGoal, string[]> = {
  audience: ["Insight", "Story", "Hot take", "Recap"],
  "digital-product": ["Problem", "Method", "Proof", "Offer"],
  services: ["Diagnostic", "Case study", "Process", "Result"],
  sponsorships: ["Trend", "Deep-dive", "Personality", "Recommendation"],
  community: ["Question", "Member spotlight", "Lesson", "Behind-the-scenes"],
};

const NORTH_STAR: Record<MonetisationGoal, string> = {
  audience: "Followers / week with reply-rate floor ≥ 5%",
  "digital-product": "Email signups → trial → paid (week 4 cohort) ≥ 3%",
  services: "Qualified discovery calls booked / week ≥ 3",
  sponsorships: "Inbound brand inquiries / month ≥ 4",
  community: "Net new paid members / month + ≥ 80% month-2 retention",
};

const OFFER_LADDER: Record<MonetisationGoal, { tier: string; offer: string; price: string }[]> = {
  audience: [
    { tier: "Free", offer: "Newsletter", price: "$0" },
    { tier: "Tip jar", offer: "Sponsor / pay-what-you-want", price: "$5+" },
    { tier: "Premium", offer: "Paid newsletter tier", price: "$10/mo" },
  ],
  "digital-product": [
    { tier: "Lead", offer: "Free template / mini-guide", price: "$0" },
    { tier: "Entry", offer: "Mini-product", price: "$29" },
    { tier: "Core", offer: "Full course / playbook", price: "$199" },
    { tier: "Premium", offer: "Cohort or coaching add-on", price: "$999" },
  ],
  services: [
    { tier: "Lead", offer: "Free 15-min audit", price: "$0" },
    { tier: "Productized", offer: "Fixed-scope sprint", price: "$1.5k" },
    { tier: "Retainer", offer: "Monthly retainer", price: "$5k/mo" },
  ],
  sponsorships: [
    { tier: "Free", offer: "Public content", price: "$0" },
    { tier: "Inline", offer: "Newsletter sponsor slot", price: "$300/issue" },
    { tier: "Integrated", offer: "Branded video", price: "$3k+" },
  ],
  community: [
    { tier: "Free", offer: "Open Discord / channel", price: "$0" },
    { tier: "Paid", offer: "Members-only space", price: "$25/mo" },
    { tier: "Inner circle", offer: "Annual + workshops", price: "$500/yr" },
  ],
};

function buildLeadMagnets(input: CreatorBlueprintInput): string[] {
  const niche = input.niche || "your niche";
  return [
    `One-page checklist that solves the #1 pain in ${niche} (downloadable PDF).`,
    `Swipe file: 10 worked examples from ${niche} with annotations.`,
    `Free 15-min audit / teardown of the viewer's ${niche} setup.`,
  ];
}

function build30DayPlan(input: CreatorBlueprintInput, pillars: string[]): { week: number; theme: string; posts: string[] }[] {
  const niche = input.niche || "your niche";
  return [
    {
      week: 1,
      theme: `Position: who you help and how`,
      posts: [
        `Manifesto post — what you believe about ${niche} that others get wrong.`,
        `Pillar 1 (${pillars[0]}) — applied to one specific case.`,
        `Pillar 2 (${pillars[1]}) — short-form proof story.`,
      ],
    },
    {
      week: 2,
      theme: `Prove: show the work`,
      posts: [
        `Case study with numbers (real or composite, labeled honestly).`,
        `Pillar 3 (${pillars[2]}) — contrarian take.`,
        `Recap thread / video of the most useful insight from week 1.`,
      ],
    },
    {
      week: 3,
      theme: `Pull: lead magnet + soft CTA`,
      posts: [
        `Launch the lead magnet in a single post (link in bio / pinned).`,
        `Pillar 4 (${pillars[3]}) — answer the most common DM.`,
        `Behind-the-scenes of how you produced this week's content.`,
      ],
    },
    {
      week: 4,
      theme: `Convert: invite, don't sell`,
      posts: [
        `Open the next-step CTA tied to ${MONETISATION_LABELS[input.monetisation_goal].toLowerCase()}.`,
        `Founder Q&A — answer 5 audience questions in one post.`,
        `Public retrospective: what worked, what didn't, what you'll change.`,
      ],
    },
  ];
}

export function generateCreatorBlueprint(input: CreatorBlueprintInput): CreatorBlueprintOutput {
  const niche = input.niche || "your niche";
  const audience = input.target_audience || "your audience";
  const platform = BLUEPRINT_PLATFORM_LABELS[input.primary_platform];

  const positioning = `For ${audience} working on ${niche}, you are the operator who shows the work — not the guru who sells it. Style: ${CONTENT_STYLE_LABELS[input.content_style].toLowerCase()}, on ${platform}.`;
  const audience_profile = `Who: ${audience}. Where they hang out: ${platform}. What they Google at 2am: "${niche} that actually works". What they distrust: jargon, hype, no-receipts gurus.`;
  const creator_angle = `You ship ${CONTENT_STYLE_LABELS[input.content_style].toLowerCase()} content from inside ${niche} — using artifacts (${input.current_assets || "your real workflow"}) others won't show.`;

  const authority_topics = [
    `${niche}: the simplest model that still works`,
    `${niche}: 3 things to stop doing`,
    `${niche}: how I'd start over today`,
    `${niche}: what changes in the next 12 months`,
  ];

  const pillars = PILLAR_BANK[input.monetisation_goal].map((t) => `${t} — applied to ${niche}`);
  const offer_ladder = OFFER_LADDER[input.monetisation_goal];
  const lead_magnet_ideas = buildLeadMagnets(input);
  const thirty_day_content_plan = build30DayPlan(input, pillars);

  const monetisation_path = [
    `Days 1–${input.timeframe === "30-days" ? "10" : input.timeframe === "60-days" ? "20" : "30"}: lock positioning, ship pillar rotation, build email capture.`,
    `Days ${input.timeframe === "30-days" ? "11–20" : input.timeframe === "60-days" ? "21–40" : "31–60"}: launch lead magnet aligned with ${MONETISATION_LABELS[input.monetisation_goal].toLowerCase()}.`,
    `Days ${input.timeframe === "30-days" ? "21–30" : input.timeframe === "60-days" ? "41–60" : "61–90"}: open the offer (${offer_ladder[Math.min(1, offer_ladder.length - 1)].offer}) — measure against north star.`,
  ];

  const risks = [
    `Spreading across more than 2 platforms — kills compounding. Lead with ${platform} only for the first 30 days.`,
    `Skipping the lead magnet — you'll have audience but no list, and no list = no monetisation.`,
    `Inconsistent cadence (>2 days off) — algorithms punish silence faster than mediocre content.`,
  ];

  return {
    positioning_statement: positioning,
    audience_profile,
    creator_angle,
    authority_topics,
    content_pillars: pillars,
    offer_ladder,
    lead_magnet_ideas,
    thirty_day_content_plan,
    monetisation_path,
    risks,
    distribution_recommendation: `Lead 100% with ${platform} for 30 days. Mirror the same week's content into a Friday newsletter for compounding ownership. Cross-post nothing else until ${platform} hits 1k engaged followers.`,
    success_metric: NORTH_STAR[input.monetisation_goal],
  };
}

export function formatCreatorBlueprint(
  input: CreatorBlueprintInput,
  out: CreatorBlueprintOutput,
): string {
  return [
    `NICHE: ${input.niche}`,
    `AUDIENCE: ${input.target_audience}`,
    `MONETISATION GOAL: ${MONETISATION_LABELS[input.monetisation_goal]}`,
    `CONTENT STYLE: ${CONTENT_STYLE_LABELS[input.content_style]} · PLATFORM: ${BLUEPRINT_PLATFORM_LABELS[input.primary_platform]} · TIMEFRAME: ${BLUEPRINT_TIMEFRAME_LABELS[input.timeframe]}`,
    "",
    "POSITIONING",
    out.positioning_statement,
    "",
    `AUDIENCE PROFILE: ${out.audience_profile}`,
    `CREATOR ANGLE: ${out.creator_angle}`,
    "",
    "AUTHORITY TOPICS",
    ...out.authority_topics.map((t, i) => `${i + 1}. ${t}`),
    "",
    "CONTENT PILLARS",
    ...out.content_pillars.map((p, i) => `${i + 1}. ${p}`),
    "",
    "OFFER LADDER",
    ...out.offer_ladder.map((o) => `- ${o.tier}: ${o.offer} (${o.price})`),
    "",
    "LEAD MAGNETS",
    ...out.lead_magnet_ideas.map((l, i) => `${i + 1}. ${l}`),
    "",
    "30-DAY CONTENT PLAN",
    ...out.thirty_day_content_plan.flatMap((w) => [
      `Week ${w.week} — ${w.theme}`,
      ...w.posts.map((p, i) => `  ${i + 1}. ${p}`),
    ]),
    "",
    "MONETISATION PATH",
    ...out.monetisation_path.map((m, i) => `${i + 1}. ${m}`),
    "",
    "RISKS",
    ...out.risks.map((r, i) => `${i + 1}. ${r}`),
    formatFooter({
      nextSteps: [
        `Pick the top-2 pillars and write 5 hooks for each — by end of day.`,
        `Set up the email-capture page anchored on the lead magnet.`,
        `Block the weekly cadence into your calendar today.`,
        `Schedule a Friday review: which pillar got most traction?`,
      ],
      distribution: out.distribution_recommendation,
      successMetric: out.success_metric,
    }),
  ].join("\n");
}
