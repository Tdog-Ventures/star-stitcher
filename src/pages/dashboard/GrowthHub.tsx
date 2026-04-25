import { StubEngine } from "@/components/engine/StubEngine";

const GrowthHub = () => (
  <StubEngine
    engineKey="growth_hub"
    assetType="growth-plan"
    title="Growth Hub"
    description="One-page growth plan: north-star metric, channels, weekly experiments."
    intro="Pick one metric, three channels, three experiments. Ship weekly."
    sample={{
      northStar: "Booked audit calls / week",
      currentBaseline: "2 / week",
      target: "10 / week in 30 days",
      channels: "Cold email, LinkedIn DMs, X replies",
    }}
    fields={[
      { key: "northStar", label: "North-star metric" },
      { key: "currentBaseline", label: "Current baseline" },
      { key: "target", label: "30-day target" },
      { key: "channels", label: "Top 3 channels" },
    ]}
    buildTitle={(v) => `Growth: ${v.northStar || "Untitled metric"}`}
    buildContent={(v) =>
      [
        `NORTH STAR: ${v.northStar}`,
        `BASELINE: ${v.currentBaseline}`,
        `TARGET (30d): ${v.target}`,
        `CHANNELS: ${v.channels}`,
        "",
        "WEEKLY EXPERIMENTS:",
        "Week 1 — Test one new hook on each channel, measure reply rate.",
        "Week 2 — Double-down on winning channel, kill the worst.",
        "Week 3 — Add one outbound + one inbound asset.",
        "Week 4 — Recap, decide what becomes default playbook.",
        "",
        "RULES:",
        "- One metric. One owner. One review per week.",
        "- Kill any experiment that doesn't beat baseline in 2 weeks.",
      ].join("\n")
    }
  />
);

export default GrowthHub;
