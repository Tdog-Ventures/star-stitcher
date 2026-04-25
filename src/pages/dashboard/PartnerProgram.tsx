import { StubEngine } from "@/components/engine/StubEngine";

const PartnerProgram = () => (
  <StubEngine
    engineKey="partner_program"
    assetType="partner-brief"
    title="Partner Program"
    description="Design a referral / affiliate program for an offer."
    intro="Who refers, what they get, how it's tracked."
    sample={{
      offer: "Cold Email Audit ($299)",
      partnerProfile: "Newsletter operators in B2B sales (3k+ subs)",
      reward: "30% lifetime commission",
      tracking: "Unique link via Tally + manual reconciliation",
    }}
    fields={[
      { key: "offer", label: "Offer being referred" },
      { key: "partnerProfile", label: "Ideal partner profile" },
      { key: "reward", label: "Reward / commission" },
      { key: "tracking", label: "Tracking method" },
    ]}
    buildTitle={(v) => `Partner program: ${v.offer || "Untitled"}`}
    buildContent={(v) =>
      [
        `OFFER: ${v.offer}`,
        `PARTNER PROFILE: ${v.partnerProfile}`,
        `REWARD: ${v.reward}`,
        `TRACKING: ${v.tracking}`,
        "",
        "OUTREACH SEQUENCE:",
        "1. Personalized intro (no ask)",
        "2. Soft pitch with one-pager",
        "3. Offer trial / sample for partner's audience",
        "4. Confirm tracking + payout cadence",
        "",
        "ENABLEMENT KIT:",
        "- 3 swipe-copy posts",
        "- 1 short demo video link",
        "- 1 FAQ doc",
        "- Promo code / unique link",
      ].join("\n")
    }
  />
);

export default PartnerProgram;
