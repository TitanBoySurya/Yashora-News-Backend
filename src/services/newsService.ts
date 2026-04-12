import { fetchRSS } from "./rssService";
import { processContent } from "./aiService";
import {
  checkNewsExists,
  insertNews,
  deleteOldNews, // Isse model mein add kar lena
} from "../models/newsModel";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000&auto=format&fit=crop";

export const processNewsService = async (lang: string) => {
  try {
    console.log(`🚀 Starting News Process for: ${lang}`);

    // 1. 🔥 AUTO-CLEANUP: 3 din se purani news apne aap delete karega
    await deleteOldNews(3); 

    // 2. Fetch news from RSS (60-80 items for infinite feel)
    const items = await fetchRSS(lang);
    const limitedItems = items.slice(0, 80);

    for (const item of limitedItems) {
      if (!item.link || !item.title) continue;

      try {
        // 3. Duplicate Check
        const exists = await checkNewsExists(item.link);
        if (exists) continue;

        // 4. 🧠 AI Processing (Full context for complete summary)
        const aiInput = `Headline: ${item.title}. Details: ${item.contentSnippet || ""}`;
        const summary = await processContent(aiInput, lang);

        // 5. 🖼️ Metadata Selection
        const image_url = item.image_url || DEFAULT_IMAGE;
        const source = item.source_name || "Yashora News";
        
        // Date ko ISO format mein hi rakhein taaki Android "Time Ago" nikal sake
        const published_at = item.pubDate || item.isoDate || new Date().toISOString();

        // 6. 🗄️ Database Insertion
        await insertNews({
          title: item.title,
          link: item.link,
          summary: summary,
          image_url: image_url,
          source: source,
          lang_code: lang,
          published_at: published_at,
        });

        console.log(`✅ News Stored: ${item.title.substring(0, 35)}...`);

      } catch (err) {
        console.error("⚠️ Skipping one item due to error");
        continue;
      }
    }
    
    console.log(`✨ Process Finished for ${lang}. Database is Fresh!`);

  } catch (err) {
    console.error("❌ News Service Error:", err);
  }
};