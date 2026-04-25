// VIDEO FORGE — generates the core video concept, script, and production plan.
// Deterministic, no AI calls. Returns a structured object matching the
// public contract; format helpers produce a human-readable markdown copy.
//
// Mode-aware: the same input shape produces a short-form, long-form YouTube,
// faceless, or product-demo plan with mode-specific hooks, scene blueprints,
// voiceover notes, stock-footage queries, and success metrics.

import { formatFooter } from "./engines/output-footer";

export type VideoGoal =
  | "marketing"
  | "education"
  | "sales"
  | "entertainment"
  | "tutorial"
  | "product_demo"
  | "thought_leadership";

export type VideoPlatform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "linkedin"
  | "facebook"
  | "x";

export type VideoFormat =
  | "short_form"
  | "long_form"
  | "faceless"
  | "talking_head"
  | "avatar"
  | "documentary"
  | "explainer";

export type VideoTone =
  | "professional"
  | "bold"
  | "casual"
  | "cinematic"
  | "storytelling"
  | "controversial"
  | "educational";

export type VideoLength = "short" | "medium" | "long";

/**
 * Output mode controls the full shape of the generated video:
 *   - short_form    : 30–60s vertical, hook-heavy
 *   - long_form     : 6–10 min YouTube, chaptered narrative
 *   - faceless      : voiceover + stock/B-roll, no on-camera presenter
 *   - product_demo  : feature-by-feature live walkthrough
 */
export type VideoMode = "short_form" | "long_form" | "faceless" | "product_demo";

export const GOAL_LABELS: Record<VideoGoal, string> = {
  marketing: "Marketing",
  education: "Education",
  sales: "Sales",
  entertainment: "Entertainment",
  tutorial: "Tutorial",
  product_demo: "Product demo",
  thought_leadership: "Thought leadership",
};

export const PLATFORM_LABELS: Record<VideoPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  x: "X",
};

export const FORMAT_LABELS: Record<VideoFormat, string> = {
  short_form: "Short-form",
  long_form: "Long-form",
  faceless: "Faceless",
  talking_head: "Talking head",
  avatar: "AI avatar",
  documentary: "Documentary",
  explainer: "Explainer",
};

export const TONE_LABELS: Record<VideoTone, string> = {
  professional: "Professional",
  bold: "Bold",
  casual: "Casual",
  cinematic: "Cinematic",
  storytelling: "Storytelling",
  controversial: "Controversial",
  educational: "Educational",
};

export const LENGTH_LABELS: Record<VideoLength, string> = {
  short: "Short (≈30s)",
  medium: "Medium (60–90s)",
  long: "Long (3–10 min)",
};

export const MODE_LABELS: Record<VideoMode, string> = {
  short_form: "Short-form script",
  long_form: "Long-form YouTube script",
  faceless: "Faceless video script",
  product_demo: "Product demo script",
};

export interface VideoForgeInput {
  video_goal: VideoGoal;
  topic: string;
  target_audience: string;
  platform: VideoPlatform;
  format: VideoFormat;
  tone: VideoTone;
  target_length: VideoLength;
  desired_outcome: string;
  /** Optional output mode. If omitted, derived from format/length. */
  mode?: VideoMode;
}

export interface ScriptSections {
  intro: string;
  problem: string;
  insight: string;
  proof: string;
  solution: string;
  cta: string;
}

export interface SceneBreakdownItem {
  scene_number: number;
  /** Start timecode, m:ss. */
  timecode: string;
  /** End timecode, m:ss (additive — same shape as `timecode`). */
  end_timecode?: string;
  /** Approximate scene duration in seconds (additive). */
  duration_seconds?: number;
  scene_purpose: string;
  narration: string;
  suggested_visual: string;
  /** Search query for stock footage / B-roll libraries. */
  b_roll_or_stock_query: string;
  on_screen_text: string;
  /** Direction for the voice talent (pace, emotion, emphasis). */
  voiceover_note: string;
}

export interface VideoForgeOutput {
  mode: VideoMode;
  video_title: string;
  core_angle: string;
  viewer_promise: string;
  opening_hook: string;
  /** The actual word-for-word spoken script, ready to read on camera or to a mic. */
  full_script: string;
  script_sections: ScriptSections;
  scene_breakdown: SceneBreakdownItem[];
  /** Aggregated stock-footage / B-roll search terms across all scenes. */
  stock_footage_terms: string[];
  /** All on-screen text overlays in playback order. */
  on_screen_text_overlays: string[];
  /** Global voiceover direction (pace, energy, mic notes). */
  voiceover_notes: string[];
  captions: { short_caption: string; long_caption: string };
  thumbnail_concepts: string[];
  hashtags: string[];
  distribution_recommendation: string;
  success_metric: string;
}

// ---------- mode resolution ----------

function resolveMode(input: VideoForgeInput): VideoMode {
  if (input.mode) return input.mode;
  if (input.video_goal === "product_demo") return "product_demo";
  if (input.format === "faceless") return "faceless";
  if (input.format === "long_form" || input.target_length === "long") return "long_form";
  return "short_form";
}

// Number of scenes per mode (independent of legacy length, but length still nudges long_form depth).
function sceneCountForMode(mode: VideoMode, length: VideoLength): number {
  switch (mode) {
    case "short_form":
      return 5;
    case "long_form":
      return length === "long" ? 10 : length === "medium" ? 8 : 7;
    case "faceless":
      return length === "long" ? 9 : 7;
    case "product_demo":
      return 7;
  }
}

function approxDurationSeconds(mode: VideoMode, length: VideoLength): number {
  if (mode === "short_form") return length === "short" ? 30 : 60;
  if (mode === "long_form") return length === "long" ? 480 : length === "medium" ? 240 : 180;
  if (mode === "faceless") return length === "long" ? 300 : length === "medium" ? 120 : 75;
  // product_demo
  return length === "long" ? 240 : length === "medium" ? 120 : 75;
}

function timecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------- hooks (mode + tone aware) ----------

