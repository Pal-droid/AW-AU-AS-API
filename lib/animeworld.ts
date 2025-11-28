import { load } from "cheerio";

export const ANIMEWORLD_BASE = "https://www.animeworld.ac";
export const ANIMESATURN_BASE = "https://www.anisaturn.com";

export type TopItem = {
  rank: number;
  title: string;
  href: string;
  image: string;
  views?: string;
  rating?: string;
};

export type TopResponse = {
  day: TopItem[];
  week: TopItem[];
  month: TopItem[];
};

export type SearchItem = {
  title: string;
  href: string;
  image: string;
  isDub?: boolean;
  sources?: Array<{ name: string; url: string; id: string }>;
  has_multi_servers?: boolean;
  description?: string;
};

export type EpisodeItem = {
  num: number;
  href: string;
  id?: string;
  title?: string;
};

export type RawEpisode = { episode_num?: string; href?: string; data_id?: string };

// UPDATED: support array values and repeated params
export function buildFilterUrl(params: Record<string, string | number | Array<string | number> | undefined>) {
  const url = new URL(`${ANIMEWORLD_BASE}/filter`);
  const allowed = [
    "genre",
    "season",
    "year",
    "type",
    "status",
    "studio",
    "dub",
    "language",
    "sort",
    "keyword",
    "page",
  ] as const;

  for (const key of allowed) {
    const v = params[key];
    if (v === undefined || v === null) {
      continue;
    }

    const appendAll = (val: string | number) => {
      const s = String(val);
      if (s.length > 0) {
        url.searchParams.append(key, s);
      }
    };

    if (Array.isArray(v)) {
      for (const item of v) {
        appendAll(item);
      }
    } else if (typeof v === "string" && v.includes(",")) {
      for (const part of v.split(",").map((x) => x.trim()).filter(Boolean)) {
        appendAll(part);
      }
    } else {
      appendAll(v);
    }
  }

  return url.toString();
}

export function absolutize(href: string, base: string = ANIMEWORLD_BASE) {
  try {
    if (!href) return "";
    if (href.startsWith("http")) return href;
    if (!href.startsWith("/")) href = `/${href}`;
    return `${base}${href}`;
  } catch {
    return href;
  }
}

export function parseTop(html: string): TopResponse {
  const $ = load(html);
  const baseSel = "div.widget.ranking";
  const out: TopResponse = { day: [], week: [], month: [] };

  const mapContent = (name: "day" | "week" | "month") => {
    const container = $(`${baseSel} .content[data-name="${name}"]`);
    const items: TopItem[] = [];

    container.find(".item-top, .item").each((_, el) => {
      const e = $(el);
      const rank = Number.parseInt(e.find(".rank").text().trim() || "1", 10) || 1;
      const a = e.find("a.thumb").first();
      const href = a.attr("href") || "";
      const img = a.find("img").attr("src") || "";
      const title = e.find(".info .name").first().text().trim() || a.attr("title") || "";
      const views = e.find('.info [data-tippy-content*="Visualizzazioni"]').text().trim();
      const rating = e.find('.info [data-tippy-content*="Voto"]').text().trim();
      items.push({ rank, title, href: absolutize(href), image: img, views, rating });
    });

    return items.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
  };

  out.day = mapContent("day");
  out.week = mapContent("week");
  out.month = mapContent("month");
  return out;
}

export type SearchResult = {
  items: SearchItem[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
    nextUrl?: string;
    previousUrl?: string;
  };
};

