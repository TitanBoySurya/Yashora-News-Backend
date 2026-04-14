import Parser from "rss-parser";

// ✅ Custom Fields setup for all types of images
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

// 🔥 Source name cleanup
const cleanSourceName = (title: string): string => {
  if (!title) return "News";
  const t = title.toLowerCase();
  if (t.includes("aaj tak")) return "Aaj Tak";
  if (t.includes("abp")) return "ABP News";
  if (t.includes("zee news")) return "Zee News";
  if (t.includes("ndtv")) return "NDTV";
  if (t.includes("hindustan times")) return "Hindustan Times";
  if (t.includes("times of india")) return "TOI";
  if (t.includes("google news")) return "Google News";
  return title.split(':')[0].split('-')[0].trim();
};

// 🔥 Multi-layer Image Extraction (Best Performance)
const getBestImage = (item: any): string | null => {
  try {
    // 1. media:content (Most Common)
    if (item["media:content"]) {
      const media = Array.isArray(item["media:content"]) ? item["media:content"][0] : item["media:content"];
      const url = media.url || (media.$ && media.$.url);
      if (url) return url;
    }

    // 2. enclosure (NDTV etc.)
    if (item.enclosure && item.enclosure.url) {
      return item.enclosure.url;
    }

    // 3. media:thumbnail
    if (item["media:thumbnail"]) {
      const thumb = Array.isArray(item["media:thumbnail"]) ? item["media:thumbnail"][0] : item["media:thumbnail"];
      const url = thumb.url || (thumb.$ && thumb.$.url);
      if (url) return url;
    }

    // 4. Content HTML Regex (For Google News & others)
    const content = item["content:encoded"] || item.content || item.contentSnippet || "";
    if (content) {
      const imgMatch = content.match(/<img.*?src=["'](.*?)["']/);
      if (imgMatch && imgMatch[1]) {
        let imgUrl = imgMatch[1];
        if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
        return imgUrl;
      }
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
        const cleanSource = cleanSourceName(result.value.title || "News");
        
        result.value.items.forEach(item => {
          rawNews.push({
            title: item.title || "Breaking News",
            link: item.link,
            contentSnippet: item.contentSnippet || "",
            pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
            source_name: cleanSource,
            image_url: getBestImage(item) || "https://placehold.co/600x400?text=News" // Placeholder if no image found
          });
        });
      }
    });

    // 🔥 Duplicate remove by title
    const uniqueNews = Array.from(new Map(rawNews.map(item => [item.title, item])).values());

    // 🔥 Sort by latest and limit to 80
    return uniqueNews
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 80);

  } catch (err) {
    console.error("RSS Fetch Error:", err);
    return [];
  }
};