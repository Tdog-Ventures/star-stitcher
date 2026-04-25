import { StubEngine } from "@/components/engine/StubEngine";
import {
  COMMISSION_LABELS,
  formatPartnerProgram,
  generatePartnerProgram,
  OUTREACH_CHANNEL_LABELS,
  type CommissionModel,
  type OutreachChannel,
  type PartnerProgramInput,
} from "@/lib/engines/partner-program";

const toInput = (v: Record<string, string>): PartnerProgramInput => ({
  product_or_offer: v.product_or_offer,
  ideal_partner_type: v.ideal_partner_type,
  commission_model: v.commission_model as CommissionModel,
  target_market: v.target_market,
  outreach_channel: v.outreach_channel as OutreachChannel,
  partner_incentive: v.partner_incentive,
  campaign_goal: v.campaign_goal,
});

const PartnerProgram = () => (
  <StubEngine
    engineKey="partner_program"
    assetType="partner_brief"
    title="Partner Program"
    description="Recruitment brief: pitch, qualification, enablement kit, outreach sequence, guardrails."
    intro="Output: partner profile, value prop, commission terms, outreach steps, tracking, content kit."
    sample={{
      product_or_offer: "Cold Email Audit ($299)",
      ideal_partner_type: "Newsletter operators in B2B sales (3k+ subs)",
      commission_model: "lifetime-revshare" satisfies CommissionModel,
      target_market: "Solo founders & 1-person sales teams",
      outreach_channel: "email" satisfies OutreachChannel,
      partner_incentive: "Free audit for their own team",
      campaign_goal: "First attributed conversion within 60 days",
    }}
    fields={[
      { key: "product_or_offer", label: "Product / offer", placeholder: "What partners will recommend", required: true },
      { key: "ideal_partner_type", label: "Ideal partner", placeholder: "Persona — niche, channel, audience size", required: true },
      {
        key: "commission_model",
        label: "Commission model",
        options: (Object.keys(COMMISSION_LABELS) as CommissionModel[]).map((k) => ({
          value: k,
          label: COMMISSION_LABELS[k],
        })),
      },
      { key: "target_market", label: "Target market", placeholder: "Who the partner's audience overlaps with" },
      {
        key: "outreach_channel",
        label: "Outreach channel",
        options: (Object.keys(OUTREACH_CHANNEL_LABELS) as OutreachChannel[]).map((k) => ({
          value: k,
          label: OUTREACH_CHANNEL_LABELS[k],
        })),
      },
      { key: "partner_incentive", label: "Extra incentive", placeholder: "On top of the standard commission" },
      { key: "campaign_goal", label: "Campaign goal", placeholder: "What success looks like + by when" },
    ]}
    buildTitle={(v) =>
      `Partner brief: ${v.ideal_partner_type || "Untitled partner"} → ${v.product_or_offer || "Untitled product"}`
    }
    buildContent={(v) => formatPartnerProgram(toInput(v), generatePartnerProgram(toInput(v)))}
    buildOutput={(v) => generatePartnerProgram(toInput(v))}
  />
);

export default PartnerProgram;
