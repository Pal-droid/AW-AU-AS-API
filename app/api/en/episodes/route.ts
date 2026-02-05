import { type NextRequest, NextResponse } from "next/server";
import { getHiAnimeEpisodes } from "@/lib/hianime";
import type { EpisodeResult } from "@/lib/models";
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

  console.log(`[EN/episodes] Called with HI: ${HI}`);

  if (!HI) {
    return NextResponse.json(
      {
        error: "HiAnime source ID (HI) must be provided",
        usage: "Example: /api/en/episodes?HI=12345/sub",
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const startTime = Date.now();
    const episodes = await getHiAnimeEpisodes(HI);
    console.log(
      `[EN/episodes] Found ${episodes.length} episodes in ${Date.now() - startTime}ms`
    );

    // Map to the same EpisodeResult structure used by the existing API
    const allEpisodes: Record<number, EpisodeResult> = {};

    for (const ep of episodes) {
      const epNum = ep.number;
      if (!(epNum in allEpisodes)) {
        allEpisodes[epNum] = { episode_number: epNum, sources: {} };
      }
      allEpisodes[epNum].sources["HiAnime"] = {
        available: true,
        url: ep.url,
        id: ep.id,
      };
    }

    // Fill in unavailable sources for consistency
    for (const epData of Object.values(allEpisodes)) {
      if (!("HiAnime" in epData.sources)) {
        epData.sources["HiAnime"] = {
          available: false,
          url: undefined,
          id: undefined,
        };
      }
    }

    const sortedEpisodes = Object.values(allEpisodes).sort(
      (a, b) => a.episode_number - b.episode_number
    );

    return NextResponse.json(sortedEpisodes, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[EN/episodes] Exception:", error);
    return NextResponse.json(
      {
        error: `Failed to get episodes: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
