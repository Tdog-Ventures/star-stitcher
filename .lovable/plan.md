# Plan: FacelessForge v3 visual + multi-engine routing

Keep the existing FacelessForge wiring (`render-video`, `render-video-status`, `render-video-cancel`, `FACELESSFORGE_API_KEY`, `FACELESSFORGE_BASE_URL`). Only the UI and the render request payload change.

## Scope

### 1. Generated Videos — visual polish only
The live progress behavior already matches v3 spec (real `progress` from status endpoint, asymptotic fallback capped at 95% labeled "est.", reload-resume, per-job cancel, 5s poll). No logic changes.

What changes:
- Re-skin each video card in v3 style: dark surface, subtle border, neon-green primary action, mono job-id chip.
- Progress bar: thicker track, neon-green fill, percentage on the right, "est." badge when fallback.
- Add a small "Engine: VideoForge / Lumina / Neon" chip per row, read from a new `engine` field stored in the asset.

### 2. Engines page — match v3 layout
Re-skin `src/pages/dashboard/Engines.tsx` (route `/engines`) to mirror the v3 6-tile grid:
- Video Forge, Creator Blueprint, Creator Launchpad, Neon Studio, Video Velocity, Partner Program.
- Dark cards, neon-green "Open engine" button, icon top-left, short tagline, "Primary" badge on Partner Program per the screenshot.
- Hide the extras currently in the grid (Growth Hub, Showcase, Offer, Distribution, Content Repurpose) from this view; they remain reachable from the sidebar so no routes are removed.

### 3. Multi-engine routing on render
Add an engine picker to the render flow:
- New `<Select>` with options: `videoforge` (default), `lumina`, `neon`.
- Shown in two places: the auto-render trigger in Video Forge (`src/pages/dashboard/VideoForge.tsx`) and the manual render button on Generated Videos.
- Selected value flows through `buildRenderPayload(...)` as a new `engine` field and is included in the body POSTed to the `render-video` edge function.
- `render-video/index.ts`: accept optional `engine` (validated against the 3 values, default `videoforge`) and forward it to FacelessForge as `engine` inside the upstream payload. No other backend change.
- Persist the chosen engine on the asset row so Generated Videos can show the chip and so polling/retry use the same engine.

### 4. Storage
One small migration: add `assets.render_engine TEXT` (nullable, no default constraint). Backfill is unnecessary — old rows display as "VideoForge" by convention.

## Technical details

Files touched:
- `src/pages/dashboard/Engines.tsx` — re-skin, trim to 6 tiles.
- `src/pages/dashboard/GeneratedVideos.tsx` — card re-skin, engine chip, engine select on Render button.
- `src/pages/dashboard/VideoForge.tsx` — engine select beside "Generate & render video".
- `src/lib/video-forge.ts` — extend `buildRenderPayload` to accept and emit `engine`.
- `src/index.css` / tokens — add neon-green accent token (HSL) and dark-card surface token if not already present; reuse semantic tokens, no hardcoded hex.
- `supabase/functions/render-video/index.ts` — validate optional `engine` and forward to FacelessForge.
- Migration: `ALTER TABLE public.assets ADD COLUMN render_engine TEXT;`.

Not touched:
- `render-video-status` / `render-video-cancel` edge functions.
- FacelessForge secrets or base URL.
- Polling, fallback curve, cancel logic on Generated Videos.

## Out of scope
- Replacing the FacelessForge backend with browser-side Canvas/MediaRecorder rendering (the v3 HTML demo's approach).
- Webhook receiver — current polling already covers the live update need.
- Any change to the FacelessForge endpoint URL.

## Open question
The "Lumina" and "Neon" engine values will be forwarded to FacelessForge, but I don't know if your FacelessForge deployment actually understands those names. If it doesn't, picking them today will likely fail upstream. Option A: ship the picker now, FacelessForge ignores unknown engines and renders with VideoForge by default. Option B: hide Lumina/Neon behind a "coming soon" flag until FacelessForge confirms support. I'll default to Option A unless you tell me otherwise.
