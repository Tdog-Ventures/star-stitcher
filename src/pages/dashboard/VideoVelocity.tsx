import { StubEngine } from "@/components/engine/StubEngine";

const VideoVelocity = () => (
  <StubEngine
    engineKey="video_velocity"
    assetType="video-batch-plan"
    title="Video Velocity"
    description="Batch plan: turn one core idea into a week of short-form videos."
    intro="One topic → 7 angles → 7 scripts to film in one session."
    sample={{
      coreIdea: "Why most cold email fails in the first line",
      audience: "B2B SaaS founders under $50k MRR",
      format: "9:16 vertical, 30–45s",
    }}
    fields={[
      { key: "coreIdea", label: "Core idea", placeholder: "One sentence topic" },
      { key: "audience", label: "Target audience" },
      { key: "format", label: "Format" },
    ]}
    buildTitle={(v) => `Velocity batch: ${v.coreIdea || "Untitled"}`}
    buildContent={(v) =>
      [
        `CORE IDEA: ${v.coreIdea}`,
        `AUDIENCE: ${v.audience}`,
        `FORMAT: ${v.format}`,
        "",
        "7 ANGLES (one video each):",
        `1. The mistake — what most people get wrong about ${v.coreIdea}`,
        `2. The contrarian take — why the common advice on ${v.coreIdea} is incomplete`,
        `3. The framework — a simple 3-step system for ${v.coreIdea}`,
        `4. The case study — a real example of ${v.coreIdea} working`,
        `5. The myth-bust — one thing about ${v.coreIdea} that just isn't true`,
        `6. The shortcut — a tool / template that makes ${v.coreIdea} faster`,
        `7. The recap — best lessons from this week on ${v.coreIdea}`,
        "",
        "FILMING NOTES:",
        "- Same outfit / setup for batch consistency",
        "- One hook line written before camera rolls",
        "- Cut + caption per video, post 1/day",
      ].join("\n")
    }
  />
);

export default VideoVelocity;
