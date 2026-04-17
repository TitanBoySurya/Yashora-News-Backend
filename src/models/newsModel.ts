import { supabase } from "../config/supabase";

/**
 * 📰 FAST NEWS FETCH (Cursor-based pagination)
 * first call → lastDate = undefined (Taza news ke liye)
 * next call → lastDate = aakhri article ki 'published_at' (Purani news ke liye)
 */
export const findNewsByLang = async (
  lang: string,
  limit: number = 20,
  lastDate?: string
) => {
  try {
    let query = supabase
      .from("news_articles")
      .select("*")
      .eq("lang_code", lang)
      .order("published_at", { ascending: false }) // Sabse taza pehle
      .limit(limit);

    // 🔥 Cursor Pagination: Agar user scroll kar raha hai toh purani news dikhao
    if (lastDate && lastDate !== "first") {
      query = query.lt("published_at", lastDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (err: any) {
    console.error("❌ findNewsByLang Error:", err.message);
    return [];
  }
};

/**
 * 🔁 Duplicate Check
 * Checks if a link already exists before trying to fetch AI/Extra data
 */
export const checkNewsExists = async (link: string): Promise<boolean> => {
  try {
    if (!link) return false;

    const { data, error } = await supabase
      .from("news_articles")
      .select("id")
      .eq("link", link)
      .limit(1)
      .maybeSingle();

    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
};

/**
 * 🗄️ Insert / Upsert News
 * link par conflict check karega taaki duplicate na ho
 */
export const insertNews = async (news: any) => {
  try {
    if (!news?.link) return;

    // 'ignoreDuplicates: true' isse purani news ko touch nahi karega
    // Jisse timestamp (published_at) kabhi nahi bigdega
    const { error } = await supabase
      .from("news_articles")
      .upsert(news, {
        onConflict: "link",
        ignoreDuplicates: true 
      });

    if (error) {
      console.error("❌ Insert Error:", error.message);
    }
  } catch (err: any) {
    console.error("❌ Insert Catch Error:", err.message);
  }
};

/**
 * 🧹 Auto Cleanup (Storage Bachane ke liye)
 * 2 din se purani news apne aap saaf
 */
export const deleteOldNews = async (days: number = 2) => {
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
      console.log(`🧹 Database Refreshed: Removed news older than ${days} days`);
    }
  } catch (err: any) {
    console.error("❌ Cleanup Catch Error:", err.message);
  }
};