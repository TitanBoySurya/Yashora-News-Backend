import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: [
      ["itunes:image", "itunes_image"],
      ["itunes:duration", "itunes_duration"]
    ]
  }
});

// 🎧 UPDATED PODCAST FEEDS (Hindi + English)
const PODCAST_FEEDS: Record<string, string[]> = {
  motivational: [
    "https://feeds.simplecast.com/54nAGcIl", // The Mindset Mentor
    "https://feeds.megaphone.fm/WWO3519750118", // Motivation Daily
    "https://anchor.fm/s/125a3d0c/podcast/rss" // Hindi Motivation
  ],

  news: [
    "https://feeds.a.dj.com/rss/RSSWhatsNews.xml", // WSJ
    "https://feeds.npr.org/500005/podcast.xml", // NPR
    "https://feeds.bbci.co.uk/news/world/rss.xml", // BBC
    "https://podcasts.files.bbci.co.uk/p02nq0gn.rss" // BBC Global News Podcast
  ],

  stories: [
    "https://feeds.simplecast.com/8kXvPz0X", // Stories
    "https://anchor.fm/s/3b7c0a00/podcast/rss", // Hindi Kahaniyan
    "https://audioboom.com/channels/2399216.rss" // Short Stories
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

        if (!audioUrl) continue;

        // 🔥 IMAGE FIX (multi fallback)
        const image =
          item.itunes?.image?.href ||
          item.itunes?.image ||
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
          source: source
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