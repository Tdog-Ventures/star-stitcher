import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Temporary landing for Phase 1. Replaced by ETHINX Launchpad in Phase 2.
 */
const Index = () => {
  const { signInAs, user } = useAuth();

  return (
    <div className="container py-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Phase 1 · Foundation
        </p>
        <h1 className="text-balance text-5xl font-bold tracking-tight">
          ETHINX unified platform
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Routing, auth, and layouts are in place. Marketing, member, and admin surfaces
          will be wired in across phases 2–6.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/onboarding">Take the audit</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/showcase">See the showcase</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Dev quick-access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Stub auth is active. Real Supabase auth lands in Phase 3. Use the buttons
              below to simulate a member or admin and explore protected routes.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => signInAs("member")}>
                Sign in as Member
              </Button>
              <Button size="sm" variant="secondary" onClick={() => signInAs("admin")}>
                Sign in as Admin
              </Button>
              {user && (
                <span className="self-center text-xs text-muted-foreground">
                  Signed in as <strong>{user.role}</strong>
                </span>
              )}
            </div>
            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              <Link className="text-primary underline-offset-4 hover:underline" to="/dashboard">
                → Member dashboard
              </Link>
              <Link className="text-primary underline-offset-4 hover:underline" to="/admin">
                → Admin command center
              </Link>
              <Link className="text-primary underline-offset-4 hover:underline" to="/partners">
                → Partner program
              </Link>
              <Link className="text-primary underline-offset-4 hover:underline" to="/video-velocity">
                → Video Velocity
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;
