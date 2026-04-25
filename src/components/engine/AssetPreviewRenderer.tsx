import { ReactNode } from "react";
import { tryParseEnvelope } from "@/lib/engines/contracts";

interface AssetPreviewRendererProps {
  content: string | null | undefined;
  engineKey?: string;
  className?: string;
}

/**
 * Renders an asset's stored `content` field as a readable preview.
 *
 * Behavior:
 * - If `content` is a valid AssetEnvelope JSON, render a structured view
 *   based on the envelope's engine_key (or the prop, as a fallback).
 * - Otherwise, render the raw text (legacy markdown / plain content).
 * - Unknown / unparseable JSON falls back to a pretty JSON viewer.
 */
export function AssetPreviewRenderer({
  content,
  engineKey,
  className,
}: AssetPreviewRendererProps) {
  if (!content) {
    return (
      <p className={className ?? "text-sm text-muted-foreground"}>
        No content saved for this asset yet.
      </p>
    );
  }

  const envelope = tryParseEnvelope(content);

  // Legacy / plain text content: just render the markdown as-is.
  if (!envelope) {
    return (
      <pre className={className ?? "whitespace-pre-wrap text-xs text-foreground"}>
        {content}
      </pre>
    );
  }

  const key = envelope.engine_key ?? engineKey;
  const out = envelope.output as Record<string, unknown>;

  return (
    <div className={className ?? "space-y-4 text-sm text-foreground"}>
      {renderByEngine(key, out, envelope.markdown)}
    </div>
  );
}

// ---------- helpers ----------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="text-sm text-foreground">{children}</div>
    </section>
  );
}

function Paragraph({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-foreground">{children}</p>;
}

function BulletList({ items }: { items: unknown[] }) {
  if (!items?.length) return <p className="text-muted-foreground">—</p>;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((it, i) => (
        <li key={i}>{typeof it === "string" ? it : JSON.stringify(it)}</li>
      ))}
    </ul>
  );
}

function Footer({ distribution, metric }: { distribution?: unknown; metric?: unknown }) {
  if (!distribution && !metric) return null;
  return (
    <div className="grid gap-3 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-2">
      {distribution ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Distribution
          </div>
          <p className="mt-1 text-sm">{String(distribution)}</p>
        </div>
      ) : null}
      {metric ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Success metric
          </div>
          <p className="mt-1 text-sm">{String(metric)}</p>
        </div>
      ) : null}
    </div>
  );
}

