import { fetchPodcasts } from "./podcastService";
import { supabase } from "../config/supabase";

export const syncPodcastsToDB = async () => {
  try {
    console.log("🔄 Syncing Podcasts started...");

    // 🔥 ALL CATEGORIES (IMPORTANT FIX)
    const categories = [
      "stories",
      "motivational",
      "news",
      "history",
      "kids",
      "love",
      "horror"
    ];

    for (const cat of categories) {
      const podcasts = await fetchPodcasts(cat);

      if (!podcasts || podcasts.length === 0) {
        console.log(`⚠️ No data for ${cat}`);
        continue;
      }

      const formatted = podcasts.map((p) => ({
        title: p.title,
        audio_url: p.audio_url,
        image_url: p.image_url,
        description: p.description,
        source_name: p.source,
        source_link: p.source_link,
        category: p.category,
        language_code: p.language,
        duration_sec: p.duration_sec,
        published_at: p.published_at
      }));

      const { error } = await supabase
        .from("podcasts")
        .upsert(formatted, {
          onConflict: "audio_url"
        });

      if (error) {
        console.error(`❌ Sync error (${cat}):`, error.message);
      } else {
        console.log(`✅ Synced ${formatted.length} items for ${cat}`);
      }
    }

    console.log("🏁 Sync Completed!");
  } catch (err: any) {
    console.error("❌ Fatal Sync Error:", err.message);
  }
};