function buildHook(input: VideoForgeInput, mode: VideoMode): string {
  const who = input.target_audience || "you";
  const topic = input.topic || "this";

  if (mode === "short_form") {
    switch (input.tone) {
      case "controversial":
        return `Everything ${who} get told about ${topic} is built on one wrong assumption. Here it is — in 30 seconds.`;
      case "bold":
        return `${who}: ${topic} isn't broken. You're running half the loop. Watch what fixes it in 30 seconds.`;
      case "storytelling":
        return `I did ${topic} the way ${who} are told to. It bombed. Here's the version that actually worked.`;
      case "casual":
        return `Nobody tells ${who} this about ${topic} — and it's the only part that matters. Quick one.`;
      case "cinematic":
        return `${topic}. One move. Most ${who} never make it. The next 30 seconds show why.`;
      case "educational":
        return `Thirty seconds from now, ${who} will see ${topic} the way the top 10% do. Press play.`;
      case "professional":
      default:
        return `${who}: here's the 30-second version of ${topic} that actually moves the needle.`;
    }
  }

  if (mode === "long_form") {
    return `Most ${who} approach ${topic} the wrong way — and it costs them six months. In the next few minutes I'll show you the one reframe that fixes it, the proof it works, and the 3-step plan you can run this week. The third step is the one nobody talks about.`;
  }

  if (mode === "faceless") {
    return `${topic}. Most ${who} get the first move wrong. Flip one thing — and the whole loop changes.`;
  }

  // product_demo
  return `Sixty seconds. ${topic}, live, in the product. By the end you'll know if it's right for you.`;
}

// ---------- script sections ----------

function buildScriptSections(input: VideoForgeInput, mode: VideoMode): ScriptSections {
  const who = input.target_audience || "your viewer";
  const topic = input.topic || "the topic";
  const outcome = (input.desired_outcome || "make a real decision today").toLowerCase();

  if (mode === "long_form") {
    return {
      intro: `Welcome back. Today we're going deep on ${topic}, specifically for ${who} who want to ${outcome}. I'll cover what most people miss, the one reframe that changes the game, and a 3-step plan you can run this week.`,
      problem: `Here's where almost every ${who} gets stuck on ${topic}: they treat it as a tactic, not a system. So they try one thing, it doesn't work in two weeks, and they bail. Sound familiar?`,
      insight: `The reframe is this: ${topic} isn't a single move — it's a feedback loop. Once you see it as a loop, every "tactic" becomes one knob you can turn. Let me show you what I mean.`,
      proof: `Here's the receipts. Last quarter I ran this exact loop with three ${who}. Specifics on screen — note the pattern in week 2 vs week 6. This isn't theory; the curve looks the same every time.`,
      solution: `Here's the 3-step plan. Step one: define one input you can measure weekly. Step two: ship one experiment per week against that input. Step three: review, kill, double down — every Friday, no exceptions. That's the whole loop.`,
      cta: buildCta(input, mode),
    };
  }

  if (mode === "faceless") {
    return {
      intro: `If you're ${who}, ${topic} feels harder than it should. There's a reason. And there's a fix.`,
      problem: `Most ${who} fix the wrong layer first. They tweak the surface. The break is one level down.`,
      insight: `${topic} isn't one move. It's a loop. Each piece feeds the next — that's why the wins compound.`,
      proof: `Same effort. New framing. The numbers move every time. Watch the curve, not the day-one spike.`,
      solution: `Three steps to ${outcome}. One: name the loop. Two: ship one experiment this week. Three: review on Friday.`,
      cta: buildCta(input, mode),
    };
  }

  if (mode === "product_demo") {
    return {
      intro: `Quick demo. ${topic}, end-to-end, in under two minutes. No slides. No setup. Just the product.`,
      problem: `Most ${who} burn thirty minutes a day on this exact screen. Watch.`,
      insight: `One click in our flow, and that thirty minutes is thirty seconds. We built around the job, not the tool.`,
      proof: `Real example. Live. No edits. Empty state to finished result, right now.`,
      solution: `Day one looks like this. Connect once. Configure once. Then ship. That's the whole loop.`,
      cta: buildCta(input, mode),
    };
  }

  // short_form
  return {
    intro: `If you're ${who} and you want to ${outcome}, this is the 30 seconds that matters.`,
    problem: `${who} keep grinding ${topic} and getting nothing back. Same effort. Same dead end. Every week.`,
    insight: `${topic} isn't a tactic. It's a loop. Most people only run half of it — that's why it stalls.`,
    proof: `One number tells the story. Same person, same product, twice the result — the only thing that changed was the loop.`,
    solution: `Do three things. Pick one input. Ship one experiment a week. Review every Friday. That's it.`,
    cta: buildCta(input, mode),
  };
}

function buildCta(input: VideoForgeInput, mode: VideoMode): string {
  const topic = input.topic || "this";
  const who = input.target_audience || "founders";

  if (mode === "long_form") {
    if (input.video_goal === "sales" || input.video_goal === "product_demo") {
      return `If this is the loop you want to run, the link in the description gets you started in two minutes. Subscribe so you don't miss the week-2 numbers — that's where it gets interesting.`;
    }
    return `If this changed how you think about ${topic}, hit subscribe — the next video breaks down the week-2 review. And drop one word below: which step are you running first?`;
  }

  if (mode === "faceless") {
    return `Save this. Run the loop once this week. Comment "LOOP" and I'll send you the one-page template.`;
  }

  if (mode === "product_demo") {
    return `Start free with the link below — no card, no email wall. Want a 5-minute walkthrough live? DM "DEMO" and we'll book it.`;
  }

  // short_form: tighter CTAs
  switch (input.video_goal) {
    case "sales":
      return `Link in bio. Start ${topic} this week — the offer expires Sunday.`;
    case "marketing":
      return `Comment "PLAYBOOK" and I'll send you the one-page version of this — free, no email.`;
    case "education":
    case "tutorial":
      return `Save this so you actually do it. Run the 3 steps next time you touch ${topic}.`;
    case "thought_leadership":
      return `Send this to one ${who} who needs to hear it. That's the share.`;
    case "entertainment":
      return `Follow for one more like this every Tuesday.`;
    case "product_demo":
      return `Link in bio — free trial, two-click setup.`;
    default:
      return `Comment "${topic.split(" ")[0].toUpperCase()}" and I'll send you the next step.`;
  }
}

// ---------- scene blueprints (per mode) ----------

interface SceneSeed {
  purpose: string;
  narrationKey: keyof ScriptSections | "custom";
  customNarration?: (input: VideoForgeInput) => string;
  visual: string;
  bRoll: string;
  text: string;
  vo: string;
}

