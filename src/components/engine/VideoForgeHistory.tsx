import { useMemo } from "react";
import { CheckCircle2, History, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { VideoForgeOutput } from "@/lib/video-forge";

export type ForgeVariant = "deterministic" | "polished";

export interface VideoForgeHistoryEntry {
  id: string;
  createdAt: number;
  topic: string;
  draft: VideoForgeOutput;
  polished: VideoForgeOutput | null;
  polishError?: string | null;
  activeVariant: ForgeVariant;
}

interface Props {
  entries: VideoForgeHistoryEntry[];
  selectedId: string | null;
  selectedVariant: ForgeVariant;
  onSelect: (id: string, variant: ForgeVariant) => void;
  onRevert: (id: string, variant: ForgeVariant) => void;
  onClear: () => void;
}

const formatTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const diffSummary = (a: VideoForgeOutput, b: VideoForgeOutput) => {
  let changed = 0;
  const fields: (keyof VideoForgeOutput)[] = [
    "video_title",
    "core_angle",
    "viewer_promise",
    "opening_hook",
    "full_script",
  ];
  for (const f of fields) if (a[f] !== b[f]) changed++;
  const sceneDiff = a.scene_breakdown.reduce((acc, s, i) => {
    const other = b.scene_breakdown[i];
    if (!other || other.narration !== s.narration) return acc + 1;
    return acc;
  }, 0);
  return { fieldChanges: changed, sceneChanges: sceneDiff };
};

export const VideoForgeHistory = ({
  entries,
  selectedId,
  selectedVariant,
  onSelect,
  onRevert,
  onClear,
}: Props) => {
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.createdAt - a.createdAt),
    [entries],
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <History className="h-3.5 w-3.5" />
          <span className="font-medium">History</span>
        </div>
        <p className="mt-1">
          Each generation is captured here so you can compare the deterministic draft
          against the AI-polished version and revert with one click.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <History className="h-3.5 w-3.5" />
          History · {sorted.length}
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>
          <Trash2 className="mr-1 h-3 w-3" />
          Clear
        </Button>
      </div>
      <ScrollArea className="max-h-[420px]">
        <ul className="divide-y divide-border">
          {sorted.map((e) => {
            const isSelected = e.id === selectedId;
            const diff = e.polished ? diffSummary(e.draft, e.polished) : null;
            return (
              <li key={e.id} className="p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {e.topic || "Untitled"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatTime(e.createdAt)}
                    </p>
                  </div>
                  {e.polished ? (
                    <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                      <Sparkles className="h-2.5 w-2.5" />
                      polished
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      draft only
                    </Badge>
                  )}
                </div>

                {diff ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Polish changed {diff.fieldChanges} field
                    {diff.fieldChanges === 1 ? "" : "s"} ·{" "}
                    {diff.sceneChanges} scene{diff.sceneChanges === 1 ? "" : "s"}
                  </p>
                ) : e.polishError ? (
                  <p className="mt-1 text-[11px] text-destructive">
                    Polish failed: {e.polishError}
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-1">
                  <VariantPill
                    label="Deterministic"
                    active={isSelected && selectedVariant === "deterministic"}
                    onClick={() => onSelect(e.id, "deterministic")}
                  />
                  <VariantPill
                    label="Polished"
                    disabled={!e.polished}
                    active={isSelected && selectedVariant === "polished"}
                    onClick={() => e.polished && onSelect(e.id, "polished")}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <CheckCircle2 className="h-3 w-3" /> viewing
                      </span>
                    ) : (
                      <span>tap to preview</span>
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() =>
                      onRevert(
                        e.id,
                        e.polished && selectedVariant === "polished"
                          ? "polished"
                          : "deterministic",
                      )
                    }
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Revert here
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
};

const VariantPill = ({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-background text-muted-foreground hover:text-foreground",
      disabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
    )}
  >
    {label}
  </button>
);
