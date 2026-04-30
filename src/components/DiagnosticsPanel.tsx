import { useState } from "react";

type CheckStatus = "OK" | "WARN" | "FAIL";

interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  details?: any;
}

interface EnvReport {
  overall: CheckStatus;
  checks: CheckResult[];
}

export function DiagnosticsPanel() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<EnvReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/diagnostics/env");
      const json = (await r.json()) as EnvReport;
      setReport(json);
    } catch (e: any) {
      setError(e.message || "Failed to run validation.");
    } finally {
      setLoading(false);
    }
  };

  const colorForStatus = (s: CheckStatus) => {
    if (s === "OK") return "green";
    if (s === "WARN") return "orange";
    return "red";
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <button
        onClick={runValidation}
        disabled={loading}
        style={{
          padding: "8px 14px",
          borderRadius: 6,
          border: "none",
          background: "#2563eb",
          color: "white",
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Running validation..." : "Run Environment Validation"}
      </button>

      {error && <div style={{ color: "red", fontSize: 13 }}>{error}</div>}

      {report && (
        <div
          style={{
            border: `1px solid ${colorForStatus(report.overall)}`,
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 8,
              color: colorForStatus(report.overall),
            }}
          >
            Overall: {report.overall}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {report.checks.map((c) => (
              <div
                key={c.name}
                style={{
                  borderRadius: 6,
                  padding: 8,
                  background: "#0b11201a",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span style={{ color: colorForStatus(c.status) }}>{c.status}</span>
                </div>
                <div style={{ fontSize: 13 }}>{c.message}</div>
                {c.details && (
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ fontSize: 12, cursor: "pointer" }}>Details</summary>
                    <pre
                      style={{
                        fontSize: 11,
                        marginTop: 4,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {JSON.stringify(c.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
