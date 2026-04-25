// Partner Program — turns product + target partner + commission model
// into a partner recruitment brief.
import { formatFooter } from "./output-footer";

export type CommissionModel =
  | "flat-fee"
  | "percent-revshare"
  | "lifetime-revshare"
  | "tiered"
  | "hybrid";

export const COMMISSION_LABELS: Record<CommissionModel, string> = {
  "flat-fee": "Flat fee per conversion",
  "percent-revshare": "% of first-month revenue",
  "lifetime-revshare": "% lifetime revenue share",
  tiered: "Tiered (more sales = higher %)",
  hybrid: "Hybrid (flat + recurring)",
};

const COMMISSION_DEFAULT_TERMS: Record<CommissionModel, string> = {
  "flat-fee": "Suggested: $50–$200 per paid conversion. Paid net-30, no clawback after 30 days.",
  "percent-revshare": "Suggested: 30% of first 30 days. Paid net-15.",
  "lifetime-revshare": "Suggested: 20% lifetime, paid monthly while customer remains active.",
  tiered: "Suggested: 20% (1–5 sales) → 30% (6–20) → 40% (20+), reset quarterly.",
  hybrid: "Suggested: $100 flat on activation + 15% recurring for 12 months.",
};

const PARTNER_PROFILE_QUESTIONS = [
  "Who is their audience overlap with us? (be specific)",
  "What is their distribution channel and reach?",
  "Have they monetized via partnerships before?",
  "What's their content cadence?",
];

export interface PartnerInput {
  product: string;
  targetPartner: string;
  commissionModel: CommissionModel;
}

interface PartnerBrief {
  pitch: string;
  whyThemWhyNow: string;
  enablementKit: string[];
  outreach: { step: number; channel: string; intent: string; copyHint: string }[];
  guardrails: string[];
}

export function generatePartnerBrief(input: PartnerInput): PartnerBrief {
  const product = input.product || "our product";
  const partner = input.targetPartner || "the partner";
  return {
    pitch: `${partner}'s audience already has the problem ${product} solves. We pay you to send them the answer — under the ${COMMISSION_LABELS[input.commissionModel].toLowerCase()} structure, with no exclusivity required.`,
    whyThemWhyNow: `Their audience trusts them on this exact topic, and we're seeing strong conversion when ${product} is recommended (not advertised). The window matters: similar partners in this niche are signing now.`,
    enablementKit: [
      `One-pager: what ${product} does, who it's for, what success looks like in 30 days.`,
      "3 swipe posts (long-form, short-form, story format) — written in their voice, not ours.",
      "Demo video link (≤ 90s) showing the actual product in action.",
      "Unique tracking link + promo code (extra 10% off for their audience).",
      "FAQ doc covering the 5 most common objections.",
    ],
    outreach: [
      {
        step: 1,
        channel: "Public reply / engagement",
        intent: "Be on their radar. No ask.",
        copyHint: "Reply substantively to 3 of their posts over 7 days.",
      },
      {
        step: 2,
        channel: "Direct message / email",
        intent: "Personalized intro + give value.",
        copyHint: `Lead with what you noticed about ${partner}'s audience. Mention ${product} in one line. Ask one question.`,
      },
      {
        step: 3,
        channel: "Email with brief",
        intent: "Send the one-pager + commission terms.",
        copyHint: `Subject: "Quick partnership idea — ${product}". Include link to enablement kit.`,
      },
      {
        step: 4,
        channel: "15-min call",
        intent: "Walk through tracking + first promo slot.",
        copyHint: "Ask them how they want to be paid + what their content cadence allows.",
      },
      {
        step: 5,
        channel: "Async follow-up",
        intent: "Confirm tracking link + go-live date.",
        copyHint: "Send a one-screenshot setup confirmation. Make activation the easiest step.",
      },
    ],
    guardrails: [
      `No exclusivity — partners can promote competitors freely.`,
      `Clawback only on refunds within 30 days.`,
      `Public partner page (transparency builds inbound).`,
      `Cap of 3 active outreach threads per week — quality over reach.`,
    ],
  };
}

export function formatPartnerBrief(input: PartnerInput, brief: PartnerBrief): string {
  return [
    `PRODUCT: ${input.product}`,
    `TARGET PARTNER: ${input.targetPartner}`,
    `COMMISSION MODEL: ${COMMISSION_LABELS[input.commissionModel]}`,
    `TERMS: ${COMMISSION_DEFAULT_TERMS[input.commissionModel]}`,
    "",
    "ELEVATOR PITCH",
    brief.pitch,
    "",
    "WHY THEM, WHY NOW",
    brief.whyThemWhyNow,
    "",
    "QUALIFY THE PARTNER",
    ...PARTNER_PROFILE_QUESTIONS.map((q, i) => `${i + 1}. ${q}`),
    "",
    "ENABLEMENT KIT",
    ...brief.enablementKit.map((e, i) => `${i + 1}. ${e}`),
    "",
    "OUTREACH SEQUENCE",
    ...brief.outreach.map(
      (o) => `Step ${o.step} · ${o.channel} — ${o.intent}\n  → ${o.copyHint}`,
    ),
    "",
    "GUARDRAILS",
    ...brief.guardrails.map((g, i) => `${i + 1}. ${g}`),
    formatFooter({
      nextSteps: [
        `Build the partner one-pager today — focus on what success looks like in 30 days.`,
        `Compile a list of 10 partners matching "${input.targetPartner || "the profile"}". Score each on audience fit (1–5).`,
        `Start Step 1 (public engagement) on the top-3 this week. No ask, just visibility.`,
        `Set up unique tracking links + a simple shared sheet to log conversations.`,
      ],
      distribution: `Outreach is 1:1, not broadcast. Send via the partner's preferred channel (most prefer email or DM, never cold InMail). Make the enablement kit a single shareable doc link.`,
      successMetric: `≥ 30% reply rate at Step 2 (DM/email). 1 active partner per 10 contacted within 30 days. First partner-attributed conversion within 60 days.`,
    }),
  ].join("\n");
}
