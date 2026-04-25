import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";

// Make the hook always return light so the toggle icon is deterministic.
vi.mock("@/providers/ThemeProvider", async () => {
  const actual = await vi.importActual<typeof import("@/providers/ThemeProvider")>("@/providers/ThemeProvider");
  return {
    ...actual,
    useTheme: () => ({ theme: "light" as const, toggleTheme: vi.fn() }),
  };
});

function renderNavbar(initialRoute = "/") {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <PublicNavbar />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe("PublicNavbar", () => {
  it("renders all nav links with correct hrefs", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: /^Engines$/i })).toHaveAttribute("href", "/engines");
    expect(screen.getByRole("link", { name: /^Assets$/i })).toHaveAttribute("href", "/assets");
    expect(screen.getByRole("link", { name: /^Distribution$/i })).toHaveAttribute("href", "/distribution");
    expect(screen.getByRole("link", { name: /^Admin$/i })).toHaveAttribute("href", "/admin");
  });

  it("marks Engines as active on /engines", () => {
    renderNavbar("/engines");
    const link = screen.getByRole("link", { name: /^Engines$/i });
    expect(link).toHaveClass("bg-muted/60", "text-primary");
  });

  it("marks Assets as active on /assets", () => {
    renderNavbar("/assets");
    const link = screen.getByRole("link", { name: /^Assets$/i });
    expect(link).toHaveClass("bg-muted/60", "text-primary");
  });

  it("marks Distribution as active on /distribution", () => {
    renderNavbar("/distribution");
    const link = screen.getByRole("link", { name: /^Distribution$/i });
    expect(link).toHaveClass("bg-muted/60", "text-primary");
  });

  it("marks Admin as active on /admin", () => {
    renderNavbar("/admin");
    const link = screen.getByRole("link", { name: /^Admin$/i });
    expect(link).toHaveClass("bg-muted/60", "text-primary");
  });

  it("renders Sign in linking to /login", () => {
    renderNavbar();
    expect(screen.getByRole("link", { name: /^Sign in$/i })).toHaveAttribute("href", "/login");
  });

  it("renders Get started linking to /onboarding", () => {
    renderNavbar();
    expect(screen.getByRole("link", { name: /^Get started$/i })).toHaveAttribute("href", "/onboarding");
  });
});
