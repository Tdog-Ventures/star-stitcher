import type { NextApiRequest, NextApiResponse } from "next";

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

function classifyOverall(checks: CheckResult[]): CheckStatus {
  if (checks.some((c) => c.status === "FAIL")) return "FAIL";
  if (checks.some((c) => c.status === "WARN")) return "WARN";
  return "OK";
}

async function suggestCorrectUrl(): Promise<string | null> {
  // Check common patterns from your v3 project
  const projectId =
    process.env.VERCEL_PROJECT_ID || process.env.NEXT_PUBLIC_VERCEL_PROJECT_ID;
  if (projectId) {
    // Try to infer from Vercel
    return `https://facelessforge-${projectId}.vercel.app`;
  }
  return null;
}

function checkFacelessForgeApiKey(): CheckResult {
  const key = process.env.FACELESSFORGE_API_KEY;
  if (!key) {
    return {
      name: "FacelessForge API Key",
      status: "FAIL",
      message:
        "FACELESSFORGE_API_KEY is not set. Supabase Edge functions `render-video` / `render-video-status` / `render-video-cancel` cannot call upstream.",
    };
  }
  return {
    name: "FacelessForge API Key",
    status: "OK",
    message: "FACELESSFORGE_API_KEY is set (value not logged).",
  };
}

async function checkFacelessForgeBaseUrl(): Promise<CheckResult> {
  const base = process.env.FACELESSFORGE_BASE_URL;

  if (!base) {
    return {
      name: "FacelessForge Base URL",
      status: "FAIL",
      message: "FACELESSFORGE_BASE_URL is not set.",
    };
  }

  const urls = [`${base}/health`, `${base}/render`];
  const results: any[] = [];

  for (const url of urls) {
    try {
      const r = await fetch(url, { method: "GET" });
      const text = await r.text();
      const contentType = r.headers.get("content-type") || "";

      const isHTML =
        text.startsWith("<!DOCTYPE html>") ||
        text.includes("<html") ||
        text.includes("iframe") ||
        text.includes("loading-preview");

      results.push({
        url,
        status: r.status,
        contentType,
        isHTML,
        snippet: text.slice(0, 200),
      });
    } catch (err: any) {
      results.push({
        url,
        error: err.message,
      });
    }
  }

  const htmlDetected = results.some((r) => r.isHTML);
  const allFail = results.every((r) => r.error || (r.status && r.status >= 400));

  if (htmlDetected) {
    return {
      name: "FacelessForge Base URL",
      status: "FAIL",
      message:
        "Configured URL appears to be an Emergent preview shell (HTML loader), not the FacelessForge API.",
      details: results,
    };
  }

  const previewPattern = /preview\.emergentagent\.com/;
  if (previewPattern.test(base)) {
    return {
      name: "FacelessForge Base URL",
      status: "FAIL",
      message:
        "URL is an Emergent preview domain. Use your production FacelessForge URL from v3.",
      details: {
        current: base,
        suggestion: "Check v3 project's FACELESSFORGE_BASE_URL",
      },
    };
  }

  if (allFail) {
    return {
      name: "FacelessForge Base URL",
      status: "FAIL",
      message: "No valid API endpoints responded at /health or /render.",
      details: results,
    };
  }

  return {
    name: "FacelessForge Base URL",
    status: "OK",
    message: "API origin verified (non-HTML responses from /health or /render).",
    details: results,
  };
}

function checkOpenAIKey(): CheckResult {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      name: "OpenAI API Key",
      status: "FAIL",
      message: "OPENAI_API_KEY is not set.",
    };
  }
  if (!key.startsWith("sk-")) {
    return {
      name: "OpenAI API Key",
      status: "WARN",
      message: "OPENAI_API_KEY is set but does not look like a standard key.",
    };
  }
  return {
    name: "OpenAI API Key",
    status: "OK",
    message: "OPENAI_API_KEY is set.",
  };
}

function checkCallbackUrl(): CheckResult {
  const url = process.env.FACELESSFORGE_CALLBACK_URL;
  if (!url) {
    return {
      name: "Callback URL",
      status: "WARN",
      message: "FACELESSFORGE_CALLBACK_URL is not set.",
    };
  }
  try {
    new URL(url);
    return {
      name: "Callback URL",
      status: "OK",
      message: "FACELESSFORGE_CALLBACK_URL is valid.",
    };
  } catch {
    return {
      name: "Callback URL",
      status: "FAIL",
      message: "FACELESSFORGE_CALLBACK_URL is set but invalid.",
    };
  }
}

function checkStorageConfig(): CheckResult {
  const bucket = process.env.FACELESSFORGE_ASSET_BUCKET;
  if (!bucket) {
    return {
      name: "Asset Storage",
      status: "WARN",
      message: "FACELESSFORGE_ASSET_BUCKET is not set.",
    };
  }
  return {
    name: "Asset Storage",
    status: "OK",
    message: `FACELESSFORGE_ASSET_BUCKET is set to "${bucket}".`,
  };
}

function checkEnvironment(): CheckResult {
  const env = process.env.NODE_ENV || "development";
  return {
    name: "Node Environment",
    status: "OK",
    message: `NODE_ENV=${env}.`,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnvReport>,
) {
  try {
    const checks: CheckResult[] = [];

    checks.push(checkEnvironment());
    checks.push(checkOpenAIKey());
    checks.push(checkFacelessForgeApiKey());
    checks.push(checkCallbackUrl());
    checks.push(checkStorageConfig());
    checks.push(await checkFacelessForgeBaseUrl());

    const overall = classifyOverall(checks);

    res.status(200).json({
      overall,
      checks,
    });
  } catch (err: any) {
    res.status(500).json({
      overall: "FAIL",
      checks: [
        {
          name: "Validator",
          status: "FAIL",
          message: `Validator crashed: ${err.message}`,
        },
      ],
    });
  }
}
