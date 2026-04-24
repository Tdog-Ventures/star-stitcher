# ETHINX — Offer + Distribution Engine

ETHINX is a SaaS for solo founders to create offers and distribute content
manually but systematically. Manual entry always works; AI is acceleration only.

Stack: React 18 + Vite + TypeScript + Tailwind + Lovable Cloud (Supabase).

## Launch checklist

Use this before publishing, going live, or handing the workspace to a real user.

### 1. Environment variables

The `.env` file is auto-managed by Lovable Cloud. Confirm the following keys
exist and are non-empty (do **not** edit the file by hand):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Server-side secrets (set in Lovable Cloud → Secrets):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `LOVABLE_API_KEY` (only if AI features are used)

### 2. Lovable Cloud enabled

- Cloud must be **enabled** for this project (Connectors → Lovable Cloud).
- Database tables present: `profiles`, `user_roles`, `offers`, `assets`,
  `distribution_tasks`, `analytics_events`.
- RLS is **on** for every table above. All policies are owner-scoped, with
  admin override via `has_role(auth.uid(), 'admin')`.

### 3. Authentication enabled

- Email/password sign-in enabled.
- Google sign-in enabled (optional but recommended).
- Email confirmation **on** for production.
- The trigger `handle_new_user` automatically creates a row in `profiles`
  and assigns the `user` role on signup.

### 4. First admin setup

After the first real user signs up:

1. Open Lovable Cloud → Database → `user_roles`.
2. Insert a row with that user's `user_id` and `role = 'admin'`.
3. Sign out and back in — the `/admin` route should now be reachable.

You can repeat the same step with `role = 'member'` to grant workspace
access without admin rights.

### 5. Smoke test steps

Run through these end-to-end before declaring launch:

1. **Sign up** a fresh email at `/signup` and verify the email.
2. **Onboarding** — `/dashboard` shows the 5-step checklist and "Start here".
3. **Create offer** — `/engines/offer`, click *Load sample offer*, edit, save.
4. **Save asset** — confirm the offer appears in `/assets`.
5. **Schedule distribution** — create a task in `/distribution` for a channel,
   set `scheduled_at`, save.
6. **Calendar view** — `/distribution/calendar` shows the new task.
7. **Mark sent + add metrics** — set status to `completed`, fill impressions,
   clicks, conversions, revenue. CTR/CR/RPT should compute on the dashboard.
8. **Performance** — `/dashboard` performance cards update; *best performing
   channel* and *best performing offer* render.
9. **History** — `/engines/offer/history` lists the offer with linked
   asset + task counts; the detail drawer opens.
10. **CSV export** — export from `/distribution` and from the performance
    board; checklist marks "Export CSV" complete.
11. **Settings** — visit `/settings/account` (sign out works) and
    `/settings/workspace` (workspace name persists locally).
12. **Admin** — sign in as the admin user; `/admin` shows totals, recent
    events, task health. `/admin/performance` lists all users' tasks.
13. **404** — visit `/does-not-exist`; the styled 404 with dashboard +
    Offer Engine links is shown.
14. **Error boundary** — no white screen; the global boundary renders the
    "Return to dashboard" fallback if a render error occurs.

### Local development

```bash
bun install
bun run dev     # starts Vite on http://localhost:5173
bunx vitest run # runs the unit suite
bun run build   # production build, must complete without warnings
```