export function parseSearch(html: string): SearchResult {
  const $ = load(html);
  const items: SearchItem[] = [];

  $(".film-list .item").each((_, item) => {
    const root = $(item).find(".inner").first();
    if (root.length === 0) return;

    const posterA = root.find("a.poster").first();
    const nameA = root.find("a.name").first();

    const href = nameA.attr("href") || posterA.attr("href") || "";
    const image = posterA.find("img").attr("src") || "";
    const title = nameA.text().trim() || String(nameA.attr("data-jtitle") || posterA.attr("data-jtitle") || "").trim();
    if (!href || !title) return;

    const isDub = root.find(".status .dub").length > 0;

    items.push({ title, href: absolutize(href), image, isDub });
  });

  let pagination: SearchResult["pagination"] = undefined;
  const pagingWrapper = $(".paging-wrapper");

  if (pagingWrapper.length > 0) {
    const currentPageInput = pagingWrapper.find("#page-input");
    const totalPagesSpan = pagingWrapper.find(".total");
    const nextLink = pagingWrapper.find("#go-next-page");
    const prevLink = pagingWrapper.find("#go-previous-page");

    const currentPage = Number.parseInt(currentPageInput.attr("placeholder") || "1", 10);
    const totalPages = Number.parseInt(totalPagesSpan.text().trim() || "1", 10);

    const nextUrl = nextLink.attr("href");
    const previousUrl = prevLink.attr("href");

    pagination = {
      currentPage,
      totalPages,
      hasNext: !!nextUrl && !nextLink.hasClass("disabled"),
      hasPrevious: !!previousUrl && !prevLink.hasClass("disabled"),
      nextUrl: nextUrl ? absolutize(nextUrl) : undefined,
      previousUrl: previousUrl ? absolutize(previousUrl) : undefined,
    };
  }

  return { items, pagination };
}

export function parseEpisodes(html: string): RawEpisode[] {
  const $ = load(html);
  const episodes: RawEpisode[] = [];
  $("ul.episodes li a").each((_, el) => {
    episodes.push({
      episode_num: $(el).attr("data-episode-num") || $(el).attr("data-num") || $(el).text(),
      href: $(el).attr("href") || undefined,
      data_id: $(el).attr("data-id") || $(el).attr("data-episode-id") || undefined,
    });
  });
  return episodes;
}

export function parseStreamCandidates(html: string): string[] {
  const $ = load(html);
  const out: string[] = [];
  const alt = $("#alternativeDownloadLink").attr("href");
  if (alt) out.push(alt);

  $("video source").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src) out.push(src);
  });

  $("script:not([src])").each((_, el) => {
    const t = $(el).html() || "";
    const sourcesMatch = t.match(/sources\s*:\s*(\[.*?\])/);
    if (sourcesMatch) {
      try {
        const safe = sourcesMatch[1].replace(/(\w+)\s*:/g, '"$1":').replace(/'([^']*)'/g, '"$1"');
        const arr = JSON.parse(safe) as Array<{ src?: string; file?: string; url?: string }>;
        for (const it of arr) {
          const s = it?.src || it?.file || it?.url;
          if (s) out.push(s);
        }
      } catch {}
    }
    const fileMatch = t.match(/file\s*:\s*['"]([^'"]+)['"]/);
    if (fileMatch) out.push(fileMatch[1]);
    const srcMatch = t.match(/src\s*:\s*['"]([^'"]+)['"]/);
    if (srcMatch) out.push(srcMatch[1]);
  });

  const norm = out
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => absolutize(u));
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const u of norm) {
    if (!seen.has(u)) {
      seen.add(u);
      dedup.push(u);
    }
  }
  return dedup;
}

export function parseAlternativeDownload(html: string) {
  const candidates = parseStreamCandidates(html);
  return candidates[0] || null;
}

export type WatchMeta = {
  title: string;
  jtitle?: string;
  image?: string;
  rating?: string;
  votesCount?: string;
  audio?: string;
  releaseDate?: string;
  season?: string;
  seasonHref?: string;
  studio?: string;
  duration?: string;
  views?: string;
  genres: { name: string; href?: string }[];
  description?: string;
};

