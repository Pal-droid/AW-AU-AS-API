const BASE_URL = "https://hianime.to";

const DEFAULT_HEADERS = {
  "X-Requested-With": "XMLHttpRequest",
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function safeString(str: unknown): string {
  return typeof str === "string" ? str : "";
}

function normalizeForComparison(title: unknown): string {
  return safeString(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HiAnimeSearchResult {
  id: string;
  title: string;
  image: string | null;
  url: string;
  subOrDub: "sub" | "dub";
}

export interface HiAnimeEpisode {
  id: string;
  number: number;
  url: string;
  title: string;
}

interface EpisodeServerEntry {
  id: string;
  name: string;
}

interface EpisodeServers {
  sub: EpisodeServerEntry[];
  dub: EpisodeServerEntry[];
}

export interface HiAnimeSubtitle {
  id: string;
  language: string;
  url: string;
  isDefault: boolean;
}

export interface HiAnimeVideoSource {
  url: string;
  type: "m3u8" | "mp4";
  quality: string;
  subtitles: HiAnimeSubtitle[];
  subOrDub: string;
}

export interface HiAnimeStreamResult {
  server: string;
  headers: Record<string, string>;
  videoSources: HiAnimeVideoSource[];
}

// ---------------------------------------------------------------------------
// Core provider
// ---------------------------------------------------------------------------

export async function searchHiAnime(
  query: string,
  dub = false
): Promise<HiAnimeSearchResult[]> {
  const url = `${BASE_URL}/search?keyword=${encodeURIComponent(query)}&sort=default`;
  const html = await fetch(url).then((res) => res.text());

  const regex =
    /<a href="\/watch\/([^"]+)"[^>]+title="([^"]+)"[^>]+data-id="(\d+)"/g;
  const matches = [...html.matchAll(regex)];

  return matches.map((m) => {
    const pageUrl = m[1];
    const title = m[2];
    const id = m[3];

    const imageRegex = new RegExp(
      `<a href="/watch/${pageUrl.replace(/\//g, "\\/")}"[\\s\\S]*?<img[^>]+data-src="([^"]+)"`,
      "i"
    );
    const imageMatch = html.match(imageRegex);

    return {
      id: `${id}/${dub ? "dub" : "sub"}`,
      title,
      image: imageMatch ? imageMatch[1] : null,
      url: `${BASE_URL}/${pageUrl}`,
      subOrDub: dub ? ("dub" as const) : ("sub" as const),
    };
  });
}

export async function getHiAnimeEpisodes(
  animeId: string
): Promise<HiAnimeEpisode[]> {
  const [id, subOrDub] = animeId.split("/");
  const res = await fetch(`${BASE_URL}/ajax/v2/episode/list/${id}`, {
    headers: DEFAULT_HEADERS,
  });
  const json = await res.json();
  const html: string = json.html;

  const episodes: HiAnimeEpisode[] = [];
  const regex =
    /<a[^>]*class="[^"]*\bep-item\b[^"]*"[^>]*data-number="(\d+)"[^>]*data-id="(\d+)"[^>]*href="([^"]+)"[\s\S]*?<div class="ep-name[^"]*"[^>]*title="([^"]+)"/g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    episodes.push({
      id: `${match[2]}/${subOrDub || "sub"}`,
      number: parseInt(match[1], 10),
      url: BASE_URL + match[3],
      title: match[4],
    });
  }
  return episodes;
}

async function findAllEpisodeServers(
  episodeId: string
): Promise<EpisodeServers> {
  const [id] = episodeId.split("/");
  const res = await fetch(
    `${BASE_URL}/ajax/v2/episode/servers?episodeId=${id}`,
    { headers: DEFAULT_HEADERS }
  );
  const json = await res.json();
  const html: string = json.html;

  const results: EpisodeServers = { sub: [], dub: [] };
  const regex =
    /<div[^>]*class="item server-item"[^>]*data-type="([^"]+)"[^>]*data-id="(\d+)"[^>]*>\s*<a[^>]*>\s*([^<]+)\s*<\/a>/gi;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const category = match[1] as "sub" | "dub";
    if (results[category]) {
      results[category].push({
        id: match[2],
        name: match[3].trim(),
      });
    }
  }
  return results;
}