function PrettyJson({ value }: { value: unknown }) {
  return (
    <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// ---------- per-engine renderers ----------

function renderByEngine(
  key: string | undefined,
  out: Record<string, unknown>,
  markdown: string,
): ReactNode {
  switch (key) {
    case "video_forge":
      return renderVideoForge(out);
    case "creator_blueprint":
      return renderCreatorBlueprint(out);
    case "creator_launchpad":
      return renderCreatorLaunchpad(out);
    case "neon_studio":
      return renderNeonStudio(out);
    case "video_velocity":
      return renderVideoVelocity(out);
    case "partner_program":
      return renderPartnerProgram(out);
    case "growth_hub":
      return renderGrowthHub(out);
    case "showcase":
      return renderShowcase(out);
    case "offer":
      // Offer engine still uses legacy markdown — show it directly.
      return (
        <pre className="whitespace-pre-wrap text-xs text-foreground">{markdown}</pre>
      );
    default:
      return <PrettyJson value={out} />;
  }
}

function renderVideoForge(o: Record<string, unknown>) {
  const sections = (o.script_sections ?? {}) as Record<string, string>;
  const captions = (o.captions ?? {}) as Record<string, string>;
  const fullScript = asString(o.full_script);
  const stock = asArray<string>(o.stock_footage_terms);
  const overlays = asArray<string>(o.on_screen_text_overlays);
  const voNotes = asArray<string>(o.voiceover_notes);
  const scenes = asArray<{
    scene_number?: number;
    timecode?: string;
    end_timecode?: string;
    duration_seconds?: number;
    scene_purpose?: string;
    narration?: string;
    suggested_visual?: string;
    b_roll_or_stock_query?: string;
    on_screen_text?: string;
    voiceover_note?: string;
  }>(o.scene_breakdown);
  const mode = asString(o.mode);
  return (
    <>
      <Section title="Title">
        <Paragraph>
          {asString(o.video_title) || "—"}
          {mode ? <span className="ml-2 text-xs text-muted-foreground">({mode.replace(/_/g, " ")})</span> : null}
        </Paragraph>
      </Section>
      <Section title="Hook">
        <Paragraph>{asString(o.opening_hook) || "—"}</Paragraph>
      </Section>
      {fullScript ? (
        <Section title="Full script">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2 text-xs">
            {fullScript}
          </pre>
        </Section>
      ) : null}
      <Section title="Script sections">
        <div className="space-y-2">
          {(["intro", "problem", "insight", "proof", "solution", "cta"] as const).map(
            (k) =>
              sections[k] ? (
                <div key={k}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {k}
                  </div>
                  <p className="mt-0.5">{sections[k]}</p>
                </div>
              ) : null,
          )}
        </div>
      </Section>
      {scenes.length ? (
        <Section title={`Scene breakdown (${scenes.length})`}>
          <ol className="space-y-3">
            {scenes.map((s, i) => {
              const range = s.end_timecode
                ? `${s.timecode ?? ""} → ${s.end_timecode}`
                : (s.timecode ?? "");
              return (
                <li
                  key={s.scene_number ?? i}
                  className="rounded-md border border-border bg-card p-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Scene {s.scene_number ?? i + 1}
                      </span>
                      <span className="font-mono text-xs font-medium text-foreground">
                        {range || "—"}
                      </span>
                      {typeof s.duration_seconds === "number" ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {s.duration_seconds}s
                        </span>
                      ) : null}
                    </div>
                    {s.scene_purpose ? (
                      <span className="text-[11px] font-medium text-foreground">
                        {s.scene_purpose}
                      </span>
                    ) : null}
                  </div>
                  <dl className="mt-2 grid gap-1.5 text-[11px]">
                    {s.narration ? (
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                          Narration
                        </dt>
                        <dd className="text-foreground">{s.narration}</dd>
                      </div>
                    ) : null}
                    {s.on_screen_text ? (
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                          On-screen text
                        </dt>
                        <dd className="text-foreground">"{s.on_screen_text}"</dd>
                      </div>
                    ) : null}
                    {s.suggested_visual ? (
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                          Suggested visual
                        </dt>
                        <dd className="text-muted-foreground">{s.suggested_visual}</dd>
                      </div>
                    ) : null}
                    {s.voiceover_note ? (
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                          Voiceover note
                        </dt>
                        <dd className="text-muted-foreground">{s.voiceover_note}</dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              );
            })}
          </ol>
        </Section>
      ) : null}
      {stock.length ? (
        <Section title="Stock / B-roll search terms">
          <BulletList items={stock} />
        </Section>
      ) : null}
      {overlays.length ? (
        <Section title="On-screen overlays">
          <BulletList items={overlays} />
        </Section>
      ) : null}
      {voNotes.length ? (
        <Section title="Voiceover notes">
          <BulletList items={voNotes} />
        </Section>
      ) : null}
      <Section title="CTA">
        <Paragraph>{sections.cta || asString(captions.short_caption) || "—"}</Paragraph>
      </Section>
      <Footer distribution={o.distribution_recommendation} metric={o.success_metric} />
    </>
  );
}

function renderCreatorBlueprint(o: Record<string, unknown>) {
  const plan = asArray<{ week: number; theme: string; posts: string[] }>(
    o.thirty_day_content_plan,
  );
  return (
    <>
      <Section title="Positioning">
        <Paragraph>{asString(o.positioning_statement) || "—"}</Paragraph>
      </Section>
      <Section title="Audience">
        <Paragraph>{asString(o.audience_profile) || "—"}</Paragraph>
      </Section>
      <Section title="Content pillars">
        <BulletList items={asArray(o.content_pillars)} />
      </Section>
      <Section title="30-day plan">
        {plan.length === 0 ? (
          <p className="text-muted-foreground">—</p>
        ) : (
          <div className="space-y-2">
            {plan.map((w) => (
              <div key={w.week} className="rounded-md border border-border bg-muted/30 p-2">
                <div className="text-xs font-semibold">
                  Week {w.week} · {w.theme}
                </div>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {(w.posts ?? []).map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
      <Footer distribution={o.distribution_recommendation} metric={o.success_metric} />
    </>
  );
}

function renderCreatorLaunchpad(o: Record<string, unknown>) {
  const milestones = asArray<Record<string, unknown>>(o.milestone_map);
  return (
    <>
      <Section title="Launch summary">
        <Paragraph>{asString(o.launch_summary) || "—"}</Paragraph>
      </Section>
      <Section title="Milestones">
        {milestones.length === 0 ? (
          <p className="text-muted-foreground">—</p>
        ) : (
          <ul className="space-y-1">
            {milestones.map((m, i) => (
              <li key={i} className="rounded border border-border bg-muted/30 p-2 text-sm">
                <span className="font-medium">{asString(m.name) || asString(m.milestone) || `Milestone ${i + 1}`}</span>
                {m.due_day || m.day ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Day {String(m.due_day ?? m.day)}
                  </span>
                ) : null}
                {m.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{String(m.description)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Tasks">
        <BulletList items={asArray(o.task_backlog)} />
      </Section>
      <Section title="Launch checklist">
        <BulletList items={asArray(o.launch_checklist)} />
      </Section>
      <Footer distribution={o.distribution_recommendation} metric={o.success_metric} />
    </>
  );
}

function renderNeonStudio(o: Record<string, unknown>) {
  return (
    <>
      <Section title="Visual concept">
        <Paragraph>{asString(o.visual_concept) || "—"}</Paragraph>
      </Section>
      <Section title="Shot list">
        <BulletList items={asArray(o.shot_list)} />
      </Section>
      <Section title="Image prompts">
        <BulletList items={asArray(o.image_generation_prompts)} />
      </Section>
      <Section title="Video prompts">
        <BulletList items={asArray(o.video_generation_prompts)} />
      </Section>
      <Footer distribution={o.distribution_recommendation} metric={o.success_metric} />
    </>
  );
}

function renderVideoVelocity(o: Record<string, unknown>) {
  const batch = asArray<Record<string, unknown>>(o.video_batch_table);
  return (
    <>
      <Section title="Batch strategy">
        <Paragraph>{asString(o.batch_strategy) || "—"}</Paragraph>
      </Section>
      <Section title="Batch table">
        {batch.length === 0 ? (
          <p className="text-muted-foreground">—</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left">
                <tr>
                  {Object.keys(batch[0]).map((h) => (
                    <th key={h} className="px-2 py-1.5 font-semibold capitalize">
                      {h.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batch.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {Object.keys(batch[0]).map((h) => (
                      <td key={h} className="px-2 py-1.5 align-top">
                        {typeof row[h] === "string" || typeof row[h] === "number"
                          ? String(row[h])
                          : JSON.stringify(row[h])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      <Footer distribution={o.distribution_recommendation} metric={o.success_metric} />
    </>
  );
}

function renderPartnerProgram(o: Record<string, unknown>) {
  const sequence = asArray<Record<string, unknown>>(o.outreach_sequence);
  return (
    <>
      <Section title="Partner profile">
        <Paragraph>{asString(o.partner_profile) || "—"}</Paragraph>
      </Section>
      <Section title="Value proposition">
        <Paragraph>{asString(o.value_proposition) || "—"}</Paragraph>
      </Section>
      <Section title="Outreach sequence">
        {sequence.length === 0 ? (
          <p className="text-muted-foreground">—</p>
        ) : (
          <ol className="space-y-1.5">
            {sequence.map((s, i) => (
              <li key={i} className="rounded border border-border bg-muted/30 p-2 text-sm">
                <div className="text-xs font-semibold">
                  Step {String(s.step ?? i + 1)} · {asString(s.channel) || "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {asString(s.intent)}
                </div>
                {s.copy_hint ? (
                  <p className="mt-1 text-sm">{String(s.copy_hint)}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Section>
      <Footer distribution={o.distribution_recommendation} metric={o.success_metric} />
    </>
  );
}

function renderGrowthHub(o: Record<string, unknown>) {
  return (
    <>
      <Section title="Hypothesis">
        <Paragraph>{asString(o.hypothesis) || "—"}</Paragraph>
      </Section>
      <Section title="Experiment plan">
        <BulletList
          items={asArray<Record<string, unknown>>(o.experiment_plan).map((e) =>
            [
              asString(e.name) || asString(e.experiment) || "Experiment",
              asString(e.description),
            ]
              .filter(Boolean)
              .join(" — "),
          )}
        />
      </Section>
      <Section title="Success criteria">
        <Paragraph>{asString(o.success_criteria) || "—"}</Paragraph>
      </Section>
      <Footer distribution={o.distribution_recommendation} metric={o.success_metric} />
    </>
  );
}

function renderShowcase(o: Record<string, unknown>) {
  return (
    <>
      <Section title="Showcase title">
        <Paragraph>{asString(o.showcase_title) || "—"}</Paragraph>
      </Section>
      <Section title="Project summary">
        <Paragraph>{asString(o.project_summary) || "—"}</Paragraph>
      </Section>
      <Section title="Problem">
        <Paragraph>{asString(o.problem) || "—"}</Paragraph>
      </Section>
      <Section title="Process">
        <BulletList items={asArray(o.process)} />
      </Section>
      <Section title="Results">
        <Paragraph>{asString(o.results) || "—"}</Paragraph>
      </Section>
      <Section title="Proof points">
        <BulletList items={asArray(o.proof_points)} />
      </Section>
      <Section title="Portfolio card">
        <Paragraph>{asString(o.portfolio_card_copy) || "—"}</Paragraph>
      </Section>
      <Footer distribution={o.distribution_recommendation} metric={o.success_metric} />
    </>
  );
}
