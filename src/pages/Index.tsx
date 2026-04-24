import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";

const Index = () => {
  const { user, role } = useAuth();

  return (
    <div className="container py-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          ETHINX
        </p>
        <h1 className="text-balance text-5xl font-bold tracking-tight">
          The Offer + Distribution Engine for solo founders
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Turn rough ideas into structured offers. Plan distribution across channels
          manually but systematically. AI is acceleration, not autopilot.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to={user ? "/dashboard" : "/signup"}>
              {user ? "Open workspace" : "Get started"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/showcase">See the showcase</Link>
          </Button>
        </div>
      </section>

      {user && (
        <section className="mx-auto mt-16 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                You're signed in as <strong>{user.email}</strong>
                {role ? ` (${role})` : ""}.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/dashboard">Member dashboard</Link>
                </Button>
                {role === "admin" && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/admin">Admin command center</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
};

export default Index;