async function extractMegaCloud(
  embedUrl: string,
  returnHeaders = false
): Promise<{
  sources: { file: string; type: string }[];
  tracks?: { kind: string; label?: string; file: string; default?: boolean }[];
  headersProvided?: Record<string, string>;
}> {
  const url = new URL(embedUrl);
  const baseDomain = `${url.protocol}//${url.host}/`;
  const headers: Record<string, string> = {
    "X-Requested-With": "XMLHttpRequest",
    Referer: baseDomain,
    "User-Agent": BROWSER_UA,
  };

  const html = await fetch(embedUrl, { headers }).then((r) => r.text());
  const fileId = html.match(/<title>\s*File\s+#([a-zA-Z0-9]+)\s*-/i)?.[1];
  if (!fileId) throw new Error("file_id not found");

  let nonce = html.match(/\b[a-zA-Z0-9]{48}\b/)?.[0];
  if (!nonce) {
    const matches = [...html.matchAll(/["']([A-Za-z0-9]{16})["']/g)];
    if (matches.length >= 3)
      nonce = matches[0][1] + matches[1][1] + matches[2][1];
  }

  const sourcesJson = await fetch(
    `${baseDomain}embed-2/v3/e-1/getSources?id=${fileId}&_k=${nonce}`,
    { headers }
  ).then((r) => r.json());

  return {
    ...sourcesJson,
    headersProvided: returnHeaders ? headers : undefined,
  };
}

export async function getHiAnimeStream(
  episodeId: string,
  serverName = "HD-1",
  category: "sub" | "dub" = "sub"
): Promise<HiAnimeStreamResult> {
  const id = episodeId.split("/")[0];
  const effectiveServer =
    serverName === "default" ? "HD-1" : serverName;

  if (!["HD-1", "HD-2", "HD-3"].includes(effectiveServer)) {
    throw new Error(
      `Server ${effectiveServer} extraction not implemented (likely HD-4/StreamSB)`
    );
  }

  // Get server list
  const serverJson = await fetch(
    `${BASE_URL}/ajax/v2/episode/servers?episodeId=${id}`,
    { headers: DEFAULT_HEADERS }
  ).then((res) => res.json());

  const serverRegex = new RegExp(
    `<div[^>]*class="item server-item"[^>]*data-type="${category}"[^>]*data-id="(\\d+)"[^>]*>\\s*<a[^>]*>\\s*${effectiveServer}\\s*</a>`,
    "i"
  );
  const serverMatch = serverRegex.exec(serverJson.html);
  if (!serverMatch)
    throw new Error(
      `Server "${effectiveServer}" (${category}) not found`
    );

  const serverId = serverMatch[1];
  const sourcesJson = await fetch(
    `${BASE_URL}/ajax/v2/episode/sources?id=${serverId}`,
    { headers: DEFAULT_HEADERS }
  ).then((res) => res.json());

  let decryptData: Awaited<ReturnType<typeof extractMegaCloud>>;
  let requiredHeaders: Record<string, string> = {};

  try {
    decryptData = await extractMegaCloud(sourcesJson.link, true);
    if (decryptData?.headersProvided)
      requiredHeaders = decryptData.headersProvided;
  } catch {
    // Generic fallback API
    const fallbackRes = await fetch(
      `https://ac-api.ofchaos.com/api/anime/embed/convert/v2?embedUrl=${encodeURIComponent(sourcesJson.link)}`
    );
    decryptData = await fallbackRes.json();
    requiredHeaders = {
      Referer: "https://megacloud.club/",
      "User-Agent": BROWSER_UA,
    };
  }

  const streamSource =
    decryptData.sources.find((s) => s.type === "hls") ||
    decryptData.sources.find((s) => s.type === "mp4");
  if (!streamSource?.file) throw new Error("No valid stream file found");

  const subtitles: HiAnimeSubtitle[] = (decryptData.tracks || [])
    .filter((t) => t.kind === "captions")
    .map((track, i) => ({
      id: `sub-${i}`,
      language: track.label || "Unknown",
      url: track.file,
      isDefault: !!track.default,
    }));

  return {
    server: effectiveServer,
    headers: requiredHeaders,
    videoSources: [
      {
        url: streamSource.file,
        type: streamSource.type === "hls" ? "m3u8" : "mp4",
        quality: "auto",
        subtitles,
        subOrDub: category,
      },
    ],
  };
}
