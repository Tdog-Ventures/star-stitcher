# Playwright E2E suite

Visual regression + navigation + mobile sheet checks for the Admin shell.

## First-time setup (local + CI)

```bash
npx playwright install --with-deps chromium
```

## Run

```bash
npm run e2e                 # run all projects
npm run e2e:desktop         # desktop-chromium only
npm run e2e:mobile          # mobile-chromium only
npm run e2e:update          # regenerate visual baselines
npm run e2e:report          # open last HTML report
```

## Layout

- `playwright.config.ts` — two projects: `desktop-chromium` (1440x900) and `mobile-chromium` (390x844, Pixel 5 emulation).
- `tests/utils/auth.ts` — `seedAuth(context, "admin")` writes the `ethinx.auth.stub` localStorage entry via `addInitScript` so the SPA boots already authenticated. `stabilisePage` freezes `Date` + `Math.random` and `injectStableStyles` kills CSS transitions and scrollbars for deterministic screenshots.
- `tests/utils/admin-routes.ts` — single source of truth for the admin sidebar route list.
- `tests/admin.visual.spec.ts` — clicks each sidebar link, waits for `networkidle`, and `expect(page).toHaveScreenshot()` against a committed baseline.
- `tests/navigation.spec.ts` — for each route asserts (a) URL changes, (b) clicked link has `bg-muted text-primary` tokens, (c) other links don't, (d) `window.scrollY === 0` after navigation.
- `tests/mobile.sidebar.spec.ts` — at 390x844 opens the SidebarTrigger, asserts the dialog/overlay opens, body scroll lock engages, link routes correctly, and the lock releases after close.

## Baselines

Screenshots live at `tests/__screenshots__/<project>/admin.visual.spec.ts/<slug>.png` and are namespaced per project (so Linux CI shots don't collide with macOS local shots). Always (re)generate baselines on the same OS as CI:

```bash
# In CI image (or via Docker):
npx playwright test --update-snapshots --project=desktop-chromium
git add tests/__screenshots__
```

## Stability levers

- `Date.now()` and `new Date()` are pinned to `2025-01-15T12:00:00Z` via `addInitScript`.
- `Math.random` is seeded.
- All CSS animations/transitions are zeroed via injected stylesheet.
- `prefers-reduced-motion` honored.
- `maxDiffPixelRatio: 0.01` tolerates anti-aliasing noise; raise selectively if a chart adds inevitable jitter.
- Mask volatile regions with `mask: [page.locator("[data-testid=...]")]` in the screenshot call.
