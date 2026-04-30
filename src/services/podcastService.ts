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
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0"
  },
  customFields: {
    item: [
      ["itunes:image", "itunes_image"],
      ["itunes:duration", "itunes_duration"]
    ]
  }
});

// 🔥 STRONG + WORKING FEEDS ONLY
const PODCAST_FEEDS: Record<
  string,
  { url: string; language: Language }[]
> = {
  motivational: [
    { url: "https://feeds.simplecast.com/54nAGcIl", language: "en" },
    { url: "https://feeds.megaphone.fm/WWO3519750118", language: "en" },
    { url: "https://anchor.fm/s/125a3d0c/podcast/rss", language: "hi" }
  ],

  news: [
    { url: "https://feeds.npr.org/500005/podcast.xml", language: "en" },
    { url: "https://podcasts.files.bbci.co.uk/p02nq0gn.rss", language: "en" }
  ],

  stories: [
    { url: "https://audioboom.com/channels/2399216.rss", language: "en" },
    { url: "https://feeds.simplecast.com/8kXvPz0X", language: "en" },
    { url: "https://anchor.fm/s/3b7c0a00/podcast/rss", language: "hi" }
  ],

  history: [
    {
      url: "https://www.omnycontent.com/d/playlist/bcc6191d-0453-410a-8664-ac6b006323c3/31998583-1628-4034-874b-ac700088022a/f527c92f-1a98-43e5-8f53-ac70008d32a8/podcast.rss",
      language: "hi"
    }
  ],

  kids: [
    { url: "https://feeds.simplecast.com/8kXvPz0X", language: "en" }
  ],

  love: [
    { url: "https://anchor.fm/s/3b7c0a00/podcast/rss", language: "hi" }
  ],

  horror: [
    { url: "https://anchor.fm/s/3b7c0a00/podcast/rss", language: "hi" }
  ]
};

// ✅ SOURCE CLEAN
const getCleanSource = (feed: any, url: string): string => {
  if (feed?.title && feed.title.length < 40) return feed.title;

  try {
    const host = new URL(url).hostname.replace(
      /^(www\.|feeds\.)|(\.com|\.org)$/g,
      ""
    );
    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch {
    return "Podcast";
  }
};

// ✅ DURATION → SECONDS
const parseDuration = (dur: any): number => {
  if (!dur) return 0;

  if (typeof dur === "string" && dur.includes(":")) {
    const parts = dur.split(":").map(Number);

    if (parts.length === 3)
      return parts[0] * 3600 + parts[1] * 60 + parts[2];

    if (parts.length === 2)
      return parts[0] * 60 + parts[1];
  }

  if (!isNaN(dur)) return Number(dur);

  return 0;
};

// 🔁 RETRY
const fetchWithRetry = async (
  url: string,
  retries = 1
): Promise<any> => {
  try {
    return await parser.parseURL(url);
  } catch {
    if (retries > 0) return fetchWithRetry(url, retries - 1);
    return null;
  }
};

// 🚀 MAIN FUNCTION
export const fetchPodcasts = async (
  category: string = "stories",
  userLang: Language = "hi"
): Promise<PodcastType[]> => {
  try {
    const feedsConfig =
      PODCAST_FEEDS[category] || PODCAST_FEEDS["stories"];

    const feeds = await Promise.all(
      feedsConfig.map((f) => fetchWithRetry(f.url))
    );

    let podcasts: PodcastType[] = [];

    for (let i = 0; i < feeds.length; i++) {
      const feed = feeds[i];
      const lang = feedsConfig[i].language;

      if (!feed || !Array.isArray(feed.items)) continue;

      const source = getCleanSource(feed, feedsConfig[i].url);

      for (const item of feed.items) {
        const audioUrl =
          item?.enclosure?.url ||
          item?.enclosure?.["$"]?.url;

        if (!audioUrl) continue;
        if (!item?.title || item.title.length < 5) continue;
        if (item.title.toLowerCase().includes("trailer")) continue;

        const image =
          item?.itunes?.image?.href ||
          item?.itunes_image?.["$"]?.href ||
          feed?.image?.url ||
          DEFAULT_IMAGE;

        podcasts.push({
          title: item.title.trim(),
          audio_url: audioUrl,
          description: item.contentSnippet || "",
          image_url: image,
          duration_sec: parseDuration(
            item?.itunes?.duration || item?.itunes_duration
          ),
          published_at:
            item.pubDate || new Date().toISOString(),
          source,
          source_link: feedsConfig[i].url,
          category,
          language: lang
        });
      }
    }

    const unique = Array.from(
      new Map(podcasts.map((p) => [p.audio_url, p])).values()
    );

    const sorted = unique.sort((a, b) => {
      const timeDiff =
        new Date(b.published_at).getTime() -
        new Date(a.published_at).getTime();

      const boostA = a.language === userLang ? 1 : 0;
      const boostB = b.language === userLang ? 1 : 0;

      return boostB - boostA || timeDiff;
    });

    return sorted.slice(0, 50);
  } catch (err) {
    console.error("❌ Podcast Fetch Error:", err);
    return [];
  }
};