import Parser from "rss-parser";

type Language = "hi" | "en";

type PodcastType = {
  title: string;
  audio_url: string;
  description: string;
  image_url: string;
  duration: string;
  published_at: string;
  source: string;
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

const PODCAST_FEEDS: Record<
  string,
  { url: string; language: Language }[]
> = {
  motivational: [
    { url: "https://feeds.simplecast.com/54nAGcIl", language: "en" },
    { url: "https://feeds.megaphone.fm/WWO3519750118", language: "en" },
    { url: "https://anchor.fm/s/125a3d0c/podcast/rss", language: "hi" },
    { url: "https://anchor.fm/s/6d21b8c/podcast/rss", language: "hi" }
  ],
  news: [
    { url: "https://feeds.npr.org/500005/podcast.xml", language: "en" },
    { url: "https://podcasts.files.bbci.co.uk/p02nq0gn.rss", language: "en" },
    {
      url: "https://www.omnycontent.com/d/playlist/bcc6191d-0453-410a-8664-ac6b006323c3/31998583-1628-4034-874b-ac700088022a/987f223f-e8b9-4824-814a-ac700088023a/podcast.rss",
      language: "hi"
    }
  ],
  stories: [
    { url: "https://anchor.fm/s/3b7c0a00/podcast/rss", language: "hi" }
  ]
};

// ✅ Clean source extractor
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

// ✅ Retry logic
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
  category: string = "news",
  userLang: Language = "hi"
): Promise<PodcastType[]> => {
  try {
    const feedsConfig =
      PODCAST_FEEDS[category] || PODCAST_FEEDS["news"];

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
          item?.enclosure?.["$"]?.url ||
          null;

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
          duration:
            item?.itunes?.duration ||
            item?.itunes_duration ||
            "10 min",
          published_at:
            item.pubDate || new Date().toISOString(),
          source,
          category,
          language: lang
        });
      }
    }

    // ✅ Remove duplicates
    const unique = Array.from(
      new Map(podcasts.map((p) => [p.audio_url, p])).values()
    );

    // ✅ Smart Sorting (Language priority + latest)
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