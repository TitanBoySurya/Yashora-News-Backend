import Parser from "rss-parser";

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

// 🌍 ALL LANGUAGES + CATEGORIES
const FEEDS: Record<string, Record<string, string[]>> = {
  hi: {
    general: [
      "https://www.aajtak.in/rssfeeds/?id=home",
      "https://www.abplive.com/rss",
      "https://zeenews.india.com/hindi/rss",
      "https://ndtv.in/rss",
    ],
    sports: [
      "https://www.aajtak.in/rssfeeds/?id=sports",
      "https://zeenews.india.com/hindi/sports/rss",
      "https://ndtv.in/rss/sports",
    ],
    business: [
      "https://zeenews.india.com/hindi/business/rss",
      "https://ndtv.in/rss/business",
    ],
    tech: [
      "https://zeenews.india.com/hindi/science-technology/rss",
    ],
  },

  en: {
    general: [
      "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
      "https://feeds.feedburner.com/ndtvnews-top-stories",
      "https://www.hindustantimes.com/feeds/rss/topnews/rssfeed.xml",
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

  mr: { general: ["https://zeenews.india.com/marathi/rss"] },
  gu: { general: ["https://zeenews.india.com/gujarati/rss"] },
  ta: { general: ["https://zeenews.india.com/tamil/rss"] },
  te: { general: ["https://zeenews.india.com/telugu/rss"] },
  kn: { general: ["https://zeenews.india.com/kannada/rss"] },
  ml: { general: ["https://zeenews.india.com/malayalam/rss"] },
  bn: {
    general: [
      "https://zeenews.india.com/bengali/rss",
      "https://www.anandabazar.com/rss-feed",
    ],
  },
  pa: { general: ["https://zeenews.india.com/punjabi/rss"] },
  or: { general: ["https://zeenews.india.com/odia/rss"] },
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c";

// 🔁 Retry Logic
const fetchWithRetry = async (url: string, retries = 2): Promise<any> => {
  try {
    return await parser.parseURL(url);
  } catch {
    if (retries > 0) return fetchWithRetry(url, retries - 1);
    return null;
  }
};

// 🧹 Clean text (HTML remove)
const cleanText = (text: string) => {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// 🖼️ BEST IMAGE (FINAL FIXED)
const getBestImage = async (item: any): Promise<string> => {
  try {
    if (item["media:content"]?.length > 0) {
      return (
        item["media:content"][0]?.url ||
        item["media:content"][0]?.$?.url
      );
    }

    if (item["media:thumbnail"]?.url) {
      return item["media:thumbnail"].url;
    }

    if (item.enclosure?.url) return item.enclosure.url;

    const desc =
      item["content:encoded"] ||
      item.content ||
      item.contentSnippet ||
      "";

    const imgMatch = desc.match(/<img.*?src=["'](.*?)["']/);

    if (imgMatch?.[1]) return imgMatch[1];
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

    let rawNews: any[] = [];

    for (const feed of feeds) {
      if (!feed) continue;

      const source =
        feed.title?.split(":")[0]?.trim() || "News";

      for (const item of feed.items.slice(0, 10)) {
        if (!item.link || !item.title) continue;

        const summaryRaw =
          item.contentSnippet ||
          item["content:encoded"] ||
          "";

        const summary = cleanText(summaryRaw).slice(0, 220);

        rawNews.push({
          title: cleanText(item.title),
          link: item.link,
          summary: summary || "Read full story",
          published_at:
            item.isoDate || new Date().toISOString(),
          source,
          image_url: await getBestImage(item),
          lang_code: lang,
          category,
        });
      }
    }

    // 🔥 Remove duplicates
    const uniqueNews = Array.from(
      new Map(rawNews.map((i) => [i.link, i])).values()
    );

    // 🔥 Sort latest first
    return uniqueNews.sort(
      (a, b) =>
        new Date(b.published_at).getTime() -
        new Date(a.published_at).getTime()
    );
  } catch (err) {
    console.error("❌ RSS Fetch Error:", err);
    return [];
  }
};