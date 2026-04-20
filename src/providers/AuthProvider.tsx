import { createContext, useContext, useEffect, useState, ReactNode } from "react";

/**
 * Stub AuthProvider for Phase 1.
 * Will be replaced with real Supabase auth in Phase 3 when Lovable Cloud is enabled.
 * State persists in localStorage so route gating can be tested.
 */

export type UserRole = "guest" | "member" | "admin";

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signInAs: (role: UserRole) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "ethinx.auth.stub";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const signInAs = (role: UserRole) => {
    if (role === "guest") {
      signOut();
      return;
    }
    const next: AuthUser = {
      id: `stub-${role}`,
      email: `${role}@ethinx.dev`,
      role,
    };
    setUser(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInAs, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