function blueprintForMode(input: VideoForgeInput, mode: VideoMode): SceneSeed[] {
  const topic = input.topic || "the topic";
  const who = input.target_audience || "viewer";

  if (mode === "long_form") {
    return [
      {
        purpose: "Cold open hook",
        narrationKey: "intro",
        visual: "Pattern interrupt: 1-second jump cut, bold question text on screen.",
        bRoll: `${topic} cinematic intro`,
        text: `${topic.toUpperCase()}`.slice(0, 32),
        vo: "Confident, slightly faster pace. Land the hook in under 5 seconds.",
      },
      {
        purpose: "Channel framing & promise",
        narrationKey: "intro",
        visual: "Speaker on camera, B-roll cutaways every 3-4s.",
        bRoll: `${who} working on ${topic}`,
        text: "Here's what you'll get",
        vo: "Warm but direct. Make the promise specific, not vague.",
      },
      {
        purpose: "Define the problem",
        narrationKey: "problem",
        visual: "Whiteboard / animated diagram naming the failure mode.",
        bRoll: `${topic} common mistake diagram`,
        text: "Where most people get stuck",
        vo: "Slow down. Pain language: 'stuck', 'spinning', 'two weeks in'.",
      },
      {
        purpose: "The reframe",
        narrationKey: "insight",
        visual: "Animated reveal: 'tactic ❌ → loop ✅'.",
        bRoll: `${topic} system loop animation`,
        text: "Reframe: tactic → loop",
        vo: "Energetic. This is the moment. Pause after 'loop'.",
      },
      {
        purpose: "Proof / case study",
        narrationKey: "proof",
        visual: "Real numbers on screen — dashboard, chart, customer message.",
        bRoll: `${topic} results dashboard chart`,
        text: "Receipts",
        vo: "Matter-of-fact. Let the numbers do the work.",
      },
      {
        purpose: "Step 1 of the plan",
        narrationKey: "custom",
        customNarration: () => `Step one: define one input metric you can measure weekly for ${topic}. Not three. One.`,
        visual: "Card animates in: '1. Define one input'.",
        bRoll: `metric definition workspace ${topic}`,
        text: "1. Define one input",
        vo: "Crisp. Number first, then explanation.",
      },
      {
        purpose: "Step 2 of the plan",
        narrationKey: "custom",
        customNarration: () => `Step two: ship one experiment a week against that input. Tiny. Shippable. Measurable.`,
        visual: "Card 2 animates in next to card 1.",
        bRoll: `weekly experiment shipping`,
        text: "2. One experiment / week",
        vo: "Same cadence as step 1. Mirror the rhythm.",
      },
      {
        purpose: "Step 3 of the plan",
        narrationKey: "custom",
        customNarration: () => `Step three: every Friday, review. Kill what didn't move the input. Double down on what did.`,
        visual: "Card 3 lands. All three cards visible.",
        bRoll: `friday review meeting`,
        text: "3. Friday review",
        vo: "Resolve the trio. Slight pause after 'Friday'.",
      },
      {
        purpose: "Objection handle",
        narrationKey: "custom",
        customNarration: () => `\"But what if I don't have data yet?\" Then your first experiment is to instrument the input. That's it.`,
        visual: "Direct to camera. Lower-third with the objection text.",
        bRoll: `objection callout overlay`,
        text: '"But I don\'t have data…"',
        vo: "Empathetic, then decisive. Address it; don't defend.",
      },
      {
        purpose: "Recap + CTA",
        narrationKey: "cta",
        visual: "End card: 3-step recap on screen, subscribe button, next-video thumbnail.",
        bRoll: `${topic} recap end card`,
        text: "Subscribe → Next video",
        vo: "Calm. Specific ask. One CTA, not three.",
      },
    ];
  }

  if (mode === "faceless") {
    return [
      {
        purpose: "Hook over B-roll",
        narrationKey: "intro",
        visual: "Aerial / fast-motion B-roll. Bold sans-serif text overlay, full-bleed.",
        bRoll: `${topic} aerial timelapse`,
        text: `${topic.toUpperCase()}`.slice(0, 32),
        vo: "Confident VO. No filler. Hit the hook in 3 seconds.",
      },
      {
        purpose: "Problem stat",
        narrationKey: "problem",
        visual: "Big number animates on screen over neutral B-roll.",
        bRoll: `${topic} problem statistics chart`,
        text: "The problem in one number",
        vo: "Drop pace. Let the number breathe.",
      },
      {
        purpose: "Reframe diagram",
        narrationKey: "insight",
        visual: "Animated diagram: tactic → loop. No talking head.",
        bRoll: `system loop animation flat design`,
        text: "Reframe",
        vo: "Pick the pace back up. This is the turn.",
      },
      {
        purpose: "Proof montage",
        narrationKey: "proof",
        visual: "Quick-cut montage: dashboards, screen recordings, charts.",
        bRoll: `dashboard analytics ${topic}`,
        text: "Same loop. Same result.",
        vo: "Stay out of the way of the visuals.",
      },
      {
        purpose: "Step cards 1–3",
        narrationKey: "solution",
        visual: "Three numbered cards animate sequentially over textured background.",
        bRoll: `numbered list animation kinetic typography`,
        text: "1 → 2 → 3",
        vo: "Beat per step. Pause between numbers.",
      },
      {
        purpose: "Receipts close-up",
        narrationKey: "proof",
        visual: "Zoom into one before/after metric. Hold for 2s.",
        bRoll: `before after metric comparison`,
        text: "Before → After",
        vo: "Drop to a near-whisper for the reveal.",
      },
      {
        purpose: "End card CTA",
        narrationKey: "cta",
        visual: "Static end card: comment prompt + subscribe + next-video thumbnail.",
        bRoll: `end screen subscribe animation`,
        text: `Comment "${topic}"`,
        vo: "One line. Calm. Specific.",
      },
    ];
  }

  if (mode === "product_demo") {
    return [
      {
        purpose: "Hook + promise",
        narrationKey: "intro",
        visual: "Picture-in-picture: face cam corner + product on main canvas.",
        bRoll: `${topic} product hero shot`,
        text: `${topic} in 60 seconds`,
        vo: "Energetic. Make the promise concrete.",
      },
      {
        purpose: "Show the painful screen",
        narrationKey: "problem",
        visual: "Screen recording of the OLD/manual way. Annotate the friction.",
        bRoll: `tedious manual workflow screen recording`,
        text: "30 minutes today",
        vo: "Slow down. Let the friction land.",
      },
      {
        purpose: "Hero feature reveal",
        narrationKey: "insight",
        visual: "Switch to the product. Highlight the one button that solves it. Cursor zoom.",
        bRoll: `product UI hero feature`,
        text: "30 seconds with us",
        vo: "Confident. Click decisively — no hovering.",
      },
      {
        purpose: "Live walkthrough",
        narrationKey: "proof",
        visual: "Real example, end-to-end. Show empty state → filled → exported.",
        bRoll: `end to end product walkthrough`,
        text: "Live, no edits",
        vo: "Narrate every click. Don't speed past.",
      },
      {
        purpose: "Setup truth (no surprises)",
        narrationKey: "custom",
        customNarration: () => `Setup is one step: connect, configure once, then ship. No 30-minute onboarding.`,
        visual: "Screen recording of the actual onboarding flow, sped 2x.",
        bRoll: `simple onboarding two clicks`,
        text: "Connect → Configure → Ship",
        vo: "Calm. Reassure: no hidden setup tax.",
      },
      {
        purpose: "Pricing + guarantee",
        narrationKey: "custom",
        customNarration: () => `Free to try. Cancel any time. No credit card to start.`,
        visual: "On-screen lower-third with pricing line.",
        bRoll: `pricing card overlay`,
        text: "Free to try",
        vo: "Quick. Don't oversell.",
      },
      {
        purpose: "CTA + DM offer",
        narrationKey: "cta",
        visual: "End card: link, button, DM prompt.",
        bRoll: `cta end screen`,
        text: "Try free → link below",
        vo: "Specific ask. One CTA. Smile.",
      },
    ];
  }

  // short_form
  return [
    {
      purpose: "Hook (0-3s)",
      narrationKey: "intro",
      visual: "Tight close-up, eyes on lens, motion in frame 1. Bold text overlay.",
      bRoll: `${topic} concept vertical`,
      text: `${topic.toUpperCase()}`.slice(0, 28),
      vo: "Lean in. Faster than your normal speaking pace. No throat-clear.",
    },
    {
      purpose: "Problem (3-10s)",
      narrationKey: "problem",
      visual: "Cut to a screenshot, screen recording, or B-roll of the pain.",
      bRoll: `${who} struggling with ${topic}`,
      text: "The problem",
      vo: "Drop pace. Specific pain language.",
    },
    {
      purpose: "Reframe (10-18s)",
      narrationKey: "insight",
      visual: "Big animated text reveal of the reframe — one sentence, centered.",
      bRoll: `${topic} reframe diagram`,
      text: "The reframe",
      vo: "Pause before the reframe. Land it.",
    },
    {
      purpose: "Proof (18-25s)",
      narrationKey: "proof",
      visual: "One number, big, on screen. Or a before/after split.",
      bRoll: `${topic} before after metric`,
      text: "Proof, not theory",
      vo: "Matter-of-fact. Let the number do the work.",
    },
    {
      purpose: "CTA (25-30s)",
      narrationKey: "cta",
      visual: "Direct to camera + on-screen end card with action.",
      bRoll: `cta vertical end card`,
      text: "Your move →",
      vo: "Calm, specific. One ask, not three.",
    },
  ];
}

