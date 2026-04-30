import { fetchCategory } from "./podcastService";
import { supabase } from "../config/supabase";

const CATEGORIES = [
  "news",
  "stories",
  "mythology",
  "spirituality",
  "crime",
  "kids",
  "motivation",
  "audiobook",
  "knowledge",
  "aajtak"
];

const BATCH_SIZE = 50; // safety for large inserts

export const syncPodcastsToDB = async () => {
  try {
    console.log("🔄 Syncing Podcasts started...");

    await Promise.all(
      CATEGORIES.map(async (cat) => {
        try {
          const podcasts = await fetchCategory(cat, "hi");

          if (!podcasts || podcasts.length === 0) {
            console.log(`⚠️ No data for ${cat}`);
            return;
          }

          // 🔥 batching (safe for supabase limits)
          for (let i = 0; i < podcasts.length; i += BATCH_SIZE) {
            const batch = podcasts.slice(i, i + BATCH_SIZE);

            const formatted = batch.map((p) => ({
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
              console.log(
                `✅ ${cat}: inserted ${formatted.length} items`
              );
            }
          }
        } catch (err: any) {
          console.error(`❌ Category failed (${cat}):`, err.message);
        }
      })
    );

    console.log("🏁 Sync Completed!");
  } catch (err: any) {
    console.error("❌ Fatal Sync Error:", err.message);
  }
};