export function parseWatchMeta(html: string): WatchMeta | null {
  const $ = load(html);
  const root = $(".widget.info .widget-body").first();
  if (root.length === 0) return null;

  const img =
    root.find("#thumbnail-watch img").attr("src") || root.find("#mobile-thumbnail-watch img").attr("src") || "";

  const titleEl = root.find(".head .title").first();
  const title = titleEl.text().trim();
  const jtitle = titleEl.attr("data-jtitle") || undefined;

  const genres: { name: string; href?: string }[] = [];
  root
    .find("dl.meta dd")
    .filter((_, el) => $(el).prev("dt").text().trim().startsWith("Genere"))
    .find("a")
    .each((_, a) => {
      const name = $(a).text().trim();
      const href = $(a).attr("href");
      if (name) genres.push({ name, href: href ? absolutize(href, ANIMESATURN_BASE) : undefined });
    });

  const pick = (label: string) =>
    root
      .find("dl.meta dt")
      .filter((_, dt) => $(dt).text().trim().startsWith(label))
      .first()
      .next("dd")
      .text()
      .trim();

  const audio = pick("Audio");
  const releaseDate = pick("Data di Uscita");
  const duration = pick("Durata");
  const episodesCount = pick("Episodi");
  const status = pick("Stato");
  const views = pick("Visualizzazioni");

  let season = "";
  let seasonHref: string | undefined;
  root
    .find("dl.meta dt")
    .filter((_, dt) => $(dt).text().trim().startsWith("Stagione"))
    .first()
    .next("dd")
    .find("a")
    .each((_, a) => {
      season = $(a).text().trim();
      seasonHref = $(a).attr("href") || undefined;
    });

  let studio = "";
  root
    .find("dl.meta dt")
    .filter((_, dt) => $(dt).text().trim().startsWith("Studio"))
    .first()
    .next("dd")
    .find("a")
    .each((_, a) => {
      studio = $(a).text().trim();
    });

  const rating = root.find("#average-vote").text().trim() || root.find(".rating[data-value]").attr("data-value");
  const votesCount = root.find(".votes-count").text().trim();

  const description = root.find(".desc").text().trim();

  return {
    title,
    jtitle,
    image: img,
    rating,
    studio,
    status,
    releaseDate,
    episodesCount,
    duration,
    views,
    genres,
    description,
  };
}

export type SimpleEntry = { title: string; href: string; image?: string };

export function parseSimilar(html: string): SimpleEntry[] {
  const $ = load(html);
  const out: SimpleEntry[] = [];
  $('.widget .widget-title .title:contains("Serie simili")')
    .closest(".widget")
    .find(".widget-body .film-list .item")
    .each((_, el) => {
      const e = $(el);
      const inner = e.find(".inner").first();
      const a = inner.find("a.poster").first();
      const href = a.attr("href") || "";
      const img = a.find("img").attr("src") || "";
      const nameA = inner.find("a.name").first();
      const title = nameA.text().trim() || a.attr("title") || "";
      if (href && title) out.push({ title, href: absolutize(href), image: img });
    });
  return out;
}

export function parseRelated(html: string): SimpleEntry[] {
  const $ = load(html);
  const out: SimpleEntry[] = [];
  $('#sidebar .widget.simple-film-list .widget-title .title:contains("Correlati")')
    .closest(".widget.simple-film-list")
    .find(".widget-body.related .item")
    .each((_, el) => {
      const e = $(el);
      const a = e.find(".info a.name").first();
      const title = a.text().trim();
      const href = a.attr("href") || "";
      const img = e.find("img.thumb").attr("src") || "";
      if (href && title) out.push({ title, href: absolutize(href), image: img });
    });
  return out;
}

export function parseLatestEpisodes(html: string): { [key: string]: SearchItem[] } {
  const $ = load(html);
  const results: { [key: string]: SearchItem[] } = {
    all: [],
    sub: [],
    dub: [],
    trending: [],
  };

  const extractAnimeId = (href: string): string => {
    const match = href.match(/\/play\/([^/]+)/);
    return match ? match[1] : "";
  };

  const createSources = (href: string) => [
    {
      name: "AnimeWorld",
      url: href,
      id: extractAnimeId(href),
    },
  ];

  $(".widget.hotnew .content").each((_, contentEl) => {
    const $content = $(contentEl);
    const tabName = $content.attr("data-name") || "all";
    const items: SearchItem[] = [];

    $content.find(".film-list .item").each((_, itemEl) => {
      const $item = $(itemEl);
      const $inner = $item.find(".inner");

      if ($inner.length === 0) return;

      const $poster = $inner.find("a.poster");
      const $name = $inner.find("a.name");

      const href = $poster.attr("href") || $name.attr("href") || "";
      const image = $poster.find("img").attr("src") || "";
      const title = $name.text().trim() || $poster.attr("title") || "";

      if (!href || !title) return;

      const isDub = $inner.find(".status .dub").length > 0;
      const status = $inner.find(".status .ona").text().trim() || undefined;
      const episode = $inner.find(".status .ep").text().trim().replace("Ep", "").trim() || undefined;

      const fullHref = absolutize(href);

      items.push({
        title,
        href: fullHref,
        image,
        isDub,
        sources: createSources(fullHref),
        has_multi_servers: false,
        // NEW FIELDS FOR BADGES
        status,
        episode,
      });
    });

    if (tabName in results) {
      results[tabName] = items;
    }
  });

  return results;
}

