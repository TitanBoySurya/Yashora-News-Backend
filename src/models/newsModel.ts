import { supabase } from "../config/supabase";

/**
 * 📰 NEWS FETCH (Lang + Category + Cursor Pagination)
 */
export const findNewsByLang = async (
  lang: string,
  category: string,
  limit: number = 20,
  lastDate?: string
) => {
  try {
    let query = supabase
      .from("news_articles")
      .select("*")
      .eq("lang_code", lang)
      .eq("category", category) // 🔥 FIX
      .order("published_at", { ascending: false })
      .limit(limit);

    // 🔥 Cursor Pagination
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
 */
export const insertNews = async (news: any) => {
  try {
    if (!news?.link) return;

    const { error } = await supabase
      .from("news_articles")
      .upsert(news, {
        onConflict: "link",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error("❌ Insert Error:", error.message);
    }
  } catch (err: any) {
    console.error("❌ Insert Catch Error:", err.message);
  }
};

/**
 * 🧹 Auto Cleanup
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
      console.log(
        `🧹 Database Refreshed: Removed news older than ${days} days`
      );
    }
  } catch (err: any) {
    console.error("❌ Cleanup Catch Error:", err.message);
  }
};