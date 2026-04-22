import { test, expect } from "@playwright/test";
import { seedAuth, stabilisePage, injectStableStyles } from "./utils/auth";
import { ADMIN_ROUTES } from "./utils/admin-routes";

test.describe("Admin · visual regression @desktop", () => {
  // Visual diffing is meaningful on a fixed desktop viewport only.
  test.skip(({ browserName }, testInfo) => {
    return testInfo.project.name !== "desktop-chromium";
  }, "Visual baselines pinned to desktop-chromium project");

  test.beforeEach(async ({ context, page }) => {
    await seedAuth(context, "admin");
    await stabilisePage(context);
    // Hit a route first so localStorage/init scripts are applied to the SPA.
    await page.goto("/admin", { waitUntil: "networkidle" });
    await injectStableStyles(page);
  });

  for (const route of ADMIN_ROUTES) {
    test(`baseline · ${route.slug}`, async ({ page }) => {
      // Sidebar trigger is always present in the header
      const trigger = page.getByRole("button", { name: /toggle sidebar/i });
      await expect(trigger).toBeVisible();

      // Click the sidebar link (skip Command Board if we're already on it; click anyway for parity)
      // Sidebar lives inside [data-sidebar="menu"] — scope to it to avoid header brand link.
      const menu = page.locator('[data-sidebar="menu"]').first();
      const link = menu.getByRole("link", { name: new RegExp(`^${route.link}$`, "i") });
      await link.click();

      // Wait for SPA route to settle
      await page.waitForURL(`**${route.href}`);
      await page.waitForLoadState("networkidle");

      // Re-inject stable styles in case route mounted new style sheets
      await injectStableStyles(page);

      // Mask anything intrinsically unstable (auth email pill, etc.)
      const masks = [page.locator("[data-testid=user-email]")];

      await expect(page).toHaveScreenshot(`${route.slug}.png`, {
        fullPage: true,
        mask: masks,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
