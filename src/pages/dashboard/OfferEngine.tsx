import { useMemo, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  EngineLayout,
  FormSection,
  PreviewCard,
} from "@/components/engine";

type OfferFields = {
  title: string;
  productName: string;
  targetAudience: string;
  mainProblem: string;
  desiredOutcome: string;
  differentiator: string;
  proof: string;
  pricing: string;
  guarantee: string;
  urgency: string;
  cta: string;
};

const EMPTY: OfferFields = {
  title: "",
  productName: "",
  targetAudience: "",
  mainProblem: "",
  desiredOutcome: "",
  differentiator: "",
  proof: "",
  pricing: "",
  guarantee: "",
  urgency: "",
  cta: "",
};

const OfferEngine = () => {
  const { toast } = useToast();
  const [fields, setFields] = useState<OfferFields>(EMPTY);

  const set = <K extends keyof OfferFields>(key: K, value: OfferFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const isComplete = useMemo(
    () =>
      fields.title.trim().length > 0 &&
      fields.productName.trim().length > 0 &&
      fields.cta.trim().length > 0,
    [fields],
  );

  const handleSave = () => {
    if (!isComplete) return;
    toast({
      title: "Saved as draft",
      description:
        "Persistence will activate when Lovable Cloud is enabled. Output is preserved in this session.",
    });
  };

  return (
    <EngineLayout
      title="Offer Engine"
      description="Fill the structure manually. Every field is optional except title, product name, and CTA. Edit until it's right, then save as a reusable asset."
      actions={
        <>
          <Button variant="outline" size="sm" disabled>
            <Sparkles className="mr-2 h-4 w-4" />
            AI assist (soon)
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isComplete}>
            <Save className="mr-2 h-4 w-4" />
            Save as asset
          </Button>
        </>
      }
      aside={
        <PreviewCard
          title={fields.title || "Untitled offer"}
          status="draft"
          meta={fields.productName ? `Product: ${fields.productName}` : undefined}
        >
          {fields.desiredOutcome && (
            <p>
              <span className="font-medium text-foreground">Outcome:</span>{" "}
              {fields.desiredOutcome}
            </p>
          )}
          {fields.targetAudience && (
            <p>
              <span className="font-medium text-foreground">For:</span>{" "}
              {fields.targetAudience}
            </p>
          )}
          {fields.differentiator && (
            <p>
              <span className="font-medium text-foreground">Why us:</span>{" "}
              {fields.differentiator}
            </p>
          )}
          {fields.pricing && (
            <p>
              <span className="font-medium text-foreground">Pricing:</span>{" "}
              {fields.pricing}
            </p>
          )}
          {fields.cta && (
            <p className="pt-2">
              <Button size="sm" className="w-full" disabled>
                {fields.cta}
              </Button>
            </p>
          )}
          {!isComplete && (
            <p className="pt-2 text-xs text-muted-foreground">
              Add a title, product name, and CTA to enable saving.
            </p>
          )}
        </PreviewCard>
      }
    >
      <FormSection
        title="The basics"
        description="Name the offer and the product it sells."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Offer title</Label>
            <Input
              id="title"
              placeholder="e.g. Founder Audit Sprint"
              value={fields.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="productName">Product name</Label>
            <Input
              id="productName"
              placeholder="e.g. ETHINX Audit"
              value={fields.productName}
              onChange={(e) => set("productName", e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Who and what"
        description="Be specific. Vague audiences produce vague offers."
      >
        <div className="space-y-2">
          <Label htmlFor="targetAudience">Target audience</Label>
          <Input
            id="targetAudience"
            placeholder="e.g. Solo SaaS founders making <$10k MRR"
            value={fields.targetAudience}
            onChange={(e) => set("targetAudience", e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mainProblem">Main problem</Label>
            <Textarea
              id="mainProblem"
              rows={3}
              placeholder="What is the painful, urgent problem?"
              value={fields.mainProblem}
              onChange={(e) => set("mainProblem", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desiredOutcome">Desired outcome</Label>
            <Textarea
              id="desiredOutcome"
              rows={3}
              placeholder="What changes in their life after this works?"
              value={fields.desiredOutcome}
              onChange={(e) => set("desiredOutcome", e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Positioning"
        description="Why this, why you, why now."
      >
        <div className="space-y-2">
          <Label htmlFor="differentiator">Differentiator</Label>
          <Textarea
            id="differentiator"
            rows={2}
            placeholder="What makes this offer hard to compare?"
            value={fields.differentiator}
            onChange={(e) => set("differentiator", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proof">Proof</Label>
          <Textarea
            id="proof"
            rows={2}
            placeholder="Case studies, screenshots, numbers, names."
            value={fields.proof}
            onChange={(e) => set("proof", e.target.value)}
          />
        </div>
      </FormSection>

      <FormSection
        title="Commercials"
        description="Price, guarantee, urgency, and the action you want."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pricing">Pricing</Label>
            <Input
              id="pricing"
              placeholder="e.g. $497 one-time"
              value={fields.pricing}
              onChange={(e) => set("pricing", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guarantee">Guarantee</Label>
            <Input
              id="guarantee"
              placeholder="e.g. 14-day refund, no questions"
              value={fields.guarantee}
              onChange={(e) => set("guarantee", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency</Label>
            <Input
              id="urgency"
              placeholder="e.g. 5 spots, closes Friday"
              value={fields.urgency}
              onChange={(e) => set("urgency", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cta">Call to action</Label>
            <Input
              id="cta"
              placeholder="e.g. Book your audit"
              value={fields.cta}
              onChange={(e) => set("cta", e.target.value)}
            />
          </div>
        </div>
      </FormSection>
    </EngineLayout>
  );
};

export default OfferEngine;