function buildSceneBreakdown(
  input: VideoForgeInput,
  mode: VideoMode,
  sections: ScriptSections,
): SceneBreakdownItem[] {
  const seeds = blueprintForMode(input, mode);
  const count = sceneCountForMode(mode, input.target_length);
  const scenes = seeds.slice(0, count);
  const total = approxDurationSeconds(mode, input.target_length);

  // Distribute total seconds evenly across scenes. Remaining seconds (from
  // integer flooring) are spread one-by-one to the earliest scenes so the
  // sum of durations exactly matches `total`.
  const n = scenes.length;
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  const durations = scenes.map((_, i) => base + (i < remainder ? 1 : 0));

  let cursor = 0;
  return scenes.map((s, i) => {
    const start = cursor;
    const dur = durations[i];
    const end = start + dur;
    cursor = end;
    return {
      scene_number: i + 1,
      timecode: timecode(start),
      end_timecode: timecode(end),
      duration_seconds: dur,
      scene_purpose: s.purpose,
      narration:
        s.narrationKey === "custom" && s.customNarration
          ? s.customNarration(input)
          : sections[s.narrationKey as keyof ScriptSections],
      suggested_visual: s.visual,
      b_roll_or_stock_query: s.bRoll,
      on_screen_text: s.text,
      voiceover_note: s.vo,
    };
  });
}

// ---------- aggregations ----------

function buildFullScript(
  input: VideoForgeInput,
  mode: VideoMode,
  hook: string,
  scenes: SceneBreakdownItem[],
  cta: string,
): string {
  const header =
    mode === "long_form"
      ? "[LONG-FORM YOUTUBE SCRIPT — read at conversational pace, ~150 wpm]"
      : mode === "faceless"
        ? "[FACELESS VOICEOVER SCRIPT — record clean, leave 0.5s gaps between scenes]"
        : mode === "product_demo"
          ? "[PRODUCT DEMO SCRIPT — read while screen-sharing the live product]"
          : "[SHORT-FORM SCRIPT — vertical, 30–60s, on-camera]";

  const lines: string[] = [header, "", `HOOK: ${hook}`, ""];
  scenes.forEach((s) => {
    lines.push(`Scene ${s.scene_number} · ${s.timecode} · ${s.scene_purpose}`);
    lines.push(s.narration);
    if (s.on_screen_text) lines.push(`[on-screen: ${s.on_screen_text}]`);
    lines.push("");
  });
  lines.push(`CTA: ${cta}`);
  return lines.join("\n");
}

