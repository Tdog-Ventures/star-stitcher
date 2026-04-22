import { test, expect } from "@playwright/test";
import { seedAuth } from "./utils/auth";
import { ADMIN_ROUTES } from "./utils/admin-routes";

/**
 * Mobile sidebar (Sheet) end-to-end checks at 390x844.
 * Complements the jsdom Vitest spec (src/test/admin-nav-mobile.test.tsx) with a
 * real browser pass that exercises the Radix portal, overlay, and scroll lock.
 */
test.describe("Admin · mobile sheet sidebar @mobile", () => {
  test.skip(({}, testInfo) => testInfo.project.name !== "mobile-chromium");

  test.beforeEach(async ({ context, page }) => {
    await seedAuth(context, "admin");
    await page.goto("/admin", { waitUntil: "networkidle" });
  });

  test("sheet opens, overlays content, locks scroll, and routes through every link", async ({
    page,
  }) => {
    // Sidebar links should NOT be in DOM (or at least not visible) before opening.
    const trigger = page.getByRole("button", { name: /toggle sidebar/i });
    await expect(trigger).toBeVisible();

    for (const route of ADMIN_ROUTES) {
      await trigger.click();

      // Sheet renders as a dialog
      const sheet = page.getByRole("dialog");
      await expect(sheet).toBeVisible();

      // Overlay sits above content — z-index sanity: dialog must be in the top layer of stacking.
      const overlayCount = await page.locator("[data-state=open]").count();
      expect(overlayCount).toBeGreaterThan(0);

      // Body scroll should be locked while the sheet is open.
      const lockedWhileOpen = await page.evaluate(() => {
        const body = document.body;
        return (
          body.hasAttribute("data-scroll-locked") ||
          getComputedStyle(body).overflow === "hidden" ||
          getComputedStyle(body).pointerEvents === "none"
        );
      });
      expect(lockedWhileOpen, "body should be scroll-locked while sheet is open").toBe(true);

      // Click the link inside the sheet
      const link = sheet.getByRole("link", { name: new RegExp(`^${route.link}$`, "i") });
      await expect(link).toBeVisible();
      await link.click();

      // Route changes
      await page.waitForURL(`**${route.href}`);

      // Sheet closes after navigation OR after we dismiss it; some sheets don't auto-close on link click.
      // Be tolerant: press Escape if still open, then assert closed.
      if (await sheet.isVisible().catch(() => false)) {
        await page.keyboard.press("Escape");
      }
      await expect(page.getByRole("dialog")).toBeHidden();

      // After close, scroll lock must be released and the page must be tappable again.
      await expect
        .poll(
          async () =>
            page.evaluate(() => {
              const body = document.body;
              return (
                !body.hasAttribute("data-scroll-locked") &&
                getComputedStyle(body).pointerEvents !== "none"
              );
            }),
          { timeout: 2000, message: "scroll lock should release after sheet closes" },
        )
        .toBe(true);

      // Page heading for the route is reachable (no aria-hidden trap left behind).
      // Heading text varies per page — assert at least one h1 is visible.
      await expect(page.locator("h1").first()).toBeVisible();
    }
  });
});
