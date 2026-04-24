import { Component, ReactNode, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Your data is safe — try returning
              to the dashboard or refreshing the page.
            </p>
          </div>
          {this.state.error?.message && (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild onClick={this.handleReset}>
              <a href="/dashboard">Return to dashboard</a>
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
