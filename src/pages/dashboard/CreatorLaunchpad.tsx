import { StubEngine } from "@/components/engine/StubEngine";

const CreatorLaunchpad = () => (
  <StubEngine
    engineKey="creator_launchpad"
    assetType="launch-plan"
    title="Creator Launchpad"
    description="A 14-day launch plan for a new offer, product, or content series."
    intro="Day-by-day plan: pre-launch, launch week, post-launch."
    sample={{
      product: "Cold Email Audit ($299 one-off)",
      audience: "B2B SaaS founders under $50k MRR",
      goal: "Book 20 audit calls in 14 days",
      channels: "X, LinkedIn, email list",
    }}
    fields={[
      { key: "product", label: "What you're launching", placeholder: "Offer / product / series" },
      { key: "audience", label: "Target audience" },
      { key: "goal", label: "Launch goal", placeholder: "Concrete outcome in numbers" },
      { key: "channels", label: "Channels", placeholder: "Where you'll post" },
    ]}
    buildTitle={(v) => `Launchpad: ${v.product || "Untitled launch"}`}
    buildContent={(v) =>
      [
        `LAUNCH: ${v.product}`,
        `AUDIENCE: ${v.audience}`,
        `GOAL: ${v.goal}`,
        `CHANNELS: ${v.channels}`,
        "",
        "PRE-LAUNCH (Day 1–4)",
        "1. Tease the problem (no product mention)",
        "2. Share a contrarian take on the topic",
        "3. Open list / waitlist",
        "4. Behind-the-scenes proof",
        "",
        "LAUNCH WEEK (Day 5–10)",
        "5. Launch announcement post",
        "6. Customer / case study story",
        "7. Objection-handling content",
        "8. Founder story: why now",
        "9. Limited-time bonus / urgency",
        "10. Direct CTA + social proof",
        "",
        "POST-LAUNCH (Day 11–14)",
        "11. Recap + results",
        "12. Lessons learned (build trust)",
        "13. Next-step offer for non-buyers",
        "14. Open feedback loop",
      ].join("\n")
    }
  />
);

export default CreatorLaunchpad;