function buildVoiceoverNotes(input: VideoForgeInput, mode: VideoMode): string[] {
  const base: string[] = [];
  if (mode === "short_form") {
    base.push("Speak ~10% faster than your normal pace; cut every breath in post.");
    base.push("Land the hook before the 3-second mark. If you stumble, restart — don't edit it.");
    base.push("End on a confident downbeat — no rising intonation on the CTA.");
  } else if (mode === "long_form") {
    base.push("Conversational, ~150 wpm. Vary pace between sections — slower on the problem, faster on the proof.");
    base.push("Pause for one full beat after the reframe sentence; let it land.");
    base.push("Re-record the hook last, after you've internalized the rest of the script.");
  } else if (mode === "faceless") {
    base.push("Record in a treated room or a closet with clothes. No room reverb.");
    base.push("Leave 0.5s of clean silence at the head and tail for editing room.");
    base.push("Cut breaths and 'ums' aggressively. The visuals carry — the VO must be tight.");
  } else {
    // product_demo
    base.push("Narrate every click. If the cursor moves, the voice explains it.");
    base.push("Don't apologize for loading states — cut them out in post.");
    base.push("Keep mouse movement deliberate. No hovering or wiggling between clicks.");
  }

  if (input.tone === "bold" || input.tone === "controversial") {
    base.push("Tone: assertive. Drop the verbal qualifiers ('I think', 'kind of', 'maybe').");
  } else if (input.tone === "storytelling" || input.tone === "casual") {
    base.push("Tone: human. Read like you're telling a friend — contractions, half-sentences allowed.");
  } else if (input.tone === "cinematic") {
    base.push("Tone: cinematic. Lower the pitch slightly, slow the pace ~10%, lean into pauses.");
  }
  return base;
}

function buildCaptions(
  input: VideoForgeInput,
  mode: VideoMode,
  output: Pick<VideoForgeOutput, "video_title" | "opening_hook" | "script_sections" | "hashtags">,
): { short_caption: string; long_caption: string } {
  const tagLine = output.hashtags.slice(0, 5).join(" ");
  const short =
    mode === "long_form"
      ? `${output.video_title}\n\nWatch the full breakdown — link below.\n\n${tagLine}`
      : `${output.opening_hook}\n\n${output.script_sections.cta}\n\n${tagLine}`;
  const long = [
    output.video_title,
    "",
    output.opening_hook,
    "",
    `For: ${input.target_audience || "anyone shipping work"}`,
    `Goal: ${GOAL_LABELS[input.video_goal]}`,
    "",
    "What you'll learn:",
    `1. ${output.script_sections.problem}`,
    `2. ${output.script_sections.insight}`,
    `3. ${output.script_sections.solution}`,
    "",
    output.script_sections.cta,
    "",
    tagLine,
  ].join("\n");
  return { short_caption: short, long_caption: long };
}

function buildThumbnailConcepts(input: VideoForgeInput, mode: VideoMode): string[] {
  const topic = input.topic || "the topic";
  const upper = topic.toUpperCase().split(" ").slice(0, 3).join(" ");
  if (mode === "long_form") {
    return [
      `Face left, looking at a giant red circle around the failure metric. Bold 3-word title ("${upper}") top-right.`,
      `Split-frame: "BEFORE" (red, messy dashboard) vs "AFTER" (green, clean dashboard). Title overlay: "${upper}".`,
      `Whiteboard with the 3-step loop drawn out, hand pointing at step 2. Title: "Why step 2 fails".`,
    ];
  }
  if (mode === "faceless") {
    return [
      `Bold typography only: "${upper}" stacked, with a single red arrow pointing at one word.`,
      `Stock photo of the workflow + giant numeral "3" overlay. Title: "${upper} — the 3 steps".`,
      `Before/after split with no faces. Pure screen recordings + bold caption.`,
    ];
  }
  if (mode === "product_demo") {
    return [
      `Product UI screenshot with one feature circled in red + face-cam reaction in corner.`,
      `Side-by-side: "30 min" (red, with old tool screenshot) → "30 sec" (green, your product).`,
      `Clean product hero shot with the headline result on top: "${upper} — done in 60s".`,
    ];
  }
  // short_form
  return [
    `Tight face crop, mouth open mid-sentence, "${upper}" bold across the bottom.`,
    `Single number on screen ("3X" / "$0 → $X"), arrow pointing at it, no other text.`,
    `Reaction face + a giant red ❌ on the wrong way to do ${topic}.`,
  ];
}

function buildHashtags(input: VideoForgeInput): string[] {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join("");
  const topicTag = slug(input.topic) || "topic";
  const audienceTag = slug(input.target_audience) || "founders";
  const goalTag = `${input.video_goal.replace(/_/g, "")}video`;
  const platformTag = input.platform;
  return Array.from(
    new Set([
      `#${topicTag}`,
      `#${audienceTag}`,
      `#${goalTag}`,
      `#${platformTag}`,
      "#ethinx",
      "#videoforge",
    ]),
  );
}

function buildDistribution(input: VideoForgeInput, mode: VideoMode): string {
  const native = PLATFORM_LABELS[input.platform];
  if (mode === "long_form") {
    return `Native upload to ${native} as horizontal long-form. Add chapters from the scene timecodes. Cut a 30s vertical teaser for Shorts/Reels/TikTok within 24h. Pin a comment with the resource link — never first comment. Schedule a community post 48h later linking back to the video.`;
  }
  if (mode === "faceless") {
    return `Upload natively to ${native} (vertical if Shorts/Reels/TikTok, horizontal if YouTube). Burn captions in. Re-cut with a different hook every 48h — same script, new opener. Faceless content scales by remix.`;
  }
  if (mode === "product_demo") {
    return `Post natively to ${native}. Pin link in the description / first comment to "try free". Repurpose the live walkthrough scene as a standalone 15s ad. Send the same video to your top 10 leads as a 1:1 follow-up.`;
  }
  return `Native upload to ${native} in vertical 9:16. Burn captions in. Cut a 7s teaser for the next-best platform after 48h. Link in pinned comment / bio — never first comment.`;
}

function buildSuccessMetric(input: VideoForgeInput, mode: VideoMode): string {
  const outcome = input.desired_outcome || "the desired outcome";
  if (mode === "short_form") {
    return `3-second view rate ≥ 65% and full-watch rate ≥ 35%. If hit, repost the angle in 2 weeks with a new hook. If missed, rewrite the hook only — keep the rest. Tie back to: "${outcome}".`;
  }
  if (mode === "long_form") {
    return `Average view duration ≥ 45% of total length. Click-through to the linked CTA ≥ 3%. Subscribers/1k views ≥ 5. Tie back to: "${outcome}".`;
  }
  if (mode === "faceless") {
    return `Watch-time ≥ 50% AND saves/shares ≥ 2% of views (faceless wins via saves, not likes). Tie back to: "${outcome}".`;
  }
  return `Demo completion rate ≥ 60% AND CTA click-through ≥ 5%. Track sign-ups attributed to the video URL within 7 days. Tie back to: "${outcome}".`;
}

