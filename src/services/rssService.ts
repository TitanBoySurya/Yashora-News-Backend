import Parser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "media:content", { keepArray: true }],
      ["media:thumbnail", "media:thumbnail"],
      ["content:encoded", "content:encoded"],
      ["enclosure", "enclosure"],
    ],
  },
});

// ✅ FEEDS
const FEEDS: Record<string, string[]> = {
  hi: [
    "https://www.aajtak.in/rssfeeds/?id=home",
    "https://www.abplive.com/rss",
    "https://zeenews.india.com/hindi/rss",
    "https://ndtv.in/rss",
    "https://news.google.com/rss?hl=hi&gl=IN",
  ],
  en: [
    "https://feeds.feedburner.com/ndtvnews-top-stories",
    "https://www.hindustantimes.com/feeds/rss/topnews/rssfeed.xml",
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    "https://www.thehindu.com/news/national/feeder/default.rss",
    "https://news.google.com/rss?hl=en-IN&gl=IN",
  ],
};

// ✅ Source cleaner
const cleanSourceName = (title: string): string => {
  if (!title) return "News";
  if (title.includes("Aaj Tak")) return "Aaj Tak";
  if (title.includes("ABP")) return "ABP News";
  if (title.includes("Zee News")) return "Zee News";
  if (title.includes("NDTV")) return "NDTV";
  if (title.includes("Hindustan Times")) return "Hindustan Times";
  if (title.includes("Times of India")) return "TOI";
  if (title.includes("Google News")) return "Google News";
  return title.split(":")[0].split("-")[0].trim();
};

// 🔥 fallback (stable, not random heavy API)
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c";

// 🔥 OG scraper (LIMITED USE)
const getOGImage = async (url: string): Promise<string | null> => {
  try {
    const { data } = await axios.get(url, {
      timeout: 3000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(data);

    return (
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="og:image"]').attr("content") ||
      null
    );
  } catch {
    return null;
  }
};

// 🔥 FINAL IMAGE LOGIC (optimized)
const getBestImage = async (item: any, index: number): Promise<string> => {
  try {
    // 1. media:content
    if (item["media:content"]?.length > 0) {
      const url =
        item["media:content"][0].url ||
        item["media:content"][0]?.$?.url;
      if (url) return url;
    }

    // 2. enclosure
    if (item.enclosure?.url) return item.enclosure.url;

    // 3. thumbnail
    if (item["media:thumbnail"]) {
      const url =
        item["media:thumbnail"].url ||
        item["media:thumbnail"]?.$?.url;
      if (url) return url;
    }

    // 4. content html
    const html = item["content:encoded"] || item.content || "";
    const match = html.match(/<img.*?src=["'](.*?)["']/);
    if (match?.[1]) return match[1];

    // 5. 🔥 OG only for first few (performance save)
    if (index < 5 && item.link) {
      const og = await getOGImage(item.link);
      if (og) return og;
    }
  } catch {}

  return FALLBACK_IMAGE;
};

// 🔥 MAIN FUNCTION
export const fetchRSS = async (lang: string) => {
  const urls = FEEDS[lang] || FEEDS["en"];

  try {
    const results = await Promise.allSettled(
      urls.map((url) => parser.parseURL(url))
    );

    let rawNews: any[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        const source = cleanSourceName(result.value.title || "News");

        // 🔥 LIMIT per feed (IMPORTANT)
        const limitedItems = result.value.items.slice(0, 15);

        const items = await Promise.all(
          limitedItems.map(async (item, index) => ({
            title: item.title || "No Title",
            link: item.link || "",
            contentSnippet: item.contentSnippet || "",
            pubDate:
              item.pubDate ||
              item.isoDate ||
              new Date().toISOString(),
            source_name: source,
            image_url: await getBestImage(item, index),
          }))
        );

        rawNews.push(...items);
      }
    }

    // 🔥 remove duplicates
    const uniqueNews = Array.from(
      new Map(rawNews.map((item) => [item.title, item])).values()
    );

    return uniqueNews
      .sort(
        (a, b) =>
          new Date(b.pubDate).getTime() -
          new Date(a.pubDate).getTime()
      )
      .slice(0, 80);
  } catch (err) {
    console.error("RSS Fetch Error:", err);
    return [];
  }
};