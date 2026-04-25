import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Compass,
  Megaphone,
  Palette,
  Rocket,
  Sparkles,
  TrendingUp,
  Video,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/AuthProvider";

interface EngineTile {
  key: string;
  name: string;
  blurb: string;
  icon: typeof Sparkles;
  to: string;
  primary?: boolean;
}

const ENGINES: EngineTile[] = [
  {
    key: "video-forge",
    name: "Video Forge",
    blurb: "Topic in. Shootable script, scenes, captions, hashtags out.",
    icon: Video,
    to: "/engines/video-forge",
    primary: true,
  },
  {
    key: "video-velocity",
    name: "Video Velocity",
    blurb: "Batch a week of short-form from one core idea.",
    icon: Zap,
    to: "/engines/video-velocity",
  },
  {
    key: "neon-studio",
    name: "Neon Studio",
    blurb: "Visual brief for thumbnails, covers, hero shots.",
    icon: Palette,
    to: "/engines/neon-studio",
  },
  {
    key: "creator-blueprint",
    name: "Creator Blueprint",
    blurb: "Niche, pillars, audience and weekly cadence in one plan.",
    icon: Compass,
    to: "/engines/creator-blueprint",
  },
  {
    key: "creator-launchpad",
    name: "Creator Launchpad",
    blurb: "14-day launch plan for any new offer or series.",
    icon: Rocket,
    to: "/engines/creator-launchpad",
  },
  {
    key: "growth-hub",
    name: "Growth Hub",
    blurb: "North-star metric, top channels, weekly experiments.",
    icon: TrendingUp,
    to: "/engines/growth-hub",
  },
  {
    key: "partner-program",
    name: "Partner Program",
    blurb: "Referral / affiliate program with reward + enablement kit.",
    icon: Megaphone,
    to: "/engines/partner-program",
  },
  {
    key: "showcase",
    name: "Showcase",
    blurb: "Package finished work into a public case study.",
    icon: Award,
    to: "/engines/showcase",
  },
  {
    key: "offer",
    name: "Offer Engine",
    blurb: "Rough idea into a structured offer with proof + CTA.",
    icon: Sparkles,
    to: "/engines/offer",
  },
];

const Index = () => {
  const { user } = useAuth();
  const ctaTo = user ? "/engines/video-forge" : "/signup";

  return (
    <div className="relative">
      {/* Backdrop layers */}
      <div aria-hidden className="pointer-events-none absolute inset-0 ethinx-grid opacity-[0.35]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 ethinx-radial" />

      <div className="container relative space-y-16 py-12">
        {/* HERO — product-interface, not landing-page */}
        <section className="ethinx-panel ethinx-glow rounded-xl p-6 md:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-5 md:max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
                ETHINX · System online
              </div>

              <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                ETHINX <span className="text-gradient-primary">VideoForge</span>
              </h1>

              <p className="font-mono text-lg text-foreground/90 md:text-xl">
                9 engines. One video system.
              </p>

              <p className="max-w-xl text-sm text-muted-foreground md:text-base">
                Forge scripts, scenes, captions, batches, briefs and launch plans
                from a single workspace. Every output is structured, saved, and
                ready to ship.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button asChild size="lg" className="shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]">
                  <Link to={ctaTo}>
                    <Video className="h-4 w-4" />
                    Open Video Forge
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to={user ? "/engines" : "/login"}>
                    {user ? "All engines" : "Sign in"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right rail — system stat panel */}
            <div className="grid w-full max-w-sm grid-cols-3 gap-2 font-mono text-xs">
              <StatCell label="ENGINES" value="09" />
              <StatCell label="MODES" value="03" accent="secondary" />
              <StatCell label="STATUS" value="LIVE" accent="primary" />
              <div className="col-span-3 rounded-md border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <span className="text-primary">{">"}</span> ready · video_forge.short_form · output: script + scenes + captions
              </div>
            </div>
          </div>
        </section>

        {/* ENGINE GRID — matches dashboard card style */}
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                /engines
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                The system
              </h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to={user ? "/engines" : "/signup"}>
                Browse all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ENGINES.map((engine) => {
              const Icon = engine.icon;
              return (
                <Card
                  key={engine.key}
                  className={
                    "ethinx-hover-glow flex flex-col " +
                    (engine.primary ? "border-primary/50" : "")
                  }
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/40">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      {engine.primary && <Badge>Primary</Badge>}
                    </div>
                    <CardTitle className="mt-3 text-base">{engine.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{engine.blurb}</p>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link to={user ? engine.to : "/signup"}>
                        Open
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "primary" | "secondary";
}) {
  const tone =
    accent === "primary"
      ? "text-primary"
      : accent === "secondary"
        ? "text-secondary"
        : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-card/60 p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-lg ${tone}`}>{value}</div>
    </div>
  );
}

export default Index;
