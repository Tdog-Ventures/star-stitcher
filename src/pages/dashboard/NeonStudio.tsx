import { StubEngine } from "@/components/engine/StubEngine";
import {
  ASPECT_LABELS,
  formatNeonStudio,
  generateNeonStudio,
  NEON_PLATFORM_LABELS,
  STYLE_LABELS,
  type AspectRatio,
  type NeonPlatform,
  type NeonStudioInput,
  type VisualStyle,
} from "@/lib/engines/neon-studio";

const toInput = (v: Record<string, string>): NeonStudioInput => ({
  video_topic: v.video_topic,
  visual_style: v.visual_style as VisualStyle,
  platform: v.platform as NeonPlatform,
  scene_idea: v.scene_idea,
  brand_mood: v.brand_mood,
  color_direction: v.color_direction,
  reference_style: v.reference_style,
  aspect_ratio: v.aspect_ratio as AspectRatio,
});

const NeonStudio = () => (
  <StubEngine
    engineKey="neon_studio"
    assetType="visual_brief"
    title="Neon Studio"
    description="Scene direction for thumbnails, reels, and hero shots — sized to the platform."
    intro="Output: art direction, shot list, on-screen text, image + video prompts, negative prompts."
    sample={{
      video_topic: "Why most cold email fails in the first line",
      visual_style: "neon-cyberpunk" satisfies VisualStyle,
      platform: "tiktok" satisfies NeonPlatform,
      scene_idea: "Founder typing into a glowing terminal at 2am, city out of focus behind",
      brand_mood: "Late-night focus, slightly defiant",
      color_direction: "Magenta + cyan over deep navy",
      reference_style: "Blade Runner 2049 + Apple product film",
      aspect_ratio: "9:16" satisfies AspectRatio,
    }}
    fields={[
      { key: "video_topic", label: "Video topic", placeholder: "What the video is about", required: true },
      {
        key: "visual_style",
        label: "Visual style",
        options: (Object.keys(STYLE_LABELS) as VisualStyle[]).map((k) => ({
          value: k,
          label: STYLE_LABELS[k],
        })),
      },
      {
        key: "platform",
        label: "Platform",
        options: (Object.keys(NEON_PLATFORM_LABELS) as NeonPlatform[]).map((k) => ({
          value: k,
          label: NEON_PLATFORM_LABELS[k],
        })),
      },
      {
        key: "scene_idea",
        label: "Scene idea",
        placeholder: "Describe the moment you want to capture",
        textarea: true,
        required: true,
      },
      { key: "brand_mood", label: "Brand mood", placeholder: "Adjectives — feel, energy" },
      { key: "color_direction", label: "Color direction", placeholder: "Palette hints" },
      { key: "reference_style", label: "Reference style", placeholder: "Films, photographers, brands" },
      {
        key: "aspect_ratio",
        label: "Aspect ratio",
        options: (Object.keys(ASPECT_LABELS) as AspectRatio[]).map((k) => ({
          value: k,
          label: ASPECT_LABELS[k],
        })),
      },
    ]}
    buildTitle={(v) => {
      const seed = (v.scene_idea || v.video_topic || "Untitled").slice(0, 60);
      return `Scene: ${seed}${seed.length === 60 ? "…" : ""}`;
    }}
    buildContent={(v) => formatNeonStudio(toInput(v), generateNeonStudio(toInput(v)))}
    buildOutput={(v) => generateNeonStudio(toInput(v))}
  />
);

export default NeonStudio;
