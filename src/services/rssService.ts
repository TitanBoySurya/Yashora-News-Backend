import Parser from "rss-parser";

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
  ta: ["https://zeenews.india.com/tamil/rss", "https://news.google.com/rss?hl=ta&gl=IN"],
  te: ["https://zeenews.india.com/telugu/rss", "https://news.google.com/rss?hl=te&gl=IN"],
  bn: ["https://zeenews.india.com/bengali/rss", "https://news.google.com/rss?hl=bn&gl=IN"],
  mr: ["https://zeenews.india.com/marathi/rss", "https://news.google.com/rss?hl=mr&gl=IN"],
};

/**
 * 🖼️ Advanced Image Extraction Logic
 * Parses deep nested attributes from different news portals
 */
const getBestImage = (item: any): string | null => {
  try {
    // 1. media:content (Aaj Tak, Zee News) - Sometime it's an array with $.url
    const mediaContent = item["media:content"];
    if (mediaContent && mediaContent.length > 0) {
      const media = mediaContent[0];
      const url = media.url || (media.$ && media.$.url);
      if (url) return url;
    }

    // 2. enclosure (ABP News, NDTV)
    if (item.enclosure && item.enclosure.url) {
      return item.enclosure.url;
    }

    // 3. media:thumbnail (Google News)
    if (item["media:thumbnail"]) {
      const thumb = item["media:thumbnail"];
      const url = thumb.url || (thumb.$ && thumb.$.url);
      if (url) return url;
    }

    // 4. HTML Extraction (Fall-back)
    const content = item["content:encoded"] || item.content || "";
    const imgMatch = content.match(/<img.*?src=["'](.*?)["']/);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  } catch (e) {
    console.error("Image Extraction Error:", e);
  }
  return null;
};

export const fetchRSS = async (lang: string) => {
  const urls = FEEDS[lang] || FEEDS["en"];

  try {
    const results = await Promise.allSettled(
      urls.map((url: string) => parser.parseURL(url))
    );

    let rawNews: any[] = [];

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        const feedTitle = result.value.title || "News Update";
        
        const items = result.value.items.map(item => {
            const extractedImage = getBestImage(item);
            
            return {
              title: item.title,
              link: item.link,
              contentSnippet: item.contentSnippet || item.content || "",
              pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
              source_name: feedTitle,
              image_url: extractedImage 
            };
        });
        rawNews.push(...items);
      }
    });

    // 1. Remove Duplicates
    const uniqueNews = Array.from(new Map(rawNews.map(item => [item.title, item])).values());

    // 2. Sort Latest First
    const sortedNews = uniqueNews.sort((a, b) => {
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });

    // 3. Return up to 60 items (Higher limit for Infinite Scroll)
    return sortedNews.slice(0, 60);

  } catch (err) {
    console.error("RSS Fetch Error:", err);
    return [];
  }
};