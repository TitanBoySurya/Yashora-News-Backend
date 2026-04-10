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

// 🔥 MULTI SOURCE RSS (INDIA)
const FEEDS: any = {
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

  ta: [
    "https://zeenews.india.com/tamil/rss",
    "https://news.google.com/rss?hl=ta&gl=IN",
  ],

  te: [
    "https://zeenews.india.com/telugu/rss",
    "https://news.google.com/rss?hl=te&gl=IN",
  ],

  bn: [
    "https://zeenews.india.com/bengali/rss",
    "https://news.google.com/rss?hl=bn&gl=IN",
  ],

  mr: [
    "https://zeenews.india.com/marathi/rss",
    "https://news.google.com/rss?hl=mr&gl=IN",
  ],
};

// 🔥 MAIN FUNCTION
export const fetchRSS = async (lang: string) => {
  const urls = FEEDS[lang] || FEEDS["en"];

  try {
    const results = await Promise.allSettled(
      urls.map((url: string) => parser.parseURL(url))
    );

    let allNews: any[] = [];

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        allNews.push(...result.value.items);
      }
    });

    return allNews;
  } catch (err) {
    console.error("RSS Fetch Error:", err);
    return [];
  }
};