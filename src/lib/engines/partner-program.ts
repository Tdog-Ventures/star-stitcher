// ETHINX Partner Program — partner, affiliate, and collaborator campaigns.
import { formatFooter } from "./output-footer";

export type CommissionModel =
  | "flat-fee"
  | "percent-revshare"
  | "lifetime-revshare"
  | "tiered"
  | "hybrid";

export type OutreachChannel = "email" | "dm" | "warm-intro" | "linkedin" | "phone";

export const COMMISSION_LABELS: Record<CommissionModel, string> = {
  "flat-fee": "Flat fee per conversion",
  "percent-revshare": "% of first-month revenue",
  "lifetime-revshare": "% lifetime revenue share",
  tiered: "Tiered (more sales = higher %)",
  hybrid: "Hybrid (flat + recurring)",
};

export const OUTREACH_CHANNEL_LABELS: Record<OutreachChannel, string> = {
  email: "Email",
  dm: "Direct message (Twitter / IG)",
  "warm-intro": "Warm intro",
  linkedin: "LinkedIn message",
  phone: "Phone / SMS",
};

const COMMISSION_DEFAULT_TERMS: Record<CommissionModel, string> = {
  "flat-fee": "Suggested: $50–$200 per paid conversion. Paid net-30, no clawback after 30 days.",
  "percent-revshare": "Suggested: 30% of first 30 days. Paid net-15.",
  "lifetime-revshare": "Suggested: 20% lifetime, paid monthly while customer remains active.",
  tiered: "Suggested: 20% (1–5 sales) → 30% (6–20) → 40% (20+), reset quarterly.",
  hybrid: "Suggested: $100 flat on activation + 15% recurring for 12 months.",
};

export interface PartnerProgramInput {
  product_or_offer: string;
  ideal_partner_type: string;
  commission_model: CommissionModel;
  target_market: string;
  outreach_channel: OutreachChannel;
  partner_incentive: string;
  campaign_goal: string;
}

export interface PartnerProgramOutput {
  partner_profile: string;
  value_proposition: string;
  commission_structure: string;
  outreach_sequence: { step: number; channel: string; intent: string; copy_hint: string }[];
  onboarding_steps: string[];
  tracking_method: string;
  partner_content_assets_needed: string[];
  campaign_rules: string[];
  distribution_recommendation: string;
  success_metric: string;
}