export type ScheduleItem = {
  id: string;
  time: string;
  title: string;
  episode: string;
  href: string;
  image?: string;
};

export type DaySchedule = {
  date: string;
  dayName: string;
  items: ScheduleItem[];
};

export function formatDateRange(startDate: Date | null, endDate: Date | null): string {
  const months = [
    "gennaio",
    "febbraio",
    "marzo",
    "aprile",
    "maggio",
    "giugno",
    "luglio",
    "agosto",
    "settembre",
    "ottobre",
    "novembre",
    "dicembre",
  ];
  if (startDate && endDate) {
    const startDay = startDate.getDate();
    const startMonth = months[startDate.getMonth()];
    const endDay = endDate.getDate();
    const endMonth = months[endDate.getMonth()];
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  }
  return "";
}

export function parseSchedule(html: string): DaySchedule[] {
  const $ = load(html);
  const schedule: DaySchedule[] = [];

  // Extract date range text
  const dateRangeText = $(".widget-schedule-page .widget-body p").first().text().trim();

  // Parse start and end dates
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  if (dateRangeText) {
    const dateMatch = dateRangeText.match(/(\d+\s+\w+)\s*-\s*(\d+\s+\w+)/);
    if (dateMatch) {
      startDate = parseItalianDate(dateMatch[1]);
      endDate = parseItalianDate(dateMatch[2]);
    }
  }

  // Map day names to their order (Italian week: Monday to Sunday)
  const dayOrder: { [key: string]: number } = {
    LUNEDÌ: 0,
    MARTEDÌ: 1,
    MERCOLEDÌ: 2,
    GIOVEDÌ: 3,
    VENERDÌ: 4,
    SABATO: 5,
    DOMENICA: 6,
  };

  // Process each day section
  $(".costr").each((_, dayHeader) => {
    const $dayHeader = $(dayHeader);
    const dayName = $dayHeader.find(".day-header").text().trim().toUpperCase();

    // Skip indeterminate releases
    if (!dayName || dayName === "USCITE INDETERMINATE") return;

    const items: ScheduleItem[] = [];

    const $scheduleSection = $dayHeader.next(".calendario-aw");

    $scheduleSection.find(".widget.boxcalendario").each((_, el) => {
      const $item = $(el);

      const $link = $item.find("a").first();
      const href = $link.attr("href") || "";
      const title = $link.attr("title") || "";

      const episode = $item.find(".episodio-calendario").text().trim();
      const time = $item.find(".hour").text().replace("Trasmesso alle ", "").trim();

      const $imgDiv = $item.find(".img-anime");
      const bgStyle = $imgDiv.attr("style") || "";
      const imageMatch = bgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
      let image = "";
      if (imageMatch) {
        image = imageMatch[1];
      }

      if (title && href && episode && time) {
        let watchPath = href;
        if (href.startsWith("/play/")) {
          watchPath = href.replace(/\/+/g, "/");
        }

        items.push({
          id: `${dayName}-${time}-${title}`,
          time,
          title,
          episode,
          href: absolutize(watchPath),
          image,
        });
      }
    });

    // Sort items by time
    items.sort((a, b) => {
      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(":").map((n) => Number.parseInt(n));
        return hours * 60 + minutes;
      };
      return parseTime(a.time) - parseTime(b.time);
    });

    if (items.length > 0 && startDate && dayName in dayOrder) {
      // Calculate the date for this day based on its position in the week
      const dayIndex = dayOrder[dayName];
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + dayIndex);

      // Ensure the date is within the range
      if (endDate && dayDate <= endDate) {
        schedule.push({
          date: dayDate.toISOString().split("T")[0],
          dayName,
          items,
        });
      }
    }
  });

  // Sort schedule by date
  schedule.sort((a, b) => a.date.localeCompare(b.date));

  return schedule;
}