function buildTitle(input: VideoForgeInput, mode: VideoMode): string {
  const topic = input.topic.trim() || "your next video";
  if (mode === "long_form") {
    switch (input.video_goal) {
      case "sales":
        return `${topic}: the full breakdown (and why most ${input.target_audience || "people"} get it wrong)`;
      case "education":
      case "tutorial":
        return `${topic}, explained — the system, the proof, and the 3-step plan`;
      case "thought_leadership":
        return `Why ${topic} is about to change — and what to do about it`;
      case "product_demo":
        return `${topic} — full live walkthrough`;
      default:
        return `${topic}: what most people get wrong (and the loop that fixes it)`;
    }
  }
  if (mode === "faceless") return `${topic} — the 3-step loop (no talking head)`;
  if (mode === "product_demo") return `${topic} in 60 seconds — live demo, no slides`;
  // short_form
  switch (input.video_goal) {
    case "sales":
      return `${topic} — the offer in 30s`;
    case "education":
    case "tutorial":
      return `${topic}, in 30 seconds`;
    case "marketing":
      return `${topic}: what most people get wrong`;
    case "thought_leadership":
      return `Why ${topic} is about to change`;
    case "entertainment":
      return `${topic} — you weren't ready`;
    default:
      return `${topic} in 30 seconds`;
  }
}

function buildCoreAngle(input: VideoForgeInput, mode: VideoMode): string {
  const who = input.target_audience || "the viewer";
  const topic = input.topic || "the topic";
  if (mode === "long_form")
    return `Treat ${topic} as a system ${who} can run weekly — not a tactic to try once. The whole video is the loop, made visible.`;
  if (mode === "faceless")
    return `${topic}, told entirely in visuals + VO. The on-screen text IS the argument; the voice is the rhythm.`;
  if (mode === "product_demo")
    return `Show, don't tell. ${topic} works because ${who} watches it work, end-to-end, in under two minutes.`;
  return `${topic} as one move ${who} can make today. Skip the theory, show the move.`;
}

function buildViewerPromise(input: VideoForgeInput): string {
  const outcome = (input.desired_outcome || "make one better decision today").toLowerCase();
  return `By the end of this video, ${input.target_audience || "you"} will be able to ${outcome} — without watching anything else on ${input.topic || "the topic"}.`;
}

// ---------- main entry ----------

export function generateVideoForge(input: VideoForgeInput): VideoForgeOutput {
  const mode = resolveMode(input);
  const video_title = buildTitle(input, mode);
  const core_angle = buildCoreAngle(input, mode);
  const viewer_promise = buildViewerPromise(input);
  const opening_hook = buildHook(input, mode);
  const script_sections = buildScriptSections(input, mode);
  const scene_breakdown = buildSceneBreakdown(input, mode, script_sections);
  const hashtags = buildHashtags(input);
  const captions = buildCaptions(input, mode, {
    video_title,
    opening_hook,
    script_sections,
    hashtags,
  });
  const thumbnail_concepts = buildThumbnailConcepts(input, mode);
  const distribution_recommendation = buildDistribution(input, mode);
  const success_metric = buildSuccessMetric(input, mode);
  const full_script = buildFullScript(
    input,
    mode,
    opening_hook,
    scene_breakdown,
    script_sections.cta,
  );
  const stock_footage_terms = Array.from(
    new Set(scene_breakdown.map((s) => s.b_roll_or_stock_query)),
  );
  const on_screen_text_overlays = scene_breakdown
    .map((s) => s.on_screen_text)
    .filter((t): t is string => Boolean(t));
  const voiceover_notes = buildVoiceoverNotes(input, mode);

  return {
    mode,
    video_title,
    core_angle,
    viewer_promise,
    opening_hook,
    full_script,
    script_sections,
    scene_breakdown,
    stock_footage_terms,
    on_screen_text_overlays,
    voiceover_notes,
    captions,
    thumbnail_concepts,
    hashtags,
    distribution_recommendation,
    success_metric,
  };
}

export function formatVideoForge(input: VideoForgeInput, out: VideoForgeOutput): string {
  return [
    `TITLE: ${out.video_title}`,
    `MODE: ${MODE_LABELS[out.mode]}`,
    `GOAL: ${GOAL_LABELS[input.video_goal]} · PLATFORM: ${PLATFORM_LABELS[input.platform]} · FORMAT: ${FORMAT_LABELS[input.format]}`,
    `TONE: ${TONE_LABELS[input.tone]} · LENGTH: ${LENGTH_LABELS[input.target_length]}`,
    "",
    `CORE ANGLE: ${out.core_angle}`,
    "",
    `VIEWER PROMISE: ${out.viewer_promise}`,
    "",
    "OPENING HOOK",
    out.opening_hook,
    "",
    "FULL SCRIPT",
    out.full_script,
    "",
    "SCRIPT SECTIONS",
    `Intro:    ${out.script_sections.intro}`,
    `Problem:  ${out.script_sections.problem}`,
    `Insight:  ${out.script_sections.insight}`,
    `Proof:    ${out.script_sections.proof}`,
    `Solution: ${out.script_sections.solution}`,
    `CTA:      ${out.script_sections.cta}`,
    "",
    "SCENE BREAKDOWN",
    ...out.scene_breakdown.flatMap((s) => {
      const range = s.end_timecode ? `${s.timecode}–${s.end_timecode}` : s.timecode;
      const dur =
        typeof s.duration_seconds === "number" ? ` (~${s.duration_seconds}s)` : "";
      return [
        `--- Scene ${s.scene_number} · ${range}${dur} · ${s.scene_purpose} ---`,
        `Narration: ${s.narration}`,
        `Visual:    ${s.suggested_visual}`,
        `Stock/B-roll search: ${s.b_roll_or_stock_query}`,
        `On-screen: ${s.on_screen_text || "—"}`,
        `VO note:   ${s.voiceover_note}`,
        "",
      ];
    }),
    "STOCK FOOTAGE / B-ROLL SEARCH TERMS",
    ...out.stock_footage_terms.map((t, i) => `${i + 1}. ${t}`),
    "",
    "ON-SCREEN TEXT OVERLAYS (in order)",
    ...out.on_screen_text_overlays.map((t, i) => `${i + 1}. ${t}`),
    "",
    "VOICEOVER NOTES",
    ...out.voiceover_notes.map((n, i) => `${i + 1}. ${n}`),
    "",
    "CAPTIONS",
    `Short:`,
    out.captions.short_caption,
    ``,
    `Long:`,
    out.captions.long_caption,
    "",
    "THUMBNAIL CONCEPTS",
    ...out.thumbnail_concepts.map((t, i) => `${i + 1}. ${t}`),
    "",
    `HASHTAGS: ${out.hashtags.join(" ")}`,
    formatFooter({
      nextSteps: [
        `Read the opening hook out loud — if it doesn't earn the next 5 seconds, rewrite it before recording.`,
        `Record one take of the hook + first scene only. Review before continuing.`,
        `Pull the listed stock-footage terms into your editor before you start cutting.`,
        `Burn captions into the final cut; do not rely on auto-captions.`,
        `Schedule the post via Distribution before the day is over.`,
      ],
      distribution: out.distribution_recommendation,
      successMetric: out.success_metric,
    }),
  ].join("\n");
}

