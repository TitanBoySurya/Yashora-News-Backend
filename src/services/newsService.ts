import { fetchRSS } from "./rssService";
import { insertNews, deleteOldNews } from "../models/newsModel";
import { generateSummary } from "./aiService";
import { getFullArticle } from "./articleService";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c";

// ⏳ Delay (rate limit + anti-block)
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const processNewsService = async (lang: string) => {
  try {
    console.log(`🚀 Starting News Process for: ${lang}`);

    // 🧹 Old news delete (3 days)
    await deleteOldNews(3);

    // 📰 RSS Fetch
    const items = await fetchRSS(lang);

    const limitedItems = items.slice(0, 40); // 🔥 safe limit

    let index = 0;

    for (const item of limitedItems) {
      if (!item.link || !item.title) continue;

      try {
        let summary = item.summary || item.title;
        let fullContent = "";

        // 🔥 ONLY TOP NEWS → scrape + AI
        if (index < 5) {
          try {
            fullContent = await getFullArticle(item.link);

            if (fullContent && fullContent.length > 200) {
              try {
                summary = await generateSummary(fullContent);
              } catch {
                console.log("⚠️ AI failed → fallback summary used");
              }
            }
          } catch {
            console.log("⚠️ Scraper failed → skipping AI");
          }
        }

        const image_url = item.image_url || DEFAULT_IMAGE;
        const source = item.source || "Global News";
        const published_at =
          item.published_at || new Date().toISOString();

        // 💾 Save
        await insertNews({
          title: item.title,
          link: item.link,
          summary,
          image_url,
          source,
          lang_code: lang,
          published_at,
        });

        index++;

        // ⏳ Delay (important)
        await delay(index < 5 ? 1200 : 400);

      } catch (err) {
        console.error(`⚠️ Skip: ${item.link}`);
      }
    }

    console.log(`✨ Done for ${lang}`);
  } catch (err) {
    console.error("❌ News Service Error:", err);
  }
};