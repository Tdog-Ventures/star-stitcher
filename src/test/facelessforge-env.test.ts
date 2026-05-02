import { describe, it, expect } from "vitest";
import {
  FACELESSFORGE_REQUIRED_FOR_RENDER,
  messageFromFunctionsInvoke,
} from "@/lib/facelessforge-env";

describe("FacelessForge env contract (client)", () => {
  it("lists required secrets for Edge render proxies", () => {
    expect([...FACELESSFORGE_REQUIRED_FOR_RENDER]).toEqual([
      "FACELESSFORGE_BASE_URL",
      "FACELESSFORGE_API_KEY",
    ]);
  });

  it("messageFromFunctionsInvoke prefers structured error from invoke data", () => {
    expect(
      messageFromFunctionsInvoke(
        {
          error: "FacelessForge is not configured. Set FACELESSFORGE_BASE_URL and FACELESSFORGE_API_KEY as Supabase Edge Function secrets.",
          code: "FACELESSFORGE_NOT_CONFIGURED",
          details: { missing: ["FACELESSFORGE_API_KEY"] },
        },
        { message: "Edge Function returned a non-2xx status code" },
      ),
    ).toContain("FACELESSFORGE_NOT_CONFIGURED");
  });

  it("messageFromFunctionsInvoke falls back to Functions error message", () => {
    expect(messageFromFunctionsInvoke(null, { message: "Network failure" })).toBe(
      "Network failure",
    );
  });

  it("messageFromFunctionsInvoke handles empty data", () => {
    expect(messageFromFunctionsInvoke({}, null)).toBe("Request failed");
  });
});

/** Mirrors `facelessForgeNotConfiguredResponse` from Edge `_shared/facelessforge.ts` for contract tests. */
describe("FacelessForge Edge JSON shape (contract)", () => {
  it("missing-credentials payload includes code and missing keys list", () => {
    const body = {
      error:
        "FacelessForge is not configured. Set FACELESSFORGE_BASE_URL and FACELESSFORGE_API_KEY as Supabase Edge Function secrets.",
      code: "FACELESSFORGE_NOT_CONFIGURED",
      details: { missing: ["FACELESSFORGE_BASE_URL", "FACELESSFORGE_API_KEY"] as const },
    };
    expect(body.code).toBe("FACELESSFORGE_NOT_CONFIGURED");
    expect(body.details.missing).toContain("FACELESSFORGE_BASE_URL");
    expect(body.details.missing).toContain("FACELESSFORGE_API_KEY");
    expect(messageFromFunctionsInvoke(body, { message: "503" })).toMatch(
      /FACELESSFORGE_NOT_CONFIGURED/,
    );
  });
});
