import Parser from "rss-parser";

type Language = "hi" | "en";

export type PodcastType = {
  title: string;
  audio_url: string;
  description: string;
  image_url: string;
  duration_sec: number;
  published_at: string;
  source: string;
  source_link: string;
  category: string;
  language: Language;
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1478737270239-2f02b77fc618";

const parser = new Parser<any, any>({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0" },
  customFields: {
    item: [
      ["itunes:image", "itunes_image"],
      ["itunes:duration", "itunes_duration"],
    ],
  },
});


// 🔥 ALL FEEDS (CLEAN + CATEGORIZED)
const PODCAST_FEEDS: Record<
  string,
  { url: string; lang: Language }[]
> = {
  news: [
    { url: "https://podcasts.files.bbci.co.uk/p09ds7zx.rss", lang: "hi" },
    { url: "https://podcasts.files.bbci.co.uk/p05525mc.rss", lang: "hi" },
    { url: "https://podcasts.files.bbci.co.uk/p0552909.rss", lang: "hi" },
    { url: "https://www.spreaker.com/show/4921017/episodes/feed", lang: "hi" },
    { url: "https://www.spreaker.com/show/6243326/episodes/feed", lang: "hi" },
    { url: "https://www.spreaker.com/show/4921016/episodes/feed", lang: "hi" },
  ],

  stories: [
    { url: "https://anchor.fm/s/1200947c/podcast/rss", lang: "hi" },
    { url: "https://anchor.fm/s/11eb8e10/podcast/rss", lang: "hi" },
    { url: "https://podcasts.files.bbci.co.uk/p08s9wv2.rss", lang: "hi" },
    { url: "https://www.spreaker.com/show/5662348/episodes/feed", lang: "hi" },
  ],

  mythology: [
    { url: "https://feeds.acast.com/public/shows/683c836f62f4742d48413b92", lang: "hi" },
    { url: "https://anchor.fm/s/1020b1e60/podcast/rss", lang: "hi" },
    { url: "https://anchor.fm/s/d8a67a88/podcast/rss", lang: "hi" },
    { url: "https://anchor.fm/s/55b73108/podcast/rss", lang: "hi" },
  ],

  spirituality: [
    { url: "https://feeds.megaphone.fm/CPP2332226300", lang: "hi" },
    { url: "https://feeds.hubhopper.com/4bfe0ef099229f6846b86d6ef7502fa1.rss", lang: "hi" },
    { url: "https://anchor.fm/s/51651304/podcast/rss", lang: "hi" },
    { url: "https://www.spreaker.com/show/4921024/episodes/feed", lang: "hi" },
  ],

  crime: [
    { url: "https://anchor.fm/s/f6585ee8/podcast/rss", lang: "hi" },
    { url: "https://anchor.fm/s/f5f50230/podcast/rss", lang: "hi" },
    { url: "https://www.spreaker.com/show/6260063/episodes/feed", lang: "hi" },
  ],

  kids: [
    { url: "https://www.spreaker.com/show/6676973/episodes/feed", lang: "hi" },
  ],

  motivation: [
    { url: "https://anchor.fm/s/f099a70/podcast/rss", lang: "hi" },
    { url: "https://feeds.megaphone.fm/ISP6325736115", lang: "hi" },
  ],

  audiobook: [
    { url: "https://anchor.fm/s/fb103fb4/podcast/rss", lang: "hi" },
    { url: "https://audioboom.com/channels/4902468.rss", lang: "hi" },
  ],

  knowledge: [
    { url: "https://anchor.fm/s/c9caf5c/podcast/rss", lang: "hi" },
    { url: "https://anchor.fm/s/10f357694/podcast/rss", lang: "hi" },
    { url: "https://anchor.fm/s/1d14621c/podcast/rss", lang: "hi" },
  ],

  aajtak: [
    { url: "https://www.spreaker.com/show/5018441/episodes/feed", lang: "hi" },
    { url: "https://www.spreaker.com/show/4688572/episodes/feed", lang: "hi" },
    { url: "https://www.spreaker.com/show/6032161/episodes/feed", lang: "hi" },
    { url: "https://www.spreaker.com/show/6231950/episodes/feed", lang: "hi" },
    { url: "https://www.spreaker.com/show/5989951/episodes/feed", lang: "hi" },
  ],
};


// ⚡ CACHE
const CACHE: Record<string, { time: number; data: PodcastType[] }> = {};
const CACHE_TTL = 10 * 60 * 1000;


// ⚡ CONCURRENCY
const LIMIT = 5;

const runLimited = async (tasks: (() => Promise<any>)[]) => {
  let index = 0;
  const results: any[] = [];

  const workers = Array(LIMIT).fill(0).map(async () => {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  });

  await Promise.all(workers);
  return results;
};


// 🔁 RETRY + BACKOFF
const fetchWithRetry = async (
  url: string,
  retries = 2,
  delay = 500
): Promise<any> => {
  try {
    return await parser.parseURL(url);
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, retries - 1, delay * 2);
    }
    console.error("❌ Feed failed:", url);
    return null;
  }
};


