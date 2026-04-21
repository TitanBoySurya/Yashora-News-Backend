import { fetchPodcasts } from "./podcastService";
import { supabase } from "../config/supabase";

export const syncPodcastsToDB = async () => {
  try {
    console.log("🔄 Syncing Podcasts started...");
    
    // 1. RSS se latest data lao (Multiple categories fetch kar sakte ho)
    const categories = ["stories", "motivational", "news"];
    
    for (const cat of categories) {
      const podcasts = await fetchPodcasts(cat);
      
      if (podcasts.length === 0) continue;

      // 2. Supabase mein data 'Upsert' karo
      // audio_url UNIQUE hai, isliye duplicate entries apne aap ruk jayengi
      const { error } = await supabase
        .from("podcasts")
        .upsert(
          podcasts.map(p => ({
            title: p.title,
            audio_url: p.audio_url,
            image_url: p.image_url,
            description: p.description,
            source_name: p.source_name,
            category: cat,
            language_code: "hi" // Default
          })), 
          { onConflict: "audio_url" } // Agar audio_url match kare to ignore karo
        );

      if (error) {
        console.error(`❌ Sync error for ${cat}:`, error.message);
      } else {
        console.log(`✅ Synced ${podcasts.length} items for ${cat}`);
      }
    }
    
    console.log("🏁 Sync Completed!");
  } catch (err: any) {
    console.error("❌ Fatal Sync Error:", err.message);
  }
};