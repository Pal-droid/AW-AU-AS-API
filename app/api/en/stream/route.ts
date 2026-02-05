import { type NextRequest, NextResponse } from "next/server";
import { getHiAnimeStream } from "@/lib/hianime";
import { getQueryParams } from "@/lib/query-utils";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,User-Agent",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const searchParams = getQueryParams(request);
  const HI = searchParams.get("HI");

  console.log(`[EN/stream] Called with HI: ${HI}`);

  if (!HI) {
    return NextResponse.json(
      {
        error: "HiAnime episode ID (HI) must be provided",
        usage: "Example: /api/en/stream?HI=12345/sub",
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    // Determine category from the episode ID (e.g. "12345/sub" or "12345/dub")
    const parts = HI.split("/");
    const category: "sub" | "dub" =
      parts[1] === "dub" ? "dub" : "sub";

    // Fetch all available servers for both sub and dub in parallel
    const serverNames = ["HD-1", "HD-2"];
    const categories: Array<"sub" | "dub"> = ["sub", "dub"];

    const tasks: Promise<{ serverLabel: string; result: Awaited<ReturnType<typeof getHiAnimeStream>> | null }>[] = [];

    for (const server of serverNames) {
      for (const cat of categories) {
        const label = `Hia-${server.replace("HD-", "")} ${cat.toUpperCase()}`;
        tasks.push(
          getHiAnimeStream(HI, server, cat)
            .then((result) => ({ serverLabel: label, result }))
            .catch((err) => {
              console.log(`[EN/stream] ${label} failed: ${err}`);
              return { serverLabel: label, result: null };
            })
        );
      }
    }

    const results = await Promise.allSettled(tasks);

    // Build the response in the requested structure:
    // { hianime: { available: true, servers: { "Hia-1 SUB": [...], "Hia-1 DUB": [...], ... } } }
    const servers: Record<string, Array<{
      url: string;
      quality: string;
      type: string;
      subtitles: Array<{
        id: string;
        language: string;
        url: string;
        isDefault: boolean;
      }>;
    }>> = {};

    let hasAnyServer = false;

    for (const settled of results) {
      if (settled.status !== "fulfilled") continue;
      const { serverLabel, result } = settled.value;
      if (!result) continue;

      hasAnyServer = true;
      servers[serverLabel] = result.videoSources.map((vs) => ({
        url: vs.url,
        quality: vs.quality,
        type: vs.type,
        subtitles: vs.subtitles.map((s) => ({
          id: s.id,
          language: s.language,
          url: s.url,
          isDefault: s.isDefault,
        })),
      }));
    }

    const streamResult = {
      hianime: {
        available: hasAnyServer,
        servers,
      },
    };

    console.log(
      `[EN/stream] Returning ${Object.keys(servers).length} server entries`
    );

    return NextResponse.json(streamResult, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[EN/stream] Exception:", error);
    return NextResponse.json(
      {
        error: `Failed to get stream URLs: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
