import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Moon, Sun } from "lucide-react";

const links = [
  { to: "/engines", label: "Engines" },
  { to: "/assets", label: "Assets" },
  { to: "/distribution", label: "Distribution" },
  { to: "/admin", label: "Admin" },
];

export function PublicNavbar() {
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
          <span className="font-mono uppercase tracking-[0.18em]">ETHINX</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              activeClassName="bg-muted/60 text-primary"
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to={role === "admin" ? "/admin" : "/dashboard"}>
                  {role === "admin" ? "Admin" : "Dashboard"}
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/onboarding">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
