import Parser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";

const parser = new Parser({
  timeout: 7000,
  customFields: {
    item: [
      ["media:content", "media:content", { keepArray: true }],
      ["media:thumbnail", "media:thumbnail"],
      ["content:encoded", "content:encoded"],
      ["enclosure", "enclosure"],
    ],
  },
});

// 🌍 GLOBAL FEEDS (expandable)
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
    "https://rss.cnn.com/rss/edition.rss",
    "https://feeds.bbci.co.uk/news/rss.xml",
    "https://news.google.com/rss?hl=en-US&gl=US",
  ],
};

// 🧠 source cleaner
const cleanSourceName = (title: string) => {
  if (!title) return "News";
  return title.split(":")[0].split("-")[0].trim();
};

// 🖼️ fallback image (stable)
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c";

// 🔁 retry logic
const fetchWithRetry = async (url: string, retries = 3) => {
  try {
    return await parser.parseURL(url);
  } catch (err) {
    if (retries > 0) return fetchWithRetry(url, retries - 1);
    return null;
  }
};

// 🔥 OG IMAGE (important for Hindi feeds)
const getOGImage = async (url: string): Promise<string | null> => {
  try {
    const { data } = await axios.get(url, {
      timeout: 4000,
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

// 🔥 BEST IMAGE EXTRACTOR (STRONG VERSION)
const getBestImage = async (item: any, index: number): Promise<string> => {
  try {
    // 1️⃣ media:content
    if (item["media:content"]?.length > 0) {
      const url =
        item["media:content"][0]?.url ||
        item["media:content"][0]?.$?.url;
      if (url) return url;
    }

    // 2️⃣ enclosure
    if (item.enclosure?.url) return item.enclosure.url;

    // 3️⃣ thumbnail
    if (item["media:thumbnail"]) {
      const url =
        item["media:thumbnail"]?.url ||
        item["media:thumbnail"]?.$?.url;
      if (url) return url;
    }

    // 4️⃣ content:encoded
    const content = item["content:encoded"] || "";
    const img1 = content.match(/<img.*?src=["'](.*?)["']/);
    if (img1?.[1]) return img1[1];

    // 5️⃣ description (Hindi fix 🔥)
    const desc = item.content || item.contentSnippet || "";
    const img2 = desc.match(/<img.*?src=["'](.*?)["']/);
    if (img2?.[1]) return img2[1];

    // 6️⃣ OG IMAGE (only for first few for performance)
    if (item.link && index < 8) {
      const og = await getOGImage(item.link);
      if (og) return og;
    }
  } catch {}

  return FALLBACK_IMAGE;
};

// 🚀 MAIN FUNCTION
export const fetchRSS = async (lang: string) => {
  const urls = FEEDS[lang] || FEEDS["en"];

  try {
    const feeds = await Promise.all(
      urls.map((url) => fetchWithRetry(url))
    );

    let rawNews: any[] = [];

    for (const feed of feeds) {
      if (!feed) continue;

      const source = cleanSourceName(feed.title || "News");

      // 🔥 per feed limit ↑ (increase)
      const items = await Promise.all(
        feed.items.slice(0, 30).map(async (item, index) => ({
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

    // 🔥 remove duplicates by link
    const uniqueNews = Array.from(
      new Map(rawNews.map((item) => [item.link, item])).values()
    );

    return uniqueNews
      .sort(
        (a, b) =>
          new Date(b.pubDate).getTime() -
          new Date(a.pubDate).getTime()
      )
      .slice(0, 150); // 🔥 overall limit increase

  } catch (err) {
    console.error("❌ RSS Fetch Error:", err);
    return [];
  }
};