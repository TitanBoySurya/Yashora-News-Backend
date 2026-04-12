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

// 🔥 Helper: Source name ko chota aur saaf karne ke liye
const cleanSourceName = (title: string): string => {
  if (title.includes("Aaj Tak")) return "Aaj Tak";
  if (title.includes("ABP")) return "ABP News";
  if (title.includes("Zee News")) return "Zee News";
  if (title.includes("NDTV")) return "NDTV";
  if (title.includes("Hindustan Times")) return "Hindustan Times";
  if (title.includes("Times of India")) return "TOI";
  if (title.includes("Google News")) return "Google News";
  return title.split(':')[0].split('-')[0].trim(); // Default cleanup
};

const getBestImage = (item: any): string | null => {
  try {
    const mediaContent = item["media:content"];
    if (mediaContent && mediaContent.length > 0) {
      const media = mediaContent[0];
      const url = media.url || (media.$ && media.$.url);
      if (url) return url;
    }
    if (item.enclosure && item.enclosure.url) return item.enclosure.url;
    if (item["media:thumbnail"]) {
      const thumb = item["media:thumbnail"];
      return thumb.url || (thumb.$ && thumb.$.url);
    }
    const content = item["content:encoded"] || item.content || "";
    const imgMatch = content.match(/<img.*?src=["'](.*?)["']/);
    if (imgMatch && imgMatch[1]) return imgMatch[1];
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
        // 🔥 Saaf source name nikal rahe hain
        const cleanSource = cleanSourceName(result.value.title || "News");
        
        const items = result.value.items.map(item => ({
          title: item.title,
          link: item.link,
          contentSnippet: item.contentSnippet || item.content || "",
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          source_name: cleanSource, // Android mein yahi dikhega
          image_url: getBestImage(item) 
        }));
        rawNews.push(...items);
      }
    });

    const uniqueNews = Array.from(new Map(rawNews.map(item => [item.title, item])).values());

    return uniqueNews
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 80); // Infinite scroll ke liye 80 items

  } catch (err) {
    console.error("RSS Fetch Error:", err);
    return [];
  }
};