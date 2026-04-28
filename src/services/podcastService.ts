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
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    "Referer": "https://www.google.com/",
  },
  customFields: {
    item: [
      ["itunes:image", "itunes_image"],
      ["itunes:duration", "itunes_duration"],
      ["media:content", "media_content"],
    ],
  },
});

// 🔥 VERIFIED WORKING FEEDS (Updated April 2026)
const PODCAST_FEEDS: Record<
  string,
  { url: string; language: Language }[]
> = {
  news: [
    // Hindi News (High Frequency)
    { url: "https://www.bhaskar.com/rssfeed/511/india/", language: "hi" },
    { url: "https://www.abplive.com/home/feed", language: "hi" },
    { url: "https://www.aajtak.in/rssfeeds/?id=home", language: "hi" },
    { url: "https://www.ndtv.com/rss/khabar", language: "hi" },
    // English News (High Reliability)
    { url: "https://www.ndtv.com/rss/top-stories", language: "en" },
    { url: "https://indianexpress.com/section/india/feed/", language: "en" },
    { url: "http://feeds.bbci.co.uk/news/world/asia/india/rss.xml", language: "en" },
  ],

  motivational: [
    { url: "https://anchor.fm/s/4f0eb988/podcast/rss", language: "hi" }, // Josh Talks Hindi
    { url: "https://anchor.fm/s/26600c70/podcast/rss", language: "hi" }, // Gita for Daily Living
    { url: "https://feeds.simplecast.com/7PWFZi_d", language: "en" },    // The Ranveer Show
  ],

  stories: [
    { url: "https://www.omnycontent.com/d/playlist/77ce34bb-6101-447a-8b1e-a9890060e29b/38604778-592a-4361-9c60-a9cf0092955f/d8c11e0e-1f7c-4700-b6a9-a9cf0092956f/podcast.rss", language: "hi" }, // BBC Kahani
    { url: "https://anchor.fm/s/139369e0/podcast/rss", language: "hi" }, // Kahani Suno
    { url: "https://feeds.simplecast.com/8kXvPz0X", language: "en" },
  ],

  history: [
    { url: "https://www.omnycontent.com/d/playlist/77ce34bb-6101-447a-8b1e-a9890060e29b/236166c3-1629-41d3-96b1-ab10008432f9/e0a133f4-0b92-421f-8468-ab100084330b/podcast.rss", language: "hi" }, // Itihas Ke Panne (BBC)
    { url: "https://anchor.fm/s/2b59190c/podcast/rss", language: "hi" }, // Bharat Ka Itihas
  ],

  kids: [
    { url: "https://anchor.fm/s/1f9b3b8c/podcast/rss", language: "hi" }, // Panchatantra
    { url: "https://feeds.simplecast.com/bedtime-stories", language: "en" },
  ],

  horror: [
    { url: "https://anchor.fm/s/40371300/podcast/rss", language: "hi" }, // Ek Kahani Aisi
    { url: "https://anchor.fm/s/1e6d42e4/podcast/rss", language: "hi" }, // Hindi Horror
  ],

  devotional: [
    { url: "https://anchor.fm/s/4e44f8f4/podcast/rss", language: "hi" }, // Bhakti Sagar
    { url: "https://www.spreaker.com/show/4763117/episodes/feed", language: "hi" },
  ],

  funny: [
    { url: "https://www.omnycontent.com/d/playlist/77ce34bb-6101-447a-8b1e-a9890060e29b/7f940826-6a78-4395-9279-ab4200679848/172e7d37-8f59-450f-a39c-ab4200679854/podcast.rss", language: "hi" }, // RJ Raunac (Bauaa)
  ],

  nightstory: [
    { url: "https://anchor.fm/s/258525e8/podcast/rss", language: "hi" }, // Neend - Sleep Stories
  ],

  veeryodha: [
    { url: "https://anchor.fm/s/329486c0/podcast/rss", language: "hi" }, // Param Vir Chakra
  ],
};

// Logic for Clean Source Name
const getCleanSource = (feed: any, url: string): string => {
  if (feed?.title && feed.title.length < 65) return feed.title.trim();
  try {
    const host = new URL(url).hostname
      .replace(/^(www\.|feeds\.|rss\.|anchor\.|simplecast\.|omnycontent\.)/i, "")
      .replace(/(\.com|\.org|\.in|\.co\.uk|\.feedburner|\.rss)$/i, "");
    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch {
    return "Podcast";
  }
};

// Logic for parsing itunes:duration
const parseDuration = (dur: any): number => {
  if (!dur) return 0;
  if (typeof dur === "string") {
    if (dur.includes(":")) {
      const parts = dur.split(":").map(Number).filter(n => !isNaN(n));
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return parts[0];
    }
    if (/^\d+$/.test(dur.trim())) return Number(dur.trim());
  }
  return typeof dur === "number" ? Math.floor(dur) : 0;
};

const fetchWithRetry = async (url: string, retries = 2): Promise<any> => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await parser.parseURL(url);
    } catch (err) {
      if (i === retries) return null;
      await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
    }
  }
  return null;
};

export const fetchPodcasts = async (
  category: string = "stories",
  userLang: Language = "hi"
): Promise<PodcastType[]> => {
  try {
    const feedsConfig = PODCAST_FEEDS[category] || PODCAST_FEEDS["stories"];
    const feedsData = await Promise.all(feedsConfig.map((f) => fetchWithRetry(f.url)));

    let podcasts: PodcastType[] = [];

    for (let i = 0; i < feedsData.length; i++) {
      const feed = feedsData[i];
      const config = feedsConfig[i];
      if (!feed?.items?.length) continue;

      const source = getCleanSource(feed, config.url);

      for (const item of feed.items) {
        const audioUrl = item?.enclosure?.url || item?.media_content?.["$"]?.url;
        if (!audioUrl || typeof audioUrl !== "string") continue;

        const image = item?.itunes?.image?.href || item?.itunes_image?.["$"]?.href || feed?.image?.url || DEFAULT_IMAGE;

        podcasts.push({
          title: item.title?.trim() || "Untitled Episode",
          audio_url: audioUrl,
          description: (item.contentSnippet || item.description || "").trim().slice(0, 320),
          image_url: typeof image === "string" ? image : DEFAULT_IMAGE,
          duration_sec: parseDuration(item?.itunes?.duration || item?.itunes_duration),
          published_at: item.pubDate || item.isoDate || new Date().toISOString(),
          source,
          source_link: config.url,
          category,
          language: config.language,
        });
      }
    }

    const unique = Array.from(new Map(podcasts.map((p) => [p.audio_url, p])).values());

    return unique.sort((a, b) => {
      const timeA = new Date(a.published_at).getTime();
      const timeB = new Date(b.published_at).getTime();
      const boostA = a.language === userLang ? 10 : 0;
      const boostB = b.language === userLang ? 10 : 0;
      return (boostB - boostA) || (timeB - timeA);
    }).slice(0, 50);

  } catch (err) {
    console.error("❌ Fetch Error:", err);
    return [];
  }
};