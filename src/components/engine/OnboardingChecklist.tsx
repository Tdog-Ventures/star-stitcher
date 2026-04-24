import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ONBOARDING_STEPS,
  onboardingProgress,
  type OnboardingState,
} from "@/lib/onboarding";

interface Props {
  state: OnboardingState;
  onDismiss: () => void;
}

export function OnboardingChecklist({ state, onDismiss }: Props) {
  const { done, total, percent } = onboardingProgress(state);
  const allDone = done === total;

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss onboarding"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold text-foreground">
            {allDone ? "You're set up." : "Get started in under 2 minutes"}
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {allDone
            ? "You've explored every part of the engine. Dismiss this card any time."
            : "Five small steps walk you through the Offer + Distribution Engine."}
        </p>
        <div className="mt-3 space-y-1.5">
          <Progress value={percent} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {done} of {total} complete
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {ONBOARDING_STEPS.map((step) => {
          const complete = state[step.key];
          return (
            <div
              key={step.key}
              className="flex items-center gap-3 rounded-md border border-border/60 bg-card px-3 py-2.5"
            >
              {complete ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    complete ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {!complete ? (
                <Button asChild size="sm" variant="ghost" className="shrink-0">
                  <Link to={step.to}>
                    {step.cta}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
