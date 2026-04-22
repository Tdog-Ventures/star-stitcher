import type { Page, BrowserContext } from "@playwright/test";

const STORAGE_KEY = "ethinx.auth.stub";

export type SeedRole = "admin" | "member";

/**
 * Seed the localStorage auth stub BEFORE any app code runs.
 * Must be called on the context (not the page) so it survives navigations.
 */
export async function seedAuth(context: BrowserContext, role: SeedRole) {
  await context.addInitScript(
    ({ key, payload }) => {
      try {
        window.localStorage.setItem(key, payload);
      } catch {
        // ignore — private mode etc.
      }
    },
    {
      key: STORAGE_KEY,
      payload: JSON.stringify({
        id: `stub-${role}`,
        email: `${role}@ethinx.dev`,
        role,
      }),
    },
  );
}

/**
 * Stabilise the page for visual diffing:
 * - freeze Date.now / new Date to a fixed ISO so any timestamps render the same
 * - disable CSS transitions/animations
 * - hide scrollbars
 * - force `prefers-reduced-motion: reduce`
 */
export async function stabilisePage(context: BrowserContext) {
  await context.addInitScript(() => {
    const FROZEN = new Date("2025-01-15T12:00:00.000Z").getTime();
    const RealDate = Date;
    // @ts-expect-error - intentional override for deterministic snapshots
    Date = class extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(FROZEN);
          return;
        }
        // @ts-expect-error - forwarding variadic args
        super(...args);
      }
      static now() {
        return FROZEN;
      }
    } as DateConstructor;

    // Math.random determinism for any chart jitter, etc.
    let seed = 1;
    Math.random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  });
}

export async function injectStableStyles(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      html { scrollbar-width: none; }
      ::-webkit-scrollbar { display: none; }
      /* Caret blink would otherwise diff */
      * { caret-color: transparent !important; }
    `,
  });
}
