// Node.js script to test scraping episodes and the alternative download link
// Usage: run in v0 scripts runner or Node environment

import { load } from "cheerio"

const ANIMEWORLD_BASE = "https://www.animeworld.ac"

function parseEpisodes(html: string) {
  const $ = load(html)
  const episodes: { episode_num?: string; href?: string; data_id?: string }[] = []
  $("ul.episodes li a").each((_, el) => {
    episodes.push({
      episode_num: $(el).attr("data-episode-num") || $(el).attr("data-num"),
      href: $(el).attr("href") || undefined,
      data_id: $(el).attr("data-id") || $(el).attr("data-episode-id") || undefined,
    })
  })
  return episodes
}

function parseAlternativeDownload(html: string) {
  const $ = load(html)
  return $("#alternativeDownloadLink").attr("href") || null
}

async function fetchHtml(path: string) {
  const url = path.startsWith("http") ? path : `${ANIMEWORLD_BASE}${path}`
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
      "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: "https://www.animeworld.ac/",
    },
  })
  return await res.text()
}

async function testEpisodes(path: string) {
  const html = await fetchHtml(path)
  const eps = parseEpisodes(html)
  console.log("Episodes:", eps)
}

async function testDownload(path: string) {
  const html = await fetchHtml(path)
  const alt = parseAlternativeDownload(html)
  console.log("Alternative download URL:", alt)
}
;(async () => {
  // Example provided by you
  await testEpisodes("/play/horimiya.Mse3-/lRRhWd")
  await testDownload("/play/horimiya.Mse3-/lRRhWd")
})().catch((e) => {
  console.error("Error running tests:", e)
})
