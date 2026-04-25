import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
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

// 🎧 PODCAST FEEDS WITH LANGUAGE
const PODCAST_FEEDS: Record<
  string,
  { url: string; language: "hi" | "en" }[]
> = {
  motivational: [
    // English
    { url: "https://feeds.simplecast.com/54nAGcIl", language: "en" },
    { url: "https://feeds.megaphone.fm/WWO3519750118", language: "en" },

    // Hindi
    { url: "https://anchor.fm/s/125a3d0c/podcast/rss", language: "hi" },
    { url: "https://anchor.fm/s/6d21b8c/podcast/rss", language: "hi" },
    { url: "https://anchor.fm/s/3efb4c38/podcast/rss", language: "hi" },
    { url: "https://anchor.fm/s/70c1a1c/podcast/rss", language: "hi" }
  ],

  news: [
    // English
    { url: "https://feeds.a.dj.com/rss/RSSWhatsNews.xml", language: "en" },
    { url: "https://feeds.npr.org/500005/podcast.xml", language: "en" },
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml", language: "en" },
    { url: "https://podcasts.files.bbci.co.uk/p02nq0gn.rss", language: "en" },

    // Hindi / India
    { url: "https://feeds.feedburner.com/ndtvnews-top-stories", language: "hi" }
  ],

  stories: [
    // English
    { url: "https://feeds.simplecast.com/8kXvPz0X", language: "en" },
    { url: "https://audioboom.com/channels/2399216.rss", language: "en" },

    // Hindi
    { url: "https://anchor.fm/s/3b7c0a00/podcast/rss", language: "hi" },
    { url: "https://anchor.fm/s/2a1f0e54/podcast/rss", language: "hi" },
    { url: "https://anchor.fm/s/1d9f8e88/podcast/rss", language: "hi" },
    { url: "https://anchor.fm/s/34a3f1c0/podcast/rss", language: "hi" }
  ]
};

// 🔁 Retry Logic
const fetchWithRetry = async (url: string, retries = 2): Promise<any> => {
  try {
    return await parser.parseURL(url);
  } catch (err) {
    if (retries > 0) return fetchWithRetry(url, retries - 1);
    return null;
  }
};

// 🚀 MAIN FUNCTION
export const fetchPodcasts = async (category: string = "motivational") => {
  try {
    const feedsConfig =
      PODCAST_FEEDS[category] || PODCAST_FEEDS["motivational"];

    const feeds = await Promise.all(
      feedsConfig.map((f) => fetchWithRetry(f.url))
    );

    let podcasts: any[] = [];

    for (let i = 0; i < feeds.length; i++) {
      const feed = feeds[i];
      const lang = feedsConfig[i].language;

      if (!feed) continue;

      const source = feed.title || "Podcast";

      for (const item of feed.items) {
        const audioUrl =
          item.enclosure?.url ||
          item.enclosure?.["$"]?.url ||
          null;

        if (!audioUrl) continue;

        if (!item.title || item.title.length < 5) continue;
        if (item.title.toLowerCase().includes("trailer")) continue;

        // 🔥 IMAGE FIX
        const image =
          item.itunes?.image?.href ||
          item.itunes_image?.["$"]?.href ||
          feed.image?.url ||
          "https://images.unsplash.com/photo-1478737270239-2f02b77fc618";

        podcasts.push({
          title: item.title || "No Title",
          audio_url: audioUrl,
          description: item.contentSnippet || "",
          image_url: image,
          duration:
            item.itunes_duration ||
            item.itunes?.duration ||
            "5 min",
          published_at:
            item.pubDate || new Date().toISOString(),
          source: source,
          category,

          // 🔥 LANGUAGE (IMPORTANT)
          language: lang
        });
      }
    }

    // 🔥 Remove duplicates
    const unique = Array.from(
      new Map(podcasts.map((p) => [p.audio_url, p])).values()
    );

    // 🔥 Sort latest first
    return unique.sort(
      (a, b) =>
        new Date(b.published_at).getTime() -
        new Date(a.published_at).getTime()
    );

  } catch (err) {
    console.error("❌ Podcast Fetch Error:", err);
    return [];
  }
};