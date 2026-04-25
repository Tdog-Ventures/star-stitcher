# FacelessForge Render Integration — Stub

Goal: wire the full integration shape (DB columns, edge function proxy, UI states, polling) with FacelessForge as the rendering engine, but ship it as a clearly-labeled stub. No real API is called yet. No ffmpeg, no queue, no fake MP4 file.

---

## 1. Database (migration)

Add two nullable columns to `assets` so any video_forge row can carry render state:

- `render_job_id text` — id returned by FacelessForge (or stub)
- `rendered_video_url text` — final MP4 URL once render completes

Optional helper (also nullable, used by stub + future real API):

- `render_status text` — one of `null | 'pending' | 'completed' | 'failed'`

No RLS changes needed — existing `Assets: own *` policies already gate by `user_id`.

## 2. Backend secrets (placeholders)

Register two runtime secrets via the secrets tool, with placeholder values the user can swap later:

- `FACELESSFORGE_BASE_URL` (placeholder: `https://stub.facelessforge.invalid`)
- `FACELESSFORGE_API_KEY` (placeholder: `stub-not-connected`)

The edge function reads these but does not actually call out to them while in stub mode.

## 3. Edge functions (proxy boundary)

Two new functions under `supabase/functions/`. Both validate the caller's JWT, look up the asset by id, and confirm the asset belongs to `auth.uid()`. Both return JSON with CORS headers.

### `render-video` (POST)

Input (validated with zod):
```
{ asset_id: string (uuid),
  title: string,
  script: string,
  scene_breakdown: unknown[],
  stock_footage_terms: unknown[],
  captions: { short_caption?: string, long_caption?: string },
  voiceover_notes: unknown }
```

Behavior (stub mode — detected when `FACELESSFORGE_API_KEY` is missing or equals `stub-not-connected`):
1. Generate `render_job_id = 'stub_' + crypto.randomUUID()`
2. Update `assets` row: `render_job_id = <id>`, `render_status = 'pending'`
3. Return `{ job_id, status: 'pending', stub: true }`

Real-mode branch (left in place but unreachable while secret is the placeholder): would `POST ${FACELESSFORGE_BASE_URL}/render` with `Authorization: Bearer ${FACELESSFORGE_API_KEY}` and the validated payload, then store `job_id` from the response. This branch is wired but commented as the future swap point.

### `render-video-status` (GET)

Input: `?job_id=...&asset_id=...` (both validated).

Behavior in stub mode:
1. Verify the asset belongs to the caller and `render_job_id` matches.
2. Return `{ job_id, status: 'completed', video_url: null, stub: true, message: 'Render integration stub — real FacelessForge API not connected yet.' }`
3. Do NOT write a fake URL into `rendered_video_url`. The column stays null so the UI never claims an MP4 exists.

Real-mode branch: `GET ${FACELESSFORGE_BASE_URL}/jobs/${job_id}`, and on `completed` write the returned `video_url` to `assets.rendered_video_url` and `render_status = 'completed'`.

Both functions deploy with default `verify_jwt = false` and validate the bearer token in code via `supabase.auth.getClaims(token)`.

## 4. Frontend — `/videos` page

Extend `AssetRecord` to include `render_job_id`, `rendered_video_url`, `render_status`. Update the load query.

### New action button per card

State machine (mutually exclusive, deterministic from the row):

| Row state | Button shown | Sub-text |
|---|---|---|
| `render_job_id == null` | **Render video** (calls render-video) | none |
| `render_job_id != null && rendered_video_url == null` | **Rendering…** (disabled, spinner) | "Stub: marks as complete on next poll" |
| `rendered_video_url != null` | **MP4 attached** badge + **Download MP4** (anchor to url) | "Rendered by FacelessForge" |

A persistent banner sits at the top of the page:

> ⚠️ Render integration stub — real FacelessForge API not connected yet. Buttons exercise the full pipeline shape but no MP4 is produced.

### Polling — client-side + resume on reload

- On page mount, scan `rows` for any with `render_job_id && !rendered_video_url`. Add their ids to a `polling: Set<string>` state.
- After clicking **Render video** for a row, add that row's id to `polling` once the job_id is returned.
- A single `useEffect` runs `setInterval(5000)` while `polling.size > 0`. Each tick, for each polling id it calls the `render-video-status` edge function via `supabase.functions.invoke`, and on `completed` removes the id from `polling` and refreshes that row from the DB.
- Interval is cleared on unmount and when `polling` empties.

In stub mode the very first poll returns `completed` with `video_url: null`, so the UI flips from **Rendering…** back to **Render video** and the banner explains why no MP4 appeared. Critically, no fake MP4 link is ever shown.

### What stays unchanged

- Script download (`.txt`)
- Captions download (`.txt`)
- Distribution flow (modal, `distribution_tasks` insert, `trackEvent`)
- All existing badges and metadata rows

## 5. Tests

Extend `src/test/video-forge.test.ts` (or add a sibling `generated-videos.render.test.tsx`) with:

1. **State derivation** — pure function `deriveRenderUi(row)` that returns `'idle' | 'rendering' | 'complete'`. Unit-test the three branches.
2. **Render click** — render `<GeneratedVideos />` with a mocked `supabase` client, click **Render video**, assert `supabase.functions.invoke('render-video', ...)` was called with `{ asset_id, title, script, scene_breakdown, stock_footage_terms, captions, voiceover_notes }`.
3. **Stub completion** — mock the status invoke to return `{ status: 'completed', video_url: null }`, advance fake timers, assert the banner stays and the button reverts to **Render video** (no Download button appears, no MP4 claim).

Existing 49 tests must continue to pass. The deterministic `video-forge.ts` generator is not touched.

## 6. Validation

- `bun run build` must succeed
- `bunx vitest run` must be green (existing 49 + new render tests)
- No edge function tests required for the stub (logic is trivial); can add later when wiring the real API.

---

## Files changed

**New**
- `supabase/migrations/<ts>_add_render_columns_to_assets.sql`
- `supabase/functions/render-video/index.ts`
- `supabase/functions/render-video-status/index.ts`
- `src/test/generated-videos.render.test.tsx`

**Edited**
- `src/pages/dashboard/GeneratedVideos.tsx` — add render button, state machine, polling, stub banner, extended select
- `.env` is auto-managed — no manual edit

**Untouched**
- `src/lib/video-forge.ts`
- All other engines, tests, routes
- `src/integrations/supabase/types.ts` (auto-regenerated after migration)

## What FacelessForge will need to provide later (no work now)

- A `POST /render` endpoint accepting the payload above, returning `{ job_id }`
- A `GET /jobs/:id` endpoint returning `{ status: 'pending' | 'completed' | 'failed', video_url?: string }`
- An API key

Swapping in the real integration = adding the secret values + flipping the stub-mode check in both edge functions. No frontend changes required.
