import { supabase } from "../config/supabase";

/**
 * 📰 Get news with pagination
 * Range logic: (0, 9) = Page 1, (10, 19) = Page 2
 */
export const findNewsByLang = async (
  lang: string,
  limit: number,
  offset: number
) => {
  try {
    const { data, error } = await supabase
      .from("news_articles")
      .select("*")
      .eq("lang_code", lang)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1); 

    if (error) throw error;

    return data || [];
  } catch (err: any) {
    console.error("❌ findNewsByLang Error:", err.message);
    return [];
  }
};

/**
 * 🔁 Dedup check
 * Checks if a news link already exists in the database
 */
export const checkNewsExists = async (link: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("news_articles")
      .select("id")
      .eq("link", link)
      .maybeSingle();

    if (error) return false;
    return !!data;
  } catch (err) {
    return false;
  }
};

/**
 * 🗄️ Insert news
 * Using upsert to prevent duplicates based on 'link'
 */
export const insertNews = async (news: any) => {
  try {
    // 💡 Security check: Agar link null hai toh insert na karein
    if (!news.link) return;

    const { error } = await supabase
      .from("news_articles")
      .upsert(news, { onConflict: 'link' });

    if (error) {
      console.error("❌ Insert/Upsert Error:", error.message);
    }
  } catch (err: any) {
    console.error("❌ Insert Catch Error:", err.message);
  }
};

/**
 * 🧹 Delete old news
 * Database ko saaf rakhne ke liye taaki sirf fresh news dikhe
 */
export const deleteOldNews = async (days: number) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { error } = await supabase
      .from("news_articles")
      .delete()
      .lt("published_at", cutoffDate.toISOString()); 

    if (error) {
      console.error("❌ Cleanup Error:", error.message);
    } else {
      console.log(`🧹 Cleaned up news older than ${days} days`);
    }
  } catch (err: any) {
    console.error("❌ Cleanup Catch Error:", err.message);
  }
};