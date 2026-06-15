import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { messageFromFunctionsInvoke } from "@/lib/facelessforge-env";

interface DiagnosticsResponse {
  ok: boolean;
  api_key_configured: boolean;
  base_url: {
    raw_present: boolean;
    had_prefix: boolean;
    had_quotes: boolean;
    had_trailing_slash: boolean;
    had_embedded_endpoint: boolean;
    valid: boolean;
    normalised: string | null;
    error: string | null;
  };
  endpoints: {
    render_video: string;
    render_video_status: string;
    render_video_cancel: string;
  } | null;
  reachable: { ok: boolean; status: number | null; error: string | null };
}

export const FacelessForgeDiagnostics = () => {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke<DiagnosticsResponse>(
        "facelessforge-diagnostics",
        { method: "GET" },
      );
      if (error) {
        setError(messageFromFunctionsInvoke(data, error));
        return;
      }
      setData(data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load diagnostics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">
          FacelessForge diagnostics
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {error ? (
          <p className="text-destructive">{error}</p>
        ) : !data ? (
          <p className="text-muted-foreground">{loading ? "Loading…" : "—"}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 text-xs">
              <StatusPill ok={data.base_url.valid} label="Base URL" />
              <StatusPill ok={data.api_key_configured} label="API key" />
              <StatusPill ok={data.reachable.ok} label={`Reachable${data.reachable.status ? ` (${data.reachable.status})` : ""}`} />
            </div>

            {data.base_url.error ? (
              <p className="text-xs text-destructive">{data.base_url.error}</p>
            ) : null}

            <Row label="Normalised base" value={data.base_url.normalised ?? "—"} />

            {data.endpoints ? (
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Upstream endpoints
                </p>
                <Row label="render-video" value={data.endpoints.render_video} />
                <Row label="render-video-status" value={data.endpoints.render_video_status} />
                <Row label="render-video-cancel" value={data.endpoints.render_video_cancel} />
              </div>
            ) : null}

            {(data.base_url.had_prefix ||
              data.base_url.had_quotes ||
              data.base_url.had_trailing_slash ||
              data.base_url.had_embedded_endpoint) && (
              <p className="text-xs text-muted-foreground">
                Notes:{" "}
                {[
                  data.base_url.had_prefix && "stripped `FACELESSFORGE_BASE_URL=` prefix",
                  data.base_url.had_quotes && "stripped surrounding quotes",
                  data.base_url.had_trailing_slash && "stripped trailing slash",
                  data.base_url.had_embedded_endpoint && "stripped embedded endpoint path",
                ]
                  .filter(Boolean)
                  .join(" · ")}
                .
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const StatusPill = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
      ok
        ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
        : "border-destructive/30 bg-destructive/10 text-destructive"
    }`}
  >
    {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
    {label}
  </span>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
    <span className="w-44 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
    <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
      {value}
    </code>
  </div>
);
