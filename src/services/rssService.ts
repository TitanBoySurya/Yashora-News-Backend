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

// 🔥 Multi-Source Feeds
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

// 🔥 Internal helper to get the best image URL
const getBestImage = (item: any): string | null => {
  try {
    // 1. Check media:content (High quality)
    if (item["media:content"] && item["media:content"][0]?.url) {
      return item["media:content"][0].url;
    }
    // 2. Check enclosure (Standard for many feeds)
    if (item.enclosure && item.enclosure.url) {
      return item.enclosure.url;
    }
    // 3. Check media:thumbnail
    if (item["media:thumbnail"] && item["media:thumbnail"].url) {
      return item["media:thumbnail"].url;
    }
    // 4. Extract from HTML content if available
    const htmlContent = item["content:encoded"] || item.content || "";
    const imgMatch = htmlContent.match(/<img.*?src="(.*?)"/);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  } catch (e) {
    return null;
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
              ...item,
              source_name: feedTitle,
              // Backend processNews logic uses 'image_url'
              image_url: extractedImage 
            };
        });
        rawNews.push(...items);
      }
    });

    // 1. Remove Duplicates based on Title
    const uniqueNews = Array.from(new Map(rawNews.map(item => [item.title, item])).values());

    // 2. Sort by Date (Latest First)
    const sortedNews = uniqueNews.sort((a, b) => {
      const dateA = new Date(a.pubDate || a.isoDate || 0).getTime();
      const dateB = new Date(b.pubDate || b.isoDate || 0).getTime();
      return dateB - dateA;
    });

    // 3. Return more news (50 items) so Android has more to scroll
    return sortedNews.slice(0, 50);

  } catch (err) {
    console.error("RSS Fetch Error:", err);
    return [];
  }
};