import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Compass,
  FileText,
  Megaphone,
  Palette,
  Rocket,
  Send,
  Sparkles,
  TrendingUp,
  Video,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EngineLayout } from "@/components/engine";

interface EngineDef {
  key: string;
  name: string;
  description: string;
  icon: typeof Sparkles;
  to: string;
  status: "available" | "coming-soon";
  primary?: boolean;
}

const ENGINES: EngineDef[] = [
  {
    key: "video-forge",
    name: "Video Forge",
    description:
      "Turn a topic into a structured video script: hook, main points, CTA, captions, and hashtags. Instant.",
    icon: Video,
    to: "/engines/video-forge",
    status: "available",
    primary: true,
  },
  {
    key: "creator-blueprint",
    name: "Creator Blueprint",
    description:
      "Map your creator brand: niche, content pillars, audience, and weekly cadence in one plan.",
    icon: Compass,
    to: "/engines/creator-blueprint",
    status: "available",
  },
  {
    key: "creator-launchpad",
    name: "Creator Launchpad",
    description:
      "A 14-day launch plan for any new offer or content series. Pre-launch through post-launch.",
    icon: Rocket,
    to: "/engines/creator-launchpad",
    status: "available",
  },
  {
    key: "neon-studio",
    name: "Neon Studio",
    description:
      "Visual brief for thumbnails, covers, and hero graphics. Composition + on-image text.",
    icon: Palette,
    to: "/engines/neon-studio",
    status: "available",
  },
  {
    key: "video-velocity",
    name: "Video Velocity",
    description:
      "Batch a week of short-form videos from one core idea. 7 angles, ready to film.",
    icon: Zap,
    to: "/engines/video-velocity",
    status: "available",
  },
  {
    key: "partner-program",
    name: "Partner Program",
    description:
      "Design a referral or affiliate program: partner profile, reward, tracking, enablement kit.",
    icon: Megaphone,
    to: "/engines/partner-program",
    status: "available",
  },
  {
    key: "growth-hub",
    name: "Growth Hub",
    description:
      "One-page growth plan: north-star metric, top channels, weekly experiments.",
    icon: TrendingUp,
    to: "/engines/growth-hub",
    status: "available",
  },
  {
    key: "showcase",
    name: "ETHINX Showcase",
    description:
      "Package finished work into a public-facing case study, portfolio card, or social post.",
    icon: Award,
    to: "/engines/showcase",
    status: "available",
  },
  {
    key: "offer",
    name: "Offer Engine",
    description:
      "Turn a rough product idea into a structured offer: positioning, pricing, proof, CTA.",
    icon: Sparkles,
    to: "/engines/offer",
    status: "available",
  },
  {
    key: "distribution",
    name: "Distribution Planner",
    description: "Plan posts and outreach across channels from any saved asset.",
    icon: Send,
    to: "/distribution",
    status: "available",
  },
  {
    key: "content",
    name: "Content Repurpose",
    description: "Take one offer and split it into a week of channel-native posts.",
    icon: FileText,
    to: "/engines",
    status: "coming-soon",
  },
];

const Engines = () => (
  <EngineLayout
    title="Engines"
    description="Each engine is a small, focused workflow. Open one, fill the form, save the output as an asset."
  >
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {ENGINES.map((engine) => {
        const Icon = engine.icon;
        const disabled = engine.status === "coming-soon";
        return (
          <Card
            key={engine.key}
            className={
              engine.primary
                ? "ethinx-hover-glow flex flex-col border-primary/50"
                : "ethinx-hover-glow flex flex-col"
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-muted-foreground" />
                {disabled ? (
                  <Badge variant="secondary">Soon</Badge>
                ) : engine.primary ? (
                  <Badge>Primary</Badge>
                ) : null}
              </div>
              <CardTitle className="mt-3 text-base">{engine.name}</CardTitle>
              <CardDescription>{engine.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button
                asChild={!disabled}
                disabled={disabled}
                variant={disabled ? "secondary" : "default"}
                size="sm"
                className="w-full"
              >
                {disabled ? (
                  <span>Coming soon</span>
                ) : (
                  <Link to={engine.to}>
                    Open engine
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </EngineLayout>
);

export default Engines;
