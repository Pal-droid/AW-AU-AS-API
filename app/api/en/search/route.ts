import { NextResponse } from "next/server";
import { searchHiAnime } from "@/lib/hianime";
import { getQueryParams } from "@/lib/query-utils";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,User-Agent",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  try {
    const searchParams = getQueryParams(request);
    const query = searchParams.get("q");
    const dub = searchParams.get("dub") === "true";

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          error: "Query parameter 'q' must be at least 2 characters long",
          usage: "Example: /api/en/search?q=naruto",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    console.log(`[EN/search] Starting search for: "${query}" (dub: ${dub})`);
    const startTime = Date.now();

    const hiAnimeResults = await searchHiAnime(query, dub);

    console.log(
      `[EN/search] Found ${hiAnimeResults.length} results in ${Date.now() - startTime}ms`
    );

    // Map to the same unified structure as the existing /api/search
    const unifiedResults = hiAnimeResults.map((r) => ({
      title: r.title,
      description: undefined,
      images: {
        poster: r.image,
        cover: undefined,
      },
      sources: [
        {
          name: "HiAnime",
          url: r.url,
          id: r.id,
        },
      ],
      has_multi_servers: false,
    }));

    return NextResponse.json(unifiedResults, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[EN/search] Exception:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
