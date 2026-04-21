import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ["itunes:image", "itunes_image"], // Don't use colon in key names
      ["itunes:duration", "itunes_duration"]
    ]
  }
});

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
    "https://feeds.simplecast.com/8kXvPz0X" // Hindi stories feed check karna
  ]
};

const fetchWithRetry = async (url: string, retries = 2): Promise<any> => {
  try {
    return await parser.parseURL(url);
  } catch (err) {
    if (retries > 0) return fetchWithRetry(url, retries - 1);
    return null;
  }
};

export const fetchPodcasts = async (category: string = "motivational") => {
  try {
    const urls = PODCAST_FEEDS[category] || PODCAST_FEEDS["motivational"];
    const feeds = await Promise.all(urls.map((url) => fetchWithRetry(url)));

    let podcasts: any[] = [];

    for (const feed of feeds) {
      if (!feed) continue;
      const source = feed.title || "Podcast";

      for (const item of feed.items) {
        const audioUrl = item.enclosure?.url || null;
        if (!audioUrl) continue;

        // 🔥 Image URL logic fixed
        const img = item.itunes?.image?.href || 
                    item.itunes?.image || 
                    item.itunes_image?.["$"]?.href || 
                    feed.image?.url || "";

        podcasts.push({
          title: item.title || "No Title",
          audio_url: audioUrl,
          description: item.contentSnippet || "",
          image_url: img, // 🛠️ Changed 'image' to 'image_url' to match Android
          duration: item.itunes_duration || item.itunes?.duration || "",
          published_at: item.pubDate || new Date().toISOString(),
          source_name: source // 🛠️ Changed to 'source_name' for SQL consistency
        });
      }
    }

    const unique = Array.from(new Map(podcasts.map((p) => [p.audio_url, p])).values());

    return unique.sort((a, b) => 
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

  } catch (err) {
    console.error("❌ Scraper Error:", err);
    return [];
  }
};