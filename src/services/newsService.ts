import { fetchRSS } from "./rssService";
import { processContent } from "./aiService";
import {
  checkNewsExists,
  insertNews,
} from "../models/newsModel";

// 🔥 Default fallback image
const DEFAULT_IMAGE =
  "https://via.placeholder.com/400x250?text=News";

// 🔥 Image extractor (IMPROVED)
const extractImage = (item: any): string => {
  try {
    // 1️⃣ enclosure
    if (item.enclosure?.url) {
      return item.enclosure.url;
    }

    // 2️⃣ media:content (array case)
    if (item["media:content"]?.length > 0) {
      return item["media:content"][0].url;
    }

    // 3️⃣ media:thumbnail
    if (item["media:thumbnail"]?.url) {
      return item["media:thumbnail"].url;
    }

    // 4️⃣ HTML content
    const content = item["content:encoded"] || item.content;

    if (content) {
      const match = content.match(/<img.*?src="(.*?)"/);
      if (match?.[1]) return match[1];
    }

    return DEFAULT_IMAGE;
  } catch {
    return DEFAULT_IMAGE;
  }
};

export const processNewsService = async (lang: string) => {
  try {
    const items = await fetchRSS(lang);

    // 🔥 limit + safety
    const limitedItems = items.slice(0, 15);

    for (const item of limitedItems) {
      // ❌ skip invalid
      if (!item.link || !item.title) continue;

      try {
        const exists = await checkNewsExists(item.link);

        // 🔁 Dedup
        if (exists) continue;

        // 🧠 AI summary + translation
        const summary = await processContent(
          item.contentSnippet || item.content || item.title,
          lang
        );

        // 🖼️ Image
        const image_url = extractImage(item);

        // 🏷️ Source name (bonus)
        const source =
          item.creator ||
          item.source?.title ||
          "News";

        // 🗄️ Insert
        await insertNews({
          title: item.title,
          link: item.link,
          summary,
          image_url,
          source,
          lang_code: lang,
          published_at: item.pubDate || new Date(),
        });
      } catch (err) {
        console.log("❌ Item Error:", err);
        continue;
      }
    }
  } catch (err) {
    console.error("❌ News Service Error:", err);
  }
};