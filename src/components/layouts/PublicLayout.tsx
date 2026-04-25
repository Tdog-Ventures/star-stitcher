import { Outlet } from "react-router-dom";
import { PublicNavbar } from "./PublicNavbar";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6">
        <div className="container flex flex-col items-center justify-between gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground md:flex-row">
          <p>
            <span className="text-primary">●</span> ETHINX · {new Date().getFullYear()}
          </p>
          <p>9 engines · one video system</p>
        </div>
      </footer>
    </div>
  );
}
