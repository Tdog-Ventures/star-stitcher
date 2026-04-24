import { Link } from "react-router-dom";
import { ArrowRight, FileText, Send, Sparkles } from "lucide-react";
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
}

const ENGINES: EngineDef[] = [
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
    description:
      "Plan posts and outreach across channels from any saved asset.",
    icon: Send,
    to: "/distribution",
    status: "available",
  },
  {
    key: "content",
    name: "Content Repurpose",
    description:
      "Take one offer and split it into a week of channel-native posts.",
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
            className="flex flex-col transition-colors hover:border-primary/40"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-muted-foreground" />
                {disabled && <Badge variant="secondary">Soon</Badge>}
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
