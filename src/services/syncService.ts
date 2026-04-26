import { fetchPodcasts } from "./podcastService";
import { supabase } from "../config/supabase";

export const syncPodcastsToDB = async () => {
  try {
    console.log("🔄 Syncing Podcasts started...");

    const categories = ["stories", "motivational", "news"];

    for (const cat of categories) {
      const podcasts = await fetchPodcasts(cat);

      if (!podcasts || podcasts.length === 0) {
        console.log(`⚠️ No data for ${cat}`);
        continue;
      }

      // ✅ FIXED: Proper field mapping
      const formatted = podcasts.map((p) => ({
        title: p.title,
        audio_url: p.audio_url,
        image_url: p.image_url,
        description: p.description,
        source_name: p.source,        // 🔥 FIX HERE
        category: p.category,
        language_code: p.language,    // 🔥 REAL LANGUAGE (hi/en)
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