import { StubEngine } from "@/components/engine/StubEngine";

const NeonStudio = () => (
  <StubEngine
    engineKey="neon_studio"
    assetType="visual-brief"
    title="Neon Studio"
    description="Visual brief for thumbnails, covers, and hero graphics."
    intro="Structured brief a designer (or you) can execute in minutes."
    sample={{
      subject: "Cold email playbook — thumbnail",
      mood: "High contrast, dark background, neon-cyan accent",
      text: "STOP SENDING COLD EMAIL",
      format: "16:9 thumbnail",
    }}
    fields={[
      { key: "subject", label: "What is this for?", placeholder: "Thumbnail, hero, ad creative…" },
      { key: "mood", label: "Mood / style", placeholder: "Colors, contrast, vibe" },
      { key: "text", label: "On-image text", placeholder: "≤ 5 words" },
      { key: "format", label: "Format / ratio", placeholder: "1:1, 16:9, 9:16…" },
    ]}
    buildTitle={(v) => `Neon: ${v.subject || "Untitled brief"}`}
    buildContent={(v) =>
      [
        `SUBJECT: ${v.subject}`,
        `FORMAT: ${v.format}`,
        "",
        `MOOD: ${v.mood}`,
        "",
        `ON-IMAGE TEXT: "${v.text}"`,
        "",
        "COMPOSITION:",
        "- Subject left-third, text right-third",
        "- One dominant focal point",
        "- Negative space for platform UI overlay",
        "",
        "CONSTRAINTS:",
        "- Max 5 words on-image",
        "- Readable at thumbnail size (≤ 320px wide)",
        "- One accent color only",
      ].join("\n")
    }
  />
);

export default NeonStudio;
