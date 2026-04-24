import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            ETHINX · 404
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            We couldn’t find that page
          </h1>
          <p className="text-sm text-muted-foreground">
            The path{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {location.pathname}
            </code>{" "}
            doesn’t exist. Pick a destination below.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/engines/offer">Open Offer Engine</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
