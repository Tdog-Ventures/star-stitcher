import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Moon, Sun } from "lucide-react";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/showcase", label: "Showcase" },
  { to: "/partners", label: "Partners" },
  { to: "/video-velocity", label: "Video Velocity" },
];

export function PublicNavbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          ETHINX
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeClassName="text-foreground font-medium"
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
                <Link to={user.role === "admin" ? "/admin" : "/dashboard"}>
                  {user.role === "admin" ? "Admin" : "Dashboard"}
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
