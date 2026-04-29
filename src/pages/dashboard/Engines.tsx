import { Link } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  Megaphone,
  Palette,
  Rocket,
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
  icon: typeof Video;
  to: string;
  primary?: boolean;
}

// V3 layout: six engines, dark cards, neon-green CTAs.
// Other engines (Growth Hub, Showcase, Offer, Distribution) remain reachable
// from the sidebar — intentionally hidden here to match the FacelessForge v3
// "VideoForge and the gang" grid.
const ENGINES: EngineDef[] = [
  {
    key: "video-forge",
    name: "Video Forge",
    description: "Turn a topic into a structured script: hook, scenes, captions, hashtags.",
    icon: Video,
    to: "/engines/video-forge",
  },
  {
    key: "creator-blueprint",
    name: "Creator Blueprint",
    description: "Map your creator brand: niche, content pillars, audience, weekly cadence.",
    icon: Compass,
    to: "/engines/creator-blueprint",
  },
  {
    key: "creator-launchpad",
    name: "Creator Launchpad",
    description: "A 14-day launch plan for any new offer or content series.",
    icon: Rocket,
    to: "/engines/creator-launchpad",
  },
  {
    key: "neon-studio",
    name: "Neon Studio",
    description: "Visual brief for thumbnails, covers, and hero graphics.",
    icon: Palette,
    to: "/engines/neon-studio",
  },
  {
    key: "video-velocity",
    name: "Video Velocity",
    description: "Batch a week of short-form videos from one core idea — 7 angles, ready to film.",
    icon: Zap,
    to: "/engines/video-velocity",
  },
  {
    key: "partner-program",
    name: "Partner Program",
    description: "Design a referral or affiliate program: partner profile, reward, enablement kit.",
    icon: Megaphone,
    to: "/engines/partner-program",
    primary: true,
  },
];

const Engines = () => (
  <EngineLayout
    title="Engines"
    description="Pick an engine. Fill the form. Save the output as an asset. Manual-first, instant output."
  >
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {ENGINES.map((engine) => {
        const Icon = engine.icon;
        return (
          <Card
            key={engine.key}
            className="ethinx-hover-glow ethinx-panel flex flex-col bg-card"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                {engine.primary ? (
                  <Badge className="border-primary/40 bg-primary/15 text-primary hover:bg-primary/20">
                    Primary
                  </Badge>
                ) : null}
              </div>
              <CardTitle className="text-base text-foreground">{engine.name}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {engine.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <Button asChild size="sm" className="w-full">
                <Link to={engine.to}>
                  Open engine
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </EngineLayout>
);

export default Engines;
