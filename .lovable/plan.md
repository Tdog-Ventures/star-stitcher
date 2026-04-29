# Smarter Video Forge scripts (DeepSeek-polished, audience-aware)

## Goal

Stop the current script from sounding like generic motivational filler ("you keep grinding…", "ship one experiment a week"). Make every scene actually be **about the topic** for the chosen Goal (Education, Marketing, etc.), and stop reading the audience field literally inside narration.

## Approach

**Hybrid generation:**
1. Keep the existing deterministic engine in `src/lib/video-forge.ts` as the **structural skeleton** — it still decides mode, scene count, timecodes, on-screen text, hashtags, captions, distribution, success metric. This guarantees the form always returns *something* fast and offline.
2. Add a new **DeepSeek polish pass** that rewrites only the spoken narration of each scene + the hook + the viewer promise + the CTA, given the topic, goal, audience, tone, and platform. Structure stays; words become topic-true.
3. UI gets a small async state so the user sees "Generating script…" while the polish runs (~5-10s), with a graceful fallback to the deterministic output if DeepSeek fails or times out.

**Audience handling:**
- Drop audience from spoken narration entirely. No more "If you're Everyone - universal and you want to…".
- Audience still drives: hashtags, B-roll search terms ("school kids studying solar"), distribution targeting note, and the system prompt to DeepSeek (so the *vocabulary* fits the audience without naming them).

## What changes

### 1. New secret: `DEEPSEEK_API_KEY`
User already has a DeepSeek key. Stored as a Supabase secret, used only server-side from a new edge function. Never shipped to the browser.

### 2. New edge function: `supabase/functions/video-forge-polish/index.ts`
- Auth-gated (requires logged-in user, like other functions).
- Input: the deterministic `VideoForgeOutput` JSON + the original `VideoForgeInput`.
- Calls DeepSeek (`deepseek-chat`) with a tight system prompt:
  - "Rewrite narration so each scene is genuinely about {topic} for goal={goal}. For Education: teach a real fact. For Marketing: sell the outcome. Never address the audience by name — write so the line works for any viewer. Keep timing constraints: scene N has ~X seconds, so ~Y words."
- Returns a small JSON patch: `{ hook, viewer_promise, cta, scenes: [{scene_number, narration}] }`.
- Server merges the patch onto the deterministic output and returns the final object. If DeepSeek errors or returns malformed JSON, the function returns the deterministic output unchanged with `{ polished: false, reason }`.

### 3. `src/lib/video-forge.ts` cleanup
- Remove audience interpolation from every `intro/problem/insight/proof/solution/cta` template across all four modes. Replace with topic-only or generic phrasing ("If {topic} hasn't moved in 90 days…" instead of "If you're {who} and…").
- Keep `target_audience` flowing into hashtags, B-roll queries, and the polish prompt only.
- Add a `polished?: boolean` flag to `VideoForgeOutput` so the UI can show a subtle "AI-polished" pill.

### 4. `src/pages/dashboard/VideoForge.tsx`
- After `generateVideoForge(fields)` succeeds, call `supabase.functions.invoke("video-forge-polish", { body: { input, draft } })`.
- Show "Polishing script with AI…" state with a 15s timeout.
- On success: render polished output, mark badge "AI-polished".
- On failure/timeout: render the deterministic draft, show a quiet "Couldn't reach AI polisher — showing fast draft" notice with a Retry polish button.

### 5. Tests
- `src/test/video-forge.test.ts`: assert no template renders the literal string `target_audience` value inside narration. Add cases for Education + Renewable Energy and Marketing + SaaS to confirm scenes are topic-true (smoke check on keywords).
- New `src/test/video-forge.polish.test.ts`: mock `supabase.functions.invoke` and assert the page renders polished content when the function resolves, and falls back when it rejects.

## Out of scope (intentionally)

- No change to FacelessForge render pipeline, `/videos` flow, or distribution.
- No change to the form fields themselves — same inputs.
- No long-form re-architecture; same 5-scene short-form, same scene count rules.

## Files touched

- new: `supabase/functions/video-forge-polish/index.ts`
- new: `src/test/video-forge.polish.test.ts`
- edit: `src/lib/video-forge.ts` (drop audience from narration templates, add `polished` flag)
- edit: `src/pages/dashboard/VideoForge.tsx` (async polish call + UI states)
- edit: `src/test/video-forge.test.ts` (add audience-leak guards + topic-true assertions)
- new secret: `DEEPSEEK_API_KEY` (requested via add_secret before deploying the function)

## Technical notes

- DeepSeek API: `https://api.deepseek.com/v1/chat/completions`, model `deepseek-chat`, `response_format: { type: "json_object" }` for safe parsing.
- Hard timeout 12s on the upstream call; total budget 15s end-to-end so the UI never hangs.
- Server prompt enforces a strict JSON schema and word-count caps per scene (≈2.5 words per second) so polished narration still fits the timecodes.
- No DB schema changes. Polished output is saved to `assets.content` exactly like today.
