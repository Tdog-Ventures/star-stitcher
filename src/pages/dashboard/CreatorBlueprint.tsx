import { StubEngine } from "@/components/engine/StubEngine";

const CreatorBlueprint = () => (
  <StubEngine
    engineKey="creator_blueprint"
    assetType="blueprint"
    title="Creator Blueprint"
    description="Map your creator brand: niche, pillars, audience, weekly cadence."
    intro="A repeatable plan for what to post, why, and to whom."
    sample={{
      niche: "B2B SaaS founders going from $0 to $50k MRR",
      pillars: "Cold outbound, offer design, founder storytelling",
      audience: "Solo founders shipping their first paid product",
      cadence: "3 short videos / week, 1 long-form / week",
    }}
    fields={[
      { key: "niche", label: "Niche / positioning", placeholder: "Who you help and how" },
      { key: "pillars", label: "Content pillars", placeholder: "3–5 themes you'll own" },
      { key: "audience", label: "Target audience", placeholder: "Specific persona" },
      { key: "cadence", label: "Weekly cadence", placeholder: "Posts per week per format" },
    ]}
    buildTitle={(v) => `Blueprint: ${v.niche || "Untitled niche"}`}
    buildContent={(v) =>
      [
        `NICHE: ${v.niche}`,
        "",
        "PILLARS:",
        ...v.pillars.split(/[,\n]/).filter(Boolean).map((p, i) => `${i + 1}. ${p.trim()}`),
        "",
        `AUDIENCE: ${v.audience}`,
        "",
        `CADENCE: ${v.cadence}`,
      ].join("\n")
    }
  />
);

export default CreatorBlueprint;
