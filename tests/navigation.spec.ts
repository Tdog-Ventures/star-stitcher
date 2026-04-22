import { test, expect } from "@playwright/test";
import { seedAuth } from "./utils/auth";
import { ADMIN_ROUTES } from "./utils/admin-routes";

test.describe("Admin · navigation assertions @desktop", () => {
  test.skip(({}, testInfo) => testInfo.project.name !== "desktop-chromium");

  test.beforeEach(async ({ context, page }) => {
    await seedAuth(context, "admin");
    await page.goto("/admin", { waitUntil: "networkidle" });
  });

  test("each sidebar click: routes, applies active class, resets scroll", async ({ page }) => {
    const menu = page.locator('[data-sidebar="menu"]').first();

    for (const route of ADMIN_ROUTES) {
      // 1. Force scrollY > 0 before navigating so we can verify the reset.
      await page.evaluate(() => {
        // Make the body scrollable then jump down.
        document.documentElement.style.minHeight = "4000px";
        window.scrollTo(0, 800);
      });
      const beforeScroll = await page.evaluate(() => window.scrollY);
      expect(beforeScroll).toBeGreaterThan(0);

      // 2. Click the sidebar link
      const link = menu.getByRole("link", { name: new RegExp(`^${route.link}$`, "i") });
      await link.click();

      // 3. URL changed
      await page.waitForURL(`**${route.href}`);

      // 4. Active class on clicked link (matches NavLink activeClassName="bg-muted text-primary font-medium")
      const activeLink = menu.getByRole("link", { name: new RegExp(`^${route.link}$`, "i") });
      const cls = (await activeLink.getAttribute("class")) ?? "";
      const tokens = cls.split(/\s+/);
      expect(tokens, `${route.href} should have bg-muted`).toContain("bg-muted");
      expect(tokens, `${route.href} should have text-primary`).toContain("text-primary");

      // 5. Other sidebar links must NOT have the active tokens.
      for (const other of ADMIN_ROUTES) {
        if (other.href === route.href) continue;
        const otherLink = menu.getByRole("link", { name: new RegExp(`^${other.link}$`, "i") });
        const otherCls = (await otherLink.getAttribute("class")) ?? "";
        const otherTokens = otherCls.split(/\s+/);
        expect(otherTokens, `${other.href} should not be active`).not.toContain("bg-muted");
        expect(otherTokens, `${other.href} should not be active`).not.toContain("text-primary");
      }

      // 6. Scroll position reset to 0 after navigation (route changes should land at top)
      // Allow a short grace period for any scroll-restoration effect.
      await expect
        .poll(async () => page.evaluate(() => window.scrollY), {
          timeout: 2000,
          message: `scrollY should reset to 0 after navigating to ${route.href}`,
        })
        .toBe(0);
    }
  });
});
