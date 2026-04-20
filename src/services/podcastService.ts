import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ["itunes:image", "itunes:image"],
      ["itunes:duration", "itunes:duration"]
    ]
  }
});

// 🎧 Podcast RSS feeds
const PODCAST_FEEDS: Record<string, string[]> = {
  motivational: [
    "https://feeds.simplecast.com/54nAGcIl",
    "https://feeds.megaphone.fm/WWO3519750118"
  ],
  news: [
    "https://feeds.a.dj.com/rss/RSSWhatsNews.xml",
    "https://feeds.npr.org/500005/podcast.xml"
  ],
  stories: [
    "https://feeds.simplecast.com/8kXvPz0X"
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
    const urls = PODCAST_FEEDS[category] || PODCAST_FEEDS["motivational"];

    const feeds = await Promise.all(
      urls.map((url) => fetchWithRetry(url))
    );

    let podcasts: any[] = [];

    for (const feed of feeds) {
      if (!feed) continue;

      const source = feed.title || "Podcast";

      for (const item of feed.items) {
        const audioUrl =
          item.enclosure?.url ||
          item.enclosure?.["$"]?.url ||
          null;

        // ⛔ skip invalid
        if (!audioUrl) continue;

        podcasts.push({
          title: item.title || "No Title",
          audio_url: audioUrl, // 🔥 MAIN FIELD
          description: item.contentSnippet || "",
          image:
            item.itunes?.image ||
            item["itunes:image"]?.href ||
            "",
          duration: item["itunes:duration"] || "",
          published_at:
            item.pubDate || new Date().toISOString(),
          source: source
        });
      }
    }

    // 🔥 Remove duplicates (by audio_url)
    const unique = Array.from(
      new Map(podcasts.map((p) => [p.audio_url, p])).values()
    );

    // 🔥 Latest first
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