// ---------- validation ----------
//
// `validateVideoForgeOutput` is a hard pre-save guard. It enforces that
// every required field on `VideoForgeOutput` is present and non-empty,
// and that every scene carries the production fields a creator needs to
// actually film. Returns a list of human-readable errors; empty list = ok.

/**
 * One structured validation problem. `path` is a JSON-pointer-ish field
 * locator (e.g. `scene_breakdown[2].narration`), `reason` is a short
 * human-readable explanation, `fix` is a one-line suggestion the UI can
 * surface verbatim.
 */
export interface VideoForgeValidationIssue {
  path: string;
  reason: string;
  fix: string;
}

export interface VideoForgeValidationResult {
  ok: boolean;
  /** Structured issues — preferred for UI rendering. */
  issues: VideoForgeValidationIssue[];
  /** Flat human-readable strings, kept for backwards compatibility. */
  errors: string[];
}

const REQUIRED_STRING_FIELDS: (keyof VideoForgeOutput)[] = [
  "video_title",
  "core_angle",
  "viewer_promise",
  "opening_hook",
  "full_script",
  "distribution_recommendation",
  "success_metric",
];

const REQUIRED_SCRIPT_SECTIONS: (keyof ScriptSections)[] = [
  "intro",
  "problem",
  "insight",
  "proof",
  "solution",
  "cta",
];

const REQUIRED_SCENE_FIELDS: (keyof SceneBreakdownItem)[] = [
  "timecode",
  "scene_purpose",
  "narration",
  "suggested_visual",
  "b_roll_or_stock_query",
  "on_screen_text",
  "voiceover_note",
];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Suggested fix copy per missing/empty field. Tuned to be a single
 * actionable sentence the UI can render verbatim.
 */
const FIX_HINTS: Partial<Record<string, string>> = {
  video_title: "Add a clear, specific title for the video.",
  core_angle: "Describe the single angle this video takes in one line.",
  viewer_promise: "State what the viewer can do by the end, in one sentence.",
  opening_hook: "Write 1–2 lines that create curiosity or tension in the first 3 seconds.",
  full_script: "Regenerate — the assembled script is missing.",
  distribution_recommendation: "Add a concrete distribution plan (platform, format, timing).",
  success_metric: "Define one measurable outcome (view rate, CTR, sign-ups).",
  intro: "Open with a spoken line, not a description of what to film.",
  problem: "Name the pain in one short, spoken sentence.",
  insight: "State the reframe as something you would say out loud.",
  proof: "Give one concrete proof point — number, before/after, or specific result.",
  solution: "List the steps as words you would say, not bullet labels.",
  cta: "Tell the viewer one specific thing to do (comment, click, save, share).",
  scene_breakdown: "Generate at least one scene before saving.",
  stock_footage_terms: "Each scene needs a B-roll search query — regenerate.",
  on_screen_text_overlays: "Each scene needs an on-screen text overlay.",
  voiceover_notes: "Add at least one global voiceover direction.",
  thumbnail_concepts: "Add at least one thumbnail concept the editor can mock up.",
  short_caption: "Write a 1–2 line caption suitable for the platform feed.",
  long_caption: "Write a longer caption with hashtags and viewer takeaways.",
  timecode: "Auto-timing should fill this — regenerate the video plan.",
  scene_purpose: "Name what this scene is doing in 2–4 words.",
  narration: "Write the actual spoken line for this scene.",
  suggested_visual: "Describe what's on screen during this scene.",
  b_roll_or_stock_query: "Add a stock-footage search term for this scene.",
  on_screen_text: "Add the burned-in text overlay for this scene.",
  voiceover_note: "Add a one-line direction for the voice talent.",
};

const DEFAULT_FIX = "Fill this field before saving.";
function fixFor(key: string): string {
  return FIX_HINTS[key] ?? DEFAULT_FIX;
}

function issueToString(i: VideoForgeValidationIssue): string {
  return `${i.path}: ${i.reason}`;
}