function parseItalianDate(dateStr: string): Date | null {
  const months = {
    gennaio: 0,
    febbraio: 1,
    marzo: 2,
    aprile: 3,
    maggio: 4,
    giugno: 5,
    luglio: 6,
    agosto: 7,
    settembre: 8,
    ottobre: 9,
    novembre: 10,
    dicembre: 11,
  };

  const match = dateStr.match(/(\d+)\s+(\w+)/);
  if (match) {
    const day = Number.parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const month = months[monthName as keyof typeof months];
    if (month !== undefined) {
      const currentYear = new Date().getFullYear();
      return new Date(currentYear, month, day);
    }
  }
  return null;
}

export async function fetchScheduleForDate(date?: string): Promise<DaySchedule[]> {
  try {
    const scheduleUrl = `${ANIMEWORLD_BASE}/schedule`;
    const res = await fetch(scheduleUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
      },
    });

    const html = await res.text();
    return parseSchedule(html);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return [];
  }
}

export type AnimeSaturnMeta = {
  title: string;
  jtitle?: string;
  image?: string;
  rating?: string;
  studio?: string;
  status?: string;
  releaseDate?: string;
  episodesCount?: string;
  duration?: string;
  views?: string;
  genres: { name: string; href?: string }[];
  description?: string;
  related?: { title: string; href: string; image?: string }[];
};

export function parseAnimeSaturnMeta(html: string): AnimeSaturnMeta | null {
  const $ = load(html);

  const image = $(".container.shadow.rounded.bg-dark-as-box .img-fluid.cover-anime.rounded").attr("src") || "";

  const titleContainer = $(".container.anime-title-as");
  const title = titleContainer.find("b").first().text().trim();
  const jtitle = titleContainer.find(".box-trasparente-alternativo").text().trim();

  const infoContainer = $(".container.shadow.rounded.bg-dark-as-box.text-white");
  let studio = "";
  let status = "";
  let releaseDate = "";
  let episodesCount = "";
  let duration = "";
  let views = "";
  let rating = "";

  infoContainer.contents().each((_, node) => {
    const text = $(node).text().trim();
    if (text.startsWith("Studio:")) {
      studio = text.replace("Studio:", "").trim();
    } else if (text.startsWith("Stato:")) {
      status = text.replace("Stato:", "").trim();
    } else if (text.startsWith("Data di uscita:")) {
      releaseDate = text.replace("Data di uscita:", "").trim();
    } else if (text.startsWith("Episodi:")) {
      episodesCount = text.replace("Episodi:", "").trim();
    } else if (text.startsWith("Durata episodi:")) {
      duration = text.replace("Durata episodi:", "").trim();
    } else if (text.startsWith("Visualizzazioni:")) {
      views = text.replace("Visualizzazioni:", "").trim();
    } else if (text.startsWith("Voto:")) {
      rating = text.replace("Voto:", "").trim();
    }
  });

  const genres: { name: string; href?: string }[] = [];
  $(".container.shadow.rounded.bg-dark-as-box .badge.badge-light.generi-as").each((_, el) => {
    const name = $(el).text().trim();
    const href = $(el).attr("href");
    if (name) {
      genres.push({ name, href: href ? absolutize(href, ANIMESATURN_BASE) : undefined });
    }
  });

  const shownTrama = $("#shown-trama").text().trim();
  const fullTrama = $("#full-trama").text().trim();
  const description = fullTrama || shownTrama;

  const related: { title: string; href: string; image?: string }[] = [];
  const $carouselItems = $("#carousel .slick-track .owl-item.anime-card-newanime.main-anime-card:not(.slick-cloned)");

  $carouselItems.each((_, el) => {
    const $card = $(el);
    const $link = $card.find(".card a").first();
    const href = $link.attr("href") || "";
    const title = $link.attr("title") || $card.find(".card-text span").text().trim() || "";
    const image = $link.find("img").attr("src") || "";

    if (href && title) {
      related.push({ title, href: absolutize(href, ANIMESATURN_BASE), image });
    }
  });

  if (!title) {
    return null;
  }

  return {
    title,
    jtitle: jtitle !== title ? jtitle : undefined,
    image,
    rating,
    studio,
    status,
    releaseDate,
    episodesCount,
    duration,
    views,
    genres,
    description,
    related,
  };
}
