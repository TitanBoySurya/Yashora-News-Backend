import { fetchRSS } from "./rssService";
import { processContent } from "./aiService";
import {
  checkNewsExists,
  insertNews,
} from "../models/newsModel";

// 🔥 Fallback image sirf tab jab kahin se kuch na mile
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000&auto=format&fit=crop";

export const processNewsService = async (lang: string) => {
  try {
    // 1. Fetch news from RSS (rssService ab image nikal kar dega)
    const items = await fetchRSS(lang);

    // 🚀 Limit badha kar 40-50 kar di hai taaki app mein zyada news dikhe
    const limitedItems = items.slice(0, 40);

    for (const item of limitedItems) {
      if (!item.link || !item.title) continue;

      try {
        const exists = await checkNewsExists(item.link);
        if (exists) continue;

        // 🧠 AI Summary
        // AI ko thoda zyada context bhej rahe hain taaki summary badi aur saaf bane
        const aiInput = `${item.title}. ${item.contentSnippet || ""}`;
        const summary = await processContent(aiInput, lang);

        // 🖼️ Image Selection
        // Pehle check karo ki rssService ne image nikal li hai?
        // Agar nahi, toh fallback image use karo
        const image_url = item.image_url || DEFAULT_IMAGE;

        const source = item.source_name || "News Update";

        // 🗄️ Database Insertion
        await insertNews({
          title: item.title,
          link: item.link,
          summary: summary, // AI Generated summary
          image_url: image_url,
          source: source,
          lang_code: lang,
          published_at: item.pubDate || item.isoDate || new Date().toISOString(),
        });

        console.log(`✅ News Added: ${item.title.substring(0, 30)}...`);

      } catch (err) {
        console.log("❌ Item Error:", err);
        continue;
      }
    }
  } catch (err) {
    console.error("❌ News Service Error:", err);
  }
};