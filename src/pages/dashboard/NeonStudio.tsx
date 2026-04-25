import { StubEngine } from "@/components/engine/StubEngine";
import {
  formatSceneBrief,
  generateSceneBrief,
  PLATFORM_LABELS,
  STYLE_LABELS,
  type Platform,
  type VisualStyle,
} from "@/lib/engines/neon-studio";

const NeonStudio = () => (
  <StubEngine
    engineKey="neon_studio"
    assetType="visual-brief"
    title="Neon Studio"
    description="Scene direction for thumbnails, reels, and hero shots — sized to the platform."
    intro="Output: shot list, composition, motion, on-screen text, and platform spec."
    sample={{
      visualStyle: "neon-cyberpunk" satisfies VisualStyle,
      scene: "Founder typing into a glowing terminal at 2am, city out of focus behind",
      platform: "tiktok" satisfies Platform,
    }}
    fields={[
      {
        key: "visualStyle",
        label: "Visual style",
        options: (Object.keys(STYLE_LABELS) as VisualStyle[]).map((k) => ({
          value: k,
          label: STYLE_LABELS[k],
        })),
      },
      {
        key: "scene",
        label: "Scene idea",
        placeholder: "Describe the moment you want to capture",
        textarea: true,
        required: true,
      },
      {
        key: "platform",
        label: "Platform",
        options: (Object.keys(PLATFORM_LABELS) as Platform[]).map((k) => ({
          value: k,
          label: PLATFORM_LABELS[k],
        })),
      },
    ]}
    buildTitle={(v) =>
      `Scene: ${(v.scene || "Untitled").slice(0, 60)}${v.scene && v.scene.length > 60 ? "…" : ""}`
    }
    buildContent={(v) => {
      const input = {
        visualStyle: v.visualStyle as VisualStyle,
        scene: v.scene,
        platform: v.platform as Platform,
      };
      return formatSceneBrief(input, generateSceneBrief(input));
    }}
  />
);

export default NeonStudio;