// 🧠 SOURCE CLEAN
const getSource = (feed: any, url: string) => {
  if (feed?.title && feed.title.length < 40) return feed.title;

  try {
    const host = new URL(url).hostname
      .replace(/^(www\.|feeds\.)/, "")
      .replace(/\.(com|org|net|co\.uk)$/, "");

    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch {
    return "Podcast";
  }
};


// ⏱ DURATION
const parseDuration = (dur: any): number => {
  if (!dur) return 0;

  if (typeof dur === "string" && dur.includes(":")) {
    const p = dur.split(":").map(Number);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
  }

  if (!isNaN(dur)) return Number(dur);
  return 0;
};


// 🚀 CATEGORY API
export const fetchCategory = async (
  category: string,
  userLang: Language = "hi"
): Promise<PodcastType[]> => {
  const cacheKey = `${category}_${userLang}`;

  if (CACHE[cacheKey] && Date.now() - CACHE[cacheKey].time < CACHE_TTL) {
    return CACHE[cacheKey].data;
  }

  const feeds = PODCAST_FEEDS[category] || PODCAST_FEEDS["stories"];

  const tasks = feeds.map((f) => () => fetchWithRetry(f.url));
  const responses = await runLimited(tasks);

  let items: PodcastType[] = [];

  for (let i = 0; i < responses.length; i++) {
    const feed = responses[i];
    const config = feeds[i];

    if (!feed?.items) continue;

    const source = getSource(feed, config.url);

    for (const item of feed.items) {
      const audio =
        item?.enclosure?.url || item?.enclosure?.["$"]?.url;

      if (!audio) continue;
      if (!item?.title || item.title.length < 5) continue;
      if (item.title.toLowerCase().includes("trailer")) continue;

      const image =
        item?.itunes?.image?.href ||
        item?.itunes_image?.["$"]?.href ||
        feed?.image?.url ||
        DEFAULT_IMAGE;

      items.push({
        title: item.title.trim(),
        audio_url: audio,
        description: item.contentSnippet || "",
        image_url: image,
        duration_sec: parseDuration(
          item?.itunes?.duration || item?.itunes_duration
        ),
        published_at:
          item.pubDate || new Date().toISOString(),
        source,
        source_link: config.url,
        category,
        language: config.lang,
      });
    }
  }

  // ✅ STRONG DEDUPE
  const unique = Array.from(
    new Map(
      items.map((p) => [`${p.audio_url}_${p.title}`, p])
    ).values()
  );

  // ✅ SORT
  const sorted = unique.sort((a, b) => {
    const timeDiff =
      new Date(b.published_at).getTime() -
      new Date(a.published_at).getTime();

    const boostA = a.language === userLang ? 1 : 0;
    const boostB = b.language === userLang ? 1 : 0;

    return boostB - boostA || timeDiff;
  });

  const finalData = sorted.slice(0, 40);

  CACHE[cacheKey] = { time: Date.now(), data: finalData };

  return finalData;
};


// 🎬 HOME API (PARALLEL FAST)
export const fetchHome = async (userLang: Language = "hi") => {
  const entries = await Promise.all(
    Object.keys(PODCAST_FEEDS).map(async (cat) => [
      cat,
      await fetchCategory(cat, userLang),
    ])
  );

  return Object.fromEntries(entries);
};