# Auto-render video on Generate → land on /videos

## What changes for the user

Today: clicking **Generate Video** in Video Forge produces a script + saves an asset, but the actual MP4 render is a separate step buried in `/videos`. You asked: *"how do we generate this video from there?"* — the honest answer is the path isn't obvious.

After this change, the flow becomes:

1. Fill the Video Forge form, click **Generate Video**.
2. Script is generated (deterministic + optional DeepSeek polish, as today).
3. Asset is saved.
4. **A render job is queued automatically** with FacelessForge using the active script variant.
5. User is **redirected to `/videos`** where they see the new asset already in "Rendering…" state, status polling every 5s, MP4 appearing when done.
6. From `/videos` they can Preview, Download, or Distribute as today.

Manual-first principle is preserved: the Video Forge form is still 100% manual entry. The auto-render is just removing one extra click between "I have a script" and "I have an MP4".

## UX details

- **Button label** changes from `Generate Video` → `Generate & Render Video` so the auto-render is not a surprise.
- A small helper line under the button: *"Generates the script, saves the asset, and queues an MP4 render. You'll be taken to Generated Videos to watch progress."*
- Toast on success: *"Render queued — taking you to Generated Videos."*
- If render queueing fails (e.g. FacelessForge unreachable), the asset is still saved and we show: *"Script saved, but render couldn't start. Open it from /videos to retry."* — and we still navigate to `/videos` so the user can hit Retry.
- The polish-history panel and revert flow stay exactly as built. The variant active at the moment of Generate is the one sent to render.

## Out of scope (intentionally)

- No change to `/videos` rendering UI — it already handles queued/rendering/done/failed/cancelled.
- No change to `/assets` (no Render button added there). `/videos` remains the single status hub.
- No change to render-video edge function — it already accepts the structured script payload.
- Distribution flow unchanged.

## Technical notes

Files touched:

- `src/pages/dashboard/VideoForge.tsx`
  - After the existing save-asset step succeeds, immediately call `supabase.functions.invoke("render-video", { body: <same payload GeneratedVideos sends> })`.
  - Reuse the exact payload shape from `GeneratedVideos.handleRender` (extract scenes, captions, mode, platform from the active variant's envelope) — extract this into a shared helper in `src/lib/video-forge.ts` (e.g. `buildRenderPayload(asset, meta)`) so both call sites stay in sync.
  - On success: persist `render_job_id` + `render_status: 'queued'` on the asset row (same columns `GeneratedVideos` expects), then `navigate('/videos')`.
  - On failure: keep asset, toast warning, still navigate to `/videos`.
- `src/lib/video-forge.ts`
  - New exported helper `buildRenderPayload(activeOutput)` returning the body shape `render-video` expects. Refactor `GeneratedVideos.handleRender` to use it (no behavior change there).
- Button label + helper text in the Video Forge form.

No DB migration. No edge function change. No new routes.

## Verification

- Manual: fill form → Generate → confirm redirect to /videos → confirm new row shows "Rendering…" with polling.
- Test: extend `src/test/generated-videos.render.test.tsx` (or add a sibling `videoforge.autorender.test.tsx`) to assert that `render-video` is invoked with the same payload shape from both entry points after the helper extraction.
- Failure path: temporarily make `render-video` return an error and confirm the asset is still saved and the user lands on /videos with a warning toast.
