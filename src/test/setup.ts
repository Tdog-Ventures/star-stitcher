import "@testing-library/jest-dom";
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Test-only auth seed: tests put { id, email, role } here and the
// supabase mock below will surface that as a fake session.
type SeedUser = { id: string; email: string; role: "admin" | "member" | "user" };
declare global {
  // eslint-disable-next-line no-var
  var __TEST_AUTH__: SeedUser | null | undefined;
}
globalThis.__TEST_AUTH__ = null;

const buildSession = () => {
  const u = globalThis.__TEST_AUTH__;
  if (!u) return null;
  return {
    access_token: "test",
    refresh_token: "test",
    token_type: "bearer",
    expires_in: 3600,
    user: { id: u.id, email: u.email },
  };
};

vi.mock("@/integrations/supabase/client", () => {
  const queryBuilder = () => {
    const result = Promise.resolve({ data: [], error: null });
    const chain: Record<string, (...args: unknown[]) => unknown> = {};
    const make = (): typeof chain => {
      const c: typeof chain = {};
      ["select", "insert", "update", "delete", "eq", "neq", "is", "not", "in", "order", "single", "maybeSingle", "limit", "range"].forEach((m) => {
        c[m] = () => make();
      });
      return Object.assign(result, c) as unknown as typeof chain;
    };
    return make();
  };

  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: buildSession() } }),
        getUser: () => {
          const s = buildSession();
          return Promise.resolve({ data: { user: s?.user ?? null } });
        },
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signOut: () => Promise.resolve({ error: null }),
        signInWithPassword: () => Promise.resolve({ data: null, error: null }),
        signUp: () => Promise.resolve({ data: null, error: null }),
      },
      from: (table: string) => {
        if (table === "user_roles") {
          const u = globalThis.__TEST_AUTH__;
          const data = u ? [{ role: u.role }] : [];
          const result = Promise.resolve({ data, error: null });
          const chain = {
            select: () => chain,
            eq: () => result,
          };
          return chain as unknown as ReturnType<typeof queryBuilder>;
        }
        return queryBuilder();
      },
    },
  };
});