export function validateVideoForgeOutput(
  out: VideoForgeOutput | null | undefined,
): VideoForgeValidationResult {
  const issues: VideoForgeValidationIssue[] = [];
  if (!out) {
    const issue: VideoForgeValidationIssue = {
      path: "(root)",
      reason: "No video output to save.",
      fix: "Click Generate to produce a video plan, then save.",
    };
    return { ok: false, issues: [issue], errors: [issueToString(issue)] };
  }

  for (const f of REQUIRED_STRING_FIELDS) {
    if (!isNonEmptyString(out[f] as unknown)) {
      issues.push({
        path: String(f),
        reason: `Missing or empty: ${f}`,
        fix: fixFor(String(f)),
      });
    }
  }

  if (!out.script_sections || typeof out.script_sections !== "object") {
    issues.push({
      path: "script_sections",
      reason: "Missing script_sections.",
      fix: "Regenerate the video plan — script sections are required.",
    });
  } else {
    for (const s of REQUIRED_SCRIPT_SECTIONS) {
      if (!isNonEmptyString(out.script_sections[s])) {
        issues.push({
          path: `script_sections.${s}`,
          reason: `Missing or empty script section: ${s}`,
          fix: fixFor(s),
        });
      }
    }
  }

  if (!Array.isArray(out.scene_breakdown) || out.scene_breakdown.length === 0) {
    issues.push({
      path: "scene_breakdown",
      reason: "scene_breakdown must contain at least one scene.",
      fix: fixFor("scene_breakdown"),
    });
  } else {
    out.scene_breakdown.forEach((scene, idx) => {
      const sceneNum = scene?.scene_number ?? idx + 1;
      const label = `Scene ${sceneNum}`;
      const basePath = `scene_breakdown[${idx}]`;
      if (!scene || typeof scene !== "object") {
        issues.push({
          path: basePath,
          reason: `${label}: invalid scene object.`,
          fix: "Regenerate — this scene is malformed.",
        });
        return;
      }
      for (const f of REQUIRED_SCENE_FIELDS) {
        if (!isNonEmptyString(scene[f] as unknown)) {
          issues.push({
            path: `${basePath}.${f}`,
            reason: `${label}: missing ${f}.`,
            fix: fixFor(String(f)),
          });
        }
      }
    });
  }

  const arrayChecks: Array<{
    field: keyof VideoForgeOutput;
    label: string;
  }> = [
    { field: "stock_footage_terms", label: "stock_footage_terms" },
    { field: "on_screen_text_overlays", label: "on_screen_text_overlays" },
    { field: "voiceover_notes", label: "voiceover_notes" },
    { field: "thumbnail_concepts", label: "thumbnail_concepts" },
  ];
  for (const { field, label } of arrayChecks) {
    const arr = out[field] as unknown;
    if (!Array.isArray(arr) || arr.length === 0) {
      issues.push({
        path: label,
        reason: `${label} is empty.`,
        fix: fixFor(label),
      });
    } else if (!(arr as unknown[]).every(isNonEmptyString)) {
      issues.push({
        path: label,
        reason: `${label} contains an empty entry.`,
        fix: `Remove blank entries from ${label} or regenerate.`,
      });
    }
  }

  if (!out.captions || typeof out.captions !== "object") {
    issues.push({
      path: "captions",
      reason: "captions object is missing.",
      fix: "Regenerate — captions are required.",
    });
  } else {
    if (!isNonEmptyString(out.captions.short_caption)) {
      issues.push({
        path: "captions.short_caption",
        reason: "captions.short_caption is empty.",
        fix: fixFor("short_caption"),
      });
    }
    if (!isNonEmptyString(out.captions.long_caption)) {
      issues.push({
        path: "captions.long_caption",
        reason: "captions.long_caption is empty.",
        fix: fixFor("long_caption"),
      });
    }
  }

  // Speakability: spoken-text fields must contain dialogue, not stage
  // directions. Flag sentences that begin with instructional verbs
  // (Explain / Discuss / Show / Introduce + a few obvious siblings) and
  // any bracketed stage directions left inline. We only scan the spoken
  // surfaces — `voiceover_note`, `suggested_visual`, `b_roll_or_stock_query`,
  // `scene_purpose`, and on-screen text are *meant* to be directions.
  collectSpeakabilityIssues(out, issues);

  return {
    ok: issues.length === 0,
    issues,
    errors: issues.map(issueToString),
  };
}

/**
 * Returns a list of issues for any spoken-text field that reads like a
 * stage direction instead of a line a creator could deliver on camera.
 *
 * Rules:
 * - A sentence that **starts** with an instructional verb in imperative
 *   form (Explain / Discuss / Show / Introduce / Demonstrate / Describe /
 *   Outline / Highlight / Mention / Cover / Talk about) is flagged. We
 *   match the start of a sentence so natural in-line uses ("I'll show
 *   you what I mean.") are not penalized.
 * - Bracketed stage directions inside narration ("[Cold open over B-roll]",
 *   "[on-screen: …]") are flagged — they belong on visual fields.
 */
const INSTRUCTIONAL_VERBS = [
  "explain",
  "discuss",
  "show",
  "introduce",
  "demonstrate",
  "describe",
  "outline",
  "highlight",
  "mention",
  "cover",
  "talk about",
];

const SENTENCE_START_RE = new RegExp(
  // Start of string OR after sentence-ending punctuation + whitespace.
  // Capture the leading word (or two for "talk about").
  `(?:^|[.!?]\\s+)(${INSTRUCTIONAL_VERBS.map((v) => v.replace(" ", "\\s+")).join("|")})\\b`,
  "i",
);

const STAGE_DIRECTION_RE = /\[[^\]]+\]/;

function findInstructionalVerb(text: string): string | null {
  const m = text.match(SENTENCE_START_RE);
  return m ? m[1].toLowerCase().replace(/\s+/g, " ") : null;
}

function findStageDirection(text: string): string | null {
  const m = text.match(STAGE_DIRECTION_RE);
  return m ? m[0] : null;
}

function checkSpoken(label: string, text: string, errors: string[]): void {
  if (!isNonEmptyString(text)) return;
  const verb = findInstructionalVerb(text);
  if (verb) {
    errors.push(
      `${label}: starts with instructional verb "${verb}" — rewrite as a line to say.`,
    );
  }
  const stage = findStageDirection(text);
  if (stage) {
    errors.push(
      `${label}: contains stage direction ${stage} — keep directions in scene visuals/voiceover, not narration.`,
    );
  }
}

function collectSpeakabilityIssues(out: VideoForgeOutput): string[] {
  const errors: string[] = [];
  checkSpoken("opening_hook", out.opening_hook, errors);
  if (out.script_sections) {
    for (const k of REQUIRED_SCRIPT_SECTIONS) {
      checkSpoken(`script_sections.${k}`, out.script_sections[k] ?? "", errors);
    }
  }
  if (Array.isArray(out.scene_breakdown)) {
    out.scene_breakdown.forEach((scene, idx) => {
      const label = `Scene ${scene?.scene_number ?? idx + 1} narration`;
      checkSpoken(label, scene?.narration ?? "", errors);
    });
  }
  return errors;
}

