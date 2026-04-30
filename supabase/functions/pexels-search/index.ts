// Pexels stock-video search proxy.
// Frontend calls this from the browser-side Open-Source video renderer.
// Returns the best matching video file URL for a keyword + orientation.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PexelsVideoFile {
  link: string;
  quality: string;
  width: number;
  height: number;
  file_type: string;
}

interface PexelsVideo {
  id: number;
  duration: number;
  width: number;
  height: number;
  video_files: PexelsVideoFile[];
}

interface PexelsResponse {
  videos?: PexelsVideo[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PEXELS_KEY = Deno.env.get("PEXELS_API_KEY");
    if (!PEXELS_KEY) {
      return new Response(
        JSON.stringify({ error: "PEXELS_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const keyword = String(body?.keyword ?? "").trim();
    const orientation = body?.orientation === "landscape" ? "landscape" : "portrait";

    if (!keyword) {
      return new Response(JSON.stringify({ error: "keyword is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url =
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}` +
      `&per_page=5&orientation=${orientation}&size=medium`;

    const res = await fetch(url, {
      headers: { Authorization: PEXELS_KEY },
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({ error: `Pexels ${res.status}: ${text.slice(0, 200)}` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = (await res.json()) as PexelsResponse;
    const video = data.videos?.[0];

    // Pick a reasonable quality file: prefer hd, then sd, then anything mp4.
    const files = video?.video_files ?? [];
    const mp4Files = files.filter((f) => f.file_type === "video/mp4");
    const best =
      mp4Files.find((f) => f.quality === "hd" && f.width <= 1920) ??
      mp4Files.find((f) => f.quality === "sd") ??
      mp4Files[0] ??
      files[0];

    return new Response(
      JSON.stringify({
        url: best?.link ?? null,
        width: best?.width ?? 1920,
        height: best?.height ?? 1080,
        duration: video?.duration ?? 15,
        keyword,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