export function generatePartnerProgram(input: PartnerProgramInput): PartnerProgramOutput {
  const product = input.product_or_offer || "our offer";
  const partner = input.ideal_partner_type || "the partner";
  const market = input.target_market || "our target market";
  const channel = OUTREACH_CHANNEL_LABELS[input.outreach_channel];
  const incentive = input.partner_incentive || "the standard commission";

  return {
    partner_profile: `Ideal partner: ${partner}, with audience overlap in ${market}. They publish consistently, monetize via at least one partnership today, and can attribute conversions cleanly.`,
    value_proposition: `${partner}'s audience already has the problem ${product} solves. We pay you to send them the answer — under ${COMMISSION_LABELS[input.commission_model].toLowerCase()}, no exclusivity required, with ${incentive} on top.`,
    commission_structure: `${COMMISSION_LABELS[input.commission_model]} — ${COMMISSION_DEFAULT_TERMS[input.commission_model]}`,
    outreach_sequence: [
      { step: 1, channel: "Public engagement", intent: "Be on their radar. No ask.", copy_hint: "Reply substantively to 3 of their posts over 7 days." },
      { step: 2, channel, intent: "Personalized intro + give value.", copy_hint: `Lead with what you noticed about ${partner}'s audience. Mention ${product} in one line. Ask one question.` },
      { step: 3, channel: "Email with brief", intent: "Send the one-pager + commission terms.", copy_hint: `Subject: "Quick partnership idea — ${product}". Include link to enablement kit.` },
      { step: 4, channel: "15-min call", intent: "Walk through tracking + first promo slot.", copy_hint: "Ask them how they want to be paid + what their content cadence allows." },
      { step: 5, channel: "Async follow-up", intent: "Confirm tracking link + go-live date.", copy_hint: "Send a one-screenshot setup confirmation. Make activation the easiest step." },
    ],
    onboarding_steps: [
      `Generate a unique tracking link + promo code (extra 10% off for their audience).`,
      `Send the enablement kit (one-pager, swipe posts, demo video, FAQ).`,
      `Confirm payment method + W-9 / equivalent before first commission triggers.`,
      `Schedule first promo slot in their calendar within 2 weeks of signing.`,
      `Add them to a private partner Slack / channel for fast questions.`,
    ],
    tracking_method: `Unique UTM-tagged tracking link per partner + a promo code as a fallback. Attribution window: 30 days, last-click. Monthly partner dashboard with attributable signups, conversions, and commission earned.`,
    partner_content_assets_needed: [
      `One-pager: what ${product} does, who it's for, what success looks like in 30 days.`,
      `3 swipe posts (long-form, short-form, story format) — written in their voice, not ours.`,
      `Demo video link (≤ 90s) showing the actual product in action.`,
      `FAQ doc covering the 5 most common objections.`,
      `Partner-specific landing page (40% lift vs generic LP).`,
    ],
    campaign_rules: [
      `No exclusivity — partners can promote competitors freely.`,
      `Clawback only on refunds within 30 days.`,
      `Public partner page (transparency builds inbound).`,
      `Cap of 3 active outreach threads per week — quality over reach.`,
      `Goal: ${input.campaign_goal || "first attributed conversion within 60 days of partner signing"}.`,
    ],
    distribution_recommendation: `Outreach is 1:1, not broadcast. Send via ${channel} (the partner's preferred channel) — never cold InMail. Make the enablement kit a single shareable doc link. Public partner page lives on the marketing site.`,
    success_metric: `≥ 30% reply rate at Step 2 (${channel}). 1 active partner per 10 contacted within 30 days. First partner-attributed conversion within 60 days.`,
  };
}

export function formatPartnerProgram(
  input: PartnerProgramInput,
  out: PartnerProgramOutput,
): string {
  return [
    `PRODUCT / OFFER: ${input.product_or_offer}`,
    `IDEAL PARTNER: ${input.ideal_partner_type}`,
    `COMMISSION: ${COMMISSION_LABELS[input.commission_model]}`,
    `TARGET MARKET: ${input.target_market} · OUTREACH: ${OUTREACH_CHANNEL_LABELS[input.outreach_channel]}`,
    `INCENTIVE: ${input.partner_incentive || "—"} · GOAL: ${input.campaign_goal || "—"}`,
    "",
    "PARTNER PROFILE",
    out.partner_profile,
    "",
    "VALUE PROPOSITION",
    out.value_proposition,
    "",
    `COMMISSION STRUCTURE: ${out.commission_structure}`,
    "",
    "OUTREACH SEQUENCE",
    ...out.outreach_sequence.map(
      (o) => `Step ${o.step} · ${o.channel} — ${o.intent}\n  → ${o.copy_hint}`,
    ),
    "",
    "ONBOARDING",
    ...out.onboarding_steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    `TRACKING METHOD: ${out.tracking_method}`,
    "",
    "PARTNER CONTENT ASSETS NEEDED",
    ...out.partner_content_assets_needed.map((a, i) => `${i + 1}. ${a}`),
    "",
    "CAMPAIGN RULES",
    ...out.campaign_rules.map((r, i) => `${i + 1}. ${r}`),
    formatFooter({
      nextSteps: [
        `Build the partner one-pager today — focus on what success looks like in 30 days.`,
        `Compile a list of 10 partners matching "${input.ideal_partner_type || "the profile"}". Score each on audience fit (1–5).`,
        `Start Step 1 (public engagement) on the top-3 this week. No ask, just visibility.`,
        `Set up unique tracking links + a simple shared sheet to log conversations.`,
      ],
      distribution: out.distribution_recommendation,
      successMetric: out.success_metric,
    }),
  ].join("\n");
}
