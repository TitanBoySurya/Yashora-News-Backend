import { fetchRSS } from "./rssService";
import {
  insertNews,
  deleteOldNews,
} from "../models/newsModel";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c";

export const processNewsService = async (lang: string) => {
  try {
    console.log(`🚀 Starting News Process for: ${lang}`);

    // 🧹 cleanup
    await deleteOldNews(3);

    // 📰 fetch
    const items = await fetchRSS(lang);

    const limitedItems = items.slice(0, 150);

    // 🚀 PARALLEL PROCESSING (FAST)
    await Promise.all(
      limitedItems.map(async (item) => {
        if (!item.link || !item.title) return;

        try {
          const summary =
            item.contentSnippet ||
            item.title ||
            "No description available";

          const image_url = item.image_url || DEFAULT_IMAGE;

          const source = item.source_name || "Global News";

          const published_at =
            item.pubDate ||
            item.isoDate ||
            new Date().toISOString();

          // 🔥 Upsert handles duplicate (NO manual check needed)
          await insertNews({
            title: item.title,
            link: item.link,
            summary,
            image_url,
            source,
            lang_code: lang,
            published_at,
          });

        } catch (err) {
          console.error("⚠️ Skip item");
        }
      })
    );

    console.log(`✨ Done for ${lang}`);
  } catch (err) {
    console.error("❌ News Service Error:", err);
  }
};