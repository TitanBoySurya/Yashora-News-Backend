import { fetchRSS } from "./rssService";
import { insertNews, deleteOldNews } from "../models/newsModel";
import { generateSummary } from "./aiService";
import { getFullArticle } from "./articleService";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c";

// 🔥 Delay helper (rate limit बचाने के लिए)
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const processNewsService = async (lang: string) => {
  try {
    console.log(`🚀 Starting News Process for: ${lang}`);

    // 🧹 Delete old news
    await deleteOldNews(3);

    // 📰 Fetch RSS
    const items = await fetchRSS(lang);

    const limitedItems = items.slice(0, 40); // 🔥 safe limit

    // 🛡️ SAFE PROCESSING (no Promise.all)
    for (const item of limitedItems) {
      if (!item.link || !item.title) continue;

      try {
        // 🔥 1. Fetch full article
        let fullContent = "";
        try {
          fullContent = await getFullArticle(item.link);
        } catch {
          console.log("⚠️ Article fetch failed");
        }

        // 🔥 2. Clean content check
        if (fullContent && fullContent.length < 100) {
          fullContent = "";
        }

        // 🔥 3. Generate summary (AI only if useful content)
        let summary = item.summary || item.title;

        if (fullContent) {
          try {
            summary = await generateSummary(fullContent);
          } catch {
            console.log("⚠️ AI failed → fallback used");
          }
        }

        const image_url = item.image_url || DEFAULT_IMAGE;
        const source = item.source || "Global News";
        const published_at =
          item.published_at || new Date().toISOString();

        // 🔥 4. Save to DB
        await insertNews({
          title: item.title,
          link: item.link,
          summary,
          image_url,
          source,
          lang_code: lang,
          published_at,
        });

        // 🔥 5. Delay (VERY IMPORTANT)
        await delay(800); // 0.8 sec gap (API safe)

      } catch (err) {
        console.error(`⚠️ Skip: ${item.link}`);
      }
    }

    console.log(`✨ Done for ${lang}`);
  } catch (err) {
    console.error("❌ News Service Error:", err);
  }
};