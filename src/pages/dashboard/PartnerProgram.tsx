import { StubEngine } from "@/components/engine/StubEngine";
import {
  COMMISSION_LABELS,
  formatPartnerBrief,
  generatePartnerBrief,
  type CommissionModel,
} from "@/lib/engines/partner-program";

const PartnerProgram = () => (
  <StubEngine
    engineKey="partner_program"
    assetType="partner-brief"
    title="Partner Program"
    description="Recruitment brief: pitch, qualification, enablement kit, outreach sequence, guardrails."
    intro="Output: a brief you can hand to a VA — or send to the partner directly."
    sample={{
      product: "Cold Email Audit ($299)",
      targetPartner: "Newsletter operators in B2B sales (3k+ subs)",
      commissionModel: "lifetime-revshare" satisfies CommissionModel,
    }}
    fields={[
      {
        key: "product",
        label: "Product",
        placeholder: "What you're paying partners to recommend",
        required: true,
      },
      {
        key: "targetPartner",
        label: "Target partner",
        placeholder: "Specific persona — niche, channel, audience size",
        required: true,
      },
      {
        key: "commissionModel",
        label: "Commission model",
        options: (Object.keys(COMMISSION_LABELS) as CommissionModel[]).map(
          (k) => ({ value: k, label: COMMISSION_LABELS[k] }),
        ),
      },
    ]}
    buildTitle={(v) =>
      `Partner brief: ${v.targetPartner || "Untitled partner"} → ${v.product || "Untitled product"}`
    }
    buildContent={(v) => {
      const input = {
        product: v.product,
        targetPartner: v.targetPartner,
        commissionModel: v.commissionModel as CommissionModel,
      };
      return formatPartnerBrief(input, generatePartnerBrief(input));
    }}
  />
);

export default PartnerProgram;
