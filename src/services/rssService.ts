import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "media:content", { keepArray: true }],
      ["media:thumbnail", "media:thumbnail"],
      ["content:encoded", "content:encoded"],
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

export const fetchRSS = async (lang: string) => {
  const urls = FEEDS[lang] || FEEDS["en"];

  try {
    const results = await Promise.allSettled(
      urls.map((url: string) => parser.parseURL(url))
    );

    let rawNews: any[] = [];

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        // Har item mein source name manually add kar rahe hain agar missing ho
        const items = result.value.items.map(item => ({
          ...item,
          source_name: result.value.title || "News Update"
        }));
        rawNews.push(...items);
      }
    });

    // 1. Remove Duplicates based on Title
    const uniqueNews = Array.from(new Map(rawNews.map(item => [item.title, item])).values());

    // 2. Sort by Date (Latest First)
    const sortedNews = uniqueNews.sort((a, b) => {
      return new Date(b.pubDate || b.isoDate).getTime() - new Date(a.pubDate || a.isoDate).getTime();
    });

    // 3. Final Clean up (Limit to top 40 news per language to save AI cost)
    return sortedNews.slice(0, 40);

  } catch (err) {
    console.error("RSS Fetch Error:", err);
    return [];
  }
};