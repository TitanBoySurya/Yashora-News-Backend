
import Parser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ["media:content", "media:content", { keepArray: true }],
      ["media:thumbnail", "media:thumbnail"],
      ["content:encoded", "content:encoded"],
      ["enclosure", "enclosure"],
    ],
  },
});

// 🌍 CATEGORY BASED FEEDS
const FEEDS: Record<string, Record<string, string[]>> = {
  hi: {
    general: [
      "https://www.aajtak.in/rssfeeds/?id=home",
      "https://www.abplive.com/rss",
      "https://zeenews.india.com/hindi/rss",
    ],
    sports: [
      "https://www.aajtak.in/rssfeeds/?id=sports",
      "https://zeenews.india.com/hindi/sports/rss",
    ],
    business: [
      "https://zeenews.india.com/hindi/business/rss",
    ],
    tech: [
      "https://zeenews.india.com/hindi/science-technology/rss",
    ],
  },

  en: {
    general: [
      "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
      "https://feeds.feedburner.com/ndtvnews-top-stories",
    ],
    sports: [
      "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms",
    ],
    business: [
      "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms",
    ],
    tech: [
      "https://timesofindia.indiatimes.com/rssfeeds/66949542.cms",
    ],
  },
};

// 🖼️ fallback
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c";

// 🔁 Retry
const fetchWithRetry = async (url: string, retries = 2): Promise<any> => {
  try {
    return await parser.parseURL(url);
  } catch {
    if (retries > 0) return fetchWithRetry(url, retries - 1);
    return null;
  }
};

// 🧹 Clean text
const cleanText = (text: string) => {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// 🔥 OG IMAGE SCRAPER (old wala powerful logic)
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

// 🖼️ BEST IMAGE (FINAL FIX)
const getBestImage = async (item: any): Promise<string> => {
  try {
    // 1. media content
    if (item["media:content"]?.length > 0) {
      const url =
        item["media:content"][0]?.url ||
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

    // 4. html image
    const html =
      item["content:encoded"] ||
      item.content ||
      item.contentSnippet ||
      "";

    const match = html.match(/<img.*?src=["'](.*?)["']/);
    if (match?.[1]) return match[1];

    // 5. OG Image (🔥 strongest fallback)
    if (item.link) {
      const og = await getOGImage(item.link);
      if (og) return og;
    }
  } catch {}

  return FALLBACK_IMAGE;
};

// 🚀 MAIN FUNCTION
export const fetchRSS = async (
  lang: string,
  category: string = "general"
) => {
  try {
    const langFeeds = FEEDS[lang] || FEEDS["en"];
    const urls = langFeeds[category] || langFeeds["general"];

    const feeds = await Promise.all(
      urls.map((url) => fetchWithRetry(url))
    );

    let news: any[] = [];

    for (const feed of feeds) {
      if (!feed) continue;

      const source =
        feed.title?.split(":")[0]?.trim() || "News";

      // 🔥 IMPORTANT: HAR FEED SE SIRF 5 NEWS
      for (const item of feed.items.slice(0, 5)) {
        if (!item.link || !item.title) continue;

        const summaryRaw =
          item.contentSnippet ||
          item["content:encoded"] ||
          "";

        news.push({
          title: cleanText(item.title),
          link: item.link,
          summary: cleanText(summaryRaw).slice(0, 200),
          image_url: await getBestImage(item),
          source,
          published_at:
            item.isoDate || new Date().toISOString(),
          lang_code: lang,
          category,
        });
      }
    }

    // 🔥 REMOVE DUPLICATE
    const unique = Array.from(
      new Map(news.map((n) => [n.link, n])).values()
    );

    // 🔥 SORT LATEST FIRST
    return unique.sort(
      (a, b) =>
        new Date(b.published_at).getTime() -
        new Date(a.published_at).getTime()
    );

  } catch (err) {
    console.error("❌ RSS Error:", err);
    return [];
  }
};